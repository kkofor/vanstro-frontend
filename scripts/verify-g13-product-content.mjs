import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const INVENTORY_PATH = resolve(
  process.env.MB01_INVENTORY_PATH ??
    "docs/goal-loop/frontend-full-audit/evidence/G13-live-audit-2026-07-16/mb01-current-inventory.json"
);
const MAPPING_PATH = resolve(
  process.env.MB01_MAPPING_PATH ??
    "docs/goal-loop/frontend-full-audit/evidence/G13-live-audit-2026-07-16/controlled-asset-mapping.json"
);
const GENERATED_PATH = resolve("src/lib/data/mb01-products.ts");
const OUTPUT_PATH = resolve(
  process.env.G13_VERIFICATION_OUTPUT ??
    "docs/goal-loop/frontend-full-audit/evidence/G13-implementation-2026-07-16/verification-summary.json"
);

const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
const mapping = JSON.parse(await readFile(MAPPING_PATH, "utf8"));
const generatedSource = await readFile(GENERATED_PATH, "utf8");
const products = JSON.parse(
  generatedSource.match(/const localizedProducts: ProductSummary\[\] = (\[[\s\S]*?\]);\n\nconst localizeImage/)?.[1] ?? "null"
);
const metadata = JSON.parse(
  generatedSource.match(/mb01ProductMetadataById: Record<string, Mb01ProductMetadata> = ({[\s\S]*});\n$/)?.[1] ?? "null"
);
if (!products || !metadata) throw new Error("Unable to parse generated catalog data");

const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};
const equal = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const correctMaterial = (value) =>
  value.replaceAll("MDF / Plywood Thermofoil Finish", "MDF Thermofoil Finish");
const expectedVariant = (variant) => variant.subCategory === "Accessories"
  ? {
      ...variant,
      description: correctMaterial(variant.description),
      highlights: variant.highlights.map(correctMaterial),
      parametersSpecifications: Object.fromEntries(
        Object.entries(variant.parametersSpecifications).map(([key, value]) => [key, correctMaterial(value)])
      )
    }
  : variant;

const mappingByUrl = new Map(mapping.assets.map((asset) => [asset.sourceUrl, asset]));
const localBySku = new Map();
for (const product of products) {
  const options = product.finishOptions?.length ? product.finishOptions : [null];
  for (const option of options) {
    const sku = option?.sku ?? product.sku;
    localBySku.set(sku, {
      product,
      option,
      description: option?.description ?? metadata[product.id]?.description,
      highlights: option?.productHighlights ?? metadata[product.id]?.productHighlights,
      specifications: option?.specifications ?? metadata[product.id]?.specifications,
      images: option?.images ?? product.images
    });
  }
}

const rows = [];
for (const sourceVariant of inventory.variants) {
  const expected = expectedVariant(sourceVariant);
  const local = localBySku.get(expected.sku);
  const expectedImages = expected.images.flatMap((url) => {
    const asset = mappingByUrl.get(url);
    return asset?.localizationStatus === "Localized" && asset.plannedLocalPath
      ? [asset.plannedLocalPath]
      : [];
  });
  const fields = local
    ? {
        name: local.product.name === expected.name,
        category: local.product.category === expected.category,
        subCategory: local.product.subCategory === expected.subCategory,
        model: (local.option?.manufacturerPartNumber ?? local.product.manufacturerPartNumber) === expected.modelMpn,
        price: equal(local.option?.price ?? local.product.price, expected.priceCad),
        description: local.description === expected.description,
        highlights: equal(local.highlights, expected.highlights),
        specifications: equal(local.specifications, expected.parametersSpecifications),
        gallery: equal(local.images.map((image) => image.url), expectedImages)
      }
    : { product: false };
  const failedFields = Object.entries(fields).filter(([, pass]) => !pass).map(([field]) => field);
  rows.push({ sku: expected.sku, parentSku: expected.parentSku, failedFields });
}

const liveSkus = new Set(inventory.variants.map((variant) => variant.sku));
const extraLocalSkus = [...localBySku.keys()].filter((sku) => !liveSkus.has(sku));
const vanityVariants = inventory.variants.filter((variant) => variant.category === "Bathroom Vanities");
const cabinetOnlyVariants = vanityVariants.filter((variant) => !/-TOP$/i.test(variant.modelMpn));
const handleProducts = products.filter((product) => product.subCategory === "Handle series");
const accessoryProducts = products.filter((product) => product.subCategory === "Accessories");
const accessoryText = JSON.stringify(accessoryProducts);
const blockedAssets = mapping.assets.filter((asset) => asset.localizationStatus === "Blocked");
const catalogConfig = await readFile(resolve("src/lib/product/catalog-config.ts"), "utf8");
const detailMain = await readFile(resolve("src/components/product/ProductDetailMain.tsx"), "utf8");

const summary = {
  verifiedAt: new Date().toISOString(),
  sourceObservedAt: inventory.observedAt,
  parents: products.length,
  variants: localBySku.size,
  matchedVariants: rows.filter((row) => row.failedFields.length === 0).length,
  mismatchedVariants: rows.filter((row) => row.failedFields.length > 0).length,
  extraLocalSkus,
  bathroomVanityVariants: vanityVariants.length,
  bathroomVanityHardwareComplete: vanityVariants.every(
    (variant) => variant.highlights.some((highlight) => highlight.startsWith("Hardware:"))
  ),
  bathroomVanityCabinetOnlyVariants: cabinetOnlyVariants.length,
  handleParents: handleProducts.map((product) => ({
    sku: product.sku,
    name: product.name,
    subCategory: product.subCategory
  })),
  accessoriesContainPlywood: /Plywood/i.test(accessoryText),
  handleFilterPresent: catalogConfig.includes('label: "Handle series"'),
  overviewRendersAllHighlights: detailMain.includes("{productHighlights.map((highlight)"),
  localizedSourceAssets: mapping.summary.localized,
  blockedAssets: blockedAssets.map((asset) => ({ sourceUrl: asset.sourceUrl, error: asset.error })),
  runtimeMb01ReferencesInCatalog: generatedSource.includes("mb01.vanstro.ca"),
  pass:
    products.length === 140 &&
    localBySku.size === 300 &&
    rows.every((row) => row.failedFields.length === 0) &&
    extraLocalSkus.length === 0 &&
    vanityVariants.length === 52 &&
    cabinetOnlyVariants.length === 26 &&
    vanityVariants.every((variant) =>
      variant.highlights.some((highlight) => highlight.startsWith("Hardware:"))
    ) &&
    handleProducts.length === 2 &&
    !/Plywood/i.test(accessoryText) &&
    catalogConfig.includes('label: "Handle series"') &&
    detailMain.includes("{productHighlights.map((highlight)") &&
    mapping.summary.missing === 0 &&
    blockedAssets.length === 1 &&
    !generatedSource.includes("mb01.vanstro.ca")
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify({ summary, rows }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;
