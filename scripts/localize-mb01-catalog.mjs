import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const INVENTORY_PATH = resolve(
  process.env.MB01_INVENTORY_PATH ??
    "docs/goal-loop/frontend-full-audit/evidence/G3-rework-2026-07-15/mb01-current-inventory.json"
);
const MAPPING_PATH = resolve(
  process.env.MB01_MAPPING_PATH ??
    "docs/goal-loop/frontend-full-audit/evidence/G3-rework-2026-07-15/asset-source-local-mapping.json"
);
const OUTPUT_PATH = resolve("src/lib/data/mb01-products.ts");
const EVIDENCE_DIR = resolve(
  process.env.MB01_LOCALIZATION_EVIDENCE_DIR ??
    "docs/goal-loop/frontend-full-audit/evidence/G3-implementation-2026-07-16"
);
const EXPECTED_PARENT_COUNT = Number(process.env.MB01_EXPECTED_PARENT_COUNT ?? 139);
const EXPECTED_VARIANT_COUNT = Number(process.env.MB01_EXPECTED_VARIANT_COUNT ?? 300);
const COLOR_OPTIONS = {
  LG: { name: "Light Grey", colorHex: "#c9cbc7" },
  WH: { name: "White", colorHex: "#f7f6f2" }
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function colorForModel(model) {
  const code = model.split("-").find((part) => COLOR_OPTIONS[part]);
  return code ? COLOR_OPTIONS[code] : undefined;
}

function variantLabel(parent, variant) {
  const color = colorForModel(variant.modelMpn);
  if (color && parent.variants.length > 2) {
    return `${color.name} ${/-TOP$/i.test(variant.modelMpn) ? "with top" : "cabinet only"}`;
  }
  if (color) return color.name;

  const centerToCenter = variant.modelMpn.match(/CTC\[(\d+)mm\]/i)?.[1];
  if (centerToCenter) return `${centerToCenter} mm center-to-center`;
  return variant.modelMpn;
}

function dimensionsFor(variant) {
  return variant.parametersSpecifications.Dimensions ??
    variant.description.match(/Dimensions:\s*([^C]+?)(?=\s+Carcass:|$)/i)?.[1]?.trim() ??
    variant.description.match(/Center-to-Center:\s*([^O]+?)(?=\s+Overall Length:|$)/i)?.[1]?.trim() ??
    "See product specifications";
}

function imageAlt(productName, sku, index) {
  return index === 0
    ? `${productName} SKU ${sku} primary product view`
    : `${productName} SKU ${sku} product view ${index + 1}`;
}

async function fileHash(path) {
  try {
    await stat(path);
    return sha256(await readFile(path));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function fetchAsset(asset) {
  const destination = resolve(`public${asset.plannedLocalPath}`);
  const currentHash = await fileHash(destination);
  const expectedLocalHash = asset.localSha256 ?? asset.sha256;
  const expectedSourceHash = asset.sourceSha256 ?? asset.sha256;
  if (currentHash === expectedLocalHash) return { status: "reused", destination };
  if (currentHash) {
    throw new Error(`Existing asset hash mismatch: ${destination}`);
  }

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(asset.sourceUrl, {
        headers: { "User-Agent": "VanStro controlled asset localization/1.0" }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const actualHash = sha256(buffer);
      if (actualHash !== expectedSourceHash) {
        throw new Error(`SHA-256 mismatch: expected ${expectedSourceHash}, received ${actualHash}`);
      }
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, buffer);
      return { status: "downloaded", destination };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolvePromise) => setTimeout(resolvePromise, 400 * attempt));
    }
  }
  throw new Error(`Unable to localize ${asset.sourceUrl}: ${lastError?.message}`);
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await callback(items[index], index);
      if ((index + 1) % 100 === 0) process.stdout.write(`Localized ${index + 1}/${items.length}\n`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
const mappingDocument = JSON.parse(await readFile(MAPPING_PATH, "utf8"));
const assets = mappingDocument.assets;

if (
  inventory.parents.length !== EXPECTED_PARENT_COUNT ||
  inventory.variants.length !== EXPECTED_VARIANT_COUNT
) {
  throw new Error(
    `Unexpected catalog coverage: ${inventory.parents.length} parents, ${inventory.variants.length} variants`
  );
}

const mappingByUrl = new Map(assets.map((asset) => [asset.sourceUrl, asset]));
const canonicalAssetsByHash = new Map();
for (const asset of assets) {
  const existing = canonicalAssetsByHash.get(asset.sha256);
  if (existing && existing.plannedLocalPath !== asset.plannedLocalPath) {
    throw new Error(`One hash maps to multiple paths: ${asset.sha256}`);
  }
  canonicalAssetsByHash.set(asset.sha256, asset);
}

const canonicalAssets = [...canonicalAssetsByHash.values()].filter(
  (asset) => asset.localizationStatus !== "Blocked" && asset.plannedLocalPath
);
const localizationResults = await mapWithConcurrency(canonicalAssets, 8, fetchAsset);
const localPathForUrl = (url) => {
  const mapping = mappingByUrl.get(url);
  if (!mapping) throw new Error(`No controlled asset mapping for ${url}`);
  if (mapping.localizationStatus === "Blocked") return null;
  return mapping.plannedLocalPath;
};

function applyApprovedBusinessCorrections(parent, variant) {
  if (parent.subCategory !== "Accessories") return variant;

  const correctMaterial = (value) =>
    value.replaceAll("MDF / Plywood Thermofoil Finish", "MDF Thermofoil Finish");

  return {
    ...variant,
    description: correctMaterial(variant.description),
    highlights: variant.highlights.map(correctMaterial),
    parametersSpecifications: Object.fromEntries(
      Object.entries(variant.parametersSpecifications).map(([key, value]) => [
        key,
        correctMaterial(value)
      ])
    )
  };
}

const variantsByParentSku = new Map();
for (const variant of inventory.variants) {
  const variants = variantsByParentSku.get(variant.parentSku) ?? [];
  variants.push(variant);
  variantsByParentSku.set(variant.parentSku, variants);
}

const metadataById = {};
const products = inventory.parents.map((parent) => {
  const variantsBySku = new Map(
    (variantsByParentSku.get(parent.sku) ?? []).map((variant) => [variant.sku, variant])
  );
  const orderedVariants = parent.variants.map(({ sku }) => {
    const variant = variantsBySku.get(sku);
    if (!variant) throw new Error(`Missing variant payload for ${sku}`);
    return applyApprovedBusinessCorrections(parent, variant);
  });
  const activeVariantSource = variantsBySku.get(parent.sku);
  const activeVariant = activeVariantSource
    ? applyApprovedBusinessCorrections(parent, activeVariantSource)
    : undefined;
  if (!activeVariant) throw new Error(`Missing active variant ${parent.sku}`);

  const id = `mb01-${parent.listedOptionId}`;
  const toImages = (variant) => variant.images.flatMap((url, index) => {
    const localPath = localPathForUrl(url);
    return localPath
      ? [{ url: localPath, alt: imageAlt(parent.name, variant.sku, index) }]
      : [];
  });
  const finishOptions = orderedVariants.map((variant) => {
    const color = colorForModel(variant.modelMpn);
    const images = toImages(variant);
    const isHandle = parent.subCategory === "Handle series";
    return {
      name: variantLabel(parent, variant),
      sku: variant.sku,
      manufacturerPartNumber: variant.modelMpn,
      colorHex: color?.colorHex ?? (isHandle ? "#222222" : undefined),
      image: images[0],
      images,
      price: variant.priceCad,
      dimensions: dimensionsFor(variant),
      description: variant.description,
      productHighlights: variant.highlights,
      specifications: variant.parametersSpecifications,
      active: variant.sku === parent.sku
    };
  });
  const activeColor = colorForModel(activeVariant.modelMpn);
  const isHandle = parent.subCategory === "Handle series";

  metadataById[id] = {
    sourceProductId: parent.sourceProductId,
    sourceProductName: parent.name,
    sourceCategory: parent.subCategory,
    description: activeVariant.description,
    productHighlights: activeVariant.highlights,
    specifications: activeVariant.parametersSpecifications
  };

  return {
    id,
    slug: parent.sourceSlug,
    sku: activeVariant.sku,
    manufacturerPartNumber: activeVariant.modelMpn,
    name: parent.name,
    category: parent.category,
    subCategory: parent.subCategory,
    price: activeVariant.priceCad,
    unit: "each",
    dimensions: dimensionsFor(activeVariant),
    finish: activeColor?.name ?? (isHandle ? "Matte Black" : "White finish"),
    colorName: activeColor?.name ?? (isHandle ? "Matte Black" : undefined),
    colorHex: activeColor?.colorHex ?? (isHandle ? "#222222" : undefined),
    finishOptions: finishOptions.length > 1 ? finishOptions : undefined,
    dealerStock: { winnipeg: 0 },
    availability: {
      productId: id,
      sku: activeVariant.sku,
      locations: [{
        dealerId: "winnipeg",
        quantity: 0,
        quantityKnown: false,
        status: "in_stock",
        pickupAvailable: true,
        deliveryAvailable: true,
        updatedAt: "source-catalog"
      }],
      totalAvailable: 0,
      status: "in_stock",
      availabilityMessage: "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      updatedAt: "source-catalog"
    },
    images: toImages(activeVariant),
    inStock: true
  };
});

const output = `import type { ProductSummary } from "@/lib/api/api-contract";\n` +
  `import { assetPath } from "@/lib/assets";\n\n` +
  `export type Mb01ProductMetadata = {\n` +
  `  sourceProductId: string;\n  sourceProductName: string;\n  sourceCategory: string;\n` +
  `  description: string;\n  productHighlights: string[];\n  specifications: Record<string, string>;\n};\n\n` +
  `// Generated from the timestamped G3 inventory. Product assets are VanStro-controlled local files.\n` +
  `const localizedProducts: ProductSummary[] = ${JSON.stringify(products, null, 2)};\n\n` +
  `const localizeImage = <T extends { url: string }>(image: T): T => ({ ...image, url: assetPath(image.url) });\n\n` +
  `export const mb01Products: ProductSummary[] = localizedProducts.map((product) => ({\n` +
  `  ...product,\n  images: product.images.map(localizeImage),\n` +
  `  finishOptions: product.finishOptions?.map((option) => ({\n` +
  `    ...option,\n    image: option.image ? localizeImage(option.image) : undefined,\n` +
  `    images: option.images?.map(localizeImage)\n  }))\n}));\n\n` +
  `export const mb01ProductMetadataById: Record<string, Mb01ProductMetadata> = ${JSON.stringify(metadataById, null, 2)};\n`;

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, output, "utf8");
await mkdir(EVIDENCE_DIR, { recursive: true });
await writeFile(
  resolve(EVIDENCE_DIR, "asset-provenance.json"),
  JSON.stringify({
    observedAt: inventory.observedAt,
    generatedAt: new Date().toISOString(),
    sources: assets.map((asset) => ({
      sourceUrl: asset.sourceUrl,
      sha256: asset.sourceSha256 ?? asset.sha256,
      localSha256: asset.localSha256 ?? asset.sha256,
      bytes: asset.bytes,
      contentType: asset.contentType,
      width: asset.width,
      height: asset.height,
      localAssetPath: asset.plannedLocalPath,
      skus: asset.skus,
      occurrences: asset.occurrences.map(({ parentSku, sku, role, order }) => ({
        parentSku,
        sku,
        role,
        order
      }))
    }))
  }, null, 2),
  "utf8"
);
await writeFile(
  resolve(EVIDENCE_DIR, "localization-summary.json"),
  JSON.stringify({
    observedAt: inventory.observedAt,
    generatedAt: new Date().toISOString(),
    parentProducts: products.length,
    publicVariants: inventory.variants.length,
    sourceAssetUrls: assets.length,
    uniqueAssetBytes: canonicalAssets.length,
    downloaded: localizationResults.filter((result) => result.status === "downloaded").length,
    reused: localizationResults.filter((result) => result.status === "reused").length,
    output: OUTPUT_PATH
  }, null, 2),
  "utf8"
);

console.log(JSON.stringify({
  parents: products.length,
  variants: inventory.variants.length,
  uniqueAssets: canonicalAssets.length,
  downloaded: localizationResults.filter((result) => result.status === "downloaded").length,
  reused: localizationResults.filter((result) => result.status === "reused").length,
  output: OUTPUT_PATH
}, null, 2));
