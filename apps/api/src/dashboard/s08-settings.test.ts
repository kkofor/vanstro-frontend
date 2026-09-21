import assert from "node:assert/strict";
import test from "node:test";
import { S08_COMPILED_VALUE, S08_DESCRIPTOR_KEY, S08_SCHEMA_VERSION, consumerMatrix, isStructurallyValidValue } from "./s08-settings.js";

test("S08 typed contract has four exact policy families", () => {
  assert.equal(S08_DESCRIPTOR_KEY, "settings.api-service-account");
  assert.equal(S08_SCHEMA_VERSION, "settings.api-service-account.v1");
  assert.deepEqual(Object.keys(S08_COMPILED_VALUE), ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"]);
});

test("S08 compiled defaults preserve current Service Account facts", () => {
  assert.deepEqual(S08_COMPILED_VALUE.tokenLifecyclePolicy, { defaultTtlDays: 90, maximumTtlDays: 365, rotationOverlapMinutes: 0, maximumActiveTokensPerAccount: 1, requireExpiry: false });
  assert.deepEqual(S08_COMPILED_VALUE.machineScopePolicy, { allowedRoleKeys: [], allowedPermissionFamilies: [], environment: "production", dealerLocationScopeMode: "global", denySensitivePermissionsByDefault: true });
  assert.deepEqual(S08_COMPILED_VALUE.rateLimitPolicy, { requestsPerMinute: 100, burst: 0, mode: "per-token", retryAfterSemantics: "seconds" });
  assert.deepEqual(S08_COMPILED_VALUE.auditInvocationPolicy, { invocationRetentionDays: 365, metadataRedactionMode: "standard", lastUsedTrackingEnabled: true, failedAuthenticationAuditEnabled: true });
});

test("S08 structural validator accepts the compiled default and rejects unknown fields or out-of-bound values", () => {
  assert.equal(isStructurallyValidValue(S08_COMPILED_VALUE), true);
  const mutated = structuredClone(S08_COMPILED_VALUE);
  (mutated as Record<string, unknown>).oneTimeRevealEnabled = false;
  assert.equal(isStructurallyValidValue(mutated), false, "unknown top-level field must be rejected");
  const ttlTooHigh = structuredClone(S08_COMPILED_VALUE);
  ttlTooHigh.tokenLifecyclePolicy.maximumTtlDays = 366;
  assert.equal(isStructurallyValidValue(ttlTooHigh), false, "TTL above the 365-day hard ceiling must be rejected");
  const badEnvironment = { ...S08_COMPILED_VALUE, machineScopePolicy: { ...S08_COMPILED_VALUE.machineScopePolicy, environment: "prod" as string } };
  assert.equal(isStructurallyValidValue(badEnvironment), false, "environment enum must be exact");
  const duplicateFamily = structuredClone(S08_COMPILED_VALUE);
  duplicateFamily.machineScopePolicy.allowedPermissionFamilies = ["erp", "erp"];
  assert.equal(isStructurallyValidValue(duplicateFamily), false, "permission families must be unique");
  const badBurst = structuredClone(S08_COMPILED_VALUE);
  badBurst.rateLimitPolicy.burst = 10001;
  assert.equal(isStructurallyValidValue(badBurst), false, "burst bound must be 0..10000");
});

test("S08 consumer matrix mirrors the frozen contract exactly", () => {
  const matrix = consumerMatrix(7);
  const byId = new Map(matrix.map((entry) => [entry.id, entry]));
  assert.deepEqual([...byId.keys()], ["token-lifecycle", "rotate-overlap", "machine-scope-enforcement", "rate-limit", "audit-invocation-read-model", "erp-product-api-machine"]);
  for (const id of ["token-lifecycle", "rotate-overlap", "machine-scope-enforcement", "rate-limit", "audit-invocation-read-model"]) {
    assert.equal(byId.get(id)?.state, "implemented_ready", `${id} must be implemented_ready at an exact generation`);
    assert.equal(byId.get(id)?.reasonCode, null);
  }
  assert.equal(byId.get("erp-product-api-machine")?.state, "future_obligation");
  assert.equal(byId.get("erp-product-api-machine")?.reasonCode, "future_obligation");
});

test("S08 consumer matrix degrades honestly without a published generation", () => {
  const matrix = consumerMatrix(null);
  for (const entry of matrix) {
    if (entry.id === "erp-product-api-machine") {
      assert.equal(entry.state, "future_obligation");
    } else {
      assert.equal(entry.state, "implemented_degraded");
      assert.equal(entry.reasonCode, "consumer_generation_missing");
    }
  }
});
