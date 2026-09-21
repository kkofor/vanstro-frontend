export const P10_RELEASE_PREFIX = "/dashboard/analytics/releases" as const;
export const P10_CELL_KEYS = ["complement", "denominator", "engage", "numerator", "rate", "view"] as const;
export type P10CellKey = typeof P10_CELL_KEYS[number];
export type P10View = "overview" | "release" | "readiness";
export type P10Location =
  | { kind: "not-analytics" }
  | { kind: "invalid"; message: string; clearHref: string }
  | { kind: "valid"; view: P10View; releaseDay?: string; canonicalHref: string };
export type AnalyticsReleaseCell = {
  cellKey: P10CellKey;
  state: "empty" | "suppressed" | "published";
  valueKind: "count" | "rate";
  publishedValue: number | null;
};
export type AnalyticsReleaseFamily = {
  releaseId: string;
  releaseDay: string;
  metricDefinitionVersion: string;
  identityEpoch: string;
  suppressionPolicyVersion: string;
  fieldVisibilityProfile: string;
  status: "empty" | "suppressed" | "published";
  completeness: "sealed" | "late_excluded" | "incomplete";
  cells: AnalyticsReleaseCell[];
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}无效。`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: readonly string[], label: string) {
  if (Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key))) throw new TypeError(`${label}包含未知或缺失字段。`);
}
function boundedText(value: unknown, label: string) {
  if (typeof value !== "string" || !value || value.length > 128) throw new TypeError(`${label}无效。`);
  return value;
}
function isReleaseDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function parseP10Location(pathname: string, search: string): P10Location {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path !== "/dashboard/analytics-foundation" && path !== "/fr/dashboard/analytics-foundation") return { kind: "not-analytics" };
  const clearHref = `${path}?view=overview`;
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    for (const key of params.keys()) if (!new Set(["view", "releaseDay"]).has(key) || params.getAll(key).length !== 1) throw new TypeError("Analytics参数无效。");
    const view = (params.get("view") ?? "overview") as P10View;
    if (!new Set<P10View>(["overview", "release", "readiness"]).has(view)) throw new TypeError("Analytics视图无效。");
    const releaseDay = params.get("releaseDay") ?? undefined;
    if ((view === "release") !== Boolean(releaseDay) || releaseDay && !isReleaseDay(releaseDay)) throw new TypeError("必须提供有效的UTC发布日。");
    const query = new URLSearchParams({ view });
    if (releaseDay) query.set("releaseDay", releaseDay);
    return { kind: "valid", view, ...(releaseDay ? { releaseDay } : {}), canonicalHref: `${path}?${query}` };
  } catch (error) {
    return { kind: "invalid", message: error instanceof Error ? error.message : "Analytics参数无效。", clearHref };
  }
}

export function p10Href(pathname: string, view: P10View, releaseDay?: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const query = new URLSearchParams({ view });
  if (view === "release") {
    if (!isReleaseDay(releaseDay)) throw new TypeError("UTC发布日无效。");
    query.set("releaseDay", releaseDay);
  }
  return `${path}?${query}`;
}

function validateCell(item: unknown, index: number): AnalyticsReleaseCell {
  const cell = record(item, "Analytics发布单元");
  exact(cell, ["cellKey", "state", "valueKind", "publishedValue"], "Analytics发布单元");
  const expectedKey = P10_CELL_KEYS[index];
  if (cell.cellKey !== expectedKey || !new Set(["empty", "suppressed", "published"]).has(cell.state as string) || !new Set(["count", "rate"]).has(cell.valueKind as string)) throw new TypeError("Analytics发布单元无效。");
  const published = cell.state === "published";
  if (published ? typeof cell.publishedValue !== "number" || !Number.isFinite(cell.publishedValue) || cell.publishedValue < 0 : cell.publishedValue !== null) throw new TypeError("Analytics发布单元隐私状态无效。");
  if ((cell.cellKey === "rate") !== (cell.valueKind === "rate")) throw new TypeError("Analytics发布单元值类型无效。");
  return cell as AnalyticsReleaseCell;
}

export function validateReleaseFamilies(value: unknown, expectedReleaseDay?: string): AnalyticsReleaseFamily[] {
  const envelope = record(value, "Analytics发布响应");
  exact(envelope, ["data"], "Analytics发布响应");
  if (!Array.isArray(envelope.data)) throw new TypeError("Analytics发布集合无效。");
  const families = envelope.data.map((item): AnalyticsReleaseFamily => {
    const family = record(item, "Analytics发布family");
    exact(family, ["releaseId", "releaseDay", "metricDefinitionVersion", "identityEpoch", "suppressionPolicyVersion", "fieldVisibilityProfile", "status", "completeness", "cells"], "Analytics发布family");
    if (!isReleaseDay(family.releaseDay) || expectedReleaseDay && family.releaseDay !== expectedReleaseDay || !new Set(["empty", "suppressed", "published"]).has(family.status as string) || !new Set(["sealed", "late_excluded", "incomplete"]).has(family.completeness as string) || !Array.isArray(family.cells) || family.cells.length !== P10_CELL_KEYS.length) throw new TypeError("Analytics发布family契约无效。");
    const cells = family.cells.map(validateCell);
    return {
      releaseId: boundedText(family.releaseId, "发布ID"),
      releaseDay: family.releaseDay,
      metricDefinitionVersion: boundedText(family.metricDefinitionVersion, "指标版本"),
      identityEpoch: boundedText(family.identityEpoch, "身份epoch"),
      suppressionPolicyVersion: boundedText(family.suppressionPolicyVersion, "抑制策略版本"),
      fieldVisibilityProfile: boundedText(family.fieldVisibilityProfile, "字段可见性档案"),
      status: family.status as AnalyticsReleaseFamily["status"],
      completeness: family.completeness as AnalyticsReleaseFamily["completeness"],
      cells
    };
  });
  const sorted = [...families].sort((a, b) => a.metricDefinitionVersion.localeCompare(b.metricDefinitionVersion) || a.identityEpoch.localeCompare(b.identityEpoch) || a.suppressionPolicyVersion.localeCompare(b.suppressionPolicyVersion) || a.fieldVisibilityProfile.localeCompare(b.fieldVisibilityProfile) || a.releaseId.localeCompare(b.releaseId));
  if (families.some((family, index) => family !== sorted[index])) throw new TypeError("Analytics发布family顺序无效。");
  return families;
}
