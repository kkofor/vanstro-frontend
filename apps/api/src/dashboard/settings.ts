import { createHash } from "node:crypto";
import { prisma, settingsCreateDraft, settingsEvents, settingsPublishDraft, settingsRows, settingsUpdateDraft, settingsValidateDraft, type RuntimeConfigVersion } from "@vanstro/db";
import { Hono } from "hono";
const SETTINGS_CENTER_CONTRACT_VERSION = "settings-center.v1" as const;
const SETTINGS_REGISTRY_VERSION = "settings-registry.v1" as const;
const SETTINGS_CORE_DESCRIPTOR_KEY = "settings.core.overview_refresh_seconds" as const;
type SettingsRegistryEntry = { key:string; group:"core"|"general"|"commerce"|"payments"|"email"|"integrations"|"webhooks"|"developer"|"auth"|"privacy"|"media"|"system"; title:string; description:string; schemaVersion:string; availability:"available"|"coming_in_v1"|"not_implemented"; valueType:"integer"; secret:false; mutable:boolean; defaultValue:number };
type SettingsReadiness = { state:"ready"|"degraded"|"not_ready"; reasonCode:"ready"|"consumer_generation_missing"|"consumer_generation_mismatch"|"consumer_unavailable"|"activation_failed"|"dependency_unavailable"; observedAt:string; publishedGeneration:number; publicationVersion:number|null; consumerGeneration:number|null; effectiveOverviewRefreshSeconds:number; projectionState:"compiled_default"|"published"|"activation_failed" };
type SettingsDraft = { id:string; descriptorKey:typeof SETTINGS_CORE_DESCRIPTOR_KEY; status:"draft"|"validated"|"invalid"|"publishing"|"activation_failed"|"rollback_draft"; value:number; basePublicationVersion:number; version:number; changeReason:string; createdAt:string; updatedAt:string; validationRevision:number|null; rollbackOfPublicationId:string|null };
type SettingsPublicationEvent = { id:string; descriptorKey:typeof SETTINGS_CORE_DESCRIPTOR_KEY; runtimeConfigId:string; publicationSequence:number; eventType:"published"|"superseded"|"rollback_published"|"activation_failed"; sourceDraftId:string|null; sourceDraftVersion:number|null; rollbackSourcePublicationId:string|null; changeReason:string|null; auditEventId:string; occurredAt:string };
type SettingsOverview = { contractVersion:typeof SETTINGS_CENTER_CONTRACT_VERSION; environment:{label:string;kind:"local"|"development"|"staging"|"production"}; publication:{generation:string;version:number;publishedAt:string|null}; openDraftCount:number; latestLifecycle:{status:SettingsDraft["status"]|"published"|"rolled_back"|"none";occurredAt:string|null}; readiness:SettingsReadiness; registry:{availableCount:number;comingInV1Count:number;notImplementedCount:number} };
type SettingsValidationResult = { draftId:string;draftVersion:number;validationRevision:number;status:"validated"|"invalid";issues:Array<{code:string;severity:"blocker"|"warning"|"info";field:"value"|"changeReason"|"publication";message:string}>;validatedAt:string };
type SettingsSafeDiff = {draftId:string;draftVersion:number;descriptorKey:typeof SETTINGS_CORE_DESCRIPTOR_KEY;changes:Array<{field:"value";before:number;after:number;sensitivity:"public"}>;secretChangeCount:0;restartRequired:false;affectedServices:["dashboard"]};
type SettingsPublication = {id:string;generation:string;version:number;sourceDraftId:string;sourceDraftVersion:number;status:"published"|"activation_failed"|"rolled_back"|"superseded";publishedAt:string;rollbackOfPublicationId:string|null;readiness:SettingsReadiness};
type SettingsHistoryEntry = {publicationId:string;generation:string;version:number;status:"published"|"activation_failed"|"rolled_back"|"superseded";descriptorKeys:[typeof SETTINGS_CORE_DESCRIPTOR_KEY];changeReason:string;publishedAt:string;rollbackOfPublicationId:string|null;auditEventId:string};
import { publicError } from "../public-errors.js";
import type { DashboardEnv } from "./access.js";
import { hasGlobalPermission } from "./authorization.js";
import { readBody } from "./request.js";

export const SETTINGS_SCHEMA_VERSION = "settings.core.overview-refresh-seconds.v1" as const;
const DEFAULT_VALUE = 60;
const MIN_VALUE = 15;
const MAX_VALUE = 300;
export const SETTINGS_CORE_DESCRIPTOR: SettingsRegistryEntry = {
  key: SETTINGS_CORE_DESCRIPTOR_KEY,
  group: "core",
  title: "Overview refresh interval",
  description: "Controls how often the Settings overview refreshes safe status.",
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  availability: "available",
  valueType: "integer",
  secret: false,
  mutable: true,
  defaultValue: DEFAULT_VALUE
};

const COMING_IN_V1_GROUPS = ["general", "commerce", "payments", "email", "integrations", "webhooks", "developer", "auth", "privacy", "media", "system"] as const;

type SettingsBody = Record<string, unknown>;
function hash(domain: string, value: unknown) {
  return createHash("sha256").update(domain, "ascii").update("\0").update(JSON.stringify(value)).digest("hex");
}
function exactKeys(body: SettingsBody, keys: readonly string[]) {
  return Object.keys(body).length === keys.length && Object.keys(body).every((key) => keys.includes(key));
}
function validIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(value);
}
function validReason(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 8 && value.trim().length <= 500;
}
function validValue(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && Number(value) >= MIN_VALUE && Number(value) <= MAX_VALUE;
}
/** Structurally correct value accepted into a draft; business validity is decided by server validation. */
function structuralValue(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}
/** PostgreSQL integer range for public version/sequence inputs. */
function validVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && Number.isInteger(value) && value >= 0 && value <= 2147483647;
}
/** Canonical UUID accepted by the API boundary; malformed ids never reach the repository. */
function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function requestId(context: { res: { headers: Headers } }) {
  return context.res.headers.get("X-Request-Id") ?? "settings-request";
}
function asNumber(value: unknown, fallback = DEFAULT_VALUE) {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}
function isOpen(row: RuntimeConfigVersion) { return ["draft","validated","invalid","activation_failed"].includes(row.settingsLifecycleStatus ?? ""); }
function draftStatus(row: RuntimeConfigVersion): SettingsDraft["status"] {
  if (row.settingsLifecycleStatus === "activation_failed") return "activation_failed";
  if (row.desiredSource === "rollback_draft" && row.settingsLifecycleStatus === "draft") return "rollback_draft";
  if (row.settingsLifecycleStatus === "invalid") return "invalid";
  if (row.settingsLifecycleStatus === "validated") return "validated";
  return "draft";
}
function draftDto(row: RuntimeConfigVersion): SettingsDraft {
  return {
    id: row.id,
    descriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY,
    status: draftStatus(row),
    value: asNumber(row.desiredValue),
    basePublicationVersion: Number(row.generation),
    version: row.settingsRevision ?? row.version,
    changeReason: row.settingsChangeReason ?? "Settings change requested.",
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.settingsUpdatedAt ?? row.createdAt).toISOString(),
    validationRevision: row.settingsLifecycleStatus === "draft" ? null : row.settingsRevision,
    rollbackOfPublicationId: row.settingsRollbackOfPublicationId
  };
}
function activePublicationSequence(active: RuntimeConfigVersion | null, events: Array<{ runtimeConfigId:string; publicationSequence:number; eventType:string }>) {
  if (!active) return 0;
  return events.find((event) => event.runtimeConfigId === active.id && (event.eventType === "published" || event.eventType === "rollback_published"))?.publicationSequence ?? 0;
}
function readiness(active: RuntimeConfigVersion | null, publishedGeneration: number, consumerGeneration: number | null, observedAt = new Date()): SettingsReadiness {
  const projectionState = active?.activationStatus === "activation_failed" ? "activation_failed" : active ? "published" : "compiled_default";
  const exact = consumerGeneration === publishedGeneration && projectionState !== "activation_failed";
  return {
    state: exact ? "ready" : "degraded",
    reasonCode: consumerGeneration === null ? "consumer_generation_missing" : exact ? "ready" : projectionState === "activation_failed" ? "activation_failed" : "consumer_generation_mismatch",
    observedAt: observedAt.toISOString(),
    publishedGeneration,
    publicationVersion: active ? publishedGeneration : null,
    consumerGeneration,
    effectiveOverviewRefreshSeconds: active ? asNumber(active.effectiveValue) : DEFAULT_VALUE,
    projectionState
  };
}
function publicationDto(row: RuntimeConfigVersion, sourceDraftVersion: number, publishedGeneration: number, observedAt = new Date()): SettingsPublication {
  return {
    id: row.id,
    generation: publishedGeneration.toString(),
    version: publishedGeneration,
    sourceDraftId: row.id,
    sourceDraftVersion,
    status: row.settingsLifecycleStatus === "superseded" ? "superseded" : row.activationStatus === "activation_failed" ? "activation_failed" : "published",
    publishedAt: (row.activatedAt ?? row.createdAt).toISOString(),
    rollbackOfPublicationId: row.settingsRollbackOfPublicationId,
    readiness: readiness(row, publishedGeneration, null, observedAt)
  };
}
async function allSettingsRows(context: any, permission: "settings.read" | "settings.write" = "settings.read", database: any = prisma) {
  return settingsRows(database, context.get("actorSessionTokenHash"), context.get("actorUserId"));
}
function latestActiveFrom(rows: RuntimeConfigVersion[]) { return rows.find(row => row.settingsLifecycleStatus === "published") ?? null; }
function latestVersionFrom(rows: RuntimeConfigVersion[]) { return rows[0] ?? null; }

function mapConflict(context: any, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("S01_NOT_FOUND")) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings resource is unavailable.");
  if (message.includes("S01_VERSION_CONFLICT") || message === "VERSION_CONFLICT") return publicError(context, 409, "VERSION_CONFLICT", "The Settings state changed.");
  if (message.includes("S01_IDEMPOTENCY_CONFLICT") || message === "IDEMPOTENCY_CONFLICT") return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
  if (message.includes("S01_STATE_CONFLICT") || message === "SETTINGS_STATE_CONFLICT") return publicError(context, 409, "SETTINGS_STATE_CONFLICT", "The Settings lifecycle state does not allow this operation.");
  if (message.includes("S01_VALIDATION")) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings request is invalid.");
  if (message.includes("S01_FORBIDDEN")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global Settings permission is required.");
  throw error;
}

export function serviceAccountsCapability(authorization: DashboardEnv["Variables"]["p02Authorization"]) {
  const read = hasGlobalPermission(authorization, "settings.read");
  const manage = hasGlobalPermission(authorization, "service_accounts.manage");
  return { enabled: read, manage };
}
export function settingsCenterCapability(authorization: DashboardEnv["Variables"]["p02Authorization"]) {
  const read = hasGlobalPermission(authorization, "settings.read");
  const write = read && hasGlobalPermission(authorization, "settings.write");
  return {
    enabled: read,
    contractVersion: SETTINGS_CENTER_CONTRACT_VERSION,
    registryVersion: SETTINGS_REGISTRY_VERSION,
    coreDescriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY,
    actions: { read, createDraft: write, updateDraft: write, validate: write, publish: write, rollback: write },
    history: { read }, readiness: { read }, audit: { integrated: true as const },
    secrets: false as const, externalSideEffects: false as const, partialPublish: false as const
  };
}

export function createDashboardSettingsRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/settings/registry", (context) => context.json({ data: [
    SETTINGS_CORE_DESCRIPTOR,
    ...COMING_IN_V1_GROUPS.map((group) => ({ ...SETTINGS_CORE_DESCRIPTOR, key: `settings.${group}.coming_in_v1`, group, title: `${group} settings`, description: "Reserved for a later v1 bounded package.", schemaVersion: "settings.unavailable.v1", availability: "coming_in_v1" as const, mutable: false }))
  ] }));

  routes.get("/dashboard/settings/overview", async (context) => {
    const [rows, events] = await Promise.all([
      allSettingsRows(context),
      settingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = latestActiveFrom(rows), latest = latestVersionFrom(rows), openDraftCount = rows.filter(isOpen).length;
    const publishedGeneration = activePublicationSequence(active, events);
    const observedAt = new Date();
    const data: SettingsOverview = {
      contractVersion: SETTINGS_CENTER_CONTRACT_VERSION,
      environment: { label: process.env.VANSTRO_RUNTIME_MODE ?? "Local development", kind: process.env.VANSTRO_RUNTIME_MODE === "production" ? "production" : process.env.VANSTRO_RUNTIME_MODE === "staging" ? "staging" : process.env.VANSTRO_RUNTIME_MODE === "development" ? "development" : "local" },
      publication: { generation: publishedGeneration.toString(), version: publishedGeneration, publishedAt: active ? (active.activatedAt ?? active.createdAt).toISOString() : null },
      openDraftCount,
      latestLifecycle: { status: latest ? (isOpen(latest) ? draftStatus(latest) : latest.activationStatus === "rolled_back" ? "rolled_back" : "published") : "none", occurredAt: latest ? (latest.activatedAt ?? latest.createdAt).toISOString() : null },
      readiness: readiness(active, publishedGeneration, null, observedAt),
      registry: { availableCount: 1, comingInV1Count: COMING_IN_V1_GROUPS.length, notImplementedCount: 0 }
    };
    return context.json({ data });
  });

  routes.get("/dashboard/settings/drafts", async (context) => {
    const rows = await allSettingsRows(context);
    return context.json({ data: rows.filter(isOpen).map(draftDto) });
  });

  routes.post("/dashboard/settings/drafts", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"]) || body.descriptorKey !== SETTINGS_CORE_DESCRIPTOR_KEY || !validVersion(body.expectedPublishedVersion) || !structuralValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:idempotency:v1", body.idempotencyKey);
    const requestHash = hash("vanstro:settings:create-draft:v1", body);
    try {
      const [currentRows, currentEvents] = await Promise.all([
        allSettingsRows(context),
        settingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
      ]);
      const active = latestActiveFrom(currentRows);
      if (Number(body.expectedPublishedVersion) !== activePublicationSequence(active, currentEvents)) throw new Error("VERSION_CONFLICT");
      const createdRows = await settingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: active?.settingsRevision ?? 0, value: Number(body.value), changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = createdRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings draft identifier is invalid.");
    const row = (await allSettingsRows(context)).find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings draft is unavailable.");
    return context.json({ data: draftDto(row) });
  });

  routes.patch("/dashboard/settings/drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "value", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !structuralValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings draft update is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:update-draft:v1", { draftId: id, ...body });
      const rows = await settingsUpdateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), value: Number(body.value), changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = rows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.post("/dashboard/settings/drafts/:id/validate", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings validation request is invalid.");
    try {
      const validatedRows = await settingsValidateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash: hash("vanstro:settings:idempotency:v1", body.idempotencyKey), requestHash: hash("vanstro:settings:validate:v1", { draftId: id, ...body }), requestId: requestId(context) });
      const updated = validatedRows[0]; if (!updated) throw new Error("SETTINGS_STATE_CONFLICT");
      const value = asNumber(updated.desiredValue);
      const valid = value >= MIN_VALUE && value <= MAX_VALUE;
      const issues = valid ? [{ code: "SETTINGS_CHANGE_REVIEWED", severity: "info" as const, field: "value" as const, message: "The refresh interval is within the supported range." }] : [{ code: "SETTINGS_VALUE_OUT_OF_RANGE", severity: "blocker" as const, field: "value" as const, message: `The refresh interval must be between ${MIN_VALUE} and ${MAX_VALUE} seconds.` }];
      const result: SettingsValidationResult = { draftId: updated.id, draftVersion: updated.settingsRevision ?? updated.version, validationRevision: updated.settingsRevision ?? updated.version, status: valid ? "validated" : "invalid", issues, validatedAt: (updated.settingsValidatedAt ?? updated.createdAt).toISOString() };
      return context.json({ data: result });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/drafts/:id/diff", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings draft identifier is invalid.");
    const row = (await allSettingsRows(context)).find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings draft is unavailable.");
    const active = latestActiveFrom(await allSettingsRows(context));
    const data: SettingsSafeDiff = { draftId: row.id, draftVersion: row.settingsRevision ?? row.version, descriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY, changes: [{ field: "value", before: asNumber(row.effectiveValue), after: asNumber(row.desiredValue), sensitivity: "public" }], secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] };
    return context.json({ data });
  });

  routes.post("/dashboard/settings/drafts/:id/publish", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings publish request is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:publish:v1", { draftId: id, ...body });
      const publishedRows = await settingsPublishDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = publishedRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      // sourceDraftVersion is the published draft's own CAS (the revision it
      // held immediately before publish), regardless of rollback provenance.
      const sourceVersion = Number(body.expectedVersion);
      const events = await settingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const publishedGeneration = activePublicationSequence(row, events);
      if (publishedGeneration === 0) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: publicationDto(row, sourceVersion, publishedGeneration) });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/history", async (context) => {
    const events = await settingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const rows = await allSettingsRows(context);
    const data: SettingsHistoryEntry[] = events.map((event) => {
      const row = rows.find((entry) => entry.id === event.runtimeConfigId);
      const status: SettingsHistoryEntry["status"] = event.eventType === "rollback_published" || event.eventType === "published" ? "published" : event.eventType === "superseded" ? "superseded" : "activation_failed";
      return {
        publicationId: event.runtimeConfigId,
        generation: (row?.generation ?? 0n).toString(),
        version: event.publicationSequence,
        status,
        descriptorKeys: [SETTINGS_CORE_DESCRIPTOR_KEY],
        changeReason: event.changeReason ?? "Settings publication.",
        publishedAt: new Date(event.occurredAt).toISOString(),
        rollbackOfPublicationId: event.rollbackSourcePublicationId,
        auditEventId: event.auditEventId
      };
    });
    return context.json({ data });
  });

  routes.post("/dashboard/settings/history/:publicationId/rollback-draft", async (context) => {
    const publicationId = context.req.param("publicationId");
    if (!validUuid(publicationId)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The publication identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedPublishedVersion", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedPublishedVersion) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The rollback draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:rollback-draft:v1", { publicationId, ...body });
    try {
      const rows = await allSettingsRows(context);
      const source = rows.find(row => row.id === publicationId);
      // Current-state projection: rollback eligibility is judged from the
      // explicit current publication pointer, not from any history entry.
      const current = latestActiveFrom(rows);
      if (!source || !current || source.id !== current.id || !["published", "superseded"].includes(source.settingsLifecycleStatus ?? "")) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await settingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      if (Number(body.expectedPublishedVersion) !== activePublicationSequence(current, events)) throw new Error("VERSION_CONFLICT");
      const rollbackRows = await settingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: current.settingsRevision ?? 0, value: asNumber(source.effectiveValue), changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context), rollbackSource: source.id });
      const row = rollbackRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/readiness", async (context) => {
    const rawConsumerGeneration = context.req.query("consumerGeneration");
    if (rawConsumerGeneration !== undefined && !/^(0|[1-9][0-9]*)$/.test(rawConsumerGeneration)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings consumer generation is invalid.");
    const consumerGeneration = rawConsumerGeneration === undefined ? null : Number(rawConsumerGeneration);
    if (consumerGeneration !== null && !validVersion(consumerGeneration)) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings consumer generation is invalid.");
    const [rows, events] = await Promise.all([
      allSettingsRows(context),
      settingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = latestActiveFrom(rows);
    const publishedGeneration = activePublicationSequence(active, events);
    if (active && publishedGeneration === 0) return context.json({ data: { ...readiness(active, 0, consumerGeneration), state: "degraded", reasonCode: "dependency_unavailable" as const } });
    return context.json({ data: readiness(active, publishedGeneration, consumerGeneration) });
  });
  return routes;
}
