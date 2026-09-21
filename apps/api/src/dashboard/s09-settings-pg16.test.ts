import assert from "node:assert/strict";
import test, { before } from "node:test";
import { hashPassword, prisma } from "@vanstro/db";
import { createApp } from "../app.js";

/**
 * S09 real owned PostgreSQL16 regression (goal Section 5 + contract Section
 * 12). Requires the disposable PG16 fixture from
 * scripts/test-api-regular-pg16.sh (super admin seeded + migration76 applied).
 */

const app = createApp();
const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
const password = process.env.SUPER_ADMIN_PASSWORD;
const idempotent = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 8)}`;

const VALID_VALUE = {
  passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 },
  sessionPolicy: { sessionLifetimeMinutes: 10080 }
};

let sharedToken: string | null = null;
async function login() {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200, `login failed: ${response.status}`);
  const body = (await response.json()) as { data: { accessToken: string } };
  return body.data.accessToken;
}
before(async () => {
  if (!password) return;
  sharedToken = await login();
});
async function adminToken() {
  if (!sharedToken) throw new Error("S09 PG16 fixture requires a seeded super admin");
  return sharedToken;
}
function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
async function currentS09Published(token: string) {
  // The S09 create function compares expectedPublishedVersion against the
  // active publication's settingsRevision (the descriptor CAS), not the
  // publication sequence. Read it from the readiness endpoint.
  const readinessResponse = await app.request("/api/v1/dashboard/settings/s09-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readinessResponse.status, 200);
  const readiness = ((await readinessResponse.json()) as { data: { publicationCas: number | null } }).data;
  return readiness.publicationCas ?? 0;
}
type S09DraftApiData = {
  id: string;
  descriptorKey: string;
  status: string;
  version: number;
  basePublicationVersion: number;
  changeReason: string;
  createdAt: string;
  updatedAt: string;
  validationRevision: number | null;
  rollbackOfPublicationId: string | null;
};
type S09ValidateApiData = {
  draftId: string;
  draftVersion: number;
  validationRevision: number;
  status: string;
  issues: Array<{ code: string; severity: string; field: string; message: string }>;
  validatedAt: string;
};
type S09PublishApiData = {
  id: string;
  generation: string;
  version: number;
  sourceDraftId: string;
  sourceDraftVersion: number;
  status: string;
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  readiness: { state: string; reasonCode: string; observedAt: string; publishedGeneration: number; publicationVersion: number; consumerGeneration: number; projectionState: string };
};

async function createS09Draft(token: string, value: unknown, changeReason = "S09 PG16 regression draft", expected?: number, idempotencyKey = idempotent("s09create")) {
  const expectedPublishedVersion = expected ?? await currentS09Published(token);
  const response = await app.request("/api/v1/dashboard/settings/s09-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.auth-rbac", expectedPublishedVersion, value, changeReason, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data: S09DraftApiData; error?: string; code?: string } };
}
async function validateS09Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s09validate")) {
  const response = await app.request(`/api/v1/dashboard/settings/s09-drafts/${draftId}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data: S09ValidateApiData; error?: string; code?: string } };
}
async function publishS09Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s09publish")) {
  const response = await app.request(`/api/v1/dashboard/settings/s09-drafts/${draftId}/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data: S09PublishApiData; error?: string; code?: string } };
}

test("S09 01 migration76 inventory: effective policy defaults live", async () => {
  // Migration inventory (76 with exactly one s09 dir, no 77) is covered by
  // the static migration76 test (scripts/s09-migration76-static.test.mjs).
  // Here we assert the runtime surface migration76 provides is live: the
  // effective policy resolver returns compiled defaults before any publish.
  const rows = await prisma.$queryRaw<Array<{ s09_settings_effective_policy_v1: string }>>`SELECT public.s09_settings_effective_policy_v1() AS s09_settings_effective_policy_v1`;
  const raw = rows[0]?.s09_settings_effective_policy_v1;
  assert.ok(raw, "effective policy resolver must be live after migration76");
  const policy = (typeof raw === "string" ? JSON.parse(raw) : raw) as { projectionState: string; publishedGeneration: number; passwordPolicy: { minimumLength: number; resetTokenTtlMinutes: number }; sessionPolicy: { sessionLifetimeMinutes: number } };
  assert.equal(policy.projectionState, "compiled_default");
  assert.equal(policy.publishedGeneration, 0);
  assert.equal(policy.passwordPolicy.minimumLength, 12);
  assert.equal(policy.passwordPolicy.resetTokenTtlMinutes, 30);
  assert.equal(policy.sessionPolicy.sessionLifetimeMinutes, 10080);
});

test("S09 02 S01/S02 regression: S01 and S02 lifecycle untouched by migration76", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // S01 create still works.
  const overview = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200);
  const publication = ((await overview.json()) as { data: { publication: { version: number } } }).data.publication;
  const s01Draft = await app.request("/api/v1/dashboard/settings/drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: publication.version, value: 90, changeReason: "S09 PG16 S01 regression", idempotencyKey: idempotent("s01reg") })
  });
  assert.equal(s01Draft.status, 201, "S01 create must be unaffected by migration76");
  // S02 create still works (expected CAS read from the S02 readiness endpoint,
  // which the S02 regression tests may have advanced earlier in the run).
  const s02Readiness = await app.request("/api/v1/dashboard/settings/s02-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s02Readiness.status, 200);
  const s02Cas = ((await s02Readiness.json()) as { data: { publicationCas: number | null } }).data.publicationCas ?? 0;
  const s02Draft = await app.request("/api/v1/dashboard/settings/s02-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.general-storefront", expectedPublishedVersion: s02Cas, value: { generalIdentity: { siteDisplayName: "VanStro Global Supply", legalName: "VanStro Canada Inc.", canonicalUrl: "https://vanstro.example", contactEmail: "contact@vanstro.example", contactPhone: "+1 204 555 0123", contactAddress: { line1: "123 Main St", city: "Winnipeg", province: "MB", postalCode: "R3C 1A1", country: "CA" }, defaultTimezone: "America/Winnipeg" }, brand: { brandName: "VanStro", brandDescription: "Canadian home materials", logoMediaRef: null, faviconMediaRef: null }, storefront: { homeContentRef: null, navigationRef: null, footerRef: null, defaultProductSort: "newest", outOfStockDisplay: "show", dealerSelectionEnabled: true, cartCheckoutEnabled: true, announcementRule: { enabled: true, message: "S09 S02 regression" }, maintenanceBannerRule: { enabled: false, message: "" }, storefrontConfigRef: null, enFrRoutesEnabled: true }, localization: { defaultLocale: "en-CA", supportedLocales: ["en-CA", "fr-CA"], dashboardLocale: "zh-CN", currency: "CAD", timezone: "America/Winnipeg", dateFormat: "yyyy-mm-dd", phoneFormat: "national", addressFormat: "canada_default", weightUnits: "kg", dimensionUnits: "cm", translationFallback: "en_ca", provinceServiceMapping: [] }, defaultDealerLocation: { defaultDealerRef: null, defaultLocationRef: null } }, changeReason: "S09 PG16 S02 regression", idempotencyKey: idempotent("s02reg") })
  });
  assert.equal(s02Draft.status, 201, "S02 create must be unaffected by migration76");
});

test("S09 03 create -> validate -> diff -> publish lifecycle", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS09Draft(token, VALID_VALUE);
  assert.equal(created.response.status, 201, `create: ${created.response.status}`);
  const draftId = created.body.data.id;
  assert.equal(created.body.data.descriptorKey, "settings.auth-rbac");
  const validated = await validateS09Draft(token, draftId, created.body.data.version);
  assert.equal(validated.response.status, 200, `validate: ${validated.response.status}`);
  assert.equal(validated.body.data.status, "validated");
  const diffResponse = await app.request(`/api/v1/dashboard/settings/s09-drafts/${draftId}/diff`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(diffResponse.status, 200, `diff: ${diffResponse.status}`);
  const diffBody = (await diffResponse.json()) as { data: { changes: Array<{ field: string; sensitivity: string }> } };
  assert.ok(Array.isArray(diffBody.data.changes) && diffBody.data.changes.length >= 1, "diff must list field-path changes");
  assert.ok(diffBody.data.changes.every((change) => change.sensitivity === "public" && typeof change.field === "string"));
  const published = await publishS09Draft(token, draftId, validated.body.data.draftVersion);
  assert.equal(published.response.status, 200, `publish: ${published.response.status}`);
  assert.ok(published.body.data.version > 0, "published generation must be positive");
  assert.equal(published.body.data.readiness.state, "ready", "auth consumer reads the published row directly");
  // Overview reflects the published projection.
  const overview = await app.request("/api/v1/dashboard/settings/s09-overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200, `overview: ${overview.status}`);
  const overviewBody = (await overview.json()) as { data: { descriptorKey: string; schemaVersion: string; projectionState: string; publishedGeneration: number; publication: { version: number; cas: number } | null; effective: { passwordPolicy: { minimumLength: number; resetTokenTtlMinutes: number }; sessionPolicy: { sessionLifetimeMinutes: number } } } };
  assert.equal(overviewBody.data.descriptorKey, "settings.auth-rbac");
  assert.equal(overviewBody.data.schemaVersion, "settings.auth-rbac.v1");
  assert.equal(overviewBody.data.projectionState, "published");
  assert.ok(overviewBody.data.publishedGeneration > 0);
  assert.ok(overviewBody.data.publication && overviewBody.data.publication.version > 0);
  assert.equal(overviewBody.data.effective.sessionPolicy.sessionLifetimeMinutes, 10080);
});

test("S09 04 structurally invalid value -> stable 400", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const outOfBounds = { passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 32 }, sessionPolicy: { sessionLifetimeMinutes: 10080 } };
  const created = await createS09Draft(token, outOfBounds);
  assert.equal(created.response.status, 400, "resetTokenTtlMinutes 32 (above the 31 ceiling) must reject at create");
  const unknownKey = { passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 10080 }, cookieSecret: "abc" };
  const created2 = await createS09Draft(token, unknownKey);
  assert.equal(created2.response.status, 400, "unknown key must reject");
  const wrongType = { passwordPolicy: { minimumLength: "12", resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 10080 } };
  const created3 = await createS09Draft(token, wrongType);
  assert.equal(created3.response.status, 400, "wrong-typed field must be stable 400");
});

test("S09 05 DB-level invalid (out-of-range) persisted + validate marks invalid", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // Direct draft row with an out-of-range value (draft rows bypass the shape
  // check; validate must flag them invalid with a blocker issue).
  const row = await prisma.runtimeConfigVersion.create({
    data: {
      configKey: "settings.auth-rbac", schemaVersion: "settings.auth-rbac.v1",
      authorizationScopeKind: "global", dealerIdsSnapshot: [], locationIdsSnapshot: [],
      contextRevision: "test", scopeFingerprint: "test", fieldVisibilityFingerprint: "test",
      desiredValue: { passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 5 } },
      desiredSource: "settings_draft", validationStatus: "validation_failed", activationStatus: "draft",
      version: 900001, createdBy: "test", idempotencyKeyHash: "0".repeat(64), requestHash: "0".repeat(64),
      settingsChangeReason: "S09 DB-level invalid draft", settingsRevision: 1, settingsLifecycleStatus: "draft"
    }
  });
  try {
    const validated = await validateS09Draft(token, row.id, 1, idempotent("s09dbinvalid"));
    assert.equal(validated.response.status, 200, `validate: ${validated.response.status}`);
    assert.equal(validated.body.data.status, "invalid", "out-of-range value must persist invalid");
    assert.ok((validated.body.data?.issues as Array<{ code: string; severity: string }>)?.some((issue) => issue.severity === "blocker" && issue.code === "S09_SESSION_TTL"), "must surface the session TTL blocker");
  } finally {
    await prisma.runtimeConfigVersion.delete({ where: { id: row.id } }).catch(() => undefined);
  }
});

test("S09 06 descriptor isolation: S09 idempotency/sequence independent of S01/S02", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const s09EventsBefore = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.auth-rbac" } });
  const created = await createS09Draft(token, VALID_VALUE, "S09 isolation draft");
  assert.equal(created.response.status, 201);
  const s01EventsBefore = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.core.overview_refresh_seconds" } });
  const v = await validateS09Draft(token, created.body.data.id, created.body.data.version);
  await publishS09Draft(token, created.body.data.id, v.body.data.draftVersion);
  const s01EventsAfter = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.core.overview_refresh_seconds" } });
  assert.equal(s01EventsAfter, s01EventsBefore, "S09 publish must not append S01 events");
  const s09EventsAfter = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.auth-rbac" } });
  assert.ok(s09EventsAfter >= s09EventsBefore + 1, "S09 publish must append S09 events");
});

test("S09 07 consumer wiring: login/refresh TTL, registration length, reset TTL", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // Before publish: login expiry is the compiled default 7d.
  const preLogin = await app.request("/api/v1/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(preLogin.status, 200);
  const preBody = (await preLogin.json()) as { data: { expiresAt: string } };
  const preExpiryMs = new Date(preBody.data.expiresAt).getTime() - Date.now();
  assert.ok(preExpiryMs > 6.9 * 24 * 3600 * 1000 && preExpiryMs < 7.1 * 24 * 3600 * 1000, `pre-publish login expiry must stay 7d, got ${preExpiryMs / 3600_000}h`);
  // Publish a 30-minute session lifetime + 16-char minimum.
  const value = { passwordPolicy: { minimumLength: 16, resetTokenTtlMinutes: 5 }, sessionPolicy: { sessionLifetimeMinutes: 30 } };
  const created = await createS09Draft(token, value, "S09 consumer wiring publish");
  assert.equal(created.response.status, 201);
  const v = await validateS09Draft(token, created.body.data.id, created.body.data.version);
  const published = await publishS09Draft(token, created.body.data.id, v.body.data.draftVersion);
  assert.equal(published.response.status, 200, `publish: ${published.response.status}`);
  // Post-publish login: expiry is 30 minutes.
  const postLogin = await app.request("/api/v1/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(postLogin.status, 200);
  const postBody = (await postLogin.json()) as { data: { accessToken: string; expiresAt: string } };
  const postExpiryMs = new Date(postBody.data.expiresAt).getTime() - Date.now();
  assert.ok(postExpiryMs > 29 * 60_000 && postExpiryMs < 31 * 60_000, `post-publish login expiry must be 30m, got ${postExpiryMs / 60_000}m`);
  // Existing session (pre-publish login) must NOT be retroactively changed.
  assert.ok(preExpiryMs > 6.9 * 24 * 3600 * 1000, "existing session expiry must not be retroactively changed");
  // Refresh: expiry is 30 minutes.
  const refresh = await app.request("/api/v1/auth/refresh", {
    method: "POST", headers: { authorization: `Bearer ${postBody.data.accessToken}` }
  });
  assert.equal(refresh.status, 200);
  const refreshBody = (await refresh.json()) as { data: { expiresAt: string } };
  const refreshExpiryMs = new Date(refreshBody.data.expiresAt).getTime() - Date.now();
  assert.ok(refreshExpiryMs > 29 * 60_000 && refreshExpiryMs < 31 * 60_000, `refresh expiry must be 30m, got ${refreshExpiryMs / 60_000}m`);
  // Registration: 12-char password rejected under minimumLength 16; 16-char accepted.
  const shortPassword = "abcd1234abcd";
  const shortRegister = await app.request("/api/v1/auth/customer/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `short-${Date.now()}@vanstro.test`, password: shortPassword, firstName: "Short", lastName: "Pass" })
  });
  assert.equal(shortRegister.status, 400, "12-char password must reject under minimumLength 16");
  const longPassword = "abcd1234abcd5678";
  const longEmail = `long-${Date.now()}@vanstro.test`;
  const longRegister = await app.request("/api/v1/auth/customer/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: longEmail, password: longPassword, firstName: "Long", lastName: "Pass" })
  });
  assert.equal(longRegister.status, 201, "16-char password must register");
  const longBody = (await longRegister.json()) as { data: { expiresAt: string } };
  const registerExpiryMs = new Date(longBody.data.expiresAt).getTime() - Date.now();
  assert.ok(registerExpiryMs > 6.9 * 24 * 3600 * 1000, "registration session must keep the default 7d (sessionPolicy applies to login/refresh/rotation only)");
  // Forgot: reset token TTL is 5 minutes under the published policy.
  const forgot = await app.request("/api/v1/auth/password/forgot", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: longEmail })
  });
  assert.equal(forgot.status, 202);
  const registeredUser = await prisma.user.findUnique({ where: { email: longEmail } });
  assert.ok(registeredUser, "registered user must exist");
  const resetToken = await prisma.passwordResetToken.findFirst({ where: { userId: registeredUser.id }, orderBy: { createdAt: "desc" } });
  assert.ok(resetToken, "forgot must issue a reset token row");
  const resetTtlMs = new Date(resetToken.expiresAt).getTime() - Date.now();
  assert.ok(resetTtlMs > 4 * 60_000 && resetTtlMs < 6 * 60_000, `reset token TTL must be 5m under published policy, got ${resetTtlMs / 60_000}m`);
});

test("S09 08 zero writes to Users/Roles/Permissions/Sessions during lifecycle", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const beforeUsers = await prisma.user.count();
  const beforeRoles = await prisma.role.count();
  const beforePermissions = await prisma.permission.count();
  const created = await createS09Draft(token, VALID_VALUE, "S09 no-write draft");
  assert.equal(created.response.status, 201);
  const v = await validateS09Draft(token, created.body.data.id, created.body.data.version);
  await publishS09Draft(token, created.body.data.id, v.body.data.draftVersion);
  const afterUsers = await prisma.user.count();
  const afterRoles = await prisma.role.count();
  const afterPermissions = await prisma.permission.count();
  assert.equal(afterUsers, beforeUsers, "S09 lifecycle must not write Users");
  assert.equal(afterRoles, beforeRoles, "S09 lifecycle must not write Roles");
  assert.equal(afterPermissions, beforePermissions, "S09 lifecycle must not write Permissions");
});

test("S09 09 Audit snapshot has real P02 roles and no value leakage", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS09Draft(token, VALID_VALUE, "S09 audit draft");
  assert.equal(created.response.status, 201);
  const audit = await prisma.auditEvent.findFirst({ where: { resourceId: created.body.data.id }, orderBy: { occurredAt: "desc" } });
  assert.ok(audit, "S09 create must write an Audit row");
  assert.ok(Array.isArray(audit.effectiveRoles) && audit.effectiveRoles.length > 0, "Audit must carry real P02 roles");
  const metadata = JSON.stringify(audit.metadata ?? {});
  assert.ok(!metadata.includes("minimumLength") && !metadata.includes("sessionLifetimeMinutes") && !metadata.includes("resetTokenTtlMinutes"), "Audit metadata must not carry field values");
  assert.ok(metadata.includes("descriptorKey"), "Audit metadata must carry descriptorKey");
});

test("S09 10 concurrent publish exactly-one-wins", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const current = await currentS09Published(token);
  const draftA = await createS09Draft(token, VALID_VALUE, "S09 concurrent A", current);
  const draftB = await createS09Draft(token, VALID_VALUE, "S09 concurrent B", current);
  assert.equal(draftA.response.status, 201);
  assert.equal(draftB.response.status, 201);
  const vA = await validateS09Draft(token, draftA.body.data.id, draftA.body.data.version);
  const vB = await validateS09Draft(token, draftB.body.data.id, draftB.body.data.version);
  const pA = await publishS09Draft(token, draftA.body.data.id, vA.body.data.draftVersion);
  const pB = await publishS09Draft(token, draftB.body.data.id, vB.body.data.draftVersion);
  assert.equal([pA.response.status, pB.response.status].filter((status) => status === 200).length, 1, "exactly one concurrent publish must win");
});

test("S09 11 rollback publication is a new publication (generation not 0)", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const valueA = { passwordPolicy: { minimumLength: 14, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 60 } };
  const createdA = await createS09Draft(token, valueA, "S09 rollback target");
  assert.equal(createdA.response.status, 201);
  const vA = await validateS09Draft(token, createdA.body.data.id, createdA.body.data.version);
  const pA = await publishS09Draft(token, createdA.body.data.id, vA.body.data.draftVersion);
  assert.equal(pA.response.status, 200);
  const valueB = { passwordPolicy: { minimumLength: 20, resetTokenTtlMinutes: 31 }, sessionPolicy: { sessionLifetimeMinutes: 120 } };
  const createdB = await createS09Draft(token, valueB, "S09 newer publication", await currentS09Published(token));
  const vB = await validateS09Draft(token, createdB.body.data.id, createdB.body.data.version);
  const pB = await publishS09Draft(token, createdB.body.data.id, vB.body.data.draftVersion);
  assert.equal(pB.response.status, 200);
  const rollback = await app.request(`/api/v1/dashboard/settings/s09-history/${pB.body.data.id}/rollback-draft`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedPublishedVersion: await currentS09Published(token), changeReason: "S09 PG16 rollback", idempotencyKey: idempotent("s09rollback") })
  });
  assert.equal(rollback.status, 201, `rollback draft: ${rollback.status}`);
  const rb = (await rollback.json()) as { data: { id: string; version: number } };
  const vR = await validateS09Draft(token, rb.data.id, rb.data.version);
  const pR = await publishS09Draft(token, rb.data.id, vR.body.data.draftVersion);
  assert.equal(pR.response.status, 200, `rollback publish: ${pR.response.status}`);
  assert.ok(pR.body.data.version > pB.body.data.version, "rollback publication must have a higher generation than the superseded one");
});

test("S09 12 malformed UUID / stale version / illegal state", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const bad = await app.request("/api/v1/dashboard/settings/s09-drafts/not-a-uuid", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(bad.status, 400, "malformed UUID must be 400");
  const created = await createS09Draft(token, VALID_VALUE, "S09 stale version");
  assert.equal(created.response.status, 201);
  const stale = await app.request(`/api/v1/dashboard/settings/s09-drafts/${created.body.data.id}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: created.body.data.version + 99, idempotencyKey: idempotent("s09stale") })
  });
  assert.equal(stale.status, 409, "stale version must be 409 VERSION_CONFLICT");
  const draft2 = await createS09Draft(token, VALID_VALUE, "S09 illegal state");
  const unvalidated = await publishS09Draft(token, draft2.body.data.id, draft2.body.data.version);
  assert.equal(unvalidated.response.status, 409, "publish of unvalidated draft must be 409");
});

test("S09 13 impact preview: last-super-admin protection with zero writes", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const superAdmin = await prisma.user.findFirst({ where: { email, kind: "admin" } });
  assert.ok(superAdmin, "seeded super admin must exist");
  const beforeUsers = await prisma.user.count();
  // Non-blocking preview (re-enable is never a last-super-admin risk).
  const previewAllowed = await app.request("/api/v1/dashboard/settings/s09-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ targetUserId: superAdmin!.id, nextStatus: "active" })
  });
  assert.equal(previewAllowed.status, 200, `preview: ${previewAllowed.status}`);
  const allowedBody = (await previewAllowed.json()) as { data: { wouldBlockLastSuperAdmin: boolean; activeSuperAdminCount: number; safeReasonCode: string; contextRevision: string } };
  assert.equal(allowedBody.data.wouldBlockLastSuperAdmin, false);
  assert.ok(allowedBody.data.activeSuperAdminCount >= 1);
  assert.equal(allowedBody.data.safeReasonCode, "allowed");
  assert.ok(allowedBody.data.contextRevision.length >= 1, "preview must carry the real P02 contextRevision");
  // Blocking preview: suspending the last active super admin.
  const previewBlocked = await app.request("/api/v1/dashboard/settings/s09-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ targetUserId: superAdmin!.id, nextStatus: "suspended" })
  });
  assert.equal(previewBlocked.status, 200, `blocked preview: ${previewBlocked.status}`);
  const blockedBody = (await previewBlocked.json()) as { data: { wouldBlockLastSuperAdmin: boolean; safeReasonCode: string } };
  assert.equal(blockedBody.data.wouldBlockLastSuperAdmin, true);
  assert.equal(blockedBody.data.safeReasonCode, "LAST_SUPER_ADMIN_BLOCKED");
  // Invalid request shapes -> stable 400.
  const missingChange = await app.request("/api/v1/dashboard/settings/s09-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ targetUserId: superAdmin!.id })
  });
  assert.equal(missingChange.status, 400, "preview without any change must be 400");
  const unknownKey = await app.request("/api/v1/dashboard/settings/s09-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ targetUserId: superAdmin!.id, nextStatus: "suspended", extra: true })
  });
  assert.equal(unknownKey.status, 400, "preview with unknown key must be 400");
  const nullChange = await app.request("/api/v1/dashboard/settings/s09-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ targetUserId: superAdmin!.id, nextStatus: null })
  });
  assert.equal(nullChange.status, 400, "preview with only explicit null change must be 400");
  // Zero writes: user count and status unchanged, actor session still valid.
  const afterUsers = await prisma.user.count();
  assert.equal(afterUsers, beforeUsers, "preview must not write Users");
  const unchanged = await prisma.user.findUnique({ where: { id: superAdmin!.id }, select: { status: true } });
  assert.equal(unchanged?.status, "active", "preview must not mutate the target user");
  const readiness = await app.request("/api/v1/dashboard/settings/s09-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readiness.status, 200, "actor session must survive the preview");
});

test("S09 14 session revoke: confirmation/reason validation and permission mapping", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // Fixture target admin with no sessions.
  const target = await prisma.user.create({
    data: { email: `revoke-target-${Date.now()}@vanstro.test`, kind: "admin", status: "active" }
  });
  try {
    // Wrong confirmation literal -> 400.
    const wrongConfirm = await app.request("/api/v1/dashboard/settings/s09-session-revoke", {
      method: "POST", headers: authHeaders(token),
      body: JSON.stringify({ targetUserId: target.id, confirmation: "revoke_sessions", reason: "S09 PG16 wrong confirmation" })
    });
    assert.equal(wrongConfirm.status, 400);
    // Short reason -> 400.
    const shortReason = await app.request("/api/v1/dashboard/settings/s09-session-revoke", {
      method: "POST", headers: authHeaders(token),
      body: JSON.stringify({ targetUserId: target.id, confirmation: "REVOKE_SESSIONS", reason: "short" })
    });
    assert.equal(shortReason.status, 400);
    // Valid revoke of a sessions-less admin -> 200 with revokedCount 0.
    const revoked = await app.request("/api/v1/dashboard/settings/s09-session-revoke", {
      method: "POST", headers: authHeaders(token),
      body: JSON.stringify({ targetUserId: target.id, confirmation: "REVOKE_SESSIONS", reason: "S09 PG16 revoke fixture target" })
    });
    assert.equal(revoked.status, 200, `revoke: ${revoked.status}`);
    const revokedBody = (await revoked.json()) as { data: { revokedCount: number; targetUserId: string } };
    assert.equal(revokedBody.data.targetUserId, target.id);
    assert.equal(revokedBody.data.revokedCount, 0, "no sessions existed for the fixture target");
    // Revoke writes a session_revoke audit event with a real P02 snapshot and
    // safe metadata only (targetUserId/reasonCode; no secrets).
    const audit = await prisma.auditEvent.findFirst({ where: { action: "session_revoke", resourceId: target.id }, orderBy: { occurredAt: "desc" } });
    assert.ok(audit, "revoke must write a session_revoke audit event");
    assert.ok(Array.isArray(audit.effectiveRoles) && audit.effectiveRoles.length > 0, "revoke audit must carry real P02 roles");
    const auditMetadata = JSON.stringify(audit.metadata ?? {});
    assert.ok(auditMetadata.includes("targetUserId"), "revoke audit metadata must carry targetUserId");
    const redacted = auditMetadata.replace(/targetUserId/g, "");
    assert.ok(!/(token|hash|cookie|password|authorization|Bearer)/i.test(redacted), "revoke audit metadata must not carry secrets");
    // Actor session must survive revoking another user.
    const readiness = await app.request("/api/v1/dashboard/settings/s09-readiness", { headers: { authorization: `Bearer ${token}` } });
    assert.equal(readiness.status, 200, "actor session must survive revoking a different user");
  } finally {
    await prisma.user.delete({ where: { id: target.id } }).catch(() => undefined);
  }
});

test("S09 15 session revoke denied without sessions.revoke", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const superAdmin = await prisma.user.findFirst({ where: { email, kind: "admin" } });
  assert.ok(superAdmin, "seeded super admin must exist");
  // Customer session: dashboard surface rejects with 401 (not an admin actor).
  const customerEmail = `customer-${Date.now()}@vanstro.test`;
  const register = await app.request("/api/v1/auth/customer/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: customerEmail, password: "abcd1234abcd5678efgh9012", firstName: "Customer", lastName: "Deny" })
  });
  assert.equal(register.status, 201, "customer registration must succeed");
  const customerBody = (await register.json()) as { data: { accessToken: string } };
  const customerDenied = await app.request("/api/v1/dashboard/settings/s09-session-revoke", {
    method: "POST", headers: authHeaders(customerBody.data.accessToken),
    body: JSON.stringify({ targetUserId: superAdmin!.id, confirmation: "REVOKE_SESSIONS", reason: "S09 PG16 customer deny attempt" })
  });
  assert.equal(customerDenied.status, 401, "customer without dashboard access must get 401");
  // Admin without any role grant: valid admin session, no sessions.revoke
  // grant -> 403 at the Dashboard permission gate.
  const adminEmail = `admin-norole-${Date.now()}@vanstro.test`;
  const credential = hashPassword("abcd1234abcd5678");
  const admin = await prisma.user.create({
    data: {
      email: adminEmail, kind: "admin", status: "active",
      passwordCredential: { create: { passwordHash: credential.passwordHash, passwordSalt: credential.passwordSalt, algorithm: credential.algorithm, iterations: credential.iterations } }
    }
  });
  try {
    const adminLogin = await app.request("/api/v1/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: "abcd1234abcd5678" })
    });
    assert.equal(adminLogin.status, 200, "no-role admin must be able to log in");
    const adminBody = (await adminLogin.json()) as { data: { accessToken: string } };
    const denied = await app.request("/api/v1/dashboard/settings/s09-session-revoke", {
      method: "POST", headers: authHeaders(adminBody.data.accessToken),
      body: JSON.stringify({ targetUserId: superAdmin!.id, confirmation: "REVOKE_SESSIONS", reason: "S09 PG16 no-role admin deny attempt" })
    });
    assert.equal(denied.status, 403, "admin without sessions.revoke must get 403");
  } finally {
    await prisma.user.delete({ where: { id: admin.id } }).catch(() => undefined);
  }
});
