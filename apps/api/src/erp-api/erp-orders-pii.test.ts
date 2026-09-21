import assert from "node:assert/strict";
import test, { before } from "node:test";
import { Prisma, prisma } from "@vanstro/db";
import { S08_COMPILED_VALUE } from "../dashboard/s08-settings.js";
import { createApp } from "../app.js";

/**
 * V11-R1 — ERP v1 order PII gating regression. Requires the disposable PG16
 * fixture from scripts/test-api-regular-pg16.sh (seeded super admin +
 * prisma db push). Verifies the /v1/orders runtime contract:
 *   1. a service account token WITHOUT erp.orders.pii gets the existing safe
 *      DTO (200, every PII field absent — never a 403);
 *   2. a token WITH erp.orders.pii gets all 13 contract PII/payment fields
 *      (9 Order-owned + providerPaymentId and the four shipping* fields read
 *      from the payment session);
 *   3. guestOrderToken / guestTokenExpiresAt / guestTokenRevokedAt never
 *      cross the wire under either permission;
 *   4. the four address fields come from the (nullable) payment session, and
 *      null session values serialize as null — never an error.
 * The ticket prose says "14 fields"; the enumerated contract lists exactly 13
 * (9 Order + 4 payment-session), and the landed OpenAPI DTO matches 13.
 */

const app = createApp();
const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
const password = process.env.SUPER_ADMIN_PASSWORD;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const idempotent = (prefix: string) => `${prefix}-${suffix}-${Math.random().toString(36).slice(2, 8)}`;

// Contract PII/payment field set (camelCase, wire keys).
const PII_ORDER_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "notes",
  "shippingAddressLine1",
  "shippingAddressLine2",
  "paymentMethod",
  "providerPaymentId"
] as const;
const PII_SESSION_FIELDS = ["shippingCity", "shippingProvince", "shippingPostalCode", "shippingCountry"] as const;
const PII_FIELDS = [...PII_ORDER_FIELDS, ...PII_SESSION_FIELDS];

// Guest-token regression: never returned, with or without erp.orders.pii.
const GUEST_TOKEN_FIELDS = ["guestOrderToken", "guestTokenExpiresAt", "guestTokenRevokedAt"] as const;

const SAFE_ORDER_FIELDS = [
  "id",
  "status",
  "fulfillment",
  "currency",
  "subtotalCents",
  "discountCents",
  "taxCents",
  "shippingCents",
  "totalCents",
  "dealerId",
  "dealerLocationId",
  "createdAt",
  "updatedAt",
  "items"
] as const;

const ERP_ORDERS_URL = "/api/v1/integrations/erp/v1/orders";

type FixtureOrder = {
  id: string;
  guestOrderToken: string;
  sessionGuestOrderToken: string;
};

let sharedToken: string | null = null;
let noPiiToken = "";
let piiToken = "";
let orderA: FixtureOrder;
let orderB: FixtureOrder;

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

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

// Service account created through the dashboard API (super admin) with the
// role attached directly via prisma — attached AFTER the token is created so
// the token-create ceiling check (assertManageableServiceAccounts, which
// requires the admin to hold every permission on the account's roles) never
// trips on the brand-new erp.orders.pii permission. Principal permissions
// resolve dynamically per request, so the token sees the role immediately.
async function createAccountWithRole(adminToken: string, key: string, roleId: string) {
  const response = await app.request("/api/v1/dashboard/mcp/service-accounts", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ key, name: `PII gating ${key}` })
  });
  assert.equal(response.status, 201, `service account create ${key}: ${response.status}`);
  const body = (await response.json()) as { data: { id: string } };
  const token = await createToken(adminToken, body.data.id);
  await prisma.serviceAccountRole.create({ data: { serviceAccountId: body.data.id, roleId } });
  return token;
}

async function createToken(adminToken: string, accountId: string) {
  const response = await app.request(`/api/v1/dashboard/mcp/service-accounts/${accountId}/tokens`, {
    method: "POST",
    headers: { ...authHeaders(adminToken), "idempotency-key": idempotent("piitok") },
    body: JSON.stringify({ name: "pii-gating" })
  });
  assert.equal(response.status, 201, `token create: ${response.status}`);
  const body = (await response.json()) as { data: { plaintext: string } };
  assert.match(body.data.plaintext, /^vsa_/);
  return body.data.plaintext;
}

async function createOrder(over: {
  order: PrismaOrderCreate;
  session: PrismaPaymentSessionCreate;
  guestOrderToken: string;
  sessionGuestOrderToken: string;
}): Promise<FixtureOrder> {
  const session = await prisma.paymentSession.create({ data: over.session });
  const order = await prisma.order.create({ data: { ...over.order, paymentSessionId: session.id } });
  return {
    id: order.id,
    guestOrderToken: over.guestOrderToken,
    sessionGuestOrderToken: over.sessionGuestOrderToken
  };
}

type PrismaOrderCreate = Omit<Prisma.OrderUncheckedCreateInput, "paymentSessionId">;
type PrismaPaymentSessionCreate = Prisma.PaymentSessionUncheckedCreateInput;

async function publishPiiCompatibleS08(adminToken: string, denySensitivePermissionsByDefault = false) {
  const readiness = await app.request("/api/v1/dashboard/settings/s08-readiness", { headers: { authorization: `Bearer ${adminToken}` } });
  assert.equal(readiness.status, 200);
  const { data: { publicationCas } } = (await readiness.json()) as { data: { publicationCas: number | null } };
  const value = {
    ...S08_COMPILED_VALUE,
    machineScopePolicy: { ...S08_COMPILED_VALUE.machineScopePolicy, denySensitivePermissionsByDefault }
  };
  const idempotencyKey = idempotent("piis08create");
  const draftResponse = await app.request("/api/v1/dashboard/settings/s08-drafts", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ descriptorKey: "settings.api-service-account", expectedPublishedVersion: publicationCas ?? 0, value, changeReason: "ERP PII gating fixture", idempotencyKey })
  });
  assert.equal(draftResponse.status, 201, `S08 fixture draft: ${draftResponse.status}`);
  const draft = (await draftResponse.json()) as { data: { id: string; version: number } };
  const validateResponse = await app.request(`/api/v1/dashboard/settings/s08-drafts/${draft.data.id}/validate`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ expectedVersion: draft.data.version, idempotencyKey: idempotent("piis08validate") })
  });
  assert.equal(validateResponse.status, 200, `S08 fixture validate: ${validateResponse.status}`);
  const validated = (await validateResponse.json()) as { data: { draftVersion: number } };
  const publishResponse = await app.request(`/api/v1/dashboard/settings/s08-drafts/${draft.data.id}/publish`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ expectedVersion: validated.data.draftVersion, idempotencyKey: idempotent("piis08publish") })
  });
  assert.equal(publishResponse.status, 200, `S08 fixture publish: ${publishResponse.status}`);
}

async function seedFixture(adminToken: string) {
  // Machine permissions used by the ERP v1 routes (base cli.access + the new
  // erp.orders.pii gate). skipDuplicates keeps a shared fixture harmless.
  await prisma.permission.createMany({
    data: [
      { key: "cli.access", description: "cli.access" },
      { key: "erp.orders.pii", description: "erp.orders.pii" }
    ],
    skipDuplicates: true
  });
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ["cli.access", "erp.orders.pii"] } },
    select: { id: true, key: true }
  });
  const permissionId: Record<string, string> = {};
  for (const entry of permissions) {
    permissionId[entry.key] = entry.id;
  }
  const cliAccessPermissionId = permissionId["cli.access"];
  const ordersPiiPermissionId = permissionId["erp.orders.pii"];
  assert.ok(cliAccessPermissionId && ordersPiiPermissionId, "machine permissions cli.access/erp.orders.pii must exist");
  const cliOnlyRole = await prisma.role.create({
    data: {
      key: `pii-cli-${suffix}`,
      name: `PII cli-only ${suffix}`,
      rolePermissions: { create: [{ permissionId: cliAccessPermissionId }] }
    }
  });
  const fullRole = await prisma.role.create({
    data: {
      key: `pii-full-${suffix}`,
      name: `PII full ${suffix}`,
      rolePermissions: {
        create: [
          { permissionId: cliAccessPermissionId },
          { permissionId: ordersPiiPermissionId }
        ]
      }
    }
  });

  noPiiToken = await createAccountWithRole(adminToken, `pii-sa-nopii-${suffix}`, cliOnlyRole.id);
  piiToken = await createAccountWithRole(adminToken, `pii-sa-full-${suffix}`, fullRole.id);

  // Order A: full PII values. The four shipping* columns are set to
  // DIFFERENT values on Order vs PaymentSession so the response proves the
  // payment session is the source of truth (providerPaymentId lives on
  // PaymentSession in the schema, not on Order as the ticket prose says).
  const guestA = `pii-order-token-a-${suffix}`;
  const sessionGuestA = `pii-session-token-a-${suffix}`;
  orderA = await createOrder({
    order: {
      status: "paid",
      fulfillment: "pickup",
      currency: "CAD",
      email: `pii-order-a-${suffix}@example.test`,
      firstName: "OrderFirst-A",
      lastName: "OrderLast-A",
      phone: "514-555-0101",
      guestOrderToken: guestA,
      paymentMethod: "card",
      notes: "PII order notes A",
      shippingAddressLine1: "Order Line1 A",
      shippingAddressLine2: "Order Line2 A",
      shippingCity: "OrderCity-A",
      shippingProvince: "OrderProvince-A",
      shippingPostalCode: "O1O-1O1",
      shippingCountry: "US",
      subtotalCents: 10000,
      discountCents: 0,
      taxCents: 1500,
      shippingCents: 0,
      totalCents: 11500,
      items: {
        create: [
          { skuCode: `PII-SKU-A-${suffix}`, productName: "PII Product A", quantity: 1, unitPriceCents: 10000, lineTotalCents: 10000 }
        ]
      }
    },
    session: {
      guestEmail: `pii-session-a-${suffix}@example.test`,
      guestFirstName: "SessionFirst-A",
      guestLastName: "SessionLast-A",
      guestPhone: "514-555-0202",
      guestOrderToken: sessionGuestA,
      status: "paid",
      fulfillment: "pickup",
      paymentMethod: "card",
      items: { lines: [] },
      subtotalCents: 10000,
      taxCents: 1500,
      shippingCents: 0,
      totalCents: 11500,
      currency: "CAD",
      providerPaymentId: `provider-a-${suffix}`,
      shippingCity: "SessionCity-A",
      shippingProvince: "SessionProvince-A",
      shippingPostalCode: "S1S-1S1",
      shippingCountry: "CA",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    guestOrderToken: guestA,
    sessionGuestOrderToken: sessionGuestA
  });

  // Order B: payment session with NULL shipping*/providerPaymentId columns
  // (the closest reachable stand-in for a missing session — orders.paymentSessionId
  // is NOT NULL with a RESTRICT FK, so a fully-absent session cannot exist in
  // this schema). The Order row itself carries non-null contrast values, so a
  // wrong source (Order columns) would leak them; the response must be null.
  const guestB = `pii-order-token-b-${suffix}`;
  const sessionGuestB = `pii-session-token-b-${suffix}`;
  orderB = await createOrder({
    order: {
      status: "paid",
      fulfillment: "pickup",
      currency: "CAD",
      email: `pii-order-b-${suffix}@example.test`,
      firstName: "OrderFirst-B",
      lastName: "OrderLast-B",
      phone: "514-555-0303",
      guestOrderToken: guestB,
      paymentMethod: "cash",
      notes: null,
      shippingAddressLine1: null,
      shippingAddressLine2: null,
      shippingCity: "OrderCity-B",
      shippingProvince: "OrderProvince-B",
      shippingPostalCode: "O2O-2O2",
      shippingCountry: "US",
      subtotalCents: 5000,
      discountCents: 0,
      taxCents: 750,
      shippingCents: 0,
      totalCents: 5750
    },
    session: {
      guestEmail: `pii-session-b-${suffix}@example.test`,
      guestFirstName: "SessionFirst-B",
      guestLastName: "SessionLast-B",
      guestPhone: "514-555-0404",
      guestOrderToken: sessionGuestB,
      status: "paid",
      fulfillment: "pickup",
      paymentMethod: "cash",
      items: { lines: [] },
      subtotalCents: 5000,
      taxCents: 750,
      shippingCents: 0,
      totalCents: 5750,
      currency: "CAD",
      providerPaymentId: null,
      shippingCity: null,
      shippingProvince: null,
      shippingPostalCode: null,
      shippingCountry: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    guestOrderToken: guestB,
    sessionGuestOrderToken: sessionGuestB
  });
}

before(async () => {
  if (!password) return;
  sharedToken = await login();
  await publishPiiCompatibleS08(sharedToken);
  await seedFixture(sharedToken);
});

async function listOrders(token: string) {
  const response = await app.request(ERP_ORDERS_URL, { headers: { authorization: `Bearer ${token}` } });
  const body = (await response.json()) as { data?: { items: Array<Record<string, unknown>>; nextCursor: string | null } };
  return { response, body };
}

function findItem(body: { data?: { items: Array<Record<string, unknown>> } }, id: string) {
  return body.data?.items.find((item) => item.id === id);
}

test("ERP orders PII 01: token without erp.orders.pii gets 200 safe DTO with every PII field absent", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const { response, body } = await listOrders(noPiiToken);
  assert.equal(response.status, 200, "missing PII permission must degrade to the safe DTO, never 403");
  const item = findItem(body, orderA.id);
  assert.ok(item, "seeded order must be listed");
  for (const field of PII_FIELDS) {
    assert.equal(field in item, false, `PII field ${field} must be absent without erp.orders.pii`);
  }
  for (const field of SAFE_ORDER_FIELDS) {
    assert.ok(field in item, `safe field ${field} must stay present`);
  }
  for (const field of GUEST_TOKEN_FIELDS) {
    assert.equal(field in item, false, `guest token field ${field} must never appear`);
  }
  assert.equal("paymentSession" in item, false, "response must stay flat, no nested paymentSession");
  assert.equal(item.totalCents, 11500);
});

test("ERP orders PII 02: token with erp.orders.pii returns all 13 contract PII fields with exact values", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const { response, body } = await listOrders(piiToken);
  assert.equal(response.status, 200);
  const item = findItem(body, orderA.id);
  assert.ok(item, "seeded order must be listed");
  const expected: Record<string, string | null> = {
    firstName: "OrderFirst-A",
    lastName: "OrderLast-A",
    phone: "514-555-0101",
    email: `pii-order-a-${suffix}@example.test`,
    notes: "PII order notes A",
    shippingAddressLine1: "Order Line1 A",
    shippingAddressLine2: "Order Line2 A",
    paymentMethod: "card",
    providerPaymentId: `provider-a-${suffix}`,
    shippingCity: "SessionCity-A",
    shippingProvince: "SessionProvince-A",
    shippingPostalCode: "S1S-1S1",
    shippingCountry: "CA"
  };
  for (const field of PII_FIELDS) {
    assert.ok(field in item, `PII field ${field} must be present with erp.orders.pii`);
    assert.equal(item[field], expected[field], `${field} value`);
  }
  for (const field of SAFE_ORDER_FIELDS) {
    assert.ok(field in item, `safe field ${field} must stay present`);
  }
  for (const field of GUEST_TOKEN_FIELDS) {
    assert.equal(field in item, false, `guest token field ${field} must never appear`);
  }
  assert.equal("paymentSession" in item, false, "PII fields are flat, no nested paymentSession object");
  assert.equal(item.totalCents, 11500);
});

test("ERP orders PII 03: guestOrderToken family never crosses the wire under either permission", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  for (const [label, token] of [
    ["no-pii", noPiiToken],
    ["pii", piiToken]
  ] as const) {
    const { response, body } = await listOrders(token);
    assert.equal(response.status, 200);
    const raw = JSON.stringify(body);
    for (const order of [orderA, orderB]) {
      const item = findItem(body, order.id);
      assert.ok(item, `${label}: seeded order ${order.id} must be listed`);
      for (const field of GUEST_TOKEN_FIELDS) {
        assert.equal(field in item, false, `${label}: ${field} must not be a key on ${order.id}`);
      }
      // Strongest regression net: the seeded guest token values (order and
      // payment session variants) must not occur anywhere in the payload —
      // catches nested-object leaks the key check would miss.
      assert.equal(raw.includes(order.guestOrderToken), false, `${label}: order guest token value leaked`);
      assert.equal(raw.includes(order.sessionGuestOrderToken), false, `${label}: session guest token value leaked`);
    }
  }
});

test("ERP orders PII 04: address fields come from the payment session; null session values return null without error", async (t) => {
  if (!password) return t.skip("no seeded super admin password");
  const { response, body } = await listOrders(piiToken);
  assert.equal(response.status, 200);

  // Order A holds contrasting Order vs PaymentSession address values; the
  // response must reflect the session, not the Order columns.
  const itemA = findItem(body, orderA.id);
  assert.ok(itemA, "seeded order A must be listed");
  assert.equal(itemA.shippingCity, "SessionCity-A", "shippingCity must come from PaymentSession, not Order");
  assert.equal(itemA.shippingProvince, "SessionProvince-A", "shippingProvince must come from PaymentSession");
  assert.equal(itemA.shippingPostalCode, "S1S-1S1", "shippingPostalCode must come from PaymentSession");
  assert.equal(itemA.shippingCountry, "CA", "shippingCountry must come from PaymentSession");
  assert.equal(itemA.providerPaymentId, `provider-a-${suffix}`, "providerPaymentId must come from PaymentSession");

  // Order B: session columns are null while the Order row carries contrast
  // values — the response must serialize null (no error, no Order leak).
  const itemB = findItem(body, orderB.id);
  assert.ok(itemB, "seeded order B must be listed");
  assert.equal(itemB.shippingCity, null, "null session shippingCity must serialize as null, not the Order value");
  assert.equal(itemB.shippingProvince, null, "null session shippingProvince must serialize as null");
  assert.equal(itemB.shippingPostalCode, null, "null session shippingPostalCode must serialize as null");
  assert.equal(itemB.shippingCountry, null, "null session shippingCountry must serialize as null");
  assert.equal(itemB.providerPaymentId, null, "null session providerPaymentId must serialize as null");
});

test("ERP orders PII 05: published S08 deny-by-default still returns a safe DTO for a PII-capable token", async (t) => {
  if (!password) return t.skip("no seeded super admin password");

  // Keep the positive-PII fixture above explicitly permissive, then exercise
  // production policy with the same token. Sensitive permissions are denied by
  // default at the machine scope, but the route must degrade to a safe 200
  // response rather than reject the request.
  await publishPiiCompatibleS08(sharedToken!, true);
  const { response, body } = await listOrders(piiToken);
  assert.equal(response.status, 200, "S08 deny-by-default must not 403 the ERP orders route");
  const item = findItem(body, orderA.id);
  assert.ok(item, "seeded order must be listed under deny-by-default");
  for (const field of PII_FIELDS) {
    assert.equal(field in item, false, `PII field ${field} must be absent under S08 deny-by-default`);
  }
  for (const field of SAFE_ORDER_FIELDS) {
    assert.ok(field in item, `safe field ${field} must stay present under S08 deny-by-default`);
  }
  for (const field of GUEST_TOKEN_FIELDS) {
    assert.equal(field in item, false, `guest token field ${field} must never appear under S08 deny-by-default`);
  }
});
