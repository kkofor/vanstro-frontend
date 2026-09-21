import { createHash } from "node:crypto";
import { prisma, type Prisma } from "@vanstro/db";
import { ErpProductClient } from "../erp-product/client.js";
import type { ErpCategoryListItem, ErpProductListItem, ErpSkuListItem } from "../erp-product/types.js";

// Legacy-isolated pull adapter (v11-r1-erp-readiness §7).
// syncProductsFromUpstream is the historical pull path and intentionally does
// NOT route through the canonical batch ingest (dashboard/batch-ingest
// createIngestJob): canonical item kinds cannot carry SKU attributes,
// dimensions, per-SKU names or ERP mapping ids without extending the ingest
// schema, and the machine route returns a synchronous per-item result that
// worker throttling (CatalogSyncRun) depends on. It is therefore explicitly
// marked legacy-isolated: per-item source identity is persisted on
// ProductSkuErpMapping rows (erpSystem/erpSkuKey/erpProductId/erpSkuId),
// upserts are idempotent through the mapping/sku unique constraints, and the
// CatalogSyncRun row plus the payload fingerprint (surfaced through machine
// audit) form the run-ledger watermark. VanStro-owned fields (Media assets,
// marketing copy, publish status, display order) are never written from pull;
// ERP-owned fields written here are base name/slug, SKU attributes,
// dimensions, specifications and category status (isActive).
// Residuals (documented, not fixed in this pass): category resolution still
// matches by name/slug until erp_category_mappings wiring lands; a true
// canonical-ingest pull (with per-item ERP_MAPPING_INCOMPLETE failures and
// replay/conflict semantics) requires extending batch-ingest item kinds.

export type ErpCatalogSyncResult = {
  imported: number;
  updated: number;
  skipped: number;
  categoriesImported: number;
  categoriesUpdated: number;
  errors: string[];
  finishedAt: string;
  /** ERP system this pull ran against; per-item source identity lives on ProductSkuErpMapping rows. */
  sourceSystem: string;
  /** sha256 over the canonical upstream product + SKU payload this run consumed. */
  fingerprint: string;
};

const DEFAULT_ERP_SYSTEM = process.env.ERP_CATALOG_SYNC_SYSTEM ?? "vanstro-erp";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueProductSlug(base: string) {
  const normalized = slugify(base) || "erp-product";
  let candidate = normalized;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function skuAttributes(item: ErpSkuListItem): Prisma.InputJsonValue {
  return {
    erpSkuModel: item.sku_model,
    width: item.width,
    length: item.length,
    height: item.height,
    bomList: item.bomList
  };
}

function dimensionsLabel(item: ErpSkuListItem) {
  const parts = [item.width, item.length, item.height].filter(Boolean);
  return parts.length ? parts.join(" x ") : undefined;
}

async function resolveCategoryId(product: ErpProductListItem) {
  const category = await prisma.category.findFirst({
    where: { OR: [{ name: product.category_name }, { slug: slugify(product.category_name) }] },
    select: { id: true }
  });
  return category?.id;
}

async function upsertCategoryTree(items: ErpCategoryListItem[], parentId?: string) {
  let imported = 0;
  let updated = 0;

  for (const item of items) {
    const slug = slugify(item.category_code || item.category_name) || `erp-category-${item.id}`;
    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug }, { name: item.category_name }] },
      select: { id: true, name: true }
    });
    // sortOrder (display order) is VanStro-owned per contract §5 and is never
    // written from pull; name and isActive (status) are ERP-owned.
    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            name: item.category_name,
            isActive: item.status === 1
          }
        })
      : await prisma.category.create({
          data: {
            slug,
            name: item.category_name,
            isActive: item.status === 1,
            parentId
          }
        });
    if (existing) updated += 1;
    else imported += 1;

    if (item.children?.length) {
      const childCounts = await upsertCategoryTree(item.children, category.id);
      imported += childCounts.imported;
      updated += childCounts.updated;
    }
  }

  return { imported, updated };
}

export async function syncCategoriesFromUpstream(client: ErpProductClient) {
  const data = await client.categoryList({ tree: true });
  return upsertCategoryTree(data.list);
}

export async function syncProductsFromUpstream(
  client: ErpProductClient,
  options?: { erpSystem?: string; syncCategories?: boolean }
) {
  const erpSystem = options?.erpSystem ?? DEFAULT_ERP_SYSTEM;
  const result: ErpCatalogSyncResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    categoriesImported: 0,
    categoriesUpdated: 0,
    errors: [],
    finishedAt: new Date().toISOString(),
    sourceSystem: erpSystem,
    fingerprint: ""
  };

  if (options?.syncCategories) {
    try {
      const categoryResult = await syncCategoriesFromUpstream(client);
      result.categoriesImported = categoryResult.imported;
      result.categoriesUpdated = categoryResult.updated;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : "Category sync failed.");
    }
  }

  const productPageSize = 500;
  const productRows = [];
  for (let page = 1; page <= 100; page += 1) {
    const response = await client.productList({ limit: productPageSize, page });
    productRows.push(...response.list);
    const total = response.total ?? response.list.length;
    if (response.list.length < productPageSize || productRows.length >= total) break;
  }
  const productById = new Map(productRows.map((product) => [product.id, product]));
  const skus = await client.skuList();

  // Canonical payload fingerprint: stable across identical upstream payloads
  // so replays are recognizable in the run ledger / machine audit watermark.
  result.fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        products: productRows
          .slice()
          .sort((a, b) => a.id - b.id)
          .map((product) => ({
            id: product.id,
            product_name: product.product_name,
            category_name: product.category_name,
            product_material: product.product_material,
            product_image: product.product_image
          })),
        skus: skus.list
          .slice()
          .sort((a, b) => a.id - b.id)
          .map((sku) => ({
            id: sku.id,
            product_id: sku.product_id,
            sku_code: sku.sku_code,
            sku_title: sku.sku_title,
            sku_model: sku.sku_model,
            width: sku.width,
            length: sku.length,
            height: sku.height,
            bomList: sku.bomList
          }))
      })
    )
    .digest("hex");

  for (const erpSku of skus.list) {
    const erpSkuKey = erpSku.sku_code?.trim();
    if (!erpSkuKey) {
      result.skipped += 1;
      continue;
    }

    const erpProduct = productById.get(erpSku.product_id);
    try {
      const existingMapping = await prisma.productSkuErpMapping.findUnique({
        where: { erpSystem_erpSkuKey: { erpSystem, erpSkuKey } },
        include: { sku: { include: { product: true } } }
      });

      if (existingMapping) {
        await prisma.$transaction([
          prisma.productSkuErpMapping.update({
            where: { id: existingMapping.id },
            data: {
              erpProductId: erpSku.product_id,
              erpSkuId: erpSku.id
            }
          }),
          prisma.platformSku.update({
            where: { id: existingMapping.skuId },
            data: { attributes: skuAttributes(erpSku) }
          })
        ]);
        result.updated += 1;
        continue;
      }

      const existingSku = await prisma.platformSku.findUnique({
        where: { skuCode: erpSkuKey },
        include: { product: true, erpMappings: true }
      });

      if (existingSku) {
        await prisma.$transaction(async (tx) => {
          await tx.platformSku.update({
            where: { id: existingSku.id },
            data: { attributes: skuAttributes(erpSku) }
          });
          const mapping = existingSku.erpMappings.find((entry) => entry.erpSystem === erpSystem);
          if (mapping) {
            await tx.productSkuErpMapping.update({
              where: { id: mapping.id },
              data: { erpProductId: erpSku.product_id, erpSkuId: erpSku.id, erpSkuKey }
            });
          } else {
            await tx.productSkuErpMapping.create({
              data: {
                skuId: existingSku.id,
                erpSystem,
                erpSkuKey,
                erpProductId: erpSku.product_id,
                erpSkuId: erpSku.id
              }
            });
          }
        });
        result.updated += 1;
        continue;
      }

      const productName = erpProduct?.product_name ?? erpSku.sku_title ?? erpSkuKey;
      const categoryId = erpProduct ? await resolveCategoryId(erpProduct) : undefined;
      const siblingMapping = await prisma.productSkuErpMapping.findFirst({
        where: { erpSystem, erpProductId: erpSku.product_id },
        select: { sku: { select: { productId: true } } }
      });
      const slug = siblingMapping ? undefined : await uniqueProductSlug(erpSkuKey);

      await prisma.$transaction(async (tx) => {
        // VanStro-owned fields are intentionally NOT written from pull: Media
        // assets (product_image), marketing copy (shortDescription) and
        // publish status. Product.status falls back to the schema default
        // "draft" and PlatformSku.status to "active"; the product stays
        // invisible to the storefront until VanStro publishes it.
        const productId = siblingMapping?.sku.productId ?? (await tx.product.create({
          data: {
            slug: slug!,
            name: productName,
            categoryId,
            dimensions: dimensionsLabel(erpSku),
            specifications: erpProduct?.product_material.length
              ? {
                  create: erpProduct.product_material.flatMap((entry, index) =>
                    Object.entries(entry).map(([key, value]) => ({ key, value, sortOrder: index }))
                  )
                }
              : undefined
          }
        })).id;
        const sku = await tx.platformSku.create({
          data: {
            productId,
            skuCode: erpSkuKey,
            name: erpSku.sku_title || productName,
            attributes: skuAttributes(erpSku)
          }
        });
        await tx.productSkuErpMapping.create({
          data: {
            skuId: sku.id,
            erpSystem,
            erpSkuKey,
            erpProductId: erpSku.product_id,
            erpSkuId: erpSku.id
          }
        });
      });
      result.imported += 1;
    } catch (error) {
      result.errors.push(
        `${erpSkuKey}: ${error instanceof Error ? error.message : "sync failed"}`
      );
    }
  }

  result.finishedAt = new Date().toISOString();
  return result;
}

export async function refreshFinishOptionsFromErp(input: {
  productId: string;
  dealerLocationId?: string;
  erpSystem?: string;
}) {
  const erpSystem = input.erpSystem ?? DEFAULT_ERP_SYSTEM;
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: {
      skus: {
        where: { status: "active" },
        orderBy: { sortOrder: "asc" },
        include: { erpMappings: { where: { erpSystem } } }
      }
    }
  });
  if (!product) return null;

  const mapping = product.skus.flatMap((sku) => sku.erpMappings)[0];
  if (!mapping?.erpProductId) return null;

  let dealerId: number | undefined;
  if (input.dealerLocationId) {
    const link = await prisma.dealerErpLink.findFirst({
      where: { dealerLocationId: input.dealerLocationId, erpSystem }
    });
    dealerId = link ? Number.parseInt(link.erpLocationId, 10) : undefined;
    if (Number.isNaN(dealerId)) dealerId = undefined;
  }

  const client = new ErpProductClient();
  const colors = await client.colorList({
    productId: mapping.erpProductId,
    productSkuId: mapping.erpSkuId ?? undefined,
    dealerId
  });

  const existing = Array.isArray(product.finishOptions)
    ? (product.finishOptions as Array<Record<string, unknown>>)
    : [];
  const merged = colors.list.map((color) => {
    const match = existing.find(
      (option) => option.colorCode === color.color_code || option.id === String(color.color_id)
    );
    return {
      id: String(color.color_id),
      colorCode: color.color_code,
      labelEn: color.color_name_en,
      labelFr: color.color_name_fr,
      imageUrl: color.color_image,
      available: true,
      ...(match ?? {})
    };
  });

  return prisma.product.update({
    where: { id: product.id },
    data: { finishOptions: merged as Prisma.InputJsonValue }
  });
}
