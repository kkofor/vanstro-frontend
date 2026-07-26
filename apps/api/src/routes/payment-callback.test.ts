import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";
import { loadApiConfig } from "../config.js";

const app = createApp();
const paymentCallbackSecret = loadApiConfig().paymentCallbackSecret;

async function createCheckoutFixture(suffix: string) {
  const email = `payment-${suffix}@vanstro.test`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location, "seeded dealer location is required");

  const sku = await prisma.platformSku.findFirst({
    where: { status: "active", product: { status: "active" }, prices: { some: { status: "active" } } },
    include: { product: true, prices: { where: { status: "active" }, take: 1 } }
  });
  assert.ok(sku && sku.prices[0], "seeded priced SKU is required");

  const snapshot = await prisma.inventorySnapshot.findFirst({
    where: { skuId: sku.id, dealerLocationId: location.id }
  });
  assert.ok(snapshot, "seeded inventory snapshot is required");

  const cart = await prisma.cart.create({ data: { guestToken: `cart-${suffix}` } });
  const unitPriceCents = sku.prices[0].amountCents;
  const session = await prisma.paymentSession.create({
    data: {
      cartId: cart.id,
      status: "pending",
      fulfillment: "pickup",
      paymentMethod: "cash",
      guestEmail: email,
      guestFirstName: "Pay",
      guestLastName: "Test",
      guestPhone: "204-555-0100",
      guestOrderToken: randomBytes(16).toString("base64url"),
      dealerLocationId: location.id,
      subtotalCents: unitPriceCents,
      taxCents: 0,
      shippingCents: 0,
      totalCents: unitPriceCents,
      currency: "CAD",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      items: [
        {
          skuId: sku.id,
          skuCode: sku.skuCode,
          productName: sku.product.name,
          quantity: 1,
          unitPriceCents,
          lineTotalCents: unitPriceCents,
          currency: "CAD"
        }
      ]
    }
  });

  await prisma.inventorySnapshot.update({
    where: { id: snapshot.id },
    data: { quantityReserved: { increment: 1 } }
  });
  await prisma.inventoryReservation.create({
    data: {
      skuId: sku.id,
      dealerLocationId: location.id,
      paymentSessionId: session.id,
      quantity: 1,
      expiresAt: session.expiresAt
    }
  });

  return { cart, session, snapshot, sku, location, unitPriceCents };
}

test("payment callback is idempotent for order and ERP job creation", async () => {
  const suffix = randomBytes(6).toString("hex");
  const { session, unitPriceCents } = await createCheckoutFixture(`idem-${suffix}`);

  const providerPaymentId = `pay-idem-${suffix}`;
  const signature = createHmac("sha256", paymentCallbackSecret)
    .update(`${session.id}:${providerPaymentId}`)
    .digest("hex");
  const body = JSON.stringify({ sessionId: session.id, providerPaymentId, status: "paid" });
  const headers = { "content-type": "application/json", "x-payment-signature": signature };

  try {
    const first = await app.request("/api/v1/payments/callback", { method: "POST", headers, body });
    assert.equal(first.status, 200);
    const firstJson = (await first.json()) as { data: { id: string; status: string } };
    assert.equal(firstJson.data.status, "paid");

    const second = await app.request("/api/v1/payments/callback", { method: "POST", headers, body });
    assert.equal(second.status, 200);
    const secondJson = (await second.json()) as { data: { id: string } };
    assert.equal(secondJson.data.id, firstJson.data.id);

    const [orderCount, erpJobCount] = await Promise.all([
      prisma.order.count({ where: { paymentSessionId: session.id } }),
      prisma.erpSyncJob.count({ where: { payload: { path: ["orderId"], equals: firstJson.data.id } } })
    ]);
    assert.equal(orderCount, 1);
    assert.equal(erpJobCount, 1);

    const orderConfirmation = await prisma.emailOutbox.findFirst({
      where: {
        templateKey: "order_confirmation",
        toEmail: session.guestEmail
      }
    });
    assert.ok(orderConfirmation);
  } finally {
    await prisma.emailOutbox.deleteMany({
      where: { templateKey: "order_confirmation", toEmail: session.guestEmail }
    });
    const order = await prisma.order.findUnique({ where: { paymentSessionId: session.id } });
    if (order) {
      await prisma.erpSyncJob.deleteMany({ where: { payload: { path: ["orderId"], equals: order.id } } });
      await prisma.orderStatusEvent.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
    }
    await prisma.inventoryReservation.deleteMany({ where: { paymentSessionId: session.id } });
    await prisma.paymentSession.delete({ where: { id: session.id } });
    const cart = await prisma.cart.findUnique({ where: { id: session.cartId ?? "" } });
    if (cart) await prisma.cart.delete({ where: { id: cart.id } });
  }
});

test("payment callback decrements quantityReserved and quantityOnHand after consuming reservations", async () => {
  const suffix = randomBytes(6).toString("hex");
  const { session, snapshot, unitPriceCents } = await createCheckoutFixture(`consume-${suffix}`);
  const baselineReserved = snapshot.quantityReserved + 1;
  const baselineOnHand = snapshot.quantityOnHand;

  const providerPaymentId = `pay-consume-${suffix}`;
  const signature = createHmac("sha256", paymentCallbackSecret)
    .update(`${session.id}:${providerPaymentId}`)
    .digest("hex");
  const body = JSON.stringify({ sessionId: session.id, providerPaymentId, status: "paid" });
  const headers = { "content-type": "application/json", "x-payment-signature": signature };

  try {
    const response = await app.request("/api/v1/payments/callback", { method: "POST", headers, body });
    assert.equal(response.status, 200);
    const updatedSnapshot = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } });
    assert.equal(updatedSnapshot.quantityReserved, baselineReserved - 1);
    assert.equal(updatedSnapshot.quantityOnHand, baselineOnHand - 1);
  } finally {
    const order = await prisma.order.findUnique({ where: { paymentSessionId: session.id } });
    if (order) {
      await prisma.erpSyncJob.deleteMany({ where: { payload: { path: ["orderId"], equals: order.id } } });
      await prisma.orderStatusEvent.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
    }
    await prisma.inventoryReservation.deleteMany({ where: { paymentSessionId: session.id } });
    await prisma.paymentSession.delete({ where: { id: session.id } });
    await prisma.inventorySnapshot.update({
      where: { id: snapshot.id },
      data: { quantityReserved: baselineReserved - 1, quantityOnHand: baselineOnHand }
    });
    const cart = await prisma.cart.findUnique({ where: { id: session.cartId ?? "" } });
    if (cart) await prisma.cart.delete({ where: { id: cart.id } });
  }
});
