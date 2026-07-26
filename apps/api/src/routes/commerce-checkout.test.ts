import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

const app = createApp();

test("duplicate checkout for the same cart returns 409", async () => {
  const suffix = randomBytes(6).toString("hex");
  const cartToken = `dup-cart-${suffix}`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location, "seeded dealer location is required");

  const sku = await prisma.platformSku.findFirst({
    where: { status: "active", product: { status: "active" }, prices: { some: { status: "active" } } },
    include: { product: true }
  });
  assert.ok(sku, "seeded priced SKU is required");

  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: sku.id, quantity: 1 } });
  await prisma.paymentSession.create({
    data: {
      cartId: cart.id,
      status: "pending",
      fulfillment: "pickup",
      paymentMethod: "cash",
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

  const body = JSON.stringify({
    firstName: "Dup",
    lastName: "Checkout",
    email: `dup-${suffix}@vanstro.test`,
    phone: "204-555-0100",
    fulfillment: "pickup",
    paymentMethod: "cash"
  });
  const headers = {
    "content-type": "application/json",
    "x-cart-token": cartToken,
    "idempotency-key": `checkout-${suffix}`
  };

  try {
    const response = await app.request("/api/v1/checkout/session", { method: "POST", headers, body });
    assert.equal(response.status, 409);
    const json = (await response.json()) as { code?: string };
    assert.equal(json.code, "CHECKOUT_INVALID");
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
    where: { status: "active", product: { status: "active" }, prices: { some: { status: "active" } } },
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
  const sku = await prisma.platformSku.findFirst({
    where: { status: "active", product: { status: "active" }, prices: { some: { status: "active" } } }
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
  const suffix = randomBytes(6).toString("hex");
  const cartToken = `promo-cart-${suffix}`;
  const location = await prisma.dealerLocation.findFirst({ where: { dealer: { status: "active" }, pickupAvailable: true } });
  const sku = await prisma.platformSku.findFirst({ where: { status: "active", product: { status: "active" }, prices: { some: { status: "active" } } }, include: { prices: { where: { status: "active" }, take: 1 } } });
  assert.ok(location && sku?.prices[0]);
  const snapshot = await prisma.inventorySnapshot.findFirstOrThrow({ where: { skuId: sku!.id, dealerLocationId: location!.id } });
  await prisma.inventorySnapshot.update({ where: { id: snapshot.id }, data: { quantityOnHand: Math.max(snapshot.quantityOnHand, snapshot.quantityReserved + 5), updatedAt: new Date() } });
  const cart = await prisma.cart.create({ data: { guestToken: cartToken } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: sku!.id, quantity: 1 } });
  const promotion = await prisma.promotion.create({ data: { key: `save10-${suffix}`, name: "Save 10", status: "active", discountPercent: 10, minimumSubtotalCents: 1 } });
  try {
    const response = await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cart-token": cartToken, "idempotency-key": `promo-${suffix}` },
      body: JSON.stringify({ firstName: "Promo", lastName: "Buyer", email: `promo-${suffix}@vanstro.test`, phone: "204-555-0100", fulfillment: "pickup", paymentMethod: "cash", dealerLocationId: location!.id, couponCode: promotion.key.toUpperCase() })
    });
    assert.equal(response.status, 201, await response.clone().text());
    const session = await prisma.paymentSession.findFirstOrThrow({ where: { cartId: cart.id } });
    assert.equal(session.promotionKey, promotion.key);
    assert.equal(session.discountCents, Math.round(session.subtotalCents * 0.1));
    assert.equal(session.totalCents, session.subtotalCents - session.discountCents + session.taxCents + session.shippingCents);
  } finally {
    const session = await prisma.paymentSession.findFirst({ where: { cartId: cart.id } });
    if (session) {
      const reservations = await prisma.inventoryReservation.findMany({ where: { paymentSessionId: session.id } });
      for (const reservation of reservations) await prisma.inventorySnapshot.updateMany({ where: { skuId: reservation.skuId, dealerLocationId: reservation.dealerLocationId }, data: { quantityReserved: { decrement: reservation.quantity } } });
      await prisma.inventoryReservation.deleteMany({ where: { paymentSessionId: session.id } });
      await prisma.paymentSession.delete({ where: { id: session.id } });
    }
    await prisma.promotion.delete({ where: { id: promotion.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
  }
});

test("inventory reservation requires dealerLocationId", async () => {
  const sku = await prisma.platformSku.findFirst({
    where: { status: "active", product: { status: "active" } },
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
