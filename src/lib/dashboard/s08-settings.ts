import {
  API_SERVICE_ACCOUNT_DESCRIPTOR_KEY,
  API_SERVICE_ACCOUNT_SCHEMA_VERSION,
  type ApiServiceAccountsValueV1,
  type S08ConsumerReadiness,
  type S08Draft,
  type S08HistoryEntry,
  type S08Publication,
  type S08Readiness,
  type S08SafeDiff,
  type S08ValidationResult,
  type SettingsLifecycleStatus
} from "../api/api-contract.ts";
import type { SiteLocale } from "@/lib/i18n/locale";

export const S08_PAGE_ROUTES = { apiServiceAccounts: "/dashboard/settings/api-service-accounts" } as const;
export type S08Page = keyof typeof S08_PAGE_ROUTES;
export type S08Location = { kind: "not-s08" } | { kind: "valid"; page: S08Page; canonicalHref: string };

function localePrefix(locale: SiteLocale) { return locale === "fr-CA" ? "/fr" : ""; }
export function s08PageHref(page: S08Page, locale: SiteLocale) { return `${localePrefix(locale)}${S08_PAGE_ROUTES[page]}`; }
export function parseS08Location(pathname: string): S08Location {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const french = normalized === `/fr${S08_PAGE_ROUTES.apiServiceAccounts}`;
  const route = french ? normalized.slice(3) : normalized;
  if (route !== S08_PAGE_ROUTES.apiServiceAccounts) return { kind: "not-s08" };
  return { kind: "valid", page: "apiServiceAccounts", canonicalHref: `${french ? "/fr" : ""}${S08_PAGE_ROUTES.apiServiceAccounts}` };
}

const transitions: Readonly<Record<SettingsLifecycleStatus, readonly SettingsLifecycleStatus[]>> = {
  draft: ["validated", "invalid"], validated: ["validated", "invalid", "publishing"], invalid: ["validated", "invalid"],
  publishing: ["published", "activation_failed", "rolled_back"], published: ["rollback_draft"], superseded: ["rollback_draft"],
  activation_failed: ["validated"], rollback_draft: ["validated", "invalid"], rolled_back: ["rollback_draft"]
};
export function canTransitionS08Lifecycle(from: SettingsLifecycleStatus, to: SettingsLifecycleStatus) { return transitions[from].includes(to); }
export function isValidS08Reason(reason: string) { const n = reason.trim().length; return n >= 8 && n <= 500; }

export const S08_CONSUMERS = ["token-lifecycle", "rotate-overlap", "machine-scope-enforcement", "rate-limit", "audit-invocation-read-model", "erp-product-api-machine"] as const;

/** Compiled fallback consumed before any S08 publication exists. Mirrors the
 *  frozen S08 authority facts: 90-day default token TTL, 365-day hard
 *  maximum, no rotation overlap, per-account token cap, empty allowlists,
 *  production/global machine scope with sensitive permissions denied by
 *  default, 100 req/min per-token rate limit with stable seconds semantics,
 *  and 365-day invocation retention with standard metadata redaction. */
export const S08_COMPILED_VALUE: ApiServiceAccountsValueV1 = {
  tokenLifecyclePolicy: { defaultTtlDays: 90, maximumTtlDays: 365, rotationOverlapMinutes: 0, maximumActiveTokensPerAccount: 1, requireExpiry: false },
  machineScopePolicy: { allowedRoleKeys: [], allowedPermissionFamilies: [], environment: "production", dealerLocationScopeMode: "global", denySensitivePermissionsByDefault: true },
  rateLimitPolicy: { requestsPerMinute: 100, burst: 0, mode: "per-token", retryAfterSemantics: "seconds" },
  auditInvocationPolicy: { invocationRetentionDays: 365, metadataRedactionMode: "standard", lastUsedTrackingEnabled: true, failedAuthenticationAuditEnabled: true }
};

const exact = (value: object, keys: readonly string[]) => { const actual = Object.keys(value).sort(); return actual.length === keys.length && actual.every((key, i) => key === [...keys].sort()[i]); };
const bounded = (value: unknown, min: number, max: number) => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
const unique = (value: unknown, max: number) => Array.isArray(value) && value.length <= max && new Set(value).size === value.length && value.every((entry) => typeof entry === "string" && entry.trim().length > 0);
export function isStructurallyValidS08Value(value: ApiServiceAccountsValueV1): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value) || !exact(value, ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"])) return false;
  const { tokenLifecyclePolicy: t, machineScopePolicy: m, rateLimitPolicy: r, auditInvocationPolicy: a } = value;
  if (![t, m, r, a].every((family) => family && typeof family === "object" && !Array.isArray(family))) return false;
  if (!exact(t, ["defaultTtlDays", "maximumTtlDays", "rotationOverlapMinutes", "maximumActiveTokensPerAccount", "requireExpiry"]) || !bounded(t.defaultTtlDays, 1, 365) || !bounded(t.maximumTtlDays, 1, 365) || !bounded(t.rotationOverlapMinutes, 0, 1440) || !bounded(t.maximumActiveTokensPerAccount, 1, 100) || typeof t.requireExpiry !== "boolean") return false;
  if (!exact(m, ["allowedRoleKeys", "allowedPermissionFamilies", "environment", "dealerLocationScopeMode", "denySensitivePermissionsByDefault"]) || !unique(m.allowedRoleKeys, 64) || !unique(m.allowedPermissionFamilies, 64) || !["production", "staging", "development", "test"].includes(m.environment) || !["global", "dealer", "location"].includes(m.dealerLocationScopeMode) || typeof m.denySensitivePermissionsByDefault !== "boolean") return false;
  if (!exact(r, ["requestsPerMinute", "burst", "mode", "retryAfterSemantics"]) || !bounded(r.requestsPerMinute, 1, 100000) || !bounded(r.burst, 0, 10000) || !["per-token", "per-account"].includes(r.mode) || r.retryAfterSemantics !== "seconds") return false;
  if (!exact(a, ["invocationRetentionDays", "metadataRedactionMode", "lastUsedTrackingEnabled", "failedAuthenticationAuditEnabled"]) || !bounded(a.invocationRetentionDays, 1, 7300) || !["strict", "standard"].includes(a.metadataRedactionMode) || typeof a.lastUsedTrackingEnabled !== "boolean" || typeof a.failedAuthenticationAuditEnabled !== "boolean") return false;
  return true;
}

export function bindCreatedS08Draft(response: S08Draft, submitted: { expectedPublishedVersion: number; value: ApiServiceAccountsValueV1; changeReason: string }) {
  if (response.descriptorKey !== API_SERVICE_ACCOUNT_DESCRIPTOR_KEY || response.status !== "draft" || JSON.stringify(response.value) !== JSON.stringify(submitted.value) || response.changeReason !== submitted.changeReason.trim() || response.basePublicationVersion !== submitted.expectedPublishedVersion || response.version < 1) throw new TypeError("创建 S08 草稿响应与提交内容不匹配。"); return response;
}
export function bindUpdatedS08Draft(response: S08Draft, source: S08Draft, value: ApiServiceAccountsValueV1, reason: string) { if (response.id !== source.id || response.version <= source.version || response.status !== (source.status === "rollback_draft" ? "rollback_draft" : "draft") || JSON.stringify(response.value) !== JSON.stringify(value) || response.changeReason !== reason.trim()) throw new TypeError("S08 草稿更新响应与提交内容不匹配。"); return response; }
export function bindS08Validation(response: S08ValidationResult, id: string, version: number, status: S08Draft["status"]) { if (response.draftId !== id || response.draftVersion <= version || response.validationRevision !== response.draftVersion || !canTransitionS08Lifecycle(status, response.status)) throw new TypeError("S08 验证响应版本不匹配。"); return response; }
export function bindS08Diff(response: S08SafeDiff, validation: S08ValidationResult) { if (response.draftId !== validation.draftId || response.draftVersion !== validation.draftVersion || response.descriptorKey !== API_SERVICE_ACCOUNT_DESCRIPTOR_KEY) throw new TypeError("S08 安全差异版本不匹配。"); return response; }
export function bindPublishedS08(response: S08Publication, draftId: string, draftVersion: number) { if (response.sourceDraftId !== draftId || response.sourceDraftVersion !== draftVersion) throw new TypeError("S08 发布响应版本不匹配。"); return response; }
export function bindRollbackS08Draft(response: S08Draft, target: S08HistoryEntry, currentVersion: number) { if (response.status !== "rollback_draft" || response.rollbackOfPublicationId !== target.publicationId || response.basePublicationVersion !== currentVersion) throw new TypeError("S08 回滚草稿响应不匹配。"); return response; }
export function isS08ConsumerReady(consumer: S08ConsumerReadiness, publishedGeneration: number) { return consumer.state === "implemented_ready" && consumer.generation === publishedGeneration; }
export function bindS08Readiness(response: S08Readiness) { const ids = response.consumers.map((c) => c.id); if (ids.length !== S08_CONSUMERS.length || S08_CONSUMERS.some((id) => !ids.includes(id)) || response.consumers.some((c) => c.state === "implemented_ready" && c.generation !== response.publishedGeneration) || (response.state === "ready") !== response.consumers.every((c) => isS08ConsumerReady(c, response.publishedGeneration))) throw new TypeError("S08 consumer 就绪矩阵与 exact generation 不一致。"); return response; }
export { API_SERVICE_ACCOUNT_DESCRIPTOR_KEY, API_SERVICE_ACCOUNT_SCHEMA_VERSION };
