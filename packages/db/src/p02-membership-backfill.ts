import { readFile } from "node:fs/promises";
import { prisma, Prisma } from "./index.js";
import { DASHBOARD_ROLE_MANIFEST } from "./permissions.js";

export type MembershipBackfillEntry = {
  userId: string;
  dealerId: string;
  locationIds: string[];
  roleKeys: string[];
  status?: "invited" | "active" | "suspended" | "revoked";
  validFrom?: string;
  expiresAt?: string;
};

export type MembershipBackfillPlan = {
  entries: MembershipBackfillEntry[];
};

function nonEmptyString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string.`);
  return value;
}

export function parseMembershipBackfill(value: unknown): MembershipBackfillPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Membership backfill must be an object.");
  const entries = (value as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) throw new Error("Membership backfill entries must be an array.");
  const allowedRoles = new Set<string>(DASHBOARD_ROLE_MANIFEST.filter((role) => role.scope === "dealer").map((role) => role.key));
  return {
    entries: entries.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`entries[${index}] must be an object.`);
      const record = entry as Record<string, unknown>;
      const locationIds = record.locationIds;
      const roleKeys = record.roleKeys;
      if (!Array.isArray(locationIds) || !locationIds.every((item) => typeof item === "string" && item.trim())) {
        throw new Error(`entries[${index}].locationIds must contain explicit IDs.`);
      }
      if (!Array.isArray(roleKeys) || !roleKeys.length || !roleKeys.every((item) => typeof item === "string" && allowedRoles.has(item))) {
        throw new Error(`entries[${index}].roleKeys must contain known dealer-scoped roles.`);
      }
      const status = record.status ?? "invited";
      if (!["invited", "active", "suspended", "revoked"].includes(String(status))) throw new Error(`entries[${index}].status is invalid.`);
      return {
        userId: nonEmptyString(record.userId, `entries[${index}].userId`),
        dealerId: nonEmptyString(record.dealerId, `entries[${index}].dealerId`),
        locationIds: [...new Set(locationIds as string[])],
        roleKeys: [...new Set(roleKeys as string[])],
        status: status as MembershipBackfillEntry["status"],
        ...(typeof record.validFrom === "string" ? { validFrom: record.validFrom } : {}),
        ...(typeof record.expiresAt === "string" ? { expiresAt: record.expiresAt } : {})
      };
    })
  };
}

export async function planMembershipBackfill(plan: MembershipBackfillPlan) {
  const rows = [];
  for (const entry of plan.entries) {
    const [user, dealer, locations, roles] = await Promise.all([
      prisma.user.findUnique({ where: { id: entry.userId }, select: { id: true, kind: true, status: true } }),
      prisma.dealer.findUnique({ where: { id: entry.dealerId }, select: { id: true, status: true } }),
      prisma.dealerLocation.findMany({ where: { id: { in: entry.locationIds }, dealerId: entry.dealerId }, select: { id: true, status: true } }),
      prisma.role.findMany({ where: { key: { in: entry.roleKeys } }, select: { id: true, key: true } })
    ]);
    if (!user || user.kind !== "admin") throw new Error(`Unknown or non-admin userId: ${entry.userId}`);
    if (!dealer) throw new Error(`Unknown dealerId: ${entry.dealerId}`);
    if (locations.length !== entry.locationIds.length) throw new Error(`One or more locations do not belong to dealerId: ${entry.dealerId}`);
    if (roles.length !== entry.roleKeys.length) throw new Error("One or more dealer-scoped roles do not exist.");
    rows.push({ entry, roleIds: roles.map((role) => role.id) });
  }
  return rows;
}

export async function applyMembershipBackfill(plan: MembershipBackfillPlan) {
  const rows = await planMembershipBackfill(plan);
  return prisma.$transaction(async (database) => {
    let created = 0;
    for (const row of rows) {
      const validFrom = row.entry.validFrom ? new Date(row.entry.validFrom) : new Date();
      const expiresAt = row.entry.expiresAt ? new Date(row.entry.expiresAt) : undefined;
      const membership = await database.dealerMembership.create({
        data: {
          userId: row.entry.userId,
          dealerId: row.entry.dealerId,
          status: row.entry.status,
          validFrom,
          expiresAt,
          revokedAt: row.entry.status === "revoked" ? new Date() : undefined,
          roles: { create: row.roleIds.map((roleId) => ({ roleId })) },
          locations: { create: row.entry.locationIds.map((dealerLocationId) => ({ dealerLocationId })) }
        }
      });
      await database.auditLog.create({
        data: {
          action: "dashboard.p02.membership.backfill",
          resourceType: "dealer_membership",
          resourceId: membership.id,
          metadata: { source: "explicit_manifest", dealerId: row.entry.dealerId, locationCount: row.entry.locationIds.length, roleKeys: row.entry.roleKeys } satisfies Prisma.InputJsonObject
        }
      });
      created += 1;
    }
    return { requested: plan.entries.length, created };
  });
}

async function main() {
  const path = process.env.P02_MEMBERSHIP_MANIFEST_PATH;
  const apply = process.env.P02_MEMBERSHIP_APPLY === "true";
  const raw = path ? JSON.parse(await readFile(path, "utf8")) : { entries: [] };
  const plan = parseMembershipBackfill(raw);
  const rows = await planMembershipBackfill(plan);
  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", requested: plan.entries.length, valid: rows.length, inferred: 0 }));
    return;
  }
  console.log(JSON.stringify({ mode: "apply", ...(await applyMembershipBackfill(plan)), inferred: 0 }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
}
