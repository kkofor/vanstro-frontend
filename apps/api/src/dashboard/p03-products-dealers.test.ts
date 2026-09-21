import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { createApp } from "../app.js";
import { createSession } from "../auth/session.js";
import { loadApiConfig } from "../config.js";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function fixture() {
  const suffix = randomUUID();
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ["dashboard.access", "products.read", "dealers.read"] } },
    select: { id: true }
  });
  assert.equal(permissions.length, 3);
  const role = await prisma.role.create({
    data: {
      key: `p03-adapter-${suffix}`,
      name: "P03 adapter test",
      rolePermissions: { create: permissions.map(({ id }) => ({ permissionId: id })) }
    }
  });
  const user = await prisma.user.create({
    data: { email: `p03-adapter-${suffix}@example.test`, kind: "admin", status: "active", userRoles: { create: { roleId: role.id } } }
  });
  const dealerA = await prisma.dealer.create({ data: { code: `P03-A-${suffix}`, name: `P03 Same ${suffix}`, status: "active" } });
  const dealerB = await prisma.dealer.create({ data: { code: `P03-B-${suffix}`, name: `P03 Same ${suffix}`, status: "active" } });
  const session = await createSession(user.id);
  return { role, user, dealerA, dealerB, token: session.accessToken };
}

async function cleanup(value: Fixture) {
  await prisma.$transaction(async (database) => {
    await database.refreshSession.deleteMany({ where: { userId: value.user.id } });
    await database.dealer.deleteMany({ where: { id: { in: [value.dealerA.id, value.dealerB.id] } } });
    await database.userRole.deleteMany({ where: { userId: value.user.id } });
    await database.user.delete({ where: { id: value.user.id } });
    await database.rolePermission.deleteMany({ where: { roleId: value.role.id } });
    await database.role.delete({ where: { id: value.role.id } });
  });
}

function headers(value: Fixture, requestId = `p03-${randomUUID()}`) {
  return { authorization: `Bearer ${value.token}`, "X-Request-Id": requestId };
}

test("dashboard authorization advertises exact common-query capability", async () => {
  const value = await fixture();
  const valid = JSON.stringify({ activeKid: "test", keys: [{ kid: "test", key: randomBytes(32).toString("base64"), mode: "active" }] });
  loadApiConfig({ ...process.env, VANSTRO_RUNTIME_MODE: "test", DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "true", DASHBOARD_COMMON_QUERY_DEALERS_READY: "true", DATABASE_URL: process.env.DATABASE_URL, PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET, DASHBOARD_QUERY_CURSOR_KEYS: valid });
  try {
    const response = await app.request("/api/v1/dashboard/authorization", { headers: headers(value) });
    assert.equal(response.status, 200);
    const body = await response.json() as { data: { commonQueryV1: unknown } };
    assert.deepEqual(body.data.commonQueryV1, { products: { enabled: true }, dealers: { enabled: true } });
  } finally { await cleanup(value); }
});

test("invalid or missing startup cursor keyset disables Dealers capability", async () => {
  const value = await fixture();
  try {
    loadApiConfig({ ...process.env, VANSTRO_RUNTIME_MODE: "test", DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "true", DASHBOARD_COMMON_QUERY_DEALERS_READY: "false", DATABASE_URL: process.env.DATABASE_URL, PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET, DASHBOARD_QUERY_CURSOR_KEYS: "" });
    const response = await app.request("/api/v1/dashboard/authorization", { headers: headers(value) });
    const body = await response.json() as { data: { commonQueryV1: unknown } };
    assert.deepEqual(body.data.commonQueryV1, { products: { enabled: true }, dealers: { enabled: false } });
  } finally { await cleanup(value); }
});

test("Products and Dealers readiness flags support all four server-owned combinations", async () => {
  const value = await fixture(); const keyset = JSON.stringify({ activeKid:"test", keys:[{kid:"test",key:randomBytes(32).toString("base64"),mode:"active"}] });
  try { for (const [products,dealers] of [[false,false],[true,false],[false,true],[true,true]] as const) {
    loadApiConfig({ ...process.env,VANSTRO_RUNTIME_MODE:"test",DATABASE_URL:process.env.DATABASE_URL,PAYMENT_CALLBACK_SECRET:process.env.PAYMENT_CALLBACK_SECRET,DASHBOARD_COMMON_QUERY_PRODUCTS_READY:String(products),DASHBOARD_COMMON_QUERY_DEALERS_READY:String(dealers),DASHBOARD_QUERY_CURSOR_KEYS:dealers?keyset:"" });
    const response=await app.request("/api/v1/dashboard/authorization",{headers:headers(value)}); const body=await response.json() as {data:{commonQueryV1:unknown}};
    assert.deepEqual(body.data.commonQueryV1,{products:{enabled:products},dealers:{enabled:dealers}});
  }} finally { await cleanup(value); }
});

test("P03 Products preserves legacy shape and strictly validates common-query.v1", async () => {
  const value = await fixture();
  try {
    const legacy = await app.request("/api/v1/dashboard/products?page=1&pageSize=1&unknown=ignored", { headers: headers(value) });
    assert.equal(legacy.status, 200);
    const legacyBody = await legacy.json() as { meta: Record<string, unknown> };
    assert.deepEqual(Object.keys(legacyBody.meta).sort(), ["page", "pageSize", "total", "totalPages"]);

    const requestId = `p03-products-${randomUUID()}`;
    const strict = await app.request("/api/v1/dashboard/products?queryVersion=common-query.v1&limit=1&offset=0&sort=createdAt&direction=desc", { headers: headers(value, requestId) });
    assert.equal(strict.status, 200);
    const body = await strict.json() as { data: Array<Record<string, unknown>>; meta: { requestId: string; pagination: { mode: string; limit: number }; sort: Array<{ field: string }> } };
    assert.equal(body.meta.requestId, requestId);
    assert.deepEqual(body.meta.pagination, { mode: "offset", limit: 1, offset: 0, hasNext: true, hasPrevious: false });
    assert.deepEqual(body.meta.sort.map(({ field }) => field), ["createdAt", "id"]);
    assert.equal(body.data.some((row) => "documents" in row || "supportLinks" in row), false);

    const invalid = await app.request("/api/v1/dashboard/products?queryVersion=common-query.v1&offset=10001", { headers: headers(value) });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json() as { code: string }).code, "QUERY_DEPTH_EXCEEDED");

    const literal = `p03-literal-${randomUUID()}_%`;
    const product = await prisma.product.create({ data: { slug: literal, name: literal, status: "draft" } });
    try {
      const literalSearch = await app.request(`/api/v1/dashboard/products?queryVersion=common-query.v1&q=${encodeURIComponent(literal)}`, { headers: headers(value) });
      const rows = (await literalSearch.json() as { data: Array<{ id: string }> }).data;
      assert.deepEqual(rows.map(({ id }) => id), [product.id]);
      const wildcardSearch = await app.request(`/api/v1/dashboard/products?queryVersion=common-query.v1&q=${encodeURIComponent("__%")}`, { headers: headers(value) });
      assert.equal((await wildcardSearch.json() as { data: Array<unknown> }).data.length, 0);
      const nonAscii = await prisma.product.create({ data: { slug: `ascii-${randomUUID()}`, name: "abcßsuffix", status: "draft" } });
      try {
        const asciiSearch = await app.request(`/api/v1/dashboard/products?queryVersion=common-query.v1&q=abc`, { headers: headers(value) });
        assert.equal((await asciiSearch.json() as { data: Array<{id:string}> }).data.some(({id})=>id===nonAscii.id), false);
      } finally { await prisma.product.delete({where:{id:nonAscii.id}}); }
    } finally { await prisma.product.delete({ where: { id: product.id } }); }
  } finally { await cleanup(value); }
});

test("P03 Dealers uses opaque stable cursor and binds it to the canonical query", async () => {
  const value = await fixture();
  const previousKey = process.env.DASHBOARD_QUERY_CURSOR_KEYS;
  process.env.DASHBOARD_QUERY_CURSOR_KEYS = JSON.stringify({ activeKid: "test", keys: [{ kid: "test", key: randomBytes(32).toString("base64"), mode: "active" }] });
  loadApiConfig({ ...process.env, VANSTRO_RUNTIME_MODE: "test", DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "true", DASHBOARD_COMMON_QUERY_DEALERS_READY: "true", DATABASE_URL: process.env.DATABASE_URL, PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET });
  try {
    const q = "";
    const first = await app.request(`/api/v1/dashboard/dealers?queryVersion=common-query.v1&limit=1${q ? `&q=${q}` : ""}`, { headers: headers(value) });
    assert.equal(first.status, 200);
    const firstBody = await first.json() as { data: Array<{ id: string }>; meta: { pagination: { nextCursor: string; hasMore: boolean }; sort: Array<{ field: string }> } };
    assert.equal(firstBody.data.length, 1);
    assert.equal(firstBody.meta.pagination.hasMore, true);
    assert.deepEqual(firstBody.meta.sort.map(({ field }) => field), ["recordId"]);
    assert.ok(!firstBody.meta.pagination.nextCursor.includes(value.dealerA.id));
    const wildcard = await app.request(`/api/v1/dashboard/dealers?queryVersion=common-query.v1&q=${encodeURIComponent("__%")}`, { headers: headers(value) });
    assert.equal((await wildcard.json() as { data: Array<unknown> }).data.length, 0);

    const second = await app.request(`/api/v1/dashboard/dealers?queryVersion=common-query.v1&limit=1${q ? `&q=${q}` : ""}&after=${encodeURIComponent(firstBody.meta.pagination.nextCursor)}`, { headers: headers(value) });
    assert.equal(second.status, 200, await second.clone().text());
    const secondBody = await second.json() as { data: Array<{ id: string }> };
    assert.equal(secondBody.data.length, 1);
    assert.notEqual(secondBody.data[0]!.id, firstBody.data[0]!.id);

    const replay = await app.request(`/api/v1/dashboard/dealers?queryVersion=common-query.v1&limit=2${q ? `&q=${q}` : ""}&after=${encodeURIComponent(firstBody.meta.pagination.nextCursor)}`, { headers: headers(value) });
    assert.equal(replay.status, 400);
    assert.equal((await replay.json() as { code: string }).code, "CURSOR_INVALID");

    const tampered = `${firstBody.meta.pagination.nextCursor.slice(0, -1)}${firstBody.meta.pagination.nextCursor.endsWith("A") ? "B" : "A"}`;
    const invalid = await app.request(`/api/v1/dashboard/dealers?queryVersion=common-query.v1&limit=1${q ? `&q=${q}` : ""}&after=${encodeURIComponent(tampered)}`, { headers: headers(value) });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json() as { code: string }).code, "CURSOR_INVALID");

    const dealersRead = await prisma.permission.findUniqueOrThrow({ where: { key: "dealers.read" }, select: { id: true } });
    await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId: value.role.id, permissionId: dealersRead.id } } });
    const revoked = await app.request(`/api/v1/dashboard/dealers?queryVersion=common-query.v1&limit=1${q ? `&q=${q}` : ""}&after=${encodeURIComponent(tampered)}`, { headers: headers(value) });
    assert.equal(revoked.status, 403);
    assert.equal((await revoked.json() as { code: string }).code, "DASHBOARD_FORBIDDEN");
  } finally {
    if (previousKey === undefined) delete process.env.DASHBOARD_QUERY_CURSOR_KEYS;
    else process.env.DASHBOARD_QUERY_CURSOR_KEYS = previousKey;
    await cleanup(value);
  }
});
