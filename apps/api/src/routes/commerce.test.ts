import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { ApiConfig } from "../config.js";
import { createCommerceRoutes, dealerSupportsFulfillment } from "./commerce.js";

const secret = "erp-webhook-test-secret";
const config: ApiConfig = {
  runtimeMode: "test",
  hostname: "127.0.0.1",
  port: 4000,
  trustProxyHeaders: false,
  inventorySnapshotTtlMs: 300_000,
  paymentCallbackSecret: "payment-test-secret",
  erpWebhookSecret: secret,
  deliveryFlatFeeCents: 1500,
  enablePaymentSimulation: false
};

test("selected dealer fulfillment must match its advertised capabilities", () => {
  const pickupOnly = { pickupAvailable: true, deliveryAvailable: false };
  const deliveryOnly = { pickupAvailable: false, deliveryAvailable: true };

  assert.equal(dealerSupportsFulfillment(pickupOnly, "pickup"), true);
  assert.equal(dealerSupportsFulfillment(pickupOnly, "delivery"), false);
  assert.equal(dealerSupportsFulfillment(deliveryOnly, "pickup"), false);
  assert.equal(dealerSupportsFulfillment(deliveryOnly, "delivery"), true);
});

test("ERP webhook stores only allowlisted normalized fields in both event payloads", async () => {
  let webhookPayload: unknown;
  let statusPayload: unknown;
  const transaction = {
    erpWebhookEvent: {
      create: async ({ data }: { data: { payload: unknown } }) => {
        webhookPayload = data.payload;
        return data;
      }
    },
    order: {
      updateMany: async () => ({ count: 1 })
    },
    orderStatusEvent: {
      create: async ({ data }: { data: { payload: unknown } }) => {
        statusPayload = data.payload;
        return data;
      }
    }
  };
  const database = {
    erpWebhookEvent: { findFirst: async () => null },
    order: { findUnique: async () => ({ id: "order-42", status: "paid" }) },
    $transaction: async (callback: (client: typeof transaction) => Promise<void>) => callback(transaction)
  };
  const routes = createCommerceRoutes(database as never, config);
  const body = {
    orderId: " order-42 ",
    status: "fulfilled",
    externalId: " event-99 ",
    erpSystem: " netsuite ",
    accessToken: "must-not-be-stored",
    credentials: { username: "admin", password: "secret" },
    arbitraryNestedData: { customer: { governmentId: "sensitive" } },
    unknown: ["must-not-be-stored"]
  };
  const signature = createHmac("sha256", secret)
    .update("netsuite:order-42:event-99:fulfilled")
    .digest("hex");

  const response = await routes.request("/integrations/erp/webhooks/order-status", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-erp-signature": signature
    },
    body: JSON.stringify(body)
  });

  assert.equal(response.status, 200);
  const expectedPayload = {
    orderId: "order-42",
    status: "fulfilled",
    externalId: "event-99",
    erpSystem: "netsuite"
  };
  assert.deepEqual(webhookPayload, expectedPayload);
  assert.deepEqual(statusPayload, expectedPayload);
  assert.deepEqual(Object.keys(webhookPayload as object), ["orderId", "status", "externalId", "erpSystem"]);
  assert.equal(JSON.stringify([webhookPayload, statusPayload]).includes("must-not-be-stored"), false);
  assert.equal(JSON.stringify([webhookPayload, statusPayload]).includes("sensitive"), false);
});

test("ERP webhook rejects terminal order state rollback", async () => {
  let transactionCalled = false;
  const database = {
    erpWebhookEvent: { findFirst: async () => null },
    order: { findUnique: async () => ({ id: "order-42", status: "fulfilled" }) },
    $transaction: async () => {
      transactionCalled = true;
    }
  };
  const routes = createCommerceRoutes(database as never, config);
  const signature = createHmac("sha256", secret)
    .update("netsuite:order-42:event-rollback:processing")
    .digest("hex");
  const response = await routes.request("/integrations/erp/webhooks/order-status", {
    method: "POST",
    headers: { "content-type": "application/json", "x-erp-signature": signature },
    body: JSON.stringify({
      orderId: "order-42",
      status: "processing",
      externalId: "event-rollback",
      erpSystem: "netsuite"
    })
  });

  assert.equal(response.status, 409);
  assert.equal(transactionCalled, false);
});

test("shipment webhook accepts same-state tracking updates", async () => {
  let shipmentEventCreated = false;
  let emailQueued = false;
  const transaction = {
    erpWebhookEvent: { create: async () => undefined },
    order: { updateMany: async () => { throw new Error("same state must not update order"); } },
    orderStatusEvent: { create: async () => { shipmentEventCreated = true; } },
    emailSuppressionList: { findUnique: async () => null },
    emailOutbox: { create: async () => { emailQueued = true; } }
  };
  const database = {
    erpWebhookEvent: { findFirst: async () => null },
    order: { findUnique: async () => ({ id: "order-42", status: "processing", email: "buyer@example.com", firstName: "Buyer" }) },
    $transaction: async (callback: (client: typeof transaction) => Promise<void>) => callback(transaction)
  };
  const routes = createCommerceRoutes(database as never, config);
  const signature = createHmac("sha256", secret)
    .update("netsuite:order-42:shipment-1:shipped:TRACK-1")
    .digest("hex");
  const response = await routes.request("/integrations/erp/webhooks/shipment", {
    method: "POST",
    headers: { "content-type": "application/json", "x-erp-signature": signature },
    body: JSON.stringify({
      orderId: "order-42",
      shipmentId: "shipment-1",
      status: "shipped",
      trackingNumber: "TRACK-1",
      erpSystem: "netsuite"
    })
  });

  assert.equal(response.status, 200);
  assert.equal(shipmentEventCreated, true);
  assert.equal(emailQueued, true);
});

test("concurrent ERP webhook duplicates resolve as idempotent success", async () => {
  let webhookClaimed = false;
  let orderUpdates = 0;
  let statusEvents = 0;
  const transaction = {
    erpWebhookEvent: {
      create: async () => {
        if (webhookClaimed) {
          throw Object.assign(new Error("Unique constraint failed"), {
            code: "P2002",
            meta: {
              modelName: "ErpWebhookEvent",
              target: ["erpSystem", "eventType", "externalId"]
            }
          });
        }
        webhookClaimed = true;
      }
    },
    order: {
      updateMany: async () => {
        orderUpdates += 1;
        return { count: 1 };
      }
    },
    orderStatusEvent: {
      create: async () => {
        statusEvents += 1;
      }
    }
  };
  const database = {
    erpWebhookEvent: { findFirst: async () => null },
    order: { findUnique: async () => ({ id: "order-42", status: "paid" }) },
    $transaction: async (callback: (client: typeof transaction) => Promise<void>) => callback(transaction)
  };
  const routes = createCommerceRoutes(database as never, config);
  const body = {
    orderId: "order-42",
    status: "fulfilled",
    externalId: "event-99",
    erpSystem: "netsuite"
  };
  const signature = createHmac("sha256", secret)
    .update("netsuite:order-42:event-99:fulfilled")
    .digest("hex");
  const request = () => routes.request("/integrations/erp/webhooks/order-status", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-erp-signature": signature
    },
    body: JSON.stringify(body)
  });

  const responses = await Promise.all([request(), request()]);
  const payloads = await Promise.all(
    responses.map(async (response) => await response.json() as { data: { duplicate?: boolean } })
  );

  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(payloads.filter((payload) => payload.data.duplicate === true).length, 1);
  assert.equal(orderUpdates, 1);
  assert.equal(statusEvents, 1);
});
