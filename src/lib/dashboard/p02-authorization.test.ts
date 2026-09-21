import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardAuthorization, DashboardFoundation } from "../api/api-contract.ts";
import {
  assertFreshDashboardAuthorization,
  assertMatchingDashboardActors,
  authorizationRequestIdentity,
  dashboardAuthorizationRequest,
  dashboardAuthorizationScopeLabel,
  projectAuthorizedFoundation,
  resolveDashboardAuthorizationLocation
} from "./p02-authorization.ts";
import { DashboardFoundationRequestError } from "./f0-shell.ts";

const foundation: DashboardFoundation = {
  contractVersion: "dashboard-foundation.v1.1",
  actor: { id: "actor-1", displayLabel: "Administrator", roleLabels: ["admin"] },
  modules: [
    { module: "overview", label: "工作台", group: "workspace", status: "available", route: "/dashboard", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "overview" }], readAllowed: true },
    { module: "dealers", label: "经销商", group: "organization", status: "available", route: "/dashboard/dealers", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "dealers" }], readAllowed: true },
    { module: "settings", label: "设置", group: "platform", status: "available", route: "/dashboard/settings", selectors: [{ kind: "path_prefix", pathname: "/dashboard/settings/" }, { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "settings" }], readAllowed: true },
    { module: "payments", label: "支付", group: "commerce", status: "coming_soon", route: "/dashboard/payments", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "paymentSessions" }], readAllowed: false, reason: "coming_soon" }
  ],
  visibility: { scope: "unavailable", fields: "permission-only" },
  shell: { flag: "dashboard.shell.v2", mode: "internal", enabled: true, code: "DASHBOARD_SHELL_READY", readOnly: true },
  readiness: "ready",
  requestId: "request-foundation"
};

function authorization(scope: DashboardAuthorization["scope"] = { kind: "mixed", source: "persisted_grants" }): DashboardAuthorization {
  return {
    contractVersion: "dashboard-authorization.v1",
    status: "ready",
    requestId: "request-authorization",
    issuedAt: "2026-08-02T00:00:00.000Z",
    expiresAt: "2026-08-02T00:01:00.000Z",
    contextRevision: "revision-1",
    actor: { principalType: "user", id: "actor-1", kind: "admin", status: "active", roleKeys: ["content_editor", "dealer_admin"] },
    effectiveRoles: [{ roleKey: "content_editor", scope: "global" }, { roleKey: "dealer_admin", scope: "dealer" }],
    modules: [
      { module: "overview", route: "/dashboard", status: "allowed", actions: [{ action: "read", permissionKey: "dashboard.access", decision: "allow", reason: "granted_by_persisted_permission", scope: { kind: "global" } }] },
      { module: "dealers", route: "/dashboard/dealers", status: "allowed", actions: [{ action: "read", permissionKey: "dealers.read", decision: "allow", reason: "granted_by_persisted_permission", scope: { kind: "location", dealerIds: ["dealer-a"], locationIds: ["location-a"] } }] },
      { module: "settings", route: "/dashboard/settings", status: "allowed", actions: [{ action: "read", permissionKey: "settings.read", decision: "allow", reason: "granted_by_persisted_permission", scope: { kind: "global" } }] }
    ],
    scope,
    fieldVisibility: [],
    commonQueryV1: { products: { enabled: true }, dealers: { enabled: true } },
    auditFoundationV1: { enabled: false, queryProfile: "dashboard.audit-events.v1", eventVersion: "audit-event.v1", sensitive: { enabled: false } },
    asyncJobFoundationV1: { enabled: false, contractVersion: "async-job.v1", queryProfile: "dashboard.async-jobs.v1", registryVersion: "async-job-registry.v1", sensitive: { enabled: false }, mutations: { create: false, cancel: false, retry: false }, artifacts: { metadata: false, download: false } },
    workQueueFoundationV1: { enabled: false, contractVersion: "work-queue-item.v1", queryProfile: "dashboard.work-queue.v1", registryVersion: "work-queue-registry.v1", sensitive: { enabled: false }, actions: { assign: false, acknowledge: false, resolve: false, dismiss: false, reopen: false }, notifications: { enabled: false, contractVersion: "in-app-notification.v1", queryProfile: "dashboard.in-app-notifications.v1", markRead: false, externalDelivery: false } },
    mediaFoundationV1: { enabled: false, contractVersion: "media-asset.v1", queryProfile: "dashboard.media-assets.v1", registryVersion: "media-registry.v1", safeProfile: "dashboard.media-assets.safe.v1", sensitiveProfile: { enabled: false, profileId: "dashboard.media-assets.sensitive.v1" }, actions: { create: false, update: false, archive: false, restore: false, downloadOriginal: false, manageVariants: false }, upload: { enabled: false, image: false, pdf: false, maxBytes: { image: 10_485_760, pdf: 26_214_400 }, intentLifetimeSeconds: 600, directControlledApi: true }, preview: { controlled: true, pdfInline: false }, legacyAdapters: { enabled: true, partial: true }, externalDelivery: false, ai: false, bulkImportExport: false },
    dataJobFoundationV1: { enabled: false, contractVersion: "dashboard.data-jobs.v1", registryVersion: "dashboard.data-jobs.registry.v1", objectKey: "foundation.sample", imports: { read: false, create: false, commit: false }, exports: { read: false, create: false, download: false }, upload: { controlled: true, directAuthenticatedApi: true }, download: { controlled: true, directAuthenticatedApi: true }, tenantPartition: false },
    settingsCenterV1: { enabled: false, contractVersion: "settings-center.v1", registryVersion: "settings-registry.v1", coreDescriptorKey: "settings.core.overview_refresh_seconds", actions: { read: false, createDraft: false, updateDraft: false, validate: false, publish: false, rollback: false }, history: { read: false }, readiness: { read: false }, audit: { integrated: true }, secrets: false, externalSideEffects: false, partialPublish: false }, serviceAccountsV1: { enabled: false, manage: false }
  };
}

test("P02 navigation uses each read action scope instead of top-level scope", () => {
  const input = authorization({ kind: "global", source: "persisted_grants" });
  input.modules[1] = { ...input.modules[1], status: "degraded" };
  const projected = projectAuthorizedFoundation({ ...foundation, modules: foundation.modules.map((module) => ({ ...module, readAllowed: false })) }, input);
  assert.equal(projected.modules.find((module) => module.module === "dealers")?.readAllowed, true);

  const scopedDomain = authorization();
  scopedDomain.modules[0] = { ...scopedDomain.modules[0], actions: [{ ...scopedDomain.modules[0].actions[0], scope: { kind: "dealer", dealerIds: ["dealer-a"], locationIds: [] } }] };
  assert.equal(projectAuthorizedFoundation(foundation, scopedDomain).modules.find((module) => module.module === "overview")?.readAllowed, false);

  const unavailable = authorization();
  unavailable.status = "unavailable";
  assert.ok(projectAuthorizedFoundation(foundation, unavailable).modules.every((module) => !module.readAllowed));

  const denied = authorization();
  denied.modules[1] = { ...denied.modules[1], actions: [{ ...denied.modules[1].actions[0], decision: "deny", reason: "permission_required", scope: { kind: "unavailable" } }] };
  assert.equal(projectAuthorizedFoundation(foundation, denied).modules.find((module) => module.module === "dealers")?.readAllowed, false);
});

test("P02 direct routes distinguish forbidden, coming-soon and unknown", () => {
  const denied = projectAuthorizedFoundation(foundation, {
    ...authorization(),
    modules: authorization().modules.map((module) => module.module === "dealers"
      ? { ...module, status: "denied" as const, actions: module.actions.map((action) => ({ ...action, decision: "deny" as const, reason: "permission_required" as const, scope: { kind: "unavailable" as const } })) }
      : module)
  });
  assert.equal(resolveDashboardAuthorizationLocation("/dashboard/dealers", denied).kind, "forbidden");
  assert.equal(resolveDashboardAuthorizationLocation("/dashboard/settings/history", denied).kind, "selected");
  const settingsDenied = { ...denied, modules: denied.modules.map((module) => module.module === "settings" ? { ...module, readAllowed: false, reason: "permission_required" as const } : module) };
  assert.equal(resolveDashboardAuthorizationLocation("/fr/dashboard/settings/lifecycle/", settingsDenied).kind, "forbidden");
  // Boundary-preserving prefix: any /dashboard/settings/ descendant belongs
  // to settings, including unknown views (never a special-parser fallback).
  assert.equal(resolveDashboardAuthorizationLocation("/dashboard/settings/future", denied).kind, "selected");
  assert.equal(resolveDashboardAuthorizationLocation("/dashboard/future", denied).kind, "unknown");
  assert.equal(resolveDashboardAuthorizationLocation("/fr/dashboard///", denied).kind, "selected");
  // Known coming-soon never surfaces as forbidden, even when the actor holds
  // the underlying read permission.
  assert.equal(resolveDashboardAuthorizationLocation("/dashboard/payments", denied).kind, "coming_soon");
  assert.equal(resolveDashboardAuthorizationLocation("/dashboard/payments", foundation).kind, "coming_soon");
});

test("P02 projection preserves v1.1 fields and keeps coming-soon byte-identical", () => {
  const granted = projectAuthorizedFoundation(foundation, authorization());
  const payments = granted.modules.find((module) => module.module === "payments")!;
  assert.equal(payments.status, "coming_soon");
  assert.equal(payments.readAllowed, false);
  assert.equal(payments.reason, "coming_soon");
  assert.deepEqual(payments.selectors, foundation.modules.find((module) => module.module === "payments")!.selectors);
  // Available modules keep label/group/status/selectors through the projection.
  const overview = granted.modules.find((module) => module.module === "overview")!;
  assert.equal(overview.label, "工作台");
  assert.equal(overview.group, "workspace");
  assert.equal(overview.status, "available");
  assert.deepEqual(overview.selectors, foundation.modules.find((module) => module.module === "overview")!.selectors);
});

test("P02 rejects an expired authorization snapshot", () => {
  const expired = authorization();
  expired.expiresAt = "2026-08-02T00:01:00.000Z";
  assert.throws(() => assertFreshDashboardAuthorization(expired, Date.parse("2026-08-02T00:01:00.000Z")), DashboardFoundationRequestError);
  assert.doesNotThrow(() => assertFreshDashboardAuthorization(expired, Date.parse("2026-08-02T00:00:30.000Z")));
});

test("P02 actor and revision form the data request identity", () => {
  const current = authorizationRequestIdentity(authorization());
  const next = authorization();
  next.contextRevision = "revision-2";
  assert.equal(current, "actor-1:revision-1");
  assert.notEqual(authorizationRequestIdentity(next), current);
});

test("P02 rejects mismatched Foundation and authorization actors", () => {
  const mismatch = authorization();
  mismatch.actor.id = "actor-2";
  assert.throws(() => assertMatchingDashboardActors(foundation, mismatch), DashboardFoundationRequestError);
});

test("P02 summary scope is display-only copy", () => {
  assert.equal(dashboardAuthorizationScopeLabel({ kind: "mixed", source: "persisted_grants" }), "混合范围");
  assert.equal(dashboardAuthorizationScopeLabel({ kind: "location", source: "persisted_grants", dealerIds: ["a"], locationIds: ["1", "2"] }), "1 个经销商 / 2 个地点");
});

test("P02 transport is cookie-authenticated, no-store and fail-closed", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  try {
    globalThis.fetch = async (input, init) => {
      calls.push({ input: String(input), init });
      return new Response(JSON.stringify({ data: authorization() }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    await dashboardAuthorizationRequest("https://example.test/api/v1");
    assert.equal(calls[0].input, "https://example.test/api/v1/dashboard/authorization");
    assert.equal(calls[0].init?.method, "GET");
    assert.equal(calls[0].init?.credentials, "include");
    assert.equal(calls[0].init?.cache, "no-store");

    for (const [status, failure] of [[401, "anonymous"], [403, "forbidden"], [500, "unavailable"]] as const) {
      globalThis.fetch = async () => new Response(null, { status });
      await assert.rejects(dashboardAuthorizationRequest("https://example.test/api/v1"), (error: unknown) => error instanceof DashboardFoundationRequestError && error.failure === failure);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
