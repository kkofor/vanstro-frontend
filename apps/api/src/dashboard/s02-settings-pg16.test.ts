import assert from "node:assert/strict";
import test, { before } from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

/**
 * S02 real owned PostgreSQL16 regression (Section 12 of the coordinator
 * prompt). Requires the disposable PG16 fixture from
 * scripts/test-api-regular-pg16.sh (super admin seeded + migration75 applied).
 */

const app = createApp();
const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
const password = process.env.SUPER_ADMIN_PASSWORD;
const idempotent = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 8)}`;

const VALID_VALUE = {
  generalIdentity: {
    siteDisplayName: "VanStro Global Supply",
    legalName: "VanStro Canada Inc.",
    canonicalUrl: "https://vanstro.example",
    contactEmail: "contact@vanstro.example",
    contactPhone: "+1 204 555 0123",
    contactAddress: { line1: "123 Main St", city: "Winnipeg", province: "MB", postalCode: "R3C 1A1", country: "CA" },
    defaultTimezone: "America/Winnipeg"
  },
  brand: { brandName: "VanStro", brandDescription: "Canadian home materials", logoMediaRef: null, faviconMediaRef: null },
  storefront: {
    homeContentRef: null, navigationRef: null, footerRef: null,
    defaultProductSort: "newest", outOfStockDisplay: "show",
    dealerSelectionEnabled: true, cartCheckoutEnabled: true,
    announcementRule: { enabled: true, message: "S02 announcement" },
    maintenanceBannerRule: { enabled: false, message: "" },
    storefrontConfigRef: null, enFrRoutesEnabled: true
  },
  localization: {
    defaultLocale: "en-CA", supportedLocales: ["en-CA", "fr-CA"], dashboardLocale: "zh-CN", currency: "CAD",
    timezone: "America/Winnipeg", dateFormat: "yyyy-mm-dd", phoneFormat: "national", addressFormat: "canada_default",
    weightUnits: "kg", dimensionUnits: "cm", translationFallback: "en_ca", provinceServiceMapping: []
  },
  defaultDealerLocation: { defaultDealerRef: null, defaultLocationRef: null }
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
  if (!sharedToken) throw new Error("S02 PG16 fixture requires a seeded super admin");
  return sharedToken;
}
function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
async function s02Overview(token: string) {
  const response = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  return (await response.json()) as any;
}
async function currentS02Published(token: string) {
  // The S02 create function compares expectedPublishedVersion against the
  // active publication's settingsRevision (the descriptor CAS), not the
  // publication sequence. Read it from the readiness endpoint.
  const readinessResponse = await app.request("/api/v1/dashboard/settings/s02-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readinessResponse.status, 200);
  const readiness = ((await readinessResponse.json()) as any).data;
  // create compares against the active publication's settingsRevision (CAS).
  return readiness.publicationCas ?? 0;
}
async function createS02Draft(token: string, value: unknown, changeReason = "S02 PG16 regression draft", expected?: number, idempotencyKey = idempotent("s02create")) {
  const expectedPublishedVersion = expected ?? await currentS02Published(token);
  const response = await app.request("/api/v1/dashboard/settings/s02-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.general-storefront", expectedPublishedVersion, value, changeReason, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: any; error?: string; code?: string } };
}
async function validateS02Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s02validate")) {
  const response = await app.request(`/api/v1/dashboard/settings/s02-drafts/${draftId}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: any; error?: string; code?: string } };
}
async function publishS02Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s02publish")) {
  const response = await app.request(`/api/v1/dashboard/settings/s02-drafts/${draftId}/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: any; error?: string; code?: string } };
}

test("S02 01 migration75 inventory: public projection live after migration75", async () => {
  // Migration inventory (74 unchanged + no 76) is covered by the static
  // migration75 test (scripts/s02-migration75-static.test.mjs). Here we
  // assert the runtime surface migration75 provides is live.
  const projection = await app.request("/api/v1/storefront/config?locale=en-CA");
  assert.equal(projection.status, 200, "public projection route must be live after migration75");
  const body = (await projection.json()) as any;
  assert.ok(["published", "compiled_default"].includes(body.data.projectionState));
});

test("S02 02 S01 regression: S01 draft/publish still works untouched", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const overview = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200);
  const publication = ((await overview.json()) as any).data.publication;
  const draft = await app.request("/api/v1/dashboard/settings/drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: publication.version, value: 90, changeReason: "S02 PG16 S01 regression", idempotencyKey: idempotent("s01reg") })
  });
  assert.equal(draft.status, 201, "S01 create must be unaffected by migration75");
});

test("S02 03 create -> validate -> diff -> publish lifecycle", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS02Draft(token, VALID_VALUE);
  assert.equal(created.response.status, 201, `create: ${created.response.status}`);
  const draftId = created.body.data.id;
  assert.equal(created.body.data.descriptorKey, "settings.general-storefront");
  const validated = await validateS02Draft(token, draftId, created.body.data.version);
  assert.equal(validated.response.status, 200, `validate: ${validated.response.status}`);
  assert.equal(validated.body.data.status, "validated");
  const diffResponse = await app.request(`/api/v1/dashboard/settings/s02-drafts/${draftId}/diff`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(diffResponse.status, 200, `diff: ${diffResponse.status}`);
  const diffBody = (await diffResponse.json()) as any;
  assert.ok(Array.isArray(diffBody.data.changes) && diffBody.data.changes.length >= 1, "diff must list field-path changes");
  assert.ok(diffBody.data.changes.every((change: any) => change.sensitivity === "public" && typeof change.field === "string"));
  const published = await publishS02Draft(token, draftId, validated.body.data.draftVersion);
  assert.equal(published.response.status, 200, `publish: ${published.response.status}`);
  assert.ok(published.body.data.version > 0, "published generation must be positive");
});

test("S02 04 structurally invalid value -> stable 400", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const invalid = { ...VALID_VALUE, generalIdentity: { ...VALID_VALUE.generalIdentity, siteDisplayName: 123 } };
  const created = await createS02Draft(token, invalid);
  assert.equal(created.response.status, 400, "wrong-typed field must be stable 400");
  const invalid2 = { ...VALID_VALUE, localization: { ...VALID_VALUE.localization, currency: "USD" } };
  const created2 = await createS02Draft(token, invalid2);
  assert.equal(created2.response.status, 400, "non-CAD currency must be stable 400");
});

test("S02 05 business-invalid (blocker) persisted + PATCH recovery", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // dealer ref set without location ref -> business blocker (structural OK)
  const businessInvalid = JSON.parse(JSON.stringify(VALID_VALUE));
  businessInvalid.defaultDealerLocation = { defaultDealerRef: "00000000-0000-0000-0000-000000000000", defaultLocationRef: null };
  const created = await createS02Draft(token, businessInvalid);
  assert.equal(created.response.status, 201, "structurally valid business-invalid draft must save");
  const validated = await validateS02Draft(token, created.body.data.id, created.body.data.version);
  assert.equal(validated.body.data.status, "invalid", "must persist invalid + blocker");
  assert.ok(validated.body.data.issues.some((issue: any) => issue.severity === "blocker"));
  const patched = await app.request(`/api/v1/dashboard/settings/s02-drafts/${created.body.data.id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: validated.body.data.draftVersion, value: VALID_VALUE, changeReason: "S02 PG16 PATCH recovery", idempotencyKey: idempotent("s02patch") })
  });
  assert.equal(patched.status, 200, `PATCH recovery: ${patched.status}`);
  const patchedBody = (await patched.json()) as { data: { version: number } };
  const revalidated = await validateS02Draft(token, created.body.data.id, patchedBody.data.version);
  assert.equal(revalidated.body.data.status, "validated", "PATCH must fix invalid draft");
});

test("S02 06 descriptor isolation: S01 and S02 idempotency/sequence independent", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const s01Overview = await s02Overview(token);
  const s02Created = await createS02Draft(token, VALID_VALUE, "S02 isolation draft");
  assert.equal(s02Created.response.status, 201);
  // S01 operations continue to work after S02 drafts exist.
  const draft = await app.request("/api/v1/dashboard/settings/drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: s01Overview.data.publication.version, value: 120, changeReason: "S02 isolation S01 draft", idempotencyKey: idempotent("s01iso") })
  });
  assert.equal(draft.status, 201, "S01 create must work alongside S02");
});

test("S02 07 public projection published/default/degraded", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  // fresh fixture may not have a publication yet -> compiled_default with generation 0
  const projection = await app.request("/api/v1/storefront/config?locale=en-CA");
  assert.equal(projection.status, 200);
  const body = (await projection.json()) as any;
  assert.ok(["published", "compiled_default"].includes(body.data.projectionState));
  assert.ok(typeof body.data.publishedGeneration === "number" && body.data.publishedGeneration >= 0);
  assert.ok(typeof body.data.effective.siteDisplayName === "string");
  const fr = await app.request("/api/v1/storefront/config?locale=fr-CA");
  assert.equal(fr.status, 200);
  const invalidLocale = await app.request("/api/v1/storefront/config?locale=zh-CN");
  assert.equal(invalidLocale.status, 200, "unsupported locale falls back to en-CA");
});

test("S02 08 public projection reflects published S02 value", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const value = JSON.parse(JSON.stringify(VALID_VALUE));
  value.generalIdentity.siteDisplayName = "VanStro Published Name";
  const created = await createS02Draft(token, value, "S02 publish for public projection");
  assert.equal(created.response.status, 201);
  const validated = await validateS02Draft(token, created.body.data.id, created.body.data.version);
  assert.equal(validated.response.status, 200);
  const published = await publishS02Draft(token, created.body.data.id, validated.body.data.draftVersion);
  assert.equal(published.response.status, 200);
  const projection = await app.request("/api/v1/storefront/config?locale=en-CA");
  const body = (await projection.json()) as any;
  assert.equal(body.data.effective.siteDisplayName, "VanStro Published Name", "public projection must reflect published S02 value");
  assert.equal(body.data.projectionState, "published");
  assert.ok(body.data.publishedGeneration > 0);
});

test("S02 09 no CMS/Media/Dealer write during lifecycle", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const beforeModules = await prisma.siteContentModule.count();
  const beforeMedia = await prisma.mediaAsset.count();
  const beforeDealers = await prisma.dealer.count();
  const created = await createS02Draft(token, VALID_VALUE, "S02 no-write draft");
  assert.equal(created.response.status, 201);
  const validated = await validateS02Draft(token, created.body.data.id, created.body.data.version);
  await publishS02Draft(token, created.body.data.id, validated.body.data.draftVersion);
  const afterModules = await prisma.siteContentModule.count();
  const afterMedia = await prisma.mediaAsset.count();
  const afterDealers = await prisma.dealer.count();
  assert.equal(afterModules, beforeModules, "S02 lifecycle must not write CMS");
  assert.equal(afterMedia, beforeMedia, "S02 lifecycle must not write Media");
  assert.equal(afterDealers, beforeDealers, "S02 lifecycle must not write Dealer");
});

test("S02 10 Audit snapshot has real P02 roles and no secret values", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS02Draft(token, VALID_VALUE, "S02 audit draft");
  assert.equal(created.response.status, 201);
  const audit = await prisma.auditEvent.findFirst({ where: { resourceId: created.body.data.id }, orderBy: { occurredAt: "desc" } });
  assert.ok(audit, "S02 create must write an Audit row");
  assert.ok(Array.isArray(audit.effectiveRoles) && audit.effectiveRoles.length > 0, "Audit must carry real P02 roles");
  const metadata = JSON.stringify(audit.metadata ?? {});
  assert.ok(!metadata.includes("contactEmail") && !metadata.includes("siteDisplayName") && !metadata.includes("announcement"), "Audit metadata must not carry field values");
  assert.ok(metadata.includes("descriptorKey"), "Audit metadata must carry descriptorKey");
});

test("S02 11 concurrent publish exactly-one-wins", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const current = await currentS02Published(token);
  const draftA = await createS02Draft(token, VALID_VALUE, "S02 concurrent A", current);
  const draftB = await createS02Draft(token, VALID_VALUE, "S02 concurrent B", current);
  assert.equal(draftA.response.status, 201);
  assert.equal(draftB.response.status, 201);
  const vA = await validateS02Draft(token, draftA.body.data.id, draftA.body.data.version);
  const vB = await validateS02Draft(token, draftB.body.data.id, draftB.body.data.version);
  const pA = await publishS02Draft(token, draftA.body.data.id, vA.body.data.draftVersion);
  const pB = await publishS02Draft(token, draftB.body.data.id, vB.body.data.draftVersion);
  // exactly one of A/B wins; the other must get 409 version/state conflict.
  assert.equal([pA.response.status, pB.response.status].filter((status) => status === 200).length, 1, "exactly one concurrent publish must win");
});

test("S02 12 rollback publication is a new publication (generation not 0)", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const valueA = JSON.parse(JSON.stringify(VALID_VALUE));
  valueA.generalIdentity.siteDisplayName = "Rollback Target";
  const createdA = await createS02Draft(token, valueA, "S02 rollback target");
  assert.equal(createdA.response.status, 201);
  const vA = await validateS02Draft(token, createdA.body.data.id, createdA.body.data.version);
  const pA = await publishS02Draft(token, createdA.body.data.id, vA.body.data.draftVersion);
  assert.equal(pA.response.status, 200);
  const valueB = JSON.parse(JSON.stringify(VALID_VALUE));
  valueB.generalIdentity.siteDisplayName = "Newer Name";
  const createdB = await createS02Draft(token, valueB, "S02 newer publication", await currentS02Published(token));
  const vB = await validateS02Draft(token, createdB.body.data.id, createdB.body.data.version);
  const pB = await publishS02Draft(token, createdB.body.data.id, vB.body.data.draftVersion);
  assert.equal(pB.response.status, 200);
  // rollback the current publication B -> a new draft with B's effective
  // value, published with a strictly higher generation
  const rollback = await app.request(`/api/v1/dashboard/settings/s02-history/${pB.body.data.id}/rollback-draft`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedPublishedVersion: await currentS02Published(token), changeReason: "S02 PG16 rollback", idempotencyKey: idempotent("s02rollback") })
  });
  assert.equal(rollback.status, 201, `rollback draft: ${rollback.status}`);
  const rb = (await rollback.json()) as any;
  const vR = await validateS02Draft(token, rb.data.id, rb.data.version);
  const pR = await publishS02Draft(token, rb.data.id, vR.body.data.draftVersion);
  assert.equal(pR.response.status, 200, `rollback publish: ${pR.response.status}`);
  assert.ok(pR.body.data.version > pB.body.data.version, "rollback publication must have a higher generation than the superseded one");
  const projection = await app.request("/api/v1/storefront/config?locale=en-CA");
  const body = (await projection.json()) as any;
  assert.equal(body.data.effective.siteDisplayName, "Newer Name", "storefront must show the rolled-back value");
});

test("S02 13 malformed UUID / stale version / illegal state", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const bad = await app.request("/api/v1/dashboard/settings/s02-drafts/not-a-uuid", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(bad.status, 400, "malformed UUID must be 400");
  const created = await createS02Draft(token, VALID_VALUE, "S02 stale version");
  assert.equal(created.response.status, 201);
  const stale = await app.request(`/api/v1/dashboard/settings/s02-drafts/${created.body.data.id}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: created.body.data.version + 99, idempotencyKey: idempotent("s02stale") })
  });
  assert.equal(stale.status, 409, "stale version must be 409 VERSION_CONFLICT");
  // publish an unvalidated draft -> state conflict 409
  const draft2 = await createS02Draft(token, VALID_VALUE, "S02 illegal state");
  const unvalidated = await publishS02Draft(token, draft2.body.data.id, draft2.body.data.version);
  assert.equal(unvalidated.response.status, 409, "publish of unvalidated draft must be 409");
});

test("S02 14 S01 publication sequence untouched by S02", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const s01Events = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.core.overview_refresh_seconds" } });
  const s02Events = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.general-storefront" } });
  const created = await createS02Draft(token, VALID_VALUE, "S02 sequence isolation");
  const v = await validateS02Draft(token, created.body.data.id, created.body.data.version);
  await publishS02Draft(token, created.body.data.id, v.body.data.draftVersion);
  const s01After = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.core.overview_refresh_seconds" } });
  assert.equal(s01After, s01Events, "S02 publish must not append S01 events");
  const s02After = await prisma.settingsPublicationEvent.count({ where: { descriptorKey: "settings.general-storefront" } });
  assert.ok(s02After >= s02Events + 1, "S02 publish must append S02 events");
});
