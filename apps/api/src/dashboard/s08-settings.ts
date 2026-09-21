import { createHash } from "node:crypto";
import { prisma, s08SettingsCreateDraft, s08SettingsEvents, s08SettingsPublishDraft, s08SettingsRows, s08SettingsUpdateDraft, s08SettingsValidateDraft, type RuntimeConfigVersion } from "@vanstro/db";
import { Hono, type Context } from "hono";
import { publicError } from "../public-errors.js";
import type { DashboardEnv } from "./access.js";
import { readBody } from "./request.js";

export const S08_DESCRIPTOR_KEY = "settings.api-service-account" as const;
export const S08_SCHEMA_VERSION = "settings.api-service-account.v1" as const;

export type ApiServiceAccountSettingsValueV1 = {
  tokenLifecyclePolicy: {
    defaultTtlDays: number;
    maximumTtlDays: number;
    rotationOverlapMinutes: number;
    /** 0 is the "no active policy" sentinel (future obligation); 1..100 is the configured bound. */
    maximumActiveTokensPerAccount: number;
    requireExpiry: boolean;
  };
  machineScopePolicy: {
    allowedRoleKeys: string[];
    allowedPermissionFamilies: string[];
    environment: "production" | "staging" | "development" | "test";
    dealerLocationScopeMode: "global" | "dealer" | "location";
    denySensitivePermissionsByDefault: boolean;
  };
  rateLimitPolicy: {
    requestsPerMinute: number;
    /** coverage_limited: not enforced by the persisted limiter (documented, never fake-ready). */
    burst: number;
    mode: "per-token" | "per-account";
    retryAfterSemantics: "seconds";
  };
  auditInvocationPolicy: {
    invocationRetentionDays: number;
    metadataRedactionMode: "strict" | "standard";
    lastUsedTrackingEnabled: boolean;
    failedAuthenticationAuditEnabled: boolean;
  };
};
export const S08_COMPILED_VALUE: ApiServiceAccountSettingsValueV1 = {
  tokenLifecyclePolicy: { defaultTtlDays: 90, maximumTtlDays: 365, rotationOverlapMinutes: 0, maximumActiveTokensPerAccount: 1, requireExpiry: false },
  machineScopePolicy: { allowedRoleKeys: [], allowedPermissionFamilies: [], environment: "production", dealerLocationScopeMode: "global", denySensitivePermissionsByDefault: true },
  rateLimitPolicy: { requestsPerMinute: 100, burst: 0, mode: "per-token", retryAfterSemantics: "seconds" },
  auditInvocationPolicy: { invocationRetentionDays: 365, metadataRedactionMode: "standard", lastUsedTrackingEnabled: true, failedAuthenticationAuditEnabled: true }
};

type S08Draft = {
  id: string;
  descriptorKey: typeof S08_DESCRIPTOR_KEY;
  status: "draft" | "validated" | "invalid" | "publishing" | "activation_failed" | "rollback_draft";
  value: ApiServiceAccountSettingsValueV1;
  basePublicationVersion: number;
  version: number;
  changeReason: string;
  createdAt: string;
  updatedAt: string;
  validationRevision: number | null;
  rollbackOfPublicationId: string | null;
};

function hash(domain: string, value: unknown) {
  return createHash("sha256").update(domain, "ascii").update("\0").update(JSON.stringify(value)).digest("hex");
}
function exactKeys(body: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(body).length === keys.length && Object.keys(body).every((key) => keys.includes(key));
}
function validIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(value);
}
function validReason(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 8 && value.trim().length <= 500;
}
function validVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && Number.isInteger(value) && value >= 0 && value <= 2147483647;
}
function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function requestId(context: { res: { headers: Headers } }) {
  return context.res.headers.get("X-Request-Id") ?? "settings-request";
}
function isOpen(row: RuntimeConfigVersion) { return ["draft", "validated", "invalid", "activation_failed"].includes(row.settingsLifecycleStatus ?? ""); }
function draftStatus(row: RuntimeConfigVersion): S08Draft["status"] {
  if (row.settingsLifecycleStatus === "activation_failed") return "activation_failed";
  if (row.desiredSource === "rollback_draft" && row.settingsLifecycleStatus === "draft") return "rollback_draft";
  if (row.settingsLifecycleStatus === "invalid") return "invalid";
  if (row.settingsLifecycleStatus === "validated") return "validated";
  return "draft";
}
function draftDto(row: RuntimeConfigVersion): S08Draft {
  return {
    id: row.id,
    descriptorKey: S08_DESCRIPTOR_KEY,
    status: draftStatus(row),
    value: row.desiredValue as ApiServiceAccountSettingsValueV1,
    basePublicationVersion: Number(row.generation),
    version: row.settingsRevision ?? row.version,
    changeReason: row.settingsChangeReason ?? "Settings change requested.",
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.settingsUpdatedAt ?? row.createdAt).toISOString(),
    validationRevision: row.settingsLifecycleStatus === "draft" ? null : row.settingsRevision,
    rollbackOfPublicationId: row.settingsRollbackOfPublicationId
  };
}

export function isStructurallyValidValue(value: unknown): value is ApiServiceAccountSettingsValueV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!exactKeys(v, ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"])) return false;
  const tlp = v.tokenLifecyclePolicy as Record<string, unknown>, msp = v.machineScopePolicy as Record<string, unknown>, rlp = v.rateLimitPolicy as Record<string, unknown>, aip = v.auditInvocationPolicy as Record<string, unknown>;
  if (![tlp, msp, rlp, aip].every((x) => x && typeof x === "object" && !Array.isArray(x))) return false;
  const bounded = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isSafeInteger(x) && x >= min && x <= max;
  const bool = (x: unknown) => typeof x === "boolean";
  if (!exactKeys(tlp, ["defaultTtlDays", "maximumTtlDays", "rotationOverlapMinutes", "maximumActiveTokensPerAccount", "requireExpiry"]) || !bounded(tlp.defaultTtlDays, 1, 365) || !bounded(tlp.maximumTtlDays, 1, 365) || !bounded(tlp.rotationOverlapMinutes, 0, 1440) || !bounded(tlp.maximumActiveTokensPerAccount, 1, 100) || !bool(tlp.requireExpiry)) return false;
  if (!exactKeys(msp, ["allowedRoleKeys", "allowedPermissionFamilies", "environment", "dealerLocationScopeMode", "denySensitivePermissionsByDefault"]) || !bool(msp.denySensitivePermissionsByDefault)) return false;
  const uniqueStrings = (x: unknown): x is string[] => Array.isArray(x) && new Set(x).size === x.length && x.every((entry) => typeof entry === "string");
  if (!uniqueStrings(msp.allowedRoleKeys) || !uniqueStrings(msp.allowedPermissionFamilies) || !["production", "staging", "development", "test"].includes(msp.environment as string) || !["global", "dealer", "location"].includes(msp.dealerLocationScopeMode as string)) return false;
  if (!exactKeys(rlp, ["requestsPerMinute", "burst", "mode", "retryAfterSemantics"]) || !bounded(rlp.requestsPerMinute, 1, 100000) || !bounded(rlp.burst, 0, 10000) || !["per-token", "per-account"].includes(rlp.mode as string) || rlp.retryAfterSemantics !== "seconds") return false;
  if (!exactKeys(aip, ["invocationRetentionDays", "metadataRedactionMode", "lastUsedTrackingEnabled", "failedAuthenticationAuditEnabled"]) || !bounded(aip.invocationRetentionDays, 1, 7300) || !["strict", "standard"].includes(aip.metadataRedactionMode as string) || !bool(aip.lastUsedTrackingEnabled) || !bool(aip.failedAuthenticationAuditEnabled)) return false;
  return true;
}
function businessIssues(value: ApiServiceAccountSettingsValueV1) {
  const issues: Array<{ code: string; severity: "blocker" | "warning" | "info"; field: string; message: string }> = [];
  if (value.tokenLifecyclePolicy.defaultTtlDays > value.tokenLifecyclePolicy.maximumTtlDays) issues.push({ code: "S08_TTL_ABOVE_MAXIMUM", severity: "blocker", field: "tokenLifecyclePolicy.defaultTtlDays", message: "Default token TTL exceeds the configured maximum TTL." });
  for (const family of value.machineScopePolicy.allowedPermissionFamilies) {
    if (family === "payment" || family === "customers") issues.push({ code: "S08_ERP_SENSITIVE_SCOPE", severity: "blocker", field: "machineScopePolicy.allowedPermissionFamilies", message: `Sensitive permission family ${family} is not allowed in machine scope.` });
  }
  if (value.rateLimitPolicy.burst > 0) issues.push({ code: "S08_RATE_LIMIT_BURST_COVERAGE_LIMITED", severity: "warning", field: "rateLimitPolicy.burst", message: "Burst is coverage_limited and is not enforced by the persisted rate limiter." });
  issues.push({ code: "S08_ERP_PRODUCT_API_FUTURE", severity: "warning", field: "machineScopePolicy.allowedPermissionFamilies", message: "ERP Product API machine consumer remains a future obligation." });
  return issues;
}

function mapConflict(context: Context<DashboardEnv>, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("S08_NOT_FOUND")) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings resource is unavailable.");
  if (message.includes("S08_VERSION_CONFLICT") || message === "VERSION_CONFLICT") return publicError(context, 409, "VERSION_CONFLICT", "The Settings state changed.");
  if (message.includes("S08_IDEMPOTENCY_CONFLICT") || message === "IDEMPOTENCY_CONFLICT") return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
  if (message.includes("S08_STATE_CONFLICT") || message === "SETTINGS_STATE_CONFLICT") return publicError(context, 409, "SETTINGS_STATE_CONFLICT", "The Settings lifecycle state does not allow this operation.");
  if (message.includes("S08_VALIDATION")) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings request is invalid.");
  if (message.includes("S08_FORBIDDEN")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global Settings permission is required.");
  throw error;
}

function activePublicationSequence(active: RuntimeConfigVersion | null, events: Array<{ runtimeConfigId: string; publicationSequence: number; eventType: string }>) {
  if (!active) return 0;
  return events.find((event) => event.runtimeConfigId === active.id && (event.eventType === "published" || event.eventType === "rollback_published"))?.publicationSequence ?? 0;
}

export type S08ConsumerState = "implemented_ready" | "implemented_degraded" | "future_obligation";
/** Consumer matrix mirrors the frozen wire contract: the five core consumers
 *  are implemented_ready at an exact generation with no extra DTO fields;
 *  erp-product-api-machine remains the explicit future obligation. */
export function consumerMatrix(generation: number | null) {
  return ["token-lifecycle", "rotate-overlap", "machine-scope-enforcement", "rate-limit", "audit-invocation-read-model", "erp-product-api-machine"].map((id) => {
    if (id === "erp-product-api-machine") return { id, state: "future_obligation" as S08ConsumerState, generation, reasonCode: "future_obligation" };
    if (generation === null) return { id, state: "implemented_degraded" as S08ConsumerState, generation, reasonCode: "consumer_generation_missing" };
    return { id, state: "implemented_ready" as S08ConsumerState, generation, reasonCode: null };
  });
}

function readinessFor(active: RuntimeConfigVersion | null, publishedGeneration: number, consumerGeneration: number | null) {
  const exact = active ? consumerGeneration === publishedGeneration : consumerGeneration === null || consumerGeneration === 0;
  const consumers = consumerMatrix(exact ? publishedGeneration : consumerGeneration);
  const allReady = consumers.every((consumer) => consumer.state === "implemented_ready");
  let reasonCode = "exact_generation";
  if (!exact) reasonCode = "consumer_generation_mismatch";
  else if (consumers.some((consumer) => consumer.id === "erp-product-api-machine" && consumer.state === "future_obligation")) reasonCode = "erp_product_api_machine_future_obligation";
  else if (!allReady) reasonCode = "coverage_limited";
  const state = exact && allReady ? "ready" : "degraded";
  return { state, reasonCode, consumers };
}

export function createDashboardS08SettingsRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/settings/s08-overview", async (context) => {
    const [rows, events] = await Promise.all([
      s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s08SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    const effective = (active?.effectiveValue ?? null) as ApiServiceAccountSettingsValueV1 | null;
    return context.json({ data: {
      descriptorKey: S08_DESCRIPTOR_KEY,
      schemaVersion: S08_SCHEMA_VERSION,
      projectionState: active ? "published" : "compiled_default",
      publishedGeneration,
      publication: active ? { version: publishedGeneration, cas: active.settingsRevision ?? null, publishedAt: (active.activatedAt ?? active.createdAt).toISOString(), changeReason: active.settingsChangeReason ?? "Settings publication." } : null,
      effective: effective ?? S08_COMPILED_VALUE,
      consumerMatrix: consumerMatrix(publishedGeneration)
    } });
  });

  routes.get("/dashboard/settings/s08-drafts", async (context) => {
    const rows = await s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: rows.filter(isOpen).map(draftDto) });
  });

  routes.post("/dashboard/settings/s08-drafts", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"]) || body.descriptorKey !== S08_DESCRIPTOR_KEY || !validVersion(body.expectedPublishedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s08:idempotency:v1", body.idempotencyKey);
    const requestHash = hash("vanstro:settings:s08:create-draft:v1", body);
    try {
      const [currentRows, currentEvents] = await Promise.all([
        s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
        s08SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
      ]);
      const active = currentRows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
      if (Number(body.expectedPublishedVersion) !== (active?.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const createdRows = await s08SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: active?.settingsRevision ?? 0, value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = createdRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s08-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const row = (await s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))).find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    return context.json({ data: draftDto(row) });
  });

  routes.patch("/dashboard/settings/s08-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "value", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft update is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s08:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s08:update-draft:v1", { draftId: id, ...body });
      const rows = await s08SettingsUpdateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = rows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.post("/dashboard/settings/s08-drafts/:id/validate", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings validation request is invalid.");
    try {
      const validatedRows = await s08SettingsValidateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash: hash("vanstro:settings:s08:idempotency:v1", body.idempotencyKey), requestHash: hash("vanstro:settings:s08:validate:v1", { draftId: id, ...body }), requestId: requestId(context) });
      const updated = validatedRows[0]; if (!updated) throw new Error("SETTINGS_STATE_CONFLICT");
      const value = updated.desiredValue as ApiServiceAccountSettingsValueV1;
      const issues = businessIssues(value);
      const status = issues.some((issue) => issue.severity === "blocker") ? "invalid" : "validated";
      return context.json({ data: { draftId: updated.id, draftVersion: updated.settingsRevision ?? updated.version, validationRevision: updated.settingsRevision ?? updated.version, status, issues, validatedAt: (updated.settingsValidatedAt ?? updated.createdAt).toISOString() } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s08-drafts/:id/diff", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const rows = await s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const row = rows.find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    const active = rows.find((entry) => entry.settingsLifecycleStatus === "published") ?? null;
    const before = (active?.effectiveValue ?? null) as ApiServiceAccountSettingsValueV1 | null;
    const after = row.desiredValue as ApiServiceAccountSettingsValueV1;
    const changes: Array<{ field: string; before: unknown; after: unknown; sensitivity: "public" }> = [];
    const fields: Array<[string, unknown, unknown]> = [
      ["tokenLifecyclePolicy", before?.tokenLifecyclePolicy, after.tokenLifecyclePolicy],
      ["machineScopePolicy", before?.machineScopePolicy, after.machineScopePolicy],
      ["rateLimitPolicy", before?.rateLimitPolicy, after.rateLimitPolicy],
      ["auditInvocationPolicy", before?.auditInvocationPolicy, after.auditInvocationPolicy]
    ];
    for (const [field, b, a] of fields) if (JSON.stringify(b) !== JSON.stringify(a)) changes.push({ field, before: b ?? null, after: a ?? null, sensitivity: "public" });
    return context.json({ data: { draftId: row.id, draftVersion: row.settingsRevision ?? row.version, descriptorKey: S08_DESCRIPTOR_KEY, changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] } });
  });

  routes.post("/dashboard/settings/s08-drafts/:id/publish", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings publish request is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s08:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s08:publish:v1", { draftId: id, ...body });
      const publishedRows = await s08SettingsPublishDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = publishedRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await s08SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const publishedGeneration = activePublicationSequence(row, events);
      if (publishedGeneration === 0) throw new Error("SETTINGS_STATE_CONFLICT");
      // Publish only activates the typed policy version; consumers resolve it
      // on their next operation and no business action is triggered here.
      const readiness = readinessFor(row, publishedGeneration, publishedGeneration);
      return context.json({ data: { id: row.id, generation: publishedGeneration.toString(), version: publishedGeneration, sourceDraftId: row.id, sourceDraftVersion: Number(body.expectedVersion), status: "published", publishedAt: (row.activatedAt ?? row.createdAt).toISOString(), rollbackOfPublicationId: row.settingsRollbackOfPublicationId, readiness: { state: readiness.state, reasonCode: readiness.reasonCode, observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: publishedGeneration, consumerGeneration: publishedGeneration, projectionState: "published", consumers: readiness.consumers } } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s08-history", async (context) => {
    const events = await s08SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const rows = await s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: events.map((event) => {
      const row = rows.find((entry) => entry.id === event.runtimeConfigId);
      return {
        publicationId: event.runtimeConfigId,
        generation: (row?.generation ?? 0n).toString(),
        version: event.publicationSequence,
        status: event.eventType === "rollback_published" || event.eventType === "published" ? "published" : event.eventType === "superseded" ? "superseded" : "activation_failed",
        descriptorKeys: [S08_DESCRIPTOR_KEY],
        changeReason: event.changeReason ?? "Settings publication.",
        publishedAt: new Date(event.occurredAt).toISOString(),
        rollbackOfPublicationId: event.rollbackSourcePublicationId,
        auditEventId: event.auditEventId
      };
    }) });
  });

  routes.post("/dashboard/settings/s08-history/:publicationId/rollback-draft", async (context) => {
    const publicationId = context.req.param("publicationId");
    if (!validUuid(publicationId)) return publicError(context, 400, "COMMERCE_INVALID", "The publication identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedPublishedVersion", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedPublishedVersion) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The rollback draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s08:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s08:rollback-draft:v1", { publicationId, ...body });
    try {
      const rows = await s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const source = rows.find(row => row.id === publicationId);
      const current = rows.find(row => row.settingsLifecycleStatus === "published") ?? null;
      if (!source || !current || source.id !== current.id || !["published", "superseded"].includes(source.settingsLifecycleStatus ?? "")) throw new Error("SETTINGS_STATE_CONFLICT");
      if (Number(body.expectedPublishedVersion) !== (current.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const rollbackRows = await s08SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: current.settingsRevision ?? 0, value: source.effectiveValue, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context), rollbackSource: source.id });
      const row = rollbackRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s08-readiness", async (context) => {
    const rawConsumerGeneration = context.req.query("consumerGeneration");
    if (rawConsumerGeneration !== undefined && !/^(0|[1-9][0-9]*)$/.test(rawConsumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const consumerGeneration = rawConsumerGeneration === undefined ? null : Number(rawConsumerGeneration);
    if (consumerGeneration !== null && !validVersion(consumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const [rows, events] = await Promise.all([
      s08SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s08SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    // Readiness requires exact generation equality. Compiled defaults are
    // generation zero; a published policy without an observed exact consumer
    // generation is reported degraded rather than fake-ready. The ERP Product
    // API machine consumer is a permanent future obligation and honestly keeps
    // the descriptor degraded (it blocks ERP Limited Release, not S08).
    const readiness = readinessFor(active, publishedGeneration, consumerGeneration);
    return context.json({ data: { state: readiness.state, reasonCode: readiness.reasonCode, observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: active ? publishedGeneration : null, publicationCas: active?.settingsRevision ?? null, consumerGeneration, projectionState: active ? "published" : "compiled_default", consumers: readiness.consumers } });
  });

  /** Read-only aggregate preview; no domain instance reads or writes. */
  routes.post("/dashboard/settings/s08-impact-preview", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["value"]) || !isStructurallyValidValue(body.value)) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request is invalid.");
    const value = body.value;
    const issues = businessIssues(value);
    const affectedFamilies = ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"] as const;
    return context.json({ data: {
      candidateAccepted: !issues.some((issue) => issue.severity === "blocker"),
      affectedFamilies,
      impact: {
        tokenLifecycle: {
          defaultTtlDays: value.tokenLifecyclePolicy.defaultTtlDays,
          maximumTtlDays: value.tokenLifecyclePolicy.maximumTtlDays,
          rotationOverlapMinutes: value.tokenLifecyclePolicy.rotationOverlapMinutes,
          maximumActiveTokensPerAccount: value.tokenLifecyclePolicy.maximumActiveTokensPerAccount,
          requireExpiry: value.tokenLifecyclePolicy.requireExpiry
        },
        machineScope: {
          allowedRoleKeyCount: value.machineScopePolicy.allowedRoleKeys.length,
          allowedPermissionFamilyCount: value.machineScopePolicy.allowedPermissionFamilies.length,
          environment: value.machineScopePolicy.environment,
          dealerLocationScopeMode: value.machineScopePolicy.dealerLocationScopeMode,
          denySensitivePermissionsByDefault: value.machineScopePolicy.denySensitivePermissionsByDefault
        },
        rateLimit: {
          requestsPerMinute: value.rateLimitPolicy.requestsPerMinute,
          burst: value.rateLimitPolicy.burst,
          mode: value.rateLimitPolicy.mode,
          retryAfterSemantics: value.rateLimitPolicy.retryAfterSemantics
        },
        auditInvocation: {
          invocationRetentionDays: value.auditInvocationPolicy.invocationRetentionDays,
          metadataRedactionMode: value.auditInvocationPolicy.metadataRedactionMode,
          lastUsedTrackingEnabled: value.auditInvocationPolicy.lastUsedTrackingEnabled,
          failedAuthenticationAuditEnabled: value.auditInvocationPolicy.failedAuthenticationAuditEnabled
        }
      },
      warnings: issues.filter((issue) => issue.severity === "warning").map((issue) => issue.code),
      contextRevision: context.get("p02Authorization").contextRevision
    } });
  });

  return routes;
}