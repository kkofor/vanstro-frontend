import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { createSession } from "../auth/session.js";
import { createApp } from "../app.js";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture() {
  const suffix = randomUUID();
  const permissionKeys = ["dashboard.access", "users.read", "users.manage", "orders.read", "orders.update", "orders.assign", "customers.pii.read", "dealers.read"];
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } }, select: { id: true, key: true } });
  const piiRole = await prisma.role.create({
    data: {
      key: `ocd-pii-${suffix}`,
      name: "OCD PII",
      rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) }
    }
  });
  const noPiiPermissions = permissions.filter((permission) => permission.key !== "customers.pii.read");
  const noPiiRole = await prisma.role.create({
    data: {
      key: `ocd-nopii-${suffix}`,
      name: "OCD NoPII",
      rolePermissions: { create: noPiiPermissions.map((permission) => ({ permissionId: permission.id })) }
    }
  });
  const adminPii = await prisma.user.create({
    data: {
      email: `ocd-pii-${suffix}@example.test`,
      kind: "admin",
      status: "active",
      adminProfile: { create: { displayName: "OCD PII Admin" } },
      userRoles: { create: { roleId: piiRole.id } }
    }
  });
  const adminNoPii = await prisma.user.create({
    data: {
      email: `ocd-nopii-${suffix}@example.test`,
      kind: "admin",
      status: "active",
      adminProfile: { create: { displayName: "OCD NoPII Admin" } },
      userRoles: { create: { roleId: noPiiRole.id } }
    }
  });
  const customer = await prisma.user.create({
    data: {
      email: `ocd-customer-${suffix}@example.test`,
      kind: "customer",
      status: "active",
      customerProfile: {
        create: { firstName: "Ada", lastName: "Lovelace", phone: "514-555-0142" }
      },
      addresses: {
        create: [
          {
            label: "Home",
            firstName: "Ada",
            lastName: "Lovelace",
            phone: "514-555-0142",
            addressLine1: "1 Test Street",
            city: "Montréal",
            province: "QC",
            postalCode: "H2X 1Y4",
            country: "CA",
            isDefault: true
          },
          {
            label: "Cottage",
            firstName: "Ada",
            lastName: "Lovelace",
            addressLine1: "9 Cabin Row",
            city: "Gatineau",
            province: "QC",
            postalCode: "J8X 2L3",
            country: "CA",
            isDefault: false
          }
        ]
      }
    }
  });
  const dealer = await prisma.dealer.create({ data: { code: `OCD-${suffix}`, name: "OCD Dealer" } });
  const location = await prisma.dealerLocation.create({ data: { dealerId: dealer.id, code: "OCD-1", name: "OCD Location" } });
  const paymentSession = await prisma.paymentSession.create({
    data: {
      guestEmail: `ocd-order-${suffix}@example.test`,
      guestFirstName: "Alice",
      guestLastName: "Smith",
      guestPhone: "514-555-0199",
      guestOrderToken: `ocd-session-${suffix}`,
      status: "paid",
      fulfillment: "pickup",
      paymentMethod: "card",
      items: { lines: [] },
      subtotalCents: 10000,
      taxCents: 1500,
      shippingCents: 0,
      totalCents: 11500,
      currency: "CAD",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
  const order = await prisma.order.create({
    data: {
      status: "paid",
      fulfillment: "pickup",
      currency: "CAD",
      email: `ocd-order-${suffix}@example.test`,
      firstName: "Alice",
      lastName: "Smith",
      phone: "514-555-0199",
      guestOrderToken: `ocd-order-token-${suffix}`,
      paymentSessionId: paymentSession.id,
      paymentMethod: "card",
      subtotalCents: 10000,
      discountCents: 0,
      taxCents: 1500,
      shippingCents: 0,
      totalCents: 11500,
      items: {
        create: [
          { skuCode: `OCD-SKU-${suffix}`, productName: "OCD Product", quantity: 1, unitPriceCents: 10000, lineTotalCents: 10000 }
        ]
      },
      statusEvents: {
        create: [
          { status: "paid", source: "checkout", payload: {} }
        ]
      }
    }
  });
  const piiSession = await createSession(adminPii.id);
  const noPiiSession = await createSession(adminNoPii.id);
  return { piiRole, noPiiRole, adminPii, adminNoPii, customer, dealer, location, order, paymentSession, piiToken: piiSession.accessToken, noPiiToken: noPiiSession.accessToken, suffix };
}

async function cleanup(f: Fixture) {
  await prisma.$transaction(async (db) => {
    await db.refreshSession.deleteMany({ where: { userId: { in: [f.adminPii.id, f.adminNoPii.id] } } });
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: [f.adminPii.id, f.adminNoPii.id] } },
          { resourceId: f.order.id },
          { resourceType: "customer_address" }
        ]
      }
    });
    await db.orderStatusEvent.deleteMany({ where: { orderId: f.order.id } });
    await db.orderItem.deleteMany({ where: { orderId: f.order.id } });
    await db.order.deleteMany({ where: { id: f.order.id } });
    await db.paymentSession.deleteMany({ where: { id: { in: [f.paymentSession?.id ?? ""] } } });
    await db.customerAddress.deleteMany({ where: { userId: f.customer.id } });
    await db.customerProfile.deleteMany({ where: { userId: f.customer.id } });
    await db.adminProfile.deleteMany({ where: { userId: { in: [f.adminPii.id, f.adminNoPii.id] } } });
    await db.userRole.deleteMany({ where: { userId: { in: [f.adminPii.id, f.adminNoPii.id, f.customer.id] } } });
    await db.user.deleteMany({ where: { id: { in: [f.adminPii.id, f.adminNoPii.id, f.customer.id] } } });
    await db.dealerLocation.deleteMany({ where: { id: f.location.id } });
    await db.dealer.deleteMany({ where: { id: f.dealer.id } });
    await db.rolePermission.deleteMany({ where: { roleId: { in: [f.piiRole.id, f.noPiiRole.id] } } });
    await db.role.deleteMany({ where: { id: { in: [f.piiRole.id, f.noPiiRole.id] } } });
  });
}

function auth(token: string, requestId = `ocd-${randomUUID()}`) {
  return { authorization: `Bearer ${token}`, "X-Request-Id": requestId };
}

test("Order list and detail carry PII only when customers.pii.read is granted", async () => {
  const f = await createFixture();
  try {
    const withPii = await app.request("/api/v1/dashboard/orders", { headers: auth(f.piiToken) });
    assert.equal(withPii.status, 200);
    const withPiiBody = await withPii.json() as { data: Array<Record<string, unknown>>; meta: { total: number } };
    const order = withPiiBody.data.find((row) => row.id === f.order.id);
    assert.ok(order, "order must be present in the PII-granted list");
    assert.equal(order.paymentSessionId, f.paymentSession.id);
    assert.equal(order.paymentMethod, "card");
    assert.equal(order.email, `ocd-order-${f.suffix}@example.test`);
    assert.equal(order.firstName, "Alice");
    assert.equal(order.phone, "514-555-0199");
    assert.ok(Array.isArray(order.items) && order.items.length === 1, "order lines must load");
    assert.ok(Array.isArray(order.statusEvents) && order.statusEvents.length === 1, "status history must load");

    const withoutPii = await app.request("/api/v1/dashboard/orders", { headers: auth(f.noPiiToken) });
    assert.equal(withoutPii.status, 200);
    const withoutPiiBody = await withoutPii.json() as { data: Array<Record<string, unknown>> };
    const redacted = withoutPiiBody.data.find((row) => row.id === f.order.id);
    assert.ok(redacted, "order must be present in the no-PII list");
    assert.equal(redacted.paymentSessionId, f.paymentSession.id);
    assert.equal(redacted.paymentMethod, "card");
    for (const key of ["email", "firstName", "lastName", "phone", "postalCode"]) {
      assert.equal(key in redacted, false, `${key} must be omitted without customers.pii.read`);
    }
    assert.ok(Array.isArray(redacted.items) && redacted.items.length === 1, "order lines must load without PII");
    assert.ok(Array.isArray(redacted.statusEvents), "status history must load without PII");

    const detail = await app.request(`/api/v1/dashboard/orders/${f.order.id}`, { headers: auth(f.piiToken) });
    assert.equal(detail.status, 200);
    const detailBody = await detail.json() as { data: Record<string, unknown> };
    assert.equal(detailBody.data.paymentSessionId, f.paymentSession.id);
    assert.equal(detailBody.data.paymentMethod, "card");
    assert.equal(detailBody.data.email, `ocd-order-${f.suffix}@example.test`);

    const detailRedacted = await app.request(`/api/v1/dashboard/orders/${f.order.id}`, { headers: auth(f.noPiiToken) });
    assert.equal(detailRedacted.status, 200);
    const detailRedactedBody = await detailRedacted.json() as { data: Record<string, unknown> };
    assert.equal(detailRedactedBody.data.paymentSessionId, f.paymentSession.id);
    assert.equal(detailRedactedBody.data.paymentMethod, "card");
    assert.equal("email" in detailRedactedBody.data, false);
  } finally {
    await cleanup(f);
  }
});

test("Order list supports status filter and pagination", async () => {
  const f = await createFixture();
  try {
    const filtered = await app.request("/api/v1/dashboard/orders?status=paid&page=1&pageSize=10", { headers: auth(f.piiToken) });
    assert.equal(filtered.status, 200);
    const filteredBody = await filtered.json() as { data: Array<{ status: string }>; meta: { total: number; page: number; pageSize: number; totalPages: number } };
    assert.ok(filteredBody.data.every((row) => row.status === "paid"));
    assert.ok(filteredBody.meta.total >= 1);

    const paged = await app.request("/api/v1/dashboard/orders?page=1&pageSize=1", { headers: auth(f.piiToken) });
    assert.equal(paged.status, 200);
    const pagedBody = await paged.json() as { data: Array<unknown>; meta: { page: number; pageSize: number; total: number } };
    assert.equal(pagedBody.data.length, 1);
    assert.equal(pagedBody.meta.page, 1);
    assert.equal(pagedBody.meta.pageSize, 1);
  } finally {
    await cleanup(f);
  }
});

test("Customer detail returns profile and address book; admin detail never fabricates customer fields", async () => {
  const f = await createFixture();
  try {
    const customerDetail = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, { headers: auth(f.piiToken) });
    assert.equal(customerDetail.status, 200);
    const body = await customerDetail.json() as {
      data: {
        kind: string;
        adminProfile: unknown;
        customerProfile: { firstName: string; lastName: string; phone: string };
        addresses: Array<{ id: string; label: string; firstName: string; lastName: string; addressLine1: string; city: string; province: string; postalCode: string; country: string; isDefault: boolean }>;
      };
    };
    assert.equal(body.data.kind, "customer");
    assert.equal(body.data.adminProfile, null);
    assert.deepEqual(body.data.customerProfile, { firstName: "Ada", lastName: "Lovelace", phone: "514-555-0142" });
    assert.equal(body.data.addresses.length, 2);
    const home = body.data.addresses.find((address) => address.label === "Home");
    assert.ok(home, "default address must be listed");
    assert.equal(home.firstName, "Ada");
    assert.equal(home.addressLine1, "1 Test Street");
    assert.equal(home.city, "Montréal");
    assert.equal(home.province, "QC");
    assert.equal(home.postalCode, "H2X 1Y4");
    assert.equal(home.country, "CA");
    assert.equal(home.isDefault, true);
    assert.equal(body.data.addresses[0].isDefault, true, "default address must sort first");
    const serialized = JSON.stringify(body);
    for (const forbidden of ["passwordHash", "passwordCredential", "resetToken", "sessionToken", "paymentMethod", "cardNumber"]) {
      assert.equal(serialized.includes(forbidden), false, `${forbidden} must never appear in the detail DTO`);
    }

    const adminDetail = await app.request(`/api/v1/dashboard/users/${f.adminPii.id}`, { headers: auth(f.piiToken) });
    assert.equal(adminDetail.status, 200);
    const adminBody = await adminDetail.json() as { data: { adminProfile: { displayName: string } | null; customerProfile: unknown; addresses: unknown } };
    assert.equal(adminBody.data.adminProfile?.displayName, "OCD PII Admin");
    assert.equal(adminBody.data.customerProfile, null);
    assert.deepEqual(adminBody.data.addresses, []);
  } finally {
    await cleanup(f);
  }
});

test("Customer name and phone edits persist and the audit stays desensitized", async () => {
  const f = await createFixture();
  try {
    const updated = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, {
      method: "PATCH",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Grace", lastName: "Hopper", phone: "514-555-0177" })
    });
    assert.equal(updated.status, 200);

    const detail = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, { headers: auth(f.piiToken) });
    const body = await detail.json() as { data: { customerProfile: { firstName: string; lastName: string; phone: string } } };
    assert.deepEqual(body.data.customerProfile, { firstName: "Grace", lastName: "Hopper", phone: "514-555-0177" });

    const audit = await prisma.auditLog.findFirst({
      where: { action: "dashboard.users.update", resourceId: f.customer.id },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(audit, "profile update must be audited");
    const metadata = audit.metadata as { changedFields?: string[]; valuesRedacted?: boolean };
    assert.deepEqual(metadata.changedFields, ["firstName", "lastName", "phone"]);
    assert.equal(metadata.valuesRedacted, true);
    const serializedMetadata = JSON.stringify(metadata);
    assert.equal(serializedMetadata.includes("Grace"), false, "audit must not store profile values");
    assert.equal(serializedMetadata.includes("514-555-0177"), false, "audit must not store phone values");
  } finally {
    await cleanup(f);
  }
});

test("Address create, edit, set-default and delete are atomic and server-validated", async () => {
  const f = await createFixture();
  try {
    const created = await app.request(`/api/v1/dashboard/users/${f.customer.id}/addresses`, {
      method: "POST",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Work",
        firstName: "Grace",
        lastName: "Hopper",
        phone: "514-555-0177",
        addressLine1: "1 Rue du Test",
        city: "Montréal",
        province: "qc",
        postalCode: "h2x 1y4"
      })
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json() as { data: { id: string; postalCode: string; isDefault: boolean } };
    assert.equal(createdBody.data.postalCode, "H2X 1Y4", "postal code must be normalized");
    assert.equal(createdBody.data.isDefault, false, "creating a non-default address must not steal the default flag");

    const second = await app.request(`/api/v1/dashboard/users/${f.customer.id}/addresses`, {
      method: "POST",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Workshop",
        firstName: "Grace",
        lastName: "Hopper",
        addressLine1: "2 Rue du Test",
        city: "Montréal",
        province: "QC",
        postalCode: "H2X 1Y4",
        isDefault: true
      })
    });
    assert.equal(second.status, 201);
    const secondBody = await second.json() as { data: { id: string } };

    let detail = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, { headers: auth(f.piiToken) });
    let body = await detail.json() as { data: { addresses: Array<{ id: string; label: string; isDefault: boolean }> } };
    assert.equal(body.data.addresses.length, 4);
    assert.equal(body.data.addresses.find((address) => address.id === createdBody.data.id)?.isDefault, false);
    assert.equal(body.data.addresses.find((address) => address.id === secondBody.data.id)?.isDefault, true, "only the newest default may hold the flag");

    const edited = await app.request(`/api/v1/dashboard/users/${f.customer.id}/addresses/${createdBody.data.id}`, {
      method: "PATCH",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ postalCode: "K1A 0B1", isDefault: true })
    });
    assert.equal(edited.status, 200);
    detail = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, { headers: auth(f.piiToken) });
    const afterEdit = await detail.json() as { data: { addresses: Array<{ id: string; postalCode: string; isDefault: boolean }> } };
    assert.equal(afterEdit.data.addresses.find((address) => address.id === createdBody.data.id)?.postalCode, "K1A 0B1");
    assert.equal(afterEdit.data.addresses.find((address) => address.id === createdBody.data.id)?.isDefault, true, "set-default must move the flag");
    assert.equal(afterEdit.data.addresses.find((address) => address.id === secondBody.data.id)?.isDefault, false);

    const deleted = await app.request(`/api/v1/dashboard/users/${f.customer.id}/addresses/${createdBody.data.id}`, {
      method: "DELETE",
      headers: auth(f.piiToken)
    });
    assert.equal(deleted.status, 200);
    const deletedBody = await deleted.json() as { data: { ok: boolean } };
    assert.equal(deletedBody.data.ok, true);
    detail = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, { headers: auth(f.piiToken) });
    const afterDelete = await detail.json() as { data: { addresses: Array<{ id: string }> } };
    assert.equal(afterDelete.data.addresses.length, 3);
    assert.equal(afterDelete.data.addresses.some((address) => address.id === createdBody.data.id), false);
  } finally {
    await cleanup(f);
  }
});

test("Invalid province, postal code and empty required fields fail without partial writes", async () => {
  const f = await createFixture();
  try {
    const attempts = [
      { label: "BadProvince", firstName: "Grace", lastName: "Hopper", addressLine1: "1 Test Street", city: "Montréal", province: "XX", postalCode: "H2X 1Y4" },
      { label: "BadPostal", firstName: "Grace", lastName: "Hopper", addressLine1: "1 Test Street", city: "Montréal", province: "QC", postalCode: "12345" },
      { label: "MissingCity", firstName: "Grace", lastName: "Hopper", addressLine1: "1 Test Street", city: "", province: "QC", postalCode: "H2X 1Y4" },
      { label: "MissingName", firstName: "", lastName: "Hopper", addressLine1: "1 Test Street", city: "Montréal", province: "QC", postalCode: "H2X 1Y4" }
    ];
    for (const attempt of attempts) {
      const response = await app.request(`/api/v1/dashboard/users/${f.customer.id}/addresses`, {
        method: "POST",
        headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
        body: JSON.stringify(attempt)
      });
      assert.equal(response.status, 400, `${attempt.label} must be rejected`);
    }
    const countAfterFailures = await prisma.customerAddress.count({ where: { userId: f.customer.id } });
    assert.equal(countAfterFailures, 2, "failed creates must not leave partial rows");

    const home = await prisma.customerAddress.findFirstOrThrow({ where: { userId: f.customer.id, label: "Home" } });
    const badPatch = await app.request(`/api/v1/dashboard/users/${f.customer.id}/addresses/${home.id}`, {
      method: "PATCH",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ postalCode: "not-a-postal" })
    });
    assert.equal(badPatch.status, 400);
    const emptyPatch = await app.request(`/api/v1/dashboard/users/${f.customer.id}/addresses/${home.id}`, {
      method: "PATCH",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ lastName: "" })
    });
    assert.equal(emptyPatch.status, 400);
    const unchanged = await prisma.customerAddress.findUniqueOrThrow({ where: { id: home.id } });
    assert.equal(unchanged.postalCode, "H2X 1Y4", "failed patches must not partially write");
    assert.equal(unchanged.lastName, "Lovelace");

    const failedAudits = await prisma.auditLog.count({
      where: { action: { in: ["dashboard.users.addresses.create", "dashboard.users.addresses.update"] }, resourceType: "customer_address" }
    });
    assert.equal(failedAudits, 0, "rejected writes must not be audited as successes");
  } finally {
    await cleanup(f);
  }
});

test("Kind guards: admin users cannot gain customer profile or addresses; customers cannot gain admin profile", async () => {
  const f = await createFixture();
  try {
    const adminProfilePatch = await app.request(`/api/v1/dashboard/users/${f.adminPii.id}`, {
      method: "PATCH",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Sneaky", phone: "514-555-0101" })
    });
    assert.equal(adminProfilePatch.status, 200);
    const adminDetail = await app.request(`/api/v1/dashboard/users/${f.adminPii.id}`, { headers: auth(f.piiToken) });
    const adminBody = await adminDetail.json() as { data: { customerProfile: unknown; addresses: unknown; adminProfile: { displayName: string } | null } };
    assert.equal(adminBody.data.customerProfile, null, "admin detail must not gain a customer profile");
    assert.deepEqual(adminBody.data.addresses, []);
    assert.equal(adminBody.data.adminProfile?.displayName, "OCD PII Admin", "existing admin profile must stay untouched");

    const addressOnAdmin = await app.request(`/api/v1/dashboard/users/${f.adminPii.id}/addresses`, {
      method: "POST",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Nope", firstName: "Sneaky", lastName: "User", addressLine1: "1 Test Street", city: "Montréal", province: "QC", postalCode: "H2X 1Y4" })
    });
    assert.equal(addressOnAdmin.status, 409, "address book writes must be rejected for admin users");

    const customerDisplayNamePatch = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, {
      method: "PATCH",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Fake Admin" })
    });
    assert.equal(customerDisplayNamePatch.status, 200);
    const customerDetail = await app.request(`/api/v1/dashboard/users/${f.customer.id}`, { headers: auth(f.piiToken) });
    const customerBody = await customerDetail.json() as { data: { adminProfile: unknown; customerProfile: { firstName: string } } };
    assert.equal(customerBody.data.adminProfile, null, "customer detail must not gain an admin profile");
    assert.equal(customerBody.data.customerProfile.firstName, "Ada", "customer profile must stay untouched");
  } finally {
    await cleanup(f);
  }
});

test("Order status update and dealer assignment work with the orders write capabilities", async () => {
  const f = await createFixture();
  try {
    const statusUpdate = await app.request(`/api/v1/dashboard/orders/${f.order.id}/status`, {
      method: "PATCH",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ status: "processing" })
    });
    assert.equal(statusUpdate.status, 200);
    const statusBody = await statusUpdate.json() as { data: { status: string } };
    assert.equal(statusBody.data.status, "processing");

    const assign = await app.request(`/api/v1/dashboard/orders/${f.order.id}/assign-dealer`, {
      method: "POST",
      headers: { ...auth(f.piiToken), "Content-Type": "application/json" },
      body: JSON.stringify({ dealerLocationId: f.location.id, fulfillment: "pickup" })
    });
    assert.equal(assign.status, 200);
    const assignBody = await assign.json() as { data: { dealerLocationId: string | null } };
    assert.equal(assignBody.data.dealerLocationId, f.location.id);
  } finally {
    await cleanup(f);
  }
});
