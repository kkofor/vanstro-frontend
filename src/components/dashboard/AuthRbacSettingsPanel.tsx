"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AuthRbacSettingsValueV1,
  SettingsCenterCapability,
  S09Draft,
  S09HistoryEntry,
  S09ImpactPreviewResult,
  S09Publication,
  S09Readiness,
  S09SafeDiff,
  S09SessionRevokeResult,
  S09ValidationResult
} from "@/lib/api/api-contract";
import { API_ENDPOINTS, AUTH_RBAC_DESCRIPTOR_KEY } from "@/lib/api/api-contract";
import {
  validateApiResult,
  validateS09Draft,
  validateS09HistoryEntry,
  validateS09ImpactPreviewResult,
  validateS09Overview,
  validateS09Publication,
  validateS09Readiness,
  validateS09SafeDiff,
  validateS09SessionRevokeResult,
  validateS09ValidationResult,
  type RuntimeValidator
} from "@/lib/api/runtime-validation";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { authorizeS09Operation } from "@/lib/dashboard/s09-settings-transport";
import {
  bindCreatedS09Draft,
  bindPublishedS09,
  bindRollbackS09Draft,
  bindS09Diff,
  bindS09Validation,
  bindUpdatedS09Draft,
  isStructurallyValidS09Value,
  isValidS09Reason,
  S09_COMPILED_VALUE,
  type S09Location
} from "@/lib/dashboard/s09-settings";
import { createS09ReadinessConsumer } from "@/lib/dashboard/s09-settings-readiness-consumer";
import type { SiteLocale } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { StatusMessage, StatusMessageContent, StatusMessageTitle } from "@/components/ui/status-message";
import styles from "./AuthRbacSettingsPanel.module.css";

type ValidLocation = Extract<S09Location, { kind: "valid" }>;
type Props = {
  actorKey: string;
  capability: SettingsCenterCapability;
  location: ValidLocation;
  locale: SiteLocale;
  apiRequest: (path: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => void;
};
type LoadState = "loading" | "ready" | "empty" | "forbidden" | "error";
type Confirmation = { kind: "publish"; draft: S09Draft; diff: S09SafeDiff } | { kind: "rollback"; publication: S09HistoryEntry };
type FieldState = { value: string; error: string };

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
  return `settings-s09-${action}-${random}`;
}
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString("zh-CN") : "尚无"; }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function fieldState(initial: string): FieldState { return { value: initial, error: "" }; }
function formatDiffValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function AuthRbacSettingsPanel({ actorKey, capability, location, locale, apiRequest, onUnauthorized }: Props) {
  const [drafts, setDrafts] = useState<S09Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<S09Draft>();
  const [validation, setValidation] = useState<S09ValidationResult>();
  const [diff, setDiff] = useState<S09SafeDiff>();
  const [history, setHistory] = useState<S09HistoryEntry[]>([]);
  const [readiness, setReadiness] = useState<S09Readiness>();
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

  const [minimumLength, setMinimumLength] = useState<FieldState>(fieldState(String(S09_COMPILED_VALUE.passwordPolicy.minimumLength)));
  const [resetTokenTtlMinutes, setResetTokenTtlMinutes] = useState<FieldState>(fieldState(String(S09_COMPILED_VALUE.passwordPolicy.resetTokenTtlMinutes)));
  const [sessionLifetimeMinutes, setSessionLifetimeMinutes] = useState<FieldState>(fieldState(String(S09_COMPILED_VALUE.sessionPolicy.sessionLifetimeMinutes)));

  const [previewTargetUserId, setPreviewTargetUserId] = useState("");
  const [previewNextStatus, setPreviewNextStatus] = useState("");
  const [previewRemoveRoleId, setPreviewRemoveRoleId] = useState("");
  const [previewResult, setPreviewResult] = useState<S09ImpactPreviewResult>();
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);

  const [revokeTargetUserId, setRevokeTargetUserId] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeConfirmation, setRevokeConfirmation] = useState("");
  const [revokeResult, setRevokeResult] = useState<S09SessionRevokeResult>();
  const [revokeMessage, setRevokeMessage] = useState("");
  const [revokeBusy, setRevokeBusy] = useState(false);

  const generation = useRef(0);
  const actorRef = useRef(actorKey);
  actorRef.current = actorKey;
  const capabilityRef = useRef(capability);
  capabilityRef.current = capability;
  const capabilityFlags = `${capability.enabled}:${capability.actions.read}:${capability.actions.createDraft}:${capability.actions.updateDraft}:${capability.actions.validate}:${capability.actions.publish}:${capability.actions.rollback}:${capability.history.read}:${capability.readiness.read}`;
  const controllerRef = useRef<AbortController | null>(null);
  const diffControllerRef = useRef<AbortController | null>(null);
  const readinessConsumerRef = useRef(createS09ReadinessConsumer({ set: (callback, delayMs) => setTimeout(callback, delayMs), clear: (handle) => clearTimeout(handle) }));
  const reloadRef = useRef<() => void>(() => {});
  const dialogRef = useRef<HTMLElement>(null);
  const modalRootRef = useRef<HTMLDivElement>(null);
  const rollbackReasonRef = useRef<HTMLTextAreaElement>(null);
  const createReasonRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef(false);
  const selectedDraftRef = useRef<S09Draft | undefined>(undefined);
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
        getData(API_ENDPOINTS.dashboardS09SettingsOverview, controller.signal, validateS09Overview),
        getData(API_ENDPOINTS.dashboardS09SettingsDrafts, controller.signal, arrayValidator(validateS09Draft, "s09 drafts")),
        activeCapability.history.read ? getData(API_ENDPOINTS.dashboardS09SettingsHistory, controller.signal, arrayValidator(validateS09HistoryEntry, "s09 history")) : Promise.resolve([]),
        activeCapability.readiness.read ? getData(API_ENDPOINTS.dashboardS09SettingsReadiness, controller.signal, validateS09Readiness) : Promise.resolve(undefined)
      ]);
      const draft = draftList[0];
      let nextDiff: S09SafeDiff | undefined;
      if (draft?.status === "validated") {
        const candidate = await getData(API_ENDPOINTS.dashboardS09SettingsDraftDiff(draft.id), controller.signal, validateS09SafeDiff);
        if (candidate.draftId === draft.id && candidate.draftVersion === draft.version && candidate.descriptorKey === draft.descriptorKey) nextDiff = candidate;
        else throw new TypeError("S09 安全差异与当前草稿版本不匹配。");
      }
      if (!commitAllowed(requestGeneration, requestActor, controller.signal)) return;
      setDrafts(draftList); setSelectedDraft(draft); setHistory(historyWire); setDiff(nextDiff); setReadiness(readinessWire);
      if (draft) {
        setMinimumLength(fieldState(String(draft.value.passwordPolicy.minimumLength)));
        setResetTokenTtlMinutes(fieldState(String(draft.value.passwordPolicy.resetTokenTtlMinutes)));
        setSessionLifetimeMinutes(fieldState(String(draft.value.sessionPolicy.sessionLifetimeMinutes)));
      } else {
        setMinimumLength(fieldState(String(overview.effective.passwordPolicy.minimumLength)));
        setResetTokenTtlMinutes(fieldState(String(overview.effective.passwordPolicy.resetTokenTtlMinutes)));
        setSessionLifetimeMinutes(fieldState(String(overview.effective.sessionPolicy.sessionLifetimeMinutes)));
      }
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
    // Load exactly once per mount: framework-level identity changes (e.g. the
    // session identity flipping hasIdentity) must not re-enter the loading
    // state and drop user input mid-edit; the reload button covers refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execute = useCallback(async (operation: Parameters<typeof authorizeS09Operation>[0], validator: (wire: unknown) => unknown) => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    const requestGeneration = generation.current;
    const requestActor = actorKey;
    let request: ReturnType<typeof authorizeS09Operation>;
    try { request = authorizeS09Operation(operation); }
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

  const draftValue = useCallback((): AuthRbacSettingsValueV1 => ({
    passwordPolicy: { minimumLength: Number(minimumLength.value), resetTokenTtlMinutes: Number(resetTokenTtlMinutes.value) },
    sessionPolicy: { sessionLifetimeMinutes: Number(sessionLifetimeMinutes.value) }
  }), [minimumLength, resetTokenTtlMinutes, sessionLifetimeMinutes]);

  const validateFields = useCallback(() => {
    let valid = true;
    const length = Number(minimumLength.value);
    if (!Number.isInteger(length) || length < 12 || length > 128) { setMinimumLength((current) => ({ ...current, error: "密码最小长度需为 12–128 的整数。" })); valid = false; }
    const resetTtl = Number(resetTokenTtlMinutes.value);
    if (!Number.isInteger(resetTtl) || resetTtl < 5 || resetTtl > 31) { setResetTokenTtlMinutes((current) => ({ ...current, error: "重置令牌有效期需为 5–31 分钟的整数。" })); valid = false; }
    const sessionTtl = Number(sessionLifetimeMinutes.value);
    if (!Number.isInteger(sessionTtl) || sessionTtl < 15 || sessionTtl > 11520) { setSessionLifetimeMinutes((current) => ({ ...current, error: "会话有效期需为 15–11520 分钟的整数。" })); valid = false; }
    return valid;
  }, [minimumLength, resetTokenTtlMinutes, sessionLifetimeMinutes]);

  const createDraft = async () => {
    if (!validateFields()) return;
    const value = draftValue();
    if (!isStructurallyValidS09Value(value)) { setCreateReasonError("设置值结构无效。"); return; }
    if (!isValidS09Reason(reason)) { setCreateReasonError("变更原因至少需要 8 个字符。"); window.requestAnimationFrame(() => createReasonRef.current?.focus()); return; }
    setCreateReasonError("");
    const expectedPublishedVersion = readiness?.publicationCas ?? 0;
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createDraft", input: { descriptorKey: AUTH_RBAC_DESCRIPTOR_KEY, expectedPublishedVersion, value, changeReason: reason.trim(), idempotencyKey: idempotencyKey("create") } }, validateS09Draft) as S09Draft | undefined;
    if (!draft) return;
    try {
      bindCreatedS09Draft(draft, { descriptorKey: AUTH_RBAC_DESCRIPTOR_KEY, expectedPublishedVersion, value, changeReason: reason.trim() });
      setDrafts((current) => [draft, ...current.filter((entry) => entry.id !== draft.id)]);
      setSelectedDraft(draft); setValidation(undefined); setDiff(undefined); setConflict(false);
      setPendingReason(reason); setMessage("S09 设置草稿已创建。");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("草稿响应与请求内容不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const saveDraft = async () => {
    if (!selectedDraft) return;
    if (!validateFields()) return;
    const sourceDraft = selectedDraft;
    const value = draftValue();
    if (!isStructurallyValidS09Value(value)) { setMessage("设置值结构无效。"); return; }
    if (!isValidS09Reason(reason)) { setReasonError("变更原因至少需要 8 个字符。"); return; }
    setReasonError("");
    const updated = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "updateDraft", draftId: sourceDraft.id, status: sourceDraft.status, input: { expectedVersion: sourceDraft.version, value, changeReason: reason.trim(), idempotencyKey: idempotencyKey("update") } }, validateS09Draft) as S09Draft | undefined;
    if (!updated) return;
    try {
      bindUpdatedS09Draft(updated, sourceDraft, value, reason);
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
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "validateDraft", draftId: sourceDraft.id, status: sourceDraft.status, input: { expectedVersion, idempotencyKey: idempotencyKey("validate") } }, validateS09ValidationResult) as S09ValidationResult | undefined;
    if (!result) return;
    try { bindS09Validation(result, sourceDraft.id, expectedVersion, sourceDraft.status); }
    catch { setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("S09 验证响应与所请求草稿版本不匹配，正在重新读取权威状态。"); void load(); return; }
    {
      const validatedDraft: S09Draft = { ...sourceDraft, status: result.status, version: result.draftVersion, validationRevision: result.validationRevision, updatedAt: result.validatedAt };
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
          const response = await apiRequest(API_ENDPOINTS.dashboardS09SettingsDraftDiff(diffDraftId), { signal: diffController.signal });
          if (response.status === 401) onUnauthorized();
          if (response.ok) {
            const nextDiff = validateApiResult(await response.json(), validateS09SafeDiff).data;
            const currentDraft = selectedDraftRef.current;
            if (diffController.signal.aborted || diffGeneration !== generation.current || diffActor !== actorRef.current || currentDraft?.id !== diffDraftId || currentDraft.version !== diffDraftVersion || currentDraft.status !== result.status) return;
            try { setDiff(bindS09Diff(nextDiff, result)); }
            catch { setDiff(undefined); setConflict(true); setMessage("S09 安全差异与当前草稿版本不匹配，正在重新读取权威状态。"); void load(); }
          }
        } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) { /* Validation remains visible; publish stays disabled without a current safe diff. */ } }
      } else {
        setDiff(undefined);
      }
    }
  };

  const publishDraft = async () => {
    if (!confirmation || confirmation.kind !== "publish") return;
    const result = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "publishDraft", draftId: confirmation.draft.id, status: confirmation.draft.status, input: { expectedVersion: confirmation.draft.version, idempotencyKey: idempotencyKey("publish") } }, validateS09Publication) as S09Publication | undefined;
    if (!result) return;
    try {
      bindPublishedS09(result, confirmation.draft.id, confirmation.draft.version);
      closeConfirmation();
      const appliedGeneration = readinessConsumerRef.current.install(result.readiness.publishedGeneration, () => { void load(); });
      setMessage(`S09 设置已发布。已安装发布代次 ${appliedGeneration}。`);
      if (capability.readiness.read) {
        try {
          const controller = controllerRef.current?.signal ?? new AbortController().signal;
          const confirmed = await getData(`${API_ENDPOINTS.dashboardS09SettingsReadiness}?consumerGeneration=${appliedGeneration}`, controller, validateS09Readiness);
          if (confirmed.consumerGeneration === appliedGeneration && confirmed.publishedGeneration === appliedGeneration && confirmed.state === "ready") {
            setReadiness(confirmed);
            setMessage("S09 设置已发布，消费者已确认发布代次。");
          } else {
            setReadiness(confirmed);
            setMessage("S09 设置已发布。消费者确认尚未完成，仍显示权威状态。");
          }
        } catch {
          setReadiness(undefined);
          setMessage("S09 设置已发布。消费者确认暂时不可用，请刷新查看就绪状态。");
        }
      } else {
        setReadiness(undefined);
      }
      void load();
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); closeConfirmation(); setMessage("S09 发布响应与已确认草稿版本不匹配，正在重新读取权威状态。"); void load();
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
    const draft = await execute({ actorKey, expectedActorKey: actorKey, capability, signal: controllerRef.current?.signal, kind: "createRollbackDraft", publicationId: confirmation.publication.publicationId, sourceStatus: confirmation.publication.status, input: { expectedPublishedVersion: submittedCurrentPublishedVersion, changeReason: rollbackReason.trim(), idempotencyKey: idempotencyKey("rollback") } }, validateS09Draft) as S09Draft | undefined;
    if (!draft) return;
    try {
      bindRollbackS09Draft(draft, confirmation.publication, submittedCurrentPublishedVersion);
      closeConfirmation();
      setDrafts((current) => [draft, ...current.filter((entry) => entry.id !== draft.id)]);
      setSelectedDraft(draft); setValidation(undefined); setDiff(undefined); setConflict(false);
      setMessage("S09 回滚草稿已创建。");
    } catch {
      setConflict(true); setValidation(undefined); setDiff(undefined); setMessage("S09 回滚草稿响应与已确认发布不匹配，正在重新读取权威状态。"); void load();
    }
  };

  const runImpactPreview = async () => {
    if (!isUuid(previewTargetUserId)) { setPreviewMessage("目标用户标识必须是有效 UUID。"); return; }
    const hasNextStatus = previewNextStatus !== "";
    const hasRemoveRole = previewRemoveRoleId.trim() !== "";
    if (!hasNextStatus && !hasRemoveRole) { setPreviewMessage("至少需要指定一个变更（nextStatus 或 removeRoleId）。"); return; }
    if (hasRemoveRole && !isUuid(previewRemoveRoleId.trim())) { setPreviewMessage("角色标识必须是有效 UUID。"); return; }
    setPreviewBusy(true); setPreviewMessage(""); setPreviewResult(undefined);
    try {
      const response = await fetch(`${DASHBOARD_API_BASE_URL}${API_ENDPOINTS.dashboardS09SettingsImpactPreview}`, {
        method: "POST", credentials: "include", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: previewTargetUserId,
          ...(hasNextStatus ? { nextStatus: previewNextStatus } : {}),
          ...(hasRemoveRole ? { removeRoleId: previewRemoveRoleId.trim() } : {})
        })
      });
      if (response.status === 401) onUnauthorized();
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { code?: string } | null;
        setPreviewMessage(response.status === 403 ? "当前操作员没有执行影响预览的权限。" : body?.code === "COMMERCE_INVALID" ? "影响预览请求无效。" : "影响预览暂时不可用。");
        return;
      }
      setPreviewResult(validateApiResult(await response.json(), validateS09ImpactPreviewResult).data);
    } catch {
      setPreviewMessage("影响预览请求失败。");
    } finally { setPreviewBusy(false); }
  };

  const runSessionRevoke = async () => {
    if (!isUuid(revokeTargetUserId)) { setRevokeMessage("目标用户标识必须是有效 UUID。"); return; }
    if (revokeConfirmation !== "REVOKE_SESSIONS") { setRevokeMessage("确认短语必须为 REVOKE_SESSIONS。"); return; }
    if (revokeReason.trim().length < 8 || revokeReason.trim().length > 500) { setRevokeMessage("撤销原因需为 8–500 个字符。"); return; }
    setRevokeBusy(true); setRevokeMessage(""); setRevokeResult(undefined);
    try {
      const response = await fetch(`${DASHBOARD_API_BASE_URL}${API_ENDPOINTS.dashboardS09SettingsSessionRevoke}`, {
        method: "POST", credentials: "include", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: revokeTargetUserId, confirmation: revokeConfirmation, reason: revokeReason.trim() })
      });
      if (response.status === 401) onUnauthorized();
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { code?: string } | null;
        setRevokeMessage(response.status === 403 ? "当前操作员没有 sessions.revoke 权限，无法撤销会话。" : body?.code === "AUTH_RBAC_CONFIRMATION_INVALID" ? "确认短语无效。" : response.status === 404 ? "目标用户不可用。" : "会话撤销失败。");
        return;
      }
      setRevokeResult(validateApiResult(await response.json(), validateS09SessionRevokeResult).data);
    } catch {
      setRevokeMessage("会话撤销请求失败。");
    } finally { setRevokeBusy(false); }
  };

  const openPublishConfirmation = () => {
    if (!selectedDraft || selectedDraft.status !== "validated" || !diff) return;
    setConfirmation({ kind: "publish", draft: selectedDraft, diff });
  };

  const openRollbackConfirmation = (publication: S09HistoryEntry) => {
    if (publication.status !== "published" && publication.status !== "superseded") return;
    setConfirmation({ kind: "rollback", publication });
  };

  return (
    <section aria-label="认证/RBAC 设置" className={styles.panel}>
      <div className={styles.header}>
        <h2>认证与 RBAC 设置</h2>
        <p>settings.auth-rbac · settings.auth-rbac.v1</p>
        <p>受控版本化生命周期：草稿 → 验证 → 发布。发布只激活登录/刷新/注册/重置解析的版本化有效策略，不创建也不撤销任何会话；现有会话不受追溯影响。</p>
      </div>
      {state === "loading" ? <StatusMessage variant="neutral"><StatusMessageTitle>正在加载数据</StatusMessageTitle><StatusMessageContent>正在读取 S09 设置权威状态。</StatusMessageContent></StatusMessage> : null}
      {state === "forbidden" || state === "error" ? <StatusMessage variant="error"><StatusMessageTitle>{state === "forbidden" ? "没有读取权限" : "数据暂时无法载入"}</StatusMessageTitle><StatusMessageContent>{message || "设置中心无法安全载入。"}<button onClick={() => void load()} type="button">重试</button></StatusMessageContent></StatusMessage> : null}
      {state === "empty" || state === "ready" ? (
        <>
          <div className={styles.section}>
            <h3>有效策略</h3>
            {readiness ? <p role="status">状态：{statusLabels[readiness.state] ?? readiness.state}（发布代次 {readiness.publishedGeneration}，投影 {readiness.projectionState}）</p> : null}
            <form className={styles.form} onSubmit={(event) => { event.preventDefault(); selectedDraft ? void saveDraft() : void createDraft(); }}>
              <label>密码最小长度（12–128）<input inputMode="numeric" max={128} min={12} onChange={(event) => setMinimumLength(fieldState(event.target.value))} type="number" value={minimumLength.value} />{minimumLength.error ? <span className={styles.error}>{minimumLength.error}</span> : null}</label>
              <label>密码重置令牌有效期（分钟，5–31）<input inputMode="numeric" max={31} min={5} onChange={(event) => setResetTokenTtlMinutes(fieldState(event.target.value))} type="number" value={resetTokenTtlMinutes.value} />{resetTokenTtlMinutes.error ? <span className={styles.error}>{resetTokenTtlMinutes.error}</span> : null}</label>
              <label>会话有效期（分钟，15–11520；默认 10080 = 7 天）<input inputMode="numeric" max={11520} min={15} onChange={(event) => setSessionLifetimeMinutes(fieldState(event.target.value))} type="number" value={sessionLifetimeMinutes.value} />{sessionLifetimeMinutes.error ? <span className={styles.error}>{sessionLifetimeMinutes.error}</span> : null}</label>
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
            <h3>影响预览（最后超级管理员保护）</h3>
            <p>只读事务预览 Role/Permission 变更是否会被最后超级管理员不变量拒绝；预览绝不写入。</p>
            <div className={styles.form}>
              <label>目标用户 UUID<input onChange={(event) => setPreviewTargetUserId(event.target.value)} type="text" value={previewTargetUserId} /></label>
              <label>变更状态（可留空）<select onChange={(event) => setPreviewNextStatus(event.target.value)} value={previewNextStatus}><option value="">不改变状态</option><option value="active">激活</option><option value="suspended">停用</option><option value="archived">归档</option></select></label>
              <label>移除角色 UUID（可留空）<input onChange={(event) => setPreviewRemoveRoleId(event.target.value)} type="text" value={previewRemoveRoleId} /></label>
              <Button disabled={previewBusy} onClick={() => void runImpactPreview()} type="button">{previewBusy ? "预览中…" : "运行影响预览"}</Button>
              {previewMessage ? <StatusMessage variant="warning"><StatusMessageTitle>{previewMessage}</StatusMessageTitle></StatusMessage> : null}
              {previewResult ? <StatusMessage variant={previewResult.wouldBlockLastSuperAdmin ? "error" : "success"}><StatusMessageTitle>{previewResult.wouldBlockLastSuperAdmin ? "将被最后超级管理员不变量阻止" : "变更可通过"}</StatusMessageTitle><StatusMessageContent>safeReasonCode：{previewResult.safeReasonCode}；活动超级管理员数：{previewResult.activeSuperAdminCount ?? "未知"}；contextRevision：{previewResult.contextRevision.slice(0, 12)}…</StatusMessageContent></StatusMessage> : null}
            </div>
          </div>
          <div className={styles.section}>
            <h3>显式会话撤销（sessions.revoke）</h3>
            <p>独立于设置生命周期：撤销目标用户全部活跃会话；需精确确认短语与原因；publish/rollback 不会复活已撤销会话。</p>
            <div className={styles.form}>
              <label>目标用户 UUID<input onChange={(event) => setRevokeTargetUserId(event.target.value)} type="text" value={revokeTargetUserId} /></label>
              <label>确认短语（REVOKE_SESSIONS）<input onChange={(event) => setRevokeConfirmation(event.target.value)} type="text" value={revokeConfirmation} /></label>
              <label>撤销原因（8–500 字符）<textarea onChange={(event) => setRevokeReason(event.target.value)} value={revokeReason} /></label>
              <Button disabled={revokeBusy} onClick={() => void runSessionRevoke()} type="button">{revokeBusy ? "撤销中…" : "撤销目标用户会话"}</Button>
              {revokeMessage ? <StatusMessage variant="warning"><StatusMessageTitle>{revokeMessage}</StatusMessageTitle></StatusMessage> : null}
              {revokeResult ? <StatusMessage variant="success"><StatusMessageTitle>已撤销 {revokeResult.revokedCount} 个会话</StatusMessageTitle><StatusMessageContent>目标用户 {revokeResult.targetUserId}；撤销时间 {formatDate(revokeResult.revokedAt)}。</StatusMessageContent></StatusMessage> : null}
            </div>
          </div>
        </>
      ) : null}
      {confirmation ? (
        <div className={styles.modalRoot} ref={modalRootRef}>
          <section aria-modal="true" className={styles.dialog} ref={dialogRef} role="dialog">
            <h3>{confirmation.kind === "publish" ? "确认发布" : "确认创建回滚草稿"}</h3>
            {confirmation.kind === "publish" ? (
              <div><p>发布草稿 {confirmation.draft.changeReason}（版本 {confirmation.draft.version}）后，新登录/刷新会话将采用新策略；现有会话不受影响。</p>
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
