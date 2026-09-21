import {
  COMMERCE_SETTINGS_DESCRIPTOR_KEY,
  COMMERCE_SETTINGS_SCHEMA_VERSION,
  type CommerceSettingsValueV1,
  type S03ConsumerReadiness,
  type S03Draft,
  type S03HistoryEntry,
  type S03Publication,
  type S03Readiness,
  type S03SafeDiff,
  type S03ValidationResult,
  type SettingsLifecycleStatus
} from "../api/api-contract.ts";
import type { SiteLocale } from "@/lib/i18n/locale";

export const S03_PAGE_ROUTES = { commerce: "/dashboard/settings/commerce" } as const;
export type S03Page = keyof typeof S03_PAGE_ROUTES;
export type S03Location = { kind: "not-s03" } | { kind: "valid"; page: S03Page; canonicalHref: string };

function localePrefix(locale: SiteLocale) { return locale === "fr-CA" ? "/fr" : ""; }
export function s03PageHref(page: S03Page, locale: SiteLocale) { return `${localePrefix(locale)}${S03_PAGE_ROUTES[page]}`; }
export function parseS03Location(pathname: string): S03Location {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const french = normalized === `/fr${S03_PAGE_ROUTES.commerce}`;
  const route = french ? normalized.slice(3) : normalized;
  if (route !== S03_PAGE_ROUTES.commerce) return { kind: "not-s03" };
  return { kind: "valid", page: "commerce", canonicalHref: `${french ? "/fr" : ""}${S03_PAGE_ROUTES.commerce}` };
}

const transitions: Readonly<Record<SettingsLifecycleStatus, readonly SettingsLifecycleStatus[]>> = {
  draft: ["validated", "invalid"], validated: ["validated", "invalid", "publishing"], invalid: ["validated", "invalid"],
  publishing: ["published", "activation_failed", "rolled_back"], published: ["rollback_draft"], superseded: ["rollback_draft"],
  activation_failed: ["validated"], rollback_draft: ["validated", "invalid"], rolled_back: ["rollback_draft"]
};
export function canTransitionS03Lifecycle(from: SettingsLifecycleStatus, to: SettingsLifecycleStatus) { return transitions[from].includes(to); }
export function isValidS03Reason(reason: string) { const n = reason.trim().length; return n >= 8 && n <= 500; }

export const S03_CONSUMERS = ["checkout-availability", "checkout-guest-minimum", "tax-totals", "shipping-fee-service-zone", "inventory-ttl-stale", "order-transitions"] as const;
export const S03_COMPILED_VALUE: CommerceSettingsValueV1 = {
  commercePolicy: { minimumOrderAmountCents: 0, guestCheckoutEnabled: true, checkoutEnabled: true },
  taxPolicy: { enabledProvinceCodes: [], calculationMode: "current-tax-rate-table", roundingMode: "nearest-cent" },
  shippingPolicy: { pickupEnabled: true, deliveryEnabled: true, deliveryFlatFeeCents: 1500, serviceZoneMode: "dealer-location-only", fallbackMode: "reject" },
  inventoryPolicy: { reservationEnabled: true, reservationTtlMinutes: 30, availabilityMode: "manual", staleAfterSeconds: 300, staleBehavior: "degraded-reject" },
  orderPolicy: { allowedLifecycleTransitions: { paid: ["processing", "fulfilled", "cancelled"], processing: ["fulfilled", "cancelled"], fulfilled: [], cancelled: [] }, guestLookupEnabled: true, cancellationMode: "erp-confirmed-only" }
};

const PROVINCES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);
const ORDER_STATES = new Set(["paid", "processing", "fulfilled", "cancelled"]);
const exact = (value: object, keys: readonly string[]) => { const actual = Object.keys(value).sort(); return actual.length === keys.length && actual.every((key, i) => key === [...keys].sort()[i]); };
const bounded = (value: unknown, min: number, max: number) => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
export function isStructurallyValidS03Value(value: CommerceSettingsValueV1): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value) || !exact(value, ["commercePolicy", "taxPolicy", "shippingPolicy", "inventoryPolicy", "orderPolicy"])) return false;
  const { commercePolicy: c, taxPolicy: t, shippingPolicy: s, inventoryPolicy: i, orderPolicy: o } = value;
  if (![c,t,s,i,o].every((family) => family && typeof family === "object" && !Array.isArray(family))) return false;
  if (!exact(c,["minimumOrderAmountCents","guestCheckoutEnabled","checkoutEnabled"]) || !bounded(c.minimumOrderAmountCents,0,2147483647) || typeof c.guestCheckoutEnabled !== "boolean" || typeof c.checkoutEnabled !== "boolean") return false;
  if (!exact(t,["enabledProvinceCodes","calculationMode","roundingMode"]) || !Array.isArray(t.enabledProvinceCodes) || t.enabledProvinceCodes.length > 13 || new Set(t.enabledProvinceCodes).size !== t.enabledProvinceCodes.length || !t.enabledProvinceCodes.every((p) => PROVINCES.has(p)) || !["current-tax-rate-table","disabled"].includes(t.calculationMode) || t.roundingMode !== "nearest-cent") return false;
  if (!exact(s,["pickupEnabled","deliveryEnabled","deliveryFlatFeeCents","serviceZoneMode","fallbackMode"]) || typeof s.pickupEnabled !== "boolean" || typeof s.deliveryEnabled !== "boolean" || !bounded(s.deliveryFlatFeeCents,0,2147483647) || !["dealer-location-only","postal-prefix"].includes(s.serviceZoneMode) || !["reject","pickup-only"].includes(s.fallbackMode)) return false;
  if (!exact(i,["reservationEnabled","reservationTtlMinutes","availabilityMode","staleAfterSeconds","staleBehavior"]) || typeof i.reservationEnabled !== "boolean" || !bounded(i.reservationTtlMinutes,5,1440) || !["manual","erp"].includes(i.availabilityMode) || !bounded(i.staleAfterSeconds,30,86400) || !["degraded-reject","manual-fallback"].includes(i.staleBehavior)) return false;
  if (!exact(o,["allowedLifecycleTransitions","guestLookupEnabled","cancellationMode"]) || typeof o.guestLookupEnabled !== "boolean" || !["erp-confirmed-only","disabled"].includes(o.cancellationMode) || !exact(o.allowedLifecycleTransitions,["paid","processing","fulfilled","cancelled"])) return false;
  return Object.entries(o.allowedLifecycleTransitions).every(([from, targets]) => ORDER_STATES.has(from) && Array.isArray(targets) && new Set(targets).size === targets.length && targets.every((target) => ORDER_STATES.has(target)));
}

export function bindCreatedS03Draft(response: S03Draft, submitted: { expectedPublishedVersion: number; value: CommerceSettingsValueV1; changeReason: string }) {
  if (response.descriptorKey !== COMMERCE_SETTINGS_DESCRIPTOR_KEY || response.status !== "draft" || JSON.stringify(response.value) !== JSON.stringify(submitted.value) || response.changeReason !== submitted.changeReason.trim() || response.basePublicationVersion !== submitted.expectedPublishedVersion || response.version < 1) throw new TypeError("创建 S03 草稿响应与提交内容不匹配。"); return response;
}
export function bindUpdatedS03Draft(response: S03Draft, source: S03Draft, value: CommerceSettingsValueV1, reason: string) { if (response.id !== source.id || response.version <= source.version || response.status !== (source.status === "rollback_draft" ? "rollback_draft" : "draft") || JSON.stringify(response.value) !== JSON.stringify(value) || response.changeReason !== reason.trim()) throw new TypeError("S03 草稿更新响应与提交内容不匹配。"); return response; }
export function bindS03Validation(response: S03ValidationResult, id: string, version: number, status: S03Draft["status"]) { if (response.draftId !== id || response.draftVersion <= version || response.validationRevision !== response.draftVersion || !canTransitionS03Lifecycle(status, response.status)) throw new TypeError("S03 验证响应版本不匹配。"); return response; }
export function bindS03Diff(response: S03SafeDiff, validation: S03ValidationResult) { if (response.draftId !== validation.draftId || response.draftVersion !== validation.draftVersion || response.descriptorKey !== COMMERCE_SETTINGS_DESCRIPTOR_KEY) throw new TypeError("S03 安全差异版本不匹配。"); return response; }
export function bindPublishedS03(response: S03Publication, draftId: string, draftVersion: number) { if (response.sourceDraftId !== draftId || response.sourceDraftVersion !== draftVersion) throw new TypeError("S03 发布响应版本不匹配。"); return response; }
export function bindRollbackS03Draft(response: S03Draft, target: S03HistoryEntry, currentVersion: number) { if (response.status !== "rollback_draft" || response.rollbackOfPublicationId !== target.publicationId || response.basePublicationVersion !== currentVersion) throw new TypeError("S03 回滚草稿响应不匹配。"); return response; }
export function isS03ConsumerReady(consumer: S03ConsumerReadiness, publishedGeneration: number) { return consumer.state === "implemented_ready" && consumer.generation === publishedGeneration; }
export function bindS03Readiness(response: S03Readiness) { const ids = response.consumers.map((c) => c.id); if (ids.length !== S03_CONSUMERS.length || S03_CONSUMERS.some((id) => !ids.includes(id)) || response.consumers.some((c) => c.state === "implemented_ready" && c.generation !== response.publishedGeneration) || (response.state === "ready") !== response.consumers.every((c) => isS03ConsumerReady(c, response.publishedGeneration))) throw new TypeError("S03 consumer 就绪矩阵与 exact generation 不一致。"); return response; }
export { COMMERCE_SETTINGS_DESCRIPTOR_KEY, COMMERCE_SETTINGS_SCHEMA_VERSION };
