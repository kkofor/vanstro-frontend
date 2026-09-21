import { Hono } from "hono";
import { badRequest, readBody } from "./request.js";
import { type DashboardEnv, writeAudit } from "./access.js";
import { createErpWebhook, deleteErpWebhook, listErpWebhooks } from "../erp-api/webhooks.js";
import { buildErpOpenApiDocument } from "../erp-api/openapi.js";

// V11-R1 P6 — dashboard-side ERP webhook management (admin surface; the
// machine v1 endpoints stay for the SA). Secrets hash at rest; the
// one-time plaintext secret is returned exactly once at creation.

export function createDashboardErpWebhookRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/erp/openapi", (context) => {
    return context.json(buildErpOpenApiDocument());
  });

  routes.post("/dashboard/erp/connection-test", async (context) => {
    const origin = new URL(context.req.url).origin;
    const baseUrl = `${origin}/api/v1/integrations/erp`;
    let status = 0;
    let reachable = false;
    try {
      const response = await fetch(`${origin}/api/v1/health`, { signal: AbortSignal.timeout(5_000) });
      status = response.status;
      reachable = response.ok;
    } catch {
      reachable = false;
    }
    const maskedUrl = baseUrl.length > 28 ? `${baseUrl.slice(0, 16)}…${baseUrl.slice(-12)}` : "configured";
    await writeAudit(context, "dashboard.erp.connection_test", "erp_api", undefined, { status, reachable });
    return context.json({ data: { configured: true, maskedUrl, lastTestedAt: new Date().toISOString(), status, reachable } });
  });
  routes.get("/dashboard/erp/webhooks", async (context) => {
    const webhooks = await listErpWebhooks();
    return context.json({ data: { items: webhooks } });
  });

  routes.post("/dashboard/erp/webhooks", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const url = typeof body.url === "string" && /^https?:\/\//.test(body.url) ? body.url : null;
    const events = Array.isArray(body.events) && body.events.every((entry: unknown) => typeof entry === "string") ? body.events : null;
    const secret = typeof body.secret === "string" && body.secret.length >= 16 ? body.secret : null;
    if (!url || !events || !secret) return badRequest(context, "url, events and a secret of at least 16 chars are required");
    const created = await createErpWebhook({ url, events, secret, active: body.active !== false });
    await writeAudit(context, "dashboard.erp.webhook.create", "erp_webhook", created.id, { url: created.url, events: created.events });
    return context.json({ data: { id: created.id, url: created.url, events: created.events, active: created.active, secret: created.secret } });
  });

  routes.delete("/dashboard/erp/webhooks/:id", async (context) => {
    const deleted = await deleteErpWebhook(context.req.param("id"));
    if (!deleted) return context.json({ error: "webhook not found", code: "DASHBOARD_NOT_FOUND" }, 404);
    await writeAudit(context, "dashboard.erp.webhook.delete", "erp_webhook", context.req.param("id"), {});
    return context.json({ data: { deleted: true } });
  });

  return routes;
}
