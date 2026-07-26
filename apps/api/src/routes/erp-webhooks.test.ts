import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { ApiConfig } from "../config.js";
import { createCommerceRoutes } from "./commerce.js";

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

test("ERP inventory webhook updates mapped snapshot and is idempotent", async () => {
  let webhookCreated = false;
  let quantityOnHand = 10;
  const transaction = {
    erpWebhookEvent: { create: async () => { if (webhookCreated) throw Object.assign(new Error("duplicate"), { code: "P2002", meta: { modelName: "ErpWebhookEvent", target: ["erpSystem", "eventType", "externalId"] } }); webhookCreated = true; } },
    inventorySnapshot: {
      findFirst: async () => ({ id: "snapshot", quantityReserved: 2 }),
      upsert: async ({ update }: { update: { quantityOnHand: number } }) => { quantityOnHand = update.quantityOnHand; }
    }
  };
  const database = {
    productSkuErpMapping: { findUnique: async () => ({ skuId: "sku-1" }) },
    erpWebhookEvent: { findFirst: async () => null },
    order: { findUnique: async () => null },
    $transaction: async (callback: (client: typeof transaction) => Promise<void>) => callback(transaction)
  };
  const routes = createCommerceRoutes(database as never, config);
  const body = { erpSystem: "netsuite", externalId: "inventory-1", erpSkuKey: "ERP-SKU", dealerLocationId: "dealer-1", quantityOnHand: 12 };
  const signature = createHmac("sha256", secret).update("netsuite:inventory-1:ERP-SKU:dealer-1:12").digest("hex");
  const request = () => routes.request("/integrations/erp/webhooks/inventory", { method: "POST", headers: { "content-type": "application/json", "x-erp-signature": signature }, body: JSON.stringify(body) });
  assert.equal((await request()).status, 200);
  assert.equal(quantityOnHand, 12);
  assert.equal((await request()).status, 200);
});

test("ERP customer update webhook upserts CRM contact", async () => {
  let contactEmail = "";
  const transaction = {
    erpWebhookEvent: { create: async () => undefined },
    crmContact: { upsert: async ({ where }: { where: { email: string } }) => { contactEmail = where.email; } }
  };
  const database = {
    productSkuErpMapping: { findUnique: async () => null },
    erpWebhookEvent: { findFirst: async () => null },
    order: { findUnique: async () => null },
    $transaction: async (callback: (client: typeof transaction) => Promise<void>) => callback(transaction)
  };
  const routes = createCommerceRoutes(database as never, config);
  const body = { erpSystem: "netsuite", externalId: "customer-1", email: "BUYER@EXAMPLE.COM", firstName: "Buyer", lastName: "One", phone: "2045550100" };
  const signature = createHmac("sha256", secret).update("netsuite:customer-1:buyer@example.com:Buyer:One:2045550100").digest("hex");
  const response = await routes.request("/integrations/erp/webhooks/customer-update", { method: "POST", headers: { "content-type": "application/json", "x-erp-signature": signature }, body: JSON.stringify(body) });
  assert.equal(response.status, 200);
  assert.equal(contactEmail, "buyer@example.com");
});
