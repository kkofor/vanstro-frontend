import { createHash } from "node:crypto";
import { prisma, s02SettingsCreateDraft, s02SettingsEvents, s02SettingsPublicProjection, s02SettingsPublishDraft, s02SettingsRows, s02SettingsUpdateDraft, s02SettingsValidateDraft, type RuntimeConfigVersion } from "@vanstro/db";
import { Hono } from "hono";
import { publicError } from "../public-errors.js";
import type { DashboardEnv } from "./access.js";
import { hasGlobalPermission } from "./authorization.js";
import { readBody } from "./request.js";

export const S02_DESCRIPTOR_KEY = "settings.general-storefront" as const;
export const S02_SCHEMA_VERSION = "settings.general-storefront.v1" as const;
export const S01_CORE_DESCRIPTOR_KEY = "settings.core.overview_refresh_seconds" as const;
const ALLOWED_DESCRIPTORS = [S02_DESCRIPTOR_KEY, S01_CORE_DESCRIPTOR_KEY] as const;

const CANADA_TIMEZONES = new Set([
  "America/St_Johns", "America/Halifax", "America/Moncton", "America/Glace_Bay", "America/Goose_Bay",
  "America/Blanc-Sablon", "America/Toronto", "America/Iqaluit", "America/Winnipeg", "America/Rankin_Inlet",
  "America/Regina", "America/Swift_Current", "America/Edmonton", "America/Cambridge_Bay", "America/Inuvik",
  "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston", "America/Vancouver", "America/Whitehorse",
  "America/Dawson"
]);

const SUPPORTED_LOCALES = new Set(["en-CA", "fr-CA"]);

export type GeneralStorefrontSettingsValueV1 = {
  generalIdentity: {
    siteDisplayName: string;
    legalName: string;
    canonicalUrl: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: { line1: string; line2?: string; city: string; province: string; postalCode: string; country: string };
    defaultTimezone: string;
  };
  brand: {
    brandName: string;
    brandDescription: string;
    logoMediaRef: string | null;
    faviconMediaRef: string | null;
  };
  storefront: {
    homeContentRef: string | null;
    navigationRef: string | null;
    footerRef: string | null;
    defaultProductSort: "newest" | "price_asc" | "price_desc" | "featured";
    outOfStockDisplay: "hide" | "show" | "hide_with_contact";
    dealerSelectionEnabled: boolean;
    cartCheckoutEnabled: boolean;
    announcementRule: { enabled: boolean; message: string; locale?: "en-CA" | "fr-CA" };
    maintenanceBannerRule: { enabled: boolean; message: string };
    storefrontConfigRef: string | null;
    enFrRoutesEnabled: boolean;
  };
  localization: {
    defaultLocale: "en-CA" | "fr-CA";
    supportedLocales: ("en-CA" | "fr-CA")[];
    dashboardLocale: "zh-CN";
    currency: "CAD";
    timezone: string;
    dateFormat: "yyyy-mm-dd" | "dd-mm-yyyy" | "mm-dd-yyyy";
    phoneFormat: "national" | "international";
    addressFormat: "canada_default";
    weightUnits: "kg" | "lb";
    dimensionUnits: "cm" | "in";
    translationFallback: "en_ca";
    provinceServiceMapping: Array<{ province: string; dealerRef?: string; locationRef?: string }>;
  };
  defaultDealerLocation: {
    defaultDealerRef: string | null;
    defaultLocationRef: string | null;
  };
};

type S02Draft = {
  id: string;
  descriptorKey: typeof S02_DESCRIPTOR_KEY;
  status: "draft" | "validated" | "invalid" | "publishing" | "activation_failed" | "rollback_draft";
  value: GeneralStorefrontSettingsValueV1;
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
function draftStatus(row: RuntimeConfigVersion): S02Draft["status"] {
  if (row.settingsLifecycleStatus === "activation_failed") return "activation_failed";
  if (row.desiredSource === "rollback_draft" && row.settingsLifecycleStatus === "draft") return "rollback_draft";
  if (row.settingsLifecycleStatus === "invalid") return "invalid";
  if (row.settingsLifecycleStatus === "validated") return "validated";
  return "draft";
}
function draftDto(row: RuntimeConfigVersion): S02Draft {
  return {
    id: row.id,
    descriptorKey: S02_DESCRIPTOR_KEY,
    status: draftStatus(row),
    value: row.desiredValue as GeneralStorefrontSettingsValueV1,
    basePublicationVersion: Number(row.generation),
    version: row.settingsRevision ?? row.version,
    changeReason: row.settingsChangeReason ?? "Settings change requested.",
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.settingsUpdatedAt ?? row.createdAt).toISOString(),
    validationRevision: row.settingsLifecycleStatus === "draft" ? null : row.settingsRevision,
    rollbackOfPublicationId: row.settingsRollbackOfPublicationId
  };
}

/** Stable 400 for structurally invalid S02 value payloads. */
function isStructurallyValidValue(value: unknown): value is GeneralStorefrontSettingsValueV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const gi = v.generalIdentity, br = v.brand, sf = v.storefront, lz = v.localization, dd = v.defaultDealerLocation;
  if (!gi || typeof gi !== "object" || !br || typeof br !== "object" || !sf || typeof sf !== "object" || !lz || typeof lz !== "object" || !dd || typeof dd !== "object") return false;
  const g = gi as Record<string, unknown>, b = br as Record<string, unknown>, s = sf as Record<string, unknown>, l = lz as Record<string, unknown>, d = dd as Record<string, unknown>;
  if (typeof g.siteDisplayName !== "string" || g.siteDisplayName.trim().length < 1 || g.siteDisplayName.trim().length > 120) return false;
  if (typeof g.legalName !== "string" || g.legalName.trim().length < 1 || g.legalName.trim().length > 200) return false;
  if (typeof g.canonicalUrl !== "string" || g.canonicalUrl.length > 2048 || !/^https?:\/\//.test(g.canonicalUrl)) return false;
  if (typeof g.contactEmail !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.contactEmail)) return false;
  if (typeof g.contactPhone !== "string" || !/^[+0-9()\s-]{7,25}$/.test(g.contactPhone)) return false;
  const addr = g.contactAddress;
  if (!addr || typeof addr !== "object" || Array.isArray(addr)) return false;
  const a = addr as Record<string, unknown>;
  if (typeof a.line1 !== "string" || typeof a.city !== "string" || typeof a.province !== "string" || typeof a.postalCode !== "string" || typeof a.country !== "string") return false;
  if (typeof a.postalCode !== "string" || a.postalCode.length > 10) return false;
  if (typeof g.defaultTimezone !== "string" || !CANADA_TIMEZONES.has(g.defaultTimezone)) return false;
  if (typeof b.brandName !== "string" || b.brandName.trim().length < 1 || b.brandName.trim().length > 120) return false;
  if (typeof b.brandDescription !== "string" || b.brandDescription.length > 500) return false;
  if (b.logoMediaRef !== null && b.logoMediaRef !== undefined && !validUuid(b.logoMediaRef)) return false;
  if (b.faviconMediaRef !== null && b.faviconMediaRef !== undefined && !validUuid(b.faviconMediaRef)) return false;
  if (!["newest", "price_asc", "price_desc", "featured"].includes(s.defaultProductSort as string)) return false;
  if (!["hide", "show", "hide_with_contact"].includes(s.outOfStockDisplay as string)) return false;
  if (typeof s.dealerSelectionEnabled !== "boolean" || typeof s.cartCheckoutEnabled !== "boolean" || typeof s.enFrRoutesEnabled !== "boolean") return false;
  if (s.homeContentRef !== null && s.homeContentRef !== undefined && !validUuid(s.homeContentRef)) return false;
  if (s.navigationRef !== null && s.navigationRef !== undefined && !validUuid(s.navigationRef)) return false;
  if (s.footerRef !== null && s.footerRef !== undefined && !validUuid(s.footerRef)) return false;
  if (s.storefrontConfigRef !== null && s.storefrontConfigRef !== undefined && !validUuid(s.storefrontConfigRef)) return false;
  const ann = s.announcementRule as Record<string, unknown> | undefined;
  if (!ann || typeof ann !== "object" || Array.isArray(ann)) return false;
  if (typeof ann.enabled !== "boolean" || typeof ann.message !== "string" || ann.message.length > 300) return false;
  if (ann.locale !== undefined && ann.locale !== null && !SUPPORTED_LOCALES.has(ann.locale as string)) return false;
  if (!["en-CA", "fr-CA"].includes(l.defaultLocale as string)) return false;
  if (!Array.isArray(l.supportedLocales) || l.supportedLocales.length < 1 || l.supportedLocales.length > 2) return false;
  if (!l.supportedLocales.every((entry) => SUPPORTED_LOCALES.has(entry as string)) || l.supportedLocales.includes("zh-CN" as never)) return false;
  if (l.dashboardLocale !== "zh-CN" || l.currency !== "CAD") return false;
  if (typeof l.timezone !== "string" || !CANADA_TIMEZONES.has(l.timezone)) return false;
  if (!["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"].includes(l.dateFormat as string)) return false;
  if (!["national", "international"].includes(l.phoneFormat as string)) return false;
  if (l.addressFormat !== "canada_default" || !["kg", "lb"].includes(l.weightUnits as string) || !["cm", "in"].includes(l.dimensionUnits as string) || l.translationFallback !== "en_ca") return false;
  if (!Array.isArray(l.provinceServiceMapping) || l.provinceServiceMapping.length > 13) return false;
  if (d.defaultDealerRef !== null && d.defaultDealerRef !== undefined && !validUuid(d.defaultDealerRef)) return false;
  if (d.defaultLocationRef !== null && d.defaultLocationRef !== undefined && !validUuid(d.defaultLocationRef)) return false;
  // Dealer/location pairing is a business rule (blocker on validate), not a
  // structural rule; a dealer ref without a location ref saves as a draft.
  return true;
}

/** Business-validity checks that run server-side on validate (not on structural save). */
function businessIssues(value: GeneralStorefrontSettingsValueV1): Array<{ code: string; severity: "blocker" | "warning" | "info"; field: string; message: string }> {
  const issues: Array<{ code: string; severity: "blocker" | "warning" | "info"; field: string; message: string }> = [];
  const lz = value.localization;
  if (!lz.supportedLocales.includes(lz.defaultLocale)) issues.push({ code: "S02_LOCALE_RELATION", severity: "blocker", field: "localization.supportedLocales", message: "defaultLocale must be in supportedLocales." });
  const dd = value.defaultDealerLocation;
  if (dd.defaultDealerRef && !dd.defaultLocationRef) issues.push({ code: "S02_DEALER_PAIRING", severity: "blocker", field: "defaultDealerLocation.defaultLocationRef", message: "defaultLocationRef is required when defaultDealerRef is set." });
  if (!dd.defaultDealerRef && dd.defaultLocationRef) issues.push({ code: "S02_DEALER_PAIRING", severity: "blocker", field: "defaultDealerLocation.defaultDealerRef", message: "defaultDealerRef is required when defaultLocationRef is set." });
  return issues;
}

function mapConflict(context: any, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("S02_NOT_FOUND")) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings resource is unavailable.");
  if (message.includes("S02_VERSION_CONFLICT") || message === "VERSION_CONFLICT") return publicError(context, 409, "VERSION_CONFLICT", "The Settings state changed.");
  if (message.includes("S02_IDEMPOTENCY_CONFLICT") || message === "IDEMPOTENCY_CONFLICT") return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
  if (message.includes("S02_STATE_CONFLICT") || message === "SETTINGS_STATE_CONFLICT") return publicError(context, 409, "SETTINGS_STATE_CONFLICT", "The Settings lifecycle state does not allow this operation.");
  if (message.includes("S02_VALIDATION")) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings request is invalid.");
  if (message.includes("S02_FORBIDDEN")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global Settings permission is required.");
  throw error;
}

function activePublicationSequence(active: RuntimeConfigVersion | null, events: Array<{ runtimeConfigId: string; publicationSequence: number; eventType: string }>) {
  if (!active) return 0;
  return events.find((event) => event.runtimeConfigId === active.id && (event.eventType === "published" || event.eventType === "rollback_published"))?.publicationSequence ?? 0;
}

export function createDashboardS02SettingsRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/settings/s02-drafts", async (context) => {
    const rows = await s02SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: rows.filter(isOpen).map(draftDto) });
  });

  routes.post("/dashboard/settings/s02-drafts", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"]) || body.descriptorKey !== S02_DESCRIPTOR_KEY || !validVersion(body.expectedPublishedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s02:idempotency:v1", body.idempotencyKey);
    const requestHash = hash("vanstro:settings:s02:create-draft:v1", body);
    try {
      const [currentRows, currentEvents] = await Promise.all([
        s02SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
        s02SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
      ]);
      const active = currentRows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
      // DB create compares expected against the active publication's
      // settingsRevision (the descriptor-scoped CAS), not the publication
      // sequence. Validate against the same object.
      if (Number(body.expectedPublishedVersion) !== (active?.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const createdRows = await s02SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: active?.settingsRevision ?? 0, value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = createdRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s02-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const row = (await s02SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))).find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    return context.json({ data: draftDto(row) });
  });

  routes.patch("/dashboard/settings/s02-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "value", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft update is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s02:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s02:update-draft:v1", { draftId: id, ...body });
      const rows = await s02SettingsUpdateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = rows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.post("/dashboard/settings/s02-drafts/:id/validate", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings validation request is invalid.");
    try {
      const validatedRows = await s02SettingsValidateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash: hash("vanstro:settings:s02:idempotency:v1", body.idempotencyKey), requestHash: hash("vanstro:settings:s02:validate:v1", { draftId: id, ...body }), requestId: requestId(context) });
      const updated = validatedRows[0]; if (!updated) throw new Error("SETTINGS_STATE_CONFLICT");
      const value = updated.desiredValue as GeneralStorefrontSettingsValueV1;
      const issues = businessIssues(value);
      const status = issues.some((issue) => issue.severity === "blocker") ? "invalid" : "validated";
      return context.json({ data: { draftId: updated.id, draftVersion: updated.settingsRevision ?? updated.version, validationRevision: updated.settingsRevision ?? updated.version, status, issues, validatedAt: (updated.settingsValidatedAt ?? updated.createdAt).toISOString() } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s02-drafts/:id/diff", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const rows = await s02SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const row = rows.find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    const active = rows.find((entry) => entry.settingsLifecycleStatus === "published") ?? null;
    const before = active?.effectiveValue as GeneralStorefrontSettingsValueV1 | null;
    const after = row.desiredValue as GeneralStorefrontSettingsValueV1;
    const changes: Array<{ field: string; before: unknown; after: unknown; sensitivity: "public" }> = [];
    if (before) {
      const fields: Array<[string, unknown, unknown]> = [
        ["generalIdentity.siteDisplayName", before.generalIdentity.siteDisplayName, after.generalIdentity.siteDisplayName],
        ["brand.brandName", before.brand.brandName, after.brand.brandName],
        ["storefront.announcementRule", before.storefront.announcementRule, after.storefront.announcementRule],
        ["localization.defaultLocale", before.localization.defaultLocale, after.localization.defaultLocale]
      ];
      for (const [field, b, a] of fields) if (JSON.stringify(b) !== JSON.stringify(a)) changes.push({ field, before: b, after: a, sensitivity: "public" });
    } else {
      changes.push({ field: "generalIdentity.siteDisplayName", before: null, after: after.generalIdentity.siteDisplayName, sensitivity: "public" });
    }
    return context.json({ data: { draftId: row.id, draftVersion: row.settingsRevision ?? row.version, descriptorKey: S02_DESCRIPTOR_KEY, changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["storefront", "dashboard"] } });
  });

  routes.post("/dashboard/settings/s02-drafts/:id/publish", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings publish request is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s02:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s02:publish:v1", { draftId: id, ...body });
      const publishedRows = await s02SettingsPublishDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = publishedRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await s02SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const publishedGeneration = activePublicationSequence(row, events);
      if (publishedGeneration === 0) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: { id: row.id, generation: publishedGeneration.toString(), version: publishedGeneration, sourceDraftId: row.id, sourceDraftVersion: Number(body.expectedVersion), status: "published", publishedAt: (row.activatedAt ?? row.createdAt).toISOString(), rollbackOfPublicationId: row.settingsRollbackOfPublicationId, readiness: { state: "degraded", reasonCode: "consumer_generation_missing", observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: publishedGeneration, consumerGeneration: null, projectionState: "published" } } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s02-history", async (context) => {
    const events = await s02SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const rows = await s02SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: events.map((event) => {
      const row = rows.find((entry) => entry.id === event.runtimeConfigId);
      return {
        publicationId: event.runtimeConfigId,
        generation: (row?.generation ?? 0n).toString(),
        version: event.publicationSequence,
        status: event.eventType === "rollback_published" || event.eventType === "published" ? "published" : event.eventType === "superseded" ? "superseded" : "activation_failed",
        descriptorKeys: [S02_DESCRIPTOR_KEY],
        changeReason: event.changeReason ?? "Settings publication.",
        publishedAt: new Date(event.occurredAt).toISOString(),
        rollbackOfPublicationId: event.rollbackSourcePublicationId,
        auditEventId: event.auditEventId
      };
    }) });
  });

  routes.post("/dashboard/settings/s02-history/:publicationId/rollback-draft", async (context) => {
    const publicationId = context.req.param("publicationId");
    if (!validUuid(publicationId)) return publicError(context, 400, "COMMERCE_INVALID", "The publication identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedPublishedVersion", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedPublishedVersion) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The rollback draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s02:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s02:rollback-draft:v1", { publicationId, ...body });
    try {
      const rows = await s02SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const source = rows.find(row => row.id === publicationId);
      const current = rows.find(row => row.settingsLifecycleStatus === "published") ?? null;
      if (!source || !current || source.id !== current.id || !["published", "superseded"].includes(source.settingsLifecycleStatus ?? "")) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await s02SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      if (Number(body.expectedPublishedVersion) !== (current.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const rollbackRows = await s02SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: current.settingsRevision ?? 0, value: source.effectiveValue, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context), rollbackSource: source.id });
      const row = rollbackRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s02-readiness", async (context) => {
    const rawConsumerGeneration = context.req.query("consumerGeneration");
    if (rawConsumerGeneration !== undefined && !/^(0|[1-9][0-9]*)$/.test(rawConsumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const consumerGeneration = rawConsumerGeneration === undefined ? null : Number(rawConsumerGeneration);
    if (consumerGeneration !== null && !validVersion(consumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const [rows, events] = await Promise.all([
      s02SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s02SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    const exact = consumerGeneration === publishedGeneration && publishedGeneration > 0;
    return context.json({ data: { state: exact ? "ready" : "degraded", reasonCode: consumerGeneration === null ? "consumer_generation_missing" : exact ? "ready" : "consumer_generation_mismatch", observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: active ? publishedGeneration : null, publicationCas: active?.settingsRevision ?? null, consumerGeneration, projectionState: active ? "published" : "compiled_default" } });
  });

  return routes;
}

/** Public, read-only storefront projection (no Dashboard actor). */
export function createPublicStorefrontConfigRoutes() {
  const routes = new Hono();
  routes.get("/storefront/config", async (context) => {
    const requested = context.req.query("locale");
    const locale: "en-CA" | "fr-CA" = requested === "fr-CA" ? "fr-CA" : "en-CA";
    try {
      const rows = await s02SettingsPublicProjection(prisma, locale);
      const raw = rows[0]?.s02_settings_public_projection_v1;
      if (!raw) return context.json({ data: { projectionState: "compiled_default", publishedGeneration: 0, locale, effective: { siteDisplayName: "VanStro Global Supply", brandName: "VanStro", announcementRule: { enabled: false, message: "", locale: null, startsAt: null, endsAt: null }, contact: { email: "", phone: "" }, logoMedia: null, defaultDealer: null, defaultLocation: null } } });
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return context.json({ data });
    } catch {
      return context.json({ data: { projectionState: "compiled_default", publishedGeneration: 0, locale, effective: { siteDisplayName: "VanStro Global Supply", brandName: "VanStro", announcementRule: { enabled: false, message: "", locale: null, startsAt: null, endsAt: null }, contact: { email: "", phone: "" }, logoMedia: null, defaultDealer: null, defaultLocation: null } } });
    }
  });
  return routes;
}
