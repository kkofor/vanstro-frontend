import { prisma, type Prisma } from "@vanstro/db";
import { markCustomerOnPaidOrder } from "../crm/service.js";
import { queueCustomerEmail } from "../email/queue.js";
import { consumeInventoryReservation, enqueueInventoryRelease } from "../integrations/erp-sync/inventory.js";
import { orderSnapshotData, type CheckoutItem } from "./order-snapshot.js";

export async function markPaymentForReconciliation(input: {
  paymentSession: { id: string; totalCents: number; currency: string };
  providerPaymentId: string;
  payload: Prisma.InputJsonObject;
}) {
  await prisma.$transaction([
    prisma.paymentSession.updateMany({
      where: { id: input.paymentSession.id, status: { in: ["pending", "expired"] } },
      data: { status: "reconciliation_required" }
    }),
    prisma.paymentEvent.upsert({
      where: {
        paymentSessionId_type_providerEventId: {
          paymentSessionId: input.paymentSession.id,
          type: "reconciliation_required",
          providerEventId: input.providerPaymentId
        }
      },
      update: { payload: input.payload },
      create: {
        paymentSessionId: input.paymentSession.id,
        type: "reconciliation_required",
        providerEventId: input.providerPaymentId,
        amountCents: input.paymentSession.totalCents,
        currency: input.paymentSession.currency,
        payload: input.payload
      }
    })
  ]);
}

export async function finalizeConfirmedPayment(sessionId: string, providerPaymentId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sessionId}, 0))`;
    const session = await transaction.paymentSession.findUnique({ where: { id: sessionId } });
    if (!session) return { status: "missing" as const };

    const existingOrder = await transaction.order.findUnique({
      where: { paymentSessionId: session.id },
      include: { items: true }
    });
    if (existingOrder && existingOrder.status === "paid") {
      if (session.providerPaymentId && session.providerPaymentId !== providerPaymentId) {
        await transaction.paymentEvent.upsert({
          where: {
            paymentSessionId_type_providerEventId: {
              paymentSessionId: session.id,
              type: "reconciliation_required",
              providerEventId: providerPaymentId
            }
          },
          update: { payload: { reason: "duplicate_provider_transaction" } },
          create: {
            paymentSessionId: session.id,
            type: "reconciliation_required",
            providerEventId: providerPaymentId,
            amountCents: session.totalCents,
            currency: session.currency,
            payload: { reason: "duplicate_provider_transaction" }
          }
        });
        return { status: "duplicate_transaction" as const, order: existingOrder };
      }
      return { status: "completed" as const, order: existingOrder };
    }

    if (!["pending", "reconciliation_required"].includes(session.status) || session.expiresAt <= new Date()) {
      const activeReservations = await transaction.inventoryReservation.findMany({
        where: { paymentSessionId: session.id, status: "active" }
      });
      for (const reservation of activeReservations) {
        const released = await transaction.inventoryReservation.updateMany({
          where: { id: reservation.id, status: "active" },
          data: { status: "expired" }
        });
        if (released.count !== 1) continue;
        const snapshotUpdated = await transaction.$executeRaw`
          UPDATE "inventory_snapshots"
          SET "quantityReserved" = "quantityReserved" - ${reservation.quantity},
              "updatedAt" = NOW()
          WHERE "skuId" = ${reservation.skuId}
            AND "dealerLocationId" IS NOT DISTINCT FROM ${reservation.dealerLocationId}
            AND "quantityReserved" >= ${reservation.quantity}
        `;
        if (snapshotUpdated !== 1) throw new Error(`Failed to release confirmed-payment reservation ${reservation.id}.`);
        await enqueueInventoryRelease(transaction, {
          reservationId: reservation.id,
          skuId: reservation.skuId,
          dealerLocationId: reservation.dealerLocationId,
          quantity: reservation.quantity,
          reason: "reservation_expired"
        });
      }
      const expiredOrder = await transaction.order.findFirst({
        where: { paymentSessionId: session.id, status: "pending_payment" }
      });
      if (expiredOrder) {
        await transaction.order.update({
          where: { id: expiredOrder.id },
          data: { status: "payment_expired" }
        });
        await transaction.orderStatusEvent.create({
          data: { orderId: expiredOrder.id, status: "payment_expired", source: "payment_expired" }
        });
      }
      return { status: "not_payable" as const };
    }

    const claimedSession = await transaction.paymentSession.updateMany({
      where: { id: session.id, status: { in: ["pending", "reconciliation_required"] }, expiresAt: { gt: new Date() } },
      data: { status: "paid", providerPaymentId, paidAt: new Date() }
    });
    if (claimedSession.count !== 1) return { status: "contended" as const };
    await transaction.paymentEvent.deleteMany({
      where: { paymentSessionId: session.id, type: "reconciliation_required", providerEventId: providerPaymentId }
    });

    const items = session.items as unknown as CheckoutItem[];
    const activeReservations = await transaction.inventoryReservation.findMany({
      where: { paymentSessionId: session.id, status: "active" }
    });
    const expectedReservations = new Map<string, number>();
    for (const item of items) expectedReservations.set(item.skuId, (expectedReservations.get(item.skuId) ?? 0) + item.quantity);
    const actualReservations = new Map<string, number>();
    for (const reservation of activeReservations) {
      actualReservations.set(reservation.skuId, (actualReservations.get(reservation.skuId) ?? 0) + reservation.quantity);
    }
    if (
      expectedReservations.size !== actualReservations.size ||
      [...expectedReservations].some(([skuId, quantity]) => actualReservations.get(skuId) !== quantity)
    ) {
      throw new Error(`Payment session ${session.id} does not have complete active inventory reservations.`);
    }

    // Promote the checkout-time pending Order to paid, or create a paid Order
    // as a legacy fallback for sessions that predate the pending-Order flow.
    const order = existingOrder
      ? await transaction.order.update({
          where: { id: existingOrder.id },
          data: { status: "paid" },
          include: { items: true }
        })
      : await transaction.order.create({
          data: orderSnapshotData(session, items, "paid"),
          include: { items: true }
        });

    for (const reservation of activeReservations) {
      if (!await consumeInventoryReservation(transaction, reservation)) {
        throw new Error(`Failed to consume inventory reservation ${reservation.id}.`);
      }
    }
    await transaction.inventoryReservation.updateMany({
      where: { paymentSessionId: session.id, status: "active" },
      data: { status: "consumed" }
    });
    if (session.cartId) {
      await transaction.cartItem.deleteMany({ where: { cartId: session.cartId } });
    }
    await transaction.orderStatusEvent.create({
      data: { orderId: order.id, status: "paid", source: "payment_recovery", payload: { providerPaymentId } }
    });
    await queueCustomerEmail(transaction, {
      templateKey: "order_confirmation",
      toEmail: session.guestEmail,
      payload: {
        orderId: order.id,
        firstName: session.guestFirstName,
        totalCents: order.totalCents,
        totalDisplay: `${(order.totalCents / 100).toFixed(2)} ${order.currency}`,
        currency: order.currency,
        fulfillment: order.fulfillment
      }
    });
    await transaction.erpSyncJob.create({ data: { type: "order_create", payload: { orderId: order.id, paymentSessionId: session.id } } });
    await markCustomerOnPaidOrder(transaction, {
      userId: session.userId,
      email: session.guestEmail,
      orderId: order.id,
      firstName: session.guestFirstName,
      lastName: session.guestLastName,
      phone: session.guestPhone
    });
    if (session.userId) {
      await transaction.erpSyncJob.create({ data: { type: "customer_sync", payload: { userId: session.userId, orderId: order.id } } });
    }
    await transaction.paymentEvent.create({
      data: {
        paymentSessionId: session.id,
        type: "order_created",
        providerEventId: providerPaymentId,
        amountCents: session.totalCents,
        currency: session.currency,
        payload: { orderId: order.id, recovered: true }
      }
    });
    return { status: "completed" as const, order };
  });
}
