import { type Prisma } from "@vanstro/db";

export async function enqueueInventoryRelease(
  tx: Prisma.TransactionClient,
  payload: {
    reservationId?: string;
    skuId: string;
    dealerLocationId?: string | null;
    quantity: number;
    reason: "reservation_expired" | "order_cancelled";
    orderId?: string;
  }
) {
  if (payload.reservationId) {
    const existing = await tx.erpSyncJob.findFirst({
      where: {
        type: "inventory_release",
        status: { in: ["pending", "retry_wait", "running"] },
        payload: { path: ["reservationId"], equals: payload.reservationId }
      }
    });
    if (existing) return existing;
  }

  return tx.erpSyncJob.create({
    data: {
      type: "inventory_release",
      payload: {
        reservationId: payload.reservationId,
        skuId: payload.skuId,
        dealerLocationId: payload.dealerLocationId,
        quantity: payload.quantity,
        reason: payload.reason,
        orderId: payload.orderId
      }
    }
  });
}

export async function restockCancelledOrderItems(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    dealerLocationId: string | null;
    items: Array<{ skuId: string | null; quantity: number }>;
  }
) {
  for (const item of order.items) {
    if (!item.skuId) continue;
    const snapshot = await tx.inventorySnapshot.findFirst({
      where: { skuId: item.skuId, dealerLocationId: order.dealerLocationId }
    });
    if (snapshot) {
      await tx.inventorySnapshot.update({
        where: { id: snapshot.id },
        data: { quantityOnHand: { increment: item.quantity } }
      });
    }
    await enqueueInventoryRelease(tx, {
      skuId: item.skuId,
      dealerLocationId: order.dealerLocationId,
      quantity: item.quantity,
      reason: "order_cancelled",
      orderId: order.id
    });
  }
}

export async function consumeInventoryReservation(
  tx: Prisma.TransactionClient,
  reservation: { id: string; skuId: string; dealerLocationId: string | null; quantity: number }
) {
  const snapshot = await tx.inventorySnapshot.findFirst({
    where: { skuId: reservation.skuId, dealerLocationId: reservation.dealerLocationId }
  });
  if (!snapshot) return false;

  const updated = await tx.$executeRaw`
    UPDATE "inventory_snapshots"
    SET "quantityOnHand" = "quantityOnHand" - ${reservation.quantity},
        "quantityReserved" = "quantityReserved" - ${reservation.quantity},
        "updatedAt" = NOW()
    WHERE "id" = ${snapshot.id}
      AND "quantityOnHand" >= ${reservation.quantity}
      AND "quantityReserved" >= ${reservation.quantity}
  `;
  return updated === 1;
}
