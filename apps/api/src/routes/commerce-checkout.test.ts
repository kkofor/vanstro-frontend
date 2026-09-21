import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { createApp } from "../app.js";
import { createCommerceRoutes } from "./commerce.js";

process.env.INVENTORY_SOURCE_MODE = "manual";
const app = createApp();

function twoRequestBarrier() {
  let arrived = 0;
  let release: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrived += 1;
    if (arrived === 2) release?.();
    await ready;
  };
}

async function settleAllOrThrow<T>(promises: Array<T | PromiseLike<T>>) {
  const settled = await Promise.allSettled(promises);
  const errors = settled.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
  if (errors.length > 0) throw new AggregateError(errors, "Concurrent test requests failed.");
  return settled.map((result) => (result as PromiseFulfilledResult<T>).value);
}

async function createCheckoutCatalogFixture(label: string) {
  const suffix = `${label}-${randomBytes(6).toString("hex")}`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location, "seeded pickup dealer location is required");
  const product = await prisma.product.create({
    data: { slug: `checkout-${suffix}`, name: `Checkout ${label}`, status: "active" }
  });
  const sku = await prisma.platformSku.create({
    data: { productId: product.id, skuCode: `CHECKOUT-${suffix}`, name: `Checkout ${label}`, status: "active" }
  });
  const price = await prisma.price.create({
    data: {
      key: `checkout-${suffix}`,
      skuId: sku.id,
      currency: "CAD",
      amountCents: 1000,
      status: "active",
      effectiveFrom: new Date(Date.now() - 1000)
    }
  });
  const snapshot = await prisma.inventorySnapshot.create({
    data: { skuId: sku.id, dealerLocationId: location.id, quantityOnHand: 5, quantityReserved: 0 }
  });
  return { suffix, location, product, sku, price, snapshot };
}

async function cleanupCheckoutCatalogFixture(input: {
  cartId: string;
  email: string;
  productId: string;
  skuId: string;
  snapshotId: string;
}) {
  const sessions = await prisma.paymentSession.findMany({
    where: { cartId: input.cartId },
    select: { id: true }
  });
  const sessionIds = sessions.map((session) => session.id);
  const reservations = await prisma.inventoryReservation.findMany({
    where: { paymentSessionId: { in: sessionIds } },
    select: { id: true }
  });
  for (const reservation of reservations) {
    await prisma.erpSyncJob.deleteMany({
      where: { payload: { path: ["reservationId"], equals: reservation.id } }
    });
  }
  await prisma.inventoryReservation.deleteMany({ where: { id: { in: reservations.map((reservation) => reservation.id) } } });
  await prisma.paymentEvent.deleteMany({ where: { paymentSessionId: { in: sessionIds } } });
  await prisma.order.deleteMany({ where: { paymentSessionId: { in: sessionIds } } });
  await prisma.paymentSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.crmContactEvent.deleteMany({ where: { contact: { email: input.email } } });
  await prisma.crmContact.deleteMany({ where: { email: input.email } });
  await prisma.cartItem.deleteMany({ where: { cartId: input.cartId } });
  await prisma.cart.deleteMany({ where: { id: input.cartId } });
  await prisma.inventorySnapshot.deleteMany({ where: { id: input.snapshotId } });
  await prisma.price.deleteMany({ where: { skuId: input.skuId } });
  await prisma.platformSku.deleteMany({ where: { id: input.skuId } });
  await prisma.product.deleteMany({ where: { id: input.productId } });
}

test("duplicate checkout for the same cart resumes the pending session", async () => {
  const suffix = randomBytes(6).toString("hex");
  const cartToken = `dup-cart-${suffix}`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location, "seeded dealer location is required");

  const sku = await prisma.platformSku.findFirst({
    where: { skuCode: "011090130" },
    include: { product: true }
  });
  assert.ok(sku, "seeded priced SKU is required");

  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: sku.id, quantity: 1 } });
  const checkoutBody = {
    firstName: "Dup",
    lastName: "Checkout",
    email: `dup-${suffix}@vanstro.test`,
    phone: "204-555-0100",
    fulfillment: "pickup",
    paymentMethod: "cash"
  };
  const pendingSession = await prisma.paymentSession.create({
    data: {
      cartId: cart.id,
      status: "pending",
      fulfillment: "pickup",
      paymentMethod: "cash",
      idempotencyKey: `initial-${suffix}`,
      requestHash: createHash("sha256").update(JSON.stringify(checkoutBody)).digest("hex"),
      paymentInit: { provider: "manual" },
      guestEmail: `dup-${suffix}@vanstro.test`,
      guestFirstName: "Dup",
      guestLastName: "Checkout",
      guestPhone: "204-555-0100",
      guestOrderToken: randomBytes(16).toString("base64url"),
      dealerLocationId: location.id,
      subtotalCents: 1000,
      taxCents: 0,
      shippingCents: 0,
      totalCents: 1000,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      items: [{
        skuId: sku.id,
        skuCode: sku.skuCode,
        productName: sku.product.name,
        quantity: 1,
        unitPriceCents: 1000,
        lineTotalCents: 1000,
        currency: "CAD"
      }]
    }
  });

  const body = JSON.stringify(checkoutBody);
  const headers = {
    "content-type": "application/json",
    "x-cart-token": cartToken,
    "idempotency-key": `checkout-${suffix}`
  };

  try {
    const response = await app.request("/api/v1/checkout/session", { method: "POST", headers, body });
    assert.equal(response.status, 200);
    const json = (await response.json()) as { data?: { id?: string }; meta?: { replayed?: boolean } };
    assert.equal(json.data?.id, pendingSession.id);
    assert.equal(json.meta?.replayed, true);
  } finally {
    await prisma.paymentSession.deleteMany({ where: { cartId: cart.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
  }
});

test("delivery checkout requires a complete shipping address", async () => {
  const suffix = randomBytes(6).toString("hex");
  const cartToken = `delivery-cart-${suffix}`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, deliveryAvailable: true }
  });
  assert.ok(location, "seeded delivery dealer location is required");

  const sku = await prisma.platformSku.findFirst({
    where: { skuCode: "011090130" },
    include: { product: true }
  });
  assert.ok(sku, "seeded priced SKU is required");

  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: sku.id, quantity: 1 } });

  const body = JSON.stringify({
    firstName: "Ship",
    lastName: "Test",
    email: `delivery-${suffix}@vanstro.test`,
    phone: "204-555-0100",
    fulfillment: "delivery",
    paymentMethod: "cash",
    dealerLocationId: location.id
  });
  const headers = {
    "content-type": "application/json",
    "x-cart-token": cartToken,
    "idempotency-key": `checkout-${suffix}`
  };

  try {
    const response = await app.request("/api/v1/checkout/session", { method: "POST", headers, body });
    assert.equal(response.status, 400);
    const json = (await response.json()) as { code?: string };
    assert.equal(json.code, "CHECKOUT_INVALID");
  } finally {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
  }
});

test("delivery checkout rejects a non-Canadian address", async () => {
  const suffix = randomBytes(6).toString("hex");
  const cartToken = `country-cart-${suffix}`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, deliveryAvailable: true }
  });
  assert.ok(location);
  const sku = await prisma.platformSku.findUnique({
    where: { skuCode: "011090130" }
  });
  assert.ok(sku);
  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: sku.id, quantity: 1 } });

  try {
    const response = await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cart-token": cartToken,
        "idempotency-key": `country-${suffix}`
      },
      body: JSON.stringify({
        firstName: "Ship",
        lastName: "Test",
        email: `country-${suffix}@vanstro.test`,
        phone: "204-555-0100",
        fulfillment: "delivery",
        paymentMethod: "cash",
        dealerLocationId: location!.id,
        shippingAddressLine1: "123 Main St",
        shippingCity: "Winnipeg",
        shippingProvince: "MB",
        shippingPostalCode: "R3C 1A1",
        shippingCountry: "US"
      })
    });
    assert.equal(response.status, 400);
    const json = (await response.json()) as { code?: string };
    assert.equal(json.code, "CHECKOUT_INVALID");
  } finally {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
  }
});

test("checkout idempotency replay is scoped to the same cart and restores payment metadata", async () => {
  const suffix = randomBytes(6).toString("hex");
  const idempotencyKey = `replay-${suffix}`;
  const body = {
    firstName: "Replay",
    lastName: "Buyer",
    email: `replay-${suffix}@vanstro.test`,
    phone: "204-555-0100",
    fulfillment: "pickup",
    paymentMethod: "cash"
  };
  const requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const firstCart = await prisma.cart.create({ data: { guestToken: `first-${suffix}` } });
  const secondCart = await prisma.cart.create({ data: { guestToken: `second-${suffix}` } });
  const session = await prisma.paymentSession.create({
    data: {
      cartId: firstCart.id,
      idempotencyKey,
      requestHash,
      paymentInit: { provider: "manual", providerRef: "manual-ref" },
      fulfillment: "pickup",
      paymentMethod: "cash",
      guestEmail: body.email,
      guestFirstName: body.firstName,
      guestLastName: body.lastName,
      guestPhone: body.phone,
      guestOrderToken: randomBytes(16).toString("base64url"),
      subtotalCents: 1000,
      totalCents: 1000,
      items: [],
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  });

  try {
    const replay = await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cart-token": firstCart.guestToken!,
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify(body)
    });
    assert.equal(replay.status, 200);
    const replayBody = await replay.json() as { meta?: { replayed?: boolean; payment?: { providerRef?: string } } };
    assert.equal(replayBody.meta?.replayed, true);
    assert.equal(replayBody.meta?.payment?.providerRef, "manual-ref");

    const crossCart = await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cart-token": secondCart.guestToken!,
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify(body)
    });
    assert.equal(crossCart.status, 409);
  } finally {
    await prisma.paymentSession.delete({ where: { id: session.id } });
    await prisma.cart.deleteMany({ where: { id: { in: [firstCart.id, secondCart.id] } } });
  }
});

test("checkout applies active percentage promotion after minimum subtotal", async () => {
  const fixture = await createCheckoutCatalogFixture("promotion");
  const cartToken = `promo-cart-${fixture.suffix}`;
  const email = `promo-${fixture.suffix}@vanstro.test`;
  const cart = await prisma.cart.create({ data: { guestToken: cartToken, currency: "CAD" } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: fixture.sku.id, quantity: 1 } });
  const promotion = await prisma.promotion.create({
    data: { key: `save10-${fixture.suffix}`, name: "Save 10", status: "active", discountPercent: 10, minimumSubtotalCents: 1 }
  });
  try {
    const response = await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `promo-${fixture.suffix}` },
      body: JSON.stringify({ firstName: "Promo", lastName: "Buyer", email, phone: "204-555-0100", fulfillment: "pickup", paymentMethod: "cash", dealerLocationId: fixture.location.id, couponCode: promotion.key.toUpperCase() })
    });
    assert.equal(response.status, 201, await response.clone().text());
    const session = await prisma.paymentSession.findFirstOrThrow({ where: { cartId: cart.id } });
    assert.equal(session.promotionKey, promotion.key);
    assert.equal(session.discountCents, Math.round(session.subtotalCents * 0.1));
    assert.equal(session.totalCents, session.subtotalCents - session.discountCents + session.taxCents + session.shippingCents);
  } finally {
    await prisma.promotion.deleteMany({ where: { id: promotion.id } });
    await cleanupCheckoutCatalogFixture({
      cartId: cart.id,
      email,
      productId: fixture.product.id,
      skuId: fixture.sku.id,
      snapshotId: fixture.snapshot.id
    });
  }
});

test("concurrent checkout intents create one payable session per cart", async () => {
  const fixture = await createCheckoutCatalogFixture("concurrent");
  const cartToken = `concurrent-cart-${fixture.suffix}`;
  const email = `concurrent-${fixture.suffix}@vanstro.test`;
  const cart = await prisma.cart.create({ data: { guestToken: cartToken, currency: "CAD" } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: fixture.sku.id, quantity: 1 } });
  const body = JSON.stringify({
    firstName: "Concurrent",
    lastName: "Buyer",
    email,
    phone: "204-555-0100",
    fulfillment: "pickup",
    paymentMethod: "cash",
    dealerLocationId: fixture.location.id
  });
  try {
    const [first, second] = await settleAllOrThrow([
      app.request("/api/v1/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `first-${fixture.suffix}` },
        body
      }),
      app.request("/api/v1/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `second-${fixture.suffix}` },
        body
      })
    ]);
    assert.ok([200, 201].includes(first.status), await first.clone().text());
    assert.ok([200, 201].includes(second.status), await second.clone().text());
    const [firstJson, secondJson] = await Promise.all([
      first.json() as Promise<{ data: { id: string } }>,
      second.json() as Promise<{ data: { id: string } }>
    ]);
    assert.equal(firstJson.data.id, secondJson.data.id);
    assert.equal(await prisma.paymentSession.count({
      where: { cartId: cart.id, status: "pending", expiresAt: { gt: new Date() } }
    }), 1);
  } finally {
    await cleanupCheckoutCatalogFixture({
      cartId: cart.id,
      email,
      productId: fixture.product.id,
      skuId: fixture.sku.id,
      snapshotId: fixture.snapshot.id
    });
  }
});

test("concurrent different checkout intents allow one winner and reject the conflicting payload", async () => {
  const suffix = randomBytes(6).toString("hex");
  const cartToken = `conflicting-cart-${suffix}`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location);
  const product = await prisma.product.create({
    data: { slug: `conflicting-checkout-${suffix}`, name: "Conflicting Checkout", status: "active" }
  });
  const sku = await prisma.platformSku.create({
    data: {
      productId: product.id,
      skuCode: `CONFLICT-${suffix}`,
      name: "Conflicting Checkout SKU",
      status: "active"
    }
  });
  await prisma.price.create({
    data: {
      key: `conflicting-checkout-${suffix}`,
      skuId: sku.id,
      currency: "CAD",
      amountCents: 1000,
      status: "active",
      effectiveFrom: new Date(Date.now() - 1000)
    }
  });
  const snapshot = await prisma.inventorySnapshot.create({
    data: {
      skuId: sku.id,
      dealerLocationId: location.id,
      quantityOnHand: 2,
      quantityReserved: 0
    }
  });
  const cart = await prisma.cart.create({ data: { guestToken: cartToken, currency: "CAD" } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: sku.id, quantity: 1 } });
  const conflictApp = new Hono();
  conflictApp.route("/api/v1", createCommerceRoutes(undefined, undefined, undefined, twoRequestBarrier()));
  const checkout = (firstName: string, key: string) => conflictApp.request("/api/v1/checkout/session", {
    method: "POST",
    headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": key },
    body: JSON.stringify({
      firstName,
      lastName: "Buyer",
      email: `conflicting-${suffix}@vanstro.test`,
      phone: "204-555-0100",
      fulfillment: "pickup",
      paymentMethod: "cash",
      dealerLocationId: location.id
    })
  });

  try {
    const responses = await settleAllOrThrow([
      checkout("First", `first-conflicting-${suffix}`),
      checkout("Second", `second-conflicting-${suffix}`)
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    const conflict = responses.find((response) => response.status === 409);
    assert.ok(conflict);
    const conflictBody = await conflict.json() as { code?: string; error?: string };
    assert.equal(conflictBody.code, "CHECKOUT_INVALID");
    assert.equal(conflictBody.error, "A different checkout is already active for this cart.");
    assert.equal(await prisma.paymentSession.count({
      where: { cartId: cart.id, status: "pending", expiresAt: { gt: new Date() } }
    }), 1);
    assert.equal(await prisma.inventoryReservation.count({
      where: { paymentSession: { cartId: cart.id }, status: "active" }
    }), 1);
  } finally {
    const sessions = await prisma.paymentSession.findMany({ where: { cartId: cart.id }, select: { id: true } });
    const reservations = await prisma.inventoryReservation.findMany({
      where: { paymentSessionId: { in: sessions.map((session) => session.id) } },
      select: { id: true }
    });
    for (const reservation of reservations) {
      await prisma.erpSyncJob.deleteMany({
        where: { payload: { path: ["reservationId"], equals: reservation.id } }
      });
    }
    await prisma.inventoryReservation.deleteMany({
      where: { id: { in: reservations.map((reservation) => reservation.id) } }
    });
    await prisma.order.deleteMany({ where: { paymentSessionId: { in: sessions.map((session) => session.id) } } });
    await prisma.paymentSession.deleteMany({ where: { cartId: cart.id } });
    await prisma.crmContactEvent.deleteMany({ where: { contact: { email: `conflicting-${suffix}@vanstro.test` } } });
    await prisma.crmContact.deleteMany({ where: { email: `conflicting-${suffix}@vanstro.test` } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
    await prisma.inventorySnapshot.delete({ where: { id: snapshot.id } });
    await prisma.price.deleteMany({ where: { skuId: sku.id } });
    await prisma.platformSku.delete({ where: { id: sku.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }
});

test("inventory reservation requires dealerLocationId", async () => {
  const sku = await prisma.platformSku.findUnique({
    where: { skuCode: "011090130" },
    include: { product: true }
  });
  assert.ok(sku, "seeded SKU is required");

  const response = await app.request("/api/v1/inventory/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: sku.product.id, quantity: 1 })
  });
  assert.equal(response.status, 400);
  const json = (await response.json()) as { code?: string };
  assert.equal(json.code, "COMMERCE_INVALID");
});
