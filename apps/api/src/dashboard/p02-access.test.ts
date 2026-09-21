import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { createSession } from "../auth/session.js";
import { createApp } from "../app.js";
import { DASHBOARD_PERMISSION_RULES } from "./access.js";
import { INITIAL_PERMISSIONS } from "@vanstro/db/permissions";
import { assertLastSuperAdminPreserved, P02InvariantError } from "./p02-invariants.js";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture() {
  const suffix = randomUUID();
  const permissions = await prisma.permission.findMany({ where: { key: { in: ["dashboard.access", "dealers.read", "orders.read", "users.manage", "settings.write", "payments.reference.read"] } }, select: { id: true, key: true } });
  const dealerRole = await prisma.role.findUniqueOrThrow({ where: { key: "dealer_admin" }, select: { id: true } });
  const globalRole = await prisma.role.create({ data: { key: `p02-global-${suffix}`, name: "P02 Global", rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } } });
  const dealerA = await prisma.dealer.create({ data: { code: `P02-A-${suffix}`, name: "P02 A" } });
  const dealerB = await prisma.dealer.create({ data: { code: `P02-B-${suffix}`, name: "P02 B" } });
  const locationA = await prisma.dealerLocation.create({ data: { dealerId: dealerA.id, code: "A", name: "A" } });
  const locationB = await prisma.dealerLocation.create({ data: { dealerId: dealerB.id, code: "B", name: "B" } });
  const globalUser = await prisma.user.create({ data: { email: `p02-global-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: globalRole.id } } } });
  const scopedUser = await prisma.user.create({ data: { email: `p02-scoped-${suffix}@example.test`, kind: "admin", status: "active" } });
  const membership = await prisma.dealerMembership.create({ data: { userId: scopedUser.id, dealerId: dealerA.id, status: "active", roles: { create: { roleId: dealerRole.id } }, locations: { create: { dealerLocationId: locationA.id } } } });
  const globalSession = await createSession(globalUser.id);
  const scopedSession = await createSession(scopedUser.id);
  return { globalRole, dealerA, dealerB, locationA, locationB, globalUser, scopedUser, membership, globalToken: globalSession.accessToken, scopedToken: scopedSession.accessToken };
}

async function cleanup(f: Fixture) {
  await prisma.$transaction(async (db) => {
    await db.refreshSession.deleteMany({ where: { userId: { in: [f.globalUser.id, f.scopedUser.id] } } });
    await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: [f.globalUser.id, f.scopedUser.id] } }, { resourceId: f.membership.id }] } });
    await db.dealerMembershipLocation.deleteMany({ where: { membershipId: f.membership.id } });
    await db.dealerMembershipRole.deleteMany({ where: { membershipId: f.membership.id } });
    await db.dealerMembership.deleteMany({ where: { id: f.membership.id } });
    await db.userRole.deleteMany({ where: { userId: { in: [f.globalUser.id, f.scopedUser.id] } } });
    await db.user.deleteMany({ where: { id: { in: [f.globalUser.id, f.scopedUser.id] } } });
    await db.dealerLocation.deleteMany({ where: { id: { in: [f.locationA.id, f.locationB.id] } } });
    await db.dealer.deleteMany({ where: { id: { in: [f.dealerA.id, f.dealerB.id] } } });
    await db.rolePermission.deleteMany({ where: { roleId: f.globalRole.id } });
    await db.role.deleteMany({ where: { id: f.globalRole.id } });
  });
}

function auth(token: string, requestId = `p02-${randomUUID()}`) {
  return { authorization: `Bearer ${token}`, "X-Request-Id": requestId };
}

test("P02 last active Super Admin cannot be disabled or unassigned", async () => {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: "super_admin" }, select: { id: true } });
  const existingActive = await prisma.user.count({ where: { kind: "admin", status: "active", userRoles: { some: { roleId: role.id } } } });
  if (existingActive !== 1) return;
  const target = await prisma.user.findFirstOrThrow({ where: { kind: "admin", status: "active", userRoles: { some: { roleId: role.id } } }, select: { id: true } });
  await assert.rejects(
    prisma.$transaction((database) => assertLastSuperAdminPreserved(database, target.id, { removeRoleId: role.id })),
    (error: unknown) => error instanceof P02InvariantError && error.status === 409
  );
});

test("P02 routes reconcile with canonical ACL permissions", () => {
  const canonical = new Set<string>(INITIAL_PERMISSIONS);
  const p02Rules = DASHBOARD_PERMISSION_RULES.filter((rule) => rule.path === "/dashboard/authorization" || rule.path.startsWith("/dashboard/access/"));
  assert.equal(p02Rules.length, 9);
  assert.ok(p02Rules.every((rule) => canonical.has(rule.permission)));
  assert.equal(DASHBOARD_PERMISSION_RULES.some((rule) => rule.permission === "system.settings.write"), false);
});

test("P02 authorization distinguishes global and persisted dealer/location scope", async () => {
  const f = await createFixture();
  try {
    const global = await app.request("/api/v1/dashboard/authorization", { headers: auth(f.globalToken) });
    assert.equal(global.status, 200);
    const globalBody = await global.json() as { data: { scope: { kind: string }; actor: Record<string, unknown> } };
    assert.equal(globalBody.data.scope.kind, "global");
    assert.equal("email" in globalBody.data.actor, false);

    const scoped = await app.request("/api/v1/dashboard/authorization", { headers: auth(f.scopedToken) });
    assert.equal(scoped.status, 200);
    const scopedBody = await scoped.json() as { data: { scope: { kind: string; dealerIds: string[]; locationIds: string[] }; effectiveRoles: Array<{ roleKey: string; scope: string }> } };
    assert.equal(scopedBody.data.scope.kind, "location");
    assert.deepEqual(scopedBody.data.scope.dealerIds, [f.dealerA.id]);
    assert.deepEqual(scopedBody.data.scope.locationIds, [f.locationA.id]);
    assert.deepEqual(scopedBody.data.effectiveRoles, [{ roleKey: "dealer_admin", scope: "dealer" }]);
  } finally { await cleanup(f); }
});

test("P02 unrelated global role cannot promote scoped dealers.read across Dealers", async () => {
  const f = await createFixture();
  let unrelatedGlobalRoleId: string | undefined;
  try {
    const unrelatedPermissions = await prisma.permission.findMany({ where: { key: { in: ["dashboard.access", "content.read"] } }, select: { id: true } });
    const unrelatedGlobalRole = await prisma.role.create({
      data: {
        key: `p02-content-editor-${randomUUID()}`,
        name: "P02 Content Editor",
        rolePermissions: { create: unrelatedPermissions.map((permission) => ({ permissionId: permission.id })) }
      }
    });
    unrelatedGlobalRoleId = unrelatedGlobalRole.id;
    await prisma.userRole.create({ data: { userId: f.scopedUser.id, roleId: unrelatedGlobalRole.id } });

    const authorization = await app.request("/api/v1/dashboard/authorization", { headers: auth(f.scopedToken) });
    assert.equal(authorization.status, 200);
    const authorizationBody = await authorization.json() as { data: { scope: { kind: string }; modules: Array<{ actions: Array<{ permissionKey: string; scope: { kind: string; dealerIds?: string[]; locationIds?: string[] } }> }> } };
    assert.equal(authorizationBody.data.scope.kind, "mixed");
    const scopedDealersRead = authorizationBody.data.modules.flatMap((module) => module.actions).find((action) => action.permissionKey === "dealers.read")!;
    assert.deepEqual(scopedDealersRead.scope, { kind: "location", dealerIds: [f.dealerA.id], locationIds: [f.locationA.id] });

    const list = await app.request("/api/v1/dashboard/dealers", { headers: auth(f.scopedToken) });
    assert.equal(list.status, 200);
    const listBody = await list.json() as { data: Array<{ id: string }> };
    assert.deepEqual(listBody.data.map((dealer) => dealer.id), [f.dealerA.id]);

    const own = await app.request(`/api/v1/dashboard/dealers/${f.dealerA.id}`, { headers: auth(f.scopedToken) });
    assert.equal(own.status, 200);
    const other = await app.request(`/api/v1/dashboard/dealers/${f.dealerB.id}`, { headers: auth(f.scopedToken) });
    assert.equal(other.status, 404);

    const accessOther = await app.request(`/api/v1/dashboard/access/dealers/${f.dealerB.id}`, { headers: auth(f.scopedToken) });
    assert.equal(accessOther.status, 404);
    const otherLocations = await app.request(`/api/v1/dashboard/access/dealers/${f.dealerB.id}/locations`, { headers: auth(f.scopedToken) });
    assert.equal(otherLocations.status, 404);
  } finally {
    if (unrelatedGlobalRoleId) {
      await prisma.userRole.deleteMany({ where: { roleId: unrelatedGlobalRoleId } });
      await prisma.rolePermission.deleteMany({ where: { roleId: unrelatedGlobalRoleId } });
      await prisma.role.deleteMany({ where: { id: unrelatedGlobalRoleId } });
    }
    await cleanup(f);
  }
});

test("P02 scoped actor cannot cross Dealer or use scoped permission on unmigrated Orders", async () => {
  const f = await createFixture();
  try {
    const own = await app.request(`/api/v1/dashboard/access/dealers/${f.dealerA.id}`, { headers: auth(f.scopedToken) });
    assert.equal(own.status, 200);
    const other = await app.request(`/api/v1/dashboard/access/dealers/${f.dealerB.id}`, { headers: auth(f.scopedToken) });
    assert.equal(other.status, 404);
    const locations = await app.request(`/api/v1/dashboard/access/dealers/${f.dealerA.id}/locations`, { headers: auth(f.scopedToken) });
    assert.equal(locations.status, 200);
    const locationBody = await locations.json() as { data: Array<{ id: string }> };
    assert.deepEqual(locationBody.data.map((row) => row.id), [f.locationA.id]);
    const orders = await app.request("/api/v1/dashboard/orders", { headers: auth(f.scopedToken) });
    assert.equal(orders.status, 403);
  } finally { await cleanup(f); }
});

test("P02 membership revision rejects stale updates and preserves parent-child scope", async (t) => {
  const databaseName = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/unknown").pathname.slice(1).toLowerCase();
  if (!/(test|smoke|disposable)/.test(databaseName)) return t.skip("immutable P04 Audit mutation test requires an owned disposable database");
  const f = await createFixture();
  try {
    const stale = await app.request(`/api/v1/dashboard/access/memberships/${f.membership.id}`, {
      method: "PATCH", headers: { ...auth(f.globalToken), "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 7, status: "suspended" })
    });
    assert.equal(stale.status, 409);
    const valid = await app.request(`/api/v1/dashboard/access/memberships/${f.membership.id}`, {
      method: "PATCH", headers: { ...auth(f.globalToken), "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 0, status: "suspended" })
    });
    assert.equal(valid.status, 200);
    const body = await valid.json() as { data: { revision: number; status: string } };
    assert.equal(body.data.revision, 1);
    assert.equal(body.data.status, "suspended");
  } finally { await cleanup(f); }
});

test("P02 inactive or expired membership fails closed and request IDs are stable", async () => {
  const f = await createFixture();
  const requestId = `p02-request-${randomUUID()}`;
  try {
    await prisma.dealerMembership.update({ where: { id: f.membership.id }, data: { validFrom: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() - 1000) } });
    const response = await app.request("/api/v1/dashboard/authorization", { headers: auth(f.scopedToken, requestId) });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("X-Request-Id"), requestId);
    const body = await response.json() as { requestId: string; code: string };
    assert.equal(body.requestId, requestId);
    assert.equal(body.code, "DASHBOARD_FORBIDDEN");
  } finally { await cleanup(f); }
});

test("P02 inactive Dealer and Location fail closed", async () => {
  const f = await createFixture();
  try {
    await prisma.dealer.update({ where: { id: f.dealerA.id }, data: { status: "inactive" } });
    const dealerInactive = await app.request("/api/v1/dashboard/authorization", { headers: auth(f.scopedToken) });
    assert.equal(dealerInactive.status, 403);
    await prisma.dealer.update({ where: { id: f.dealerA.id }, data: { status: "active" } });
    await prisma.dealerLocation.update({ where: { id: f.locationA.id }, data: { status: "inactive" } });
    const locationInactive = await app.request("/api/v1/dashboard/authorization", { headers: auth(f.scopedToken) });
    assert.equal(locationInactive.status, 200);
    const body = await locationInactive.json() as { data: { scope: { kind: string } } };
    assert.equal(body.data.scope.kind, "dealer");
  } finally { await cleanup(f); }
});

test("P02 representative payment and order DTOs omit access tokens and internal payload", async () => {
  const f = await createFixture();
  const suffix = randomUUID();
  let paymentId: string | undefined;
  try {
    const payment = await prisma.paymentSession.create({ data: {
      guestEmail: "secret@example.test", guestFirstName: "Secret", guestLastName: "User", guestPhone: "555", guestOrderToken: `guest-${suffix}`,
      idempotencyKey: `idem-${suffix}`, requestHash: "hash", paymentInit: { secret: "never" }, status: "pending", fulfillment: "pickup", paymentMethod: "cash", items: [], subtotalCents: 100, totalCents: 100, providerPaymentId: `provider-${suffix}`, expiresAt: new Date(Date.now() + 60_000)
    } });
    paymentId = payment.id;
    const response = await app.request("/api/v1/dashboard/payment-sessions", { headers: auth(f.globalToken) });
    const body = await response.json() as { data: Array<Record<string, unknown>> };
    const row = body.data.find((entry) => entry.id === payment.id)!;
    for (const field of ["guestOrderToken", "idempotencyKey", "requestHash", "paymentInit", "providerPaymentId", "items", "notes"]) assert.equal(field in row, false, field);
    assert.equal(typeof row.providerReference, "string");
  } finally {
    if (paymentId) await prisma.paymentSession.deleteMany({ where: { id: paymentId } });
    await cleanup(f);
  }
});
