import {
  PRIVACY_RETENTION_DESCRIPTOR_KEY,
  PRIVACY_RETENTION_SCHEMA_VERSION,
  type ObjectFamily,
  type PrivacyRetentionSettingsValueV1,
  type S10Draft,
  type S10HistoryEntry,
  type S10Publication,
  type S10Readiness,
  type S10SafeDiff,
  type S10ValidationResult,
  type SettingsLifecycleStatus
} from "../api/api-contract.ts";
import type { SiteLocale } from "@/lib/i18n/locale";

export const S10_PAGE_ROUTES = {
  privacyRetention: "/dashboard/settings/privacy-retention"
} as const;

export type S10Page = keyof typeof S10_PAGE_ROUTES;
export type S10Location =
  | { kind: "not-s10" }
  | { kind: "valid"; page: S10Page; canonicalHref: string };

function localePrefix(locale: SiteLocale) {
  return locale === "fr-CA" ? "/fr" : "";
}

export function s10PageHref(page: S10Page, locale: SiteLocale) {
  return `${localePrefix(locale)}${S10_PAGE_ROUTES[page]}`;
}

export function parseS10Location(pathname: string): S10Location {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const french = normalized === "/fr/dashboard/settings/privacy-retention";
  const route = french ? normalized.slice(3) : normalized;
  if (route !== S10_PAGE_ROUTES.privacyRetention) return { kind: "not-s10" };
  return { kind: "valid", page: "privacyRetention", canonicalHref: `${localePrefix(french ? "fr-CA" : "en-CA")}${S10_PAGE_ROUTES.privacyRetention}` };
}

const S10_LIFECYCLE_TRANSITIONS: Readonly<Record<SettingsLifecycleStatus, readonly SettingsLifecycleStatus[]>> = {
  draft: ["validated", "invalid"],
  validated: ["validated", "invalid", "publishing"],
  invalid: ["validated", "invalid"],
  publishing: ["published", "activation_failed", "rolled_back"],
  published: ["rollback_draft"],
  superseded: ["rollback_draft"],
  activation_failed: ["validated"],
  rollback_draft: ["validated", "invalid"],
  rolled_back: ["rollback_draft"]
};

export function canTransitionS10Lifecycle(from: SettingsLifecycleStatus, to: SettingsLifecycleStatus) {
  return S10_LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function isValidS10Reason(reason: string) {
  const length = reason.trim().length;
  return length >= 8 && length <= 500;
}

export const S10_OBJECT_FAMILIES: readonly ObjectFamily[] = ["consent_events", "audit_events", "async_jobs", "media_assets", "orders", "payments", "privacy_requests"];
export const S10_HIGH_RISK_FAMILIES = new Set(["audit_events", "media_assets", "orders", "payments", "privacy_requests"]);

/** Compiled fallback consumed before any S10 publication exists. Mirrors the
 *  frozen S10 authority facts (consent record retention 24 months, consent
 *  categories functional/analytics/targeting, anonymous consent enabled). */
export const S10_COMPILED_VALUE: PrivacyRetentionSettingsValueV1 = {
  consentPolicy: { anonymousConsentEnabled: true, authenticatedConsentEnabled: false, consentCategories: ["functional", "analytics", "targeting"], retentionMonths: 24 },
  retentionPolicy: { retentionByObjectFamily: [] },
  legalHoldPolicy: { legalHoldEnabled: false, legalHoldRefs: [] },
  dsarPolicy: { accessExportDeleteRules: [] },
  piiDisplayPolicy: { piiDisplayRules: [] },
  lowRiskExecution: { allowlist: [], impactPreviewEnabled: true }
};

export function isStructurallyValidS10Value(value: PrivacyRetentionSettingsValueV1): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const topKeys = Object.keys(value).sort();
  if (topKeys.length !== 6 || topKeys[0] !== "consentPolicy" || topKeys[1] !== "dsarPolicy" || topKeys[2] !== "legalHoldPolicy" || topKeys[3] !== "lowRiskExecution" || topKeys[4] !== "piiDisplayPolicy" || topKeys[5] !== "retentionPolicy") return false;
  const cp = value.consentPolicy, rp = value.retentionPolicy, lh = value.legalHoldPolicy, ds = value.dsarPolicy, pp = value.piiDisplayPolicy, lr = value.lowRiskExecution;
  if (!cp || typeof cp !== "object" || Array.isArray(cp) || !rp || typeof rp !== "object" || Array.isArray(rp) || !lh || typeof lh !== "object" || Array.isArray(lh)) return false;
  if (!ds || typeof ds !== "object" || Array.isArray(ds) || !pp || typeof pp !== "object" || Array.isArray(pp) || !lr || typeof lr !== "object" || Array.isArray(lr)) return false;
  const cpKeys = Object.keys(cp).sort();
  if (cpKeys.length !== 4 || cpKeys[0] !== "anonymousConsentEnabled" || cpKeys[1] !== "authenticatedConsentEnabled" || cpKeys[2] !== "consentCategories" || cpKeys[3] !== "retentionMonths") return false;
  if (Object.keys(rp).length !== 1 || !("retentionByObjectFamily" in rp)) return false;
  if (Object.keys(lh).length !== 2 || !("legalHoldEnabled" in lh) || !("legalHoldRefs" in lh)) return false;
  if (Object.keys(ds).length !== 1 || !("accessExportDeleteRules" in ds)) return false;
  if (Object.keys(pp).length !== 1 || !("piiDisplayRules" in pp)) return false;
  const lrKeys = Object.keys(lr).sort();
  if (lrKeys.length !== 2 || lrKeys[0] !== "allowlist" || lrKeys[1] !== "impactPreviewEnabled") return false;
  if (typeof cp.anonymousConsentEnabled !== "boolean" || typeof cp.authenticatedConsentEnabled !== "boolean" || typeof cp.retentionMonths !== "number" || !Number.isInteger(cp.retentionMonths) || cp.retentionMonths < 6 || cp.retentionMonths > 120) return false;
  if (!Array.isArray(cp.consentCategories) || cp.consentCategories.length < 1 || cp.consentCategories.length > 3 || new Set(cp.consentCategories).size !== cp.consentCategories.length || !cp.consentCategories.every((c) => ["functional", "analytics", "targeting"].includes(c))) return false;
  if (typeof lr.impactPreviewEnabled !== "boolean" || !Array.isArray(lr.allowlist) || lr.allowlist.length > 2 || new Set(lr.allowlist).size !== lr.allowlist.length || !lr.allowlist.every((a) => a === "consent_events" || a === "async_jobs")) return false;
  if (typeof lh.legalHoldEnabled !== "boolean" || !Array.isArray(lh.legalHoldRefs) || lh.legalHoldRefs.length > 64 || !lh.legalHoldRefs.every((r) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r))) return false;
  if (!Array.isArray(rp.retentionByObjectFamily) || rp.retentionByObjectFamily.length > 7) return false;
  const families = new Set<string>();
  for (const entry of rp.retentionByObjectFamily) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || Object.keys(entry).length !== 3 || !("objectFamily" in entry) || !("retentionDays" in entry) || !("autoCleanupEnabled" in entry)) return false;
    if (!S10_OBJECT_FAMILIES.includes(entry.objectFamily) || families.has(entry.objectFamily)) return false;
    families.add(entry.objectFamily);
    if (typeof entry.retentionDays !== "number" || !Number.isInteger(entry.retentionDays) || entry.retentionDays < 30 || entry.retentionDays > 7300 || typeof entry.autoCleanupEnabled !== "boolean") return false;
  }
  if (!Array.isArray(ds.accessExportDeleteRules) || ds.accessExportDeleteRules.length > 15) return false;
  for (const rule of ds.accessExportDeleteRules) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).length !== 4 || !("scope" in rule) || !("method" in rule) || !("enabled" in rule) || !("requireAdminApproval" in rule)) return false;
    if (!["all_personal_data", "orders", "payments", "media", "communications"].includes(rule.scope) || !["access", "export", "delete"].includes(rule.method)) return false;
    if (typeof rule.enabled !== "boolean" || typeof rule.requireAdminApproval !== "boolean") return false;
  }
  if (!Array.isArray(pp.piiDisplayRules) || pp.piiDisplayRules.length > 20) return false;
  for (const rule of pp.piiDisplayRules) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).length !== 3 || !("field" in rule) || !("displayMode" in rule) || !("allowedRoles" in rule)) return false;
    if (typeof rule.field !== "string" || rule.field.length < 1 || rule.field.length > 80 || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(rule.field) || !["plain", "masked", "hidden"].includes(rule.displayMode)) return false;
    if (!Array.isArray(rule.allowedRoles) || rule.allowedRoles.length < 1 || rule.allowedRoles.length > 8 || !rule.allowedRoles.every((r) => typeof r === "string" && r.length > 0)) return false;
  }
  return true;
}

export function bindCreatedS10Draft(response: S10Draft, submitted: { descriptorKey: typeof PRIVACY_RETENTION_DESCRIPTOR_KEY; expectedPublishedVersion: number; value: PrivacyRetentionSettingsValueV1; changeReason: string }) {
  if (
    response.descriptorKey !== PRIVACY_RETENTION_DESCRIPTOR_KEY
    || response.status !== "draft"
    || JSON.stringify(response.value) !== JSON.stringify(submitted.value)
    || response.changeReason !== submitted.changeReason.trim()
    || response.basePublicationVersion !== submitted.expectedPublishedVersion
    || response.version < 1
    || !response.id
  ) throw new TypeError("创建 S10 草稿响应与提交内容不匹配。");
  return response;
}

export function bindUpdatedS10Draft(
  response: S10Draft,
  submittedDraft: S10Draft,
  submittedValue: PrivacyRetentionSettingsValueV1,
  submittedReason: string
) {
  const expectedStatus = submittedDraft.status === "rollback_draft" ? "rollback_draft" : "draft";
  if (
    response.id !== submittedDraft.id
    || response.descriptorKey !== PRIVACY_RETENTION_DESCRIPTOR_KEY
    || JSON.stringify(response.value) !== JSON.stringify(submittedValue)
    || response.changeReason !== submittedReason.trim()
    || response.basePublicationVersion !== submittedDraft.basePublicationVersion
    || response.version <= submittedDraft.version
    || response.status !== expectedStatus
  ) throw new TypeError("S10 草稿更新响应与提交内容不匹配。");
  return response;
}

export function bindS10Validation(
  response: S10ValidationResult,
  submittedDraftId: string,
  submittedExpectedVersion: number,
  sourceStatus: S10Draft["status"]
) {
  if (
    response.draftId !== submittedDraftId
    || response.draftVersion <= submittedExpectedVersion
    || response.validationRevision !== response.draftVersion
    || !canTransitionS10Lifecycle(sourceStatus, response.status)
  ) throw new TypeError("S10 验证响应与所请求草稿版本不匹配。");
  return response;
}

export function bindS10Diff(response: S10SafeDiff, validation: S10ValidationResult) {
  if (
    response.draftId !== validation.draftId
    || response.draftVersion !== validation.draftVersion
    || response.descriptorKey !== PRIVACY_RETENTION_DESCRIPTOR_KEY
  ) throw new TypeError("S10 安全差异与已验证草稿版本不匹配。");
  return response;
}

export function bindPublishedS10(
  response: S10Publication,
  sourceDraftId: string,
  sourceDraftVersion: number
) {
  if (response.sourceDraftId !== sourceDraftId || response.sourceDraftVersion !== sourceDraftVersion) {
    throw new TypeError("S10 发布响应与已确认草稿版本不匹配。");
  }
  return response;
}

export function bindRollbackS10Draft(
  response: S10Draft,
  target: S10HistoryEntry,
  submittedCurrentPublishedVersion: number
) {
  if (
    response.status !== "rollback_draft"
    || response.rollbackOfPublicationId !== target.publicationId
    || response.basePublicationVersion !== submittedCurrentPublishedVersion
  ) throw new TypeError("S10 回滚草稿响应与已确认发布不匹配。");
  return response;
}

/** The cleanup consumer (Audit/async-job expiry) does not exist yet, so S10
 *  readiness is honestly degraded — never fake-ready, even with an exact
 *  consumer generation match. */
export function bindS10Readiness(response: S10Readiness, installedGeneration: number) {
  if (
    response.state !== "degraded"
    || response.reasonCode !== "cleanup_consumer_unavailable"
    || response.cleanupConsumer.state !== "degraded"
    || response.cleanupConsumer.reasonCode !== "cleanup_consumer_unavailable"
    || response.consumerGeneration !== installedGeneration
  ) throw new TypeError("S10 就绪响应必须诚实报告缺失的清理消费者。");
  return response;
}

export { PRIVACY_RETENTION_DESCRIPTOR_KEY, PRIVACY_RETENTION_SCHEMA_VERSION };
