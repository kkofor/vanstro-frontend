import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { createApp } from "../app.js";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

test("PATCH /account/me returns the canonical CustomerAccount DTO", async () => {
  const email = `account-profile-${randomUUID()}@example.test`;
  try {
    const registration = await app.request("/api/v1/auth/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        email,
        password: "account-profile-password",
        firstName: "Before",
        lastName: "Update"
      })
    });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";

    const patch = await app.request("/api/v1/account/me", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie
      },
      body: JSON.stringify({
        firstName: "After",
        lastName: "Update",
        phone: "204-555-0100"
      })
    });
    assert.equal(patch.status, 200);
    const patchBody = await patch.json() as { data: Record<string, unknown> };

    const get = await app.request("/api/v1/account/me", { headers: { cookie } });
    assert.equal(get.status, 200);
    const getBody = await get.json() as { data: Record<string, unknown> };

    assert.deepEqual(patchBody.data, {
      id: patchBody.data.id,
      email,
      firstName: "After",
      lastName: "Update",
      phone: "204-555-0100"
    });
    assert.deepEqual(patchBody, getBody);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.crmContact.deleteMany({ where: { email } });
    await prisma.emailOutbox.deleteMany({ where: { toEmail: email } });
  }
});
