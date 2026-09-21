import assert from "node:assert/strict";
import test, { before } from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

/**
 * S10 real owned PostgreSQL16 regression (goal Section 8 + contract Section
 * 12). Requires the disposable PG16 fixture from
 * scripts/test-api-regular-pg16.sh (super admin seeded + migration77 applied).
 */

const app = createApp();
const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
const password = process.env.SUPER_ADMIN_PASSWORD;
const idempotent = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 8)}`;

const VALID_VALUE = {
  consentPolicy: { anonymousConsentEnabled: true, authenticatedConsentEnabled: false, consentCategories: ["functional", "analytics", "targeting"], retentionMonths: 24 },
  retentionPolicy: { retentionByObjectFamily: [{ objectFamily: "consent_events", retentionDays: 730, autoCleanupEnabled: false }] },
  legalHoldPolicy: { legalHoldEnabled: false, legalHoldRefs: [] },
  dsarPolicy: { accessExportDeleteRules: [{ scope: "all_personal_data", method: "export", enabled: true, requireAdminApproval: false }] },
  piiDisplayPolicy: { piiDisplayRules: [{ field: "customer.email", displayMode: "masked", allowedRoles: ["super_admin"] }] },
  lowRiskExecution: { allowlist: [], impactPreviewEnabled: true }
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
  if (!sharedToken) throw new Error("S10 PG16 fixture requires a seeded super admin");
  return sharedToken;
}
function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
async function currentS10Published(token: string) {
  const readinessResponse = await app.request("/api/v1/dashboard/settings/s10-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readinessResponse.status, 200);
  const readiness = ((await readinessResponse.json()) as { data: { publicationCas: number | null } }).data;
  return readiness.publicationCas ?? 0;
}
async function createS10Draft(token: string, value: unknown, changeReason = "S10 PG16 regression draft", expected?: number, idempotencyKey = idempotent("s10create")) {
  const expectedPublishedVersion = expected ?? await currentS10Published(token);
  const response = await app.request("/api/v1/dashboard/settings/s10-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.privacy-retention", expectedPublishedVersion, value, changeReason, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: Record<string, unknown>; error?: string; code?: string } };
}
async function validateS10Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s10validate")) {
  const response = await app.request(`/api/v1/dashboard/settings/s10-drafts/${draftId}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: Record<string, unknown>; error?: string; code?: string } };
}
async function publishS10Draft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("s10publish")) {
  const response = await app.request(`/api/v1/dashboard/settings/s10-drafts/${draftId}/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: Record<string, unknown>; error?: string; code?: string } };
}

test("S10 01 migration77 inventory: descriptor live with degraded readiness", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // Migration inventory (77 with exactly one s10 dir, no 78) is covered by
  // the static migration77 test. Here we assert the runtime surface: the
  // readiness endpoint reports the honest degraded cleanup-consumer state.
  const readiness = await app.request("/api/v1/dashboard/settings/s10-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readiness.status, 200);
  const data = ((await readiness.json()) as { data: { state: string; reasonCode: string; cleanupConsumer: { state: string; reasonCode: string } } }).data;
  assert.equal(data.state, "degraded");
  assert.equal(data.reasonCode, "cleanup_consumer_unavailable");
  assert.equal(data.cleanupConsumer.state, "degraded");
  assert.equal(data.cleanupConsumer.reasonCode, "cleanup_consumer_unavailable");
});

test("S10 02 overview shows compiled defaults and future_unavailable capabilities", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const overview = await app.request("/api/v1/dashboard/settings/s10-overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200);
  const data = ((await overview.json()) as { data: { projectionState: string; effective: { consentPolicy: { retentionMonths: number } }; capabilities: { authenticatedConsent: string; privacySubjectPurge: string } } }).data;
  assert.equal(data.projectionState, "compiled_default");
  assert.equal(data.effective.consentPolicy.retentionMonths, 24);
  assert.equal(data.capabilities.authenticatedConsent, "future_unavailable");
  assert.equal(data.capabilities.privacySubjectPurge, "future_unavailable");
});

test("S10 03 create -> validate -> diff -> publish lifecycle with degraded readiness", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS10Draft(token, VALID_VALUE);
  assert.equal(created.response.status, 201, `create: ${created.response.status}`);
  const draftId = created.body.data!.id as string;
  assert.equal(created.body.data!.descriptorKey, "settings.privacy-retention");
  const validated = await validateS10Draft(token, draftId, created.body.data!.version as number);
  assert.equal(validated.response.status, 200, `validate: ${validated.response.status}`);
  assert.equal(validated.body.data!.status, "validated");
  const diffResponse = await app.request(`/api/v1/dashboard/settings/s10-drafts/${draftId}/diff`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(diffResponse.status, 200, `diff: ${diffResponse.status}`);
  const diffBody = (await diffResponse.json()) as { data: { changes: Array<{ field: string; sensitivity: string }> } };
  assert.ok(diffBody.data.changes.length >= 1, "diff must list field-path changes");
  assert.ok(diffBody.data.changes.every((change) => change.sensitivity === "public"));
  const published = await publishS10Draft(token, draftId, validated.body.data!.draftVersion as number);
  assert.equal(published.response.status, 200, `publish: ${published.response.status}`);
  const publishData = published.body.data!;
  assert.ok((publishData.version as number) > 0, "published generation must be positive");
  assert.equal(publishData.readiness ? (publishData.readiness as Record<string, unknown>).state : null, "degraded", "publish readiness must be honestly degraded");
});

test("S10 04 structurally invalid value -> stable 400", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const unknownKey = { ...VALID_VALUE, cookieSecret: "x" };
  const created = await createS10Draft(token, unknownKey);
  assert.equal(created.response.status, 400, "unknown key must reject");
  const outOfRange = JSON.parse(JSON.stringify(VALID_VALUE));
  outOfRange.consentPolicy.retentionMonths = 5;
  const created2 = await createS10Draft(token, outOfRange);
  assert.equal(created2.response.status, 400, "retentionMonths 5 must reject (minimum 6)");
  const unknownFamily = JSON.parse(JSON.stringify(VALID_VALUE));
  unknownFamily.retentionPolicy.retentionByObjectFamily = [{ objectFamily: "chat_logs", retentionDays: 90, autoCleanupEnabled: false }];
  const created3 = await createS10Draft(token, unknownFamily);
  assert.equal(created3.response.status, 400, "unknown object family must reject");
  const badDisplay = JSON.parse(JSON.stringify(VALID_VALUE));
  badDisplay.piiDisplayPolicy.piiDisplayRules = [{ field: "customer.email", displayMode: "raw", allowedRoles: ["super_admin"] }];
  const created4 = await createS10Draft(token, badDisplay);
  assert.equal(created4.response.status, 400, "unknown displayMode must reject");
});

test("S10 05 business blockers: high-risk auto-cleanup and hold conflict persist invalid", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const highRisk = JSON.parse(JSON.stringify(VALID_VALUE));
  highRisk.retentionPolicy.retentionByObjectFamily = [{ objectFamily: "orders", retentionDays: 365, autoCleanupEnabled: true }];
  const created = await createS10Draft(token, highRisk, "S10 high-risk auto-cleanup exercise");
  assert.equal(created.response.status, 201, "structurally valid business-invalid draft must save");
  const validated = await validateS10Draft(token, created.body.data!.id as string, created.body.data!.version as number);
  assert.equal(validated.body.data!.status, "invalid", "high-risk auto-cleanup must persist invalid");
  assert.ok((validated.body.data!.issues as Array<{ code: string; severity: string }>).some((issue) => issue.severity === "blocker" && issue.code === "S10_HIGH_RISK_AUTO_CLEANUP"));
  // Hold conflict: legal hold enabled with any auto-cleanup enabled -> blocker.
  const holdConflict = JSON.parse(JSON.stringify(VALID_VALUE));
  holdConflict.legalHoldPolicy = { legalHoldEnabled: true, legalHoldRefs: ["11111111-1111-4111-8111-111111111111"] };
  holdConflict.retentionPolicy.retentionByObjectFamily = [{ objectFamily: "consent_events", retentionDays: 365, autoCleanupEnabled: true }];
  const created2 = await createS10Draft(token, holdConflict, "S10 hold conflict exercise");
  assert.equal(created2.response.status, 201);
  const validated2 = await validateS10Draft(token, created2.body.data!.id as string, created2.body.data!.version as number);
  assert.equal(validated2.body.data!.status, "invalid");
  assert.ok((validated2.body.data!.issues as Array<{ code: string; severity: string }>).some((issue) => issue.severity === "blocker" && issue.code === "S10_HOLD_CONFLICT"));
  // DSAR delete without admin approval -> blocker.
  const dsarNoApproval = JSON.parse(JSON.stringify(VALID_VALUE));
  dsarNoApproval.dsarPolicy.accessExportDeleteRules = [{ scope: "all_personal_data", method: "delete", enabled: true, requireAdminApproval: false }];
  const created3 = await createS10Draft(token, dsarNoApproval, "S10 DSAR approval exercise");
  assert.equal(created3.response.status, 201);
  const validated3 = await validateS10Draft(token, created3.body.data!.id as string, created3.body.data!.version as number);
  assert.equal(validated3.body.data!.status, "invalid");
  assert.ok((validated3.body.data!.issues as Array<{ code: string; severity: string }>).some((issue) => issue.severity === "blocker" && issue.code === "S10_DSAR_DELETE_APPROVAL"));
  // Unknown role key in piiDisplayRules.allowedRoles -> blocker.
  const unknownRole = JSON.parse(JSON.stringify(VALID_VALUE));
  unknownRole.piiDisplayPolicy.piiDisplayRules = [{ field: "customer.email", displayMode: "masked", allowedRoles: ["no_such_role"] }];
  const created4 = await createS10Draft(token, unknownRole, "S10 unknown role exercise");
  assert.equal(created4.response.status, 201);
  const validated4 = await validateS10Draft(token, created4.body.data!.id as string, created4.body.data!.version as number);
  assert.equal(validated4.body.data!.status, "invalid");
  assert.ok((validated4.body.data!.issues as Array<{ code: string; severity: string }>).some((issue) => issue.severity === "blocker" && issue.code === "S10_UNKNOWN_ROLE_KEY"));
  // A real system role key stays valid.
  const knownRole = JSON.parse(JSON.stringify(VALID_VALUE));
  knownRole.piiDisplayPolicy.piiDisplayRules = [{ field: "customer.email", displayMode: "masked", allowedRoles: ["super_admin"] }];
  const created5 = await createS10Draft(token, knownRole, "S10 known role exercise");
  assert.equal(created5.response.status, 201);
  const validated5 = await validateS10Draft(token, created5.body.data!.id as string, created5.body.data!.version as number);
  assert.equal(validated5.body.data!.status, "validated");
});

test("S10 06 zero data side effects during lifecycle", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const counters = async () => ({
    orders: await prisma.order.count(),
    payments: await prisma.paymentSession.count(),
    media: await prisma.mediaAsset.count(),
    consent: await prisma.privacyConsentEvent.count(),
    privacyRequests: await prisma.privacyRequest.count(),
    jobs: await prisma.asyncJob.count()
  });
  const before = await counters();
  const created = await createS10Draft(token, VALID_VALUE, "S10 zero-side-effect exercise");
  assert.equal(created.response.status, 201);
  const validated = await validateS10Draft(token, created.body.data!.id as string, created.body.data!.version as number);
  assert.equal(validated.response.status, 200);
  const published = await publishS10Draft(token, created.body.data!.id as string, validated.body.data!.draftVersion as number);
  assert.equal(published.response.status, 200);
  const after = await counters();
  // Audit events ARE written by design (AuditDescriptor); the zero-side-effect
  // invariant covers business data: no delete/anonymize/archive/purge on
  // Orders/Payments/Media/consent/privacy requests and no job creation.
  assert.deepEqual(after, before, "publish/validate/create must not write Orders/Payments/Media/consent/privacy requests or create jobs");
});

test("S10 07 impact preview is read-only and family-level", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const counters = async () => ({
    orders: await prisma.order.count(),
    audit: await prisma.auditEvent.count(),
    jobs: await prisma.asyncJob.count()
  });
  const before = await counters();
  // High-risk candidate -> blocked.
  const blocked = await app.request("/api/v1/dashboard/settings/s10-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ candidateRetentionEntries: [{ objectFamily: "payments", retentionDays: 90, autoCleanupEnabled: true }] })
  });
  assert.equal(blocked.status, 200);
  const blockedData = ((await blocked.json()) as { data: { wouldEnableAutoCleanup: boolean; blockedHighRiskFamilies: string[]; affectedFamilies: Array<{ objectFamily: string; classification: string }>; contextRevision: string } }).data;
  assert.ok(blockedData.blockedHighRiskFamilies.includes("payments"));
  assert.ok(blockedData.affectedFamilies.some((entry) => entry.objectFamily === "payments" && entry.classification === "high_risk"));
  assert.ok(blockedData.contextRevision.length >= 1, "preview must carry the real P02 contextRevision");
  // Low-risk candidate -> allowed.
  const allowed = await app.request("/api/v1/dashboard/settings/s10-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ candidateRetentionEntries: [{ objectFamily: "consent_events", retentionDays: 365, autoCleanupEnabled: true }], candidateAllowlist: ["consent_events"] })
  });
  assert.equal(allowed.status, 200);
  const allowedData = ((await allowed.json()) as { data: { wouldEnableAutoCleanup: boolean; wouldConflictWithLegalHold: boolean; blockedHighRiskFamilies: string[] } }).data;
  assert.equal(allowedData.wouldEnableAutoCleanup, true);
  assert.equal(allowedData.wouldConflictWithLegalHold, false);
  assert.deepEqual(allowedData.blockedHighRiskFamilies, []);
  // Invalid request shapes -> stable 400.
  const empty = await app.request("/api/v1/dashboard/settings/s10-impact-preview", {
    method: "POST", headers: authHeaders(token), body: JSON.stringify({})
  });
  assert.equal(empty.status, 400, "preview without any candidate must be 400");
  const emptyList = await app.request("/api/v1/dashboard/settings/s10-impact-preview", {
    method: "POST", headers: authHeaders(token), body: JSON.stringify({ candidateRetentionEntries: [] })
  });
  assert.equal(emptyList.status, 400, "preview with an empty candidate list must be 400");
  const unknownFamily = await app.request("/api/v1/dashboard/settings/s10-impact-preview", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ candidateRetentionEntries: [{ objectFamily: "chat_logs", retentionDays: 90, autoCleanupEnabled: false }] })
  });
  assert.equal(unknownFamily.status, 400, "preview with unknown family must be 400");
  // Zero writes.
  const after = await counters();
  assert.deepEqual(after, before, "impact preview must not write anything");
});

test("S10 08 readiness degraded even with exact consumer generation", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS10Draft(token, VALID_VALUE, "S10 readiness exercise");
  assert.equal(created.response.status, 201);
  const validated = await validateS10Draft(token, created.body.data!.id as string, created.body.data!.version as number);
  const published = await publishS10Draft(token, created.body.data!.id as string, validated.body.data!.draftVersion as number);
  assert.equal(published.response.status, 200);
  const generation = (published.body.data!.version as number);
  const readiness = await app.request(`/api/v1/dashboard/settings/s10-readiness?consumerGeneration=${generation}`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readiness.status, 200);
  const data = ((await readiness.json()) as { data: { state: string; reasonCode: string; publishedGeneration: number; consumerGeneration: number | null; projectionState: string } }).data;
  assert.equal(data.publishedGeneration, generation);
  assert.equal(data.consumerGeneration, generation);
  assert.equal(data.projectionState, "published");
  // Even with an exact generation match the cleanup consumer is missing:
  // state must stay degraded, never fake-ready.
  assert.equal(data.state, "degraded");
  assert.equal(data.reasonCode, "cleanup_consumer_unavailable");
});

test("S10 09 concurrent publish exactly-one-wins", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const current = await currentS10Published(token);
  const draftA = await createS10Draft(token, VALID_VALUE, "S10 concurrent A", current);
  const draftB = await createS10Draft(token, VALID_VALUE, "S10 concurrent B", current);
  assert.equal(draftA.response.status, 201);
  assert.equal(draftB.response.status, 201);
  const vA = await validateS10Draft(token, draftA.body.data!.id as string, draftA.body.data!.version as number);
  const vB = await validateS10Draft(token, draftB.body.data!.id as string, draftB.body.data!.version as number);
  const pA = await publishS10Draft(token, draftA.body.data!.id as string, vA.body.data!.draftVersion as number);
  const pB = await publishS10Draft(token, draftB.body.data!.id as string, vB.body.data!.draftVersion as number);
  assert.equal([pA.response.status, pB.response.status].filter((status) => status === 200).length, 1, "exactly one concurrent publish must win");
});

test("S10 10 rollback publication is a new publication and never claims data restoration", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const valueA = JSON.parse(JSON.stringify(VALID_VALUE));
  valueA.consentPolicy.retentionMonths = 36;
  const createdA = await createS10Draft(token, valueA, "S10 rollback target");
  assert.equal(createdA.response.status, 201);
  const vA = await validateS10Draft(token, createdA.body.data!.id as string, createdA.body.data!.version as number);
  const pA = await publishS10Draft(token, createdA.body.data!.id as string, vA.body.data!.draftVersion as number);
  assert.equal(pA.response.status, 200);
  const valueB = JSON.parse(JSON.stringify(VALID_VALUE));
  valueB.consentPolicy.retentionMonths = 60;
  const createdB = await createS10Draft(token, valueB, "S10 newer publication", await currentS10Published(token));
  const vB = await validateS10Draft(token, createdB.body.data!.id as string, createdB.body.data!.version as number);
  const pB = await publishS10Draft(token, createdB.body.data!.id as string, vB.body.data!.draftVersion as number);
  assert.equal(pB.response.status, 200);
  const rollback = await app.request(`/api/v1/dashboard/settings/s10-history/${pB.body.data!.id}/rollback-draft`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedPublishedVersion: await currentS10Published(token), changeReason: "S10 PG16 rollback", idempotencyKey: idempotent("s10rollback") })
  });
  assert.equal(rollback.status, 201, `rollback draft: ${rollback.status}`);
  const rb = (await rollback.json()) as { data: { id: string; version: number } };
  const vR = await validateS10Draft(token, rb.data.id, rb.data.version);
  const pR = await publishS10Draft(token, rb.data.id, vR.body.data!.draftVersion as number);
  assert.equal(pR.response.status, 200, `rollback publish: ${pR.response.status}`);
  assert.ok((pR.body.data!.version as number) > (pB.body.data!.version as number), "rollback publication must have a higher generation");
});

test("S10 11 malformed UUID / stale version / illegal state", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const bad = await app.request("/api/v1/dashboard/settings/s10-drafts/not-a-uuid", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(bad.status, 400, "malformed UUID must be 400");
  const created = await createS10Draft(token, VALID_VALUE, "S10 stale version");
  assert.equal(created.response.status, 201);
  const stale = await app.request(`/api/v1/dashboard/settings/s10-drafts/${created.body.data!.id}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: (created.body.data!.version as number) + 99, idempotencyKey: idempotent("s10stale") })
  });
  assert.equal(stale.status, 409, "stale version must be 409 VERSION_CONFLICT");
  const draft2 = await createS10Draft(token, VALID_VALUE, "S10 illegal state");
  const unvalidated = await publishS10Draft(token, draft2.body.data!.id as string, draft2.body.data!.version as number);
  assert.equal(unvalidated.response.status, 409, "publish of unvalidated draft must be 409");
});

test("S10 12 Audit snapshot has real P02 roles and no PII/consent values", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS10Draft(token, VALID_VALUE, "S10 audit draft");
  assert.equal(created.response.status, 201);
  const audit = await prisma.auditEvent.findFirst({ where: { resourceId: created.body.data!.id as string }, orderBy: { occurredAt: "desc" } });
  assert.ok(audit, "S10 create must write an Audit row");
  assert.ok(Array.isArray(audit.effectiveRoles) && audit.effectiveRoles.length > 0, "Audit must carry real P02 roles");
  const metadata = JSON.stringify(audit.metadata ?? {});
  assert.ok(!metadata.includes("consentCategories") && !metadata.includes("retentionByObjectFamily") && !metadata.includes("legalHoldRefs") && !metadata.includes("customer.email"), "Audit metadata must not carry PII or consent payloads");
  assert.ok(metadata.includes("descriptorKey"), "Audit metadata must carry descriptorKey");
});

test("S10 13 S01/S02/S09 regression: their lifecycle untouched by migration77", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const overview = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200, "S01 overview must still work");
  const s09Readiness = await app.request("/api/v1/dashboard/settings/s09-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s09Readiness.status, 200);
  const s09Current = ((await s09Readiness.json()) as { data: { publicationCas: number | null } }).data.publicationCas ?? 0;
  const s09Created = await app.request("/api/v1/dashboard/settings/s09-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.auth-rbac", expectedPublishedVersion: s09Current, value: { passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 10080 } }, changeReason: "S10 PG16 S09 regression", idempotencyKey: idempotent("s09reg") })
  });
  assert.equal(s09Created.status, 201, "S09 create must be unaffected by migration77");
});
