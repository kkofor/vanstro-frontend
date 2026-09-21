"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveAlertRoute, parseTabFromQuery } from "@/lib/dashboard/alert-routing";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { formatNumber } from "@/lib/dashboard/format";
import { DASHBOARD_NAV_GROUP_LABELS, DASHBOARD_NAV_GROUPS, dashboardHref } from "@/lib/dashboard/routes";
import { hasPermission, MUTATION_PERMISSIONS, visibleTabs } from "@/lib/dashboard/tab-permissions";
import type { CmsSubTab, QueueFilters, QueuePagination, TabKey } from "@/lib/dashboard/types";
import { getDashboardCopy } from "@/lib/i18n/dashboard-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { DashboardPanelRouter } from "./DashboardPanelRouter";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardSession } from "./hooks/useDashboardSession";
import { StatCard } from "./shared/primitives";

const ALL_TABS: TabKey[] = [
  "overview", "products", "categories", "pricing", "promotions", "users", "roles", "dealers",
  "dealerApplications", "contactLeads", "crmContacts", "productReviews", "supportHandoffs",
  "orders", "paymentSessions", "erpSyncJobs", "inventorySnapshots", "cms",
  "operations", "emailOutbox", "auditLogs", "batch"
];

const defaultFilters: QueueFilters = {
  contactLeads: "",
  crmContacts: "",
  dealerApplications: "",
  productReviews: "",
  supportHandoffs: "",
  orders: "",
  erpSyncJobs: ""
};

const defaultPages: QueuePagination = {
  contactLeads: 1,
  crmContacts: 1,
  dealerApplications: 1,
  productReviews: 1,
  supportHandoffs: 1,
  orders: 1,
  paymentSessions: 1,
  erpSyncJobs: 1,
  inventorySnapshots: 1,
  emailOutbox: 1,
  auditLogs: 1
};

export function DashboardShell({ locale: explicitLocale, section = "overview" }: { locale?: SiteLocale; section?: TabKey }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getDashboardCopy(locale);
  const searchParams = useSearchParams();

  const { token, user, loading: sessionLoading, login, logout } = useDashboardSession();
  const {
    data,
    stats,
    meta,
    loading: dataLoading,
    setLoading,
    loadTab,
    loadStats,
    reloadActiveTab,
    apiFetch,
    resourceStates,
    setActiveTabRef
  } = useDashboardData(token);

  const [activeTab, setActiveTab] = useState<TabKey>(section);
  const [cmsSubTab, setCmsSubTab] = useState<CmsSubTab>("navigation");
  const [cmsLocale, setCmsLocale] = useState<SiteLocale>(locale);
  const [queueFilters, setQueueFilters] = useState<QueueFilters>(defaultFilters);
  const [pages, setPages] = useState<QueuePagination>(defaultPages);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"status" | "error">("status");
  const [loginInput, setLoginInput] = useState({ email: "", password: "" });
  const [userInput, setUserInput] = useState({ email: "", displayName: "", password: "", roleId: "" });
  const [roleInput, setRoleInput] = useState({ key: "", name: "" });

  const permissions = user?.permissions ?? [];
  const tabs = useMemo(() => visibleTabs(permissions, ALL_TABS), [permissions]);
  const loading = sessionLoading || dataLoading;
  const legacyCrmSearchUnsupported = activeTab === "crmContacts" && searchParams.has("q");

  const can = useCallback(
    (permission: string) => hasPermission(permissions, permission),
    [permissions]
  );

  const syncUrl = useCallback((tab: TabKey, filters: QueueFilters, pageState: QueuePagination) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (filters.contactLeads) params.set("leadStatus", filters.contactLeads);
    if (filters.crmContacts) params.set("crmStage", filters.crmContacts);
    if (filters.dealerApplications) params.set("appStatus", filters.dealerApplications);
    if (filters.productReviews) params.set("reviewStatus", filters.productReviews);
    if (filters.supportHandoffs) params.set("handoffStatus", filters.supportHandoffs);
    if (filters.orders) params.set("orderStatus", filters.orders);
    if (filters.erpSyncJobs) params.set("erpStatus", filters.erpSyncJobs);
    const pageKey = tab as keyof QueuePagination;
    if (pages[pageKey] > 1) params.set("page", String(pages[pageKey]));
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", next);
  }, [pages]);

  const navigateTab = useCallback(
    async (tab: TabKey, nextFilters = queueFilters, nextPages = pages) => {
      if (!tabs.includes(tab)) return;
      setActiveTab(tab);
      setActiveTabRef(tab);
      syncUrl(tab, nextFilters, nextPages);
      await loadTab(tab, { filters: nextFilters, pages: nextPages, cmsLocale });
    },
    [tabs, queueFilters, pages, cmsLocale, loadTab, setActiveTabRef, syncUrl]
  );

  useEffect(() => {
    if (!user || tabs.length === 0) return;
    const tabFromQuery = parseTabFromQuery(searchParams.get("tab"));
    const requestedTab = tabFromQuery ?? section;
    const initialTab = tabs.includes(requestedTab) ? requestedTab : tabs[0];
    const initialFilters: QueueFilters = {
      contactLeads: searchParams.get("leadStatus") ?? "",
      crmContacts: searchParams.get("crmStage") ?? "",
      dealerApplications: searchParams.get("appStatus") ?? "",
      productReviews: searchParams.get("reviewStatus") ?? "",
      supportHandoffs: searchParams.get("handoffStatus") ?? "",
      orders: searchParams.get("orderStatus") ?? "",
      erpSyncJobs: searchParams.get("erpStatus") ?? ""
    };
    const page = Number(searchParams.get("page") ?? "1");
    const initialPages = { ...defaultPages, [initialTab]: Number.isFinite(page) && page > 0 ? page : 1 };
    setQueueFilters(initialFilters);
    setPages(initialPages);
    setActiveTab(initialTab);
    setActiveTabRef(initialTab);
    if (!(initialTab === "crmContacts" && searchParams.has("q"))) void loadTab(initialTab, { filters: initialFilters, pages: initialPages, cmsLocale });
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await login(loginInput.email, loginInput.password);
      setMessage(copy.messages.signedIn);
    } catch {
      setMessageTone("error");
      setMessage(copy.errors.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setMessage(copy.messages.signedOut);
  }

  async function onAction(path: string, body: Record<string, unknown>, options: { method?: string; success: string }) {
    setLoading(true);
    setMessage("");
    try {
      await apiFetch(path, { method: options.method ?? "POST", body: JSON.stringify(body) });
      setMessage(options.success);
      await reloadActiveTab(queueFilters, pages, cmsLocale);
      await loadStats();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : copy.errors.requestFailed);
    } finally {
      setLoading(false);
    }
  }

  const reload = async () => {
    await reloadActiveTab(queueFilters, pages, cmsLocale);
    await loadStats();
  };

  async function updateQueueFilter(key: keyof QueueFilters, value: string) {
    const nextFilters = { ...queueFilters, [key]: value };
    const nextPages = { ...pages, [activeTab]: 1 };
    setQueueFilters(nextFilters);
    setPages(nextPages);
    syncUrl(activeTab, nextFilters, nextPages);
    await loadTab(activeTab, { filters: nextFilters, pages: nextPages, cmsLocale });
  }

  async function updatePage(key: keyof QueuePagination, page: number) {
    const nextPages = { ...pages, [key]: page };
    setPages(nextPages);
    syncUrl(activeTab, queueFilters, nextPages);
    await loadTab(activeTab, { filters: queueFilters, pages: nextPages, cmsLocale });
  }

  function handleNavigateAlert(alertKey: string) {
    const route = resolveAlertRoute(alertKey);
    if (!route) return;
    const nextFilters = { ...queueFilters };
    if (route.filterKey && route.filterValue !== undefined) {
      nextFilters[route.filterKey] = route.filterValue;
    }
    void navigateTab(route.tab, nextFilters, { ...pages, [route.tab]: 1 });
  }

  if (!user) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-login-shell">
          <div>
            <span className="eyebrow">{copy.login.eyebrow}</span>
            <h1>{copy.login.title}</h1>
            <p>
              {copy.login.intro} {copy.login.apiBase} <code>{DASHBOARD_API_BASE_URL}</code>
            </p>
          </div>
          <form className="dashboard-card dashboard-login-card" onSubmit={submitLogin}>
            <label className="field">
              <span>{copy.login.email}</span>
              <input
                autoComplete="email"
                type="email"
                value={loginInput.email}
                onChange={(event) => setLoginInput((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>{copy.login.password}</span>
              <input
                autoComplete="current-password"
                type="password"
                value={loginInput.password}
                onChange={(event) => setLoginInput((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>
            <button className="button button-primary" disabled={loading} type="submit">
              {loading ? copy.login.signingIn : copy.login.signIn}
            </button>
            {message ? (
              <p className="dashboard-message" role={messageTone === "error" ? "alert" : "status"}>
                {message}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">{copy.hero.eyebrow}</span>
          <h1>{copy.hero.title}</h1>
          <p>{copy.hero.signedInAs(user.email)}</p>
        </div>
        <div className="dashboard-hero-actions">
          <button
            className="button button-secondary"
            onClick={() => void reloadActiveTab(queueFilters, pages, cmsLocale)}
            type="button"
          >
            {loading ? copy.hero.refreshing : copy.hero.refresh}
          </button>
          <button className="button button-primary" onClick={() => void handleLogout()} type="button">
            {copy.hero.signOut}
          </button>
        </div>
      </section>

      <section className="dashboard-stats" aria-label={copy.hero.countsLabel}>
        <StatCard label={copy.stats.products} value={formatNumber(stats.products, locale)} />
        <StatCard label={copy.stats.categories} value={formatNumber(stats.categories, locale)} />
        <StatCard label={copy.stats.prices} value={formatNumber(stats.prices, locale)} />
        <StatCard label={copy.stats.promotions} value={formatNumber(stats.promotions, locale)} />
        <StatCard label={copy.stats.users} value={formatNumber(stats.users, locale)} />
        <StatCard label={copy.stats.dealers} value={formatNumber(stats.dealers, locale)} />
        <StatCard label={copy.stats.applications} value={formatNumber(stats.applications, locale)} />
        <StatCard label={copy.stats.leads} value={formatNumber(stats.leads, locale)} />
        <StatCard label={copy.stats.crmContacts} value={formatNumber(stats.crmContacts, locale)} />
        <StatCard label={copy.stats.reviews} value={formatNumber(stats.reviews, locale)} />
        <StatCard label={copy.stats.orders} value={formatNumber(stats.orders, locale)} />
        <StatCard label={copy.stats.opsAlerts} value={formatNumber(stats.opsAlerts, locale)} />
      </section>

      {message ? (
        <p className="dashboard-message" role={messageTone === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}

      <section className="dashboard-shell-grid">
        <aside className="dashboard-sidebar" aria-label={copy.hero.sectionsLabel}>
          {DASHBOARD_NAV_GROUPS.map((group) => {
            const groupTabs = group.tabs.filter((tab) => tabs.includes(tab));
            if (groupTabs.length === 0) return null;
            return (
              <div className="dashboard-nav-group" key={group.key}>
                <span>{DASHBOARD_NAV_GROUP_LABELS[group.key][locale]}</span>
                {groupTabs.map((tab) => (
                  <Link
                    aria-current={tab === activeTab ? "page" : undefined}
                    className={tab === activeTab ? "active" : ""}
                    href={dashboardHref(tab, locale)}
                    key={tab}
                  >
                    {tab === "settings" ? (locale === "fr-CA" ? "Paramètres" : "Settings") : copy.tabs[tab as keyof typeof copy.tabs]}
                  </Link>
                ))}
              </div>
            );
          })}
        </aside>

        <section className="dashboard-panel">
          {legacyCrmSearchUnsupported ? <section role="alert"><h2>{locale === "fr-CA" ? "Recherche client indisponible" : "Customer search unavailable"}</h2><p>{locale === "fr-CA" ? "Pour protéger les renseignements personnels, retirez le paramètre q de l’adresse." : "To protect personal information, remove the q parameter from the address."}</p></section> : <DashboardPanelRouter
            activeTab={activeTab}
            apiFetch={apiFetch}
            can={can}
            cmsLocale={cmsLocale}
            cmsSubTab={cmsSubTab}
            copy={copy}
            crmSearch=""
            data={data}
            loadTab={loadTab}
            locale={locale}
            meta={meta}
            onAction={onAction}
            onNavigateAlert={handleNavigateAlert}
            onReload={reload}
            ordersDealersDegraded={resourceStates.orders === "partial"}
            pages={pages}
            queueFilters={queueFilters}
            roleInput={roleInput}
            setCmsLocale={setCmsLocale}
            setCmsSubTab={setCmsSubTab}
            setRoleInput={setRoleInput}
            setUserInput={setUserInput}
            tabs={tabs}
            updateCrmSearch={async () => undefined}
            updatePage={updatePage}
            updateQueueFilter={updateQueueFilter}
            userInput={userInput}
          />}
        </section>
      </section>
    </div>
  );
}
