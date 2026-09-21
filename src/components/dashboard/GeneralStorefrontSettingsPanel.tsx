"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type {
  GeneralStorefrontSettingsValueV1,
  SettingsCenterCapability,
  S02Draft,
  S02HistoryEntry,
  S02Publication,
  S02Readiness,
  S02SafeDiff,
  S02ValidationResult
} from "@/lib/api/api-contract";
import { API_ENDPOINTS, GENERAL_STOREFRONT_DESCRIPTOR_KEY } from "@/lib/api/api-contract";
import {
  validateApiResult,
  validateS02Draft,
  validateS02HistoryEntry,
  validateS02Publication,
  validateS02Readiness,
  validateS02SafeDiff,
  validateS02ValidationResult,
  type RuntimeValidator
} from "@/lib/api/runtime-validation";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { authorizeS02Operation } from "@/lib/dashboard/s02-settings-transport";
import {
  bindCreatedS02Draft,
  bindPublishedS02,
  bindRollbackS02Draft,
  bindS02Diff,
  bindS02Validation,
  bindUpdatedS02Draft,
  isStructurallyValidS02Value,
  isValidS02Reason,
  S02_COMPILED_VALUE,
  type S02Location
} from "@/lib/dashboard/s02-settings";
import { createS02ReadinessConsumer } from "@/lib/dashboard/s02-settings-readiness-consumer";
import type { SiteLocale } from "@/lib/i18n/locale";
import styles from "./GeneralStorefrontSettingsPanel.module.css";

type ValidLocation = Extract<S02Location, { kind: "valid" }>;
type Props = {
  actorKey: string;
  capability: SettingsCenterCapability;
  location: ValidLocation;
  locale: SiteLocale;
  apiRequest: (path: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => void;
};
type LoadState = "loading" | "ready" | "empty" | "forbidden" | "error";
type Confirmation = { kind: "publish"; draft: S02Draft; diff: S02SafeDiff } | { kind: "rollback"; publication: S02HistoryEntry };
type FieldState = { value: string; error: string };
type FieldGroup = "generalIdentity" | "brand" | "storefront" | "localization" | "dealerLocation";

const CANADA_TIMEZONES = [
  "America/St_Johns", "America/Halifax", "America/Moncton", "America/Glace_Bay", "America/Goose_Bay",
  "America/Blanc-Sablon", "America/Toronto", "America/Iqaluit", "America/Winnipeg", "America/Rankin_Inlet",
  "America/Regina", "America/Swift_Current", "America/Edmonton", "America/Cambridge_Bay", "America/Inuvik",
  "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston", "America/Vancouver", "America/Whitehorse",
  "America/Dawson"
] as const;

const statusLabels: Record<string, string> = { draft: "草稿", validated: "已验证", invalid: "验证未通过", publishing: "发布中", activation_failed: "激活失败", rollback_draft: "回滚草稿", published: "已发布", superseded: "已被后续版本取代", rolled_back: "已回滚" };
const severityLabels: Record<string, string> = { blocker: "阻断", warning: "警告", info: "提示" };

function arrayValidator<T>(validator: RuntimeValidator<T>, name: string): RuntimeValidator<T[]> {
  return (wire) => {
    if (!Array.isArray(wire)) throw new TypeError(`${name} 响应不是列表。`);
    return wire.map((entry, index) => validator(entry, `${name}[${index}]`));
  };
}
function idempotencyKey(action: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `settings-s02-${action}-${random}`;
}
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString("zh-CN") : "尚无"; }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function displayReference(value: string | null) { return value ? `引用 ${value.slice(0, 8)}…（${value}）` : "未设置"; }
function fieldState(initial: string): FieldState { return { value: initial, error: "" }; }
function formatDiffValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function GeneralStorefrontSettingsPanel({ actorKey, capability, location, locale, apiRequest, onUnauthorized }: Props) {
  const [drafts, setDrafts] = useState<S02Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<S02Draft>();
  const [validation, setValidation] = useState<S02ValidationResult>();
  const [diff, setDiff] = useState<S02SafeDiff>();
  const [history, setHistory] = useState<S02HistoryEntry[]>([]);
  const [readiness, setReadiness] = useState<S02Readiness>();
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [pendingReason, setPendingReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [createReasonError, setCreateReasonError] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackError, setRollbackError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [sectionDirty, setSectionDirty] = useState(false);

  const [generalIdentity, setGeneralIdentity] = useState<Record<string, FieldState>>({
    siteDisplayName: fieldState(S02_COMPILED_VALUE.generalIdentity.siteDisplayName),
    legalName: fieldState(S02_COMPILED_VALUE.generalIdentity.legalName),
    canonicalUrl: fieldState(S02_COMPILED_VALUE.generalIdentity.canonicalUrl),
    contactEmail: fieldState(S02_COMPILED_VALUE.generalIdentity.contactEmail),
    contactPhone: fieldState(S02_COMPILED_VALUE.generalIdentity.contactPhone),
    addressLine1: fieldState(S02_COMPILED_VALUE.generalIdentity.contactAddress.line1),
    addressLine2: fieldState(S02_COMPILED_VALUE.generalIdentity.contactAddress.line2 ?? ""),
    addressCity: fieldState(S02_COMPILED_VALUE.generalIdentity.contactAddress.city),
    addressProvince: fieldState(S02_COMPILED_VALUE.generalIdentity.contactAddress.province),
    addressPostalCode: fieldState(S02_COMPILED_VALUE.generalIdentity.contactAddress.postalCode),
    addressCountry: fieldState(S02_COMPILED_VALUE.generalIdentity.contactAddress.country),
    defaultTimezone: fieldState(S02_COMPILED_VALUE.generalIdentity.defaultTimezone)
  });
  const [brand, setBrand] = useState<Record<string, FieldState>>({
    brandName: fieldState(S02_COMPILED_VALUE.brand.brandName),
    brandDescription: fieldState(S02_COMPILED_VALUE.brand.brandDescription)
  });
  const [storefront, setStorefront] = useState<Record<string, FieldState>>({
    defaultProductSort: fieldState(S02_COMPILED_VALUE.storefront.defaultProductSort),
    outOfStockDisplay: fieldState(S02_COMPILED_VALUE.storefront.outOfStockDisplay),
    announcementEnabled: fieldState(String(S02_COMPILED_VALUE.storefront.announcementRule.enabled)),
    announcementMessage: fieldState(S02_COMPILED_VALUE.storefront.announcementRule.message),
    announcementLocale: fieldState(S02_COMPILED_VALUE.storefront.announcementRule.locale ?? ""),
    announcementStartsAt: fieldState(""),
    announcementEndsAt: fieldState(""),
    dealerSelectionEnabled: fieldState(String(S02_COMPILED_VALUE.storefront.dealerSelectionEnabled)),
    cartCheckoutEnabled: fieldState(String(S02_COMPILED_VALUE.storefront.cartCheckoutEnabled)),
    enFrRoutesEnabled: fieldState(String(S02_COMPILED_VALUE.storefront.enFrRoutesEnabled))
  });
  const [localization, setLocalization] = useState<Record<string, FieldState>>({
    defaultLocale: fieldState(S02_COMPILED_VALUE.localization.defaultLocale),
    supportedLocales: fieldState(S02_COMPILED_VALUE.localization.supportedLocales.join(",")),
    timezone: fieldState(S02_COMPILED_VALUE.localization.timezone),
    dateFormat: fieldState(S02_COMPILED_VALUE.localization.dateFormat),
    phoneFormat: fieldState(S02_COMPILED_VALUE.localization.phoneFormat),
    weightUnits: fieldState(S02_COMPILED_VALUE.localization.weightUnits),
    dimensionUnits: fieldState(S02_COMPILED_VALUE.localization.dimensionUnits)
  });
  const [dealerLocation, setDealerLocation] = useState<Record<string, FieldState>>({
    defaultDealerRef: fieldState(""),
    defaultLocationRef: fieldState("")
  });

  const generation = useRef(0);
  const actorRef = useRef(actorKey);
  actorRef.current = actorKey;
  const controllerRef = useRef<AbortController | null>(null);
  const diffControllerRef = useRef<AbortController | null>(null);
  const readinessConsumerRef = useRef(createS02ReadinessConsumer({ set: (callback, delayMs) => setTimeout(callback, delayMs), clear: (handle) => clearTimeout(handle) }));
  const reloadRef = useRef<() => void>(() => {});
  const dialogRef = useRef<HTMLElement>(null);
  const modalRootRef = useRef<HTMLDivElement>(null);
  const rollbackReasonRef = useRef<HTMLTextAreaElement>(null);
  const createReasonRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef(false);
  const selectedDraftRef = useRef<S02Draft | undefined>(undefined);
  const pendingReasonRef = useRef("");
  selectedDraftRef.current = selectedDraft;
  pendingReasonRef.current = pendingReason;
  const closeConfirmation = useCallback(() => { setConfirmation(undefined); setDialogError(""); setRollbackError(""); }, []);
  useModalFocus({ active: Boolean(confirmation), containerRef: dialogRef, modalRootRef, onEscape: closeConfirmation });

  const setField = useCallback((group: FieldGroup, key: string, value: string, clearError = true) => {
    if (group === "generalIdentity") setGeneralIdentity((current) => ({ ...current, [key]: { value, error: clearError ? "" : current[key]?.error ?? "" } }));
    else if (group === "brand") setBrand((current) => ({ ...current, [key]: { value, error: clearError ? "" : current[key]?.error ?? "" } }));
    else if (group === "storefront") setStorefront((current) => ({ ...current, [key]: { value, error: clearError ? "" : current[key]?.error ?? "" } }));
    else if (group === "localization") setLocalization((current) => ({ ...current, [key]: { value, error: clearError ? "" : current[key]?.error ?? "" } }));
    else setDealerLocation((current) => ({ ...current, [key]: { value, error: clearError ? "" : current[key]?.error ?? "" } }));
    setSectionDirty(true);
  }, []);

  const commitAllowed = useCallback((requestGeneration: number, requestActor: string, signal: AbortSignal) => !signal.aborted && requestGeneration === generation.current && requestActor === actorRef.current, []);

  const classifyFailure = useCallback((status: number) => {
    if (status === 401) { onUnauthorized(); return "forbidden" as const; }
    if (status === 403) return "forbidden" as const;
    return "error" as const;
  }, [onUnauthorized]);

  const getData = useCallback(async <T,>(path: string, signal: AbortSignal, validator: RuntimeValidator<T>) => {
    const response = await apiRequest(path, { signal });
    if (!response.ok) {
      const error = new Error(response.status === 409 ? "设置状态已变化，请刷新后重试。" : response.status === 403 ? "当前操作员没有此设置视图的权限。" : "设置服务暂时不可用。") as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    return validateApiResult(await response.json(), validator).data;
  }, [apiRequest]);

  const load = useCallback(async () => {
    const requestGeneration = ++generation.current;
    const requestActor = actorKey;
    const controller = new AbortController();
    controllerRef.current?.abort();
    diffControllerRef.current?.abort();
    controllerRef.current = controller;
    readinessConsumerRef.current.dispose();
    setState("loading"); setMessage(""); setValidation(undefined); setDiff(undefined); setConflict(false);
    if (!capability.enabled || !capability.actions.read) { setState("forbidden"); setMessage("服务器未向当前操作员开放设置读取能力。"); return; }
    try {
      const [draftList, historyWire, readinessWire] = await Promise.all([
        getData(API_ENDPOINTS.dashboardS02SettingsDrafts, controller.signal, arrayValidator(validateS02Draft, "s02 drafts")),
        capability.history.read ? getData(API_ENDPOINTS.dashboardS02SettingsHistory, controller.signal, arrayValidator(validateS02HistoryEntry, "s02 history")) : Promise.resolve([]),
        capability.readiness.read ? getData(API_ENDPOINTS.dashboardS02SettingsReadiness, controller.signal, validateS02Readiness) : Promise.resolve(undefined)
      ]);
      const draft = draftList[0];
      let nextDiff: S02SafeDiff | undefined;
      if (draft?.status === "validated") {
        const candidate = await getData(API_ENDPOINTS.dashboardS02SettingsDraftDiff(draft.id), controller.signal, validateS02SafeDiff);
        if (candidate.draftId === draft.id && candidate.draftVersion === draft.version && candidate.descriptorKey === draft.descriptorKey) nextDiff = candidate;
        else throw new TypeError("S02 安全差异与当前草稿版本不匹配。");
      }
      if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
      setDrafts(draftList); setSelectedDraft(draft); setHistory(historyWire); setDiff(nextDiff); setReadiness(readinessWire);
      setState(draftList.length ? "ready" : "empty");
    } catch (error) {
      if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
      setState(classifyFailure(status));
      setMessage(error instanceof Error ? error.message : "设置中心无法安全载入。");
    }
  }, [actorKey, apiRequest, capability, classifyFailure, commitAllowed, getData]);
  reloadRef.current = () => { void load(); };

  useEffect(() => { void load(); return () => { generation.current += 1; controllerRef.current?.abort(); diffControllerRef.current?.abort(); readinessConsumerRef.current.dispose(); }; }, [load]);

  const execute = useCallback(async (operation: Parameters<typeof authorizeS02Operation>[0], validator: (wire: unknown) => unknown) => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    const requestGeneration = generation.current;
    const requestActor = actorKey;
    let request: ReturnType<typeof authorizeS02Operation>;
    try { request = authorizeS02Operation(operation); }
    catch (error) { inFlightRef.current = false; throw error; }
    setBusy(true); setMessage(""); setDialogError("");
    try {
      const response = await fetch(`${DASHBOARD_API_BASE_URL}${request.path}`, request.init);
      if (response.status === 401) onUnauthorized();
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { code?: string } | null;
        const code = body?.code;
        const conflictMessage = code === "VERSION_CONFLICT" ? "设置版本冲突（409）：草稿版本已变化，已停止操作，请刷新后重试。" : code === "SETTINGS_STATE_CONFLICT" ? "设置状态冲突（409）：当前生命周期不允许此操作，已停止操作，请刷新后重试。" : "设置状态已变化（409）。已停止操作，请刷新后重试。";
        const error = new Error(response.status === 409 ? conflictMessage : response.status === 403 ? "当前操作员没有执行此设置操作的权限。" : "设置操作失败，未更改有效配置。") as Error & { status: number };
        error.status = response.status; throw error;
      }
      const result = validateApiResult(await response.json(), validator).data;
      if (requestGeneration !== generation.current || requestActor !== actorRef.current) return undefined;
      return result;
    } catch (error) {
      if (requestGeneration === generation.current && requestActor === actorRef.current && !(error instanceof DOMException && error.name === "AbortError")) {
        const errorMessage = error instanceof Error ? error.message : "设置操作失败。";
        const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
        if (status === 409) {
          setConflict(true); setValidation(undefined); setDiff(undefined); closeConfirmation(); setMessage(errorMessage);
        } else if (confirmation) setDialogError(errorMessage); else setMessage(errorMessage);
      }
      return undefined;
    } finally { inFlightRef.current = false; if (requestGeneration === generation.current && requestActor === actorRef.current) setBusy(false); }
  }, [actorKey, confirmation, onUnauthorized]);

  const draftValue = useCallback((): GeneralStorefrontSettingsValueV1 => {
    const gi = generalIdentity, br = brand, sf = storefront, lz = localization, dd = dealerLocation;
    return {
      generalIdentity: {
        siteDisplayName: gi.siteDisplayName.value.trim(),
        legalName: gi.legalName.value.trim(),
        canonicalUrl: gi.canonicalUrl.value.trim(),
        contactEmail: gi.contactEmail.value.trim(),
        contactPhone: gi.contactPhone.value.trim(),
        contactAddress: {
          line1: gi.addressLine1.value.trim(),
          ...(gi.addressLine2.value.trim() ? { line2: gi.addressLine2.value.trim() } : {}),
          city: gi.addressCity.value.trim(),
          province: gi.addressProvince.value.trim(),
          postalCode: gi.addressPostalCode.value.trim(),
          country: gi.addressCountry.value.trim()
        },
        defaultTimezone: gi.defaultTimezone.value as GeneralStorefrontSettingsValueV1["generalIdentity"]["defaultTimezone"]
      },
      brand: { brandName: br.brandName.value.trim(), brandDescription: br.brandDescription.value.trim(), logoMediaRef: null, faviconMediaRef: null },
      storefront: {
        homeContentRef: null, navigationRef: null, footerRef: null, storefrontConfigRef: null,
        defaultProductSort: sf.defaultProductSort.value as GeneralStorefrontSettingsValueV1["storefront"]["defaultProductSort"],
        outOfStockDisplay: sf.outOfStockDisplay.value as GeneralStorefrontSettingsValueV1["storefront"]["outOfStockDisplay"],
        dealerSelectionEnabled: sf.dealerSelectionEnabled.value === "true",
        cartCheckoutEnabled: sf.cartCheckoutEnabled.value === "true",
        enFrRoutesEnabled: sf.enFrRoutesEnabled.value === "true",
        announcementRule: {
          enabled: sf.announcementEnabled.value === "true",
          message: sf.announcementMessage.value,
          ...(sf.announcementLocale.value ? { locale: sf.announcementLocale.value as "en-CA" | "fr-CA" } : {}),
          ...(sf.announcementStartsAt.value ? { startsAt: sf.announcementStartsAt.value } : {}),
          ...(sf.announcementEndsAt.value ? { endsAt: sf.announcementEndsAt.value } : {})
        },
        maintenanceBannerRule: { enabled: false, message: "" }
      },
      localization: {
        defaultLocale: lz.defaultLocale.value as "en-CA" | "fr-CA",
        supportedLocales: lz.supportedLocales.value.split(",").map((entry) => entry.trim()).filter(Boolean) as ("en-CA" | "fr-CA")[],
        dashboardLocale: "zh-CN", currency: "CAD",
        timezone: lz.timezone.value as GeneralStorefrontSettingsValueV1["localization"]["timezone"],
        dateFormat: lz.dateFormat.value as GeneralStorefrontSettingsValueV1["localization"]["dateFormat"],
        phoneFormat: lz.phoneFormat.value as "national" | "international",
        addressFormat: "canada_default",
        weightUnits: lz.weightUnits.value as "kg" | "lb",
        dimensionUnits: lz.dimensionUnits.value as "cm" | "in",
        translationFallback: "en_ca",
        provinceServiceMapping: []
      },
      defaultDealerLocation: {
        defaultDealerRef: dd.defaultDealerRef.value.trim() || null,
        defaultLocationRef: dd.defaultLocationRef.value.trim() || null
      }
    };
  }, [generalIdentity, brand, storefront, localization, dealerLocation]);

  const validateSections = useCallback(() => {
    let firstErrorKey: string | null = null;
    const applyError = (group: FieldGroup, key: string, error: string) => {
      if (error && !firstErrorKey) firstErrorKey = `${group}.${key}`;
      if (group === "generalIdentity") setGeneralIdentity((current) => ({ ...current, [key]: { value: current[key]?.value ?? "", error } }));
      else if (group === "brand") setBrand((current) => ({ ...current, [key]: { value: current[key]?.value ?? "", error } }));
      else if (group === "storefront") setStorefront((current) => ({ ...current, [key]: { value: current[key]?.value ?? "", error } }));
      else if (group === "localization") setLocalization((current) => ({ ...current, [key]: { value: current[key]?.value ?? "", error } }));
      else setDealerLocation((current) => ({ ...current, [key]: { value: current[key]?.value ?? "", error } }));
    };
    if (!generalIdentity.siteDisplayName.value.trim() || generalIdentity.siteDisplayName.value.trim().length > 120) applyError("generalIdentity", "siteDisplayName", "站点显示名称必须是 1–120 个字符。");
    if (!generalIdentity.legalName.value.trim() || generalIdentity.legalName.value.trim().length > 200) applyError("generalIdentity", "legalName", "法定名称必须是 1–200 个字符。");
    if (!/^https?:\/\//.test(generalIdentity.canonicalUrl.value.trim()) || generalIdentity.canonicalUrl.value.trim().length > 2048) applyError("generalIdentity", "canonicalUrl", "规范网址必须是 http(s) URL 且不超过 2048 个字符。");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(generalIdentity.contactEmail.value.trim())) applyError("generalIdentity", "contactEmail", "联系邮箱格式无效。");
    if (!/^[+0-9()\s-]{7,25}$/.test(generalIdentity.contactPhone.value.trim())) applyError("generalIdentity", "contactPhone", "联系电话必须是 7–25 位的号码字符。");
    if (!generalIdentity.addressLine1.value.trim() || !generalIdentity.addressCity.value.trim() || !generalIdentity.addressProvince.value.trim() || !generalIdentity.addressPostalCode.value.trim() || !generalIdentity.addressCountry.value.trim()) applyError("generalIdentity", "addressLine1", "联系地址的主要字段不能为空。");
    if (generalIdentity.addressPostalCode.value.trim().length > 10) applyError("generalIdentity", "addressPostalCode", "邮政编码最多 10 个字符。");
    if (!brand.brandName.value.trim() || brand.brandName.value.trim().length > 120) applyError("brand", "brandName", "品牌名称必须是 1–120 个字符。");
    if (brand.brandDescription.value.length > 500) applyError("brand", "brandDescription", "品牌描述最多 500 个字符。");
    if (storefront.announcementMessage.value.length > 300) applyError("storefront", "announcementMessage", "公告消息最多 300 个字符。");
    const locales = localization.supportedLocales.value.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (!locales.length || locales.some((entry) => entry !== "en-CA" && entry !== "fr-CA") || locales.length > 2) applyError("localization", "supportedLocales", "支持的语言只能是 en-CA/fr-CA 的组合且至少一个。");
    if (locales.length && !locales.includes(localization.defaultLocale.value)) applyError("localization", "supportedLocales", "默认语言必须包含在支持语言中。");
    if (dealerLocation.defaultDealerRef.value.trim() && !isUuid(dealerLocation.defaultDealerRef.value.trim())) applyError("dealerLocation", "defaultDealerRef", "默认 Dealer 引用必须是有效的 UUID。");
    if (dealerLocation.defaultLocationRef.value.trim() && !isUuid(dealerLocation.defaultLocationRef.value.trim())) applyError("dealerLocation", "defaultLocationRef", "默认 Location 引用必须是有效的 UUID。");
    if (Boolean(dealerLocation.defaultDealerRef.value.trim()) !== Boolean(dealerLocation.defaultLocationRef.value.trim())) applyError("dealerLocation", "defaultDealerRef", "默认 Dealer 与默认 Location 必须配对设置。");
    return firstErrorKey;
  }, [generalIdentity, brand, storefront, localization, dealerLocation]);

  const focusErrorField = useCallback((key: string) => {
    const element = document.getElementById(`s02-field-${key}`);
    if (element) element.focus();
  }, []);

  const hydrateDraft = useCallback((draft: S02Draft) => {
    const value = draft.value;
    setGeneralIdentity({
      siteDisplayName: fieldState(value.generalIdentity.siteDisplayName),
      legalName: fieldState(value.generalIdentity.legalName),
      canonicalUrl: fieldState(value.generalIdentity.canonicalUrl),
      contactEmail: fieldState(value.generalIdentity.contactEmail),
      contactPhone: fieldState(value.generalIdentity.contactPhone),
      addressLine1: fieldState(value.generalIdentity.contactAddress.line1),
      addressLine2: fieldState(value.generalIdentity.contactAddress.line2 ?? ""),
      addressCity: fieldState(value.generalIdentity.contactAddress.city),
      addressProvince: fieldState(value.generalIdentity.contactAddress.province),
      addressPostalCode: fieldState(value.generalIdentity.contactAddress.postalCode),
      addressCountry: fieldState(value.generalIdentity.contactAddress.country),
      defaultTimezone: fieldState(value.generalIdentity.defaultTimezone)
    });
    setBrand({ brandName: fieldState(value.brand.brandName), brandDescription: fieldState(value.brand.brandDescription) });
    setStorefront({
      defaultProductSort: fieldState(value.storefront.defaultProductSort),
      outOfStockDisplay: fieldState(value.storefront.outOfStockDisplay),
      announcementEnabled: fieldState(String(value.storefront.announcementRule.enabled)),
      announcementMessage: fieldState(value.storefront.announcementRule.message),
      announcementLocale: fieldState(value.storefront.announcementRule.locale ?? ""),
      announcementStartsAt: fieldState(value.storefront.announcementRule.startsAt ?? ""),
      announcementEndsAt: fieldState(value.storefront.announcementRule.endsAt ?? ""),
      dealerSelectionEnabled: fieldState(String(value.storefront.dealerSelectionEnabled)),
      cartCheckoutEnabled: fieldState(String(value.storefront.cartCheckoutEnabled)),
      enFrRoutesEnabled: fieldState(String(value.storefront.enFrRoutesEnabled))
    });
    setLocalization({
      defaultLocale: fieldState(value.localization.defaultLocale),
      supportedLocales: fieldState(value.localization.supportedLocales.join(",")),
      timezone: fieldState(value.localization.timezone),
      dateFormat: fieldState(value.localization.dateFormat),
      phoneFormat: fieldState(value.localization.phoneFormat),
      weightUnits: fieldState(value.localization.weightUnits),
      dimensionUnits: fieldState(value.localization.dimensionUnits)
    });
    setDealerLocation({ defaultDealerRef: fieldState(value.defaultDealerLocation.defaultDealerRef ?? ""), defaultLocationRef: fieldState(value.defaultDealerLocation.defaultLocationRef ?? "") });
    setSectionDirty(false);
  }, []);

  const selectDraft = useCallback((draftId: string) => {
    const draft = drafts.find((entry) => entry.id === draftId);
    if (!draft) return;
    setValidation(undefined); setDiff(undefined); setConflict(false);
    setSelectedDraft(draft);
    hydrateDraft(draft);
    setReason(draft.changeReason); setPendingReason(""); setReasonError("");
  }, [drafts, hydrateDraft]);

  const createDraft = async () => {
    const invalidReason = !isValidS02Reason(reason);
    if (invalidReason) {
      setCreateReasonError("变更原因必须包含 8–500 个字符。");
      window.requestAnimationFrame(() => createReasonRef.current?.focus());
      return;
    }
    const firstErrorKey = validateSections();
    if (firstErrorKey) {
      setCreateReasonError("");
      window.requestAnimationFrame(() => focusErrorField(firstErrorKey));
      return;
    }
    setCreateReasonError("");
    const value = draftValue();
    if (!isStructurallyValidS02Value(value)) { setMessage("当前表单内容不符合 S02 结构约束，请修正后重试。"); return; }
    const input = { descriptorKey: GENERAL_STOREFRONT_DESCRIPTOR_KEY, expectedPublishedVersion: readiness?.publicationCas ?? 0, value, changeReason: reason.trim(), idempotencyKey: idempotencyKey("draft") } as const;
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createDraft", input }, validateS02Draft) as S02Draft | undefined;
    if (!draft) return;
    try {
      bindCreatedS02Draft(draft, input);
      setDrafts((current) => [draft, ...current.filter((entry) => entry.id !== draft.id)]);
      setSelectedDraft(draft); setDiff(undefined); setValidation(undefined); setConflict(false);
      setMessage("S02 设置草稿已创建。");
      hydrateDraft(draft);
      setReason(draft.changeReason); setPendingReason("");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("创建草稿响应与提交内容不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const saveDraft = async () => {
    if (!selectedDraft) return;
    const submittedReason = pendingReasonRef.current || reason;
    if (!isValidS02Reason(submittedReason)) {
      setReasonError("变更原因必须包含 8–500 个字符。");
      window.requestAnimationFrame(() => document.getElementById("s02-draft-reason")?.focus());
      return;
    }
    const firstErrorKey = validateSections();
    if (firstErrorKey) {
      setReasonError("");
      window.requestAnimationFrame(() => focusErrorField(firstErrorKey));
      return;
    }
    setReasonError("");
    const value = draftValue();
    if (!isStructurallyValidS02Value(value)) { setMessage("当前表单内容不符合 S02 结构约束，请修正后重试。"); return; }
    const submittedDraft = selectedDraft;
    const input = { expectedVersion: submittedDraft.version, value, changeReason: submittedReason.trim(), idempotencyKey: idempotencyKey("update") };
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "updateDraft", draftId: submittedDraft.id, status: submittedDraft.status, input }, validateS02Draft) as S02Draft | undefined;
    if (!draft) return;
    try {
      bindUpdatedS02Draft(draft, submittedDraft, input.value, input.changeReason);
      setSelectedDraft(draft); setDrafts((current) => current.map((entry) => entry.id === draft.id ? draft : entry));
      setValidation(undefined); setDiff(undefined); setConflict(false);
      setMessage("S02 设置草稿已保存。请重新验证后再发布。");
      hydrateDraft(draft);
      setReason(draft.changeReason); setPendingReason("");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("草稿响应与请求内容不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const validateDraft = async () => {
    if (!selectedDraft) return;
    const sourceDraft = selectedDraft;
    const expectedVersion = sourceDraft.version;
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "validateDraft", draftId: sourceDraft.id, status: sourceDraft.status, input: { expectedVersion, idempotencyKey: idempotencyKey("validate") } }, validateS02ValidationResult) as S02ValidationResult | undefined;
    if (!result) return;
    try { bindS02Validation(result, sourceDraft.id, expectedVersion, sourceDraft.status); }
    catch { setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("S02 验证响应与所请求草稿版本不匹配，正在重新读取权威状态。"); void load(); return; }
    {
      const validatedDraft: S02Draft = { ...sourceDraft, status: result.status, version: result.draftVersion, validationRevision: result.validationRevision, updatedAt: result.validatedAt };
      selectedDraftRef.current = validatedDraft;
      setValidation(result);
      setSelectedDraft(validatedDraft);
      setDrafts((current) => current.map((draft) => draft.id === result.draftId ? validatedDraft : draft));
      if (result.status === "validated") {
        try {
          const diffGeneration = generation.current;
          const diffActor = actorKey;
          const diffDraftId = result.draftId;
          const diffDraftVersion = result.draftVersion;
          const diffController = new AbortController();
          diffControllerRef.current?.abort();
          diffControllerRef.current = diffController;
          const response = await apiRequest(API_ENDPOINTS.dashboardS02SettingsDraftDiff(diffDraftId), { signal: diffController.signal });
          if (response.status === 401) onUnauthorized();
          if (response.ok) {
            const nextDiff = validateApiResult(await response.json(), validateS02SafeDiff).data;
            const currentDraft = selectedDraftRef.current;
            if (diffController.signal.aborted || diffGeneration !== generation.current || diffActor !== actorRef.current || currentDraft?.id !== diffDraftId || currentDraft.version !== diffDraftVersion || currentDraft.status !== result.status) return;
            try { setDiff(bindS02Diff(nextDiff, result)); }
            catch { setDiff(undefined); setConflict(true); setMessage("S02 安全差异与当前草稿版本不匹配，正在重新读取权威状态。"); void load(); }
          }
        } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) { /* Validation remains visible; publish stays disabled without a current safe diff. */ } }
      } else {
        setDiff(undefined);
      }
    }
  };

  const publishDraft = async () => {
    if (!confirmation || confirmation.kind !== "publish") return;
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "publishDraft", draftId: confirmation.draft.id, status: confirmation.draft.status, input: { expectedVersion: confirmation.draft.version, idempotencyKey: idempotencyKey("publish") } }, validateS02Publication) as S02Publication | undefined;
    if (!result) return;
    try {
      bindPublishedS02(result, confirmation.draft.id, confirmation.draft.version);
      closeConfirmation();
      const appliedGeneration = readinessConsumerRef.current.install(result.readiness.publishedGeneration, () => { if (generation.current === generation.current) void load(); });
      setMessage(`S02 设置已发布。已安装发布代次 ${appliedGeneration}，正在等待消费者确认。`);
      if (capability.readiness.read) {
        try {
          const controller = controllerRef.current?.signal ?? new AbortController().signal;
          const confirmed = await getData(`${API_ENDPOINTS.dashboardS02SettingsReadiness}?consumerGeneration=${appliedGeneration}`, controller, validateS02Readiness);
          if (confirmed.consumerGeneration === appliedGeneration && confirmed.publishedGeneration === appliedGeneration && confirmed.state === "ready") {
            setReadiness(confirmed);
            setMessage("S02 设置已发布，消费者已确认发布代次。");
          } else {
            setReadiness(confirmed);
            setMessage("S02 设置已发布。消费者确认尚未完成，仍显示权威状态。");
          }
        } catch {
          setReadiness(undefined);
          setMessage("S02 设置已发布。消费者确认暂时不可用，请刷新查看就绪状态。");
        }
      } else {
        setReadiness(undefined);
      }
      void load();
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); closeConfirmation(); setMessage("S02 发布响应与已确认草稿版本不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const createRollback = async () => {
    if (!confirmation || confirmation.kind !== "rollback") return;
    if (rollbackReason.trim().length < 8) {
      setRollbackError("回滚草稿原因至少需要 8 个字符。");
      window.requestAnimationFrame(() => rollbackReasonRef.current?.focus());
      return;
    }
    setRollbackError("");
    const submittedCurrentPublishedVersion = readiness?.publicationCas ?? 0;
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createRollbackDraft", publicationId: confirmation.publication.publicationId, sourceStatus: confirmation.publication.status, input: { expectedPublishedVersion: submittedCurrentPublishedVersion, changeReason: rollbackReason.trim(), idempotencyKey: idempotencyKey("rollback") } }, validateS02Draft) as S02Draft | undefined;
    if (!draft) return;
    try {
      bindRollbackS02Draft(draft, confirmation.publication, submittedCurrentPublishedVersion);
      closeConfirmation();
      setDrafts((current) => [draft, ...current.filter((entry) => entry.id !== draft.id)]);
      setSelectedDraft(draft); setValidation(undefined); setDiff(undefined); setConflict(false);
      setMessage("S02 回滚草稿已创建。");
      hydrateDraft(draft);
      setReason(draft.changeReason); setPendingReason("");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); closeConfirmation(); setMessage("S02 回滚草稿响应与已确认发布不匹配，正在重新读取权威状态。"); void load();
    }
  };

  useEffect(() => {
    if (!selectedDraft) return;
    hydrateDraft(selectedDraft);
    setReason(selectedDraft.changeReason); setPendingReason(""); setReasonError("");
    // Draft content is authoritative from the server snapshot; typed edits
    // re-hydrate after each save. Section errors are not draft state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDraft?.id, selectedDraft?.version]);

  const editableDraft = Boolean(selectedDraft && ["draft", "invalid", "activation_failed", "rollback_draft"].includes(selectedDraft.status));
  const blockCount = validation?.issues.filter((issue) => issue.severity === "blocker").length ?? 0;
  const warningInfoCount = (validation?.issues.length ?? 0) - blockCount;

  const renderField = (group: FieldGroup, key: string, label: string, input: ReactNode, help?: string) => {
    const field = group === "generalIdentity" ? generalIdentity[key] : group === "brand" ? brand[key] : group === "storefront" ? storefront[key] : group === "localization" ? localization[key] : dealerLocation[key];
    const error = field?.error ?? "";
    return <label className={styles.field} htmlFor={`s02-field-${group}.${key}`}><span>{label}</span>{input}{help ? <small>{help}</small> : null}{error ? <span aria-describedby={`s02-field-${group}.${key}`} className={`${styles.status} ${styles.error}`} id={`s02-error-${group}.${key}`} role="alert">{error}</span> : null}</label>;
  };

  return <section aria-label="通用店面设置" className={styles.panel}>
    <header className={styles.header}><div><h2>通用店面设置</h2><p>管理 General/Brand/Storefront/Localization 设置草稿与发布生命周期。Media/CMS/Dealer 引用只显示 ID，不显示正文、文件字节或敏感内容。</p></div><span className={styles.badge}>settings.general-storefront.v1</span></header>
    <p aria-live="polite" className={`${styles.status} ${message ? styles.error : ""}`} role={message ? "alert" : "status"}>{message || (state === "loading" ? "正在读取通用店面设置。" : state === "empty" ? "请求成功，当前没有 S02 设置记录。" : state === "forbidden" ? "设置中心访问被拒绝。" : state === "error" ? "设置中心已降级，失败未被当作空数据。" : "通用店面设置快照已刷新。")}</p>

    <section className={styles.summary} aria-label="生命周期状态">
      <div><dt>生命周期状态</dt><dd>{selectedDraft ? statusLabels[selectedDraft.status] : "无开放草稿"}</dd></div>
      <div><dt>草稿版本</dt><dd>{selectedDraft ? selectedDraft.version : "—"}</dd></div>
      <div><dt>验证状态</dt><dd>{validation ? (validation.status === "validated" ? "验证通过" : "验证未通过") : selectedDraft?.status === "validated" ? "已验证" : "未验证"}</dd></div>
      <div><dt>就绪状态</dt><dd><span className={`${styles.badge} ${readiness?.state === "ready" ? styles.ready : styles.degraded}`}>{readiness?.state === "ready" ? "ready" : readiness?.state ?? "未确认"}</span></dd></div>
    </section>

    <nav aria-label="通用店面视图" className={styles.tabs}>
      <button aria-pressed="true" className={styles.button} disabled type="button">通用店面</button>
      <button className={styles.button} onClick={() => void load()} type="button">刷新</button>
    </nav>

    <section className={styles.section} aria-labelledby="s02-draft-title">
      <div className={styles.sectionHeading}><div><h3 id="s02-draft-title">草稿</h3><p>先创建草稿，再验证、审阅安全差异并明确确认发布。业务有效性由服务器验证生命周期决定。</p></div><span aria-atomic="true" aria-live="polite" role="status">{sectionDirty ? "有未保存的更改。" : "没有未保存的更改。"}</span></div>
      {drafts.length ? <label className={styles.field}><span>选择草稿</span><select aria-label="选择草稿" onChange={(event) => selectDraft(event.target.value)} value={selectedDraft?.id ?? ""}>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.id.slice(0, 8)} · {statusLabels[draft.status]}</option>)}</select></label> : <p>目前没有 S02 设置草稿。请先创建草稿。</p>}
      {!selectedDraft ? <p>以下字段展示编译默认值；创建草稿后才会提交到服务器。</p> : null}
      {!editableDraft && selectedDraft ? <p>当前草稿状态为 {statusLabels[selectedDraft.status]}，字段为只读；只有草稿/无效/激活失败/回滚草稿状态可编辑。</p> : null}
    </section>

    <fieldset className={styles.section} aria-labelledby="s02-generalidentity-title">
      <legend id="s02-generalidentity-title">General 身份与联系方式</legend>
      <div className={styles.grid}>
        {renderField("generalIdentity", "siteDisplayName", "站点显示名称", <input aria-invalid={generalIdentity.siteDisplayName.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.siteDisplayName" maxLength={120} onChange={(event) => setField("generalIdentity", "siteDisplayName", event.target.value)} value={generalIdentity.siteDisplayName.value} />, "公共可见，SiteHeader 消费。")}
        {renderField("generalIdentity", "legalName", "法定名称", <input aria-invalid={generalIdentity.legalName.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.legalName" maxLength={200} onChange={(event) => setField("generalIdentity", "legalName", event.target.value)} value={generalIdentity.legalName.value} />)}
        {renderField("generalIdentity", "canonicalUrl", "规范网址", <input aria-invalid={generalIdentity.canonicalUrl.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.canonicalUrl" maxLength={2048} onChange={(event) => setField("generalIdentity", "canonicalUrl", event.target.value)} value={generalIdentity.canonicalUrl.value} />)}
        {renderField("generalIdentity", "contactEmail", "联系邮箱", <input aria-invalid={generalIdentity.contactEmail.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.contactEmail" onChange={(event) => setField("generalIdentity", "contactEmail", event.target.value)} value={generalIdentity.contactEmail.value} />)}
        {renderField("generalIdentity", "contactPhone", "联系电话", <input aria-invalid={generalIdentity.contactPhone.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.contactPhone" onChange={(event) => setField("generalIdentity", "contactPhone", event.target.value)} value={generalIdentity.contactPhone.value} />)}
        {renderField("generalIdentity", "defaultTimezone", "默认时区", <select aria-invalid={generalIdentity.defaultTimezone.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.defaultTimezone" onChange={(event) => setField("generalIdentity", "defaultTimezone", event.target.value)} value={generalIdentity.defaultTimezone.value}>{CANADA_TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select>)}
        {renderField("generalIdentity", "addressLine1", "地址第一行", <input aria-invalid={generalIdentity.addressLine1.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.addressLine1" maxLength={200} onChange={(event) => setField("generalIdentity", "addressLine1", event.target.value)} value={generalIdentity.addressLine1.value} />)}
        {renderField("generalIdentity", "addressLine2", "地址第二行（可选）", <input disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.addressLine2" maxLength={200} onChange={(event) => setField("generalIdentity", "addressLine2", event.target.value)} value={generalIdentity.addressLine2.value} />)}
        {renderField("generalIdentity", "addressCity", "城市", <input aria-invalid={generalIdentity.addressCity.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.addressCity" maxLength={120} onChange={(event) => setField("generalIdentity", "addressCity", event.target.value)} value={generalIdentity.addressCity.value} />)}
        {renderField("generalIdentity", "addressProvince", "省份", <input aria-invalid={generalIdentity.addressProvince.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.addressProvince" maxLength={80} onChange={(event) => setField("generalIdentity", "addressProvince", event.target.value)} value={generalIdentity.addressProvince.value} />)}
        {renderField("generalIdentity", "addressPostalCode", "邮政编码", <input aria-invalid={generalIdentity.addressPostalCode.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.addressPostalCode" maxLength={10} onChange={(event) => setField("generalIdentity", "addressPostalCode", event.target.value)} value={generalIdentity.addressPostalCode.value} />)}
        {renderField("generalIdentity", "addressCountry", "国家", <input aria-invalid={generalIdentity.addressCountry.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-generalIdentity.addressCountry" maxLength={80} onChange={(event) => setField("generalIdentity", "addressCountry", event.target.value)} value={generalIdentity.addressCountry.value} />)}
      </div>
    </fieldset>

    <fieldset className={styles.section} aria-labelledby="s02-brand-title">
      <legend id="s02-brand-title">Brand 与 Media 引用</legend>
      <div className={styles.grid}>
        {renderField("brand", "brandName", "品牌名称", <input aria-invalid={brand.brandName.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-brand.brandName" maxLength={120} onChange={(event) => setField("brand", "brandName", event.target.value)} value={brand.brandName.value} />)}
        {renderField("brand", "brandDescription", "品牌描述", <textarea aria-invalid={brand.brandDescription.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-brand.brandDescription" maxLength={500} onChange={(event) => setField("brand", "brandDescription", event.target.value)} value={brand.brandDescription.value} />)}
        <div className={styles.readonlyRow}><span>Logo Media 引用</span><code>{displayReference(null)}</code><small>P07 Media 引用，只读显示，不复制文件字节。</small></div>
        <div className={styles.readonlyRow}><span>Favicon Media 引用</span><code>{displayReference(null)}</code><small>P07 Media 引用，只读显示。</small></div>
        <div className={styles.readonlyRow}><span>基础色值</span><code>compiled（当前 UI 未消费，从可编辑 schema 移除）</code></div>
        <div className={styles.readonlyRow}><span>字体族</span><code>compiled（当前 UI 未消费，从可编辑 schema 移除）</code></div>
      </div>
    </fieldset>

    <fieldset className={styles.section} aria-labelledby="s02-storefront-title">
      <legend id="s02-storefront-title">Storefront 规则与 CMS 引用</legend>
      <div className={styles.grid}>
        {renderField("storefront", "defaultProductSort", "默认产品排序", <select aria-invalid={storefront.defaultProductSort.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.defaultProductSort" onChange={(event) => setField("storefront", "defaultProductSort", event.target.value)} value={storefront.defaultProductSort.value}><option value="newest">最新</option><option value="price_asc">价格升序</option><option value="price_desc">价格降序</option><option value="featured">精选</option></select>)}
        {renderField("storefront", "outOfStockDisplay", "缺货显示", <select aria-invalid={storefront.outOfStockDisplay.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.outOfStockDisplay" onChange={(event) => setField("storefront", "outOfStockDisplay", event.target.value)} value={storefront.outOfStockDisplay.value}><option value="hide">隐藏</option><option value="show">显示</option><option value="hide_with_contact">隐藏并显示联系入口</option></select>)}
        {renderField("storefront", "dealerSelectionEnabled", "Dealer 选择", <select aria-invalid={storefront.dealerSelectionEnabled.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.dealerSelectionEnabled" onChange={(event) => setField("storefront", "dealerSelectionEnabled", event.target.value)} value={storefront.dealerSelectionEnabled.value}><option value="true">启用</option><option value="false">停用</option></select>)}
        {renderField("storefront", "cartCheckoutEnabled", "购物车结算", <select aria-invalid={storefront.cartCheckoutEnabled.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.cartCheckoutEnabled" onChange={(event) => setField("storefront", "cartCheckoutEnabled", event.target.value)} value={storefront.cartCheckoutEnabled.value}><option value="true">启用</option><option value="false">停用</option></select>)}
        {renderField("storefront", "enFrRoutesEnabled", "EN/FR 双语路由", <select aria-invalid={storefront.enFrRoutesEnabled.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.enFrRoutesEnabled" onChange={(event) => setField("storefront", "enFrRoutesEnabled", event.target.value)} value={storefront.enFrRoutesEnabled.value}><option value="true">启用</option><option value="false">停用</option></select>)}
        {renderField("storefront", "announcementEnabled", "公告启用", <select aria-invalid={storefront.announcementEnabled.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.announcementEnabled" onChange={(event) => setField("storefront", "announcementEnabled", event.target.value)} value={storefront.announcementEnabled.value}><option value="true">启用</option><option value="false">停用</option></select>)}
        {renderField("storefront", "announcementMessage", "公告消息", <textarea aria-invalid={storefront.announcementMessage.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.announcementMessage" maxLength={300} onChange={(event) => setField("storefront", "announcementMessage", event.target.value)} value={storefront.announcementMessage.value} />, "SiteHeader 真实消费字段。")}
        {renderField("storefront", "announcementLocale", "公告语言", <select aria-invalid={storefront.announcementLocale.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.announcementLocale" onChange={(event) => setField("storefront", "announcementLocale", event.target.value)} value={storefront.announcementLocale.value}><option value="">跟随站点语言</option><option value="en-CA">en-CA</option><option value="fr-CA">fr-CA</option></select>)}
        {renderField("storefront", "announcementStartsAt", "公告开始时间", <input aria-invalid={storefront.announcementStartsAt.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.announcementStartsAt" onChange={(event) => setField("storefront", "announcementStartsAt", event.target.value)} value={storefront.announcementStartsAt.value} />, "ISO UTC 时间，留空表示不限制。")}
        {renderField("storefront", "announcementEndsAt", "公告结束时间", <input aria-invalid={storefront.announcementEndsAt.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-storefront.announcementEndsAt" onChange={(event) => setField("storefront", "announcementEndsAt", event.target.value)} value={storefront.announcementEndsAt.value} />, "ISO UTC 时间，留空表示不限制。")}
        <div className={styles.readonlyRow}><span>Home Content 引用</span><code>{displayReference(null)}</code></div>
        <div className={styles.readonlyRow}><span>Navigation 引用</span><code>{displayReference(null)}</code></div>
        <div className={styles.readonlyRow}><span>Footer 引用</span><code>{displayReference(null)}</code></div>
        <div className={styles.readonlyRow}><span>Storefront Config 引用</span><code>legacy 只读引用，不回写</code></div>
        <div className={styles.readonlyRow}><span>维护横幅规则</span><code>仅冻结，无消费，从可编辑 schema 移除</code></div>
      </div>
    </fieldset>

    <fieldset className={styles.section} aria-labelledby="s02-localization-title">
      <legend id="s02-localization-title">Localization</legend>
      <div className={styles.grid}>
        {renderField("localization", "defaultLocale", "默认语言", <select aria-invalid={localization.defaultLocale.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-localization.defaultLocale" onChange={(event) => setField("localization", "defaultLocale", event.target.value)} value={localization.defaultLocale.value}><option value="en-CA">en-CA</option><option value="fr-CA">fr-CA</option></select>)}
        {renderField("localization", "supportedLocales", "支持的语言", <input aria-invalid={localization.supportedLocales.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-localization.supportedLocales" onChange={(event) => setField("localization", "supportedLocales", event.target.value)} value={localization.supportedLocales.value} />, "逗号分隔，仅 en-CA/fr-CA，必须包含默认语言。")}
        {renderField("localization", "timezone", "时区", <select aria-invalid={localization.timezone.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-localization.timezone" onChange={(event) => setField("localization", "timezone", event.target.value)} value={localization.timezone.value}>{CANADA_TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select>)}
        {renderField("localization", "dateFormat", "日期格式", <select aria-invalid={localization.dateFormat.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-localization.dateFormat" onChange={(event) => setField("localization", "dateFormat", event.target.value)} value={localization.dateFormat.value}><option value="yyyy-mm-dd">yyyy-mm-dd</option><option value="dd-mm-yyyy">dd-mm-yyyy</option><option value="mm-dd-yyyy">mm-dd-yyyy</option></select>)}
        {renderField("localization", "phoneFormat", "电话格式", <select aria-invalid={localization.phoneFormat.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-localization.phoneFormat" onChange={(event) => setField("localization", "phoneFormat", event.target.value)} value={localization.phoneFormat.value}><option value="national">national</option><option value="international">international</option></select>)}
        {renderField("localization", "weightUnits", "重量单位", <select aria-invalid={localization.weightUnits.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-localization.weightUnits" onChange={(event) => setField("localization", "weightUnits", event.target.value)} value={localization.weightUnits.value}><option value="kg">kg</option><option value="lb">lb</option></select>)}
        {renderField("localization", "dimensionUnits", "尺寸单位", <select aria-invalid={localization.dimensionUnits.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-localization.dimensionUnits" onChange={(event) => setField("localization", "dimensionUnits", event.target.value)} value={localization.dimensionUnits.value}><option value="cm">cm</option><option value="in">in</option></select>)}
        <div className={styles.readonlyRow}><span>Dashboard 语言</span><code>zh-CN（固定只读 literal）</code></div>
        <div className={styles.readonlyRow}><span>货币</span><code>CAD（v1 唯一）</code></div>
        <div className={styles.readonlyRow}><span>地址格式</span><code>canada_default</code></div>
        <div className={styles.readonlyRow}><span>翻译回退</span><code>en_ca（v1 固定）</code></div>
        <div className={styles.readonlyRow}><span>省份服务映射</span><code>{S02_COMPILED_VALUE.localization.provinceServiceMapping.length} 项（仅引用，只读）</code></div>
      </div>
    </fieldset>

    <fieldset className={styles.section} aria-labelledby="s02-dealer-title">
      <legend id="s02-dealer-title">默认 Dealer/Location 引用</legend>
      <div className={styles.grid}>
        {renderField("dealerLocation", "defaultDealerRef", "默认 Dealer 引用", <input aria-invalid={dealerLocation.defaultDealerRef.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-dealerLocation.defaultDealerRef" onChange={(event) => setField("dealerLocation", "defaultDealerRef", event.target.value)} value={dealerLocation.defaultDealerRef.value} placeholder="uuid" />, "必须与默认 Location 配对。")}
        {renderField("dealerLocation", "defaultLocationRef", "默认 Location 引用", <input aria-invalid={dealerLocation.defaultLocationRef.error ? true : undefined} disabled={!editableDraft && Boolean(selectedDraft)} id="s02-field-dealerLocation.defaultLocationRef" onChange={(event) => setField("dealerLocation", "defaultLocationRef", event.target.value)} value={dealerLocation.defaultLocationRef.value} placeholder="uuid" />, "必须属于默认 Dealer。")}
      </div>
    </fieldset>

    <div className={styles.actions}>
      {!selectedDraft ? <label className={styles.field}><span>变更原因</span><textarea aria-describedby={createReasonError ? "s02-create-reason-error" : undefined} aria-invalid={createReasonError ? true : undefined} id="s02-create-reason" maxLength={500} minLength={8} onChange={(event) => { setReason(event.target.value); if (createReasonError && isValidS02Reason(event.target.value)) setCreateReasonError(""); }} ref={createReasonRef} value={reason} />{createReasonError ? <span className={`${styles.status} ${styles.error}`} id="s02-create-reason-error" role="alert">{createReasonError}</span> : null}</label> : null}
      {!selectedDraft ? <button className={`${styles.button} ${styles.primary}`} disabled={busy || conflict} onClick={() => void createDraft()} type="button">创建草稿</button> : null}
      {editableDraft ? <>
        <label className={styles.field}><span>变更原因</span><textarea aria-describedby={reasonError ? "s02-reason-error" : undefined} aria-invalid={reasonError ? true : undefined} id="s02-draft-reason" maxLength={500} minLength={8} onChange={(event) => { setPendingReason(event.target.value); if (reasonError && isValidS02Reason(event.target.value)) setReasonError(""); }} value={pendingReason} />{reasonError ? <span className={`${styles.status} ${styles.error}`} id="s02-reason-error" role="alert">{reasonError}</span> : null}</label>
        <button className={styles.button} disabled={!capability.actions.updateDraft || busy || conflict} onClick={() => void saveDraft()} type="button">保存草稿</button>
      </> : null}
      {selectedDraft ? <>
        <button className={styles.button} disabled={!capability.actions.validate || busy || conflict || !["draft", "invalid", "validated", "activation_failed", "rollback_draft"].includes(selectedDraft.status)} onClick={() => void validateDraft()} type="button">验证草稿</button>
        <button className={`${styles.button} ${styles.primary}`} disabled={!capability.actions.publish || selectedDraft.status !== "validated" || blockCount > 0 || !diff || busy || conflict} onClick={() => { setDialogError(""); if (diff) setConfirmation({ kind: "publish", draft: selectedDraft, diff }); }} type="button">审阅并发布</button>
      </> : null}
    </div>

    {validation ? <div><p aria-atomic="true" aria-live="polite" role="status">验证完成：{blockCount} 个阻断，{warningInfoCount} 个非阻断提示。</p><h4>{validation.status === "invalid" ? "验证阻断" : "验证通过"}</h4>{validation.issues.length ? <ul className={styles.issues}>{validation.issues.map((issue, index) => <li key={`${issue.code}-${index}`}><strong>{severityLabels[issue.severity] ?? issue.severity}</strong> · <code>{issue.field}</code>：{issue.message}</li>)}</ul> : <p>没有验证问题。</p>}</div> : null}

    {diff ? <section className={styles.section}><h3>安全差异</h3><table className={styles.diff}><caption className="visually-hidden">通用店面设置草稿公开差异</caption><thead><tr><th scope="col">字段路径</th><th scope="col">当前</th><th scope="col">候选</th><th scope="col">敏感度</th></tr></thead><tbody>{diff.changes.map((change) => <tr key={change.field}><td><code>{change.field}</code></td><td>{formatDiffValue(change.before)}</td><td>{formatDiffValue(change.after)}</td><td>{change.sensitivity}</td></tr>)}</tbody></table><p>密钥变更：{diff.secretChangeCount}；无需重启；影响服务：Storefront、Dashboard。差异只显示字段路径与引用 ID，不包含 CMS 正文、Media 字节或敏感内容。</p></section> : null}

    <section className={styles.section} aria-labelledby="s02-history-title"><h3 id="s02-history-title" tabIndex={-1}>追加式发布历史</h3>{history.length ? <ol className={styles.historyList}>{history.map((entry) => <li key={`${entry.publicationId}:${entry.version}:${entry.status}`}><p><strong>版本 {entry.version}</strong> · {statusLabels[entry.status]} · {formatDate(entry.publishedAt)}</p><p>{entry.changeReason}</p><button className={styles.button} disabled={!capability.actions.rollback || busy || conflict || !["published", "superseded"].includes(entry.status)} onClick={() => { setRollbackReason(""); setRollbackError(""); setDialogError(""); setConfirmation({ kind: "rollback", publication: entry }); }} type="button">创建回滚草稿</button></li>)}</ol> : <p>尚无 S02 发布历史。空历史不会被视为错误。</p>}</section>

    {confirmation ? <div className={styles.modalRoot} ref={modalRootRef}><section aria-labelledby="s02-confirm-title" aria-modal="true" className={styles.dialog} ref={dialogRef} role="dialog" tabIndex={-1}><h3 id="s02-confirm-title">{confirmation.kind === "publish" ? "确认发布通用店面设置草稿" : "确认创建 S02 回滚草稿"}</h3>{confirmation.kind === "publish" ? <><p>发布会把以下字段应用到 Storefront 与 Dashboard：</p><ul className={styles.issues}>{confirmation.diff.changes.map((change) => <li key={change.field}><code>{change.field}</code>：{formatDiffValue(change.before)} → {formatDiffValue(change.after)}</li>)}</ul><p>发布是原子的，不允许部分发布。确认草稿 <code>{confirmation.draft.id}</code>，版本 {confirmation.draft.version}。</p></> : <><p>回滚不会直接改写历史，而是从发布版本 {confirmation.publication.version} 创建一个新草稿。</p><label className={styles.field}><span>回滚原因</span><textarea aria-describedby={rollbackError ? "s02-rollback-error" : undefined} aria-invalid={rollbackError ? true : undefined} autoFocus maxLength={500} minLength={8} onChange={(event) => { setRollbackReason(event.target.value); if (rollbackError && isValidS02Reason(event.target.value)) setRollbackError(""); if (dialogError) setDialogError(""); }} ref={rollbackReasonRef} value={rollbackReason} /></label>{rollbackError ? <p aria-live="assertive" className={`${styles.status} ${styles.error}`} id="s02-rollback-error" role="alert">{rollbackError}</p> : null}</>}{dialogError ? <p aria-live="assertive" className={`${styles.status} ${styles.error}`} role="alert">{dialogError}</p> : null}<div className={styles.actions}><button className={styles.button} onClick={closeConfirmation} type="button">取消</button><button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void (confirmation.kind === "publish" ? publishDraft() : createRollback())} type="button">{confirmation.kind === "publish" ? "确认发布" : "确认创建草稿"}</button></div></section></div> : null}
  </section>;
}
