import assert from "node:assert/strict";
import test, { before } from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

/**
 * S01B real owned PostgreSQL16 regression (Section 10 of the coordinator
 * prompt). Requires the disposable PG16 fixture from
 * scripts/test-api-regular-pg16.sh (super admin seeded). Runs under
 * VANSTRO_RUNTIME_MODE=test with real login against the app.
 */

const app = createApp();
const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
const password = process.env.SUPER_ADMIN_PASSWORD;
const idempotent = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 8)}`;

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
// One shared admin session per file avoids login rate limiting (429).
before(async () => {
  if (!password) return;
  sharedToken = await login();
});
async function adminToken() {
  if (!sharedToken) throw new Error("S01B PG16 fixture requires a seeded super admin");
  return sharedToken;
}
function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
async function currentPublishedVersion(token: string) {
  const response = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  return ((await response.json()) as any).data.publication.version as number;
}
async function createDraft(token: string, value: number, changeReason = "S01B PG16 regression draft", expected?: number, idempotencyKey = idempotent("create")) {
  const expectedPublishedVersion = expected ?? await currentPublishedVersion(token);
  const response = await app.request("/api/v1/dashboard/settings/drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion, value, changeReason, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: any; error?: string; code?: string } };
}
async function validateDraft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("validate")) {
  const response = await app.request(`/api/v1/dashboard/settings/drafts/${draftId}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: any; error?: string; code?: string } };
}
async function patchDraft(token: string, draftId: string, expectedVersion: number, value: number, idempotencyKey = idempotent("patch")) {
  const response = await app.request(`/api/v1/dashboard/settings/drafts/${draftId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, value, changeReason: "S01B PG16 regression correction", idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: any; error?: string; code?: string } };
}
async function publishDraft(token: string, draftId: string, expectedVersion: number, idempotencyKey = idempotent("publish")) {
  const response = await app.request(`/api/v1/dashboard/settings/drafts/${draftId}/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: any; error?: string; code?: string } };
}
async function history(token: string) {
  const response = await app.request("/api/v1/dashboard/settings/history", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  return (await response.json()) as { data: Array<{ publicationId: string; version: number; status: string; auditEventId: string; publishedAt: string; rollbackOfPublicationId: string | null }> };
}

test("S01B 01 publish A then publish B keeps A's publish fact and Audit id immutable", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const before = await history(token);

  // publish A: 60 -> 90
  const draftA = await createDraft(token, 90, "S01B PG16 publish A");
  assert.equal(draftA.response.status, 201, `create A: ${draftA.response.status}`);
  const draftAId = draftA.body.data.id;
  const validateA = await validateDraft(token, draftAId, draftA.body.data.version);
  assert.equal(validateA.response.status, 200, `validate A: ${validateA.response.status}`);
  assert.equal(validateA.body.data.status, "validated");
  const publishA = await publishDraft(token, draftAId, validateA.body.data.draftVersion);
  assert.equal(publishA.response.status, 200, `publish A: ${publishA.response.status}`);
  // A's original publish Audit id comes from its published history entry.
  const historyAfterA = await history(token);
  const auditA = historyAfterA.data.find((entry) => entry.publicationId === publishA.body.data.id && entry.status === "published")?.auditEventId;
  assert.ok(auditA, "A must have a published history entry with an Audit id");

  // publish B: 90 -> 120; expected published version is A's published revision.
  const draftB = await createDraft(token, 120, "S01B PG16 publish B", publishA.body.data.version);
  assert.equal(draftB.response.status, 201, `create B: ${draftB.response.status}`);
  const validateB = await validateDraft(token, draftB.body.data.id, draftB.body.data.version);
  assert.equal(validateB.response.status, 200);
  const publishB = await publishDraft(token, draftB.body.data.id, validateB.body.data.draftVersion);
  assert.equal(publishB.response.status, 200, `publish B: ${publishB.response.status}`);

  // history must show A's original publish fact with its original Audit id,
  // plus an appended superseded event, plus B's published event.
  const after = await history(token);
  assert.ok(after.data.length >= before.data.length + 3, `expected >=${before.data.length + 3} history entries, got ${after.data.length}`);
  const aEntry = after.data.find((entry) => entry.publicationId === publishA.body.data.id && entry.status === "published" && entry.auditEventId === auditA);
  assert.ok(aEntry, "publication A original publish fact with original Audit id must remain");
  const supersededEntry = after.data.find((entry) => entry.publicationId === publishA.body.data.id && entry.status === "superseded");
  assert.ok(supersededEntry, "publication A supersession must be an appended event");
  const bEntry = after.data.find((entry) => entry.publicationId === publishB.body.data.id && entry.status === "published");
  assert.ok(bEntry, "publication B published event must be appended");
  // descriptor-scoped global publication sequence is monotonic and unique.
  const versions = after.data.map((entry) => entry.version);
  assert.equal(new Set(versions).size, versions.length, "publication sequences must be unique");
  assert.deepEqual(versions, [...versions].sort((a, b) => a - b), "publication sequences must be monotonic");
});

test("S01B 02 draft CAS and publication sequence are distinct and unambiguous", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const overviewResponse = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overviewResponse.status, 200);
  const currentVersion = ((await overviewResponse.json()) as any).data.publication.version;
  // Two drafts with independent resource-local CAS versions.
  const d1 = await createDraft(token, 45, "S01B PG16 CAS draft one", currentVersion);
  assert.equal(d1.response.status, 201);
  const d2 = await createDraft(token, 75, "S01B PG16 CAS draft two", currentVersion);
  assert.equal(d2.response.status, 201);
  // Draft CAS versions are globally unique and strictly increasing; each new
  // draft starts from the next descriptor-scoped revision.
  assert.notEqual(d1.body.data.version, d2.body.data.version, "draft CAS versions must be unique across drafts");
  // CAS is strictly increasing within a draft.
  const patched = await patchDraft(token, d1.body.data.id, d1.body.data.version, 50);
  assert.equal(patched.response.status, 200);
  assert.equal(patched.body.data.version, d1.body.data.version + 1);
  // Stale CAS fails with VERSION_CONFLICT (not state conflict).
  const stale = await patchDraft(token, d1.body.data.id, d1.body.data.version, 55);
  assert.equal(stale.response.status, 409);
  assert.equal(stale.body.code, "VERSION_CONFLICT");
});

test("S01B 03 structurally valid business-invalid draft persists and invalid+blocker is server-decided", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const draft = await createDraft(token, 10, "S01B PG16 business invalid value");
  assert.equal(draft.response.status, 201, "structurally valid business-invalid value must create a draft");
  assert.equal(draft.body.data.value, 10);
  const validation = await validateDraft(token, draft.body.data.id, draft.body.data.version);
  assert.equal(validation.response.status, 200);
  assert.equal(validation.body.data.status, "invalid");
  assert.ok(validation.body.data.issues.some((issue: any) => issue.severity === "blocker"), "invalid must carry a blocker issue");
  // publish on invalid is refused with state conflict (not version conflict).
  const refused = await publishDraft(token, draft.body.data.id, validation.body.data.draftVersion);
  assert.equal(refused.response.status, 409);
  assert.equal(refused.body.code, "SETTINGS_STATE_CONFLICT");
});

test("S01B 04 typed PATCH corrects an invalid draft and revalidation validates", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const draft = await createDraft(token, 10, "S01B PG16 PATCH recovery");
  assert.equal(draft.response.status, 201);
  const validation = await validateDraft(token, draft.body.data.id, draft.body.data.version);
  assert.equal(validation.body.data.status, "invalid");
  const corrected = await patchDraft(token, draft.body.data.id, validation.body.data.draftVersion, 60);
  assert.equal(corrected.response.status, 200, `PATCH correction: ${corrected.response.status}`);
  assert.equal(corrected.body.data.value, 60);
  const revalidated = await validateDraft(token, draft.body.data.id, corrected.body.data.version);
  assert.equal(revalidated.response.status, 200);
  assert.equal(revalidated.body.data.status, "validated");
  const published = await publishDraft(token, draft.body.data.id, revalidated.body.data.draftVersion);
  assert.equal(published.response.status, 200, `publish after recovery: ${published.response.status}`);
  assert.equal(published.body.data.status, "published");
});

test("S01B 05 version conflict vs state conflict vs not-found are separated", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  // Correct version but unvalidated state: publish must be state conflict.
  const draft = await createDraft(token, 200, "S01B PG16 state vs version");
  assert.equal(draft.response.status, 201);
  const published = await publishDraft(token, draft.body.data.id, draft.body.data.version);
  assert.equal(published.response.status, 409);
  assert.equal(published.body.code, "SETTINGS_STATE_CONFLICT", "unvalidated publish must be state conflict, not version conflict");
  // Missing row: controlled 404.
  const missing = await app.request(`/api/v1/dashboard/settings/drafts/${"00000000-0000-0000-0000-000000000000"}/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: 1, idempotencyKey: idempotent("missing") })
  });
  assert.equal(missing.status, 404);
  assert.equal((missing as any).body?.code ?? ((await missing.json()) as any).code, "SETTINGS_DESCRIPTOR_UNAVAILABLE");
});

test("S01B 06 negative/unsafe/overflow versions return stable 400", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const current = await currentPublishedVersion(token);
  // Structurally invalid values (unsafe integer, non-integer, NaN) are 400.
  for (const value of [2 ** 53, 2 ** 53 + 1, 1.5, NaN, Infinity]) {
    const draft = await createDraft(token, value, "S01B PG16 version boundary");
    assert.equal(draft.response.status, 400, `value ${String(value)} must 400`);
    assert.equal(draft.body.code, "SETTINGS_VALIDATION_FAILED");
  }
  // Expected published version outside the PostgreSQL integer range is 400.
  const overflow = await app.request("/api/v1/dashboard/settings/drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: 2 ** 31, value: 60, changeReason: "S01B PG16 expected version boundary", idempotencyKey: idempotent("overflow") })
  });
  assert.equal(overflow.status, 400);
  assert.equal(((await overflow.json()) as any).code, "SETTINGS_VALIDATION_FAILED");
  // Negative expected version is 400.
  const negative = await app.request("/api/v1/dashboard/settings/drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: -1, value: 60, changeReason: "S01B PG16 negative version boundary", idempotencyKey: idempotent("negversion") })
  });
  assert.equal(negative.status, 400);
  assert.equal(((await negative.json()) as any).code, "SETTINGS_VALIDATION_FAILED");
  assert.ok(current >= 0);
});

test("S01B 07 malformed UUID is a stable controlled error, never 500", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  for (const id of ["not-a-uuid", "1234", "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"]) {
    const response = await app.request(`/api/v1/dashboard/settings/drafts/${id}`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 400, `malformed id ${id} must 400`);
    assert.equal(((await response.json()) as any).code, "SETTINGS_VALIDATION_FAILED");
    const patch = await app.request(`/api/v1/dashboard/settings/drafts/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ expectedVersion: 1, value: 60, changeReason: "S01B PG16 malformed uuid", idempotencyKey: idempotent("maluuid") })
    });
    assert.equal(patch.status, 400);
    assert.equal(((await patch.json()) as any).code, "SETTINGS_VALIDATION_FAILED");
  }
});

test("S01B 08 idempotent exact replay returns the original sequence/version", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const key = idempotent("replay");
  const first = await createDraft(token, 70, "S01B PG16 idempotent replay", undefined, key);
  assert.equal(first.response.status, 201);
  const second = await createDraft(token, 70, "S01B PG16 idempotent replay", undefined, key);
  assert.equal(second.response.status, 201);
  assert.equal(second.body.data.id, first.body.data.id, "idempotent replay must return the original draft");
  assert.equal(second.body.data.version, first.body.data.version, "idempotent replay must return the original CAS version");
});

test("S01B 09 concurrent drafts never collide on the publication sequence", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const drafts = await Promise.all([
    createDraft(token, 110, "S01B PG16 concurrent one"),
    createDraft(token, 130, "S01B PG16 concurrent two"),
    createDraft(token, 150, "S01B PG16 concurrent three")
  ]);
  for (const { response } of drafts) assert.equal(response.status, 201);
  // Concurrent validation is serialized by the advisory lock; every draft
  // validates against its own CAS.
  const validated = await Promise.all(drafts.map(async ({ body }) => {
    const v = await validateDraft(token, body.data.id, body.data.version);
    assert.equal(v.response.status, 200);
    return v;
  }));
  // Concurrent publishes are serialized: exactly one succeeds, the others
  // fail with VERSION_CONFLICT (the expected published generation changed) —
  // never with a duplicate publication sequence.
  const published = await Promise.all(validated.map(async (v, index) => {
    const p = await publishDraft(token, drafts[index]!.body.data.id, v.body.data.draftVersion);
    return p;
  }));
  const okCount = published.filter((p) => p.response.status === 200).length;
  const conflictCount = published.filter((p) => p.response.status === 409 && p.body.code === "VERSION_CONFLICT").length;
  assert.equal(okCount, 1, "exactly one concurrent publish must win");
  assert.equal(conflictCount, published.length - 1, "the remaining publishes must fail with VERSION_CONFLICT");
  const after = await history(token);
  const versions = after.data.map((entry) => entry.version);
  assert.equal(new Set(versions).size, versions.length, "concurrent publishes must not collide on sequence");
});

test("S01B 10 rollback creates a new draft and a rollback publication without rewriting history", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const before = await history(token);

  const draft = await createDraft(token, 240, "S01B PG16 rollback source");
  assert.equal(draft.response.status, 201);
  const v = await validateDraft(token, draft.body.data.id, draft.body.data.version);
  const p = await publishDraft(token, draft.body.data.id, v.body.data.draftVersion);
  assert.equal(p.response.status, 200);
  const publicationId = p.body.data.id;

  const rollback = await app.request(`/api/v1/dashboard/settings/history/${publicationId}/rollback-draft`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedPublishedVersion: p.body.data.version, changeReason: "S01B PG16 rollback publication", idempotencyKey: idempotent("rollback") })
  });
  assert.equal(rollback.status, 201, `rollback draft: ${rollback.status}`);
  const rollbackDraft = ((await rollback.json()) as any).data;
  assert.equal(rollbackDraft.status, "rollback_draft");
  assert.equal(rollbackDraft.value, 240);
  const rv = await validateDraft(token, rollbackDraft.id, rollbackDraft.version);
  assert.equal(rv.response.status, 200);
  const rp = await publishDraft(token, rollbackDraft.id, rv.body.data.draftVersion);
  assert.equal(rp.response.status, 200, `rollback publish: ${rp.response.status}`);
  assert.equal(rp.body.data.rollbackOfPublicationId, publicationId);

  const after = await history(token);
  assert.ok(after.data.length >= before.data.length + 3);
  const rollbackEvent = after.data.find((entry) => entry.publicationId === rp.body.data.id && entry.status === "published" && entry.rollbackOfPublicationId === publicationId);
  assert.ok(rollbackEvent, "rollback publication must be a new appended published event");
});

test("S01B 11 Audit snapshot matches the real P02 authority", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const draft = await createDraft(token, 80, "S01B PG16 audit snapshot");
  assert.equal(draft.response.status, 201);
  const audit = await prisma.auditEvent.findFirst({
    where: { resourceType: "runtime_config", resourceId: draft.body.data.id, action: "create" },
    orderBy: { occurredAt: "desc" }
  });
  assert.ok(audit, "create Audit row must exist");
  const grants = audit.permissionGrants as Array<{ permissionKey: string; global: boolean }>;
  assert.ok(grants.some((grant) => grant.permissionKey === "settings.write" && grant.global), "Audit must record the real settings.write grant");
  const roles = audit.effectiveRoles as string[];
  assert.ok(Array.isArray(roles) && roles.length > 0, "Audit must record real effective roles, not an empty array");
  assert.equal(audit.contextRevision?.length, 64, "Audit must record the real context revision");
});

test("S01B 12 ACL: S01 ledger and event helper surface is not PUBLIC executable", async () => {
  const acl = await prisma.$queryRaw<Array<{ routine_name: string; has_public: boolean }>>`
    SELECT p.proname AS routine_name, has_function_privilege('public', p.oid, 'EXECUTE') AS has_public
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('s01_settings_ledger_immutable_v1','s01_settings_publication_event_immutable_v1')
  `;
  for (const row of acl) {
    assert.equal(row.has_public, false, `${row.routine_name} must not be PUBLIC executable`);
  }
});

test("S01B 13 Audit/ledger/history stay atomic on failure rollback", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const beforeEvents = await prisma.settingsPublicationEvent.count();
  // A failed publish (invalid state) must not leave Audit/ledger/event rows.
  const draft = await createDraft(token, 999, "S01B PG16 atomic failure");
  assert.equal(draft.response.status, 201);
  const refused = await publishDraft(token, draft.body.data.id, draft.body.data.version);
  assert.equal(refused.response.status, 409);
  const afterEvents = await prisma.settingsPublicationEvent.count();
  assert.equal(afterEvents, beforeEvents, "failed publish must not append any publication event");
  const failedAudits = await prisma.auditEvent.count({ where: { resourceId: draft.body.data.id, result: "failed" } });
  assert.equal(failedAudits, 0, "failed publish must not write a failed Audit row");
});
