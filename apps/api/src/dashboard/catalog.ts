import { prisma, Prisma } from "@vanstro/db";
import { Hono } from "hono";
import {
  buildProductWriteData,
  dashboardProductInclude,
  formatStorefrontProduct
} from "../catalog/product-payload.js";
import { ErpProductClient } from "../integrations/erp-product/client.js";
import { publicError } from "../public-errors.js";
import { buildAuditSummary, recordAuditEvent } from "../audit/foundation.js";
import { hasGlobalPermission, resolveDashboardAuthorization } from "./authorization.js";
import {
  COMMON_QUERY_PROFILES,
  CommonQueryError,
  formatOffsetMeta,
  literalLikePrefix,
  parseCommonQuery
} from "./common-query.js";
import {
  refreshFinishOptionsFromErp,
  syncProductsFromUpstream,
  type ErpCatalogSyncResult
} from "../integrations/erp-catalog-sync/service.js";
import { type DashboardEnv, writeAudit } from "./access.js";
import {
  badRequest,
  notFound,
  optionalBoolean,
  optionalDate,
  optionalJson,
  optionalNumber,
  optionalRecord,
  optionalString,
  pageMeta,
  parsePagination,
  readBody
} from "./request.js";

type CatalogStatus = "draft" | "active" | "archived";
type PriceStatusValue = "draft" | "active" | "archived";
type PromotionStatusValue = "draft" | "active" | "archived";

const PROMOTION_STATUSES = new Set<PromotionStatusValue>(["draft", "active", "archived"]);

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function resolveCategoryId(body: Record<string, unknown>) {
  const categoryId = optionalString(body, "categoryId");
  if (categoryId) return categoryId;
  const categorySlug = optionalString(body, "categorySlug");
  if (!categorySlug) return undefined;
  const category = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });
  return category?.id;
}

export function createDashboardCatalogRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/categories", async (context) => {
    const pagination = parsePagination(context);
    const [categories, total] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], skip: pagination.skip, take: pagination.take }),
      prisma.category.count()
    ]);
    return context.json({ data: categories, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/categories/:id", async (context) => {
    const category = await prisma.category.findUnique({ where: { id: context.req.param("id") } });
    if (!category) return notFound(context, "Category not found.");
    return context.json({ data: category });
  });

  routes.post("/dashboard/categories", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const name = optionalString(body, "name");
    const slug = optionalString(body, "slug") ?? (name ? slugify(name) : "");
    if (!name || !slug) return badRequest(context, "name is required.");
    const category = await prisma.$transaction(async (database) => {
      const authorization = await resolveDashboardAuthorization(context.get("actorUserId"), database, new Date(), context.get("actorSessionTokenHash"));
      if (!hasGlobalPermission(authorization, "dashboard.access") || !hasGlobalPermission(authorization, "categories.write")) throw new Error("AUTHORIZATION_CHANGED");
      const category = await database.category.create({ data: { slug, name, description: optionalString(body, "description"), parentId: optionalString(body, "parentId"), sortOrder: optionalNumber(body, "sortOrder") ?? 0, isActive: optionalBoolean(body, "isActive") ?? true } });
      await recordAuditEvent(context, authorization, { action: "create", resource: { type: "category", id: category.id }, result: "succeeded", requiredPermissions: ["categories.write", "dashboard.access"], primaryPermission: "categories.write", afterSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["slug", "isActive", "sortOrder"], values: { slug: category.slug, isActive: category.isActive, sortOrder: category.sortOrder } }, ["slug", "isActive", "sortOrder"]), dedupKey: `category:create:${category.id}` }, database);
      return category;
    }).catch((error: unknown): Error => error instanceof Error ? error : new Error("UNKNOWN_CATEGORY_FAILURE"));
    if (category instanceof Error) {
      if (category.message === "AUTHORIZATION_CHANGED") return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global category permission is required.");
      throw category;
    }
    return context.json({ data: category }, 201);
  });

  routes.patch("/dashboard/categories/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const category = await prisma.$transaction(async (database) => {
      const authorization = await resolveDashboardAuthorization(context.get("actorUserId"), database, new Date(), context.get("actorSessionTokenHash"));
      if (!hasGlobalPermission(authorization, "dashboard.access") || !hasGlobalPermission(authorization, "categories.write")) throw new Error("AUTHORIZATION_CHANGED");
      const rows = await database.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT "id" FROM "categories" WHERE "id"=${context.req.param("id")} FOR UPDATE`);
      if (!rows[0]) throw new Error("NOT_FOUND");
      const before = await database.category.findUniqueOrThrow({ where: { id: rows[0].id } });
      const category = await database.category.update({ where: { id: before.id }, data: { slug: optionalString(body, "slug"), name: optionalString(body, "name"), description: optionalString(body, "description"), parentId: optionalString(body, "parentId"), sortOrder: optionalNumber(body, "sortOrder"), isActive: optionalBoolean(body, "isActive") } });
      const scalarFields = (["slug", "isActive", "sortOrder"] as const).filter((field) => before[field] !== category[field]);
      const redactedFields = (["name", "description", "parentId"] as const).filter((field) => before[field] !== category[field]);
      const changed = [...scalarFields, ...redactedFields].sort();
      if (changed.length) await recordAuditEvent(context, authorization, { action: "update", resource: { type: "category", id: category.id }, result: "succeeded", requiredPermissions: ["categories.write", "dashboard.access"], primaryPermission: "categories.write", beforeSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: changed, values: Object.fromEntries(scalarFields.map((field) => [field, before[field]])), redactedFields }, ["slug", "isActive", "sortOrder"]), afterSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: changed, values: Object.fromEntries(scalarFields.map((field) => [field, category[field]])), redactedFields }, ["slug", "isActive", "sortOrder"] ) }, database);
      return category;
    }).catch((error: unknown): Error => error instanceof Error ? error : new Error("UNKNOWN_CATEGORY_FAILURE"));
    if (category instanceof Error) {
      if (category.message === "AUTHORIZATION_CHANGED") return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global category permission is required.");
      if (category.message === "NOT_FOUND") return notFound(context, "Category not found.");
      throw category;
    }
    return context.json({ data: category });
  });

  routes.delete("/dashboard/categories/:id", async (context) => {
    const category: Prisma.CategoryGetPayload<Record<string, never>> | Error = await prisma.$transaction(async (database) => {
      const authorization = await resolveDashboardAuthorization(context.get("actorUserId"), database, new Date(), context.get("actorSessionTokenHash"));
      if (!hasGlobalPermission(authorization, "dashboard.access") || !hasGlobalPermission(authorization, "categories.write")) throw new Error("AUTHORIZATION_CHANGED");
      const rows = await database.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT "id" FROM "categories" WHERE "id"=${context.req.param("id")} FOR UPDATE`);
      if (!rows[0]) throw new Error("NOT_FOUND");
      const before = await database.category.findUniqueOrThrow({ where: { id: rows[0].id } });
      const category = before.isActive ? await database.category.update({ where: { id: before.id }, data: { isActive: false } }) : before;
      if (before.isActive) await recordAuditEvent(context, authorization, { action: "archive", resource: { type: "category", id: category.id }, result: "succeeded", reason: "operator_requested", requiredPermissions: ["categories.write", "dashboard.access"], primaryPermission: "categories.write", afterSummary: buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["isActive"], values: { isActive: false } }, ["isActive"]) }, database);
      return category;
    }).catch((error: unknown): Error => error instanceof Error ? error : new Error("UNKNOWN_CATEGORY_FAILURE"));
    if (category instanceof Error) {
      if (category.message === "AUTHORIZATION_CHANGED") return publicError(context, 403, "DASHBOARD_FORBIDDEN", "Global category permission is required.");
      if (category.message === "NOT_FOUND") return notFound(context, "Category not found.");
      throw category;
    }
    return context.json({ data: { id: category.id, isActive: category.isActive } });
  });

  routes.get("/dashboard/products", async (context) => {
    if (context.req.query("queryVersion") === undefined) {
      const pagination = parsePagination(context);
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            manufacturerPartNumber: true,
            createdAt: true,
            category: { select: { id: true, name: true, slug: true } },
            skus: { select: { id: true, skuCode: true, name: true, status: true }, orderBy: { sortOrder: "asc" } }
          },
          orderBy: { createdAt: "desc" },
          skip: pagination.skip,
          take: pagination.take
        }),
        prisma.product.count()
      ]);
      return context.json({ data: products, meta: pageMeta(pagination, total) });
    }

    try {
      const query = parseCommonQuery(COMMON_QUERY_PROFILES.products, context.req.url.slice(context.req.url.indexOf("?") + 1));
      if (!("offset" in query)) throw new CommonQueryError("QUERY_INVALID", "Offset pagination is required.");
      const statuses = query.filters.status;
      const categoryId = query.filters.categoryId;
      const isUncategorized = query.filters.isUncategorized;
      const baseWhere: Prisma.ProductWhereInput = {
        ...(statuses ? { status: { in: (Array.isArray(statuses) ? statuses : [statuses]) as CatalogStatus[] } } : {}),
        ...(categoryId ? { categoryId: categoryId as string } : {}),
        ...(isUncategorized === true ? { categoryId: null } : isUncategorized === false ? { categoryId: { not: null } } : {})
      };
      const orderBy = [
        { [query.sort]: query.direction },
        { id: query.direction }
      ] as Prisma.ProductOrderByWithRelationInput[];
      const { products, total, capturedAt } = await prisma.$transaction(async (database) => {
        await database.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const capturedAt = new Date().toISOString();
        const searchIds = query.q ? await database.$queryRaw<Array<{ id: string }>>`
          SELECT DISTINCT p.id FROM products p LEFT JOIN platform_skus s ON s."productId" = p.id
          WHERE (p.name !~ '[^ -~]' AND translate(p.name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz') COLLATE "C" LIKE ${literalLikePrefix(query.q)} ESCAPE chr(92))
             OR (p.slug !~ '[^ -~]' AND translate(p.slug,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz') COLLATE "C" LIKE ${literalLikePrefix(query.q)} ESCAPE chr(92))
             OR (p."manufacturerPartNumber" !~ '[^ -~]' AND translate(p."manufacturerPartNumber",'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz') COLLATE "C" LIKE ${literalLikePrefix(query.q)} ESCAPE chr(92))
             OR (s."skuCode" !~ '[^ -~]' AND translate(s."skuCode",'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz') COLLATE "C" LIKE ${literalLikePrefix(query.q)} ESCAPE chr(92))
        ` : undefined;
        const where: Prisma.ProductWhereInput = query.q ? { AND: [baseWhere, { id: { in: searchIds!.map(({ id }) => id) } }] } : baseWhere;
        const [products, total] = await Promise.all([
        database.product.findMany({
          where,
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            manufacturerPartNumber: true,
            createdAt: true,
            category: { select: { id: true, name: true, slug: true } },
            skus: {
              select: { id: true, skuCode: true, name: true, status: true },
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
            }
          },
          orderBy,
          skip: query.offset,
          take: query.limit
        }),
        database.product.count({ where })
        ]);
        return { products, total, capturedAt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      const requestId = context.res.headers.get("X-Request-Id")!;
      return context.json({ data: products, meta: formatOffsetMeta({ requestId, profile: COMMON_QUERY_PROFILES.products, query, total, capturedAt }) });
    } catch (error) {
      if (error instanceof CommonQueryError) return publicError(context, error.code === "QUERY_UNAVAILABLE" ? 503 : 400, error.code, error.message, error.field ? { [error.field]: error.fieldLabel } : undefined);
      throw error;
    }
  });

  routes.get("/dashboard/products/:id", async (context) => {
    const product = await prisma.product.findUnique({
      where: { id: context.req.param("id") },
      include: dashboardProductInclude
    });
    if (!product) return notFound(context, "Product not found.");
    const formatted = formatStorefrontProduct(product as never, { includeDetail: true });
    return context.json({ data: { ...product, storefront: formatted } });
  });

  routes.post("/dashboard/products", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const name = optionalString(body, "name");
    const slug = optionalString(body, "slug") ?? (name ? slugify(name) : "");
    if (!name || !slug) return badRequest(context, "name is required.");
    const categoryId = await resolveCategoryId(body);
    const product = await prisma.product.create({
      data: {
        slug,
        name,
        shortDescription: optionalString(body, "shortDescription"),
        description: optionalString(body, "description"),
        status: (optionalString(body, "status") as CatalogStatus) ?? "draft",
        categoryId,
        brand: optionalString(body, "brand"),
        manufacturerPartNumber: optionalString(body, "manufacturerPartNumber"),
        subCategoryKey: optionalString(body, "subCategoryKey"),
        unit: optionalString(body, "unit"),
        dimensions: optionalString(body, "dimensions"),
        finish: optionalString(body, "finish"),
        colorName: optionalString(body, "colorName"),
        colorHex: optionalString(body, "colorHex"),
        packageQuantity: optionalJson(body, "packageQuantity"),
        finishOptions: optionalJson(body, "finishOptions"),
        productHighlights: optionalJson(body, "productHighlights"),
        documents: optionalJson(body, "documents"),
        supportLinks: optionalJson(body, "supportLinks"),
        recommendations: optionalJson(body, "recommendations"),
        certificationRequired: optionalBoolean(body, "certificationRequired") ?? false
      }
    });
    await writeAudit(context, "dashboard.products.create", "product", product.id);
    return context.json({ data: product }, 201);
  });

  routes.patch("/dashboard/products/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const categoryId = await resolveCategoryId(body);
    const product = await prisma.product.update({
      where: { id: context.req.param("id") },
      data: {
        ...buildProductWriteData(body),
        ...(categoryId !== undefined ? { categoryId } : {})
      }
    });
    await writeAudit(context, "dashboard.products.update", "product", product.id);
    return context.json({ data: product });
  });

  routes.delete("/dashboard/products/:id", async (context) => {
    const product = await prisma.product.update({
      where: { id: context.req.param("id") },
      data: { status: "archived" }
    });
    await writeAudit(context, "dashboard.products.archive", "product", product.id);
    return context.json({ data: { id: product.id, status: product.status } });
  });

  routes.get("/dashboard/products/:id/specifications", async (context) => {
    const specs = await prisma.productSpecification.findMany({
      where: { productId: context.req.param("id") },
      orderBy: { sortOrder: "asc" }
    });
    return context.json({ data: specs });
  });

  routes.post("/dashboard/products/:id/specifications", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const key = optionalString(body, "key");
    const value = optionalString(body, "value");
    if (!key || !value) return badRequest(context, "key and value are required.");
    const spec = await prisma.productSpecification.create({
      data: {
        productId: context.req.param("id"),
        key,
        value,
        sortOrder: optionalNumber(body, "sortOrder") ?? 0
      }
    });
    await writeAudit(context, "dashboard.product_specifications.create", "product_specification", spec.id);
    return context.json({ data: spec }, 201);
  });

  routes.patch("/dashboard/products/:productId/specifications/:specId", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const spec = await prisma.productSpecification.update({
      where: { id: context.req.param("specId") },
      data: {
        key: optionalString(body, "key"),
        value: optionalString(body, "value"),
        sortOrder: optionalNumber(body, "sortOrder")
      }
    });
    await writeAudit(context, "dashboard.product_specifications.update", "product_specification", spec.id);
    return context.json({ data: spec });
  });

  routes.delete("/dashboard/products/:productId/specifications/:specId", async (context) => {
    await prisma.productSpecification.delete({ where: { id: context.req.param("specId") } });
    await writeAudit(context, "dashboard.product_specifications.delete", "product_specification", context.req.param("specId"));
    return context.json({ data: { id: context.req.param("specId"), deleted: true } });
  });

  routes.post("/dashboard/products/:id/skus", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const skuCode = optionalString(body, "skuCode");
    if (!skuCode) return badRequest(context, "skuCode is required.");
    const sku = await prisma.platformSku.create({
      data: {
        productId: context.req.param("id"),
        skuCode,
        name: optionalString(body, "name") ?? skuCode,
        manufacturerPartNumber: optionalString(body, "manufacturerPartNumber"),
        status: (optionalString(body, "status") as CatalogStatus) ?? "active",
        attributes: optionalRecord(body, "attributes"),
        sortOrder: optionalNumber(body, "sortOrder") ?? 0
      }
    });
    await writeAudit(context, "dashboard.skus.create", "platform_sku", sku.id);
    return context.json({ data: sku }, 201);
  });

  routes.patch("/dashboard/skus/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const sku = await prisma.platformSku.update({
      where: { id: context.req.param("id") },
      data: {
        skuCode: optionalString(body, "skuCode"),
        name: optionalString(body, "name"),
        manufacturerPartNumber: optionalString(body, "manufacturerPartNumber"),
        status: optionalString(body, "status") as CatalogStatus | undefined,
        attributes: optionalRecord(body, "attributes"),
        sortOrder: optionalNumber(body, "sortOrder")
      }
    });
    await writeAudit(context, "dashboard.skus.update", "platform_sku", sku.id);
    return context.json({ data: sku });
  });

  routes.delete("/dashboard/skus/:id", async (context) => {
    const sku = await prisma.platformSku.update({
      where: { id: context.req.param("id") },
      data: { status: "archived" }
    });
    await writeAudit(context, "dashboard.skus.archive", "platform_sku", sku.id);
    return context.json({ data: { id: sku.id, status: sku.status } });
  });

  routes.post("/dashboard/products/:id/assets", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const url = optionalString(body, "url");
    if (!url) return badRequest(context, "url is required.");
    const asset = await prisma.productAsset.create({
      data: {
        productId: context.req.param("id"),
        skuId: optionalString(body, "skuId"),
        url,
        altText: optionalString(body, "altText"),
        kind: optionalString(body, "kind") ?? "image",
        sortOrder: optionalNumber(body, "sortOrder") ?? 0
      }
    });
    await writeAudit(context, "dashboard.product_assets.create", "product_asset", asset.id);
    return context.json({ data: asset }, 201);
  });

  routes.patch("/dashboard/assets/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const asset = await prisma.productAsset.update({
      where: { id: context.req.param("id") },
      data: {
        url: optionalString(body, "url"),
        altText: optionalString(body, "altText"),
        kind: optionalString(body, "kind"),
        sortOrder: optionalNumber(body, "sortOrder")
      }
    });
    await writeAudit(context, "dashboard.product_assets.update", "product_asset", asset.id);
    return context.json({ data: asset });
  });

  routes.delete("/dashboard/assets/:id", async (context) => {
    await prisma.productAsset.delete({ where: { id: context.req.param("id") } });
    await writeAudit(context, "dashboard.product_assets.delete", "product_asset", context.req.param("id"));
    return context.json({ data: { id: context.req.param("id"), deleted: true } });
  });

  routes.get("/dashboard/pricing", async (context) => {
    const pagination = parsePagination(context);
    const [prices, total] = await Promise.all([
      prisma.price.findMany({
        include: { sku: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.price.count()
    ]);
    return context.json({ data: prices, meta: pageMeta(pagination, total) });
  });

  routes.post("/dashboard/pricing", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const skuId = optionalString(body, "skuId");
    const amountCents = optionalNumber(body, "amountCents");
    if (!skuId || amountCents === undefined) return badRequest(context, "skuId and amountCents are required.");
    const price = await prisma.price.create({
      data: {
        key: optionalString(body, "key") ?? `retail:${skuId}`,
        skuId,
        currency: optionalString(body, "currency") ?? "CAD",
        amountCents,
        compareAtCents: optionalNumber(body, "compareAtCents"),
        status: (optionalString(body, "status") as PriceStatusValue) ?? "active",
        effectiveFrom: optionalDate(body, "effectiveFrom"),
        effectiveUntil: optionalDate(body, "effectiveUntil")
      }
    });
    await writeAudit(context, "dashboard.pricing.create", "price", price.id);
    return context.json({ data: price }, 201);
  });

  routes.patch("/dashboard/pricing/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const price = await prisma.price.update({
      where: { id: context.req.param("id") },
      data: {
        currency: optionalString(body, "currency"),
        amountCents: optionalNumber(body, "amountCents"),
        compareAtCents: optionalNumber(body, "compareAtCents"),
        status: optionalString(body, "status") as PriceStatusValue | undefined,
        effectiveFrom: optionalDate(body, "effectiveFrom"),
        effectiveUntil: optionalDate(body, "effectiveUntil")
      }
    });
    await writeAudit(context, "dashboard.pricing.update", "price", price.id);
    return context.json({ data: price });
  });

  routes.delete("/dashboard/pricing/:id", async (context) => {
    const price = await prisma.price.update({ where: { id: context.req.param("id") }, data: { status: "archived" } });
    await writeAudit(context, "dashboard.pricing.archive", "price", price.id);
    return context.json({ data: { id: price.id, status: price.status } });
  });

  routes.get("/dashboard/promotions", async (context) => {
    const pagination = parsePagination(context);
    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({ orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.promotion.count()
    ]);
    return context.json({ data: promotions, meta: pageMeta(pagination, total) });
  });

  routes.post("/dashboard/promotions", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const key = optionalString(body, "key");
    const name = optionalString(body, "name");
    if (!key || !name) return badRequest(context, "key and name are required.");
    const status = (optionalString(body, "status") as PromotionStatusValue | undefined) ?? "draft";
    if (!PROMOTION_STATUSES.has(status)) return badRequest(context, "status must be draft, active or archived.");
    const promotion = await prisma.promotion.create({
      data: {
        key,
        name,
        description: optionalString(body, "description"),
        discountLabel: optionalString(body, "discountLabel"),
        discountPercent: optionalNumber(body, "discountPercent"),
        minimumSubtotalCents: optionalNumber(body, "minimumSubtotalCents"),
        status,
        startsAt: optionalDate(body, "startsAt"),
        endsAt: optionalDate(body, "endsAt")
      }
    });
    await writeAudit(context, "dashboard.promotions.create", "promotion", promotion.id);
    return context.json({ data: promotion }, 201);
  });

  routes.patch("/dashboard/promotions/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const status = optionalString(body, "status") as PromotionStatusValue | undefined;
    if (status !== undefined && !PROMOTION_STATUSES.has(status)) return badRequest(context, "status must be draft, active or archived.");
    const promotion = await prisma.promotion.update({
      where: { id: context.req.param("id") },
      data: {
        key: optionalString(body, "key"),
        name: optionalString(body, "name"),
        description: optionalString(body, "description"),
        discountLabel: optionalString(body, "discountLabel"),
        discountPercent: optionalNumber(body, "discountPercent"),
        minimumSubtotalCents: optionalNumber(body, "minimumSubtotalCents"),
        status,
        startsAt: optionalDate(body, "startsAt"),
        endsAt: optionalDate(body, "endsAt")
      }
    });
    await writeAudit(context, "dashboard.promotions.update", "promotion", promotion.id);
    return context.json({ data: promotion });
  });

  routes.delete("/dashboard/promotions/:id", async (context) => {
    const promotion = await prisma.promotion.update({
      where: { id: context.req.param("id") },
      data: { status: "archived" }
    });
    await writeAudit(context, "dashboard.promotions.archive", "promotion", promotion.id);
    return context.json({ data: { id: promotion.id, status: promotion.status } });
  });

  routes.get("/dashboard/sku-mappings", async (context) => {
    const pagination = parsePagination(context);
    const [mappings, total] = await Promise.all([
      prisma.productSkuErpMapping.findMany({
        include: { sku: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.productSkuErpMapping.count()
    ]);
    return context.json({ data: mappings, meta: pageMeta(pagination, total) });
  });

  routes.post("/dashboard/sku-mappings", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const skuId = optionalString(body, "skuId");
    const erpSystem = optionalString(body, "erpSystem");
    const erpSkuKey = optionalString(body, "erpSkuKey");
    if (!skuId || !erpSystem || !erpSkuKey) return badRequest(context, "skuId, erpSystem and erpSkuKey are required.");
    const mapping = await prisma.productSkuErpMapping.create({
      data: {
        skuId,
        erpSystem,
        erpSkuKey,
        erpProductId: optionalNumber(body, "erpProductId"),
        erpSkuId: optionalNumber(body, "erpSkuId")
      }
    });
    await writeAudit(context, "dashboard.sku_mappings.create", "sku_mapping", mapping.id);
    return context.json({ data: mapping }, 201);
  });

  routes.patch("/dashboard/sku-mappings/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const mapping = await prisma.productSkuErpMapping.update({
      where: { id: context.req.param("id") },
      data: {
        erpSystem: optionalString(body, "erpSystem"),
        erpSkuKey: optionalString(body, "erpSkuKey"),
        erpProductId: optionalNumber(body, "erpProductId"),
        erpSkuId: optionalNumber(body, "erpSkuId")
      }
    });
    await writeAudit(context, "dashboard.sku_mappings.update", "sku_mapping", mapping.id);
    return context.json({ data: mapping });
  });

  routes.delete("/dashboard/sku-mappings/:id", async (context) => {
    await prisma.productSkuErpMapping.delete({ where: { id: context.req.param("id") } });
    await writeAudit(context, "dashboard.sku_mappings.delete", "sku_mapping", context.req.param("id"));
    return context.json({ data: { id: context.req.param("id"), deleted: true } });
  });

  routes.post("/dashboard/catalog/sync-from-erp", async (context) => {
    const body = await readBody(context);
    const syncCategories = optionalBoolean(body ?? {}, "syncCategories") ?? false;
    const erpSystem = optionalString(body ?? {}, "erpSystem");
    const existingRun = await prisma.catalogSyncRun.findFirst({ where: { status: "running" } });
    if (existingRun) return context.json({ error: "A catalog sync is already running.", runId: existingRun.id }, 409);
    let run;
    try {
      run = await prisma.catalogSyncRun.create({ data: { status: "running", source: "manual" } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return context.json({ error: "A catalog sync is already running." }, 409);
      }
      throw error;
    }
    try {
      const client = new ErpProductClient();
      const result: ErpCatalogSyncResult = await syncProductsFromUpstream(client, {
        syncCategories,
        ...(erpSystem ? { erpSystem } : {})
      });
      await prisma.catalogSyncRun.update({
        where: { id: run.id },
        data: {
          status: result.errors.length ? "failed" : "succeeded",
          productsUpserted: result.imported + result.updated,
          error: result.errors.length ? result.errors.slice(0, 50).join("\n") : null,
          finishedAt: new Date()
        }
      });
      await writeAudit(context, "dashboard.catalog.sync_from_erp", "catalog_sync", run.id, result as never);
      return context.json({ data: { ...result, syncRunId: run.id } }, result.errors.length ? 207 : 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ERP catalog sync failed.";
      await prisma.catalogSyncRun.update({
        where: { id: run.id },
        data: { status: "failed", error: message, finishedAt: new Date() }
      });
      return badRequest(context, message);
    }
  });

  routes.get("/dashboard/catalog/sync-runs/latest", async (context) => {
    const latest = await prisma.catalogSyncRun.findFirst({ orderBy: { startedAt: "desc" } });
    if (!latest) return context.json({ data: null });
    return context.json({
      data: {
        id: latest.id,
        status: latest.status,
        source: latest.source,
        productsUpserted: latest.productsUpserted,
        error: latest.error,
        startedAt: latest.startedAt.toISOString(),
        finishedAt: latest.finishedAt?.toISOString() ?? null
      }
    });
  });

  routes.post("/dashboard/products/:id/refresh-erp-colors", async (context) => {
    const body = await readBody(context);
    const dealerLocationId = optionalString(body ?? {}, "dealerLocationId");
    const product = await refreshFinishOptionsFromErp({
      productId: context.req.param("id"),
      dealerLocationId
    });
    if (!product) return badRequest(context, "Product ERP mapping is incomplete.");
    await writeAudit(context, "dashboard.products.refresh_erp_colors", "product", product.id);
    return context.json({ data: product });
  });

  return routes;
}
