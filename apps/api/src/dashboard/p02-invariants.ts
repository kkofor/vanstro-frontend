import type { Prisma } from "@vanstro/db";

const SUPER_ADMIN_ROLE_KEY = "super_admin";

export class P02InvariantError extends Error {
  constructor(readonly status: 400 | 403 | 409, message: string) {
    super(message);
  }
}

export async function assertLastSuperAdminPreserved(
  database: Prisma.TransactionClient,
  targetUserId: string,
  change: { nextStatus?: string; removeRoleId?: string }
) {
  const superRole = await database.role.findUnique({ where: { key: SUPER_ADMIN_ROLE_KEY }, select: { id: true } });
  if (!superRole) throw new P02InvariantError(409, "The super_admin role is not configured.");
  const targetHasRole = await database.userRole.count({ where: { userId: targetUserId, roleId: superRole.id } });
  const removesRole = change.removeRoleId === superRole.id;
  const disablesUser = change.nextStatus === "suspended" || change.nextStatus === "archived";
  if (!targetHasRole || (!removesRole && !disablesUser)) return;
  const activeSuperAdmins = await database.user.count({
    where: { status: "active", kind: "admin", userRoles: { some: { roleId: superRole.id } } }
  });
  if (activeSuperAdmins <= 1) throw new P02InvariantError(409, "The last active Super Admin cannot be disabled or unassigned.");
}
