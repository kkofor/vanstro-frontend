import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { Hono } from "hono";
import type { PrismaClient } from "@vanstro/db";

// Focused runs without a disposable database load cleanly: @vanstro/db
// constructs its PrismaClient at import time, so every runtime module is
// loaded lazily AFTER the env defaults below are applied (static import
// cannot run before module evaluation). This is the test-boundary exception
// to static imports: the module specifiers are fixed but their evaluation
// order relative to process.env is load-bearing. DB-backed cases skip
// through the same disposable-name gate the P02/P07 API tests use;
// assertions are unchanged.
const TEST_ENV: NodeJS.ProcessEnv & { DATABASE_URL: string } = {
  ...process.env,
  VANSTRO_RUNTIME_MODE: "test",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost/vanstro_f4_unknown?schema=public",
  PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET ?? "f4-test-secret-00000000000000000000000000"
};
process.env.DATABASE_URL = TEST_ENV.DATABASE_URL;

type SetupRuntime = {
  app: Hono;
  prisma: PrismaClient;
  createSession: (userId: string) => Promise<{ accessToken: string }>;
};

async function setup(): Promise<SetupRuntime> {
  const { loadApiConfig } = await import("../config.js");
  loadApiConfig(TEST_ENV);
  const { PrismaClient } = await import("@vanstro/db");
  const { createApp } = await import("../app.js");
  const { createSession } = await import("../auth/session.js");
  return {
    app: createApp(),
    prisma: new PrismaClient({ datasources: { db: { url: TEST_ENV.DATABASE_URL } } }),
    createSession
  };
}

type Fixture = {
  suffix: string;
  adminRole: { id: string };
  readOnlyRole: { id: string };
  admin: { id: string };
  readOnly: { id: string };
  adminToken: string;
  readOnlyToken: string;
};

function disposable(t: test.TestContext) {
  const name = new URL(TEST_ENV.DATABASE_URL).pathname.slice(1);
  if (!/(test|smoke|disposable|fixture)/i.test(name)) {
    t.skip("F4 catalog/dealer API proof requires an owned disposable/fixture database");
    return false;
  }
  return true;
}

async function createFixture(runtime: SetupRuntime): Promise<Fixture> {
  const { prisma, createSession } = runtime;
  const suffix = randomUUID();
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ["dashboard.access", "dealers.read", "products.read", "pricing.write", "settings.write"] } },
    select: { id: true, key: true }
  });
  assert.ok(permissions.length >= 5, "canonical permissions must be bootstrapped before this test");
  const adminRole = await prisma.role.create({
    data: { key: `f4-admin-${suffix}`, name: "F4 Admin", rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } }
  });
  const readOnlyPermissions = await prisma.permission.findMany({
    where: { key: { in: ["dashboard.access", "dealers.read"] } },
    select: { id: true }
  });
  const readOnlyRole = await prisma.role.create({
    data: { key: `f4-readonly-${suffix}`, name: "F4 Read-Only Dealer Admin", rolePermissions: { create: readOnlyPermissions.map((permission) => ({ permissionId: permission.id })) } }
  });
  const admin = await prisma.user.create({
    data: { email: `f4-admin-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: adminRole.id } } }
  });
  const readOnly = await prisma.user.create({
    data: { email: `f4-readonly-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: readOnlyRole.id } } }
  });
  const adminSession = await createSession(admin.id);
  const readOnlySession = await createSession(readOnly.id);
  return { suffix, adminRole, readOnlyRole, admin, readOnly, adminToken: adminSession.accessToken, readOnlyToken: readOnlySession.accessToken };
}

async function cleanup(runtime: SetupRuntime, f: Fixture) {
  await runtime.prisma.$transaction(async (database) => {
    await database.refreshSession.deleteMany({ where: { userId: { in: [f.admin.id, f.readOnly.id] } } });
    await database.auditLog.deleteMany({ where: { actorUserId: { in: [f.admin.id, f.readOnly.id] } } });
    await database.promotion.deleteMany({ where: { key: { startsWith: `f4-promo-${f.suffix}` } } });
    await database.dealer.deleteMany({ where: { code: { startsWith: `F4-D-${f.suffix}` } } });
    await database.userRole.deleteMany({ where: { userId: { in: [f.admin.id, f.readOnly.id] } } });
    await database.user.deleteMany({ where: { id: { in: [f.admin.id, f.readOnly.id] } } });
    await database.rolePermission.deleteMany({ where: { roleId: { in: [f.adminRole.id, f.readOnlyRole.id] } } });
    await database.role.deleteMany({ where: { id: { in: [f.adminRole.id, f.readOnlyRole.id] } } });
  });
}

function auth(token: string, requestId = `f4-${randomUUID()}`) {
  return { authorization: `Bearer ${token}`, "X-Request-Id": requestId };
}

const DEALER_WRITE_RULE_PERMISSIONS: Record<string, string> = {
  "POST /dashboard/dealers": "settings.write",
  "PATCH /dashboard/dealers/:id": "settings.write",
  "POST /dashboard/dealers/:id/locations": "settings.write",
  "PATCH /dashboard/dealer-locations/:id": "settings.write",
  "POST /dashboard/dealers/:id/erp-links": "settings.write",
  "DELETE /dashboard/dealers/:dealerId/erp-links/:linkId": "settings.write"
};

test("F4 dealer/location/ERP-link write routes require settings.write", async () => {
  const { DASHBOARD_PERMISSION_RULES } = await import("./access.js");
  const remaining = { ...DEALER_WRITE_RULE_PERMISSIONS };
  for (const rule of DASHBOARD_PERMISSION_RULES) {
    const key = `${rule.method} ${rule.path}`;
    if (key in remaining) {
      assert.equal(rule.permission, remaining[key]);
      delete remaining[key];
    }
  }
  assert.deepEqual(Object.keys(remaining), [], "every dealer management route must be permission-listed with settings.write");
});

test("F4 promotion status accepts only draft, active or archived", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const createInvalid = await runtime.app.request("/api/v1/dashboard/promotions", {
      method: "POST", headers: auth(f.adminToken),
      body: JSON.stringify({ key: `f4-promo-${f.suffix}-bad`, name: "F4 Bad", status: "inactive" })
    });
    assert.equal(createInvalid.status, 400);

    const created = await runtime.app.request("/api/v1/dashboard/promotions", {
      method: "POST", headers: auth(f.adminToken),
      body: JSON.stringify({ key: `f4-promo-${f.suffix}`, name: "F4 Promo", status: "draft" })
    });
    assert.equal(created.status, 201);
    const promotion = (await created.json() as { data: { id: string; status: string } }).data;
    assert.equal(promotion.status, "draft");

    const patchInvalid = await runtime.app.request(`/api/v1/dashboard/promotions/${promotion.id}`, {
      method: "PATCH", headers: auth(f.adminToken),
      body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(patchInvalid.status, 400);

    const patched = await runtime.app.request(`/api/v1/dashboard/promotions/${promotion.id}`, {
      method: "PATCH", headers: auth(f.adminToken),
      body: JSON.stringify({ status: "archived" })
    });
    assert.equal(patched.status, 200);
    const patchedBody = await patched.json() as { data: { status: string } };
    assert.equal(patchedBody.data.status, "archived");
  } finally {
    await cleanup(runtime, f);
  }
});

async function createDealerWithLocationAndLink(runtime: SetupRuntime, f: Fixture) {
  const dealerRes = await runtime.app.request("/api/v1/dashboard/dealers", {
    method: "POST", headers: auth(f.adminToken),
    body: JSON.stringify({ code: `F4-D-${f.suffix}`, name: "F4 Dealer" })
  });
  assert.equal(dealerRes.status, 201);
  const dealer = (await dealerRes.json() as { data: { id: string } }).data;
  const locationRes = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/locations`, {
    method: "POST", headers: auth(f.adminToken),
    body: JSON.stringify({
      code: "MAIN", name: "Main Store", addressLine1: "1 Main St", addressLine2: "Unit 2",
      city: "Winnipeg", province: "MB", postalCode: "R3C 0A1", country: "CA",
      pickupAvailable: true, deliveryAvailable: false
    })
  });
  assert.equal(locationRes.status, 201);
  const location = (await locationRes.json() as { data: { id: string } }).data;
  const linkRes = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/erp-links`, {
    method: "POST", headers: auth(f.adminToken),
    body: JSON.stringify({ erpSystem: "vanstro-erp", erpLocationId: "EXT-1", dealerLocationId: location.id })
  });
  assert.equal(linkRes.status, 201);
  const link = (await linkRes.json() as { data: { id: string } }).data;
  return { dealer, location, link };
}

test("F4 dealer detail returns full safe location fields and safe ERP links", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { dealer } = await createDealerWithLocationAndLink(runtime, f);
    const detailRes = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    assert.equal(detailRes.status, 200);
    const detail = (await detailRes.json() as { data: {
      locations: Array<Record<string, unknown>>;
      erpLinks: Array<Record<string, unknown>>;
    } }).data;
    assert.equal(detail.locations.length, 1);
    const location = detail.locations[0];
    assert.equal(location.addressLine1, "1 Main St");
    assert.equal(location.addressLine2, "Unit 2");
    assert.equal(location.city, "Winnipeg");
    assert.equal(location.province, "MB");
    assert.equal(location.postalCode, "R3C 0A1");
    assert.equal(location.country, "CA");
    assert.equal(location.status, "active");
    assert.equal(location.pickupAvailable, true);
    assert.equal(location.deliveryAvailable, false);
    assert.equal(typeof location.createdAt, "string");
    assert.equal(typeof location.updatedAt, "string");

    assert.equal(detail.erpLinks.length, 1);
    const link = detail.erpLinks[0];
    assert.equal(link.erpSystem, "vanstro-erp");
    assert.equal(link.erpLocationId, "EXT-1");
    assert.equal(link.dealerLocationId, location.id);
    assert.equal(typeof link.createdAt, "string");
    assert.equal(typeof link.updatedAt, "string");

    const serialized = JSON.stringify(detail).toLowerCase();
    for (const leaked of ["password", "secret", "credential", "token", "api_key", "apikey"]) {
      assert.ok(!serialized.includes(leaked), `dealer detail DTO must not expose ${leaked}`);
    }
  } finally {
    await cleanup(runtime, f);
  }
});

test("F4 location archive/restore is a soft status PATCH and invalid status is rejected", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { dealer, location } = await createDealerWithLocationAndLink(runtime, f);

    const archive = await runtime.app.request(`/api/v1/dashboard/dealer-locations/${location.id}`, {
      method: "PATCH", headers: auth(f.adminToken), body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(archive.status, 200);

    const afterArchive = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    const archivedDetail = await afterArchive.json() as { data: { locations: Array<{ id: string; status: string }> } };
    assert.equal(archivedDetail.data.locations[0].status, "inactive");

    const restore = await runtime.app.request(`/api/v1/dashboard/dealer-locations/${location.id}`, {
      method: "PATCH", headers: auth(f.adminToken), body: JSON.stringify({ status: "active" })
    });
    assert.equal(restore.status, 200);

    const afterRestore = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    const restoredDetail = await afterRestore.json() as { data: { locations: Array<{ id: string; status: string }> } };
    assert.equal(restoredDetail.data.locations[0].status, "active");

    const invalid = await runtime.app.request(`/api/v1/dashboard/dealer-locations/${location.id}`, {
      method: "PATCH", headers: auth(f.adminToken), body: JSON.stringify({ status: "archived" })
    });
    assert.equal(invalid.status, 400);
  } finally {
    await cleanup(runtime, f);
  }
});

test("F4 ERP links add/list/unlink round-trip through the dealer detail", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { dealer, link } = await createDealerWithLocationAndLink(runtime, f);

    const list = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    const listed = await list.json() as { data: { erpLinks: Array<{ id: string }> } };
    assert.ok(listed.data.erpLinks.some((entry) => entry.id === link.id));

    const unlink = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/erp-links/${link.id}`, {
      method: "DELETE", headers: auth(f.adminToken)
    });
    assert.equal(unlink.status, 200);

    const after = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    const afterBody = await after.json() as { data: { erpLinks: Array<{ id: string }> } };
    assert.equal(afterBody.data.erpLinks.some((entry) => entry.id === link.id), false);

    const missing = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/erp-links/${link.id}`, {
      method: "DELETE", headers: auth(f.adminToken)
    });
    assert.equal(missing.status, 404);
  } finally {
    await cleanup(runtime, f);
  }
});

test("F4 partial admin can read dealer detail but every write is 403", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { dealer, location, link } = await createDealerWithLocationAndLink(runtime, f);

    const read = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.readOnlyToken) });
    assert.equal(read.status, 200);

    const createLocation = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/locations`, {
      method: "POST", headers: auth(f.readOnlyToken),
      body: JSON.stringify({ code: "B", name: "Blocked" })
    });
    assert.equal(createLocation.status, 403);

    const patchLocation = await runtime.app.request(`/api/v1/dashboard/dealer-locations/${location.id}`, {
      method: "PATCH", headers: auth(f.readOnlyToken), body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(patchLocation.status, 403);

    const createLink = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/erp-links`, {
      method: "POST", headers: auth(f.readOnlyToken),
      body: JSON.stringify({ erpSystem: "vanstro-erp", erpLocationId: "EXT-2" })
    });
    assert.equal(createLink.status, 403);

    const unlink = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/erp-links/${link.id}`, {
      method: "DELETE", headers: auth(f.readOnlyToken)
    });
    assert.equal(unlink.status, 403);

    const after = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    const afterBody = await after.json() as { data: { erpLinks: Array<{ id: string }>; locations: Array<{ status: string }> } };
    assert.ok(afterBody.data.erpLinks.some((entry) => entry.id === link.id), "partial admin unlink must not succeed");
    assert.equal(afterBody.data.locations[0].status, "active", "partial admin archive must not succeed");
  } finally {
    await cleanup(runtime, f);
  }
});
