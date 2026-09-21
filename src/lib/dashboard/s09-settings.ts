import {
  AUTH_RBAC_DESCRIPTOR_KEY,
  AUTH_RBAC_SCHEMA_VERSION,
  type AuthRbacSettingsValueV1,
  type S09Draft,
  type S09HistoryEntry,
  type S09Publication,
  type S09Readiness,
  type S09SafeDiff,
  type S09ValidationResult,
  type SettingsLifecycleStatus
} from "../api/api-contract.ts";
import type { SiteLocale } from "@/lib/i18n/locale";

export const S09_PAGE_ROUTES = {
  authRbac: "/dashboard/settings/auth-rbac"
} as const;

export type S09Page = keyof typeof S09_PAGE_ROUTES;
export type S09Location =
  | { kind: "not-s09" }
  | { kind: "valid"; page: S09Page; canonicalHref: string };

function localePrefix(locale: SiteLocale) {
  return locale === "fr-CA" ? "/fr" : "";
}

export function s09PageHref(page: S09Page, locale: SiteLocale) {
  return `${localePrefix(locale)}${S09_PAGE_ROUTES[page]}`;
}

export function parseS09Location(pathname: string): S09Location {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const french = normalized === "/fr/dashboard/settings/auth-rbac";
  const route = french ? normalized.slice(3) : normalized;
  if (route !== S09_PAGE_ROUTES.authRbac) return { kind: "not-s09" };
  return { kind: "valid", page: "authRbac", canonicalHref: `${localePrefix(french ? "fr-CA" : "en-CA")}${S09_PAGE_ROUTES.authRbac}` };
}

const S09_LIFECYCLE_TRANSITIONS: Readonly<Record<SettingsLifecycleStatus, readonly SettingsLifecycleStatus[]>> = {
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

export function canTransitionS09Lifecycle(from: SettingsLifecycleStatus, to: SettingsLifecycleStatus) {
  return S09_LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function isValidS09Reason(reason: string) {
  const length = reason.trim().length;
  return length >= 8 && length <= 500;
}

/** Compiled fallback consumed before any S09 publication exists. Mirrors the
 *  frozen S09 authority facts (SESSION_TTL_MS 7d, PASSWORD_RESET_TTL_MS 30m). */
export const S09_COMPILED_VALUE: AuthRbacSettingsValueV1 = {
  passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 },
  sessionPolicy: { sessionLifetimeMinutes: 10080 }
};

export function isStructurallyValidS09Value(value: AuthRbacSettingsValueV1): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pp = value.passwordPolicy, sp = value.sessionPolicy;
  if (!pp || typeof pp !== "object" || Array.isArray(pp) || !sp || typeof sp !== "object" || Array.isArray(sp)) return false;
  const passwordKeys = Object.keys(pp).sort();
  if (passwordKeys.length !== 2 || passwordKeys[0] !== "minimumLength" || passwordKeys[1] !== "resetTokenTtlMinutes") return false;
  const sessionKeys = Object.keys(sp).sort();
  if (sessionKeys.length !== 1 || sessionKeys[0] !== "sessionLifetimeMinutes") return false;
  if (!Number.isInteger(pp.minimumLength) || pp.minimumLength < 12 || pp.minimumLength > 128) return false;
  if (!Number.isInteger(pp.resetTokenTtlMinutes) || pp.resetTokenTtlMinutes < 5 || pp.resetTokenTtlMinutes > 31) return false;
  if (!Number.isInteger(sp.sessionLifetimeMinutes) || sp.sessionLifetimeMinutes < 15 || sp.sessionLifetimeMinutes > 11520) return false;
  return true;
}

export function bindCreatedS09Draft(response: S09Draft, submitted: { descriptorKey: typeof AUTH_RBAC_DESCRIPTOR_KEY; expectedPublishedVersion: number; value: AuthRbacSettingsValueV1; changeReason: string }) {
  if (
    response.descriptorKey !== AUTH_RBAC_DESCRIPTOR_KEY
    || response.status !== "draft"
    || JSON.stringify(response.value) !== JSON.stringify(submitted.value)
    || response.changeReason !== submitted.changeReason.trim()
    || response.basePublicationVersion !== submitted.expectedPublishedVersion
    || response.version < 1
    || !response.id
  ) throw new TypeError("创建 S09 草稿响应与提交内容不匹配。");
  return response;
}

export function bindUpdatedS09Draft(
  response: S09Draft,
  submittedDraft: S09Draft,
  submittedValue: AuthRbacSettingsValueV1,
  submittedReason: string
) {
  const expectedStatus = submittedDraft.status === "rollback_draft" ? "rollback_draft" : "draft";
  if (
    response.id !== submittedDraft.id
    || response.descriptorKey !== AUTH_RBAC_DESCRIPTOR_KEY
    || JSON.stringify(response.value) !== JSON.stringify(submittedValue)
    || response.changeReason !== submittedReason.trim()
    || response.basePublicationVersion !== submittedDraft.basePublicationVersion
    || response.version <= submittedDraft.version
    || response.status !== expectedStatus
  ) throw new TypeError("S09 草稿更新响应与提交内容不匹配。");
  return response;
}

export function bindS09Validation(
  response: S09ValidationResult,
  submittedDraftId: string,
  submittedExpectedVersion: number,
  sourceStatus: S09Draft["status"]
) {
  if (
    response.draftId !== submittedDraftId
    || response.draftVersion <= submittedExpectedVersion
    || response.validationRevision !== response.draftVersion
    || !canTransitionS09Lifecycle(sourceStatus, response.status)
  ) throw new TypeError("S09 验证响应与所请求草稿版本不匹配。");
  return response;
}

export function bindS09Diff(response: S09SafeDiff, validation: S09ValidationResult) {
  if (
    response.draftId !== validation.draftId
    || response.draftVersion !== validation.draftVersion
    || response.descriptorKey !== AUTH_RBAC_DESCRIPTOR_KEY
  ) throw new TypeError("S09 安全差异与已验证草稿版本不匹配。");
  return response;
}

export function bindPublishedS09(
  response: S09Publication,
  sourceDraftId: string,
  sourceDraftVersion: number
) {
  if (response.sourceDraftId !== sourceDraftId || response.sourceDraftVersion !== sourceDraftVersion) {
    throw new TypeError("S09 发布响应与已确认草稿版本不匹配。");
  }
  return response;
}

export function bindRollbackS09Draft(
  response: S09Draft,
  target: S09HistoryEntry,
  submittedCurrentPublishedVersion: number
) {
  if (
    response.status !== "rollback_draft"
    || response.rollbackOfPublicationId !== target.publicationId
    || response.basePublicationVersion !== submittedCurrentPublishedVersion
  ) throw new TypeError("S09 回滚草稿响应与已确认发布不匹配。");
  return response;
}

export function bindS09Readiness(response: S09Readiness, installedGeneration: number) {
  if (
    response.consumerGeneration !== installedGeneration
    || response.publishedGeneration !== installedGeneration
    || response.state !== "ready"
    || response.reasonCode !== "ready"
  ) throw new TypeError("S09 就绪响应未确认已安装的发布代次。");
  return response;
}

export { AUTH_RBAC_DESCRIPTOR_KEY, AUTH_RBAC_SCHEMA_VERSION };
