import { mediaReadiness, mediaRetryKeyReadiness, p02LockDashboardPrincipals, p02LockMembership, p02UpdateMembership, prisma, Prisma } from "@vanstro/db";
import { DASHBOARD_FOUNDATION_MODULES } from "./foundation.js";
import { type DashboardEnv } from "./access.js";
import { dashboardError, optionalString, optionalStringArray, readBody } from "./request.js";
import { hasGlobalPermission, hasPermission, isDealerScopedRoleKey, permissionGrant, projectAuthorizationModules, resolveDashboardAuthorization, type DashboardAuthorizationContext } from "./authorization.js";
import { getActorPermissionCeiling } from "./permission-ceiling.js";
import { Hono } from "hono";
import { asyncJobReadiness, dashboardCommonQueryReadiness, mediaConfig, workQueueReadiness } from "../config.js";
import { buildAuditMetadata, buildAuditSummary, recordAuditEvent } from "../audit/foundation.js";
import { serviceAccountsCapability, settingsCenterCapability } from "./settings.js";

const AUTHORIZATION_TTL_MS = 60_000;
const MEMBERSHIP_STATUSES = new Set(["invited", "active", "suspended", "revoked"]);

function requestId(context: { res: { headers: Headers } }) {
  return context.res.headers.get("X-Request-Id") ?? "unavailable";
}

function authorizationScopeSummary(authorization: DashboardAuthorizationContext) {
  const global = authorization.permissionGrants.some((grant) => grant.global);
  const dealerIds = [...new Set(authorization.permissionGrants.flatMap((grant) => grant.dealerIds))].sort();
  const locationIds = [...new Set(authorization.permissionGrants.flatMap((grant) => grant.locationIds))].sort();
  if (global && dealerIds.length) return { kind: "mixed" as const, source: "persisted_grants" as const };
  if (global) return { kind: "global" as const, source: "persisted_grants" as const };
  if (dealerIds.length) return {
    kind: locationIds.length ? "location" as const : "dealer" as const,
    source: "persisted_grants" as const,
    dealerIds,
    locationIds
  };
  return { kind: "unavailable" as const, source: "not_configured" as const };
}

async function assertGlobalMembershipManagement(
  database: Prisma.TransactionClient,
  actorUserId: string,
  sessionTokenHash: string,
  userIdsToLock: string[] = []
) {
  await p02LockDashboardPrincipals(database, sessionTokenHash, actorUserId, [actorUserId, ...userIdsToLock]);
  const authorization = await resolveDashboardAuthorization(actorUserId, database, new Date(), sessionTokenHash);
  if (!hasGlobalPermission(authorization, "users.manage") || !hasGlobalPermission(authorization, "settings.write")) {
    throw new Error("AUTHORIZATION_CHANGED");
  }
  return authorization;
}

function sameGrantScope(left: ReturnType<typeof permissionGrant>, right: ReturnType<typeof permissionGrant>) {
  return Boolean(left && right && left.global === right.global
    && JSON.stringify([...left.dealerIds].sort()) === JSON.stringify([...right.dealerIds].sort())
    && JSON.stringify([...left.locationIds].sort()) === JSON.stringify([...right.locationIds].sort()));
}

async function lockMembership(database: Prisma.TransactionClient, id: string, actorId: string, sessionTokenHash: string) {
  const rows = await p02LockMembership(database, sessionTokenHash, actorId, id);
  return rows[0];
}

const membershipSelect = {
  id: true, userId: true, dealerId: true, status: true, validFrom: true, expiresAt: true, revokedAt: true,
  revision: true, createdAt: true, updatedAt: true,
  dealer: { select: { id: true, code: true, name: true, status: true } },
  roles: { select: { role: { select: { id: true, key: true, name: true } } } },
  locations: { select: { dealerLocation: { select: { id: true, code: true, name: true, status: true } } } }
} satisfies Prisma.DealerMembershipSelect;

type SafeMembershipRecord = Prisma.DealerMembershipGetPayload<{ select: typeof membershipSelect }>;

function safeMembership(membership: SafeMembershipRecord, allowedLocationIds?: Set<string>) {
  return {
    id: membership.id,
    userId: membership.userId,
    dealer: membership.dealer,
    status: membership.status,
    validFrom: membership.validFrom.toISOString(),
    expiresAt: membership.expiresAt?.toISOString() ?? null,
    revokedAt: membership.revokedAt?.toISOString() ?? null,
    revision: membership.revision,
    roleKeys: membership.roles.map((entry) => entry.role.key).sort(),
    locations: membership.locations
      .map((entry) => entry.dealerLocation)
      .filter((location) => !allowedLocationIds || allowedLocationIds.has(location.id))
      .sort((a, b) => a.code.localeCompare(b.code)),
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString()
  };
}

export function createP02AccessRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/authorization", async (context) => {
    const authorization = context.get("p02Authorization");
    if (!hasPermission(authorization, "dashboard.access")) {
      return dashboardError(context, 403, "DASHBOARD_FORBIDDEN", "Dashboard access is required.");
    }
    const issuedAt = new Date();
    const scope = authorizationScopeSummary(authorization);
    context.header("Cache-Control", "private, no-store");
    const media = mediaConfig();
    const mediaProcessing = media.deploymentEnvironmentId
      ? await mediaReadiness(prisma, { deploymentEnvironmentId: media.deploymentEnvironmentId, expectedDigests: media.expectedDigests }).catch(() => ({ image: false, pdf: false }))
      : { image: false, pdf: false };
    const mediaRetryReady = media.retryKeyset ? await mediaRetryKeyReadiness(prisma, media.retryKeyset).catch(() => false) : false;
    return context.json({ data: {
      contractVersion: "dashboard-authorization.v1",
      status: scope.kind === "unavailable" ? "degraded" : "ready",
      requestId: requestId(context),
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + AUTHORIZATION_TTL_MS).toISOString(),
      contextRevision: authorization.contextRevision,
      actor: { principalType: "user", id: authorization.actorId, kind: "admin", status: "active", roleKeys: [...authorization.globalRoleKeys, ...authorization.scopedRoleKeys] },
      effectiveRoles: [
        ...authorization.globalRoleKeys.map((roleKey) => ({ roleKey, scope: "global" as const })),
        ...authorization.scopedRoleKeys.map((roleKey) => ({ roleKey, scope: "dealer" as const }))
      ],
      modules: projectAuthorizationModules(authorization),
      scope,
      fieldVisibility: [
        { resourceType: "users", profileId: hasPermission(authorization, "customers.pii.read") ? "pii-visible" : "pii-omitted" },
        { resourceType: "payments", profileId: hasPermission(authorization, "payments.reference.read") ? "reference-visible" : "reference-omitted" },
        { resourceType: "audit", profileId: hasPermission(authorization, "audit.read_sensitive") ? "sensitive-summary" : "redacted" }
      ],
      commonQueryV1: { products: { enabled: dashboardCommonQueryReadiness().products }, dealers: { enabled: dashboardCommonQueryReadiness().dealers } },
      auditFoundationV1: { enabled: dashboardCommonQueryReadiness().audit, queryProfile: "dashboard.audit-events.v1", eventVersion: "audit-event.v1", sensitive: { enabled: dashboardCommonQueryReadiness().audit && sameGrantScope(permissionGrant(authorization, "audit_logs.read"), permissionGrant(authorization, "audit.read_sensitive")) } },
      asyncJobFoundationV1: { enabled: asyncJobReadiness().enabled && Boolean(permissionGrant(authorization,"jobs.read")), contractVersion: "async-job.v1", queryProfile: "dashboard.async-jobs.v1", registryVersion: "async-job-registry.v1", sensitive: { enabled: asyncJobReadiness().enabled && sameGrantScope(permissionGrant(authorization,"jobs.read"),permissionGrant(authorization,"jobs.read_sensitive")) }, mutations: { create: asyncJobReadiness().enabled && Boolean(permissionGrant(authorization,"jobs.create")), cancel: asyncJobReadiness().enabled && Boolean(permissionGrant(authorization,"jobs.cancel")), retry: asyncJobReadiness().enabled && Boolean(permissionGrant(authorization,"jobs.retry")) }, artifacts: { metadata: asyncJobReadiness().enabled && Boolean(permissionGrant(authorization,"jobs.read")), download: false } },
      workQueueFoundationV1: { enabled: workQueueReadiness().enabled && Boolean(permissionGrant(authorization,"work_queue.read")), contractVersion:"work-queue-item.v1", queryProfile:"dashboard.work-queue.v1", registryVersion:"work-queue-registry.v1", sensitive:{enabled:workQueueReadiness().enabled&&sameGrantScope(permissionGrant(authorization,"work_queue.read"),permissionGrant(authorization,"work_queue.read_sensitive"))&&sameGrantScope(permissionGrant(authorization,"work_queue.read"),permissionGrant(authorization,"users.read"))}, actions:{assign:Boolean(permissionGrant(authorization,"work_queue.assign")),acknowledge:Boolean(permissionGrant(authorization,"work_queue.acknowledge")),resolve:Boolean(permissionGrant(authorization,"work_queue.resolve")),dismiss:Boolean(permissionGrant(authorization,"work_queue.dismiss")),reopen:Boolean(permissionGrant(authorization,"work_queue.reopen"))}, notifications:{enabled:Boolean(permissionGrant(authorization,"notifications.read")),contractVersion:"in-app-notification.v1",queryProfile:"dashboard.in-app-notifications.v1",markRead:Boolean(permissionGrant(authorization,"notifications.mark_read")),externalDelivery:false} },
      dataJobFoundationV1: (() => { const importRead=permissionGrant(authorization,"dashboard.import.foundation_sample.read"), importCreate=permissionGrant(authorization,"dashboard.import.foundation_sample.create"), importCommit=permissionGrant(authorization,"dashboard.import.foundation_sample.commit"), exportRead=permissionGrant(authorization,"dashboard.export.foundation_sample.read"), exportCreate=permissionGrant(authorization,"dashboard.export.foundation_sample.create"), exportDownload=permissionGrant(authorization,"dashboard.export.foundation_sample.download"); return { enabled:Boolean(importRead||importCreate||importCommit||exportRead||exportCreate||exportDownload), contractVersion:"dashboard.data-jobs.v1", registryVersion:"dashboard.data-jobs.registry.v1", objectKey:"foundation.sample", imports:{read:Boolean(importRead),create:Boolean(importCreate),commit:Boolean(importCommit)}, exports:{read:Boolean(exportRead),create:Boolean(exportCreate),download:Boolean(exportDownload)}, upload:{controlled:true,directAuthenticatedApi:true}, download:{controlled:true,directAuthenticatedApi:true}, tenantPartition:false }; })(),
      mediaFoundationV1: { enabled: Boolean(permissionGrant(authorization,"media.read")), contractVersion:"media-asset.v1", queryProfile:"dashboard.media-assets.v1", registryVersion:"media-registry.v1", safeProfile:"dashboard.media-assets.safe.v1", sensitiveProfile:{enabled:sameGrantScope(permissionGrant(authorization,"media.read"),permissionGrant(authorization,"media.read_sensitive")),profileId:"dashboard.media-assets.sensitive.v1"}, actions:{create:Boolean(permissionGrant(authorization,"media.create")),update:sameGrantScope(permissionGrant(authorization,"media.read"),permissionGrant(authorization,"media.update")),archive:sameGrantScope(permissionGrant(authorization,"media.read"),permissionGrant(authorization,"media.archive")),restore:sameGrantScope(permissionGrant(authorization,"media.read"),permissionGrant(authorization,"media.restore")),downloadOriginal:sameGrantScope(permissionGrant(authorization,"media.read"),permissionGrant(authorization,"media.download_original")),manageVariants:mediaRetryReady&&sameGrantScope(permissionGrant(authorization,"media.read"),permissionGrant(authorization,"media.manage_variants"))}, upload:{enabled:Boolean(media.privateRoot&&media.uploadKeyset&&(mediaProcessing.image||mediaProcessing.pdf)),image:mediaProcessing.image,pdf:mediaProcessing.pdf,maxBytes:{image:10485760,pdf:26214400},intentLifetimeSeconds:600,directControlledApi:true}, preview:{controlled:true,pdfInline:false},legacyAdapters:{enabled:true,partial:true},externalDelivery:false,ai:false,bulkImportExport:false },
      settingsCenterV1: settingsCenterCapability(authorization),
      serviceAccountsV1: serviceAccountsCapability(authorization)
    }});
  });

  routes.get("/dashboard/access/memberships", async (context) => {
    const auth = context.get("p02Authorization");
    const grant = permissionGrant(auth, "users.read");
    const allowedLocationIds = grant?.global ? undefined : new Set(grant?.locationIds ?? []);
    const where = grant?.global ? {} : {
      dealerId: { in: grant?.dealerIds ?? [] },
      ...(allowedLocationIds?.size ? { locations: { some: { dealerLocationId: { in: [...allowedLocationIds] } } } } : {})
    };
    const rows = await prisma.dealerMembership.findMany({ where, select: membershipSelect, orderBy: { createdAt: "desc" } });
    context.header("Cache-Control", "private, no-store");
    return context.json({ data: rows.map((row) => safeMembership(row, allowedLocationIds)) });
  });

  routes.get("/dashboard/access/memberships/:id", async (context) => {
    const auth = context.get("p02Authorization");
    const grant = permissionGrant(auth, "users.read");
    const allowedLocationIds = grant?.global ? undefined : new Set(grant?.locationIds ?? []);
    const row = await prisma.dealerMembership.findFirst({
      where: {
        id: context.req.param("id"),
        ...(grant?.global ? {} : {
          dealerId: { in: grant?.dealerIds ?? [] },
          ...(allowedLocationIds?.size ? { locations: { some: { dealerLocationId: { in: [...allowedLocationIds] } } } } : {})
        })
      },
      select: membershipSelect
    });
    if (!row) return dashboardError(context, 404, "DASHBOARD_NOT_FOUND", "Membership not found.");
    context.header("Cache-Control", "private, no-store");
    return context.json({ data: safeMembership(row, allowedLocationIds) });
  });

  routes.post("/dashboard/access/memberships", async (context) => {
    const body = await readBody(context);
    if (!body) return dashboardError(context, 400, "DASHBOARD_INVALID", "JSON body is required.");
    const userId = optionalString(body, "userId");
    const dealerId = optionalString(body, "dealerId");
    const roleKeys = optionalStringArray(body, "roleKeys") ?? [];
    const locationIds = optionalStringArray(body, "locationIds") ?? [];
    if (!userId || !dealerId || !roleKeys.length || roleKeys.some((key) => !isDealerScopedRoleKey(key))) {
      return dashboardError(context, 400, "DASHBOARD_INVALID", "Explicit userId, dealerId and dealer-scoped roleKeys are required.");
    }
    const actor = context.get("p02Authorization");
    if (!hasGlobalPermission(actor, "users.manage") || !hasGlobalPermission(actor, "settings.write")) {
      return dashboardError(context, 403, "DASHBOARD_FORBIDDEN", "Global membership management permission is required.");
    }
    const result = await prisma.$transaction(async (database) => {
      const currentActor = await assertGlobalMembershipManagement(database, context.get("actorUserId"), context.get("actorSessionTokenHash"), [userId]);
      await database.$queryRaw(Prisma.sql`SELECT "id" FROM "dealers" WHERE "id" = ${dealerId} FOR UPDATE`);
      const [user, dealer, roles, locations] = await Promise.all([
        database.user.findUnique({ where: { id: userId }, select: { id: true, kind: true } }),
        database.dealer.findUnique({ where: { id: dealerId }, select: { id: true, status: true } }),
        database.role.findMany({ where: { key: { in: roleKeys } }, select: { id: true, key: true } }),
        database.dealerLocation.findMany({ where: { id: { in: locationIds }, dealerId, status: "active" }, select: { id: true } })
      ]);
      if (!user || user.kind !== "admin" || !dealer || dealer.status !== "active" || roles.length !== new Set(roleKeys).size || locations.length !== new Set(locationIds).size) throw new Error("INVALID_MEMBERSHIP_REFERENCES");
      const membership = await database.dealerMembership.create({
        data: {
          userId, dealerId, status: "invited", createdByUserId: context.get("actorUserId"),
          roles: { create: roles.map((role) => ({ roleId: role.id })) },
          locations: { create: locations.map((location) => ({ dealerLocationId: location.id })) }
        },
        select: membershipSelect
      });
      await recordAuditEvent(context, currentActor, {
        action: "create", resource: { type: "membership", id: membership.id }, result: "succeeded",
        requiredPermissions: ["users.manage", "settings.write"], primaryPermission: "users.manage",
        afterSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["status", "roleCount", "locationCount"], values: { status: "invited", roleCount: roles.length, locationCount: locations.length } }, ["status", "roleCount", "locationCount"]),
        metadata: buildAuditMetadata({ dealerId, roleCount: roles.length, locationCount: locations.length }, ["dealerId", "roleCount", "locationCount"]),
        dedupKey: `membership:create:${membership.id}`
      }, database);
      return membership;
    }).catch((error: unknown) => error);
    if (result instanceof Error) {
      if (result.message === "AUTHORIZATION_CHANGED") return dashboardError(context, 403, "DASHBOARD_FORBIDDEN", "Global membership management permission is required.");
      if (result.message === "INVALID_MEMBERSHIP_REFERENCES") return dashboardError(context, 400, "DASHBOARD_INVALID", "Membership references are invalid.");
      if (result instanceof Prisma.PrismaClientKnownRequestError && result.code === "P2002") return dashboardError(context, 409, "DASHBOARD_CONFLICT", "Membership already exists.");
      throw result;
    }
    return context.json({ data: safeMembership(result as SafeMembershipRecord) }, 201);
  });

  routes.patch("/dashboard/access/memberships/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return dashboardError(context, 400, "DASHBOARD_INVALID", "JSON body is required.");
    const expectedRevision = body.expectedRevision;
    const status = optionalString(body, "status");
    const roleKeys = optionalStringArray(body, "roleKeys");
    const locationIds = optionalStringArray(body, "locationIds");
    if (!Number.isInteger(expectedRevision) || (status && !MEMBERSHIP_STATUSES.has(status)) || roleKeys?.some((key) => !isDealerScopedRoleKey(key))) {
      return dashboardError(context, 400, "DASHBOARD_INVALID", "A valid expectedRevision and membership update are required.");
    }
    const actor = context.get("p02Authorization");
    if (!hasGlobalPermission(actor, "users.manage") || !hasGlobalPermission(actor, "settings.write")) {
      return dashboardError(context, 403, "DASHBOARD_FORBIDDEN", "Global membership management permission is required.");
    }
    const result = await prisma.$transaction(async (database) => {
      const currentActor = await assertGlobalMembershipManagement(database, context.get("actorUserId"), context.get("actorSessionTokenHash"));
      const locked = await lockMembership(database, context.req.param("id"), context.get("actorUserId"), context.get("actorSessionTokenHash"));
      if (!locked) throw new Error("NOT_FOUND");
      if (locked.revision !== expectedRevision) throw new Error("REVISION_CHANGED");
      const current = await database.dealerMembership.findUniqueOrThrow({ where: { id: locked.id }, include: { roles: { include: { role: true } }, locations: true } });
      const roles = roleKeys ? await database.role.findMany({ where: { key: { in: roleKeys } }, select: { id: true, key: true } }) : [];
      const locations = locationIds ? await database.dealerLocation.findMany({ where: { id: { in: locationIds }, dealerId: current.dealerId, status: "active" }, select: { id: true } }) : [];
      if ((roleKeys && roles.length !== new Set(roleKeys).size) || (locationIds && locations.length !== new Set(locationIds).size)) throw new Error("INVALID_MEMBERSHIP_REFERENCES");
      const nextStatus = status ?? current.status;
      const nextRoleIds = roleKeys ? roles.map((role) => role.id).sort() : current.roles.map((entry) => entry.roleId).sort();
      const nextLocationIds = locationIds ? locations.map((location) => location.id).sort() : current.locations.map((entry) => entry.dealerLocationId).sort();
      const changed = nextStatus !== current.status || JSON.stringify(nextRoleIds) !== JSON.stringify(current.roles.map((entry) => entry.roleId).sort()) || JSON.stringify(nextLocationIds) !== JSON.stringify(current.locations.map((entry) => entry.dealerLocationId).sort());
      if (changed) {
        await p02UpdateMembership(database, { sessionTokenHash: context.get("actorSessionTokenHash"), actorId: context.get("actorUserId"), membershipId: current.id, expectedRevision: locked.revision, status: nextStatus, roleKeys, locationIds });
        await recordAuditEvent(context, currentActor, {
          action: "update", resource: { type: "membership", id: current.id }, result: "succeeded",
          requiredPermissions: ["users.manage", "settings.write"], primaryPermission: "users.manage",
          beforeSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["status", "roleCount", "locationCount"], values: { status: current.status, roleCount: current.roles.length, locationCount: current.locations.length } }, ["status", "roleCount", "locationCount"]),
          afterSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["status", "roleCount", "locationCount"], values: { status: nextStatus, roleCount: nextRoleIds.length, locationCount: nextLocationIds.length } }, ["status", "roleCount", "locationCount"]),
          metadata: buildAuditMetadata({ roleCount: nextRoleIds.length, locationCount: nextLocationIds.length }, ["roleCount", "locationCount"]),
          dedupKey: `membership:update:${current.id}:${locked.revision}`
        }, database);
      }
      return database.dealerMembership.findUniqueOrThrow({ where: { id: current.id }, select: membershipSelect });
    }).catch((error: unknown) => error);
    if (result instanceof Error) {
      if (result.message === "AUTHORIZATION_CHANGED") return dashboardError(context, 403, "DASHBOARD_FORBIDDEN", "Global membership management permission is required.");
      if (result.message === "NOT_FOUND") return dashboardError(context, 404, "DASHBOARD_NOT_FOUND", "Membership not found.");
      if (result.message === "REVISION_CHANGED") return dashboardError(context, 409, "DASHBOARD_CONFLICT", "Authorization context changed. Refresh and retry.");
      if (result.message === "INVALID_MEMBERSHIP_REFERENCES") return dashboardError(context, 400, "DASHBOARD_INVALID", "Membership references are invalid.");
      throw result;
    }
    return context.json({ data: safeMembership(result as SafeMembershipRecord) });
  });

  routes.get("/dashboard/access/dealers", async (context) => {
    const auth = context.get("p02Authorization");
    const grant = permissionGrant(auth, "dealers.read");
    const rows = await prisma.dealer.findMany({ where: grant?.global ? {} : { id: { in: grant?.dealerIds ?? [] } }, select: { id: true, code: true, name: true, status: true }, orderBy: { name: "asc" } });
    return context.json({ data: rows });
  });
  routes.get("/dashboard/access/dealers/:dealerId", async (context) => {
    const auth = context.get("p02Authorization");
    const grant = permissionGrant(auth, "dealers.read");
    const dealerId = context.req.param("dealerId");
    if (!grant?.global && !grant?.dealerIds.includes(dealerId)) return dashboardError(context, 404, "DASHBOARD_NOT_FOUND", "Dealer not found.");
    const row = await prisma.dealer.findUnique({ where: { id: dealerId }, select: { id: true, code: true, name: true, status: true } });
    if (!row) return dashboardError(context, 404, "DASHBOARD_NOT_FOUND", "Dealer not found.");
    return context.json({ data: row });
  });

  routes.get("/dashboard/access/dealers/:dealerId/locations", async (context) => {
    const auth = context.get("p02Authorization");
    const grant = permissionGrant(auth, "dealers.read");
    const dealerId = context.req.param("dealerId");
    if (!grant?.global && !grant?.dealerIds.includes(dealerId)) return dashboardError(context, 404, "DASHBOARD_NOT_FOUND", "Dealer not found.");
    const rows = await prisma.dealerLocation.findMany({ where: { dealerId, ...(grant?.global ? {} : { id: { in: grant?.locationIds ?? [] } }) }, select: { id: true, dealerId: true, code: true, name: true, status: true, province: true, updatedAt: true }, orderBy: { name: "asc" } });
    return context.json({ data: rows.map((row) => ({ ...row, revision: row.updatedAt.toISOString() })) });
  });

  routes.patch("/dashboard/access/dealer-locations/:id", async (context) => {
    const body = await readBody(context);
    const expectedRevision = optionalString(body ?? {}, "expectedRevision");
    const status = optionalString(body ?? {}, "status");
    if (!body || !expectedRevision || (status !== "active" && status !== "inactive")) return dashboardError(context, 400, "DASHBOARD_INVALID", "expectedRevision and a valid status are required.");
    const auth = context.get("p02Authorization");
    if (!hasGlobalPermission(auth, "settings.write")) return dashboardError(context, 403, "DASHBOARD_FORBIDDEN", "Global settings permission is required.");
    const result = await prisma.$transaction(async (database) => {
      const rows = await database.$queryRaw<Array<{ id: string; updatedAt: Date }>>(Prisma.sql`SELECT "id", "updatedAt" FROM "dealer_locations" WHERE "id" = ${context.req.param("id")} FOR UPDATE`);
      const current = rows[0];
      if (!current) throw new Error("NOT_FOUND");
      if (current.updatedAt.toISOString() !== expectedRevision) throw new Error("REVISION_CHANGED");
      await getActorPermissionCeiling(database, context.get("actorUserId"));
      const currentActor = await resolveDashboardAuthorization(context.get("actorUserId"), database, new Date(), context.get("actorSessionTokenHash"));
      if (!hasGlobalPermission(currentActor, "dashboard.access") || !hasGlobalPermission(currentActor, "settings.write")) throw new Error("AUTHORIZATION_CHANGED");
      const before = await database.dealerLocation.findUniqueOrThrow({ where: { id: current.id }, select: { status: true } });
      const location = await database.dealerLocation.update({ where: { id: current.id }, data: { status }, select: { id: true, dealerId: true, code: true, name: true, status: true, updatedAt: true } });
      if (before.status !== location.status) await recordAuditEvent(context, currentActor, { action: "update", resource: { type: "dealer_location", id: location.id }, result: "succeeded", requiredPermissions: ["dashboard.access", "settings.write"], primaryPermission: "settings.write", beforeSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["status"], values: { status: before.status } }, ["status"]), afterSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["status"], values: { status: location.status } }, ["status"]) }, database);
      return location;
    }).catch((error: unknown) => error);
    if (result instanceof Error) {
      if (result.message === "AUTHORIZATION_CHANGED") return dashboardError(context, 403, "DASHBOARD_FORBIDDEN", "Global settings permission is required.");
      if (result.message === "NOT_FOUND") return dashboardError(context, 404, "DASHBOARD_NOT_FOUND", "Location not found.");
      if (result.message === "REVISION_CHANGED") return dashboardError(context, 409, "DASHBOARD_CONFLICT", "Location changed. Refresh and retry.");
      throw result;
    }
    const location = result as { id: string; dealerId: string; code: string; name: string; status: "active" | "inactive"; updatedAt: Date };
    return context.json({ data: { ...location, revision: location.updatedAt.toISOString() } });
  });

  return routes;
}
