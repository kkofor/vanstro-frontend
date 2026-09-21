import { INITIAL_PERMISSIONS } from "@vanstro/db/permissions";
import { Hono } from "hono";
import type { DashboardEnv } from "./access.js";

// Contract version forwarded from dashboard-foundation.v1 to v1.1: the module
// projection now carries the authoritative status ("available" | "coming_soon"),
// label/group, the canonical route and a safe typed selector summary, plus the
// stable non-leaking denial reason vocabulary ("permission_required" |
// "coming_soon"). All previously shipped fields (module, route, readAllowed,
// optional reason) keep their v1 meaning.
export const DASHBOARD_FOUNDATION_CONTRACT_VERSION = "dashboard-foundation.v1.1";
export const DASHBOARD_SHELL_FLAG_KEY = "dashboard.shell.v2";

// Frozen V11-0 Authority v1.1.1 — SHA-256 of
// contracts/v11-0-admin-module-authority.v1.1.1.json
// (2434e1affb9a4b226ec776870ce260ed560c0a2a3ec1a856c52d40465c36c271).
// The typed registry below is the single source of truth the runtime resolves
// against; foundation.test.ts reads the persisted authority, verifies this
// SHA, and mechanically derives the expected registry so any drift fails.
export const DASHBOARD_FOUNDATION_AUTHORITY_SHA256 =
  "2434e1affb9a4b226ec776870ce260ed560c0a2a3ec1a856c52d40465c36c271";

export type DashboardModuleStatus = "available" | "coming_soon";
export type DashboardSelectorKind = "path_exact" | "path_prefix" | "query_value" | "legacy_tab";

export type DashboardModuleCanonical = { kind: "path_exact"; pathname: string };
export type DashboardPathSelector = { kind: "path_exact" | "path_prefix"; pathname: string };
export type DashboardQuerySelector = { kind: "query_value" | "legacy_tab"; pathname: string; key: string; value: string };
export type DashboardModuleSelector = DashboardPathSelector | DashboardQuerySelector;

export type DashboardFoundationModule = {
  module: string;
  label: string;
  status: DashboardModuleStatus;
  group: string;
  permissions: readonly string[];
  canonical: DashboardModuleCanonical;
  selectors: readonly DashboardModuleSelector[];
  // Derived compatibility view of the canonical pathname (kept for
  // dashboard/authorization.ts). `route` is not a second truth source:
  // the registry construction below derives it from `canonical` and the
  // registry validator rejects any drift.
  readonly route: string;
};

type DashboardFoundationModuleDefinition = Omit<DashboardFoundationModule, "route">;

// Authoritative registry — frozen V11-0 admin-module authority v1.1.1.
// Exactly 22 modules: 11 available + 11 coming_soon, unique module keys,
// canonical pathnames and selector identities. Each module owns exactly one
// legacy_tab selector on /dashboard; content/operations additionally own
// noncanonical path_exact selectors, operations owns query_value selectors,
// and settings owns the boundary-preserving path_prefix /dashboard/settings/.
const DASHBOARD_FOUNDATION_MODULE_DEFINITIONS: readonly DashboardFoundationModuleDefinition[] = [
  // available — 11
  {
    module: "overview", label: "工作台", status: "available", group: "workspace", permissions: ["dashboard.access"],
    canonical: { kind: "path_exact", pathname: "/dashboard" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "overview" }]
  },
  {
    module: "products", label: "产品", status: "available", group: "catalog", permissions: ["products.read", "products.write"],
    canonical: { kind: "path_exact", pathname: "/dashboard/products" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "products" }]
  },
  {
    module: "categories", label: "分类", status: "available", group: "catalog", permissions: ["products.read", "categories.write"],
    canonical: { kind: "path_exact", pathname: "/dashboard/categories" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "categories" }]
  },
  {
    module: "pricing", label: "价格", status: "available", group: "catalog", permissions: ["products.read", "pricing.write"],
    canonical: { kind: "path_exact", pathname: "/dashboard/pricing" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "pricing" }]
  },
  {
    module: "promotions", label: "促销", status: "available", group: "catalog", permissions: ["products.read", "pricing.write"],
    canonical: { kind: "path_exact", pathname: "/dashboard/promotions" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "promotions" }]
  },
  {
    module: "inventory", label: "库存", status: "available", group: "catalog", permissions: ["inventory.read", "inventory.write"],
    canonical: { kind: "path_exact", pathname: "/dashboard/inventory" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "inventorySnapshots" }]
  },
  {
    module: "orders", label: "订单", status: "available", group: "commerce", permissions: ["orders.read", "orders.update", "orders.assign"],
    canonical: { kind: "path_exact", pathname: "/dashboard/orders" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "orders" }]
  },
  {
    module: "customers", label: "客户", status: "available", group: "commerce", permissions: ["crm.read", "crm.update"],
    canonical: { kind: "path_exact", pathname: "/dashboard/customers" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "crmContacts" }]
  },
  {
    module: "users", label: "用户", status: "available", group: "organization", permissions: ["users.manage"],
    canonical: { kind: "path_exact", pathname: "/dashboard/users" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "users" }]
  },
  {
    module: "dealers", label: "经销商", status: "available", group: "organization", permissions: ["dealers.read", "settings.write"],
    canonical: { kind: "path_exact", pathname: "/dashboard/dealers" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "dealers" }]
  },
  {
    module: "erp", label: "ERP / 集成", status: "available", group: "platform", permissions: ["erp.sync.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/erp" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "erpSyncJobs" }]
  },
  // coming_soon — 11
  {
    module: "payments", label: "支付", status: "coming_soon", group: "commerce", permissions: ["orders.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/payments" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "paymentSessions" }]
  },
  {
    module: "roles", label: "角色", status: "coming_soon", group: "organization", permissions: ["users.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/roles" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "roles" }]
  },
  {
    module: "applications", label: "申请", status: "coming_soon", group: "organization", permissions: ["dealer_applications.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/applications" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "dealerApplications" }]
  },
  {
    module: "leads", label: "销售线索", status: "coming_soon", group: "engagement", permissions: ["leads.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/leads" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "contactLeads" }]
  },
  {
    module: "reviews", label: "评价", status: "coming_soon", group: "engagement", permissions: ["reviews.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/reviews" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "productReviews" }]
  },
  {
    module: "support", label: "客户支持", status: "coming_soon", group: "engagement", permissions: ["support.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/support" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "supportHandoffs" }]
  },
  {
    module: "email", label: "邮件", status: "coming_soon", group: "engagement",
    permissions: ["email.outbox.read", "email.provider.read", "email.templates.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/email" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "emailOutbox" }]
  },
  {
    module: "content", label: "内容", status: "coming_soon", group: "platform", permissions: ["content.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/content" },
    selectors: [
      { kind: "path_exact", pathname: "/dashboard/media" },
      { kind: "path_exact", pathname: "/dashboard/data-jobs" },
      { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "cms" }
    ]
  },
  {
    module: "operations", label: "运营", status: "coming_soon", group: "platform",
    permissions: ["audit_logs.read", "analytics.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/operations" },
    selectors: [
      { kind: "path_exact", pathname: "/dashboard/runtime" },
      { kind: "path_exact", pathname: "/dashboard/analytics-foundation" },
      { kind: "query_value", pathname: "/dashboard/operations", key: "view", value: "jobs" },
      { kind: "query_value", pathname: "/dashboard/operations", key: "view", value: "work-queue" },
      { kind: "query_value", pathname: "/dashboard/operations", key: "view", value: "notifications" },
      { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "operations" }
    ]
  },
  {
    module: "audit", label: "审计", status: "coming_soon", group: "platform", permissions: ["audit_logs.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/audit" },
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "auditLogs" }]
  },
  {
    module: "settings", label: "设置", status: "coming_soon", group: "platform", permissions: ["settings.read"],
    canonical: { kind: "path_exact", pathname: "/dashboard/settings" },
    selectors: [
      { kind: "path_prefix", pathname: "/dashboard/settings/" },
      { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "settings" }
    ]
  }
];

// The canonical pathname is the only truth for `route`; it is derived here so
// the two can never drift in the shipped registry.
export const DASHBOARD_FOUNDATION_MODULES: readonly DashboardFoundationModule[] =
  DASHBOARD_FOUNDATION_MODULE_DEFINITIONS.map((entry) => ({ ...entry, route: entry.canonical.pathname }));

const DASHBOARD_MODULE_STATUSES: Record<DashboardModuleStatus, true> = { available: true, coming_soon: true };
const DASHBOARD_EXPECTED_MODULE_COUNT = 22;
const DASHBOARD_SETTINGS_MODULE = "settings";
const DASHBOARD_SETTINGS_PREFIX_SELECTOR = "/dashboard/settings/";
const DASHBOARD_SELECTOR_KINDS: Record<DashboardSelectorKind, true> = {
  path_exact: true,
  path_prefix: true,
  query_value: true,
  legacy_tab: true
};

function isDashboardQuerySelector(selector: DashboardModuleSelector): selector is DashboardQuerySelector {
  return selector.kind === "query_value" || selector.kind === "legacy_tab";
}

function dashboardSelectorIdentity(selector: DashboardModuleSelector): string {
  return isDashboardQuerySelector(selector)
    ? `${selector.kind}:${selector.pathname}?${selector.key}=${selector.value}`
    : `${selector.kind}:${selector.pathname}`;
}

export function validateDashboardFoundationRegistry(modules: readonly DashboardFoundationModule[]): void {
  const moduleKeys = new Set<string>();
  const canonicalPaths = new Set<string>();
  const exactPaths = new Set<string>();
  const selectorIdentities = new Set<string>();

  for (const entry of modules) {
    if (DASHBOARD_MODULE_STATUSES[entry.status] !== true) {
      throw new Error(`dashboard foundation registry: illegal status "${entry.status}" for module "${entry.module}"`);
    }
    if (moduleKeys.has(entry.module)) {
      throw new Error(`dashboard foundation registry: duplicate module key "${entry.module}"`);
    }
    moduleKeys.add(entry.module);
    if (entry.canonical.kind !== "path_exact") {
      throw new Error(`dashboard foundation registry: canonical selector of module "${entry.module}" must be path_exact`);
    }
    if (entry.route !== entry.canonical.pathname) {
      throw new Error(`dashboard foundation registry: route mirror mismatch for module "${entry.module}"`);
    }
    if (canonicalPaths.has(entry.canonical.pathname)) {
      throw new Error(`dashboard foundation registry: duplicate canonical path "${entry.canonical.pathname}"`);
    }
    canonicalPaths.add(entry.canonical.pathname);

    let hasLegacyTab = false;
    for (const selector of entry.selectors) {
      if (DASHBOARD_SELECTOR_KINDS[selector.kind] !== true) {
        throw new Error(`dashboard foundation registry: illegal selector kind "${selector.kind}" for module "${entry.module}"`);
      }
      const identity = dashboardSelectorIdentity(selector);
      if (selectorIdentities.has(identity)) {
        throw new Error(`dashboard foundation registry: duplicate selector identity "${identity}"`);
      }
      selectorIdentities.add(identity);
      if (selector.kind === "legacy_tab") hasLegacyTab = true;
      if (selector.kind === "path_exact") {
        if (canonicalPaths.has(selector.pathname) || exactPaths.has(selector.pathname)) {
          throw new Error(`dashboard foundation registry: exact path collision "${selector.pathname}"`);
        }
        exactPaths.add(selector.pathname);
      }
      if (selector.kind === "query_value" || selector.kind === "legacy_tab") {
        if (!canonicalPaths.has(selector.pathname)) {
          throw new Error(`dashboard foundation registry: query selector "${identity}" is not attached to a canonical path`);
        }
      }
    }
    if (!hasLegacyTab) {
      throw new Error(`dashboard foundation registry: module "${entry.module}" must own a legacy_tab selector`);
    }
  }

  if (moduleKeys.size !== DASHBOARD_EXPECTED_MODULE_COUNT) {
    throw new Error(`dashboard foundation registry: expected ${DASHBOARD_EXPECTED_MODULE_COUNT} modules, got ${moduleKeys.size}`);
  }
  const settings = modules.find((entry) => entry.module === DASHBOARD_SETTINGS_MODULE);
  if (!settings || settings.status !== "coming_soon") {
    throw new Error(`dashboard foundation registry: module "${DASHBOARD_SETTINGS_MODULE}" must exist with status "coming_soon"`);
  }
  if (!settings.selectors.some((selector) => selector.kind === "path_prefix" && selector.pathname === DASHBOARD_SETTINGS_PREFIX_SELECTOR)) {
    throw new Error(`dashboard foundation registry: module "${DASHBOARD_SETTINGS_MODULE}" must own the "${DASHBOARD_SETTINGS_PREFIX_SELECTOR}" prefix selector`);
  }
}

// Fail closed at module load: an illegal registry status or a uniqueness
// violation prevents the API from booting instead of serving a wrong registry.
validateDashboardFoundationRegistry(DASHBOARD_FOUNDATION_MODULES);

// ---------------------------------------------------------------------------
// Runtime route resolver — vanstro-v11-url-selector.v1
//
// Input is a site-relative pathname + search string only. Anything that is
// not site-relative, carries a fragment, or contains malformed percent
// encoding is rejected (fail closed, typed reason). Exactly one leading /fr
// locale prefix is stripped; a second one is rejected. Trailing slashes are
// normalized away (root stays /). The query is parsed with URLSearchParams:
// selector keys compare after percent-decoding, order is irrelevant, extra
// parameters never change the owner, and a key repeated with conflicting
// values fails closed. Matching order: canonical exact -> noncanonical exact
// -> prefix (boundary-preserving) -> query_value/legacy_tab refinement ->
// unknown.
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

type DashboardModuleRef = { readonly module: string; readonly status: DashboardModuleStatus };

const DASHBOARD_CANONICAL_BY_PATH: ReadonlyMap<string, DashboardModuleRef> = new Map(
  DASHBOARD_FOUNDATION_MODULES.map((entry) => [entry.canonical.pathname, { module: entry.module, status: entry.status }])
);

const DASHBOARD_EXACT_BY_PATH: ReadonlyMap<string, DashboardModuleRef> = new Map(
  DASHBOARD_FOUNDATION_MODULES.flatMap((entry) =>
    entry.selectors
      .filter((selector): selector is DashboardPathSelector & { kind: "path_exact" } => selector.kind === "path_exact")
      .map((selector) => [selector.pathname, { module: entry.module, status: entry.status }] as const)
  )
);

const DASHBOARD_PREFIX_SELECTORS: readonly { readonly prefix: string; readonly owner: DashboardModuleRef }[] =
  DASHBOARD_FOUNDATION_MODULES.flatMap((entry) =>
    entry.selectors
      .filter((selector): selector is DashboardPathSelector & { kind: "path_prefix" } => selector.kind === "path_prefix")
      .map((selector) => ({ prefix: selector.pathname, owner: { module: entry.module, status: entry.status } }))
  );

type DashboardQuerySelectorRef = DashboardQuerySelector & { readonly owner: DashboardModuleRef };
const DASHBOARD_QUERY_SELECTORS_BY_PATH: ReadonlyMap<string, readonly DashboardQuerySelectorRef[]> = (() => {
  const byPath = new Map<string, DashboardQuerySelectorRef[]>();
  for (const entry of DASHBOARD_FOUNDATION_MODULES) {
    for (const selector of entry.selectors) {
      if (!isDashboardQuerySelector(selector)) continue;
      const owner = { module: entry.module, status: entry.status };
      const refs = byPath.get(selector.pathname);
      if (refs) refs.push({ ...selector, owner });
      else byPath.set(selector.pathname, [{ ...selector, owner }]);
    }
  }
  return byPath;
})();

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

export function resolveDashboardRoute(input: string): DashboardRouteResolution {
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
  let owner: DashboardModuleRef | undefined;
  let source: DashboardRouteMatchSource | undefined;
  const canonical = DASHBOARD_CANONICAL_BY_PATH.get(pathname);
  if (canonical) {
    owner = canonical;
    source = "canonical";
  } else {
    const exact = DASHBOARD_EXACT_BY_PATH.get(pathname);
    if (exact) {
      owner = exact;
      source = "path_exact";
    } else {
      for (const { prefix, owner: prefixOwner } of DASHBOARD_PREFIX_SELECTORS) {
        if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
          owner = prefixOwner;
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
  const querySelectors = DASHBOARD_QUERY_SELECTORS_BY_PATH.get(pathname);
  if (querySelectors && querySelectors.length > 0) {
    let refined: DashboardModuleRef | undefined;
    let refinedSource: "query_value" | "legacy_tab" | undefined;
    let ambiguous = false;
    for (const selector of querySelectors) {
      const values = params.get(selector.key);
      if (values && values.every((value) => value === selector.value)) {
        if (refined && refined.module !== selector.owner.module) {
          ambiguous = true;
          break;
        }
        refined = selector.owner;
        refinedSource = selector.kind;
      }
    }
    if (ambiguous) return { kind: "unknown", reason: "ambiguous_query" };
    if (refined && refinedSource) {
      owner = refined;
      source = refinedSource;
    }
  }

  if (owner && source) {
    return { kind: "known", owner: owner.module, status: owner.status, source, locale, pathname, search };
  }
  return { kind: "unknown", reason: "no_match" };
}

export type DashboardModuleReason = "permission_required" | "coming_soon";

export type DashboardModuleSelectorSummary = {
  kind: DashboardSelectorKind;
  pathname: string;
  key?: string;
  value?: string;
};

export type DashboardModuleProjection = {
  module: string;
  label: string;
  group: string;
  status: "available" | "coming_soon";
  route: string;
  selectors: readonly DashboardModuleSelectorSummary[];
  readAllowed: boolean;
  reason?: DashboardModuleReason;
};

function summarizeSelectors(selectors: readonly DashboardModuleSelector[]): DashboardModuleSelectorSummary[] {
  return selectors.map((selector) => ({
    kind: selector.kind,
    pathname: selector.pathname,
    ...(selector.kind === "query_value" || selector.kind === "legacy_tab"
      ? { key: selector.key, value: selector.value }
      : {})
  }));
}

// Decision order (frozen V11-0 authority): known coming_soon >
// known available + permission allow > known available + permission deny >
// unknown route (the resolver's no-match, never surfaced here). A permission
// allow can never promote a coming_soon module; coming-soon verdicts never
// disclose whether the actor would have been allowed. Unknown actor
// permissions are filtered against the canonical permission set and can never
// create or promote a module. The projection carries label/group/status/
// route and a safe selector summary — never the registry's permission lists.
export function projectDashboardModules(permissions: string[]): DashboardModuleProjection[] {
  const canonicalPermissions = new Set<string>(INITIAL_PERMISSIONS);
  const actorPermissions = new Set(permissions.filter((permission) => canonicalPermissions.has(permission)));

  return DASHBOARD_FOUNDATION_MODULES.map((entry) => {
    const selectors = summarizeSelectors(entry.selectors);
    if (entry.status === "coming_soon") {
      return {
        module: entry.module,
        label: entry.label,
        group: entry.group,
        status: "coming_soon" as const,
        route: entry.route,
        selectors,
        readAllowed: false,
        reason: "coming_soon" as const
      };
    }
    const readAllowed = entry.permissions.some((permission) => actorPermissions.has(permission));
    return {
      module: entry.module,
      label: entry.label,
      group: entry.group,
      status: "available" as const,
      route: entry.route,
      selectors,
      readAllowed,
      ...(readAllowed ? {} : { reason: "permission_required" as const })
    };
  });
}

// V11-R1 F4 promotions write gate: the ready-shell edit grant resolves ONLY
// against the promotions module's own pricing.write allow. Products/dealers
// permissions (products.write, settings.write, dealers.read, ...) can never
// open promotions editing, and if the promotions module ever stops carrying
// pricing.write the gate fails closed instead of guessing.
export function promotionsCanEdit(permissions: string[]): boolean {
  const promotions = DASHBOARD_FOUNDATION_MODULES.find((entry) => entry.module === "promotions");
  if (!promotions || !promotions.permissions.includes("pricing.write")) return false;
  return permissions.includes("pricing.write");
}

export function dashboardShellMode(value: string | undefined) {
  return value === "internal" ? "internal" as const : "disabled" as const;
}

export function dashboardShellInternalActorIds(value: string | undefined) {
  return new Set((value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));
}

export function dashboardShellConfig(env: NodeJS.ProcessEnv = process.env) {
  try {
    return {
      mode: dashboardShellMode(env.DASHBOARD_SHELL_V2_MODE),
      actorIds: dashboardShellInternalActorIds(env.DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS)
    };
  } catch {
    return { mode: "disabled" as const, actorIds: new Set<string>() };
  }
}

export function createDashboardFoundationRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/foundation", (context) => {
    const actorUserId = context.get("actorUserId");
    const { mode, actorIds } = dashboardShellConfig();
    const enabled = mode === "internal" && actorIds.has(actorUserId);
    const code = mode === "disabled"
      ? "DASHBOARD_SHELL_DISABLED"
      : enabled ? "DASHBOARD_SHELL_READY" : "DASHBOARD_SHELL_ACTOR_NOT_ALLOWED";
    const requestId = context.res.headers.get("X-Request-Id")!;

    return context.json({
      data: {
        contractVersion: DASHBOARD_FOUNDATION_CONTRACT_VERSION,
        actor: {
          id: actorUserId,
          displayLabel: "Administrator",
          roleLabels: context.get("actorRoles")
        },
        modules: projectDashboardModules(context.get("actorPermissions")),
        visibility: {
          scope: "unavailable",
          fields: "permission-only"
        },
        shell: {
          flag: DASHBOARD_SHELL_FLAG_KEY,
          mode,
          enabled,
          code,
          readOnly: true
        },
        readiness: enabled ? "ready" : "disabled",
        requestId
      }
    });
  });

  return routes;
}
