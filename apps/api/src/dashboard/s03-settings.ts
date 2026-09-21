import { createHash } from "node:crypto";
import { prisma, s03SettingsCreateDraft, s03SettingsEvents, s03SettingsPublishDraft, s03SettingsRows, s03SettingsUpdateDraft, s03SettingsValidateDraft, type RuntimeConfigVersion } from "@vanstro/db";
import { Hono, type Context } from "hono";
import { publicError } from "../public-errors.js";
import type { DashboardEnv } from "./access.js";
import { readBody } from "./request.js";

export const S03_DESCRIPTOR_KEY = "settings.commerce" as const;
export const S03_SCHEMA_VERSION = "settings.commerce.v1" as const;

export const CANADIAN_PROVINCE_CODES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;
const PROVINCES = new Set<string>(CANADIAN_PROVINCE_CODES);
const ORDER_STATES = ["paid", "processing", "fulfilled", "cancelled"] as const;
export type CommerceSettingsValueV1 = {
  commercePolicy: { minimumOrderAmountCents: number; guestCheckoutEnabled: boolean; checkoutEnabled: boolean };
  taxPolicy: { enabledProvinceCodes: string[]; calculationMode: "current-tax-rate-table" | "disabled"; roundingMode: "nearest-cent" };
  shippingPolicy: { pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFlatFeeCents: number; serviceZoneMode: "dealer-location-only" | "postal-prefix"; fallbackMode: "reject" | "pickup-only" };
  inventoryPolicy: { reservationEnabled: boolean; reservationTtlMinutes: number; availabilityMode: "manual" | "erp"; staleAfterSeconds: number; staleBehavior: "degraded-reject" | "manual-fallback" };
  orderPolicy: { allowedLifecycleTransitions: Record<(typeof ORDER_STATES)[number], Array<(typeof ORDER_STATES)[number]>>; guestLookupEnabled: boolean; cancellationMode: "erp-confirmed-only" | "disabled" };
};
export const S03_COMPILED_VALUE: CommerceSettingsValueV1 = {
 commercePolicy:{minimumOrderAmountCents:0,guestCheckoutEnabled:true,checkoutEnabled:true},
 taxPolicy:{enabledProvinceCodes:[],calculationMode:"current-tax-rate-table",roundingMode:"nearest-cent"},
 shippingPolicy:{pickupEnabled:true,deliveryEnabled:true,deliveryFlatFeeCents:1500,serviceZoneMode:"dealer-location-only",fallbackMode:"reject"},
 inventoryPolicy:{reservationEnabled:true,reservationTtlMinutes:30,availabilityMode:"manual",staleAfterSeconds:300,staleBehavior:"degraded-reject"},
 orderPolicy:{allowedLifecycleTransitions:{paid:["processing","fulfilled","cancelled"],processing:["fulfilled","cancelled"],fulfilled:[],cancelled:[]},guestLookupEnabled:true,cancellationMode:"erp-confirmed-only"}
};

type S03Draft = {
  id: string;
  descriptorKey: typeof S03_DESCRIPTOR_KEY;
  status: "draft" | "validated" | "invalid" | "publishing" | "activation_failed" | "rollback_draft";
  value: CommerceSettingsValueV1;
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
function draftStatus(row: RuntimeConfigVersion): S03Draft["status"] {
  if (row.settingsLifecycleStatus === "activation_failed") return "activation_failed";
  if (row.desiredSource === "rollback_draft" && row.settingsLifecycleStatus === "draft") return "rollback_draft";
  if (row.settingsLifecycleStatus === "invalid") return "invalid";
  if (row.settingsLifecycleStatus === "validated") return "validated";
  return "draft";
}
function draftDto(row: RuntimeConfigVersion): S03Draft {
  return {
    id: row.id,
    descriptorKey: S03_DESCRIPTOR_KEY,
    status: draftStatus(row),
    value: row.desiredValue as CommerceSettingsValueV1,
    basePublicationVersion: Number(row.generation),
    version: row.settingsRevision ?? row.version,
    changeReason: row.settingsChangeReason ?? "Settings change requested.",
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.settingsUpdatedAt ?? row.createdAt).toISOString(),
    validationRevision: row.settingsLifecycleStatus === "draft" ? null : row.settingsRevision,
    rollbackOfPublicationId: row.settingsRollbackOfPublicationId
  };
}

function isStructurallyValidValue(value: unknown): value is CommerceSettingsValueV1 {
 if(!value||typeof value!=="object"||Array.isArray(value))return false; const v=value as Record<string,unknown>;
 if(!exactKeys(v,["commercePolicy","taxPolicy","shippingPolicy","inventoryPolicy","orderPolicy"]))return false;
 const cp=v.commercePolicy as Record<string,unknown>,tp=v.taxPolicy as Record<string,unknown>,sp=v.shippingPolicy as Record<string,unknown>,ip=v.inventoryPolicy as Record<string,unknown>,op=v.orderPolicy as Record<string,unknown>;
 if(![cp,tp,sp,ip,op].every(x=>x&&typeof x==="object"&&!Array.isArray(x)))return false;
 const cents=(x:unknown)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0&&x<=2147483647;
 const bounded=(x:unknown,min:number,max:number)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=min&&x<=max;
 if(!exactKeys(cp,["minimumOrderAmountCents","guestCheckoutEnabled","checkoutEnabled"])||!cents(cp.minimumOrderAmountCents)||typeof cp.guestCheckoutEnabled!=="boolean"||typeof cp.checkoutEnabled!=="boolean")return false;
 if(!exactKeys(tp,["enabledProvinceCodes","calculationMode","roundingMode"])||!Array.isArray(tp.enabledProvinceCodes)||tp.enabledProvinceCodes.length>13||new Set(tp.enabledProvinceCodes).size!==tp.enabledProvinceCodes.length||!tp.enabledProvinceCodes.every(x=>typeof x==="string"&&PROVINCES.has(x))||!["current-tax-rate-table","disabled"].includes(tp.calculationMode as string)||tp.roundingMode!=="nearest-cent")return false;
 if(!exactKeys(sp,["pickupEnabled","deliveryEnabled","deliveryFlatFeeCents","serviceZoneMode","fallbackMode"])||typeof sp.pickupEnabled!=="boolean"||typeof sp.deliveryEnabled!=="boolean"||!cents(sp.deliveryFlatFeeCents)||!["dealer-location-only","postal-prefix"].includes(sp.serviceZoneMode as string)||!["reject","pickup-only"].includes(sp.fallbackMode as string))return false;
 if(!exactKeys(ip,["reservationEnabled","reservationTtlMinutes","availabilityMode","staleAfterSeconds","staleBehavior"])||typeof ip.reservationEnabled!=="boolean"||!bounded(ip.reservationTtlMinutes,5,1440)||!["manual","erp"].includes(ip.availabilityMode as string)||!bounded(ip.staleAfterSeconds,30,86400)||!["degraded-reject","manual-fallback"].includes(ip.staleBehavior as string))return false;
 if(!exactKeys(op,["allowedLifecycleTransitions","guestLookupEnabled","cancellationMode"])||typeof op.guestLookupEnabled!=="boolean"||!["erp-confirmed-only","disabled"].includes(op.cancellationMode as string))return false;
 const transitions=op.allowedLifecycleTransitions as Record<string,unknown>; if(!transitions||typeof transitions!=="object"||Array.isArray(transitions)||!exactKeys(transitions,ORDER_STATES))return false;
 for(const state of ORDER_STATES){const targets=transitions[state];if(!Array.isArray(targets)||new Set(targets).size!==targets.length||!targets.every(x=>ORDER_STATES.includes(x as never)&&x!==state))return false;} return true;
}
function businessIssues(value:CommerceSettingsValueV1){const issues:Array<{code:string;severity:"blocker"|"warning"|"info";field:string;message:string}>=[];
 for(const target of value.orderPolicy.allowedLifecycleTransitions.fulfilled)issues.push({code:"S03_TERMINAL_TRANSITION",severity:"blocker",field:"orderPolicy.allowedLifecycleTransitions.fulfilled",message:`Illegal transition to ${target}.`});
 for(const target of value.orderPolicy.allowedLifecycleTransitions.cancelled)issues.push({code:"S03_TERMINAL_TRANSITION",severity:"blocker",field:"orderPolicy.allowedLifecycleTransitions.cancelled",message:`Illegal transition to ${target}.`});
 if(value.inventoryPolicy.availabilityMode==="erp")issues.push({code:"S03_ERP_INVENTORY_DEPENDENCY",severity:"warning",field:"inventoryPolicy.availabilityMode",message:"ERP inventory can become stale or unavailable."});
 issues.push({code:"S03_ERP_CANONICAL_INGEST_FUTURE",severity:"warning",field:"inventoryPolicy.availabilityMode",message:"ERP canonical ingest remains a future obligation."}); return issues;}

function mapConflict(context: Context<DashboardEnv>, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("S03_NOT_FOUND")) return publicError(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE", "The Settings resource is unavailable.");
  if (message.includes("S03_VERSION_CONFLICT") || message === "VERSION_CONFLICT") return publicError(context, 409, "VERSION_CONFLICT", "The Settings state changed.");
  if (message.includes("S03_IDEMPOTENCY_CONFLICT") || message === "IDEMPOTENCY_CONFLICT") return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
  if (message.includes("S03_STATE_CONFLICT") || message === "SETTINGS_STATE_CONFLICT") return publicError(context, 409, "SETTINGS_STATE_CONFLICT", "The Settings lifecycle state does not allow this operation.");
  if (message.includes("S03_VALIDATION")) return publicError(context, 400, "SETTINGS_VALIDATION_FAILED", "The Settings request is invalid.");
  if (message.includes("S03_FORBIDDEN")) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global Settings permission is required.");
  throw error;
}

function activePublicationSequence(active: RuntimeConfigVersion | null, events: Array<{ runtimeConfigId: string; publicationSequence: number; eventType: string }>) {
  if (!active) return 0;
  return events.find((event) => event.runtimeConfigId === active.id && (event.eventType === "published" || event.eventType === "rollback_published"))?.publicationSequence ?? 0;
}

export type S03ConsumerState="implemented_ready"|"implemented_degraded"|"future_obligation";
function consumerMatrix(generation:number|null){const partial=new Set(["shipping-fee-service-zone","inventory-ttl-stale"]);return ["checkout-availability","checkout-guest-minimum","tax-totals","shipping-fee-service-zone","inventory-ttl-stale","order-transitions"].map(id=>({id,state:(partial.has(id)?"implemented_degraded":generation===null?"implemented_degraded":"implemented_ready") as S03ConsumerState,generation,reasonCode:partial.has(id)?"coverage_limited":generation===null?"consumer_generation_missing":"exact_generation"}));}

export function createDashboardS03SettingsRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/settings/s03-overview", async (context) => {
    const [rows, events] = await Promise.all([
      s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s03SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    const effective = (active?.effectiveValue ?? null) as CommerceSettingsValueV1 | null;
    return context.json({ data: {
      descriptorKey: S03_DESCRIPTOR_KEY,
      schemaVersion: S03_SCHEMA_VERSION,
      projectionState: active ? "published" : "compiled_default",
      publishedGeneration,
      publication: active ? { version: publishedGeneration, cas: active.settingsRevision ?? null, publishedAt: (active.activatedAt ?? active.createdAt).toISOString(), changeReason: active.settingsChangeReason ?? "Settings publication." } : null,
      effective: effective ?? S03_COMPILED_VALUE,
      consumerMatrix: consumerMatrix(publishedGeneration)
    } });
  });

  routes.get("/dashboard/settings/s03-drafts", async (context) => {
    const rows = await s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: rows.filter(isOpen).map(draftDto) });
  });

  routes.post("/dashboard/settings/s03-drafts", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"]) || body.descriptorKey !== S03_DESCRIPTOR_KEY || !validVersion(body.expectedPublishedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s03:idempotency:v1", body.idempotencyKey);
    const requestHash = hash("vanstro:settings:s03:create-draft:v1", body);
    try {
      const [currentRows, currentEvents] = await Promise.all([
        s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
        s03SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
      ]);
      const active = currentRows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
      if (Number(body.expectedPublishedVersion) !== (active?.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const createdRows = await s03SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: active?.settingsRevision ?? 0, value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = createdRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s03-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const row = (await s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))).find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    return context.json({ data: draftDto(row) });
  });

  routes.patch("/dashboard/settings/s03-drafts/:id", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "value", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !isStructurallyValidValue(body.value) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft update is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s03:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s03:update-draft:v1", { draftId: id, ...body });
      const rows = await s03SettingsUpdateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), value: body.value, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = rows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.post("/dashboard/settings/s03-drafts/:id/validate", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings validation request is invalid.");
    try {
      const validatedRows = await s03SettingsValidateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash: hash("vanstro:settings:s03:idempotency:v1", body.idempotencyKey), requestHash: hash("vanstro:settings:s03:validate:v1", { draftId: id, ...body }), requestId: requestId(context) });
      const updated = validatedRows[0]; if (!updated) throw new Error("SETTINGS_STATE_CONFLICT");
      const value = updated.desiredValue as CommerceSettingsValueV1;
      const issues = businessIssues(value);
      const status = issues.some((issue) => issue.severity === "blocker") ? "invalid" : "validated";
      return context.json({ data: { draftId: updated.id, draftVersion: updated.settingsRevision ?? updated.version, validationRevision: updated.settingsRevision ?? updated.version, status, issues, validatedAt: (updated.settingsValidatedAt ?? updated.createdAt).toISOString() } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s03-drafts/:id/diff", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const rows = await s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const row = rows.find((entry) => entry.id === id);
    if (!row || !isOpen(row)) return publicError(context, 404, "COMMERCE_NOT_FOUND", "The Settings draft is unavailable.");
    const active = rows.find((entry) => entry.settingsLifecycleStatus === "published") ?? null;
    const before = (active?.effectiveValue ?? null) as CommerceSettingsValueV1 | null;
    const after = row.desiredValue as CommerceSettingsValueV1;
    const changes: Array<{ field: string; before: unknown; after: unknown; sensitivity: "public" }> = [];
    const fields: Array<[string, unknown, unknown]> = [
      ["commercePolicy", before?.commercePolicy, after.commercePolicy],
      ["taxPolicy", before?.taxPolicy, after.taxPolicy],
      ["shippingPolicy", before?.shippingPolicy, after.shippingPolicy],
      ["inventoryPolicy", before?.inventoryPolicy, after.inventoryPolicy],
      ["orderPolicy", before?.orderPolicy, after.orderPolicy]
    ];
    for (const [field, b, a] of fields) if (JSON.stringify(b) !== JSON.stringify(a)) changes.push({ field, before: b ?? null, after: a ?? null, sensitivity: "public" });
    return context.json({ data: { draftId: row.id, draftVersion: row.settingsRevision ?? row.version, descriptorKey: S03_DESCRIPTOR_KEY, changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] } });
  });

  routes.post("/dashboard/settings/s03-drafts/:id/publish", async (context) => {
    const id = context.req.param("id");
    if (!validUuid(id)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings draft identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedVersion", "idempotencyKey"]) || !validVersion(body.expectedVersion) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings publish request is invalid.");
    try {
      const idempotencyHash = hash("vanstro:settings:s03:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s03:publish:v1", { draftId: id, ...body });
      const publishedRows = await s03SettingsPublishDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), draftId: id, expectedVersion: Number(body.expectedVersion), idempotencyHash, requestHash, requestId: requestId(context) });
      const row = publishedRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      const events = await s03SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const publishedGeneration = activePublicationSequence(row, events);
      if (publishedGeneration === 0) throw new Error("SETTINGS_STATE_CONFLICT");
      // Publish only activates the typed policy version; consumers resolve it
      // on their next operation and no business action is triggered here.
      return context.json({ data: { id: row.id, generation: publishedGeneration.toString(), version: publishedGeneration, sourceDraftId: row.id, sourceDraftVersion: Number(body.expectedVersion), status: "published", publishedAt: (row.activatedAt ?? row.createdAt).toISOString(), rollbackOfPublicationId: row.settingsRollbackOfPublicationId, readiness: { state: "degraded", reasonCode: "coverage_limited", observedAt: new Date().toISOString(), publishedGeneration, publicationVersion: publishedGeneration, consumerGeneration: publishedGeneration, projectionState: "published", consumers: consumerMatrix(publishedGeneration) } } });
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s03-history", async (context) => {
    const events = await s03SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    const rows = await s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
    return context.json({ data: events.map((event) => {
      const row = rows.find((entry) => entry.id === event.runtimeConfigId);
      return {
        publicationId: event.runtimeConfigId,
        generation: (row?.generation ?? 0n).toString(),
        version: event.publicationSequence,
        status: event.eventType === "rollback_published" || event.eventType === "published" ? "published" : event.eventType === "superseded" ? "superseded" : "activation_failed",
        descriptorKeys: [S03_DESCRIPTOR_KEY],
        changeReason: event.changeReason ?? "Settings publication.",
        publishedAt: new Date(event.occurredAt).toISOString(),
        rollbackOfPublicationId: event.rollbackSourcePublicationId,
        auditEventId: event.auditEventId
      };
    }) });
  });

  routes.post("/dashboard/settings/s03-history/:publicationId/rollback-draft", async (context) => {
    const publicationId = context.req.param("publicationId");
    if (!validUuid(publicationId)) return publicError(context, 400, "COMMERCE_INVALID", "The publication identifier is invalid.");
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["expectedPublishedVersion", "changeReason", "idempotencyKey"]) || !validVersion(body.expectedPublishedVersion) || !validReason(body.changeReason) || !validIdempotencyKey(body.idempotencyKey)) return publicError(context, 400, "COMMERCE_INVALID", "The rollback draft request is invalid.");
    const idempotencyHash = hash("vanstro:settings:s03:idempotency:v1", body.idempotencyKey), requestHash = hash("vanstro:settings:s03:rollback-draft:v1", { publicationId, ...body });
    try {
      const rows = await s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"));
      const source = rows.find(row => row.id === publicationId);
      const current = rows.find(row => row.settingsLifecycleStatus === "published") ?? null;
      if (!source || !current || source.id !== current.id || !["published", "superseded"].includes(source.settingsLifecycleStatus ?? "")) throw new Error("SETTINGS_STATE_CONFLICT");
      if (Number(body.expectedPublishedVersion) !== (current.settingsRevision ?? 0)) throw new Error("VERSION_CONFLICT");
      const rollbackRows = await s03SettingsCreateDraft(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), expectedPublishedVersion: current.settingsRevision ?? 0, value: source.effectiveValue, changeReason: String(body.changeReason).trim(), idempotencyHash, requestHash, requestId: requestId(context), rollbackSource: source.id });
      const row = rollbackRows[0]; if (!row) throw new Error("SETTINGS_STATE_CONFLICT");
      return context.json({ data: draftDto(row) }, 201);
    } catch (error) { return mapConflict(context, error); }
  });

  routes.get("/dashboard/settings/s03-readiness", async (context) => {
    const rawConsumerGeneration = context.req.query("consumerGeneration");
    if (rawConsumerGeneration !== undefined && !/^(0|[1-9][0-9]*)$/.test(rawConsumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const consumerGeneration = rawConsumerGeneration === undefined ? null : Number(rawConsumerGeneration);
    if (consumerGeneration !== null && !validVersion(consumerGeneration)) return publicError(context, 400, "COMMERCE_INVALID", "The Settings consumer generation is invalid.");
    const [rows, events] = await Promise.all([
      s03SettingsRows(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId")),
      s03SettingsEvents(prisma, context.get("actorSessionTokenHash"), context.get("actorUserId"))
    ]);
    const active = rows.find((row) => row.settingsLifecycleStatus === "published") ?? null;
    const publishedGeneration = activePublicationSequence(active, events);
    // Readiness requires exact generation equality. Compiled defaults are
    // generation zero; a published policy without an observed exact consumer
    // generation is reported degraded rather than fake-ready.
    const exact = active ? consumerGeneration === publishedGeneration : consumerGeneration === null || consumerGeneration === 0;
    const consumers = consumerMatrix(exact ? publishedGeneration : consumerGeneration);
    // Readiness is ready only when the generation matches exactly AND every
    // consumer is implemented_ready; partially wired consumers (coverage_limited)
    // keep the descriptor degraded rather than over-claiming completion.
    const state = exact && consumers.every((c) => c.state === "implemented_ready") ? "ready" : "degraded";
    return context.json({ data: { state, reasonCode: exact ? (state === "ready" ? "exact_generation" : "coverage_limited") : "consumer_generation_mismatch", observedAt:new Date().toISOString(),publishedGeneration,publicationVersion:active?publishedGeneration:null,publicationCas:active?.settingsRevision??null,consumerGeneration,projectionState:active?"published":"compiled_default",consumers } });
  });

  /** Read-only aggregate preview; no domain instance reads or writes. */
  routes.post("/dashboard/settings/s03-impact-preview", async (context) => {
    const body = await readBody(context);
    if (!body || !exactKeys(body, ["value"]) || !isStructurallyValidValue(body.value)) return publicError(context, 400, "COMMERCE_INVALID", "The impact preview request is invalid.");
    const value = body.value;
    const issues = businessIssues(value);
    const affectedFamilies = (["commercePolicy", "taxPolicy", "shippingPolicy", "inventoryPolicy", "orderPolicy"] as const);
    const transitionRuleCount = Object.values(value.orderPolicy.allowedLifecycleTransitions).reduce((count, targets) => count + targets.length, 0);
    return context.json({ data: {
      candidateAccepted: !issues.some((issue) => issue.severity === "blocker"),
      affectedFamilies,
      quoteImpact: {
        checkoutAvailable: value.commercePolicy.checkoutEnabled,
        guestCheckoutAvailable: value.commercePolicy.guestCheckoutEnabled,
        minimumOrderAmountCents: value.commercePolicy.minimumOrderAmountCents,
        taxMode: value.taxPolicy.calculationMode,
        enabledProvinceCount: value.taxPolicy.enabledProvinceCodes.length,
        pickupAvailable: value.shippingPolicy.pickupEnabled,
        deliveryAvailable: value.shippingPolicy.deliveryEnabled,
        deliveryFlatFeeCents: value.shippingPolicy.deliveryFlatFeeCents,
        inventoryMode: value.inventoryPolicy.availabilityMode,
        reservationTtlMinutes: value.inventoryPolicy.reservationTtlMinutes,
        staleAfterSeconds: value.inventoryPolicy.staleAfterSeconds,
        orderTransitionRuleCount: transitionRuleCount
      },
      warnings: issues.filter((issue) => issue.severity === "warning").map((issue) => issue.code),
      contextRevision: context.get("p02Authorization").contextRevision
    } });
  });

  return routes;
}
