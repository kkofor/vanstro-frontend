import {
  COMMON_QUERY_VERSION,
  type CommonCursorResultV1,
  type CommonOffsetResultV1
} from "../api/api-contract.ts";

export const DASHBOARD_QUERY_PAGE_SIZE = 25;
const PRODUCT_STATUSES = new Set(["draft", "active", "archived"]);
const DEALER_STATUSES = new Set(["active", "inactive"]);
const PRODUCT_SORTS = new Set(["createdAt", "name", "status"]);
const DIRECTIONS = new Set(["asc", "desc"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProductQueryState = {
  resource: "products";
  q: string;
  productStatus: "" | "draft" | "active" | "archived";
  categoryId: string;
  sort: "createdAt" | "name" | "status";
  direction: "asc" | "desc";
  page: number;
};

export type DealerQueryState = {
  resource: "dealers";
  q: string;
  dealerStatus: "" | "active" | "inactive";
};

export type DashboardP03QueryState = ProductQueryState | DealerQueryState;
export type DashboardP03ParseResult =
  | { kind: "not-p03" }
  | { kind: "invalid"; message: string }
  | { kind: "valid"; state: DashboardP03QueryState; canonicalHref: string; hasStrictState: boolean };

function occurrences(search: string) {
  const result = new Map<string, string[]>();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const [key, value] of params) result.set(key, [...(result.get(key) ?? []), value]);
  return result;
}

function scalar(map: Map<string, string[]>, key: string) {
  const values = map.get(key) ?? [];
  if (values.length > 1) throw new TypeError(`查询参数 ${key} 不能重复。`);
  return values[0];
}

function normalizedSearch(value: string | undefined) {
  const normalized = value?.trim().normalize("NFC") ?? "";
  if (normalized && (normalized.length < 2 || normalized.length > 100 || /[^\x20-\x7e]/.test(normalized))) {
    throw new TypeError("搜索词必须为 2–100 个 ASCII 字符。");
  }
  return normalized;
}

function canonicalPath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function parseDashboardP03Location(pathname: string, search: string): DashboardP03ParseResult {
  const path = canonicalPath(pathname);
  const resource = path === "/dashboard/products" || path === "/fr/dashboard/products"
    ? "products"
    : path === "/dashboard/dealers" || path === "/fr/dashboard/dealers"
      ? "dealers"
      : null;
  if (!resource) return { kind: "not-p03" };
  try {
    const map = occurrences(search);
    const allowed = resource === "products"
      ? new Set(["q", "productStatus", "categoryId", "sort", "direction", "page"])
      : new Set(["q", "dealerStatus", "dealerId"]);
    if ([...map.keys()].some((key) => !allowed.has(key))) throw new TypeError("页面包含不支持的查询参数。");
    if (map.has("status") || map.has("queryVersion") || map.has("offset") || map.has("after") || map.has("limit")) {
      throw new TypeError("页面 URL 不接受 API 专用查询参数。");
    }
    const q = normalizedSearch(scalar(map, "q"));
    if (resource === "products") {
      if (map.has("dealerStatus")) throw new TypeError("产品页面不接受 Dealer 筛选参数。");
      const status = scalar(map, "productStatus") ?? "";
      const categoryId = scalar(map, "categoryId") ?? "";
      const sort = scalar(map, "sort") ?? "createdAt";
      const direction = scalar(map, "direction") ?? "desc";
      const pageValue = scalar(map, "page") ?? "1";
      if (status && !PRODUCT_STATUSES.has(status)) throw new TypeError("产品状态筛选无效。");
      if (categoryId && !UUID.test(categoryId)) throw new TypeError("产品分类筛选无效。");
      if (!PRODUCT_SORTS.has(sort) || !DIRECTIONS.has(direction)) throw new TypeError("产品排序无效。");
      if (!/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(Number(pageValue))) throw new TypeError("页码无效。");
      const state: ProductQueryState = { resource, q, productStatus: status as ProductQueryState["productStatus"], categoryId: categoryId.toLowerCase(), sort: sort as ProductQueryState["sort"], direction: direction as ProductQueryState["direction"], page: Number(pageValue) };
      const params = new URLSearchParams();
      if (state.q) params.set("q", state.q);
      if (state.productStatus) params.set("productStatus", state.productStatus);
      if (state.categoryId) params.set("categoryId", state.categoryId);
      if (state.sort !== "createdAt") params.set("sort", state.sort);
      if (state.direction !== "desc") params.set("direction", state.direction);
      if (state.page > 1) params.set("page", String(state.page));
      const serialized = params.toString();
      return { kind: "valid", state, canonicalHref: serialized ? `${path}?${serialized}` : path, hasStrictState: Boolean(serialized) };
    }
    if (map.has("productStatus") || map.has("categoryId") || map.has("sort") || map.has("direction") || map.has("page")) throw new TypeError("Dealer 页面查询参数无效。");
    if (map.has("dealerId")) throw new TypeError("Dealer ID 目前不支持作为页面筛选条件。");
    const status = scalar(map, "dealerStatus") ?? "";
    if (status && !DEALER_STATUSES.has(status)) throw new TypeError("Dealer 状态筛选无效。");
    const state: DealerQueryState = { resource, q, dealerStatus: status as DealerQueryState["dealerStatus"] };
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.dealerStatus) params.set("dealerStatus", state.dealerStatus);
    const serialized = params.toString();
    return { kind: "valid", state, canonicalHref: serialized ? `${path}?${serialized}` : path, hasStrictState: Boolean(serialized) };
  } catch (error) {
    return { kind: "invalid", message: error instanceof Error ? error.message : "查询参数无效。" };
  }
}

export function productQueryHref(pathname: string, state: ProductQueryState) {
  return parseDashboardP03Location(pathname, new URLSearchParams({
    ...(state.q ? { q: state.q } : {}),
    ...(state.productStatus ? { productStatus: state.productStatus } : {}),
    ...(state.categoryId ? { categoryId: state.categoryId } : {}),
    ...(state.sort !== "createdAt" ? { sort: state.sort } : {}),
    ...(state.direction !== "desc" ? { direction: state.direction } : {}),
    ...(state.page > 1 ? { page: String(state.page) } : {})
  }).toString());
}

export function strictProductApiPath(state: ProductQueryState) {
  const params = new URLSearchParams();
  params.set("queryVersion", COMMON_QUERY_VERSION);
  params.set("limit", String(DASHBOARD_QUERY_PAGE_SIZE));
  params.set("offset", String((state.page - 1) * DASHBOARD_QUERY_PAGE_SIZE));
  params.set("sort", state.sort);
  params.set("direction", state.direction);
  params.set("includeSummary", "false");
  if (state.q) params.set("q", state.q);
  if (state.productStatus) params.append("status", state.productStatus);
  if (state.categoryId) params.set("categoryId", state.categoryId);
  return `/dashboard/products?${params}`;
}

export function strictDealerApiPath(state: DealerQueryState, after?: string) {
  const params = new URLSearchParams();
  params.set("queryVersion", COMMON_QUERY_VERSION);
  params.set("limit", String(DASHBOARD_QUERY_PAGE_SIZE));
  params.set("sort", "recordId");
  params.set("direction", "asc");
  params.set("includeSummary", "false");
  if (state.q) params.set("q", state.q);
  if (state.dealerStatus) params.set("status", state.dealerStatus);
  if (after) params.set("after", after);
  return `/dashboard/dealers?${params}`;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} 必须是对象。`);
  return value as Record<string, unknown>;
}

function validateCommonMeta(value: unknown, mode: "offset" | "cursor", expectedProfileId: string) {
  const meta = record(value, "meta");
  if (typeof meta.requestId !== "string" || meta.queryContractVersion !== COMMON_QUERY_VERSION) throw new TypeError("查询响应版本无效。");
  const pagination = record(meta.pagination, "meta.pagination");
  if (pagination.mode !== mode || !Number.isInteger(pagination.limit) || (pagination.limit as number) < 1) throw new TypeError("查询分页信息无效。");
  if (!Array.isArray(meta.sort) || !meta.sort.length || meta.sort.some((entry) => {
    const sort = record(entry, "meta.sort[]");
    return typeof sort.field !== "string" || !DIRECTIONS.has(String(sort.direction)) || (sort.nulls !== "first" && sort.nulls !== "last");
  })) throw new TypeError("查询排序信息无效。");
  const snapshot = record(meta.snapshot, "meta.snapshot");
  if (typeof snapshot.capturedAt !== "string" || !Number.isFinite(Date.parse(snapshot.capturedAt))) throw new TypeError("查询快照时间无效。");
  const visibility = record(meta.visibility, "meta.visibility");
  if (visibility.profileId !== expectedProfileId) throw new TypeError("查询字段可见性无效。");
  return { meta, pagination, capturedAt: snapshot.capturedAt as string };
}

export function validateCommonOffsetResult<T>(value: unknown, validateItem?: (value: unknown) => boolean): CommonOffsetResultV1<T> {
  const result = record(value, "result");
  if (!Array.isArray(result.data) || (validateItem && !result.data.every(validateItem))) throw new TypeError("查询数据无效。");
  const { meta, pagination, capturedAt } = validateCommonMeta(result.meta, "offset", "dashboard.products.safe-list.v1");
  if (!Number.isInteger(pagination.offset) || (pagination.offset as number) < 0 || typeof pagination.hasNext !== "boolean" || typeof pagination.hasPrevious !== "boolean") throw new TypeError("Offset 分页信息无效。");
  const total = record(meta.total, "meta.total");
  if (!Number.isInteger(total.value) || (total.value as number) < 0 || total.relation !== "exact" || total.capturedAt !== capturedAt) throw new TypeError("查询总数无效。");
  return value as CommonOffsetResultV1<T>;
}

export function validateCommonCursorResult<T>(value: unknown, validateItem?: (value: unknown) => boolean): CommonCursorResultV1<T> {
  const result = record(value, "result");
  if (!Array.isArray(result.data) || (validateItem && !result.data.every(validateItem))) throw new TypeError("查询数据无效。");
  const { pagination } = validateCommonMeta(result.meta, "cursor", "dashboard.dealers.safe-list.v1");
  if (typeof pagination.hasMore !== "boolean" || (pagination.nextCursor !== undefined && typeof pagination.nextCursor !== "string")) throw new TypeError("Cursor 分页信息无效。");
  if (pagination.hasMore && !pagination.nextCursor) throw new TypeError("Cursor 下一页信息缺失。");
  return value as CommonCursorResultV1<T>;
}

export function isStrictProduct(value: unknown): value is { id: string; slug: string; name: string; status: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.slug === "string" && typeof item.name === "string" && typeof item.status === "string";
}

export function isStrictDealer(value: unknown): value is { id: string; code: string; name: string; status: string; locations: unknown[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.code === "string" && typeof item.name === "string" && typeof item.status === "string" && Array.isArray(item.locations);
}

export function isCommonQueryFresh(capturedAt: string, now = Date.now()) {
  const captured = Date.parse(capturedAt);
  return Number.isFinite(captured) && now < captured + 60_000;
}

export function classifyOffsetResult(input: { rows: readonly unknown[]; total: number; offset: number; filtered: boolean }) {
  if (input.rows.length) return "ready" as const;
  if (input.total > 0 && input.offset >= input.total) return "out-of-range" as const;
  return input.filtered ? "filtered-empty" as const : "empty" as const;
}

export function classifyCursorResult(input: { rows: readonly unknown[]; after?: string; filtered: boolean }) {
  if (input.rows.length) return "ready" as const;
  if (input.after) return "exhausted" as const;
  return input.filtered ? "filtered-empty" as const : "empty" as const;
}
