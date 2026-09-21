import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DASHBOARD_FOUNDATION_MODULE_STATE } from "../api/api-contract.ts";
import type { DashboardRouteModuleLike } from "./f0-shell.ts";
import {
  adjudicateDashboardReturnTo,
  classifyLoginSubmit,
  classifySessionRestore,
  dashboardAccessAllowed,
  dashboardAuthMachine,
  dashboardDefaultHref,
  dashboardLoginHref,
  dashboardLoginRequest,
  dashboardLogout,
  dashboardReturnToFromLoginQuery,
  dashboardReturnToTarget,
  dashboardSessionRequest,
  isAbortError,
  safeDashboardReturnTo,
  validateDashboardSessionUser,
  type DashboardAuthPhase,
  type DashboardSessionUser
} from "./auth-session.ts";

// The persisted V11-0 vector evidence lives in AI_OS (the same files the
// resolver tests read). SHA pins guarantee the adjudication regression runs
// against the identical frozen documents, never a drifting copy.
const AI_OS_TASKS_ROOT = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks";
const POSITIVE_VECTORS_PATH = `${AI_OS_TASKS_ROOT}/evidence/v11-0/selector-positive-vectors.v1.json`;
const NEGATIVE_VECTORS_PATH = `${AI_OS_TASKS_ROOT}/evidence/v11-0/selector-negative-vectors.v1.json`;
const POSITIVE_VECTORS_SHA256 = "5cf9b7dff1cf8632de8f667a137315ab45b989bbf720f9e1f993d2211b5365d8";
const NEGATIVE_VECTORS_SHA256 = "773373b804cbbe55c3e220ba7510384465b67723ee278bf653f8402e2c152d65";

function sha256File(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Live-projection-shaped module list built mechanically from the shared
 * registry (readAllowed only for the listed modules, coming-soon always
 * denied) — the same shape the backend producer projects.
 */
function projectionModules(readAllowedModules: readonly string[] = []): readonly DashboardRouteModuleLike[] {
  const allowed = new Set(readAllowedModules);
  return DASHBOARD_FOUNDATION_MODULE_STATE.map((entry) => ({
    ...entry,
    readAllowed: entry.status === "available" && allowed.has(entry.module)
  }));
}

const overviewOnlyProjection = projectionModules(["overview"]);

const adminUser: DashboardSessionUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@vanstro.test",
  kind: "admin",
  status: "active",
  roles: ["super_admin"],
  permissions: ["dashboard.access", "products.read"]
};

const sessionBody = (user: Record<string, unknown>) => ({ data: { user } });

test("validateDashboardSessionUser accepts the exact backend SessionUser DTO", () => {
  const parsed = validateDashboardSessionUser(sessionBody(adminUser));
  assert.deepEqual(parsed, adminUser);
  const fr = validateDashboardSessionUser(sessionBody({ ...adminUser, email: "admin@vanstro.ca", roles: [], permissions: [] }));
  assert.deepEqual(fr.roles, []);
  assert.deepEqual(fr.permissions, []);
});

test("validateDashboardSessionUser fails closed on malformed DTOs", () => {
  // Missing keys.
  assert.throws(() => validateDashboardSessionUser(sessionBody({ id: "x", email: "a@b", kind: "admin" })), /exactly/);
  // Extra keys (e.g. a future token echo) are rejected.
  assert.throws(() => validateDashboardSessionUser(sessionBody({ ...adminUser, accessToken: "leak" })), /exactly/);
  // Wrong shapes.
  assert.throws(() => validateDashboardSessionUser(sessionBody({ ...adminUser, roles: "admin" })), /roles/);
  assert.throws(() => validateDashboardSessionUser(sessionBody({ ...adminUser, permissions: [1] })), /permissions/);
  assert.throws(() => validateDashboardSessionUser(sessionBody({ ...adminUser, id: "" })), /id/);
  // Body envelope drift.
  assert.throws(() => validateDashboardSessionUser({ user: adminUser }), /data/);
  assert.throws(() => validateDashboardSessionUser(null), /object/);
});

test("dashboardAccessAllowed requires admin kind, active status and dashboard.access", () => {
  assert.equal(dashboardAccessAllowed(adminUser), true);
  assert.equal(dashboardAccessAllowed({ ...adminUser, kind: "customer" }), false);
  assert.equal(dashboardAccessAllowed({ ...adminUser, status: "disabled" }), false);
  assert.equal(dashboardAccessAllowed({ ...adminUser, status: "suspended" }), false);
  assert.equal(dashboardAccessAllowed({ ...adminUser, permissions: ["products.read"] }), false);
  assert.equal(dashboardAccessAllowed({ ...adminUser, permissions: [] }), false);
});

test("classifySessionRestore maps transport, HTTP and DTO outcomes", () => {
  assert.deepEqual(classifySessionRestore(null, null), { phase: "unavailable", user: null });
  assert.deepEqual(classifySessionRestore(401, null), { phase: "anonymous", user: null });
  assert.deepEqual(classifySessionRestore(403, null), { phase: "forbidden", user: null });
  for (const status of [400, 404, 408, 429, 500, 502, 503]) {
    assert.deepEqual(classifySessionRestore(status, null), { phase: "unavailable", user: null }, `status ${status}`);
  }
  assert.deepEqual(classifySessionRestore(200, { broken: true }), { phase: "invalid-response", user: null });
  assert.deepEqual(classifySessionRestore(200, sessionBody(adminUser)), { phase: "authenticated", user: adminUser });
  // Valid session without dashboard access is forbidden, never authenticated.
  assert.deepEqual(classifySessionRestore(200, sessionBody({ ...adminUser, kind: "customer" })), { phase: "forbidden", user: null });
  assert.deepEqual(classifySessionRestore(200, sessionBody({ ...adminUser, status: "disabled" })), { phase: "forbidden", user: null });
  assert.deepEqual(classifySessionRestore(200, sessionBody({ ...adminUser, permissions: [] })), { phase: "forbidden", user: null });
});

test("classifyLoginSubmit keeps credentials generic and transport separate", () => {
  assert.equal(classifyLoginSubmit(200), "ok");
  assert.equal(classifyLoginSubmit(400), "invalid-credentials");
  assert.equal(classifyLoginSubmit(401), "invalid-credentials");
  assert.equal(classifyLoginSubmit(null), "unavailable");
  for (const status of [403, 404, 408, 429, 500, 502, 503]) {
    assert.equal(classifyLoginSubmit(status), "unavailable", `status ${status}`);
  }
});

test("session machine fences stale and out-of-order events", () => {
  assert.equal(dashboardAuthMachine("restoring", { type: "RESTORE_ANONYMOUS" }), "anonymous");
  assert.equal(dashboardAuthMachine("restoring", { type: "RESTORE_FORBIDDEN" }), "forbidden");
  assert.equal(dashboardAuthMachine("restoring", { type: "RESTORE_UNAVAILABLE" }), "unavailable");
  assert.equal(dashboardAuthMachine("restoring", { type: "RESTORE_INVALID" }), "invalid-response");
  assert.equal(dashboardAuthMachine("restoring", { type: "RESTORE_AUTHENTICATED" }), "authenticated");
  assert.equal(dashboardAuthMachine("anonymous", { type: "LOGIN_START" }), "authenticating");
  // Login outcomes only from authenticating.
  assert.equal(dashboardAuthMachine("authenticating", { type: "LOGIN_INVALID" }), "anonymous");
  assert.equal(dashboardAuthMachine("authenticating", { type: "LOGIN_UNAVAILABLE" }), "unavailable");
  assert.equal(dashboardAuthMachine("authenticating", { type: "LOGIN_INVALID_RESPONSE" }), "invalid-response");
  assert.equal(dashboardAuthMachine("authenticating", { type: "LOGIN_FORBIDDEN" }), "forbidden");
  assert.equal(dashboardAuthMachine("authenticating", { type: "SESSION_ESTABLISHED" }), "authenticated");
  assert.equal(dashboardAuthMachine("authenticated", { type: "SESSION_EXPIRED" }), "expired");
  assert.equal(dashboardAuthMachine("authenticated", { type: "LOGOUT_START" }), "logging-out");
  assert.equal(dashboardAuthMachine("logging-out", { type: "LOGOUT_DONE" }), "anonymous");
  // A failed login retry may re-enter authenticating; a forbidden account
  // may log out and return to the anonymous form.
  assert.equal(dashboardAuthMachine("unavailable", { type: "LOGIN_START" }), "authenticating");
  assert.equal(dashboardAuthMachine("invalid-response", { type: "LOGIN_START" }), "authenticating");
  assert.equal(dashboardAuthMachine("forbidden", { type: "LOGOUT_START" }), "logging-out");
  assert.equal(dashboardAuthMachine("forbidden", { type: "LOGOUT_DONE" }), "anonymous");
  // Post-login boundary outcomes while authenticating (the /auth/me check
  // passed, the Foundation/Authorization reload then fails) resolve to the
  // retryable/forbidden surfaces instead of sticking.
  assert.equal(dashboardAuthMachine("authenticating", { type: "RESTORE_FORBIDDEN" }), "forbidden");
  assert.equal(dashboardAuthMachine("authenticating", { type: "RESTORE_UNAVAILABLE" }), "unavailable");
  assert.equal(dashboardAuthMachine("authenticating", { type: "RESTORE_INVALID" }), "invalid-response");
  // But pre-dispatch stale boundary states stay fenced: anonymous and a
  // spurious ready must never cancel an in-flight login.
  assert.equal(dashboardAuthMachine("authenticating", { type: "RESTORE_ANONYMOUS" }), "authenticating");
  assert.equal(dashboardAuthMachine("authenticating", { type: "RESTORE_AUTHENTICATED" }), "authenticating");
  // A restore retry restarts from every failure surface that offers Retry.
  assert.equal(dashboardAuthMachine("unavailable", { type: "RESTORE_START" }), "restoring");
  assert.equal(dashboardAuthMachine("invalid-response", { type: "RESTORE_START" }), "restoring");
  // Expired is a restoring-capable terminal: restore re-runs.
  assert.equal(dashboardAuthMachine("expired", { type: "RESTORE_START" }), "restoring");
  // Stale events fail closed.
  assert.equal(dashboardAuthMachine("anonymous", { type: "LOGIN_INVALID" }), "anonymous");
  assert.equal(dashboardAuthMachine("authenticating", { type: "RESTORE_ANONYMOUS" }), "authenticating");
  assert.equal(dashboardAuthMachine("authenticated", { type: "LOGIN_START" }), "authenticated");
  assert.equal(dashboardAuthMachine("forbidden", { type: "LOGIN_START" }), "forbidden");
  assert.equal(dashboardAuthMachine("logging-out", { type: "SESSION_EXPIRED" }), "logging-out");
  assert.equal(dashboardAuthMachine("authenticated", { type: "LOGOUT_DONE" }), "authenticated");
  assert.equal(dashboardAuthMachine("unavailable", { type: "LOGOUT_DONE" }), "unavailable");
});

test("safeDashboardReturnTo accepts exactly the dashboard route families", () => {
  for (const valid of [
    "/dashboard",
    "/dashboard/",
    "/dashboard/orders",
    "/dashboard/orders/",
    "/dashboard/products?orderStatus=paid&page=2",
    "/fr/dashboard",
    "/fr/dashboard/",
    "/fr/dashboard/settings/auth-rbac/",
    "/fr/dashboard/settings/auth-rbac?view=overview",
    "/fr/dashboard/orders/?orderStatus=paid",
    "/dashboard/settings/auth-rbac?view=overview",
    "/dashboard?tab=overview"
  ]) {
    // The original input (trailing slashes and all) is preserved verbatim.
    assert.equal(safeDashboardReturnTo(valid), valid, `expected ${valid} to be accepted`);
  }
});

test("safeDashboardReturnTo rejects external, hostile and malformed values", () => {
  const rejected = [
    "https://evil.example/dashboard",
    "http://evil.example/dashboard",
    "javascript:alert(1)",
    "//evil.example/dashboard",
    "/dashboard/../account",
    "/account/login",
    "/dashboardx",
    "/fr/account/login",
    "/fr/fr/dashboard/orders",
    "/fr/fr",
    "/dashboard/login",
    "/fr/dashboard/login",
    "/dashboard/login/",
    "/fr/dashboard/login/",
    "/dashboard/login?next=/dashboard",
    "/dashboard/login/?next=/dashboard",
    "/fr/dashboard/login?tab=overview",
    "/fr/dashboard/login/?tab=overview",
    "/dashboard//login",
    "/fr/dashboard//login",
    "/dashboard/%2e%2e",
    "/dashboard/.%2e",
    "/dashboard/%2e.",
    "/fr/dashboard/%2E%2E",
    "/dashboard/%2Faccount",
    "/dashboard/orders%2Fdetail",
    "/dashboard/orders?token=abc",
    "/dashboard/orders?access_token=abc",
    "/dashboard/orders?Password=abc",
    "/dashboard/orders?secret=x",
    "/dashboard/orders?credential=x",
    "/dashboard/orders?signature=x",
    "/dashboard?tab=orders&token=x",
    "/dashboard/orders\\..",
    "/dashboard/orders\n",
    "/dashboard/%zz",
    "/dashboard/%2",
    `/dashboard/${"x".repeat(2048)}`,
    "",
    "dashboard",
    "?tab=orders"
  ];
  for (const value of rejected) {
    assert.equal(safeDashboardReturnTo(value), null, `expected ${JSON.stringify(value.slice(0, 60))} to be rejected`);
  }
});

test("dashboard href helpers stay locale-bound and login-safe", () => {
  assert.equal(dashboardLoginHref("en-CA"), "/dashboard/login");
  assert.equal(dashboardLoginHref("fr-CA"), "/fr/dashboard/login");
  assert.equal(dashboardDefaultHref("en-CA"), "/dashboard");
  assert.equal(dashboardDefaultHref("fr-CA"), "/fr/dashboard");
  // The default and login hrefs must never be rejected by the returnTo gate
  // (login itself is rejected as a self-loop).
  assert.equal(safeDashboardReturnTo(dashboardDefaultHref("en-CA")), "/dashboard");
  assert.equal(safeDashboardReturnTo(dashboardDefaultHref("fr-CA")), "/fr/dashboard");
  assert.equal(safeDashboardReturnTo(dashboardLoginHref("en-CA")), null);
  assert.equal(safeDashboardReturnTo(dashboardLoginHref("fr-CA")), null);
});

// ---------------------------------------------------------------------------
// returnTo Authority adjudication (V11-1 runtime selector resolver reuse)
// ---------------------------------------------------------------------------

test("adjudicateDashboardReturnTo reuses the V11-1 resolver: canonical, alias, query, legacy, prefix, coming-soon, deny", () => {
  const registry = DASHBOARD_FOUNDATION_MODULE_STATE;
  const known = (input: string) => {
    const result = adjudicateDashboardReturnTo(input, registry);
    assert.equal(result.kind, "known", `expected ${input} to adjudicate known`);
    return result.kind === "known" ? result : null;
  };
  // Canonical exact.
  assert.deepEqual(known("/dashboard/orders"), { kind: "known", source: "canonical", module: "orders", status: "available", denied: false });
  assert.equal(known("/fr/dashboard/orders")?.source, "canonical");
  // Noncanonical alias (path_exact).
  assert.equal(known("/dashboard/media")?.module, "content");
  assert.equal(known("/dashboard/runtime")?.module, "operations");
  // Legacy query (legacy_tab on /dashboard).
  assert.equal(known("/dashboard?tab=orders")?.source, "legacy_tab");
  assert.equal(known("/fr/dashboard?tab=auditLogs")?.module, "audit");
  // Query refinement (query_value).
  assert.equal(known("/dashboard/operations?view=jobs")?.source, "query_value");
  assert.equal(known("/dashboard/operations?view=work-queue")?.module, "operations");
  // Settings prefix (path_prefix).
  assert.equal(known("/dashboard/settings/profile")?.source, "path_prefix");
  assert.equal(known("/fr/dashboard/settings/auth-rbac")?.module, "settings");
  // Coming-soon ownership is preserved with its status.
  assert.equal(known("/dashboard/audit")?.status, "coming_soon");
  assert.equal(known("/dashboard/payments")?.module, "payments");
  // Available deny surfaces only from a projection with readAllowed=false.
  const deny = adjudicateDashboardReturnTo("/dashboard/orders", overviewOnlyProjection);
  assert.deepEqual(deny, { kind: "known", source: "canonical", module: "orders", status: "available", denied: true });
  // Coming-soon stays denied-but-known even through a projection.
  const comingSoon = adjudicateDashboardReturnTo("/dashboard/audit", overviewOnlyProjection);
  assert.equal(comingSoon.kind, "known");
  // Unknown reasons flow through typed.
  assert.deepEqual(adjudicateDashboardReturnTo("/dashboard/nope", registry), { kind: "unknown", reason: "no_match" });
  assert.deepEqual(adjudicateDashboardReturnTo("/dashboard/orders?tab=orders&tab=cancelled", registry), { kind: "unknown", reason: "conflicting_duplicate_key" });
  assert.deepEqual(adjudicateDashboardReturnTo("https://evil.example/dashboard", registry), { kind: "unknown", reason: "absolute_url" });
});

test("dashboardReturnToFromLoginQuery decodes once and fails closed on ambiguity", () => {
  assert.equal(dashboardReturnToFromLoginQuery(""), null);
  assert.equal(dashboardReturnToFromLoginQuery("tab=overview"), null);
  assert.equal(dashboardReturnToFromLoginQuery("returnTo="), null);
  assert.equal(dashboardReturnToFromLoginQuery("returnTo=%2Fdashboard%2Forders%3ForderStatus%3Dpaid"), "/dashboard/orders?orderStatus=paid");
  assert.equal(dashboardReturnToFromLoginQuery("returnTo=%2Ffr%2Fdashboard%2Forders"), "/fr/dashboard/orders");
  // Same-value duplicates are harmless; conflicting values fail closed.
  assert.equal(dashboardReturnToFromLoginQuery("returnTo=%2Fdashboard&returnTo=%2Fdashboard"), "/dashboard");
  assert.equal(dashboardReturnToFromLoginQuery("returnTo=%2Fdashboard&returnTo=%2Fdashboard%2Forders"), null);
});

test("dashboardReturnToTarget maps unknown and malformed return targets to the locale Overview", () => {
  assert.equal(dashboardReturnToTarget("/dashboard/not-a-real-route", "en-CA"), "/dashboard");
  assert.equal(dashboardReturnToTarget("/fr/dashboard/not-a-real-route", "fr-CA"), "/fr/dashboard");
  assert.equal(dashboardReturnToTarget("/fr/dashboard/not-a-real-route", "en-CA"), "/dashboard");
  assert.equal(dashboardReturnToTarget(null, "en-CA"), "/dashboard");
  assert.equal(dashboardReturnToTarget(null, "fr-CA"), "/fr/dashboard");
  for (const hostile of [
    "https://evil.example/dashboard",
    "//evil.example/dashboard",
    "/dashboard/login",
    "/fr/dashboard/login",
    "/dashboard/login?next=/dashboard",
    "/dashboard/../account",
    "/dashboard/%2e%2e",
    "/dashboard/orders%2Fdetail",
    "/dashboard/orders?token=abc",
    `/dashboard/${"x".repeat(2048)}`,
    "dashboard",
    "/fr/fr/dashboard/orders",
    "/dashboard/%zz"
  ]) {
    assert.equal(dashboardReturnToTarget(hostile, "en-CA"), "/dashboard", hostile);
    assert.equal(dashboardReturnToTarget(hostile, "fr-CA"), "/fr/dashboard", hostile);
  }
});

test("dashboardReturnToTarget preserves known canonical, alias, query, legacy, prefix and coming-soon targets", () => {
  for (const legal of [
    "/dashboard",
    "/dashboard/orders",
    "/dashboard/orders?orderStatus=paid",
    "/fr/dashboard/orders?orderStatus=paid",
    "/dashboard?tab=orders",
    "/dashboard/operations?view=jobs",
    "/dashboard/settings/profile",
    "/fr/dashboard/settings/auth-rbac?view=overview",
    "/dashboard/media",
    "/dashboard/audit",
    "/dashboard/payments"
  ]) {
    assert.equal(dashboardReturnToTarget(legal, "en-CA"), legal, legal);
  }
  assert.equal(dashboardReturnToTarget("/fr/dashboard", "fr-CA"), "/fr/dashboard");
  assert.equal(dashboardReturnToTarget("/fr/dashboard/orders", "fr-CA"), "/fr/dashboard/orders");
});

test("available deny returnTo is preserved so the ready shell renders forbidden", () => {
  // The login page cannot know the actor's permissions pre-login; once the
  // Foundation projection is ready, the deny classification is preserved and
  // the shell's own authorization adjudication renders the forbidden state.
  assert.deepEqual(adjudicateDashboardReturnTo("/dashboard/orders", overviewOnlyProjection), { kind: "known", source: "canonical", module: "orders", status: "available", denied: true });
  assert.equal(dashboardReturnToTarget("/dashboard/orders", "en-CA", overviewOnlyProjection), "/dashboard/orders");
  assert.deepEqual(adjudicateDashboardReturnTo("/dashboard/settings/auth-rbac", overviewOnlyProjection), { kind: "known", source: "path_prefix", module: "settings", status: "coming_soon", denied: true });
});

test("explicit login returnTo query decodes then runs both validation layers", () => {
  const viaLogin = (search: string, locale = "en-CA") =>
    dashboardReturnToTarget(dashboardReturnToFromLoginQuery(search), locale);
  // Legal encoded Dashboard targets survive both layers and keep their locale.
  assert.equal(viaLogin("returnTo=%2Fdashboard%2Forders%3ForderStatus%3Dpaid"), "/dashboard/orders?orderStatus=paid");
  assert.equal(viaLogin("returnTo=%2Fdashboard"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Ffr%2Fdashboard%2Forders", "fr-CA"), "/fr/dashboard/orders");
  assert.equal(viaLogin("returnTo=%2Ffr%2Fdashboard", "fr-CA"), "/fr/dashboard");
  // Encoded external / dot / double-encoding / sensitive / self-loop /
  // fragment / malformed percent never bypass the input layer.
  assert.equal(viaLogin("returnTo=%2F%2Fevil.example%2Fdashboard"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Fdashboard%2F%2e%2e%2Faccount"), "/dashboard");
  assert.equal(viaLogin("returnTo=%252Fdashboard%252Forders"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Fdashboard%2Forders%3Ftoken%3Dabc"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Fdashboard%2Fsettings%2F%253Ftoken%253Dabc"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Ffr%2Fdashboard%2Fsettings%2F%253Ftoken%253Dabc", "fr-CA"), "/fr/dashboard");
  assert.equal(viaLogin("returnTo=%2Fdashboard%2Flogin"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Fdashboard%23section"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Fdashboard%2F%zz"), "/dashboard");
  // Unknown decoded targets fall back to the locale Overview.
  assert.equal(viaLogin("returnTo=%2Fdashboard%2Fnot-a-real-route"), "/dashboard");
  assert.equal(viaLogin("returnTo=%2Fdashboard%2Fnot-a-real-route", "fr-CA"), "/fr/dashboard");
  // Conflicting duplicate returnTo keys fail closed.
  assert.equal(viaLogin("returnTo=%2Fdashboard&returnTo=%2Fdashboard%2Forders"), "/dashboard");
  // The login page query alone is never a return target.
  assert.equal(viaLogin("tab=overview&view=compact"), "/dashboard");
});

test("query order and extra non-sensitive parameters never change the returnTo owner", () => {
  assert.equal(dashboardReturnToTarget("/dashboard/orders?orderStatus=paid&page=2", "en-CA"), "/dashboard/orders?orderStatus=paid&page=2");
  assert.equal(dashboardReturnToTarget("/dashboard/orders?page=2&orderStatus=paid", "en-CA"), "/dashboard/orders?page=2&orderStatus=paid");
  assert.equal(dashboardReturnToTarget("/dashboard?tab=orders&view=compact", "en-CA"), "/dashboard?tab=orders&view=compact");
  assert.equal(dashboardReturnToTarget("/dashboard/operations?view=jobs&extra=1", "en-CA"), "/dashboard/operations?view=jobs&extra=1");
  assert.equal(dashboardReturnToTarget("/fr/dashboard/orders?orderStatus=paid&orderStatus=paid", "fr-CA"), "/fr/dashboard/orders?orderStatus=paid&orderStatus=paid");
});

test("conflicting duplicate query keys fail closed to the locale Overview", () => {
  assert.equal(dashboardReturnToTarget("/dashboard/orders?orderStatus=paid&orderStatus=cancelled", "en-CA"), "/dashboard");
  assert.equal(dashboardReturnToTarget("/dashboard?tab=orders&tab=products", "en-CA"), "/dashboard");
  assert.equal(dashboardReturnToTarget("/dashboard/operations?view=jobs&view=work-queue", "fr-CA"), "/fr/dashboard");
  assert.equal(dashboardReturnToTarget("/fr/dashboard/orders?tab=orders&tab=cancelled", "fr-CA"), "/fr/dashboard");
  assert.deepEqual(adjudicateDashboardReturnTo("/dashboard/orders?orderStatus=paid&orderStatus=cancelled", DASHBOARD_FOUNDATION_MODULE_STATE), { kind: "unknown", reason: "conflicting_duplicate_key" });
});

test("all 204 finite + 6 prefix + 5 negative persisted V11-0 vectors adjudicate through the registry", async () => {
  const rawPositives = await readFile(POSITIVE_VECTORS_PATH, "utf8");
  assert.equal(sha256File(rawPositives), POSITIVE_VECTORS_SHA256);
  const document = JSON.parse(rawPositives) as {
    counts: Record<string, number>;
    finite: Array<{ locale: "en-CA" | "fr-CA"; url: string; owner: string; status: "available" | "coming_soon"; query?: string }>;
    prefix: Array<{ url: string }>;
  };
  assert.equal(document.counts.finite, 204);
  assert.equal(document.finite.length, 204);
  assert.equal(document.prefix.length, 6);

  for (const vector of document.finite) {
    const input = vector.query ? `${vector.url}?${vector.query}` : vector.url;
    // Layer 1 accepts every legal Dashboard family input verbatim.
    assert.equal(safeDashboardReturnTo(input), input, input);
    // Layer 2 resolves through the same shared registry with matching
    // ownership — the adjudication must never diverge from the resolver.
    const adjudication = adjudicateDashboardReturnTo(input, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(adjudication.kind, "known", input);
    if (adjudication.kind === "known") {
      assert.equal(adjudication.module, vector.owner, `owner mismatch for ${input}`);
      assert.equal(adjudication.status, vector.status, `status mismatch for ${input}`);
    }
    assert.equal(dashboardReturnToTarget(input, vector.locale), input, input);
  }
  for (const vector of document.prefix) {
    assert.equal(safeDashboardReturnTo(vector.url), vector.url, vector.url);
    const adjudication = adjudicateDashboardReturnTo(vector.url, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(adjudication.kind, "known", vector.url);
    if (adjudication.kind === "known") {
      assert.equal(adjudication.module, "settings", vector.url);
      assert.equal(adjudication.source, "path_prefix", vector.url);
    }
  }

  const rawNegatives = await readFile(NEGATIVE_VECTORS_PATH, "utf8");
  assert.equal(sha256File(rawNegatives), NEGATIVE_VECTORS_SHA256);
  const negatives = JSON.parse(rawNegatives) as { vectors: Array<{ url: string; expected: "unknown" }> };
  assert.equal(negatives.vectors.length, 5);
  for (const vector of negatives.vectors) {
    const adjudication = adjudicateDashboardReturnTo(vector.url, DASHBOARD_FOUNDATION_MODULE_STATE);
    assert.equal(adjudication.kind, "unknown", vector.url);
    assert.equal(dashboardReturnToTarget(vector.url, "en-CA"), "/dashboard", vector.url);
  }
});

test("dashboardLogout always settles and never reads storage", async (context) => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    throw new TypeError("network down");
  }) as typeof fetch;
  await dashboardLogout("https://api.example");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.example/auth/logout");
  assert.equal(calls[0].init.method, "POST");
  assert.equal((calls[0].init.credentials as string | undefined), "include");
});

test("login/session transports propagate AbortError and collapse other failures", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const controller = new AbortController();
  globalThis.fetch = (async () => {
    throw new DOMException("The operation was aborted.", "AbortError");
  }) as typeof fetch;
  // An unmount abort must propagate so the caller can stop silently.
  await assert.rejects(dashboardLoginRequest("https://api.example", "a@b.test", "pw", controller.signal), /AbortError/);
  await assert.rejects(dashboardSessionRequest("https://api.example", controller.signal), /AbortError/);
  assert.equal(isAbortError(new DOMException("x", "AbortError")), true);
  assert.equal(isAbortError(new TypeError("network down")), false);
  // Any other failure is a retryable unavailable result, never a rejection.
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  assert.deepEqual(await dashboardLoginRequest("https://api.example", "a@b.test", "pw"), { status: null, payload: null });
  assert.deepEqual(await dashboardSessionRequest("https://api.example"), { status: null, payload: null });
});
