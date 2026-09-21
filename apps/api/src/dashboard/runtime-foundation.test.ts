import assert from "node:assert/strict";
import test from "node:test";
import { legacyRuntimeReadinessSnapshot } from "./runtime-foundation.js";

test("P09 legacy pure projection redacts configured values", () => {
  const snapshot = legacyRuntimeReadinessSnapshot({ DATABASE_URL: "postgresql://redacted", SMTP_HOST: "smtp.invalid" });
  assert.equal(JSON.stringify(snapshot).includes("postgresql://redacted"), false);
  assert.equal(JSON.stringify(snapshot).includes("smtp.invalid"), false);
  assert.ok(new Date(snapshot.staleAfter) > new Date(snapshot.observedAt));
});

test("P09 readiness projection performs no provider request", () => {
  let called = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => { called = true; throw new Error("network prohibited"); }) as typeof fetch;
  try {
    legacyRuntimeReadinessSnapshot({ DATABASE_URL: "configured", ERP_API_BASE_URL: "https://erp.invalid", MONERIS_STORE_ID: "configured" });
    assert.equal(called, false);
  } finally { globalThis.fetch = originalFetch; }
});
