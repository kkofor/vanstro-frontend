import assert from "node:assert/strict";
import test, { before } from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

/**
 * S03 real owned PostgreSQL16 regression (task Section 13 + S03 contract
 * Section 10). Requires the disposable PG16 fixture from
 * scripts/test-api-regular-pg16.sh (super admin seeded + migration78 applied).
 * Covers lifecycle, sandbox quote zero side effects, consumer projection and
 * S01/S02/S09/S10 regression.
 */

const app = createApp();
const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
const password = process.env.SUPER_ADMIN_PASSWORD;
const idempotent = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 8)}`;

const VALID_VALUE = {
  commercePolicy: { minimumOrderAmountCents: 0, guestCheckoutEnabled: true, checkoutEnabled: true },
  taxPolicy: { enabledProvinceCodes: ["MB", "ON"], calculationMode: "current-tax-rate-table", roundingMode: "nearest-cent" },
  shippingPolicy: { pickupEnabled: true, deliveryEnabled: true, deliveryFlatFeeCents: 1500, serviceZoneMode: "dealer-location-only", fallbackMode: "reject" },
  inventoryPolicy: { reservationEnabled: true, reservationTtlMinutes: 30, availabilityMode: "manual", staleAfterSeconds: 300, staleBehavior: "degraded-reject" },
  orderPolicy: { allowedLifecycleTransitions: { paid: ["processing", "fulfilled", "cancelled"], processing: ["fulfilled", "cancelled"], fulfilled: [], cancelled: [] }, guestLookupEnabled: true, cancellationMode: "erp-confirmed-only" }
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
  if (!sharedToken) throw new Error("S03 PG16 fixture requires a seeded super admin");
  return sharedToken;
}
function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
async function currentS03Published(token: string) {
  const readinessResponse = await app.request("/api/v1/dashboard/settings/s03-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readinessResponse.status, 200);
  const readiness = ((await readinessResponse.json()) as { data: { publicationCas: number | null } }).data;
  return readiness.publicationCas ?? 0;
}
async function createS03Draft(token: string, value: unknown, changeReason = "S03 PG16 regression draft", expected?: number, idempotencyKey = idempotent("s03create")) {
  const expectedPublishedVersion = expected ?? await currentS03Published(token);
  const response = await app.request("/api/v1/dashboard/settings/s03-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.commerce", expectedPublishedVersion, value, changeReason, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: Record<string, unknown>; error?: string; code?: string } };
}
async function validateS03Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s03validate")) {
  const response = await app.request(`/api/v1/dashboard/settings/s03-drafts/${draftId}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: Record<string, unknown>; error?: string; code?: string } };
}
async function publishS03Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s03publish")) {
  const response = await app.request(`/api/v1/dashboard/settings/s03-drafts/${draftId}/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: Record<string, unknown>; error?: string; code?: string } };
}
async function counters() {
  return {
    orders: await prisma.order.count(),
    payments: await prisma.paymentSession.count(),
    reservations: await prisma.inventoryReservation.count(),
    erpJobs: await prisma.erpSyncJob.count(),
    emailOutbox: await prisma.emailOutbox.count()
  };
}

test("S03 01 migration78 inventory: descriptor live with compiled defaults", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const overview = await app.request("/api/v1/dashboard/settings/s03-overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200);
  const data = ((await overview.json()) as { data: { descriptorKey: string; schemaVersion: string; projectionState: string; effective: { commercePolicy: { checkoutEnabled: boolean } } } }).data;
  assert.equal(data.descriptorKey, "settings.commerce");
  assert.equal(data.schemaVersion, "settings.commerce.v1");
  assert.equal(data.projectionState, "compiled_default");
  assert.equal(data.effective.commercePolicy.checkoutEnabled, true);
});

test("S03 02 create -> validate -> diff -> publish lifecycle", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS03Draft(token, VALID_VALUE);
  assert.equal(created.response.status, 201, `create: ${created.response.status}`);
  const draftId = created.body.data!.id as string;
  assert.equal(created.body.data!.descriptorKey, "settings.commerce");
  const validated = await validateS03Draft(token, draftId, created.body.data!.version as number);
  assert.equal(validated.response.status, 200, `validate: ${validated.response.status}`);
  assert.equal(validated.body.data!.status, "validated");
  const diffResponse = await app.request(`/api/v1/dashboard/settings/s03-drafts/${draftId}/diff`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(diffResponse.status, 200, `diff: ${diffResponse.status}`);
  const diffBody = (await diffResponse.json()) as { data: { changes: Array<{ field: string; sensitivity: string }>; secretChangeCount: number } };
  assert.ok(diffBody.data.changes.length >= 1, "diff must list family changes");
  assert.equal(diffBody.data.secretChangeCount, 0);
  const published = await publishS03Draft(token, draftId, validated.body.data!.draftVersion as number);
  assert.equal(published.response.status, 200, `publish: ${published.response.status}`);
  assert.ok((published.body.data!.version as number) > 0, "published generation must be positive");
});

test("S03 03 structurally invalid value -> stable 400", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const unknownKey = { ...VALID_VALUE, cookieSecret: "x" };
  const created = await createS03Draft(token, unknownKey);
  assert.equal(created.response.status, 400, "unknown key must reject");
  const badMin = JSON.parse(JSON.stringify(VALID_VALUE));
  badMin.commercePolicy.minimumOrderAmountCents = -1;
  const created2 = await createS03Draft(token, badMin);
  assert.equal(created2.response.status, 400, "negative minimum must reject");
  const badMode = JSON.parse(JSON.stringify(VALID_VALUE));
  badMode.taxPolicy.calculationMode = "automatic";
  const created3 = await createS03Draft(token, badMode);
  assert.equal(created3.response.status, 400, "unknown tax mode must reject");
  const dupProvince = JSON.parse(JSON.stringify(VALID_VALUE));
  dupProvince.taxPolicy.enabledProvinceCodes = ["MB", "MB"];
  const created4 = await createS03Draft(token, dupProvince);
  assert.equal(created4.response.status, 400, "duplicate province must reject");
});

test("S03 04 business blockers: illegal transition and ERP ownership conflict persist invalid", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // Terminal-state source with any target is structurally legal but
  // business-invalid (S03_TERMINAL_TRANSITION blocker).
  const illegalTransition = JSON.parse(JSON.stringify(VALID_VALUE));
  illegalTransition.orderPolicy.allowedLifecycleTransitions = { paid: ["processing"], processing: [], fulfilled: ["paid"], cancelled: [] };
  const created = await createS03Draft(token, illegalTransition, "S03 illegal transition exercise");
  assert.equal(created.response.status, 201, "structurally valid business-invalid draft must save");
  const validated = await validateS03Draft(token, created.body.data!.id as string, created.body.data!.version as number);
  assert.equal(validated.body.data!.status, "invalid");
  assert.ok((validated.body.data!.issues as Array<{ code: string; severity: string }>).some((issue) => issue.severity === "blocker" && issue.code === "S03_TERMINAL_TRANSITION"));
});

test("S03 05 sandbox quote is zero side effect and returns aggregate quote only", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const before = await counters();
  const candidateValue = JSON.parse(JSON.stringify(VALID_VALUE));
  candidateValue.shippingPolicy.deliveryFlatFeeCents = 2000;
  const preview = await app.request("/api/v1/dashboard/settings/s03-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ value: candidateValue })
  });
  assert.equal(preview.status, 200, `preview: ${preview.status}`);
  const previewData = ((await preview.json()) as { data: { affectedFamilies: string[]; wouldEnableAutoCleanup?: never } }).data;
  assert.ok(previewData.affectedFamilies.length >= 1);
  const after = await counters();
  assert.deepEqual(after, before, "preview must not create/modify Orders/Payments/reservations or enqueue ERP/email jobs");
});

test("S03 06 consumer projection after publish is exact-generation", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS03Draft(token, VALID_VALUE, "S03 consumer projection");
  assert.equal(created.response.status, 201);
  const validated = await validateS03Draft(token, created.body.data!.id as string, created.body.data!.version as number);
  const published = await publishS03Draft(token, created.body.data!.id as string, validated.body.data!.draftVersion as number);
  assert.equal(published.response.status, 200);
  const generation = (published.body.data!.version as number);
  const readiness = await app.request(`/api/v1/dashboard/settings/s03-readiness?consumerGeneration=${generation}`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readiness.status, 200);
  const data = ((await readiness.json()) as { data: { publishedGeneration: number; consumerGeneration: number | null; state: string; consumers: Array<{ id: string; state: string }> } }).data;
  assert.equal(data.publishedGeneration, generation);
  assert.equal(data.consumerGeneration, generation);
  const ready = data.consumers.filter((c) => c.state === "implemented_ready");
  assert.ok(ready.length >= 1, "at least one implemented_ready consumer");
});

test("S03 07 rollback creates a new draft/publication and never reverses business actions", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const valueA = JSON.parse(JSON.stringify(VALID_VALUE));
  valueA.commercePolicy.minimumOrderAmountCents = 1000;
  const createdA = await createS03Draft(token, valueA, "S03 rollback target");
  assert.equal(createdA.response.status, 201);
  const vA = await validateS03Draft(token, createdA.body.data!.id as string, createdA.body.data!.version as number);
  const pA = await publishS03Draft(token, createdA.body.data!.id as string, vA.body.data!.draftVersion as number);
  assert.equal(pA.response.status, 200);
  const valueB = JSON.parse(JSON.stringify(VALID_VALUE));
  valueB.commercePolicy.minimumOrderAmountCents = 2500;
  const createdB = await createS03Draft(token, valueB, "S03 newer publication", await currentS03Published(token));
  const vB = await validateS03Draft(token, createdB.body.data!.id as string, createdB.body.data!.version as number);
  const pB = await publishS03Draft(token, createdB.body.data!.id as string, vB.body.data!.draftVersion as number);
  assert.equal(pB.response.status, 200);
  const before = await counters();
  const rollback = await app.request(`/api/v1/dashboard/settings/s03-history/${pB.body.data!.id}/rollback-draft`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedPublishedVersion: await currentS03Published(token), changeReason: "S03 PG16 rollback", idempotencyKey: idempotent("s03rollback") })
  });
  assert.equal(rollback.status, 201, `rollback draft: ${rollback.status}`);
  const rb = (await rollback.json()) as { data: { id: string; version: number; status: string } };
  assert.equal(rb.data.status, "rollback_draft");
  const vR = await validateS03Draft(token, rb.data.id, rb.data.version);
  const pR = await publishS03Draft(token, rb.data.id, vR.body.data!.draftVersion as number);
  assert.equal(pR.response.status, 200, `rollback publish: ${pR.response.status}`);
  assert.ok((pR.body.data!.version as number) > (pB.body.data!.version as number), "rollback publication must be higher");
  const after = await counters();
  assert.deepEqual(after, before, "rollback must not create/modify Orders/Payments/reservations or enqueue jobs");
});

test("S03 08 stale version / illegal state -> stable 409", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS03Draft(token, VALID_VALUE, "S03 stale version");
  assert.equal(created.response.status, 201);
  const stale = await app.request(`/api/v1/dashboard/settings/s03-drafts/${created.body.data!.id}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: (created.body.data!.version as number) + 99, idempotencyKey: idempotent("s03stale") })
  });
  assert.equal(stale.status, 409, "stale version must be 409 VERSION_CONFLICT");
  const draft2 = await createS03Draft(token, VALID_VALUE, "S03 illegal state");
  const unvalidated = await publishS03Draft(token, draft2.body.data!.id as string, draft2.body.data!.version as number);
  assert.equal(unvalidated.response.status, 409, "publish of unvalidated draft must be 409");
});

test("S03 09 S01/S02/S09/S10 regression: their lifecycle untouched by migration78", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const overview = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200, "S01 overview must still work");
  const s02Readiness = await app.request("/api/v1/dashboard/settings/s02-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s02Readiness.status, 200, "S02 readiness must still work");
  const s09Readiness = await app.request("/api/v1/dashboard/settings/s09-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s09Readiness.status, 200, "S09 readiness must still work");
  const s10Readiness = await app.request("/api/v1/dashboard/settings/s10-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s10Readiness.status, 200, "S10 readiness must still work");
  const s10Created = await createS10DraftRegression(token);
  assert.equal(s10Created.status, 201, "S10 create must be unaffected by migration78");
});
test("S03 10 restore the compiled-default commerce policy for downstream suites", async (t) => {
  // The lifecycle tests publish a raised minimum order (1000/2500 cents).
  // This disposable database is shared with the later commerce-checkout
  // suites, which assume the compiled default (minimum 0), so restore a
  // default-valued publication before the file ends.
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS03Draft(token, VALID_VALUE, "S03 PG16 restore compiled-default policy for downstream suites");
  assert.equal(created.response.status, 201);
  const validated = await validateS03Draft(token, created.body.data!.id as string, created.body.data!.version as number);
  const published = await publishS03Draft(token, created.body.data!.id as string, validated.body.data!.draftVersion as number);
  assert.equal(published.response.status, 200);
});

async function createS10DraftRegression(token: string) {
  const readiness = await app.request("/api/v1/dashboard/settings/s10-readiness", { headers: { authorization: `Bearer ${token}` } });
  const current = ((await readiness.json()) as { data: { publicationCas: number | null } }).data.publicationCas ?? 0;
  return app.request("/api/v1/dashboard/settings/s10-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      descriptorKey: "settings.privacy-retention", expectedPublishedVersion: current,
      value: {
        consentPolicy: { anonymousConsentEnabled: true, authenticatedConsentEnabled: false, consentCategories: ["functional", "analytics", "targeting"], retentionMonths: 24 },
        retentionPolicy: { retentionByObjectFamily: [] },
        legalHoldPolicy: { legalHoldEnabled: false, legalHoldRefs: [] },
        dsarPolicy: { accessExportDeleteRules: [] },
        piiDisplayPolicy: { piiDisplayRules: [] },
        lowRiskExecution: { allowlist: [], impactPreviewEnabled: true }
      },
      changeReason: "S03 PG16 S10 regression", idempotencyKey: idempotent("s10reg")
    })
  });
}
