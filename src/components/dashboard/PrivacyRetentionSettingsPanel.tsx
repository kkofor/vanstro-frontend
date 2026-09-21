"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PrivacyRetentionSettingsValueV1,
  SettingsCenterCapability,
  S10Draft,
  S10HistoryEntry,
  S10ImpactPreviewResult,
  S10Publication,
  S10Readiness,
  S10SafeDiff,
  S10ValidationResult
} from "@/lib/api/api-contract";
import { API_ENDPOINTS, PRIVACY_RETENTION_DESCRIPTOR_KEY } from "@/lib/api/api-contract";
import {
  validateApiResult,
  validateS10Draft,
  validateS10HistoryEntry,
  validateS10ImpactPreviewResult,
  validateS10Overview,
  validateS10Publication,
  validateS10Readiness,
  validateS10SafeDiff,
  validateS10ValidationResult,
  type RuntimeValidator
} from "@/lib/api/runtime-validation";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { authorizeS10Operation } from "@/lib/dashboard/s10-settings-transport";
import {
  bindCreatedS10Draft,
  bindPublishedS10,
  bindRollbackS10Draft,
  bindS10Diff,
  bindS10Validation,
  bindUpdatedS10Draft,
  isStructurallyValidS10Value,
  isValidS10Reason,
  S10_COMPILED_VALUE,
  S10_HIGH_RISK_FAMILIES,
  S10_OBJECT_FAMILIES,
  type S10Location
} from "@/lib/dashboard/s10-settings";
import { createS10ReadinessConsumer } from "@/lib/dashboard/s10-settings-readiness-consumer";
import type { SiteLocale } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { StatusMessage, StatusMessageContent, StatusMessageTitle } from "@/components/ui/status-message";
import styles from "./PrivacyRetentionSettingsPanel.module.css";

type ValidLocation = Extract<S10Location, { kind: "valid" }>;
type Props = {
  actorKey: string;
  capability: SettingsCenterCapability;
  location: ValidLocation;
  locale: SiteLocale;
  apiRequest: (path: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => void;
};
type LoadState = "loading" | "ready" | "empty" | "forbidden" | "error";
type Confirmation = { kind: "publish"; draft: S10Draft; diff: S10SafeDiff } | { kind: "rollback"; publication: S10HistoryEntry };
type FieldState = { value: string; error: string };
type FamilyRow = { objectFamily: string; retentionDays: string; autoCleanupEnabled: boolean };
type DsarRuleRow = { scope: string; method: string; enabled: boolean; requireAdminApproval: boolean };
type PiiRuleRow = { field: string; displayMode: string; allowedRoles: string };

const statusLabels: Record<string, string> = { draft: "草稿", validated: "已验证", invalid: "验证未通过", publishing: "发布中", activation_failed: "激活失败", rollback_draft: "回滚草稿", published: "已发布", superseded: "已被后续版本取代", rolled_back: "已回滚", degraded: "降级" };
const severityLabels: Record<string, string> = { blocker: "阻断", warning: "警告", info: "提示" };
const familyLabels: Record<string, string> = { consent_events: "同意事件", audit_events: "审计事件", async_jobs: "异步任务", media_assets: "媒体资产", orders: "订单", payments: "支付", privacy_requests: "隐私请求" };
const scopeLabels: Record<string, string> = { all_personal_data: "全部个人数据", orders: "订单", payments: "支付", media: "媒体", communications: "通讯" };
const methodLabels: Record<string, string> = { access: "访问", export: "导出", delete: "删除" };
const displayModeLabels: Record<string, string> = { plain: "明文", masked: "脱敏", hidden: "隐藏" };

function arrayValidator<T>(validator: RuntimeValidator<T>, name: string): RuntimeValidator<T[]> {
  return (wire) => {
    if (!Array.isArray(wire)) throw new TypeError(`${name} 响应不是列表。`);
    return wire.map((entry, index) => validator(entry, `${name}[${index}]`));
  };
}
function idempotencyKey(action: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `settings-s10-${action}-${random}`;
}
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString("zh-CN") : "尚无"; }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function fieldState(initial: string): FieldState { return { value: initial, error: "" }; }
function formatDiffValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
function familiesFromValue(value: PrivacyRetentionSettingsValueV1): FamilyRow[] {
  return S10_OBJECT_FAMILIES.map((objectFamily) => {
    const existing = value.retentionPolicy.retentionByObjectFamily.find((entry) => entry.objectFamily === objectFamily);
    return { objectFamily, retentionDays: existing ? String(existing.retentionDays) : "", autoCleanupEnabled: existing?.autoCleanupEnabled ?? false };
  });
}
function dsarRowsFromValue(value: PrivacyRetentionSettingsValueV1): DsarRuleRow[] {
  return value.dsarPolicy.accessExportDeleteRules.map((rule) => ({ scope: rule.scope, method: rule.method, enabled: rule.enabled, requireAdminApproval: rule.requireAdminApproval }));
}
function piiRowsFromValue(value: PrivacyRetentionSettingsValueV1): PiiRuleRow[] {
  return value.piiDisplayPolicy.piiDisplayRules.map((rule) => ({ field: rule.field, displayMode: rule.displayMode, allowedRoles: rule.allowedRoles.join(",") }));
}

export function PrivacyRetentionSettingsPanel({ actorKey, capability, location, locale, apiRequest, onUnauthorized }: Props) {
  const [drafts, setDrafts] = useState<S10Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<S10Draft>();
  const [validation, setValidation] = useState<S10ValidationResult>();
  const [diff, setDiff] = useState<S10SafeDiff>();
  const [history, setHistory] = useState<S10HistoryEntry[]>([]);
  const [readiness, setReadiness] = useState<S10Readiness>();
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

  const [anonymousConsentEnabled, setAnonymousConsentEnabled] = useState(true);
  const [consentCategories, setConsentCategories] = useState<string[]>([...S10_COMPILED_VALUE.consentPolicy.consentCategories]);
  const [retentionMonths, setRetentionMonths] = useState<FieldState>(fieldState(String(S10_COMPILED_VALUE.consentPolicy.retentionMonths)));
  const [families, setFamilies] = useState<FamilyRow[]>(familiesFromValue(S10_COMPILED_VALUE));
  const [legalHoldEnabled, setLegalHoldEnabled] = useState(false);
  const [legalHoldRefs, setLegalHoldRefs] = useState("");
  const [dsarRules, setDsarRules] = useState<DsarRuleRow[]>([]);
  const [piiRules, setPiiRules] = useState<PiiRuleRow[]>([]);
  const [allowlist, setAllowlist] = useState<string[]>([...S10_COMPILED_VALUE.lowRiskExecution.allowlist]);
  const [impactPreviewEnabled, setImpactPreviewEnabled] = useState(S10_COMPILED_VALUE.lowRiskExecution.impactPreviewEnabled);

  const [previewFamily, setPreviewFamily] = useState("consent_events");
  const [previewRetentionDays, setPreviewRetentionDays] = useState("365");
  const [previewAutoCleanup, setPreviewAutoCleanup] = useState(false);
  const [previewAllowlistToggle, setPreviewAllowlistToggle] = useState(false);
  const [previewResult, setPreviewResult] = useState<S10ImpactPreviewResult>();
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);

  const generation = useRef(0);
  const actorRef = useRef(actorKey);
  actorRef.current = actorKey;
  const capabilityRef = useRef(capability);
  capabilityRef.current = capability;
  const capabilityFlags = `${capability.enabled}:${capability.actions.read}:${capability.actions.createDraft}:${capability.actions.updateDraft}:${capability.actions.validate}:${capability.actions.publish}:${capability.actions.rollback}:${capability.history.read}:${capability.readiness.read}`;
  const controllerRef = useRef<AbortController | null>(null);
  const diffControllerRef = useRef<AbortController | null>(null);
  const readinessConsumerRef = useRef(createS10ReadinessConsumer({ set: (callback, delayMs) => setTimeout(callback, delayMs), clear: (handle) => clearTimeout(handle) }));
  const reloadRef = useRef<() => void>(() => {});
  const dialogRef = useRef<HTMLElement>(null);
  const modalRootRef = useRef<HTMLDivElement>(null);
  const rollbackReasonRef = useRef<HTMLTextAreaElement>(null);
  const createReasonRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef(false);
  const selectedDraftRef = useRef<S10Draft | undefined>(undefined);
  const pendingReasonRef = useRef("");
  selectedDraftRef.current = selectedDraft;
  pendingReasonRef.current = pendingReason;
  const closeConfirmation = useCallback(() => { setConfirmation(undefined); setDialogError(""); setRollbackError(""); }, []);
  useModalFocus({ active: Boolean(confirmation), containerRef: dialogRef, modalRootRef, onEscape: closeConfirmation });

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
    const activeCapability = capabilityRef.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    diffControllerRef.current?.abort();
    controllerRef.current = controller;
    readinessConsumerRef.current.dispose();
    setState("loading"); setMessage(""); setValidation(undefined); setDiff(undefined); setConflict(false);
    if (!activeCapability.enabled || !activeCapability.actions.read) { setState("forbidden"); setMessage("服务器未向当前操作员开放设置读取能力。"); return; }
    try {
      const [overview, draftList, historyWire, readinessWire] = await Promise.all([
        getData(API_ENDPOINTS.dashboardS10SettingsOverview, controller.signal, validateS10Overview),
        getData(API_ENDPOINTS.dashboardS10SettingsDrafts, controller.signal, arrayValidator(validateS10Draft, "s10 drafts")),
        activeCapability.history.read ? getData(API_ENDPOINTS.dashboardS10SettingsHistory, controller.signal, arrayValidator(validateS10HistoryEntry, "s10 history")) : Promise.resolve([]),
        activeCapability.readiness.read ? getData(API_ENDPOINTS.dashboardS10SettingsReadiness, controller.signal, validateS10Readiness) : Promise.resolve(undefined)
      ]);
      const draft = draftList[0];
      let nextDiff: S10SafeDiff | undefined;
      if (draft?.status === "validated") {
        const candidate = await getData(API_ENDPOINTS.dashboardS10SettingsDraftDiff(draft.id), controller.signal, validateS10SafeDiff);
        if (candidate.draftId === draft.id && candidate.draftVersion === draft.version && candidate.descriptorKey === draft.descriptorKey) nextDiff = candidate;
        else throw new TypeError("S10 安全差异与当前草稿版本不匹配。");
      }
      if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
      setDrafts(draftList); setSelectedDraft(draft); setHistory(historyWire); setDiff(nextDiff); setReadiness(readinessWire);
      const source = draft?.value ?? overview.effective;
      setAnonymousConsentEnabled(source.consentPolicy.anonymousConsentEnabled);
      setConsentCategories([...source.consentPolicy.consentCategories]);
      setRetentionMonths(fieldState(String(source.consentPolicy.retentionMonths)));
      setFamilies(familiesFromValue(source));
      setLegalHoldEnabled(source.legalHoldPolicy.legalHoldEnabled);
      setLegalHoldRefs(source.legalHoldPolicy.legalHoldRefs.join("\n"));
      setDsarRules(dsarRowsFromValue(source));
      setPiiRules(piiRowsFromValue(source));
      setAllowlist([...source.lowRiskExecution.allowlist]);
      setImpactPreviewEnabled(source.lowRiskExecution.impactPreviewEnabled);
      setState(draftList.length ? "ready" : "empty");
    } catch (error) {
      if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
      setState(classifyFailure(status));
      setMessage(error instanceof Error ? error.message : "设置中心无法安全载入。");
    }
  }, [actorKey, apiRequest, capabilityFlags, classifyFailure, commitAllowed, getData]);
  reloadRef.current = () => { void load(); };
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void loadRef.current();
    return () => { generation.current += 1; controllerRef.current?.abort(); diffControllerRef.current?.abort(); readinessConsumerRef.current.dispose(); };
    // Load exactly once per mount: framework-level identity changes must not
    // re-enter the loading state and drop user input mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execute = useCallback(async (operation: Parameters<typeof authorizeS10Operation>[0], validator: (wire: unknown) => unknown) => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    const requestGeneration = generation.current;
    const requestActor = actorKey;
    let request: ReturnType<typeof authorizeS10Operation>;
    try { request = authorizeS10Operation(operation); }
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

  const draftValue = useCallback((): PrivacyRetentionSettingsValueV1 => ({
    consentPolicy: { anonymousConsentEnabled, authenticatedConsentEnabled: false, consentCategories: consentCategories as PrivacyRetentionSettingsValueV1["consentPolicy"]["consentCategories"], retentionMonths: Number(retentionMonths.value) },
    retentionPolicy: { retentionByObjectFamily: families.filter((row) => row.retentionDays.trim() !== "").map((row) => ({ objectFamily: row.objectFamily as PrivacyRetentionSettingsValueV1["retentionPolicy"]["retentionByObjectFamily"][number]["objectFamily"], retentionDays: Number(row.retentionDays), autoCleanupEnabled: row.autoCleanupEnabled })) },
    legalHoldPolicy: { legalHoldEnabled, legalHoldRefs: legalHoldRefs.split(/\s+/).map((ref) => ref.trim()).filter((ref) => ref !== "") },
    dsarPolicy: { accessExportDeleteRules: dsarRules.map((rule) => ({ scope: rule.scope as PrivacyRetentionSettingsValueV1["dsarPolicy"]["accessExportDeleteRules"][number]["scope"], method: rule.method as PrivacyRetentionSettingsValueV1["dsarPolicy"]["accessExportDeleteRules"][number]["method"], enabled: rule.enabled, requireAdminApproval: rule.requireAdminApproval })) },
    piiDisplayPolicy: { piiDisplayRules: piiRules.filter((rule) => rule.field.trim() !== "").map((rule) => ({ field: rule.field.trim(), displayMode: rule.displayMode as PrivacyRetentionSettingsValueV1["piiDisplayPolicy"]["piiDisplayRules"][number]["displayMode"], allowedRoles: rule.allowedRoles.split(",").map((role) => role.trim()).filter((role) => role !== "") })) },
    lowRiskExecution: { allowlist: allowlist as PrivacyRetentionSettingsValueV1["lowRiskExecution"]["allowlist"], impactPreviewEnabled }
  }), [anonymousConsentEnabled, consentCategories, retentionMonths, families, legalHoldEnabled, legalHoldRefs, dsarRules, piiRules, allowlist, impactPreviewEnabled]);

  const validateFields = useCallback(() => {
    let valid = true;
    const months = Number(retentionMonths.value);
    if (!Number.isInteger(months) || months < 6 || months > 120) { setRetentionMonths((current) => ({ ...current, error: "同意记录留存需为 6–120 个月的整数。" })); valid = false; }
    if (consentCategories.length < 1) { setMessage("至少需要选择一个同意类别。"); valid = false; }
    for (const row of families) {
      if (row.retentionDays.trim() === "") continue;
      const days = Number(row.retentionDays);
      if (!Number.isInteger(days) || days < 30 || days > 7300) { setMessage(`${familyLabels[row.objectFamily] ?? row.objectFamily} 留存天数需为 30–7300 的整数。`); valid = false; break; }
      if (row.autoCleanupEnabled && S10_HIGH_RISK_FAMILIES.has(row.objectFamily)) { setMessage(`${familyLabels[row.objectFamily] ?? row.objectFamily} 属高风险对象族，禁止启用自动清理。`); valid = false; break; }
    }
    if (legalHoldEnabled && legalHoldRefs.split(/\s+/).filter((ref) => ref.trim() !== "").some((ref) => !isUuid(ref.trim()))) { setMessage("法律保留引用必须是有效 UUID（每行一个）。"); valid = false; }
    if (legalHoldEnabled && families.some((row) => row.retentionDays.trim() !== "" && row.autoCleanupEnabled)) { setMessage("启用法律保留时任何对象族不得启用自动清理。"); valid = false; }
    for (const rule of dsarRules) {
      if (rule.method === "delete" && !rule.requireAdminApproval) { setMessage("DSAR 删除规则必须要求管理员审批。"); valid = false; break; }
    }
    for (const rule of piiRules) {
      if (rule.field.trim() !== "" && !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(rule.field.trim())) { setMessage("PII 字段名必须匹配 [A-Za-z][A-Za-z0-9_.-]*。"); valid = false; break; }
      if (rule.field.trim() !== "" && rule.allowedRoles.split(",").filter((role) => role.trim() !== "").length < 1) { setMessage("PII 显示规则至少需要一个允许角色。"); valid = false; break; }
    }
    return valid;
  }, [retentionMonths, consentCategories, families, legalHoldEnabled, legalHoldRefs, dsarRules, piiRules]);

  const createDraft = async () => {
    if (!validateFields()) return;
    const value = draftValue();
    if (!isStructurallyValidS10Value(value)) { setCreateReasonError("设置值结构无效。"); return; }
    if (!isValidS10Reason(reason)) { setCreateReasonError("变更原因至少需要 8 个字符。"); window.requestAnimationFrame(() => createReasonRef.current?.focus()); return; }
    setCreateReasonError("");
    const expectedPublishedVersion = readiness?.publicationCas ?? 0;
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createDraft", input: { descriptorKey: PRIVACY_RETENTION_DESCRIPTOR_KEY, expectedPublishedVersion, value, changeReason: reason.trim(), idempotencyKey: idempotencyKey("create") } }, validateS10Draft) as S10Draft | undefined;
    if (!draft) return;
    try {
      bindCreatedS10Draft(draft, { descriptorKey: PRIVACY_RETENTION_DESCRIPTOR_KEY, expectedPublishedVersion, value, changeReason: reason.trim() });
      setDrafts((current) => [draft, ...current.filter((entry) => entry.id !== draft.id)]);
      setSelectedDraft(draft); setValidation(undefined); setDiff(undefined); setConflict(false);
      setPendingReason(reason); setMessage("S10 设置草稿已创建。");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("草稿响应与请求内容不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const saveDraft = async () => {
    if (!selectedDraft) return;
    if (!validateFields()) return;
    const sourceDraft = selectedDraft;
    const value = draftValue();
    if (!isStructurallyValidS10Value(value)) { setMessage("设置值结构无效。"); return; }
    if (!isValidS10Reason(reason)) { setReasonError("变更原因至少需要 8 个字符。"); return; }
    setReasonError("");
    const updated = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "updateDraft", draftId: sourceDraft.id, status: sourceDraft.status, input: { expectedVersion: sourceDraft.version, value, changeReason: reason.trim(), idempotencyKey: idempotencyKey("update") } }, validateS10Draft) as S10Draft | undefined;
    if (!updated) return;
    try {
      bindUpdatedS10Draft(updated, sourceDraft, value, reason);
      setDrafts((current) => current.map((draft) => draft.id === updated.id ? updated : draft));
      setSelectedDraft(updated); setValidation(undefined); setDiff(undefined); setConflict(false);
      setReason(updated.changeReason); setPendingReason("");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("草稿响应与请求内容不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const validateDraft = async () => {
    if (!selectedDraft) return;
    const sourceDraft = selectedDraft;
    const expectedVersion = sourceDraft.version;
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "validateDraft", draftId: sourceDraft.id, status: sourceDraft.status, input: { expectedVersion, idempotencyKey: idempotencyKey("validate") } }, validateS10ValidationResult) as S10ValidationResult | undefined;
    if (!result) return;
    try { bindS10Validation(result, sourceDraft.id, expectedVersion, sourceDraft.status); }
    catch { setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("S10 验证响应与所请求草稿版本不匹配，正在重新读取权威状态。"); void load(); return; }
    {
      const validatedDraft: S10Draft = { ...sourceDraft, status: result.status, version: result.draftVersion, validationRevision: result.validationRevision, updatedAt: result.validatedAt };
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
          const response = await apiRequest(API_ENDPOINTS.dashboardS10SettingsDraftDiff(diffDraftId), { signal: diffController.signal });
          if (response.status === 401) onUnauthorized();
          if (response.ok) {
            const nextDiff = validateApiResult(await response.json(), validateS10SafeDiff).data;
            const currentDraft = selectedDraftRef.current;
            if (diffController.signal.aborted || diffGeneration !== generation.current || diffActor !== actorRef.current || currentDraft?.id !== diffDraftId || currentDraft.version !== diffDraftVersion || currentDraft.status !== result.status) return;
            try { setDiff(bindS10Diff(nextDiff, result)); }
            catch { setDiff(undefined); setConflict(true); setMessage("S10 安全差异与当前草稿版本不匹配，正在重新读取权威状态。"); void load(); }
          }
        } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) { /* Validation remains visible; publish stays disabled without a current safe diff. */ } }
      } else {
        setDiff(undefined);
      }
    }
  };

  const publishDraft = async () => {
    if (!confirmation || confirmation.kind !== "publish") return;
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "publishDraft", draftId: confirmation.draft.id, status: confirmation.draft.status, input: { expectedVersion: confirmation.draft.version, idempotencyKey: idempotencyKey("publish") } }, validateS10Publication) as S10Publication | undefined;
    if (!result) return;
    try {
      bindPublishedS10(result, confirmation.draft.id, confirmation.draft.version);
      closeConfirmation();
      const appliedGeneration = readinessConsumerRef.current.install(result.readiness.publishedGeneration, () => { void load(); });
      // The cleanup consumer does not exist yet: readiness is honestly
      // degraded and must never be presented as ready.
      if (result.readiness.state === "degraded" && result.readiness.reasonCode === "cleanup_consumer_unavailable") {
        setReadiness(undefined);
        setMessage(`S10 设置已发布（代次 ${appliedGeneration}）。清理消费者尚不可用，自动清理执行保持未授权（降级，非就绪）。`);
      } else {
        setMessage(`S10 设置已发布。已安装发布代次 ${appliedGeneration}。`);
      }
      void load();
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); closeConfirmation(); setMessage("S10 发布响应与已确认草稿版本不匹配，正在重新读取权威状态。"); void load();
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
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createRollbackDraft", publicationId: confirmation.publication.publicationId, sourceStatus: confirmation.publication.status, input: { expectedPublishedVersion: submittedCurrentPublishedVersion, changeReason: rollbackReason.trim(), idempotencyKey: idempotencyKey("rollback") } }, validateS10Draft) as S10Draft | undefined;
    if (!draft) return;
    try {
      bindRollbackS10Draft(draft, confirmation.publication, submittedCurrentPublishedVersion);
      closeConfirmation();
      setDrafts((current) => [draft, ...current.filter((entry) => entry.id !== draft.id)]);
      setSelectedDraft(draft); setValidation(undefined); setDiff(undefined); setConflict(false);
      // Rollback activates the target policy version; it never claims to
      // restore already-executed data operations.
      setMessage("S10 回滚草稿已创建。");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("S10 回滚草稿响应与已确认发布不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const runImpactPreview = async () => {
    const days = Number(previewRetentionDays);
    if (!Number.isInteger(days) || days < 30 || days > 7300) { setPreviewMessage("预览留存天数需为 30–7300 的整数。"); return; }
    if (!previewAutoCleanup && !previewAllowlistToggle) { setPreviewMessage("至少需要指定一个候选变更（启用自动清理或候选 allowlist）。"); return; }
    setPreviewBusy(true); setPreviewMessage(""); setPreviewResult(undefined);
    try {
      const response = await fetch(`${DASHBOARD_API_BASE_URL}${API_ENDPOINTS.dashboardS10SettingsImpactPreview}`, {
        method: "POST", credentials: "include", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(previewAutoCleanup ? { candidateRetentionEntries: [{ objectFamily: previewFamily, retentionDays: days, autoCleanupEnabled: true }] } : {}),
          ...(previewAllowlistToggle ? { candidateAllowlist: ["consent_events"] } : {})
        })
      });
      if (response.status === 401) onUnauthorized();
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { code?: string } | null;
        setPreviewMessage(response.status === 403 ? "当前操作员没有执行影响预览的权限。" : body?.code === "COMMERCE_INVALID" ? "影响预览请求无效。" : "影响预览暂时不可用。");
        return;
      }
      setPreviewResult(validateApiResult(await response.json(), validateS10ImpactPreviewResult).data);
    } catch {
      setPreviewMessage("影响预览请求失败。");
    } finally { setPreviewBusy(false); }
  };

  const openPublishConfirmation = () => {
    if (!selectedDraft || selectedDraft.status !== "validated" || !diff) return;
    setConfirmation({ kind: "publish", draft: selectedDraft, diff });
  };

  const openRollbackConfirmation = (publication: S10HistoryEntry) => {
    if (publication.status !== "published" && publication.status !== "superseded") return;
    setConfirmation({ kind: "rollback", publication });
  };

  return (
    <section aria-label="隐私/留存设置" className={styles.panel}>
      <div className={styles.header}>
        <h2>隐私、留存与审计设置</h2>
        <p>settings.privacy-retention · settings.privacy-retention.v1</p>
        <p>受控版本化生命周期：草稿 → 验证 → 发布。发布只激活策略版本，不删除、不匿名化、不归档、不清除任何数据，也不创建或调度任务；自动清理执行需要单独授权的清理消费者（当前缺失，因此始终如实报告降级而非就绪）。</p>
      </div>
      <StatusMessage variant="warning"><StatusMessageTitle>能力分层（冻结）</StatusMessageTitle><StatusMessageContent>匿名同意偏好为 current_fact；认证同意与隐私主体清除（DSAR 删除）为 future_unavailable，界面仅展示不可编辑状态，不会假装可用。</StatusMessageContent></StatusMessage>
      {state === "loading" ? <StatusMessage variant="neutral"><StatusMessageTitle>正在加载数据</StatusMessageTitle><StatusMessageContent>正在读取 S10 设置权威状态。</StatusMessageContent></StatusMessage> : null}
      {state === "forbidden" || state === "error" ? <StatusMessage variant="error"><StatusMessageTitle>{state === "forbidden" ? "没有读取权限" : "数据暂时无法载入"}</StatusMessageTitle><StatusMessageContent>{message || "设置中心无法安全载入。"}<button onClick={() => void load()} type="button">重试</button></StatusMessageContent></StatusMessage> : null}
      {state === "empty" || state === "ready" ? (
        <>
          <div className={styles.section}>
            <h3>有效策略</h3>
            {readiness ? <p role="status">状态：{statusLabels[readiness.state] ?? readiness.state}（发布代次 {readiness.publishedGeneration}，投影 {readiness.projectionState}，原因 {readiness.reasonCode}）</p> : null}
            <form className={styles.form} onSubmit={(event) => { event.preventDefault(); selectedDraft ? void saveDraft() : void createDraft(); }}>
              <fieldset><legend>同意策略</legend>
                <label className={styles.check}><input checked={anonymousConsentEnabled} onChange={(event) => setAnonymousConsentEnabled(event.target.checked)} type="checkbox" />允许匿名同意偏好</label>
                <label className={styles.check}><input checked={false} disabled type="checkbox" />认证同意偏好（future_unavailable）</label>
                <div className={styles.checkGroup}>同意类别（1–3）：{["functional", "analytics", "targeting"].map((category) => <label className={styles.check} key={category}><input checked={consentCategories.includes(category)} onChange={(event) => { setConsentCategories((current) => event.target.checked ? [...current, category] : current.filter((entry) => entry !== category)); }} type="checkbox" />{category}</label>)}</div>
                <label>同意记录留存（月，6–120；默认 24）<input inputMode="numeric" max={120} min={6} onChange={(event) => setRetentionMonths(fieldState(event.target.value))} type="number" value={retentionMonths.value} />{retentionMonths.error ? <span className={styles.error}>{retentionMonths.error}</span> : null}</label>
              </fieldset>
              <fieldset><legend>对象族留存（30–7300 天）</legend>
                <p>高风险对象族（audit_events / media_assets / orders / payments / privacy_requests）禁止启用自动清理。</p>
                <table className={styles.table}><thead><tr><th scope="col">对象族</th><th scope="col">留存天数</th><th scope="col">自动清理</th></tr></thead><tbody>{families.map((row, index) => <tr key={row.objectFamily}><td>{familyLabels[row.objectFamily] ?? row.objectFamily}</td><td><input inputMode="numeric" max={7300} min={30} onChange={(event) => setFamilies((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, retentionDays: event.target.value } : entry))} type="number" value={row.retentionDays} /></td><td><input checked={row.autoCleanupEnabled} disabled={S10_HIGH_RISK_FAMILIES.has(row.objectFamily)} onChange={(event) => setFamilies((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, autoCleanupEnabled: event.target.checked } : entry))} type="checkbox" /></td></tr>)}</tbody></table>
              </fieldset>
              <fieldset><legend>法律保留</legend>
                <label className={styles.check}><input checked={legalHoldEnabled} onChange={(event) => setLegalHoldEnabled(event.target.checked)} type="checkbox" />启用法律保留（启用时任何对象族禁止自动清理）</label>
                <label>法律保留引用（每行一个 UUID）<textarea disabled={!legalHoldEnabled} onChange={(event) => setLegalHoldRefs(event.target.value)} value={legalHoldRefs} /></label>
              </fieldset>
              <fieldset><legend>DSAR 规则（访问/导出/删除）</legend>
                <p>删除规则必须要求管理员审批。</p>
                <table className={styles.table}><thead><tr><th scope="col">范围</th><th scope="col">方法</th><th scope="col">启用</th><th scope="col">管理员审批</th><th scope="col"></th></tr></thead><tbody>{dsarRules.map((rule, index) => <tr key={`${rule.scope}-${rule.method}-${index}`}><td><select onChange={(event) => setDsarRules((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, scope: event.target.value } : entry))} value={rule.scope}>{Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><select onChange={(event) => setDsarRules((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, method: event.target.value } : entry))} value={rule.method}>{Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><input checked={rule.enabled} onChange={(event) => setDsarRules((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, enabled: event.target.checked } : entry))} type="checkbox" /></td><td><input checked={rule.requireAdminApproval} disabled={rule.method === "delete"} onChange={(event) => setDsarRules((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, requireAdminApproval: event.target.checked } : entry))} type="checkbox" /></td><td><Button onClick={() => setDsarRules((current) => current.filter((_, entryIndex) => entryIndex !== index))} type="button">移除</Button></td></tr>)}</tbody></table>
                <Button onClick={() => setDsarRules((current) => [...current, { scope: "all_personal_data", method: "export", enabled: true, requireAdminApproval: false }])} type="button">添加 DSAR 规则</Button>
              </fieldset>
              <fieldset><legend>PII 显示规则</legend>
                <table className={styles.table}><thead><tr><th scope="col">字段</th><th scope="col">显示模式</th><th scope="col">允许角色（逗号分隔）</th><th scope="col"></th></tr></thead><tbody>{piiRules.map((rule, index) => <tr key={`${rule.field}-${index}`}><td><input onChange={(event) => setPiiRules((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, field: event.target.value } : entry))} type="text" value={rule.field} /></td><td><select onChange={(event) => setPiiRules((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, displayMode: event.target.value } : entry))} value={rule.displayMode}>{Object.entries(displayModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><input onChange={(event) => setPiiRules((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, allowedRoles: event.target.value } : entry))} type="text" value={rule.allowedRoles} /></td><td><Button onClick={() => setPiiRules((current) => current.filter((_, entryIndex) => entryIndex !== index))} type="button">移除</Button></td></tr>)}</tbody></table>
                <Button onClick={() => setPiiRules((current) => [...current, { field: "customer.email", displayMode: "masked", allowedRoles: "super_admin" }])} type="button">添加 PII 规则</Button>
              </fieldset>
              <fieldset><legend>低风险执行</legend>
                <div className={styles.checkGroup}>自动清理候选 allowlist（⊆ consent_events / async_jobs）：{["consent_events", "async_jobs"].map((family) => <label className={styles.check} key={family}><input checked={allowlist.includes(family)} onChange={(event) => { setAllowlist((current) => event.target.checked ? [...current, family] : current.filter((entry) => entry !== family)); }} type="checkbox" />{familyLabels[family] ?? family}</label>)}</div>
                <label className={styles.check}><input checked={impactPreviewEnabled} onChange={(event) => setImpactPreviewEnabled(event.target.checked)} type="checkbox" />启用影响预览</label>
              </fieldset>
              <label>变更原因（8–500 字符）<textarea onChange={(event) => setReason(event.target.value)} ref={createReasonRef} value={reason} />{reasonError || createReasonError ? <span className={styles.error}>{reasonError || createReasonError}</span> : null}</label>
              <div className={styles.actions}>
                {selectedDraft ? (
                  <>
                    <Button disabled={busy || !capability.actions.updateDraft || !["draft", "invalid", "activation_failed", "rollback_draft"].includes(selectedDraft.status)} onClick={() => void saveDraft()} type="button">保存草稿</Button>
                    <Button disabled={busy || !capability.actions.validate} onClick={() => void validateDraft()} type="button">验证草稿</Button>
                    <Button disabled={busy || !capability.actions.publish || selectedDraft.status !== "validated" || !diff} onClick={openPublishConfirmation} type="button">发布</Button>
                  </>
                ) : (
                  <Button disabled={busy || !capability.actions.createDraft} onClick={() => void createDraft()} type="button">创建草稿</Button>
                )}
                <Button disabled={busy} onClick={() => void load()} type="button">刷新</Button>
              </div>
            </form>
          </div>
          {selectedDraft ? <div className={styles.section}><h3>当前草稿</h3><p>状态：{statusLabels[selectedDraft.status] ?? selectedDraft.status}（版本 {selectedDraft.version}，原因：{selectedDraft.changeReason}）</p>
            {validation ? <div><p>验证：{validation.status === "validated" ? "通过" : "未通过"}</p><ul>{validation.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>[{severityLabels[issue.severity] ?? issue.severity}] {issue.field}：{issue.message}</li>)}</ul></div> : null}
            {diff ? <div><h4>变更差异</h4><ul>{diff.changes.map((change, index) => <li key={`${change.field}-${index}`}>{change.field}：{formatDiffValue(change.before)} → {formatDiffValue(change.after)}</li>)}</ul></div> : null}
          </div> : null}
          {conflict ? <StatusMessage variant="warning"><StatusMessageTitle>设置状态冲突</StatusMessageTitle><StatusMessageContent>{message}（409 已停止操作）</StatusMessageContent></StatusMessage> : null}
          {message && !conflict ? <StatusMessage variant={message.includes("已发布") ? "success" : "info"}><StatusMessageTitle>{message}</StatusMessageTitle></StatusMessage> : null}
          <div className={styles.section}>
            <h3>发布历史</h3>
            {history.length === 0 ? <p>尚无发布。</p> : <ul>{history.map((entry) => <li key={`${entry.publicationId}-${entry.version}-${entry.status}`}>#{entry.version} {statusLabels[entry.status] ?? entry.status}（{formatDate(entry.publishedAt)}）{entry.changeReason} <Button disabled={busy || !capability.actions.rollback} onClick={() => openRollbackConfirmation(entry)} type="button">创建回滚草稿</Button></li>)}</ul>}
          </div>
          <div className={styles.section}>
            <h3>影响预览（对象族级，只读）</h3>
            <p>只读事务预览候选自动清理/allowlist 变更是否触发法律保留冲突或被高风险族不变量阻止；预览绝不写入、绝不删除。</p>
            <div className={styles.form}>
              <label>候选对象族<select onChange={(event) => setPreviewFamily(event.target.value)} value={previewFamily}>{S10_OBJECT_FAMILIES.map((family) => <option key={family} value={family}>{familyLabels[family] ?? family}</option>)}</select></label>
              <label>留存天数（30–7300）<input inputMode="numeric" max={7300} min={30} onChange={(event) => setPreviewRetentionDays(event.target.value)} type="number" value={previewRetentionDays} /></label>
              <label className={styles.check}><input checked={previewAutoCleanup} onChange={(event) => setPreviewAutoCleanup(event.target.checked)} type="checkbox" />候选启用自动清理</label>
              <label className={styles.check}><input checked={previewAllowlistToggle} onChange={(event) => setPreviewAllowlistToggle(event.target.checked)} type="checkbox" />候选 allowlist 增加 consent_events</label>
              <Button disabled={previewBusy} onClick={() => void runImpactPreview()} type="button">{previewBusy ? "预览中…" : "运行影响预览"}</Button>
              {previewMessage ? <StatusMessage variant="warning"><StatusMessageTitle>{previewMessage}</StatusMessageTitle></StatusMessage> : null}
              {previewResult ? <StatusMessage variant={previewResult.blockedHighRiskFamilies.length > 0 || previewResult.wouldConflictWithLegalHold ? "error" : "success"}><StatusMessageTitle>{previewResult.blockedHighRiskFamilies.length > 0 ? "存在被阻止的高风险对象族" : previewResult.wouldConflictWithLegalHold ? "与法律保留冲突" : "候选变更可通过"}</StatusMessageTitle><StatusMessageContent>将启用自动清理：{previewResult.wouldEnableAutoCleanup ? "是" : "否"}；阻止族：{previewResult.blockedHighRiskFamilies.join(", ") || "无"}；受影响族：{previewResult.affectedFamilies.map((entry) => `${entry.objectFamily}(${entry.classification})`).join(", ") || "无"}；contextRevision：{previewResult.contextRevision.slice(0, 12)}…</StatusMessageContent></StatusMessage> : null}
            </div>
          </div>
        </>
      ) : null}
      {confirmation ? (
        <div className={styles.modalRoot} ref={modalRootRef}>
          <section aria-modal="true" className={styles.dialog} ref={dialogRef} role="dialog">
            <h3>{confirmation.kind === "publish" ? "确认发布" : "确认创建回滚草稿"}</h3>
            {confirmation.kind === "publish" ? (
              <div><p>发布草稿 {confirmation.draft.changeReason}（版本 {confirmation.draft.version}）。发布仅激活策略版本：不删除、不匿名化、不归档、不清除数据、不创建任务；自动清理执行仍保持未授权（清理消费者缺失）。</p>
                <ul>{confirmation.diff.changes.map((change, index) => <li key={`${change.field}-${index}`}>{change.field}：{formatDiffValue(change.before)} → {formatDiffValue(change.after)}</li>)}</ul>
              </div>
            ) : (
              <div><label>回滚原因（8–500 字符）<textarea onChange={(event) => setRollbackReason(event.target.value)} ref={rollbackReasonRef} value={rollbackReason} /></label>{rollbackError ? <span className={styles.error}>{rollbackError}</span> : null}</div>
            )}
            {dialogError ? <StatusMessage variant="error"><StatusMessageTitle>{dialogError}</StatusMessageTitle></StatusMessage> : null}
            <div className={styles.actions}>
              <Button disabled={busy} onClick={() => confirmation.kind === "publish" ? void publishDraft() : void createRollback()} type="button">{busy ? "处理中…" : confirmation.kind === "publish" ? "确认发布" : "确认回滚"}</Button>
              <Button disabled={busy} onClick={closeConfirmation} type="button">取消</Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
