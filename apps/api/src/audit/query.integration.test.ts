import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient, prisma } from "@vanstro/db";
import { createSession } from "../auth/session.js";
import { createApp } from "../app.js";
import { loadApiConfig } from "../config.js";

const app = createApp();
const setup = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL! } } });
async function fixture() {
  const suffix = randomUUID();
  const keys = ["dashboard.access", "audit_logs.read", "audit.read_sensitive"];
  await setup.permission.createMany({ data: keys.map((key) => ({ key, description: key })), skipDuplicates: true });
  const permissions = await setup.permission.findMany({ where: { key: { in: keys } }, select: { id: true } });
  assert.equal(permissions.length, keys.length);
  const role = await setup.role.create({ data: { key: `audit-test-${suffix}`, name: "Audit test", rolePermissions: { create: permissions.map(({ id }) => ({ permissionId: id })) } } });
  const user = await setup.user.create({ data: { email: `audit-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: role.id } } } });
  const session = await createSession(user.id);
  const keyset = JSON.stringify({ activeKid: "audit-test", keys: [{ kid: "audit-test", key: randomBytes(32).toString("base64"), mode: "active" }] });
  loadApiConfig({ ...process.env, VANSTRO_RUNTIME_MODE: "test", DATABASE_URL: process.env.DATABASE_URL, PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET, DASHBOARD_AUDIT_FOUNDATION_READY: "true", DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "false", DASHBOARD_COMMON_QUERY_DEALERS_READY: "false", DASHBOARD_QUERY_CURSOR_KEYS: keyset });
  const occurredAt = new Date(Date.now() - 1_000);
  const event = await setup.auditEvent.create({ data: { eventVersion: "audit-event.v1", occurredAt, actorType: "admin_user", actorId: user.id, actorDisplayClass: "staff", effectiveRoles: [{ roleKey: role.key, scope: "global" }], permissionGrants: [{ permissionKey: "audit_logs.read", scope: { kind: "global" } }], authorizationScopeKind: "global", dealerIds: [], locationIds: [], contextRevision: "fixture", authorizationContractVersion: "dashboard-authorization.v1", action: "create", resourceType: "category", resourceId: randomUUID(), result: "succeeded", requestId: `audit-${suffix}`, source: "dashboard_api", sensitive: true, beforeSummary: { schemaVersion: "audit-change-summary.v1", changedFields: ["status"], redactedFields: [], values: { status: "draft" } }, metadata: { schemaVersion: "audit-metadata.v1", entries: { roleCount: 1 } }, retentionClass: "default", retentionPolicyVersion: "audit-retention.v1", expiresAt: new Date(occurredAt.getTime() + 730 * 86_400_000) } });
  return { role, user, token: session.accessToken, event };
}

test("strict Audit list/filter/cursor/detail is exclusive and sensitive-safe", async (t) => {
  const databaseName = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/unknown").pathname.slice(1).toLowerCase();
  if (!/(test|smoke|disposable)/.test(databaseName)) return t.skip("immutable Audit integration requires an owned disposable database");
  const value = await fixture();
  const secondOccurredAt = new Date(value.event.occurredAt.getTime() - 1);
  await setup.auditEvent.create({ data: { eventVersion: "audit-event.v1", occurredAt: secondOccurredAt, actorType: "admin_user", actorId: value.user.id, actorDisplayClass: "staff", effectiveRoles: [{ roleKey: value.role.key, scope: "global" }], permissionGrants: [{ permissionKey: "audit_logs.read", scope: { kind: "global" } }], authorizationScopeKind: "global", dealerIds: [], locationIds: [], contextRevision: "fixture", authorizationContractVersion: "dashboard-authorization.v1", action: "create", resourceType: "category", resourceId: randomUUID(), result: "succeeded", requestId: `${value.event.requestId}-2`, source: "dashboard_api", sensitive: false, retentionClass: "default", retentionPolicyVersion: "audit-retention.v1", expiresAt: new Date(secondOccurredAt.getTime() + 730 * 86_400_000) } });
  const headers = { authorization: `Bearer ${value.token}` };
  const list = await app.request(`/api/v1/dashboard/audit-logs?queryVersion=common-query.v1&limit=1&action=create&requestId=${value.event.requestId}`, { headers });
  assert.equal(list.status, 200);
  const body = await list.json() as { data: Array<{ id:string; changeSummary?:{values?:unknown}; metadata?:unknown }>; meta:{pagination:{nextCursor?:string;hasMore:boolean};total?:unknown} };
  assert.equal(body.data[0]?.id, value.event.id); assert.equal("total" in body.meta, false); assert.ok(body.data[0]?.metadata); assert.ok(body.data[0]?.changeSummary?.values);
  const firstPage = await app.request(`/api/v1/dashboard/audit-logs?queryVersion=common-query.v1&limit=1&action=create`, { headers });
  const firstBody = await firstPage.json() as { meta:{pagination:{nextCursor?:string}} };
  assert.ok(firstBody.meta.pagination.nextCursor);
  const secondPage = await app.request(`/api/v1/dashboard/audit-logs?queryVersion=common-query.v1&limit=1&action=create&after=${encodeURIComponent(firstBody.meta.pagination.nextCursor!)}`, { headers });
  assert.equal(secondPage.status, 200);
  const detail = await app.request(`/api/v1/dashboard/audit-logs/${value.event.id}?queryVersion=common-query.v1`, { headers }); assert.equal(detail.status, 200);
  const invalid = await app.request(`/api/v1/dashboard/audit-logs/${value.event.id}?queryVersion=common-query.v1&queryVersion=common-query.v1`, { headers }); assert.equal(invalid.status, 400);
  const legacy = await app.request(`/api/v1/dashboard/audit-logs?page=1&pageSize=1`, { headers }); assert.equal(legacy.status, 200);
});

test("scoped Audit enforces Dealer and Location visibility, redaction, and cursor context binding", async (t) => {
  const databaseName = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/unknown").pathname.slice(1).toLowerCase();
  if (!/(test|smoke|disposable)/.test(databaseName)) return t.skip("immutable scoped Audit integration requires an owned disposable database");

  const suffix = randomUUID();
  const permissionKeys = ["dashboard.access", "audit_logs.read"];
  await setup.permission.createMany({ data: permissionKeys.map((key) => ({ key, description: key })), skipDuplicates: true });
  const permissions = await setup.permission.findMany({ where: { key: { in: permissionKeys } }, select: { id: true } });
  assert.equal(permissions.length, permissionKeys.length);
  const role = await setup.role.upsert({
    where: { key: "dealer_admin" },
    update: { rolePermissions: { createMany: { data: permissions.map(({ id }) => ({ permissionId: id })), skipDuplicates: true } } },
    create: { key: "dealer_admin", name: "Dealer admin", isSystem: true, rolePermissions: { create: permissions.map(({ id }) => ({ permissionId: id })) } }
  });
  const dealerA = await setup.dealer.create({ data: { code: `AUD-A-${suffix}`, name: "Audit Dealer A" } });
  const dealerB = await setup.dealer.create({ data: { code: `AUD-B-${suffix}`, name: "Audit Dealer B" } });
  const locationA = await setup.dealerLocation.create({ data: { dealerId: dealerA.id, code: `LOC-A-${suffix}`, name: "Audit Location A" } });
  const locationAOther = await setup.dealerLocation.create({ data: { dealerId: dealerA.id, code: `LOC-X-${suffix}`, name: "Audit Location Other" } });
  const makeActor = async (label: string) => {
    const user = await setup.user.create({ data: { email: `audit-scoped-${label}-${suffix}@example.test`, kind: "admin", status: "active" } });
    await setup.dealerMembership.create({ data: { userId: user.id, dealerId: dealerA.id, status: "active", roles: { create: { roleId: role.id } }, locations: { create: { dealerLocationId: locationA.id } } } });
    return { user, token: (await createSession(user.id)).accessToken };
  };
  const actor = await makeActor("a");
  const otherActor = await makeActor("b");
  const keyset = JSON.stringify({ activeKid: "audit-scoped", keys: [{ kid: "audit-scoped", key: randomBytes(32).toString("base64"), mode: "active" }] });
  loadApiConfig({ ...process.env, VANSTRO_RUNTIME_MODE: "test", DATABASE_URL: process.env.DATABASE_URL, PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET, DASHBOARD_AUDIT_FOUNDATION_READY: "true", DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "false", DASHBOARD_COMMON_QUERY_DEALERS_READY: "false", DASHBOARD_QUERY_CURSOR_KEYS: keyset });

  const baseTime = Date.now() - 1_000;
  const createEvent = async (offset: number, scope: { kind: "global" | "dealer" | "location" | "none"; dealerIds: string[]; locationIds: string[] }, requestId: string) => {
    const occurredAt = new Date(baseTime - offset);
    return setup.auditEvent.create({ data: {
    eventVersion: "audit-event.v1", occurredAt, actorType: "admin_user", actorId: actor.user.id, actorDisplayClass: "staff",
    effectiveRoles: [{ roleKey: "dealer_admin", scope: "dealer" }], permissionGrants: [{ permissionKey: "audit_logs.read", scope: scope.kind === "global" || scope.kind === "none" ? { kind: scope.kind } : { kind: scope.kind, dealerIds: scope.dealerIds, locationIds: scope.locationIds } }],
    authorizationScopeKind: scope.kind, dealerIds: scope.dealerIds, locationIds: scope.locationIds, contextRevision: `scoped-${suffix}`, authorizationContractVersion: "dashboard-authorization.v1",
    action: "create", resourceType: "category", resourceId: randomUUID(), result: scope.kind === "none" ? "denied" : "succeeded", ...(scope.kind === "none" ? { reason: "permission_required" } : {}), requestId, source: "dashboard_api", sensitive: true,
    afterSummary: { schemaVersion: "audit-change-summary.v1", changedFields: ["status"], redactedFields: [], values: { status: "private" } }, metadata: { schemaVersion: "audit-metadata.v1", entries: { roleCount: 1 } },
    retentionClass: "default", retentionPolicyVersion: "audit-retention.v1", expiresAt: new Date(occurredAt.getTime() + 730 * 86_400_000)
  } });
  };
  const visibleDealer = await createEvent(0, { kind: "dealer", dealerIds: [dealerA.id], locationIds: [] }, `scoped-visible-dealer-${suffix}`);
  const visibleLocation = await createEvent(1, { kind: "location", dealerIds: [dealerA.id], locationIds: [locationA.id] }, `scoped-visible-location-${suffix}`);
  await createEvent(2, { kind: "location", dealerIds: [dealerA.id], locationIds: [locationAOther.id] }, `scoped-hidden-location-${suffix}`);
  await createEvent(3, { kind: "dealer", dealerIds: [dealerB.id], locationIds: [] }, `scoped-hidden-dealer-${suffix}`);
  await createEvent(4, { kind: "global", dealerIds: [], locationIds: [] }, `scoped-hidden-global-${suffix}`);
  await createEvent(5, { kind: "none", dealerIds: [], locationIds: [] }, `scoped-hidden-none-${suffix}`);

  const headers = { authorization: `Bearer ${actor.token}` };
  const list = await app.request("/api/v1/dashboard/audit-logs?queryVersion=common-query.v1&limit=10", { headers });
  assert.equal(list.status, 200);
  const body = await list.json() as { data: Array<{ id: string; changeSummary?: { values?: unknown }; metadata?: unknown }>; meta: { total?: unknown } };
  assert.deepEqual(new Set(body.data.map(({ id }) => id)), new Set([visibleDealer.id, visibleLocation.id]));
  assert.equal("total" in body.meta, false);
  for (const item of body.data) { assert.equal(item.changeSummary?.values, undefined); assert.equal(item.metadata, undefined); }

  const firstPage = await app.request("/api/v1/dashboard/audit-logs?queryVersion=common-query.v1&limit=1", { headers });
  assert.equal(firstPage.status, 200);
  const firstBody = await firstPage.json() as { meta: { pagination: { nextCursor?: string } } };
  assert.ok(firstBody.meta.pagination.nextCursor);
  const replay = await app.request(`/api/v1/dashboard/audit-logs?queryVersion=common-query.v1&limit=1&after=${encodeURIComponent(firstBody.meta.pagination.nextCursor!)}`, { headers: { authorization: `Bearer ${otherActor.token}` } });
  assert.equal(replay.status, 400);
  const legacy = await app.request("/api/v1/dashboard/audit-logs?page=1&pageSize=10", { headers });
  assert.equal(legacy.status, 403);
});
