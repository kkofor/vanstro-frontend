"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { DASHBOARD_API_BASE_URL, withQuery } from "@/lib/dashboard/api";
import { assertReadOnlyMethod } from "@/lib/dashboard/f0-shell";
import { executeMediaWrite, type MediaWriteOperation } from "@/lib/dashboard/p07-media-write";
import { deriveDataJobPermissionGates } from "@/lib/dashboard/p08-data-jobs";
import { executeDataJobOperation, type DataJobOperation } from "@/lib/dashboard/p08-data-jobs-transport";
import type { DashboardAuthorization } from "@/lib/api/api-contract";
import { classifyAuditRows, isAuditFresh, strictAuditApiPath, validateAuditCursorResult, type AuditQueryState } from "@/lib/dashboard/p04-audit";
import { classifyAsyncJobRows, isAsyncJobFresh, strictAsyncJobsApiPath, validateAsyncJobCursorResult, validateLegacyJobAdapters, type AsyncJobQueryState } from "@/lib/dashboard/p05-jobs";
import {
  classifyCursorResult,
  classifyOffsetResult,
  isCommonQueryFresh,
  isStrictDealer,
  isStrictProduct,
  strictDealerApiPath,
  strictProductApiPath,
  validateCommonCursorResult,
  validateCommonOffsetResult,
  type DashboardP03QueryState
} from "@/lib/dashboard/p03-query";
import { createDashboardCommitGuard, shouldPropagateDashboardAuthorizationError } from "./dashboard-commit-guard";
import type {
  AdminUser,
  Category,
  DashboardData,
  DashboardOverview,
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
  auditEvents: [],
  asyncJobs: [],
  legacyJobAdapters: [],
  workQueueItems: [],
  workQueueAdapters: [],
  notifications: [],
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

export class DashboardDataRequestError extends Error {
  constructor(
    readonly status: number,
    readonly serverMessage?: string,
    readonly requestId?: string,
    readonly code?: string
  ) {
    super(serverMessage || `Dashboard data request failed with HTTP ${status}.`);
    this.name = "DashboardDataRequestError";
  }
}

async function fetchJson<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DASHBOARD_API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string; code?: string; requestId?: string }
    | null;
  if (!response.ok) {
    const bodyRequestId = payload && typeof payload === "object" && "requestId" in payload && typeof payload.requestId === "string" ? payload.requestId : undefined;
    const requestId = response.headers.get("X-Request-Id") ?? bodyRequestId;
    if (response.status === 401 || response.status === 403) throw new DashboardDataRequestError(response.status, undefined, requestId);
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`;
    const code = payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string" ? payload.code : undefined;
    throw new DashboardDataRequestError(response.status, message, requestId, code);
  }
  return payload as T;
}

async function fetchData<T>(token: string, path: string, init?: RequestInit) {
  const payload = await fetchJson<ApiEnvelope<T>>(token, path, init);
  return payload.data;
}

async function fetchPaginated<T>(token: string, path: string) {
  const payload = await fetchJson<ApiEnvelope<T>>(token, path);
  return {
    data: payload.data,
    meta: payload.meta ?? defaultMeta
  } satisfies PaginatedResult<T>;
}

function fallbackDashboardRead<T>(promise: Promise<T>, fallback: T, preserveAuthorizationErrors: boolean) {
  return promise.catch((error) => {
    if (shouldPropagateDashboardAuthorizationError(preserveAuthorizationErrors, error)) throw error;
    return fallback;
  });
}

export type DashboardResourceState = "idle" | "loading" | "refreshing" | "ready" | "empty" | "filtered-empty" | "out-of-range" | "exhausted" | "partial" | "stale" | "unavailable" | "forbidden" | "error" | "degraded" | "read-only" | "query-unavailable";

type DashboardDataOptions = {
  readOnly?: boolean;
  actorKey?: string;
  onUnauthorized?: () => void;
  p03Capabilities?: { products: boolean; dealers: boolean };
  queryState?: DashboardP03QueryState;
  auditCapability?: { enabled: boolean; sensitive: boolean; globalLegacy: boolean };
  auditQueryState?: AuditQueryState;
  asyncJobCapability?: { enabled: boolean; sensitive: boolean };
  asyncJobQueryState?: AsyncJobQueryState;
  mediaWriteCapability?: DashboardAuthorization["mediaFoundationV1"];
  dataJobAuthorization?: DashboardAuthorization;
};

function guardedDispatch<T>(commit: (write: () => void) => boolean, dispatch: Dispatch<SetStateAction<T>>) {
  return (update: SetStateAction<T>) => commit(() => dispatch(update));
}

export function useDashboardData(token: string, dashboardOptions: DashboardDataOptions = {}) {
  const [data, setDataRaw] = useState<DashboardData>(emptyData);
  const [stats, setStatsRaw] = useState<DashboardStats>(emptyStats);
  const [meta, setMetaRaw] = useState<Record<string, PageMeta>>({});
  const [loading, setLoadingRaw] = useState(false);
  const [resourceStates, setResourceStatesRaw] = useState<Partial<Record<TabKey, DashboardResourceState>>>({});
  const [resourceErrors, setResourceErrorsRaw] = useState<Partial<Record<TabKey, string>>>({});
  const [resourceRequestIds, setResourceRequestIdsRaw] = useState<Partial<Record<TabKey, string>>>({});
  const [resourceCapturedAt, setResourceCapturedAtRaw] = useState<Partial<Record<TabKey, string>>>({});
  const [asyncJobAdapterState, setAsyncJobAdapterStateRaw] = useState<"complete" | "partial" | "unavailable">("unavailable");
  const activeTabRef = useRef<TabKey>("overview");
  const generationRef = useRef(0);
  const requestSequenceRef = useRef<Partial<Record<TabKey, number>>>({});
  const dealerCursorRef = useRef<{ currentAfter?: string; nextCursor?: string; previous: Array<string | undefined> }>({ previous: [] });
  const auditCursorRef = useRef<{ currentAfter?: string; nextCursor?: string; previous: Array<string | undefined> }>({ previous: [] });
  const asyncJobCursorRef = useRef<{ currentAfter?: string; nextCursor?: string; previous: Array<string | undefined> }>({ previous: [] });
  const strictRequestRef = useRef<AbortController | null>(null);
  const staleTimersRef = useRef<Partial<Record<"products" | "dealers" | "auditLogs" | "operations", ReturnType<typeof setTimeout>>>>({});
  const successfulQueryRef = useRef<Partial<Record<"products" | "dealers" | "auditLogs" | "operations", { capturedAt: string }>>>({});
  const actorKeyRef = useRef(dashboardOptions.actorKey ?? token);
  const currentActorKey = dashboardOptions.actorKey ?? token;
  const queryIdentity = JSON.stringify({ p03: dashboardOptions.queryState ?? null, audit: dashboardOptions.auditQueryState ?? null, jobs: dashboardOptions.asyncJobQueryState ?? null });
  const querySnapshot = useMemo(() => JSON.parse(queryIdentity) as { p03: DashboardP03QueryState | null; audit: AuditQueryState | null; jobs: AsyncJobQueryState | null }, [queryIdentity]);
  const queryState = querySnapshot.p03 ?? undefined;
  const auditQueryState = querySnapshot.audit ?? undefined;
  const asyncJobQueryState = querySnapshot.jobs ?? undefined;
  const productsQueryEnabled = dashboardOptions.p03Capabilities?.products === true;
  const dealersQueryEnabled = dashboardOptions.p03Capabilities?.dealers === true;
  const auditQueryEnabled = dashboardOptions.auditCapability?.enabled === true;
  const auditSensitive = dashboardOptions.auditCapability?.sensitive === true;
  const auditGlobalLegacy = dashboardOptions.auditCapability?.globalLegacy === true;
  const asyncJobQueryEnabled = dashboardOptions.asyncJobCapability?.enabled === true;
  const asyncJobSensitive = dashboardOptions.asyncJobCapability?.sensitive === true;
  actorKeyRef.current = currentActorKey;
  const hasIdentity = Boolean(token || dashboardOptions.readOnly);

  const clear = useCallback(() => {
    generationRef.current += 1;
    setDataRaw(emptyData);
    setStatsRaw(emptyStats());
    setMetaRaw({});
    setLoadingRaw(false);
    setResourceStatesRaw({});
    setResourceErrorsRaw({});
    setResourceRequestIdsRaw({});
    setResourceCapturedAtRaw({});
    setAsyncJobAdapterStateRaw("unavailable");
    requestSequenceRef.current = {};
    strictRequestRef.current?.abort();
    for (const timer of Object.values(staleTimersRef.current)) if (timer) clearTimeout(timer);
    staleTimersRef.current = {};
    dealerCursorRef.current = { previous: [] };
    auditCursorRef.current = { previous: [] };
    asyncJobCursorRef.current = { previous: [] };
    successfulQueryRef.current = {};
    activeTabRef.current = "overview";
  }, []);

  useEffect(() => clear(), [token, dashboardOptions.actorKey, productsQueryEnabled, dealersQueryEnabled, auditQueryEnabled, auditSensitive, auditGlobalLegacy, asyncJobQueryEnabled, asyncJobSensitive, queryIdentity, clear]);
  useEffect(() => () => {
    strictRequestRef.current?.abort();
    for (const timer of Object.values(staleTimersRef.current)) if (timer) clearTimeout(timer);
  }, []);

  const apiRequest = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!hasIdentity) throw new Error("Not authenticated");
      // V11-R1 P1: catalog writes issued with the explicit allowWrite marker
      // pass the read-only transport guard (gated upstream by the products
      // write permission); everything else stays read-only.
      if (dashboardOptions.readOnly && !(init as { allowWrite?: boolean } | undefined)?.allowWrite) assertReadOnlyMethod(init?.method);
      const response = await fetch(`${DASHBOARD_API_BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...init?.headers }
      });
      if (response.status === 401) dashboardOptions.onUnauthorized?.();
      return response;
    },
    [hasIdentity, dashboardOptions.readOnly, dashboardOptions.onUnauthorized]
  );

  const mediaWriteRequest = useCallback(
    async (operation: MediaWriteOperation) => {
      if (!hasIdentity) throw new Error("Not authenticated");
      const capability = dashboardOptions.mediaWriteCapability;
      if (!capability) throw new TypeError("Media write policy unavailable.");
      return executeMediaWrite(operation, capability, actorKeyRef.current, (path, init) => fetch(`${DASHBOARD_API_BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...init.headers }
      }), () => {
        clear();
        dashboardOptions.onUnauthorized?.();
      });
    },
    [hasIdentity, dashboardOptions.mediaWriteCapability, dashboardOptions.onUnauthorized, clear]
  );

  const dataJobRequest = useCallback(
    async (operation: DataJobOperation) => {
      if (!hasIdentity) throw new Error("Not authenticated");
      const authorization = dashboardOptions.dataJobAuthorization;
      if (!authorization) throw new TypeError("Data Job authorization unavailable.");
      const actions = authorization.modules.find((module) => module.module === "content")?.actions ?? [];
      const gates = deriveDataJobPermissionGates(actions);
      return executeDataJobOperation(operation, gates, (path, init) => fetch(`${DASHBOARD_API_BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        cache: "no-store",
        headers: { Accept: init.headers && new Headers(init.headers).get("Accept") || "application/json", ...init.headers }
      }), () => {
        clear();
        dashboardOptions.onUnauthorized?.();
      }, () => actorKeyRef.current);
    },
    [hasIdentity, dashboardOptions.dataJobAuthorization, dashboardOptions.onUnauthorized, clear]
  );

  const apiFetch = useCallback(
    async <T,>(path: string, init?: RequestInit) => {
      const response = await apiRequest(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
      const payload = (await response.json().catch(() => null)) as
        | T
        | { error?: string; code?: string; requestId?: string }
        | null;
      if (!response.ok) {
        const bodyRequestId = payload && typeof payload === "object" && "requestId" in payload && typeof payload.requestId === "string" ? payload.requestId : undefined;
        const requestId = response.headers.get("X-Request-Id") ?? bodyRequestId;
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : undefined;
        const code = payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string" ? payload.code : undefined;
        throw new DashboardDataRequestError(response.status, message, requestId, code);
      }
      return payload as T;
    },
    [apiRequest]
  );

  const loadStats = useCallback(async () => {
    if (!hasIdentity) return;
    const request = { generation: generationRef.current, actorKey: currentActorKey };
    const commit = createDashboardCommitGuard(request, () => ({
      generation: generationRef.current,
      actorKey: actorKeyRef.current
    }));
    try {
      const overview = await fetchData<DashboardOverview>(token, "/dashboard/overview");
      guardedDispatch(commit, setStatsRaw)({ ...overview.counts, opsAlerts: overview.queues.alerts });
    } catch (error) {
      if (shouldPropagateDashboardAuthorizationError(Boolean(dashboardOptions.readOnly), error)) throw error;
      // Overview remains best-effort; active section errors are handled by loadTab.
    }
  }, [token, hasIdentity, currentActorKey, dashboardOptions.readOnly]);

  const loadTab = useCallback(
    async (
      tab: TabKey,
      options?: {
        filters?: Partial<QueueFilters>;
        pages?: Partial<QueuePagination>;
        cmsLocale?: string;
      }
    ) => {
      if (!hasIdentity) return;
      const sequence = (requestSequenceRef.current[tab] ?? 0) + 1;
      requestSequenceRef.current[tab] = sequence;
      const request = { generation: generationRef.current, actorKey: currentActorKey };
      const generationCommit = createDashboardCommitGuard(request, () => ({
        generation: generationRef.current,
        actorKey: actorKeyRef.current
      }));
      const isCurrent = () => request.generation === generationRef.current
        && request.actorKey === actorKeyRef.current
        && requestSequenceRef.current[tab] === sequence;
      const commit = (write: () => void) => generationCommit(() => {
        if (!isCurrent()) return;
        write();
      });
      const setData = guardedDispatch(commit, setDataRaw);
      const setStats = guardedDispatch(commit, setStatsRaw);
      const setMeta = guardedDispatch(commit, setMetaRaw);
      const setLoading = guardedDispatch(commit, setLoadingRaw);
      const setResourceStates = guardedDispatch(commit, setResourceStatesRaw);
      const setResourceErrors = guardedDispatch(commit, setResourceErrorsRaw);
      const setResourceRequestIds = guardedDispatch(commit, setResourceRequestIdsRaw);
      commit(() => {
        activeTabRef.current = tab;
      });
      setLoading(true);
      setResourceStates((current) => ({
        ...current,
        [tab]: current[tab] && current[tab] !== "idle" ? "refreshing" : "loading"
      }));
      setResourceErrors((current) => ({ ...current, [tab]: undefined }));
      setResourceRequestIds((current) => ({ ...current, [tab]: undefined }));

      const filters = options?.filters;
      const pages = options?.pages ?? {};

      try {
        switch (tab) {
          case "overview": {
            await loadStats();
            break;
          }
          case "products": {
            const requestedState = queryState?.resource === "products" ? queryState : undefined;
            const hasStrictState = Boolean(requestedState && (requestedState.q || requestedState.productStatus || requestedState.categoryId || requestedState.sort !== "createdAt" || requestedState.direction !== "desc" || requestedState.page > 1));
            const strictState = productsQueryEnabled ? requestedState : undefined;
            if (requestedState && hasStrictState && !productsQueryEnabled) {
              setData((current) => ({ ...current, products: [] }));
              setResourceStates((current) => ({ ...current, products: "query-unavailable" }));
              break;
            }
            if (strictState) strictRequestRef.current?.abort();
            const strictController = strictState ? new AbortController() : undefined;
            if (strictController) strictRequestRef.current = strictController;
            const [categoriesResult, productPayload, pricingResult] = await Promise.all([
              fetchData<Category[]>(token, "/dashboard/categories").then((data) => ({ data, failed: false })).catch(() => ({ data: [] as Category[], failed: true })),
              strictState
                ? fetchJson<unknown>(token, strictProductApiPath(strictState), { signal: strictController?.signal }).then((value) => validateCommonOffsetResult<Product>(value, isStrictProduct))
                : fetchJson<ApiEnvelope<Product[]>>(token, "/dashboard/products"),
              fetchData<Price[]>(token, "/dashboard/pricing").then((data) => ({ data, failed: false })).catch(() => ({ data: [] as Price[], failed: true }))
            ]);
            const categories = categoriesResult.data;
            const pricing = pricingResult.data;
            const products = productPayload.data;
            if (strictState) {
              const strictPayload = productPayload as ReturnType<typeof validateCommonOffsetResult<Product>>;
              const pagination = strictPayload.meta.pagination;
              const total = strictPayload.meta.total.value;
              const disposition = classifyOffsetResult({ rows: products, total, offset: pagination.offset, filtered: Boolean(strictState.q || strictState.productStatus || strictState.categoryId) });
              if (!isCurrent()) return;
              successfulQueryRef.current.products = { capturedAt: strictPayload.meta.snapshot.capturedAt };
              setResourceCapturedAtRaw((current) => ({ ...current, products: strictPayload.meta.snapshot.capturedAt }));
              if (staleTimersRef.current.products) clearTimeout(staleTimersRef.current.products);
              staleTimersRef.current.products = undefined;
              setResourceStates((current) => ({ ...current, products: disposition }));
              setMeta((current) => ({ ...current, products: { page: strictState.page, pageSize: pagination.limit, total, totalPages: Math.max(1, Math.ceil(total / pagination.limit)) } }));
            }
            setData((current) => ({ ...current, categories, products, pricing }));
            if (categoriesResult.failed || pricingResult.failed) setResourceStates((current) => ({ ...current, products: "partial" }));
            setStats((current) => ({ ...current, products: strictState ? (productPayload as ReturnType<typeof validateCommonOffsetResult<Product>>).meta.total.value : products.length, categories: categories.length, prices: pricing.length }));
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
            const requestedState = queryState?.resource === "dealers" ? queryState : undefined;
            const hasStrictState = Boolean(requestedState && (requestedState.q || requestedState.dealerStatus));
            const strictState = dealersQueryEnabled ? requestedState : undefined;
            if (requestedState && hasStrictState && !dealersQueryEnabled) {
              setData((current) => ({ ...current, dealers: [] }));
              dealerCursorRef.current = { previous: [] };
              setResourceStates((current) => ({ ...current, dealers: "query-unavailable" }));
              break;
            }
            if (strictState) {
              strictRequestRef.current?.abort();
              const strictController = new AbortController();
              strictRequestRef.current = strictController;
              const currentAfter = dealerCursorRef.current.currentAfter;
              const result = validateCommonCursorResult<DashboardData["dealers"][number]>(await fetchJson<unknown>(token, strictDealerApiPath(strictState, currentAfter), { signal: strictController.signal }), isStrictDealer);
              const disposition = classifyCursorResult({ rows: result.data, after: currentAfter, filtered: Boolean(strictState.q || strictState.dealerStatus) });
              if (!isCurrent()) return;
              successfulQueryRef.current.dealers = { capturedAt: result.meta.snapshot.capturedAt };
              setResourceCapturedAtRaw((current) => ({ ...current, dealers: result.meta.snapshot.capturedAt }));
              if (staleTimersRef.current.dealers) clearTimeout(staleTimersRef.current.dealers);
              staleTimersRef.current.dealers = undefined;
              dealerCursorRef.current.nextCursor = result.meta.pagination.nextCursor;
              setData((current) => ({ ...current, dealers: disposition === "exhausted" && current.dealers.length ? current.dealers : result.data }));
              setResourceStates((current) => ({ ...current, dealers: disposition }));
              setStats((current) => ({ ...current, dealers: result.data.length }));
            } else {
              const dealers = await fetchData<typeof data.dealers>(token, "/dashboard/dealers");
              setData((current) => ({ ...current, dealers }));
              setStats((current) => ({ ...current, dealers: dealers.length }));
            }
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
              fallbackDashboardRead(fetchData<typeof data.users>(token, "/dashboard/users"), [], Boolean(dashboardOptions.readOnly)),
              fallbackDashboardRead(fetchData<typeof data.dealers>(token, "/dashboard/dealers"), [], Boolean(dashboardOptions.readOnly))
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
            // Orders and the dealers auxiliary are decoupled: the orders
            // request is the only main request for this tab. If the dealers
            // helper fails (including a read-only 403), the order list still
            // loads and only the dealer-assignment surface degrades.
            const [result, dealersResult] = await Promise.allSettled([
              fetchPaginated<typeof data.orders>(
                token,
                withQuery("/dashboard/orders", {
                  status: filters?.orders,
                  page: pages.orders ?? 1,
                  pageSize: 50
                })
              ),
              fetchData<typeof data.dealers>(token, "/dashboard/dealers")
            ]);
            if (result.status === "rejected") throw result.reason;
            const dealers = dealersResult.status === "fulfilled" ? dealersResult.value : [];
            setData((current) => ({ ...current, orders: result.value.data, dealers }));
            setMeta((current) => ({ ...current, orders: result.value.meta }));
            setStats((current) => ({ ...current, orders: result.value.meta.total }));
            if (dealersResult.status === "rejected") setResourceStates((current) => ({ ...current, orders: "partial" }));
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
              fallbackDashboardRead(fetchData<typeof data.dealers>(token, "/dashboard/dealers"), [], Boolean(dashboardOptions.readOnly))
            ]);
            setData((current) => ({ ...current, inventorySnapshots: result.data, dealers }));
            setMeta((current) => ({ ...current, inventorySnapshots: result.meta }));
            break;
          }
          case "cms": {
            const locale = options?.cmsLocale ?? "en-CA";
            const requests = [
              fetchData(token, withQuery("/dashboard/navigation", { locale })),
              fetchData(token, withQuery("/dashboard/home-page", { locale })),
              fetchData(token, withQuery("/dashboard/footer", { locale })),
              fetchData(token, "/dashboard/catalog"),
              fetchData(token, "/dashboard/storefront/config"),
              fetchData(token, "/dashboard/modules/readiness"),
              fetchData<typeof data.legalPages>(token, "/dashboard/legal-pages"),
              fetchData<typeof data.articles>(token, "/dashboard/articles")
            ] as const;
            if (dashboardOptions.readOnly) {
              const results = await Promise.allSettled(requests);
              const unauthorized = results.find((result) => result.status === "rejected" && result.reason instanceof DashboardDataRequestError && result.reason.status === 401);
              if (unauthorized?.status === "rejected") throw unauthorized.reason;
              const fulfilled = results.filter((result) => result.status === "fulfilled").length;
              if (fulfilled === 0) {
                const forbidden = results.every((result) => result.status === "rejected" && result.reason instanceof DashboardDataRequestError && result.reason.status === 403);
                throw new DashboardDataRequestError(forbidden ? 403 : 500);
              }
              const value = <T,>(index: number, fallback: T) => results[index].status === "fulfilled" ? results[index].value as T : fallback;
              setData((current) => ({ ...current, cmsNavigation: value(0, null), cmsHomePage: value(1, null), cmsFooter: value(2, null), cmsCatalogConfig: value(3, null), cmsStorefrontConfig: value(4, null), moduleReadiness: value(5, null), legalPages: value(6, [] as typeof data.legalPages), articles: value(7, [] as typeof data.articles) }));
              if (fulfilled < results.length) setResourceStates((current) => ({ ...current, cms: "partial" }));
            } else {
              const [navigation, homePage, footer, catalogConfig, storefrontConfig, readiness, legalPages, articles] = await Promise.all(requests.map((request, index) => request.catch(() => index < 6 ? null : [])));
              setData((current) => ({ ...current, cmsNavigation: navigation, cmsHomePage: homePage, cmsFooter: footer, cmsCatalogConfig: catalogConfig, cmsStorefrontConfig: storefrontConfig, moduleReadiness: readiness, legalPages: legalPages as typeof data.legalPages, articles: articles as typeof data.articles }));
            }
            break;
          }
          case "operations": {
            if (asyncJobQueryState) {
              if (!asyncJobQueryEnabled) {
                commit(() => setDataRaw((current) => ({ ...current, asyncJobs: [], legacyJobAdapters: [] })));
                asyncJobCursorRef.current = { previous: [] };
                setResourceStates((current) => ({ ...current, operations: "query-unavailable" }));
                break;
              }
              strictRequestRef.current?.abort();
              const controller = new AbortController();
              strictRequestRef.current = controller;
              const currentAfter = asyncJobCursorRef.current.currentAfter;
              const filtered = Boolean(asyncJobQueryState.statuses.length || asyncJobQueryState.jobTypes.length || asyncJobQueryState.createdByActorType || asyncJobQueryState.createdFrom || asyncJobQueryState.cancellable || asyncJobQueryState.retryable);
              const [jobsResult, adaptersResult] = await Promise.allSettled([
                fetchJson<unknown>(token, strictAsyncJobsApiPath(asyncJobQueryState, currentAfter), { signal: controller.signal }).then((value) => validateAsyncJobCursorResult(value, asyncJobSensitive)),
                fetchJson<unknown>(token, "/dashboard/jobs/adapters").then(validateLegacyJobAdapters)
              ]);
              if (jobsResult.status === "rejected") throw jobsResult.reason;
              const disposition = classifyAsyncJobRows(jobsResult.value.data, currentAfter, filtered);
              if (!isCurrent()) return;
              successfulQueryRef.current.operations = { capturedAt: jobsResult.value.meta.snapshot.capturedAt };
              setResourceCapturedAtRaw((current) => ({ ...current, operations: jobsResult.value.meta.snapshot.capturedAt }));
              if (staleTimersRef.current.operations) clearTimeout(staleTimersRef.current.operations);
              staleTimersRef.current.operations = undefined;
              asyncJobCursorRef.current.nextCursor = jobsResult.value.meta.pagination.nextCursor;
              setData((current) => ({ ...current, operationAlerts: [], analyticsSummary: null, asyncJobs: disposition === "exhausted" && current.asyncJobs.length ? current.asyncJobs : jobsResult.value.data, legacyJobAdapters: adaptersResult.status === "fulfilled" ? adaptersResult.value.data : [] }));
              commit(() => setAsyncJobAdapterStateRaw(adaptersResult.status === "fulfilled" ? adaptersResult.value.meta.completion : "unavailable"));
              setResourceStates((current) => ({ ...current, operations: adaptersResult.status === "rejected" || adaptersResult.value.meta.completion === "partial" ? "partial" : disposition }));
              break;
            }
            if (dashboardOptions.readOnly) {
              const [alertsResult, analyticsResult] = await Promise.allSettled([
                fetchData<typeof data.operationAlerts>(token, "/dashboard/operations/alerts"),
                fetchData<NonNullable<typeof data.analyticsSummary>>(token, "/dashboard/analytics/summary")
              ]);
              const unauthorized = [alertsResult, analyticsResult].find(
                (result) => result.status === "rejected" && result.reason instanceof DashboardDataRequestError && result.reason.status === 401
              );
              if (unauthorized?.status === "rejected") throw unauthorized.reason;
              const results = [alertsResult, analyticsResult];
              const fulfilled = results.filter((result) => result.status === "fulfilled").length;
              if (fulfilled === 0) {
                const forbidden = results.every((result) => result.status === "rejected" && result.reason instanceof DashboardDataRequestError && result.reason.status === 403);
                throw new DashboardDataRequestError(forbidden ? 403 : 500);
              }
              const alerts = alertsResult.status === "fulfilled" ? alertsResult.value : [];
              const analyticsSummary = analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
              setData((current) => ({ ...current, operationAlerts: alerts, analyticsSummary }));
              setStats((current) => ({ ...current, opsAlerts: alerts.length }));
              if (fulfilled < results.length) setResourceStates((current) => ({ ...current, operations: "partial" }));
            } else {
              const [alerts, analyticsSummary] = await Promise.all([
                fetchData<typeof data.operationAlerts>(token, "/dashboard/operations/alerts").catch(() => []),
                fetchData<NonNullable<typeof data.analyticsSummary>>(token, "/dashboard/analytics/summary").catch(() => null)
              ]);
              setData((current) => ({ ...current, operationAlerts: alerts, analyticsSummary }));
              setStats((current) => ({ ...current, opsAlerts: alerts.length }));
            }
            break;
          }
          case "emailOutbox": {
            if (dashboardOptions.readOnly) {
              const [outboxResult, templatesResult, providerResult] = await Promise.allSettled([
                fetchPaginated<typeof data.emailOutbox>(token, withQuery("/dashboard/email/outbox", { page: pages.emailOutbox ?? 1, pageSize: 50 })),
                fetchData<typeof data.emailTemplates>(token, "/dashboard/email/templates"),
                fetchData<NonNullable<typeof data.emailProvider>>(token, "/dashboard/email/provider")
              ]);
              const unauthorized = [outboxResult, templatesResult, providerResult].find(
                (result) => result.status === "rejected" && result.reason instanceof DashboardDataRequestError && result.reason.status === 401
              );
              if (unauthorized?.status === "rejected") throw unauthorized.reason;
              const outbox = outboxResult.status === "fulfilled" ? outboxResult.value : { data: [] as typeof data.emailOutbox, meta: defaultMeta };
              setData((current) => ({
                ...current,
                emailOutbox: outbox.data,
                emailTemplates: templatesResult.status === "fulfilled" ? templatesResult.value : [],
                emailProvider: providerResult.status === "fulfilled" ? providerResult.value : null
              }));
              setMeta((current) => ({ ...current, emailOutbox: outbox.meta }));
              if ([outboxResult, templatesResult, providerResult].some((result) => result.status === "rejected")) {
                setResourceStates((current) => ({ ...current, emailOutbox: "partial" }));
              }
            } else {
              const [outbox, templates, emailProvider] = await Promise.all([
                fetchPaginated<typeof data.emailOutbox>(token, withQuery("/dashboard/email/outbox", { page: pages.emailOutbox ?? 1, pageSize: 50 })).catch(() => ({ data: [] as typeof data.emailOutbox, meta: defaultMeta })),
                fetchData<typeof data.emailTemplates>(token, "/dashboard/email/templates").catch(() => []),
                fetchData<NonNullable<typeof data.emailProvider>>(token, "/dashboard/email/provider").catch(() => null)
              ]);
              setData((current) => ({ ...current, emailOutbox: outbox.data, emailTemplates: templates, emailProvider }));
              setMeta((current) => ({ ...current, emailOutbox: outbox.meta }));
            }
            break;
          }
          case "auditLogs": {
            const state = auditQueryState;
            const hasStrictState = Boolean(state && (state.occurredFrom || state.actorType || state.actions.length || state.resourceTypes.length || state.results.length || state.resourceId || state.requestId || state.sources.length || state.sensitive));
            if (!auditQueryEnabled) {
              if (!auditGlobalLegacy || hasStrictState) {
                setData((current) => ({ ...current, auditLogs: [], auditEvents: [] }));
                auditCursorRef.current = { previous: [] };
                setResourceStates((current) => ({ ...current, auditLogs: "query-unavailable" }));
                break;
              }
              const legacy = await fetchPaginated<typeof data.auditLogs>(token, withQuery("/dashboard/audit-logs", { page: pages.auditLogs ?? 1, pageSize: 50 }));
              setData((current) => ({ ...current, auditLogs: legacy.data, auditEvents: [] }));
              setMeta((current) => ({ ...current, auditLogs: legacy.meta }));
              break;
            }
            if (!state) throw new Error("Audit query state is unavailable.");
            strictRequestRef.current?.abort();
            const controller = new AbortController();
            strictRequestRef.current = controller;
            const currentAfter = auditCursorRef.current.currentAfter;
            const result = validateAuditCursorResult(await fetchJson<unknown>(token, strictAuditApiPath(state, currentAfter), { signal: controller.signal }), auditSensitive);
            const disposition = classifyAuditRows(result.data, currentAfter, hasStrictState);
            if (!isCurrent()) return;
            successfulQueryRef.current.auditLogs = { capturedAt: result.meta.snapshot.capturedAt };
            setResourceCapturedAtRaw((current) => ({ ...current, auditLogs: result.meta.snapshot.capturedAt }));
            if (staleTimersRef.current.auditLogs) clearTimeout(staleTimersRef.current.auditLogs);
            staleTimersRef.current.auditLogs = undefined;
            auditCursorRef.current.nextCursor = result.meta.pagination.nextCursor;
            setData((current) => ({ ...current, auditLogs: [], auditEvents: disposition === "exhausted" && current.auditEvents.length ? current.auditEvents : result.data }));
            setResourceStates((current) => ({ ...current, auditLogs: disposition }));
            break;
          }
        }
        if (isCurrent()) {
          setResourceStates((current) => {
            const state = current[tab];
            return state && !["idle", "loading", "refreshing"].includes(state) ? current : { ...current, [tab]: "read-only" };
          });
        }
      } catch (error) {
        if (!isCurrent()) return;
        if (error instanceof DashboardDataRequestError && error.status === 401) {
          clear();
          dashboardOptions.onUnauthorized?.();
          return;
        }
        const queryResource = tab === "products" || tab === "dealers" || tab === "auditLogs" || (tab === "operations" && asyncJobQueryState) ? tab : undefined;
        const previous = queryResource ? successfulQueryRef.current[queryResource] : undefined;
        const stale = previous && (queryResource === "auditLogs" ? isAuditFresh(previous.capturedAt) : queryResource === "operations" ? isAsyncJobFresh(previous.capturedAt) : isCommonQueryFresh(previous.capturedAt));
        if (queryResource && previous && stale) {
          if (staleTimersRef.current[queryResource]) clearTimeout(staleTimersRef.current[queryResource]);
          staleTimersRef.current[queryResource] = setTimeout(() => {
            if (successfulQueryRef.current[queryResource]?.capturedAt !== previous.capturedAt) return;
            setDataRaw((current) => queryResource === "auditLogs" ? ({ ...current, auditEvents: [] }) : queryResource === "operations" ? ({ ...current, asyncJobs: [], legacyJobAdapters: [] }) : ({ ...current, [queryResource]: [] }));
            setResourceStatesRaw((current) => ({ ...current, [queryResource]: "unavailable" }));
          }, Math.max(0, Date.parse(previous.capturedAt) + 60_000 - Date.now()));
        } else if (queryResource && previous && !stale) {
          setDataRaw((current) => queryResource === "auditLogs" ? ({ ...current, auditEvents: [] }) : queryResource === "operations" ? ({ ...current, asyncJobs: [], legacyJobAdapters: [] }) : ({ ...current, [queryResource]: [] }));
        }
        setResourceStates((current) => ({ ...current, [tab]: error instanceof DashboardDataRequestError && error.status === 403 ? "forbidden" : stale ? "stale" : previous ? "unavailable" : "error" }));
        setResourceErrors((current) => ({ ...current, [tab]: error instanceof Error ? error.message : "Request failed" }));
        setResourceRequestIds((current) => ({ ...current, [tab]: error instanceof DashboardDataRequestError ? error.requestId : undefined }));
        if (!dashboardOptions.readOnly) throw error;
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [token, hasIdentity, currentActorKey, loadStats, dashboardOptions.readOnly, dashboardOptions.onUnauthorized, productsQueryEnabled, dealersQueryEnabled, auditQueryEnabled, auditSensitive, auditGlobalLegacy, asyncJobQueryEnabled, asyncJobSensitive, queryState, auditQueryState, asyncJobQueryState, clear]
  );

  const loadNextDealerPage = useCallback(async () => {
    if (!dealerCursorRef.current.nextCursor || queryState?.resource !== "dealers") return;
    dealerCursorRef.current.previous.push(dealerCursorRef.current.currentAfter);
    dealerCursorRef.current.currentAfter = dealerCursorRef.current.nextCursor;
    await loadTab("dealers");
  }, [queryState, loadTab]);

  const loadPreviousDealerPage = useCallback(async () => {
    if (!dealerCursorRef.current.previous.length) return;
    dealerCursorRef.current.currentAfter = dealerCursorRef.current.previous.pop();
    await loadTab("dealers");
  }, [loadTab]);

  const restartDealerQuery = useCallback(async () => {
    dealerCursorRef.current = { previous: [] };
    await loadTab("dealers");
  }, [loadTab]);
  const loadNextAuditPage = useCallback(async () => { if (!auditCursorRef.current.nextCursor || !auditQueryState) return; auditCursorRef.current.previous.push(auditCursorRef.current.currentAfter); auditCursorRef.current.currentAfter = auditCursorRef.current.nextCursor; await loadTab("auditLogs"); }, [auditQueryState, loadTab]);
  const loadPreviousAuditPage = useCallback(async () => { if (!auditCursorRef.current.previous.length) return; auditCursorRef.current.currentAfter = auditCursorRef.current.previous.pop(); await loadTab("auditLogs"); }, [loadTab]);
  const restartAuditQuery = useCallback(async () => { auditCursorRef.current = { previous: [] }; await loadTab("auditLogs"); }, [loadTab]);
  const loadNextAsyncJobPage = useCallback(async () => { if (!asyncJobCursorRef.current.nextCursor || !asyncJobQueryState) return; asyncJobCursorRef.current.previous.push(asyncJobCursorRef.current.currentAfter); asyncJobCursorRef.current.currentAfter = asyncJobCursorRef.current.nextCursor; await loadTab("operations"); }, [asyncJobQueryState, loadTab]);
  const loadPreviousAsyncJobPage = useCallback(async () => { if (!asyncJobCursorRef.current.previous.length) return; asyncJobCursorRef.current.currentAfter = asyncJobCursorRef.current.previous.pop(); await loadTab("operations"); }, [loadTab]);
  const restartAsyncJobQuery = useCallback(async () => { asyncJobCursorRef.current = { previous: [] }; await loadTab("operations"); }, [loadTab]);

  const reloadActiveTab = useCallback(
    async (
      filters?: Partial<QueueFilters>,
      pages?: Partial<QueuePagination>,
      cmsLocale?: string
    ) => {
      await loadTab(activeTabRef.current, { filters, pages, cmsLocale });
      await loadStats();
    },
    [loadTab, loadStats]
  );

  return {
    data,
    stats,
    meta,
    loading,
    setLoading: setLoadingRaw,
    loadTab,
    loadStats,
    reloadActiveTab,
    apiFetch,
    apiRequest,
    mediaWriteRequest,
    dataJobRequest,
    resourceStates,
    resourceErrors,
    resourceRequestIds,
    resourceCapturedAt,
    asyncJobAdapterState,
    loadNextDealerPage,
    loadPreviousDealerPage,
    restartDealerQuery,
    hasNextDealerPage: Boolean(dealerCursorRef.current.nextCursor),
    hasPreviousDealerPage: dealerCursorRef.current.previous.length > 0,
    loadNextAuditPage,
    loadPreviousAuditPage,
    restartAuditQuery,
    hasNextAuditPage: Boolean(auditCursorRef.current.nextCursor),
    hasPreviousAuditPage: auditCursorRef.current.previous.length > 0,
    loadNextAsyncJobPage,
    loadPreviousAsyncJobPage,
    restartAsyncJobQuery,
    hasNextAsyncJobPage: Boolean(asyncJobCursorRef.current.nextCursor),
    hasPreviousAsyncJobPage: asyncJobCursorRef.current.previous.length > 0,
    clear,
    setActiveTabRef: (tab: TabKey) => {
      activeTabRef.current = tab;
    }
  };
}
