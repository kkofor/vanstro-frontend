import assert from "node:assert/strict";
import test from "node:test";
import { S08_COMPILED_VALUE, type ApiServiceAccountSettingsValueV1 } from "./s08-settings.js";
import { activeTokenCeilingReached, isSensitiveMachinePermission, machineScopeDenial, resolveReplacementExpiry, rotateOverlapUntil } from "./s08-settings-policy.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function policyWith(overrides: Partial<ApiServiceAccountSettingsValueV1["tokenLifecyclePolicy"]>): ApiServiceAccountSettingsValueV1 {
  return { ...S08_COMPILED_VALUE, tokenLifecyclePolicy: { ...S08_COMPILED_VALUE.tokenLifecyclePolicy, ...overrides } };
}

function expiresAtOf(result: { expiresAt: Date } | { error: string }): Date {
  if ("error" in result) throw new Error(`expected an expiry, got: ${result.error}`);
  return result.expiresAt;
}

function withScope(policy: ApiServiceAccountSettingsValueV1, scope: Partial<ApiServiceAccountSettingsValueV1["machineScopePolicy"]>): ApiServiceAccountSettingsValueV1 {
  return { ...policy, machineScopePolicy: { ...policy.machineScopePolicy, ...scope } };
}

test("S08 create/rotate expiry resolution uses policy default TTL with 90-day fallback", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");
  assert.equal(expiresAtOf(resolveReplacementExpiry(now, undefined, S08_COMPILED_VALUE)).getTime() - now.getTime(), 90 * DAY_MS);
  assert.equal(expiresAtOf(resolveReplacementExpiry(now, undefined, policyWith({ defaultTtlDays: 7 }))).getTime() - now.getTime(), 7 * DAY_MS);
  assert.equal(expiresAtOf(resolveReplacementExpiry(now, new Date(now.getTime() + 10 * DAY_MS), S08_COMPILED_VALUE)).getTime() - now.getTime(), 10 * DAY_MS);
});

test("S08 expiry resolution caps at maximumTtlDays and honors requireExpiry", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");
  assert.deepEqual(resolveReplacementExpiry(now, new Date(now.getTime() + 366 * DAY_MS), S08_COMPILED_VALUE), { error: "expiresAt cannot exceed 365 days." });
  assert.deepEqual(resolveReplacementExpiry(now, undefined, policyWith({ requireExpiry: true })), { error: "expiresAt is required when requireExpiry is enabled." });
});

test("S08 rotate overlap window is now + rotationOverlapMinutes", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");
  assert.equal(rotateOverlapUntil(now, policyWith({ rotationOverlapMinutes: 0 })).getTime(), now.getTime());
  assert.equal(rotateOverlapUntil(now, policyWith({ rotationOverlapMinutes: 30 })).getTime(), now.getTime() + 30 * 60 * 1000);
  assert.equal(rotateOverlapUntil(now, policyWith({ rotationOverlapMinutes: 1440 })).getTime(), now.getTime() + 1440 * 60 * 1000);
});

test("S08 maximum active tokens ceiling is enforced from the compiled default (1..100 per contract)", () => {
  assert.equal(activeTokenCeilingReached(0, S08_COMPILED_VALUE), false, "compiled ceiling 1 permits zero tokens");
  assert.equal(activeTokenCeilingReached(1, S08_COMPILED_VALUE), true, "compiled ceiling 1 blocks the first active token beyond the ceiling");
  const ceilingFive = policyWith({ maximumActiveTokensPerAccount: 5 });
  assert.equal(activeTokenCeilingReached(4, ceilingFive), false);
  assert.equal(activeTokenCeilingReached(5, ceilingFive), true);
  assert.equal(activeTokenCeilingReached(9, ceilingFive), true);
});

test("S08 sensitive permission classification is exact", () => {
  for (const sensitive of ["payments.recover", "payment.capture", "customers.pii.read", "erp.orders.pii", "users.manage", "settings.write", "audit.read_sensitive", "jobs.read_sensitive", "media.read_sensitive", "work_queue.read_sensitive"]) {
    assert.equal(isSensitiveMachinePermission(sensitive), true, `${sensitive} must be sensitive`);
  }
  for (const allowed of ["cli.access", "erp.catalog.read", "mcp.access", "erp.sync.read", "jobs.read", "media.read", "audit.read"]) {
    assert.equal(isSensitiveMachinePermission(allowed), false, `${allowed} must not be sensitive`);
  }
});

test("S08 machine scope denial applies deny-by-default, family, role and environment rules", () => {
  const principal = { roles: ["erp_operator"], environment: "staging" };
  const policy = withScope(policyWith({ rotationOverlapMinutes: 0 }) as ApiServiceAccountSettingsValueV1, { allowedRoleKeys: [], allowedPermissionFamilies: [], environment: "production", dealerLocationScopeMode: "global", denySensitivePermissionsByDefault: true });

  assert.equal(machineScopeDenial(principal, "erp.orders.pii", policy), "Sensitive permission is denied by default.");
  assert.equal(machineScopeDenial(principal, "erp.catalog.read", policy), null, "non-sensitive permission passes the default policy");

  const familyLimited = withScope(policy, { allowedPermissionFamilies: ["erp", "cli"] });
  assert.equal(machineScopeDenial(principal, "erp.catalog.read", familyLimited), null);
  assert.equal(machineScopeDenial(principal, "mcp.access", familyLimited), "The permission family is not allowed for this service account.");

  const roleLimited = withScope(policy, { allowedRoleKeys: ["cli_bot"] });
  assert.equal(machineScopeDenial(principal, "erp.catalog.read", roleLimited), "The service account role is not allowed.");

  const envRestricted = withScope(policy, { environment: "staging" });
  assert.equal(machineScopeDenial(principal, "erp.catalog.read", envRestricted), null, "staging account matches staging policy");
  assert.equal(machineScopeDenial({ ...principal, environment: "production" }, "erp.catalog.read", envRestricted), "The service account environment does not match the policy environment.");
});
