import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { INITIAL_PERMISSIONS } from "@vanstro/db/permissions";
import { createApp } from "../app.js";
import { createSession } from "../auth/session.js";
import { DASHBOARD_PERMISSION_RULES } from "./access.js";
import {
  DASHBOARD_FOUNDATION_AUTHORITY_SHA256,
  DASHBOARD_FOUNDATION_CONTRACT_VERSION,
  DASHBOARD_FOUNDATION_MODULES,
  dashboardShellConfig,
  dashboardShellInternalActorIds,
  dashboardShellMode,
  projectDashboardModules,
  promotionsCanEdit,
  resolveDashboardRoute,
  validateDashboardFoundationRegistry,
  type DashboardFoundationModule,
  type DashboardModuleCanonical,
  type DashboardModuleSelector,
  type DashboardModuleStatus,
  type DashboardSelectorKind
} from "./foundation.js";
import { projectAuthorizationModules, type DashboardAuthorizationContext } from "./authorization.js";

// Persisted V11-0 Authority v1.1.1 and its generated vector evidence live in
// AI_OS (the same files the frozen authority's own static gates read). The
// tests below read them at runtime, verify their SHA-256 pins, and then
// mechanically derive the expected registry and exercise every vector
// through the real runtime resolver — never a counting stub.
const AI_OS_TASKS_ROOT = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks";
const AUTHORITY_PATH = `${AI_OS_TASKS_ROOT}/contracts/v11-0-admin-module-authority.v1.1.1.json`;
const POSITIVE_VECTORS_PATH = `${AI_OS_TASKS_ROOT}/evidence/v11-0/selector-positive-vectors.v1.json`;
const NEGATIVE_VECTORS_PATH = `${AI_OS_TASKS_ROOT}/evidence/v11-0/selector-negative-vectors.v1.json`;
const AUTHORITY_SHA256 = "2434e1affb9a4b226ec776870ce260ed560c0a2a3ec1a856c52d40465c36c271";
const POSITIVE_VECTORS_SHA256 = "5cf9b7dff1cf8632de8f667a137315ab45b989bbf720f9e1f993d2211b5365d8";
const NEGATIVE_VECTORS_SHA256 = "773373b804cbbe55c3e220ba7510384465b67723ee278bf653f8402e2c152d65";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

type PersistedAuthorityModule = {
  module: string;
  label: string;
  status: DashboardModuleStatus;
  group: string;
  permissions: string[];
  canonical: DashboardModuleCanonical;
  selectors: DashboardModuleSelector[];
};

type PersistedAuthority = {
  schemaVersion: string;
  status: string;
  selectorKinds: DashboardSelectorKind[];
  modules: PersistedAuthorityModule[];
  counts: { modules: number; available: number; comingSoon: number; canonicalPaths: number; nonCanonicalExactPaths: number; exactPaths: number; exactVariants: number; querySelectors: number; queryVariants: number; legacySelectors: number; legacyVariants: number; finitePositiveVectors: number; prefixSelectors: number };
  normalizationAlgorithm: {
    version: string;
    reject: string[];
    steps: string[];
    locale: { default: string; optionalPrefix: string; maxPrefixes: number; ownershipInvariant: boolean };
    trailingSlash: string;
    query: { parser: string; keyValueExact: boolean; orderIndependent: boolean; extraParametersDoNotChangeOwner: boolean; conflictingDuplicateKey: string; compareAfterPercentDecode: boolean; notPartOfPathExactUniqueness: boolean };
    prefix: string;
  };
  vectorArtifacts: { generator: string; positive: string; negative: string; generatorSha256: string; positiveSha256: string; negativeSha256: string; finitePositiveCount: number; prefixPositiveCount: number; prefixNegativeCount: number };
};

type PositiveVector = { locale: "en-CA" | "fr-CA"; slash: "with" | "without"; url: string; owner: string; status: DashboardModuleStatus; source: "canonical" | "path_exact" | "query_value" | "legacy_tab"; query?: string };
type PrefixVector = { url: string; owner: string; status: DashboardModuleStatus; source: "path_prefix" };

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function authority(): PersistedAuthority {
  return readJson(AUTHORITY_PATH) as PersistedAuthority;
}

function positiveVectors(): { counts: Record<string, number>; finite: PositiveVector[]; prefix: PrefixVector[] } {
  const document = readJson(POSITIVE_VECTORS_PATH) as { counts: Record<string, number>; finite: PositiveVector[]; prefix: PrefixVector[] };
  return document;
}

function negativeVectors(): { vectors: Array<{ url: string; expected: "unknown" }> } {
  return readJson(NEGATIVE_VECTORS_PATH) as { vectors: Array<{ url: string; expected: "unknown" }> };
}

function resolution(input: string) {
  const result = resolveDashboardRoute(input);
  assert.equal(result.kind, "known", `expected "${input}" to resolve to a known module, got ${JSON.stringify(result)}`);
  return result;
}

function unknownReason(input: string) {
  const result = resolveDashboardRoute(input);
  assert.equal(result.kind, "unknown", `expected "${input}" to fail closed, got ${JSON.stringify(result)}`);
  return result.reason;
}

async function withShellEnv<T>(mode: string | undefined, actorIds: string | undefined, callback: () => Promise<T>) {
  const previousMode = process.env.DASHBOARD_SHELL_V2_MODE;
  const previousActorIds = process.env.DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS;
  if (mode === undefined) delete process.env.DASHBOARD_SHELL_V2_MODE;
  else process.env.DASHBOARD_SHELL_V2_MODE = mode;
  if (actorIds === undefined) delete process.env.DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS;
  else process.env.DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS = actorIds;
  try {
    return await callback();
  } finally {
    if (previousMode === undefined) delete process.env.DASHBOARD_SHELL_V2_MODE;
    else process.env.DASHBOARD_SHELL_V2_MODE = previousMode;
    if (previousActorIds === undefined) delete process.env.DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS;
    else process.env.DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS = previousActorIds;
  }
}

async function createActor(kind: "admin" | "customer", permissions: string[]) {
  const suffix = randomUUID();
  const role = await prisma.role.create({
    data: {
      key: `foundation-${suffix}`,
      name: `Foundation ${suffix}`,
      rolePermissions: permissions.length ? {
        create: permissions.map((permission) => ({ permission: { connect: { key: permission } } }))
      } : undefined
    }
  });
  const user = await prisma.user.create({
    data: {
      email: `foundation-${suffix}@example.test`,
      kind,
      status: "active",
      userRoles: { create: { roleId: role.id } }
    }
  });
  const session = await createSession(user.id);
  return { user, role, token: session.accessToken };
}

async function deleteActor(actor: Awaited<ReturnType<typeof createActor>>) {
  await prisma.refreshSession.deleteMany({ where: { userId: actor.user.id } });
  await prisma.userRole.deleteMany({ where: { userId: actor.user.id } });
  await prisma.user.delete({ where: { id: actor.user.id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: actor.role.id } });
  await prisma.role.delete({ where: { id: actor.role.id } });
}

// ---------------------------------------------------------------------------
// Persisted Authority binding
// ---------------------------------------------------------------------------

test("persisted V11-0 Authority v1.1.1 is SHA-bound and the export matches", () => {
  assert.equal(AUTHORITY_SHA256, "2434e1affb9a4b226ec776870ce260ed560c0a2a3ec1a856c52d40465c36c271");
  assert.equal(sha256File(AUTHORITY_PATH), AUTHORITY_SHA256);
  assert.equal(DASHBOARD_FOUNDATION_AUTHORITY_SHA256, AUTHORITY_SHA256);

  const persisted = authority();
  assert.equal(persisted.schemaVersion, "vanstro.v11.admin-module-authority.v1.1.1");
  assert.equal(persisted.status, "FROZEN_AUTHORITY");
  assert.deepEqual(persisted.selectorKinds, ["path_exact", "path_prefix", "query_value", "legacy_tab"]);
  assert.deepEqual(persisted.counts, {
    modules: 22, available: 11, comingSoon: 11, canonicalPaths: 22, nonCanonicalExactPaths: 4,
    exactPaths: 26, exactVariants: 104, querySelectors: 3, queryVariants: 12,
    legacySelectors: 22, legacyVariants: 88, finitePositiveVectors: 204, prefixSelectors: 1
  });
});

// V11-R1 edit-gate registration (p1 products/pricing/categories/inventory/
// orders/customers/users, p3 dealers, F4 promotions): each module's
// code-registry permission list
// extends the frozen read authority with its write grant so the persisted
// authorization actions can resolve (frontend runtime validation mirrors the
// same table in api-contract.ts). The persisted authority stays byte-frozen
// and SHA-bound; this table is the ONLY permitted divergence from it.
const REGISTERED_MODULE_PERMISSIONS: Record<string, readonly string[]> = {
  products: ["products.read", "products.write"],
  categories: ["products.read", "categories.write"],
  pricing: ["products.read", "pricing.write"],
  inventory: ["inventory.read", "inventory.write"],
  orders: ["orders.read", "orders.update", "orders.assign"],
  customers: ["crm.read", "crm.update"],
  users: ["users.manage"],
  dealers: ["dealers.read", "settings.write"],
  promotions: ["products.read", "pricing.write"]
};

test("registry is the typed single source and matches the persisted authority mechanically", () => {
  const persisted = authority();
  const expected: unknown = persisted.modules.map((entry) => ({
    ...entry,
    permissions: [...(REGISTERED_MODULE_PERMISSIONS[entry.module] ?? entry.permissions)],
    route: entry.canonical.pathname
  }));
  assert.deepEqual(DASHBOARD_FOUNDATION_MODULES, expected);

  assert.equal(DASHBOARD_FOUNDATION_MODULES.filter((entry) => entry.status === "available").length, 11);
  assert.equal(DASHBOARD_FOUNDATION_MODULES.filter((entry) => entry.status === "coming_soon").length, 11);
  assert.equal(DASHBOARD_FOUNDATION_MODULES.length, 22);
  assert.ok(DASHBOARD_FOUNDATION_MODULES.every((entry) => entry.route === entry.canonical.pathname));
  // Every registered permission stays canonical (fail closed on typos);
  // the write-grant registration itself is pinned by the deepEqual above.
  const canonical = new Set<string>(INITIAL_PERMISSIONS);
  assert.ok(DASHBOARD_FOUNDATION_MODULES.every((entry) => entry.permissions.every((permission) => canonical.has(permission))));
});

test("vector evidence files are SHA-bound to the authority's own artifact pins", () => {
  const persisted = authority();
  assert.equal(sha256File(POSITIVE_VECTORS_PATH), POSITIVE_VECTORS_SHA256);
  assert.equal(sha256File(NEGATIVE_VECTORS_PATH), NEGATIVE_VECTORS_SHA256);
  assert.equal(persisted.vectorArtifacts.positiveSha256, POSITIVE_VECTORS_SHA256);
  assert.equal(persisted.vectorArtifacts.negativeSha256, NEGATIVE_VECTORS_SHA256);
  assert.equal(persisted.vectorArtifacts.finitePositiveCount, 204);
  assert.equal(persisted.vectorArtifacts.prefixPositiveCount, 6);
  assert.equal(persisted.vectorArtifacts.prefixNegativeCount, 5);
});

// ---------------------------------------------------------------------------
// Persisted positive vectors — every vector through the real resolver
// ---------------------------------------------------------------------------

test("all 204 persisted finite positive vectors resolve to their owners", () => {
  const { counts, finite } = positiveVectors();
  assert.equal(counts.finite, 204);
  assert.equal(finite.length, 204);
  // The persisted vector `url` holds the pathname only; query-bearing
  // selectors carry their search string in the separate `query` field.
  const fullInput = (vector: PositiveVector) => vector.query ? `${vector.url}?${vector.query}` : vector.url;
  assert.equal(new Set(finite.map(fullInput)).size, 204);

  const owners = new Set<string>();
  const statuses = new Set<string>();
  const sources = new Set<string>();
  const locales = new Set<string>();
  for (const vector of finite) {
    const result = resolution(fullInput(vector));
    assert.equal(result.owner, vector.owner, `owner mismatch for ${fullInput(vector)}`);
    assert.equal(result.status, vector.status, `status mismatch for ${fullInput(vector)}`);
    assert.equal(result.source, vector.source, `source mismatch for ${fullInput(vector)}`);
    assert.equal(result.locale, vector.locale, `locale mismatch for ${fullInput(vector)}`);
    owners.add(result.owner);
    statuses.add(result.status);
    sources.add(result.source);
    locales.add(result.locale);
  }
  // The finite set covers every module, both statuses, all four selector
  // kinds and both locales — not just a sample of them.
  assert.deepEqual([...owners].sort(), DASHBOARD_FOUNDATION_MODULES.map((entry) => entry.module).sort());
  assert.deepEqual([...statuses].sort(), ["available", "coming_soon"]);
  assert.deepEqual([...sources].sort(), ["canonical", "legacy_tab", "path_exact", "query_value"]);
  assert.deepEqual([...locales].sort(), ["en-CA", "fr-CA"]);
});

test("all 6 persisted prefix positives resolve to settings via path_prefix", () => {
  const { prefix } = positiveVectors();
  assert.equal(prefix.length, 6);
  for (const vector of prefix) {
    const result = resolution(vector.url);
    assert.equal(result.owner, "settings", `owner mismatch for ${vector.url}`);
    assert.equal(result.status, "coming_soon", `status mismatch for ${vector.url}`);
    assert.equal(result.source, "path_prefix", `source mismatch for ${vector.url}`);
    assert.equal(result.locale, vector.url.startsWith("/fr") ? "fr-CA" : "en-CA");
  }
});

// ---------------------------------------------------------------------------
// Persisted negative vectors — every vector fails closed
// ---------------------------------------------------------------------------

test("all 5 persisted negative vectors fail closed with typed reasons", () => {
  const { vectors } = negativeVectors();
  assert.equal(vectors.length, 5);
  const expectedReasons: Record<string, string> = {
    "/dashboard/settingsx": "no_match",
    "/dashboard/setting": "no_match",
    "/dashboard/settings-other": "no_match",
    "/fr/dashboard/settingsx": "no_match",
    "/fr/fr/dashboard/settings/example": "repeated_fr_prefix"
  };
  for (const vector of vectors) {
    assert.equal(vector.expected, "unknown");
    assert.equal(unknownReason(vector.url), expectedReasons[vector.url], `reason mismatch for ${vector.url}`);
  }
});

// ---------------------------------------------------------------------------
// Normalization and rejection semantics
// ---------------------------------------------------------------------------

test("rejected inputs fail closed: absolute, protocol-relative, malformed percent, fragment", () => {
  for (const url of ["https://example.com/dashboard", "http:/dashboard/orders", "ftp://host/x", "javascript:alert(1)"]) {
    assert.equal(unknownReason(url), "absolute_url", url);
  }
  for (const url of ["//example.com/dashboard", "//dashboard/orders"]) {
    assert.equal(unknownReason(url), "protocol_relative_url", url);
  }
  for (const url of ["dashboard", "dashboard/orders", "?tab=orders", "x/y"]) {
    assert.equal(unknownReason(url), "not_site_relative", url);
  }
  for (const url of ["/dashboard/%ZZ", "/dashboard/%2G", "/dashboard/%", "/dashboard/%2", "/dashboard/operations?view=%G1", "/dashboard?tab=%"]) {
    assert.equal(unknownReason(url), "malformed_percent_encoding", url);
  }
  for (const url of ["/dashboard#section", "/dashboard/orders#/tab", "/dashboard?tab=orders#top"]) {
    assert.equal(unknownReason(url), "fragment_owned_routing", url);
  }
});

test("locale prefix: exactly one /fr is stripped, repeated /fr fails closed", () => {
  assert.equal(resolution("/fr/dashboard").locale, "fr-CA");
  assert.equal(resolution("/fr/dashboard").owner, "overview");
  assert.equal(resolution("/fr/dashboard/").owner, "overview");
  assert.equal(resolution("/fr/dashboard?tab=orders").owner, "orders");
  assert.equal(resolution("/fr/dashboard/operations?view=jobs").owner, "operations");
  for (const url of ["/fr/fr", "/fr/fr/", "/fr/fr/dashboard", "/fr/fr/dashboard/settings/example"]) {
    assert.equal(unknownReason(url), "repeated_fr_prefix", url);
  }
  // An empty segment after the locale prefix is not a repeated /fr prefix;
  // the degenerate path simply matches nothing (fail closed).
  assert.equal(unknownReason("/fr//fr/dashboard"), "no_match");
  // /fr is not a prefix of other segments.
  assert.equal(unknownReason("/fr"), "no_match");
  assert.equal(unknownReason("/fr/"), "no_match");
  assert.equal(unknownReason("/french/dashboard"), "no_match");
  assert.equal(unknownReason("/frfr/dashboard"), "no_match");
});

test("trailing slashes normalize away for matching, root stays /", () => {
  assert.equal(resolution("/dashboard/").owner, "overview");
  assert.equal(resolution("/dashboard//").owner, "overview");
  assert.equal(resolution("/dashboard///").owner, "overview");
  assert.equal(resolution("/fr/dashboard///").owner, "overview");
  assert.equal(resolution("/dashboard/media/").owner, "content");
  assert.equal(resolution("/dashboard/settings/profile///").owner, "settings");
  assert.equal(unknownReason("/"), "no_match");
});

// ---------------------------------------------------------------------------
// Query semantics
// ---------------------------------------------------------------------------

test("query matching: order-independent, extra parameters never change owner", () => {
  assert.equal(resolution("/dashboard/operations?view=jobs").owner, "operations");
  assert.equal(resolution("/dashboard/operations?page=2&view=work-queue&sort=asc").owner, "operations");
  assert.equal(resolution("/dashboard/operations?view=notifications&x=1&x=1").owner, "operations");
  assert.equal(resolution("/dashboard/orders?foo=bar&page=3").owner, "orders");
  assert.equal(resolution("/dashboard?tab=orders&page=1").owner, "orders");
  assert.equal(resolution("/dashboard?tab=unknown").owner, "overview");
  assert.equal(resolution("/dashboard/operations?view=other").owner, "operations");
});

test("query matching: key=value compares after percent-decoding", () => {
  assert.equal(resolution("/dashboard/operations?view=%6Aobs").owner, "operations");
  assert.equal(resolution("/dashboard/operations?view=jobs&view=%6Aobs").owner, "operations");
  assert.equal(resolution("/dashboard?tab=orders&tab=%6Frders").owner, "orders");
});

test("query matching: conflicting duplicate keys fail closed, same-value duplicates are harmless", () => {
  for (const url of [
    "/dashboard/operations?view=jobs&view=work-queue",
    "/dashboard/operations?view=jobs&view=notifications",
    "/dashboard?tab=orders&tab=overview",
    "/dashboard?tab=orders&tab=settings",
    "/dashboard/orders?a=1&a=2"
  ]) {
    assert.equal(unknownReason(url), "conflicting_duplicate_key", url);
  }
  assert.equal(resolution("/dashboard/operations?view=jobs&view=jobs").owner, "operations");
  assert.equal(resolution("/dashboard?tab=orders&tab=orders").owner, "orders");
});

// ---------------------------------------------------------------------------
// Matching priority
// ---------------------------------------------------------------------------

test("priority: canonical exact > noncanonical exact > prefix, query refines canonical", () => {
  // Canonical exact beats the prefix owned by the same module.
  const settings = resolution("/dashboard/settings");
  assert.equal(settings.owner, "settings");
  assert.equal(settings.source, "canonical");
  // Noncanonical exact beats the settings prefix boundary.
  const content = resolution("/dashboard/media");
  assert.equal(content.owner, "content");
  assert.equal(content.source, "path_exact");
  assert.equal(resolution("/dashboard/data-jobs").owner, "content");
  assert.equal(resolution("/dashboard/runtime").owner, "operations");
  assert.equal(resolution("/dashboard/analytics-foundation").owner, "operations");
  // Prefix only matches descendants, never the canonical path.
  assert.equal(resolution("/dashboard/settings/profile").source, "path_prefix");
  // legacy_tab refinement overrides the canonical overview owner.
  const orders = resolution("/dashboard?tab=orders");
  assert.equal(orders.owner, "orders");
  assert.equal(orders.source, "legacy_tab");
  const overview = resolution("/dashboard?tab=overview");
  assert.equal(overview.owner, "overview");
  assert.equal(overview.source, "legacy_tab");
  // query_value refinement on operations keeps its canonical owner.
  const jobs = resolution("/dashboard/operations?view=jobs");
  assert.equal(jobs.owner, "operations");
  assert.equal(jobs.source, "query_value");
});

// ---------------------------------------------------------------------------
// Registry validation
// ---------------------------------------------------------------------------

test("registry validation fails closed on illegal status and uniqueness violations", () => {
  const cloneWith = (mutate: (entry: DashboardFoundationModule) => void) => {
    const copy = DASHBOARD_FOUNDATION_MODULES.map((entry) => ({
      ...entry,
      permissions: [...entry.permissions],
      selectors: entry.selectors.map((selector) => ({ ...selector })),
      canonical: { ...entry.canonical }
    }));
    mutate(copy[0]);
    return copy;
  };
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => { (entry as { status: string }).status = "illegal"; })), /illegal status/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => { (entry as { status: string }).status = "AVAILABLE"; })), /illegal status/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => { entry.module = "products"; })), /duplicate module key/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => {
    entry.canonical.pathname = "/dashboard/products";
    (entry as { route: string }).route = "/dashboard/products";
    entry.selectors = [{ kind: "legacy_tab", pathname: "/dashboard/products", key: "tab", value: "overview" }];
  })), /duplicate canonical path/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => { (entry as { route: string }).route = "/dashboard/other"; })), /route mirror mismatch/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => { (entry as { canonical: { kind: string } }).canonical.kind = "path_prefix"; })), /must be path_exact/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => {
    entry.selectors = [
      { kind: "path_exact", pathname: "/dashboard" },
      { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "overviewX" }
    ];
  })), /exact path collision/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => {
    entry.selectors = [
      { kind: "path_exact", pathname: "/dashboard/media" },
      { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "overviewX" }
    ];
  })), /duplicate selector identity/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => {
    entry.selectors = [
      { kind: "query_value", pathname: "/dashboard/not-a-canonical-path", key: "view", value: "jobs" },
      { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "overviewX" }
    ];
  })), /not attached to a canonical path/);
  assert.throws(() => validateDashboardFoundationRegistry(cloneWith((entry) => { entry.selectors = [{ kind: "path_prefix", pathname: "/dashboard/prefix/" }]; })), /legacy_tab/);
  assert.throws(() => validateDashboardFoundationRegistry(DASHBOARD_FOUNDATION_MODULES.map((entry) => ({ ...entry })).slice(0, 21)), /expected 22 modules/);
  assert.throws(() => {
    const withoutSettings = DASHBOARD_FOUNDATION_MODULES.map((entry) => entry.module === "settings"
      ? { ...entry, module: "settings_removed", selectors: entry.selectors.filter((selector) => selector.kind !== "path_prefix") }
      : { ...entry });
    validateDashboardFoundationRegistry(withoutSettings);
  }, /settings/);
});

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

test("projection carries label, group, status, route, selector summary, readAllowed and reason", () => {
  const modules = projectDashboardModules(["dashboard.access", "products.read"]);
  const products = modules.find((module) => module.module === "products")!;
  assert.deepEqual(products, {
    module: "products",
    label: "产品",
    group: "catalog",
    status: "available",
    route: "/dashboard/products",
    selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "products" }],
    readAllowed: true
  });
  const settings = modules.find((module) => module.module === "settings")!;
  assert.deepEqual(settings.selectors, [
    { kind: "path_prefix", pathname: "/dashboard/settings/" },
    { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "settings" }
  ]);
  for (const entry of DASHBOARD_FOUNDATION_MODULES) {
    const projection = modules.find((module) => module.module === entry.module)!;
    assert.equal(projection.label, entry.label);
    assert.equal(projection.group, entry.group);
    assert.equal(projection.status, entry.status);
    assert.equal(projection.route, entry.route);
    assert.deepEqual(projection.selectors, entry.selectors.map((selector) => ({
      kind: selector.kind,
      pathname: selector.pathname,
      ...(selector.kind === "query_value" || selector.kind === "legacy_tab" ? { key: selector.key, value: selector.value } : {})
    })));
  }
});

test("decision order: coming_soon always wins over permission allow and deny", () => {
  const allPermissions = [...new Set(DASHBOARD_FOUNDATION_MODULES.flatMap((entry) => entry.permissions))];
  const modules = projectDashboardModules(allPermissions);
  for (const entry of DASHBOARD_FOUNDATION_MODULES) {
    const projection = modules.find((module) => module.module === entry.module)!;
    assert.equal(projection.status, entry.status);
    assert.equal(projection.route, entry.route);
    if (entry.status === "coming_soon") {
      assert.equal(projection.readAllowed, false);
      assert.equal(projection.reason, "coming_soon");
    } else {
      assert.equal(projection.readAllowed, true);
      assert.equal(projection.reason, undefined);
    }
  }
});

test("coming-soon projections never disclose permissions or the actor's allow state", () => {
  const actorHasComingSoonPermissions = ["settings.read", "content.read", "audit_logs.read", "orders.read"];
  const without = projectDashboardModules([]);
  const withPermissions = projectDashboardModules(actorHasComingSoonPermissions);
  for (const entry of DASHBOARD_FOUNDATION_MODULES) {
    const projection = without.find((module) => module.module === entry.module)!;
    const promoted = withPermissions.find((module) => module.module === entry.module)!;
    if (entry.status === "coming_soon") {
      // Byte-identical whether or not the actor holds the module permissions.
      assert.deepEqual(promoted, projection, `coming-soon projection leaked state for ${entry.module}`);
      assert.equal(projection.readAllowed, false);
      assert.equal(projection.reason, "coming_soon");
      assert.equal("permissions" in projection, false);
    }
  }
});

test("module projection uses only canonical known read permissions", () => {
  const modules = projectDashboardModules(["dashboard.access", "products.read", "permission.unknown"]);
  assert.deepEqual(modules.map((module) => module.module), DASHBOARD_FOUNDATION_MODULES.map((module) => module.module));
  assert.equal(modules.find((module) => module.module === "overview")?.readAllowed, true);
  assert.equal(modules.find((module) => module.module === "products")?.readAllowed, true);
  assert.equal(modules.find((module) => module.module === "orders")?.readAllowed, false);
  assert.equal(modules.find((module) => module.module === "orders")?.reason, "permission_required");
  assert.equal(modules.find((module) => module.module === "payments")?.readAllowed, false);
  assert.equal(modules.find((module) => module.module === "payments")?.reason, "coming_soon");
  assert.equal(modules.find((module) => module.module === "settings")?.status, "coming_soon");
  assert.equal(modules.find((module) => module.module === "settings")?.reason, "coming_soon");
  assert.equal(modules.some((module) => module.module === "permission.unknown"), false);
});

test("unknown and invalid actor permissions never create or promote a module", () => {
  const modules = projectDashboardModules(["permission.unknown", "orders.read", "settings.read", ""]);
  assert.equal(modules.length, 22);
  assert.equal(modules.find((module) => module.module === "orders")?.readAllowed, true);
  assert.equal(modules.find((module) => module.module === "payments")?.readAllowed, false);
  assert.equal(modules.find((module) => module.module === "payments")?.reason, "coming_soon");
  assert.equal(modules.find((module) => module.module === "settings")?.readAllowed, false);
  assert.equal(modules.find((module) => module.module === "settings")?.reason, "coming_soon");
  assert.equal(modules.some((module) => module.module === "permission.unknown"), false);
});

test("module projection exposes no registry internals or sensitive data", () => {
  const modules = projectDashboardModules(["dashboard.access", "orders.read", "settings.read"]);
  for (const module of modules) {
    assert.deepEqual(Object.keys(module).sort(), module.readAllowed
      ? ["group", "label", "module", "readAllowed", "route", "selectors", "status"]
      : ["group", "label", "module", "readAllowed", "reason", "route", "selectors", "status"]);
    assert.equal("permissions" in module, false);
    assert.equal("canonical" in module, false);
  }
  const payload = JSON.stringify(modules);
  const permissionKeys = [...new Set(DASHBOARD_FOUNDATION_MODULES.flatMap((entry) => entry.permissions))];
  for (const permission of permissionKeys) {
    assert.ok(!payload.includes(permission), `projection leaked permission key "${permission}"`);
  }
  assert.doesNotMatch(payload, /@|password|secret|token/i);
});

// ---------------------------------------------------------------------------
// V11-R1 F4 promotions write grant
// ---------------------------------------------------------------------------

test("promotions module projects products.read + pricing.write and the write grant resolves", () => {
  const promotions = DASHBOARD_FOUNDATION_MODULES.find((entry) => entry.module === "promotions")!;
  assert.deepEqual([...promotions.permissions], ["products.read", "pricing.write"]);
  assert.equal(promotionsCanEdit(["pricing.write"]), true);
  assert.equal(promotionsCanEdit(["pricing.write", "products.read"]), true);
  assert.equal(promotionsCanEdit([]), false);
  assert.equal(promotionsCanEdit(["products.read"]), false);
});

test("promotionsCanEdit cannot be cross-opened by products or dealers permissions", () => {
  assert.equal(promotionsCanEdit(["products.write"]), false);
  assert.equal(promotionsCanEdit(["products.read", "products.write"]), false);
  assert.equal(promotionsCanEdit(["settings.write"]), false);
  assert.equal(promotionsCanEdit(["dealers.read", "settings.write"]), false);
  assert.equal(promotionsCanEdit(["dashboard.access", "orders.update", "crm.update", "users.manage"]), false);
  assert.equal(promotionsCanEdit(["pricing.write"]), true);
});

test("authorization actions surface carries the promotions pricing.write grant and no cross-open", () => {
  const grantFor = (permissionKey: string): DashboardAuthorizationContext => ({
    actorId: "promotions-grant-test",
    globalRoleKeys: ["test-role"],
    scopedRoleKeys: [],
    permissionGrants: [{ permissionKey, global: true, dealerIds: [], locationIds: [] }],
    contextRevision: "test"
  });
  const withPricingWrite = projectAuthorizationModules(grantFor("pricing.write"))
    .find((module) => module.module === "promotions")!;
  assert.ok(withPricingWrite.actions.some((action) => action.permissionKey === "pricing.write" && action.decision === "allow"));
  assert.equal(withPricingWrite.actions.some((action) => action.permissionKey === "products.read" && action.decision === "allow"), false);
  for (const permission of ["products.write", "settings.write", "dealers.read"]) {
    const denied = projectAuthorizationModules(grantFor(permission))
      .find((module) => module.module === "promotions")!;
    assert.equal(denied.actions.some((action) => action.permissionKey === "pricing.write" && action.decision === "allow"), false, `promotions opened by ${permission}`);
  }
});

// ---------------------------------------------------------------------------
// V11-R1 F4 pricing write grant (mirrors the promotions registration)
// ---------------------------------------------------------------------------

test("pricing module projects products.read + pricing.write and the write grant resolves", () => {
  const pricing = DASHBOARD_FOUNDATION_MODULES.find((entry) => entry.module === "pricing")!;
  assert.deepEqual([...pricing.permissions], ["products.read", "pricing.write"]);
});

test("pricing write grant resolves through the authorization actions surface and never cross-opens", () => {
  const grantFor = (permissionKey: string): DashboardAuthorizationContext => ({
    actorId: "pricing-grant-test",
    globalRoleKeys: ["test-role"],
    scopedRoleKeys: [],
    permissionGrants: [{ permissionKey, global: true, dealerIds: [], locationIds: [] }],
    contextRevision: "test"
  });
  const withPricingWrite = projectAuthorizationModules(grantFor("pricing.write"))
    .find((module) => module.module === "pricing")!;
  assert.ok(withPricingWrite.actions.some((action) => action.permissionKey === "pricing.write" && action.decision === "allow"));
  assert.equal(withPricingWrite.actions.some((action) => action.permissionKey === "products.read" && action.decision === "allow"), false);
  for (const permission of ["products.write", "settings.write", "dealers.read", "categories.write", "inventory.write"]) {
    const denied = projectAuthorizationModules(grantFor(permission))
      .find((module) => module.module === "pricing")!;
    assert.equal(denied.actions.some((action) => action.permissionKey === "pricing.write" && action.decision === "allow"), false, `pricing opened by ${permission}`);
  }
});

// ---------------------------------------------------------------------------
// V11-R1 F4 categories/inventory write grants (mirror the pricing and
// promotions registrations)
// ---------------------------------------------------------------------------

test("categories module projects products.read + categories.write and the write grant resolves", () => {
  const categories = DASHBOARD_FOUNDATION_MODULES.find((entry) => entry.module === "categories")!;
  assert.deepEqual([...categories.permissions], ["products.read", "categories.write"]);
});

test("categories write grant resolves through the authorization actions surface and never cross-opens", () => {
  const grantFor = (permissionKey: string): DashboardAuthorizationContext => ({
    actorId: "categories-grant-test",
    globalRoleKeys: ["test-role"],
    scopedRoleKeys: [],
    permissionGrants: [{ permissionKey, global: true, dealerIds: [], locationIds: [] }],
    contextRevision: "test"
  });
  const withCategoriesWrite = projectAuthorizationModules(grantFor("categories.write"))
    .find((module) => module.module === "categories")!;
  assert.ok(withCategoriesWrite.actions.some((action) => action.permissionKey === "categories.write" && action.decision === "allow"));
  assert.equal(withCategoriesWrite.actions.some((action) => action.permissionKey === "products.read" && action.decision === "allow"), false);
  for (const permission of ["products.write", "pricing.write", "settings.write", "inventory.write", "users.manage"]) {
    const denied = projectAuthorizationModules(grantFor(permission))
      .find((module) => module.module === "categories")!;
    assert.equal(denied.actions.some((action) => action.permissionKey === "categories.write" && action.decision === "allow"), false, `categories opened by ${permission}`);
  }
});

test("inventory module projects inventory.read + inventory.write and the write grant resolves", () => {
  const inventory = DASHBOARD_FOUNDATION_MODULES.find((entry) => entry.module === "inventory")!;
  assert.deepEqual([...inventory.permissions], ["inventory.read", "inventory.write"]);
});

test("inventory write grant resolves through the authorization actions surface and never cross-opens", () => {
  const grantFor = (permissionKey: string): DashboardAuthorizationContext => ({
    actorId: "inventory-grant-test",
    globalRoleKeys: ["test-role"],
    scopedRoleKeys: [],
    permissionGrants: [{ permissionKey, global: true, dealerIds: [], locationIds: [] }],
    contextRevision: "test"
  });
  const withInventoryWrite = projectAuthorizationModules(grantFor("inventory.write"))
    .find((module) => module.module === "inventory")!;
  assert.ok(withInventoryWrite.actions.some((action) => action.permissionKey === "inventory.write" && action.decision === "allow"));
  assert.equal(withInventoryWrite.actions.some((action) => action.permissionKey === "inventory.read" && action.decision === "allow"), false);
  for (const permission of ["products.write", "pricing.write", "settings.write", "categories.write"]) {
    const denied = projectAuthorizationModules(grantFor(permission))
      .find((module) => module.module === "inventory")!;
    assert.equal(denied.actions.some((action) => action.permissionKey === "inventory.write" && action.decision === "allow"), false, `inventory opened by ${permission}`);
  }
});

// ---------------------------------------------------------------------------
// ACL and contract surface
// ---------------------------------------------------------------------------

test("foundation route is reconciled with ACL and canonical permissions", () => {
  const rule = DASHBOARD_PERMISSION_RULES.find((entry) => entry.method === "GET" && entry.path === "/dashboard/foundation");
  assert.deepEqual(rule, { method: "GET", path: "/dashboard/foundation", permission: "dashboard.access" });
  const canonical = new Set<string>(INITIAL_PERMISSIONS);
  assert.ok(DASHBOARD_FOUNDATION_MODULES.every((module) => module.permissions.every((permission) => canonical.has(permission))));
});

test("contract version is forwarded to dashboard-foundation.v1.1 and asserted", () => {
  assert.equal(DASHBOARD_FOUNDATION_CONTRACT_VERSION, "dashboard-foundation.v1.1");
  assert.notEqual(DASHBOARD_FOUNDATION_CONTRACT_VERSION, "dashboard-foundation.v1");
});

test("dashboard shell flag parsing is strict and allowlist parsing is server-only input", () => {
  for (const value of [undefined, "", "disabled", "INTERNAL", "internal ", "true", "1"]) {
    assert.equal(dashboardShellMode(value), "disabled");
  }
  assert.equal(dashboardShellMode("internal"), "internal");
  assert.deepEqual([...dashboardShellInternalActorIds(" actor-1, ,actor-2,actor-1 ")], ["actor-1", "actor-2"]);
  const throwingEnv = new Proxy({}, { get() { throw new Error("unavailable"); } }) as NodeJS.ProcessEnv;
  assert.deepEqual(dashboardShellConfig(throwingEnv), { mode: "disabled", actorIds: new Set() });
});

// ---------------------------------------------------------------------------
// Route end to end
// ---------------------------------------------------------------------------

test("foundation rejects anonymous, customer, and under-permission actors with request IDs", async () => {
  const anonymousRequestId = `foundation-anonymous-${randomUUID()}`;
  const anonymous = await app.request("/api/v1/dashboard/foundation", { headers: { "X-Request-Id": anonymousRequestId } });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.headers.get("X-Request-Id"), anonymousRequestId);
  assert.deepEqual(await anonymous.json(), {
    error: "Authentication is required.",
    code: "AUTH_REQUIRED",
    requestId: anonymousRequestId
  });

  for (const [kind, permissions, status] of [
    ["customer", ["dashboard.access"], 401],
    ["admin", ["products.read"], 403]
  ] as const) {
    const actor = await createActor(kind, [...permissions]);
    const requestId = `foundation-denied-${randomUUID()}`;
    try {
      const response = await app.request("/api/v1/dashboard/foundation", {
        headers: { authorization: `Bearer ${actor.token}`, "X-Request-Id": requestId }
      });
      assert.equal(response.status, status);
      assert.equal(response.headers.get("X-Request-Id"), requestId);
      const body = await response.json() as { code: string; requestId: string };
      assert.equal(body.code, status === 401 ? "AUTH_REQUIRED" : "DASHBOARD_FORBIDDEN");
      assert.equal(body.requestId, requestId);
    } finally {
      await deleteActor(actor);
    }
  }
});

test("foundation returns minimal read-only actor projection and strict shell state", async () => {
  const actor = await createActor("admin", ["dashboard.access", "products.read"]);
  try {
    for (const [mode, allowlist, enabled] of [
      [undefined, undefined, false],
      ["invalid", actor.user.id, false],
      ["internal", "another-actor", false],
      ["internal", actor.user.id, true]
    ] as const) {
      await withShellEnv(mode, allowlist, async () => {
        const requestId = `foundation-${randomUUID()}`;
        const response = await app.request("/api/v1/dashboard/foundation?mode=internal", {
          headers: {
            authorization: `Bearer ${actor.token}`,
            "X-Request-Id": requestId,
            "X-Dashboard-Shell-Mode": "internal",
            cookie: "dashboard.shell.v2=internal"
          }
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("X-Request-Id"), requestId);
        const body = await response.json() as { data: Record<string, unknown> & {
          actor: Record<string, unknown>;
          shell: Record<string, unknown>;
          requestId: string;
          modules: Array<{
            module: string;
            label: string;
            group: string;
            status: string;
            route: string;
            selectors: Array<{ kind: string; pathname: string; key?: string; value?: string }>;
            readAllowed: boolean;
            reason?: string;
          }>;
        } };
        assert.equal(body.data.requestId, requestId);
        assert.equal(body.data.contractVersion, "dashboard-foundation.v1.1");
        assert.deepEqual(body.data.actor, {
          id: actor.user.id,
          displayLabel: "Administrator",
          roleLabels: [actor.role.key]
        });
        assert.deepEqual(body.data.shell, {
          flag: "dashboard.shell.v2",
          mode: mode === "internal" ? "internal" : "disabled",
          enabled,
          code: mode !== "internal"
            ? "DASHBOARD_SHELL_DISABLED"
            : enabled ? "DASHBOARD_SHELL_READY" : "DASHBOARD_SHELL_ACTOR_NOT_ALLOWED",
          readOnly: true
        });
        const products = body.data.modules.find((module) => module.module === "products")!;
        assert.equal(products.readAllowed, true);
        assert.deepEqual(products, {
          module: "products",
          label: "产品",
          group: "catalog",
          status: "available",
          route: "/dashboard/products",
          selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "products" }],
          readAllowed: true
        });
        assert.equal(body.data.modules.find((module) => module.module === "orders")?.readAllowed, false);
        assert.equal(body.data.modules.find((module) => module.module === "orders")?.reason, "permission_required");
        assert.equal(body.data.modules.find((module) => module.module === "orders")?.status, "available");
        assert.equal(body.data.modules.find((module) => module.module === "payments")?.readAllowed, false);
        assert.equal(body.data.modules.find((module) => module.module === "payments")?.reason, "coming_soon");
        assert.equal(body.data.modules.find((module) => module.module === "payments")?.status, "coming_soon");
        const settings = body.data.modules.find((module) => module.module === "settings")!;
        assert.deepEqual(settings.selectors, [
          { kind: "path_prefix", pathname: "/dashboard/settings/" },
          { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "settings" }
        ]);
        assert.equal("permissions" in settings, false);
        assert.deepEqual(Object.keys(body.data).sort(), [
          "actor", "contractVersion", "modules", "readiness", "requestId", "shell", "visibility"
        ]);
        assert.equal("email" in body.data.actor, false);
        assert.equal("password" in body.data.actor, false);
        assert.equal("token" in body.data.actor, false);
        assert.equal("secret" in body.data.actor, false);
        assert.doesNotMatch(JSON.stringify(body.data.actor), /@/);
      });
    }
  } finally {
    await deleteActor(actor);
  }
});
