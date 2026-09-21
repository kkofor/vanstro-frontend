import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient, decryptSecret, hashPassword, verifyPassword } from "@vanstro/db";
import { createApp } from "../app.js";
import { createSession } from "../auth/session.js";

const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

const app = createApp();

function queuedResetValues(payload: unknown) {
  const values = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (!values.encryptedSecurityPayload) return values;
  const encryptionKey = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim();
  assert.ok(encryptionKey);
  return JSON.parse(decryptSecret(values.encryptedSecurityPayload, encryptionKey)) as Record<string, unknown>;
}

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      email,
      kind: "customer",
      status: "active",
      customerProfile: { create: { firstName: "Reset", lastName: "Test" } },
      passwordCredential: { create: hashPassword("original-password-123") }
    }
  });
}

async function cleanup(email: string) {
  await prisma.emailOutbox.deleteMany({ where: { toEmail: email } });
  await prisma.user.deleteMany({ where: { email } });
}

test("forgot password returns the same accepted response for known and unknown email", async () => {
  const email = `reset-${randomUUID()}@example.test`;
  await createTestUser(email);
  try {
    const known = await app.request("/api/v1/auth/password/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    const unknown = await app.request("/api/v1/auth/password/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `missing-${randomUUID()}@example.test` })
    });

    assert.equal(known.status, 202);
    assert.equal(unknown.status, 202);
    assert.deepEqual(await known.json(), await unknown.json());

    const queued = await prisma.emailOutbox.findFirst({ where: { toEmail: email, templateKey: "password_reset" } });
    assert.ok(queued);
    const serializedPayload = JSON.stringify(queued.payload);
    if (process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim()) {
      assert.equal(serializedPayload.includes("resetUrl"), false);
      assert.ok((queued.payload as { encryptedSecurityPayload?: unknown }).encryptedSecurityPayload);
    }
    assert.match(String(queuedResetValues(queued.payload).resetUrl), /^https?:\/\//);
  } finally {
    await cleanup(email);
  }
});

test("password reset is single-use, changes the credential, and revokes sessions", async () => {
  const email = `reset-use-${randomUUID()}@example.test`;
  const user = await createTestUser(email);
  try {
    await createSession(user.id);
    const forgot = await app.request("/api/v1/auth/password/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    assert.equal(forgot.status, 202);

    const queued = await prisma.emailOutbox.findFirstOrThrow({ where: { toEmail: email, templateKey: "password_reset" } });
    const resetUrl = String(queuedResetValues(queued.payload).resetUrl);
    const token = new URL(resetUrl).searchParams.get("token");
    assert.ok(token);

    const reset = await app.request("/api/v1/auth/password/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: "replacement-password-456" })
    });
    assert.equal(reset.status, 200);

    const replay = await app.request("/api/v1/auth/password/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: "another-password-789" })
    });
    assert.equal(replay.status, 400);
    assert.equal((await replay.json() as { code: string }).code, "AUTH_RESET_INVALID");

    const credential = await prisma.passwordCredential.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(verifyPassword("replacement-password-456", credential), true);
    const storedSessions = await prisma.refreshSession.findMany({ where: { userId: user.id } });
    assert.equal(storedSessions.length, 1);
    assert.ok(storedSessions[0]?.revokedAt);
  } finally {
    await cleanup(email);
  }
});
