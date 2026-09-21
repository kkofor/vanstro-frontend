import { prisma, Prisma } from "@vanstro/db";
import { mb01ProductMetadataById, mb01Products } from "../src/lib/data/mb01-products.ts";

const INVENTORY_QUANTITY = 100;

function categorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function json(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : value as Prisma.InputJsonValue;
}

function uniqueVariants(product: (typeof mb01Products)[number]) {
  const variants = [
    {
      name: product.name,
      sku: product.sku,
      manufacturerPartNumber: product.manufacturerPartNumber,
      colorName: product.colorName,
      colorHex: product.colorHex,
      images: product.images,
      price: product.price,
      dimensions: product.dimensions,
      active: true
    },
    ...(product.finishOptions ?? [])
  ];
  return [...new Map(
    variants
      .filter((variant) => variant.sku?.trim())
      .map((variant) => [variant.sku!.trim(), variant])
  ).values()];
}

async function main() {
  const dealerLocation = await prisma.dealerLocation.findFirst({
    where: { dealer: { status: "active" }, pickupAvailable: true },
    orderBy: { createdAt: "asc" }
  });
  if (!dealerLocation) throw new Error("An active pickup dealer location is required before importing the catalog.");

  const categories = new Map<string, string>();
  for (const product of mb01Products) {
    const slug = categorySlug(product.category);
    if (categories.has(slug)) continue;
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name: product.category, isActive: true },
      create: { slug, name: product.category, isActive: true }
    });
    categories.set(slug, category.id);
  }

  let skuCount = 0;
  for (const [productIndex, product] of mb01Products.entries()) {
    const metadata = mb01ProductMetadataById[product.id];
    const categoryId = categories.get(categorySlug(product.category));
    if (!categoryId) throw new Error(`Category mapping is missing for ${product.slug}.`);
    const variants = uniqueVariants(product);
    const primaryVariant = variants.find((variant) => variant.sku === product.sku) ?? variants[0];

    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        shortDescription: metadata?.description,
        description: metadata?.description,
        status: "active",
        categoryId,
        brand: product.brand ?? "VanStro",
        manufacturerPartNumber: product.manufacturerPartNumber,
        subCategoryKey: product.subCategory,
        unit: product.unit,
        dimensions: product.dimensions,
        finish: product.finish,
        colorName: product.colorName,
        colorHex: product.colorHex,
        packageQuantity: json(product.packageQuantity),
        finishOptions: json(product.finishOptions),
        productHighlights: json(metadata?.productHighlights),
        certificationRequired: product.certificationRequired ?? false
      },
      create: {
        slug: product.slug,
        name: product.name,
        shortDescription: metadata?.description,
        description: metadata?.description,
        status: "active",
        categoryId,
        brand: product.brand ?? "VanStro",
        manufacturerPartNumber: product.manufacturerPartNumber,
        subCategoryKey: product.subCategory,
        unit: product.unit,
        dimensions: product.dimensions,
        finish: product.finish,
        colorName: product.colorName,
        colorHex: product.colorHex,
        packageQuantity: json(product.packageQuantity),
        finishOptions: json(product.finishOptions),
        productHighlights: json(metadata?.productHighlights),
        certificationRequired: product.certificationRequired ?? false,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, productIndex))
      }
    });

    const assetMap = new Map<string, { url: string; alt?: string }>();
    for (const image of product.images) assetMap.set(image.url, image);
    for (const variant of variants) {
      for (const image of variant.images ?? (variant.image ? [variant.image] : [])) {
        assetMap.set(image.url, image);
      }
    }
    let assetIndex = 0;
    for (const image of assetMap.values()) {
      await prisma.productAsset.upsert({
        where: { productId_url: { productId: record.id, url: image.url } },
        update: { altText: image.alt, kind: "image", sortOrder: assetIndex },
        create: { productId: record.id, url: image.url, altText: image.alt, kind: "image", sortOrder: assetIndex }
      });
      assetIndex += 1;
    }

    for (const [index, [key, value]] of Object.entries(metadata?.specifications ?? {}).entries()) {
      await prisma.productSpecification.upsert({
        where: { productId_key: { productId: record.id, key } },
        update: { value, sortOrder: index },
        create: { productId: record.id, key, value, sortOrder: index }
      });
    }

    for (const [variantIndex, variant] of variants.entries()) {
      const sku = await prisma.platformSku.upsert({
        where: { skuCode: variant.sku! },
        update: {
          productId: record.id,
          name: variant.name || product.name,
          manufacturerPartNumber: variant.manufacturerPartNumber,
          status: variant.active === false ? "draft" : "active",
          attributes: json({ colorName: variant.colorName, colorHex: variant.colorHex, dimensions: variant.dimensions }),
          sortOrder: variant.sku === primaryVariant.sku ? 0 : variantIndex + 1
        },
        create: {
          productId: record.id,
          skuCode: variant.sku!,
          name: variant.name || product.name,
          manufacturerPartNumber: variant.manufacturerPartNumber,
          status: variant.active === false ? "draft" : "active",
          attributes: json({ colorName: variant.colorName, colorHex: variant.colorHex, dimensions: variant.dimensions }),
          sortOrder: variant.sku === primaryVariant.sku ? 0 : variantIndex + 1
        }
      });
      const price = variant.price ?? product.price;
      const amountCents = price.amountCents ?? Math.round(price.amount * 100);
      await prisma.price.upsert({
        where: { key: `retail:${variant.sku}` },
        update: { skuId: sku.id, amountCents, currency: price.currency, status: "active" },
        create: { key: `retail:${variant.sku}`, skuId: sku.id, amountCents, currency: price.currency, status: "active" }
      });
      await prisma.inventorySnapshot.upsert({
        where: { skuId_dealerLocationId: { skuId: sku.id, dealerLocationId: dealerLocation.id } },
        update: { quantityOnHand: INVENTORY_QUANTITY },
        create: { skuId: sku.id, dealerLocationId: dealerLocation.id, quantityOnHand: INVENTORY_QUANTITY }
      });
      skuCount += 1;
    }
  }

  console.log(JSON.stringify({ products: mb01Products.length, skus: skuCount, dealerLocationId: dealerLocation.id }));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
