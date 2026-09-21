import { createHash } from "node:crypto";
import { p02DashboardAuthorizationContext, prisma, type Prisma } from "@vanstro/db";
import { DASHBOARD_ROLE_MANIFEST, INITIAL_PERMISSIONS } from "@vanstro/db/permissions";
import { DASHBOARD_FOUNDATION_MODULES } from "./foundation.js";

const DEALER_SCOPED_ROLE_KEYS = new Set<string>(
  DASHBOARD_ROLE_MANIFEST.filter((role) => role.scope === "dealer").map((role) => role.key)
);
const POLICY_VERSION = "dashboard-authorization-policy.v4";

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url");
}

export function authorizationContextRevision(revisionInput: unknown) {
  return createHash("sha256").update(JSON.stringify(revisionInput)).digest("hex");
}

export type PermissionGrant = {
  permissionKey: string;
  global: boolean;
  dealerIds: string[];
  locationIds: string[];
};

export type DashboardAuthorizationContext = {
  actorId: string;
  globalRoleKeys: string[];
  scopedRoleKeys: string[];
  permissionGrants: PermissionGrant[];
  contextRevision: string;
};

type AuthorizationDatabase = typeof prisma | Prisma.TransactionClient;

function activeMembershipWhere(now: Date): Prisma.DealerMembershipWhereInput {
  return {
    status: "active",
    validFrom: { lte: now },
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    dealer: { status: "active" }
  };
}

function emptyAuthorization(actorId: string): DashboardAuthorizationContext {
  return { actorId, globalRoleKeys: [], scopedRoleKeys: [], permissionGrants: [], contextRevision: "unavailable" };
}

export async function resolveDashboardAuthorization(
  actorId: string,
  database: AuthorizationDatabase = prisma,
  now = new Date(),
  sessionTokenHash?: string
): Promise<DashboardAuthorizationContext> {
  if (!sessionTokenHash) throw new Error("P02_SESSION_BINDING_REQUIRED");
  return p02DashboardAuthorizationContext(database,sessionTokenHash,actorId);
}

async function legacyAuthorizationReference(actorId:string,database:AuthorizationDatabase,now:Date):Promise<DashboardAuthorizationContext>{
  const user = await database.user.findUnique({
    where: { id: actorId },
    select: {
      id: true,
      kind: true,
      status: true,
      userRoles: {
        select: {
          role: {
            select: {
              key: true,
              rolePermissions: { select: { permission: { select: { key: true } } } }
            }
          }
        }
      },
      dealerMemberships: {
        where: activeMembershipWhere(now),
        select: {
          id: true,
          dealerId: true,
          revision: true,
          status: true,
          validFrom: true,
          expiresAt: true,
          dealer: { select: { status: true } },
          roles: {
            select: {
              role: {
                select: {
                  key: true,
                  rolePermissions: { select: { permission: { select: { key: true } } } }
                }
              }
            }
          },
          locations: {
            where: { dealerLocation: { status: "active" } },
            select: { dealerLocationId: true, dealerLocation: { select: { status: true } } }
          }
        }
      }
    }
  });

  if (!user || user.kind !== "admin" || user.status !== "active") return emptyAuthorization(actorId);

  const canonical = new Set<string>(INITIAL_PERMISSIONS);
  const globalRoles = user.userRoles
    .map((entry) => entry.role)
    .filter((role) => !DEALER_SCOPED_ROLE_KEYS.has(role.key));
  const grants = new Map<string, { global: boolean; dealerIds: Set<string>; locationIds: Set<string> }>();
  const grantFor = (permissionKey: string) => {
    const existing = grants.get(permissionKey);
    if (existing) return existing;
    const created = { global: false, dealerIds: new Set<string>(), locationIds: new Set<string>() };
    grants.set(permissionKey, created);
    return created;
  };

  for (const role of globalRoles) {
    for (const assignment of role.rolePermissions) {
      if (canonical.has(assignment.permission.key)) grantFor(assignment.permission.key).global = true;
    }
  }

  const scopedRoleKeys = new Set<string>();
  for (const membership of user.dealerMemberships) {
    const scopedRoles = membership.roles
      .map((entry) => entry.role)
      .filter((role) => DEALER_SCOPED_ROLE_KEYS.has(role.key));
    if (!scopedRoles.length) continue;
    const membershipLocationIds = membership.locations.map((location) => location.dealerLocationId);
    for (const role of scopedRoles) {
      scopedRoleKeys.add(role.key);
      for (const assignment of role.rolePermissions) {
        if (!canonical.has(assignment.permission.key)) continue;
        const grant = grantFor(assignment.permission.key);
        grant.dealerIds.add(membership.dealerId);
        membershipLocationIds.forEach((locationId) => grant.locationIds.add(locationId));
      }
    }
  }

  const globalRoleKeys = [...new Set(globalRoles.map((role) => role.key))].sort();
  const permissionGrants = [...grants.entries()]
    .map(([permissionKey, grant]) => ({
      permissionKey,
      global: grant.global,
      dealerIds: [...grant.dealerIds].sort(),
      locationIds: [...grant.locationIds].sort()
    }))
    .sort((a, b) => a.permissionKey.localeCompare(b.permissionKey));
  const revisionInput = {
    policyVersion: POLICY_VERSION,
    actor: { id: user.id, status: user.status },
    globalRoles: globalRoles.map((role) => ({
      key: role.key,
      permissions: role.rolePermissions.map((assignment) => assignment.permission.key).filter((key) => canonical.has(key)).sort()
    })).sort((a, b) => a.key.localeCompare(b.key)),
    memberships: user.dealerMemberships.map((membership) => ({
      id: membership.id,
      dealerId: membership.dealerId,
      revision: membership.revision,
      status: membership.status,
      validFrom: membership.validFrom.toISOString(),
      expiresAt: membership.expiresAt?.toISOString() ?? null,
      dealerStatus: membership.dealer.status,
      roles: membership.roles.map((entry) => ({
        key: entry.role.key,
        permissions: entry.role.rolePermissions
          .map((assignment) => assignment.permission.key)
          .filter((key) => canonical.has(key))
          .sort()
      })).sort((a, b) => a.key.localeCompare(b.key)),
      locations: membership.locations.map((entry) => `${entry.dealerLocationId}:${entry.dealerLocation.status}`).sort()
    })).sort((a, b) => a.id.localeCompare(b.id))
  };

  return {
    actorId,
    globalRoleKeys,
    scopedRoleKeys: [...scopedRoleKeys].sort(),
    permissionGrants,
    contextRevision: authorizationContextRevision(revisionInput)
  };
}

export function permissionGrant(context: DashboardAuthorizationContext, permissionKey: string) {
  return context.permissionGrants.find((grant) => grant.permissionKey === permissionKey);
}

export function permissionGrantFingerprint(context: DashboardAuthorizationContext, permissionKey: string) {
  const grant = permissionGrant(context, permissionKey);
  return stableHash(grant
    ? { permissionKey, global: grant.global, dealerIds: [...grant.dealerIds].sort(), locationIds: [...grant.locationIds].sort() }
    : { permissionKey, denied: true });
}

export function authorizationScopeFingerprint(grant: PermissionGrant) {
  return stableHash({ global: grant.global, dealerIds: [...grant.dealerIds].sort(), locationIds: [...grant.locationIds].sort() });
}

export function hasPermission(context: DashboardAuthorizationContext, permissionKey: string) {
  return Boolean(permissionGrant(context, permissionKey));
}

export function hasGlobalPermission(context: DashboardAuthorizationContext, permissionKey: string) {
  return permissionGrant(context, permissionKey)?.global === true;
}

export function isDealerScopedRoleKey(key: string) {
  return DEALER_SCOPED_ROLE_KEYS.has(key);
}

export function projectAuthorizationModules(context: DashboardAuthorizationContext) {
  return DASHBOARD_FOUNDATION_MODULES.map((definition) => ({
    module: definition.module,
    route: definition.route,
    status: definition.permissions.some((key) => hasPermission(context, key)) ? "allowed" as const : "denied" as const,
    actions: definition.permissions.map((permissionKey) => {
      const grant = permissionGrant(context, permissionKey);
      return {
        action: "read" as const,
        permissionKey,
        decision: grant ? "allow" as const : "deny" as const,
        reason: grant ? "granted_by_persisted_permission" as const : "permission_required" as const,
        scope: grant?.global
          ? { kind: "global" as const }
          : grant
            ? { kind: grant.locationIds.length ? "location" as const : "dealer" as const, dealerIds: grant.dealerIds, locationIds: grant.locationIds }
            : { kind: "unavailable" as const }
      };
    })
  }));
}
