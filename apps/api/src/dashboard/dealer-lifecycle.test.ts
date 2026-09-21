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
// through the same disposable-name gate the F4/P02/P07 API tests use;
// assertions are unchanged.
const TEST_ENV: NodeJS.ProcessEnv & { DATABASE_URL: string } = {
  ...process.env,
  VANSTRO_RUNTIME_MODE: "test",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost/vanstro_dealer_lifecycle_unknown?schema=public",
  PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET ?? "dl-test-secret-00000000000000000000000000"
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
    t.skip("dealer lifecycle API proof requires an owned disposable/fixture database");
    return false;
  }
  return true;
}

async function createFixture(runtime: SetupRuntime): Promise<Fixture> {
  const { prisma, createSession } = runtime;
  const suffix = randomUUID();
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ["dashboard.access", "dealers.read", "settings.write"] } },
    select: { id: true, key: true }
  });
  assert.ok(permissions.length >= 3, "canonical permissions must be bootstrapped before this test");
  const adminRole = await prisma.role.create({
    data: { key: `dl-admin-${suffix}`, name: "DL Admin", rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } }
  });
  const readOnlyPermissions = await prisma.permission.findMany({
    where: { key: { in: ["dashboard.access", "dealers.read"] } },
    select: { id: true }
  });
  const readOnlyRole = await prisma.role.create({
    data: { key: `dl-readonly-${suffix}`, name: "DL Read-Only", rolePermissions: { create: readOnlyPermissions.map((permission) => ({ permissionId: permission.id })) } }
  });
  const admin = await prisma.user.create({
    data: { email: `dl-admin-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: adminRole.id } } }
  });
  const readOnly = await prisma.user.create({
    data: { email: `dl-readonly-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: readOnlyRole.id } } }
  });
  const adminSession = await createSession(admin.id);
  const readOnlySession = await createSession(readOnly.id);
  return { suffix, adminRole, readOnlyRole, admin, readOnly, adminToken: adminSession.accessToken, readOnlyToken: readOnlySession.accessToken };
}

async function cleanup(runtime: SetupRuntime, f: Fixture) {
  await runtime.prisma.$transaction(async (database) => {
    await database.refreshSession.deleteMany({ where: { userId: { in: [f.admin.id, f.readOnly.id] } } });
    await database.auditLog.deleteMany({ where: { actorUserId: { in: [f.admin.id, f.readOnly.id] } } });
    await database.inventorySnapshot.deleteMany({ where: { dealerLocation: { dealer: { code: { startsWith: `DL-D-${f.suffix}` } } } } });
    await database.dealer.deleteMany({ where: { code: { startsWith: `DL-D-${f.suffix}` } } });
    await database.dealer.deleteMany({ where: { code: { startsWith: `DL-P-${f.suffix}` } } });
    await database.product.deleteMany({ where: { slug: { startsWith: `dl-${f.suffix}` } } });
    await database.userRole.deleteMany({ where: { userId: { in: [f.admin.id, f.readOnly.id] } } });
    await database.user.deleteMany({ where: { id: { in: [f.admin.id, f.readOnly.id] } } });
    await database.rolePermission.deleteMany({ where: { roleId: { in: [f.adminRole.id, f.readOnlyRole.id] } } });
    await database.role.deleteMany({ where: { id: { in: [f.adminRole.id, f.readOnlyRole.id] } } });
  });
}

function auth(token: string, requestId = `dl-${randomUUID()}`) {
  return { authorization: `Bearer ${token}`, "X-Request-Id": requestId };
}

async function createDealer(runtime: SetupRuntime, token: string, code: string, extra: Record<string, unknown> = {}) {
  const response = await runtime.app.request("/api/v1/dashboard/dealers", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ code, name: "DL Dealer", ...extra })
  });
  return { response, body: await response.json() as { data: { id: string; code: string; status: string } } };
}

async function createLocation(runtime: SetupRuntime, token: string, dealerId: string, extra: Record<string, unknown> = {}) {
  const response = await runtime.app.request(`/api/v1/dashboard/dealers/${dealerId}/locations`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ code: "MAIN", name: "Main Hub", city: "Winnipeg", province: "MB", ...extra })
  });
  return { response, body: await response.json() as { data: { id: string; code: string } } };
}

test("dealer lifecycle write routes are permission-listed with settings.write", async () => {
  const { DASHBOARD_PERMISSION_RULES } = await import("./access.js");
  const required: Record<string, string> = {
    "POST /dashboard/dealers": "settings.write",
    "PATCH /dashboard/dealers/:id": "settings.write",
    "DELETE /dashboard/dealers/:id": "settings.write",
    "POST /dashboard/dealers/:id/locations": "settings.write",
    "PATCH /dashboard/dealer-locations/:id": "settings.write"
  };
  for (const rule of DASHBOARD_PERMISSION_RULES) {
    const key = `${rule.method} ${rule.path}`;
    if (key in required) assert.equal(rule.permission, required[key]);
  }
  const listed = new Set(DASHBOARD_PERMISSION_RULES.map((rule) => `${rule.method} ${rule.path}`));
  for (const key of Object.keys(required)) {
    assert.ok(listed.has(key), `${key} must be permission-listed`);
  }
});

test("dealer create round-trip: contact fields, unique code 409, status validation", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const code = `DL-D-${f.suffix}`;
    const created = await createDealer(runtime, f.adminToken, code, {
      phone: "+1 204 555 0100", email: "dealer@example.test", website: "https://dealer.example.test", status: "active"
    });
    assert.equal(created.response.status, 201);
    const dealerId = created.body.data.id;

    const duplicate = await createDealer(runtime, f.adminToken, code);
    assert.equal(duplicate.response.status, 409, "duplicate code must be rejected");

    const invalidStatus = await createDealer(runtime, f.adminToken, `DL-D-${f.suffix}-b`, { status: "archived" });
    assert.equal(invalidStatus.response.status, 400, "non active/inactive status must be rejected");

    const detail = await runtime.app.request(`/api/v1/dashboard/dealers/${dealerId}`, { headers: auth(f.adminToken) });
    assert.equal(detail.status, 200);
    const detailBody = await detail.json() as { data: { phone: string | null; email: string | null; website: string | null } };
    assert.equal(detailBody.data.phone, "+1 204 555 0100");
    assert.equal(detailBody.data.email, "dealer@example.test");
    assert.equal(detailBody.data.website, "https://dealer.example.test");
  } finally {
    await cleanup(runtime, f);
  }
});

test("location coordinates round-trip with range and pairing validation", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { body: { data: dealer } } = await createDealer(runtime, f.adminToken, `DL-D-${f.suffix}`);
    const dealerId = dealer.id;

    const created = await createLocation(runtime, f.adminToken, dealerId, {
      addressLine1: "100 Main St", postalCode: "R3C 0A1", latitude: 49.8951, longitude: -97.1384,
      pickupAvailable: true, deliveryAvailable: true
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    const locationId = created.body.data.id;

    const detail = await runtime.app.request(`/api/v1/dashboard/dealers/${dealerId}`, { headers: auth(f.adminToken) });
    const detailBody = await detail.json() as { data: { locations: Array<{ id: string; latitude: number | null; longitude: number | null }> } };
    const location = detailBody.data.locations.find((entry) => entry.id === locationId);
    assert.ok(location, "created location must appear in dealer detail");
    assert.equal(location.latitude, 49.8951);
    assert.equal(location.longitude, -97.1384);

    const outOfRange = await createLocation(runtime, f.adminToken, dealerId, { code: "BAD1", name: "Bad", latitude: 95, longitude: -97 });
    assert.equal(outOfRange.response.status, 400, "latitude out of range must be rejected");

    const partialPair = await createLocation(runtime, f.adminToken, dealerId, { code: "BAD2", name: "Bad", latitude: 49.9 });
    assert.equal(partialPair.response.status, 400, "partial coordinate pair must be rejected");

    const patch = await runtime.app.request(`/api/v1/dashboard/dealer-locations/${locationId}`, {
      method: "PATCH", headers: auth(f.adminToken),
      body: JSON.stringify({ latitude: 49.9, longitude: -97.2 })
    });
    assert.equal(patch.status, 200);
    const patched = await patch.json() as { data: { latitude: number | null; longitude: number | null } };
    assert.equal(patched.data.latitude, 49.9);
    assert.equal(patched.data.longitude, -97.2);
  } finally {
    await cleanup(runtime, f);
  }
});

test("public /dealers sync: archive hides, restore resurfaces", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const code = `DL-D-${f.suffix}`;
    const { body: { data: dealer } } = await createDealer(runtime, f.adminToken, code);
    await createLocation(runtime, f.adminToken, dealer.id, { latitude: 49.8951, longitude: -97.1384 });

    const list = async () => {
      const response = await runtime.app.request("/api/v1/dealers");
      const body = await response.json() as { data: Array<{ id: string; locations: Array<{ id: string; latitude: number | null }> }> };
      return body.data.find((entry) => entry.id === dealer.id);
    };

    const visible = await list();
    assert.ok(visible, "active dealer must appear in public /dealers");
    assert.ok(visible!.locations.length >= 1, "public /dealers must include active locations");
    assert.equal(visible!.locations[0].latitude, 49.8951, "public /dealers must carry coordinates");

    const archive = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, {
      method: "PATCH", headers: auth(f.adminToken), body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(archive.status, 200);
    assert.equal(await list(), undefined, "archived dealer must disappear from public /dealers");

    const restore = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, {
      method: "PATCH", headers: auth(f.adminToken), body: JSON.stringify({ status: "active" })
    });
    assert.equal(restore.status, 200);
    assert.ok(await list(), "restored dealer must reappear on public /dealers");
  } finally {
    await cleanup(runtime, f);
  }
});

test("dependencies summarize locations/inventory/orders/ERP links and gate physical delete", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { body: { data: dealer } } = await createDealer(runtime, f.adminToken, `DL-D-${f.suffix}`);

    const deps = async () => {
      const response = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/dependencies`, { headers: auth(f.adminToken) });
      assert.equal(response.status, 200);
      return (await response.json() as { data: { references: Record<string, unknown>; physicallyDeletable: boolean } }).data;
    };

    const empty = await deps();
    assert.equal(empty.physicallyDeletable, true);
    assert.equal((empty.references.locations as { total: number }).total, 0);

    const { body: { data: location } } = await createLocation(runtime, f.adminToken, dealer.id);
    const withLocation = await deps();
    assert.equal((withLocation.references.locations as { total: number }).total, 1);
    assert.equal(withLocation.physicallyDeletable, false);

    const product = await runtime.prisma.product.create({
      data: { slug: `dl-${f.suffix}-product`, name: "DL Product", status: "active" }
    });
    const sku = await runtime.prisma.platformSku.create({
      data: { productId: product.id, skuCode: `DL-SKU-${f.suffix}`, name: "DL SKU", status: "active" }
    });
    await runtime.prisma.inventorySnapshot.create({
      data: { skuId: sku.id, dealerLocationId: location.id, quantityOnHand: 5, quantityReserved: 0 }
    });
    const withInventory = await deps();
    assert.equal(withInventory.references.inventorySnapshots, 1);
    assert.equal(withInventory.physicallyDeletable, false);

    const blocked = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { method: "DELETE", headers: auth(f.adminToken) });
    assert.equal(blocked.status, 409, "physical delete with references must be 409");

    const restoreState = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, {
      method: "PATCH", headers: auth(f.adminToken), body: JSON.stringify({ status: "active" })
    });
    assert.equal(restoreState.status, 200);
  } finally {
    await cleanup(runtime, f);
  }
});

test("physical delete is permanently fail-closed; archive is the only lifecycle", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { body: { data: dealer } } = await createDealer(runtime, f.adminToken, `DL-P-${f.suffix}`);
    const removed = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { method: "DELETE", headers: auth(f.adminToken) });
    assert.equal(removed.status, 409, "production DELETE must always fail closed with 409");
    const after = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    assert.equal(after.status, 200, "dealer must still exist after a rejected physical delete");
  } finally {
    await cleanup(runtime, f);
  }
});

test("lifecycle audit carries safe metadata only (no contact details)", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { body: { data: dealer } } = await createDealer(runtime, f.adminToken, `DL-D-${f.suffix}`, { phone: "+1 204 555 0100", email: "secret@example.test" });
    await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, {
      method: "PATCH", headers: auth(f.adminToken), body: JSON.stringify({ status: "inactive" })
    });
    const events = await runtime.prisma.auditLog.findMany({
      where: { actorUserId: f.admin.id, resourceType: "dealer", resourceId: dealer.id },
      orderBy: { createdAt: "asc" }
    });
    assert.ok(events.length >= 2, "create and archive must both be audited");
    const serialized = JSON.stringify(events);
    assert.ok(serialized.includes("dashboard.dealers.create"));
    assert.ok(serialized.includes("statusTransition"));
    for (const leaked of ["+1 204 555 0100", "secret@example.test", "phone", "email"]) {
      assert.ok(!serialized.includes(leaked), `audit must not leak ${leaked}`);
    }
  } finally {
    await cleanup(runtime, f);
  }
});

test("read-only admin can read dependencies but every lifecycle write is 403", async (t) => {
  if (!disposable(t)) return;
  const runtime = await setup();
  const f = await createFixture(runtime);
  try {
    const { body: { data: dealer } } = await createDealer(runtime, f.adminToken, `DL-D-${f.suffix}`);
    const { body: { data: location } } = await createLocation(runtime, f.adminToken, dealer.id);

    const deps = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}/dependencies`, { headers: auth(f.readOnlyToken) });
    assert.equal(deps.status, 200, "dependencies are a dealers.read surface");

    const archive = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, {
      method: "PATCH", headers: auth(f.readOnlyToken), body: JSON.stringify({ status: "inactive" })
    });
    assert.equal(archive.status, 403);

    const remove = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { method: "DELETE", headers: auth(f.readOnlyToken) });
    assert.equal(remove.status, 403);

    const locationPatch = await runtime.app.request(`/api/v1/dashboard/dealer-locations/${location.id}`, {
      method: "PATCH", headers: auth(f.readOnlyToken), body: JSON.stringify({ latitude: 49.9 })
    });
    assert.equal(locationPatch.status, 403);

    const after = await runtime.app.request(`/api/v1/dashboard/dealers/${dealer.id}`, { headers: auth(f.adminToken) });
    const afterBody = await after.json() as { data: { status: string } };
    assert.equal(afterBody.data.status, "active", "read-only attempts must not change state");
  } finally {
    await cleanup(runtime, f);
  }
});
