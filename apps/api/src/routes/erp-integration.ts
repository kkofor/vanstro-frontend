import { prisma } from "@vanstro/db";
import { type Context, Hono } from "hono";
import {
  requireMachineAccess,
  requireMachinePermission,
  type MachineEnv,
  writeMachineAudit
} from "../auth/service-account-access.js";
import { ErpProductApiError, ErpProductClient } from "../integrations/erp-product/client.js";
import { mapErpColorsToFinishOptions, parseErpDealerId } from "../integrations/erp-product/mappers.js";
import { publicError } from "../public-errors.js";

function parsePositiveInt(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function resolveErpDealerId(dealerLocationId?: string) {
  if (!dealerLocationId) return undefined;
  const location = await prisma.dealerLocation.findUnique({
    where: { id: dealerLocationId },
    include: {
      erpLinks: true,
      dealer: { include: { erpLinks: true } }
    }
  });
  const link = location?.erpLinks[0] ?? location?.dealer.erpLinks[0];
  return parseErpDealerId(link?.erpLocationId);
}

async function resolveProductErpMapping(productIdentifier: string) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: productIdentifier }, { slug: productIdentifier }], status: "active" },
    include: {
      skus: {
        where: { status: "active" },
        orderBy: { sortOrder: "asc" },
        include: { erpMappings: true }
      }
    }
  });
  if (!product) return undefined;
  const sku = product.skus[0];
  const mapping = sku?.erpMappings[0];
  if (!sku || !mapping) return undefined;
  return { product, sku, mapping };
}

function erpUnavailable(context: Context, error: unknown) {
  const message = error instanceof ErpProductApiError ? error.message : "ERP product service is unavailable.";
  return publicError(context, 502, "ERP_UNAVAILABLE", message);
}

/** Machine-facing catalog export + upstream ERP product proxy + public color enrichment. */
export function createErpIntegrationRoutes() {
  const routes = new Hono();
  const machineRoutes = new Hono<MachineEnv>();

  machineRoutes.use("/integrations/erp/catalog/*", requireMachineAccess("cli.access"));

  machineRoutes.get("/integrations/erp/catalog/skus", async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;

    const limit = Math.min(parsePositiveInt(context.req.query("limit")) ?? 100, 500);
    const offset = parsePositiveInt(context.req.query("offset")) ?? 0;
    const updatedSince = context.req.query("updatedSince");
    const updatedSinceDate = updatedSince ? new Date(updatedSince) : undefined;
    if (updatedSince && Number.isNaN(updatedSinceDate?.getTime())) {
      return context.json({ error: "updatedSince must be a valid ISO date." }, 400);
    }

    const where = {
      status: "active" as const,
      product: { status: "active" as const },
      ...(updatedSinceDate ? { updatedAt: { gte: updatedSinceDate } } : {})
    };

    const [skus, total] = await Promise.all([
      prisma.platformSku.findMany({
        where,
        include: {
          product: { include: { category: true } },
          prices: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 },
          assets: { orderBy: { sortOrder: "asc" }, take: 1 },
          erpMappings: true
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit
      }),
      prisma.platformSku.count({ where })
    ]);

    await writeMachineAudit(context, "integrations.erp.catalog.skus.list", "platform_sku");

    return context.json({
      data: skus.map((sku) => {
        const price = sku.prices[0];
        const mapping = sku.erpMappings[0];
        return {
          productId: sku.product.id,
          productSlug: sku.product.slug,
          productName: sku.product.name,
          platformSkuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          category: sku.product.category?.name ?? null,
          status: sku.status,
          price: price ? { amountCents: price.amountCents, currency: price.currency } : null,
          imageUrl: sku.assets[0]?.url ?? null,
          erpSystem: mapping?.erpSystem ?? null,
          erpSkuKey: mapping?.erpSkuKey ?? null,
          erpProductId: mapping?.erpProductId ?? null,
          erpSkuId: mapping?.erpSkuId ?? null,
          updatedAt: sku.updatedAt.toISOString()
        };
      }),
      meta: { limit, offset, total }
    });
  });

  machineRoutes.get("/integrations/erp/upstream/products", async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.productList({
        limit: parsePositiveInt(context.req.query("limit")),
        page: parsePositiveInt(context.req.query("page"))
      });
      await writeMachineAudit(context, "integrations.erp.upstream.products.list", "erp_product");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  machineRoutes.get("/integrations/erp/upstream/skus", async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.skuList({ productId: parsePositiveInt(context.req.query("product_id")) });
      await writeMachineAudit(context, "integrations.erp.upstream.skus.list", "erp_sku");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  machineRoutes.get("/integrations/erp/upstream/colors", async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.colorList({
        productId: parsePositiveInt(context.req.query("product_id")),
        productSkuId: parsePositiveInt(context.req.query("product_sku_id")),
        dealerId: parsePositiveInt(context.req.query("dealer_id"))
      });
      await writeMachineAudit(context, "integrations.erp.upstream.colors.list", "erp_color");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  machineRoutes.get("/integrations/erp/upstream/categories", async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.categoryList({ tree: context.req.query("tree") === "1" });
      await writeMachineAudit(context, "integrations.erp.upstream.categories.list", "erp_category");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  routes.get("/products/:identifier/erp-colors", async (context) => {
    const resolved = await resolveProductErpMapping(context.req.param("identifier"));
    if (!resolved) {
      return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product ERP mapping not found.");
    }
    const { mapping } = resolved;
    if (!mapping.erpProductId) {
      return publicError(context, 409, "ERP_MAPPING_INCOMPLETE", "ERP product id is not configured for this SKU.");
    }

    const locale = context.req.query("locale") === "fr-CA" ? "fr-CA" : "en-CA";
    const dealerLocationId = context.req.query("dealerLocationId")?.trim();
    const dealerId = await resolveErpDealerId(dealerLocationId);

    try {
      const client = new ErpProductClient();
      const data = await client.colorList({
        productId: mapping.erpProductId,
        productSkuId: mapping.erpSkuId ?? undefined,
        dealerId
      });
      return context.json({
        data: mapErpColorsToFinishOptions(data.list, locale),
        meta: {
          locale,
          erpProductId: mapping.erpProductId,
          erpSkuId: mapping.erpSkuId,
          dealerId: dealerId ?? null,
          hasColor: data.list.length > 0
        }
      });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  routes.route("/", machineRoutes);
  return routes;
}
