import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

const app = createApp();

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
