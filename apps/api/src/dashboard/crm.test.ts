import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

const app = createApp();

async function adminToken() {
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local",
      password: process.env.SUPER_ADMIN_PASSWORD
    })
  });
  assert.equal(login.status, 200);
  const body = (await login.json()) as { data: { accessToken: string } };
  return body.data.accessToken;
}

test("GET /dashboard/crm/contacts requires crm.read", async () => {
  const response = await app.request("/api/v1/dashboard/crm/contacts");
  assert.equal(response.status, 401);
});

test("dashboard CRM contact lifecycle", async () => {
  const suffix = randomBytes(6).toString("hex");
  const email = `crm-dashboard-${suffix}@vanstro.test`;
  const token = await adminToken();

  const register = await app.request("/api/v1/auth/customer/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: `CrmDashboard-${suffix}`,
      firstName: "Dashboard",
      lastName: "Crm"
    })
  });
  assert.equal(register.status, 201);

  const list = await app.request(`/api/v1/dashboard/crm/contacts?q=${encodeURIComponent(email)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(list.status, 200);
  const listBody = (await list.json()) as { data: Array<{ id: string; email: string; stage: string }> };
  const contact = listBody.data.find((entry) => entry.email === email);
  assert.ok(contact);
  assert.equal(contact.stage, "registered");

  const detail = await app.request(`/api/v1/dashboard/crm/contacts/${contact.id}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(detail.status, 200);
  const detailBody = (await detail.json()) as {
    data: { events: Array<{ type: string }>; notes: unknown[] };
  };
  assert.ok(detailBody.data.events.some((event) => event.type === "registered"));

  const note = await app.request(`/api/v1/dashboard/crm/contacts/${contact.id}/notes`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ note: "Smoke CRM note" })
  });
  assert.equal(note.status, 201);

  const promote = await app.request(`/api/v1/dashboard/crm/contacts/${contact.id}/promote-to-erp`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(promote.status, 200);

  const refreshed = await prisma.crmContact.findUniqueOrThrow({ where: { id: contact.id } });
  assert.equal(refreshed.erpSyncStatus, "queued");

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const job = await prisma.erpSyncJob.findFirst({
    where: { type: "customer_sync", payload: { path: ["userId"], equals: user.id } }
  });
  assert.ok(job);

  await prisma.erpSyncJob.deleteMany({ where: { payload: { path: ["userId"], equals: user.id } } });
  await prisma.crmContactNote.deleteMany({ where: { contactId: contact.id } });
  await prisma.crmContactEvent.deleteMany({ where: { contactId: contact.id } });
  await prisma.crmContact.delete({ where: { id: contact.id } });
  await prisma.customerProfile.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
});
