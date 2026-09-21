import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient, decryptSecret } from "@vanstro/db";
import { createApp } from "../app.js";

const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

const app = createApp();

function withDeploymentMode<T>(callback: () => Promise<T>) {
  const previous = process.env.VANSTRO_RUNTIME_MODE;
  process.env.VANSTRO_RUNTIME_MODE = "deployment";
  return callback().finally(() => {
    if (previous === undefined) delete process.env.VANSTRO_RUNTIME_MODE;
    else process.env.VANSTRO_RUNTIME_MODE = previous;
  });
}

async function withDeploymentRateLimitIdentity<T>(callback: (clientIp: string) => Promise<T>) {
  const previousTrustProxyHeaders = process.env.TRUST_PROXY_HEADERS;
  const clientIp = `2001:db8:${randomUUID().replaceAll("-", "").match(/.{1,4}/g)!.slice(0, 6).join(":")}`;
  process.env.TRUST_PROXY_HEADERS = "true";
  try {
    return await withDeploymentMode(() => callback(clientIp));
  } finally {
    try {
      await prisma.rateLimitBucket.deleteMany({ where: { key: `auth:${clientIp}` } });
    } finally {
      if (previousTrustProxyHeaders === undefined) delete process.env.TRUST_PROXY_HEADERS;
      else process.env.TRUST_PROXY_HEADERS = previousTrustProxyHeaders;
    }
  }
}

test("deployment registration stores the session in an HttpOnly cookie", () => withDeploymentRateLimitIdentity(async (clientIp) => {
  const email = `cookie-${randomUUID()}@example.test`;
  try {
    const response = await app.request("/api/v1/auth/customer/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://vanstro.ca",
        "cf-connecting-ip": clientIp
      },
      body: JSON.stringify({ email, password: "cookie-test-password", firstName: "Cookie", lastName: "Test" })
    });
    assert.equal(response.status, 201);
    const body = await response.json() as { data: { accessToken?: string } };
    assert.equal(body.data.accessToken, undefined);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /__Host-vanstro-session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Lax/i);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.crmContact.deleteMany({ where: { email } });
    await prisma.emailOutbox.deleteMany({ where: { toEmail: email } });
  }
}));

test("development registration uses a browser-compatible non-Host cookie", async () => {
  const email = `dev-cookie-${randomUUID()}@example.test`;
  try {
    const response = await app.request("/api/v1/auth/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password: "cookie-test-password", firstName: "Cookie", lastName: "Dev" })
    });
    assert.equal(response.status, 201);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /^vanstro-session=/);
    assert.doesNotMatch(cookie, /__Host-/);
    assert.doesNotMatch(cookie, /; Secure/i);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.crmContact.deleteMany({ where: { email } });
    await prisma.emailOutbox.deleteMany({ where: { toEmail: email } });
  }
});

test("deployment cookie-authenticated writes require a trusted Origin", () => withDeploymentMode(async () => {
  const response = await app.request("/api/v1/auth/logout", {
    method: "POST",
    headers: { cookie: "__Host-vanstro-session=fake" }
  });
  assert.equal(response.status, 403);
}));

test("password reset is generic, one-time, and revokes existing sessions", async () => {
  const email = `reset-${randomUUID()}@example.test`;
  const oldPassword = "old-password-value";
  const newPassword = "new-password-value";
  try {
    const registration = await app.request("/api/v1/auth/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password: oldPassword, firstName: "Reset", lastName: "Test" })
    });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    const forgot = await app.request("/api/v1/auth/password/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    assert.equal(forgot.status, 202);
    const outbox = await prisma.emailOutbox.findFirstOrThrow({
      where: { toEmail: email, templateKey: "password_reset" },
      orderBy: { createdAt: "desc" }
    });
    const payload = outbox.payload as { encryptedSecurityPayload?: unknown; resetUrl?: unknown };
    const encryptionKey = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim();
    const resetValues = payload.encryptedSecurityPayload && encryptionKey
      ? JSON.parse(decryptSecret(payload.encryptedSecurityPayload, encryptionKey)) as { resetUrl?: unknown }
      : payload;
    const resetUrl = String(resetValues.resetUrl);
    const token = new URL(resetUrl).searchParams.get("token");
    assert.ok(token);
    const tokenRecord = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: createHash("sha256").update(token).digest("hex") }
    });
    assert.ok(tokenRecord.expiresAt > new Date());
    const reset = await app.request("/api/v1/auth/password/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: newPassword })
    });
    assert.equal(reset.status, 200);
    assert.equal((await app.request("/api/v1/auth/me", { headers: { cookie } })).status, 401);
    assert.equal((await app.request("/api/v1/auth/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: oldPassword })
    })).status, 401);
    assert.equal((await app.request("/api/v1/auth/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: newPassword })
    })).status, 200);
    assert.equal((await app.request("/api/v1/auth/password/reset", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: oldPassword })
    })).status, 400);
    const missing = await app.request("/api/v1/auth/password/forgot", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `missing-${email}` })
    });
    assert.equal(missing.status, 202);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.crmContact.deleteMany({ where: { email } });
    await prisma.emailOutbox.deleteMany({ where: { toEmail: email } });
  }
});

test("malformed session cookies are treated as unauthenticated", async () => {
  const response = await app.request("/api/v1/auth/me", {
    headers: { cookie: "vanstro-session=%E0%A4%A" }
  });
  assert.equal(response.status, 401);
});
