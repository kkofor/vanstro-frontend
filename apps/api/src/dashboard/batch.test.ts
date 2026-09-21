import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { prisma } from "@vanstro/db";
import { createDashboardBatchRoutes } from "./batch.js";
import type { DashboardEnv } from "./access.js";

// Direct route test for the dashboard batch import handler. A dry run must
// never report "queued" nor reference an AsyncJob: it performs zero writes
// (V11-R1 ERP readiness §7) and is audited against a non-job record.

function batchApp() {
  const routes = createDashboardBatchRoutes();
  const app = new Hono<DashboardEnv>();
  app.use("*", async (context, next) => {
    context.set("actorPermissions", ["products.write", "pricing.write", "inventory.write"]);
    context.set("actorUserId", "test-admin-user");
    await next();
  });
  app.route("/", routes);
  return app;
}

type AuditCall = { resourceType: string; resourceId?: string; metadata: Record<string, unknown> };

// The Prisma client's model delegates are stable instances but are opaque to
// node:test's mock.method, so stub the two delegates the handler may touch
// directly and restore them after the test.
function captureAudit(t: test.TestContext) {
  const calls: AuditCall[] = [];
  const auditLog = prisma.auditLog as unknown as { create: (args: { data: { resourceType: string; resourceId?: string; metadata?: unknown } }) => Promise<unknown> };
  const asyncJob = prisma.asyncJob as unknown as { create: () => Promise<never> };
  const originalAuditCreate = auditLog.create;
  const originalJobCreate = asyncJob.create;
  auditLog.create = async (args) => {
    calls.push({ resourceType: args.data.resourceType, resourceId: args.data.resourceId, metadata: (args.data.metadata ?? {}) as Record<string, unknown> });
    return { id: "audit-row-1", ...args.data };
  };
  asyncJob.create = async () => {
    throw new Error("dry-run must never create an AsyncJob");
  };
  t.after(() => {
    auditLog.create = originalAuditCreate;
    asyncJob.create = originalJobCreate;
  });
  return { calls };
}

test("POST /dashboard/batch/import with dryRun returns a dry_run preview and audits a non-job record", async (t) => {
  const { calls } = captureAudit(t);
  const response = await batchApp().request("/dashboard/batch/import", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "req-batch-dry-run" },
    body: JSON.stringify({
      kind: "products",
      dryRun: true,
      requestHash: "dry-run-hash-1",
      items: [{ name: "Widget", skuCode: "W-1" }, { skuCode: "W-2" }]
    })
  });
  assert.equal(response.status, 200, await response.clone().text());
  const payload = (await response.json()) as {
    data: { jobId: string | null; status: string; results: Array<{ index: number; status: string; error?: string }>; summary: { total: number; committed: number; failed: number; skipped: number } };
  };
  assert.equal(payload.data.status, "dry_run", "a dry run must never report queued");
  assert.equal(payload.data.jobId, null, "a dry run must not carry a job id");
  assert.deepEqual(payload.data.results, [
    { index: 0, status: "committed" },
    { index: 1, status: "skipped", error: "products require name and skuCode" }
  ]);
  assert.deepEqual(payload.data.summary, { total: 2, committed: 1, failed: 0, skipped: 1 });
  assert.equal(calls.length, 1, "dry run must audit exactly once and never create an AsyncJob");
  assert.equal(calls[0]!.resourceType, "batch_import_dry_run", "dry run audits a non-job record");
  assert.notEqual(calls[0]!.resourceType, "async_job", "dry run must not audit an async_job record");
  assert.equal(calls[0]!.resourceId, undefined, "no AsyncJob id exists for a dry run");
  assert.equal(calls[0]!.metadata.dryRun, true);
  assert.deepEqual(calls[0]!.metadata.summary, { total: 2, committed: 1, failed: 0, skipped: 1 });
});

test("batch import source decides dry_run before the async_job audit and never maps it to queued", async () => {
  const source = await readFile(new URL("./batch.ts", import.meta.url), "utf8");
  const dryRunIndex = source.indexOf('created.kind === "dry_run"');
  const jobAuditIndex = source.indexOf('writeAudit(context, "dashboard.batch.import", "async_job"');
  assert.ok(dryRunIndex !== -1, "handler must branch on the dry_run outcome");
  assert.ok(jobAuditIndex !== -1, "real jobs must still audit async_job");
  assert.ok(dryRunIndex < jobAuditIndex, "dry_run branch must be decided before the async_job audit");
  assert.match(source, /jobId: null, status: "dry_run", results: created\.results, summary: created\.summary/);
  assert.match(source, /"batch_import_dry_run"/);
});
