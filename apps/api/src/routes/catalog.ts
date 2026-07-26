import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { formatStorefrontProduct, productDetailInclude, productListInclude } from "../catalog/product-payload.js";
import { publicError } from "../public-errors.js";

type CommerceProductRecord = Awaited<ReturnType<typeof findCommerceProduct>>;

const productCommerceInclude = {
  skus: {
    where: { status: "active" as const },
    orderBy: { sortOrder: "asc" as const },
    include: {
      erpMappings: true,
      prices: {
        where: { status: "active" as const },
        orderBy: { createdAt: "desc" as const },
        take: 1
      }
    }
  }
};

function money(amountCents: number, currency: string) {
  return { amount: amountCents / 100, amountCents, currency };
}

function formatProduct(product: Parameters<typeof formatStorefrontProduct>[0], includeDetail = false) {
  const formatted = formatStorefrontProduct(product, { includeDetail });
  return includeDetail ? { ...formatted.websiteApi, ...formatted.detail } : formatted.websiteApi;
}

function formatCommerce(product: NonNullable<CommerceProductRecord>) {
  return {
    productId: product.id,
    slug: product.slug,
    skus: product.skus.map((sku) => {
      const activePrice = sku.prices[0];
      return {
        id: sku.id,
        skuCode: sku.skuCode,
        name: sku.name,
        attributes: sku.attributes,
        price: activePrice ? money(activePrice.amountCents, activePrice.currency) : null,
        erpMappings: sku.erpMappings.map((mapping) => ({
          erpSystem: mapping.erpSystem,
          erpSkuKey: mapping.erpSkuKey
        }))
      };
    })
  };
}

async function findProduct(identifier: string) {
  return prisma.product.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }], status: "active" },
    include: productDetailInclude
  });
}

async function findCommerceProduct(identifier: string) {
  return prisma.product.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }], status: "active" },
    include: productCommerceInclude
  });
}

function normalizePostalCode(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function postalPrefixes(postalCode: string) {
  const normalized = normalizePostalCode(postalCode);
  const prefixes = new Set<string>();
  if (normalized.length >= 3) prefixes.add(normalized.slice(0, 3));
  if (normalized.length >= 1) prefixes.add(normalized.slice(0, 1));
  return [...prefixes];
}

export function createCatalogRoutes() {
  const routes = new Hono();

  routes.get("/categories", async (context) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return context.json({
      data: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        parentId: category.parentId
      }))
    });
  });

  routes.get("/products", async (context) => {
    const category = context.req.query("category");
    const q = context.req.query("q");
    const requestedLimit = Number(context.req.query("limit") ?? 24);
    const offset = Number(context.req.query("offset") ?? 0);
    if (
      !Number.isFinite(requestedLimit) ||
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 0 ||
      !Number.isFinite(offset) ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      return publicError(context, 400, "CATALOG_INVALID", "limit and offset must be finite nonnegative integers.");
    }
    const limit = Math.min(requestedLimit, 100);
    const where = {
      status: "active" as const,
      ...(category ? { category: { slug: category } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productListInclude,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit
      }),
      prisma.product.count({ where })
    ]);
    return context.json({ data: items.map((item) => formatProduct(item)), meta: { limit, offset, total } });
  });

  routes.post("/products/commerce", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { productIds?: unknown } | null;
    if (
      !Array.isArray(body?.productIds) ||
      body.productIds.length === 0 ||
      body.productIds.some((productId) => typeof productId !== "string" || !productId.trim())
    ) {
      return publicError(context, 400, "CATALOG_INVALID", "productIds must be a non-empty array of non-empty strings.");
    }
    const productIds = body.productIds.map((productId) => productId.trim());
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "active" },
      include: productCommerceInclude
    });
    return context.json({ data: products.map(formatCommerce) });
  });

  routes.get("/products/:identifier/commerce", async (context) => {
    const product = await findCommerceProduct(context.req.param("identifier"));
    if (!product) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product not found.");
    return context.json({ data: formatCommerce(product) });
  });

  routes.get("/products/:identifier/assets", async (context) => {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: context.req.param("identifier") }, { slug: context.req.param("identifier") }],
        status: "active"
      },
      include: { assets: { orderBy: { sortOrder: "asc" } } }
    });
    if (!product) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product not found.");
    return context.json({
      data: product.assets.map((asset) => ({
        id: asset.id,
        url: asset.url,
        altText: asset.altText,
        kind: asset.kind,
        sortOrder: asset.sortOrder
      }))
    });
  });

  routes.get("/products/:identifier", async (context) => {
    const product = await findProduct(context.req.param("identifier"));
    if (!product) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product not found.");
    return context.json({ data: formatProduct(product, true) });
  });

  routes.get("/promotions/active", async (context) => {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        status: "active",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
      },
      orderBy: { createdAt: "desc" }
    });
    return context.json({ data: promotions });
  });

  routes.get("/dealers", async (context) => {
    const dealers = await prisma.dealer.findMany({
      where: { status: "active" },
      include: {
        locations: { include: { serviceAreas: true }, orderBy: { name: "asc" } }
      },
      orderBy: { name: "asc" }
    });
    return context.json({ data: dealers });
  });

  routes.get("/dealers/lookup", async (context) => {
    const postalCode = context.req.query("postalCode")?.trim();
    if (!postalCode) {
      return publicError(context, 400, "CATALOG_INVALID", "postalCode query parameter is required.");
    }
    const prefixes = postalPrefixes(postalCode);
    const serviceAreas = await prisma.dealerServiceArea.findMany({
      where: {
        OR: prefixes.flatMap((prefix) => [
          { areaType: "postal_prefix", areaCode: prefix },
          { areaType: "fsa", areaCode: prefix }
        ])
      },
      include: {
        dealerLocation: {
          include: {
            dealer: true,
            serviceAreas: true
          }
        }
      }
    });
    const locations = new Map<string, (typeof serviceAreas)[number]["dealerLocation"]>();
    for (const area of serviceAreas) {
      if (area.dealerLocation.dealer.status === "active") locations.set(area.dealerLocation.id, area.dealerLocation);
    }
    return context.json({
      data: [...locations.values()].map((location) => ({
        dealer: location.dealer,
        location
      })),
      meta: { postalCode: normalizePostalCode(postalCode), matched: locations.size }
    });
  });

  routes.get("/home/products", async (context) => {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      include: productListInclude,
      orderBy: { createdAt: "desc" },
      take: 8
    });
    return context.json({ data: products.map((item) => formatProduct(item)) });
  });

  routes.get("/home/banners", async (context) => {
    const requested = context.req.query("locale");
    const locale = requested === "fr-CA" ? "fr-CA" : "en-CA";
    const record =
      (await prisma.siteContentModule.findFirst({ where: { moduleKey: "home-page", locale, status: "published" } })) ??
      (await prisma.siteContentModule.findFirst({
        where: { moduleKey: "home-page", locale: "en-CA", status: "published" }
      }));
    const payload = (record?.payload ?? {}) as { banners?: unknown };
    const banners = Array.isArray(payload.banners) ? payload.banners : [];
    return context.json({ data: banners, meta: { locale } });
  });

  routes.get("/storefront/home", async (context) => {
    const requested = context.req.query("locale");
    const locale = requested === "fr-CA" ? "fr-CA" : "en-CA";
    const [products, homeModule] = await Promise.all([
      prisma.product.findMany({
        where: { status: "active" },
        include: productListInclude,
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.siteContentModule
        .findFirst({ where: { moduleKey: "home-page", locale, status: "published" } })
        .then(
          (record) =>
            record ??
            prisma.siteContentModule.findFirst({
              where: { moduleKey: "home-page", locale: "en-CA", status: "published" }
            })
        )
    ]);
    const payload = (homeModule?.payload ?? {}) as { banners?: unknown };
    const banners = Array.isArray(payload.banners) ? payload.banners : [];
    return context.json({
      data: { banners, products: products.map((item) => formatProduct(item)) },
      meta: { locale }
    });
  });

  return routes;
}
