import { prisma } from "@vanstro/db";
import { Hono } from "hono";

type ProductRecord = Awaited<ReturnType<typeof findProduct>>;
type CommerceProductRecord = Awaited<ReturnType<typeof findCommerceProduct>>;

const productDisplayInclude = {
  assets: { orderBy: { sortOrder: "asc" as const } },
  category: true,
  specifications: { orderBy: { sortOrder: "asc" as const } },
  skus: {
    where: { status: "active" as const },
    orderBy: { sortOrder: "asc" as const },
    include: {
      prices: {
        where: { status: "active" as const },
        orderBy: { createdAt: "desc" as const },
        take: 1
      }
    }
  },
  reviews: {
    where: { status: "published" as const },
    orderBy: { createdAt: "desc" as const }
  }
};

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
  return {
    amount: amountCents / 100,
    amountCents,
    currency
  };
}

function formatProduct(product: NonNullable<ProductRecord>) {
  const primarySku = product.skus[0];
  const activePrice = primarySku?.prices[0];
  const averageRating =
    product.reviews.length > 0
      ? product.reviews.reduce((total, review) => total + review.rating, 0) /
        product.reviews.length
      : 0;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    status: product.status,
    category: product.category
      ? {
          id: product.category.id,
          slug: product.category.slug,
          name: product.category.name
        }
      : null,
    primarySku: primarySku
      ? {
          id: primarySku.id,
          skuCode: primarySku.skuCode,
          name: primarySku.name,
          attributes: primarySku.attributes
        }
      : null,
    price: activePrice
      ? money(activePrice.amountCents, activePrice.currency)
      : null,
    assets: product.assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      altText: asset.altText,
      kind: asset.kind,
      sortOrder: asset.sortOrder
    })),
    specifications: product.specifications.map((specification) => ({
      key: specification.key,
      value: specification.value
    })),
    ratingSummary: {
      average: Number(averageRating.toFixed(1)),
      count: product.reviews.length,
      sourceLabel: "Published VanStro product reviews.",
      writeReviewEnabled: true
    },
    reviews: product.reviews.map((review) => ({
      id: review.id,
      name: review.nickname,
      title: review.title ?? "Product review",
      body: review.body,
      rating: review.rating,
      createdAt: review.createdAt.toISOString(),
      verifiedBuyer: false
    }))
  };
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
        price: activePrice
          ? money(activePrice.amountCents, activePrice.currency)
          : null,
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
    where: {
      OR: [{ id: identifier }, { slug: identifier }],
      status: "active"
    },
    include: productDisplayInclude
  });
}

async function findCommerceProduct(identifier: string) {
  return prisma.product.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }],
      status: "active"
    },
    include: productCommerceInclude
  });
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
    const limit = Math.min(Number(context.req.query("limit") ?? 24), 100);
    const offset = Number(context.req.query("offset") ?? 0);

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
        include: productDisplayInclude,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    return context.json({
      data: items.map(formatProduct),
      meta: { limit, offset, total }
    });
  });

  routes.post("/products/commerce", async (context) => {
    const body = (await context.req.json().catch(() => null)) as
      | { productIds?: string[] }
      | null;
    const productIds = body?.productIds?.filter(Boolean) ?? [];

    if (productIds.length === 0) {
      return context.json({ error: "productIds is required." }, 400);
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "active"
      },
      include: productCommerceInclude
    });

    return context.json({ data: products.map(formatCommerce) });
  });

  routes.get("/products/:identifier/commerce", async (context) => {
    const product = await findCommerceProduct(context.req.param("identifier"));

    if (!product) {
      return context.json({ error: "Product not found." }, 404);
    }

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

    if (!product) {
      return context.json({ error: "Product not found." }, 404);
    }

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

    if (!product) {
      return context.json({ error: "Product not found." }, 404);
    }

    return context.json({ data: formatProduct(product) });
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
        locations: {
          include: { serviceAreas: true },
          orderBy: { name: "asc" }
        }
      },
      orderBy: { name: "asc" }
    });

    return context.json({ data: dealers });
  });

  routes.get("/home/products", async (context) => {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      include: productDisplayInclude,
      orderBy: { createdAt: "desc" },
      take: 8
    });

    return context.json({ data: products.map(formatProduct) });
  });

  routes.get("/home/banners", (context) =>
    context.json({
      data: [
        {
          id: "p1a-demo-hero",
          title: "Catalog and pricing now come from Website API",
          href: "/products"
        }
      ]
    })
  );

  routes.get("/storefront/home", async (context) => {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      include: productDisplayInclude,
      orderBy: { createdAt: "desc" },
      take: 8
    });

    return context.json({
      data: {
        banners: [
          {
            id: "p1a-demo-hero",
            title: "Catalog and pricing now come from Website API",
            href: "/products"
          }
        ],
        products: products.map(formatProduct)
      }
    });
  });

  return routes;
}
