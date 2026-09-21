"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardAuthorization, DashboardFoundation } from "@/lib/api/api-contract";
import { assertReadOnlyMethod, dashboardQueueHref, foundationModuleToLegacyTab } from "@/lib/dashboard/f0-shell";
import { hasModuleWriteCapability, moduleWritePermissionKey } from "@/lib/dashboard/edit-gates";
import { parseDashboardP03Location, productQueryHref, type DashboardP03QueryState } from "@/lib/dashboard/p03-query";
import { type AuditQueryState } from "@/lib/dashboard/p04-audit";
import { type AsyncJobQueryState } from "@/lib/dashboard/p05-jobs";
import { type P06Location } from "@/lib/dashboard/p06-work-queue";
import { type MediaLocation } from "@/lib/dashboard/p07-media";
import { type DataJobsLocation } from "@/lib/dashboard/p08-data-jobs";
import { type P09Location } from "@/lib/dashboard/p09-runtime";
import { type P10Location } from "@/lib/dashboard/p10-analytics";
import { type SettingsCenterLocation } from "@/lib/dashboard/s01-settings";
import { type S02Location } from "@/lib/dashboard/s02-settings";
import { type S03Location } from "@/lib/dashboard/s03-settings";
import { type S08Location } from "@/lib/dashboard/s08-settings";
import { type S09Location } from "@/lib/dashboard/s09-settings";
import { type S10Location } from "@/lib/dashboard/s10-settings";
import { AnalyticsFoundationPanel } from "./AnalyticsFoundationPanel";
import { AuditFoundationPanel, navigateAuditState } from "./AuditFoundationPanel";
import { AsyncJobsFoundationPanel, navigateAsyncJobState } from "./AsyncJobsFoundationPanel";
import { WorkQueueFoundationPanel } from "./WorkQueueFoundationPanel";
import { MediaFoundationPanel } from "./MediaFoundationPanel";
import { DataJobsFoundationPanel } from "./DataJobsFoundationPanel";
import { RuntimeFoundationPanel } from "./RuntimeFoundationPanel";
import { SettingsFoundationPanel } from "./SettingsFoundationPanel";
import { GeneralStorefrontSettingsPanel } from "./GeneralStorefrontSettingsPanel";
import { AuthRbacSettingsPanel } from "./AuthRbacSettingsPanel";
import { PrivacyRetentionSettingsPanel } from "./PrivacyRetentionSettingsPanel";
import { CommerceSettingsPanel } from "./CommerceSettingsPanel";
import { ApiServiceAccountsSettingsPanel } from "./ApiServiceAccountsSettingsPanel";
import type { CmsSubTab, QueueFilters, QueuePagination, TabKey } from "@/lib/dashboard/types";
import { getDashboardF0Copy } from "@/lib/i18n/dashboard-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { DashboardPanelRouter } from "./DashboardPanelRouter";
import { OverviewWorkspacePanel } from "./OverviewWorkspacePanel";
import { useDashboardData } from "./hooks/useDashboardData";

const initialFilters: QueueFilters = { contactLeads: "", crmContacts: "", dealerApplications: "", productReviews: "", supportHandoffs: "", orders: "", erpSyncJobs: "" };
const initialPages: QueuePagination = { contactLeads: 1, crmContacts: 1, dealerApplications: 1, productReviews: 1, supportHandoffs: 1, orders: 1, paymentSessions: 1, erpSyncJobs: 1, inventorySnapshots: 1, emailOutbox: 1, auditLogs: 1 };

export function DashboardF0ReadOnlyContent({ activeFilter, activePage, activeTab, authorization, foundation, locale, onNavigate, onUnauthorized, queryState, auditQueryState, asyncJobQueryState, mediaLocation, dataJobsLocation, runtimeLocation, analyticsLocation, settingsLocation, s02Location, s03Location, s08Location, s09Location, s10Location, p06Location }: {
  activeFilter: string;
  activePage: number;
  activeTab: TabKey;
  authorization: DashboardAuthorization;
  foundation: DashboardFoundation;
  locale: SiteLocale;
  /** Single unified dashboard navigation callback (URL + panel + nav sync). */
  onNavigate: (href: string) => void;
  onUnauthorized: () => void;
  queryState?: DashboardP03QueryState;
  auditQueryState?: AuditQueryState;
  asyncJobQueryState?: AsyncJobQueryState;
  mediaLocation?: Extract<MediaLocation, { kind: "valid" }>;
  dataJobsLocation?: Extract<DataJobsLocation, { kind: "valid" }>;
  runtimeLocation?: Extract<P09Location, { kind: "valid" }>;
  analyticsLocation?: Extract<P10Location, { kind: "valid" }>;
  settingsLocation?: Extract<SettingsCenterLocation, { kind: "valid" }>;
  s02Location?: Extract<S02Location, { kind: "valid" }>;
  s03Location?: Extract<S03Location, { kind: "valid" }>;
  s08Location?: Extract<S08Location, { kind: "valid" }>;
  s09Location?: Extract<S09Location, { kind: "valid" }>;
  s10Location?: Extract<S10Location, { kind: "valid" }>;
  p06Location?: Extract<P06Location, { kind: "work-queue" | "notifications" }>;
}) {
  const copy = getDashboardF0Copy();
  // Per-module edit gates (shared edit-gates registry): each module's write
  // controls resolve ONLY against its own persisted write capability.
  // products.write never opens categories/pricing/inventory, and vice versa.
  // These flags only decide whether write controls render; the server
  // remains the final authorization boundary (403 + audit).
  const productsCanEdit = hasModuleWriteCapability(authorization, "products");
  const categoriesCanEdit = hasModuleWriteCapability(authorization, "categories");
  const pricingCanEdit = hasModuleWriteCapability(authorization, "pricing");
  const promotionsCanEdit = hasModuleWriteCapability(authorization, "promotions");
  const inventoryCanEdit = hasModuleWriteCapability(authorization, "inventory");
  const ordersCanEdit = hasModuleWriteCapability(authorization, "orders");
  const customersCanEdit = hasModuleWriteCapability(authorization, "customers");
  const usersCanEdit = hasModuleWriteCapability(authorization, "users");
  const dealersCanEdit = hasModuleWriteCapability(authorization, "dealers");
  const erpCanManage = authorization.modules.some((module) =>
    module.actions.some((entry) => entry.permissionKey === "settings.write" && entry.decision === "allow")
  );
  // Generic mutation-capability lookup for panels that consume individual
  // MUTATION_PERMISSIONS keys (CRM promote/update, inventory write, content
  // write, email provider/template write). Never hardcoded to false.
  const can = useCallback(
    (permissionKey: string) =>
      authorization.modules.some((module) =>
        module.actions.some((entry) => entry.permissionKey === permissionKey && entry.decision === "allow")
      ),
    [authorization]
  );
  const controller = useDashboardData("cookie-session", {
    // Read transport stays read-only: reads tolerate per-module failures and
    // writes pass ONLY with the explicit allowWrite marker (granted upstream
    // by readOnlyAction). Panel write controls are gated by per-module
    // canEdit above; the server enforces the final write authorization.
    readOnly: true,
    actorKey: `${authorization.actor.id}:${authorization.contextRevision}`,
    onUnauthorized,
    p03Capabilities: {
      products: authorization.commonQueryV1.products.enabled,
      dealers: authorization.commonQueryV1.dealers.enabled
    },
    queryState,
    auditQueryState,
    asyncJobQueryState,
    asyncJobCapability: { enabled: authorization.asyncJobFoundationV1.enabled, sensitive: authorization.asyncJobFoundationV1.sensitive.enabled },
    mediaWriteCapability: mediaLocation ? authorization.mediaFoundationV1 : undefined,
    dataJobAuthorization: dataJobsLocation ? authorization : undefined,
    auditCapability: {
      enabled: authorization.auditFoundationV1.enabled,
      sensitive: authorization.auditFoundationV1.sensitive.enabled,
      globalLegacy: authorization.modules.find((module) => module.module === "audit")?.actions.some((action) => action.permissionKey === "audit_logs.read" && action.decision === "allow" && action.scope.kind === "global") === true
    }
  });
  const [filters, setFilters] = useState<QueueFilters>(() => ({ ...initialFilters, ...(activeTab in initialFilters ? { [activeTab]: activeFilter } : {}) }));
  const [pages, setPages] = useState<QueuePagination>(() => ({ ...initialPages, ...(activeTab in initialPages ? { [activeTab]: activePage } : {}) }));
  const [cmsLocale, setCmsLocale] = useState<SiteLocale>(locale);
  const [cmsSubTab, setCmsSubTab] = useState<CmsSubTab>("navigation");
  const [queryDraft, setQueryDraft] = useState(queryState?.q ?? "");
  const [userInput, setUserInput] = useState({ email: "", displayName: "", password: "", roleId: "" });
  const [roleInput, setRoleInput] = useState({ key: "", name: "" });

  const load = useCallback(() => controller.loadTab(activeTab, { filters, pages, cmsLocale }), [controller.loadTab, activeTab, filters, pages, cmsLocale]);
  useEffect(() => { if (!p06Location && !mediaLocation && !dataJobsLocation && !runtimeLocation && !analyticsLocation && !settingsLocation && !s02Location && !s08Location && !s09Location && !s10Location && !s03Location) void load(); }, [load, p06Location, mediaLocation, dataJobsLocation, runtimeLocation, analyticsLocation, settingsLocation, s02Location, s08Location, s09Location, s10Location, s03Location]);
  const state = controller.resourceStates[activeTab] ?? "idle";
  useEffect(() => {
    if (state !== "out-of-range" || queryState?.resource !== "products") return;
    const total = controller.meta.products?.total ?? 0;
    const lastPage = Math.max(1, Math.ceil(total / 25));
    const corrected = productQueryHref(window.location.pathname, { ...queryState, page: lastPage });
    if (corrected.kind === "valid") window.history.replaceState(window.history.state, "", corrected.canonicalHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [state, queryState, controller.meta.products]);
  const tabs = useMemo(() => foundation.modules.filter((entry) => entry.readAllowed).map((entry) => foundationModuleToLegacyTab(entry.module)), [foundation.modules]);

  const serviceAccountsManage = authorization.serviceAccountsV1.enabled && authorization.serviceAccountsV1.manage;

  if (s08Location) return <ApiServiceAccountsSettingsPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} capability={authorization.settingsCenterV1} serviceAccountsManage={serviceAccountsManage} locale={locale} location={s08Location} onUnauthorized={onUnauthorized} />;
  if (s03Location) return <CommerceSettingsPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} capability={authorization.settingsCenterV1} locale={locale} location={s03Location} onUnauthorized={onUnauthorized} />;
  if (s10Location) return <PrivacyRetentionSettingsPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} capability={authorization.settingsCenterV1} locale={locale} location={s10Location} onUnauthorized={onUnauthorized} />;
  if (s09Location) return <AuthRbacSettingsPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} capability={authorization.settingsCenterV1} locale={locale} location={s09Location} onUnauthorized={onUnauthorized} />;
  if (s02Location) return <GeneralStorefrontSettingsPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} capability={authorization.settingsCenterV1} locale={locale} location={s02Location} onUnauthorized={onUnauthorized} />;
  if (settingsLocation) return <SettingsFoundationPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} capability={authorization.settingsCenterV1} locale={locale} location={settingsLocation} onUnauthorized={onUnauthorized} />;
  if (analyticsLocation) return <AnalyticsFoundationPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} authorization={authorization} location={analyticsLocation} onUnauthorized={onUnauthorized} />;
  if (runtimeLocation) return <RuntimeFoundationPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} authorization={authorization} location={runtimeLocation} onUnauthorized={onUnauthorized} />;
  if (dataJobsLocation) return <DataJobsFoundationPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} dataJobRequest={controller.dataJobRequest} authorization={authorization} location={dataJobsLocation} onUnauthorized={onUnauthorized} />;
  if (mediaLocation && !authorization.mediaFoundationV1.enabled) return <section role="alert"><h2>媒体库能力已关闭</h2><p>当前严格媒体视图无法安全回退，且不会发出媒体请求。</p><button onClick={() => { window.history.replaceState(window.history.state, "", locale === "fr-CA" ? "/fr/dashboard/content" : "/dashboard/content"); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除视图</button></section>;
  if (mediaLocation) return <MediaFoundationPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiRequest={controller.apiRequest} capability={authorization.mediaFoundationV1} location={mediaLocation} mediaWriteRequest={controller.mediaWriteRequest} onUnauthorized={onUnauthorized} />;
  if (p06Location && (!authorization.workQueueFoundationV1.enabled || (p06Location.kind === "notifications" && !authorization.workQueueFoundationV1.notifications.enabled))) return <section role="alert"><h2>工作队列能力已关闭</h2><p>当前严格视图无法安全回退。请清除视图返回运营页面。</p><button onClick={() => { window.history.replaceState(window.history.state, "", window.location.pathname); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除视图</button></section>;
  if (activeTab === "overview") {
    return <OverviewWorkspacePanel apiFetch={controller.apiFetch} locale={locale} modules={foundation.modules} onNavigate={onNavigate} />;
  }
  if (activeTab === "operations" && p06Location) return <WorkQueueFoundationPanel actions={authorization.workQueueFoundationV1.actions} actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiFetch={controller.apiFetch} localePrefix={locale === "fr-CA" ? "/fr" : ""} location={p06Location} markRead={authorization.workQueueFoundationV1.notifications.markRead} sensitive={authorization.workQueueFoundationV1.sensitive.enabled} />;
  if (state === "idle" || state === "loading") return <section aria-busy="true" role="status"><h2>正在加载数据</h2><p>正在读取服务器数据。</p></section>;
  if (state === "query-unavailable") return <section role="alert"><h2>查询能力已关闭</h2><p>当前筛选无法安全回退到旧查询。请清除筛选，或刷新权限能力后重试。</p><button onClick={() => { window.history.replaceState(window.history.state, "", window.location.pathname); window.dispatchEvent(new PopStateEvent("popstate")); }} type="button">清除查询</button><button onClick={() => void load()} type="button">重试</button></section>;
  if (state === "forbidden" || state === "error" || state === "unavailable") return <section role="alert"><h2>{state === "forbidden" ? "没有读取权限" : state === "unavailable" ? "缓存数据已过期" : "数据暂时无法载入"}</h2><p>{state === "forbidden" ? "当前账户无权读取此模块。请联系管理员确认权限。" : state === "unavailable" ? "上次成功数据已超过 60 秒并已清除，请重试获取最新数据。" : "请检查网络后重试；如问题持续，请联系管理员。"}</p>{controller.resourceRequestIds[activeTab] ? <p className="dashboard-request-id">请求 ID：{controller.resourceRequestIds[activeTab]}</p> : null}<button onClick={() => void load()} type="button">重试</button></section>;
  if (state === "out-of-range") return <section role="status"><h2>页码超出范围</h2><p>数据总数已变化，正在等待返回最后一个有效页面。</p></section>;
  if (state === "exhausted" && activeTab === "auditLogs" && !controller.data.auditEvents.length) return <section role="status"><h2>没有更多审计事件</h2><p>当前游标之后没有可显示的数据。</p><button onClick={() => void controller.restartAuditQuery()} type="button">重新开始</button></section>;
  if (state === "exhausted" && !controller.data.dealers.length) return <section role="status"><h2>没有更多结果</h2><p>当前游标之后没有可显示的数据。</p><button onClick={() => void controller.restartDealerQuery()} type="button">重新开始</button></section>;

  const updateFilter = async (key: keyof QueueFilters, value: string) => {
    if (key !== activeTab) return;
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPages((current) => ({ ...current, [activeTab]: 1 }));
    window.history.pushState(window.history.state, "", dashboardQueueHref(activeTab, locale, value, 1));
  };
  const updatePage = async (key: keyof QueuePagination, page: number) => {
    if (queryState?.resource === "products" && activeTab === "products" && Number.isInteger(page) && page > 0) {
      const parsed = productQueryHref(window.location.pathname, { ...queryState, page });
      if (parsed.kind === "valid") window.history.pushState(window.history.state, "", parsed.canonicalHref);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    if (key !== activeTab || !Number.isInteger(page) || page < 1) return;
    setPages((current) => ({ ...current, [key]: page }));
    window.history.pushState(window.history.state, "", dashboardQueueHref(activeTab, locale, activeTab in filters ? filters[activeTab as keyof QueueFilters] : "", page));
  };
  const readOnlyAction = async (path: string, body: Record<string, unknown>, options: { method?: string }) => {
    const method = options.method ?? "POST";
    // Path-precise write gates (shared edit-gates registry): every write path
    // resolves ONLY against the owning module's own capability. products.write
    // never opens categories/pricing/inventory, categories.write never opens
    // products, and no grant generalizes to another module's paths. Unauthorized
    // writes are rejected client-side (no request is even issued) and the
    // server enforces the final authorization with 403 + audit.
    const productsPath = path === "/dashboard/products" || /^\/dashboard\/products\/[^/]+$/.test(path) || path.startsWith("/dashboard/skus");
    const categoriesPath = path === "/dashboard/categories" || /^\/dashboard\/categories\/[^/]+$/.test(path);
    const pricingPath = path === "/dashboard/pricing" || /^\/dashboard\/pricing\/[^/]+$/.test(path);
    const inventoryPath = path === "/dashboard/inventory" || path.startsWith("/dashboard/inventory/");
    const promotionsPath = path === "/dashboard/promotions" || /^\/dashboard\/promotions\/[^/]+$/.test(path);
    const promotionsArchive = method === "DELETE" && /^\/dashboard\/promotions\/[^/]+$/.test(path);
    const ordersPath = path.startsWith("/dashboard/orders");
    const crmPath = path.startsWith("/dashboard/crm/contacts");
    const usersPath = path.startsWith("/dashboard/users");
    const dealersPath = path.startsWith("/dashboard/dealers") || path.startsWith("/dashboard/dealer-locations");
    const editableGrant =
      (ordersPath && ordersCanEdit) ||
      (crmPath && customersCanEdit) ||
      (usersPath && usersCanEdit) ||
      (dealersPath && dealersCanEdit) ||
      (categoriesPath && categoriesCanEdit) ||
      (productsPath && productsCanEdit) ||
      (pricingPath && pricingCanEdit) ||
      (inventoryPath && inventoryCanEdit) ||
      (promotionsPath && promotionsCanEdit);
    const erpLinkUnlink = method === "DELETE" && /^\/dashboard\/dealers\/[^/]+\/erp-links\/[^/]+$/.test(path);
    if (editableGrant && (method === "PATCH" || method === "POST" || (erpLinkUnlink && dealersCanEdit) || (promotionsArchive && promotionsCanEdit))) {
      await controller.apiFetch(path, { method, body: JSON.stringify(body), allowWrite: true } as RequestInit & { allowWrite: boolean });
      return;
    }
    assertReadOnlyMethod(method);
  };
  const navigateQuery = (next: DashboardP03QueryState) => {
    const path = window.location.pathname;
    const parsed = next.resource === "products"
      ? productQueryHref(path, next)
      : parseDashboardP03Location(path, new URLSearchParams({ ...(next.q ? { q: next.q } : {}), ...(next.dealerStatus ? { dealerStatus: next.dealerStatus } : {}) }).toString());
    if (parsed.kind !== "valid") return;
    window.history.pushState(window.history.state, "", parsed.canonicalHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const commitQuery = (nextQuery: string) => {
    if (!queryState) return;
    navigateQuery(queryState.resource === "products" ? { ...queryState, q: nextQuery, page: 1 } : { ...queryState, q: nextQuery });
  };

  if (activeTab === "operations" && asyncJobQueryState && authorization.asyncJobFoundationV1.enabled) return <AsyncJobsFoundationPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} adapters={controller.data.legacyJobAdapters} adapterState={controller.asyncJobAdapterState} apiFetch={controller.apiFetch} capturedAt={controller.resourceCapturedAt.operations} hasNext={controller.hasNextAsyncJobPage} hasPrevious={controller.hasPreviousAsyncJobPage} jobs={controller.data.asyncJobs} onNavigate={(next) => navigateAsyncJobState(window.location.pathname, next)} onNext={controller.loadNextAsyncJobPage} onPrevious={controller.loadPreviousAsyncJobPage} onRestart={controller.restartAsyncJobQuery} query={asyncJobQueryState} sensitive={authorization.asyncJobFoundationV1.sensitive.enabled} state={state} />;
  if (activeTab === "auditLogs" && auditQueryState && authorization.auditFoundationV1.enabled) return <AuditFoundationPanel actorKey={`${authorization.actor.id}:${authorization.contextRevision}`} apiFetch={controller.apiFetch} capturedAt={controller.resourceCapturedAt.auditLogs} events={controller.data.auditEvents} hasNext={controller.hasNextAuditPage} hasPrevious={controller.hasPreviousAuditPage} onNavigate={(next) => navigateAuditState(window.location.pathname, next)} onNext={controller.loadNextAuditPage} onPrevious={controller.loadPreviousAuditPage} onRestart={controller.restartAuditQuery} query={auditQueryState} sensitive={authorization.auditFoundationV1.sensitive.enabled} state={state} />;
  return <section aria-busy={state === "refreshing"} aria-label="业务数据">
    <p role="status">资源状态：{state === "partial" ? "部分数据不可用" : state === "refreshing" ? "正在刷新" : state === "stale" ? `显示 ${controller.resourceCapturedAt[activeTab] ?? "未知时间"} 的缓存数据，请重试刷新` : state === "filtered-empty" ? "筛选结果为空" : state === "empty" ? "暂无数据" : state === "exhausted" ? "没有更多结果" : "已加载"}</p>
    {queryState ? <form onSubmit={(event) => { event.preventDefault(); commitQuery(queryDraft); }}><label>搜索<input onChange={(event) => setQueryDraft(event.target.value)} type="search" value={queryDraft} /></label><button type="submit">应用</button>{queryState.q ? <button onClick={() => { setQueryDraft(""); commitQuery(""); }} type="button">清除</button> : null}</form> : null}
    {queryState?.resource === "products" ? <div><label>产品状态<select onChange={(event) => navigateQuery({ ...queryState, productStatus: event.target.value as typeof queryState.productStatus, page: 1 })} value={queryState.productStatus}><option value="">全部</option><option value="draft">草稿</option><option value="active">启用</option><option value="archived">归档</option></select></label><label>分类<select onChange={(event) => navigateQuery({ ...queryState, categoryId: event.target.value, page: 1 })} value={queryState.categoryId}><option value="">全部</option>{controller.data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>排序<select onChange={(event) => navigateQuery({ ...queryState, sort: event.target.value as typeof queryState.sort, page: 1 })} value={queryState.sort}><option value="createdAt">创建时间</option><option value="name">名称</option><option value="status">状态</option></select></label><label>方向<select onChange={(event) => navigateQuery({ ...queryState, direction: event.target.value as typeof queryState.direction, page: 1 })} value={queryState.direction}><option value="desc">降序</option><option value="asc">升序</option></select></label></div> : null}
    {queryState?.resource === "dealers" ? <label>Dealer 状态<select onChange={(event) => navigateQuery({ ...queryState, dealerStatus: event.target.value as typeof queryState.dealerStatus })} value={queryState.dealerStatus}><option value="">全部</option><option value="active">启用</option><option value="inactive">停用</option></select></label> : null}
    {queryState?.resource === "products" ? <div><button disabled={queryState.page <= 1} onClick={() => void updatePage("orders", queryState.page - 1)} type="button">上一页</button><span>第 {queryState.page} / {controller.meta.products?.totalPages ?? 1} 页</span><button disabled={queryState.page >= (controller.meta.products?.totalPages ?? 1)} onClick={() => void updatePage("orders", queryState.page + 1)} type="button">下一页</button></div> : null}
    {queryState?.resource === "dealers" ? <div><button disabled={!controller.hasPreviousDealerPage} onClick={() => void controller.loadPreviousDealerPage()} type="button">上一页</button><button disabled={!controller.hasNextDealerPage} onClick={() => void controller.loadNextDealerPage()} type="button">下一页</button>{state === "exhausted" ? <button onClick={() => void controller.restartDealerQuery()} type="button">重新开始</button> : null}</div> : null}
    <DashboardPanelRouter
      categoriesCanEdit={categoriesCanEdit}
      customersCanEdit={customersCanEdit}
      dealersCanEdit={dealersCanEdit}
      erpCanManage={erpCanManage}
      inventoryCanEdit={inventoryCanEdit}
      ordersCanEdit={ordersCanEdit}
      ordersDealersDegraded={activeTab === "orders" && state === "partial"}
      pricingCanEdit={pricingCanEdit}
      productsCanEdit={productsCanEdit}
      promotionsCanEdit={promotionsCanEdit}
      usersCanEdit={usersCanEdit}
      activeTab={activeTab}
      apiFetch={controller.apiFetch}
      can={can}
      cmsLocale={cmsLocale}
      cmsSubTab={cmsSubTab}
      copy={copy}
      crmSearch=""
      data={controller.data}
      loadTab={controller.loadTab}
      locale={locale}
      meta={controller.meta}
      onAction={readOnlyAction}
      onNavigateAlert={() => undefined}
      onReload={load}
      pages={pages}
      queueFilters={filters}
      roleInput={roleInput}
      setCmsLocale={setCmsLocale}
      setCmsSubTab={setCmsSubTab}
      setRoleInput={setRoleInput}
      setUserInput={setUserInput}
      tabs={tabs}
      updateCrmSearch={async () => undefined}
      updatePage={updatePage}
      updateQueueFilter={updateFilter}
      userInput={userInput}
    />
  </section>;
}
