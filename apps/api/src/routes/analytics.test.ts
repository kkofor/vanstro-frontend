import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@vanstro/db";
import { createApp } from "../app.js";
import { normalizeAnalyticsPath } from "./analytics.js";

const app = createApp();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.VANSTRO_TEST_SETUP_DATABASE_URL ?? process.env.DATABASE_URL } } });

test("analytics canonicalizes safe paths and rejects ambiguous forms", () => {
  assert.equal(normalizeAnalyticsPath("/Products/../products/BASE?source=test#top"), "/products/base");
  assert.equal(normalizeAnalyticsPath("//orders/secret"), undefined);
  assert.equal(normalizeAnalyticsPath("/products\\orders"), undefined);
  assert.equal(normalizeAnalyticsPath("https://example.com/products"), undefined);
});

test("analytics sensitive-path policy survives encoding and case variants", () => {
  for (const path of ["/Orders/customer@example.com", "/%6Frders/secret", "/products/../checkout/token"]) {
    const normalized = normalizeAnalyticsPath(path);
    assert.ok(normalized);
    assert.match(normalized, /^\/(orders|checkout)(?:\/|$)/);
  }
});

test("analytics requires recorded consent and strips referrer query", async () => {
  const anonymousId = randomUUID();
  const sessionId = randomUUID();
  await prisma.privacyConsentEvent.create({
    data: {
      anonymousId,
      source: "custom",
      action: "updated",
      preferences: { strictlyNecessary: true, functional: false, analytics: true, targeting: false }
    }
  });

  try {
    const response = await app.request("/api/v1/analytics/pageviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: "/products",
        sessionId,
        consentAnalytics: true,
        consentAnonymousId: anonymousId,
        referrer: "https://example.com/orders/secret?token=do-not-store"
      })
    });
    assert.equal(response.status, 201);
    const event = await prisma.pageViewEvent.findFirstOrThrow({ where: { sessionId } });
    assert.equal(event.referrer, "https://example.com/orders/secret");
  } finally {
    await prisma.pageViewEvent.deleteMany({ where: { sessionId } });
    await prisma.privacyConsentEvent.deleteMany({ where: { anonymousId } });
  }
});

test("analytics rejects consent after it is withdrawn", async () => {
  const anonymousId = randomUUID();
  await prisma.privacyConsentEvent.createMany({
    data: [
      {
        anonymousId,
        source: "accept-all",
        action: "granted",
        preferences: { strictlyNecessary: true, functional: true, analytics: true, targeting: true },
        createdAt: new Date(Date.now() - 1000)
      },
      {
        anonymousId,
        source: "reject-all",
        action: "withdrawn",
        preferences: { strictlyNecessary: true, functional: false, analytics: false, targeting: false },
        createdAt: new Date()
      }
    ]
  });
  try {
    const response = await app.request("/api/v1/analytics/pageviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "/products", sessionId: randomUUID(), consentAnalytics: true, consentAnonymousId: anonymousId })
    });
    assert.equal(response.status, 403);
  } finally {
    await prisma.privacyConsentEvent.deleteMany({ where: { anonymousId } });
  }
});

test("analytics rejects unrecorded consent and sensitive paths", async () => {
  const unrecorded = await app.request("/api/v1/analytics/pageviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: "/products",
      sessionId: randomUUID(),
      consentAnalytics: true,
      consentAnonymousId: randomUUID()
    })
  });
  assert.equal(unrecorded.status, 403);

  const anonymousId = randomUUID();
  await prisma.privacyConsentEvent.create({
    data: {
      anonymousId,
      source: "accept-all",
      action: "granted",
      preferences: { strictlyNecessary: true, functional: true, analytics: true, targeting: true }
    }
  });
  try {
    const sensitive = await app.request("/api/v1/analytics/pageviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: "/orders/secret",
        sessionId: randomUUID(),
        consentAnalytics: true,
        consentAnonymousId: anonymousId
      })
    });
    assert.equal(sensitive.status, 400);
  } finally {
    await prisma.privacyConsentEvent.deleteMany({ where: { anonymousId } });
  }
});
