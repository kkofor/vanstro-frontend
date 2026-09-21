import { createHash } from "node:crypto";
import { prisma, s10SettingsCreateDraft, s10SettingsEvents, s10SettingsPublishDraft, s10SettingsRows, s10SettingsUpdateDraft, s10SettingsValidateDraft, type RuntimeConfigVersion } from "@vanstro/db";
import { Hono, type Context } from "hono";
import { publicError } from "../public-errors.js";
import type { DashboardEnv } from "./access.js";
import { readBody } from "./request.js";

export const S10_DESCRIPTOR_KEY = "settings.privacy-retention" as const;
export const S10_SCHEMA_VERSION = "settings.privacy-retention.v1" as const;

export const OBJECT_FAMILIES = ["consent_events", "audit_events", "async_jobs", "media_assets", "orders", "payments", "privacy_requests"] as const;
export type ObjectFamily = (typeof OBJECT_FAMILIES)[number];
const HIGH_RISK_FAMILIES = new Set(["audit_events", "media_assets", "orders", "payments", "privacy_requests"]);
const LOW_RISK_CANDIDATES = new Set(["consent_events", "async_jobs"]);
const CONSENT_CATEGORIES = new Set(["functional", "analytics", "targeting"]);
const DSAR_SCOPES = new Set(["all_personal_data", "orders", "payments", "media", "communications"]);
const DSAR_METHODS = new Set(["access", "export", "delete"]);
const DISPLAY_MODES = new Set(["plain", "masked", "hidden"]);

export type PrivacyRetentionSettingsValueV1 = {
  consentPolicy: {
    anonymousConsentEnabled: boolean;
    authenticatedConsentEnabled: boolean;
    consentCategories: Array<"functional" | "analytics" | "targeting">;
    retentionMonths: number;
  };
  retentionPolicy: {
    retentionByObjectFamily: Array<{ objectFamily: ObjectFamily; retentionDays: number; autoCleanupEnabled: boolean }>;
  };
  legalHoldPolicy: {
    legalHoldEnabled: boolean;
    legalHoldRefs: string[];
  };
  dsarPolicy: {
    accessExportDeleteRules: Array<{ scope: (typeof DSAR_SCOPES extends Set<infer T> ? T : never); method: (typeof DSAR_METHODS extends Set<infer T> ? T : never); enabled: boolean; requireAdminApproval: boolean }>;
  };
  piiDisplayPolicy: {
    piiDisplayRules: Array<{ field: string; displayMode: (typeof DISPLAY_MODES extends Set<infer T> ? T : never); allowedRoles: string[] }>;
  };
  lowRiskExecution: {
    allowlist: Array<"consent_events" | "async_jobs">;
    impactPreviewEnabled: boolean;
  };
};

/** Compiled defaults anchored to current facts (D17/P04/Retention). */
export const S10_COMPILED_VALUE: PrivacyRetentionSettingsValueV1 = {
  consentPolicy: { anonymousConsentEnabled: true, authenticatedConsentEnabled: false, consentCategories: ["functional", "analytics", "targeting"], retentionMonths: 24 },
  retentionPolicy: { retentionByObjectFamily: [] },
  legalHoldPolicy: { legalHoldEnabled: false, legalHoldRefs: [] },
  dsarPolicy: { accessExportDeleteRules: [] },
  piiDisplayPolicy: { piiDisplayRules: [] },
  lowRiskExecution: { allowlist: [], impactPreviewEnabled: true }
};

type S10Draft = {
  id: string;
  descriptorKey: typeof S10_DESCRIPTOR_KEY;
  status: "draft" | "validated" | "invalid" | "publishing" | "activation_failed" | "rollback_draft";
  value: PrivacyRetentionSettingsValueV1;
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
function draftStatus(row: RuntimeConfigVersion): S10Draft["status"] {
  if (row.settingsLifecycleStatus === "activation_failed") return "activation_failed";
  if (row.desiredSource === "rollback_draft" && row.settingsLifecycleStatus === "draft") return "rollback_draft";
  if (row.settingsLifecycleStatus === "invalid") return "invalid";
  if (row.settingsLifecycleStatus === "validated") return "validated";
  return "draft";
}
function draftDto(row: RuntimeConfigVersion): S10Draft {
  return {
    id: row.id,
    descriptorKey: S10_DESCRIPTOR_KEY,
    status: draftStatus(row),
    value: row.desiredValue as PrivacyRetentionSettingsValueV1,
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
 * Stable 400 for structurally invalid S10 value payloads. Mirrors
 * s10_settings_value_shape_valid: exact keys, integer bounds, enums and
 * array bounds; unknown keys/families/scopes/methods/display modes reject.
 */
function isStructurallyValidValue(value: unknown): value is PrivacyRetentionSettingsValueV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!exactKeys(v, ["consentPolicy", "retentionPolicy", "legalHoldPolicy", "dsarPolicy", "piiDisplayPolicy", "lowRiskExecution"])) return false;
  const cp = v.consentPolicy as Record<string, unknown>, rp = v.retentionPolicy as Record<string, unknown>, lh = v.legalHoldPolicy as Record<string, unknown>;
  const ds = v.dsarPolicy as Record<string, unknown>, pp = v.piiDisplayPolicy as Record<string, unknown>, lr = v.lowRiskExecution as Record<string, unknown>;
  if (!cp || typeof cp !== "object" || Array.isArray(cp) || !rp || typeof rp !== "object" || Array.isArray(rp) || !lh || typeof lh !== "object" || Array.isArray(lh)) return false;
  if (!ds || typeof ds !== "object" || Array.isArray(ds) || !pp || typeof pp !== "object" || Array.isArray(pp) || !lr || typeof lr !== "object" || Array.isArray(lr)) return false;
  if (!exactKeys(cp, ["anonymousConsentEnabled", "authenticatedConsentEnabled", "consentCategories", "retentionMonths"])) return false;
  if (!exactKeys(rp, ["retentionByObjectFamily"])) return false;
  if (!exactKeys(lh, ["legalHoldEnabled", "legalHoldRefs"])) return false;
  if (!exactKeys(ds, ["accessExportDeleteRules"])) return false;
  if (!exactKeys(pp, ["piiDisplayRules"])) return false;
  if (!exactKeys(lr, ["allowlist", "impactPreviewEnabled"])) return false;
  if (typeof cp.anonymousConsentEnabled !== "boolean" || typeof cp.authenticatedConsentEnabled !== "boolean" || typeof cp.retentionMonths !== "number" || !Number.isInteger(cp.retentionMonths) || cp.retentionMonths < 6 || cp.retentionMonths > 120) return false;
  if (!Array.isArray(cp.consentCategories) || cp.consentCategories.length < 1 || cp.consentCategories.length > 3 || new Set(cp.consentCategories).size !== cp.consentCategories.length || !cp.consentCategories.every((c) => CONSENT_CATEGORIES.has(c as string))) return false;
  if (!Array.isArray(lr.allowlist) || lr.allowlist.length > 2 || new Set(lr.allowlist).size !== lr.allowlist.length || !lr.allowlist.every((a) => LOW_RISK_CANDIDATES.has(a as string)) || typeof lr.impactPreviewEnabled !== "boolean") return false;
  if (typeof lh.legalHoldEnabled !== "boolean" || !Array.isArray(lh.legalHoldRefs) || lh.legalHoldRefs.length > 64 || !lh.legalHoldRefs.every((r) => validUuid(r))) return false;
  if (!Array.isArray(rp.retentionByObjectFamily) || rp.retentionByObjectFamily.length > 7) return false;
  const families = new Set<string>();
  for (const entry of rp.retentionByObjectFamily as Array<Record<string, unknown>>) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !exactKeys(entry, ["objectFamily", "retentionDays", "autoCleanupEnabled"])) return false;
    if (!OBJECT_FAMILIES.includes(entry.objectFamily as ObjectFamily)) return false;
    if (families.has(entry.objectFamily as string)) return false;
    families.add(entry.objectFamily as string);
    if (typeof entry.retentionDays !== "number" || !Number.isInteger(entry.retentionDays) || entry.retentionDays < 30 || entry.retentionDays > 7300) return false;
    if (typeof entry.autoCleanupEnabled !== "boolean") return false;
  }
  if (!Array.isArray(ds.accessExportDeleteRules) || ds.accessExportDeleteRules.length > 15) return false;
  for (const entry of ds.accessExportDeleteRules as Array<Record<string, unknown>>) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !exactKeys(entry, ["scope", "method", "enabled", "requireAdminApproval"])) return false;
    if (!DSAR_SCOPES.has(entry.scope as string) || !DSAR_METHODS.has(entry.method as string)) return false;
    if (typeof entry.enabled !== "boolean" || typeof entry.requireAdminApproval !== "boolean") return false;
  }
  if (!Array.isArray(pp.piiDisplayRules) || pp.piiDisplayRules.length > 20) return false;
  for (const entry of pp.piiDisplayRules as Array<Record<string, unknown>>) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !exactKeys(entry, ["field", "displayMode", "allowedRoles"])) return false;
    if (typeof entry.field !== "string" || entry.field.length < 1 || entry.field.length > 80 || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(entry.field)) return false;
    if (!DISPLAY_MODES.has(entry.displayMode as string)) return false;
    if (!Array.isArray(entry.allowedRoles) || entry.allowedRoles.length < 1 || entry.allowedRoles.length > 8 || !entry.allowedRoles.every((r) => typeof r === "string" && r.length > 0)) return false;
  }
  return true;
}

/** Business blockers mirroring s10_settings_value_business_valid. */
function businessIssues(value: PrivacyRetentionSettingsValueV1, knownRoleKeys?: ReadonlySet<string>): Array<{ code: string; severity: "blocker" | "warning" | "info"; field: string; message: string }> {
  const issues: Array<{ code: string; severity: "blocker" | "warning" | "info"; field: string; message: string }> = [];
  for (const entry of value.retentionPolicy.retentionByObjectFamily) {
    if (entry.autoCleanupEnabled && HIGH_RISK_FAMILIES.has(entry.objectFamily)) {
      issues.push({ code: "S10_HIGH_RISK_AUTO_CLEANUP", severity: "blocker", field: `retentionPolicy.retentionByObjectFamily.${entry.objectFamily}.autoCleanupEnabled`, message: `${entry.objectFamily} is high-risk and may never enable auto-cleanup.` });
    }
    // Retention below the current worker constant (where a current fact
    // maps to the family): advisory, never blocking.
    if (entry.objectFamily === "consent_events" && entry.retentionDays < 730) {
      issues.push({ code: "S10_RETENTION_BELOW_WORKER", severity: "warning", field: `retentionPolicy.retentionByObjectFamily.${entry.objectFamily}.retentionDays`, message: "Retention below the consent-event worker constant (24 months)." });
    }
    if (entry.objectFamily === "audit_events" && entry.retentionDays < 2555) {
      issues.push({ code: "S10_RETENTION_BELOW_WORKER", severity: "warning", field: `retentionPolicy.retentionByObjectFamily.${entry.objectFamily}.retentionDays`, message: "Retention below the audit worker constant (audit-retention.v1, 2555 days)." });
    }
  }
  if (value.legalHoldPolicy.legalHoldEnabled) {
    if (value.legalHoldPolicy.legalHoldRefs.length === 0) issues.push({ code: "S10_HOLD_REFS_REQUIRED", severity: "blocker", field: "legalHoldPolicy.legalHoldRefs", message: "legalHoldRefs are required when legal hold is enabled." });
    if (value.retentionPolicy.retentionByObjectFamily.some((entry) => entry.autoCleanupEnabled)) issues.push({ code: "S10_HOLD_CONFLICT", severity: "blocker", field: "legalHoldPolicy.legalHoldEnabled", message: "Auto-cleanup conflicts with an enabled legal hold." });
  }
  for (const rule of value.dsarPolicy.accessExportDeleteRules) {
    if (rule.method === "delete" && !rule.requireAdminApproval) issues.push({ code: "S10_DSAR_DELETE_APPROVAL", severity: "blocker", field: "dsarPolicy.accessExportDeleteRules", message: "DSAR delete rules always require admin approval." });
  }
  for (const rule of value.piiDisplayPolicy.piiDisplayRules) {
    const unknown = rule.allowedRoles.filter((role) => knownRoleKeys && !knownRoleKeys.has(role));
    if (unknown.length > 0) issues.push({ code: "S10_UNKNOWN_ROLE_KEY", severity: "blocker", field: "piiDisplayPolicy.piiDisplayRules", message: `Unknown role key${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.` });
  }
  if (value.consentPolicy.authenticatedConsentEnabled) issues.push({ code: "S10_AUTHENTICATED_FUTURE", severity: "warning", field: "consentPolicy.authenticatedConsentEnabled", message: "Authenticated consent is not executable today (future_unavailable)." });
  if (value.retentionPolicy.retentionByObjectFamily.some((entry) => entry.autoCleanupEnabled)) issues.push({ code: "S10_CLEANUP_SEPARATE_AUTHORIZATION", severity: "warning", field: "retentionPolicy.retentionByObjectFamily", message: "Auto-cleanup execution requires a separately authorized cleanup consumer." });
  return issues;
}

function mapConflict(context: Context<DashboardEnv>, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("S10_NOT_FOUND")) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings resource is unavailable.");
  if (message.includes("S10_VERSION_CONFLICT") || message === "VERSION_CONFLICT") return publicError(context, 409, "VERSION_CONFLICT", "The Settings state changed.");
  if (message.includes("S10_IDEMPOTENCY_CONFLICT") || message === "IDEMPOTENCY_CONFLICT") return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
  if (message.includes("S10_STATE_CONFLICT") || message === "SETTINGS_STATE_CONFLICT") return publicError(context, 409, "SETTINGS_STATE_CONFLICT", "The Settings lifecycle state does not allow this operation.");
  if (message.includes("S10_VALIDATION")) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings request is invalid.");
  if (message.includes("S10_FORBIDDEN")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global Settings permission is required.");
  throw error;
}

function activePublicationSequence(active: RuntimeConfigVersion | null, events: Array<{ runtimeConfigId: string; publicationSequence: number; eventType: string }>) {
  if (!active) return 0;
  return events.find((event) => event.runtimeConfigId === active.id && (event.eventType === "published" || event.eventType === "rollback_published"))?.publicationSequence ?? 0;
}

function cleanupConsumerDegraded() {
  return { state: "degraded" as const, reasonCode: "cleanup_consumer_unavailable" as const, observedAt: new Date().toISOString() };
}

export function createDashboardS10SettingsRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/settings/s10-overview", async (context) => {
    const [rows, events] = await Promise.all([
      s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s10SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    const effective = (active?.effectiveValue ?? null) as PrivacyRetentionSettingsValueV1 | null;
    return context.json({ data: {
      descriptorKey: S10_DESCRIPTOR_KEY,
      schemaVersion: S10_SCHEMA_VERSION,
      projectionState: active ? "published" : "compiled_default",
      publishedGeneration,
      publication: active ? { version: publishedGeneration, cas: active.settingsRevision ?? null, publishedAt: (active.activatedAt ?? active.createdAt).toISOString(), changeReason: active.settingsChangeReason ?? "Settings publication." } : null,
      effective: effective ?? S10_COMPILED_VALUE,
      capabilities: { anonymousConsent: "current_fact", authenticatedConsent: "future_unavailable", privacySubjectPurge: "future_unavailable" },
      cleanupConsumer: cleanupConsumerDegraded()
    } });
  });

  routes.get("/dashboard/settings/s10-drafts", async (context) => {
    const rows = await s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: rows.filter(isOpen).map(draftDto) });
  });

  routes.post("/dashboard/settings/s10-drafts", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"]) || body.descriptorKey !== S10_DESCRIPTOR_KEY || !validVersion(body.expectedPublishedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s10:idempotency:v1", body.idempotencyKey);
    const requestHash = hash("vanstro:settings:s10:create-draft:v1", body);
    try {
      const [currentRows, currentEvents] = await Promise.all([
        s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
        s10SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
      ]);
      const active = currentRows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
      if (Number(body.expectedPublishedVersion) !== (active?.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const createdRows = await s10SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: active?.settingsRevision ?? 0, value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = createdRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s10-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const row = (await s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))).find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    return context.json({ data: draftDto(row) });
  });

  routes.patch("/dashboard/settings/s10-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "value", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft update is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s10:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s10:update-draft:v1", { draftId: id, ...body });
      const rows = await s10SettingsUpdateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = rows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.post("/dashboard/settings/s10-drafts/:id/validate", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings validation request is invalid.");
    try {
      const validatedRows = await s10SettingsValidateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash: hash("vanstro:settings:s10:idempotency:v1", body.idempotencyKey), requestHash: hash("vanstro:settings:s10:validate:v1", { draftId: id, ...body }), requestId: requestId(context) });
      const updated = validatedRows[0]; if (!updated) throw new Error("SETTINGS_STATE_CONFLICT");
      const value = updated.desiredValue as PrivacyRetentionSettingsValueV1;
      const knownRoles = new Set((await prisma.role.findMany({ select: { key: true } })).map((role) => role.key));
      const issues = businessIssues(value, knownRoles);
      const status = issues.some((issue) => issue.severity === "blocker") ? "invalid" : "validated";
      return context.json({ data: { draftId: updated.id, draftVersion: updated.settingsRevision ?? updated.version, validationRevision: updated.settingsRevision ?? updated.version, status, issues, validatedAt: (updated.settingsValidatedAt ?? updated.createdAt).toISOString() } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s10-drafts/:id/diff", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const rows = await s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const row = rows.find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    const active = rows.find((entry) => entry.settingsLifecycleStatus === "published") ?? null;
    const before = (active?.effectiveValue ?? null) as PrivacyRetentionSettingsValueV1 | null;
    const after = row.desiredValue as PrivacyRetentionSettingsValueV1;
    const changes: Array<{ field: string; before: unknown; after: unknown; sensitivity: "public" }> = [];
    const fields: Array<[string, unknown, unknown]> = [
      ["consentPolicy.anonymousConsentEnabled", before?.consentPolicy.anonymousConsentEnabled, after.consentPolicy.anonymousConsentEnabled],
      ["consentPolicy.retentionMonths", before?.consentPolicy.retentionMonths, after.consentPolicy.retentionMonths],
      ["retentionPolicy.retentionByObjectFamily", before?.retentionPolicy.retentionByObjectFamily, after.retentionPolicy.retentionByObjectFamily],
      ["legalHoldPolicy.legalHoldEnabled", before?.legalHoldPolicy.legalHoldEnabled, after.legalHoldPolicy.legalHoldEnabled],
      ["lowRiskExecution.allowlist", before?.lowRiskExecution.allowlist, after.lowRiskExecution.allowlist]
    ];
    for (const [field, b, a] of fields) if (JSON.stringify(b) !== JSON.stringify(a)) changes.push({ field, before: b ?? null, after: a ?? null, sensitivity: "public" });
    return context.json({ data: { draftId: row.id, draftVersion: row.settingsRevision ?? row.version, descriptorKey: S10_DESCRIPTOR_KEY, changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] } });
  });

  routes.post("/dashboard/settings/s10-drafts/:id/publish", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings publish request is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s10:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s10:publish:v1", { draftId: id, ...body });
      const publishedRows = await s10SettingsPublishDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = publishedRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await s10SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const publishedGeneration = activePublicationSequence(row, events);
      if (publishedGeneration === 0) throw new Error("SETTINGS_STATE_CONFLICT");
      // Publish only activates the policy version (zero data side effects).
      // The cleanup consumer is missing, so readiness is honestly degraded.
      return context.json({ data: { id: row.id, generation: publishedGeneration.toString(), version: publishedGeneration, sourceDraftId: row.id, sourceDraftVersion: Number(body.expectedVersion), status: "published", publishedAt: (row.activatedAt ?? row.createdAt).toISOString(), rollbackOfPublicationId: row.settingsRollbackOfPublicationId, readiness: { state: "degraded", reasonCode: "cleanup_consumer_unavailable", observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: publishedGeneration, consumerGeneration: null, projectionState: "published" } } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s10-history", async (context) => {
    const events = await s10SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const rows = await s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: events.map((event) => {
      const row = rows.find((entry) => entry.id === event.runtimeConfigId);
      return {
        publicationId: event.runtimeConfigId,
        generation: (row?.generation ?? 0n).toString(),
        version: event.publicationSequence,
        status: event.eventType === "rollback_published" || event.eventType === "published" ? "published" : event.eventType === "superseded" ? "superseded" : "activation_failed",
        descriptorKeys: [S10_DESCRIPTOR_KEY],
        changeReason: event.changeReason ?? "Settings publication.",
        publishedAt: new Date(event.occurredAt).toISOString(),
        rollbackOfPublicationId: event.rollbackSourcePublicationId,
        auditEventId: event.auditEventId
      };
    }) });
  });

  routes.post("/dashboard/settings/s10-history/:publicationId/rollback-draft", async (context) => {
    const publicationId = context.req.param("publicationId");
    if (!validUuid(publicationId)) return publicError(context, 400, "COMMERCE_INVALID", "The publication identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedPublishedVersion", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedPublishedVersion) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The rollback draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s10:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s10:rollback-draft:v1", { publicationId, ...body });
    try {
      const rows = await s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const source = rows.find(row => row.id === publicationId);
      const current = rows.find(row => row.settingsLifecycleStatus === "published") ?? null;
      if (!source || !current || source.id !== current.id || !["published", "superseded"].includes(source.settingsLifecycleStatus ?? "")) throw new Error("SETTINGS_STATE_CONFLICT");
      if (Number(body.expectedPublishedVersion) !== (current.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const rollbackRows = await s10SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: current.settingsRevision ?? 0, value: source.effectiveValue, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context), rollbackSource: source.id });
      const row = rollbackRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s10-readiness", async (context) => {
    const rawConsumerGeneration = context.req.query("consumerGeneration");
    if (rawConsumerGeneration !== undefined && !/^(0|[1-9][0-9]*)$/.test(rawConsumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const consumerGeneration = rawConsumerGeneration === undefined ? null : Number(rawConsumerGeneration);
    if (consumerGeneration !== null && !validVersion(consumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const [rows, events] = await Promise.all([
      s10SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s10SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    // The cleanup consumer (Audit/async-job expiry) does not exist yet
    // (implementation_decision_required): readiness is honestly degraded,
    // never fake-ready, regardless of generation match.
    return context.json({ data: { state: "degraded", reasonCode: "cleanup_consumer_unavailable", observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: active ? publishedGeneration : null, publicationCas: active?.settingsRevision ?? null, consumerGeneration, projectionState: active ? "published" : "compiled_default", cleanupConsumer: cleanupConsumerDegraded() } });
  });

  /**
   * Zero-write, family-level impact preview: validates candidate retention /
   * allowlist changes against the real hold/high-risk invariants inside a
   * read-only transaction and returns aggregate impact only (no PII, no
   * per-row targets, no counts). Never executes any data operation.
   */
  routes.post("/dashboard/settings/s10-impact-preview", async (context) => {
    const body = await readBody(context);
    if (!body || typeof body !== "object" || Array.isArray(body)) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request is invalid.");
    const keys = Object.keys(body as Record<string, unknown>);
    if (!keys.every((key) => key === "candidateRetentionEntries" || key === "candidateAllowlist") || keys.length === 0) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request must include at least one candidate change.");
    const rawEntries = (body as Record<string, unknown>).candidateRetentionEntries;
    const rawAllowlist = (body as Record<string, unknown>).candidateAllowlist;
    const hasEntries = rawEntries !== undefined && Array.isArray(rawEntries) && rawEntries.length > 0;
    const hasAllowlist = rawAllowlist !== undefined && Array.isArray(rawAllowlist) && rawAllowlist.length > 0;
    if (!hasEntries && !hasAllowlist) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request must include at least one candidate change.");
    if (rawEntries !== undefined && (!Array.isArray(rawEntries) || rawEntries.length > 7)) return publicError(context, 400, "COMMERCE_INVALID", "The candidate retention entries are invalid.");
    if (rawAllowlist !== undefined && (!Array.isArray(rawAllowlist) || rawAllowlist.length > 2)) return publicError(context, 400, "COMMERCE_INVALID", "The candidate allowlist is invalid.");
    const entries: Array<{ objectFamily: string; retentionDays: number; autoCleanupEnabled: boolean }> = [];
    if (rawEntries) {
      const seen = new Set<string>();
      for (const entry of rawEntries as Array<unknown>) {
        const e = entry as Record<string, unknown>;
        if (!e || typeof e !== "object" || Array.isArray(e) || !exactKeys(e, ["objectFamily", "retentionDays", "autoCleanupEnabled"])) return publicError(context, 400, "COMMERCE_INVALID", "The candidate retention entry is invalid.");
        if (!OBJECT_FAMILIES.includes(e.objectFamily as ObjectFamily) || seen.has(e.objectFamily as string)) return publicError(context, 400, "COMMERCE_INVALID", "The candidate retention entry is invalid.");
        if (typeof e.retentionDays !== "number" || !Number.isInteger(e.retentionDays) || e.retentionDays < 30 || e.retentionDays > 7300 || typeof e.autoCleanupEnabled !== "boolean") return publicError(context, 400, "COMMERCE_INVALID", "The candidate retention entry is invalid.");
        seen.add(e.objectFamily as string);
        entries.push({ objectFamily: e.objectFamily as string, retentionDays: e.retentionDays, autoCleanupEnabled: e.autoCleanupEnabled });
      }
    }
    const allowlist: string[] = [];
    if (rawAllowlist) {
      const seen = new Set<string>();
      for (const entry of rawAllowlist as Array<unknown>) {
        if (typeof entry !== "string" || !LOW_RISK_CANDIDATES.has(entry) || seen.has(entry)) return publicError(context, 400, "COMMERCE_INVALID", "The candidate allowlist is invalid.");
        seen.add(entry);
        allowlist.push(entry);
      }
    }
    try {
      const result = await prisma.$transaction(async (transaction) => {
        const published = await transaction.runtimeConfigVersion.findFirst({ where: { configKey: S10_DESCRIPTOR_KEY, settingsLifecycleStatus: "published" }, orderBy: { settingsRevision: "desc" } });
        const holdEnabled = published ? Boolean((published.effectiveValue as Record<string, unknown>)?.legalHoldPolicy && ((published.effectiveValue as Record<string, unknown>).legalHoldPolicy as Record<string, unknown>).legalHoldEnabled === true) : false;
        const blockedHighRisk: string[] = [];
        const affected: Array<{ objectFamily: string; classification: "low_risk" | "high_risk"; wouldEnableAutoCleanup: boolean }> = [];
        for (const entry of entries) {
          const classification = HIGH_RISK_FAMILIES.has(entry.objectFamily) ? "high_risk" as const : "low_risk" as const;
          if (entry.autoCleanupEnabled && HIGH_RISK_FAMILIES.has(entry.objectFamily)) blockedHighRisk.push(entry.objectFamily);
          affected.push({ objectFamily: entry.objectFamily, classification, wouldEnableAutoCleanup: entry.autoCleanupEnabled && !HIGH_RISK_FAMILIES.has(entry.objectFamily) });
        }
        const wouldEnableAutoCleanup = affected.some((entry) => entry.wouldEnableAutoCleanup) || allowlist.length > 0;
        const wouldConflictWithLegalHold = holdEnabled && wouldEnableAutoCleanup;
        return { wouldEnableAutoCleanup, wouldConflictWithLegalHold, blockedHighRiskFamilies: blockedHighRisk, affectedFamilies: affected };
      }, { isolationLevel: "RepeatableRead" });
      return context.json({ data: { ...result, contextRevision: context.get("p02Authorization").contextRevision } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("S10_FORBIDDEN")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global Settings permission is required.");
      throw error;
    }
  });

  return routes;
}
