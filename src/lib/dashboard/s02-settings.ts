import {
  GENERAL_STOREFRONT_DESCRIPTOR_KEY,
  GENERAL_STOREFRONT_SCHEMA_VERSION,
  type GeneralStorefrontSettingsValueV1,
  type S02Draft,
  type S02HistoryEntry,
  type S02Publication,
  type S02Readiness,
  type S02SafeDiff,
  type S02ValidationResult,
  type SettingsLifecycleStatus
} from "../api/api-contract.ts";
import type { SiteLocale } from "@/lib/i18n/locale";

export const S02_PAGE_ROUTES = {
  generalStorefront: "/dashboard/settings/general-storefront"
} as const;

export type S02Page = keyof typeof S02_PAGE_ROUTES;
export type S02Location =
  | { kind: "not-s02" }
  | { kind: "valid"; page: S02Page; canonicalHref: string };

function localePrefix(locale: SiteLocale) {
  return locale === "fr-CA" ? "/fr" : "";
}

export function s02PageHref(page: S02Page, locale: SiteLocale) {
  return `${localePrefix(locale)}${S02_PAGE_ROUTES[page]}`;
}

export function parseS02Location(pathname: string): S02Location {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const french = normalized === "/fr/dashboard/settings/general-storefront";
  const route = french ? normalized.slice(3) : normalized;
  if (route !== S02_PAGE_ROUTES.generalStorefront) return { kind: "not-s02" };
  return { kind: "valid", page: "generalStorefront", canonicalHref: `${localePrefix(french ? "fr-CA" : "en-CA")}${S02_PAGE_ROUTES.generalStorefront}` };
}

const S02_LIFECYCLE_TRANSITIONS: Readonly<Record<SettingsLifecycleStatus, readonly SettingsLifecycleStatus[]>> = {
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

export function canTransitionS02Lifecycle(from: SettingsLifecycleStatus, to: SettingsLifecycleStatus) {
  return S02_LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function isValidS02Reason(reason: string) {
  const length = reason.trim().length;
  return length >= 8 && length <= 500;
}

/** Compiled fallback consumed before any S02 publication exists. */
export const S02_COMPILED_VALUE: GeneralStorefrontSettingsValueV1 = {
  generalIdentity: {
    siteDisplayName: "VanStro Global Supply",
    legalName: "VanStro Global Supply",
    canonicalUrl: "https://www.vanstro.ca",
    contactEmail: "support@vanstro.ca",
    contactPhone: "+1 204 555 0187",
    contactAddress: { line1: "1700 Waverley St", city: "Winnipeg", province: "MB", postalCode: "R3T 0A1", country: "Canada" },
    defaultTimezone: "America/Winnipeg"
  },
  brand: {
    brandName: "VanStro",
    brandDescription: "",
    logoMediaRef: null,
    faviconMediaRef: null
  },
  storefront: {
    homeContentRef: null,
    navigationRef: null,
    footerRef: null,
    defaultProductSort: "newest",
    outOfStockDisplay: "show",
    dealerSelectionEnabled: true,
    cartCheckoutEnabled: true,
    announcementRule: { enabled: false, message: "" },
    maintenanceBannerRule: { enabled: false, message: "" },
    storefrontConfigRef: null,
    enFrRoutesEnabled: true
  },
  localization: {
    defaultLocale: "en-CA",
    supportedLocales: ["en-CA", "fr-CA"],
    dashboardLocale: "zh-CN",
    currency: "CAD",
    timezone: "America/Winnipeg",
    dateFormat: "yyyy-mm-dd",
    phoneFormat: "national",
    addressFormat: "canada_default",
    weightUnits: "kg",
    dimensionUnits: "cm",
    translationFallback: "en_ca",
    provinceServiceMapping: []
  },
  defaultDealerLocation: {
    defaultDealerRef: null,
    defaultLocationRef: null
  }
};

const CANADA_TIMEZONE_ALLOWLIST = new Set([
  "America/St_Johns", "America/Halifax", "America/Moncton", "America/Glace_Bay", "America/Goose_Bay",
  "America/Blanc-Sablon", "America/Toronto", "America/Iqaluit", "America/Winnipeg", "America/Rankin_Inlet",
  "America/Regina", "America/Swift_Current", "America/Edmonton", "America/Cambridge_Bay", "America/Inuvik",
  "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston", "America/Vancouver", "America/Whitehorse",
  "America/Dawson"
]);

export function isStructurallyValidS02Value(value: GeneralStorefrontSettingsValueV1): boolean {
  const gi = value.generalIdentity, br = value.brand, sf = value.storefront, lz = value.localization, dd = value.defaultDealerLocation;
  if (!gi || !br || !sf || !lz || !dd) return false;
  if (!gi.siteDisplayName.trim() || gi.siteDisplayName.trim().length > 120) return false;
  if (!gi.legalName.trim() || gi.legalName.trim().length > 200) return false;
  if (!/^https?:\/\//.test(gi.canonicalUrl) || gi.canonicalUrl.length > 2048) return false;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gi.contactEmail)) return false;
  if (!/^[+0-9()\s-]{7,25}$/.test(gi.contactPhone)) return false;
  if (!CANADA_TIMEZONE_ALLOWLIST.has(gi.defaultTimezone)) return false;
  if (!Array.isArray(lz.supportedLocales) || lz.supportedLocales.length < 1 || lz.supportedLocales.length > 2) return false;
  if (lz.supportedLocales.some((entry) => entry !== "en-CA" && entry !== "fr-CA")) return false;
  if (!CANADA_TIMEZONE_ALLOWLIST.has(lz.timezone)) return false;
  if (lz.dashboardLocale !== "zh-CN" || lz.currency !== "CAD" || lz.translationFallback !== "en_ca" || lz.addressFormat !== "canada_default") return false;
  if (!["kg", "lb"].includes(lz.weightUnits) || !["cm", "in"].includes(lz.dimensionUnits) || !["national", "international"].includes(lz.phoneFormat)) return false;
  if (!["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"].includes(lz.dateFormat)) return false;
  if (lz.defaultLocale !== "en-CA" && lz.defaultLocale !== "fr-CA") return false;
  if (!["newest", "price_asc", "price_desc", "featured"].includes(sf.defaultProductSort)) return false;
  if (!["hide", "show", "hide_with_contact"].includes(sf.outOfStockDisplay)) return false;
  if (typeof sf.dealerSelectionEnabled !== "boolean" || typeof sf.cartCheckoutEnabled !== "boolean" || typeof sf.enFrRoutesEnabled !== "boolean") return false;
  return true;
}

export function bindCreatedS02Draft(response: S02Draft, submitted: { descriptorKey: typeof GENERAL_STOREFRONT_DESCRIPTOR_KEY; expectedPublishedVersion: number; value: GeneralStorefrontSettingsValueV1; changeReason: string }) {
  if (
    response.descriptorKey !== GENERAL_STOREFRONT_DESCRIPTOR_KEY
    || response.status !== "draft"
    || JSON.stringify(response.value) !== JSON.stringify(submitted.value)
    || response.changeReason !== submitted.changeReason.trim()
    || response.basePublicationVersion !== submitted.expectedPublishedVersion
    || response.version < 1
    || !response.id
  ) throw new TypeError("创建 S02 草稿响应与提交内容不匹配。");
  return response;
}

export function bindUpdatedS02Draft(
  response: S02Draft,
  submittedDraft: S02Draft,
  submittedValue: GeneralStorefrontSettingsValueV1,
  submittedReason: string
) {
  const expectedStatus = submittedDraft.status === "rollback_draft" ? "rollback_draft" : "draft";
  if (
    response.id !== submittedDraft.id
    || response.descriptorKey !== GENERAL_STOREFRONT_DESCRIPTOR_KEY
    || JSON.stringify(response.value) !== JSON.stringify(submittedValue)
    || response.changeReason !== submittedReason.trim()
    || response.basePublicationVersion !== submittedDraft.basePublicationVersion
    || response.version <= submittedDraft.version
    || response.status !== expectedStatus
  ) throw new TypeError("S02 草稿更新响应与提交内容不匹配。");
  return response;
}

export function bindS02Validation(
  response: S02ValidationResult,
  submittedDraftId: string,
  submittedExpectedVersion: number,
  sourceStatus: S02Draft["status"]
) {
  if (
    response.draftId !== submittedDraftId
    || response.draftVersion <= submittedExpectedVersion
    || response.validationRevision !== response.draftVersion
    || !canTransitionS02Lifecycle(sourceStatus, response.status)
  ) throw new TypeError("S02 验证响应与所请求草稿版本不匹配。");
  return response;
}

export function bindS02Diff(response: S02SafeDiff, validation: S02ValidationResult) {
  if (
    response.draftId !== validation.draftId
    || response.draftVersion !== validation.draftVersion
    || response.descriptorKey !== GENERAL_STOREFRONT_DESCRIPTOR_KEY
  ) throw new TypeError("S02 安全差异与已验证草稿版本不匹配。");
  return response;
}

export function bindPublishedS02(
  response: S02Publication,
  sourceDraftId: string,
  sourceDraftVersion: number
) {
  if (response.sourceDraftId !== sourceDraftId || response.sourceDraftVersion !== sourceDraftVersion) {
    throw new TypeError("S02 发布响应与已确认草稿版本不匹配。");
  }
  return response;
}

export function bindRollbackS02Draft(
  response: S02Draft,
  target: S02HistoryEntry,
  submittedCurrentPublishedVersion: number
) {
  if (
    response.status !== "rollback_draft"
    || response.rollbackOfPublicationId !== target.publicationId
    || response.basePublicationVersion !== submittedCurrentPublishedVersion
  ) throw new TypeError("S02 回滚草稿响应与已确认发布不匹配。");
  return response;
}

export function bindS02Readiness(response: S02Readiness, installedGeneration: number) {
  if (
    response.consumerGeneration !== installedGeneration
    || response.publishedGeneration !== installedGeneration
    || response.state !== "ready"
    || response.reasonCode !== "ready"
  ) throw new TypeError("S02 就绪响应未确认已安装的发布代次。");
  return response;
}

export { GENERAL_STOREFRONT_DESCRIPTOR_KEY, GENERAL_STOREFRONT_SCHEMA_VERSION };
