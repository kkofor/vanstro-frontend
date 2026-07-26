import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
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
