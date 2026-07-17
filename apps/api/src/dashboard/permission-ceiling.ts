import { Prisma } from "@vanstro/db";

type PermissionCeilingDatabase = Prisma.TransactionClient;

export class PermissionCeilingError extends Error {
  constructor(
    readonly status: 400 | 403,
    message: string
  ) {
    super(message);
  }
}

export async function lockUsersForPermissionChange(
  database: PermissionCeilingDatabase,
  userIds: string[]
) {
  const ids = [...new Set(userIds)].sort();
  if (!ids.length) return;

  await database.$queryRaw(
    Prisma.sql`SELECT "id" FROM "users" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`
  );
}

async function lockRolesForPermissionChange(
  database: PermissionCeilingDatabase,
  roleIds: string[]
) {
  const ids = [...new Set(roleIds)].sort();
  if (!ids.length) return;

  await database.$queryRaw(
    Prisma.sql`SELECT "id" FROM "roles" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`
  );
}

export async function getActorPermissionCeiling(
  database: PermissionCeilingDatabase,
  actorUserId: string,
  roleIdsToLock: string[] = [],
  userIdsToLock: string[] = []
) {
  await lockUsersForPermissionChange(database, [actorUserId, ...userIdsToLock]);

  const actorRoles = await database.userRole.findMany({
    where: { userId: actorUserId },
    select: { roleId: true }
  });

  await lockRolesForPermissionChange(database, [
    ...actorRoles.map((actorRole) => actorRole.roleId),
    ...roleIdsToLock
  ]);

  const actorPermissions = await database.rolePermission.findMany({
    where: { role: { userRoles: { some: { userId: actorUserId } } } },
    select: { permission: { select: { key: true } } }
  });

  return new Set(actorPermissions.map((item) => item.permission.key));
}

export function assertPermissionsWithinActorCeiling(
  permissionKeys: string[],
  actorPermissionSet: Set<string>
) {
  const disallowedPermissions = [
    ...new Set(permissionKeys.filter((permission) => !actorPermissionSet.has(permission)))
  ].sort();

  if (disallowedPermissions.length) {
    throw new PermissionCeilingError(
      403,
      `Cannot assign permissions the current user does not have: ${disallowedPermissions.join(", ")}.`
    );
  }
}

export async function assertAssignableRoles(
  database: PermissionCeilingDatabase,
  roleIds: string[],
  actorUserId: string,
  userIdsToLock: string[] = []
) {
  const uniqueRoleIds = [...new Set(roleIds)];
  const actorPermissionSet = await getActorPermissionCeiling(
    database,
    actorUserId,
    uniqueRoleIds,
    userIdsToLock
  );

  if (!uniqueRoleIds.length) return;

  const roles = await database.role.findMany({
    where: { id: { in: uniqueRoleIds } },
    include: {
      rolePermissions: {
        include: { permission: { select: { key: true } } }
      }
    }
  });

  if (roles.length !== uniqueRoleIds.length) {
    throw new PermissionCeilingError(400, "Every roleId must reference an existing role.");
  }

  assertPermissionsWithinActorCeiling(
    roles.flatMap((role) =>
      role.rolePermissions.map((rolePermission) => rolePermission.permission.key)
    ),
    actorPermissionSet
  );
}
