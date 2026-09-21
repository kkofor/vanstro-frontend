import {
  DASHBOARD_FOUNDATION_MODULE_ROUTES,
  type DashboardFoundation,
  type DashboardModuleSelectorSummary,
  type DashboardModuleStatus
} from "../api/api-contract.ts";
import type { TabKey } from "./types";

export type FoundationModule = DashboardFoundation["modules"][number]["module"];
export type DashboardFoundationFailure = "anonymous" | "forbidden" | "unavailable" | "invalid-response" | "expired";
export type DashboardFoundationState =
  | { status: "idle" | "loading"; foundation: null; failure: null }
  | { status: "legacy" | "ready"; foundation: DashboardFoundation; failure: null }
  | { status: "anonymous" | "forbidden" | "unavailable" | "invalid"; foundation: null; failure: DashboardFoundationFailure };

export function dashboardFoundationLoadingState(): DashboardFoundationState {
  return { status: "loading", foundation: null, failure: null };
}

export function classifyDashboardFoundation(
  result: { foundation: DashboardFoundation } | { error: unknown }
): DashboardFoundationState {
  if ("error" in result) {
    const failure = result.error instanceof DashboardFoundationRequestError
      ? result.error.failure
      : "invalid-response";
    return {
      status: failure === "invalid-response" ? "invalid" : failure === "expired" ? "anonymous" : failure,
      foundation: null,
      failure
    };
  }

  // The server always returns the full v1.1 module projection (including the
  // authoritative status of every known module), even when the shell itself
  // is disabled or the actor is not allowed. Keeping the projection on the
  // legacy state lets the shell adjudicate known coming-soon routes before
  // falling back to the legacy DashboardShell.
  return dashboardFoundationDisposition(result.foundation) === "ready"
    ? { status: "ready", foundation: result.foundation, failure: null }
    : { status: "legacy", foundation: result.foundation, failure: null };
}

export type DashboardFoundationRequestCoordinator = {
  begin: (dedupe: boolean) => number | null;
  finish: (generation: number) => void;
  invalidate: () => void;
  isCurrent: (generation: number) => boolean;
  isActive: () => boolean;
};

export function createDashboardFoundationRequestCoordinator(): DashboardFoundationRequestCoordinator {
  let generation = 0;
  let activeGeneration: number | null = null;

  return {
    begin(dedupe) {
      if (dedupe && activeGeneration !== null) return null;
      activeGeneration = ++generation;
      return activeGeneration;
    },
    finish(requestGeneration) {
      if (requestGeneration === activeGeneration) activeGeneration = null;
    },
    invalidate() {
      generation += 1;
      activeGeneration = null;
    },
    isCurrent(requestGeneration) {
      return requestGeneration === generation;
    },
    isActive() {
      return activeGeneration !== null;
    }
  };
}

export function isDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    || pathname === "/fr/dashboard" || pathname.startsWith("/fr/dashboard/");
}

export type DashboardResumeRevalidation =
  | { kind: "skip" }
  | { kind: "revalidate"; presentation: "blocking" | "background" };

/**
 * Pure resume-freshness decision. On a window/tab switch back to a visible
 * dashboard: skip when the current authorization is fresh and still safely
 * displayable (or the actor is anonymous/forbidden — wait for a session event
 * or an explicit Retry instead of auto-pinging); revalidate in the background
 * when close to expiry or stale but still safe; force a blocking reload only
 * when the authorization has already expired (fail closed). The stale/skew
 * windows are revalidation triggers — they never extend the server-issued
 * authorization lifetime, which `assertFreshDashboardAuthorization` enforces.
 */
export function shouldRevalidateDashboardOnResume(input: {
  now: number;
  lastSuccessfulAt: number | null;
  authorizationExpiresAt: string | null;
  currentState: DashboardFoundationState["status"];
  staleAfterMs: number;
  expirySkewMs: number;
}): DashboardResumeRevalidation {
  const { now, lastSuccessfulAt, authorizationExpiresAt, currentState, staleAfterMs, expirySkewMs } = input;

  if (currentState === "anonymous" || currentState === "forbidden") return { kind: "skip" };
  if (currentState === "idle" || currentState === "loading" || currentState === "legacy") return { kind: "skip" };
  if (currentState === "unavailable" || currentState === "invalid") return { kind: "revalidate", presentation: "background" };

  // currentState === "ready"
  const expiresAtMs = authorizationExpiresAt ? Date.parse(authorizationExpiresAt) : Number.NaN;
  if (Number.isFinite(expiresAtMs)) {
    if (expiresAtMs <= now) return { kind: "revalidate", presentation: "blocking" };
    if (expiresAtMs <= now + expirySkewMs) return { kind: "revalidate", presentation: "background" };
  }
  if (lastSuccessfulAt !== null && now - lastSuccessfulAt > staleAfterMs) {
    return { kind: "revalidate", presentation: "background" };
  }
  return { kind: "skip" };
}

/**
 * V11-2 chrome disposition shared by AppChrome and its behavior tests.
 * Dashboard paths always own their chrome — including /dashboard/login,
 * /fr/dashboard/login and every anonymous dashboard route — so the
 * storefront chrome never renders inside the Dashboard. The single exception
 * is the legacy shell state, which keeps the established storefront-chrome
 * fallback (V11-1 behavior). Non-dashboard paths never own chrome.
 */
export function dashboardChromeOwned(pathname: string, foundationStatus: DashboardFoundationState["status"]): boolean {
  return isDashboardPath(pathname) && foundationStatus !== "legacy";
}

/**
 * Pure decision for the expired-session login notice: an authenticated
 * session (ready) that collapses to anonymous without a user-initiated
 * logout (business 401, server-side revocation, focus revalidation) must
 * surface the expired notice. Initial anonymous visits and explicit logout
 * never do. The caller captures this in an effect/state — never by mutating
 * a ref during render, which would lose the transition under React
 * StrictMode's double render.
 */
export function dashboardSessionExpiredNotice(
  previousStatus: DashboardFoundationState["status"] | null,
  currentStatus: DashboardFoundationState["status"],
  loggingOut: boolean
): boolean {
  return previousStatus === "ready" && currentStatus === "anonymous" && !loggingOut;
}

export class DashboardFoundationRequestError extends Error {
  readonly failure: DashboardFoundationFailure;
  readonly status: number | undefined;

  constructor(failure: DashboardFoundationFailure, status?: number) {
    super(`Dashboard foundation request failed: ${failure}.`);
    this.name = "DashboardFoundationRequestError";
    this.failure = failure;
    this.status = status;
  }
}

/** Auth-invalidating failures must clear stale authorization (fail closed):
 *  anonymous (401), forbidden (403), and expired/actor-mismatch. Everything
 *  else (unavailable/network/5xx, invalid-response/contract) is transient and
 *  may keep a still-valid authorization during a background revalidate. */
export function isFoundationAuthFailure(error: unknown): boolean {
  if (!(error instanceof DashboardFoundationRequestError)) return false;
  return error.failure === "anonymous" || error.failure === "forbidden" || error.failure === "expired";
}

export function dashboardFoundationDisposition(foundation: DashboardFoundation): "ready" | "legacy" {
  return foundation.shell.mode === "internal"
    && foundation.shell.enabled
    && foundation.readiness === "ready"
    && foundation.shell.code === "DASHBOARD_SHELL_READY"
    ? "ready"
    : "legacy";
}

export function assertReadOnlyMethod(method = "GET") {
  const normalized = method.toUpperCase();
  if (normalized !== "GET" && normalized !== "HEAD") {
    throw new TypeError(`Dashboard F0 transport only permits GET or HEAD, received ${normalized}.`);
  }
  return normalized;
}

export function classifyDashboardFoundationStatus(status: number): Exclude<DashboardFoundationFailure, "invalid-response"> | null {
  if (status === 401) return "anonymous";
  if (status === 403) return "forbidden";
  if (status >= 200 && status < 300) return null;
  return "unavailable";
}

/**
 * Fetches the one server-owned F0 bootstrap resource. Callers cannot append
 * query flags, supply identity headers, or weaken the no-store policy.
 */
export async function dashboardFoundationRequest(baseUrl: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/dashboard/foundation`, {
      method: assertReadOnlyMethod(),
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal
    });
  } catch {
    throw new DashboardFoundationRequestError("unavailable");
  }

  const failure = classifyDashboardFoundationStatus(response.status);
  if (failure) throw new DashboardFoundationRequestError(failure, response.status);

  try {
    return await response.json();
  } catch {
    throw new DashboardFoundationRequestError("invalid-response", response.status);
  }
}

// ---------------------------------------------------------------------------
// V11 route resolution — vanstro-v11-url-selector.v1 (backend-consistent)
//
// The resolver below mirrors apps/api/src/dashboard/foundation.ts
// resolveDashboardRoute exactly: same rejection order, locale stripping,
// trailing-slash normalization, URLSearchParams query semantics and match
// priority (canonical exact > noncanonical exact > prefix > query
// refinement). It consumes either the live Foundation projection modules or
// the shared mechanical registry (DASHBOARD_FOUNDATION_MODULE_STATE) — never
// a hand-written per-feature matrix.
// ---------------------------------------------------------------------------

export type DashboardRouteLocale = "en-CA" | "fr-CA";
export type DashboardRouteMatchSource = "canonical" | "path_exact" | "path_prefix" | "query_value" | "legacy_tab";

export type DashboardRouteUnknownReason =
  | "absolute_url"
  | "protocol_relative_url"
  | "not_site_relative"
  | "malformed_percent_encoding"
  | "fragment_owned_routing"
  | "repeated_fr_prefix"
  | "conflicting_duplicate_key"
  | "ambiguous_query"
  | "no_match";

export type DashboardRouteModuleLike = {
  module: string;
  label: string;
  group: string;
  status: DashboardModuleStatus;
  route: string;
  selectors: readonly DashboardModuleSelectorSummary[];
  readAllowed?: boolean;
};

export type DashboardRouteResolution =
  | {
      kind: "known";
      owner: string;
      status: DashboardModuleStatus;
      source: DashboardRouteMatchSource;
      locale: DashboardRouteLocale;
      pathname: string;
      search: string;
    }
  | { kind: "unknown"; reason: DashboardRouteUnknownReason };

const DASHBOARD_FR_PREFIX = "/fr";
const DASHBOARD_ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function hasMalformedPercentEncoding(input: string): boolean {
  for (let i = 0; i < input.length; i += 1) {
    if (input.charCodeAt(i) !== 37 /* % */) continue;
    const high = input.charCodeAt(i + 1);
    const low = input.charCodeAt(i + 2);
    const isHexDigit = (code: number) => (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
    if (!isHexDigit(high) || !isHexDigit(low)) return true;
  }
  return false;
}

function stripLocalePrefix(pathname: string): { pathname: string; locale: DashboardRouteLocale } {
  if (pathname === DASHBOARD_FR_PREFIX || pathname.startsWith(`${DASHBOARD_FR_PREFIX}/`)) {
    const stripped = pathname.slice(DASHBOARD_FR_PREFIX.length);
    return { pathname: stripped === "" ? "/" : stripped, locale: "fr-CA" };
  }
  return { pathname, locale: "en-CA" };
}

function hasRepeatedFrPrefix(pathname: string): boolean {
  return pathname === DASHBOARD_FR_PREFIX || pathname.startsWith(`${DASHBOARD_FR_PREFIX}/`);
}

function normalizeTrailingSlashes(pathname: string): string {
  let normalized = pathname;
  while (normalized.length > 1 && normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  return normalized;
}

export function resolveDashboardFoundationRoute(input: string, modules: readonly DashboardRouteModuleLike[]): DashboardRouteResolution {
  // Rejections that apply to the raw input before any parsing.
  if (input.includes("#")) return { kind: "unknown", reason: "fragment_owned_routing" };
  if (hasMalformedPercentEncoding(input)) return { kind: "unknown", reason: "malformed_percent_encoding" };

  const questionIndex = input.indexOf("?");
  const rawPathname = questionIndex === -1 ? input : input.slice(0, questionIndex);
  const search = questionIndex === -1 ? "" : input.slice(questionIndex + 1);

  if (rawPathname.startsWith("//")) return { kind: "unknown", reason: "protocol_relative_url" };
  if (DASHBOARD_ABSOLUTE_URL_PATTERN.test(rawPathname)) return { kind: "unknown", reason: "absolute_url" };
  if (!rawPathname.startsWith("/")) return { kind: "unknown", reason: "not_site_relative" };

  const stripped = stripLocalePrefix(rawPathname);
  let pathname = stripped.pathname;
  const locale = stripped.locale;
  if (locale === "fr-CA" && hasRepeatedFrPrefix(pathname)) return { kind: "unknown", reason: "repeated_fr_prefix" };
  pathname = normalizeTrailingSlashes(pathname);

  // Query parsing: URLSearchParams decodes valid percent escapes (comparison
  // happens after percent-decoding). A key repeated with conflicting values
  // fails closed; same-value duplicates are harmless.
  const params = new Map<string, string[]>();
  for (const [key, value] of new URLSearchParams(search)) {
    const values = params.get(key);
    if (values) values.push(value);
    else params.set(key, [value]);
  }
  for (const values of params.values()) {
    if (new Set(values).size > 1) return { kind: "unknown", reason: "conflicting_duplicate_key" };
  }

  // Path-level matching: canonical exact > noncanonical exact > prefix.
  let owner: DashboardRouteModuleLike | undefined;
  let source: DashboardRouteMatchSource | undefined;
  const canonical = modules.find((entry) => entry.route === pathname);
  if (canonical) {
    owner = canonical;
    source = "canonical";
  } else {
    const exact = modules
      .flatMap((entry) => entry.selectors
        .filter((selector): selector is DashboardModuleSelectorSummary & { kind: "path_exact" } => selector.kind === "path_exact")
        .map((selector) => ({ entry, selector })))
      .find(({ selector }) => selector.pathname === pathname);
    if (exact) {
      owner = exact.entry;
      source = "path_exact";
    } else {
      for (const entry of modules) {
        const prefix = entry.selectors.find(
          (selector) => selector.kind === "path_prefix" && pathname.startsWith(selector.pathname) && pathname.length > selector.pathname.length
        );
        if (prefix) {
          owner = entry;
          source = "path_prefix";
          break;
        }
      }
    }
  }

  // Query refinement: a query_value/legacy_tab selector attached to the
  // matched pathname refines the owner when its exact key=value pair is
  // present. Non-matching selector values and unrelated parameters are
  // extra parameters and never change the owner.
  if (owner) {
    const querySelectors = modules.flatMap((entry) => entry.selectors
      .filter((selector): selector is DashboardModuleSelectorSummary & { kind: "query_value" | "legacy_tab" } =>
        selector.kind === "query_value" || selector.kind === "legacy_tab")
      .filter((selector) => selector.pathname === pathname)
      .map((selector) => ({ selector, entry })));
    if (querySelectors.length > 0) {
      let refined: DashboardRouteModuleLike | undefined;
      let refinedSource: "query_value" | "legacy_tab" | undefined;
      let ambiguous = false;
      for (const { selector, entry } of querySelectors) {
        const values = params.get(selector.key!);
        if (values && values.every((value) => value === selector.value)) {
          if (refined && refined.module !== entry.module) {
            ambiguous = true;
            break;
          }
          refined = entry;
          refinedSource = selector.kind;
        }
      }
      if (ambiguous) return { kind: "unknown", reason: "ambiguous_query" };
      if (refined && refinedSource) {
        owner = refined;
        source = refinedSource;
      }
    }
  }

  if (owner && source) {
    return { kind: "known", owner: owner.module, status: owner.status, source, locale, pathname, search };
  }
  return { kind: "unknown", reason: "no_match" };
}

export type FoundationRouteAdjudication =
  | { kind: "coming_soon"; module: DashboardFoundation["modules"][number] }
  | { kind: "available"; module: DashboardFoundation["modules"][number]; denied: boolean }
  | { kind: "unknown" };

/**
 * Adjudicates a dashboard location before any legacy fallback, special
 * parser, canonicalization, content render, panel mount or business
 * transport. Known coming-soon always wins over permission allow/deny
 * (backend decision order); available deny is surfaced as denied (the shell
 * renders the forbidden state); unknown stays a safe fallback.
 */
export function adjudicateFoundationRoute(
  pathname: string,
  search: string,
  modules: readonly DashboardRouteModuleLike[]
): FoundationRouteAdjudication {
  const resolution = resolveDashboardFoundationRoute(`${pathname}${search ? `?${search}` : ""}`, modules);
  if (resolution.kind === "unknown") return { kind: "unknown" };
  const module = modules.find((entry) => entry.module === resolution.owner);
  if (!module) return { kind: "unknown" };
  if (module.status === "coming_soon") {
    return { kind: "coming_soon", module: module as DashboardFoundation["modules"][number] };
  }
  return { kind: "available", module: module as DashboardFoundation["modules"][number], denied: module.readAllowed === false };
}

const FOUNDATION_TO_LEGACY_TAB: Record<FoundationModule, TabKey> = {
  overview: "overview",
  products: "products",
  categories: "categories",
  pricing: "pricing",
  promotions: "promotions",
  inventory: "inventorySnapshots",
  orders: "orders",
  payments: "paymentSessions",
  customers: "crmContacts",
  users: "users",
  roles: "roles",
  dealers: "dealers",
  applications: "dealerApplications",
  leads: "contactLeads",
  reviews: "productReviews",
  support: "supportHandoffs",
  email: "emailOutbox",
  content: "cms",
  operations: "operations",
  erp: "erpSyncJobs",
  audit: "auditLogs",
  settings: "settings"
};

export function foundationModuleToLegacyTab(module: FoundationModule): TabKey {
  return FOUNDATION_TO_LEGACY_TAB[module];
}

export function legacyTabToFoundationModule(tab: TabKey): FoundationModule {
  const entry = Object.entries(FOUNDATION_TO_LEGACY_TAB).find(([, legacyTab]) => legacyTab === tab);
  if (!entry) throw new TypeError(`Unknown Dashboard tab: ${tab}.`);
  return entry[0] as FoundationModule;
}

const FILTER_QUERY_BY_TAB: Partial<Record<TabKey, string>> = {
  contactLeads: "leadStatus",
  crmContacts: "crmStage",
  dealerApplications: "appStatus",
  productReviews: "reviewStatus",
  supportHandoffs: "handoffStatus",
  orders: "orderStatus",
  erpSyncJobs: "erpStatus"
};

const LEGAL_FILTER_VALUES_BY_TAB: Partial<Record<TabKey, ReadonlySet<string>>> = {
  contactLeads: new Set(["new", "routed", "closed", "spam"]),
  crmContacts: new Set(["registered", "engaged", "checkout_started", "customer", "high_intent", "archived"]),
  dealerApplications: new Set(["submitted", "under_review", "approved", "rejected", "archived"]),
  productReviews: new Set(["pending", "published", "rejected", "archived"]),
  supportHandoffs: new Set(["new", "in_progress", "resolved", "closed"]),
  orders: new Set(["pending_payment", "paid", "processing", "fulfilled", "cancelled", "payment_expired"]),
  erpSyncJobs: new Set(["failed", "retry_wait", "pending"])
};

const PAGINATED_TABS = new Set<TabKey>([
  "contactLeads", "crmContacts", "dealerApplications", "productReviews", "supportHandoffs",
  "orders", "paymentSessions", "erpSyncJobs", "inventorySnapshots", "emailOutbox", "auditLogs"
]);

export function dashboardQueueHref(tab: TabKey, locale: string, filter: string, page: number) {
  const params = new URLSearchParams();
  const filterKey = FILTER_QUERY_BY_TAB[tab];
  if (filterKey && filter && LEGAL_FILTER_VALUES_BY_TAB[tab]?.has(filter)) params.set(filterKey, filter);
  if (PAGINATED_TABS.has(tab) && Number.isInteger(page) && page > 1) params.set("page", String(page));
  const route = DASHBOARD_FOUNDATION_MODULE_ROUTES[legacyTabToFoundationModule(tab)];
  const pathname = `${locale === "fr-CA" ? "/fr" : ""}${route}`;
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export type FoundationLocation = {
  /** Available module the actor may read (business renderable), or null. */
  active: DashboardFoundation["modules"][number] | null;
  /** Known coming-soon module owning the location, or null. */
  comingSoon: DashboardFoundation["modules"][number] | null;
  /** True when the location matches no known module (safe fallback). */
  unknown: boolean;
  activeFilter: string;
  activePage: number;
  canonicalHref: string;
};

/**
 * Resolves a dashboard location from the live Foundation projection using
 * the backend-consistent selector resolver. Known coming-soon locations
 * yield `comingSoon` (never `active`) and keep the input as their identity
 * canonical href — no business canonicalization, panel mount or transport is
 * possible from the result. Unknown locations fall back to the safest
 * readable module (overview). Available denied modules fall back the same
 * way; the shell renders the forbidden state from the authorization
 * location, never a coming-soon state.
 */
export function resolveFoundationLocation(pathname: string, search: string, foundation: DashboardFoundation): FoundationLocation {
  const input = `${pathname}${search ? `?${search}` : ""}`;
  const resolution = resolveDashboardFoundationRoute(input, foundation.modules);
  const french = pathname === "/fr/dashboard" || pathname.startsWith("/fr/dashboard/");
  const localePrefix = french ? "/fr" : "";

  if (resolution.kind === "unknown") {
    const fallback = resolveFoundationModule("/dashboard", foundation);
    return {
      active: fallback,
      comingSoon: null,
      unknown: true,
      activeFilter: "",
      activePage: 1,
      canonicalHref: `${localePrefix}${fallback?.route ?? "/dashboard"}`
    };
  }

  const module = foundation.modules.find((entry) => entry.module === resolution.owner) ?? null;
  if (!module || module.status === "coming_soon") {
    return {
      active: null,
      comingSoon: module,
      unknown: false,
      activeFilter: "",
      activePage: 1,
      canonicalHref: input
    };
  }

  const params = new URLSearchParams(search);
  const canonicalParams = new URLSearchParams();
  let activeFilter = "";
  let activePage = 1;
  if (module.readAllowed) {
    const tab = foundationModuleToLegacyTab(module.module);
    const filterKey = FILTER_QUERY_BY_TAB[tab];
    const filterValue = filterKey ? params.get(filterKey) : null;
    if (filterKey && filterValue && LEGAL_FILTER_VALUES_BY_TAB[tab]?.has(filterValue)) {
      activeFilter = filterValue;
      canonicalParams.set(filterKey, filterValue);
    }
    const page = params.get("page");
    if (PAGINATED_TABS.has(tab) && page && /^[1-9]\d*$/.test(page)) {
      const parsedPage = Number(page);
      if (Number.isSafeInteger(parsedPage)) {
        activePage = parsedPage;
        if (page !== "1") canonicalParams.set("page", page);
      }
    }
  }

  const active = module.readAllowed ? module : resolveFoundationModule("/dashboard", foundation);
  const canonicalSearch = canonicalParams.toString();
  const canonicalPath = `${localePrefix}${active?.route ?? "/dashboard"}`;
  return {
    active,
    comingSoon: null,
    unknown: false,
    activeFilter,
    activePage,
    canonicalHref: canonicalSearch ? `${canonicalPath}?${canonicalSearch}` : canonicalPath
  };
}

export function allowedFoundationModules(foundation: DashboardFoundation) {
  return foundation.modules.filter((module) => module.readAllowed);
}

/**
 * Shared nav membership rule used by both the ready shell and the unified
 * coming-soon shell: coming-soon modules always stay visible (non-Link,
 * non-focusable), available modules only when readable, and registry entries
 * without a projection readAllowed flag (no projection available, e.g.
 * anonymous) are retained.
 */
// V11-R1 P0 information architecture: Pricing and Inventory leave the
// first-level navigation and move into Product/SKU editing (P1). Their
// routes keep resolving (direct URLs still reach the panels until P1's
// redirect lands) but they are no longer navigation entry points.
const NAV_HIDDEN_MODULES = new Set<string>(["pricing", "inventory"]);

export function navVisibleModule(entry: { module?: string; status: DashboardModuleStatus; readAllowed?: boolean }): boolean {
  if (entry.module && NAV_HIDDEN_MODULES.has(entry.module)) return false;
  return entry.status === "coming_soon" || entry.readAllowed !== false;
}

export function resolveFoundationModule(pathname: string, foundation: DashboardFoundation) {
  const requested = foundation.modules.find((module) => module.route === pathname);
  if (requested?.readAllowed) return requested;
  return foundation.modules.find((module) => module.module === "overview" && module.readAllowed)
    ?? allowedFoundationModules(foundation)[0]
    ?? null;
}

export function foundationHref(module: FoundationModule) {
  return DASHBOARD_FOUNDATION_MODULE_ROUTES[module];
}
