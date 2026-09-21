"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { MUTATION_PERMISSIONS } from "@/lib/dashboard/tab-permissions";
import { dashboardHref } from "@/lib/dashboard/routes";
import type { CmsSubTab, QueueFilters, QueuePagination, TabKey } from "@/lib/dashboard/types";
import type { DashboardCopy } from "@/lib/i18n/dashboard-copy";
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
import { ErpApiOverviewPanel } from "./ErpApiOverviewPanel";
import { ErpOperationsPanel } from "./ErpOperationsPanel";
import { ErpSyncProductsPanel } from "./ErpSyncProductsPanel";
import { useDashboardData } from "./hooks/useDashboardData";

const emptyMeta = { page: 1, pageSize: 50, total: 0, totalPages: 0 };

type DashboardDataController = ReturnType<typeof useDashboardData>;
type ActionHandler = (
  path: string,
  body: Record<string, unknown>,
  options: { method?: string; success: string }
) => Promise<void>;

type LegacyDashboardPanelRouterProps = {
  activeTab: TabKey;
  categoriesCanEdit?: boolean;
  inventoryCanEdit?: boolean;
  pricingCanEdit?: boolean;
  productsCanEdit?: boolean;
  ordersCanEdit?: boolean;
  ordersDealersDegraded?: boolean;
  customersCanEdit?: boolean;
  usersCanEdit?: boolean;
  dealersCanEdit?: boolean;
  promotionsCanEdit?: boolean;
  erpCanManage?: boolean;
  apiFetch: DashboardDataController["apiFetch"];
  can: (permission: string) => boolean;
  cmsLocale: SiteLocale;
  cmsSubTab: CmsSubTab;
  copy: DashboardCopy;
  crmSearch: string;
  data: DashboardDataController["data"];
  loadTab: DashboardDataController["loadTab"];
  locale: SiteLocale;
  meta: DashboardDataController["meta"];
  onAction: ActionHandler;
  onNavigateAlert: (alertKey: string) => void;
  onReload: () => Promise<void>;
  pages: QueuePagination;
  queueFilters: QueueFilters;
  roleInput: { key: string; name: string };
  setCmsLocale: Dispatch<SetStateAction<SiteLocale>>;
  setCmsSubTab: Dispatch<SetStateAction<CmsSubTab>>;
  setRoleInput: Dispatch<SetStateAction<{ key: string; name: string }>>;
  setUserInput: Dispatch<SetStateAction<{ email: string; displayName: string; password: string; roleId: string }>>;
  tabs: TabKey[];
  updateCrmSearch: (value: string) => Promise<void>;
  updatePage: (key: keyof QueuePagination, page: number) => Promise<void>;
  updateQueueFilter: (key: keyof QueueFilters, value: string) => Promise<void>;
  userInput: { email: string; displayName: string; password: string; roleId: string };
};

type DashboardPanelRouterProps = LegacyDashboardPanelRouterProps & { readOnly?: boolean };

/** Single active-tab dispatch boundary shared by both Dashboard presenters. */
export function DashboardPanelRouter(props: DashboardPanelRouterProps) {
  const {
    activeTab,
    apiFetch,
    can,
    cmsLocale,
    cmsSubTab,
    copy,
    crmSearch,
    data,
    loadTab,
    locale,
    meta,
    onAction,
    onNavigateAlert,
    onReload: reload,
    pages,
    queueFilters,
    roleInput,
    setCmsLocale,
    setCmsSubTab,
    setRoleInput,
    setUserInput,
    tabs,
    updateCrmSearch,
    updatePage,
    updateQueueFilter,
    userInput
  } = props;

  // Per-module edit gates: modules with a write capability derive their
  // readOnly presentation from the module's OWN canEdit flag; modules
  // without a write capability stay read-only (fail-closed default). No
  // grant in one module ever opens another.
  const readOnlyFor = (canEdit: boolean | undefined) => !(canEdit === true);

  return (
    <>
      {activeTab === "overview" ? (
        <div className="dashboard-overview">
          <div className="dashboard-panel-header">
            <div>
              <h2>{locale === "fr-CA" ? "Vue d’ensemble" : "Overview"}</h2>
              <p>{locale === "fr-CA" ? "État actuel du catalogue, des commandes et des files opérationnelles." : "Current catalog, commerce, customer, and operations status."}</p>
            </div>
          </div>
          <div className="dashboard-overview-links">
            {tabs.filter((tab) => tab !== "overview").map((tab) => (
              <Link href={dashboardHref(tab, locale)} key={tab}>{tab === "settings" ? (locale === "fr-CA" ? "Paramètres" : "Settings") : copy.tabs[tab as keyof typeof copy.tabs]}</Link>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "products" ? (
        <>
          <ProductsPanel canEdit={props.productsCanEdit} readOnly={readOnlyFor(props.productsCanEdit)} apiFetch={apiFetch} categories={data.categories} copy={copy} locale={locale} onAction={onAction} onReload={reload} products={data.products} />
          <ErpSyncProductsPanel canEdit={props.productsCanEdit} readOnly={readOnlyFor(props.productsCanEdit)} apiFetch={props.apiFetch} copy={copy} locale={locale} onReload={reload} />
        </>
      ) : null}
      {activeTab === "categories" ? <CategoriesPanel canEdit={props.categoriesCanEdit === true} apiFetch={props.apiFetch} categories={data.categories} copy={copy} onAction={onAction} onReload={reload} /> : null}
      {activeTab === "pricing" ? <PricingPanel canEdit={props.pricingCanEdit === true} readOnly={readOnlyFor(props.pricingCanEdit)} copy={copy} locale={locale} onAction={onAction} onReload={reload} prices={data.pricing} products={data.products} /> : null}
      {activeTab === "promotions" ? <PromotionsPanel canEdit={props.promotionsCanEdit} readOnly={readOnlyFor(props.promotionsCanEdit)} copy={copy} onAction={onAction} onReload={reload} promotions={data.promotions} /> : null}

      {activeTab === "users" ? (
        <UsersPanel
          canEdit={props.usersCanEdit}
          readOnly={readOnlyFor(props.usersCanEdit)}
          copy={copy}
          input={userInput}
          onChange={setUserInput}
          onSubmit={() => void onAction("/dashboard/users", { email: userInput.email, displayName: userInput.displayName, password: userInput.password, roleIds: userInput.roleId ? [userInput.roleId] : [] }, { success: copy.messages.adminUserCreated })}
          onAction={onAction}
          onReload={reload}
          roles={data.roles}
          users={data.users}
          apiFetch={props.apiFetch}
        />
      ) : null}
      {activeTab === "roles" ? <RolesPanel readOnly={props.readOnly ?? true} copy={copy} input={roleInput} onChange={setRoleInput} onSubmit={() => void onAction("/dashboard/roles", roleInput, { success: copy.messages.roleCreated })} roles={data.roles} /> : null}
      {activeTab === "dealers" ? <DealersPanel apiFetch={props.apiFetch} canEdit={props.dealersCanEdit} locale={props.locale} onAction={onAction} onReload={reload} readOnly={readOnlyFor(props.dealersCanEdit)} copy={copy} dealers={data.dealers} /> : null}

      {activeTab === "dealerApplications" ? (
        <DealerApplicationsPanel readOnly={props.readOnly ?? true} apiFetch={apiFetch} applications={data.dealerApplications} copy={copy} locale={locale} meta={meta.dealerApplications ?? emptyMeta} onAction={onAction} onFilterChange={(value) => void updateQueueFilter("dealerApplications", value)} onPageChange={(page) => void updatePage("dealerApplications", page)} onReload={reload} page={pages.dealerApplications} statusFilter={queueFilters.dealerApplications} />
      ) : null}
      {activeTab === "contactLeads" ? (
        <ContactLeadsPanel readOnly={props.readOnly ?? true} apiFetch={apiFetch} copy={copy} dealers={data.dealers} leads={data.contactLeads} locale={locale} meta={meta.contactLeads ?? emptyMeta} onAction={onAction} onFilterChange={(value) => void updateQueueFilter("contactLeads", value)} onPageChange={(page) => void updatePage("contactLeads", page)} onReload={reload} page={pages.contactLeads} statusFilter={queueFilters.contactLeads} users={data.users} />
      ) : null}
      {activeTab === "crmContacts" ? (
        <CrmContactsPanel canEdit={props.customersCanEdit} readOnly={readOnlyFor(props.customersCanEdit)} apiFetch={apiFetch} canPromote={can(MUTATION_PERMISSIONS.crmPromote)} canUpdate={can(MUTATION_PERMISSIONS.crmUpdate)} contacts={data.crmContacts} copy={copy} locale={locale} meta={meta.crmContacts ?? emptyMeta} onAction={onAction} onFilterChange={(value) => void updateQueueFilter("crmContacts", value)} onPageChange={(page) => void updatePage("crmContacts", page)} onReload={reload} page={pages.crmContacts} statusFilter={queueFilters.crmContacts} />
      ) : null}
      {activeTab === "productReviews" ? (
        <ProductReviewsPanel readOnly={props.readOnly ?? true} apiFetch={apiFetch} copy={copy} locale={locale} meta={meta.productReviews ?? emptyMeta} onAction={onAction} onFilterChange={(value) => void updateQueueFilter("productReviews", value)} onPageChange={(page) => void updatePage("productReviews", page)} onReload={reload} page={pages.productReviews} reviews={data.productReviews} statusFilter={queueFilters.productReviews} />
      ) : null}
      {activeTab === "supportHandoffs" ? (
        <SupportHandoffsPanel readOnly={props.readOnly ?? true} copy={copy} handoffs={data.supportHandoffs} locale={locale} meta={meta.supportHandoffs ?? emptyMeta} onAction={onAction} onFilterChange={(value) => void updateQueueFilter("supportHandoffs", value)} onPageChange={(page) => void updatePage("supportHandoffs", page)} onReload={reload} page={pages.supportHandoffs} statusFilter={queueFilters.supportHandoffs} />
      ) : null}
      {activeTab === "orders" ? (
        <OrdersPanel canEdit={props.ordersCanEdit} dealersDegraded={props.ordersDealersDegraded === true} readOnly={readOnlyFor(props.ordersCanEdit)} apiFetch={apiFetch} copy={copy} dealers={data.dealers} locale={locale} meta={meta.orders ?? emptyMeta} onAction={onAction} onFilterChange={(value) => void updateQueueFilter("orders", value)} onPageChange={(page) => void updatePage("orders", page)} onReload={reload} orders={data.orders} page={pages.orders} statusFilter={queueFilters.orders} />
      ) : null}
      {activeTab === "paymentSessions" ? (
        <PaymentSessionsPanel readOnly={props.readOnly ?? true} copy={copy} locale={locale} meta={meta.paymentSessions ?? emptyMeta} onAction={onAction} onPageChange={(page) => void updatePage("paymentSessions", page)} onReload={reload} page={pages.paymentSessions} sessions={data.paymentSessions} />
      ) : null}
      {activeTab === "erpSyncJobs" ? (
        <>
          <ErpSyncJobsPanel apiFetch={props.apiFetch} readOnly={props.readOnly ?? true} copy={copy} jobs={data.erpSyncJobs} locale={locale} meta={meta.erpSyncJobs ?? emptyMeta} onAction={onAction} onFilterChange={(value) => void updateQueueFilter("erpSyncJobs", value)} onPageChange={(page) => void updatePage("erpSyncJobs", page)} onReload={reload} page={pages.erpSyncJobs} statusFilter={queueFilters.erpSyncJobs} />
          <ErpApiOverviewPanel apiBaseUrl={`${DASHBOARD_API_BASE_URL}/integrations/erp`} copy={copy} />
          {(props.erpCanManage ?? can("settings.write")) ? <ErpOperationsPanel apiFetch={props.apiFetch} copy={copy} /> : null}
        </>
      ) : null}
      {activeTab === "inventorySnapshots" ? (
        <InventorySnapshotsPanel readOnly={readOnlyFor(props.inventoryCanEdit)} canWrite={can(MUTATION_PERMISSIONS.inventoryWrite)} copy={copy} dealers={data.dealers} locale={locale} meta={meta.inventorySnapshots ?? emptyMeta} onAction={onAction} onPageChange={(page) => void updatePage("inventorySnapshots", page)} onReload={reload} page={pages.inventorySnapshots} products={data.products} snapshots={data.inventorySnapshots} />
      ) : null}
      {activeTab === "cms" ? (
        <CmsPanel readOnly={props.readOnly ?? true} apiFetch={apiFetch} articles={data.articles} canWrite={can(MUTATION_PERMISSIONS.contentWrite)} cmsCatalogConfig={data.cmsCatalogConfig} cmsFooter={data.cmsFooter} cmsHomePage={data.cmsHomePage} cmsLocale={cmsLocale} cmsNavigation={data.cmsNavigation} cmsStorefrontConfig={data.cmsStorefrontConfig} cmsSubTab={cmsSubTab} copy={copy} legalPages={data.legalPages} moduleReadiness={data.moduleReadiness} onAction={onAction} onLocaleChange={(value) => { setCmsLocale(value); void loadTab("cms", { cmsLocale: value }); }} onReload={reload} onSubTabChange={setCmsSubTab} />
      ) : null}
      {activeTab === "operations" ? <OperationsPanel readOnly={props.readOnly ?? true} alerts={data.operationAlerts} analyticsSummary={data.analyticsSummary} copy={copy} onNavigateAlert={onNavigateAlert} /> : null}
      {activeTab === "emailOutbox" ? (
        <EmailOutboxPanel readOnly={props.readOnly ?? true} canWriteProvider={can(MUTATION_PERMISSIONS.emailProviderWrite)} canWriteTemplates={can(MUTATION_PERMISSIONS.emailTemplatesWrite)} copy={copy} emailProvider={data.emailProvider} items={data.emailOutbox} locale={locale} meta={meta.emailOutbox ?? emptyMeta} onAction={onAction} onPageChange={(page) => void updatePage("emailOutbox", page)} onReload={reload} page={pages.emailOutbox} templates={data.emailTemplates} />
      ) : null}
      {activeTab === "auditLogs" ? <AuditLogsPanel readOnly={props.readOnly ?? true} copy={copy} locale={locale} logs={data.auditLogs} meta={meta.auditLogs ?? emptyMeta} onPageChange={(page) => void updatePage("auditLogs", page)} page={pages.auditLogs} /> : null}
    </>
  );
}
