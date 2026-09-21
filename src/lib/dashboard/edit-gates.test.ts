import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardAuthorization } from "@/lib/api/api-contract";
import {
  MODULE_WRITE_CAPABILITY,
  hasModuleWriteCapability,
  moduleWritePermissionKey
} from "./edit-gates.ts";

const MODULE_KEYS = ["categories", "products", "pricing", "promotions", "inventory", "orders", "customers", "users", "dealers"];

function authorizationWith(modules: Array<{ module: string; permissionKey: string; decision: "allow" | "deny" }>): DashboardAuthorization {
  return {
    contractVersion: "dashboard-authorization.v1",
    status: "ready",
    requestId: "test",
    issuedAt: "2026-08-13T00:00:00.000Z",
    expiresAt: "2026-08-14T00:00:00.000Z",
    contextRevision: 1,
    actor: { id: "actor-1", roleKeys: [], roleLabels: [], displayLabel: "Test" },
    visibility: { scope: "global", fields: "permission-only" },
    modules: modules.map((entry) => ({
      module: entry.module,
      actions: [
        {
          action: "update",
          permissionKey: entry.permissionKey,
          decision: entry.decision,
          reason: entry.decision === "allow" ? "granted_by_persisted_permission" : "permission_required",
          scope: { kind: "global" }
        }
      ],
      readAllowed: true
    })),
    commonQueryV1: { products: { enabled: false }, dealers: { enabled: false } },
    settingsCenterV1: { enabled: false, actions: { publish: false } },
    serviceAccountsV1: { enabled: false, manage: false },
    asyncJobFoundationV1: { enabled: false, sensitive: { enabled: false } },
    auditFoundationV1: { enabled: false, sensitive: { enabled: false } },
    workQueueFoundationV1: { enabled: false, notifications: { enabled: false, markRead: false }, sensitive: { enabled: false } },
    mediaFoundationV1: { enabled: false, sensitiveProfile: { enabled: false }, actions: { create: false, update: false, archive: false, restore: false, downloadOriginal: false, manageVariants: false } }
  } as unknown as DashboardAuthorization;
}

test("every business module maps to its OWN write capability", () => {
  assert.equal(MODULE_WRITE_CAPABILITY.categories, "categories.write");
  assert.equal(MODULE_WRITE_CAPABILITY.products, "products.write");
  assert.equal(MODULE_WRITE_CAPABILITY.pricing, "pricing.write");
  assert.equal(MODULE_WRITE_CAPABILITY.promotions, "pricing.write");
  assert.equal(MODULE_WRITE_CAPABILITY.inventory, "inventory.write");
  assert.equal(MODULE_WRITE_CAPABILITY.orders, "orders.update");
  assert.equal(MODULE_WRITE_CAPABILITY.customers, "crm.update");
  assert.equal(MODULE_WRITE_CAPABILITY.users, "users.manage");
  assert.equal(MODULE_WRITE_CAPABILITY.dealers, "settings.write");
});

test("products.write never opens categories, pricing, inventory, orders or users", () => {
  const authorization = authorizationWith([
    { module: "products", permissionKey: "products.write", decision: "allow" }
  ]);
  assert.equal(hasModuleWriteCapability(authorization, "products"), true);
  for (const moduleKey of MODULE_KEYS.filter((key) => key !== "products")) {
    assert.equal(hasModuleWriteCapability(authorization, moduleKey), false, `${moduleKey} must stay closed`);
  }
});

test("categories.write never opens any other module", () => {
  const authorization = authorizationWith([
    { module: "categories", permissionKey: "categories.write", decision: "allow" }
  ]);
  assert.equal(hasModuleWriteCapability(authorization, "categories"), true);
  for (const moduleKey of MODULE_KEYS.filter((key) => key !== "categories")) {
    assert.equal(hasModuleWriteCapability(authorization, moduleKey), false, `${moduleKey} must stay closed`);
  }
});

test("each module resolves only against its own allow, never a foreign grant", () => {
  const allAllow = authorizationWith(
    MODULE_KEYS.map((module) => ({ module, permissionKey: MODULE_WRITE_CAPABILITY[module], decision: "allow" as const }))
  );
  for (const moduleKey of MODULE_KEYS) {
    assert.equal(hasModuleWriteCapability(allAllow, moduleKey), true, `${moduleKey} opens with its own grant`);
  }
  // Swap one grant: a deny on the module's own key closes that module only.
  const withDenied = authorizationWith(
    MODULE_KEYS.map((module) => ({
      module,
      permissionKey: MODULE_WRITE_CAPABILITY[module],
      decision: (module === "orders" ? "deny" : "allow") as "allow" | "deny"
    }))
  );
  assert.equal(hasModuleWriteCapability(withDenied, "orders"), false);
  for (const moduleKey of MODULE_KEYS.filter((key) => key !== "orders")) {
    assert.equal(hasModuleWriteCapability(withDenied, moduleKey), true);
  }
});

test("deny decision, unknown module and missing authorization stay closed", () => {
  const denied = authorizationWith([
    { module: "categories", permissionKey: "categories.write", decision: "deny" }
  ]);
  assert.equal(hasModuleWriteCapability(denied, "categories"), false);
  assert.equal(hasModuleWriteCapability(denied, "settings"), false, "no capability mapping → closed");
  assert.equal(hasModuleWriteCapability(undefined, "categories"), false);
  assert.equal(moduleWritePermissionKey("audit"), null);
});
