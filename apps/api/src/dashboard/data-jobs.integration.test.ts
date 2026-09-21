import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { requestIdMiddleware } from "../middleware/request-id.js";
import { createDashboardRoutes } from "../routes/dashboard.js";
import { DASHBOARD_PERMISSION_RULES } from "./access.js";

function createTestApp() {
  const app = new Hono();
  app.use("*", requestIdMiddleware);
  app.route("/api/v1", createDashboardRoutes());
  return app;
}

const canonicalRoutes = [
  ["POST", "/api/v1/dashboard/data-jobs/imports"],
  ["PUT", "/api/v1/dashboard/data-jobs/imports/00000000-0000-4000-8000-000000000001/content"],
  ["GET", "/api/v1/dashboard/data-jobs/imports?queryVersion=common-query.v1"],
  ["GET", "/api/v1/dashboard/data-jobs/imports/00000000-0000-4000-8000-000000000001"],
  ["GET", "/api/v1/dashboard/data-jobs/imports/00000000-0000-4000-8000-000000000001/preview?queryVersion=common-query.v1"],
  ["POST", "/api/v1/dashboard/data-jobs/imports/00000000-0000-4000-8000-000000000001/commit"],
  ["POST", "/api/v1/dashboard/data-jobs/imports/00000000-0000-4000-8000-000000000001/cancel"],
  ["POST", "/api/v1/dashboard/data-jobs/exports"],
  ["GET", "/api/v1/dashboard/data-jobs/exports?queryVersion=common-query.v1"],
  ["GET", "/api/v1/dashboard/data-jobs/exports/00000000-0000-4000-8000-000000000001"],
  ["POST", "/api/v1/dashboard/data-jobs/exports/00000000-0000-4000-8000-000000000001/cancel"],
  ["GET", "/api/v1/dashboard/data-jobs/exports/00000000-0000-4000-8000-000000000001/download"],
] as const;

test("P08 canonical routes reject unauthenticated requests without redirects or absolute locations", async () => {
  const app = createTestApp();
  for (const [method, path] of canonicalRoutes) {
    const response = await app.request(path, { method });
    assert.equal(response.status, 401, `${method} ${path}: ${await response.clone().text()}`);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.status >= 300 && response.status < 400, false);
    const body = await response.json() as { code?: string; requestId?: string };
    assert.equal(body.code, "AUTH_REQUIRED");
    assert.ok(body.requestId);
  }
});

test("P08 access table independently maps every route to exactly six permissions", () => {
  const rules = DASHBOARD_PERMISSION_RULES.filter((rule) => rule.path.startsWith("/dashboard/data-jobs/"));
  assert.equal(rules.length, 12);
  assert.deepEqual(new Set(rules.map((rule) => rule.permission)), new Set([
    "dashboard.import.foundation_sample.read",
    "dashboard.import.foundation_sample.create",
    "dashboard.import.foundation_sample.commit",
    "dashboard.export.foundation_sample.read",
    "dashboard.export.foundation_sample.create",
    "dashboard.export.foundation_sample.download",
  ]));
  assert.equal(rules.find((rule) => rule.method === "PUT")?.permission, "dashboard.import.foundation_sample.create");
  assert.equal(rules.find((rule) => rule.path.endsWith("/commit"))?.permission, "dashboard.import.foundation_sample.commit");
  assert.equal(rules.find((rule) => rule.path.endsWith("/download"))?.permission, "dashboard.export.foundation_sample.download");
});

test("P08 does not mount aliases, business-object routes, or public artifact paths", async () => {
  const app = createTestApp();
  for (const path of [
    "/api/v1/dashboard/imports",
    "/api/v1/dashboard/exports",
    "/api/v1/dashboard/data-jobs/orders",
    "/api/v1/dashboard/data-jobs/payments",
    "/api/v1/dashboard/data-jobs/categories",
    "/api/v1/dashboard/data-jobs/artifacts/example",
  ]) {
    const response = await app.request(path);
    assert.equal(response.status, 401, path);
    assert.equal(response.headers.get("location"), null);
  }
});
