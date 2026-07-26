"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveAlertRoute, parseTabFromQuery } from "@/lib/dashboard/alert-routing";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { formatNumber } from "@/lib/dashboard/format";
import { hasPermission, MUTATION_PERMISSIONS, visibleTabs } from "@/lib/dashboard/tab-permissions";
import type { CmsSubTab, QueueFilters, QueuePagination, TabKey } from "@/lib/dashboard/types";
import { getDashboardCopy } from "@/lib/i18n/dashboard-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import {
  AuditLogsPanel,
  CategoriesPanel,
  CmsPanel,
  ContactLeadsPanel,
  CrmContactsPanel,
  DealerApplicationsPanel,
  DealersPanel,
  EmailOutboxPanel,
  ErpSyncJobsPanel,
  InventorySnapshotsPanel,
  OperationsPanel,
  OrdersPanel,
  PaymentSessionsPanel,
  PricingPanel,
  ProductReviewsPanel,
  ProductsPanel,
  PromotionsPanel,
  RolesPanel,
  SupportHandoffsPanel,
  UsersPanel
} from "./DashboardPanels";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardSession } from "./hooks/useDashboardSession";
import { StatCard } from "./shared/primitives";

const ALL_TABS: TabKey[] = [
  "products", "categories", "pricing", "promotions", "users", "roles", "dealers",
  "dealerApplications", "contactLeads", "crmContacts", "productReviews", "supportHandoffs",
  "orders", "paymentSessions", "erpSyncJobs", "inventorySnapshots", "cms",
  "operations", "emailOutbox", "auditLogs"
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

const emptyMeta = { page: 1, pageSize: 50, total: 0, totalPages: 0 };

export function DashboardShell({ locale: explicitLocale }: { locale?: SiteLocale }) {
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
    setActiveTabRef
  } = useDashboardData(token);

  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [cmsSubTab, setCmsSubTab] = useState<CmsSubTab>("navigation");
  const [cmsLocale, setCmsLocale] = useState<SiteLocale>(locale);
  const [crmSearch, setCrmSearch] = useState("");
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
      await loadTab(tab, { filters: nextFilters, pages: nextPages, cmsLocale, crmQuery: crmSearch });
    },
    [tabs, queueFilters, pages, cmsLocale, crmSearch, loadTab, setActiveTabRef, syncUrl]
  );

  useEffect(() => {
    if (!user || tabs.length === 0) return;
    const tabFromQuery = parseTabFromQuery(searchParams.get("tab"));
    const initialTab = tabFromQuery && tabs.includes(tabFromQuery) ? tabFromQuery : tabs[0];
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
    void loadTab(initialTab, { filters: initialFilters, pages: initialPages, cmsLocale, crmQuery: crmSearch });
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
      await reloadActiveTab(queueFilters, pages, cmsLocale, crmSearch);
      await loadStats();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : copy.errors.requestFailed);
    } finally {
      setLoading(false);
    }
  }

  const reload = async () => {
    await reloadActiveTab(queueFilters, pages, cmsLocale, crmSearch);
    await loadStats();
  };

  async function updateQueueFilter(key: keyof QueueFilters, value: string) {
    const nextFilters = { ...queueFilters, [key]: value };
    const nextPages = { ...pages, [activeTab]: 1 };
    setQueueFilters(nextFilters);
    setPages(nextPages);
    syncUrl(activeTab, nextFilters, nextPages);
    await loadTab(activeTab, { filters: nextFilters, pages: nextPages, cmsLocale, crmQuery: crmSearch });
  }

  async function updatePage(key: keyof QueuePagination, page: number) {
    const nextPages = { ...pages, [key]: page };
    setPages(nextPages);
    syncUrl(activeTab, queueFilters, nextPages);
    await loadTab(activeTab, { filters: queueFilters, pages: nextPages, cmsLocale, crmQuery: crmSearch });
  }

  async function updateCrmSearch(value: string) {
    setCrmSearch(value);
    const nextPages = { ...pages, crmContacts: 1 };
    setPages(nextPages);
    if (activeTab === "crmContacts") {
      await loadTab("crmContacts", { filters: queueFilters, pages: nextPages, crmQuery: value });
    }
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
            onClick={() => void reloadActiveTab(queueFilters, pages, cmsLocale, crmSearch)}
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
          {tabs.map((tab) => (
            <button
              className={tab === activeTab ? "active" : ""}
              key={tab}
              onClick={() => void navigateTab(tab)}
              type="button"
            >
              {copy.tabs[tab]}
            </button>
          ))}
        </aside>

        <section className="dashboard-panel">
          {activeTab === "products" ? (
            <ProductsPanel
              apiFetch={apiFetch}
              categories={data.categories}
              copy={copy}
              locale={locale}
              onAction={onAction}
              onReload={reload}
              products={data.products}
            />
          ) : null}

          {activeTab === "categories" ? (
            <CategoriesPanel categories={data.categories} copy={copy} onAction={onAction} onReload={reload} />
          ) : null}

          {activeTab === "pricing" ? (
            <PricingPanel
              copy={copy}
              locale={locale}
              onAction={onAction}
              onReload={reload}
              prices={data.pricing}
              products={data.products}
            />
          ) : null}

          {activeTab === "promotions" ? (
            <PromotionsPanel copy={copy} onAction={onAction} onReload={reload} promotions={data.promotions} />
          ) : null}

          {activeTab === "users" ? (
            <UsersPanel
              copy={copy}
              input={userInput}
              onChange={setUserInput}
              onSubmit={() =>
                void onAction(
                  "/dashboard/users",
                  {
                    email: userInput.email,
                    displayName: userInput.displayName,
                    password: userInput.password,
                    roleIds: userInput.roleId ? [userInput.roleId] : []
                  },
                  { success: copy.messages.adminUserCreated }
                )
              }
              roles={data.roles}
              users={data.users}
            />
          ) : null}

          {activeTab === "roles" ? (
            <RolesPanel
              copy={copy}
              input={roleInput}
              onChange={setRoleInput}
              onSubmit={() => void onAction("/dashboard/roles", roleInput, { success: copy.messages.roleCreated })}
              roles={data.roles}
            />
          ) : null}

          {activeTab === "dealers" ? <DealersPanel copy={copy} dealers={data.dealers} /> : null}

          {activeTab === "dealerApplications" ? (
            <DealerApplicationsPanel
              apiFetch={apiFetch}
              applications={data.dealerApplications}
              copy={copy}
              locale={locale}
              meta={meta.dealerApplications ?? emptyMeta}
              onAction={onAction}
              onFilterChange={(value) => void updateQueueFilter("dealerApplications", value)}
              onPageChange={(page) => void updatePage("dealerApplications", page)}
              onReload={reload}
              page={pages.dealerApplications}
              statusFilter={queueFilters.dealerApplications}
            />
          ) : null}

          {activeTab === "contactLeads" ? (
            <ContactLeadsPanel
              apiFetch={apiFetch}
              copy={copy}
              dealers={data.dealers}
              leads={data.contactLeads}
              locale={locale}
              meta={meta.contactLeads ?? emptyMeta}
              onAction={onAction}
              onFilterChange={(value) => void updateQueueFilter("contactLeads", value)}
              onPageChange={(page) => void updatePage("contactLeads", page)}
              onReload={reload}
              page={pages.contactLeads}
              statusFilter={queueFilters.contactLeads}
              users={data.users}
            />
          ) : null}

          {activeTab === "crmContacts" ? (
            <CrmContactsPanel
              apiFetch={apiFetch}
              canPromote={can(MUTATION_PERMISSIONS.crmPromote)}
              canUpdate={can(MUTATION_PERMISSIONS.crmUpdate)}
              contacts={data.crmContacts}
              copy={copy}
              locale={locale}
              meta={meta.crmContacts ?? emptyMeta}
              onAction={onAction}
              onFilterChange={(value) => void updateQueueFilter("crmContacts", value)}
              onPageChange={(page) => void updatePage("crmContacts", page)}
              onReload={reload}
              onSearchChange={(value) => void updateCrmSearch(value)}
              page={pages.crmContacts}
              searchQuery={crmSearch}
              statusFilter={queueFilters.crmContacts}
            />
          ) : null}

          {activeTab === "productReviews" ? (
            <ProductReviewsPanel
              apiFetch={apiFetch}
              copy={copy}
              locale={locale}
              meta={meta.productReviews ?? emptyMeta}
              onAction={onAction}
              onFilterChange={(value) => void updateQueueFilter("productReviews", value)}
              onPageChange={(page) => void updatePage("productReviews", page)}
              onReload={reload}
              page={pages.productReviews}
              reviews={data.productReviews}
              statusFilter={queueFilters.productReviews}
            />
          ) : null}

          {activeTab === "supportHandoffs" ? (
            <SupportHandoffsPanel
              copy={copy}
              handoffs={data.supportHandoffs}
              locale={locale}
              meta={meta.supportHandoffs ?? emptyMeta}
              onAction={onAction}
              onFilterChange={(value) => void updateQueueFilter("supportHandoffs", value)}
              onPageChange={(page) => void updatePage("supportHandoffs", page)}
              onReload={reload}
              page={pages.supportHandoffs}
              statusFilter={queueFilters.supportHandoffs}
            />
          ) : null}

          {activeTab === "orders" ? (
            <OrdersPanel
              apiFetch={apiFetch}
              copy={copy}
              dealers={data.dealers}
              locale={locale}
              meta={meta.orders ?? emptyMeta}
              onAction={onAction}
              onFilterChange={(value) => void updateQueueFilter("orders", value)}
              onPageChange={(page) => void updatePage("orders", page)}
              onReload={reload}
              orders={data.orders}
              page={pages.orders}
              statusFilter={queueFilters.orders}
            />
          ) : null}

          {activeTab === "paymentSessions" ? (
            <PaymentSessionsPanel
              copy={copy}
              locale={locale}
              meta={meta.paymentSessions ?? emptyMeta}
              onAction={onAction}
              onPageChange={(page) => void updatePage("paymentSessions", page)}
              onReload={reload}
              page={pages.paymentSessions}
              sessions={data.paymentSessions}
            />
          ) : null}

          {activeTab === "erpSyncJobs" ? (
            <ErpSyncJobsPanel
              copy={copy}
              jobs={data.erpSyncJobs}
              locale={locale}
              meta={meta.erpSyncJobs ?? emptyMeta}
              onAction={onAction}
              onFilterChange={(value) => void updateQueueFilter("erpSyncJobs", value)}
              onPageChange={(page) => void updatePage("erpSyncJobs", page)}
              onReload={reload}
              page={pages.erpSyncJobs}
              statusFilter={queueFilters.erpSyncJobs}
            />
          ) : null}

          {activeTab === "inventorySnapshots" ? (
            <InventorySnapshotsPanel
              canWrite={can(MUTATION_PERMISSIONS.inventoryWrite)}
              copy={copy}
              dealers={data.dealers}
              locale={locale}
              meta={meta.inventorySnapshots ?? emptyMeta}
              onAction={onAction}
              onPageChange={(page) => void updatePage("inventorySnapshots", page)}
              onReload={reload}
              page={pages.inventorySnapshots}
              products={data.products}
              snapshots={data.inventorySnapshots}
            />
          ) : null}

          {activeTab === "cms" ? (
            <CmsPanel
              apiFetch={apiFetch}
              articles={data.articles}
              canWrite={can(MUTATION_PERMISSIONS.contentWrite)}
              cmsCatalogConfig={data.cmsCatalogConfig}
              cmsFooter={data.cmsFooter}
              cmsHomePage={data.cmsHomePage}
              cmsLocale={cmsLocale}
              cmsNavigation={data.cmsNavigation}
              cmsStorefrontConfig={data.cmsStorefrontConfig}
              cmsSubTab={cmsSubTab}
              copy={copy}
              legalPages={data.legalPages}
              moduleReadiness={data.moduleReadiness}
              onAction={onAction}
              onLocaleChange={(value) => {
                setCmsLocale(value);
                void loadTab("cms", { cmsLocale: value });
              }}
              onReload={reload}
              onSubTabChange={setCmsSubTab}
            />
          ) : null}

          {activeTab === "operations" ? (
            <OperationsPanel
              alerts={data.operationAlerts}
              analyticsSummary={data.analyticsSummary}
              copy={copy}
              onNavigateAlert={handleNavigateAlert}
            />
          ) : null}

          {activeTab === "emailOutbox" ? (
            <EmailOutboxPanel
              canWriteProvider={can(MUTATION_PERMISSIONS.emailProviderWrite)}
              canWriteTemplates={can(MUTATION_PERMISSIONS.emailTemplatesWrite)}
              copy={copy}
              emailProvider={data.emailProvider}
              items={data.emailOutbox}
              locale={locale}
              meta={meta.emailOutbox ?? emptyMeta}
              onAction={onAction}
              onPageChange={(page) => void updatePage("emailOutbox", page)}
              onReload={reload}
              page={pages.emailOutbox}
              templates={data.emailTemplates}
            />
          ) : null}

          {activeTab === "auditLogs" ? (
            <AuditLogsPanel
              copy={copy}
              locale={locale}
              logs={data.auditLogs}
              meta={meta.auditLogs ?? emptyMeta}
              onPageChange={(page) => void updatePage("auditLogs", page)}
              page={pages.auditLogs}
            />
          ) : null}
        </section>
      </section>
    </div>
  );
}
