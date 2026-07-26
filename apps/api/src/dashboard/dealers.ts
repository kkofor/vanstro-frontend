import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { type DashboardEnv, writeAudit } from "./access.js";
import {
  badRequest,
  notFound,
  optionalBoolean,
  optionalString,
  pageMeta,
  parsePagination,
  readBody
} from "./request.js";

export function createDashboardDealerRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/dealers", async (context) => {
    const pagination = parsePagination(context);
    const [dealers, total] = await Promise.all([
      prisma.dealer.findMany({
        include: {
          erpLinks: true,
          locations: { include: { serviceAreas: true } }
        },
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.dealer.count()
    ]);
    return context.json({ data: dealers, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/dealers/:id", async (context) => {
    const dealer = await prisma.dealer.findUnique({
      where: { id: context.req.param("id") },
      include: {
        erpLinks: true,
        locations: { include: { serviceAreas: true }, orderBy: { name: "asc" } }
      }
    });
    if (!dealer) return notFound(context, "Dealer not found.");
    return context.json({ data: dealer });
  });

  routes.post("/dashboard/dealers", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const code = optionalString(body, "code");
    const name = optionalString(body, "name");
    if (!code || !name) return badRequest(context, "code and name are required.");
    const dealer = await prisma.dealer.create({
      data: {
        code,
        name,
        status: (optionalString(body, "status") as "active" | "inactive" | undefined) ?? "active",
        phone: optionalString(body, "phone"),
        email: optionalString(body, "email"),
        website: optionalString(body, "website")
      }
    });
    await writeAudit(context, "dashboard.dealers.create", "dealer", dealer.id);
    return context.json({ data: dealer }, 201);
  });

  routes.patch("/dashboard/dealers/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const dealer = await prisma.dealer.update({
      where: { id: context.req.param("id") },
      data: {
        code: optionalString(body, "code"),
        name: optionalString(body, "name"),
        status: optionalString(body, "status") as "active" | "inactive" | undefined,
        phone: optionalString(body, "phone"),
        email: optionalString(body, "email"),
        website: optionalString(body, "website")
      }
    });
    await writeAudit(context, "dashboard.dealers.update", "dealer", dealer.id);
    return context.json({ data: dealer });
  });

  routes.post("/dashboard/dealers/:id/locations", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const code = optionalString(body, "code");
    const name = optionalString(body, "name");
    if (!code || !name) return badRequest(context, "code and name are required.");
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
        pickupAvailable: optionalBoolean(body, "pickupAvailable") ?? false,
        deliveryAvailable: optionalBoolean(body, "deliveryAvailable") ?? false
      }
    });
    await writeAudit(context, "dashboard.dealer_locations.create", "dealer_location", location.id);
    return context.json({ data: location }, 201);
  });

  routes.patch("/dashboard/dealer-locations/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const location = await prisma.dealerLocation.update({
      where: { id: context.req.param("id") },
      data: {
        code: optionalString(body, "code"),
        name: optionalString(body, "name"),
        addressLine1: optionalString(body, "addressLine1"),
        addressLine2: optionalString(body, "addressLine2"),
        city: optionalString(body, "city"),
        province: optionalString(body, "province"),
        postalCode: optionalString(body, "postalCode"),
        country: optionalString(body, "country"),
        pickupAvailable: optionalBoolean(body, "pickupAvailable"),
        deliveryAvailable: optionalBoolean(body, "deliveryAvailable")
      }
    });
    await writeAudit(context, "dashboard.dealer_locations.update", "dealer_location", location.id);
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
