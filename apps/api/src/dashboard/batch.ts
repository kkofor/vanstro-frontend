import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { prisma, serializeAsyncJob } from "@vanstro/db";
import { badRequest, readBody } from "./request.js";
import { type DashboardEnv, writeAudit } from "./access.js";
import { createIngestJob, INGEST_KIND_PERMISSION, INGEST_KINDS, INGEST_MAX_BYTES, INGEST_MAX_ITEMS, readIngestResults, retryIngestJob, type IngestKind } from "./batch-ingest.js";
import { recordAuditEvent } from "../audit/foundation.js";

// V11-R1 P4 production closure — Dashboard batch import entry.
// The HTTP handler only creates the async ingest job (atomic idempotency
// claim); the business writes run inside the batch-ingest worker. This
// satisfies: upload -> validate -> dry-run -> confirm -> async commit ->
// per-item result -> retry failed (bound to the original job).

function jobScopeFromContext(context: any) {
  return { kind: "global" as const };
}

function authSnapshotFromContext(context: any) {
  const authorization = context.get("p02Authorization") as
    | { actorId?: string; globalRoleKeys?: string[]; scopedRoleKeys?: string[]; permissionGrants?: Array<{ permissionKey: string }>; contextRevision?: string }
    | undefined;
  const actorId = authorization?.actorId ?? (context.get("actorUserId") as string | undefined) ?? "unknown";
  return {
    actorType: "admin_user" as const,
    actorId,
    effectiveRoles: [...(authorization?.globalRoleKeys ?? []), ...(authorization?.scopedRoleKeys ?? [])],
    permissionGrants: (authorization?.permissionGrants ?? ((context.get("actorPermissions") as string[] | undefined) ?? []).map((permissionKey: string) => ({ permissionKey }))).map((grant: { permissionKey: string }) => ({ permissionKey: grant.permissionKey, scope: { kind: "global" as const } })),
    scope: { kind: "global" as const },
    contextRevision: authorization?.contextRevision ?? "dashboard-actor"
  };
}

function requestIdFromContext(context: any): string {
  return context.res.headers.get("X-Request-Id") ?? `batch-${randomUUID()}`;
}

export function createDashboardBatchRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.post("/dashboard/batch/import", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const kind = typeof body.kind === "string" && INGEST_KINDS.includes(body.kind as IngestKind) ? (body.kind as IngestKind) : null;
    if (!kind) return badRequest(context, "unsupported import kind");
    const required = INGEST_KIND_PERMISSION[kind];
    if (!context.get("actorPermissions").includes(required)) {
      return context.json({ error: "Batch import requires the matching write permission.", code: "DASHBOARD_FORBIDDEN" }, 403);
    }
    const items = Array.isArray(body.items) ? body.items : null;
    if (!items || items.length === 0) return badRequest(context, "items must be a non-empty array");
    if (items.length > INGEST_MAX_ITEMS) return badRequest(context, `batch limit is ${INGEST_MAX_ITEMS} items`);
    const raw = JSON.stringify(body);
    if (Buffer.byteLength(raw, "utf8") > INGEST_MAX_BYTES) return badRequest(context, "batch payload exceeds 1 MiB");
    const dryRun = body.dryRun === true;
    const requestHash = typeof body.requestHash === "string" && body.requestHash ? body.requestHash : null;

    let created;
    try {
      created = await createIngestJob({
        kind,
        items: items as Array<Record<string, unknown>>,
        dryRun,
        requestHash,
        authorization: authSnapshotFromContext(context),
        scope: jobScopeFromContext(context),
        requestId: requestIdFromContext(context)
      });
    } catch (error) {
      if (error instanceof Error && error.message === "JOB_TYPE_UNAVAILABLE") {
        return context.json({ error: "Batch ingest is not available.", code: "DASHBOARD_UNAVAILABLE" }, 503);
      }
      throw error;
    }
    if (created.kind === "conflict") {
      return context.json({ error: "Idempotency-Key conflict: the same key was already used with a different payload.", code: "DASHBOARD_CONFLICT" }, 409);
    }
    if (created.kind === "dry_run") {
      // Dry-run performs zero AsyncJob/ledger writes; the per-item validation
      // outcome IS the preview. Audit the attempt against a non-job record so
      // the ledger never references a job that was not created.
      await writeAudit(context, "dashboard.batch.import", "batch_import_dry_run", undefined, { kind, dryRun: true, summary: created.summary });
      return context.json({ data: { jobId: null, status: "dry_run", results: created.results, summary: created.summary } });
    }
    await writeAudit(context, "dashboard.batch.import", "async_job", created.jobId, { kind, dryRun, replayed: created.kind === "replayed" });
    return context.json({ data: { jobId: created.jobId, status: created.kind === "replayed" ? "replayed" : "queued", replayed: created.kind === "replayed", ...(created.kind === "replayed" ? { results: created.results, summary: created.summary } : {}) } });
  });

  routes.get("/dashboard/batch/import/:jobId", async (context) => {
    const jobId = context.req.param("jobId");
    const job = await prisma.asyncJob.findUnique({ where: { id: jobId }, include: { artifacts: true } });
    if (!job) return context.json({ error: "job not found", code: "DASHBOARD_NOT_FOUND" }, 404);
    if (job.jobType !== "dashboard.batch.ingest") return context.json({ error: "not a batch ingest job", code: "DASHBOARD_NOT_FOUND" }, 404);
    const { results, summary } = await readIngestResults(jobId);
    return context.json({
      data: {
        job: serializeAsyncJob(job, job.artifacts),
        results,
        summary
      }
    });
  });

  routes.post("/dashboard/batch/import/:jobId/retry", async (context) => {
    const jobId = context.req.param("jobId");
    const job = await prisma.asyncJob.findUnique({ where: { id: jobId } });
    if (!job || job.jobType !== "dashboard.batch.ingest") return context.json({ error: "job not found", code: "DASHBOARD_NOT_FOUND" }, 404);
    if (job.status !== "failed") return context.json({ error: "only failed jobs can be retried", code: "DASHBOARD_CONFLICT" }, 409);
    const outcome = await retryIngestJob(jobId, job.version);
    if (!outcome.ok) return context.json({ error: outcome.error, code: "DASHBOARD_CONFLICT" }, 409);
    return context.json({ data: { jobId, status: "queued" } });
  });

  return routes;
}
