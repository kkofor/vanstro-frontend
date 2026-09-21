import type { Prisma, PrismaClient } from "@prisma/client";
import { DASHBOARD_ROLE_MANIFEST, INITIAL_PERMISSIONS } from "./permissions.js";

export type RbacBootstrapSummary = {
  permissionsCreated: number;
  rolesCreated: number;
  rolesSkipped: number;
  grantsCreated: number;
  userAssignmentsCreated: 0;
};

type BootstrapDatabase = Prisma.TransactionClient | PrismaClient;

export async function bootstrapDashboardRbac(database: BootstrapDatabase): Promise<RbacBootstrapSummary> {
  const canonical = new Set<string>(INITIAL_PERMISSIONS);
  if (new Set(DASHBOARD_ROLE_MANIFEST.map((role) => role.key)).size !== DASHBOARD_ROLE_MANIFEST.length) {
    throw new Error("Dashboard role manifest keys must be unique.");
  }
  for (const role of DASHBOARD_ROLE_MANIFEST) {
    for (const permission of role.permissions) {
      if (!canonical.has(permission)) throw new Error(`Unknown permission in role manifest: ${permission}`);
    }
  }

  const existingPermissionKeys = new Set((await database.permission.findMany({
    where: { key: { in: [...INITIAL_PERMISSIONS] } },
    select: { key: true }
  })).map((permission) => permission.key));
  await database.permission.createMany({
    data: INITIAL_PERMISSIONS.filter((key) => !existingPermissionKeys.has(key)).map((key) => ({
      key,
      description: `Canonical Dashboard permission: ${key}`
    })),
    skipDuplicates: true
  });

  let rolesCreated = 0;
  let rolesSkipped = 0;
  let grantsCreated = 0;
  for (const definition of DASHBOARD_ROLE_MANIFEST) {
    const existing = await database.role.findUnique({ where: { key: definition.key }, select: { id: true } });
    const permissions = await database.permission.findMany({
      where: { key: { in: [...definition.permissions] } },
      select: { id: true, key: true }
    });
    if (permissions.length !== definition.permissions.length) {
      throw new Error(`Dashboard role ${definition.key} has unresolved permissions.`);
    }
    if (existing) {
      await database.role.update({ where: { id: existing.id }, data: { name: definition.name, isSystem: true } });
      const existingGrants = new Set((await database.rolePermission.findMany({ where: { roleId: existing.id }, select: { permissionId: true } })).map((grant) => grant.permissionId));
      const missing = permissions.filter((permission) => !existingGrants.has(permission.id));
      if (missing.length) await database.rolePermission.createMany({ data: missing.map((permission) => ({ roleId: existing.id, permissionId: permission.id })), skipDuplicates: true });
      grantsCreated += missing.length;
      rolesSkipped += 1;
    } else {
      await database.role.create({
        data: {
          key: definition.key,
          name: definition.name,
          description: `${definition.scope === "dealer" ? "Dealer-scoped" : "Global"} Dashboard role.`,
          isSystem: true,
          rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) }
        }
      });
      rolesCreated += 1;
      grantsCreated += permissions.length;
    }
  }

  return {
    permissionsCreated: INITIAL_PERMISSIONS.length - existingPermissionKeys.size,
    rolesCreated,
    rolesSkipped,
    grantsCreated,
    userAssignmentsCreated: 0
  };
}
