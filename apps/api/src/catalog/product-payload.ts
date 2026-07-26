import type { Prisma } from "@vanstro/db";

type ProductAssetRow = {
  id: string;
  url: string;
  altText: string | null;
  kind: string;
  sortOrder: number;
};

type ProductSkuRow = {
  id: string;
  skuCode: string;
  name: string;
  manufacturerPartNumber: string | null;
  attributes: Prisma.JsonValue;
  inventorySnapshots?: Array<{ quantityOnHand: number; quantityReserved: number }>;
  prices?: Array<{ amountCents: number; currency: string }>;
};

type ProductReviewRow = {
  id: string;
  nickname: string;
  title: string | null;
  body: string;
  rating: number;
  createdAt: Date;
};

export type ProductWithRelations = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  status: string;
  brand: string | null;
  manufacturerPartNumber: string | null;
  subCategoryKey: string | null;
  unit: string | null;
  dimensions: string | null;
  finish: string | null;
  colorName: string | null;
  colorHex: string | null;
  packageQuantity: Prisma.JsonValue;
  finishOptions: Prisma.JsonValue;
  productHighlights: Prisma.JsonValue;
  documents: Prisma.JsonValue;
  supportLinks: Prisma.JsonValue;
  recommendations: Prisma.JsonValue;
  certificationRequired: boolean;
  category: { id: string; slug: string; name: string } | null;
  assets: ProductAssetRow[];
  specifications: Array<{ key: string; value: string }>;
  skus: ProductSkuRow[];
  reviews?: ProductReviewRow[];
};

function money(amountCents: number, currency: string) {
  return { amount: amountCents / 100, amountCents, currency };
}

function asImageAssets(assets: ProductAssetRow[]) {
  return assets
    .filter((asset) => asset.kind === "image")
    .map((asset) => ({
      id: asset.id,
      url: asset.url,
      alt: asset.altText ?? undefined,
      altText: asset.altText ?? undefined,
      kind: asset.kind,
      sortOrder: asset.sortOrder
    }));
}

function availableFromSnapshots(snapshots: Array<{ quantityOnHand: number; quantityReserved: number }>) {
  return snapshots.reduce((total, snapshot) => total + Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved), 0);
}

function specificationsRecord(specifications: Array<{ key: string; value: string }>) {
  return Object.fromEntries(specifications.map((spec) => [spec.key, spec.value]));
}

/** Map a product row into the storefront ProductSummary / ProductDetail shape. */
export function formatStorefrontProduct(product: ProductWithRelations, options: { includeDetail?: boolean } = {}) {
  const primarySku = product.skus[0];
  const activePrice = primarySku?.prices?.[0];
  const snapshots = primarySku?.inventorySnapshots ?? [];
  const available = availableFromSnapshots(snapshots);
  const reviews = product.reviews ?? [];
  const averageRating =
    reviews.length > 0 ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;
  const specifications = specificationsRecord(product.specifications);
  const images = asImageAssets(product.assets);

  const summary = {
    id: product.id,
    slug: product.slug,
    sku: primarySku?.skuCode ?? product.slug,
    brand: product.brand ?? undefined,
    manufacturerPartNumber:
      product.manufacturerPartNumber ?? primarySku?.manufacturerPartNumber ?? specifications["Manufacturer Part #"] ?? undefined,
    name: product.name,
    category: product.category?.slug ?? product.category?.name ?? "uncategorized",
    subCategory: product.subCategoryKey ?? undefined,
    price: activePrice ? money(activePrice.amountCents, activePrice.currency) : { amount: 0, amountCents: 0, currency: "CAD" },
    unit: product.unit ?? "each",
    dimensions: product.dimensions ?? "",
    finish: product.finish ?? undefined,
    colorName: product.colorName ?? undefined,
    colorHex: product.colorHex ?? undefined,
    packageQuantity: (product.packageQuantity as Record<string, unknown> | null) ?? undefined,
    finishOptions: Array.isArray(product.finishOptions) ? product.finishOptions : undefined,
    certificationRequired: product.certificationRequired,
    images,
    inStock: available > 0
  };

  const websiteApi = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    status: product.status,
    category: product.category,
    primarySku: primarySku
      ? {
          id: primarySku.id,
          skuCode: primarySku.skuCode,
          name: primarySku.name,
          attributes: primarySku.attributes
        }
      : null,
    price: activePrice ? money(activePrice.amountCents, activePrice.currency) : null,
    assets: product.assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      altText: asset.altText,
      kind: asset.kind,
      sortOrder: asset.sortOrder
    })),
    specifications: product.specifications,
    ratingSummary: {
      average: Number(averageRating.toFixed(1)),
      count: reviews.length,
      sourceLabel: "Published VanStro product reviews.",
      writeReviewEnabled: true
    },
    reviews: reviews.map((review) => ({
      id: review.id,
      name: review.nickname,
      title: review.title,
      body: review.body,
      rating: review.rating,
      createdAt: review.createdAt.toISOString(),
      verifiedBuyer: false
    }))
  };

  if (!options.includeDetail) {
    return { summary, websiteApi };
  }

  return {
    summary,
    websiteApi,
    detail: {
      ...summary,
      description: product.description ?? product.shortDescription ?? "",
      productHighlights: Array.isArray(product.productHighlights) ? product.productHighlights : undefined,
      documents: Array.isArray(product.documents) ? product.documents : undefined,
      supportLinks: Array.isArray(product.supportLinks) ? product.supportLinks : undefined,
      recommendations: (product.recommendations as Record<string, unknown> | null) ?? undefined,
      specifications,
      inventory: snapshots.map((snapshot, index) => ({
        id: `snapshot-${index}`,
        quantityAvailable: Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved),
        quantityOnHand: snapshot.quantityOnHand,
        quantityReserved: snapshot.quantityReserved
      })),
      ratingSummary: websiteApi.ratingSummary,
      reviews: websiteApi.reviews
    }
  };
}

export const productListInclude = {
  assets: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  category: true,
  specifications: { orderBy: { sortOrder: "asc" as const }, take: 3 },
  skus: {
    where: { status: "active" as const },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    include: {
      prices: {
        where: { status: "active" as const },
        orderBy: { createdAt: "desc" as const },
        take: 1
      },
      inventorySnapshots: {
        select: { quantityOnHand: true, quantityReserved: true }
      }
    }
  }
};

export const productDetailInclude = {
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
      },
      inventorySnapshots: true
    }
  },
  reviews: {
    where: { status: "published" as const },
    orderBy: { createdAt: "desc" as const }
  }
};

/** @deprecated Use productListInclude or productDetailInclude. */
export const productDisplayInclude = productDetailInclude;

export const dashboardProductInclude = {
  category: true,
  assets: { orderBy: { sortOrder: "asc" as const } },
  specifications: { orderBy: { sortOrder: "asc" as const } },
  skus: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      prices: { orderBy: { createdAt: "desc" as const } },
      erpMappings: true,
      inventorySnapshots: { include: { dealerLocation: { select: { id: true, name: true, code: true } } } }
    }
  }
};

export function buildProductWriteData(body: Record<string, unknown>): Prisma.ProductUncheckedUpdateInput {
  const data: Prisma.ProductUncheckedUpdateInput = {};
  const stringFields = [
    "slug",
    "name",
    "shortDescription",
    "description",
    "status",
    "brand",
    "manufacturerPartNumber",
    "subCategoryKey",
    "unit",
    "dimensions",
    "finish",
    "colorName",
    "colorHex"
  ] as const;

  for (const field of stringFields) {
    if (body[field] !== undefined && typeof body[field] === "string") {
      (data as Record<string, unknown>)[field] = body[field];
    }
  }

  if (typeof body.certificationRequired === "boolean") data.certificationRequired = body.certificationRequired;
  const jsonFields = [
    "packageQuantity",
    "finishOptions",
    "productHighlights",
    "documents",
    "supportLinks",
    "recommendations"
  ] as const;
  for (const field of jsonFields) {
    const value = body[field];
    if (value !== undefined && typeof value === "object") {
      (data as Record<string, unknown>)[field] = value as Prisma.InputJsonValue;
    }
  }

  return data;
}
