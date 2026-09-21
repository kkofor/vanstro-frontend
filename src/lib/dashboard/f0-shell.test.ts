import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test, { type TestContext } from "node:test";
import { DASHBOARD_FOUNDATION_MODULE_ROUTES, DASHBOARD_FOUNDATION_MODULE_STATE, type DashboardFoundation } from "../api/api-contract.ts";
import { validateApiResult, validateDashboardFoundation } from "../api/runtime-validation.ts";
import {
  DashboardFoundationRequestError,
  adjudicateFoundationRoute,
  assertReadOnlyMethod,
  classifyDashboardFoundation,
  classifyDashboardFoundationStatus,
  createDashboardFoundationRequestCoordinator,
  dashboardChromeOwned,
  dashboardFoundationDisposition,
  dashboardSessionExpiredNotice,
  type DashboardFoundationState,
  dashboardFoundationLoadingState,
  dashboardFoundationRequest,
  foundationModuleToLegacyTab,
  legacyTabToFoundationModule,
  navVisibleModule,
  resolveDashboardFoundationRoute,
  resolveFoundationLocation,
  dashboardQueueHref,
  resolveFoundationModule
} from "./f0-shell.ts";
import { sessionNoticeAction } from "./session-notice.ts";

// Persisted V11-0 Authority v1.1.1 and its generated vector evidence live in
// AI_OS (the same files the backend foundation tests read). The registry and
// every vector are verified against the SHA-256 pins below so any drift in
// the persisted authority fails closed instead of silently diverging.
const AI_OS_TASKS_ROOT = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks";
const AUTHORITY_PATH = `${AI_OS_TASKS_ROOT}/contracts/v11-0-admin-module-authority.v1.1.1.json`;
const POSITIVE_VECTORS_PATH = `${AI_OS_TASKS_ROOT}/evidence/v11-0/selector-positive-vectors.v1.json`;
const NEGATIVE_VECTORS_PATH = `${AI_OS_TASKS_ROOT}/evidence/v11-0/selector-negative-vectors.v1.json`;
const AUTHORITY_SHA256 = "2434e1affb9a4b226ec776870ce260ed560c0a2a3ec1a856c52d40465c36c271";
const POSITIVE_VECTORS_SHA256 = "5cf9b7dff1cf8632de8f667a137315ab45b989bbf720f9e1f993d2211b5365d8";
const NEGATIVE_VECTORS_SHA256 = "773373b804cbbe55c3e220ba7510384465b67723ee278bf653f8402e2c152d65";

function sha256File(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

type PersistedAuthority = {
  schemaVersion: string;
  status: string;
  modules: Array<{
    module: string;
    label: string;
    status: "available" | "coming_soon";
    group: string;
    permissions: string[];
    canonical: { kind: "path_exact"; pathname: string };
    selectors: Array<{ kind: "path_exact" | "path_prefix" | "query_value" | "legacy_tab"; pathname: string; key?: string; value?: string }>;
  }>;
  counts: Record<string, number>;
};

type PositiveVector = { locale: "en-CA" | "fr-CA"; slash: "with" | "without"; url: string; owner: string; status: "available" | "coming_soon"; source: "canonical" | "path_exact" | "query_value" | "legacy_tab"; query?: string };
type PrefixVector = { url: string; owner: string; status: "available" | "coming_soon"; source: "path_prefix" };

/**
 * Full v1.1 projection built mechanically from the shared registry. The
 * status/reason/readAllowed matrix mirrors the backend producer: coming_soon
 * modules always project readAllowed=false with reason "coming_soon";
 * available modules are allowed only when listed, otherwise denied with
 * reason "permission_required".
 */
function projection(readAllowedModules: readonly string[] = []): DashboardFoundation {
  const allowed = new Set(readAllowedModules);
  return {
    contractVersion: "dashboard-foundation.v1.1",
    actor: { id: "admin-1", displayLabel: "Administrator", roleLabels: ["admin"] },
    modules: DASHBOARD_FOUNDATION_MODULE_STATE.map((state) => ({
      module: state.module,
      label: state.label,
      group: state.group,
      status: state.status,
      route: state.route,
      selectors: state.selectors,
      readAllowed: state.status === "available" && allowed.has(state.module),
      ...(state.status === "coming_soon"
        ? { reason: "coming_soon" as const }
        : state.status === "available" && !allowed.has(state.module)
          ? { reason: "permission_required" as const }
          : {})
    })),
    visibility: { scope: "unavailable", fields: "permission-only" },
    shell: { flag: "dashboard.shell.v2", mode: "internal", enabled: true, code: "DASHBOARD_SHELL_READY", readOnly: true },
    readiness: "ready",
    requestId: "request-1"
  };
}

const foundation = projection(["overview"]);

function mockResponse(status: number, body: unknown = { data: foundation }) {
  return new Response(JSON.stringify(body), { status });
}

async function withFetch(
  context: TestContext,
  fetchImplementation: typeof fetch
) {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = fetchImplementation;
}

test("foundation request coordinator deterministically replaces, invalidates, and settles requests", () => {
  const coordinator = createDashboardFoundationRequestCoordinator();
  const anonymousGeneration = coordinator.begin(true);
  assert.equal(anonymousGeneration, 1);
  assert.equal(coordinator.isActive(), true);
  assert.equal(coordinator.begin(true), null);

  const loginGeneration = coordinator.begin(false);
  assert.equal(loginGeneration, 2);
  assert.equal(coordinator.isCurrent(anonymousGeneration!), false);
  assert.equal(coordinator.isCurrent(loginGeneration!), true);
  coordinator.finish(anonymousGeneration!);
  assert.equal(coordinator.isActive(), true);
  coordinator.finish(loginGeneration!);
  assert.equal(coordinator.isActive(), false);

  const logoutGeneration = coordinator.begin(true);
  coordinator.invalidate();
  assert.equal(coordinator.isCurrent(logoutGeneration!), false);
  assert.equal(coordinator.isActive(), false);
  assert.deepEqual(dashboardFoundationLoadingState(), { status: "loading", foundation: null, failure: null });
});

test("Dashboard session events drive anonymous to ready and clear Foundation on logout", async () => {
  const sessionSource = await readFile(new URL("../../components/dashboard/hooks/useDashboardSession.ts", import.meta.url), "utf8");
  const boundarySource = await readFile(new URL("../../components/dashboard/DashboardFoundationContext.tsx", import.meta.url), "utf8");
  const eventSource = await readFile(new URL("./session-event.ts", import.meta.url), "utf8");

  assert.match(eventSource, /DASHBOARD_SESSION_CHANGED_EVENT = "dashboard-session-changed"/);
  assert.match(eventSource, /CustomEvent<DashboardSessionChangedDetail>/);
  assert.match(sessionSource, /dispatchDashboardSessionChanged\("authenticated"\)/);
  assert.ok((sessionSource.match(/dispatchDashboardSessionChanged\("anonymous"\)/g) ?? []).length >= 2);
  assert.match(boundarySource, /subscribeToDashboardSessionChanged/);
  assert.match(boundarySource, /sessionState === "authenticated"\) void load\(\{ force: true, presentation: "blocking" \}\)/);
  assert.match(boundarySource, /else invalidateSession\(\)/);
  assert.match(boundarySource, /setState\(\{ status: "anonymous", foundation: null, failure: "anonymous" \}\)/);
  assert.match(boundarySource, /const nextState = classifyDashboardFoundation\(\{ foundation: projectAuthorizedFoundation\(foundation, nextAuthorization\) \}\)/);
  assert.match(boundarySource, /setAuthorization\(null\)/);
});

test("Foundation non-ready disposition atomically clears authorization, refs and expiry timer", async () => {
  const boundarySource = await readFile(new URL("../../components/dashboard/DashboardFoundationContext.tsx", import.meta.url), "utf8");
  // The server-explicit non-ready (legacy) branch must drop the stale
  // authorization + refs + timer rather than only setting the disposition.
  assert.match(boundarySource, /authorizationRef\.current = null;/);
  assert.match(boundarySource, /setAuthorization\(null\);/);
  assert.match(boundarySource, /clearTimeout\(authorizationExpiryRef\.current \?\? undefined\);/);
  assert.match(boundarySource, /authorizationExpiryRef\.current = null;/);
  assert.match(boundarySource, /lastSuccessfulAtRef\.current = null;/);
});

test("Dashboard F0 method guard rejects every write method", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.throws(() => assertReadOnlyMethod(method), /only permits GET or HEAD/);
  }
});

test("foundation status classification distinguishes anonymous, forbidden, and unavailable", () => {
  assert.equal(classifyDashboardFoundationStatus(200), null);
  assert.equal(classifyDashboardFoundationStatus(204), null);
  assert.equal(classifyDashboardFoundationStatus(401), "anonymous");
  assert.equal(classifyDashboardFoundationStatus(403), "forbidden");
  for (const status of [400, 404, 408, 429, 500, 502, 503]) {
    assert.equal(classifyDashboardFoundationStatus(status), "unavailable");
  }
});

for (const [status, failure] of [[401, "anonymous"], [403, "forbidden"], [500, "unavailable"]] as const) {
  test(`foundation transport classifies HTTP ${status} as ${failure}`, async (context) => {
    await withFetch(context, async (input, init) => {
      assert.equal(input, "https://api.example/dashboard/foundation");
      assert.deepEqual(init, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: undefined
      });
      return mockResponse(status);
    });
    await assert.rejects(
      dashboardFoundationRequest("https://api.example"),
      (error: unknown) => error instanceof DashboardFoundationRequestError
        && error.failure === failure
        && error.status === status
    );
  });
}

test("foundation transport distinguishes network and unreadable responses", async (context) => {
  await withFetch(context, async () => { throw new TypeError("network down"); });
  await assert.rejects(
    dashboardFoundationRequest("https://api.example"),
    (error: unknown) => error instanceof DashboardFoundationRequestError && error.failure === "unavailable"
  );

  globalThis.fetch = async () => new Response("not json", { status: 200 });
  await assert.rejects(
    dashboardFoundationRequest("https://api.example"),
    (error: unknown) => error instanceof DashboardFoundationRequestError && error.failure === "invalid-response"
  );
});

// ---------------------------------------------------------------------------
// v1.1 runtime validation — strict status/label/group/selectors/reason
// ---------------------------------------------------------------------------

test("foundation response validation accepts the full v1.1 projection and fails closed on drift", () => {
  const valid = { data: foundation };
  assert.deepEqual(validateApiResult(valid, validateDashboardFoundation).data, foundation);
  assert.deepEqual(validateApiResult({ data: projection(["overview", "orders", "customers"]) }, validateDashboardFoundation).data.modules.length, 22);

  // A v1 payload (pre-v1.1 projection) fails closed.
  assert.throws(
    () => validateApiResult({ data: { ...foundation, contractVersion: "dashboard-foundation.v1" } }, validateDashboardFoundation),
    /contractVersion/
  );
  assert.throws(
    () => validateApiResult({ data: { ...foundation, contractVersion: "dashboard-foundation.v1.2" } }, validateDashboardFoundation),
    /contractVersion/
  );

  for (const mutate of [
    () => ({ ...foundation, modules: [{ module: "future-module", label: "未来", group: "platform", status: "available", readAllowed: true, route: "/dashboard/future", selectors: [] }] }),
    () => ({ ...foundation, shell: { ...foundation.shell, code: "DASHBOARD_SHELL_FUTURE" } }),
    () => ({ ...foundation, shell: { ...foundation.shell, enabled: false } })
  ]) {
    assert.throws(
      () => validateApiResult({ data: mutate() }, validateDashboardFoundation),
      /must be/
    );
  }
});

test("foundation validator enforces the status/reason/readAllowed matrix", () => {
  const withModule = (mutate: (module: DashboardFoundation["modules"][number]) => DashboardFoundation["modules"][number]) =>
    ({ ...foundation, modules: foundation.modules.map((entry) => entry.module === "payments" ? mutate(entry) : entry) });

  // coming_soon with readAllowed true fails closed.
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, readAllowed: true })) }, validateDashboardFoundation),
    /coming_soon/
  );
  // coming_soon with an omitted reason fails closed.
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, reason: undefined })) }, validateDashboardFoundation),
    /coming_soon/
  );
  // coming_soon with the permission reason fails closed.
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, reason: "permission_required" as const })) }, validateDashboardFoundation),
    /coming_soon/
  );
  // Illegal status values fail closed.
  for (const status of ["AVAILABLE", "coming-soon", "unknown"]) {
    assert.throws(
      () => validateApiResult({ data: withModule((entry) => ({ ...entry, status: status as typeof entry.status })) }, validateDashboardFoundation),
      /status/
    );
  }
  // Available allowed must omit the reason; available denied must carry it.
  assert.throws(
    () => validateApiResult({ data: { ...foundation, modules: foundation.modules.map((entry) => entry.module === "orders"
      ? { ...entry, status: "available" as const, readAllowed: true, reason: "permission_required" as const }
      : entry) } }, validateDashboardFoundation),
    /omitted/
  );
  assert.throws(
    () => validateApiResult({ data: { ...foundation, modules: foundation.modules.map((entry) => entry.module === "orders"
      ? { ...entry, status: "available" as const, readAllowed: false, reason: undefined }
      : entry) } }, validateDashboardFoundation),
    /permission_required/
  );
});

test("foundation validator enforces label, group, status and selector registry equality", () => {
  const withModule = (mutate: (module: DashboardFoundation["modules"][number]) => DashboardFoundation["modules"][number]) =>
    ({ ...foundation, modules: foundation.modules.map((entry) => entry.module === "orders" ? mutate(entry) : entry) });

  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, label: "订单（新）" })) }, validateDashboardFoundation),
    /label/
  );
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, group: "commerce-x" })) }, validateDashboardFoundation),
    /group/
  );
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, status: "coming_soon" as const, readAllowed: false, reason: "coming_soon" as const })) }, validateDashboardFoundation),
    /status/
  );
  // Selector summary drift fails closed: extra selector, wrong kind, missing query key, query key on a path selector.
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, selectors: [...entry.selectors, { kind: "path_exact" as const, pathname: "/dashboard/orders-extra" }] })) }, validateDashboardFoundation),
    /selectors/
  );
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, selectors: [{ kind: "path_prefix" as const, pathname: "/dashboard/orders/" }] })) }, validateDashboardFoundation),
    /selectors/
  );
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, selectors: [{ kind: "legacy_tab" as const, pathname: "/dashboard", key: "tab" }] })) }, validateDashboardFoundation),
    /key|value/
  );
  assert.throws(
    () => validateApiResult({ data: withModule((entry) => ({ ...entry, selectors: [{ kind: "path_exact" as const, pathname: "/dashboard/orders", key: "tab", value: "orders" }] })) }, validateDashboardFoundation),
    /path selector/
  );
});

test("foundation validator requires the full unique 22-module projection", () => {
  // Duplicate: replace the orders entry with an exact copy of the products
  // entry so per-module checks pass and the uniqueness check must fail.
  const products = foundation.modules.find((entry) => entry.module === "products")!;
  const duplicate = { ...foundation, modules: foundation.modules.map((entry) => entry.module === "orders" ? { ...products, module: "products" as const } : entry) };
  assert.throws(() => validateApiResult({ data: duplicate }, validateDashboardFoundation), /unique/);
  assert.throws(() => validateApiResult({ data: { ...foundation, modules: foundation.modules.slice(0, 21) } }, validateDashboardFoundation), /22-module/);
  const renamed = { ...foundation, modules: foundation.modules.map((entry) => entry.module === "settings" ? { ...entry, module: "settings-x" as const } : entry) };
  assert.throws(() => validateApiResult({ data: renamed }, validateDashboardFoundation), /known Dashboard module/);
});

test("disabled and actor-not-allowed foundation states retain legacy semantics and keep the projection", () => {
  const disabled: DashboardFoundation = {
    ...foundation,
    shell: { ...foundation.shell, mode: "disabled", enabled: false, code: "DASHBOARD_SHELL_DISABLED" },
    readiness: "disabled"
  };
  const notAllowed: DashboardFoundation = {
    ...foundation,
    shell: { ...foundation.shell, enabled: false, code: "DASHBOARD_SHELL_ACTOR_NOT_ALLOWED" },
    readiness: "disabled"
  };
  assert.deepEqual(validateApiResult({ data: disabled }, validateDashboardFoundation).data, disabled);
  assert.deepEqual(validateApiResult({ data: notAllowed }, validateDashboardFoundation).data, notAllowed);
  assert.equal(dashboardFoundationDisposition(disabled), "legacy");
  assert.equal(dashboardFoundationDisposition(notAllowed), "legacy");
  assert.equal(dashboardFoundationDisposition(foundation), "ready");
  // The v1.1 projection stays available on the legacy state so the shell can
  // adjudicate known coming-soon routes before the legacy fallback.
  assert.equal(classifyDashboardFoundation({ foundation: disabled }).status, "legacy");
  assert.equal(classifyDashboardFoundation({ foundation: disabled }).foundation, disabled);
  assert.equal(classifyDashboardFoundation({ foundation: foundation }).status, "ready");
});

test("all 22 foundation modules map exactly to legacy tabs and canonical routes", () => {
  const expected = {
    overview: "overview", products: "products", categories: "categories", pricing: "pricing",
    promotions: "promotions", inventory: "inventorySnapshots", orders: "orders",
    payments: "paymentSessions", customers: "crmContacts", users: "users", roles: "roles",
    dealers: "dealers", applications: "dealerApplications", leads: "contactLeads",
    reviews: "productReviews", support: "supportHandoffs", email: "emailOutbox", content: "cms",
    operations: "operations", erp: "erpSyncJobs", audit: "auditLogs", settings: "settings"
  } as const;
  assert.equal(Object.keys(DASHBOARD_FOUNDATION_MODULE_ROUTES).length, 22);
  assert.deepEqual(
    Object.fromEntries(Object.keys(DASHBOARD_FOUNDATION_MODULE_ROUTES).map((module) => [
      module,
      foundationModuleToLegacyTab(module as keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES)
    ])),
    expected
  );
});

test("foundation selection never exposes a denied or unknown requested module", () => {
  assert.equal(resolveFoundationModule("/dashboard/products", foundation)?.module, "overview");
  assert.equal(resolveFoundationModule("/dashboard/future", foundation)?.module, "overview");
  assert.equal(resolveFoundationModule("/dashboard/audit", foundation)?.module, "overview");
});

// ---------------------------------------------------------------------------
// Shared mechanical registry — pinned to the persisted V11-0 authority
// ---------------------------------------------------------------------------

test("shared module-state registry is the SHA-pinned persisted authority, mechanically derived", async () => {
  const rawAuthority = await readFile(AUTHORITY_PATH, "utf8");
  assert.equal(sha256File(rawAuthority), AUTHORITY_SHA256);
  const authorityDocument = JSON.parse(rawAuthority) as PersistedAuthority;
  assert.equal(authorityDocument.schemaVersion, "vanstro.v11.admin-module-authority.v1.1.1");
  assert.equal(authorityDocument.status, "FROZEN_AUTHORITY");
  assert.equal(authorityDocument.counts.modules, 22);
  assert.equal(authorityDocument.counts.available, 11);
  assert.equal(authorityDocument.counts.comingSoon, 11);

  const expectedState = authorityDocument.modules.map((entry) => ({
    module: entry.module,
    label: entry.label,
    group: entry.group,
    status: entry.status,
    route: entry.canonical.pathname,
    selectors: entry.selectors.map((selector) => ({
      kind: selector.kind,
      pathname: selector.pathname,
      ...(selector.kind === "query_value" || selector.kind === "legacy_tab" ? { key: selector.key, value: selector.value } : {})
    }))
  }));
  assert.deepEqual(DASHBOARD_FOUNDATION_MODULE_STATE, expectedState);
  assert.equal(DASHBOARD_FOUNDATION_MODULE_STATE.filter((entry) => entry.status === "available").length, 11);
  assert.equal(DASHBOARD_FOUNDATION_MODULE_STATE.filter((entry) => entry.status === "coming_soon").length, 11);
});

// ---------------------------------------------------------------------------
// Persisted vectors — every vector through the real frontend resolver
// ---------------------------------------------------------------------------

test("all 204 persisted finite positive vectors resolve to their owners through the registry", async () => {
  const rawVectors = await readFile(POSITIVE_VECTORS_PATH, "utf8");
  assert.equal(sha256File(rawVectors), POSITIVE_VECTORS_SHA256);
  const document = JSON.parse(rawVectors) as { counts: Record<string, number>; finite: PositiveVector[]; prefix: PrefixVector[] };
  assert.equal(document.counts.finite, 204);
  assert.equal(document.finite.length, 204);
  const fullInput = (vector: PositiveVector) => vector.query ? `${vector.url}?${vector.query}` : vector.url;
  assert.equal(new Set(document.finite.map(fullInput)).size, 204);

  const owners = new Set<string>();
  const statuses = new Set<string>();
  const sources = new Set<string>();
  const locales = new Set<string>();
  for (const vector of document.finite) {
    const result = resolveDashboardFoundationRoute(fullInput(vector), DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "known", `expected "${fullInput(vector)}" to resolve, got ${JSON.stringify(result)}`);
    assert.equal(result.owner, vector.owner, `owner mismatch for ${fullInput(vector)}`);
    assert.equal(result.status, vector.status, `status mismatch for ${fullInput(vector)}`);
    assert.equal(result.source, vector.source, `source mismatch for ${fullInput(vector)}`);
    assert.equal(result.locale, vector.locale, `locale mismatch for ${fullInput(vector)}`);
    owners.add(result.owner);
    statuses.add(result.status);
    sources.add(result.source);
    locales.add(result.locale);
  }
  assert.deepEqual([...owners].sort(), DASHBOARD_FOUNDATION_MODULE_STATE.map((entry) => entry.module).sort());
  assert.deepEqual([...statuses].sort(), ["available", "coming_soon"]);
  assert.deepEqual([...sources].sort(), ["canonical", "legacy_tab", "path_exact", "query_value"]);
  assert.deepEqual([...locales].sort(), ["en-CA", "fr-CA"]);
});

test("all 204 persisted finite positive vectors resolve identically through the live projection", async () => {
  const document = JSON.parse(await readFile(POSITIVE_VECTORS_PATH, "utf8")) as { finite: PositiveVector[] };
  const fullProjection = projection(DASHBOARD_FOUNDATION_MODULE_STATE.filter((entry) => entry.status === "available").map((entry) => entry.module));
  for (const vector of document.finite) {
    const input = vector.query ? `${vector.url}?${vector.query}` : vector.url;
    const result = resolveDashboardFoundationRoute(input, fullProjection.modules);
    assert.equal(result.kind, "known", `expected "${input}" to resolve through the projection`);
    if (result.kind === "known") {
      assert.equal(result.owner, vector.owner, `projection owner mismatch for ${input}`);
      assert.equal(result.status, vector.status, `projection status mismatch for ${input}`);
      assert.equal(result.source, vector.source, `projection source mismatch for ${input}`);
    }
  }
});

test("all 6 persisted prefix positives resolve to settings via path_prefix", async () => {
  const document = JSON.parse(await readFile(POSITIVE_VECTORS_PATH, "utf8")) as { prefix: PrefixVector[] };
  assert.equal(document.prefix.length, 6);
  for (const vector of document.prefix) {
    const result = resolveDashboardFoundationRoute(vector.url, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "known", `expected "${vector.url}" to resolve`);
    if (result.kind === "known") {
      assert.equal(result.owner, "settings", `owner mismatch for ${vector.url}`);
      assert.equal(result.status, "coming_soon", `status mismatch for ${vector.url}`);
      assert.equal(result.source, "path_prefix", `source mismatch for ${vector.url}`);
      assert.equal(result.locale, vector.url.startsWith("/fr") ? "fr-CA" : "en-CA");
    }
  }
});

test("all 5 persisted negative vectors fail closed with typed reasons", async () => {
  const rawVectors = await readFile(NEGATIVE_VECTORS_PATH, "utf8");
  assert.equal(sha256File(rawVectors), NEGATIVE_VECTORS_SHA256);
  const document = JSON.parse(rawVectors) as { vectors: Array<{ url: string; expected: "unknown" }> };
  assert.equal(document.vectors.length, 5);
  const expectedReasons: Record<string, string> = {
    "/dashboard/settingsx": "no_match",
    "/dashboard/setting": "no_match",
    "/dashboard/settings-other": "no_match",
    "/fr/dashboard/settingsx": "no_match",
    "/fr/fr/dashboard/settings/example": "repeated_fr_prefix"
  };
  for (const vector of document.vectors) {
    assert.equal(vector.expected, "unknown");
    const result = resolveDashboardFoundationRoute(vector.url, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "unknown", `expected "${vector.url}" to fail closed`);
    if (result.kind === "unknown") assert.equal(result.reason, expectedReasons[vector.url], `reason mismatch for ${vector.url}`);
  }
});

// ---------------------------------------------------------------------------
// Rejection and normalization semantics (backend-consistent)
// ---------------------------------------------------------------------------

test("rejected inputs fail closed: absolute, protocol-relative, malformed percent, fragment", () => {
  for (const url of ["https://example.com/dashboard", "http:/dashboard/orders", "ftp://host/x", "javascript:alert(1)"]) {
    assert.deepEqual(resolveDashboardFoundationRoute(url, DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "absolute_url" }, url);
  }
  for (const url of ["//example.com/dashboard", "//dashboard/orders"]) {
    assert.deepEqual(resolveDashboardFoundationRoute(url, DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "protocol_relative_url" }, url);
  }
  for (const url of ["dashboard", "dashboard/orders", "?tab=orders", "x/y"]) {
    assert.deepEqual(resolveDashboardFoundationRoute(url, DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "not_site_relative" }, url);
  }
  for (const url of ["/dashboard/%ZZ", "/dashboard/%2G", "/dashboard/%", "/dashboard/%2", "/dashboard/operations?view=%G1", "/dashboard?tab=%"]) {
    assert.deepEqual(resolveDashboardFoundationRoute(url, DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "malformed_percent_encoding" }, url);
  }
  for (const url of ["/dashboard#section", "/dashboard/orders#/tab", "/dashboard?tab=orders#top"]) {
    assert.deepEqual(resolveDashboardFoundationRoute(url, DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "fragment_owned_routing" }, url);
  }
});

test("locale prefix: exactly one /fr is stripped, repeated /fr fails closed", () => {
  const known = (input: string) => {
    const result = resolveDashboardFoundationRoute(input, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "known", `expected "${input}" to resolve`);
    return result.kind === "known" ? result : null;
  };
  assert.equal(known("/fr/dashboard")?.locale, "fr-CA");
  assert.equal(known("/fr/dashboard")?.owner, "overview");
  assert.equal(known("/fr/dashboard/")?.owner, "overview");
  assert.equal(known("/fr/dashboard?tab=orders")?.owner, "orders");
  assert.equal(known("/fr/dashboard/operations?view=jobs")?.owner, "operations");
  for (const url of ["/fr/fr", "/fr/fr/", "/fr/fr/dashboard", "/fr/fr/dashboard/settings/example"]) {
    assert.deepEqual(resolveDashboardFoundationRoute(url, DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "repeated_fr_prefix" }, url);
  }
  assert.deepEqual(resolveDashboardFoundationRoute("/fr//fr/dashboard", DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "no_match" });
  assert.deepEqual(resolveDashboardFoundationRoute("/fr", DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "no_match" });
  assert.deepEqual(resolveDashboardFoundationRoute("/fr/", DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "no_match" });
  assert.deepEqual(resolveDashboardFoundationRoute("/french/dashboard", DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "no_match" });
  assert.deepEqual(resolveDashboardFoundationRoute("/frfr/dashboard", DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "no_match" });
});

test("trailing slashes normalize away for matching, root stays /", () => {
  const known = (input: string) => {
    const result = resolveDashboardFoundationRoute(input, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "known", `expected "${input}" to resolve`);
    return result.kind === "known" ? result : null;
  };
  assert.equal(known("/dashboard/")?.owner, "overview");
  assert.equal(known("/dashboard//")?.owner, "overview");
  assert.equal(known("/dashboard///")?.owner, "overview");
  assert.equal(known("/fr/dashboard///")?.owner, "overview");
  assert.equal(known("/dashboard/media/")?.owner, "content");
  assert.equal(known("/dashboard/settings/profile///")?.owner, "settings");
  assert.deepEqual(resolveDashboardFoundationRoute("/", DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "no_match" });
});

test("query matching: order-independent, extra parameters never change owner, percent-decoded", () => {
  const known = (input: string) => {
    const result = resolveDashboardFoundationRoute(input, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "known", `expected "${input}" to resolve`);
    return result.kind === "known" ? result : null;
  };
  assert.equal(known("/dashboard/operations?view=jobs")?.owner, "operations");
  assert.equal(known("/dashboard/operations?page=2&view=work-queue&sort=asc")?.owner, "operations");
  assert.equal(known("/dashboard/operations?view=notifications&x=1&x=1")?.owner, "operations");
  assert.equal(known("/dashboard/orders?foo=bar&page=3")?.owner, "orders");
  assert.equal(known("/dashboard?tab=orders&page=1")?.owner, "orders");
  assert.equal(known("/dashboard?tab=unknown")?.owner, "overview");
  assert.equal(known("/dashboard/operations?view=other")?.owner, "operations");
  assert.equal(known("/dashboard/operations?view=%6Aobs")?.owner, "operations");
  assert.equal(known("/dashboard/operations?view=jobs&view=%6Aobs")?.owner, "operations");
  assert.equal(known("/dashboard?tab=orders&tab=%6Frders")?.owner, "orders");
});

test("query matching: conflicting duplicate keys fail closed, same-value duplicates are harmless", () => {
  for (const url of [
    "/dashboard/operations?view=jobs&view=work-queue",
    "/dashboard/operations?view=jobs&view=notifications",
    "/dashboard?tab=orders&tab=overview",
    "/dashboard?tab=orders&tab=settings",
    "/dashboard/orders?a=1&a=2"
  ]) {
    assert.deepEqual(resolveDashboardFoundationRoute(url, DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "conflicting_duplicate_key" }, url);
  }
  const known = (input: string) => {
    const result = resolveDashboardFoundationRoute(input, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "known", `expected "${input}" to resolve`);
    return result.kind === "known" ? result : null;
  };
  assert.equal(known("/dashboard/operations?view=jobs&view=jobs")?.owner, "operations");
  assert.equal(known("/dashboard?tab=orders&tab=orders")?.owner, "orders");
});

test("priority: canonical exact > noncanonical exact > prefix, query refines canonical", () => {
  const known = (input: string) => {
    const result = resolveDashboardFoundationRoute(input, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(result.kind, "known", `expected "${input}" to resolve`);
    return result.kind === "known" ? result : null;
  };
  const settings = known("/dashboard/settings");
  assert.equal(settings?.owner, "settings");
  assert.equal(settings?.source, "canonical");
  assert.equal(known("/dashboard/media")?.owner, "content");
  assert.equal(known("/dashboard/media")?.source, "path_exact");
  assert.equal(known("/dashboard/data-jobs")?.owner, "content");
  assert.equal(known("/dashboard/runtime")?.owner, "operations");
  assert.equal(known("/dashboard/analytics-foundation")?.owner, "operations");
  assert.equal(known("/dashboard/settings/profile")?.source, "path_prefix");
  assert.equal(known("/dashboard?tab=orders")?.owner, "orders");
  assert.equal(known("/dashboard?tab=orders")?.source, "legacy_tab");
  assert.equal(known("/dashboard?tab=overview")?.owner, "overview");
  assert.equal(known("/dashboard?tab=overview")?.source, "legacy_tab");
  assert.equal(known("/dashboard/operations?view=jobs")?.owner, "operations");
  assert.equal(known("/dashboard/operations?view=jobs")?.source, "query_value");
});

// ---------------------------------------------------------------------------
// Coming-soon adjudication — zero business surface
// ---------------------------------------------------------------------------

test("every persisted coming-soon vector adjudicates to coming_soon with zero business surface", async () => {
  const document = JSON.parse(await readFile(POSITIVE_VECTORS_PATH, "utf8")) as { finite: PositiveVector[]; prefix: PrefixVector[] };
  const allVectors = [
    ...document.finite,
    ...document.prefix.map((vector) => ({ ...vector, query: undefined as string | undefined, slash: "without" as const, locale: vector.url.startsWith("/fr") ? "fr-CA" as const : "en-CA" as const }))
  ];
  const comingSoonVectors = allVectors.filter((vector) => vector.status === "coming_soon");
  assert.ok(comingSoonVectors.length >= 80, `expected a broad coming-soon vector set, got ${comingSoonVectors.length}`);
  const fullProjection = projection(DASHBOARD_FOUNDATION_MODULE_STATE.filter((entry) => entry.status === "available").map((entry) => entry.module));
  for (const vector of comingSoonVectors) {
    const pathname = vector.url;
    const search = vector.query ?? "";
    const input = search ? `${pathname}?${search}` : pathname;
    const adjudication = adjudicateFoundationRoute(pathname, search, fullProjection.modules);
    assert.equal(adjudication.kind, "coming_soon", `expected ${input} to adjudicate coming_soon`);
    if (adjudication.kind !== "coming_soon") continue;
    assert.equal(adjudication.module.status, "coming_soon");
    assert.equal(adjudication.module.readAllowed, false);
    // The location yields no business module and no canonicalization — the
    // shell can never reach F0ReadOnlyContent, PanelRouter or loadTab from it.
    const location = resolveFoundationLocation(pathname, search, fullProjection);
    assert.equal(location.active, null, `coming-soon ${input} must not produce a business active module`);
    assert.equal(location.comingSoon?.module, vector.owner);
    assert.equal(location.unknown, false);
    assert.equal(location.canonicalHref, input, `coming-soon ${input} must keep its identity (no canonicalization)`);
  }
});

test("adjudication order: coming_soon wins over permission allow and deny; available deny is never coming-soon", () => {
  const allAllowed = projection(["overview", "products", "orders", "customers", "erp"]);
  assert.equal(adjudicateFoundationRoute("/dashboard/audit", "", allAllowed.modules).kind, "coming_soon");
  assert.equal(adjudicateFoundationRoute("/dashboard/settings/profile", "", allAllowed.modules).kind, "coming_soon");
  assert.equal(adjudicateFoundationRoute("/dashboard/media", "", allAllowed.modules).kind, "coming_soon");
  assert.equal(adjudicateFoundationRoute("/dashboard/runtime", "", allAllowed.modules).kind, "coming_soon");
  assert.equal(adjudicateFoundationRoute("/dashboard/operations", "view=jobs", allAllowed.modules).kind, "coming_soon");
  assert.equal(adjudicateFoundationRoute("/dashboard", "tab=paymentSessions", allAllowed.modules).kind, "coming_soon");
  // A permission allow can never promote a coming_soon module.
  assert.equal(adjudicateFoundationRoute("/dashboard/audit", "", projection(["overview", "audit_logs_read"]).modules).kind, "coming_soon");

  const allowed = adjudicateFoundationRoute("/dashboard/orders", "", allAllowed.modules);
  assert.deepEqual(allowed, { kind: "available", module: allAllowed.modules.find((entry) => entry.module === "orders")!, denied: false });
  const denied = adjudicateFoundationRoute("/dashboard/orders", "", projection(["overview"]).modules);
  assert.equal(denied.kind, "available");
  if (denied.kind === "available") assert.equal(denied.denied, true);
  // Unknown routes stay a safe fallback, never coming-soon.
  assert.equal(adjudicateFoundationRoute("/dashboard/future", "", allAllowed.modules).kind, "unknown");
  assert.equal(adjudicateFoundationRoute("/dashboard/settingsx", "", allAllowed.modules).kind, "unknown");
  assert.equal(adjudicateFoundationRoute("/fr/fr/dashboard/settings/x", "", allAllowed.modules).kind, "unknown");
});

test("legacy tabs map bidirectionally and canonicalize EN/fr locations for available modules", () => {
  assert.equal(legacyTabToFoundationModule("paymentSessions"), "payments");
  assert.equal(legacyTabToFoundationModule("inventorySnapshots"), "inventory");

  const readable = projection(["overview", "orders"]);
  assert.deepEqual(
    resolveFoundationLocation("/dashboard", "tab=orders&orderStatus=paid&page=2", readable),
    { active: readable.modules.find((entry) => entry.module === "orders")!, comingSoon: null, unknown: false, activeFilter: "paid", activePage: 2, canonicalHref: "/dashboard/orders?orderStatus=paid&page=2" }
  );
  assert.deepEqual(
    resolveFoundationLocation("/fr/dashboard", "tab=orders&orderStatus=paid&page=2", readable),
    { active: readable.modules.find((entry) => entry.module === "orders")!, comingSoon: null, unknown: false, activeFilter: "paid", activePage: 2, canonicalHref: "/fr/dashboard/orders?orderStatus=paid&page=2" }
  );
  // A known coming-soon legacy tab always wins: unified coming-soon, no
  // canonicalization, no business page.
  assert.deepEqual(
    resolveFoundationLocation("/dashboard", "tab=paymentSessions&page=3&orderStatus=paid", readable),
    { active: null, comingSoon: readable.modules.find((entry) => entry.module === "payments")!, unknown: false, activeFilter: "", activePage: 1, canonicalHref: "/dashboard?tab=paymentSessions&page=3&orderStatus=paid" }
  );
});

test("trailing slashes resolve to canonical EN/fr Dashboard modules", () => {
  const readable = projection(["overview", "orders"]);
  assert.deepEqual(
    resolveFoundationLocation("/dashboard/orders/", "orderStatus=paid&page=2", readable),
    { active: readable.modules.find((entry) => entry.module === "orders")!, comingSoon: null, unknown: false, activeFilter: "paid", activePage: 2, canonicalHref: "/dashboard/orders?orderStatus=paid&page=2" }
  );
  assert.deepEqual(
    resolveFoundationLocation("/fr/dashboard/orders///", "page=3", readable),
    { active: readable.modules.find((entry) => entry.module === "orders")!, comingSoon: null, unknown: false, activeFilter: "", activePage: 3, canonicalHref: "/fr/dashboard/orders?page=3" }
  );
  assert.equal(resolveFoundationLocation("/dashboard/", "", readable).active?.module, "overview");
  assert.equal(resolveFoundationLocation("/dashboard/unknown///", "", readable).active?.module, "overview");
  assert.equal(resolveFoundationLocation("/dashboard/unknown///", "", readable).unknown, true);
  assert.equal(resolveFoundationLocation("/dashboard/products/", "", readable).active?.module, "overview");
  assert.equal(resolveFoundationLocation("/dashboard/products/", "", readable).comingSoon, null);
});

test("Settings routes are known coming-soon: unified, identity canonical href, no special parser output", () => {
  const readable = projection(["overview"]);
  assert.deepEqual(
    resolveFoundationLocation("/dashboard/settings", "", readable),
    { active: null, comingSoon: readable.modules.find((entry) => entry.module === "settings")!, unknown: false, activeFilter: "", activePage: 1, canonicalHref: "/dashboard/settings" }
  );
  assert.deepEqual(
    resolveFoundationLocation("/dashboard/settings/history/", "", readable),
    { active: null, comingSoon: readable.modules.find((entry) => entry.module === "settings")!, unknown: false, activeFilter: "", activePage: 1, canonicalHref: "/dashboard/settings/history/" }
  );
  assert.deepEqual(
    resolveFoundationLocation("/fr/dashboard/settings/lifecycle/", "draftId=draft-1", readable),
    { active: null, comingSoon: readable.modules.find((entry) => entry.module === "settings")!, unknown: false, activeFilter: "", activePage: 1, canonicalHref: "/fr/dashboard/settings/lifecycle/?draftId=draft-1" }
  );
  assert.equal(resolveFoundationLocation("/dashboard/settings/future", "", readable).comingSoon?.module, "settings");
});

test("legacy query canonicalization fails closed for denied, unknown and conflicting tabs", () => {
  const denied = resolveFoundationLocation("/dashboard/orders", "tab=products&page=7", foundation);
  const unknown = resolveFoundationLocation("/dashboard/orders", "tab=future&page=7", foundation);
  const conflicting = resolveFoundationLocation("/dashboard", "tab=orders&tab=overview", foundation);
  assert.equal(denied.active?.module, "overview");
  assert.equal(denied.activeFilter, "");
  assert.equal(denied.activePage, 1);
  assert.equal(denied.canonicalHref, "/dashboard");
  assert.equal(denied.comingSoon, null);
  assert.deepEqual(unknown, denied);
  // Conflicting duplicate keys fail closed to the overview safe fallback.
  assert.equal(conflicting.active?.module, "overview");
  assert.equal(conflicting.unknown, true);
  assert.equal(conflicting.canonicalHref, "/dashboard");
});

test("canonical queue locations retain only legal active filters and pages", () => {
  const readable = projection(["overview", "orders", "erp", "customers"]);
  assert.deepEqual(resolveFoundationLocation("/dashboard/orders", "orderStatus=fulfilled&page=4", readable), {
    active: readable.modules.find((entry) => entry.module === "orders")!, comingSoon: null, unknown: false, activeFilter: "fulfilled", activePage: 4,
    canonicalHref: "/dashboard/orders?orderStatus=fulfilled&page=4"
  });
  assert.deepEqual(resolveFoundationLocation("/dashboard/erp", "erpStatus=retry_wait&page=3", readable), {
    active: readable.modules.find((entry) => entry.module === "erp")!, comingSoon: null, unknown: false, activeFilter: "retry_wait", activePage: 3,
    canonicalHref: "/dashboard/erp?erpStatus=retry_wait&page=3"
  });
  assert.deepEqual(resolveFoundationLocation("/dashboard/customers", "crmStage=high_intent&page=2", readable), {
    active: readable.modules.find((entry) => entry.module === "customers")!, comingSoon: null, unknown: false, activeFilter: "high_intent", activePage: 2,
    canonicalHref: "/dashboard/customers?crmStage=high_intent&page=2"
  });
  assert.deepEqual(resolveFoundationLocation("/dashboard/orders", "orderStatus=invalid&page=0", readable), {
    active: readable.modules.find((entry) => entry.module === "orders")!, comingSoon: null, unknown: false, activeFilter: "", activePage: 1, canonicalHref: "/dashboard/orders"
  });
  assert.equal(dashboardQueueHref("orders", "en-CA", "paid", 5), "/dashboard/orders?orderStatus=paid&page=5");
  assert.equal(dashboardQueueHref("erpSyncJobs", "fr-CA", "failed", 1), "/fr/dashboard/erp?erpStatus=failed");
  assert.equal(dashboardQueueHref("crmContacts", "en-CA", "invalid", 2), "/dashboard/customers?page=2");
});

// ---------------------------------------------------------------------------
// Shell gates — coming-soon adjudicated before legacy fallback and transport
// ---------------------------------------------------------------------------

test("nav visibility rule keeps coming-soon and registry entries, hides denied available modules", () => {
  // Registry entries carry no readAllowed and must stay visible, except the
  // V11-R1 P0 IA move: pricing/inventory leave first-level navigation.
  for (const entry of DASHBOARD_FOUNDATION_MODULE_STATE) {
    if (entry.module === "pricing" || entry.module === "inventory") {
      assert.equal(navVisibleModule(entry), false, `IA-hidden module ${entry.module} must not be visible`);
    } else {
      assert.equal(navVisibleModule(entry), true, `registry entry ${entry.module} must stay visible`);
    }
  }
  // Projection entries: coming-soon always visible, available only when readable.
  assert.equal(navVisibleModule({ status: "coming_soon", readAllowed: false }), true);
  assert.equal(navVisibleModule({ status: "available", readAllowed: true }), true);
  assert.equal(navVisibleModule({ status: "available", readAllowed: false }), false);
  // The ready projection derives the same membership as the registry set,
  // minus the V11-R1 P0 IA-hidden modules.
  const fullProjection = projection(DASHBOARD_FOUNDATION_MODULE_STATE.filter((entry) => entry.status === "available").map((entry) => entry.module));
  assert.deepEqual(
    fullProjection.modules.filter(navVisibleModule).map((entry) => entry.module),
    DASHBOARD_FOUNDATION_MODULE_STATE.filter((entry) => entry.module !== "pricing" && entry.module !== "inventory").map((entry) => entry.module)
  );
});

test("F0 shell adjudicates known coming-soon before the legacy fallback and business transport", async () => {
  const source = await readFile(new URL("../../components/dashboard/DashboardF0Shell.tsx", import.meta.url), "utf8");
  const anonymousLogin = source.indexOf('foundationState.status === "anonymous"');
  const comingSoonReturn = source.indexOf("if (comingSoonModule &&");
  const legacyFallback = source.indexOf('foundationState.status === "legacy"');
  const foundationStateRender = source.indexOf('return <div className={styles.shell} lang="zh-CN"><a className={styles.skipLink} href="#main-content">跳至主要内容</a><FoundationState retry={foundationState.retry}');
  const contentMount = source.indexOf("active ? <DashboardF0ReadOnlyContent");
  // V11-2: anonymous always owns the login page, before any coming-soon
  // adjudication and before the legacy fallback.
  assert.ok(anonymousLogin !== -1 && anonymousLogin < comingSoonReturn, "anonymous must render the login page before coming-soon adjudication");
  assert.ok(anonymousLogin !== -1 && anonymousLogin < legacyFallback, "anonymous must render the login page before the legacy fallback");
  assert.ok(comingSoonReturn !== -1 && comingSoonReturn < legacyFallback, "coming-soon must be adjudicated before the legacy fallback");
  assert.ok(comingSoonReturn !== -1 && comingSoonReturn < foundationStateRender, "coming-soon must be adjudicated before the FoundationState render");
  assert.ok(comingSoonReturn !== -1 && comingSoonReturn < contentMount, "coming-soon must be adjudicated before any business content mount");
  assert.match(source, /const routeModules: readonly DashboardRouteModuleLike\[\] = foundationState\.foundation\?\.modules \?\? DASHBOARD_FOUNDATION_MODULE_STATE/);
  assert.match(source, /const adjudication = adjudicateFoundationRoute\(currentPathname, currentSearch, routeModules\)/);
  // Canonicalization is skipped for coming-soon routes.
  assert.match(source, /if \(!location \|\| comingSoonModule \|\| directRouteForbidden/);
  // Failure states (unavailable/invalid) keep the FoundationState retry UI
  // ahead of the coming-soon page. Specialized Settings lifecycle routes
  // bypass the parent surface only when the settings capability is enabled.
  assert.match(source, /if \(comingSoonModule && !specializedSettingsRouteEnabled && foundationState\.status !== "unavailable" && foundationState\.status !== "invalid"\)/);
  // The unified coming-soon page performs zero business requests.
  const comingSoonBranch = source.slice(comingSoonReturn, legacyFallback);
  assert.doesNotMatch(comingSoonBranch, /DashboardF0ReadOnlyContent|loadTab|PanelRouter|useDashboardData|apiFetch/);
  assert.match(comingSoonBranch, /ComingSoonContent label=\{comingSoonModule\.label\}/);
});

test("F0 shell coming-soon precedence: anonymous renders login, unavailable/invalid render FoundationState, legacy/forbidden keep coming-soon", async () => {
  const source = await readFile(new URL("../../components/dashboard/DashboardF0Shell.tsx", import.meta.url), "utf8");
  const anonymousLogin = source.indexOf('foundationState.status === "anonymous"');
  const comingSoonReturn = source.indexOf("if (comingSoonModule &&");
  const legacyFallback = source.indexOf('foundationState.status === "legacy"');
  const foundationStateRender = source.indexOf("return <div className={styles.shell} lang=\"zh-CN\"><a className={styles.skipLink} href=\"#main-content\">跳至主要内容</a><FoundationState retry={foundationState.retry}");
  // unavailable/invalid must fall through the coming-soon branch to the
  // FoundationState render (retry affordance stays reachable).
  assert.ok(comingSoonReturn !== -1 && foundationStateRender !== -1 && comingSoonReturn < foundationStateRender);
  assert.ok(legacyFallback !== -1 && comingSoonReturn < legacyFallback);
  // V11-2: anonymous resolves to the login page before any other branch.
  assert.ok(anonymousLogin !== -1 && anonymousLogin < comingSoonReturn);
  assert.ok(anonymousLogin !== -1 && anonymousLogin < foundationStateRender);
  // The FoundationState render itself remains gated on every non-ready status,
  // so forbidden and legacy fall through to it only when no coming-soon
  // module owns the route.
  assert.match(source, /foundationState\.status !== "ready" \|\| !foundationState\.foundation \|\| !foundationState\.authorization/);
  // The legacy fallback is now exactly the legacy state; anonymous is served
  // by the login page above.
  assert.match(source, /if \(foundationState\.status === "legacy"\) return <DashboardShell/);
  assert.match(source, /<DashboardLoginPage locale=\{locale\} notice=\{expiredNotice \? "expired" : null\} \/>/);
});

test("legacy foundations verify the V11-2 session before DashboardShell can mount", async () => {
  const shell = await readFile(new URL("../../components/dashboard/DashboardF0Shell.tsx", import.meta.url), "utf8");
  const boundary = await readFile(new URL("../../components/dashboard/DashboardFoundationContext.tsx", import.meta.url), "utf8");
  const legacy = boundary.indexOf('if (disposition.status !== "ready")');
  const sessionRequest = boundary.indexOf("dashboardSessionRequest", legacy);
  const sessionValidation = boundary.indexOf("classifySessionRestore", legacy);
  const legacyMount = shell.indexOf('foundationState.status === "legacy"');
  const anonymousLogin = shell.indexOf('foundationState.status === "anonymous"');
  assert.ok(legacy !== -1 && sessionRequest > legacy && sessionValidation > legacy);
  assert.ok(anonymousLogin !== -1 && anonymousLogin < legacyMount);
  const legacyGate = boundary.slice(legacy, boundary.indexOf("const authorizationPayload", legacy));
  assert.match(legacyGate, /restore\.phase !== "authenticated"/);
  assert.match(legacyGate, /restore\.phase === "anonymous"/);
  assert.match(legacyGate, /restore\.phase === "forbidden"/);
  assert.match(shell, /if \(foundationState\.status === "anonymous"\) \{[\s\S]*?<DashboardLoginPage/);
  assert.match(shell, /if \(foundationState\.status !== "ready" \|\| !foundationState\.foundation \|\| !foundationState\.authorization\)/);
});
test("F0 shell navigation renders coming-soon names as non-Link, non-focusable spans with 即将推出", async () => {
  const source = await readFile(new URL("../../components/dashboard/DashboardF0Shell.tsx", import.meta.url), "utf8");
  // V11-3: the navigation moved to the Dashboard-only ShellNavigation
  // component; the coming-soon/available contract is unchanged.
  const navSource = await readFile(new URL("../../components/dashboard/ShellNavigation.tsx", import.meta.url), "utf8");
  const statusSource = await readFile(new URL("../../components/dashboard/ShellStatusBar.tsx", import.meta.url), "utf8");
  // Coming-soon entries render as spans, never as next/link anchors.
  assert.match(navSource, /entry\.status === "coming_soon"\s*\?[\s\S]{0,80}<span className=\{styles\.comingSoonNav\}/);
  assert.match(navSource, /\{entry\.label\}[\s\S]{0,40}<small>即将推出<\/small>[\s\S]{0,20}<\/span>/);
  // The only href in the nav belongs to the available-module Link.
  assert.doesNotMatch(navSource, /href=.*coming_soon/);
  assert.doesNotMatch(navSource, /<Link[^>]*coming_soon/);
  // Nav labels come from the projection, not a hand-written third matrix.
  assert.doesNotMatch(navSource, /labels\[/);
  assert.match(navSource, /entry\.label/);
  // Both the ready shell and the unified coming-soon shell share one nav
  // visibility rule (coming-soon always visible, denied available hidden,
  // registry entries without readAllowed retained).
  assert.match(source, /const modules = foundation\.modules\.filter\(navVisibleModule\)/);
  assert.match(source, /const navModules = routeModules\.filter\(navVisibleModule\)/);
  assert.match(statusSource, /<dt>可读模块<\/dt>[\s\S]{0,40}\{readableCount\} \/ \{totalModules\}[\s\S]{0,20}<\/dd>/);
});

test("F0 drawer distinguishes breakpoint focus from normal close restoration", async () => {
  const source = await readFile(new URL("../../components/dashboard/DashboardF0Shell.tsx", import.meta.url), "utf8");
  // V11-3: the drawer JSX moved to MobileNavigationDrawer; the close-reason
  // focus contract stays in the shell (single focus manager).
  const drawerSource = await readFile(new URL("../../components/dashboard/MobileNavigationDrawer.tsx", import.meta.url), "utf8");
  assert.match(drawerSource, /export type DrawerCloseReason = "escape" \| "backdrop" \| "close-button" \| "navigation" \| "breakpoint"/);
  assert.match(source, /closeReasonRef\.current === "breakpoint"/);
  assert.match(source, /activeDesktopLinkRef\.current \?\? mainRef\.current/);
  assert.match(source, /closeDrawer\("escape"\)/);
  assert.match(source, /closeDrawer\("breakpoint"\)/);
  assert.match(drawerSource, /onClose\("backdrop"\)/);
  assert.match(drawerSource, /onClose\("close-button"\)/);
  assert.match(drawerSource, /onClose\("navigation"\)/);
});

test("F0 shell remains structurally read-only and has no zh source route", async () => {
  const source = await readFile(new URL("../../components/dashboard/DashboardF0Shell.tsx", import.meta.url), "utf8");
  assert.match(source, /alt="VanStro"/);
  assert.match(source, /管理后台/);
  assert.match(source, /只读模式/);
  assert.doesNotMatch(source, /DashboardPanels|onAction|MUTATION_PERMISSIONS/);
  assert.doesNotMatch(source, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
  await assert.rejects(readFile(new URL("../../app/zh/dashboard/page.tsx", import.meta.url), "utf8"));
});

test("Dashboard keeps exactly 44 protected EN and fr route artifacts", async () => {
  const routes = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../../app/dashboard/[section]/page.tsx", import.meta.url), "utf8");
  const frenchPage = await readFile(new URL("../../app/fr/dashboard/[section]/page.tsx", import.meta.url), "utf8");
  const sectionMap = routes.match(/DASHBOARD_SECTION_SLUGS = \{([\s\S]*?)\n\} as const/)?.[1] ?? "";
  const routeCount = (sectionMap.match(/^  \w+:/gm) ?? []).length;
  assert.equal(routeCount, 22);
  assert.equal(routeCount * 2, 44);
  assert.match(page, /generateStaticParams/);
  assert.match(frenchPage, /generateStaticParams/);
});

test("AppChrome owns chrome for dashboard paths except legacy; non-dashboard JSX is unchanged", async () => {
  const source = await readFile(new URL("../../components/layout/AppChrome.tsx", import.meta.url), "utf8");
  // V11-2 hunk: the disposition is decided by the shared dashboardChromeOwned
  // helper (dashboard path ∧ status !== legacy), covering /dashboard/login,
  // /fr/dashboard/login and every anonymous dashboard route.
  assert.match(source, /dashboardChromeOwned\(pathname, foundation\.status\)/);
  assert.doesNotMatch(source, /foundation\.status !== "anonymous"/);
  // The non-dashboard branch keeps the exact storefront chrome composition.
  assert.match(source, /<LocalizedSkipLink \/>/);
  assert.match(source, /<SiteHeader \/>/);
  assert.match(source, /<SiteFooter \/>/);
  assert.match(source, /<CartAddedDrawer \/>/);
  assert.match(source, /<CustomerSupportWidget \/>/);
  assert.match(source, /<LocationDetector \/>/);
  assert.match(source, /<CookieBar \/>/);
  assert.match(source, /<CookiePreferenceDrawer \/>/);
  assert.match(source, /<main className="main-shell" id="main-content" tabIndex=\{-1\}>/);
});

test("dashboardChromeOwned owns dashboard chrome for every non-legacy status and never for storefront paths", () => {
  const dashboardPaths = [
    "/dashboard",
    "/dashboard/",
    "/dashboard/orders",
    "/dashboard/login",
    "/fr/dashboard",
    "/fr/dashboard/login",
    "/fr/dashboard/settings/auth-rbac"
  ];
  const storefrontPaths = [
    "/",
    "/products/vanity-1",
    "/account/login",
    "/fr/account/login",
    "/fr",
    "/dashboardx",
    "/dashboard-extra",
    "/fr/dashboardx"
  ];
  for (const status of ["idle", "loading", "anonymous", "forbidden", "unavailable", "invalid", "ready"] as const) {
    for (const path of dashboardPaths) {
      assert.equal(dashboardChromeOwned(path, status), true, `${status} must own chrome on ${path}`);
    }
  }
  for (const status of ["idle", "loading", "anonymous", "forbidden", "unavailable", "invalid", "ready"] as const) {
    for (const path of storefrontPaths) {
      assert.equal(dashboardChromeOwned(path, status), false, `${status} must not own chrome on ${path}`);
    }
  }
  // The single legacy exception: dashboard paths keep the storefront chrome
  // fallback so the legacy shell renders exactly as before.
  for (const path of dashboardPaths) {
    assert.equal(dashboardChromeOwned(path, "legacy"), false, `legacy must keep storefront chrome on ${path}`);
  }
});

test("F0 shell captures the expired notice in an effect, never during render", async () => {
  const source = await readFile(new URL("../../components/dashboard/DashboardF0Shell.tsx", import.meta.url), "utf8");
  // The render-phase ref mutation that erased the ready → anonymous
  // transition under StrictMode double renders is gone.
  assert.doesNotMatch(source, /if \(previousStatusRef\.current !== foundationState\.status\) previousStatusRef\.current = foundationState\.status;/);
  // The decision is delegated to the session-notice lifecycle and applied
  // inside an effect from committed state.
  assert.match(source, /useEffect\(\(\) => \{\s*const action = sessionNoticeAction\(\{/);
  assert.match(source, /previousStatus: previousStatusRef\.current,/);
  assert.match(source, /currentStatus: foundationState\.status,/);
  assert.match(source, /setExpiredNotice\(true\)/);
  // Logout marks the transition as user-initiated before dispatching and
  // clears any persisted notice.
  assert.match(source, /loggingOutRef\.current = true;/);
  assert.match(source, /clearSessionNotice\(sessionNoticeStorageRef\.current\)/);
});

test("expired notice decision is StrictMode-stable, initial-anonymous clean, logout excluded", () => {
  // Effect model: the previous-status ref commits after the decision, so a
  // StrictMode double run of the same status yields the same action, and the
  // notice is state (once shown it persists until re-auth/logout/TTL). The
  // old render-phase ref mutation recomputed the notice on the second render
  // from an already mutated ref and lost it.
  const { storage, map } = (() => {
    const m = new Map<string, string>();
    return {
      storage: {
        getItem: (key: string) => m.get(key) ?? null,
        setItem: (key: string, value: string) => { m.set(key, value); },
        removeItem: (key: string) => { m.delete(key); }
      },
      map: m
    };
  })();
  let previous: DashboardFoundationState["status"] | null = null;
  const effectRun = (current: DashboardFoundationState["status"], loggingOut = false) => {
    const action = sessionNoticeAction({
      previousStatus: previous,
      currentStatus: current,
      loggingOut,
      now: Date.parse("2026-08-13T00:00:00Z"),
      storage
    });
    previous = current;
    return action;
  };
  // Initial anonymous visit, double-rendered: no expired notice, nothing stored.
  assert.equal(effectRun("anonymous"), "hide");
  assert.equal(effectRun("anonymous"), "keep");
  assert.equal(map.size, 0, "initial anonymous must not persist a notice");
  // Business 401: ready → anonymous (not logging out), double-rendered: the
  // notice persists once and is shown deterministically.
  effectRun("loading");
  effectRun("ready");
  assert.equal(effectRun("anonymous"), "show");
  assert.equal(effectRun("anonymous"), "keep");
  assert.equal(map.size, 1, "ready → anonymous must persist the notice");
  // Explicit logout: ready → anonymous with loggingOut — cleared, never expired.
  effectRun("loading");
  effectRun("ready");
  assert.equal(effectRun("anonymous", true), "hide");
  assert.equal(map.size, 0, "logout must clear the persisted notice");
  // A re-login resets the capture and a later expiry re-triggers it.
  effectRun("loading");
  effectRun("ready");
  assert.equal(effectRun("anonymous"), "show");
  assert.equal(effectRun("anonymous"), "keep");
});

test("Dashboard login routes are static Dashboard pages, never business sections", async () => {
  const routes = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const sectionMap = routes.match(/DASHBOARD_SECTION_SLUGS = \{([\s\S]*?)\n\} as const/)?.[1] ?? "";
  assert.doesNotMatch(sectionMap, /login/, "login must not be a business section slug");
  const page = await readFile(new URL("../../app/dashboard/login/page.tsx", import.meta.url), "utf8");
  const frenchPage = await readFile(new URL("../../app/fr/dashboard/login/page.tsx", import.meta.url), "utf8");
  assert.match(page, /DashboardLoginPage locale="en-CA"/);
  assert.match(frenchPage, /DashboardLoginPage locale="fr-CA"/);
  // The login pages are static routes — the dynamic [section] page must not
  // claim them (static login/ wins in Next.js, and the registry never lists
  // a login module).
  assert.doesNotMatch(page, /generateStaticParams|notFound/);
  assert.doesNotMatch(frenchPage, /generateStaticParams|notFound/);
});
