import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";
import { finalizeConfirmedPayment } from "../payments/finalize.js";

process.env.INVENTORY_SOURCE_MODE = "manual";
const app = createApp();

async function createCheckoutCatalogFixture(label: string) {
  const suffix = `${label}-${randomBytes(6).toString("hex")}`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location, "seeded pickup dealer location is required");
  const product = await prisma.product.create({
    data: { slug: `pending-${suffix}`, name: `Pending ${label}`, status: "active" }
  });
  const sku = await prisma.platformSku.create({
    data: { productId: product.id, skuCode: `PENDING-${suffix}`, name: `Pending ${label}`, status: "active" }
  });
  await prisma.price.create({
    data: {
      key: `pending-${suffix}`,
      skuId: sku.id,
      currency: "CAD",
      amountCents: 1000,
      status: "active",
      effectiveFrom: new Date(Date.now() - 1000)
    }
  });
  await prisma.inventorySnapshot.create({
    data: { skuId: sku.id, dealerLocationId: location.id, quantityOnHand: 5, quantityReserved: 0 }
  });
  return { suffix, location, product, sku };
}

async function cleanup(cartId: string, email: string, productId: string, skuId: string) {
  const sessions = await prisma.paymentSession.findMany({ where: { cartId }, select: { id: true } });
  const sessionIds = sessions.map((session) => session.id);
  await prisma.orderItem.deleteMany({ where: { order: { paymentSessionId: { in: sessionIds } } } });
  await prisma.orderStatusEvent.deleteMany({ where: { order: { paymentSessionId: { in: sessionIds } } } });
  await prisma.order.deleteMany({ where: { paymentSessionId: { in: sessionIds } } });
  await prisma.inventoryReservation.deleteMany({ where: { paymentSessionId: { in: sessionIds } } });
  await prisma.paymentEvent.deleteMany({ where: { paymentSessionId: { in: sessionIds } } });
  await prisma.paymentSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.delete({ where: { id: cartId } });
  await prisma.inventorySnapshot.deleteMany({ where: { skuId } });
  await prisma.price.deleteMany({ where: { skuId } });
  await prisma.platformSku.delete({ where: { id: skuId } });
  await prisma.product.delete({ where: { id: productId } });
}

test("O1: checkout creates a pending Order alongside the PaymentSession and reservations", async () => {
  const fixture = await createCheckoutCatalogFixture("o1");
  const cartToken = `o1-cart-${fixture.suffix}`;
  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: fixture.sku.id, quantity: 1 } });

  try {
    const body = JSON.stringify({
      firstName: "Order", lastName: "Test", email: `o1-${fixture.suffix}@vanstro.test`,
      phone: "204-555-0100", fulfillment: "pickup", paymentMethod: "cash",
      dealerLocationId: fixture.location.id
    });
    const response = await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `o1-${fixture.suffix}` },
      body
    });
    assert.equal(response.status, 201, "checkout accepted");

    const session = await prisma.paymentSession.findFirst({ where: { cartId: cart.id } });
    assert.ok(session, "PaymentSession exists");
    const order = await prisma.order.findUnique({ where: { paymentSessionId: session.id }, include: { items: true } });
    assert.ok(order, "pending Order exists");
    assert.equal(order.status, "pending_payment");
    assert.equal(order.items.length, 1, "item snapshot captured");
    const reservations = await prisma.inventoryReservation.count({ where: { paymentSessionId: session.id, status: "active" } });
    assert.equal(reservations, 1, "one active reservation");
  } finally {
    await cleanup(cart.id, `o1-${fixture.suffix}@vanstro.test`, fixture.product.id, fixture.sku.id);
  }
});

test("O3: payment confirmation promotes the same pending Order to paid, ERP job created once", async () => {
  const fixture = await createCheckoutCatalogFixture("o3");
  const cartToken = `o3-cart-${fixture.suffix}`;
  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: fixture.sku.id, quantity: 1 } });

  try {
    const body = JSON.stringify({
      firstName: "Order", lastName: "Test", email: `o3-${fixture.suffix}@vanstro.test`,
      phone: "204-555-0100", fulfillment: "pickup", paymentMethod: "cash",
      dealerLocationId: fixture.location.id
    });
    await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `o3-${fixture.suffix}` },
      body
    });
    const session = await prisma.paymentSession.findFirst({ where: { cartId: cart.id } });
    assert.ok(session, "PaymentSession exists");
    const pending = await prisma.order.findUnique({ where: { paymentSessionId: session.id } });
    assert.ok(pending, "pending Order exists");
    assert.equal(pending.status, "pending_payment");

    const result = await finalizeConfirmedPayment(session.id, `o3-provider-${fixture.suffix}`);
    assert.equal(result.status, "completed");
    const paid = await prisma.order.findUnique({ where: { id: pending.id } });
    assert.equal(paid?.status, "paid", "same Order transitioned to paid");
    const orderCount = await prisma.order.count({ where: { paymentSessionId: session.id } });
    assert.equal(orderCount, 1, "no second Order created");
    const erpJobs = await prisma.erpSyncJob.count({ where: { type: "order_create", payload: { path: ["orderId"], equals: pending.id } } });
    assert.equal(erpJobs, 1, "ERP order_create job created exactly once");
  } finally {
    await cleanup(cart.id, `o3-${fixture.suffix}@vanstro.test`, fixture.product.id, fixture.sku.id);
  }
});

test("O4: callback replay does not duplicate Order/job/inventory consumption", async () => {
  const fixture = await createCheckoutCatalogFixture("o4");
  const cartToken = `o4-cart-${fixture.suffix}`;
  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: fixture.sku.id, quantity: 1 } });

  try {
    const body = JSON.stringify({
      firstName: "Order", lastName: "Test", email: `o4-${fixture.suffix}@vanstro.test`,
      phone: "204-555-0100", fulfillment: "pickup", paymentMethod: "cash",
      dealerLocationId: fixture.location.id
    });
    await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `o4-${fixture.suffix}` },
      body
    });
    const session = await prisma.paymentSession.findFirst({ where: { cartId: cart.id } });
    assert.ok(session, "PaymentSession exists");

    await finalizeConfirmedPayment(session.id, `o4-provider-${fixture.suffix}`);
    const replay = await finalizeConfirmedPayment(session.id, `o4-provider-${fixture.suffix}`);
    assert.equal(replay.status, "completed");

    const orderCount = await prisma.order.count({ where: { paymentSessionId: session.id } });
    assert.equal(orderCount, 1, "still exactly one Order");
    const erpJobs = await prisma.erpSyncJob.count({ where: { type: "order_create", payload: { path: ["orderId"], equals: (await prisma.order.findUniqueOrThrow({ where: { paymentSessionId: session.id } })).id } } });
    assert.equal(erpJobs, 1, "ERP job still exactly once");
  } finally {
    await cleanup(cart.id, `o4-${fixture.suffix}@vanstro.test`, fixture.product.id, fixture.sku.id);
  }
});

test("O6: an expired session releases its pending Order to payment_expired", async () => {
  const fixture = await createCheckoutCatalogFixture("o6");
  const cartToken = `o6-cart-${fixture.suffix}`;
  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: fixture.sku.id, quantity: 1 } });

  try {
    const body = JSON.stringify({
      firstName: "Order", lastName: "Test", email: `o6-${fixture.suffix}@vanstro.test`,
      phone: "204-555-0100", fulfillment: "pickup", paymentMethod: "cash",
      dealerLocationId: fixture.location.id
    });
    await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `o6-${fixture.suffix}` },
      body
    });
    const session = await prisma.paymentSession.findFirst({ where: { cartId: cart.id } });
    assert.ok(session, "PaymentSession exists");
    const pending = await prisma.order.findUnique({ where: { paymentSessionId: session.id } });
    assert.ok(pending, "pending Order exists");

    // Force expiry + invoke finalize (not_payable path).
    await prisma.paymentSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const result = await finalizeConfirmedPayment(session.id, `o6-provider-${fixture.suffix}`);
    assert.equal(result.status, "not_payable");
    const expired = await prisma.order.findUnique({ where: { id: pending.id } });
    assert.equal(expired?.status, "payment_expired", "pending Order released to payment_expired");
    const erpJobs = await prisma.erpSyncJob.count({ where: { type: "order_create", payload: { path: ["orderId"], equals: pending.id } } });
    assert.equal(erpJobs, 0, "no ERP job for an unpaid/expired Order");
  } finally {
    await cleanup(cart.id, `o6-${fixture.suffix}@vanstro.test`, fixture.product.id, fixture.sku.id);
  }
});
