import { createHash } from "node:crypto";
import { authAdminRevokeUserSessions, prisma, s09SettingsCreateDraft, s09SettingsEvents, s09SettingsPublishDraft, s09SettingsRows, s09SettingsUpdateDraft, s09SettingsValidateDraft, type RuntimeConfigVersion } from "@vanstro/db";
import { Hono, type Context } from "hono";
import { publicError } from "../public-errors.js";
import { buildAuditMetadata, recordAuditEvent } from "../audit/foundation.js";
import type { DashboardEnv } from "./access.js";
import { assertLastSuperAdminPreserved, P02InvariantError } from "./p02-invariants.js";
import { readBody } from "./request.js";

export const S09_DESCRIPTOR_KEY = "settings.auth-rbac" as const;
export const S09_SCHEMA_VERSION = "settings.auth-rbac.v1" as const;

export type AuthRbacSettingsValueV1 = {
  passwordPolicy: {
    minimumLength: number;
    resetTokenTtlMinutes: number;
  };
  sessionPolicy: {
    sessionLifetimeMinutes: number;
  };
};

export type S09Draft = {
  id: string;
  descriptorKey: typeof S09_DESCRIPTOR_KEY;
  status: "draft" | "validated" | "invalid" | "publishing" | "activation_failed" | "rollback_draft";
  value: AuthRbacSettingsValueV1;
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
function draftStatus(row: RuntimeConfigVersion): S09Draft["status"] {
  if (row.settingsLifecycleStatus === "activation_failed") return "activation_failed";
  if (row.desiredSource === "rollback_draft" && row.settingsLifecycleStatus === "draft") return "rollback_draft";
  if (row.settingsLifecycleStatus === "invalid") return "invalid";
  if (row.settingsLifecycleStatus === "validated") return "validated";
  return "draft";
}
function draftDto(row: RuntimeConfigVersion): S09Draft {
  return {
    id: row.id,
    descriptorKey: S09_DESCRIPTOR_KEY,
    status: draftStatus(row),
    value: row.desiredValue as AuthRbacSettingsValueV1,
    basePublicationVersion: Number(row.generation),
    version: row.settingsRevision ?? row.version,
    changeReason: row.settingsChangeReason ?? "Settings change requested.",
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.settingsUpdatedAt ?? row.createdAt).toISOString(),
    validationRevision: row.settingsLifecycleStatus === "draft" ? null : row.settingsRevision,
    rollbackOfPublicationId: row.settingsRollbackOfPublicationId
  };
}

/**
 * Stable 400 for structurally invalid S09 value payloads. Exact key sets and
 * integer bounds mirror s09_settings_value_shape_valid; unknown keys reject.
 * Hash/cookie/RBAC facts are never part of the Settings value (read-only
 * projection in the UI), so no secret-shaped field is accepted here.
 */
function isStructurallyValidValue(value: unknown): value is AuthRbacSettingsValueV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!exactKeys(v, ["passwordPolicy", "sessionPolicy"])) return false;
  const pp = v.passwordPolicy, sp = v.sessionPolicy;
  if (!pp || typeof pp !== "object" || Array.isArray(pp)) return false;
  if (!sp || typeof sp !== "object" || Array.isArray(sp)) return false;
  const p = pp as Record<string, unknown>, s = sp as Record<string, unknown>;
  if (!exactKeys(p, ["minimumLength", "resetTokenTtlMinutes"])) return false;
  if (!exactKeys(s, ["sessionLifetimeMinutes"])) return false;
  if (typeof p.minimumLength !== "number" || !Number.isInteger(p.minimumLength) || p.minimumLength < 12 || p.minimumLength > 128) return false;
  if (typeof p.resetTokenTtlMinutes !== "number" || !Number.isInteger(p.resetTokenTtlMinutes) || p.resetTokenTtlMinutes < 5 || p.resetTokenTtlMinutes > 31) return false;
  if (typeof s.sessionLifetimeMinutes !== "number" || !Number.isInteger(s.sessionLifetimeMinutes) || s.sessionLifetimeMinutes < 15 || s.sessionLifetimeMinutes > 11520) return false;
  return true;
}

/** Business-validity checks that run server-side on validate (not on structural save). */
function businessIssues(value: AuthRbacSettingsValueV1): Array<{ code: string; severity: "blocker" | "warning" | "info"; field: string; message: string }> {
  const issues: Array<{ code: string; severity: "blocker" | "warning" | "info"; field: string; message: string }> = [];
  if (value.passwordPolicy.minimumLength < 12 || value.passwordPolicy.minimumLength > 128) issues.push({ code: "S09_PASSWORD_LENGTH", severity: "blocker", field: "passwordPolicy.minimumLength", message: "minimumLength must be between 12 and 128." });
  if (value.passwordPolicy.resetTokenTtlMinutes < 5 || value.passwordPolicy.resetTokenTtlMinutes > 31) issues.push({ code: "S09_RESET_TTL", severity: "blocker", field: "passwordPolicy.resetTokenTtlMinutes", message: "resetTokenTtlMinutes must be between 5 and 31." });
  if (value.sessionPolicy.sessionLifetimeMinutes < 15 || value.sessionPolicy.sessionLifetimeMinutes > 11520) issues.push({ code: "S09_SESSION_TTL", severity: "blocker", field: "sessionPolicy.sessionLifetimeMinutes", message: "sessionLifetimeMinutes must be between 15 and 11520." });
  return issues;
}

function mapConflict(context: Context<DashboardEnv>, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("S09_NOT_FOUND")) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings resource is unavailable.");
  if (message.includes("S09_VERSION_CONFLICT") || message === "VERSION_CONFLICT") return publicError(context, 409, "VERSION_CONFLICT", "The Settings state changed.");
  if (message.includes("S09_IDEMPOTENCY_CONFLICT") || message === "IDEMPOTENCY_CONFLICT") return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
  if (message.includes("S09_STATE_CONFLICT") || message === "SETTINGS_STATE_CONFLICT") return publicError(context, 409, "SETTINGS_STATE_CONFLICT", "The Settings lifecycle state does not allow this operation.");
  if (message.includes("S09_VALIDATION")) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings request is invalid.");
  if (message.includes("S09_FORBIDDEN")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global Settings permission is required.");
  throw error;
}

function activePublicationSequence(active: RuntimeConfigVersion | null, events: Array<{ runtimeConfigId: string; publicationSequence: number; eventType: string }>) {
  if (!active) return 0;
  return events.find((event) => event.runtimeConfigId === active.id && (event.eventType === "published" || event.eventType === "rollback_published"))?.publicationSequence ?? 0;
}

export function createDashboardS09SettingsRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/settings/s09-overview", async (context) => {
    const [rows, events] = await Promise.all([
      s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s09SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    const effective = (active?.effectiveValue ?? null) as AuthRbacSettingsValueV1 | null;
    return context.json({ data: {
      descriptorKey: S09_DESCRIPTOR_KEY,
      schemaVersion: S09_SCHEMA_VERSION,
      projectionState: active ? "published" : "compiled_default",
      publishedGeneration,
      publication: active ? { version: publishedGeneration, cas: active.settingsRevision ?? null, publishedAt: (active.activatedAt ?? active.createdAt).toISOString(), changeReason: active.settingsChangeReason ?? "Settings publication." } : null,
      effective: effective ?? { passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 10080 } }
    } });
  });

  routes.get("/dashboard/settings/s09-drafts", async (context) => {
    const rows = await s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: rows.filter(isOpen).map(draftDto) });
  });

  routes.post("/dashboard/settings/s09-drafts", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"]) || body.descriptorKey !== S09_DESCRIPTOR_KEY || !validVersion(body.expectedPublishedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s09:idempotency:v1", body.idempotencyKey);
    const requestHash = hash("vanstro:settings:s09:create-draft:v1", body);
    try {
      const [currentRows, currentEvents] = await Promise.all([
        s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
        s09SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
      ]);
      const active = currentRows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
      if (Number(body.expectedPublishedVersion) !== (active?.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const createdRows = await s09SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: active?.settingsRevision ?? 0, value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = createdRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s09-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const row = (await s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))).find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    return context.json({ data: draftDto(row) });
  });

  routes.patch("/dashboard/settings/s09-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "value", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft update is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s09:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s09:update-draft:v1", { draftId: id, ...body });
      const rows = await s09SettingsUpdateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = rows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.post("/dashboard/settings/s09-drafts/:id/validate", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings validation request is invalid.");
    try {
      const validatedRows = await s09SettingsValidateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash: hash("vanstro:settings:s09:idempotency:v1", body.idempotencyKey), requestHash: hash("vanstro:settings:s09:validate:v1", { draftId: id, ...body }), requestId: requestId(context) });
      const updated = validatedRows[0]; if (!updated) throw new Error("SETTINGS_STATE_CONFLICT");
      const value = updated.desiredValue as AuthRbacSettingsValueV1;
      const issues = businessIssues(value);
      const status = issues.some((issue) => issue.severity === "blocker") ? "invalid" : "validated";
      return context.json({ data: { draftId: updated.id, draftVersion: updated.settingsRevision ?? updated.version, validationRevision: updated.settingsRevision ?? updated.version, status, issues, validatedAt: (updated.settingsValidatedAt ?? updated.createdAt).toISOString() } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s09-drafts/:id/diff", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const rows = await s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const row = rows.find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    const active = rows.find((entry) => entry.settingsLifecycleStatus === "published") ?? null;
    const before = active?.effectiveValue as AuthRbacSettingsValueV1 | null;
    const after = row.desiredValue as AuthRbacSettingsValueV1;
    const changes: Array<{ field: string; before: unknown; after: unknown; sensitivity: "public" }> = [];
    const fields: Array<[string, unknown, unknown]> = [
      ["passwordPolicy.minimumLength", before?.passwordPolicy.minimumLength, after.passwordPolicy.minimumLength],
      ["passwordPolicy.resetTokenTtlMinutes", before?.passwordPolicy.resetTokenTtlMinutes, after.passwordPolicy.resetTokenTtlMinutes],
      ["sessionPolicy.sessionLifetimeMinutes", before?.sessionPolicy.sessionLifetimeMinutes, after.sessionPolicy.sessionLifetimeMinutes]
    ];
    for (const [field, b, a] of fields) if (JSON.stringify(b) !== JSON.stringify(a)) changes.push({ field, before: b, after: a, sensitivity: "public" });
    return context.json({ data: { draftId: row.id, draftVersion: row.settingsRevision ?? row.version, descriptorKey: S09_DESCRIPTOR_KEY, changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["auth", "dashboard"] } });
  });

  routes.post("/dashboard/settings/s09-drafts/:id/publish", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings publish request is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s09:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s09:publish:v1", { draftId: id, ...body });
      const publishedRows = await s09SettingsPublishDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = publishedRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await s09SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const publishedGeneration = activePublicationSequence(row, events);
      if (publishedGeneration === 0) throw new Error("SETTINGS_STATE_CONFLICT");
      // The auth consumer (login/refresh/registration/reset) resolves the
      // effective policy directly from the published row on every operation,
      // so it can never lag the projection: readiness is ready as of the
      // publication, and consumerGeneration equals publishedGeneration.
      return context.json({ data: { id: row.id, generation: publishedGeneration.toString(), version: publishedGeneration, sourceDraftId: row.id, sourceDraftVersion: Number(body.expectedVersion), status: "published", publishedAt: (row.activatedAt ?? row.createdAt).toISOString(), rollbackOfPublicationId: row.settingsRollbackOfPublicationId, readiness: { state: "ready", reasonCode: "ready", observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: publishedGeneration, consumerGeneration: publishedGeneration, projectionState: "published" } } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s09-history", async (context) => {
    const events = await s09SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const rows = await s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: events.map((event) => {
      const row = rows.find((entry) => entry.id === event.runtimeConfigId);
      return {
        publicationId: event.runtimeConfigId,
        generation: (row?.generation ?? 0n).toString(),
        version: event.publicationSequence,
        status: event.eventType === "rollback_published" || event.eventType === "published" ? "published" : event.eventType === "superseded" ? "superseded" : "activation_failed",
        descriptorKeys: [S09_DESCRIPTOR_KEY],
        changeReason: event.changeReason ?? "Settings publication.",
        publishedAt: new Date(event.occurredAt).toISOString(),
        rollbackOfPublicationId: event.rollbackSourcePublicationId,
        auditEventId: event.auditEventId
      };
    }) });
  });

  routes.post("/dashboard/settings/s09-history/:publicationId/rollback-draft", async (context) => {
    const publicationId = context.req.param("publicationId");
    if (!validUuid(publicationId)) return publicError(context, 400, "COMMERCE_INVALID", "The publication identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedPublishedVersion", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedPublishedVersion) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The rollback draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s09:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s09:rollback-draft:v1", { publicationId, ...body });
    try {
      const rows = await s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const source = rows.find(row => row.id === publicationId);
      const current = rows.find(row => row.settingsLifecycleStatus === "published") ?? null;
      if (!source || !current || source.id !== current.id || !["published", "superseded"].includes(source.settingsLifecycleStatus ?? "")) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await s09SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      if (Number(body.expectedPublishedVersion) !== (current.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const rollbackRows = await s09SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: current.settingsRevision ?? 0, value: source.effectiveValue, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context), rollbackSource: source.id });
      const row = rollbackRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s09-readiness", async (context) => {
    const rawConsumerGeneration = context.req.query("consumerGeneration");
    if (rawConsumerGeneration !== undefined && !/^(0|[1-9][0-9]*)$/.test(rawConsumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const consumerGeneration = rawConsumerGeneration === undefined ? null : Number(rawConsumerGeneration);
    if (consumerGeneration !== null && !validVersion(consumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const [rows, events] = await Promise.all([
      s09SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s09SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    const exact = consumerGeneration === publishedGeneration && publishedGeneration > 0;
    return context.json({ data: { state: exact ? "ready" : "degraded", reasonCode: consumerGeneration === null ? "consumer_generation_missing" : exact ? "ready" : "consumer_generation_mismatch", observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: active ? publishedGeneration : null, publicationCas: active?.settingsRevision ?? null, consumerGeneration, projectionState: active ? "published" : "compiled_default" } });
  });

  /**
   * Zero-write impact preview for RBAC mutations: runs the real
   * assertLastSuperAdminPreserved invariant inside a read-only transaction
   * against the candidate change and reports whether it would block.
   * Request exact keys: targetUserId + at least one of nextStatus?/removeRoleId?.
   * Response: targetUserId / wouldBlockLastSuperAdmin / activeSuperAdminCount /
   * safeReasonCode / contextRevision.
   */
  routes.post("/dashboard/settings/s09-impact-preview", async (context) => {
    const body = await readBody(context);
    if (!body || typeof body !== "object" || Array.isArray(body)) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request is invalid.");
    const keys = Object.keys(body as Record<string, unknown>);
    if (!keys.includes("targetUserId") || !keys.every((key) => key === "targetUserId" || key === "nextStatus" || key === "removeRoleId") || keys.length < 2) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request must include targetUserId and at least one change.");
    const targetUserId = (body as Record<string, unknown>).targetUserId;
    const nextStatus = (body as Record<string, unknown>).nextStatus;
    const removeRoleId = (body as Record<string, unknown>).removeRoleId;
    if (!validUuid(targetUserId)) return publicError(context, 400, "COMMERCE_INVALID", "The target user identifier is invalid.");
    if (nextStatus !== undefined && nextStatus !== null && !["active", "suspended", "archived"].includes(nextStatus as string)) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview nextStatus is invalid.");
    if (removeRoleId !== undefined && removeRoleId !== null && !validUuid(removeRoleId)) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview role identifier is invalid.");
    // The contract requires at least one effective change: explicit null
    // values count as no-change and are rejected like a missing key.
    if ((nextStatus === undefined || nextStatus === null) && (removeRoleId === undefined || removeRoleId === null)) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request must include at least one effective change.");
    try {
      const result = await prisma.$transaction(async (transaction) => {
        const superRole = await transaction.role.findUnique({ where: { key: "super_admin" }, select: { id: true } });
        const activeSuperAdminCount = superRole ? await transaction.user.count({ where: { status: "active", kind: "admin", userRoles: { some: { roleId: superRole.id } } } }) : 0;
        await assertLastSuperAdminPreserved(transaction, targetUserId as string, { nextStatus: nextStatus === undefined || nextStatus === null ? undefined : (nextStatus as string), removeRoleId: removeRoleId === undefined || removeRoleId === null ? undefined : (removeRoleId as string) });
        return { activeSuperAdminCount };
      }, { isolationLevel: "RepeatableRead" });
      return context.json({ data: { targetUserId, wouldBlockLastSuperAdmin: false, activeSuperAdminCount: result.activeSuperAdminCount, safeReasonCode: "allowed", contextRevision: context.get("p02Authorization").contextRevision } });
    } catch (error) {
      // Only the last-super-admin guard rejection maps to the preview result;
      // other P02 invariants (e.g. the super_admin role missing from the DB)
      // surface as configuration failures instead of a fake "blocked" preview.
      if (error instanceof P02InvariantError && error.message.includes("last active Super Admin")) {
        return context.json({ data: { targetUserId, wouldBlockLastSuperAdmin: true, activeSuperAdminCount: null, safeReasonCode: "LAST_SUPER_ADMIN_BLOCKED", contextRevision: context.get("p02Authorization").contextRevision } });
      }
      throw error;
    }
  });

  /**
   * Explicit admin session-revoke surface, fully separated from the Settings
   * lifecycle: requires sessions.revoke, a literal confirmation and a reason.
   * Writes a session_revoke audit event with a real P02 snapshot; metadata
   * carries only targetUserId/reasonCode (denylist: session token/hash,
   * cookie, Authorization header, password hash).
   */
  routes.post("/dashboard/settings/s09-session-revoke", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["targetUserId", "confirmation", "reason"])) return publicError(context, 400, "COMMERCE_INVALID", "The session revoke request is invalid.");
    if (!validUuid(body.targetUserId)) return publicError(context, 400, "COMMERCE_INVALID", "The target user identifier is invalid.");
    if (body.confirmation !== "REVOKE_SESSIONS") return publicError(context, 400, "AUTH_RBAC_CONFIRMATION_INVALID", "The session revoke confirmation is invalid.");
    if (!validReason(body.reason)) return publicError(context, 400, "COMMERCE_INVALID", "The session revoke reason must be between 8 and 500 characters.");
    try {
      const revokedCount = await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({ where: { id: body.targetUserId as string }, select: { id: true } });
        if (!user) return -1;
        const active = await transaction.refreshSession.count({ where: { userId: body.targetUserId as string, revokedAt: null } });
        await authAdminRevokeUserSessions(transaction, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), targetUserId: body.targetUserId as string });
        await recordAuditEvent(context, context.get("p02Authorization"), {
          action: "session_revoke",
          resource: { type: "user", id: body.targetUserId as string },
          result: "succeeded",
          reason: "operator_requested",
          requiredPermissions: ["sessions.revoke"],
          primaryPermission: "sessions.revoke",
          metadata: buildAuditMetadata({ targetUserId: body.targetUserId as string, reasonCode: "operator_requested" }, ["targetUserId", "reasonCode"])
        }, transaction);
        return active;
      });
      if (revokedCount === -1) return publicError(context, 404, "AUTH_RBAC_TARGET_NOT_FOUND", "The target user is unavailable.");
      return context.json({ data: { targetUserId: body.targetUserId, revokedCount, reason: String(body.reason).trim(), revokedAt: new Date().toISOString() } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("AUTH_SESSION_REVOKE_DENIED")) return publicError(context, 403, "AUTH_SESSION_REVOKE_DENIED", "Global session revoke permission is required.");
      throw error;
    }
  });

  return routes;
}
