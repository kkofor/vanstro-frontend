import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { createSession } from "../auth/session.js";
import { createApp } from "../app.js";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

type Actor = Awaited<ReturnType<typeof createActor>>;

async function createActor(label: string, permissions: string[]) {
  const suffix = randomUUID();
  const role = await prisma.role.create({
    data: {
      key: `p03-sensitive-${label}-${suffix}`,
      name: `P03 Sensitive ${label}`,
      rolePermissions: {
        create: permissions.map((permission) => ({ permission: { connect: { key: permission } } }))
      }
    }
  });
  const user = await prisma.user.create({
    data: {
      email: `p03-sensitive-${label}-${suffix}@example.test`,
      kind: "admin",
      status: "active",
      userRoles: { create: { roleId: role.id } }
    }
  });
  const session = await createSession(user.id);
  return { role, user, token: session.accessToken };
}

async function deleteActor(actor: Actor) {
  await prisma.refreshSession.deleteMany({ where: { userId: actor.user.id } });
  await prisma.userRole.deleteMany({ where: { userId: actor.user.id } });
  await prisma.user.delete({ where: { id: actor.user.id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: actor.role.id } });
  await prisma.role.delete({ where: { id: actor.role.id } });
}

function auth(actor: Actor) {
  return { authorization: `Bearer ${actor.token}`, "X-Request-Id": `p03-${randomUUID()}` };
}

test("sensitive reconciliation GET gates PII and provider references with safe events", async () => {
  const suffix = randomUUID();
  const providerPaymentId = `provider-payment-${suffix}`;
  const providerEventId = `provider-event-${suffix}`;
  const payloadSecret = `payload-secret-${suffix}`;
  const guestEmail = `reconciliation-${suffix}@example.test`;
  const limited = await createActor("reconciliation-limited", ["dashboard.access", "orders.read"]);
  const privileged = await createActor("reconciliation-privileged", [
    "dashboard.access", "orders.read", "customers.pii.read", "payments.reference.read"
  ]);
  const session = await prisma.paymentSession.create({
    data: {
      guestEmail,
      guestFirstName: "Sensitive",
      guestLastName: "Customer",
      guestPhone: "+12045550199",
      guestOrderToken: `guest-${suffix}`,
      status: "reconciliation_required",
      fulfillment: "pickup",
      paymentMethod: "card",
      items: [],
      subtotalCents: 1000,
      totalCents: 1000,
      currency: "CAD",
      providerPaymentId,
      expiresAt: new Date(Date.now() + 60_000),
      paymentEvents: {
        create: {
          type: "reconciliation_required",
          providerEventId,
          amountCents: 1000,
          currency: "CAD",
          payload: { secret: payloadSecret }
        }
      }
    }
  });

  try {
    const limitedResponse = await app.request("/api/v1/dashboard/payment-reconciliation?page=1&pageSize=100", {
      headers: auth(limited)
    });
    assert.equal(limitedResponse.status, 200);
    assert.equal(limitedResponse.headers.get("cache-control"), "private, no-store");
    const limitedText = await limitedResponse.clone().text();
    const limitedBody = await limitedResponse.json() as { data: Array<Record<string, unknown>> };
    const limitedItem = limitedBody.data.find((item) => item.id === session.id);
    assert.ok(limitedItem);
    for (const field of ["guestEmail", "guestFirstName", "guestLastName", "providerPaymentId", "providerReference"]) {
      assert.equal(field in limitedItem, false);
    }
    assert.equal(limitedText.includes(guestEmail), false);
    assert.equal(limitedText.includes(providerPaymentId), false);
    assert.equal(limitedText.includes(providerEventId), false);
    assert.equal(limitedText.includes(payloadSecret), false);

    const privilegedResponse = await app.request("/api/v1/dashboard/payment-reconciliation?page=1&pageSize=100", {
      headers: auth(privileged)
    });
    assert.equal(privilegedResponse.status, 200);
    assert.equal(privilegedResponse.headers.get("cache-control"), "private, no-store");
    const privilegedText = await privilegedResponse.clone().text();
    const privilegedBody = await privilegedResponse.json() as { data: Array<Record<string, unknown>> };
    const privilegedItem = privilegedBody.data.find((item) => item.id === session.id);
    assert.ok(privilegedItem);
    assert.equal(privilegedItem.guestEmail, guestEmail);
    assert.equal(privilegedItem.providerReference, `…${providerPaymentId.slice(-6)}`);
    assert.equal("providerPaymentId" in privilegedItem, false);
    assert.equal(privilegedText.includes(providerPaymentId), false);
    assert.equal(privilegedText.includes(providerEventId), false);
    assert.equal(privilegedText.includes(payloadSecret), false);
  } finally {
    await prisma.paymentSession.delete({ where: { id: session.id } });
    await deleteActor(limited);
    await deleteActor(privileged);
  }
});

test("Reconciliation omits authorized PII keys when database values are null", async () => {
  const actor = await createActor("reconciliation-null-pii", ["dashboard.access", "orders.read", "orders.update", "customers.pii.read"]);
  const session = await prisma.paymentSession.create({ data: { guestEmail:"",guestFirstName:"",guestLastName:"",guestPhone:"",guestOrderToken:"",status: "reconciliation_required", fulfillment: "pickup", paymentMethod: "cash", items: [], subtotalCents: 100, totalCents: 100, currency: "CAD", expiresAt: new Date(Date.now()+60_000) } });
  try {
    const getResponse = await app.request("/api/v1/dashboard/payment-reconciliation?page=1&pageSize=100", { headers: auth(actor) });
    const item = (await getResponse.json() as { data: Array<Record<string,unknown>> }).data.find(({id})=>id===session.id)!;
    for (const key of ["guestEmail","guestFirstName","guestLastName"]) assert.equal(key in item,false);
    const patch = await app.request(`/api/v1/dashboard/payment-reconciliation/${session.id}`, { method:"PATCH", headers:{...auth(actor),"content-type":"application/json"}, body:JSON.stringify({action:"request_refund"}) });
    assert.equal(patch.status,200);
    const data=(await patch.json() as {data:Record<string,unknown>}).data;
    for (const key of ["guestEmail","guestFirstName","guestLastName"]) assert.equal(key in data,false);
  } finally { await prisma.paymentSession.delete({where:{id:session.id}}); await deleteActor(actor); }
});

test("Reconciliation PATCH errors always use safe stable envelopes", async () => {
  const actor = await createActor("reconciliation-errors", ["dashboard.access", "orders.update"]);
  const expected = [
    [randomUUID(), {}, 400, "DASHBOARD_INVALID"],
    [randomUUID(), { action: "request_refund" }, 404, "DASHBOARD_NOT_FOUND"]
  ] as const;
  try {
    for (const [id, body, status, code] of expected) {
      const response = await app.request(`/api/v1/dashboard/payment-reconciliation/${id}`, { method:"PATCH", headers:{...auth(actor),"content-type":"application/json"}, body:JSON.stringify(body) });
      assert.equal(response.status,status);
      const envelope=await response.json() as Record<string,unknown>;
      assert.equal(envelope.code,code); assert.equal(typeof envelope.requestId,"string");
      assert.deepEqual(Object.keys(envelope).sort(),["code","error","requestId"]);
    }
  } finally { await deleteActor(actor); }
});

test("CRM GETs omit and cannot search PII without a compatible global grant", async () => {
  const suffix = randomUUID();
  const email = `crm-sensitive-${suffix}@example.test`;
  const phone = `+1204${suffix.replaceAll("-", "").slice(0, 7)}`;
  const contact = await prisma.crmContact.create({
    data: {
      email,
      firstName: `First-${suffix}`,
      lastName: `Last-${suffix}`,
      phone,
      source: "contact_form"
    }
  });
  const limited = await createActor("crm-limited", ["dashboard.access", "crm.read"]);
  const privileged = await createActor("crm-privileged", ["dashboard.access", "crm.read", "customers.pii.read"]);
  const dealerRole = await prisma.role.findUniqueOrThrow({ where: { key: "dealer_admin" }, select: { id: true } });
  const dealer = await prisma.dealer.create({ data: { code: `P03-${suffix}`, name: `P03 ${suffix}` } });
  const membership = await prisma.dealerMembership.create({
    data: {
      userId: limited.user.id,
      dealerId: dealer.id,
      status: "active",
      roles: { create: { roleId: dealerRole.id } }
    }
  });

  try {
    for (const query of [email, `First-${suffix}`, `Last-${suffix}`, phone, contact.id, " "]) {
      const response = await app.request(`/api/v1/dashboard/crm/contacts?q=${encodeURIComponent(query)}`, { headers: auth(limited) });
      assert.equal(response.status, 400);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal((await response.json() as { code: string }).code, "QUERY_SEARCH_UNSUPPORTED");
    }

    const list = await app.request(`/api/v1/dashboard/crm/contacts?page=1&pageSize=100`, { headers: auth(limited) });
    assert.equal(list.status, 200);
    const safeContact = (await list.json() as { data: Array<Record<string, unknown>> }).data.find((item) => item.id === contact.id);
    assert.ok(safeContact);
    for (const field of ["email", "firstName", "lastName", "phone", "userId", "ownerUserId", "tags"]) assert.equal(field in safeContact, false);

    const detail = await app.request(`/api/v1/dashboard/crm/contacts/${contact.id}`, { headers: auth(limited) });
    assert.equal(detail.status, 200);
    assert.equal(detail.headers.get("cache-control"), "private, no-store");
    const detailBody = await detail.json() as { data: Record<string, unknown> };
    for (const field of ["email", "firstName", "lastName", "phone"]) assert.equal(field in detailBody.data, false);

    const privilegedSearch = await app.request(`/api/v1/dashboard/crm/contacts?q=${encodeURIComponent(email)}`, { headers: auth(privileged) });
    assert.equal(privilegedSearch.status, 400);
    assert.equal((await privilegedSearch.json() as { code: string }).code, "QUERY_SEARCH_UNSUPPORTED");
  } finally {
    await prisma.crmContact.delete({ where: { id: contact.id } });
    await prisma.dealerMembershipRole.deleteMany({ where: { membershipId: membership.id } });
    await prisma.dealerMembership.delete({ where: { id: membership.id } });
    await prisma.dealer.delete({ where: { id: dealer.id } });
    await deleteActor(limited);
    await deleteActor(privileged);
  }
});

test("CRM detail returns the complete safe event collection beyond 100 rows", async () => {
  const suffix = randomUUID();
  const contact = await prisma.crmContact.create({ data: { email: `crm-events-${suffix}@example.test`, source: "contact_form" } });
  const actor = await createActor("crm-events", ["dashboard.access", "crm.read"]);
  try {
    await prisma.crmContactEvent.createMany({ data: Array.from({ length: 101 }, (_, index) => ({ contactId: contact.id, type: "login", payload: { hidden: index } })) });
    const response = await app.request(`/api/v1/dashboard/crm/contacts/${contact.id}`, { headers: auth(actor) });
    assert.equal(response.status, 200);
    const body = await response.json() as { data: { events: Array<Record<string, unknown>> } };
    assert.equal(body.data.events.length, 101);
    assert.ok(body.data.events.every((event) => Object.keys(event).sort().join(",") === "createdAt,id,type"));
  } finally { await prisma.crmContact.delete({ where: { id: contact.id } }); await deleteActor(actor); }
});

test("overview Dealer count follows the global dealers.read grant, not settings.write", async () => {
  const withDealersRead = await createActor("overview-dealers", ["dashboard.access", "dealers.read"]);
  const withSettingsOnly = await createActor("overview-settings", ["dashboard.access", "settings.write"]);
  try {
    const permitted = await app.request("/api/v1/dashboard/overview", { headers: auth(withDealersRead) });
    assert.equal(permitted.status, 200);
    const permittedBody = await permitted.json() as { data: { counts: { dealers: number } } };
    assert.ok(permittedBody.data.counts.dealers >= 1);

    const denied = await app.request("/api/v1/dashboard/overview", { headers: auth(withSettingsOnly) });
    assert.equal(denied.status, 200);
    const deniedBody = await denied.json() as { data: { counts: { dealers: number } } };
    assert.equal(deniedBody.data.counts.dealers, 0);
  } finally {
    await deleteActor(withDealersRead);
    await deleteActor(withSettingsOnly);
  }
});
