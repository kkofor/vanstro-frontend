import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { createApp } from "../app.js";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

type Fixture = Awaited<ReturnType<typeof createCartFixture>>;

async function createCartFixture(label: string, prices: Array<{ currency: string; amountCents: number; effectiveFrom?: Date }>) {
  const suffix = `${label}-${randomUUID()}`;
  const product = await prisma.product.create({
    data: { slug: `cart-${suffix}`, name: `Cart ${label}`, status: "active" }
  });
  const sku = await prisma.platformSku.create({
    data: { productId: product.id, skuCode: `SKU-${suffix}`, name: `SKU ${label}`, status: "active" }
  });
  for (const [index, price] of prices.entries()) {
    await prisma.price.create({
      data: {
        key: `price-${suffix}-${index}`,
        skuId: sku.id,
        currency: price.currency,
        amountCents: price.amountCents,
        status: "active",
        effectiveFrom: price.effectiveFrom ?? new Date(Date.now() - (index + 1) * 1000)
      }
    });
  }
  const cart = await prisma.cart.create({
    data: { guestToken: `guest-${suffix}`, currency: "CAD" }
  });
  return { suffix, product, sku, cart };
}

async function cleanupCartFixture(fixture: Fixture) {
  await prisma.paymentEvent.deleteMany({ where: { paymentSession: { cartId: fixture.cart.id } } });
  await prisma.inventoryReservation.deleteMany({ where: { paymentSession: { cartId: fixture.cart.id } } });
  await prisma.paymentSession.deleteMany({ where: { cartId: fixture.cart.id } });
  await prisma.cartItem.deleteMany({ where: { cartId: fixture.cart.id } });
  await prisma.cart.deleteMany({ where: { id: fixture.cart.id } });
  await prisma.price.deleteMany({ where: { skuId: fixture.sku.id } });
  await prisma.platformSku.deleteMany({ where: { id: fixture.sku.id } });
  await prisma.product.deleteMany({ where: { id: fixture.product.id } });
}

function cartHeaders(token: string) {
  return { "content-type": "application/json", "x-cart-token": token };
}

async function addItem(fixture: Fixture, quantity: number, extraHeaders?: Record<string, string>) {
  return app.request("/api/v1/cart/items", {
    method: "POST",
    headers: { ...cartHeaders(fixture.cart.guestToken!), ...extraHeaders },
    body: JSON.stringify({ productId: fixture.product.slug, skuCode: fixture.sku.skuCode, quantity })
  });
}

async function settleAllOrThrow<T>(promises: Array<T | PromiseLike<T>>) {
  const settled = await Promise.allSettled(promises);
  const errors = settled.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
  if (errors.length > 0) throw new AggregateError(errors, "Concurrent test requests failed.");
  return settled.map((result) => (result as PromiseFulfilledResult<T>).value);
}

async function waitForCartAdvisoryLockWait(cartId: string, minimumWaiters = 1) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const waiting = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM pg_locks
      WHERE locktype = 'advisory'
        AND NOT granted
        AND classid::bigint = ((hashtextextended(${cartId}, 0) >> 32) & 4294967295)
        AND objid::bigint = (hashtextextended(${cartId}, 0) & 4294967295)
        AND objsubid = 1
    `;
    if ((waiting[0]?.count ?? 0) >= minimumWaiters) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${minimumWaiters} mutation(s) on the target Cart advisory lock.`);
}

test("Cart selects the active price matching its CAD currency", async () => {
  const fixture = await createCartFixture("dual-price", [
    { currency: "CAD", amountCents: 1250, effectiveFrom: new Date(Date.now() - 60_000) },
    { currency: "USD", amountCents: 900, effectiveFrom: new Date() }
  ]);
  try {
    const response = await addItem(fixture, 1);
    assert.equal(response.status, 201, await response.clone().text());
    const body = await response.json() as {
      data: { items: Array<{ unitPrice: { amountCents: number; currency: string } }>; subtotal: { amountCents: number; currency: string } };
    };
    assert.equal(body.data.items[0]?.unitPrice.currency, "CAD");
    assert.equal(body.data.items[0]?.unitPrice.amountCents, 1250);
    assert.deepEqual(body.data.subtotal, { amount: 12.5, amountCents: 1250, currency: "CAD" });
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Cart fails closed when no active price matches its currency", async () => {
  const fixture = await createCartFixture("usd-only", [{ currency: "USD", amountCents: 900 }]);
  try {
    const response = await addItem(fixture, 1);
    assert.equal(response.status, 409);
    const body = await response.json() as { code?: string; error?: string };
    assert.equal(body.code, "COMMERCE_INVALID");
    assert.equal(body.error, "No active price matches the cart currency.");
    assert.equal(await prisma.cartItem.count({ where: { cartId: fixture.cart.id } }), 0);
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Cart GET rejects a persisted mixed-currency state instead of summing minor units", async () => {
  const fixture = await createCartFixture("mixed-state", [{ currency: "USD", amountCents: 900 }]);
  try {
    await prisma.cartItem.create({ data: { cartId: fixture.cart.id, skuId: fixture.sku.id, quantity: 1 } });
    const response = await app.request("/api/v1/cart", {
      headers: { "x-cart-token": fixture.cart.guestToken! }
    });
    assert.equal(response.status, 409);
    const body = await response.json() as { code?: string };
    assert.equal(body.code, "COMMERCE_INVALID");
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Checkout rejects a Cart without a matching CAD price before creating reservations", async () => {
  const fixture = await createCartFixture("checkout-usd", [{ currency: "USD", amountCents: 900 }]);
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location);
  const snapshot = await prisma.inventorySnapshot.create({
    data: {
      skuId: fixture.sku.id,
      dealerLocationId: location.id,
      quantityOnHand: 10,
      quantityReserved: 0
    }
  });
  try {
    await prisma.cartItem.create({ data: { cartId: fixture.cart.id, skuId: fixture.sku.id, quantity: 1 } });
    const response = await app.request("/api/v1/checkout/session", {
      method: "POST",
      headers: {
        ...cartHeaders(fixture.cart.guestToken!),
        "idempotency-key": `checkout-${fixture.suffix}`
      },
      body: JSON.stringify({
        firstName: "Currency",
        lastName: "Test",
        email: `currency-${fixture.suffix}@example.test`,
        phone: "204-555-0100",
        fulfillment: "pickup",
        paymentMethod: "cash",
        dealerLocationId: location.id
      })
    });
    assert.equal(response.status, 409);
    const body = await response.json() as { code?: string };
    assert.equal(body.code, "COMMERCE_INVALID");
    assert.equal(await prisma.paymentSession.count({ where: { cartId: fixture.cart.id } }), 0);
    assert.equal(await prisma.inventoryReservation.count({ where: { skuId: fixture.sku.id } }), 0);
    assert.equal((await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } })).quantityReserved, 0);
  } finally {
    await prisma.inventorySnapshot.deleteMany({ where: { id: snapshot.id } });
    await prisma.crmContact.deleteMany({ where: { email: `currency-${fixture.suffix}@example.test` } });
    await cleanupCartFixture(fixture);
  }
});

test("Cart add rejects coercible non-number quantities", async () => {
  const fixture = await createCartFixture("quantity-types", [{ currency: "CAD", amountCents: 1000 }]);
  try {
    for (const quantity of ["2", true]) {
      const response = await app.request("/api/v1/cart/items", {
        method: "POST",
        headers: cartHeaders(fixture.cart.guestToken!),
        body: JSON.stringify({ productId: fixture.product.slug, skuCode: fixture.sku.skuCode, quantity })
      });
      assert.equal(response.status, 400);
      assert.equal(await prisma.cartItem.count({ where: { cartId: fixture.cart.id } }), 0);
    }
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Cart repeated add enforces the final quantity limit atomically", async () => {
  const fixture = await createCartFixture("quantity", [{ currency: "CAD", amountCents: 1000 }]);
  try {
    await prisma.cartItem.create({ data: { cartId: fixture.cart.id, skuId: fixture.sku.id, quantity: 998 } });
    const allowed = await addItem(fixture, 1);
    assert.equal(allowed.status, 201, await allowed.clone().text());
    assert.equal((await prisma.cartItem.findFirstOrThrow({ where: { cartId: fixture.cart.id } })).quantity, 999);

    const rejected = await addItem(fixture, 1);
    assert.equal(rejected.status, 409);
    const body = await rejected.json() as { code?: string };
    assert.equal(body.code, "COMMERCE_INVALID");
    assert.equal((await prisma.cartItem.findFirstOrThrow({ where: { cartId: fixture.cart.id } })).quantity, 999);
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Concurrent Cart adds cannot move the final quantity above 999", async () => {
  const fixture = await createCartFixture("quantity-concurrent", [{ currency: "CAD", amountCents: 1000 }]);
  try {
    await prisma.cartItem.create({ data: { cartId: fixture.cart.id, skuId: fixture.sku.id, quantity: 998 } });
    const responses = await settleAllOrThrow([addItem(fixture, 1), addItem(fixture, 1)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    assert.equal((await prisma.cartItem.findFirstOrThrow({ where: { cartId: fixture.cart.id } })).quantity, 999);
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Cart add returns a stable conflict when its resolved guest Cart is deleted while waiting for the lock", async () => {
  const fixture = await createCartFixture("deleted-during-add", [{ currency: "CAD", amountCents: 1000 }]);
  try {
    let pending: Promise<Response> | undefined;
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${fixture.cart.id}, 0))`;
      pending = addItem(fixture, 1);
      await waitForCartAdvisoryLockWait(fixture.cart.id);
      await transaction.cart.delete({ where: { id: fixture.cart.id } });
    });
    assert.ok(pending);
    const response = await pending;
    assert.equal(response.status, 409);
    const body = await response.json() as { code?: string; error?: string };
    assert.equal(body.code, "COMMERCE_INVALID");
    assert.equal(body.error, "Cart identity changed while the item was being added. Please try again.");
    assert.equal(await prisma.cartItem.count({ where: { cartId: fixture.cart.id } }), 0);
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Cart quantity PATCH accepts 1 and 999 and rejects invalid values without mutation", async () => {
  const fixture = await createCartFixture("patch", [{ currency: "CAD", amountCents: 1000 }]);
  try {
    const item = await prisma.cartItem.create({ data: { cartId: fixture.cart.id, skuId: fixture.sku.id, quantity: 1 } });
    for (const quantity of [1, 999]) {
      const response = await app.request(`/api/v1/cart/items/${item.id}`, {
        method: "PATCH",
        headers: cartHeaders(fixture.cart.guestToken!),
        body: JSON.stringify({ quantity })
      });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { id: item.id } })).quantity, quantity);
    }
    for (const quantity of [0, -1, 1.5, 1000, "2", true]) {
      const response = await app.request(`/api/v1/cart/items/${item.id}`, {
        method: "PATCH",
        headers: cartHeaders(fixture.cart.guestToken!),
        body: JSON.stringify({ quantity })
      });
      assert.equal(response.status, 400);
      assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { id: item.id } })).quantity, 999);
    }
  } finally {
    await cleanupCartFixture(fixture);
  }
});

test("Authenticated guest Cart merge rejects overflow without partial mutation", async () => {
  const fixture = await createCartFixture("merge-overflow", [{ currency: "CAD", amountCents: 1000 }]);
  const email = `merge-${fixture.suffix}@example.test`;
  try {
    await prisma.cartItem.create({ data: { cartId: fixture.cart.id, skuId: fixture.sku.id, quantity: 2 } });
    const registration = await app.request("/api/v1/auth/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password: "merge-cart-password", firstName: "Merge", lastName: "Cart" })
    });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const customerCart = await prisma.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, currency: "CAD" } });
    await prisma.cartItem.create({ data: { cartId: customerCart.id, skuId: fixture.sku.id, quantity: 998 } });

    const response = await app.request("/api/v1/cart", {
      headers: { cookie, "x-cart-token": fixture.cart.guestToken! }
    });
    assert.equal(response.status, 409);
    const body = await response.json() as { code?: string };
    assert.equal(body.code, "COMMERCE_INVALID");
    assert.equal((await prisma.cartItem.findFirstOrThrow({ where: { cartId: customerCart.id } })).quantity, 998);
    assert.equal((await prisma.cartItem.findFirstOrThrow({ where: { cartId: fixture.cart.id } })).quantity, 2);
  } finally {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const customerCart = await prisma.cart.findUnique({ where: { userId: user.id } });
      if (customerCart) {
        await prisma.cartItem.deleteMany({ where: { cartId: customerCart.id } });
        await prisma.cart.delete({ where: { id: customerCart.id } });
      }
    }
    await prisma.emailOutbox.deleteMany({ where: { toEmail: email } });
    await prisma.crmContact.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
    await cleanupCartFixture(fixture);
  }
});
