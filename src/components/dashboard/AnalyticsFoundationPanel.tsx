"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type DashboardAuthorization } from "@/lib/api/api-contract";
import { DASHBOARD_ANALYTICS_INGESTION_STATE, DASHBOARD_F1_PHASE_B_ROUTES } from "@/lib/dashboard/f1-phase-b-contract";
import { p10Href, validateReleaseFamilies, type AnalyticsReleaseFamily, type P10Location, type P10View } from "@/lib/dashboard/p10-analytics";
import styles from "./MediaFoundationPanel.module.css";

type Props = { actorKey: string; authorization: DashboardAuthorization; location: Extract<P10Location, { kind: "valid" }>; apiRequest: (path: string, init?: RequestInit) => Promise<Response>; onUnauthorized: () => void };
function hasPermission(authorization: DashboardAuthorization, permission: string) { return authorization.modules.flatMap((module) => module.actions).some((action) => action.permissionKey === permission && action.decision === "allow"); }
function defaultReleaseDay() { const date = new Date(); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10); }
function cellLabel(key: string) { return ({ complement: "非互动主体", denominator: "合格主体", engage: "互动主体", numerator: "互动分子", rate: "互动率", view: "浏览主体" } as Record<string, string>)[key] ?? key; }
function familyStatus(family: AnalyticsReleaseFamily) { return family.status === "published" ? "已发布" : family.status === "suppressed" ? "受隐私阈值抑制" : "无贡献"; }
function completeness(family: AnalyticsReleaseFamily) { return family.completeness === "late_excluded" ? "已密封，迟到事件不计入" : family.completeness === "incomplete" ? "尚未完整" : "已密封"; }

export function AnalyticsFoundationPanel({ actorKey, authorization, location, apiRequest, onUnauthorized }: Props) {
  const canReadRelease = useMemo(() => hasPermission(authorization, "analytics.release.read"), [authorization]);
  const [families, setFamilies] = useState<AnalyticsReleaseFamily[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const sequence = useRef(0), actorRef = useRef(actorKey), controller = useRef<AbortController | null>(null);
  actorRef.current = actorKey;
  const load = useCallback(async () => {
    const current = ++sequence.current, actor = actorKey, abortController = new AbortController();
    controller.current?.abort(); controller.current = abortController; setMessage(""); setFamilies([]);
    if (location.view !== "release") { setStatus("ready"); return; }
    if (!canReadRelease || !location.releaseDay) { setStatus("error"); setMessage("当前操作员没有读取密封Analytics发布的权限。"); return; }
    setStatus("loading");
    try {
      const response = await apiRequest(`${DASHBOARD_F1_PHASE_B_ROUTES.analyticsReleasePrefix}${encodeURIComponent(location.releaseDay)}`, { signal: abortController.signal });
      if (response.status === 401) onUnauthorized();
      if (!response.ok) throw new Error("密封Analytics发布不可用。");
      const value = validateReleaseFamilies(await response.json(), location.releaseDay);
      if (abortController.signal.aborted || current !== sequence.current || actorRef.current !== actor) return;
      setFamilies(value); setStatus(value.length === 0 ? "empty" : "ready"); setMessage(value.length === 0 ? "读取成功，当前发布family为空。" : "密封Analytics发布已刷新。");
    } catch (error) { if (!abortController.signal.aborted && current === sequence.current && actorRef.current === actor) { setStatus("error"); setMessage(error instanceof Error ? error.message : "密封Analytics发布不可用。"); } }
  }, [actorKey, apiRequest, canReadRelease, location.releaseDay, location.view, onUnauthorized]);
  useEffect(() => { void load(); return () => { sequence.current += 1; controller.current?.abort(); }; }, [load]);
  const navigate = (view: P10View, releaseDay?: string) => { history.pushState(history.state, "", p10Href(window.location.pathname, view, releaseDay)); dispatchEvent(new PopStateEvent("popstate")); };
  return <section aria-label="密封Analytics发布" className={styles.panel}>
    <header className={styles.header}><div><h2>Analytics 密封发布</h2><p>仅显示服务器密封、隐私保护后的聚合结果；不提供原始事件、主体标识或请求时即时指标。</p></div><span>Ingestion：{DASHBOARD_ANALYTICS_INGESTION_STATE === "disabled" ? "disabled" : "owned conformance"}</span></header>
    <nav aria-label="Analytics Foundation视图" className={styles.toolbar}><button aria-pressed={location.view === "overview"} onClick={() => navigate("overview")} type="button">说明</button><button aria-pressed={location.view === "release"} disabled={!canReadRelease} onClick={() => navigate("release", location.releaseDay ?? defaultReleaseDay())} type="button">密封发布</button><button aria-pressed={location.view === "readiness"} onClick={() => navigate("readiness")} type="button">边界状态</button>{location.view === "release" ? <button onClick={() => void load()} type="button">刷新</button> : null}</nav>
    <p aria-live="polite" role="status">{status === "loading" ? "正在读取密封Analytics发布" : status === "error" ? "密封Analytics发布读取失败" : message}</p>
    {location.view === "overview" ? <section className={styles.preview}><h3>安全消费边界</h3><p>原始事件浏览和请求时即时Metric已经移除。这里只消费经过验证的发布family集合。</p><p>低于隐私阈值的数值保持为受抑制的空值，不会转换为零。Ingestion 当前明确禁用。</p></section> : null}
    {location.view === "readiness" ? <section className={styles.preview}><h3>发布边界已启用，Ingestion 已禁用</h3><p>密封发布按UTC日期读取。没有发布权限时不会发出Analytics请求。</p><p>GA4、PostHog、Search Console与原始事件导出均不在此界面开放。</p></section> : null}
    {location.view === "release" && status === "empty" ? <section className={styles.preview}><h3>UTC {location.releaseDay}</h3><p>读取成功；当前没有发布family。这不是服务降级。</p></section> : null}
    {location.view === "release" && families.map((family) => <article className={styles.preview} key={family.releaseId}><h3>UTC {family.releaseDay} · {family.metricDefinitionVersion}</h3><p>状态：{familyStatus(family)}；完整性：{completeness(family)}</p><p>身份epoch：{family.identityEpoch}；抑制策略：{family.suppressionPolicyVersion}；字段档案：{family.fieldVisibilityProfile}</p><dl>{family.cells.map((cell) => <div key={cell.cellKey}><dt>{cellLabel(cell.cellKey)}</dt><dd>{cell.state === "suppressed" ? "受隐私保护" : cell.state === "empty" ? "无贡献" : String(cell.publishedValue)}</dd></div>)}</dl></article>)}
    <a href="/dashboard/audit?resourceType=analytics_release">查看安全Audit</a>
  </section>;
}
