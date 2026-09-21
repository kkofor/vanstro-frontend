import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@vanstro/db";
import {
  assertManageableServiceAccounts,
  assertManageableUsers,
  getActorPermissionCeiling,
  PermissionCeilingError
} from "./permission-ceiling.js";

function permissionDatabase(actorPermissions: string[], targetPermissions: string[]) {
  let permissionQuery = 0;
  return {
    $queryRaw: async () => [],
    userRole: {
      findMany: async () => [{ roleId: "actor-role", role: { key: "operations_admin" } }]
    },
    rolePermission: {
      findMany: async () => {
        permissionQuery += 1;
        const permissions = permissionQuery === 1 ? actorPermissions : targetPermissions;
        return permissions.map((key) => ({ permission: { key } }));
      }
    }
  } as unknown as Prisma.TransactionClient;
}

test("dealer-scoped direct roles cannot raise the global permission ceiling", async () => {
  let queriedRoleIds: string[] = [];
  const database = {
    $queryRaw: async () => [],
    userRole: {
      findMany: async () => [
        { roleId: "global-role", role: { key: "operations_admin" } },
        { roleId: "dealer-role", role: { key: "dealer_admin" } }
      ]
    },
    rolePermission: {
      findMany: async ({ where }: { where: { roleId: { in: string[] } } }) => {
        queriedRoleIds = where.roleId.in;
        return ["dashboard.access", "users.manage"].map((key) => ({ permission: { key } }));
      }
    }
  } as unknown as Prisma.TransactionClient;

  const ceiling = await getActorPermissionCeiling(database, "actor");
  assert.deepEqual(queriedRoleIds, ["global-role"]);
  assert.deepEqual([...ceiling].sort(), ["dashboard.access", "users.manage"]);
  assert.equal(ceiling.has("orders.update"), false);
});

test("管理员不能管理拥有其未持有权限的用户", async () => {
  const database = permissionDatabase(
    ["dashboard.access", "users.manage"],
    ["dashboard.access", "users.manage", "settings.write"]
  );

  await assert.rejects(
    assertManageableUsers(database, "actor", ["super-admin"]),
    (error: unknown) =>
      error instanceof PermissionCeilingError &&
      error.status === 403 &&
      error.message.includes("settings.write")
  );
});

test("管理员可以管理权限不超过自身的用户", async () => {
  const database = permissionDatabase(
    ["dashboard.access", "users.manage", "products.read"],
    ["dashboard.access", "products.read"]
  );

  await assert.doesNotReject(
    assertManageableUsers(database, "actor", ["limited-admin"])
  );
});

test("管理员不能管理拥有其未持有权限的服务账号", async () => {
  const database = permissionDatabase(
    ["dashboard.access", "service_accounts.manage"],
    ["dashboard.access", "service_accounts.manage", "erp.jobs.retry"]
  );

  await assert.rejects(
    assertManageableServiceAccounts(database, "actor", ["elevated-service-account"]),
    (error: unknown) =>
      error instanceof PermissionCeilingError &&
      error.status === 403 &&
      error.message.includes("erp.jobs.retry")
  );
});
