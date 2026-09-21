import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { AUDIT_RESOURCE_TYPES, isAuditResourceType, p04AuditDetail, p04AuditList, prisma, type AuditEvent, type Prisma } from "@vanstro/db";
import type { Context } from "hono";
import type { DashboardEnv } from "../dashboard/access.js";
import { permissionGrant, resolveDashboardAuthorization, type PermissionGrant } from "../dashboard/authorization.js";
import { CommonQueryError, domainFingerprint, enforceCommonQuerySize, jcsCanonicalize, rawCommonQueryParams } from "../dashboard/common-query.js";
import { dashboardCommonQueryReadiness } from "../config.js";
import { publicError } from "../public-errors.js";

const ACTIONS = ["create","update","archive","restore","delete","publish","unpublish","approve","reject","assign","unassign","acknowledge","resolve","cancel","retry","login","logout","session_revoke","permission_grant","permission_revoke","config_publish","read_sensitive"];
const RESOURCES = AUDIT_RESOURCE_TYPES;
const RESULTS = ["succeeded","failed","denied","partially_succeeded","cancelled"];
const SOURCES = ["dashboard_api","public_api","worker","service_api","system"];
const ACTORS = ["admin_user","dealer_user","customer","service_account","worker","system","anonymous"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASCII = /^[\x20-\x7e]{1,128}$/;
const KID = /^[A-Za-z0-9_-]{1,32}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const ORDER = [{ field: "occurredAt", direction: "desc", nulls: "last" }, { field: "recordId", direction: "desc", nulls: "last" }] as const;
const CURSOR_KEYS = ["actorId","auditSchemaVersion","contextRevision","expiresAt","fieldProfileHash","grantFingerprint","issuedAt","occurredFrom","occurredTo","order","permissionKey","position","profileVersion","queryHash","rangeAnchor","resource","retentionPolicyGeneration","retentionPolicyVersion","v"];

type AuditCursor = {
  v: 1; resource: "audit-events"; profileVersion: "dashboard.audit-events.v1"; permissionKey: "audit_logs.read";
  actorId: string; contextRevision: string; grantFingerprint: string; fieldProfileHash: string; queryHash: string;
  order: typeof ORDER; position: [string, string]; rangeAnchor: string; occurredFrom: string; occurredTo: string;
  retentionPolicyVersion: "audit-retention.v1"; retentionPolicyGeneration: string; auditSchemaVersion: "audit-event.v1";
  issuedAt: number; expiresAt: number;
};
type AuditFilters = { actorType?: string; actorId?: string; action: string[]; resourceType: string[]; resourceId?: string; result: string[]; requestId?: string; source: string[]; sensitive?: string };
type NormalizedAuditQuery = { limit: number; after?: string; rangeAnchor: string; occurredFrom: string; occurredTo: string; filters: AuditFilters };

const invalidCursor = () => new CommonQueryError("CURSOR_INVALID", "Cursor is invalid.", "after", "unsupported");
function decodeBase64url(value: string, length?: number) {
  if (!BASE64URL.test(value) || value.includes("=")) throw invalidCursor();
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value || length !== undefined && decoded.length !== length) throw invalidCursor();
  return decoded;
}
function auditAad(kid: string) { return Buffer.from(`vanstro-dashboard-audit-query-cursor\0cq1\0A256GCM\0${kid}`, "ascii"); }
export function createAuditCursorCodec(now: () => number = Date.now, injectedKeyset = dashboardCommonQueryReadiness().keyset, nonceSource: (size:number)=>Buffer = randomBytes) {
  const keyset = injectedKeyset;
  if (!keyset) throw new CommonQueryError("QUERY_UNAVAILABLE", "Query service is unavailable.");
  return {
    seal(payload: Omit<AuditCursor, "issuedAt" | "expiresAt">) {
      const key = keyset.keys.find((entry) => entry.kid === keyset.activeKid && entry.mode === "active");
      if (!key) throw new CommonQueryError("QUERY_UNAVAILABLE", "Query service is unavailable.");
      const issuedAt = now();
      if (!Number.isSafeInteger(issuedAt)) throw new Error("Invalid clock.");
      const full: AuditCursor = { ...payload, issuedAt, expiresAt: issuedAt + 900_000 };
      const plaintext = Buffer.from(jcsCanonicalize(full), "utf8");
      if (plaintext.length > 4096) throw invalidCursor();
      const nonce = nonceSource(12);
      if (nonce.length !== 12) throw new Error("Invalid nonce source.");
      const cipher = createCipheriv("aes-256-gcm", key.key, nonce, { authTagLength: 16 });
      cipher.setAAD(auditAad(key.kid));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return `cq1.${key.kid}.${nonce.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
    },
    open(token: string, expected: Partial<AuditCursor>) {
      try {
        const segments = token.split(".");
        if (segments.length !== 5 || segments[0] !== "cq1" || !KID.test(segments[1]!)) throw invalidCursor();
        const key = keyset.keys.find((entry) => entry.kid === segments[1]);
        if (!key) throw invalidCursor();
        const nonce = decodeBase64url(segments[2]!, 12);
        const ciphertext = decodeBase64url(segments[3]!);
        if (ciphertext.length < 1 || ciphertext.length > 4096) throw invalidCursor();
        const decipher = createDecipheriv("aes-256-gcm", key.key, nonce, { authTagLength: 16 });
        decipher.setAAD(auditAad(key.kid));
        decipher.setAuthTag(decodeBase64url(segments[4]!, 16));
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
        const payload = JSON.parse(plaintext) as AuditCursor;
        const current = now();
        if (jcsCanonicalize(payload) !== plaintext || Object.keys(payload).sort().join() !== CURSOR_KEYS.join()
          || payload.v !== 1 || payload.resource !== "audit-events" || payload.profileVersion !== "dashboard.audit-events.v1" || payload.permissionKey !== "audit_logs.read"
          || payload.retentionPolicyVersion !== "audit-retention.v1" || payload.retentionPolicyGeneration !== "audit-retention.v1" || payload.auditSchemaVersion !== "audit-event.v1"
          || typeof payload.actorId !== "string" || typeof payload.contextRevision !== "string" || typeof payload.grantFingerprint !== "string" || typeof payload.fieldProfileHash !== "string" || typeof payload.queryHash !== "string"
          || !Number.isSafeInteger(payload.issuedAt) || payload.issuedAt < 0 || !Number.isSafeInteger(payload.expiresAt)
          || payload.expiresAt !== payload.issuedAt + 900_000 || payload.issuedAt > current + 60_000 || current >= payload.expiresAt
          || !Array.isArray(payload.position) || payload.position.length !== 2 || !Number.isFinite(Date.parse(payload.position[0])) || !UUID.test(payload.position[1])
          || typeof payload.rangeAnchor !== "string" || typeof payload.occurredFrom !== "string" || typeof payload.occurredTo !== "string"
          || !Number.isFinite(Date.parse(payload.rangeAnchor)) || !Number.isFinite(Date.parse(payload.occurredFrom)) || !Number.isFinite(Date.parse(payload.occurredTo)) || Date.parse(payload.occurredFrom) >= Date.parse(payload.occurredTo) || Date.parse(payload.occurredTo) > Date.parse(payload.rangeAnchor)
          || jcsCanonicalize(payload.order) !== jcsCanonicalize(ORDER)) throw invalidCursor();
        const actual = Buffer.from(jcsCanonicalize(Object.fromEntries(Object.keys(expected).map((name) => [name, payload[name as keyof AuditCursor]]))));
        const wanted = Buffer.from(jcsCanonicalize(expected));
        if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) throw invalidCursor();
        return payload;
      } catch (error) { if (error instanceof CommonQueryError) throw error; throw invalidCursor(); }
    }
  };
}

export function sameAuditGrantScope(left: PermissionGrant | undefined, right: PermissionGrant | undefined) {
  return Boolean(left && right && left.global === right.global
    && JSON.stringify([...left.dealerIds].sort()) === JSON.stringify([...right.dealerIds].sort())
    && JSON.stringify([...left.locationIds].sort()) === JSON.stringify([...right.locationIds].sort()));
}
export function auditScopeWhere(grant: PermissionGrant): Prisma.AuditEventWhereInput {
  if (grant.global) return {};
  if (!grant.dealerIds.length) return { id: { in: [] } };
  const dealer = grant.dealerIds.map((id) => ({ dealerIds: { array_contains: [id] } }));
  const locations = grant.locationIds.map((id) => ({ locationIds: { array_contains: [id] } }));
  return { authorizationScopeKind: { in: ["dealer", "location"] }, AND: [{ OR: dealer }, ...(locations.length ? [{ OR: [{ authorizationScopeKind: "dealer" }, { OR: locations }] }] : [{ authorizationScopeKind: "dealer" }])] };
}
function multi(raw: readonly string[] | undefined, allowed: readonly string[], key: string) {
  const values = raw ?? [];
  if (values.length > 20 || values.some((value) => !allowed.includes(value))) throw new CommonQueryError("QUERY_FILTER_UNSUPPORTED", `${key} is unsupported.`, key, "unsupported");
  return [...new Set(values)].sort();
}
export function parseAuditQuery(raw: ReturnType<typeof rawCommonQueryParams>, restored?: AuditCursor, now = new Date()): NormalizedAuditQuery {
  const known = new Set(["queryVersion","limit","after","occurredFrom","occurredTo","actorType","actorId","action","resourceType","resourceId","result","requestId","source","sensitive"]);
  const unknown = Object.keys(raw).find((key) => !known.has(key));
  if (unknown) throw new CommonQueryError("QUERY_FILTER_UNSUPPORTED", "Unsupported query field.", unknown, "unsupported");
  if (raw.limit && !/^\d+$/.test(raw.limit[0]!)) throw new CommonQueryError("QUERY_INVALID", "limit is invalid.", "limit", "invalid_type");
  const limit = raw.limit ? Number(raw.limit[0]) : 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new CommonQueryError("QUERY_INVALID", "limit is invalid.", "limit", "out_of_range");
  if (Boolean(raw.occurredFrom) !== Boolean(raw.occurredTo)) throw new CommonQueryError("QUERY_INVALID", "Time bounds must be supplied together.");
  const explicitFrom = raw.occurredFrom?.[0], explicitTo = raw.occurredTo?.[0];
  if (restored && ((explicitFrom && explicitFrom !== restored.occurredFrom) || (explicitTo && explicitTo !== restored.occurredTo))) throw invalidCursor();
  const rangeAnchor = restored?.rangeAnchor ?? now.toISOString();
  const occurredFrom = restored?.occurredFrom ?? explicitFrom ?? new Date(Date.parse(rangeAnchor) - 30 * 86_400_000).toISOString();
  const occurredTo = restored?.occurredTo ?? explicitTo ?? rangeAnchor;
  const rfc3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!rfc3339.test(occurredFrom) || !rfc3339.test(occurredTo) || !Number.isFinite(Date.parse(occurredFrom)) || !Number.isFinite(Date.parse(occurredTo)) || Date.parse(occurredFrom) >= Date.parse(occurredTo)
    || Date.parse(occurredTo) > Date.parse(rangeAnchor) || Date.parse(occurredTo) - Date.parse(occurredFrom) > 366 * 86_400_000) throw new CommonQueryError("QUERY_INVALID", "Time range is invalid.");
  const filters: AuditFilters = { actorType: raw.actorType?.[0], actorId: raw.actorId?.[0], action: multi(raw.action, ACTIONS, "action"), resourceType: multi(raw.resourceType, RESOURCES, "resourceType"), resourceId: raw.resourceId?.[0], result: multi(raw.result, RESULTS, "result"), requestId: raw.requestId?.[0], source: multi(raw.source, SOURCES, "source"), sensitive: raw.sensitive?.[0] };
  if (filters.actorType && !ACTORS.includes(filters.actorType) || filters.resourceId && !ASCII.test(filters.resourceId) || filters.requestId && !ASCII.test(filters.requestId) || filters.sensitive && !["true", "false"].includes(filters.sensitive)) throw new CommonQueryError("QUERY_FILTER_UNSUPPORTED", "Filter is unsupported.");
  return { limit, after: raw.after?.[0], rangeAnchor, occurredFrom, occurredTo, filters };
}
function exactKeys(value:Record<string,unknown>,allowed:string[],label:string){if(Object.keys(value).sort().join()!==[...allowed].sort().join())throw new Error(`Invalid ${label}.`)}
function strictPlain(value: unknown, label: string) { if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw new Error(`Invalid ${label}.`); for (const key of Reflect.ownKeys(value)) { if (typeof key !== "string") throw new Error(`Invalid ${label}.`); const descriptor = Object.getOwnPropertyDescriptor(value,key); if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) throw new Error(`Invalid ${label}.`); } return value as Record<string,unknown>; }
function strictJsonArray(value: unknown, label: string) { if (!Array.isArray(value)) throw new Error(`Invalid ${label}.`); return value; }
function canonicalStrings(value:unknown,label:string){const array=strictJsonArray(value,label);if(array.some(item=>typeof item!=="string")||JSON.stringify(array)!==JSON.stringify([...new Set(array as string[])].sort()))throw new Error(`Invalid ${label}.`);return array as string[]}
function validateScope(kind:unknown,dealerIds:string[],locationIds:string[]){if(kind==="global"||kind==="none"){if(dealerIds.length||locationIds.length)throw new Error("Invalid audit scope.");return}if(kind==="dealer"){if(!dealerIds.length||locationIds.length)throw new Error("Invalid audit scope.");return}if(kind==="location"){if(!dealerIds.length||!locationIds.length)throw new Error("Invalid audit scope.");return}throw new Error("Invalid audit scope.")}
function strictScalars(value: unknown, max: number) { const source = strictPlain(value,"audit scalars"), out:Record<string,string|number|boolean|null>=Object.create(null); const entries=Object.entries(source); if(entries.length>max)throw new Error("Invalid audit scalars."); for(const [key,item] of entries){if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key)||item!==null&&!['string','number','boolean'].includes(typeof item)||typeof item==='number'&&!Number.isFinite(item)||typeof item==='string'&&Buffer.byteLength(item)>256)throw new Error("Invalid audit scalars.");out[key]=item as never}return out}
function strictSummary(value: unknown, sensitive: boolean) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid audit summary.");
  const record = strictPlain(value, "audit summary");
  const changedFields = strictJsonArray(record.changedFields, "changedFields"); const redactedFields = strictJsonArray(record.redactedFields ?? [], "redactedFields");
  if (changedFields.some((x) => typeof x !== "string") || redactedFields.some((x) => typeof x !== "string")) throw new Error("Invalid audit summary.");
  return { changedFields, redactedFields, ...(sensitive && record.values ? { values: strictScalars(record.values,32) } : {}) };
}
function strictMetadata(value: unknown) { const record = strictPlain(value,"audit metadata"); if (record.schemaVersion !== "audit-metadata.v1" || !record.entries) throw new Error("Invalid audit metadata."); const output={ schemaVersion: "audit-metadata.v1", entries: strictScalars(record.entries,16) }; if(Buffer.byteLength(jcsCanonicalize(output))>2048)throw new Error("Invalid audit metadata."); return output; }
export function serializeAuditEvent(row: AuditEvent, sensitive: boolean) {
  if(row.eventVersion!=="audit-event.v1"||!ACTORS.includes(row.actorType)||!ACTIONS.includes(row.action)||!isAuditResourceType(row.resourceType)||!RESULTS.includes(row.result)||!SOURCES.includes(row.source)||!/^[A-Za-z0-9._:-]{1,128}$/.test(row.requestId)||!["global","dealer","location","none"].includes(row.authorizationScopeKind)||!["staff","partner","customer","machine","anonymous"].includes(row.actorDisplayClass)||!["dashboard-authorization.v1","service-authorization.v1","system-authorization.v1"].includes(row.authorizationContractVersion)||row.reason&&!['completed','validation_rejected','permission_required','scope_mismatch','field_permission_required','resource_not_available','state_conflict','idempotent_replay','idempotency_conflict','transaction_rolled_back','dependency_unavailable','internal_failure','operator_requested'].includes(row.reason)||row.resourceId&&!ASCII.test(row.resourceId)||!["anonymous","system"].includes(row.actorType)&&!row.actorId)throw new Error("Invalid audit event.");
  const roles = strictJsonArray(row.effectiveRoles, "effectiveRoles").map((entry) => { const value = strictPlain(entry,"effective role"); exactKeys(value,["roleKey","scope"],"effective role"); if (typeof value.roleKey !== "string" || !["global","dealer"].includes(String(value.scope))) throw new Error("Invalid effective role."); return { roleKey: value.roleKey, scope: value.scope }; });
  const grants = strictJsonArray(row.permissionGrants, "permissionGrants").map((entry) => { const value = strictPlain(entry,"permission grant"); exactKeys(value,["permissionKey","scope"],"permission grant"); if (typeof value.permissionKey !== "string" || !value.scope) throw new Error("Invalid permission grant."); const scope = strictPlain(value.scope,"permission scope"); if (!["global","dealer","location","none"].includes(String(scope.kind))) throw new Error("Invalid permission grant."); exactKeys(scope,scope.kind==="dealer"||scope.kind==="location"?["kind","dealerIds","locationIds"]:["kind"],"permission scope"); if(scope.kind==="dealer"||scope.kind==="location"){const dealers=canonicalStrings(scope.dealerIds,"permission dealerIds"),locations=canonicalStrings(scope.locationIds,"permission locationIds");validateScope(scope.kind,dealers,locations)} return { permissionKey: value.permissionKey, scope }; });
  const dealerIds = canonicalStrings(row.dealerIds, "dealerIds"); const locationIds = canonicalStrings(row.locationIds, "locationIds");
  validateScope(row.authorizationScopeKind,dealerIds,locationIds);
  const change = row.afterSummary ?? row.beforeSummary;
  return { id: row.id, eventVersion: row.eventVersion, occurredAt: row.occurredAt.toISOString(), actor: { type: row.actorType, displayClass: row.actorDisplayClass, ...(row.actorId && (sensitive || !["service_account","worker","system"].includes(row.actorType)) ? { id: row.actorId } : {}) }, authorization: { effectiveRoles: roles, permissionGrants: grants, scope: row.authorizationScopeKind === "global" ? { kind: "global" } : row.authorizationScopeKind === "none" ? { kind: "none" } : { kind: row.authorizationScopeKind, dealerIds, locationIds }, contextRevision: row.contextRevision, contractVersion: row.authorizationContractVersion }, action: row.action, resource: { type: row.resourceType, ...(row.resourceId ? { id: row.resourceId } : {}) }, result: row.result, ...(row.reason ? { reason: row.reason } : {}), requestId: row.requestId, source: row.source, sensitive: row.sensitive, ...(change ? { changeSummary: strictSummary(change, sensitive) } : {}), ...(sensitive && row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? { metadata: strictMetadata(row.metadata) } : {}) };
}
function publicQueryError(context: Context, error: unknown) { if (error instanceof CommonQueryError) return publicError(context, error.code === "QUERY_UNAVAILABLE" ? 503 : 400, error.code, error.message, error.field ? { [error.field]: error.fieldLabel } : undefined); throw error; }

export async function handleStrictAuditList(context: Context<DashboardEnv>) {
  context.header("Cache-Control", "private, no-store");
  try {
    const authorization = context.get("p02Authorization");
    const grant = permissionGrant(authorization, "audit_logs.read");
    if (!grant) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "audit_logs.read is required.");
    const sensitive = sameAuditGrantScope(grant, permissionGrant(authorization, "audit.read_sensitive"));
    const rawText = context.req.url.slice(context.req.url.indexOf("?") + 1); const raw = rawCommonQueryParams(rawText);
    for (const key of ["queryVersion","limit","after","occurredFrom","occurredTo","actorType","actorId","resourceId","requestId","sensitive"]) if ((raw[key]?.length ?? 0) > 1) throw new CommonQueryError("QUERY_INVALID", "A scalar query field was repeated.", key, "too_many");
    if (raw.queryVersion?.[0] !== "common-query.v1") throw new CommonQueryError("QUERY_VERSION_UNSUPPORTED", "Unsupported common query contract version.");
    if (raw.after?.[0] === "") throw new CommonQueryError("QUERY_INVALID", "after is invalid.", "after", "required");
    const grantFingerprint = domainFingerprint("vanstro:cq:grant:v1", { permissionKey: "audit_logs.read", global: grant.global, sortedDealerIds: [...grant.dealerIds].sort(), sortedLocationIds: [...grant.locationIds].sort() });
    const fieldProfileHash = domainFingerprint("vanstro:cq:field-profile:v1", { profileId: sensitive ? "dashboard.audit-events.sensitive-list.v1" : "dashboard.audit-events.redacted-list.v1", profileVersion: "dashboard.audit-events.v1" });
    const base = { resource: "audit-events" as const, profileVersion: "dashboard.audit-events.v1" as const, permissionKey: "audit_logs.read" as const, actorId: authorization.actorId, contextRevision: authorization.contextRevision, grantFingerprint, fieldProfileHash, retentionPolicyVersion: "audit-retention.v1" as const, retentionPolicyGeneration: "audit-retention.v1", auditSchemaVersion: "audit-event.v1" as const };
    const codec = createAuditCursorCodec(); const restored = raw.after?.[0] ? codec.open(raw.after[0], base) : undefined;
    const query = parseAuditQuery(raw, restored);
    if (query.filters.actorId && (!sensitive || !ASCII.test(query.filters.actorId))) throw new CommonQueryError("QUERY_FILTER_UNSUPPORTED", "actorId is unsupported.", "actorId", "unsupported");
    const queryHash = domainFingerprint("vanstro:cq:audit-query:v1", { rangeAnchor: query.rangeAnchor, limit: query.limit, filters: { ...query.filters, occurredFrom: query.occurredFrom, occurredTo: query.occurredTo } });
    if (restored) codec.open(query.after!, { queryHash, order: ORDER });
    enforceCommonQuerySize(rawText);
    const filter = query.filters;
    const rows = await p04AuditList(prisma, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: authorization.actorId, occurredFrom: new Date(query.occurredFrom), occurredTo: new Date(query.occurredTo), rangeAnchor: new Date(query.rangeAnchor), limit: query.limit + 1, afterOccurredAt: restored ? new Date(restored.position[0]) : undefined, afterId: restored?.position[1], actorType: filter.actorType, filterActorId: filter.actorId, actions: filter.action, resourceTypes: filter.resourceType, resourceId: filter.resourceId, results: filter.result, requestId: filter.requestId, sources: filter.source, sensitive: filter.sensitive === undefined ? undefined : filter.sensitive === "true" }); const hasMore = rows.length > query.limit; const data = rows.slice(0, query.limit); const last = data.at(-1);
    const nextCursor = hasMore && last ? codec.seal({ ...base, v: 1, queryHash, order: ORDER, position: [last.occurredAt.toISOString(), last.id], rangeAnchor: query.rangeAnchor, occurredFrom: query.occurredFrom, occurredTo: query.occurredTo }) : undefined; const capturedAt = new Date().toISOString();
    return context.json({ data: data.map((row) => serializeAuditEvent(row, sensitive)), meta: { requestId: context.res.headers.get("X-Request-Id"), queryContractVersion: "common-query.v1", pagination: { mode: "cursor", limit: query.limit, ...(nextCursor ? { nextCursor } : {}), hasMore }, sort: ORDER, snapshot: { consistency: "statement", capturedAt }, visibility: { profileId: sensitive ? "dashboard.audit-events.sensitive-list.v1" : "dashboard.audit-events.redacted-list.v1" } } });
  } catch (error) { return publicQueryError(context, error); }
}
export async function handleStrictAuditDetail(context: Context<DashboardEnv>) {
  context.header("Cache-Control", "private, no-store"); const raw = rawCommonQueryParams(context.req.url.slice(context.req.url.indexOf("?") + 1));
  if ((raw.queryVersion?.length ?? 0) !== 1 || Object.keys(raw).some((key) => key !== "queryVersion")) return publicError(context, 400, "QUERY_INVALID", "Detail query is invalid.");
  if (raw.queryVersion![0] !== "common-query.v1") return publicError(context, 400, "QUERY_VERSION_UNSUPPORTED", "Unsupported common query contract version.");
  if (!UUID.test(context.req.param("id")!)) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Audit event not found.");
  const authorization = context.get("p02Authorization"); const grant = permissionGrant(authorization, "audit_logs.read");
  if (!grant) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "audit_logs.read is required.");
  const row = await p04AuditDetail(prisma, context.get("actorSessionTokenHash"), authorization.actorId, context.req.param("id")!, new Date());
  if (!row) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "Audit event not found.");
  return context.json({ data: serializeAuditEvent(row, sameAuditGrantScope(grant, permissionGrant(authorization, "audit.read_sensitive"))) });
}
