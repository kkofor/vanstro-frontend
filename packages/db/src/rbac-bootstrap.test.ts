import assert from "node:assert/strict";
import test from "node:test";
import { DASHBOARD_ROLE_MANIFEST, INITIAL_PERMISSIONS, P08_PERMISSIONS } from "./permissions.js";
import { parseMembershipBackfill } from "./p02-membership-backfill.js";
import { bootstrapDashboardRbac } from "./rbac-bootstrap.js";

test("P02 role manifest has the authorized 12 stable roles and canonical bundles", () => {
  assert.deepEqual(DASHBOARD_ROLE_MANIFEST.map((role) => role.key), [
    "super_admin", "operations_admin", "catalog_manager", "inventory_manager", "order_manager",
    "marketing_manager", "content_editor", "customer_support", "finance_reconciliation",
    "dealer_admin", "analyst_viewer", "auditor"
  ]);
  const canonical = new Set<string>(INITIAL_PERMISSIONS);
  assert.equal(DASHBOARD_ROLE_MANIFEST.length, 12);
  assert.ok(DASHBOARD_ROLE_MANIFEST.every((role) => role.name.trim() && role.permissions.every((permission) => canonical.has(permission))));
  assert.equal(DASHBOARD_ROLE_MANIFEST.find((role) => role.key === "dealer_admin")?.scope, "dealer");
  assert.equal(new Set(DASHBOARD_ROLE_MANIFEST.map((role) => role.key)).size, 12);
});

test("P08 seeds six exact permissions without implicitly granting any role", () => {
  assert.deepEqual(P08_PERMISSIONS, [
    "dashboard.import.foundation_sample.read",
    "dashboard.import.foundation_sample.create",
    "dashboard.import.foundation_sample.commit",
    "dashboard.export.foundation_sample.read",
    "dashboard.export.foundation_sample.create",
    "dashboard.export.foundation_sample.download"
  ]);
  assert.equal(new Set(INITIAL_PERMISSIONS).size, INITIAL_PERMISSIONS.length);
  assert.ok(DASHBOARD_ROLE_MANIFEST.every((role) => role.permissions.every((permission) => !P08_PERMISSIONS.includes(permission as never))));
});

test("P02 explicit membership backfill defaults to zero and rejects inferred or unknown roles", () => {
  assert.deepEqual(parseMembershipBackfill({ entries: [] }), { entries: [] });
  assert.throws(() => parseMembershipBackfill({ entries: [{ email: "guess@example.test", dealerId: "dealer", locationIds: [], roleKeys: ["dealer_admin"] }] }), /userId/);
  assert.throws(() => parseMembershipBackfill({ entries: [{ userId: "user", dealerId: "dealer", locationIds: [], roleKeys: ["operations_admin"] }] }), /dealer-scoped roles/);
});

test("P04 bootstrap reconciles every existing canonical role without deleting extra grants or assigning users", async () => {
  const permissions = new Map<string, { id: string; key: string }>(INITIAL_PERMISSIONS.map((key) => [key, { id: `permission:${key}`, key }]));
  const roles = new Map<string, { id: string }>(DASHBOARD_ROLE_MANIFEST.map((role) => [role.key, { id: `role:${role.key}` }]));
  const grants = new Set<string>();
  const updates = new Map<string, { name: string; isSystem: boolean }>();
  for (const role of DASHBOARD_ROLE_MANIFEST) {
    for (const permission of role.permissions) {
      if (permission !== "audit_logs.read" || role.key !== "dealer_admin") {
        grants.add(`${roles.get(role.key)!.id}:${permissions.get(permission)!.id}`);
      }
    }
  }
  const extraDealerGrant = `${roles.get("dealer_admin")!.id}:permission:legacy.extra`;
  grants.add(extraDealerGrant);

  const database = {
    permission: {
      findMany: async ({ where }: { where: { key: { in: readonly string[] } } }) => where.key.in.flatMap((key) => permissions.get(key) ?? []),
      createMany: async () => ({ count: 0 })
    },
    role: {
      findUnique: async ({ where }: { where: { key: string } }) => roles.get(where.key) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: { name: string; isSystem: boolean } }) => {
        updates.set(where.id, data);
        return { id: where.id };
      },
      create: async () => { throw new Error("Existing canonical roles must not be recreated."); }
    },
    rolePermission: {
      findMany: async ({ where }: { where: { roleId: string } }) => [...grants]
        .filter((grant) => grant.startsWith(`${where.roleId}:`))
        .map((grant) => ({ permissionId: grant.slice(where.roleId.length + 1) })),
      createMany: async ({ data }: { data: Array<{ roleId: string; permissionId: string }> }) => {
        let count = 0;
        for (const grant of data) {
          const key = `${grant.roleId}:${grant.permissionId}`;
          if (!grants.has(key)) {
            grants.add(key);
            count += 1;
          }
        }
        return { count };
      }
    }
  };

  const first = await bootstrapDashboardRbac(database as never);
  assert.equal(first.grantsCreated, 1);
  assert.equal(first.userAssignmentsCreated, 0);
  assert.ok(grants.has(`${roles.get("dealer_admin")!.id}:${permissions.get("audit_logs.read")!.id}`));
  assert.ok(grants.has(extraDealerGrant));
  assert.equal(updates.size, DASHBOARD_ROLE_MANIFEST.length);
  for (const role of DASHBOARD_ROLE_MANIFEST) {
    assert.deepEqual(updates.get(roles.get(role.key)!.id), { name: role.name, isSystem: true });
  }

  const second = await bootstrapDashboardRbac(database as never);
  assert.equal(second.grantsCreated, 0);
  assert.equal(second.userAssignmentsCreated, 0);
  assert.ok(grants.has(extraDealerGrant));
});
