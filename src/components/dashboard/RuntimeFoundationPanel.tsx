"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardAuthorization } from "@/lib/api/api-contract";
import {
  P09_CONFIG_ROUTE,
  P09_FLAGS_ROUTE,
  p09Href,
  p09ScopeQuery,
  validateConfigList,
  validateFlagList,
  validateReadiness,
  type P09ConfigListRow,
  type P09FlagListRow,
  type P09Location,
  type P09Readiness,
  type P09Scope,
  type P09View
} from "@/lib/dashboard/p09-runtime";
import styles from "./MediaFoundationPanel.module.css";

type Props = {
  actorKey: string;
  authorization: DashboardAuthorization;
  location: Extract<P09Location, { kind: "valid" }>;
  apiRequest: (path: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => void;
};

type CollectionState = "loading" | "ready" | "empty" | "degraded";
const labels: Record<string, string> = {
  "foundation.runtime.refresh_interval_seconds": "刷新间隔（秒）",
  "foundation.runtime.display_mode": "显示模式",
  "foundation.runtime.safe_origin": "安全来源",
  "foundation.runtime.sample_flag": "基础功能开关"
};

function actionMap(authorization: DashboardAuthorization) {
  const actions = authorization.modules.flatMap((module) => module.actions);
  const allowed = (key: string) => actions.some((action) => action.permissionKey === key && action.decision === "allow");
  return {
    configRead: allowed("config.read"),
    flagsRead: allowed("flags.read"),
    readinessSummary: allowed("readiness.read_summary"),
    readinessDetail: allowed("readiness.read_detail")
  };
}

function scopeFrom(authorization: DashboardAuthorization, permission: string): P09Scope | undefined {
  const action = authorization.modules.flatMap((module) => module.actions).find((entry) => entry.permissionKey === permission && entry.decision === "allow");
  if (!action) return undefined;
  if (action.scope.kind === "global") return { kind: "global", dealerIds: [], locationIds: [] };
  if (action.scope.kind === "dealer" || action.scope.kind === "location") return { kind: action.scope.kind, dealerIds: action.scope.dealerIds, locationIds: action.scope.locationIds };
  return undefined;
}

export function RuntimeFoundationPanel({ actorKey, authorization, location, apiRequest, onUnauthorized }: Props) {
  const gates = useMemo(() => actionMap(authorization), [authorization]);
  const [configs, setConfigs] = useState<P09ConfigListRow[]>([]);
  const [flags, setFlags] = useState<P09FlagListRow[]>([]);
  const [readiness, setReadiness] = useState<P09Readiness>();
  const [state, setState] = useState<CollectionState>("loading");
  const [message, setMessage] = useState("");
  const actorRef = useRef(actorKey);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  actorRef.current = actorKey;

  const readinessDetail = location.view === "readiness" && gates.readinessDetail;
  const permission = location.view === "config" ? "config.read" : location.view === "flags" ? "flags.read" : readinessDetail ? "readiness.read_detail" : "readiness.read_summary";
  const scope = useMemo(() => scopeFrom(authorization, permission), [authorization, permission]);

  const load = useCallback(async () => {
    const current = ++generation.current;
    const actor = actorKey;
    const abortController = new AbortController();
    controller.current?.abort();
    controller.current = abortController;
    setState("loading");
    setMessage("");
    try {
      if (!scope) throw new Error("当前操作员没有此视图的读取权限。");
      const query = p09ScopeQuery(scope);
      const path = location.view === "config"
        ? P09_CONFIG_ROUTE
        : location.view === "flags"
          ? P09_FLAGS_ROUTE
          : `/dashboard/runtime/readiness/${readinessDetail ? "detail" : "summary"}?${query}`;
      const response = await apiRequest(path, { signal: abortController.signal });
      if (response.status === 401) onUnauthorized();
      if (!response.ok) throw new Error("服务器未提供此运行时视图。");
      const wire: unknown = await response.json();
      if (abortController.signal.aborted || current !== generation.current || actorRef.current !== actor) return;
      if (location.view === "config") {
        const rows = validateConfigList(wire);
        setConfigs(rows);
        setState(rows.length === 0 ? "empty" : "ready");
      } else if (location.view === "flags") {
        const rows = validateFlagList(wire);
        setFlags(rows);
        setState(rows.length === 0 ? "empty" : "ready");
      } else {
        setReadiness(validateReadiness(wire, readinessDetail));
        setState("ready");
      }
    } catch (error) {
      if (!abortController.signal.aborted && current === generation.current && actorRef.current === actor) {
        setState("degraded");
        setMessage(error instanceof Error ? error.message : "运行时视图不可用。");
      }
    }
  }, [actorKey, apiRequest, location.view, onUnauthorized, readinessDetail, scope]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
      controller.current?.abort();
    };
  }, [load]);

  const navigate = (view: P09View, key?: string) => {
    window.history.pushState(window.history.state, "", p09Href(window.location.pathname, view, key));
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const selectedConfig = location.view === "config" && location.key ? configs.find((row) => row.configKey === location.key) : undefined;
  const selectedFlag = location.view === "flags" && location.key ? flags.find((row) => row.flagKey === location.key) : undefined;

  return <section className={styles.panel} aria-label="运行时配置、功能开关与就绪状态">
    <header className={styles.header}><div><h2>运行时配置 / 功能开关 / 就绪状态</h2><p>真实密钥、环境变量和生产发布不可在此编辑；功能开关不授予权限。</p></div><span>Phase B safe projection</span></header>
    <nav className={styles.toolbar} aria-label="运行时基础设施视图">
      <button type="button" aria-pressed={location.view === "config"} disabled={!gates.configRead} onClick={() => navigate("config")}>配置</button>
      <button type="button" aria-pressed={location.view === "flags"} disabled={!gates.flagsRead} onClick={() => navigate("flags")}>功能开关</button>
      <button type="button" aria-pressed={location.view === "readiness"} disabled={!gates.readinessSummary && !gates.readinessDetail} onClick={() => navigate("readiness")}>就绪状态</button>
      <button type="button" onClick={() => void load()}>刷新</button>
    </nav>
    {message ? <p role="alert" className={styles.status}>{message}</p> : null}
    <p role="status" aria-live="polite">{state === "loading" ? "正在读取运行时基础设施" : state === "degraded" ? "运行时基础设施已降级，未把失败当作空集合" : state === "empty" ? "读取成功，当前集合为空" : "运行时基础设施已刷新"}</p>

    {location.view === "config" && !location.key && state !== "degraded" ? <div className={styles.grid}>{configs.map((row) => <article className={styles.card} key={row.configKey}><h3>{labels[row.configKey] ?? row.configKey}</h3><p>安全有效值：{String(row.safeValue)}</p><p>Schema：{row.schemaVersion}；有效版本：{row.activeVersion}</p><button type="button" onClick={() => navigate("config", row.configKey)}>查看详情</button></article>)}</div> : null}
    {location.view === "config" && location.key && selectedConfig ? <section className={styles.preview}><h3>{labels[selectedConfig.configKey] ?? selectedConfig.configKey}</h3><p>安全有效值：{String(selectedConfig.safeValue)}</p><p>Schema：{selectedConfig.schemaVersion}；有效版本：{selectedConfig.activeVersion}</p><p>更新时间：{new Date(selectedConfig.updatedAt).toLocaleString("zh-CN")}</p><p>详情由已验证的列表快照本地选择，不发出第二个详情请求。</p></section> : null}
    {location.view === "config" && location.key && state === "ready" && !selectedConfig ? <p role="alert">列表快照中没有此配置；未回退到旧详情接口。</p> : null}

    {location.view === "flags" && !location.key && state !== "degraded" ? <div className={styles.grid}>{flags.map((row) => <article className={styles.card} key={row.flagKey}><h3>{labels[row.flagKey] ?? row.flagKey}</h3><p>有效状态：{row.activeState}</p><p>Schema：{row.schemaVersion}；版本：{row.version}；功能开关不会授予后端权限。</p><button type="button" onClick={() => navigate("flags", row.flagKey)}>查看详情</button></article>)}</div> : null}
    {location.view === "flags" && location.key && selectedFlag ? <section className={styles.preview}><h3>{labels[selectedFlag.flagKey] ?? selectedFlag.flagKey}</h3><p>有效状态：{selectedFlag.activeState}；版本：{selectedFlag.version}</p><p>Schema：{selectedFlag.schemaVersion}；更新时间：{new Date(selectedFlag.updatedAt).toLocaleString("zh-CN")}</p><p>详情由已验证的列表快照本地选择；功能开关不授予后端权限。</p></section> : null}
    {location.view === "flags" && location.key && state === "ready" && !selectedFlag ? <p role="alert">列表快照中没有此功能开关；未回退到旧详情接口。</p> : null}

    {location.view === "readiness" && readiness ? <section className={styles.preview}><h3>服务状态：{readiness.readinessState}</h3><p>主原因：{readiness.reasonCode}；观测：{new Date(readiness.observedAt).toLocaleString("zh-CN")}</p><dl><div><dt>活跃实例</dt><dd>{readiness.activeCount}</dd></div><div><dt>过期实例</dt><dd>{readiness.staleCount}</dd></div><div><dt>可用容量</dt><dd>{readiness.totalCapacity}</dd></div></dl>{readiness.detail ? <><h4>次要原因</h4>{readiness.secondaryReasons?.length ? <ul>{readiness.secondaryReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>没有次要原因。</p>}</> : <p>当前仅有摘要权限；详细原因未读取。</p>}<p>liveness 仅表示进程存活；readiness、依赖健康和产品能力分别判断。检查不会发送邮件、支付、ERP 或存储写入。</p></section> : null}
  </section>;
}
