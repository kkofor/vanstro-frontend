import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";
import { loadApiConfig } from "../config.js";
import { finalizeConfirmedPayment } from "../payments/finalize.js";

const app = createApp();
const paymentCallbackSecret = loadApiConfig().paymentCallbackSecret;

async function createCheckoutFixture(suffix: string) {
  const email = `payment-${suffix}@vanstro.test`;
  const location = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true }
  });
  assert.ok(location, "seeded dealer location is required");

  const product = await prisma.product.create({
    data: { slug: `payment-${suffix}`, name: `Payment ${suffix}`, status: "active" }
  });
  const sku = await prisma.platformSku.create({
    data: {
      productId: product.id,
      skuCode: `PAY-${suffix}`,
      name: `Payment ${suffix}`,
      status: "active"
    }
  });
  const unitPriceCents = 1000;
  await prisma.price.create({
    data: {
      key: `payment-${suffix}`,
      skuId: sku.id,
      currency: "CAD",
      amountCents: unitPriceCents,
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

  const cart = await prisma.cart.create({ data: { guestToken: `cart-${suffix}`, currency: "CAD" } });
  await prisma.cartItem.create({ data: { cartId: cart.id, skuId: sku.id, quantity: 1 } });
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
          productName: product.name,
          quantity: 1,
          unitPriceCents,
          lineTotalCents: unitPriceCents,
          currency: "CAD"
        }
      ]
    }
  });

  const preparedSnapshot = await prisma.inventorySnapshot.update({
    where: { id: snapshot.id },
    data: {
      quantityOnHand: Math.max(snapshot.quantityOnHand, snapshot.quantityReserved + 1),
      quantityReserved: { increment: 1 }
    }
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

  return { cart, session, snapshot, preparedSnapshot, product, sku, location, unitPriceCents };
}

async function cleanupCheckoutFixture(fixture: Awaited<ReturnType<typeof createCheckoutFixture>>) {
  await prisma.emailOutbox.deleteMany({ where: { toEmail: fixture.session.guestEmail } });
  await prisma.crmContactEvent.deleteMany({ where: { contact: { email: fixture.session.guestEmail } } });
  await prisma.crmContact.deleteMany({ where: { email: fixture.session.guestEmail } });
  const order = await prisma.order.findUnique({ where: { paymentSessionId: fixture.session.id } });
  if (order) {
    await prisma.erpSyncJob.deleteMany({ where: { payload: { path: ["orderId"], equals: order.id } } });
    await prisma.orderStatusEvent.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
  }
  const reservations = await prisma.inventoryReservation.findMany({
    where: { paymentSessionId: fixture.session.id },
    select: { id: true }
  });
  for (const reservation of reservations) {
    await prisma.erpSyncJob.deleteMany({
      where: { payload: { path: ["reservationId"], equals: reservation.id } }
    });
  }
  await prisma.inventoryReservation.deleteMany({ where: { paymentSessionId: fixture.session.id } });
  await prisma.paymentEvent.deleteMany({ where: { paymentSessionId: fixture.session.id } });
  await prisma.paymentSession.deleteMany({ where: { id: fixture.session.id } });
  await prisma.cartItem.deleteMany({ where: { cartId: fixture.cart.id } });
  await prisma.cart.deleteMany({ where: { id: fixture.cart.id } });
  await prisma.inventorySnapshot.deleteMany({ where: { id: fixture.snapshot.id } });
  await prisma.price.deleteMany({ where: { skuId: fixture.sku.id } });
  await prisma.platformSku.deleteMany({ where: { id: fixture.sku.id } });
  await prisma.product.deleteMany({ where: { id: fixture.product.id } });
}

test("payment session access requires an unexpired session and matching guest token", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`session-access-${suffix}`);
  const { session } = fixture;
  const endpoint = `/api/v1/payments/sessions/${session.id}`;
  try {
    const unexpired = await app.request(`${endpoint}?token=${encodeURIComponent(session.guestOrderToken)}`);
    assert.equal(unexpired.status, 200);

    const mismatch = await app.request(`${endpoint}?token=${encodeURIComponent(`${session.guestOrderToken}-wrong`)}`);
    assert.equal(mismatch.status, 403);
    assert.equal((await mismatch.json() as { code?: string }).code, "PAYMENT_SESSION_DENIED");

    await prisma.paymentSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });
    const expired = await app.request(`${endpoint}?token=${encodeURIComponent(session.guestOrderToken)}`);
    assert.equal(expired.status, 403);
    assert.equal((await expired.json() as { code?: string }).code, "PAYMENT_SESSION_DENIED");
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("guest order token revoke denies payment-session reads and is idempotent", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`guest-revoke-${suffix}`);
  const { session } = fixture;
  const order = await prisma.order.create({
    data: {
      email: session.guestEmail,
      firstName: session.guestFirstName,
      lastName: session.guestLastName,
      phone: session.guestPhone,
      guestOrderToken: session.guestOrderToken,
      guestTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentSession: { connect: { id: session.id } },
      status: "pending_payment",
      fulfillment: session.fulfillment,
      paymentMethod: session.paymentMethod,
      subtotalCents: session.subtotalCents,
      discountCents: session.discountCents,
      taxCents: session.taxCents,
      shippingCents: session.shippingCents,
      totalCents: session.totalCents,
      currency: session.currency
    }
  });
  const token = encodeURIComponent(session.guestOrderToken);
  const paymentEndpoint = `/api/v1/payments/sessions/${session.id}?token=${token}`;
  const revokeEndpoint = `/api/v1/orders/${order.id}/guest-token/revoke?token=${token}`;
  try {
    assert.equal((await app.request(paymentEndpoint)).status, 200);

    const revoked = await app.request(revokeEndpoint, { method: "POST" });
    assert.equal(revoked.status, 200, await revoked.text());
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).guestTokenRevokedAt !== null, true);

    const denied = await app.request(paymentEndpoint);
    assert.equal(denied.status, 403);
    assert.equal((await denied.json() as { code?: string }).code, "PAYMENT_SESSION_DENIED");

    const repeated = await app.request(revokeEndpoint, { method: "POST" });
    assert.equal(repeated.status, 200);
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("guest order token revoke uses existing public not-found and access-denied codes", async () => {
  const unknownOrder = await app.request("/api/v1/orders/does-not-exist/guest-token/revoke?token=unknown", { method: "POST" });
  assert.equal(unknownOrder.status, 404);
  assert.equal((await unknownOrder.json() as { code?: string }).code, "COMMERCE_NOT_FOUND");

  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`guest-revoke-denied-${suffix}`);
  const order = await prisma.order.create({
    data: {
      email: fixture.session.guestEmail,
      firstName: fixture.session.guestFirstName,
      lastName: fixture.session.guestLastName,
      phone: fixture.session.guestPhone,
      guestOrderToken: fixture.session.guestOrderToken,
      guestTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentSession: { connect: { id: fixture.session.id } },
      status: "pending_payment",
      fulfillment: fixture.session.fulfillment,
      paymentMethod: fixture.session.paymentMethod,
      subtotalCents: fixture.session.subtotalCents,
      discountCents: fixture.session.discountCents,
      taxCents: fixture.session.taxCents,
      shippingCents: fixture.session.shippingCents,
      totalCents: fixture.session.totalCents,
      currency: fixture.session.currency
    }
  });
  try {
    const response = await app.request(
      `/api/v1/orders/${order.id}/guest-token/revoke?token=wrong-token`,
      { method: "POST" }
    );
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { code?: string }).code, "COMMERCE_ACCESS_DENIED");
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("payment callback is idempotent for order and ERP job creation", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`idem-${suffix}`);
  const { session, unitPriceCents } = fixture;

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

    const sessionResponse = await app.request(
      `/api/v1/payments/sessions/${session.id}?token=${encodeURIComponent(session.guestOrderToken)}`
    );
    assert.equal(sessionResponse.status, 200);
    const sessionJson = (await sessionResponse.json()) as { data: { status: string; orderId?: string } };
    assert.equal(sessionJson.data.status, "paid");
    assert.equal(sessionJson.data.orderId, firstJson.data.id);

    const [orderCount, erpJobCount] = await Promise.all([
      prisma.order.count({ where: { paymentSessionId: session.id } }),
      prisma.erpSyncJob.count({ where: { payload: { path: ["orderId"], equals: firstJson.data.id } } })
    ]);
    assert.equal(orderCount, 1);
    assert.equal(erpJobCount, 1);
    assert.equal(await prisma.cartItem.count({ where: { cartId: session.cartId! } }), 0);

    const orderConfirmation = await prisma.emailOutbox.findFirst({
      where: {
        templateKey: "order_confirmation",
        toEmail: session.guestEmail
      }
    });
    assert.ok(orderConfirmation);
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("a second provider transaction is reconciled without duplicating order side effects", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`duplicate-provider-${suffix}`);
  const { session, snapshot } = fixture;
  const originalProviderPaymentId = `pay-original-${suffix}`;
  const duplicateProviderPaymentId = `pay-duplicate-${suffix}`;
  const callback = (providerPaymentId: string) => app.request("/api/v1/payments/callback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-payment-signature": createHmac("sha256", paymentCallbackSecret)
        .update(`${session.id}:${providerPaymentId}`)
        .digest("hex")
    },
    body: JSON.stringify({ sessionId: session.id, providerPaymentId, status: "paid" })
  });
  const before = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } });
  try {
    const first = await callback(originalProviderPaymentId);
    assert.equal(first.status, 200, await first.clone().text());
    const afterFirst = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } });

    const duplicate = await callback(duplicateProviderPaymentId);
    assert.equal(duplicate.status, 409);
    const duplicateBody = await duplicate.json() as { code?: string; error?: string };
    assert.equal(duplicateBody.code, "COMMERCE_INVALID");
    assert.equal(duplicateBody.error, "Payment was confirmed but the order requires reconciliation.");

    const persisted = await prisma.paymentSession.findUniqueOrThrow({ where: { id: session.id } });
    assert.equal(persisted.status, "paid");
    assert.equal(persisted.providerPaymentId, originalProviderPaymentId);
    assert.equal(await prisma.order.count({ where: { paymentSessionId: session.id } }), 1);
    assert.equal(await prisma.cartItem.count({ where: { cartId: session.cartId! } }), 0);
    const afterDuplicate = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } });
    assert.equal(afterDuplicate.quantityOnHand, afterFirst.quantityOnHand);
    assert.equal(afterDuplicate.quantityReserved, afterFirst.quantityReserved);
    assert.equal(
      await prisma.paymentEvent.count({
        where: { paymentSessionId: session.id, type: "provider_confirmed" }
      }),
      2
    );
    const reconciliation = await prisma.paymentEvent.findUnique({
      where: {
        paymentSessionId_type_providerEventId: {
          paymentSessionId: session.id,
          type: "reconciliation_required",
          providerEventId: duplicateProviderPaymentId
        }
      }
    });
    assert.ok(reconciliation);
    assert.deepEqual(reconciliation.payload, { reason: "duplicate_provider_transaction" });

    const login = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local",
        password: process.env.SUPER_ADMIN_PASSWORD
      })
    });
    assert.equal(login.status, 200);
    const auth = await login.json() as { data: { accessToken: string } };
    const queue = await app.request("/api/v1/dashboard/payment-reconciliation?page=1&pageSize=100", {
      headers: { authorization: `Bearer ${auth.data.accessToken}` }
    });
    assert.equal(queue.status, 200);
    const queueText = await queue.clone().text();
    const queueBody = await queue.json() as { data: Array<{ id: string }> };
    assert.ok(queueBody.data.some((candidate) => candidate.id === session.id));
    assert.ok(!queueText.includes(session.guestOrderToken));
    assert.ok(!queueText.includes("paymentInit"));
    const mutation = await app.request(`/api/v1/dashboard/payment-reconciliation/${session.id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${auth.data.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ action: "request_refund" })
    });
    assert.equal(mutation.status, 404);
    assert.equal((await prisma.paymentSession.findUniqueOrThrow({ where: { id: session.id } })).status, "paid");

    assert.equal(afterFirst.quantityOnHand, before.quantityOnHand - 1);
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("concurrent different provider callbacks create one order and one reconciliation", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`concurrent-provider-${suffix}`);
  const providerPaymentIds = [`pay-concurrent-a-${suffix}`, `pay-concurrent-b-${suffix}`];
  const before = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: fixture.snapshot.id } });
  try {
    const responses = await Promise.all(providerPaymentIds.map((providerPaymentId) =>
      app.request("/api/v1/payments/callback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-payment-signature": createHmac("sha256", paymentCallbackSecret)
            .update(`${fixture.session.id}:${providerPaymentId}`)
            .digest("hex")
        },
        body: JSON.stringify({ sessionId: fixture.session.id, providerPaymentId, status: "paid" })
      })
    ));
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    assert.equal(await prisma.order.count({ where: { paymentSessionId: fixture.session.id } }), 1);
    assert.equal(await prisma.paymentEvent.count({ where: { paymentSessionId: fixture.session.id, type: "provider_confirmed" } }), 2);
    assert.equal(await prisma.paymentEvent.count({ where: { paymentSessionId: fixture.session.id, type: "reconciliation_required" } }), 1);
    const after = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: fixture.snapshot.id } });
    assert.equal(after.quantityOnHand, before.quantityOnHand - 1);
    assert.equal(after.quantityReserved, before.quantityReserved - 1);
    assert.equal(await prisma.cartItem.count({ where: { cartId: fixture.cart.id } }), 0);
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("provider transaction reuse across sessions leaves one canonical order and one visible reconciliation", async () => {
  const suffix = randomBytes(6).toString("hex");
  const first = await createCheckoutFixture(`provider-reuse-first-${suffix}`);
  const second = await createCheckoutFixture(`provider-reuse-second-${suffix}`);
  const providerPaymentId = `pay-reused-${suffix}`;
  const callback = (sessionId: string) => app.request("/api/v1/payments/callback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-payment-signature": createHmac("sha256", paymentCallbackSecret)
        .update(`${sessionId}:${providerPaymentId}`)
        .digest("hex")
    },
    body: JSON.stringify({ sessionId, providerPaymentId, status: "paid" })
  });
  try {
    const accepted = await callback(first.session.id);
    assert.equal(accepted.status, 200, await accepted.clone().text());
    const rejected = await callback(second.session.id);
    assert.equal(rejected.status, 409);

    const firstSession = await prisma.paymentSession.findUniqueOrThrow({ where: { id: first.session.id } });
    const secondSession = await prisma.paymentSession.findUniqueOrThrow({ where: { id: second.session.id } });
    assert.equal(firstSession.status, "paid");
    assert.equal(firstSession.providerPaymentId, providerPaymentId);
    assert.equal(secondSession.status, "reconciliation_required");
    assert.equal(secondSession.providerPaymentId, null);
    assert.equal(await prisma.order.count({ where: { paymentSessionId: { in: [first.session.id, second.session.id] } } }), 1);
    const event = await prisma.paymentEvent.findUnique({
      where: {
        paymentSessionId_type_providerEventId: {
          paymentSessionId: second.session.id,
          type: "reconciliation_required",
          providerEventId: providerPaymentId
        }
      }
    });
    assert.deepEqual(event?.payload, { reason: "provider_transaction_reused_by_another_session" });
  } finally {
    await cleanupCheckoutFixture(second);
    await cleanupCheckoutFixture(first);
  }
});

test("refund lifecycle status is preserved when a different provider transaction is reported", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`refund-duplicate-${suffix}`);
  const originalProviderPaymentId = `pay-refund-original-${suffix}`;
  const duplicateProviderPaymentId = `pay-refund-duplicate-${suffix}`;
  try {
    const finalized = await finalizeConfirmedPayment(fixture.session.id, originalProviderPaymentId);
    assert.equal(finalized.status, "completed");
    await prisma.paymentSession.update({
      where: { id: fixture.session.id },
      data: { status: "refund_processing" }
    });
    const replay = await finalizeConfirmedPayment(fixture.session.id, originalProviderPaymentId);
    assert.equal(replay.status, "completed");
    assert.equal((await prisma.paymentSession.findUniqueOrThrow({ where: { id: fixture.session.id } })).status, "refund_processing");

    const duplicate = await finalizeConfirmedPayment(fixture.session.id, duplicateProviderPaymentId);
    assert.equal(duplicate.status, "duplicate_transaction");
    assert.equal((await prisma.paymentSession.findUniqueOrThrow({ where: { id: fixture.session.id } })).status, "refund_processing");
    assert.equal(
      await prisma.paymentEvent.count({
        where: {
          paymentSessionId: fixture.session.id,
          type: "reconciliation_required",
          providerEventId: duplicateProviderPaymentId
        }
      }),
      1
    );
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("payment recovery finalizes a persisted provider confirmation exactly once", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`recover-${suffix}`);
  const { session } = fixture;
  const providerPaymentId = `pay-recover-${suffix}`;
  await prisma.paymentEvent.create({
    data: {
      paymentSessionId: session.id,
      type: "provider_confirmed",
      providerEventId: providerPaymentId,
      amountCents: session.totalCents,
      currency: session.currency
    }
  });
  try {
    const first = await finalizeConfirmedPayment(session.id, providerPaymentId);
    const second = await finalizeConfirmedPayment(session.id, providerPaymentId);
    assert.equal(first.status, "completed");
    assert.equal(second.status, "completed");
    assert.equal(await prisma.order.count({ where: { paymentSessionId: session.id } }), 1);
    assert.equal(await prisma.paymentEvent.count({ where: { paymentSessionId: session.id, type: "order_created" } }), 1);
    assert.equal(await prisma.cartItem.count({ where: { cartId: session.cartId! } }), 0);
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("concurrent payment recovery creates one order", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`recover-concurrent-${suffix}`);
  const { session } = fixture;
  const providerPaymentId = `pay-recover-concurrent-${suffix}`;
  await prisma.paymentEvent.create({ data: { paymentSessionId: session.id, type: "provider_confirmed", providerEventId: providerPaymentId, amountCents: session.totalCents, currency: session.currency } });
  try {
    const results = await Promise.all(Array.from({ length: 10 }, () => finalizeConfirmedPayment(session.id, providerPaymentId)));
    assert.ok(results.every((result) => result.status === "completed" || result.status === "contended"));
    assert.equal(await prisma.order.count({ where: { paymentSessionId: session.id } }), 1);
    assert.equal(await prisma.paymentEvent.count({ where: { paymentSessionId: session.id, type: "order_created" } }), 1);
    assert.equal(await prisma.cartItem.count({ where: { cartId: session.cartId! } }), 0);
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("expired confirmed payment releases reservations before reconciliation", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`recover-expired-${suffix}`);
  const { session, snapshot } = fixture;
  const providerPaymentId = `pay-recover-expired-${suffix}`;
  const before = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } });
  await prisma.paymentSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await prisma.paymentEvent.create({ data: { paymentSessionId: session.id, type: "provider_confirmed", providerEventId: providerPaymentId, amountCents: session.totalCents, currency: session.currency } });
  try {
    const result = await finalizeConfirmedPayment(session.id, providerPaymentId);
    assert.equal(result.status, "not_payable");
    const reservation = await prisma.inventoryReservation.findFirstOrThrow({ where: { paymentSessionId: session.id } });
    const after = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } });
    assert.equal(reservation.status, "expired");
    assert.equal(after.quantityReserved, before.quantityReserved - 1);
    assert.equal(after.quantityOnHand, before.quantityOnHand);
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("payment callback rejects incomplete inventory reservations", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`missing-reservation-${suffix}`);
  const { session, snapshot } = fixture;
  const baselineReserved = snapshot.quantityReserved;
  const providerPaymentId = `pay-missing-reservation-${suffix}`;
  const signature = createHmac("sha256", paymentCallbackSecret)
    .update(`${session.id}:${providerPaymentId}`)
    .digest("hex");

  await prisma.inventoryReservation.deleteMany({ where: { paymentSessionId: session.id } });
  await prisma.inventorySnapshot.update({
    where: { id: snapshot.id },
    data: { quantityReserved: baselineReserved }
  });

  try {
    const response = await app.request("/api/v1/payments/callback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-payment-signature": signature },
      body: JSON.stringify({ sessionId: session.id, providerPaymentId, status: "paid" })
    });
    assert.equal(response.status, 409);
    assert.equal(await prisma.order.count({ where: { paymentSessionId: session.id } }), 0);
    const persistedSession = await prisma.paymentSession.findUniqueOrThrow({ where: { id: session.id } });
    assert.equal(persistedSession.status, "reconciliation_required");
    assert.equal(
      await prisma.paymentEvent.count({
        where: { paymentSessionId: session.id, type: "reconciliation_required" }
      }),
      1
    );
  } finally {
    await cleanupCheckoutFixture(fixture);
  }
});

test("payment callback decrements quantityReserved and quantityOnHand after consuming reservations", async () => {
  const suffix = randomBytes(6).toString("hex");
  const fixture = await createCheckoutFixture(`consume-${suffix}`);
  const { session, snapshot, preparedSnapshot, unitPriceCents } = fixture;
  const baselineReserved = preparedSnapshot.quantityReserved;
  const baselineOnHand = preparedSnapshot.quantityOnHand;

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
    await cleanupCheckoutFixture(fixture);
  }
});
