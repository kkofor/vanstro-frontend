"use client";

import { useCallback, useRef, useState } from "react";
import { DASHBOARD_API_BASE_URL, withQuery } from "@/lib/dashboard/api";
import type {
  AdminUser,
  Category,
  DashboardData,
  DashboardStats,
  PageMeta,
  PaginatedResult,
  Price,
  Product,
  Promotion,
  QueueFilters,
  QueuePagination,
  Role,
  TabKey
} from "@/lib/dashboard/types";

type ApiEnvelope<T> = { data: T; meta?: PageMeta };

const emptyData: DashboardData = {
  categories: [],
  products: [],
  pricing: [],
  promotions: [],
  users: [],
  roles: [],
  dealers: [],
  dealerApplications: [],
  contactLeads: [],
  crmContacts: [],
  productReviews: [],
  supportHandoffs: [],
  orders: [],
  paymentSessions: [],
  erpSyncJobs: [],
  inventorySnapshots: [],
  operationAlerts: [],
  analyticsSummary: null,
  emailOutbox: [],
  emailTemplates: [],
  emailProvider: null,
  auditLogs: [],
  legalPages: [],
  articles: [],
  cmsNavigation: null,
  cmsHomePage: null,
  cmsFooter: null,
  cmsCatalogConfig: null,
  cmsStorefrontConfig: null,
  moduleReadiness: null
};

const defaultMeta: PageMeta = { page: 1, pageSize: 50, total: 0, totalPages: 0 };

function emptyStats(): DashboardStats {
  return {
    products: 0,
    categories: 0,
    prices: 0,
    promotions: 0,
    users: 0,
    dealers: 0,
    applications: 0,
    leads: 0,
    crmContacts: 0,
    reviews: 0,
    opsAlerts: 0,
    orders: 0
  };
}

async function fetchJson<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DASHBOARD_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload ? payload.error : `HTTP ${response.status}`;
    throw new Error(message ?? `HTTP ${response.status}`);
  }
  return payload as T;
}

async function fetchData<T>(token: string, path: string) {
  const payload = await fetchJson<ApiEnvelope<T>>(token, path);
  return payload.data;
}

async function fetchPaginated<T>(token: string, path: string) {
  const payload = await fetchJson<ApiEnvelope<T>>(token, path);
  return {
    data: payload.data,
    meta: payload.meta ?? defaultMeta
  } satisfies PaginatedResult<T>;
}

export function useDashboardData(token: string) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [meta, setMeta] = useState<Record<string, PageMeta>>({});
  const [loading, setLoading] = useState(false);
  const activeTabRef = useRef<TabKey>("products");

  const apiFetch = useCallback(
    async <T,>(path: string, init?: RequestInit) => {
      if (!token) throw new Error("Not authenticated");
      return fetchJson<T>(token, path, init);
    },
    [token]
  );

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const alerts = await fetchData<typeof data.operationAlerts>(token, "/dashboard/operations/alerts");
      setStats((current) => ({ ...current, opsAlerts: alerts.length }));
      setData((current) => ({ ...current, operationAlerts: alerts }));
    } catch {
      // stats are best-effort
    }
  }, [token]);

  const loadTab = useCallback(
    async (
      tab: TabKey,
      options?: {
        filters?: Partial<QueueFilters>;
        pages?: Partial<QueuePagination>;
        cmsLocale?: string;
        crmQuery?: string;
      }
    ) => {
      if (!token) return;
      activeTabRef.current = tab;
      setLoading(true);

      const filters = options?.filters;
      const pages = options?.pages ?? {};

      try {
        switch (tab) {
          case "products": {
            const [categories, products, pricing] = await Promise.all([
              fetchData<Category[]>(token, "/dashboard/categories"),
              fetchData<Product[]>(token, "/dashboard/products"),
              fetchData<Price[]>(token, "/dashboard/pricing")
            ]);
            setData((current) => ({ ...current, categories, products, pricing }));
            setStats((current) => ({
              ...current,
              products: products.length,
              categories: categories.length,
              prices: pricing.length
            }));
            break;
          }
          case "categories": {
            const categories = await fetchData<typeof data.categories>(token, "/dashboard/categories");
            setData((current) => ({ ...current, categories }));
            setStats((current) => ({ ...current, categories: categories.length }));
            break;
          }
          case "pricing": {
            const [products, pricing] = await Promise.all([
              fetchData<Product[]>(token, "/dashboard/products"),
              fetchData<Price[]>(token, "/dashboard/pricing")
            ]);
            setData((current) => ({ ...current, products, pricing }));
            setStats((current) => ({ ...current, prices: pricing.length }));
            break;
          }
          case "promotions": {
            const promotions = await fetchData<typeof data.promotions>(token, "/dashboard/promotions");
            setData((current) => ({ ...current, promotions }));
            setStats((current) => ({ ...current, promotions: promotions.length }));
            break;
          }
          case "users": {
            const [users, roles] = await Promise.all([
              fetchData<AdminUser[]>(token, "/dashboard/users"),
              fetchData<Role[]>(token, "/dashboard/roles")
            ]);
            setData((current) => ({ ...current, users, roles }));
            setStats((current) => ({ ...current, users: users.length }));
            break;
          }
          case "roles": {
            const roles = await fetchData<typeof data.roles>(token, "/dashboard/roles");
            setData((current) => ({ ...current, roles }));
            break;
          }
          case "dealers": {
            const dealers = await fetchData<typeof data.dealers>(token, "/dashboard/dealers");
            setData((current) => ({ ...current, dealers }));
            setStats((current) => ({ ...current, dealers: dealers.length }));
            break;
          }
          case "dealerApplications": {
            const result = await fetchPaginated<typeof data.dealerApplications>(
              token,
              withQuery("/dashboard/dealer-applications", {
                status: filters?.dealerApplications,
                page: pages.dealerApplications ?? 1,
                pageSize: 50
              })
            );
            setData((current) => ({ ...current, dealerApplications: result.data }));
            setMeta((current) => ({ ...current, dealerApplications: result.meta }));
            setStats((current) => ({ ...current, applications: result.meta.total }));
            break;
          }
          case "crmContacts": {
            const result = await fetchPaginated<typeof data.crmContacts>(
              token,
              withQuery("/dashboard/crm/contacts", {
                stage: filters?.crmContacts,
                q: options?.crmQuery,
                page: pages.crmContacts ?? 1,
                pageSize: 50
              })
            );
            setData((current) => ({ ...current, crmContacts: result.data }));
            setMeta((current) => ({ ...current, crmContacts: result.meta }));
            setStats((current) => ({ ...current, crmContacts: result.meta.total }));
            break;
          }
          case "contactLeads": {
            const [result, users, dealers] = await Promise.all([
              fetchPaginated<typeof data.contactLeads>(
                token,
                withQuery("/dashboard/contact-leads", {
                  status: filters?.contactLeads,
                  page: pages.contactLeads ?? 1,
                  pageSize: 50
                })
              ),
              fetchData<typeof data.users>(token, "/dashboard/users").catch(() => []),
              fetchData<typeof data.dealers>(token, "/dashboard/dealers").catch(() => [])
            ]);
            setData((current) => ({ ...current, contactLeads: result.data, users, dealers }));
            setMeta((current) => ({ ...current, contactLeads: result.meta }));
            setStats((current) => ({ ...current, leads: result.meta.total }));
            break;
          }
          case "productReviews": {
            const result = await fetchPaginated<typeof data.productReviews>(
              token,
              withQuery("/dashboard/product-reviews", {
                status: filters?.productReviews,
                page: pages.productReviews ?? 1,
                pageSize: 50
              })
            );
            setData((current) => ({ ...current, productReviews: result.data }));
            setMeta((current) => ({ ...current, productReviews: result.meta }));
            setStats((current) => ({ ...current, reviews: result.meta.total }));
            break;
          }
          case "supportHandoffs": {
            const result = await fetchPaginated<typeof data.supportHandoffs>(
              token,
              withQuery("/dashboard/support/handoffs", {
                status: filters?.supportHandoffs,
                page: pages.supportHandoffs ?? 1,
                pageSize: 50
              })
            );
            setData((current) => ({ ...current, supportHandoffs: result.data }));
            setMeta((current) => ({ ...current, supportHandoffs: result.meta }));
            break;
          }
          case "orders": {
            const [result, dealers] = await Promise.all([
              fetchPaginated<typeof data.orders>(
                token,
                withQuery("/dashboard/orders", {
                  status: filters?.orders,
                  page: pages.orders ?? 1,
                  pageSize: 50
                })
              ),
              fetchData<typeof data.dealers>(token, "/dashboard/dealers").catch(() => [])
            ]);
            setData((current) => ({ ...current, orders: result.data, dealers }));
            setMeta((current) => ({ ...current, orders: result.meta }));
            setStats((current) => ({ ...current, orders: result.meta.total }));
            break;
          }
          case "paymentSessions": {
            const result = await fetchPaginated<typeof data.paymentSessions>(
              token,
              withQuery("/dashboard/payment-sessions", {
                page: pages.paymentSessions ?? 1,
                pageSize: 50
              })
            );
            setData((current) => ({ ...current, paymentSessions: result.data }));
            setMeta((current) => ({ ...current, paymentSessions: result.meta }));
            break;
          }
          case "erpSyncJobs": {
            const result = await fetchPaginated<typeof data.erpSyncJobs>(
              token,
              withQuery("/dashboard/erp-sync-jobs", {
                status: filters?.erpSyncJobs,
                page: pages.erpSyncJobs ?? 1,
                pageSize: 50
              })
            );
            setData((current) => ({ ...current, erpSyncJobs: result.data }));
            setMeta((current) => ({ ...current, erpSyncJobs: result.meta }));
            break;
          }
          case "inventorySnapshots": {
            const [result, dealers] = await Promise.all([
              fetchPaginated<typeof data.inventorySnapshots>(
                token,
                withQuery("/dashboard/inventory/snapshots", {
                  page: pages.inventorySnapshots ?? 1,
                  pageSize: 50
                })
              ),
              fetchData<typeof data.dealers>(token, "/dashboard/dealers").catch(() => [])
            ]);
            setData((current) => ({ ...current, inventorySnapshots: result.data, dealers }));
            setMeta((current) => ({ ...current, inventorySnapshots: result.meta }));
            break;
          }
          case "cms": {
            const locale = options?.cmsLocale ?? "en-CA";
            const [navigation, homePage, footer, catalogConfig, storefrontConfig, readiness, legalPages, articles] =
              await Promise.all([
                fetchData(token, withQuery("/dashboard/navigation", { locale })).catch(() => null),
                fetchData(token, withQuery("/dashboard/home-page", { locale })).catch(() => null),
                fetchData(token, withQuery("/dashboard/footer", { locale })).catch(() => null),
                fetchData(token, "/dashboard/catalog").catch(() => null),
                fetchData(token, "/dashboard/storefront/config").catch(() => null),
                fetchData(token, "/dashboard/modules/readiness").catch(() => null),
                fetchData<typeof data.legalPages>(token, "/dashboard/legal-pages").catch(() => []),
                fetchData<typeof data.articles>(token, "/dashboard/articles").catch(() => [])
              ]);
            setData((current) => ({
              ...current,
              cmsNavigation: navigation,
              cmsHomePage: homePage,
              cmsFooter: footer,
              cmsCatalogConfig: catalogConfig,
              cmsStorefrontConfig: storefrontConfig,
              moduleReadiness: readiness,
              legalPages,
              articles
            }));
            break;
          }
          case "operations": {
            const [alerts, analyticsSummary] = await Promise.all([
              fetchData<typeof data.operationAlerts>(token, "/dashboard/operations/alerts").catch(() => []),
              fetchData<NonNullable<typeof data.analyticsSummary>>(token, "/dashboard/analytics/summary").catch(
                () => null
              )
            ]);
            setData((current) => ({ ...current, operationAlerts: alerts, analyticsSummary }));
            setStats((current) => ({ ...current, opsAlerts: alerts.length }));
            break;
          }
          case "emailOutbox": {
            const [outbox, templates, emailProvider] = await Promise.all([
              fetchPaginated<typeof data.emailOutbox>(
                token,
                withQuery("/dashboard/email/outbox", { page: pages.emailOutbox ?? 1, pageSize: 50 })
              ).catch(() => ({ data: [] as typeof data.emailOutbox, meta: defaultMeta })),
              fetchData<typeof data.emailTemplates>(token, "/dashboard/email/templates").catch(() => []),
              fetchData<NonNullable<typeof data.emailProvider>>(token, "/dashboard/email/provider").catch(() => null)
            ]);
            setData((current) => ({
              ...current,
              emailOutbox: outbox.data,
              emailTemplates: templates,
              emailProvider
            }));
            setMeta((current) => ({ ...current, emailOutbox: outbox.meta }));
            break;
          }
          case "auditLogs": {
            const result = await fetchPaginated<typeof data.auditLogs>(
              token,
              withQuery("/dashboard/audit-logs", { page: pages.auditLogs ?? 1, pageSize: 50 })
            );
            setData((current) => ({ ...current, auditLogs: result.data }));
            setMeta((current) => ({ ...current, auditLogs: result.meta }));
            break;
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const reloadActiveTab = useCallback(
    async (
      filters?: Partial<QueueFilters>,
      pages?: Partial<QueuePagination>,
      cmsLocale?: string,
      crmQuery?: string
    ) => {
      await loadTab(activeTabRef.current, { filters, pages, cmsLocale, crmQuery });
      await loadStats();
    },
    [loadTab, loadStats]
  );

  return {
    data,
    stats,
    meta,
    loading,
    setLoading,
    loadTab,
    loadStats,
    reloadActiveTab,
    apiFetch,
    setActiveTabRef: (tab: TabKey) => {
      activeTabRef.current = tab;
    }
  };
}
