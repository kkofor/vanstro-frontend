"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusMessage, StatusMessageContent, StatusMessageTitle } from "@/components/ui/status-message";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { API_ENDPOINTS, API_SERVICE_ACCOUNT_DESCRIPTOR_KEY, type ApiServiceAccountsValueV1, type InvocationSummary, type S08Draft, type S08HistoryEntry, type S08ImpactPreviewResult, type S08Overview, type S08Publication, type S08Readiness, type S08SafeDiff, type S08ValidationResult, type ServiceAccountSummary, type SettingsCenterCapability, type TokenCreateResult, type TokenMetadata, type TokenRotateResult } from "@/lib/api/api-contract";
import { arrayOf, validateApiResult, validateInvocationSummary, validateS08Draft, validateS08HistoryEntry, validateS08ImpactPreviewResult, validateS08Overview, validateS08Publication, validateS08Readiness, validateS08SafeDiff, validateS08ValidationResult, validateServiceAccountSummary, validateTokenCreateResult, validateTokenMetadata, validateTokenRotateResult, type RuntimeValidator } from "@/lib/api/runtime-validation";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { authorizeS08Operation } from "@/lib/dashboard/s08-settings-transport";
import { bindCreatedS08Draft, bindPublishedS08, bindRollbackS08Draft, bindS08Diff, bindS08Readiness, bindS08Validation, bindUpdatedS08Draft, isStructurallyValidS08Value, isValidS08Reason, S08_COMPILED_VALUE, type S08Location } from "@/lib/dashboard/s08-settings";
import type { SiteLocale } from "@/lib/i18n/locale";
import styles from "./ApiServiceAccountsSettingsPanel.module.css";

type Props = { actorKey: string; capability: SettingsCenterCapability; serviceAccountsManage: boolean; location: Extract<S08Location, { kind: "valid" }>; locale: SiteLocale; apiRequest: (path: string, init?: RequestInit) => Promise<Response>; onUnauthorized: () => void };
type LoadState = "loading" | "ready" | "empty" | "forbidden" | "error";
type Reveal = { kind: "create" | "rotate"; plaintext: string; name: string; expiresAt: string | null; overlapUntil?: string };
const labels: Record<string, string> = { implemented_ready: "已实现且就绪", implemented_degraded: "已实现但降级", future_obligation: "未来义务", ready: "就绪", degraded: "降级", draft: "草稿", validated: "已验证", invalid: "验证未通过", published: "已发布", superseded: "已取代", rolled_back: "已回滚", activation_failed: "激活失败", rollback_draft: "回滚草稿", active: "启用", disabled: "停用", expired: "已过期", revoked: "已撤销", rotated: "已轮换", succeeded: "成功", failed: "失败", rate_limited: "限流", denied: "拒绝", production: "生产", staging: "预发布", development: "开发", test: "测试", global: "全局", dealer: "经销商", location: "位置", "per-token": "每令牌", "per-account": "每账号", strict: "严格", standard: "标准", seconds: "秒" };
const consumerLabels: Record<string, string> = { "token-lifecycle": "令牌生命周期", "rotate-overlap": "轮换重叠", "machine-scope-enforcement": "机器范围执行", "rate-limit": "速率限制", "audit-invocation-read-model": "审计调用读模型", "erp-product-api-machine": "ERP 商品 API 机器身份" };
const unnamedTokenLabels = {
  "en-CA": "Unnamed token",
  "fr-CA": "Jeton sans nom"
} satisfies Record<SiteLocale, string>;
const clone = (value: ApiServiceAccountsValueV1) => JSON.parse(JSON.stringify(value)) as ApiServiceAccountsValueV1;
const key = (action: string) => `settings-s08-${action}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString("zh-CN") : "—");
const formatDiff = (value: unknown) => (value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value));

type SafeApiError = { status: number; code: string | null; message: string; retryAfter: number | null };

/** Read the JSON error envelope once and expose only the public fields
 *  (error + stable code + Retry-After). Never surfaces stack/SQL/tokenHash/
 *  plaintext/internal paths or the raw exception. */
async function readSafeApiError(response: Response): Promise<SafeApiError> {
  const status = response.status;
  let code: string | null = null;
  let message = "";
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      code = typeof record.code === "string" && record.code.length > 0 ? record.code : null;
      message = typeof record.error === "string" && record.error.trim().length > 0 ? record.error.trim() : "";
    }
  } catch {
    // Not a valid safe JSON envelope → caller falls back to the HTTP status.
  }
  let retryAfter: number | null = null;
  const retryHeader = response.headers.get("retry-after");
  if (retryHeader) {
    const parsed = Number(retryHeader);
    if (Number.isFinite(parsed) && parsed >= 0) retryAfter = parsed;
  }
  return { status, code, message, retryAfter };
}

function genericApiErrorMessage(error: SafeApiError): string {
  switch (error.status) {
    case 401: return "未授权：会话已失效，请重新登录。";
    case 403: return "没有权限执行此操作。";
    case 404: return "资源不存在。";
    case 429: return error.retryAfter !== null ? `请求过于频繁，请 ${error.retryAfter} 秒后重试。` : "请求过于频繁，请稍后重试。";
    default:
      if (error.status >= 500) return "服务暂时不可用，请稍后重试。";
      return error.message || `请求失败：HTTP ${error.status}`;
  }
}

class S08ApiRequestError extends Error {
  constructor(readonly status: number, readonly code: string | null, readonly retryAfter: number | null, message: string) {
    super(message);
    this.name = "S08ApiRequestError";
  }
}

export function ApiServiceAccountsSettingsPanel({ actorKey, capability, serviceAccountsManage, location, locale, apiRequest, onUnauthorized }: Props) {
  // The dashboard shell transport is intentionally read-only (GET/HEAD). S08
  // lifecycle writes (create/update/validate/publish/rollback) and Service
  // Account/Token business actions (create/rotate/revoke) go directly to the
  // settings/MCP API base with the same credentials; reads keep the shell
  // transport so the read-only preview contract is preserved.
  const writeRequest = useCallback(async (path: string, init?: RequestInit): Promise<Response> => { const method = init?.method ?? "GET"; if (method === "GET" || method === "HEAD") return apiRequest(path, init); return fetch(`${DASHBOARD_API_BASE_URL}${path}`, { ...init, credentials: "include", cache: "no-store", redirect: "error" }); }, [apiRequest]);
  const getData = useCallback(async <T,>(path: string, validator: RuntimeValidator<T>, init?: RequestInit): Promise<T> => { const response = await writeRequest(path, init); if (!response.ok) { const safe = await readSafeApiError(response); throw new S08ApiRequestError(safe.status, safe.code, safe.retryAfter, genericApiErrorMessage(safe)); } return validateApiResult(await response.json(), validator).data; }, [writeRequest]);
  const [loadState, setLoadState] = useState<LoadState>("loading"), [overview, setOverview] = useState<S08Overview | null>(null), [draft, setDraft] = useState<S08Draft | null>(null), [form, setForm] = useState(() => clone(S08_COMPILED_VALUE)), [reason, setReason] = useState(""), [validation, setValidation] = useState<S08ValidationResult | null>(null), [diff, setDiff] = useState<S08SafeDiff | null>(null), [preview, setPreview] = useState<S08ImpactPreviewResult | null>(null), [readiness, setReadiness] = useState<S08Readiness | null>(null), [history, setHistory] = useState<S08HistoryEntry[]>([]), [accounts, setAccounts] = useState<ServiceAccountSummary[]>([]), [selectedAccount, setSelectedAccount] = useState<ServiceAccountSummary | null>(null), [tokenList, setTokenList] = useState<{ accountId: string | null; status: "loading" | "ready" | "error"; tokens: TokenMetadata[] }>({ accountId: null, status: "loading", tokens: [] }), [invocations, setInvocations] = useState<InvocationSummary[]>([]), [busy, setBusy] = useState(""), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [tokenName, setTokenName] = useState(""), [tokenTtl, setTokenTtl] = useState(""), [reveal, setReveal] = useState<Reveal | null>(null), [revokeTarget, setRevokeTarget] = useState<{ token: TokenMetadata; reason: string } | null>(null);
  const revealRef = useRef<HTMLDivElement>(null), revealRootRef = useRef<HTMLDivElement>(null), revokeRef = useRef<HTMLDivElement>(null), revokeRootRef = useRef<HTMLDivElement>(null);
  const createTokenIdempotencyRef = useRef<string | null>(null), creatingRef = useRef(false), tokenLoadGenerationRef = useRef(0), selectedAccountIdRef = useRef<string | null>(null);
  useEffect(() => { selectedAccountIdRef.current = selectedAccount?.id ?? null; }, [selectedAccount]);
  useModalFocus({ active: reveal !== null, containerRef: revealRef, modalRootRef: revealRootRef, onEscape: () => setReveal(null) });
  useModalFocus({ active: revokeTarget !== null, containerRef: revokeRef, modalRootRef: revokeRootRef, onEscape: () => setRevokeTarget(null) });
  const load = useCallback(async () => {
    setLoadState("loading"); setError("");
    try {
      const [o, d, r, h, a, inv] = await Promise.all([
        getData(API_ENDPOINTS.dashboardS08SettingsOverview, validateS08Overview),
        getData(API_ENDPOINTS.dashboardS08SettingsDrafts, arrayOf(validateS08Draft)),
        getData(API_ENDPOINTS.dashboardS08SettingsReadiness, validateS08Readiness),
        getData(API_ENDPOINTS.dashboardS08SettingsHistory, arrayOf(validateS08HistoryEntry)),
        getData(API_ENDPOINTS.dashboardS08ServiceAccounts, arrayOf(validateServiceAccountSummary)),
        getData(API_ENDPOINTS.dashboardS08InvocationReadModel, arrayOf(validateInvocationSummary))
      ]);
      setOverview(o); setReadiness(bindS08Readiness(r)); setHistory(h); setAccounts(a); setInvocations(inv);
      const open = d[0] ?? null; setDraft(open); setForm(clone(open?.value ?? o.effective)); setReason(open?.changeReason ?? "");
      setSelectedAccount((current) => { if (current && a.some((entry) => entry.id === current.id)) return current; return a[0] ?? null; });
      setLoadState(o ? "ready" : "empty");
    } catch (e) {
      const forbidden = e instanceof S08ApiRequestError && (e.status === 401 || e.status === 403);
      if (forbidden) { setLoadState("forbidden"); onUnauthorized(); } else { setError(e instanceof Error ? e.message : "载入失败"); setLoadState("error"); }
    }
  }, [getData, onUnauthorized]);
  useEffect(() => { void load(); }, [load, location.canonicalHref, actorKey]);
  const loadTokens = useCallback(async (accountId: string, options?: { quiet?: boolean }) => {
    const generation = ++tokenLoadGenerationRef.current;
    setTokenList((current) => ({ accountId, status: "loading", tokens: current.accountId === accountId ? current.tokens : [] }));
    if (!options?.quiet) setError("");
    try {
      const list = await getData(API_ENDPOINTS.dashboardS08ServiceAccountTokens(accountId), arrayOf(validateTokenMetadata));
      if (generation !== tokenLoadGenerationRef.current) return false;
      setTokenList({ accountId, status: "ready", tokens: list });
      return true;
    } catch (e) {
      if (generation !== tokenLoadGenerationRef.current) return false;
      setTokenList({ accountId, status: "error", tokens: [] });
      if (!options?.quiet) setError(e instanceof Error ? e.message : "令牌列表载入失败");
      return false;
    }
  }, [getData]);
  useEffect(() => { if (selectedAccount) void loadTokens(selectedAccount.id); }, [selectedAccount, loadTokens]);
  const execute = async <T,>(name: string, path: string, validator: RuntimeValidator<T>, init: RequestInit) => { setBusy(name); setError(""); setMessage(""); try { return await getData(path, validator, init); } catch (e) { setError(e instanceof Error ? e.message : "操作失败"); return null; } finally { setBusy(""); } };
  const operation = (input: Parameters<typeof authorizeS08Operation>[0]) => authorizeS08Operation(input);
  const shared = { actorKey, expectedActorKey: actorKey, capability, serviceAccountsManage };
  const save = async () => {
    if (!isStructurallyValidS08Value(form) || !isValidS08Reason(reason)) { setError("请修正四个策略族的字段，并填写 8–500 字变更原因。"); return; }
    if (draft) {
      const req = operation({ ...shared, kind: "updateDraft", draftId: draft.id, status: draft.status, input: { expectedVersion: draft.version, value: form, changeReason: reason, idempotencyKey: key("update") } });
      const next = await execute("save", req.path, validateS08Draft, req.init); if (next) { setDraft(bindUpdatedS08Draft(next, draft, form, reason)); setValidation(null); setDiff(null); setMessage("草稿已保存。"); }
    } else {
      const req = operation({ ...shared, kind: "createDraft", input: { descriptorKey: API_SERVICE_ACCOUNT_DESCRIPTOR_KEY, expectedPublishedVersion: overview?.publication?.cas ?? 0, value: form, changeReason: reason, idempotencyKey: key("create") } });
      const next = await execute("save", req.path, validateS08Draft, req.init); if (next) { setDraft(bindCreatedS08Draft(next, { expectedPublishedVersion: overview?.publication?.cas ?? 0, value: form, changeReason: reason })); setMessage("草稿已创建。"); }
    }
  };
  const validate = async () => {
    if (!draft) return;
    const req = operation({ ...shared, kind: "validateDraft", draftId: draft.id, status: draft.status, input: { expectedVersion: draft.version, idempotencyKey: key("validate") } });
    const result = await execute("validate", req.path, validateS08ValidationResult, req.init); if (!result) return;
    const bound = bindS08Validation(result, draft.id, draft.version, draft.status); setValidation(bound); setDraft({ ...draft, status: bound.status, version: bound.draftVersion, validationRevision: bound.validationRevision });
    if (bound.status === "validated") { const safe = await getData(API_ENDPOINTS.dashboardS08SettingsDraftDiff(draft.id), validateS08SafeDiff); setDiff(bindS08Diff(safe, bound)); }
    setMessage(bound.status === "validated" ? "验证通过，可检查差异后发布。" : "验证未通过。");
  };
  const impact = async () => {
    const req = operation({ ...shared, kind: "impactPreview", input: { candidate: form } });
    const result = await execute("preview", req.path, validateS08ImpactPreviewResult, req.init); if (result) { setPreview(result); setMessage("只读影响预览已更新；未创建或撤销任何服务账号与令牌。"); }
  };
  const publish = async () => {
    if (!draft || draft.status !== "validated" || !diff) return;
    const req = operation({ ...shared, kind: "publishDraft", draftId: draft.id, status: draft.status, input: { expectedVersion: draft.version, idempotencyKey: key("publish") } });
    const result = await execute("publish", req.path, validateS08Publication, req.init); if (result) { bindPublishedS08(result, draft.id, draft.version); setMessage("策略已发布；发布本身没有创建、轮换或撤销任何令牌。"); await load(); }
  };
  const rollback = async (target: S08HistoryEntry) => {
    if (!overview?.publication) return;
    const req = operation({ ...shared, kind: "createRollbackDraft", publicationId: target.publicationId, sourceStatus: target.status, input: { expectedPublishedVersion: overview.publication.cas ?? 0, changeReason: `回滚到发布版本 ${target.version}`, idempotencyKey: key("rollback") } });
    const result = await execute("rollback", req.path, validateS08Draft, req.init); if (result) { setDraft(bindRollbackS08Draft(result, target, overview.publication.cas ?? 0)); setForm(clone(result.value)); setReason(result.changeReason); setMessage("已创建回滚草稿；不会撤销令牌、停用账号或改写权限事实。"); }
  };
  const createToken = async () => {
    if (!selectedAccount || creatingRef.current) return;
    const name = tokenName.trim(); if (!name || name.length > 80) { setError("请输入 1–80 个字符的令牌名称。"); return; }
    const ttl = tokenTtl.trim() === "" ? undefined : Number(tokenTtl);
    if (ttl !== undefined && (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 365)) { setError("令牌 TTL 需为 1–365 天。"); return; }
    creatingRef.current = true;
    const idempotencyKey = createTokenIdempotencyRef.current ?? (createTokenIdempotencyRef.current = key("token-create"));
    setBusy("token-create"); setError(""); setMessage("");
    try {
      const req = operation({ ...shared, kind: "createToken", accountId: selectedAccount.id, input: { name, ...(ttl !== undefined ? { ttlDays: ttl } : {}), idempotencyKey } });
      const response = await writeRequest(req.path, req.init);
      if (!response.ok) {
        const safe = await readSafeApiError(response);
        // Definitive 4xx rejection ends the action (clear the key); a 5xx is
        // uncertain — the server may have committed — so keep the key for a
        // safe same-key retry.
        if (safe.status < 500) createTokenIdempotencyRef.current = null;
        if (safe.code === "TOKEN_LIMIT_REACHED") setError(`该服务账号已达到活跃令牌上限（${form.tokenLifecyclePolicy.maximumActiveTokensPerAccount} 个）。请先撤销不再使用的令牌，或由管理员调整令牌生命周期策略。`);
        else if (safe.code === "SERVICE_ACCOUNT_DISABLED") setError("该服务账号已停用，无法创建新令牌。请先启用账号或选择其他账号。");
        else if (safe.code === "IDEMPOTENCY_CONFLICT") setError("该幂等键与另一请求冲突，请刷新列表后重试。");
        else setError(genericApiErrorMessage(safe));
        return;
      }
      const result = validateApiResult(await response.json(), validateTokenCreateResult).data;
      createTokenIdempotencyRef.current = null;
      if (selectedAccountIdRef.current !== selectedAccount.id) return;
      if (result.replayed) {
        setMessage("令牌此前已经创建，但明文不可再次显示；如未保存，请执行显式轮换或撤销流程。");
      } else if (result.plaintextAvailable && result.plaintext) {
        setReveal({ kind: "create", plaintext: result.plaintext, name: result.name ?? "", expiresAt: result.expiresAt });
      }
      setTokenName(""); setTokenTtl("");
      const refreshed = await loadTokens(selectedAccount.id, { quiet: true });
      if (!refreshed && !result.replayed) setMessage("令牌已创建，但列表刷新失败。");
    } catch (e) {
      setError(e instanceof S08ApiRequestError ? genericApiErrorMessage({ status: e.status, code: e.code, retryAfter: e.retryAfter, message: e.message }) : "操作失败，请稍后重试。");
    } finally {
      setBusy(""); creatingRef.current = false;
    }
  };
  const rotateToken = async (token: TokenMetadata) => {
    if (!selectedAccount) return;
    const accountId = selectedAccount.id;
    const req = operation({ ...shared, kind: "rotateToken", accountId, tokenId: token.id, input: { idempotencyKey: key("token-rotate") } });
    const result = await execute("token-rotate", req.path, validateTokenRotateResult, req.init); if (!result) return;
    if (selectedAccountIdRef.current !== accountId) return;
    if (result.plaintextAvailable && result.plaintext) { setReveal({ kind: "rotate", plaintext: result.plaintext, name: result.id, expiresAt: result.expiresAt, overlapUntil: result.overlapUntil }); }
    await loadTokens(accountId);
  };
  const confirmRevoke = async () => {
    if (!selectedAccount || !revokeTarget) return;
    const accountId = selectedAccount.id;
    const req = operation({ ...shared, kind: "revokeToken", accountId, tokenId: revokeTarget.token.id, input: { reason: revokeTarget.reason, idempotencyKey: key("token-revoke") } });
    const result = await execute("token-revoke", req.path, validateTokenMetadata, req.init); if (!result) return;
    setRevokeTarget(null);
    if (selectedAccountIdRef.current !== accountId) return;
    setMessage("令牌已撤销；撤销不会恢复，也不会影响已发布策略。");
    await loadTokens(accountId);
  };
  const update = <K extends keyof ApiServiceAccountsValueV1>(family: K, patch: Partial<ApiServiceAccountsValueV1[K]>) => setForm(current => ({ ...current, [family]: { ...current[family], ...patch } }));
  const splitList = (raw: string) => raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  const unnamedTokenLabel = unnamedTokenLabels[locale];
  const tokenListReady = tokenList.accountId === selectedAccount?.id && tokenList.status === "ready";
  const activeTokenCount = tokenListReady ? tokenList.tokens.filter((entry) => entry.status === "active").length : null;
  const tokenCeiling = form.tokenLifecyclePolicy.maximumActiveTokensPerAccount;
  const accountDisabled = selectedAccount?.status === "disabled";
  const ceilingReached = tokenListReady && activeTokenCount !== null && activeTokenCount >= tokenCeiling;
  const createDisabled = busy !== "" || !serviceAccountsManage || accountDisabled || ceilingReached;
  if (loadState === "loading") return <section aria-busy="true" aria-label="API 与服务账号设置" className={styles.panel} role="status"><h2>正在载入 API 服务账号设置</h2><div className={styles.skeleton} /><div className={styles.skeleton} /></section>;
  if (loadState === "forbidden") return <section aria-label="API 与服务账号设置" className={styles.panel} role="alert"><h2>没有 API 服务账号设置读取权限</h2><p>请联系管理员确认 settings.read。</p></section>;
  if (loadState === "error") return <section aria-label="API 与服务账号设置" className={styles.panel} role="alert"><h2>API 服务账号设置暂时无法载入</h2><p>{error}</p><Button onClick={() => void load()}>重试</Button></section>;
  return <section aria-label="API 与服务账号设置" className={styles.panel}>
    <header className={styles.header}><div><h2>API 与服务账号设置</h2><p>统一管理令牌生命周期、机器范围、速率限制与审计调用策略。设置只存策略；服务账号与令牌业务动作显式且独立，明文令牌仅出现一次。当前生效值来自{overview?.projectionState === "compiled_default" ? "编译默认值" : "已发布版本"}。</p></div><span className={readiness?.state === "ready" ? styles.ready : styles.degraded}>{readiness ? labels[readiness.state] : "未知"}</span></header>
    {message ? <StatusMessage role="status"><StatusMessageTitle>状态更新</StatusMessageTitle><StatusMessageContent>{message}</StatusMessageContent></StatusMessage> : null}{error ? <StatusMessage role="alert" variant="error"><StatusMessageTitle>操作未完成</StatusMessageTitle><StatusMessageContent>{error}</StatusMessageContent></StatusMessage> : null}
    <div className={styles.summary}><div><span>描述符</span><strong>settings.api-service-account</strong></div><div><span>当前发布</span><strong>{overview?.publication ? `v${overview.publication.version}` : "默认值"}</strong></div><div><span>生效 generation</span><strong>{overview?.publishedGeneration ?? 0}</strong></div><div><span>开放草稿</span><strong>{draft ? `${labels[draft.status] ?? draft.status} · v${draft.version}` : "无"}</strong></div></div>
    <form className={styles.form} onSubmit={e => { e.preventDefault(); void save(); }}>
      <fieldset><legend>令牌生命周期策略</legend><label>默认 TTL（天）<input max="365" min="1" onChange={e => update("tokenLifecyclePolicy", { defaultTtlDays: Number(e.target.value) })} type="number" value={form.tokenLifecyclePolicy.defaultTtlDays} /><small>当前事实默认 90 天。</small></label><label>最大 TTL（天）<input max="365" min="1" onChange={e => update("tokenLifecyclePolicy", { maximumTtlDays: Number(e.target.value) })} type="number" value={form.tokenLifecyclePolicy.maximumTtlDays} /><small>硬上限 365 天。</small></label><label>轮换重叠（分钟）<input max="1440" min="0" onChange={e => update("tokenLifecyclePolicy", { rotationOverlapMinutes: Number(e.target.value) })} type="number" value={form.tokenLifecyclePolicy.rotationOverlapMinutes} /><small>未来义务；当前无定时任务，认证按需检查。</small></label><label>每账号最大活跃令牌<input max="100" min="1" onChange={e => update("tokenLifecyclePolicy", { maximumActiveTokensPerAccount: Number(e.target.value) })} type="number" value={form.tokenLifecyclePolicy.maximumActiveTokensPerAccount} /></label><label className={styles.check}><input checked={form.tokenLifecyclePolicy.requireExpiry} onChange={e => update("tokenLifecyclePolicy", { requireExpiry: e.target.checked })} type="checkbox" />要求令牌必须设置到期时间</label></fieldset>
      <fieldset><legend>机器范围策略</legend><label>允许角色键（逗号分隔，引用 P02）<input onChange={e => update("machineScopePolicy", { allowedRoleKeys: splitList(e.target.value) })} value={form.machineScopePolicy.allowedRoleKeys.join(", ")} /></label><label>允许权限族（逗号分隔，引用 P02）<input onChange={e => update("machineScopePolicy", { allowedPermissionFamilies: splitList(e.target.value) })} value={form.machineScopePolicy.allowedPermissionFamilies.join(", ")} /></label><label>环境<select onChange={e => update("machineScopePolicy", { environment: e.target.value as ApiServiceAccountsValueV1["machineScopePolicy"]["environment"] })} value={form.machineScopePolicy.environment}><option value="production">生产</option><option value="staging">预发布</option><option value="development">开发</option><option value="test">测试</option></select></label><label>经销商/位置范围<select onChange={e => update("machineScopePolicy", { dealerLocationScopeMode: e.target.value as ApiServiceAccountsValueV1["machineScopePolicy"]["dealerLocationScopeMode"] })} value={form.machineScopePolicy.dealerLocationScopeMode}><option value="global">全局</option><option value="dealer">经销商</option><option value="location">位置</option></select></label><label className={styles.check}><input checked={form.machineScopePolicy.denySensitivePermissionsByDefault} onChange={e => update("machineScopePolicy", { denySensitivePermissionsByDefault: e.target.checked })} type="checkbox" />默认拒绝敏感权限（Payment/Customer PII/全局管理）</label></fieldset>
      <fieldset><legend>速率限制策略</legend><label>每分钟请求数<input max="100000" min="1" onChange={e => update("rateLimitPolicy", { requestsPerMinute: Number(e.target.value) })} type="number" value={form.rateLimitPolicy.requestsPerMinute} /></label><label>突发上限（burst）<input max="10000" min="0" onChange={e => update("rateLimitPolicy", { burst: Number(e.target.value) })} type="number" value={form.rateLimitPolicy.burst} /></label><label>模式<select onChange={e => update("rateLimitPolicy", { mode: e.target.value as ApiServiceAccountsValueV1["rateLimitPolicy"]["mode"] })} value={form.rateLimitPolicy.mode}><option value="per-token">每令牌</option><option value="per-account">每账号</option></select></label><p>Retry-After 语义：seconds（固定，429 响应）</p></fieldset>
      <fieldset><legend>审计与调用策略</legend><label>调用保留天数<input max="7300" min="1" onChange={e => update("auditInvocationPolicy", { invocationRetentionDays: Number(e.target.value) })} type="number" value={form.auditInvocationPolicy.invocationRetentionDays} /><small>引用 P04 审计保留类别。</small></label><label>元数据脱敏<select onChange={e => update("auditInvocationPolicy", { metadataRedactionMode: e.target.value as ApiServiceAccountsValueV1["auditInvocationPolicy"]["metadataRedactionMode"] })} value={form.auditInvocationPolicy.metadataRedactionMode}><option value="standard">标准</option><option value="strict">严格</option></select></label><label className={styles.check}><input checked={form.auditInvocationPolicy.lastUsedTrackingEnabled} onChange={e => update("auditInvocationPolicy", { lastUsedTrackingEnabled: e.target.checked })} type="checkbox" />追踪最后使用时间（当前认证已更新 lastUsedAt）</label><label className={styles.check}><input checked={form.auditInvocationPolicy.failedAuthenticationAuditEnabled} onChange={e => update("auditInvocationPolicy", { failedAuthenticationAuditEnabled: e.target.checked })} type="checkbox" />记录失败认证审计（未来义务）</label></fieldset>
      <label className={styles.reason}>变更原因<textarea maxLength={500} onChange={e => setReason(e.target.value)} value={reason} /><small>8–500 字；写入安全审计元数据。</small></label>
      <div className={styles.actions}><Button disabled={busy !== "" || !capability.actions.createDraft} type="submit">{busy === "save" ? "保存中…" : draft ? "保存草稿" : "创建草稿"}</Button><Button disabled={!draft || busy !== "" || !capability.actions.validate} onClick={() => void validate()} type="button" variant="secondary">验证</Button><Button disabled={busy !== ""} onClick={() => void impact()} type="button" variant="secondary">只读影响预览</Button><Button disabled={!draft || draft.status !== "validated" || !diff || busy !== "" || !capability.actions.publish} onClick={() => void publish()} type="button">发布</Button></div>
    </form>
    <section className={styles.section}><h3>验证与安全差异</h3>{validation ? <ul>{validation.issues.map((x, i) => <li key={`${x.code}-${i}`}><strong>{x.code}</strong> · {x.severity} · {x.field}：{x.message}</li>)}</ul> : <p>尚未验证当前草稿。</p>}{diff ? <table><caption>公开字段安全差异</caption><thead><tr><th>字段</th><th>之前</th><th>之后</th></tr></thead><tbody>{diff.changes.map(x => <tr key={x.field}><th scope="row">{x.field}</th><td>{formatDiff(x.before)}</td><td>{formatDiff(x.after)}</td></tr>)}</tbody></table> : null}</section>
    <section className={styles.section}><h3>只读影响预览</h3><p>聚合结果，不包含任何令牌明文、服务账号密钥、角色指派或调用明细；预览绝不创建、轮换或撤销令牌。</p>{preview ? <dl className={styles.preview}><div><dt>候选可接受</dt><dd>{preview.candidateAccepted ? "是" : "否"}</dd></div><div><dt>令牌生命周期</dt><dd>TTL {preview.policyImpact.defaultTtlDays}–{preview.policyImpact.maximumTtlDays} 天 · 重叠 {preview.policyImpact.rotationOverlapMinutes} 分钟 · 每账号 {preview.policyImpact.maximumActiveTokensPerAccount} 个</dd></div><div><dt>机器范围</dt><dd>{labels[preview.policyImpact.environment] ?? preview.policyImpact.environment} · {labels[preview.policyImpact.dealerLocationScopeMode] ?? preview.policyImpact.dealerLocationScopeMode} · 角色 {preview.policyImpact.allowedRoleKeyCount} · 权限族 {preview.policyImpact.allowedPermissionFamilyCount} · 默认拒绝敏感 {preview.policyImpact.denySensitivePermissionsByDefault ? "是" : "否"}</dd></div><div><dt>速率限制</dt><dd>{preview.policyImpact.requestsPerMinute} req/min · burst {preview.policyImpact.burst} · {labels[preview.policyImpact.rateLimitMode] ?? preview.policyImpact.rateLimitMode}</dd></div><div><dt>审计与调用</dt><dd>保留 {preview.policyImpact.invocationRetentionDays} 天 · {labels[preview.policyImpact.metadataRedactionMode] ?? preview.policyImpact.metadataRedactionMode} 脱敏</dd></div><div><dt>聚合规模</dt><dd>{preview.policyImpact.serviceAccountCount} 个服务账号 · {preview.policyImpact.activeTokenCount} 个活跃令牌</dd></div></dl> : <p>运行预览后显示聚合策略变化。</p>}</section>
    <section className={styles.section}><h3>Service Account 列表与详情</h3><p>仅显示安全字段：标识、键、名称、状态、角色、环境与创建时间；不含任何凭据材料。</p>{accounts.length ? <table><caption>Service Account 安全视图</caption><thead><tr><th>名称</th><th>键</th><th>状态</th><th>角色</th><th>环境</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{accounts.map(a => <tr key={a.id} data-service-account-id={a.id} data-service-account-key={a.key}><th scope="row">{a.name}</th><td>{a.key}</td><td><span className={a.status === "active" ? styles.ready : styles.degraded}>{labels[a.status] ?? a.status}</span></td><td>{a.roles.length ? a.roles.join("、") : "无"}</td><td>{labels[a.environment] ?? a.environment}</td><td>{formatDate(a.createdAt)}</td><td><Button disabled={busy !== "" || !serviceAccountsManage} onClick={() => { setSelectedAccount(a); }} size="sm" variant="secondary">查看令牌</Button></td></tr>)}</tbody></table> : <p>暂无服务账号。</p>}</section>
    <section className={styles.section}><h3>Token 管理</h3><p>令牌元数据仅含 id、名称、状态、最后使用、到期、撤销与创建时间；明文令牌只在创建/轮换成功时显示一次，之后任何读取都不会返回明文。{selectedAccount ? <>当前账号：{selectedAccount.name}（{selectedAccount.key}）。</> : "请先选择服务账号。"}</p>
      {selectedAccount ? <>
        <p className={styles.hint}>账号状态：{labels[selectedAccount.status] ?? selectedAccount.status} · 活跃令牌 {activeTokenCount !== null ? `${activeTokenCount} / ${tokenCeiling}` : `— / ${tokenCeiling}`} · 默认 TTL {form.tokenLifecyclePolicy.defaultTtlDays} 天 · {form.tokenLifecyclePolicy.requireExpiry ? "要求到期" : "不要求到期"}{accountDisabled ? "。该账号已停用，无法创建新令牌。" : ceilingReached ? "。已达到活跃令牌上限，请先撤销不再使用的令牌。" : ""}</p>
        <div className={styles.createRow}><label>令牌名称<input maxLength={80} onChange={e => setTokenName(e.target.value)} placeholder="例如：目录同步令牌" value={tokenName} /></label><label>TTL 天数（留空用策略默认）<input max="365" min="1" onChange={e => setTokenTtl(e.target.value)} placeholder={`默认 ${form.tokenLifecyclePolicy.defaultTtlDays}`} type="number" value={tokenTtl} /></label><Button disabled={createDisabled} onClick={() => void createToken()} type="button" data-token-create="create">{busy === "token-create" ? "创建中…" : "创建令牌"}</Button></div>
      </> : null}
      {!serviceAccountsManage ? <p className={styles.hint}>当前操作员缺少 service_accounts.manage 能力，令牌创建、轮换与撤销已停用；仅策略生命周期可用。</p> : null}
      {selectedAccount ? (tokenList.accountId !== selectedAccount.id || tokenList.status === "loading" ? <p className={styles.hint} aria-busy="true" data-token-state="loading">正在加载该账号令牌…</p> : tokenList.status === "error" ? <p className={styles.hint} data-token-state="error">令牌列表加载失败。<Button disabled={busy !== ""} onClick={() => void loadTokens(selectedAccount.id)} size="sm" variant="secondary">重试</Button></p> : tokenList.tokens.length ? <table data-token-state="ready-non-empty"><caption>令牌元数据</caption><thead><tr><th>名称</th><th>状态</th><th>最后使用</th><th>到期</th><th>撤销时间</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{tokenList.tokens.map(t => <tr key={t.id}><th scope="row">{t.name ?? unnamedTokenLabel}</th><td><span className={t.status === "active" ? styles.ready : styles.degraded}>{labels[t.status] ?? t.status}</span></td><td>{formatDate(t.lastUsedAt)}</td><td>{formatDate(t.expiresAt)}</td><td>{formatDate(t.revokedAt)}</td><td>{formatDate(t.createdAt)}</td><td><Button disabled={busy !== "" || !serviceAccountsManage || t.status !== "active"} onClick={() => void rotateToken(t)} size="sm" variant="secondary">轮换</Button> <Button disabled={busy !== "" || !serviceAccountsManage || t.status === "revoked"} onClick={() => setRevokeTarget({ token: t, reason: "" })} size="sm" variant="secondary">撤销</Button></td></tr>)}</tbody></table> : <p className={styles.hint} data-token-state="ready-empty">该账号暂无令牌。</p>) : null}</section>
    <section className={styles.section}><h3>调用与审计安全视图</h3><p>仅显示安全字段：调用 id、服务账号（id/key/name）、工具键、状态、创建时间与白名单错误分类；绝不返回原始 input/output/error 或任何凭据。</p>{invocations.length ? <table><caption>调用安全读模型</caption><thead><tr><th>调用 id</th><th>服务账号</th><th>工具键</th><th>状态</th><th>创建时间</th><th>错误分类</th></tr></thead><tbody>{invocations.map(x => <tr key={x.id}><th scope="row">{x.id.slice(0, 8)}…</th><td>{x.serviceAccount.name}（{x.serviceAccount.key}）</td><td>{x.toolKey}</td><td>{labels[x.status] ?? x.status}</td><td>{formatDate(x.createdAt)}</td><td>{x.errorClass ?? "—"}</td></tr>)}</tbody></table> : <p>暂无调用记录。</p>}</section>
    <section className={styles.section}><h3>消费者就绪矩阵</h3><p>只有 implemented_ready 且 generation 精确匹配才计为完成；未来义务（如 ERP 商品 API 机器身份）如实显示。</p><table><thead><tr><th>消费者</th><th>状态</th><th>Generation</th><th>原因</th></tr></thead><tbody>{(readiness?.consumers ?? overview?.consumerMatrix ?? []).map(c => <tr key={c.id}><th scope="row">{consumerLabels[c.id] ?? c.id}</th><td><span className={c.state === "implemented_ready" ? styles.ready : styles.degraded}>{labels[c.state] ?? c.state}</span></td><td>{c.generation ?? "—"}</td><td>{c.reasonCode ?? "—"}</td></tr>)}</tbody></table></section>
    <section className={styles.section}><h3>发布历史与回滚</h3>{history.length ? <ul className={styles.history}>{history.map(item => <li key={item.publicationId}><div><strong>v{item.version} · {labels[item.status] ?? item.status}</strong><span>{formatDate(item.publishedAt)}</span><p>{item.changeReason}</p></div><Button disabled={busy !== "" || !capability.actions.rollback || !["published", "superseded"].includes(item.status)} onClick={() => void rollback(item)} size="sm" variant="secondary">创建回滚草稿</Button></li>)}</ul> : <p>尚无发布历史。首次发布后可从这里创建回滚草稿。</p>}</section>
    {reveal ? <div className={styles.modalRoot} ref={revealRootRef}><div aria-modal="true" className={styles.dialog} ref={revealRef} role="dialog"><h3>令牌明文（仅显示一次）</h3><p>{reveal.kind === "create" ? `令牌 ${reveal.name} 已创建` : `替换令牌 ${reveal.name} 已生成；前序令牌到期时间已收窄至 min(原到期时间, now + 轮换重叠)`}。此明文只在本次响应中出现一次，关闭后将无法再次查看；丢失明文需要显式重新创建或轮换（使用新的幂等键）。</p><dl className={styles.reveal}><div><dt>明文令牌</dt><dd><code>{reveal.plaintext}</code></dd></div><div><dt>到期时间</dt><dd>{formatDate(reveal.expiresAt)}</dd></div>{reveal.overlapUntil ? <div><dt>重叠截止</dt><dd>{formatDate(reveal.overlapUntil)}</dd></div> : null}</dl><p className={styles.hint}>不会持久化明文，也不会在列表或再次读取时返回。</p><div className={styles.actions}><Button onClick={() => setReveal(null)} type="button">我已保存，关闭</Button></div></div></div> : null}
    {revokeTarget ? <div className={styles.modalRoot} ref={revokeRootRef}><div aria-modal="true" className={styles.dialog} ref={revokeRef} role="dialog"><h3>确认撤销令牌</h3><p>撤销令牌 {revokeTarget.token.name} 后其立即失效且不可恢复；不会停用服务账号，也不会回滚已发布策略。</p><label className={styles.reason}>撤销原因<textarea maxLength={500} onChange={e => setRevokeTarget({ ...revokeTarget, reason: e.target.value })} value={revokeTarget.reason} /><small>8–500 字；写入审计。</small></label><div className={styles.actions}><Button disabled={busy !== "" || revokeTarget.reason.trim().length < 8} onClick={() => void confirmRevoke()} type="button">{busy === "token-revoke" ? "撤销中…" : "确认撤销"}</Button><Button disabled={busy !== ""} onClick={() => setRevokeTarget(null)} type="button" variant="secondary">取消</Button></div></div></div> : null}
  </section>;
}
