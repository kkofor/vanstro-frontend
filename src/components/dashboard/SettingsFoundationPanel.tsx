"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SettingsCenterCapability,
  SettingsDraft,
  SettingsHistoryEntry,
  SettingsOverview,
  SettingsPublication,
  SettingsReadiness,
  SettingsRegistryEntry,
  SettingsSafeDiff,
  SettingsValidationResult
} from "@/lib/api/api-contract";
import { API_ENDPOINTS, SETTINGS_CORE_DESCRIPTOR_KEY } from "@/lib/api/api-contract";
import {
  validateSettingsDraft,
  validateSettingsHistoryEntry,
  validateSettingsOverview,
  validateSettingsPublication,
  validateSettingsReadiness,
  validateSettingsRegistryEntry,
  validateSettingsSafeDiff,
  validateApiResult,
  validateSettingsUpdateDraftRequest,
  validateSettingsValidationResult,
  type RuntimeValidator
} from "@/lib/api/runtime-validation";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { authorizeSettingsOperation } from "@/lib/dashboard/s01-settings-transport";
import {
  bindCreatedSettingsDraft,
  bindPublishedSettings,
  bindRollbackSettingsDraft,
  bindSettingsDiff,
  bindSettingsValidation,
  bindUpdatedSettingsDraft,
  isValidSettingsDraftValue,
  isValidSettingsReason,
  settingsCenterHref,
  type SettingsCenterLocation,
  type SettingsCenterPage
} from "@/lib/dashboard/s01-settings";
import { createSettingsReadinessConsumer } from "@/lib/dashboard/s01-settings-readiness-consumer";
import type { SiteLocale } from "@/lib/i18n/locale";
import styles from "./SettingsFoundationPanel.module.css";

type ValidLocation = Extract<SettingsCenterLocation, { kind: "valid" }>;
type Props = {
  actorKey: string;
  capability: SettingsCenterCapability;
  location: ValidLocation;
  locale: SiteLocale;
  apiRequest: (path: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => void;
};
type LoadState = "loading" | "ready" | "empty" | "forbidden" | "error" | "stale";
type Confirmation = { kind: "publish"; draft: SettingsDraft; diff: SettingsSafeDiff } | { kind: "rollback"; publication: SettingsHistoryEntry };

const futureGroupLabels: Record<SettingsRegistryEntry["group"], string> = {
  core: "核心", general: "通用", commerce: "Commerce", payments: "支付", email: "邮件", integrations: "集成",
  webhooks: "Webhook", developer: "开发者", auth: "认证", privacy: "隐私", media: "媒体", system: "系统"
};
const statusLabels: Record<string, string> = { draft: "草稿", validated: "已验证", invalid: "验证未通过", publishing: "发布中", activation_failed: "激活失败", rollback_draft: "回滚草稿", published: "已发布", superseded: "已被后续版本取代", rolled_back: "已回滚" };

function arrayValidator<T>(validator: RuntimeValidator<T>, name: string): RuntimeValidator<T[]> {
  return (wire) => {
    if (!Array.isArray(wire)) throw new TypeError(`${name} 响应不是列表。`);
    return wire.map((entry, index) => validator(entry, `${name}[${index}]`));
  };
}
function idempotencyKey(action: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `settings-${action}-${random}`;
}
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString("zh-CN") : "尚无"; }

export function SettingsFoundationPanel({ actorKey, capability, location, locale, apiRequest, onUnauthorized }: Props) {
  const [overview, setOverview] = useState<SettingsOverview>();
  const [registry, setRegistry] = useState<SettingsRegistryEntry[]>([]);
  const [drafts, setDrafts] = useState<SettingsDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<SettingsDraft>();
  const [validation, setValidation] = useState<SettingsValidationResult>();
  const [diff, setDiff] = useState<SettingsSafeDiff>();
  const [history, setHistory] = useState<SettingsHistoryEntry[]>([]);
  const [readiness, setReadiness] = useState<SettingsReadiness>();
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("60");
  const [reason, setReason] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackError, setRollbackError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [busy, setBusy] = useState(false);
  const [createValueError, setCreateValueError] = useState("");
  const [createReasonError, setCreateReasonError] = useState("");
  const [draftValueError, setDraftValueError] = useState("");
  const [draftReasonError, setDraftReasonError] = useState("");
  const [conflict, setConflict] = useState(false);
  const generation = useRef(0);
  const actorRef = useRef(actorKey);
  const controllerRef = useRef<AbortController | null>(null);
  const diffControllerRef = useRef<AbortController | null>(null);
  const readinessConsumerRef = useRef(createSettingsReadinessConsumer({ set: (callback, delayMs) => setTimeout(callback, delayMs), clear: (handle) => clearTimeout(handle) }));
  const reloadRef = useRef<() => void>(() => {});
  const effectiveRefreshSecondsRef = useRef(60);
  const dialogRef = useRef<HTMLElement>(null);
  const modalRootRef = useRef<HTMLDivElement>(null);
  const rollbackReasonRef = useRef<HTMLTextAreaElement>(null);
  const createValueRef = useRef<HTMLInputElement>(null);
  const createReasonRef = useRef<HTMLTextAreaElement>(null);
  const draftValueRef = useRef<HTMLInputElement>(null);
  const draftReasonRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef(false);
  const selectedDraftRef = useRef<SettingsDraft | undefined>(undefined);
  actorRef.current = actorKey;
  selectedDraftRef.current = selectedDraft;
  const closeConfirmation = useCallback(() => { setConfirmation(undefined); setDialogError(""); setRollbackError(""); }, []);
  useModalFocus({ active: Boolean(confirmation), containerRef: dialogRef, modalRootRef, onEscape: closeConfirmation });

  const navigate = (page: SettingsCenterPage, draftId?: string, focusAfterNavigation = false) => {
    window.history.pushState(window.history.state, "", settingsCenterHref(page, locale, draftId));
    window.dispatchEvent(new PopStateEvent("popstate"));
    if (focusAfterNavigation) window.requestAnimationFrame(() => document.getElementById(`settings-${page}-title`)?.focus());
  };
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

  const load = useCallback(async ({ recovering = false }: { recovering?: boolean } = {}) => {
    const requestGeneration = ++generation.current;
    const requestActor = actorKey;
    const controller = new AbortController();
    controllerRef.current?.abort();
    diffControllerRef.current?.abort();
    controllerRef.current = controller;
    readinessConsumerRef.current.dispose();
    setState("loading"); if (!recovering) setMessage(""); setValidation(undefined); setDiff(undefined); if (!recovering) setConflict(false);
    if (!capability.enabled || !capability.actions.read) { setState("forbidden"); setMessage("服务器未向当前操作员开放设置读取能力。"); return; }
    try {
      if (location.page === "overview") {
        const [overviewWire, registryWire, readinessWire] = await Promise.all([
          getData(API_ENDPOINTS.dashboardSettingsOverview, controller.signal, validateSettingsOverview),
          getData(API_ENDPOINTS.dashboardSettingsRegistry, controller.signal, arrayValidator(validateSettingsRegistryEntry, "registry")),
          capability.readiness.read ? getData(API_ENDPOINTS.dashboardSettingsReadiness, controller.signal, validateSettingsReadiness) : Promise.resolve(undefined)
        ]);
        const nextOverview = overviewWire;
        const nextRegistry = registryWire;
        const projection = readinessWire === undefined ? nextOverview.readiness : readinessWire;
        if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
        effectiveRefreshSecondsRef.current = projection.effectiveOverviewRefreshSeconds;
        const appliedGeneration = readinessConsumerRef.current.install(projection.publishedGeneration, projection.effectiveOverviewRefreshSeconds, () => {
          if (requestGeneration === generation.current && requestActor === actorRef.current) reloadRef.current();
        });
        const matchedReadiness = capability.readiness.read
          ? await getData(`${API_ENDPOINTS.dashboardSettingsReadiness}?consumerGeneration=${appliedGeneration}`, controller.signal, validateSettingsReadiness)
          : projection;
        if (!commitAllowed(requestGeneration, requestActor, controller.signal) || matchedReadiness.publishedGeneration !== appliedGeneration || matchedReadiness.effectiveOverviewRefreshSeconds !== projection.effectiveOverviewRefreshSeconds) return;
        setOverview(nextOverview); setRegistry(nextRegistry); setReadiness(matchedReadiness); setState(nextRegistry.length ? "ready" : "empty");
      } else if (location.page === "lifecycle") {
        const draftList = await getData(API_ENDPOINTS.dashboardSettingsDrafts, controller.signal, arrayValidator(validateSettingsDraft, "drafts"));
        const draft = location.draftId ? await getData(API_ENDPOINTS.dashboardSettingsDraft(location.draftId), controller.signal, validateSettingsDraft) : draftList[0];
        let nextDiff: SettingsSafeDiff | undefined;
        if (draft?.status === "validated") { const candidate = await getData(API_ENDPOINTS.dashboardSettingsDraftDiff(draft.id), controller.signal, validateSettingsSafeDiff); if (candidate.draftId === draft.id && candidate.draftVersion === draft.version && candidate.descriptorKey === draft.descriptorKey) nextDiff = candidate; else throw new TypeError("安全差异与当前草稿版本不匹配。"); }
        if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
        setDrafts(draftList); setSelectedDraft(draft); setDiff(nextDiff);
        // The Overview refresh cadence consumes the published effective value:
        // the safe diff's "before" is the current effective seconds.
        if (nextDiff?.changes[0]?.before) { effectiveRefreshSecondsRef.current = nextDiff.changes[0].before; }
        setState(draftList.length ? "ready" : "empty");
      } else {
        if (!capability.history.read) { setState("forbidden"); setMessage("当前操作员没有设置历史读取权限。"); return; }
        const [rowsWire, overviewWire] = await Promise.all([getData(API_ENDPOINTS.dashboardSettingsHistory, controller.signal, arrayValidator(validateSettingsHistoryEntry, "history")), getData(API_ENDPOINTS.dashboardSettingsOverview, controller.signal, validateSettingsOverview)]);
        const rows = rowsWire;
        const currentOverview = overviewWire;
        if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
        setOverview(currentOverview); setHistory(rows); setState(rows.length ? "ready" : "empty");
      }
      if (recovering && requestGeneration === generation.current && requestActor === actorRef.current) { setConflict(false); setMessage("权威设置状态已重新载入。"); }
    } catch (error) {
      if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
      setState(classifyFailure(status));
      setMessage(error instanceof Error ? error.message : "设置中心无法安全载入。");
    }
  }, [actorKey, apiRequest, capability, classifyFailure, commitAllowed, getData, location]);
  reloadRef.current = () => { void load(); };

  useEffect(() => { void load(); return () => { generation.current += 1; controllerRef.current?.abort(); diffControllerRef.current?.abort(); readinessConsumerRef.current.dispose(); }; }, [load]);

  const execute = useCallback(async (operation: Parameters<typeof authorizeSettingsOperation>[0], validator: (wire: unknown) => unknown) => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    const requestGeneration = generation.current;
    const requestActor = actorKey;
    let request: ReturnType<typeof authorizeSettingsOperation>;
    try { request = authorizeSettingsOperation(operation); }
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

  const createDraft = async () => {
    const numericValue = Number(value);
    // Structural validity only: business validity (15..300) is decided by the
    // server validation lifecycle so an invalid draft can be created, then
    // corrected via typed PATCH after a blocker.
    const structurallyInvalidValue = value.trim() === "" || !Number.isSafeInteger(numericValue) || numericValue < 0;
    const invalidReason = !isValidSettingsReason(reason);
    if (structurallyInvalidValue || invalidReason) {
      setCreateValueError(structurallyInvalidValue ? "刷新间隔必须是非负整数。" : "");
      setCreateReasonError(invalidReason ? "变更原因必须包含 8–500 个字符。" : "");
      window.requestAnimationFrame(() => (structurallyInvalidValue ? createValueRef.current : createReasonRef.current)?.focus());
      return;
    }
    setCreateValueError(""); setCreateReasonError("");
    const input = { descriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY, expectedPublishedVersion: overview?.publication.version ?? 0, value: numericValue, changeReason: reason.trim(), idempotencyKey: idempotencyKey("draft") } as const;
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createDraft", input }, validateSettingsDraft) as SettingsDraft | undefined;
    if (!draft) return;
    try { bindCreatedSettingsDraft(draft, input); navigate("lifecycle", draft.id, true); }
    catch { setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("创建草稿响应与提交内容不匹配，正在重新读取权威状态。"); void load({ recovering: true }); }
  };
  const saveDraft = async () => {
    if (!selectedDraft) return;
    let input;
    try {
      input = validateSettingsUpdateDraftRequest({ expectedVersion: selectedDraft.version, value: Number(value), changeReason: reason, idempotencyKey: idempotencyKey("update") });
    } catch {
      const structurallyInvalidValue = value.trim() === "" || !Number.isSafeInteger(Number(value)) || Number(value) < 0;
      const invalidReason = reason.trim().length < 8 || reason.trim().length > 500;
      setDraftValueError(structurallyInvalidValue ? "刷新间隔必须是非负整数。" : "");
      setDraftReasonError(invalidReason ? "变更原因必须包含 8–500 个字符。" : "");
      window.requestAnimationFrame(() => (structurallyInvalidValue ? draftValueRef.current : draftReasonRef.current)?.focus());
      return;
    }
    setDraftValueError(""); setDraftReasonError("");
    const submittedDraft = selectedDraft;
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "updateDraft", draftId: submittedDraft.id, status: submittedDraft.status, input }, validateSettingsDraft) as SettingsDraft | undefined;
    if (!draft) return;
    try {
      bindUpdatedSettingsDraft(draft, submittedDraft, input.value, input.changeReason);
      setSelectedDraft(draft); setDrafts((current) => current.map((entry) => entry.id === draft.id ? draft : entry)); setValue(String(draft.value)); setReason(draft.changeReason); setValidation(undefined); setDiff(undefined); setMessage("设置草稿已保存。请重新验证后再发布。");
    } catch { setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("草稿响应与请求内容不匹配，正在重新读取权威状态。"); void load({ recovering: true }); }
  };
  const validateDraft = async () => {
    if (!selectedDraft) return;
    const sourceDraft = selectedDraft;
    const expectedVersion = sourceDraft.version;
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "validateDraft", draftId: sourceDraft.id, status: sourceDraft.status, input: { expectedVersion, idempotencyKey: idempotencyKey("validate") } }, validateSettingsValidationResult) as SettingsValidationResult | undefined;
    if (!result) return;
    try { bindSettingsValidation(result, sourceDraft.id, expectedVersion, sourceDraft.status); }
    catch { setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("验证响应与所请求草稿版本不匹配，正在重新读取权威状态。"); void load({ recovering: true }); return; }
    {
      const validatedDraft: SettingsDraft = { ...sourceDraft, status: result.status, version: result.draftVersion, validationRevision: result.validationRevision, updatedAt: result.validatedAt };
      selectedDraftRef.current = validatedDraft;
      setValidation(result);
      setSelectedDraft(validatedDraft);
      setDrafts((current) => current.map((draft) => draft.id === result.draftId ? validatedDraft : draft));
      try {
        const diffGeneration = generation.current;
        const diffActor = actorKey;
        const diffDraftId = result.draftId;
        const diffDraftVersion = result.draftVersion;
        const diffController = new AbortController();
        diffControllerRef.current?.abort();
        diffControllerRef.current = diffController;
        const response = await apiRequest(API_ENDPOINTS.dashboardSettingsDraftDiff(diffDraftId), { signal: diffController.signal });
        if (response.status === 401) onUnauthorized();
        if (response.ok) {
          const nextDiff = validateApiResult(await response.json(), validateSettingsSafeDiff).data;
          const currentDraft = selectedDraftRef.current;
          if (diffController.signal.aborted || diffGeneration !== generation.current || diffActor !== actorRef.current || currentDraft?.id !== diffDraftId || currentDraft.version !== diffDraftVersion || currentDraft.status !== result.status) return;
          try { setDiff(bindSettingsDiff(nextDiff, result)); }
          catch { setDiff(undefined); setConflict(true); setMessage("安全差异与当前草稿版本不匹配，正在重新读取权威状态。"); void load({ recovering: true }); }
        }
      } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) { /* Validation remains visible; publish stays disabled without a current safe diff. */ } }
    }
  };
  const publishDraft = async () => {
    if (!confirmation || confirmation.kind !== "publish") return;
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "publishDraft", draftId: confirmation.draft.id, status: confirmation.draft.status, input: { expectedVersion: confirmation.draft.version, idempotencyKey: idempotencyKey("publish") } }, validateSettingsPublication) as SettingsPublication | undefined;
    if (!result) return;
    try { bindPublishedSettings(result, confirmation.draft.id, confirmation.draft.version); closeConfirmation(); navigate("history", undefined, true); }
    catch { setConflict(true); setValidation(undefined); setDiff(undefined); closeConfirmation(); setMessage("发布响应与已确认草稿版本不匹配，正在重新读取权威状态。"); void load({ recovering: true }); }
  };
  const createRollback = async () => {
    if (!confirmation || confirmation.kind !== "rollback") return;
    if (rollbackReason.trim().length < 8) {
      setRollbackError("回滚草稿原因至少需要 8 个字符。");
      window.requestAnimationFrame(() => rollbackReasonRef.current?.focus());
      return;
    }
    setRollbackError("");
    const submittedCurrentPublishedVersion = overview?.publication.version ?? -1;
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createRollbackDraft", publicationId: confirmation.publication.publicationId, sourceStatus: confirmation.publication.status, input: { expectedPublishedVersion: submittedCurrentPublishedVersion, changeReason: rollbackReason.trim(), idempotencyKey: idempotencyKey("rollback") } }, validateSettingsDraft) as SettingsDraft | undefined;
    if (!draft) return;
    try { bindRollbackSettingsDraft(draft, confirmation.publication, submittedCurrentPublishedVersion); closeConfirmation(); navigate("lifecycle", draft.id, true); }
    catch { setConflict(true); setValidation(undefined); setDiff(undefined); closeConfirmation(); setMessage("回滚草稿响应与已确认发布不匹配，正在重新读取权威状态。"); void load({ recovering: true }); }
  };

  const filteredRegistry = useMemo(() => registry.filter((entry) => `${entry.key} ${entry.title} ${entry.description} ${futureGroupLabels[entry.group]}`.toLowerCase().includes(query.trim().toLowerCase())), [query, registry]);
  const available = registry.find((entry) => entry.key === SETTINGS_CORE_DESCRIPTOR_KEY && entry.availability === "available");
  const editableDraft = Boolean(selectedDraft && ["draft", "invalid", "activation_failed", "rollback_draft"].includes(selectedDraft.status));
  useEffect(() => { if (selectedDraft) { setValue(String(selectedDraft.value)); setReason(selectedDraft.changeReason); setDraftValueError(""); setDraftReasonError(""); } }, [selectedDraft]);

  return <section aria-label="设置中心" className={styles.panel}>
    <header className={styles.header}><div><h2>设置中心</h2><p>通过草稿、验证和明确确认发布唯一的 S01 核心设置。这里不读取环境变量，也不呈现密钥。</p></div><span className={styles.badge}>settings-center.v1</span></header>
    <nav aria-label="设置中心视图" className={styles.tabs}>{(["overview", "lifecycle", "history"] as const).map((page) => <button aria-pressed={location.page === page} disabled={page === "history" && !capability.history.read} key={page} onClick={() => navigate(page)} type="button">{page === "overview" ? "概览与注册表" : page === "lifecycle" ? "生命周期" : "发布历史"}</button>)}<button className={styles.button} onClick={() => void load()} type="button">刷新</button></nav>
    <p aria-live="polite" className={`${styles.status} ${message ? styles.error : ""}`} role={message ? "alert" : "status"}>{message || (state === "loading" ? "正在读取设置中心。" : state === "stale" ? `当前设置快照已超过 ${Math.min(300, Math.max(15, effectiveRefreshSecondsRef.current || 60))} 秒，请刷新。` : state === "empty" ? "请求成功，当前没有记录。" : state === "forbidden" ? "设置中心访问被拒绝。" : state === "error" ? "设置中心已降级，失败未被当作空数据。" : "设置中心快照已刷新。")}</p>

    {location.page === "overview" && overview ? <>
      <dl className={styles.summary}><div><dt>环境</dt><dd>{overview.environment.label}</dd></div><div><dt>有效发布版本</dt><dd>{overview.publication.version}</dd></div><div><dt>开放草稿</dt><dd>{overview.openDraftCount}</dd></div><div><dt>就绪状态</dt><dd><span className={`${styles.badge} ${readiness?.state === "ready" ? styles.ready : styles.degraded}`}>{readiness?.state ?? overview.readiness.state}</span></dd></div></dl>
      <section className={styles.section} aria-labelledby="settings-create-title"><h3 id="settings-create-title">创建核心刷新间隔草稿</h3>{available && capability.actions.createDraft ? <div className={styles.toolbar}><label className={styles.field}>刷新间隔（秒）<input aria-describedby={createValueError ? "settings-create-value-error" : undefined} aria-invalid={createValueError ? true : undefined} inputMode="numeric" max={300} min={15} onChange={(event) => { const nextValue = event.target.value; setValue(nextValue); if (createValueError && isValidSettingsDraftValue(nextValue)) setCreateValueError(""); }} ref={createValueRef} type="number" value={value} />{createValueError ? <span className={`${styles.status} ${styles.error}`} id="settings-create-value-error" role="alert">{createValueError}</span> : null}</label><label className={styles.field}>变更原因<textarea aria-describedby={createReasonError ? "settings-create-reason-error" : undefined} aria-invalid={createReasonError ? true : undefined} maxLength={500} minLength={8} onChange={(event) => { const nextReason = event.target.value; setReason(nextReason); if (createReasonError && isValidSettingsReason(nextReason)) setCreateReasonError(""); }} ref={createReasonRef} value={reason} />{createReasonError ? <span className={`${styles.status} ${styles.error}`} id="settings-create-reason-error" role="alert">{createReasonError}</span> : null}</label><button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void createDraft()} type="button">创建草稿</button></div> : <p>{available ? "当前操作员没有创建草稿权限。" : "核心设置描述符不可用。"}</p>}</section>
      <section className={styles.registry} aria-labelledby="settings-registry-title"><div className={styles.registryHeader}><div><h3 id="settings-registry-title">可搜索设置注册表</h3><p>只有核心刷新间隔可创建草稿。</p></div><label className={styles.search}>搜索注册表<input onChange={(event) => setQuery(event.target.value)} type="search" value={query} /></label></div><p aria-atomic="true" aria-live="polite" role="status">{filteredRegistry.length ? `找到 ${filteredRegistry.length} 个注册表项目。` : "没有匹配的注册表项目。"}</p><ul className={styles.registryList}>{filteredRegistry.map((entry) => <li key={entry.key}><h4>{entry.title}</h4><p><code>{entry.key}</code> · {futureGroupLabels[entry.group]} · <span className={styles.badge}>{entry.availability}</span></p><p>{entry.description}</p>{entry.availability !== "available" ? <p>此组仅显示 coming-in-v1/not_implemented 状态；未挂载表单控件，也不会发出组专属请求。</p> : null}</li>)}</ul>{!filteredRegistry.length ? <p>没有匹配的注册表项目。</p> : null}</section>
    </> : null}

    {location.page === "lifecycle" ? <>
      <section aria-busy={busy || state === "loading"} className={styles.section}><h3 id="settings-lifecycle-title" tabIndex={-1}>设置草稿</h3>{drafts.length ? <label className={styles.field}>选择草稿<select onChange={(event) => { setDraftValueError(""); setDraftReasonError(""); navigate("lifecycle", event.target.value); }} value={selectedDraft?.id ?? ""}>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.id} · {statusLabels[draft.status]}</option>)}</select></label> : <p>目前没有设置草稿。请从概览创建唯一可用的核心设置草稿。</p>}</section>
      {selectedDraft ? <section className={styles.section}><h3>草稿生命周期</h3><dl className={styles.summary}><div><dt>状态</dt><dd>{statusLabels[selectedDraft.status]}</dd></div><div><dt>草稿版本</dt><dd>{selectedDraft.version}</dd></div><div><dt>候选值</dt><dd>{selectedDraft.value} 秒</dd></div><div><dt>基础发布版本</dt><dd>{selectedDraft.basePublicationVersion}</dd></div></dl>{editableDraft ? <div className={styles.toolbar}><label className={styles.field}>候选刷新间隔（秒）<input aria-describedby={draftValueError ? "settings-draft-value-error" : undefined} aria-invalid={draftValueError ? true : undefined} max={300} min={15} onChange={(event) => { const nextValue = event.target.value; setValue(nextValue); if (draftValueError && isValidSettingsDraftValue(nextValue)) setDraftValueError(""); }} ref={draftValueRef} type="number" value={value} />{draftValueError ? <span className={`${styles.status} ${styles.error}`} id="settings-draft-value-error" role="alert">{draftValueError}</span> : null}</label><label className={styles.field}>变更原因<textarea aria-describedby={draftReasonError ? "settings-draft-reason-error" : undefined} aria-invalid={draftReasonError ? true : undefined} maxLength={500} minLength={8} onChange={(event) => { const nextReason = event.target.value; setReason(nextReason); if (draftReasonError && isValidSettingsReason(nextReason)) setDraftReasonError(""); }} ref={draftReasonRef} value={reason} />{draftReasonError ? <span className={`${styles.status} ${styles.error}`} id="settings-draft-reason-error" role="alert">{draftReasonError}</span> : null}</label><button className={styles.button} disabled={!capability.actions.updateDraft || busy || conflict} onClick={() => void saveDraft()} type="button">保存草稿</button></div> : <p>{selectedDraft.changeReason}</p>}{validation ? <div><p aria-atomic="true" aria-live="polite" role="status">验证完成：{validation.issues.filter((issue) => issue.severity === "blocker").length} 个阻断，{validation.issues.filter((issue) => issue.severity !== "blocker").length} 个非阻断提示。</p><h4>{validation.status === "invalid" ? "验证阻断" : "验证通过"}</h4>{validation.issues.length ? <ul className={styles.issues}>{validation.issues.map((issue, index) => <li key={`${issue.code}-${index}`}><strong>{issue.severity}</strong>：{issue.message}</li>)}</ul> : <p>没有验证问题。</p>}</div> : null}<div className={styles.actions}><button className={styles.button} disabled={!capability.actions.validate || busy || conflict || !selectedDraft || !["draft", "invalid", "validated", "activation_failed", "rollback_draft"].includes(selectedDraft.status)} onClick={() => void validateDraft()} type="button">验证草稿</button><button className={`${styles.button} ${styles.primary}`} disabled={!capability.actions.publish || selectedDraft.status !== "validated" || validation?.issues.some((issue) => issue.severity === "blocker") || !diff || busy || conflict} onClick={() => { setDialogError(""); if (diff) setConfirmation({ kind: "publish", draft: selectedDraft, diff }); }} type="button">审阅并发布</button></div></section> : null}
      {diff ? <section className={styles.section}><h3>安全差异</h3><table className={styles.diff}><caption className="visually-hidden">设置草稿公开差异</caption><thead><tr><th scope="col">字段</th><th scope="col">当前</th><th scope="col">候选</th><th scope="col">敏感度</th></tr></thead><tbody>{diff.changes.map((change) => <tr key={change.field}><td>{change.field}</td><td>{change.before}</td><td>{change.after}</td><td>{change.sensitivity}</td></tr>)}</tbody></table><p>密钥变更：{diff.secretChangeCount}；无需重启；影响服务：Dashboard。</p></section> : null}
    </> : null}

    {location.page === "history" ? <section className={styles.section}><h3 id="settings-history-title" tabIndex={-1}>追加式发布历史</h3>{history.length ? <ol className={styles.historyList}>{history.map((entry) => <li key={`${entry.publicationId}:${entry.version}:${entry.status}`}><p><strong>版本 {entry.version}</strong> · {statusLabels[entry.status]} · {formatDate(entry.publishedAt)}</p><p>{entry.changeReason}</p><button className={styles.button} disabled={!capability.actions.rollback || busy || conflict || !overview || !["published", "superseded"].includes(entry.status)} onClick={() => { setRollbackReason(""); setRollbackError(""); setDialogError(""); setConfirmation({ kind: "rollback", publication: entry }); }} type="button">创建回滚草稿</button></li>)}</ol> : <p>尚无发布历史。空历史不会被视为错误。</p>}</section> : null}

    {confirmation ? <div className={styles.modalRoot} ref={modalRootRef}><section aria-labelledby="settings-confirm-title" aria-modal="true" className={styles.dialog} ref={dialogRef} role="dialog" tabIndex={-1}><h3 id="settings-confirm-title">{confirmation.kind === "publish" ? "确认发布设置草稿" : "确认创建回滚草稿"}</h3>{confirmation.kind === "publish" ? <><p>发布会把刷新间隔从 {confirmation.diff.changes[0]?.before} 秒改为 {confirmation.diff.changes[0]?.after} 秒。发布是原子的，不允许部分发布。</p><p>确认草稿 <code>{confirmation.draft.id}</code>，版本 {confirmation.draft.version}。</p></> : <><p>回滚不会直接改写历史，而是从发布版本 {confirmation.publication.version} 创建一个新草稿。</p><label className={styles.field}>回滚原因<textarea aria-describedby={rollbackError ? "settings-rollback-error" : undefined} aria-invalid={rollbackError ? true : undefined} autoFocus maxLength={500} minLength={8} onChange={(event) => { const nextReason = event.target.value; setRollbackReason(nextReason); if (rollbackError && isValidSettingsReason(nextReason)) setRollbackError(""); if (dialogError) setDialogError(""); }} ref={rollbackReasonRef} value={rollbackReason} /></label>{rollbackError ? <p aria-live="assertive" className={`${styles.status} ${styles.error}`} id="settings-rollback-error" role="alert">{rollbackError}</p> : null}</>}{dialogError ? <p aria-live="assertive" className={`${styles.status} ${styles.error}`} role="alert">{dialogError}</p> : null}<div className={styles.actions}><button className={styles.button} onClick={closeConfirmation} type="button">取消</button><button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void (confirmation.kind === "publish" ? publishDraft() : createRollback())} type="button">{confirmation.kind === "publish" ? "确认发布" : "确认创建草稿"}</button></div></section></div> : null}
  </section>;
}
