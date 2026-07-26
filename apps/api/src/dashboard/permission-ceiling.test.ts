import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@vanstro/db";
import {
  assertManageableUsers,
  PermissionCeilingError
} from "./permission-ceiling.js";

function permissionDatabase(actorPermissions: string[], targetPermissions: string[]) {
  let permissionQuery = 0;
  return {
    $queryRaw: async () => [],
    userRole: {
      findMany: async () => [{ roleId: "actor-role" }]
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

test("管理员不能管理拥有其未持有权限的用户", async () => {
  const database = permissionDatabase(
    ["dashboard.access", "users.manage"],
    ["dashboard.access", "users.manage", "system.settings.write"]
  );

  await assert.rejects(
    assertManageableUsers(database, "actor", ["super-admin"]),
    (error: unknown) =>
      error instanceof PermissionCeilingError &&
      error.status === 403 &&
      error.message.includes("system.settings.write")
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
