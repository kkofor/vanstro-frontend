import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import {
  Prisma,
  PrivateFilesystemMediaStorage,
  createAsyncJob,
  p08CreateExport, p08CreateImport, p08ExportDetail, p08ExportList, p08ImportDetail, p08ImportFinalizeContext, p08ImportList, p08ImportRows, p08TransitionExport, p08TransitionImport,
  prisma,
  type JobScope,
} from "@vanstro/db";
import type { DashboardEnv } from "./access.js";
import {
  permissionGrant,
  resolveDashboardAuthorization,
  type DashboardAuthorizationContext,
  type PermissionGrant,
} from "./authorization.js";
import { asyncJobReadiness, mediaConfig } from "../config.js";
import { publicError } from "../public-errors.js";
import { recordAuditEvent } from "../audit/foundation.js";
import {
  DATA_JOB_REGISTRY_VERSION,
  FOUNDATION_SAMPLE_OBJECT_KEY,
  FOUNDATION_SAMPLE_SCHEMA_VERSION,
  resolveDataJobObject,
} from "./data-jobs/registry.js";
import {
  DATA_JOB_PARSER_VERSION,
  DATA_JOB_SECURITY_POLICY_VERSION,
  DEFAULT_CSV_PARSER_LIMITS,
} from "./data-jobs/csv-parser.js";
import { calculateDataJobExpiry } from "./data-jobs/retention.js";
import { FOUNDATION_SAMPLE_EXPORT_FORMULA } from "./data-jobs/export-v1.js";
import { DataJobError } from "./data-jobs/errors.js";
import { hashCanonicalRequest } from "./data-jobs/canonical.js";

const IMPORT_READ = "dashboard.import.foundation_sample.read";
const IMPORT_CREATE = "dashboard.import.foundation_sample.create";
const IMPORT_COMMIT = "dashboard.import.foundation_sample.commit";
const EXPORT_READ = "dashboard.export.foundation_sample.read";
const EXPORT_CREATE = "dashboard.export.foundation_sample.create";
const EXPORT_DOWNLOAD = "dashboard.export.foundation_sample.download";
const CSV_CONTENT_TYPES = new Set(["text/csv", "application/csv", "text/plain"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ScopeSnapshot = {
  kind: "global" | "dealer" | "location";
  dealerIds: string[];
  locationIds: string[];
};

function exactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("DASHBOARD_INVALID");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key))) throw new Error("DASHBOARD_INVALID");
  return record;
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function scopeFromGrant(grant: PermissionGrant | undefined): ScopeSnapshot | undefined {
  if (!grant) return undefined;
  if (grant.global) return { kind: "global", dealerIds: [], locationIds: [] };
  const dealerIds = [...new Set(grant.dealerIds)].sort();
  const locationIds = [...new Set(grant.locationIds)].sort();
  if (!dealerIds.length) return undefined;
  return { kind: locationIds.length ? "location" : "dealer", dealerIds, locationIds };
}

function sameScope(left: ScopeSnapshot | undefined, right: ScopeSnapshot | undefined): boolean {
  return Boolean(left && right && canonical(left) === canonical(right));
}

function scopeFingerprint(scope: ScopeSnapshot): string {
  return createHash("sha256").update("dashboard.data-jobs.scope.v1\0").update(canonical(scope)).digest("hex");
}

function fieldVisibilityFingerprint() {
  return createHash("sha256").update("dashboard.data-jobs.field-visibility.v1\0foundation.sample:all-visible").digest("hex");
}

function binding(context: any, auth: DashboardAuthorizationContext, scope: ScopeSnapshot) {
  return { actorId: auth.actorId, sessionTokenHash: context.get("actorSessionTokenHash"), contextRevision: auth.contextRevision,
    scopeFingerprint: scopeFingerprint(scope), fieldVisibilityFingerprint: fieldVisibilityFingerprint(), scope };
}

function asJobScope(scope: ScopeSnapshot): JobScope {
  return scope.kind === "global" ? { kind: "global" } : scope;
}

function authSnapshot(auth: DashboardAuthorizationContext, permission: string, scope: ScopeSnapshot) {
  return {
    actorType: "admin_user" as const,
    actorId: auth.actorId,
    effectiveRoles: [...auth.globalRoleKeys, ...auth.scopedRoleKeys],
    permissionGrants: [{ permissionKey: permission, scope: asJobScope(scope) }],
    scope: asJobScope(scope),
    contextRevision: auth.contextRevision,
  };
}

function requestId(context: any): string {
  return context.res.headers.get("X-Request-Id") ?? randomUUID();
}

function dataJobError(context: any, error: unknown) {
  const raw = error instanceof Error ? error.message : "DASHBOARD_INVALID";
  const code = error instanceof DataJobError ? error.code : raw;
  const status = code === "IDEMPOTENCY_CONFLICT" || code === "VERSION_CONFLICT" || code === "IMPORT_PREVIEW_STALE" ? 409
    : code === "IMPORT_EXPIRED" || code === "EXPORT_EXPIRED" ? 409
      : code.includes("NOT_FOUND") || code === "DOWNLOAD_NOT_AUTHORIZED" ? 404
        : code.includes("UNAVAILABLE") ? 503 : 400;
  return publicError(context, status as 400 | 404 | 409 | 503, code as never, "The data job request could not be completed.");
}

function requireTestRuntime() {
  const jobs = asyncJobReadiness();
  const storage = mediaConfig();
  if (jobs.runtimeMode !== "test" || !jobs.keyset || !storage.privateRoot) throw new Error("JOB_TYPE_UNAVAILABLE");
  return { jobs, storage };
}

function requireIdempotency(context: any): string {
  const key = context.req.header("Idempotency-Key")?.trim();
  if (!key || !/^[\x21-\x7e]{8,128}$/.test(key)) throw new Error("DASHBOARD_INVALID");
  return key;
}

function uploadTokenHash(token: string): string {
  return createHash("sha256").update("dashboard.data-jobs.upload-token.v1\0").update(token).digest("hex");
}

function tokenMatches(token: string, digest: string): boolean {
  const actual = Buffer.from(uploadTokenHash(token), "ascii");
  const expected = Buffer.from(digest, "ascii");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function safeImport(batch: any) {
  return {
    id: batch.id,
    object_key: batch.objectKey,
    status: batch.status,
    filename: batch.uploadIntentFilename,
    content_type: batch.uploadIntentContentType,
    byte_size: Number(batch.uploadIntentDeclaredByteSize),
    summary: { row_count: batch.rowCount, valid_row_count: batch.validRowCount, invalid_row_count: batch.invalidRowCount },
    committed_row_count: batch.committedRowCount,
    failed_commit_row_count: batch.failedCommitRowCount,
    created_at: batch.createdAt.toISOString(),
    ...(batch.previewExpiresAt ? { expires_at: batch.previewExpiresAt.toISOString() } : {}),
    version: batch.version,
  };
}

function safeExport(record: any) {
  return {
    id: record.id,
    object_key: record.objectKey,
    status: record.status,
    formula_version: record.formulaVersion,
    format: record.requestedFormat,
    row_count: record.rowCount,
    created_at: record.createdAt.toISOString(),
    version: record.version,
  };
}

async function audit(context: any, auth: DashboardAuthorizationContext, permission: string, resource: "async_job" | "job_artifact", id: string, action: "create" | "update" | "cancel" | "read_sensitive", metadata: Record<string, unknown>, database: typeof prisma | Prisma.TransactionClient = prisma) {
  await recordAuditEvent(context, auth, {
    action, resource: { type: resource, id }, result: action === "cancel" ? "cancelled" : "succeeded",
    ...(action === "cancel" ? { reason: "operator_requested" as const } : {}),
    requiredPermissions: [permission], primaryPermission: permission,
    metadata: { schemaVersion: "audit-metadata.v1", entries: metadata },
  } as never, database as never);
}

function validateStrictList(context: any) {
  const url = new URL(context.req.url);
  if (url.searchParams.getAll("queryVersion").length !== 1 || url.searchParams.get("queryVersion") !== "common-query.v1") throw new Error("QUERY_VERSION_UNSUPPORTED");
  const allowed = new Set(["queryVersion", "limit", "objectKey", "status", "createdBy", "createdFrom", "createdTo"]);
  if ([...url.searchParams.keys()].some((key) => !allowed.has(key))) throw new Error("QUERY_FILTER_UNSUPPORTED");
  for (const key of ["queryVersion", "limit", "objectKey", "createdBy", "createdFrom", "createdTo"]) if (url.searchParams.getAll(key).length > 1) throw new Error("QUERY_INVALID");
  const limit = Number(url.searchParams.get("limit") ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("QUERY_INVALID");
  return { url, limit };
}

export function createDashboardDataJobRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.post("/dashboard/data-jobs/imports", async (context) => {
    try {
      requireTestRuntime();
      const body = exactObject(await context.req.json(), ["object_key", "filename", "content_type", "byte_size"]);
      resolveDataJobObject(String(body.object_key), "import");
      const filename = String(body.filename ?? "").normalize("NFC");
      const contentType = String(body.content_type ?? "").toLowerCase();
      const byteSize = Number(body.byte_size);
      if (!/^[^\\/\r\n\x00-\x1f]{1,128}$/.test(filename) || !CSV_CONTENT_TYPES.has(contentType)
        || !Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > DEFAULT_CSV_PARSER_LIMITS.maxBytes) throw new Error("DASHBOARD_INVALID");
      const key = requireIdempotency(context);
      const actorId = context.get("actorUserId");
      const auth = await resolveDashboardAuthorization(actorId, prisma, new Date(), context.get("actorSessionTokenHash"));
      const scope = scopeFromGrant(permissionGrant(auth, IMPORT_CREATE));
      if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
      const intent = { object_key: FOUNDATION_SAMPLE_OBJECT_KEY, filename, content_type: contentType, byte_size: byteSize };
      const intentHash = hashCanonicalRequest(intent);
      const result = await prisma.$transaction(async (tx) => {
        const current = await resolveDashboardAuthorization(actorId, tx, new Date(), context.get("actorSessionTokenHash"));
        if (current.contextRevision !== auth.contextRevision || !sameScope(scopeFromGrant(permissionGrant(current, IMPORT_CREATE)), scope)) throw new Error("DASHBOARD_NOT_FOUND");
        const keyHash = createHash("sha256").update("dashboard.data-jobs.import-create.v1\0").update(actorId).update("\0").update(key).digest("hex");
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${keyHash}, 0))`;
        const token = randomBytes(32).toString("base64url");
        const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`)[0]!.now;
        const created = (await p08CreateImport(tx, { ...binding(context, current, scope), importId: randomUUID(), filename, contentType,
          declaredBytes: byteSize, uploadTokenHash: keyHash, uploadTokenExpiresAt: new Date(now.getTime() + 5 * 60_000), uploadIntentHash: intentHash,
          registryVersion: DATA_JOB_REGISTRY_VERSION, schemaVersion: FOUNDATION_SAMPLE_SCHEMA_VERSION, parserVersion: DATA_JOB_PARSER_VERSION,
          securityPolicyVersion: DATA_JOB_SECURITY_POLICY_VERSION }))[0]!;
        const detail = (await p08ImportDetail(tx, IMPORT_CREATE, created.id, binding(context, current, scope)))[0] as any;
        const batch = { ...detail, id: created.id, objectKey: FOUNDATION_SAMPLE_OBJECT_KEY, uploadIntentFilename: filename,
          uploadIntentContentType: contentType, uploadIntentDeclaredByteSize: BigInt(byteSize), uploadTokenExpiresAt: new Date(now.getTime() + 5 * 60_000),
          createdAt: now, rowCount: 0, validRowCount: 0, invalidRowCount: 0, committedRowCount: 0, failedCommitRowCount: 0 };
        if (!created.replayed) await audit(context, current, IMPORT_CREATE, "async_job", created.id, "create", { objectKey: FOUNDATION_SAMPLE_OBJECT_KEY, toStatus: "awaiting_upload" }, tx);
        return { batch, token: created.replayed ? null : token, replayed: created.replayed };
      });
      return context.json({ data: { ...safeImport(result.batch), ...(result.token ? { upload: { method: "PUT", endpoint: `/api/v1/dashboard/data-jobs/imports/${result.batch.id}/content`, token: result.token, expires_at: result.batch.uploadTokenExpiresAt.toISOString() } } : {}) }, meta: { replayed: result.replayed } }, result.replayed ? 200 : 201);
    } catch (error) { return dataJobError(context, error); }
  });

  routes.put("/dashboard/data-jobs/imports/:id/content", async (context) => {
    try {
      const { jobs, storage } = requireTestRuntime();
      const key = requireIdempotency(context);
      const token = context.req.header("X-Data-Job-Upload-Token");
      const expectedVersion = Number(context.req.header("If-Match"));
      const contentType = context.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
      const contentLength = Number(context.req.header("Content-Length"));
      const importId = context.req.param("id");
      if (!token || !contentType || !CSV_CONTENT_TYPES.has(contentType) || !UUID.test(importId) || !context.req.raw.body
        || !Number.isInteger(expectedVersion) || expectedVersion < 0 || !Number.isSafeInteger(contentLength) || contentLength < 1) throw new Error("DASHBOARD_INVALID");
      const actorId = context.get("actorUserId"), current = await resolveDashboardAuthorization(actorId, prisma, new Date(), context.get("actorSessionTokenHash")), currentScope = scopeFromGrant(permissionGrant(current, IMPORT_CREATE));
      if (!currentScope) throw new Error("DASHBOARD_NOT_FOUND");
      const controlledBinding = binding(context, current, currentScope);
      const initial = (await p08ImportFinalizeContext(prisma, importId, expectedVersion, controlledBinding))[0] as any;
      if (!initial) throw new Error("DASHBOARD_NOT_FOUND");
      if (contentType !== initial.uploadIntentContentType || contentLength !== Number(initial.uploadIntentDeclaredByteSize)) throw new Error("IDEMPOTENCY_CONFLICT");
      const provider = new PrivateFilesystemMediaStorage(storage.privateRoot!);
      if (!await provider.readiness()) throw new Error("JOB_ARTIFACT_UNAVAILABLE");
      const operationHash = createHash("sha256").update("dashboard.data-jobs.upload-operation.v1\0").update(importId).update("\0").update(key).digest("hex");
      const temporary = `.vanstro-media-tmp-v1/p08-${importId}-${operationHash}`;
      const finalKey = `data-jobs/imports/${importId}/${operationHash}.csv`;
      const streamed = await provider.putStream(temporary, context.req.raw.body, contentLength);
      let published = false;
      try {
        const result = await prisma.$transaction(async (tx) => {
          const batch = (await p08ImportFinalizeContext(tx, importId, expectedVersion, controlledBinding))[0] as any;
          if (!batch) throw new Error("DASHBOARD_NOT_FOUND");
          const auth = current, scope = currentScope;
          const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`)[0]!.now;
          if (batch.status === "uploaded" && batch.sourceArtifact) {
            if (batch.uploadIntentHash !== hashCanonicalRequest({ object_key: batch.objectKey, filename: batch.uploadIntentFilename, content_type: contentType, byte_size: contentLength })
              || batch.sourceArtifact.checksumDigest !== streamed.checksum || Number(batch.sourceArtifact.byteCount) !== streamed.bytes) throw new Error("IDEMPOTENCY_CONFLICT");
            return { batch, replayed: true };
          }
          if (batch.status !== "awaiting_upload" || batch.version !== expectedVersion || batch.uploadTokenExpiresAt <= now
            || batch.uploadTokenConsumedAt || !tokenMatches(token, batch.uploadTokenHash)) throw new Error("VERSION_CONFLICT");
          const jobId = randomUUID(), artifactId = randomUUID();
          const created = await createAsyncJob(tx as never, {
            id: jobId, runtimeMode: jobs.runtimeMode, typeKey: "dashboard.import.parse",
            payload: { importId, artifactId, expectedVersion: batch.version + 1, scopeFingerprint: batch.scopeFingerprint },
            idempotencyKey: `parse:${importId}:${operationHash}`, authorization: authSnapshot(auth, IMPORT_CREATE, scope),
            requestId: requestId(context), keyset: jobs.keyset!, allowApplicationType: true,
          });
          if (created.replayed) throw new Error("IDEMPOTENCY_CONFLICT");
          await provider.publish(temporary, finalKey);
          published = true;
          const artifact = await tx.jobArtifact.create({ data: {
            id: artifactId, jobId, ownerClass: "dashboard_import", ownerId: importId, artifactType: "dashboard.import.source.csv",
            displayName: batch.uploadIntentFilename, contentType, byteCount: BigInt(streamed.bytes), checksumAlgorithm: "sha256",
            checksumDigest: streamed.checksum, storageProvider: "private_filesystem.v1", storageReference: finalKey,
            expiresAt: calculateDataJobExpiry(now), requiredDownloadPermission: IMPORT_READ, authorizationScopeKind: scope.kind,
            dealerIds: scope.dealerIds, locationIds: scope.locationIds, sensitivityClass: "restricted",
            retentionClass: "default", retentionPolicyVersion: "dashboard-data-job-retention.v1",
          } });
          const updated = (await p08TransitionImport(tx, { ...controlledBinding, permission: IMPORT_CREATE, importId: batch.id,
            expectedVersion: batch.version, operation: "finalize_upload", targetStatus: "uploaded", sourceArtifactId: artifact.id }))[0]!;
          await audit(context, auth, IMPORT_CREATE, "job_artifact", artifact.id, "create", { fromStatus: "awaiting_upload", toStatus: "uploaded", artifactType: artifact.artifactType }, tx);
          return { batch: updated, replayed: false };
        });
        if (result.replayed) await provider.delete(temporary).catch(() => undefined);
        return context.json({ data: safeImport(result.batch), meta: { replayed: result.replayed } });
      } catch (error) {
        if (published) await provider.delete(finalKey).catch(() => undefined);
        else await provider.delete(temporary).catch(() => undefined);
        throw error;
      }
    } catch (error) { return dataJobError(context, error); }
  });

  routes.get("/dashboard/data-jobs/imports", async (context) => {
    try {
      const { url, limit } = validateStrictList(context);
      const auth = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash"));
      const scope = scopeFromGrant(permissionGrant(auth, IMPORT_READ));
      if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
      const rows = await p08ImportList(prisma, binding(context, auth, scope), url.searchParams.getAll("status"), limit) as any[];
      return context.json({ data: rows.map(safeImport), meta: { requestId: requestId(context), queryContractVersion: "common-query.v1", pagination: { mode: "cursor", limit, hasMore: false }, sort: [{ field: "createdAt", direction: "desc", nulls: "last" }, { field: "recordId", direction: "desc", nulls: "last" }] } });
    } catch (error) { return dataJobError(context, error); }
  });

  routes.get("/dashboard/data-jobs/imports/:id", async (context) => {
    try {
      const auth = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, IMPORT_READ));
      if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
      const batch = (await p08ImportDetail(prisma, IMPORT_READ, context.req.param("id"), binding(context, auth, scope)))[0] as any;
      if (!batch) throw new Error("DASHBOARD_NOT_FOUND");
      return context.json({ data: safeImport(batch) });
    } catch (error) { return dataJobError(context, error); }
  });

  routes.get("/dashboard/data-jobs/imports/:id/preview", async (context) => {
    try {
      const queryVersion = new URL(context.req.url).searchParams.get("queryVersion");
      if (queryVersion !== "common-query.v1") throw new Error("QUERY_VERSION_UNSUPPORTED");
      const auth = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, IMPORT_READ));
      if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
      const batch = (await p08ImportDetail(prisma, IMPORT_READ, context.req.param("id"), binding(context, auth, scope)))[0] as any;
      if (!batch) throw new Error("DASHBOARD_NOT_FOUND");
      if (batch.status === "preview_failed") throw new Error("IMPORT_PREVIEW_FAILED");
      if (batch.status !== "preview_ready") throw new Error("IMPORT_NOT_READY");
      const rows = await p08ImportRows(prisma, batch.id, binding(context, auth, scope), 1, 50) as any[];
      return context.json({ data: { ...safeImport(batch), rows: rows.map((row) => ({ row_number: row.rowNumber, normalized_payload: row.normalizedPayload, validation_status: row.validationStatus, validation_errors: row.validationErrors, commit_status: row.commitStatus })) }, page: { limit: 50, next_cursor: null } });
    } catch (error) { return dataJobError(context, error); }
  });

  routes.post("/dashboard/data-jobs/imports/:id/commit", async (context) => {
    try {
      const { jobs } = requireTestRuntime();
      const key = requireIdempotency(context);
      const body = exactObject(await context.req.json(), ["mode", "expected_version"]);
      if (body.mode !== "valid_rows" || !Number.isInteger(body.expected_version)) throw new Error("DASHBOARD_INVALID");
      const actorId = context.get("actorUserId");
      const result = await prisma.$transaction(async (tx) => {
        const auth = await resolveDashboardAuthorization(actorId, tx, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, IMPORT_COMMIT));
        if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
        const batch = (await p08ImportDetail(tx, IMPORT_COMMIT, context.req.param("id"), binding(context, auth, scope)))[0] as any;
        if (!batch) throw new Error("DASHBOARD_NOT_FOUND");
        if (batch.previewExpiresAt && batch.previewExpiresAt <= new Date()) throw new Error("IMPORT_EXPIRED");
        if (batch.status === "commit_queued") return { batch, replayed: true };
        if (batch.status !== "preview_ready" || !batch.normalizedRowsSha256 || !batch.previewBindingHash) throw new Error("IMPORT_PREVIEW_STALE");
        if (batch.version !== Number(body.expected_version)) throw new Error("VERSION_CONFLICT");
        const created = await createAsyncJob(tx as never, { runtimeMode: jobs.runtimeMode, typeKey: "dashboard.import.commit", payload: { importId: batch.id, expectedVersion: batch.version + 1, mode: "valid_rows", scopeFingerprint: batch.scopeFingerprint }, idempotencyKey: key, authorization: authSnapshot(auth, IMPORT_COMMIT, scope), requestId: requestId(context), keyset: jobs.keyset!, allowApplicationType: true });
        const updated = (await p08TransitionImport(tx, { ...binding(context, auth, scope), permission: IMPORT_COMMIT, importId: batch.id, expectedVersion: batch.version, operation: "queue_commit", targetStatus: "commit_queued" }))[0]!;
        await audit(context, auth, IMPORT_COMMIT, "async_job", created.job.id, "create", { jobType: "dashboard.import.commit", jobTypeVersion: "dashboard.import.commit.v1", toStatus: "queued", attempt: 0 }, tx);
        return { batch: updated, replayed: false };
      });
      return context.json({ data: safeImport(result.batch), meta: { replayed: result.replayed } }, result.replayed ? 200 : 202);
    } catch (error) { return dataJobError(context, error); }
  });

  routes.post("/dashboard/data-jobs/imports/:id/cancel", async (context) => {
    try {
      const key = requireIdempotency(context); void key;
      const body = exactObject(await context.req.json(), ["expected_version"]);
      const actorId = context.get("actorUserId");
      const updated = await prisma.$transaction(async (tx) => {
        const auth = await resolveDashboardAuthorization(actorId, tx, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, IMPORT_CREATE));
        if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
        const batch = (await p08ImportDetail(tx, IMPORT_CREATE, context.req.param("id"), binding(context, auth, scope)))[0] as any;
        if (!batch) throw new Error("DASHBOARD_NOT_FOUND");
        if (batch.version !== Number(body.expected_version) || !["uploaded", "parsing", "preview_ready", "commit_queued"].includes(batch.status)) throw new Error("VERSION_CONFLICT");
        const next = (await p08TransitionImport(tx, { ...binding(context, auth, scope), permission: IMPORT_CREATE, importId: batch.id, expectedVersion: batch.version, operation: "cancel", targetStatus: "cancelled" }))[0]!;
        await audit(context, auth, IMPORT_CREATE, "async_job", batch.id, "cancel", { jobType: "dashboard.import.parse", jobTypeVersion: "dashboard.import.parse.v1", fromStatus: batch.status, toStatus: "cancelled", attempt: 0 }, tx);
        return next;
      });
      return context.json({ data: safeImport(updated) });
    } catch (error) { return dataJobError(context, error); }
  });

  routes.post("/dashboard/data-jobs/exports", async (context) => {
    try {
      const { jobs } = requireTestRuntime();
      const key = requireIdempotency(context);
      const body = exactObject(await context.req.json(), ["object_key", "format", "query"]);
      resolveDataJobObject(String(body.object_key), "export");
      if (body.format !== "csv") throw new Error("DASHBOARD_INVALID");
      const query = exactObject(body.query, ["filters", "sort"]);
      if (!Array.isArray(query.filters) || !Array.isArray(query.sort) || query.sort.some((value) => !["external_key:asc", "external_key:desc", "label:asc", "label:desc", "state:asc", "state:desc", "effective_date:asc", "effective_date:desc"].includes(String(value)))) throw new Error("QUERY_FILTER_UNSUPPORTED");
      const queryFilters = query.filters as unknown[];
      const querySort = query.sort as unknown[];
      const actorId = context.get("actorUserId"), auth = await resolveDashboardAuthorization(actorId, prisma, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, EXPORT_CREATE));
      if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
      const exportId = randomUUID();
      const result = await prisma.$transaction(async (tx) => {
        const current = await resolveDashboardAuthorization(actorId, tx, new Date(), context.get("actorSessionTokenHash"));
        if (current.contextRevision !== auth.contextRevision || !sameScope(scopeFromGrant(permissionGrant(current, EXPORT_CREATE)), scope)) throw new Error("DASHBOARD_NOT_FOUND");
        const created = await createAsyncJob(tx as never, { runtimeMode: jobs.runtimeMode, typeKey: "dashboard.export.generate", payload: { exportId, scopeFingerprint: scopeFingerprint(scope), querySnapshotHash: hashCanonicalRequest(query), formulaVersion: FOUNDATION_SAMPLE_EXPORT_FORMULA }, idempotencyKey: key, authorization: authSnapshot(auth, EXPORT_CREATE, scope), requestId: requestId(context), keyset: jobs.keyset!, allowApplicationType: true });
        if (created.replayed) {
          throw new Error("IDEMPOTENCY_CONFLICT");
        }
        const controlled = (await p08CreateExport(tx, { ...binding(context, current, scope), exportId, querySnapshot: { filters: queryFilters as Prisma.InputJsonValue, sort: querySort.length ? querySort as Prisma.InputJsonValue : ["external_key:asc"] }, jobId: created.job.id }))[0]!;
        const record = { ...controlled, id: exportId, objectKey: FOUNDATION_SAMPLE_OBJECT_KEY, formulaVersion: FOUNDATION_SAMPLE_EXPORT_FORMULA, requestedFormat: "csv", rowCount: 0, createdAt: new Date() };
        await audit(context, current, EXPORT_CREATE, "async_job", created.job.id, "create", { jobType: "dashboard.export.generate", jobTypeVersion: "dashboard.export.generate.v1", toStatus: "queued", attempt: 0 }, tx);
        return { record, replayed: false };
      });
      return context.json({ data: safeExport(result.record), meta: { replayed: result.replayed } }, result.replayed ? 200 : 202);
    } catch (error) { return dataJobError(context, error); }
  });

  routes.get("/dashboard/data-jobs/exports", async (context) => {
    try {
      const { url, limit } = validateStrictList(context), auth = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, EXPORT_READ));
      if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
      const rows = await p08ExportList(prisma, binding(context, auth, scope), url.searchParams.getAll("status"), limit) as any[];
      return context.json({ data: rows.map(safeExport), meta: { requestId: requestId(context), queryContractVersion: "common-query.v1", pagination: { mode: "cursor", limit, hasMore: false }, sort: [{ field: "createdAt", direction: "desc", nulls: "last" }, { field: "recordId", direction: "desc", nulls: "last" }] } });
    } catch (error) { return dataJobError(context, error); }
  });

  routes.get("/dashboard/data-jobs/exports/:id", async (context) => {
    try {
      const auth = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, EXPORT_READ));
      if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
      const record = (await p08ExportDetail(prisma, EXPORT_READ, context.req.param("id"), binding(context, auth, scope)))[0] as any;
      if (!record) throw new Error("DASHBOARD_NOT_FOUND");
      return context.json({ data: safeExport(record) });
    } catch (error) { return dataJobError(context, error); }
  });

  routes.post("/dashboard/data-jobs/exports/:id/cancel", async (context) => {
    try {
      requireIdempotency(context);
      const body = exactObject(await context.req.json(), ["expected_version"]), actorId = context.get("actorUserId");
      const updated = await prisma.$transaction(async (tx) => {
        const auth = await resolveDashboardAuthorization(actorId, tx, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, EXPORT_CREATE));
        if (!scope) throw new Error("DASHBOARD_NOT_FOUND");
        const record = (await p08ExportDetail(tx, EXPORT_CREATE, context.req.param("id"), binding(context, auth, scope)))[0] as any;
        if (!record) throw new Error("DASHBOARD_NOT_FOUND");
        if (record.version !== Number(body.expected_version) || !["queued", "running"].includes(record.status)) throw new Error("VERSION_CONFLICT");
        const next = (await p08TransitionExport(tx, { ...binding(context, auth, scope), permission: EXPORT_CREATE, exportId: record.id, expectedVersion: record.version, operation: "cancel", targetStatus: "cancelled" }))[0]!;
        await audit(context, auth, EXPORT_CREATE, "async_job", record.jobId, "cancel", { jobType: "dashboard.export.generate", jobTypeVersion: "dashboard.export.generate.v1", fromStatus: record.status, toStatus: "cancelled", attempt: 0 }, tx);
        return next;
      });
      return context.json({ data: safeExport(updated) });
    } catch (error) { return dataJobError(context, error); }
  });

  routes.get("/dashboard/data-jobs/exports/:id/download", async (context) => {
    try {
      const { storage } = requireTestRuntime();
      const auth = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash")), scope = scopeFromGrant(permissionGrant(auth, EXPORT_DOWNLOAD));
      if (!scope) throw new Error("DOWNLOAD_NOT_AUTHORIZED");
      const controlled = (await p08ExportDetail(prisma, EXPORT_DOWNLOAD, context.req.param("id"), binding(context, auth, scope)))[0] as any;
      if (!controlled) throw new Error("DOWNLOAD_NOT_AUTHORIZED");
      const artifact = controlled.artifact_id ? await prisma.jobArtifact.findUnique({ where: { id: String(controlled.artifact_id) } }) : null;
      const record = { ...controlled, artifact };
      if (record.status === "expired" || record.artifact && record.artifact.expiresAt <= new Date()) throw new Error("EXPORT_EXPIRED");
      if (record.status !== "completed") throw new Error("EXPORT_NOT_READY");
      if (!record.artifact || record.artifact.deletedAt || !record.artifact.storageProvider || !record.artifact.storageReference) throw new Error("EXPORT_ARTIFACT_MISSING");
      const bytes = await new PrivateFilesystemMediaStorage(storage.privateRoot!).read(record.artifact.storageReference);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (digest !== record.artifact.checksumDigest || bytes.byteLength !== Number(record.artifact.byteCount)) throw new Error("EXPORT_ARTIFACT_MISSING");
      await audit(context, auth, EXPORT_DOWNLOAD, "job_artifact", record.artifact.id, "read_sensitive", { jobType: "dashboard.export.generate", jobTypeVersion: "dashboard.export.generate.v1", toStatus: "downloaded", attempt: 0, artifactType: record.artifact.artifactType });
      context.header("Content-Type", "text/csv");
      context.header("Content-Length", String(bytes.byteLength));
      context.header("Content-Disposition", `attachment; filename="foundation-sample-${record.id}.csv"`);
      context.header("Cache-Control", "private, no-store");
      context.header("Referrer-Policy", "no-referrer");
      context.header("X-Content-Type-Options", "nosniff");
      context.header("X-Content-SHA256", digest);
      return context.body(bytes);
    } catch (error) { return dataJobError(context, error); }
  });

  return routes;
}
