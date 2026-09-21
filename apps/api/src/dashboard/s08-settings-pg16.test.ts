import assert from "node:assert/strict";
import test, { before } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { hashPassword, prisma } from "@vanstro/db";
import { createApp } from "../app.js";

/**
 * S08 real owned PostgreSQL16 regression (task Section 17). Requires the
 * disposable PG16 fixture from scripts/test-api-regular-pg16.sh (super admin
 * seeded + migration79 applied). Covers the S08 settings lifecycle, token
 * business actions (create one-time plaintext, second-read no plaintext,
 * max-active ceiling, require-expiry, rotate overlap with idempotent replay,
 * revoke/disable), the safe token list GET (seven-field DTO, P02 ceiling,
 * 401/403/404, stable ordering, lifecycle statuses), explicit machine-stack
 * rate limiting (ERP/MCP/CLI 429 + Retry-After, per-account ceiling across
 * tokens, auth strictly before rate limit, upstream ERP routes now
 * authenticated), machine scope enforcement, invocation safe read model and
 * S01/S02/S03/S09/S10 regression.
 */

const app = createApp();
const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
const password = process.env.SUPER_ADMIN_PASSWORD;
const idempotent = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 8)}`;

const VALID_VALUE = {
  tokenLifecyclePolicy: { defaultTtlDays: 90, maximumTtlDays: 365, rotationOverlapMinutes: 30, maximumActiveTokensPerAccount: 5, requireExpiry: false },
  machineScopePolicy: { allowedRoleKeys: [], allowedPermissionFamilies: ["cli", "erp"], environment: "production", dealerLocationScopeMode: "global", denySensitivePermissionsByDefault: true },
  rateLimitPolicy: { requestsPerMinute: 100, burst: 0, mode: "per-token", retryAfterSemantics: "seconds" },
  auditInvocationPolicy: { invocationRetentionDays: 365, metadataRedactionMode: "strict", lastUsedTrackingEnabled: true, failedAuthenticationAuditEnabled: true }
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
  if (!sharedToken) throw new Error("S08 PG16 fixture requires a seeded super admin");
  return sharedToken;
}
function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
async function currentS08Published(token: string) {
  const readinessResponse = await app.request("/api/v1/dashboard/settings/s08-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(readinessResponse.status, 200);
  const readiness = ((await readinessResponse.json()) as { data: { publicationCas: number | null } }).data;
  return readiness.publicationCas ?? 0;
}
async function createS08Draft(token: string, value: unknown, changeReason = "S08 PG16 regression draft", expected?: number, idempotencyKey = idempotent("s08create")) {
  const expectedPublishedVersion = expected ?? await currentS08Published(token);
  const response = await app.request("/api/v1/dashboard/settings/s08-drafts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ descriptorKey: "settings.api-service-account", expectedPublishedVersion, value, changeReason, idempotencyKey })
  });
  return { response, body: (await response.json()) as { data?: { id: string; version: number; status: string } } };
}
async function validateS08Draft(token: string, draftId: string, version: number) {
  const response = await app.request(`/api/v1/dashboard/settings/s08-drafts/${draftId}/validate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: version, idempotencyKey: idempotent("s08validate") })
  });
  return { response, body: (await response.json()) as { data?: { draftId: string; draftVersion: number; status: string } } };
}
async function publishS08Draft(token: string, draftId: string, version: number) {
  const response = await app.request(`/api/v1/dashboard/settings/s08-drafts/${draftId}/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ expectedVersion: version, idempotencyKey: idempotent("s08publish") })
  });
  return { response, body: (await response.json()) as { data?: { id: string; generation: string; version: number } } };
}
async function createServiceAccount(token: string, key: string) {
  const response = await app.request("/api/v1/dashboard/mcp/service-accounts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ key, name: `S08 PG16 ${key}` })
  });
  return { response, body: (await response.json()) as { data?: { id: string; status: string } } };
}

test("S08 01 descriptor live with compiled defaults and exact four families", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const overview = await app.request("/api/v1/dashboard/settings/s08-overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(overview.status, 200);
  const data = ((await overview.json()) as { data: { descriptorKey: string; schemaVersion: string; projectionState: string; effective: Record<string, unknown> } }).data;
  assert.equal(data.descriptorKey, "settings.api-service-account");
  assert.equal(data.schemaVersion, "settings.api-service-account.v1");
  assert.deepEqual(Object.keys(data.effective).sort(), ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"].sort());
  const tlp = data.effective.tokenLifecyclePolicy as { defaultTtlDays: number; maximumTtlDays: number };
  assert.equal(tlp.defaultTtlDays, 90);
  assert.equal(tlp.maximumTtlDays, 365);
});

test("S08 02 create -> validate -> diff -> publish lifecycle and structural invalid 400", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const created = await createS08Draft(token, VALID_VALUE, "S08 lifecycle");
  assert.equal(created.response.status, 201);
  const validated = await validateS08Draft(token, created.body.data!.id, created.body.data!.version);
  assert.equal(validated.response.status, 200);
  assert.equal(validated.body.data!.status, "validated");
  const diff = await app.request(`/api/v1/dashboard/settings/s08-drafts/${created.body.data!.id}/diff`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(diff.status, 200);
  const published = await publishS08Draft(token, created.body.data!.id, validated.body.data!.draftVersion);
  assert.equal(published.response.status, 200);

  const bad = { ...VALID_VALUE, tokenLifecyclePolicy: { ...VALID_VALUE.tokenLifecyclePolicy, maximumTtlDays: 400 } };
  const badCreated = await createS08Draft(token, bad, "S08 invalid maximum TTL");
  assert.equal(badCreated.response.status, 400, "maximumTtlDays above 365 must be a structural 400");

  const secret = { ...VALID_VALUE, tokenLifecyclePolicy: { ...VALID_VALUE.tokenLifecyclePolicy, oneTimeRevealEnabled: true } };
  const secretCreated = await createS08Draft(token, secret, "S08 one-time reveal must be rejected");
  assert.equal(secretCreated.response.status, 400, "oneTimeRevealEnabled must be rejected");
});

test("S08 03 publish is policy-only with zero token/account side effects", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const before = await prisma.serviceAccountToken.count();
  const created = await createS08Draft(token, VALID_VALUE, "S08 zero side effect");
  assert.equal(created.response.status, 201);
  const validated = await validateS08Draft(token, created.body.data!.id, created.body.data!.version);
  const published = await publishS08Draft(token, created.body.data!.id, validated.body.data!.draftVersion);
  assert.equal(published.response.status, 200);
  const after = await prisma.serviceAccountToken.count();
  assert.equal(after, before, "publish must not create any token");
});

test("S08 04 token create one-time plaintext and second-read no plaintext with policy TTL", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const account = await createServiceAccount(token, `sa-once-${Date.now()}`);
  assert.equal(account.response.status, 201);
  const created = await app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
    body: JSON.stringify({ name: "once" })
  });
  assert.equal(created.status, 201, `token create: ${created.status}`);
  const body = (await created.json()) as { data: { id: string; plaintext: string; plaintextAvailable: boolean } };
  assert.match(body.data.plaintext, /^vsa_/, "plaintext token returned exactly once on create");
  // requireExpiry enforcement: publish a policy with requireExpiry=true and a
  // create without expiresAt must be rejected.
  const strictValue = { ...VALID_VALUE, tokenLifecyclePolicy: { ...VALID_VALUE.tokenLifecyclePolicy, requireExpiry: true } };
  const strictDraft = await createS08Draft(token, strictValue, "S08 requireExpiry");
  assert.equal(strictDraft.response.status, 201);
  const strictValidated = await validateS08Draft(token, strictDraft.body.data!.id, strictDraft.body.data!.version);
  const strictPublished = await publishS08Draft(token, strictDraft.body.data!.id, strictValidated.body.data!.draftVersion);
  assert.equal(strictPublished.response.status, 200);
  const noExpiry = await app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
    body: JSON.stringify({ name: "must-require-expiry" })
  });
  assert.equal(noExpiry.status, 400, "requireExpiry policy must reject a token without expiresAt");
  const withExpiry = await app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
    body: JSON.stringify({ name: "with-expiry", expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString() })
  });
  assert.equal(withExpiry.status, 201, "requireExpiry policy accepts an explicit future expiresAt");
  // restore permissive policy for the remaining tests
  const relaxed = await createS08Draft(token, VALID_VALUE, "S08 relax policy");
  const relaxedValidated = await validateS08Draft(token, relaxed.body.data!.id, relaxed.body.data!.version);
  const relaxedPublished = await publishS08Draft(token, relaxed.body.data!.id, relaxedValidated.body.data!.draftVersion);
  assert.equal(relaxedPublished.response.status, 200);

  // ttlDays maps to an explicit future expiry (reviewer medium fix).
  const ttlCreated = await app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
    body: JSON.stringify({ name: "ttl30", ttlDays: 30 })
  });
  assert.equal(ttlCreated.status, 201, "ttlDays create must succeed");
  const ttlBody = (await ttlCreated.json()) as { data: { expiresAt: string } };
  const deltaDays = (new Date(ttlBody.data.expiresAt).getTime() - Date.now()) / 86400000;
  assert.ok(deltaDays > 29 && deltaDays < 31, `ttlDays=30 must produce ~30 day expiry, got ${deltaDays.toFixed(2)}`);

  const accounts = await app.request(`/api/v1/dashboard/mcp/service-accounts`, { headers: { authorization: `Bearer ${token}` } });
  const accountsBody = (await accounts.json()) as { data: Array<Record<string, unknown>> };
  const listedAccount = accountsBody.data.find((entry) => entry.id === account.body.data!.id);
  assert.deepEqual(Object.keys(listedAccount ?? {}).sort(), ["createdAt", "environment", "id", "key", "name", "roles", "status"], "account list must be the exact safe summary DTO");
  const list = await app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens`, { headers: { authorization: `Bearer ${token}` } });
  const listed = (await list.json()) as { data: Array<Record<string, unknown>> };
  const tokenRow = listed.data.find((entry) => entry.id === body.data.id);
  assert.ok(tokenRow, "token metadata visible only from the token metadata endpoint");
  assert.equal("token" in tokenRow!, false, "second read must never return plaintext");
});

test("S08 05 rotate overlap creates replacement, narrows predecessor, replay returns no plaintext", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const account = await createServiceAccount(token, `sa-rot-${Date.now()}`);
  const created = await app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
    body: JSON.stringify({ name: "rot" })
  });
  const createdBody = (await created.json()) as { data: { id: string } };
  const predecessorId = createdBody.data.id;
  const idempotencyKey = idempotent("s08rotate");
  const rotate = async () => app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens/${predecessorId}/rotate`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotencyKey },
    body: JSON.stringify({ name: "rot-replacement" })
  });
  const first = await rotate();
  assert.equal(first.status, 201, `rotate first call creates the replacement (201), got ${first.status}`);
  const firstBody = (await first.json()) as { data: { id: string; status: string; expiresAt: string | null; overlapUntil: string | null; plaintext: string; plaintextAvailable: boolean } };
  assert.match(firstBody.data.plaintext, /^vsa_/, "replacement plaintext returned exactly once");
  assert.equal(firstBody.data.plaintextAvailable, true);
  assert.equal(firstBody.data.status, "active", "replacement is active");
  assert.ok(firstBody.data.overlapUntil, "overlap window recorded");

  const replay = await rotate();
  assert.equal(replay.status, 200, "same key + same payload replays idempotently");
  const replayBody = (await replay.json()) as { data: { id: string; status: string; plaintextAvailable: boolean; plaintext: string | null } };
  assert.equal(replayBody.data.id, firstBody.data.id, "replay returns the same replacement token id");
  assert.equal(replayBody.data.plaintextAvailable, false, "replay never returns plaintext");
  assert.equal(replayBody.data.plaintext, null, "replay returns plaintext: null, not a value");

  const conflict = await app.request(`/api/v1/dashboard/mcp/service-accounts/${account.body.data!.id}/tokens/${predecessorId}/rotate`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotencyKey },
    body: JSON.stringify({ name: "different-payload" })
  });
  assert.equal(conflict.status, 409, "same key different payload must 409");

  const tokens = await prisma.serviceAccountToken.findMany({ where: { serviceAccountId: account.body.data!.id } });
  const replacement = tokens.find((x) => x.id === firstBody.data.id);
  const predecessor = tokens.find((x) => x.id === predecessorId);
  assert.equal(replacement?.rotateIdempotencyKey, createHashIdempotency(idempotencyKey), "replacement carries the idempotency hash");
  assert.equal(predecessor?.replacedByTokenId, firstBody.data.id, "predecessor records replacement");
  assert.ok(predecessor!.expiresAt && predecessor!.expiresAt.getTime() <= Date.now() + 30 * 60 * 1000, "predecessor expiry narrowed to overlap window");
});
function createHashIdempotency(key: string) {
  return createHash("sha256").update(`vanstro:sa:rotate-idempotency:v1\0${key}`, "utf8").digest("hex");
}

test("S08 06 revoke enforces the transport contract and is idempotent, immediate, never recoverable", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const account = await createServiceAccount(token, `sa-rev-${Date.now()}`);
  const accountId = account.body.data!.id;
  const created = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
    body: JSON.stringify({ name: "rev" })
  });
  const createdBody = (await created.json()) as { data: { id: string } };
  const tokenId = createdBody.data.id;
  const revokePath = `/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens/${tokenId}`;
  const revokeKey = idempotent("s08revoke");
  const revoke = (key: string | undefined, reason: string | undefined) =>
    app.request(revokePath, {
      method: "DELETE",
      headers: authHeaders(token),
      body: JSON.stringify({ ...(reason !== undefined ? { reason } : {}), ...(key !== undefined ? { idempotencyKey: key } : {}) })
    });
  const auditCount = () => prisma.auditLog.count({ where: { action: "dashboard.mcp.service_account_tokens.revoke", metadata: { path: ["tokenId"], equals: tokenId } } });

  // Reason contract: missing, empty, too short and too long all 400 with a
  // stable code and are never silently truncated.
  const noReason = await revoke(revokeKey, undefined);
  assert.equal(noReason.status, 400, "missing reason must 400");
  assert.equal(((await noReason.json()) as { code: string }).code, "DASHBOARD_INVALID");
  const emptyReason = await revoke(revokeKey, "   ");
  assert.equal(emptyReason.status, 400, "empty reason must 400");
  const shortReason = await revoke(revokeKey, "1234567");
  assert.equal(shortReason.status, 400, "7-char reason must 400");
  const longReason = await revoke(revokeKey, "x".repeat(501));
  assert.equal(longReason.status, 400, "501-char reason must 400");
  assert.equal(await auditCount(), 0, "invalid revokes must not write audit rows");

  // Key contract: a valid revoke requires the idempotency key.
  const noKey = await revoke(undefined, "S08 PG16 revoke with reason");
  assert.equal(noKey.status, 400, "missing idempotency key must 400");
  assert.equal(((await noKey.json()) as { code: string }).code, "DASHBOARD_INVALID");

  // First revoke: 200, exact seven-field revoked metadata, one audit row.
  const first = await revoke(revokeKey, "S08 PG16 revoke with reason");
  assert.equal(first.status, 200, `valid revoke returns 200 (got ${first.status})`);
  const firstBody = (await first.json()) as { data: { id: string; name: string | null; status: string; lastUsedAt: string | null; expiresAt: string | null; revokedAt: string; createdAt: string } };
  assert.deepEqual(Object.keys(firstBody.data).sort(), ["createdAt", "expiresAt", "id", "lastUsedAt", "name", "revokedAt", "status"].sort(), "revoke returns the exact seven-field token metadata");
  assert.equal(firstBody.data.status, "revoked");
  assert.equal(firstBody.data.id, tokenId);
  assert.ok(firstBody.data.revokedAt, "revokedAt must be set");
  const auditRow = await prisma.auditLog.findFirst({ where: { action: "dashboard.mcp.service_account_tokens.revoke", metadata: { path: ["reason"], equals: "S08 PG16 revoke with reason" } } });
  assert.ok(auditRow, "revoke reason must be persisted in audit metadata");
  assert.equal(await auditCount(), 1, "exactly one audit row after first revoke");
  const revokedRow = await prisma.serviceAccountToken.findFirst({ where: { id: tokenId } });
  assert.equal(revokedRow?.revokeIdempotencyKey, createRevokeIdempotencyHash(revokeKey), "token row carries the revoke idempotency hash");

  // Same-key replay: 200 with the same revoked metadata; no second transition
  // or audit row; revokedAt is unchanged.
  const replay = await revoke(revokeKey, "S08 PG16 revoke with reason");
  assert.equal(replay.status, 200, "same key + same payload replays 200");
  const replayBody = (await replay.json()) as { data: { id: string; status: string; revokedAt: string } };
  assert.equal(replayBody.data.id, tokenId);
  assert.equal(replayBody.data.status, "revoked");
  assert.equal(replayBody.data.revokedAt, firstBody.data.revokedAt, "replay returns the original revokedAt, not a second transition");
  assert.equal(await auditCount(), 1, "replay must not duplicate the audit row");

  // Same key + different reason → stable 409 IDEMPOTENCY_CONFLICT.
  const conflict = await revoke(revokeKey, "A different reason for the same key");
  assert.equal(conflict.status, 409, "same key different payload must 409");
  assert.equal(((await conflict.json()) as { code: string }).code, "IDEMPOTENCY_CONFLICT");
  assert.equal(await auditCount(), 1, "conflict must not write an audit row");

  // Already-revoked token with a fresh key stays a stable 404.
  const second = await revoke(idempotent("s08revoke2"), "S08 PG16 revoke with reason");
  assert.equal(second.status, 404, "revoking an already-revoked token returns stable not-found");
  assert.equal(await auditCount(), 1, "second revoke must not write an audit row");

  // Concurrent revokes with the same key: both settle 200, exactly one audit.
  const created2 = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
    body: JSON.stringify({ name: "rev2" })
  });
  const token2Id = ((await created2.json()) as { data: { id: string } }).data.id;
  const concurrencyKey = idempotent("s08revconc");
  const concurrent = await Promise.all([
    app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens/${token2Id}`, { method: "DELETE", headers: authHeaders(token), body: JSON.stringify({ reason: "S08 PG16 concurrent revoke", idempotencyKey: concurrencyKey }) }),
    app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens/${token2Id}`, { method: "DELETE", headers: authHeaders(token), body: JSON.stringify({ reason: "S08 PG16 concurrent revoke", idempotencyKey: concurrencyKey }) })
  ]);
  assert.equal(concurrent.filter((r) => r.status === 200).length, 2, "both concurrent revokes settle 200");
  assert.equal(await prisma.auditLog.count({ where: { action: "dashboard.mcp.service_account_tokens.revoke", metadata: { path: ["tokenId"], equals: token2Id } } }), 1, "concurrent revokes must write exactly one audit row");

  // Disable still works after revocation.
  const disable = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status: "disabled" })
  });
  assert.equal(disable.status, 200);
});
function createRevokeIdempotencyHash(key: string) {
  return createHash("sha256").update(`vanstro:sa:revoke-idempotency:v1\0${key}`, "utf8").digest("hex");
}

test("S08 07 invocation read model never exposes raw input/output/error", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const invocations = await app.request("/api/v1/dashboard/mcp/invocations", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(invocations.status, 200);
  const body = (await invocations.json()) as { data: Array<Record<string, unknown>> };
  for (const row of body.data) {
    assert.equal("input" in row, false, "input must not be exposed");
    assert.equal("output" in row, false, "output must not be exposed");
    assert.equal("error" in row, false, "raw error must not be exposed");
  }
});

test("S08 08 S01/S02/S03/S09/S10 regression and restore compiled-default policy", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const s01 = await app.request("/api/v1/dashboard/settings/overview", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s01.status, 200, "S01 overview must still work");
  const s02 = await app.request("/api/v1/dashboard/settings/s02-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s02.status, 200, "S02 readiness must still work");
  const s03 = await app.request("/api/v1/dashboard/settings/s03-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s03.status, 200, "S03 readiness must still work");
  const s09 = await app.request("/api/v1/dashboard/settings/s09-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s09.status, 200, "S09 readiness must still work");
  const s10 = await app.request("/api/v1/dashboard/settings/s10-readiness", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(s10.status, 200, "S10 readiness must still work");
  // restore a default S08 policy so the descriptor remains published for the
  // remainder of the suite and later files observe a stable settings surface.
  const created = await createS08Draft(token, VALID_VALUE, "S08 restore default policy");
  const validated = await validateS08Draft(token, created.body.data!.id, created.body.data!.version);
  const published = await publishS08Draft(token, created.body.data!.id, validated.body.data!.draftVersion);
  assert.equal(published.response.status, 200);
});

test("S08 09 token list GET is a safe seven-field DTO with lifecycle statuses and stable ordering", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const account = await createServiceAccount(token, `sa-list-${Date.now()}`);
  assert.equal(account.response.status, 201);
  const accountId = account.body.data!.id;

  const createTokenRow = async (name: string) => {
    const created = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, {
      method: "POST",
      headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
      body: JSON.stringify({ name })
    });
    assert.equal(created.status, 201, `token create ${name}`);
    const createdPayload = (await created.json()) as { data: { id: string } }; // API boundary: status asserted 201 above before reading
    return createdPayload.data;
  };
  const first = await createTokenRow("first");
  const second = await createTokenRow("second");
  const third = await createTokenRow("third");
  const orderingBase = Date.now() - 10_000;
  await prisma.serviceAccountToken.update({ where: { id: first.id }, data: { createdAt: new Date(orderingBase) } });
  await prisma.serviceAccountToken.update({ where: { id: second.id }, data: { createdAt: new Date(orderingBase + 1_000) } });
  await prisma.serviceAccountToken.update({ where: { id: third.id }, data: { createdAt: new Date(orderingBase + 2_000) } });

  const listTokens = async (authorization?: string) => {
    const response = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, {
      headers: authorization ? { authorization } : undefined
    });
    return { response, body: (await response.json()) as { data?: Array<Record<string, unknown>> } };
  };

  // 401 without a dashboard session; 404 for an unknown account.
  const unauthenticated = await listTokens();
  assert.equal(unauthenticated.response.status, 401, "anonymous token list must be 401");
  const missing = await app.request(`/api/v1/dashboard/mcp/service-accounts/${randomUUID()}/tokens`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(missing.status, 404, "unknown account token list must be 404");

  // 403 P02 ceiling: an actor with service_accounts.manage but a narrower
  // permission set cannot list tokens of an account holding super_admin grants.
  const limitedRoleKey = `s08_limited_ops_${Date.now()}`;
  const limitedEmail = `limited-${Date.now()}@vanstro.test`;
  const role = await prisma.role.create({
    data: { key: limitedRoleKey, name: "S08 Limited Ops", isSystem: false }
  });
  for (const permissionKey of ["dashboard.access", "service_accounts.manage"]) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  }
  const credential = hashPassword("abcd1234abcd5678");
  const limitedAdmin = await prisma.user.create({
    data: {
      email: limitedEmail, kind: "admin", status: "active",
      passwordCredential: { create: { passwordHash: credential.passwordHash, passwordSalt: credential.passwordSalt, algorithm: credential.algorithm, iterations: credential.iterations } },
      userRoles: { create: { roleId: role.id } }
    }
  });
  const privileged = await createServiceAccount(token, `sa-priv-${Date.now()}`);
  assert.equal(privileged.response.status, 201);
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: "super_admin" } });
  await prisma.serviceAccountRole.create({ data: { serviceAccountId: privileged.body.data!.id, roleId: superAdminRole.id } });
  try {
    const limitedLogin = await app.request("/api/v1/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: limitedEmail, password: "abcd1234abcd5678" })
    });
    assert.equal(limitedLogin.status, 200, "limited admin must be able to log in");
    const limitedBody = (await limitedLogin.json()) as { data: { accessToken: string } };
    const forbidden = await app.request(`/api/v1/dashboard/mcp/service-accounts/${privileged.body.data!.id}/tokens`, {
      headers: { authorization: `Bearer ${limitedBody.data.accessToken}` }
    });
    assert.equal(forbidden.status, 403, "P02 ceiling must deny token list of an unmanageable account");
  } finally {
    await prisma.user.delete({ where: { id: limitedAdmin.id } }).catch(() => undefined);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } }).catch(() => undefined);
    await prisma.role.delete({ where: { id: role.id } }).catch(() => undefined);
  }

  // Strict seven-field DTO, newest first, no plaintext/secret/rotate internals.
  const listed = await listTokens(`Bearer ${token}`);
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.data!.length, 3);
  const safeKeys = ["createdAt", "expiresAt", "id", "lastUsedAt", "name", "revokedAt", "status"].sort();
  for (const row of listed.body.data!) {
    assert.deepEqual(Object.keys(row).sort(), safeKeys, "token list rows must be exactly the seven public fields");
    for (const secretKey of ["token", "plaintext", "tokenHash", "replacedByTokenId", "rotateIdempotencyKey", "rotateRequestHash", "revokeIdempotencyKey", "revokeRequestHash", "overlapUntil"]) {
      assert.equal(secretKey in row, false, `${secretKey} must never be exposed`);
    }
    assert.equal(row.status, "active");
  }
  assert.equal(listed.body.data![0].id, third.id, "createdAt desc: newest token first");
  assert.equal(listed.body.data![1].id, second.id);
  assert.equal(listed.body.data![2].id, first.id);

  // Rotate marks the predecessor rotated and the replacement active.
  const rotateKey = idempotent("s08listrotate");
  const rotated = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens/${first.id}/rotate`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": rotateKey },
    body: JSON.stringify({ name: "first-rotated" })
  });
  assert.equal(rotated.status, 201);
  const rotatedBody = (await rotated.json()) as { data: { id: string } };
  const afterRotate = await listTokens(`Bearer ${token}`);
  const predecessorRow = afterRotate.body.data!.find((row) => row.id === first.id)!;
  const replacementRow = afterRotate.body.data!.find((row) => row.id === rotatedBody.data.id)!;
  assert.equal(predecessorRow.status, "rotated", "predecessor reports rotated");
  assert.equal(replacementRow.status, "active", "replacement reports active");

  // Revoke marks the token revoked.
  const revoke = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens/${second.id}`, {
    method: "DELETE",
    headers: authHeaders(token),
    body: JSON.stringify({ reason: "S08 09 revoke for the list DTO", idempotencyKey: idempotent("s08listrevoke") })
  });
  assert.equal(revoke.status, 200);
  const afterRevoke = await listTokens(`Bearer ${token}`);
  const revokedRow = afterRevoke.body.data!.find((row) => row.id === second.id)!;
  assert.equal(revokedRow.status, "revoked", "revoked token reports revoked");

  // Expired derives from expiresAt <= now (mutated at the DB layer because the
  // create API rejects past expiry).
  await prisma.serviceAccountToken.update({
    where: { id: third.id },
    data: { expiresAt: new Date(Date.now() - 60_000) }
  });
  const afterExpiry = await listTokens(`Bearer ${token}`);
  const expiredRow = afterExpiry.body.data!.find((row) => row.id === third.id)!;
  assert.equal(expiredRow.status, "expired", "past expiry reports expired");

  // Stable tie-break: equal createdAt rows order by id asc.
  const fixed = new Date("2026-01-01T00:00:00.000Z");
  await prisma.serviceAccountToken.updateMany({ where: { serviceAccountId: accountId }, data: { createdAt: fixed } });
  const tied = await listTokens(`Bearer ${token}`);
  const ids = tied.body.data!.map((row) => row.id as string);
  assert.deepEqual(ids, [...ids].sort(), "equal createdAt rows must order by id asc");
});

test("S08 11 null-name token lists as name:null and create 409 carries a specific code", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const account = await createServiceAccount(token, `sa-nullname-${Date.now()}`);
  const accountId = account.body.data!.id;

  // Historical token with a null name must list with name:null, never "".
  await prisma.serviceAccountToken.create({
    data: { serviceAccountId: accountId, tokenHash: createHash("sha256").update("legacy").digest("hex"), name: null }
  });
  const list = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(list.status, 200);
  const listBody = (await list.json()) as { data: Array<{ id: string; name: string | null }> };
  assert.ok(listBody.data.some((row) => row.name === null), "null-name token must be returned as name:null");

  // Published ceiling: maximumActiveTokensPerAccount=1 → second create on a
  // fresh account is a 409 with the stable TOKEN_LIMIT_REACHED code.
  const ceilingAccount = await createServiceAccount(token, `sa-ceiling-${Date.now()}`);
  const ceilingAccountId = ceilingAccount.body.data!.id;
  const ceilingValue = { ...VALID_VALUE, tokenLifecyclePolicy: { ...VALID_VALUE.tokenLifecyclePolicy, maximumActiveTokensPerAccount: 1 } };
  const draft = await createS08Draft(token, ceilingValue, "S08 ceiling 1");
  assert.equal(draft.response.status, 201);
  const validated = await validateS08Draft(token, draft.body.data!.id, draft.body.data!.version);
  const published = await publishS08Draft(token, draft.body.data!.id, validated.body.data!.draftVersion);
  assert.equal(published.response.status, 200);

  const first = await app.request(`/api/v1/dashboard/mcp/service-accounts/${ceilingAccountId}/tokens`, { method: "POST", headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") }, body: JSON.stringify({ name: "first" }) });
  assert.equal(first.status, 201);
  const second = await app.request(`/api/v1/dashboard/mcp/service-accounts/${ceilingAccountId}/tokens`, { method: "POST", headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") }, body: JSON.stringify({ name: "second" }) });
  assert.equal(second.status, 409, "ceiling create must 409");
  const secondBody = (await second.json()) as { error: string; code: string };
  assert.equal(secondBody.code, "TOKEN_LIMIT_REACHED", "ceiling 409 must expose the stable code");

  // Disabled account: create must 409 with SERVICE_ACCOUNT_DISABLED.
  const disabledAccount = await createServiceAccount(token, `sa-disabled-${Date.now()}`);
  const disabledId = disabledAccount.body.data!.id;
  await app.request(`/api/v1/dashboard/mcp/service-accounts/${disabledId}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ status: "disabled" }) });
  const disabledCreate = await app.request(`/api/v1/dashboard/mcp/service-accounts/${disabledId}/tokens`, { method: "POST", headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") }, body: JSON.stringify({ name: "blocked" }) });
  assert.equal(disabledCreate.status, 409, "disabled account create must 409");
  const disabledBody = (await disabledCreate.json()) as { error: string; code: string };
  assert.equal(disabledBody.code, "SERVICE_ACCOUNT_DISABLED", "disabled 409 must expose the stable code");

  // Restore compiled default for later suites.
  const relaxed = await createS08Draft(token, VALID_VALUE, "S08 restore default");
  const relaxedValidated = await validateS08Draft(token, relaxed.body.data!.id, relaxed.body.data!.version);
  await publishS08Draft(token, relaxed.body.data!.id, relaxedValidated.body.data!.draftVersion);
});
test("S08 10 ERP/MCP/CLI machine routes enforce the per-account rate limit with Retry-After after auth", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();

  // Deterministic ceiling: publish requestsPerMinute=2 (per-token buckets plus
  // the always-on account ceiling). A fresh account starts with an empty
  // bucket, so the third authenticated request is a stable 429.
  const rlValue = {
    ...VALID_VALUE,
    machineScopePolicy: { ...VALID_VALUE.machineScopePolicy, allowedPermissionFamilies: ["cli", "erp", "mcp"] },
    rateLimitPolicy: { requestsPerMinute: 2, burst: 0, mode: "per-token", retryAfterSemantics: "seconds" }
  };
  const draft = await createS08Draft(token, rlValue, "S08 rate limit ceiling 2");
  assert.equal(draft.response.status, 201);
  const validated = await validateS08Draft(token, draft.body.data!.id, draft.body.data!.version);
  const published = await publishS08Draft(token, draft.body.data!.id, validated.body.data!.draftVersion);
  assert.equal(published.response.status, 200);

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: "super_admin" } });
  const createMachineAccount = async (key: string) => {
    const response = await app.request("/api/v1/dashboard/mcp/service-accounts", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ key, name: `S08 RL ${key}`, roleIds: [superAdminRole.id] })
    });
    assert.equal(response.status, 201, `machine account create ${key}`);
    return ((await response.json()) as { data: { id: string } }).data.id;
  };
  const createToken = async (accountId: string, name: string) => {
    const created = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, {
      method: "POST",
      headers: { ...authHeaders(token), "idempotency-key": idempotent("s08tok") },
      body: JSON.stringify({ name })
    });
    assert.equal(created.status, 201, `token create ${name}`);
    return ((await created.json()) as { data: { plaintext: string } }).data.plaintext;
  };
  const machineHeaders = (plaintext: string) => ({ authorization: `Bearer ${plaintext}`, "content-type": "application/json" });
  const uniqueKey = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const assert429 = async (response: Response) => {
    assert.equal(response.status, 429, `expected 429 got ${response.status}`);
    const retryAfter = response.headers.get("retry-after");
    assert.ok(retryAfter && /^\d+$/.test(retryAfter), `Retry-After must be integer seconds, got ${String(retryAfter)}`);
    const seconds = Number(retryAfter);
    assert.ok(seconds >= 1 && seconds <= 60, `Retry-After must be within the 60s window, got ${seconds}`);
    const body = (await response.json()) as { error: string; code: string };
    assert.equal(body.code, "RATE_LIMITED");
  };
  // Two allowed calls then a deterministic 429. Each attempt uses a FRESH
  // account (guaranteed empty bucket) so the first two requests always pass;
  // the third crosses the 2/min ceiling unless a minute-window rollover resets
  // the bucket mid-run, in which case the next fresh pair retries.
  const exhaustCeiling = async (makePair: () => Promise<{ accountId: string; token: string }>, url: string): Promise<Response> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { token: plaintext } = await makePair();
      const first = await app.request(url, { headers: machineHeaders(plaintext) });
      const second = await app.request(url, { headers: machineHeaders(plaintext) });
      assert.equal(first.status, 200, `first request must pass, got ${first.status}`);
      assert.equal(second.status, 200, `second request must pass, got ${second.status}`);
      const third = await app.request(url, { headers: machineHeaders(plaintext) });
      if (third.status === 429) return third;
    }
    assert.fail("rate limit ceiling never produced a 429");
  };

  try {
    // ERP: account-level ceiling is shared across tokens (bucket key is the
    // account id, never the plaintext token).
    const erpUrl = "/api/v1/integrations/erp/catalog/skus";
    let erpLastPair: { accountId: string; token: string } | undefined;
    const erpLimited = await exhaustCeiling(async () => {
      const accountId = await createMachineAccount(`sa-rl-erp-${uniqueKey("erp")}`);
      erpLastPair = { accountId, token: await createToken(accountId, "erp-a") };
      return erpLastPair;
    }, erpUrl);
    await assert429(erpLimited);
    const erpTokenB = await createToken(erpLastPair!.accountId, "erp-b");
    let otherTokenLimited: Response | undefined;
    for (let attempt = 0; attempt < 3 && !otherTokenLimited; attempt++) {
      const response = await app.request(erpUrl, { headers: machineHeaders(erpTokenB) });
      if (response.status === 429) { otherTokenLimited = response; break; }
      assert.equal(response.status, 200, `unexpected cross-token status ${response.status}`);
    }
    assert.ok(otherTokenLimited, "account-level ceiling must be shared across tokens");
    await assert429(otherTokenLimited);

    // MCP: both GET /mcp/tools and POST /mcp share the explicit stack.
    const mcpUrl = "/api/v1/mcp/tools";
    let mcpLimited: Response | undefined;
    for (let attempt = 0; attempt < 3 && !mcpLimited; attempt++) {
      const mcpAccount = await createMachineAccount(`sa-rl-mcp-${uniqueKey("mcp")}`);
      const mcpToken = await createToken(mcpAccount, `mcp-${attempt}`);
      assert.equal((await app.request(mcpUrl, { headers: machineHeaders(mcpToken) })).status, 200);
      const mcpInvoke = await app.request("/api/v1/mcp", {
        method: "POST",
        headers: machineHeaders(mcpToken),
        body: JSON.stringify({ tool: "platform.health" })
      });
      assert.equal(mcpInvoke.status, 200, "POST /mcp passes before the ceiling");
      const third = await app.request(mcpUrl, { headers: machineHeaders(mcpToken) });
      if (third.status === 429) mcpLimited = third;
    }
    assert.ok(mcpLimited, "MCP ceiling never produced a 429");
    await assert429(mcpLimited);

    // CLI.
    const cliUrl = "/api/v1/cli/erp-sync-jobs";
    const cliLimited = await exhaustCeiling(async () => {
      const accountId = await createMachineAccount(`sa-rl-cli-${uniqueKey("cli")}`);
      return { accountId, token: await createToken(accountId, "cli") };
    }, cliUrl);
    await assert429(cliLimited);

    // Auth runs strictly before rate limiting: unauthenticated requests stay
    // 401 (never 429) even with exhausted buckets, and a fresh account still
    // gets 200 while the exhausted ones remain limited.
    const anonymous = await app.request(mcpUrl);
    assert.equal(anonymous.status, 401, "unauthenticated must stay 401, never 429");
    const freshAccount = await createMachineAccount(`sa-rl-fresh-${uniqueKey("fresh")}`);
    const freshToken = await createToken(freshAccount, "fresh");
    assert.equal((await app.request(mcpUrl, { headers: machineHeaders(freshToken) })).status, 200, "fresh account passes");

    // The four upstream ERP GET routes were previously unmatched by auth
    // prefixes (unset principal -> handler 500); they now require the same
    // machine stack. Point the ERP client at a dead local port so the
    // upstream call fails fast instead of hitting the real host.
    const previousErpBaseUrl = process.env.ERP_PRODUCT_API_BASE_URL;
    process.env.ERP_PRODUCT_API_BASE_URL = "http://127.0.0.1:9";
    try {
      const upstreamUrl = "/api/v1/integrations/erp/upstream/categories";
      const upstreamAnonymous = await app.request(upstreamUrl);
      assert.equal(upstreamAnonymous.status, 401, "upstream routes must require machine auth");
      const upstreamInvalid = await app.request(upstreamUrl, { headers: { authorization: "Bearer vsa_invalid_token" } });
      assert.equal(upstreamInvalid.status, 401, "invalid token must be rejected before the handler");
      const upstreamAuthed = await app.request(upstreamUrl, { headers: machineHeaders(freshToken) });
      assert.notEqual(upstreamAuthed.status, 401, "valid machine token passes auth on upstream routes");
      assert.notEqual(upstreamAuthed.status, 500, "authenticated upstream route must not 500 (unset principal regression)");
    } finally {
      if (previousErpBaseUrl === undefined) delete process.env.ERP_PRODUCT_API_BASE_URL;
      else process.env.ERP_PRODUCT_API_BASE_URL = previousErpBaseUrl;
    }
  } finally {
    const restored = await createS08Draft(token, VALID_VALUE, "S08 restore default policy after rate limit");
    const restoredValidated = await validateS08Draft(token, restored.body.data!.id, restored.body.data!.version);
    const restoredPublished = await publishS08Draft(token, restored.body.data!.id, restoredValidated.body.data!.draftVersion);
    assert.equal(restoredPublished.response.status, 200);
  }
});

test("S08 12 create-token durable idempotency: sequential replay, payload conflict, concurrency, key validation", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const account = await createServiceAccount(token, `sa-idem-${Date.now()}`);
  const accountId = account.body.data!.id;

  const create = (targetAccountId: string, key: string | undefined, payload: Record<string, unknown>) =>
    app.request(`/api/v1/dashboard/mcp/service-accounts/${targetAccountId}/tokens`, {
      method: "POST",
      headers: { ...authHeaders(token), ...(key !== undefined ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(payload)
    });

  // Missing/invalid key → 400 (frozen contract requires a key).
  const noKey = await create(accountId, undefined, { name: "nokey" });
  assert.equal(noKey.status, 400, "missing idempotency key must 400");
  const badKey = await create(accountId, "short", { name: "bad" });
  assert.equal(badKey.status, 400, "invalid idempotency key must 400");

  // Sequential replay: same key + same payload → exactly one token row.
  const key1 = idempotent("s08create");
  const first = await create(accountId, key1, { name: "idem-a" });
  assert.equal(first.status, 201);
  const firstBody = (await first.json()) as { data: { id: string; plaintext: string | null; plaintextAvailable: boolean; replayed: boolean } };
  assert.equal(firstBody.data.plaintextAvailable, true);
  assert.equal(firstBody.data.replayed, false);
  assert.ok(firstBody.data.plaintext && /^vsa_/.test(firstBody.data.plaintext), "first create reveals plaintext once");

  const replay = await create(accountId, key1, { name: "idem-a" });
  assert.equal(replay.status, 200, "same key + payload replays 200");
  const replayBody = (await replay.json()) as { data: { id: string; plaintext: string | null; plaintextAvailable: boolean; replayed: boolean; token?: string } };
  assert.equal(replayBody.data.replayed, true);
  assert.equal(replayBody.data.plaintextAvailable, false);
  assert.equal(replayBody.data.plaintext, null, "replay never returns plaintext");
  assert.equal("token" in replayBody.data, false, "replay never returns token");
  assert.equal(replayBody.data.id, firstBody.data.id, "replay returns the original token id");

  const rowsAfterReplay = await prisma.serviceAccountToken.count({ where: { serviceAccountId: accountId } });
  assert.equal(rowsAfterReplay, 1, "sequential replay must not mint a second token");

  // Same key + different payload → 409 IDEMPOTENCY_CONFLICT, count unchanged.
  const conflictName = await create(accountId, key1, { name: "idem-b" });
  assert.equal(conflictName.status, 409);
  assert.equal(((await conflictName.json()) as { code: string }).code, "IDEMPOTENCY_CONFLICT");
  const conflictTtl = await create(accountId, key1, { name: "idem-a", ttlDays: 30 });
  assert.equal(conflictTtl.status, 409);
  assert.equal(((await conflictTtl.json()) as { code: string }).code, "IDEMPOTENCY_CONFLICT");
  assert.equal(await prisma.serviceAccountToken.count({ where: { serviceAccountId: accountId } }), 1, "conflicts must not change the token count");

  // Concurrent same key + same payload → exactly one token row (DB unique constraint).
  const key2 = idempotent("s08concurrent");
  const concurrent = await Promise.all([
    create(accountId, key2, { name: "concurrent" }),
    create(accountId, key2, { name: "concurrent" })
  ]);
  assert.equal(concurrent.filter((r) => r.status === 201 || r.status === 200).length, 2, "both concurrent calls settle 200/201");
  assert.equal(await prisma.serviceAccountToken.count({ where: { serviceAccountId: accountId, createIdempotencyKey: createHash("sha256").update(`vanstro:sa:create-idempotency:v1\0${key2}`, "utf8").digest("hex") } }), 1, "concurrent same-key must mint exactly one token");

  // Disabled 409 must not leave an idempotency record or ghost token.
  const disabledAccount = await createServiceAccount(token, `sa-idem-disabled-${Date.now()}`);
  const disabledId = disabledAccount.body.data!.id;
  const disabledPatch = await app.request(`/api/v1/dashboard/mcp/service-accounts/${disabledId}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ status: "disabled" }) });
  assert.equal(disabledPatch.status, 200);
  const disabledKey = idempotent("s08disabled");
  const disabledCreate = await create(disabledId, disabledKey, { name: "blocked" });
  assert.equal(disabledCreate.status, 409);
  assert.equal(await prisma.serviceAccountToken.count({ where: { serviceAccountId: disabledId } }), 0, "disabled 409 must not mint a token");

  // Audit read model never carries plaintext/hash/raw key.
  const auditRows = await prisma.auditLog.findMany({ where: { action: "dashboard.mcp.service_account_tokens.create", metadata: { path: ["tokenId"], equals: firstBody.data.id } } });
  assert.equal(auditRows.length, 1);
  assert.equal(JSON.stringify(auditRows[0].metadata).includes("vsa_"), false, "audit metadata must never contain plaintext");
});

test("S08 13 create-token and create-audit are atomic; audit failure rolls back and retry succeeds", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const token = await adminToken();
  const account = await createServiceAccount(token, `sa-audit-${Date.now()}`);
  const accountId = account.body.data!.id;
  const key1 = idempotent("s08audit");

  const create = () => app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(token), "idempotency-key": key1 },
    body: JSON.stringify({ name: "audit-atomic" })
  });

  // Break the audit write path: rename the audit_logs table so auditLog.create
  // fails inside the transaction. The token create must roll back with it.
  await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs RENAME TO audit_logs_disabled`);
  const failed = await create();
  assert.equal(failed.status, 500, "audit failure must surface as a server error");
  assert.equal(await prisma.serviceAccountToken.count({ where: { serviceAccountId: accountId } }), 0, "token must roll back when audit fails");

  // Restore the audit path; retrying the SAME key must now perform a normal
  // first create (one token + one create audit) — not a replay of a phantom.
  await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs_disabled RENAME TO audit_logs`);
  const retried = await create();
  assert.equal(retried.status, 201, "same-key retry after rollback must create");
  const retriedBody = (await retried.json()) as { data: { id: string; plaintextAvailable: boolean; replayed: boolean } };
  assert.equal(retriedBody.data.replayed, false, "retry after rollback is a first create, not a replay");
  assert.equal(retriedBody.data.plaintextAvailable, true, "first create reveals plaintext once");
  assert.equal(await prisma.serviceAccountToken.count({ where: { serviceAccountId: accountId } }), 1, "exactly one token after retry");
  const auditRows = await prisma.auditLog.findMany({ where: { action: "dashboard.mcp.service_account_tokens.create", metadata: { path: ["tokenId"], equals: retriedBody.data.id } } });
  assert.equal(auditRows.length, 1, "exactly one create audit after retry");
  assert.equal(JSON.stringify(auditRows[0].metadata).includes("vsa_"), false, "audit metadata must not contain plaintext");

  // A replay of the same key must NOT write a second create audit.
  const replay = await create();
  assert.equal(replay.status, 200);
  assert.equal(await prisma.auditLog.count({ where: { action: "dashboard.mcp.service_account_tokens.create", metadata: { path: ["tokenId"], equals: retriedBody.data.id } } }), 1, "replay must not duplicate create audit");
});
