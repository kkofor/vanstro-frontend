import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

const INVENTORY_PATH = resolve(
  "docs/goal-loop/frontend-full-audit/evidence/G13-live-audit-2026-07-16/mb01-current-inventory.json"
);
const MAPPING_PATH = resolve(
  "docs/goal-loop/frontend-full-audit/evidence/G13-live-audit-2026-07-16/controlled-asset-mapping.json"
);
const GENERATED_PATH = resolve("src/lib/data/mb01-products.ts");
const IMAGE_OVERRIDES_PATH = resolve("scripts/approved-product-image-overrides.json");
const APPROVED_IMAGE_ASSETS_PATH = resolve("scripts/approved-product-image-assets.json");
const IMAGE_DIMENSIONS_PATH = resolve("src/lib/data/product-image-dimensions.json");
const DERIVED_PROVENANCE_PATH = resolve(
  "docs/goal-loop/frontend-full-audit/evidence/G7-rework-2026-07-16/asset-provenance-derived.json"
);
const EVIDENCE_DIR = resolve(
  "docs/goal-loop/frontend-full-audit/evidence/G3-implementation-2026-07-16"
);

function stable(value) {
  return JSON.stringify(value, Object.keys(value ?? {}).sort());
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function walk(root) {
  const files = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const path = resolve(root, entry.name);
      if (entry.isDirectory()) files.push(...await walk(path));
      else files.push(path);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return files;
}

async function scanHost(root) {
  const matches = [];
  for (const path of await walk(root)) {
    const buffer = await readFile(path);
    if (buffer.includes(Buffer.from("mb01.vanstro.ca"))) matches.push(path);
  }
  return matches;
}

const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
const mapping = JSON.parse(await readFile(MAPPING_PATH, "utf8")).assets;
const approvedImagePathsBySku = JSON.parse(await readFile(IMAGE_OVERRIDES_PATH, "utf8"));
const approvedImageAssets = JSON.parse(await readFile(APPROVED_IMAGE_ASSETS_PATH, "utf8")).assets;
const imageDimensions = JSON.parse(await readFile(IMAGE_DIMENSIONS_PATH, "utf8"));
const approvedAssetPaths = approvedImageAssets.map((asset) => asset.path);
const overrideBusinessPaths = [...new Set(
  Object.values(approvedImagePathsBySku).flat().filter((path) => approvedAssetPaths.includes(path))
)];
const approvedPathPattern = /^\/assets\/products\/(?:bathroom-vanities|kitchen-cabinets)\/[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/;
const approvedImageManifestValid =
  approvedImageAssets.length === 48 &&
  new Set(approvedAssetPaths).size === approvedImageAssets.length &&
  overrideBusinessPaths.length === approvedImageAssets.length &&
  approvedAssetPaths.every((path) => approvedPathPattern.test(path) && overrideBusinessPaths.includes(path));
const derivedProvenance = await readFile(DERIVED_PROVENANCE_PATH, "utf8")
  .then((source) => JSON.parse(source))
  .catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
const generatedSource = await readFile(GENERATED_PATH, "utf8");
const products = JSON.parse(
  generatedSource.match(/const localizedProducts: ProductSummary\[\] = (\[[\s\S]*?\]);\n\nconst localizeImage/)?.[1] ?? "null"
);
const metadata = JSON.parse(
  generatedSource.match(/mb01ProductMetadataById: Record<string, Mb01ProductMetadata> = ({[\s\S]*});\n$/)?.[1] ?? "null"
);
if (!products || !metadata) throw new Error("Unable to parse generated catalog data");

const derivedBySourceUrl = new Map(
  (derivedProvenance?.sources ?? []).map((asset) => [asset.sourceUrl, asset])
);
const effectiveAssets = mapping.map((asset) => {
  const derived = derivedBySourceUrl.get(asset.sourceUrl);
  return derived
    ? {
        ...asset,
        sha256: derived.sha256,
        plannedLocalPath: derived.localAssetPath,
        contentType: derived.contentType
      }
    : asset;
});
const localPathByUrl = new Map(
  effectiveAssets
    .filter((asset) => asset.localizationStatus === "Localized" && asset.plannedLocalPath)
    .map((asset) => [asset.sourceUrl, asset.plannedLocalPath])
);
const correctMaterial = (value) =>
  value.replaceAll("MDF / Plywood Thermofoil Finish", "MDF Thermofoil Finish");
const expectedAuthority = (authority) => authority.subCategory === "Accessories"
  ? {
      ...authority,
      description: correctMaterial(authority.description),
      highlights: authority.highlights.map(correctMaterial),
      parametersSpecifications: Object.fromEntries(
        Object.entries(authority.parametersSpecifications).map(([key, value]) => [key, correctMaterial(value)])
      )
    }
  : authority;
const approvedStorefrontNamesByParentSku = {
  "023021211": "Vanity Cabinet-V3021STDR",
  "023021311": "Vanity Cabinet-V3021STDL",
  "023021411": "Vanity Cabinet-V3021TDR",
  "023021511": "Vanity Cabinet-V3021TDL"
};
const productByParentSku = new Map(products.map((product) => [product.sku, product]));
const variantsByParentSku = new Map();
for (const variant of inventory.variants) {
  const variants = variantsByParentSku.get(variant.parentSku) ?? [];
  variants.push(variant);
  variantsByParentSku.set(variant.parentSku, variants);
}

const rows = [];
for (const sourceAuthority of inventory.variants) {
  const authority = expectedAuthority(sourceAuthority);
  const product = productByParentSku.get(authority.parentSku);
  const option = product?.finishOptions?.find((candidate) => candidate.sku === authority.sku);
  const singleVariant = product && !product.finishOptions && product.sku === authority.sku;
  const actualImages = option?.images ?? (singleVariant ? product.images : []);
  const actualDescription = option?.description ?? (singleVariant ? metadata[product.id]?.description : undefined);
  const actualHighlights = option?.productHighlights ?? (singleVariant ? metadata[product.id]?.productHighlights : undefined);
  const actualSpecifications = option?.specifications ?? (singleVariant ? metadata[product.id]?.specifications : undefined);
  const expectedImages = approvedImagePathsBySku[authority.sku] ?? authority.images.flatMap((url) => {
    const localPath = localPathByUrl.get(url);
    return localPath ? [localPath] : [];
  });
  const isHandle = authority.subCategory === "Handle series";
  const expectedCategory = isHandle ? "Handle series" : authority.category;
  const expectedSubCategory = isHandle ? undefined : authority.subCategory;
  const expectedName = approvedStorefrontNamesByParentSku[authority.parentSku] ?? authority.name;
  const checks = {
    parent: Boolean(product),
    variant: Boolean(option || singleVariant),
    name: product?.name === expectedName,
    category: product?.category === expectedCategory,
    subCategory: product?.subCategory === expectedSubCategory,
    model: (option?.manufacturerPartNumber ?? product?.manufacturerPartNumber) === authority.modelMpn,
    price: (option?.price ?? product?.price)?.amount === authority.priceCad.amount,
    description: actualDescription === authority.description,
    highlights: stable(actualHighlights) === stable(authority.highlights),
    specifications: stable(actualSpecifications) === stable(authority.parametersSpecifications),
    gallery: stable(actualImages.map((image) => image.url)) === stable(expectedImages),
    galleryOrder: actualImages.every((image, index) => image.url === expectedImages[index]),
    primary: actualImages[0]?.url === expectedImages[0]
  };
  const failedFields = Object.entries(checks).filter(([, pass]) => !pass).map(([field]) => field);
  rows.push({
    parentSku: authority.parentSku,
    sku: authority.sku,
    model: authority.modelMpn,
    status: failedFields.length ? "Mismatch" : "Matched",
    failedFields: failedFields.join("|")
  });
}

const uniqueAssets = [...new Map(effectiveAssets.map((asset) => [asset.sha256, asset])).values()];
let missingLocalAssets = 0;
let hashMismatches = 0;
let missingExportAssets = 0;
let namingFailures = 0;
for (const asset of uniqueAssets) {
  const localPath = resolve(`public${asset.plannedLocalPath}`);
  const exportedPath = resolve(`out${asset.plannedLocalPath}`);
  try {
    const buffer = await readFile(localPath);
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash !== asset.sha256) hashMismatches += 1;
  } catch (error) {
    if (error?.code === "ENOENT") missingLocalAssets += 1;
    else throw error;
  }
  try {
    await stat(exportedPath);
  } catch (error) {
    if (error?.code === "ENOENT") missingExportAssets += 1;
    else throw error;
  }
  const filename = asset.plannedLocalPath.split("/").at(-1);
  const extension = extname(filename).slice(1);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:gif|jpe?g|png|webp)$/.test(filename) || extension !== extension.toLowerCase()) {
    namingFailures += 1;
  }
}

let approvedImageMissingLocalAssets = 0;
let approvedImageHashMismatches = 0;
let approvedImageMissingExportAssets = 0;
let approvedImageNamingFailures = 0;
let approvedImageDimensionFailures = 0;
let approvedImagePathFailures = approvedImageManifestValid ? 0 : 1;
const publicRoot = resolve("public");
const exportRoot = resolve("out");
for (const asset of approvedImageAssets) {
  const localPath = resolve(publicRoot, `.${asset.path}`);
  const exportedPath = resolve(exportRoot, `.${asset.path}`);
  if (!localPath.startsWith(`${publicRoot}/`) || !exportedPath.startsWith(`${exportRoot}/`)) {
    approvedImagePathFailures += 1;
    continue;
  }
  const filename = asset.path.split("/").at(-1);
  const extension = extname(filename).slice(1);
  try {
    const buffer = await readFile(localPath);
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash !== asset.sha256 || buffer.length !== asset.bytes) approvedImageHashMismatches += 1;
  } catch (error) {
    if (error?.code === "ENOENT") approvedImageMissingLocalAssets += 1;
    else throw error;
  }
  try {
    const buffer = await readFile(exportedPath);
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hash !== asset.sha256 || buffer.length !== asset.bytes) approvedImageHashMismatches += 1;
  } catch (error) {
    if (error?.code === "ENOENT") approvedImageMissingExportAssets += 1;
    else throw error;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:gif|jpe?g|png|webp)$/.test(filename) || extension !== extension.toLowerCase()) {
    approvedImageNamingFailures += 1;
  }
  if (stable(imageDimensions[asset.path]) !== stable([asset.width, asset.height])) {
    approvedImageDimensionFailures += 1;
  }
}

const sourceHostMatches = await scanHost(resolve("src"));
const outputHostMatches = [
  ...await scanHost(resolve("out")),
  ...await scanHost(resolve(".next/server")),
  ...await scanHost(resolve(".next/static"))
];
const summary = {
  observedAt: inventory.observedAt,
  verifiedAt: new Date().toISOString(),
  parentProducts: products.length,
  authorityVariants: inventory.variants.length,
  matchedVariants: rows.filter((row) => row.status === "Matched").length,
  mismatchedVariants: rows.filter((row) => row.status !== "Matched").length,
  uniqueSourceAssets: uniqueAssets.length,
  derivedAssets: derivedProvenance?.conversions?.length ?? 0,
  missingLocalAssets,
  hashMismatches,
  namingFailures,
  missingExportAssets,
  approvedBusinessAssets: approvedImageAssets.length,
  approvedImageMissingLocalAssets,
  approvedImageHashMismatches,
  approvedImageMissingExportAssets,
  approvedImageNamingFailures,
  approvedImageDimensionFailures,
  approvedImagePathFailures,
  sourceHostMatches,
  outputHostMatches,
  pass:
    products.length === inventory.parents.length &&
    rows.every((row) => row.status === "Matched") &&
    missingLocalAssets === 0 &&
    hashMismatches === 0 &&
    namingFailures === 0 &&
    missingExportAssets === 0 &&
    approvedImageMissingLocalAssets === 0 &&
    approvedImageHashMismatches === 0 &&
    approvedImageMissingExportAssets === 0 &&
    approvedImageNamingFailures === 0 &&
    approvedImageDimensionFailures === 0 &&
    approvedImagePathFailures === 0 &&
    sourceHostMatches.length === 0 &&
    outputHostMatches.length === 0
};

await mkdir(EVIDENCE_DIR, { recursive: true });
await writeFile(resolve(EVIDENCE_DIR, "verification-summary.json"), JSON.stringify(summary, null, 2), "utf8");
await writeFile(
  resolve(EVIDENCE_DIR, "variant-verification.csv"),
  [
    "parent_sku,sku,model,status,failed_fields",
    ...rows.map((row) => [row.parentSku, row.sku, row.model, row.status, row.failedFields].map(csvCell).join(","))
  ].join("\n") + "\n",
  "utf8"
);

console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;
