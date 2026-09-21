import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type CommonQueryVersion = "common-query.v1";
export type CommonQueryDirection = "asc" | "desc";
export type CommonQuerySort = Readonly<{ field: string; direction: CommonQueryDirection; nulls: "first" | "last" }>;
export type RawCommonQueryParams = Readonly<Record<string, readonly string[]>>;
export type CommonOffsetQueryV1<F extends object = Record<never, never>> = Readonly<{ queryVersion: CommonQueryVersion; limit: number; offset: number; sort: string; direction: CommonQueryDirection; q?: string; includeSummary: false; filters: Readonly<F> }>;
export type CommonCursorQueryV1<F extends object = Record<never, never>> = Readonly<Omit<CommonOffsetQueryV1<F>, "offset"> & { after?: string }>;
export type ProductQueryFiltersV1 = { status?: readonly ("draft" | "active" | "archived")[]; categoryId?: string; isUncategorized?: boolean };
export type DealerQueryFiltersV1 = { status?: "active" | "inactive"; dealerId?: readonly string[] };
export type ProductOffsetQueryV1 = CommonOffsetQueryV1<ProductQueryFiltersV1>;
export type DealerCursorQueryV1 = CommonCursorQueryV1<DealerQueryFiltersV1>;
export type CommonQueryErrorCode = "QUERY_INVALID" | "QUERY_VERSION_UNSUPPORTED" | "QUERY_SORT_INVALID" | "QUERY_FILTER_UNSUPPORTED" | "QUERY_SEARCH_UNSUPPORTED" | "QUERY_TOO_COMPLEX" | "QUERY_DEPTH_EXCEEDED" | "CURSOR_INVALID" | "QUERY_UNAVAILABLE" | "CURRENCY_MIXED";
export const COMMON_QUERY_VERSION: CommonQueryVersion = "common-query.v1";
export const COMMON_QUERY_LIMITS = Object.freeze({ queryStringBytes: 2048, maxOffset: 10_000, maxFilterKeys: 10, maxMultiValues: 20, maxSearch: 100, defaultMaxDateSpanDays: 366 });

export type QueryFilterDefinition = Readonly<{ type: "enum" | "uuid" | "boolean" | "rfc3339"; multi?: boolean; values?: readonly string[]; invalidCode?: "QUERY_INVALID" | "QUERY_FILTER_UNSUPPORTED" }>;
export type QuerySortDefinition = Readonly<{ directions: readonly CommonQueryDirection[]; nulls: "first" | "last"; dbField?: string }>;
export type QueryProfile = Readonly<{ id: string; resource: string; endpoint: string; requiredPermission: string; scope: "global" | "scope-aware"; pagination: "offset" | "cursor"; implemented: boolean; defaultLimit: number; maxLimit: number; defaultSort: string; defaultDirection: CommonQueryDirection; sorts: Readonly<Record<string, QuerySortDefinition>>; filters: Readonly<Record<string, QueryFilterDefinition>>; search: false | Readonly<{ min: number; max: number; fields: readonly string[]; mode: "exact-prefix" }>; summary: false; fieldProfileId: string; displayFields: readonly string[]; indexCandidates: readonly string[] }>;
const sort = (directions: readonly CommonQueryDirection[], nulls: "first" | "last" = "last", dbField?: string): QuerySortDefinition => ({ directions, nulls, ...(dbField ? { dbField } : {}) });
const profile = (value: QueryProfile) => value;
export const COMMON_QUERY_PROFILES = Object.freeze({
  products: profile({ id: "dashboard.products.v1", resource: "products", endpoint: "/api/v1/dashboard/products", requiredPermission: "products.read", scope: "global", pagination: "offset", implemented: true, defaultLimit: 25, maxLimit: 100, defaultSort: "createdAt", defaultDirection: "desc", sorts: { createdAt: sort(["asc", "desc"]), name: sort(["asc", "desc"]), status: sort(["asc", "desc"]) }, filters: { status: { type: "enum", multi: true, values: ["draft", "active", "archived"] }, categoryId: { type: "uuid" }, isUncategorized: { type: "boolean" } }, search: { min: 2, max: 100, fields: ["name", "slug", "manufacturerPartNumber", "skuCode"], mode: "exact-prefix" }, summary: false, fieldProfileId: "dashboard.products.safe-list.v1", displayFields: ["id", "slug", "name", "status", "manufacturerPartNumber", "createdAt", "category", "skus"], indexCandidates: ["(createdAt desc,id desc)"] }),
  categories: profile({ id: "dashboard.categories.v1", resource: "categories", endpoint: "/api/v1/dashboard/categories", requiredPermission: "products.read", scope: "global", pagination: "offset", implemented: false, defaultLimit: 50, maxLimit: 100, defaultSort: "sortOrder", defaultDirection: "asc", sorts: { sortOrder: sort(["asc", "desc"]), name: sort(["asc", "desc"]), createdAt: sort(["asc", "desc"]) }, filters: { isActive: { type: "boolean" }, parentId: { type: "uuid" }, isRoot: { type: "boolean" } }, search: { min: 2, max: 100, fields: ["name", "slug"], mode: "exact-prefix" }, summary: false, fieldProfileId: "dashboard.categories.safe-list.v1", displayFields: ["explicit-category-scalars"], indexCandidates: ["(sortOrder,name,id)"] }),
  inventory: profile({ id: "dashboard.inventory-snapshots.v1", resource: "inventory", endpoint: "/api/v1/dashboard/inventory/snapshots", requiredPermission: "inventory.read", scope: "global", pagination: "cursor", implemented: false, defaultLimit: 50, maxLimit: 100, defaultSort: "updatedAt", defaultDirection: "desc", sorts: { updatedAt: sort(["asc", "desc"]) }, filters: { skuId: { type: "uuid" }, dealerLocationId: { type: "uuid" } }, search: false, summary: false, fieldProfileId: "dashboard.inventory.safe-list.v1", displayFields: ["safe-inventory-summary"], indexCandidates: ["(updatedAt,id)", "(dealerLocationId,updatedAt,id)"] }),
  orders: profile({ id: "dashboard.orders.v1", resource: "orders", endpoint: "/api/v1/dashboard/orders", requiredPermission: "orders.read", scope: "global", pagination: "cursor", implemented: false, defaultLimit: 50, maxLimit: 100, defaultSort: "createdAt", defaultDirection: "desc", sorts: { createdAt: sort(["asc", "desc"]) }, filters: { status: { type: "enum", multi: true, values: ["pending_payment", "paid", "processing", "fulfilled", "cancelled", "payment_expired"] }, fulfillment: { type: "enum", values: ["pickup", "delivery"] }, createdFrom: { type: "rfc3339" }, createdTo: { type: "rfc3339" } }, search: false, summary: false, fieldProfileId: "dashboard.orders.safe-list.v1", displayFields: ["safe-order-summary"], indexCandidates: ["(createdAt,id)"] }),
  paymentSessions: profile({ id: "dashboard.payment-sessions.v1", resource: "payment-sessions", endpoint: "/api/v1/dashboard/payment-sessions", requiredPermission: "orders.read", scope: "global", pagination: "cursor", implemented: false, defaultLimit: 50, maxLimit: 100, defaultSort: "createdAt", defaultDirection: "desc", sorts: { createdAt: sort(["asc", "desc"]) }, filters: { status: { type: "enum", multi: true, values: ["pending", "paid", "failed", "expired", "reconciliation_required", "refund_pending", "refund_processing", "refunded", "refund_failed"] }, paymentMethod: { type: "enum", values: ["card", "pos", "cash"] }, fulfillment: { type: "enum", values: ["pickup", "delivery"] }, createdFrom: { type: "rfc3339" }, createdTo: { type: "rfc3339" } }, search: false, summary: false, fieldProfileId: "dashboard.payment-sessions.safe-list.v1", displayFields: ["safe-payment-summary"], indexCandidates: ["(createdAt,id)"] }),
  reconciliation: profile({ id: "dashboard.payment-reconciliation.v1", resource: "payment-reconciliation", endpoint: "/api/v1/dashboard/payment-reconciliation", requiredPermission: "orders.read", scope: "global", pagination: "cursor", implemented: false, defaultLimit: 50, maxLimit: 100, defaultSort: "updatedAt", defaultDirection: "asc", sorts: { updatedAt: sort(["asc"]) }, filters: {}, search: false, summary: false, fieldProfileId: "dashboard.payment-reconciliation.safe-list.v1", displayFields: ["ReconciliationItemSafeV1"], indexCandidates: ["(status,updatedAt,id)"] }),
  crmContacts: profile({ id: "dashboard.crm-contacts.v1", resource: "crm-contacts", endpoint: "/api/v1/dashboard/crm/contacts", requiredPermission: "crm.read", scope: "global", pagination: "offset", implemented: false, defaultLimit: 50, maxLimit: 100, defaultSort: "lastActivityAt", defaultDirection: "desc", sorts: { lastActivityAt: sort(["asc", "desc"]) }, filters: { stage: { type: "enum", multi: true, values: ["registered", "engaged", "checkout_started", "customer", "high_intent", "archived"] }, ownerUserId: { type: "uuid" }, source: { type: "enum", values: ["registration", "contact_form", "guest_checkout"] } }, search: false, summary: false, fieldProfileId: "dashboard.crm-contacts.non-pii-list.v1", displayFields: ["CrmContactListItemV1"], indexCandidates: ["(lastActivityAt,id)"] }),
  dealers: profile({ id: "dashboard.dealers.v1", resource: "dealers", endpoint: "/api/v1/dashboard/dealers", requiredPermission: "dealers.read", scope: "scope-aware", pagination: "cursor", implemented: true, defaultLimit: 25, maxLimit: 100, defaultSort: "recordId", defaultDirection: "asc", sorts: { recordId: sort(["asc"], "last", "id") }, filters: { status: { type: "enum", values: ["active", "inactive"] }, dealerId: { type: "uuid", multi: true, invalidCode: "QUERY_FILTER_UNSUPPORTED" } }, search: { min: 2, max: 100, fields: ["code"], mode: "exact-prefix" }, summary: false, fieldProfileId: "dashboard.dealers.safe-list.v1", displayFields: ["id", "code", "name", "status", "locations"], indexCandidates: [] })
} satisfies Record<string, QueryProfile>);
export type QueryProfileKey = keyof typeof COMMON_QUERY_PROFILES;
export const COMMON_QUERY_ENDPOINT_MANIFEST = Object.freeze(Object.values(COMMON_QUERY_PROFILES).map(({ id, resource, endpoint, pagination, implemented }) => ({ id, resource, endpoint, pagination, implemented })));

export class CommonQueryError extends Error { constructor(public readonly code: CommonQueryErrorCode, message: string, public readonly field?: string, public readonly fieldLabel: "required" | "invalid_type" | "unsupported" | "too_many" | "out_of_range" = "unsupported") { super(message); } }
const fail = (code: CommonQueryErrorCode, message: string, field?: string, label?: CommonQueryError["fieldLabel"]): never => { throw new CommonQueryError(code, message, field, label); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SCALAR_KEYS = new Set(["queryVersion", "limit", "offset", "after", "sort", "direction", "q", "includeSummary", "before", "last", "page", "pageSize"]);

export function rawCommonQueryParams(input: URLSearchParams | string): RawCommonQueryParams {
  const encoded = typeof input === "string" ? input.replace(/^\?/, "") : input.toString();
  const grouped: Record<string, string[]> = {};
  for (const [key, value] of new URLSearchParams(encoded)) (grouped[key] ??= []).push(value);
  return Object.freeze(Object.fromEntries(Object.entries(grouped).map(([key, values]) => [key, Object.freeze(values)])));
}
export function commonQueryMode(input: URLSearchParams | string): "legacy" | "strict" { return rawCommonQueryParams(input).queryVersion ? "strict" : "legacy"; }
export function literalLikePrefix(normalizedQuery: string) { return `${normalizedQuery.replace(/[\\%_]/g, (character) => `\\${character}`)}%`; }
export function enforceCommonQuerySize(input: URLSearchParams | string) {
  const encoded = typeof input === "string" ? input.replace(/^\?/, "") : input.toString();
  if (Buffer.byteLength(encoded) > COMMON_QUERY_LIMITS.queryStringBytes) fail("QUERY_TOO_COMPLEX", "Query string is too large.");
}
export function asciiExactOrPrefix(value: string | null | undefined, normalizedQuery: string) {
  if (typeof value !== "string" || !/^[\x20-\x7e]*$/.test(value)) return false;
  const normalized = value.replace(/[A-Z]/g, (character) => character.toLowerCase());
  return normalized === normalizedQuery || normalized.startsWith(normalizedQuery);
}
function structuralValidate(profile: QueryProfile, grouped: RawCommonQueryParams) {
  for (const [key, values] of Object.entries(grouped)) if ((SCALAR_KEYS.has(key) || (key in profile.filters && !profile.filters[key]!.multi)) && values.length > 1) fail("QUERY_INVALID", "A scalar query field was repeated.", key, "too_many");
  const legacyPagination = Boolean(grouped.page || grouped.pageSize);
  const strictPagination = Boolean(grouped.limit || grouped.offset || grouped.after || grouped.before || grouped.last);
  if ((legacyPagination && strictPagination) || grouped.before || grouped.last || (profile.pagination === "offset" ? grouped.after : grouped.offset)) fail("QUERY_INVALID", "Pagination modes cannot be mixed.");
}
function integer(values: readonly string[] | undefined, name: string, fallback: number, min: number, max: number) {
  if (!values?.length) return fallback;
  if (!/^\d+$/.test(values[0]!)) fail("QUERY_INVALID", `${name} must be an integer.`, name, "invalid_type");
  const value = Number(values[0]);
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(name === "offset" && value > max ? "QUERY_DEPTH_EXCEEDED" : "QUERY_INVALID", `${name} is out of range.`, name, "out_of_range");
  return value;
}
function normalizeFilter(definition: QueryFilterDefinition, raw: readonly string[], key: string): string | readonly string[] | boolean {
  if (raw.length > COMMON_QUERY_LIMITS.maxMultiValues) fail("QUERY_TOO_COMPLEX", `${key} has too many values.`, key, "too_many");
  const values = raw.map((value) => value.trim().normalize("NFC"));
  if (values.some((value) => !value)) fail("QUERY_INVALID", `${key} cannot be empty.`, key, "required");
  for (const value of values) {
    if (definition.type === "uuid" && !UUID.test(value)) fail(definition.invalidCode ?? "QUERY_INVALID", `${key} is unsupported.`, key, definition.invalidCode ? "unsupported" : "invalid_type");
    if (definition.type === "boolean" && value !== "true" && value !== "false") fail("QUERY_INVALID", `${key} must be true or false.`, key, "invalid_type");
    if (definition.type === "enum" && !definition.values?.includes(value)) fail("QUERY_FILTER_UNSUPPORTED", `${key} has an unsupported value.`, key, "unsupported");
    if (definition.type === "rfc3339" && (!RFC3339.test(value) || Number.isNaN(Date.parse(value)))) fail("QUERY_INVALID", `${key} must be RFC3339.`, key, "invalid_type");
  }
  const canonical = [...new Set(values.map((value) => definition.type === "uuid" ? value.toLowerCase() : value))].sort();
  if (definition.multi) return Object.freeze(canonical);
  return definition.type === "boolean" ? canonical[0] === "true" : canonical[0]!;
}
function normalizeSearch(raw: string, profile: QueryProfile) {
  if (profile.search === false) fail("QUERY_SEARCH_UNSUPPORTED", "Search is not supported.", "q", "unsupported");
  const search = profile.search as Exclude<QueryProfile["search"], false>;
  const normalized = raw.trim().normalize("NFC");
  if (!/^[\x20-\x7e]+$/.test(normalized)) fail("QUERY_SEARCH_UNSUPPORTED", "Search contains unsupported characters.", "q", "unsupported");
  if (normalized.length < search.min || normalized.length > search.max) fail("QUERY_INVALID", "q length is invalid.", "q", "out_of_range");
  return normalized.replace(/[A-Z]/g, (character) => character.toLowerCase());
}
export function parseCommonQueryStructure(profile: QueryProfile, input: URLSearchParams | string) {
  const grouped = rawCommonQueryParams(input);
  if (!grouped.queryVersion) fail("QUERY_VERSION_UNSUPPORTED", "Explicit common query version is required.", "queryVersion", "required");
  structuralValidate(profile, grouped);
  if (grouped.queryVersion[0] !== COMMON_QUERY_VERSION) fail("QUERY_VERSION_UNSUPPORTED", "Unsupported common query contract version.", "queryVersion", "unsupported");
  return grouped;
}
export function parseCommonQuery(profile: QueryProfile, input: URLSearchParams | string, options: { deferSize?: boolean } = {}): CommonOffsetQueryV1<Record<string, unknown>> | CommonCursorQueryV1<Record<string, unknown>> {
  const grouped = parseCommonQueryStructure(profile, input);
  const known = new Set(["queryVersion", "limit", "sort", "direction", "q", "includeSummary", ...(profile.pagination === "offset" ? ["offset"] : ["after"]), ...Object.keys(profile.filters)]);
  const unknown = Object.keys(grouped).find((key) => !known.has(key));
  const limit = integer(grouped.limit, "limit", profile.defaultLimit, 1, profile.maxLimit);
  if (unknown) fail("QUERY_FILTER_UNSUPPORTED", "Unsupported query field.", unknown, "unsupported");
  const filterKeys = Object.keys(grouped).filter((key) => key in profile.filters);
  if (filterKeys.length > COMMON_QUERY_LIMITS.maxFilterKeys) fail("QUERY_TOO_COMPLEX", "Too many filters.");
  const filters = Object.freeze(Object.fromEntries(filterKeys.sort().map((key) => [key, normalizeFilter(profile.filters[key]!, grouped[key]!, key)])));
  const sortKey = grouped.sort?.[0] ?? profile.defaultSort;
  if (!profile.sorts[sortKey]) fail("QUERY_SORT_INVALID", "Unsupported sort.", "sort", "unsupported");
  const direction = (grouped.direction?.[0] ?? profile.defaultDirection) as CommonQueryDirection;
  if (!profile.sorts[sortKey]!.directions.includes(direction)) fail("QUERY_SORT_INVALID", "Unsupported sort direction.", "direction", "unsupported");
  const q = grouped.q ? normalizeSearch(grouped.q[0]!, profile) : undefined;
  if (grouped.includeSummary && grouped.includeSummary[0] !== "true" && grouped.includeSummary[0] !== "false") fail("QUERY_INVALID", "includeSummary must be true or false.", "includeSummary", "invalid_type");
  if (grouped.includeSummary?.[0] === "true" && !profile.summary) fail("QUERY_FILTER_UNSUPPORTED", "Summary is unsupported.", "includeSummary", "unsupported");
  if (typeof filters.createdFrom === "string" && typeof filters.createdTo === "string") {
    const from = Date.parse(filters.createdFrom), to = Date.parse(filters.createdTo);
    if (from >= to) fail("QUERY_INVALID", "createdFrom must be before createdTo.", "createdTo", "out_of_range");
    if (to - from > COMMON_QUERY_LIMITS.defaultMaxDateSpanDays * 86_400_000) fail("QUERY_TOO_COMPLEX", "Date range is too large.", "createdTo", "out_of_range");
  }
  const base = Object.freeze({ queryVersion: COMMON_QUERY_VERSION, limit, sort: sortKey, direction, ...(q ? { q } : {}), includeSummary: false as const, filters });
  if (profile.pagination === "offset") {
    const result = Object.freeze({ ...base, offset: integer(grouped.offset, "offset", 0, 0, COMMON_QUERY_LIMITS.maxOffset) });
    if (!options.deferSize) enforceCommonQuerySize(input);
    return result;
  }
  if (grouped.after?.[0]?.trim() === "") fail("QUERY_INVALID", "after is invalid.", "after", "required");
  const result = Object.freeze({ ...base, ...(grouped.after?.[0] ? { after: grouped.after[0] } : {}) });
  if (!options.deferSize) enforceCommonQuerySize(input);
  return result;
}

export function canonicalOrder(profile: QueryProfile, query: CommonOffsetQueryV1 | CommonCursorQueryV1): CommonQuerySort[] {
  const definition = profile.sorts[query.sort]!;
  const primary = { field: query.sort, direction: query.direction, nulls: definition.nulls };
  return definition.dbField === "id" ? [primary] : [primary, { field: "id", direction: query.direction, nulls: definition.nulls }];
}
export function jcsCanonicalize(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") { if (!Number.isSafeInteger(value)) throw new Error("JCS numbers must be safe integers."); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(jcsCanonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).filter(([, child]) => child !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => `${JSON.stringify(key)}:${jcsCanonicalize(child)}`).join(",")}}`;
  throw new Error("Value is not JSON-compatible.");
}
export function domainFingerprint(domain: string, value: unknown) { return createHash("sha256").update(domain, "ascii").update(Buffer.from([0])).update(jcsCanonicalize(value), "utf8").digest("base64url"); }
export function queryFingerprint(profile: QueryProfile, query: CommonOffsetQueryV1 | CommonCursorQueryV1) { return domainFingerprint("vanstro:cq:query:v1", { resource: profile.resource, profileVersion: profile.id, filters: query.filters, search: query.q ?? null, sort: query.sort, direction: query.direction, limit: query.limit, includeSummary: query.includeSummary }); }
export function grantFingerprint(grant: { permissionKey: string; global: boolean; dealerIds: readonly string[]; locationIds: readonly string[] }) { return domainFingerprint("vanstro:cq:grant:v1", { permissionKey: grant.permissionKey, global: grant.global, sortedDealerIds: [...grant.dealerIds].sort(), sortedLocationIds: [...grant.locationIds].sort() }); }
export function fieldProfileFingerprint(profile: QueryProfile) { return domainFingerprint("vanstro:cq:field-profile:v1", { profileId: profile.fieldProfileId, profileVersion: profile.id, display: profile.displayFields, search: profile.search, filters: profile.filters, sorts: profile.sorts, summary: profile.summary }); }

export type CursorKeyEntry = Readonly<{ kid: string; key: Buffer; mode: "active" | "decrypt-only" }>;
export type CursorKeyset = Readonly<{ activeKid: string; keys: readonly CursorKeyEntry[] }>;
const KID = /^[A-Za-z0-9_-]{1,32}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
function decodeCanonicalBase64(value: string) { if (!BASE64.test(value) && !BASE64URL.test(value)) throw new Error("Invalid key encoding."); const decoded = Buffer.from(value, BASE64URL.test(value) ? "base64url" : "base64"); const standard = decoded.toString("base64"), unpadded = standard.replace(/=+$/, ""); if (value !== standard && value !== unpadded && value !== decoded.toString("base64url")) throw new Error("Non-canonical key encoding."); return decoded; }
export function parseCursorKeyset(value: string): CursorKeyset {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid cursor keyset.");
  const root = parsed as Record<string, unknown>;
  if (Object.keys(root).sort().join() !== "activeKid,keys" || typeof root.activeKid !== "string" || !Array.isArray(root.keys) || root.keys.length < 1 || root.keys.length > 4) throw new Error("Invalid cursor keyset.");
  const entries = root.keys.map((item) => { if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid cursor keyset."); const record = item as Record<string, unknown>; if (Object.keys(record).sort().join() !== "key,kid,mode" || typeof record.kid !== "string" || !KID.test(record.kid) || typeof record.key !== "string" || (record.mode !== "active" && record.mode !== "decrypt-only")) throw new Error("Invalid cursor keyset."); const key = decodeCanonicalBase64(record.key); if (key.length !== 32) throw new Error("Invalid cursor keyset."); return Object.freeze({ kid: record.kid, key, mode: record.mode }); });
  if (!KID.test(root.activeKid) || new Set(entries.map(({ kid }) => kid)).size !== entries.length || entries.filter(({ mode }) => mode === "active").length !== 1 || entries.find(({ mode }) => mode === "active")?.kid !== root.activeKid) throw new Error("Invalid cursor keyset.");
  return Object.freeze({ activeKid: root.activeKid, keys: Object.freeze(entries) });
}
export type CursorPayloadV1 = { v: 1; resource: string; profileVersion: string; permissionKey: string; actorId: string; contextRevision: string; grantFingerprint: string; fieldProfileHash: string; queryHash: string; order: CommonQuerySort[]; position: Array<string | number | boolean | null>; issuedAt: number; expiresAt: number };
export type CursorBindings = Omit<CursorPayloadV1, "v" | "position" | "issuedAt" | "expiresAt">;
export type CursorCodec = ReturnType<typeof createCursorCodec>;
const INVALID_CURSOR = () => new CommonQueryError("CURSOR_INVALID", "Cursor is invalid.", "after", "unsupported");
const PAYLOAD_KEYS = ["actorId", "contextRevision", "expiresAt", "fieldProfileHash", "grantFingerprint", "issuedAt", "order", "permissionKey", "position", "profileVersion", "queryHash", "resource", "v"];
function aad(kid: string) { return Buffer.from(`vanstro-dashboard-common-query-cursor\0cq1\0A256GCM\0${kid}`, "ascii"); }
function strictBase64url(value: string, length?: number) { if (!BASE64URL.test(value) || value.includes("=")) throw INVALID_CURSOR(); const decoded = Buffer.from(value, "base64url"); if (decoded.toString("base64url") !== value || (length !== undefined && decoded.length !== length)) throw INVALID_CURSOR(); return decoded; }
export function createCursorCodec(keysetOrKey: CursorKeyset | Buffer | Uint8Array, options: { now?: () => number; randomBytes?: (size: number) => Buffer } = {}) {
  const keyset = Buffer.isBuffer(keysetOrKey) || keysetOrKey instanceof Uint8Array ? Object.freeze({ activeKid: "test", keys: Object.freeze([{ kid: "test", key: Buffer.from(keysetOrKey), mode: "active" as const }]) }) : keysetOrKey;
  for (const entry of keyset.keys) if (entry.key.length !== 32) throw new Error("Cursor key must be exactly 32 bytes.");
  const now = options.now ?? Date.now, nonceSource = options.randomBytes ?? randomBytes;
  return {
    seal(bindings: CursorBindings, position: CursorPayloadV1["position"]): string {
      const active = keyset.keys.find(({ kid }) => kid === keyset.activeKid && keyset.keys.find((entry) => entry.kid === kid)?.mode === "active"); if (!active) throw new Error("Active cursor key missing.");
      const issuedAt = now(); if (!Number.isSafeInteger(issuedAt)) throw new Error("Invalid clock.");
      const payload: CursorPayloadV1 = { v: 1, ...bindings, position, issuedAt, expiresAt: issuedAt + 900_000 };
      const plaintext = Buffer.from(jcsCanonicalize(payload), "utf8"), nonce = nonceSource(12); if (nonce.length !== 12) throw new Error("Cursor nonce must be 12 bytes.");
      const cipher = createCipheriv("aes-256-gcm", active.key, nonce, { authTagLength: 16 }); cipher.setAAD(aad(active.kid));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return `cq1.${active.kid}.${nonce.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
    },
    open(token: string, expected: Partial<CursorBindings>): CursorPayloadV1 {
      try {
        const segments = token.split("."); if (segments.length !== 5 || segments[0] !== "cq1" || !KID.test(segments[1]!)) throw INVALID_CURSOR();
        const kid = segments[1]!, key = keyset.keys.find((entry) => entry.kid === kid); if (!key) throw INVALID_CURSOR();
        const nonce = strictBase64url(segments[2]!, 12), ciphertext = strictBase64url(segments[3]!); if (ciphertext.length < 1 || ciphertext.length > 4096) throw INVALID_CURSOR(); const tag = strictBase64url(segments[4]!, 16);
        const decipher = createDecipheriv("aes-256-gcm", key.key, nonce, { authTagLength: 16 }); decipher.setAAD(aad(kid)); decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"); const payload = JSON.parse(plaintext) as CursorPayloadV1;
        if (jcsCanonicalize(payload) !== plaintext || Object.keys(payload).sort().join() !== PAYLOAD_KEYS.join()) throw INVALID_CURSOR();
        const current = now(); if (payload.v !== 1 || !Number.isSafeInteger(payload.issuedAt) || !Number.isSafeInteger(payload.expiresAt) || payload.expiresAt !== payload.issuedAt + 900_000 || payload.issuedAt > current + 60_000 || current >= payload.expiresAt || !Array.isArray(payload.position) || payload.order.length !== payload.position.length || payload.position.length < 1) throw INVALID_CURSOR();
        const actual = Buffer.from(jcsCanonicalize(Object.fromEntries(Object.keys(expected).map((name) => [name, payload[name as keyof CursorPayloadV1]])))); const wanted = Buffer.from(jcsCanonicalize(expected)); if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) throw INVALID_CURSOR();
        return payload;
      } catch (error) { if (error instanceof CommonQueryError) throw error; throw INVALID_CURSOR(); }
    }
  };
}
export function formatOffsetMeta(input: { requestId: string; profile: QueryProfile; query: CommonOffsetQueryV1; total: number; capturedAt: string }) { return { requestId: input.requestId, queryContractVersion: COMMON_QUERY_VERSION, pagination: { mode: "offset" as const, limit: input.query.limit, offset: input.query.offset, hasNext: input.query.offset + input.query.limit < input.total, hasPrevious: input.total > 0 && input.query.offset > 0 }, sort: canonicalOrder(input.profile, input.query), total: { value: input.total, relation: "exact" as const, capturedAt: input.capturedAt }, snapshot: { consistency: "transaction" as const, capturedAt: input.capturedAt }, visibility: { profileId: input.profile.fieldProfileId } }; }
export function formatCursorMeta(input: { requestId: string; profile: QueryProfile; query: CommonCursorQueryV1; capturedAt: string; hasMore: boolean; nextCursor?: string }) { return { requestId: input.requestId, queryContractVersion: COMMON_QUERY_VERSION, pagination: { mode: "cursor" as const, limit: input.query.limit, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}), hasMore: input.hasMore }, sort: canonicalOrder(input.profile, input.query), snapshot: { consistency: "statement" as const, capturedAt: input.capturedAt }, visibility: { profileId: input.profile.fieldProfileId } }; }
