"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DASHBOARD_FOUNDATION_MODULE_STATE, type DashboardFoundation } from "@/lib/api/api-contract";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { assetPath } from "@/lib/assets";
import { adjudicateFoundationRoute, foundationModuleToLegacyTab, navVisibleModule, resolveFoundationLocation, type DashboardFoundationState, type DashboardRouteModuleLike } from "@/lib/dashboard/f0-shell";
import { hasModuleWriteCapability } from "@/lib/dashboard/edit-gates";
import { authorizationRequestIdentity, dashboardAuthorizationScopeLabel, resolveDashboardAuthorizationLocation } from "@/lib/dashboard/p02-authorization";
import { parseDashboardP03Location } from "@/lib/dashboard/p03-query";
import { parseDashboardAuditLocation } from "@/lib/dashboard/p04-audit";
import { parseDashboardJobsLocation } from "@/lib/dashboard/p05-jobs";
import { parseP06Location } from "@/lib/dashboard/p06-work-queue";
import { parseDashboardMediaLocation } from "@/lib/dashboard/p07-media";
import { parseDataJobsLocation } from "@/lib/dashboard/p08-data-jobs";
import { parseP09Location } from "@/lib/dashboard/p09-runtime";
import { parseP10Location } from "@/lib/dashboard/p10-analytics";
import { parseSettingsCenterLocation } from "@/lib/dashboard/s01-settings";
import { parseS02Location } from "@/lib/dashboard/s02-settings";
import { parseS03Location } from "@/lib/dashboard/s03-settings";
import { parseS08Location } from "@/lib/dashboard/s08-settings";
import { parseS09Location } from "@/lib/dashboard/s09-settings";
import { parseS10Location } from "@/lib/dashboard/s10-settings";
import type { TabKey } from "@/lib/dashboard/types";
import type { SiteLocale } from "@/lib/i18n/locale";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { dashboardLogout } from "@/lib/dashboard/auth-session";
import { browserSessionNoticeStorage, clearSessionNotice, readSessionNotice, sessionNoticeAction, SESSION_NOTICE_TTL_MS, type SessionNoticeStorage } from "@/lib/dashboard/session-notice";
import { dispatchDashboardSessionChanged } from "@/lib/dashboard/session-event";
import { shellBreadcrumbModel, type ShellNavEntry } from "@/lib/dashboard/shell-navigation";
import { useDashboardFoundation } from "./DashboardFoundationContext";
import { DashboardF0ReadOnlyContent } from "./DashboardF0ReadOnlyContent";
import { DashboardLoginPage } from "./DashboardLogin";
import { DashboardShell } from "./DashboardShell";
import { MobileNavigationDrawer, type DrawerCloseReason } from "./MobileNavigationDrawer";
import { ShellBreadcrumb } from "./ShellBreadcrumb";
import { ShellNavigation } from "./ShellNavigation";
import { ShellStatusBar } from "./ShellStatusBar";
import { ShellUserMenu } from "./ShellUserMenu";
import styles from "./DashboardF0Shell.module.css";

type Module = DashboardFoundation["modules"][number];

function ComingSoonContent({ label }: { label: string }) {
  return <section aria-labelledby="coming-soon-title" className={styles.contentState}><h2 id="coming-soon-title">即将推出</h2><p>{label} 模块即将推出，尚未开放。此页面不会加载任何业务数据。</p></section>;
}

function FoundationState({ status, retry }: { status: string; retry: () => void }) {
  const states: Record<string, { title: string; body: string; alert?: boolean; retry?: boolean }> = {
    idle: { title: "正在检查管理后台", body: "正在准备安全会话。" }, loading: { title: "正在载入管理后台", body: "正在验证您的会话与只读权限。" },
    anonymous: { title: "需要登录", body: "管理后台会话已失效，正在恢复原有登录入口。" }, forbidden: { title: "没有访问权限", body: "服务器未向当前账户开放新版管理后台。", alert: true },
    unavailable: { title: "管理后台暂时不可用", body: "无法连接权限服务。请检查网络后重试。", alert: true, retry: true }, invalid: { title: "无法安全载入管理后台", body: "服务器响应未通过安全验证。请重试或联系管理员。", alert: true, retry: true },
    error: { title: "无法载入管理后台", body: "发生未知错误。请重试。", alert: true, retry: true }
  };
  const state = states[status] ?? states.error;
  return <main aria-busy={status === "idle" || status === "loading"} className={styles.state} id="main-content" tabIndex={-1}><div aria-live="polite" role={state.alert ? "alert" : "status"}><h1>{state.title}</h1><p>{state.body}</p></div>{state.retry ? <button className={styles.retry} onClick={retry} type="button">重试</button> : null}</main>;
}

export function DashboardF0Shell({ locale, section }: { locale: SiteLocale; section: TabKey }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Single unified dashboard navigation source. navigateTo is the ONLY entry
  // point for dashboard-internal navigation (desktop nav, mobile drawer,
  // Overview quick entries, breadcrumb root); it updates the live-location
  // state synchronously (URL + active nav + breadcrumb + H1 + panel all
  // derive from it) and then pushes through Next's router for the history
  // entry. Back/Forward arrive via popstate, and Next's own router-driven
  // URL changes (if any) are picked up by the pathname/search effect below —
  // so one click always syncs every surface without pushState monkeypatching,
  // URL polling or a fixed-delay router.refresh.
  const [liveLocation, setLiveLocation] = useState(() => ({
    pathname,
    search: searchParams.toString()
  }));
  useEffect(() => {
    const next = { pathname, search: searchParams.toString() };
    if (next.pathname !== liveLocation.pathname || next.search !== liveLocation.search) {
      setLiveLocation(next);
    }
  }, [pathname, searchParams, liveLocation]);
  useEffect(() => {
    const syncFromHistory = () => {
      setLiveLocation({ pathname: window.location.pathname, search: window.location.search.replace(/^\?/, "") });
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  const navigateTo = useCallback((href: string) => {
    if (typeof window === "undefined") return;
    const target = new URL(href, window.location.href);
    const normalize = (value: string) => value.replace(/\/+$/, "") || "/";
    // Rapid repeated clicks on the same target are no-ops: the live URL and
    // the target already agree, so no second history entry and no re-render.
    if (normalize(`${window.location.pathname}${window.location.search}`) === normalize(`${target.pathname}${target.search}`)) return;
    setLiveLocation({ pathname: target.pathname, search: target.search.replace(/^\?/, "") });
    void router.push(href);
    // Drawer navigation: the drawer-close focus restore (rAF in
    // useModalFocus) can race the Next router transition, which replaces the
    // page tree and detaches the focused element. When the click originated
    // inside the drawer dialog, retry focus on main-content (bounded, stops
    // as soon as it sticks) so the drawer's navigation focus contract holds
    // without any URL polling or fixed refresh.
    const fromDrawer =
      document.activeElement instanceof HTMLElement && document.activeElement.closest('[role="dialog"]') !== null;
    if (fromDrawer) {
      let attempts = 0;
      const restore = () => {
        if (document.activeElement?.id === "main-content") return;
        if (attempts >= 10) return;
        attempts += 1;
        mainRef.current?.focus();
        window.setTimeout(restore, 100);
      };
      restore();
    }
  }, [router]);
  const foundationState = useDashboardFoundation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);
  // Transition capture lives in an effect (never during render): under React
  // StrictMode the render function runs twice, and a render-phase ref write
  // would erase the ready → anonymous transition between the two passes and
  // lose the expired login notice. The effect commits the previous-status
  // ref after the decision and delegates to the session-notice lifecycle,
  // which persists a non-sensitive, tab-scoped, short-TTL marker so the
  // notice survives shell remounts, route remounts and full reloads until
  // re-auth, explicit logout, TTL expiry or malformed data clears it.
  const previousStatusRef = useRef<DashboardFoundationState["status"] | null>(null);
  const loggingOutRef = useRef(false);
  const sessionNoticeStorageRef = useRef<SessionNoticeStorage>(null);
  const noticeDeadlineRef = useRef<number | null>(null);
  useEffect(() => {
    const action = sessionNoticeAction({
      previousStatus: previousStatusRef.current,
      currentStatus: foundationState.status,
      loggingOut: loggingOutRef.current,
      now: Date.now(),
      storage: sessionNoticeStorageRef.current ?? (sessionNoticeStorageRef.current = browserSessionNoticeStorage())
    });
    previousStatusRef.current = foundationState.status;
    if (action === "show") {
      const notice = readSessionNotice(Date.now(), sessionNoticeStorageRef.current);
      noticeDeadlineRef.current = notice ? notice.createdAt + SESSION_NOTICE_TTL_MS : null;
      setExpiredNotice(true);
    } else if (action === "hide") {
      noticeDeadlineRef.current = null;
      setExpiredNotice(false);
    }
    if (foundationState.status === "ready") loggingOutRef.current = false;
  }, [foundationState.status]);
  // TTL enforcement while the expired login is on screen: once the persisted
  // notice's short TTL lapses (or a malformed record was cleared), the notice
  // stops showing even without a further status change.
  useEffect(() => {
    if (!expiredNotice || foundationState.status !== "anonymous") return;
    const deadline = noticeDeadlineRef.current;
    if (deadline === null) return;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      setExpiredNotice(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (readSessionNotice(Date.now(), sessionNoticeStorageRef.current) === null) setExpiredNotice(false);
    }, remaining + 25);
    return () => window.clearTimeout(timer);
  }, [expiredNotice, foundationState.status]);
  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    loggingOutRef.current = true;
    // Explicit logout: any persisted expiry notice is cleared immediately so
    // no remount or reload can ever surface it after a deliberate sign-out.
    clearSessionNotice(sessionNoticeStorageRef.current);
    // Existing /auth/logout API; local state clears regardless of the
    // network result. The boundary's anonymous invalidation fences pending
    // foundation/authorization generations and aborts in-flight requests.
    await dashboardLogout(DASHBOARD_API_BASE_URL);
    dispatchDashboardSessionChanged("anonymous");
  }, [loggingOut]);
  const drawerRef = useRef<HTMLElement>(null);
  const modalRootRef = useRef<HTMLDivElement>(null);
  const closeReasonRef = useRef<DrawerCloseReason>("close-button");
  const activeDesktopLinkRef = useRef<HTMLAnchorElement | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeDrawer = useCallback((reason: DrawerCloseReason) => { closeReasonRef.current = reason; setDrawerOpen(false); }, []);
  const restoreDrawerFocus = useCallback((trigger: HTMLElement | null) => {
    if (closeReasonRef.current === "breakpoint") return activeDesktopLinkRef.current ?? mainRef.current;
    if (closeReasonRef.current === "navigation") return mainRef.current;
    // Escape restores the drawer trigger deterministically — the focus
    // captured at modal-open can drift (e.g. after login) and is not a
    // reliable return target.
    if (closeReasonRef.current === "escape") return drawerTriggerRef.current ?? trigger;
    return trigger;
  }, []);
  useModalFocus({ active: drawerOpen, containerRef: drawerRef, modalRootRef, onEscape: () => closeDrawer("escape"), resolveReturnFocus: restoreDrawerFocus });
  // Dashboard module routes render the shell inside each page, so a
  // client-side navigation between different page modules unmounts the old
  // shell and mounts a fresh one; the focus the drawer-close restore placed
  // on the previous main-content is dropped with the old tree. Re-establish
  // the navigation focus contract after the transition commits by focusing
  // the mounted main-content on the next frame, so drawer navigation,
  // desktop nav, quick entries and back/forward all deterministically land
  // on main content (the bounded retry in navigateTo covers the same-shell
  // case where the shell survives the transition).
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const main = mainRef.current;
      if (main && document.activeElement !== main) main.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => { if (!drawerOpen) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [drawerOpen]);
  useEffect(() => { const media = window.matchMedia("(min-width: 761px)"); const closeAtDesktop = (event: MediaQueryListEvent | MediaQueryList) => { if (event.matches) closeDrawer("breakpoint"); }; closeAtDesktop(media); media.addEventListener("change", closeAtDesktop); return () => media.removeEventListener("change", closeAtDesktop); }, [closeDrawer]);

  // V11-R1 P0: Next Link navigation commits history.pushState before React's
  // location store re-renders, leaving the panel on the previous module until
  // a second click. The unified navigateTo + popstate + pathname effects
  // above replace the old pushState monkeypatch, 250ms URL poll and fixed
  // 250ms router.refresh — one click always switches URL + active nav +
  // breadcrumb + H1 + panel together (proved by the P0 browser acceptance).
  const currentPathname = liveLocation.pathname;

  const currentSearch = liveLocation.search;
  // Earliest adjudication: known coming-soon routes are decided here, from
  // the live projection when available and the shared mechanical registry
  // otherwise — before any legacy fallback, special parser, canonicalization,
  // content render, panel mount or business transport. Coming-soon always
  // wins over permission allow/deny, and the unified coming-soon page is
  // returned even when the shell is disabled, the actor is not allowed, or
  // the session is anonymous.
  const localePrefix = locale === "fr-CA" ? "/fr" : "";
  const legacyPriceInventoryTarget =
    currentPathname === "/dashboard/pricing" || currentPathname === "/dashboard/pricing/"
      ? `${localePrefix}/dashboard/products?view=pricing`
      : currentPathname === "/dashboard/inventory" || currentPathname === "/dashboard/inventory/" || currentPathname === "/dashboard/inventorySnapshots" || currentPathname === "/dashboard/inventory-snapshots"
        ? `${localePrefix}/dashboard/products?view=inventory`
        : null;
  useEffect(() => {
    if (legacyPriceInventoryTarget && typeof window !== "undefined") {
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== legacyPriceInventoryTarget) {
        window.location.replace(legacyPriceInventoryTarget);
      }
    }
  }, [legacyPriceInventoryTarget]);
  const routeModules: readonly DashboardRouteModuleLike[] = foundationState.foundation?.modules ?? DASHBOARD_FOUNDATION_MODULE_STATE;
  const adjudication = adjudicateFoundationRoute(currentPathname, currentSearch, routeModules);
  const comingSoonModule = adjudication.kind === "coming_soon" ? adjudication.module : null;
  const p03Location = parseDashboardP03Location(currentPathname, currentSearch);
  const auditLocation = parseDashboardAuditLocation(currentPathname, currentSearch);
  const jobsLocation = parseDashboardJobsLocation(currentPathname, currentSearch);
  const p06Location = parseP06Location(currentPathname, currentSearch);
  const mediaLocation = parseDashboardMediaLocation(currentPathname, currentSearch, foundationState.status === "ready" && foundationState.authorization?.mediaFoundationV1.sensitiveProfile.enabled === true);
  const dataJobsLocation = parseDataJobsLocation(currentPathname, currentSearch);
  const runtimeLocation = parseP09Location(currentPathname, currentSearch);
  const analyticsLocation = parseP10Location(currentPathname, currentSearch);
  const settingsLocation = parseSettingsCenterLocation(currentPathname, currentSearch);
  const s02Location = parseS02Location(currentPathname);
  const s03Location = parseS03Location(currentPathname);
  const s08Location = parseS08Location(currentPathname);
  const s09Location = parseS09Location(currentPathname);
  const s10Location = parseS10Location(currentPathname);
  const normalizedPathname = currentPathname.replace(/\/+$/, "") || "/";
  const legacyCrmSearchUnsupported = (normalizedPathname === "/dashboard/customers" || normalizedPathname === "/fr/dashboard/customers") && new URLSearchParams(currentSearch).has("q");
  const location = foundationState.status === "ready" && foundationState.foundation
    ? resolveFoundationLocation(currentPathname, settingsLocation.kind === "valid" ? new URL(settingsLocation.canonicalHref, "https://dashboard.invalid").search : analyticsLocation.kind === "valid" ? new URL(analyticsLocation.canonicalHref, "https://dashboard.invalid").search : runtimeLocation.kind === "valid" ? new URL(runtimeLocation.canonicalHref, "https://dashboard.invalid").search : dataJobsLocation.kind === "valid" ? new URL(dataJobsLocation.canonicalHref, "https://dashboard.invalid").search : mediaLocation.kind === "valid" ? new URL(mediaLocation.canonicalHref, "https://dashboard.invalid").search : p06Location.kind === "work-queue" || p06Location.kind === "notifications" ? new URL(p06Location.canonicalHref, "https://dashboard.invalid").search : jobsLocation.kind === "valid" ? new URL(jobsLocation.canonicalHref, "https://dashboard.invalid").search : auditLocation.kind === "valid" ? new URL(auditLocation.canonicalHref, "https://dashboard.invalid").search : p03Location.kind === "valid" ? new URL(p03Location.canonicalHref, "https://dashboard.invalid").search : currentSearch, foundationState.foundation)
    : null;
  const authorizationLocation = foundationState.status === "ready" && foundationState.foundation
    ? resolveDashboardAuthorizationLocation(currentPathname, foundationState.foundation)
    : { kind: "unknown" as const };
  const mediaRoute = mediaLocation.kind !== "not-media";
  const dataJobsRoute = dataJobsLocation.kind !== "not-data-jobs";
  const runtimeRoute = runtimeLocation.kind !== "not-runtime";
  const analyticsRoute = analyticsLocation.kind !== "not-analytics";
  const settingsRoute = settingsLocation.kind !== "not-settings";
  const s02Route = s02Location.kind !== "not-s02";
  const s03Route = s03Location.kind !== "not-s03";
  const s08Route = s08Location.kind !== "not-s08";
  const s09Route = s09Location.kind !== "not-s09";
  const s10Route = s10Location.kind !== "not-s10";
  const specializedSettingsRoute = s02Route || s03Route || s08Route || s09Route || s10Route;
  // V11-R1 F4/S01 closure: the S01 settings legal pages — overview,
  // lifecycle and history (plus the root alias that canonicalizes to
  // overview) — bypass the coming-soon gate exactly like the specialized
  // settings routes, still gated by settingsCenterV1.enabled. Unknown or
  // invalid settings paths keep their own parser handling; no arbitrary
  // settings path is admitted.
  const s01Route = settingsLocation.kind === "valid" && (settingsLocation.page === "overview" || settingsLocation.page === "lifecycle" || settingsLocation.page === "history");
  const specializedSettingsRouteEnabled = (specializedSettingsRoute || s01Route) && foundationState.authorization?.settingsCenterV1.enabled === true;
  const directRouteForbidden = authorizationLocation.kind === "forbidden";
  useEffect(() => {
    if (!location || comingSoonModule || directRouteForbidden || settingsLocation.kind === "invalid" || analyticsLocation.kind === "invalid" || runtimeLocation.kind === "invalid" || dataJobsLocation.kind === "invalid" || mediaLocation.kind === "invalid" || p03Location.kind === "invalid" || auditLocation.kind === "invalid" || jobsLocation.kind === "invalid" || p06Location.kind === "invalid" || legacyCrmSearchUnsupported) return;
    const canonicalHref = s08Location.kind === "valid" ? s08Location.canonicalHref : s03Location.kind === "valid" ? s03Location.canonicalHref : s10Location.kind === "valid" ? s10Location.canonicalHref : s09Location.kind === "valid" ? s09Location.canonicalHref : s02Location.kind === "valid" ? s02Location.canonicalHref : settingsLocation.kind === "valid" ? settingsLocation.canonicalHref : analyticsLocation.kind === "valid" ? analyticsLocation.canonicalHref : runtimeLocation.kind === "valid" ? runtimeLocation.canonicalHref : dataJobsLocation.kind === "valid" ? dataJobsLocation.canonicalHref : mediaLocation.kind === "valid" ? mediaLocation.canonicalHref : p06Location.kind === "work-queue" || p06Location.kind === "notifications" ? p06Location.canonicalHref : jobsLocation.kind === "valid" ? jobsLocation.canonicalHref : auditLocation.kind === "valid" ? auditLocation.canonicalHref : p03Location.kind === "valid" ? p03Location.canonicalHref : location.canonicalHref;
    // P0 one-click navigation: canonicalization may only normalize the URL
    // of ITS OWN render. If a navigation committed after this render (the
    // live URL differs from this render's snapshot), the render is stale and
    // must exit without replaceState — otherwise a legacy effect rolls the
    // new URL back and the panel stays on the previous module until the
    // second click.
    const renderUrl = `${currentPathname}${currentSearch ? `?${currentSearch}` : ""}`;
    const liveUrl = `${window.location.pathname}${window.location.search}`;
    if (renderUrl !== liveUrl) return;
    if (liveUrl !== canonicalHref) window.history.replaceState(window.history.state, "", canonicalHref);
  }, [location, comingSoonModule, directRouteForbidden, settingsLocation, s02Location, s03Location, s08Location, s09Location, s10Location, analyticsLocation, runtimeLocation, dataJobsLocation, mediaLocation, p03Location, auditLocation, jobsLocation, p06Location, legacyCrmSearchUnsupported, currentPathname, currentSearch]);

  // V11-2: anonymous Dashboard routes render the Dashboard-owned login page
  // — never the legacy shell, never the full nav, never a business panel.
  // This precedes the coming-soon adjudication so anonymous coming-soon URLs
  // keep only the login experience and the safe returnTo.
  if (foundationState.status === "anonymous") {
    return <DashboardLoginPage locale={locale} notice={expiredNotice ? "expired" : null} />;
  }
  // Known coming-soon wins before the legacy fallback, even when the shell
  // is disabled / actor not allowed, and before the ready shell.
  // Failure states (unavailable/invalid) render the FoundationState retry UI
  // instead: their FoundationState affordance must stay reachable. The nav
  // uses the same visibility rule as the ready shell (coming-soon always
  // visible; denied available hidden; registry entries without readAllowed
  // retained).
  if (comingSoonModule && !specializedSettingsRouteEnabled && foundationState.status !== "unavailable" && foundationState.status !== "invalid") {
    const navModules = routeModules.filter(navVisibleModule);
    const crumbs = shellBreadcrumbModel({ localePrefix, state: "coming-soon", comingSoonLabel: comingSoonModule.label });
    return <div className={styles.shell} lang="zh-CN"><a className={styles.skipLink} href="#main-content">跳至主要内容</a><header className={styles.topbar}><div className={styles.identity}><Image alt="VanStro" className={styles.logo} height={40} src={assetPath("/assets/vanstro-logo.png")} width={150} /><strong>VanStro 管理后台</strong></div>{foundationState.foundation?.actor ? <div className={styles.topbarActions}><ShellUserMenu displayLabel={foundationState.foundation.actor.displayLabel} loggingOut={loggingOut} onLogout={() => void handleLogout()} /></div> : null}<button aria-controls="dashboard-f0-mobile-navigation" aria-expanded={drawerOpen} className={styles.menuButton} onClick={() => setDrawerOpen(true)} ref={drawerTriggerRef} type="button">打开导航</button></header><div className={styles.layout}><aside aria-label="功能导航" className={styles.desktopSidebar}><ShellNavigation activeModule={null} localePrefix={localePrefix} modules={navModules} onNavigate={navigateTo} /></aside><main className={styles.main} id="main-content" ref={mainRef} tabIndex={-1}><ShellBreadcrumb crumbs={crumbs} /><header className={styles.pageHeader}><h1>{comingSoonModule.label}</h1><p>此模块尚未开放，不会加载业务数据。</p></header><ComingSoonContent label={comingSoonModule.label} /></main></div><MobileNavigationDrawer activeModule={null} drawerRef={drawerRef} localePrefix={localePrefix} modalRootRef={modalRootRef} modules={navModules} onClose={closeDrawer} onNav={navigateTo} open={drawerOpen} /></div>;
  }
  if (foundationState.status === "legacy") return <DashboardShell locale={locale} section={section} />;
  if (foundationState.status !== "ready" || !foundationState.foundation || !foundationState.authorization) return <div className={styles.shell} lang="zh-CN"><a className={styles.skipLink} href="#main-content">跳至主要内容</a><FoundationState retry={foundationState.retry} status={foundationState.status} /></div>;

  const foundation = foundationState.foundation;
  const authorization = foundationState.authorization;
  // Server capability drives the access-mode copy per ACTIVE module: a valid
  // write capability on the current module shows 可编辑; the Settings center
  // shows its own controlled-write state when the server allows publishing;
  // Media keeps its controlled-interaction state; everything else reports
  // 只读模式. Never derived from role names on the client.
  const settingsWritable = (settingsRoute && settingsLocation.kind === "valid" || s02Route || s03Route || s08Route || s09Route || s10Route) && Boolean(authorization.settingsCenterV1?.enabled && authorization.settingsCenterV1.actions?.publish);
  const modules = foundation.modules.filter(navVisibleModule);
  const readableCount = foundation.modules.filter((entry) => entry.readAllowed).length;
  const active = directRouteForbidden ? null : location?.active ?? (specializedSettingsRouteEnabled ? foundation.modules.find((entry) => entry.module === "settings") ?? null : null);
  const activeModuleWriteCapability = active ? hasModuleWriteCapability(authorization, active.module) : false;
  const accessMode = activeModuleWriteCapability ? "可编辑" : settingsWritable ? "Settings 受控写入" : mediaLocation.kind === "valid" ? "媒体受控交互" : "只读模式";
  const roleCount = foundation.actor.roleLabels.length;
  const crumbs = shellBreadcrumbModel({
    localePrefix,
    state: directRouteForbidden ? "forbidden" : active ? "ready" : "unknown",
    activeModuleKey: active?.module ?? null,
    activeLabel: active?.label ?? null
  });

  return <div className={styles.shell} lang="zh-CN"><a className={styles.skipLink} href="#main-content">跳至主要内容</a><header className={styles.topbar}><div className={styles.identity}><Image alt="VanStro" className={styles.logo} height={40} src={assetPath("/assets/vanstro-logo.png")} width={150} /><strong>VanStro 管理后台</strong></div><div className={styles.topbarActions}><ShellUserMenu displayLabel={foundation.actor.displayLabel} loggingOut={loggingOut} onLogout={() => void handleLogout()} roleSummary={authorization.actor.roleKeys.length ? `${authorization.actor.roleKeys.length} 个角色` : undefined} /><button aria-controls="dashboard-f0-mobile-navigation" aria-expanded={drawerOpen} className={styles.menuButton} onClick={() => setDrawerOpen(true)} ref={drawerTriggerRef} type="button">打开导航</button></div></header><div className={styles.layout}><aside aria-label="功能导航" className={styles.desktopSidebar}><ShellNavigation activeModule={active?.module ?? null} activeLinkRef={(link) => { activeDesktopLinkRef.current = link; }} localePrefix={localePrefix} modules={modules} onNavigate={navigateTo} /></aside><main className={styles.main} id="main-content" ref={mainRef} tabIndex={-1}><ShellBreadcrumb crumbs={crumbs} onNavigate={navigateTo} /><header className={styles.pageHeader}><h1>{directRouteForbidden ? "无法访问所请求的模块" : active ? active.label : "无可用模块"}</h1>{directRouteForbidden ? <p>地址已保留，请联系管理员确认权限。</p> : null}</header><ShellStatusBar accessMode={accessMode} readableCount={readableCount} roles={roleCount ? `${roleCount} 个` : "未配置角色"} systemStatus={authorization.status === "ready" ? "已就绪" : "权限上下文已降级"} totalModules={foundation.modules.length} />{directRouteForbidden ? <section aria-labelledby="p02-forbidden-title" className={styles.contentState} role="alert"><h2 id="p02-forbidden-title">没有此页面的读取权限</h2><p>当前账户无法读取所请求的模块。地址已保留，请联系管理员确认权限。</p></section> : settingsLocation.kind === "invalid" ? <section aria-labelledby="settings-invalid-title" className={styles.contentState} role="alert"><h2 id="settings-invalid-title">设置中心参数无效</h2><p>{settingsLocation.message}</p><button onClick={() => { window.history.replaceState(window.history.state, "", settingsLocation.clearHref); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除视图</button></section> : analyticsLocation.kind === "invalid" ? <section aria-labelledby="p10-invalid-title" className={styles.contentState} role="alert"><h2 id="p10-invalid-title">Analytics发布参数无效</h2><p>{analyticsLocation.message}</p><button onClick={() => { window.history.replaceState(window.history.state, "", analyticsLocation.clearHref); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除视图</button></section> : runtimeLocation.kind === "invalid" ? <section aria-labelledby="p09-invalid-title" className={styles.contentState} role="alert"><h2 id="p09-invalid-title">运行时基础设施参数无效</h2><p>{runtimeLocation.message}</p><button onClick={() => { window.history.replaceState(window.history.state, "", runtimeLocation.clearHref); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除视图</button></section> : dataJobsLocation.kind === "invalid" ? <section aria-labelledby="p08-invalid-title" className={styles.contentState} role="alert"><h2 id="p08-invalid-title">导入导出参数无效</h2><p>{dataJobsLocation.message}</p><button onClick={() => { window.history.replaceState(window.history.state, "", dataJobsLocation.clearHref); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除视图</button></section> : legacyCrmSearchUnsupported ? <section aria-labelledby="crm-search-unsupported-title" className={styles.contentState} role="alert"><h2 id="crm-search-unsupported-title">客户搜索不可用</h2><p>为保护个人资料，客户姓名、邮箱和电话搜索已停用。请移除 URL 中的 q 参数后重试。</p></section> : mediaLocation.kind === "invalid" ? <section aria-labelledby="p07-invalid-title" className={styles.contentState} role="alert"><h2 id="p07-invalid-title">媒体查询参数无效</h2><p>{mediaLocation.message}</p><button onClick={() => { window.history.replaceState(window.history.state, "", mediaLocation.clearHref); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除视图</button></section> : p06Location.kind === "invalid" ? <section aria-labelledby="p06-invalid-title" className={styles.contentState} role="alert"><h2 id="p06-invalid-title">工作队列参数无效</h2><p>{p06Location.message}</p></section> : jobsLocation.kind === "invalid" ? <section aria-labelledby="p05-invalid-title" className={styles.contentState} role="alert"><h2 id="p05-invalid-title">任务查询参数无效</h2><p>{jobsLocation.message}</p></section> : auditLocation.kind === "invalid" ? <section aria-labelledby="p04-invalid-title" className={styles.contentState} role="alert"><h2 id="p04-invalid-title">审计查询参数无效</h2><p>{auditLocation.message}</p></section> : p03Location.kind === "invalid" ? <section aria-labelledby="p03-invalid-title" className={styles.contentState} role="alert"><h2 id="p03-invalid-title">查询参数无效</h2><p>{p03Location.message}</p></section> : active ? <DashboardF0ReadOnlyContent activeFilter={location?.activeFilter ?? ""} activePage={p03Location.kind === "valid" && p03Location.state.resource === "products" ? p03Location.state.page : location?.activePage ?? 1} activeTab={foundationModuleToLegacyTab(active.module)} authorization={authorization} foundation={foundation} auditQueryState={auditLocation.kind === "valid" ? auditLocation.state : undefined} asyncJobQueryState={jobsLocation.kind === "valid" ? jobsLocation.state : undefined} mediaLocation={mediaLocation.kind === "valid" ? mediaLocation : undefined} dataJobsLocation={dataJobsLocation.kind === "valid" ? dataJobsLocation : undefined} runtimeLocation={runtimeLocation.kind === "valid" ? runtimeLocation : undefined} analyticsLocation={analyticsLocation.kind === "valid" ? analyticsLocation : undefined} settingsLocation={settingsLocation.kind === "valid" ? settingsLocation : undefined} s02Location={s02Location.kind === "valid" ? s02Location : undefined} s03Location={s03Location.kind === "valid" ? s03Location : undefined} s08Location={s08Location.kind === "valid" ? s08Location : undefined} s10Location={s10Location.kind === "valid" ? s10Location : undefined} s09Location={s09Location.kind === "valid" ? s09Location : undefined} p06Location={p06Location.kind === "work-queue" || p06Location.kind === "notifications" ? p06Location : undefined} key={`${authorizationRequestIdentity(authorization)}:${active.module}:${s08Location.kind === "valid" ? s08Location.canonicalHref : s03Location.kind === "valid" ? s03Location.canonicalHref : s02Location.kind === "valid" ? s02Location.canonicalHref : settingsLocation.kind === "valid" ? settingsLocation.canonicalHref : analyticsLocation.kind === "valid" ? analyticsLocation.canonicalHref : runtimeLocation.kind === "valid" ? runtimeLocation.canonicalHref : dataJobsLocation.kind === "valid" ? dataJobsLocation.canonicalHref : mediaLocation.kind === "valid" ? mediaLocation.listHref : p06Location.kind === "work-queue" || p06Location.kind === "notifications" ? p06Location.canonicalHref : jobsLocation.kind === "valid" ? jobsLocation.canonicalHref : auditLocation.kind === "valid" ? auditLocation.canonicalHref : p03Location.kind === "valid" ? p03Location.canonicalHref : location?.canonicalHref ?? ""}`} locale={locale} onNavigate={navigateTo} onUnauthorized={foundationState.invalidateSession} queryState={p03Location.kind === "valid" ? p03Location.state : undefined} /> : <section aria-labelledby="f0-panel-title" className={styles.contentState}><h2 id="f0-panel-title">没有可读取的模块</h2><p>当前账户没有任何可读取模块。请联系管理员确认权限。</p></section>}</main></div><MobileNavigationDrawer activeModule={active?.module ?? null} drawerRef={drawerRef} localePrefix={localePrefix} modalRootRef={modalRootRef} modules={modules} onClose={closeDrawer} onNav={navigateTo} open={drawerOpen} /></div>;
}
