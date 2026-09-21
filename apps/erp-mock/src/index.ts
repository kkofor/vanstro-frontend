import { serve } from "@hono/node-server";
import { createHmac } from "node:crypto";
import { Hono } from "hono";

/**
 * Local-only ERP mock for VanStro backend development.
 *
 * Emulates the minimal ERP contract the worker expects:
 * - POST /orders  -> { erpOrderId }  (idempotent on Idempotency-Key)
 * - optionally posts an order-status webhook back to the Website API so the
 *   inbound ERP webhook path can be exercised end-to-end locally.
 *
 * Not for production. No auth is enforced beyond logging the bearer token.
 */

const port = Number.parseInt(process.env.ERP_MOCK_PORT ?? "4100", 10);
const apiWebhookUrl =
  process.env.ERP_MOCK_API_WEBHOOK_URL ??
  "http://localhost:4000/api/v1/integrations/erp/webhooks/order-status";
const webhookSecret = process.env.ERP_WEBHOOK_SECRET ?? "";
const autoWebhook = (process.env.ERP_MOCK_AUTO_WEBHOOK ?? "false").toLowerCase() === "true";
const erpSystem = process.env.ERP_MOCK_SYSTEM ?? "configured-erp";

// Idempotency-Key -> erpOrderId, so retries return the same ERP id.
const issuedByKey = new Map<string, string>();

function log(message: string, extra?: unknown) {
  const line = { ts: new Date().toISOString(), source: "erp-mock", message, ...(extra ? { extra } : {}) };
  console.log(JSON.stringify(line));
}

async function sendOrderStatusWebhook(orderId: string, externalId: string, status: string) {
  if (!webhookSecret) {
    log("skip webhook: ERP_WEBHOOK_SECRET not set");
    return;
  }
  const signature = createHmac("sha256", webhookSecret)
    .update(`${erpSystem}:${orderId}:${externalId}:${status}`)
    .digest("hex");
  try {
    const response = await fetch(apiWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-erp-signature": signature },
      body: JSON.stringify({ orderId, status, externalId, erpSystem }),
      signal: AbortSignal.timeout(10_000)
    });
    log("order-status webhook delivered", { orderId, status, httpStatus: response.status });
  } catch (error) {
    log("order-status webhook failed", { orderId, error: error instanceof Error ? error.message : String(error) });
  }
}

const app = new Hono();

app.get("/health", (context) => context.json({ ok: true, service: "erp-mock" }));

app.post("/orders", async (context) => {
  const idempotencyKey = context.req.header("Idempotency-Key") ?? "";
  const body = (await context.req.json().catch(() => null)) as
    | { externalOrderId?: unknown }
    | null;
  const externalOrderId =
    body && typeof body.externalOrderId === "string" ? body.externalOrderId : undefined;

  const dedupeKey = idempotencyKey || externalOrderId || crypto.randomUUID();
  let erpOrderId = issuedByKey.get(dedupeKey);
  const duplicate = Boolean(erpOrderId);
  if (!erpOrderId) {
    erpOrderId = `erp-mock-${dedupeKey.slice(0, 8)}-${Date.now().toString(36)}`;
    issuedByKey.set(dedupeKey, erpOrderId);
  }

  log(duplicate ? "order accepted (idempotent replay)" : "order accepted", {
    externalOrderId,
    idempotencyKey,
    erpOrderId
  });

  if (autoWebhook && externalOrderId && !duplicate) {
    // Fire-and-forget so the POST /orders response is not blocked.
    void sendOrderStatusWebhook(externalOrderId, erpOrderId, "processing");
  }

  return context.json({ erpOrderId, duplicate });
});

const customerByKey = new Map<string, string>();

app.post("/customers", async (context) => {
  const idempotencyKey = context.req.header("Idempotency-Key") ?? "";
  const body = (await context.req.json().catch(() => null)) as { externalUserId?: unknown } | null;
  const externalUserId = body && typeof body.externalUserId === "string" ? body.externalUserId : undefined;
  const dedupeKey = idempotencyKey || externalUserId || crypto.randomUUID();
  let erpCustomerId = customerByKey.get(dedupeKey);
  const duplicate = Boolean(erpCustomerId);
  if (!erpCustomerId) {
    erpCustomerId = `erp-cust-${dedupeKey.slice(0, 8)}-${Date.now().toString(36)}`;
    customerByKey.set(dedupeKey, erpCustomerId);
  }
  log(duplicate ? "customer synced (idempotent replay)" : "customer synced", { externalUserId, erpCustomerId });
  return context.json({ erpCustomerId, duplicate });
});

app.post("/inventory/release", async (context) => {
  const body = (await context.req.json().catch(() => null)) as Record<string, unknown> | null;
  log("inventory release accepted", { body });
  return context.json({ ok: true });
});

serve({ fetch: app.fetch, hostname: "0.0.0.0", port }, (info) => {
  log(`ERP mock listening on http://localhost:${info.port}`, {
    apiWebhookUrl,
    autoWebhook,
    webhookSigning: Boolean(webhookSecret)
  });
});
