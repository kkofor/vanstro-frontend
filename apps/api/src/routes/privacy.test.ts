import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSENT_RECORD_RETENTION_MONTHS,
  consentRetentionCutoff,
  deleteExpiredConsentEvents
} from "@vanstro/db";
import { createPrivacyRoutes } from "./privacy.js";

test("consent retention cutoff is 24 calendar months before the supplied date", () => {
  assert.equal(CONSENT_RECORD_RETENTION_MONTHS, 24);
  assert.equal(
    consentRetentionCutoff(new Date("2026-07-25T12:30:00.000Z")).toISOString(),
    "2024-07-25T12:30:00.000Z"
  );
});

test("consent retention cutoff clamps month-end and leap-day dates", () => {
  assert.equal(
    consentRetentionCutoff(new Date("2026-01-31T08:15:30.250Z")).toISOString(),
    "2024-01-31T08:15:30.250Z"
  );
  assert.equal(
    consentRetentionCutoff(new Date("2024-02-29T08:15:30.250Z")).toISOString(),
    "2022-02-28T08:15:30.250Z"
  );
});

test("consent retention deletion uses the exact strict cutoff", async () => {
  let query: unknown;
  await deleteExpiredConsentEvents({
    privacyConsentEvent: {
      deleteMany: async (input: unknown) => {
        query = input;
        return { count: 0 };
      }
    }
  } as never, new Date("2024-02-29T08:15:30.250Z"));

  assert.deepEqual(query, {
    where: { createdAt: { lt: new Date("2022-02-28T08:15:30.250Z") } }
  });
});

test("consent route stores only canonical preferences and a stable action", async () => {
  let stored: Record<string, unknown> | undefined;
  const routes = createPrivacyRoutes({
    privacyConsentEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        stored = data;
        return { id: "event-1", createdAt: new Date("2026-07-25T12:00:00.000Z") };
      }
    }
  } as never);

  const response = await routes.request("/privacy/consent-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      anonymousId: " consent-id ",
      source: " custom ",
      preferences: {
        strictlyNecessary: true,
        functional: false,
        analytics: true,
        targeting: false,
        updatedAt: "must-not-be-stored",
        unknown: "must-not-be-stored"
      },
      extra: "must-not-be-stored"
    })
  });

  assert.equal(response.status, 201);
  assert.deepEqual(stored, {
    anonymousId: "consent-id",
    source: "custom",
    action: "updated",
    preferences: {
      strictlyNecessary: true,
      functional: false,
      analytics: true,
      targeting: false
    }
  });
});

test("consent route marks all-disabled choices as withdrawn", async () => {
  let stored: Record<string, unknown> | undefined;
  const routes = createPrivacyRoutes({
    privacyConsentEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        stored = data;
        return { id: "event-2", createdAt: new Date() };
      }
    }
  } as never);

  const response = await routes.request("/privacy/consent-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      anonymousId: "consent-id",
      source: "reject-all",
      preferences: {
        strictlyNecessary: true,
        functional: false,
        analytics: false,
        targeting: false
      }
    })
  });

  assert.equal(response.status, 201);
  assert.equal(stored?.action, "withdrawn");
});

test("consent route rejects unsupported or oversized identifiers before DB access", async () => {
  let calls = 0;
  const routes = createPrivacyRoutes({
    privacyConsentEvent: {
      create: async () => {
        calls += 1;
        throw new Error("must not run");
      }
    }
  } as never);
  const validPreferences = {
    strictlyNecessary: true,
    functional: true,
    analytics: false,
    targeting: false
  };

  for (const input of [
    { anonymousId: "x".repeat(129), source: "custom", preferences: validPreferences },
    { anonymousId: "consent-id", source: "untrusted-source", preferences: validPreferences },
    { anonymousId: "consent-id", source: "reject-all", preferences: validPreferences },
    {
      anonymousId: "consent-id",
      source: "accept-all",
      preferences: { ...validPreferences, analytics: false }
    }
  ]) {
    const response = await routes.request("/privacy/consent-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json() as { code: string }).code, "PRIVACY_CONSENT_INVALID");
  }
  assert.equal(calls, 0);
});

test("consent route converts DB failures to a stable public 500", async () => {
  const routes = createPrivacyRoutes({
    privacyConsentEvent: {
      create: async () => {
        throw new Error("database connection details must not leak");
      }
    }
  } as never);

  const response = await routes.request("/privacy/consent-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      anonymousId: "consent-id",
      source: "accept-all",
      preferences: {
        strictlyNecessary: true,
        functional: true,
        analytics: true,
        targeting: true
      }
    })
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Cookie preferences could not be recorded. Please try again.",
    code: "PRIVACY_CONSENT_FAILED"
  });
});
