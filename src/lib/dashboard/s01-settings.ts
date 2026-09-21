import type { SiteLocale } from "@/lib/i18n/locale";
import {
  SETTINGS_CORE_DESCRIPTOR_KEY,
  type SettingsCreateDraftRequest,
  type SettingsDraft,
  type SettingsHistoryEntry,
  type SettingsLifecycleStatus,
  type SettingsPublication,
  type SettingsSafeDiff,
  type SettingsValidationResult
} from "../api/api-contract.ts";

export const SETTINGS_CENTER_PAGE_ROUTES = {
  root: "/dashboard/settings",
  overview: "/dashboard/settings/overview",
  lifecycle: "/dashboard/settings/lifecycle",
  history: "/dashboard/settings/history"
} as const;

export type SettingsCenterPage = Exclude<keyof typeof SETTINGS_CENTER_PAGE_ROUTES, "root">;
export type SettingsCenterLocation =
  | { kind: "not-settings" }
  | { kind: "invalid"; clearHref: string; message: string }
  | { kind: "valid"; page: SettingsCenterPage; draftId?: string; canonicalHref: string };

function localePrefix(locale: SiteLocale) {
  return locale === "fr-CA" ? "/fr" : "";
}

export function settingsCenterHref(page: SettingsCenterPage, locale: SiteLocale, draftId?: string) {
  const params = new URLSearchParams();
  if (page === "lifecycle" && draftId) params.set("draftId", draftId);
  const search = params.toString();
  const pathname = `${localePrefix(locale)}${SETTINGS_CENTER_PAGE_ROUTES[page]}`;
  return search ? `${pathname}?${search}` : pathname;
}

export function parseSettingsCenterLocation(pathname: string, search = ""): SettingsCenterLocation {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const french = normalized === "/fr/dashboard/settings" || normalized.startsWith("/fr/dashboard/settings/");
  const route = french ? normalized.slice(3) : normalized;
  if (route !== SETTINGS_CENTER_PAGE_ROUTES.root && !Object.values(SETTINGS_CENTER_PAGE_ROUTES).includes(route as never)) return { kind: "not-settings" };
  const prefix = french ? "/fr" : "";
  const clearHref = `${prefix}${SETTINGS_CENTER_PAGE_ROUTES.overview}`;
  const params = new URLSearchParams(search);
  const keys = [...params.keys()];
  if (keys.some((key) => key !== "draftId") || params.getAll("draftId").length > 1) return { kind: "invalid", clearHref, message: "Settings URL contains unsupported or repeated parameters." };
  const page = route === SETTINGS_CENTER_PAGE_ROUTES.root ? "overview" : (Object.entries(SETTINGS_CENTER_PAGE_ROUTES).find(([, value]) => value === route)?.[0] as SettingsCenterPage);
  const draftId = params.get("draftId") ?? undefined;
  if (draftId && (page !== "lifecycle" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(draftId))) return { kind: "invalid", clearHref, message: "Settings draft selection is invalid." };
  return { kind: "valid", page, ...(draftId ? { draftId } : {}), canonicalHref: `${prefix}${SETTINGS_CENTER_PAGE_ROUTES[page]}${draftId ? `?draftId=${encodeURIComponent(draftId)}` : ""}` };
}

const SETTINGS_LIFECYCLE_TRANSITIONS: Readonly<Record<SettingsLifecycleStatus, readonly SettingsLifecycleStatus[]>> = {
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

export function canTransitionSettingsLifecycle(from: SettingsLifecycleStatus, to: SettingsLifecycleStatus) {
  return SETTINGS_LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function isValidSettingsDraftValue(value: string) {
  const numericValue = Number(value);
  return Number.isSafeInteger(numericValue) && numericValue >= 15 && numericValue <= 300;
}

export function isValidSettingsReason(reason: string) {
  const length = reason.trim().length;
  return length >= 8 && length <= 500;
}

export function bindCreatedSettingsDraft(response: SettingsDraft, submitted: SettingsCreateDraftRequest) {
  if (
    response.descriptorKey !== SETTINGS_CORE_DESCRIPTOR_KEY
    || response.status !== "draft"
    || response.value !== submitted.value
    || response.changeReason !== submitted.changeReason.trim()
    || response.basePublicationVersion !== submitted.expectedPublishedVersion
    || response.version < 1
    || !response.id
  ) throw new TypeError("创建草稿响应与提交内容不匹配。");
  return response;
}

export function bindUpdatedSettingsDraft(
  response: SettingsDraft,
  submittedDraft: SettingsDraft,
  submittedValue: number,
  submittedReason: string
) {
  const expectedStatus = submittedDraft.status === "rollback_draft" ? "rollback_draft" : "draft";
  if (
    response.id !== submittedDraft.id
    || response.descriptorKey !== SETTINGS_CORE_DESCRIPTOR_KEY
    || response.value !== submittedValue
    || response.changeReason !== submittedReason.trim()
    || response.basePublicationVersion !== submittedDraft.basePublicationVersion
    || response.version <= submittedDraft.version
    || response.status !== expectedStatus
  ) throw new TypeError("草稿更新响应与提交内容不匹配。");
  return response;
}

export function bindSettingsValidation(
  response: SettingsValidationResult,
  submittedDraftId: string,
  submittedExpectedVersion: number,
  sourceStatus: SettingsDraft["status"]
) {
  if (
    response.draftId !== submittedDraftId
    || response.draftVersion <= submittedExpectedVersion
    || response.validationRevision !== response.draftVersion
    || !canTransitionSettingsLifecycle(sourceStatus, response.status)
  ) throw new TypeError("验证响应与所请求草稿版本不匹配。");
  return response;
}

export function bindSettingsDiff(response: SettingsSafeDiff, validation: SettingsValidationResult) {
  if (
    response.draftId !== validation.draftId
    || response.draftVersion !== validation.draftVersion
    || response.descriptorKey !== SETTINGS_CORE_DESCRIPTOR_KEY
  ) throw new TypeError("安全差异与已验证草稿版本不匹配。");
  return response;
}

export function bindPublishedSettings(
  response: SettingsPublication,
  sourceDraftId: string,
  sourceDraftVersion: number
) {
  if (response.sourceDraftId !== sourceDraftId || response.sourceDraftVersion !== sourceDraftVersion) {
    throw new TypeError("发布响应与已确认草稿版本不匹配。");
  }
  return response;
}

export function bindRollbackSettingsDraft(
  response: SettingsDraft,
  target: SettingsHistoryEntry,
  submittedCurrentPublishedVersion: number
) {
  if (
    response.status !== "rollback_draft"
    || response.rollbackOfPublicationId !== target.publicationId
    || response.basePublicationVersion !== submittedCurrentPublishedVersion
  ) throw new TypeError("回滚草稿响应与已确认发布不匹配。");
  return response;
}
