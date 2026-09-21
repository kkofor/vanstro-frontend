import { prisma, type Prisma } from "@vanstro/db";
import { Hono } from "hono";
import { type DashboardEnv, writeAudit } from "./access.js";
import { permissionGrant, resolveDashboardAuthorization } from "./authorization.js";
import { publicError } from "../public-errors.js";
import { dashboardCommonQueryReadiness } from "../config.js";
import {
  COMMON_QUERY_PROFILES,
  CommonQueryError,
  canonicalOrder,
  createCursorCodec,
  enforceCommonQuerySize,
  fieldProfileFingerprint,
  grantFingerprint,
  formatCursorMeta,
  literalLikePrefix,
  parseCommonQuery,
  parseCommonQueryStructure,
  queryFingerprint,
  type CursorBindings
} from "./common-query.js";
import {
  badRequest,
  conflict,
  notFound,
  optionalBoolean,
  optionalString,
  pageMeta,
  parsePagination,
  readBody
} from "./request.js";

function cursorKeyset() {
  const keyset = dashboardCommonQueryReadiness().keyset;
  if (!keyset) throw new CommonQueryError("QUERY_UNAVAILABLE", "Query service is unavailable.");
  return keyset;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Auditable map coordinates: both values must be present or both absent, and
// each must sit inside the physical lat/lng ranges. No external geocoder is
// invoked; the operator-entered pair is preserved verbatim.
function parseCoordinates(body: Record<string, unknown>): { latitude: number | undefined; longitude: number | undefined } | Error {
  const latitude = optionalNumber(body.latitude);
  const longitude = optionalNumber(body.longitude);
  const hasLatitude = body.latitude !== undefined && body.latitude !== null && body.latitude !== "";
  const hasLongitude = body.longitude !== undefined && body.longitude !== null && body.longitude !== "";
  if (hasLatitude !== hasLongitude) return new Error("latitude and longitude must be provided together.");
  if (hasLatitude) {
    if (latitude === undefined || latitude < -90 || latitude > 90) return new Error("latitude must be a number between -90 and 90.");
    if (longitude === undefined || longitude < -180 || longitude > 180) return new Error("longitude must be a number between -180 and 180.");
  }
  return { latitude, longitude };
}

type DealerReferenceSummary = {
  locations: { total: number; active: number };
  inventorySnapshots: number;
  inventoryReservations: number;
  orders: number;
  paymentSessions: number;
  supportHandoffs: number;
  memberships: number;
  erpLinks: number;
  serviceAreas: number;
};

async function dealerReferenceSummary(dealerId: string): Promise<DealerReferenceSummary> {
  const locations = await prisma.dealerLocation.findMany({ where: { dealerId }, select: { id: true, status: true } });
  const locationIds = locations.map((location) => location.id);
  const locationWhere = locationIds.length ? { dealerLocationId: { in: locationIds } } : { dealerLocationId: null };
  const [inventorySnapshots, inventoryReservations, orders, paymentSessions, supportHandoffs, memberships, erpLinks, serviceAreas] = await Promise.all([
    prisma.inventorySnapshot.count({ where: { dealerLocation: { dealerId } } }),
    prisma.inventoryReservation.count({ where: { dealerLocation: { dealerId } } }),
    prisma.order.count({ where: locationWhere }),
    prisma.paymentSession.count({ where: locationWhere }),
    prisma.supportHandoff.count({ where: { dealerId } }),
    prisma.dealerMembership.count({ where: { dealerId } }),
    prisma.dealerErpLink.count({ where: { dealerId } }),
    prisma.dealerServiceArea.count({ where: { dealerLocation: { dealerId } } })
  ]);
  return {
    locations: { total: locations.length, active: locations.filter((location) => location.status === "active").length },
    inventorySnapshots,
    inventoryReservations,
    orders,
    paymentSessions,
    supportHandoffs,
    memberships,
    erpLinks,
    serviceAreas
  };
}

function dependencyPayload(dealer: { id: string; code: string; name: string; status: string }, references: DealerReferenceSummary) {
  const totalReferences = references.locations.total
    + references.inventorySnapshots
    + references.inventoryReservations
    + references.orders
    + references.paymentSessions
    + references.supportHandoffs
    + references.memberships
    + references.erpLinks
    + references.serviceAreas;
  return {
    dealer,
    references,
    physicallyDeletable: totalReferences === 0
  };
}

export function createDashboardDealerRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/dealers", async (context) => {
    const authorization = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash"));
    const grant = permissionGrant(authorization, "dealers.read");
    if (!grant) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "dealers.read is required.");
    const scopeWhere: Prisma.DealerWhereInput = grant.global ? {} : { id: { in: grant.dealerIds } };
    context.header("Cache-Control", "private, no-store");

    if (context.req.query("queryVersion") === undefined) {
      const pagination = parsePagination(context);
      const [dealers, total] = await Promise.all([
        prisma.dealer.findMany({
          where: scopeWhere,
          select: {
            id: true, code: true, name: true, status: true,
            locations: {
              where: grant.global ? {} : { id: { in: grant.locationIds } },
              select: { id: true, dealerId: true, code: true, name: true, city: true, province: true, status: true, pickupAvailable: true, deliveryAvailable: true }
            }
          },
          orderBy: { name: "asc" },
          skip: pagination.skip,
          take: pagination.take
        }),
        prisma.dealer.count({ where: scopeWhere })
      ]);
      return context.json({ data: dealers, meta: pageMeta(pagination, total) });
    }

    try {
      const params = context.req.url.slice(context.req.url.indexOf("?") + 1);
      const raw = parseCommonQueryStructure(COMMON_QUERY_PROFILES.dealers, params);
      const codec = createCursorCodec(cursorKeyset());
      const phaseABindings = {
        resource: COMMON_QUERY_PROFILES.dealers.resource,
        profileVersion: COMMON_QUERY_PROFILES.dealers.id,
        permissionKey: COMMON_QUERY_PROFILES.dealers.requiredPermission,
        actorId: authorization.actorId,
        contextRevision: authorization.contextRevision,
        grantFingerprint: grantFingerprint(grant),
        fieldProfileHash: fieldProfileFingerprint(COMMON_QUERY_PROFILES.dealers)
      };
      const phaseAPayload = raw.after?.[0] ? codec.open(raw.after[0], phaseABindings) : undefined;
      if (phaseAPayload && (phaseAPayload.position.length !== 1 || typeof phaseAPayload.position[0] !== "string")) throw new CommonQueryError("CURSOR_INVALID", "Cursor is invalid.", "after");
      const query = parseCommonQuery(COMMON_QUERY_PROFILES.dealers, params, { deferSize: true });
      if (!("after" in query) && "offset" in query) throw new CommonQueryError("QUERY_INVALID", "Cursor pagination is required.");
      const dealerIds = query.filters.dealerId;
      const requestedDealerIds = dealerIds ? (Array.isArray(dealerIds) ? dealerIds : [dealerIds]) as string[] : undefined;
      const bindings: CursorBindings = {
        resource: COMMON_QUERY_PROFILES.dealers.resource,
        profileVersion: COMMON_QUERY_PROFILES.dealers.id,
        permissionKey: COMMON_QUERY_PROFILES.dealers.requiredPermission,
        actorId: authorization.actorId,
        contextRevision: authorization.contextRevision,
        grantFingerprint: grantFingerprint(grant),
        fieldProfileHash: fieldProfileFingerprint(COMMON_QUERY_PROFILES.dealers),
        queryHash: queryFingerprint(COMMON_QUERY_PROFILES.dealers, query),
        order: canonicalOrder(COMMON_QUERY_PROFILES.dealers, query)
      };
      let position: [string] | undefined;
      if (query.after) {
        const decoded = phaseAPayload!;
        // Phase B compares only canonical semantic query/order bindings.
        codec.open(query.after, { queryHash: bindings.queryHash, order: bindings.order });
        enforceCommonQuerySize(params);
        position = decoded.position as [string];
      } else {
        enforceCommonQuerySize(params);
      }
      const codeMatches = query.q ? await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM dealers WHERE code !~ '[^ -~]' AND translate(code,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz') COLLATE "C" LIKE ${literalLikePrefix(query.q)} ESCAPE chr(92)
      ` : undefined;
      const where: Prisma.DealerWhereInput = { AND: [scopeWhere,
        ...(requestedDealerIds ? [{ id: { in: requestedDealerIds } }] : []),
        ...(query.filters.status ? [{ status: query.filters.status as "active" | "inactive" }] : []),
        ...(codeMatches ? [{ id: { in: codeMatches.map(({ id }) => id) } }] : [])
      ] };
      const keyset: Prisma.DealerWhereInput | undefined = position ? { id: { gt: position[0] } } : undefined;
      const capturedAt = new Date().toISOString();
      const rows = await prisma.dealer.findMany({
        where: keyset ? { AND: [where, keyset] } : where,
        select: {
          id: true, code: true, name: true, status: true,
          locations: {
            where: grant.global ? {} : { id: { in: grant.locationIds } },
            select: { id: true, dealerId: true, code: true, name: true, city: true, province: true, status: true, pickupAvailable: true, deliveryAvailable: true },
            orderBy: [{ name: "asc" }, { id: "asc" }]
          }
        },
        orderBy: { id: "asc" },
        take: query.limit + 1
      });
      const hasMore = rows.length > query.limit;
      const dealers = rows.slice(0, query.limit);
      const last = dealers.at(-1);
      const nextCursor = hasMore && last ? codec.seal(bindings, [last.id]) : undefined;
      const requestId = context.res.headers.get("X-Request-Id")!;
      return context.json({ data: dealers, meta: formatCursorMeta({ requestId, profile: COMMON_QUERY_PROFILES.dealers, query, capturedAt, hasMore, nextCursor }) });
    } catch (error) {
      if (error instanceof CommonQueryError) return publicError(context, error.code === "QUERY_UNAVAILABLE" ? 503 : 400, error.code, error.message, error.field ? { [error.field]: error.fieldLabel } : undefined);
      throw error;
    }
  });

  routes.get("/dashboard/dealers/:id", async (context) => {
    const authorization = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash"));
    const grant = permissionGrant(authorization, "dealers.read");
    const dealer = await prisma.dealer.findFirst({
      where: {
        id: context.req.param("id"),
        ...(grant?.global ? {} : { AND: { id: { in: grant?.dealerIds ?? [] } } })
      },
      select: {
        id: true, code: true, name: true, status: true, phone: true, email: true, website: true,
        locations: {
          where: grant?.global ? {} : { id: { in: grant?.locationIds ?? [] } },
          select: {
            id: true, dealerId: true, code: true, name: true,
            addressLine1: true, addressLine2: true, city: true, province: true, postalCode: true, country: true,
            latitude: true, longitude: true,
            status: true, pickupAvailable: true, deliveryAvailable: true, createdAt: true, updatedAt: true
          },
          orderBy: { name: "asc" }
        },
        erpLinks: {
          select: {
            id: true, dealerId: true, dealerLocationId: true, erpSystem: true, erpLocationId: true,
            createdAt: true, updatedAt: true,
            dealerLocation: { select: { id: true, code: true, name: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!dealer) return notFound(context, "Dealer not found.");
    return context.json({ data: dealer });
  });

  // Reference summary shown before archive ("delete") and required before any
  // physical delete: locations, inventory, orders, users, ERP links and
  // service areas. Contact details are never included.
  routes.get("/dashboard/dealers/:id/dependencies", async (context) => {
    const authorization = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash"));
    const grant = permissionGrant(authorization, "dealers.read");
    const dealer = await prisma.dealer.findFirst({
      where: {
        id: context.req.param("id"),
        ...(grant?.global ? {} : { AND: { id: { in: grant?.dealerIds ?? [] } } })
      },
      select: { id: true, code: true, name: true, status: true }
    });
    if (!dealer) return notFound(context, "Dealer not found.");
    const references = await dealerReferenceSummary(dealer.id);
    return context.json({ data: dependencyPayload(dealer, references) });
  });

  // Dealer removal is an archive operation. Physical deletion is deliberately
  // unavailable in production because an empty reference snapshot is neither
  // a durable test-record proof nor a race-safe independent confirmation.
  routes.delete("/dashboard/dealers/:id", async (context) => {
    const authorization = await resolveDashboardAuthorization(context.get("actorUserId"), prisma, new Date(), context.get("actorSessionTokenHash"));
    const grant = permissionGrant(authorization, "settings.write");
    if (!grant) return publicError(context, 403, "DASHBOARD_FORBIDDEN", "settings.write is required.");
    const dealer = await prisma.dealer.findFirst({
      where: {
        id: context.req.param("id"),
        ...(grant.global ? {} : { AND: { id: { in: grant.dealerIds } } })
      },
      select: { id: true, code: true, name: true, status: true }
    });
    if (!dealer) return notFound(context, "Dealer not found.");
    const references = await dealerReferenceSummary(dealer.id);
    return conflict(context, `Physical dealer deletion is disabled; archive the dealer instead (${references.locations.total} locations, ${references.orders} orders).`);
  });

  routes.post("/dashboard/dealers", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const code = optionalString(body, "code");
    const name = optionalString(body, "name");
    if (!code || !name) return badRequest(context, "code and name are required.");
    const status = (optionalString(body, "status") as "active" | "inactive" | undefined) ?? "active";
    if (status !== "active" && status !== "inactive") return badRequest(context, "status must be active or inactive.");
    try {
      const dealer = await prisma.dealer.create({
        data: {
          code,
          name,
          status,
          phone: optionalString(body, "phone"),
          email: optionalString(body, "email"),
          website: optionalString(body, "website")
        }
      });
      await writeAudit(context, "dashboard.dealers.create", "dealer", dealer.id, { code: dealer.code, status: dealer.status });
      return context.json({ data: dealer }, 201);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        return conflict(context, "A dealer with this code already exists.");
      }
      throw error;
    }
  });

  routes.patch("/dashboard/dealers/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const status = optionalString(body, "status") as "active" | "inactive" | undefined;
    if (status !== undefined && status !== "active" && status !== "inactive") return badRequest(context, "status must be active or inactive.");
    const existing = await prisma.dealer.findUnique({ where: { id: context.req.param("id") }, select: { id: true, status: true } });
    if (!existing) return notFound(context, "Dealer not found.");
    const dealer = await prisma.dealer.update({
      where: { id: existing.id },
      data: {
        code: optionalString(body, "code"),
        name: optionalString(body, "name"),
        status,
        phone: optionalString(body, "phone"),
        email: optionalString(body, "email"),
        website: optionalString(body, "website")
      }
    });
    // Lifecycle metadata only: no phone/email/website (contact details are
    // never written to the audit trail).
    const metadata: Prisma.InputJsonObject = status && status !== existing.status
      ? { statusTransition: `${existing.status}->${status}` }
      : {};
    await writeAudit(context, "dashboard.dealers.update", "dealer", dealer.id, metadata);
    return context.json({ data: dealer });
  });

  routes.post("/dashboard/dealers/:id/locations", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const code = optionalString(body, "code");
    const name = optionalString(body, "name");
    if (!code || !name) return badRequest(context, "code and name are required.");
    const status = (optionalString(body, "status") as "active" | "inactive" | undefined) ?? "active";
    if (status !== "active" && status !== "inactive") return badRequest(context, "status must be active or inactive.");
    const coordinates = parseCoordinates(body);
    if (coordinates instanceof Error) return badRequest(context, coordinates.message);
    const dealerExists = await prisma.dealer.findUnique({ where: { id: context.req.param("id") }, select: { id: true } });
    if (!dealerExists) return notFound(context, "Dealer not found.");
    const location = await prisma.dealerLocation.create({
      data: {
        dealerId: context.req.param("id"),
        code,
        name,
        addressLine1: optionalString(body, "addressLine1"),
        addressLine2: optionalString(body, "addressLine2"),
        city: optionalString(body, "city"),
        province: optionalString(body, "province"),
        postalCode: optionalString(body, "postalCode"),
        country: optionalString(body, "country") ?? "CA",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        status,
        pickupAvailable: optionalBoolean(body, "pickupAvailable") ?? false,
        deliveryAvailable: optionalBoolean(body, "deliveryAvailable") ?? false
      }
    });
    await writeAudit(context, "dashboard.dealer_locations.create", "dealer_location", location.id, { code: location.code, dealerId: location.dealerId });
    return context.json({ data: location }, 201);
  });

  routes.patch("/dashboard/dealer-locations/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const status = optionalString(body, "status") as "active" | "inactive" | undefined;
    if (status !== undefined && status !== "active" && status !== "inactive") return badRequest(context, "status must be active or inactive.");
    const coordinates = parseCoordinates(body);
    if (coordinates instanceof Error) return badRequest(context, coordinates.message);
    const existing = await prisma.dealerLocation.findUnique({ where: { id: context.req.param("id") }, select: { id: true, status: true } });
    if (!existing) return notFound(context, "Location not found.");
    const location = await prisma.dealerLocation.update({
      where: { id: existing.id },
      data: {
        code: optionalString(body, "code"),
        name: optionalString(body, "name"),
        addressLine1: optionalString(body, "addressLine1"),
        addressLine2: optionalString(body, "addressLine2"),
        city: optionalString(body, "city"),
        province: optionalString(body, "province"),
        postalCode: optionalString(body, "postalCode"),
        country: optionalString(body, "country"),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        status,
        pickupAvailable: optionalBoolean(body, "pickupAvailable"),
        deliveryAvailable: optionalBoolean(body, "deliveryAvailable")
      }
    });
    const metadata: Prisma.InputJsonObject = status && status !== existing.status
      ? { statusTransition: `${existing.status}->${status}` }
      : {};
    await writeAudit(context, "dashboard.dealer_locations.update", "dealer_location", location.id, metadata);
    return context.json({ data: location });
  });

  routes.post("/dashboard/dealers/:id/erp-links", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const erpSystem = optionalString(body, "erpSystem");
    const erpLocationId = optionalString(body, "erpLocationId");
    if (!erpSystem || !erpLocationId) return badRequest(context, "erpSystem and erpLocationId are required.");
    const link = await prisma.dealerErpLink.create({
      data: {
        dealerId: context.req.param("id"),
        dealerLocationId: optionalString(body, "dealerLocationId"),
        erpSystem,
        erpLocationId
      }
    });
    await writeAudit(context, "dashboard.dealer_erp_links.create", "dealer_erp_link", link.id);
    return context.json({ data: link }, 201);
  });

  routes.delete("/dashboard/dealers/:dealerId/erp-links/:linkId", async (context) => {
    const link = await prisma.dealerErpLink.findFirst({
      where: { id: context.req.param("linkId"), dealerId: context.req.param("dealerId") }
    });
    if (!link) return notFound(context, "ERP link not found.");
    await prisma.dealerErpLink.delete({ where: { id: link.id } });
    await writeAudit(context, "dashboard.dealer_erp_links.delete", "dealer_erp_link", link.id);
    return context.json({ data: { id: link.id, deleted: true } });
  });

  routes.post("/dashboard/dealer-locations/:id/service-areas", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const areaType = optionalString(body, "areaType");
    const areaCode = optionalString(body, "areaCode");
    if (!areaType || !areaCode) return badRequest(context, "areaType and areaCode are required.");
    const area = await prisma.dealerServiceArea.create({
      data: { dealerLocationId: context.req.param("id"), areaType, areaCode }
    });
    await writeAudit(context, "dashboard.dealer_service_areas.create", "dealer_service_area", area.id);
    return context.json({ data: area }, 201);
  });

  routes.delete("/dashboard/dealer-locations/:locationId/service-areas/:areaId", async (context) => {
    const area = await prisma.dealerServiceArea.findFirst({
      where: { id: context.req.param("areaId"), dealerLocationId: context.req.param("locationId") }
    });
    if (!area) return notFound(context, "Service area not found.");
    await prisma.dealerServiceArea.delete({ where: { id: area.id } });
    await writeAudit(context, "dashboard.dealer_service_areas.delete", "dealer_service_area", area.id);
    return context.json({ data: { id: area.id, deleted: true } });
  });

  return routes;
}
