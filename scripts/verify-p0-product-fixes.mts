import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ProductDetail, ProductSummary } from "../src/lib/api/api-contract.ts";
import { formatDisplayMeasurement, formatUnitPrice } from "../src/lib/i18n/display-format.ts";
import {
  findProductFinishOption,
  presentProductFinishOptions
} from "../src/lib/product/product-finish-options.ts";
import {
  createFrCaDefaultQuestions,
  localizeProduct,
  localizeProductTaxonomyLabel,
  localizeSpecifications,
  localizeSpecificationRows
} from "../src/lib/product/product-localization.ts";
import { resolveProductVariant } from "../src/lib/product/product-variants.ts";

const generatedPath = new URL("../src/lib/data/mb01-products.ts", import.meta.url);
const source = readFileSync(generatedPath, "utf8");
const marker = "const localizedProducts: ProductSummary[] = ";
const start = source.indexOf(marker) + marker.length;
const end = source.indexOf("\n];", start) + 2;
assert.ok(start >= marker.length && end > start, "Generated MB01 product array was not found.");
const products = JSON.parse(source.slice(start, end)) as ProductSummary[];
const metadataMatch = source.match(/mb01ProductMetadataById: Record<string, Mb01ProductMetadata> = ({[\s\S]*});\n$/);
assert.ok(metadataMatch, "Generated MB01 product metadata was not found.");
const metadata = JSON.parse(metadataMatch[1]) as Record<string, Pick<ProductDetail, "description" | "productHighlights" | "specifications">>;

const materialText = JSON.stringify({ products, metadata });
assert.doesNotMatch(materialText, /MDF\s*\/\s*Plywood/i, "Catalog contains an ambiguous mixed MDF/plywood material.");
assert.doesNotMatch(materialText, /Plywood\s*\/\s*MDF/i, "Catalog contains an ambiguous mixed plywood/MDF material.");

const kitchenFixture = products.find((product) => product.category === "Kitchen Cabinets");
assert.ok(kitchenFixture, "A kitchen cabinet PVC fixture is required.");
const pvcFixture = {
  ...kitchenFixture,
  ...metadata[kitchenFixture.id],
  colorName: "PVC white",
  finish: "PVC white",
  description: "Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style"
} as ProductDetail;
const localizedPvcFixture = localizeProduct(pvcFixture, "fr-CA");
const englishPvcFixtureText = JSON.stringify(pvcFixture);
const frenchPvcFixtureText = JSON.stringify({
  description: localizedPvcFixture.description,
  productHighlights: localizedPvcFixture.productHighlights,
  specificationValues: Object.values(localizedPvcFixture.specifications)
});
assert.match(englishPvcFixtureText, /MDF with PVC Matte Soft-Touch Finish Shaker Style/);
assert.match(frenchPvcFixtureText, /caisson en contreplaqué|contreplaqué de (?:¾|0,75) po/);
assert.match(frenchPvcFixtureText, /porte en MDF/i);
assert.match(frenchPvcFixtureText, /fini en PVC mat doux au toucher/i);
assert.doesNotMatch(frenchPvcFixtureText, /Carcass|MDF door|PVC Matte Soft-Touch Finish|\bwith\b/i);
assert.equal(localizedPvcFixture.colorName, "PVC blanc");
assert.equal(localizedPvcFixture.finish, "PVC blanc");
assert.equal(localizedPvcFixture.sku, pvcFixture.sku, "Finish localization must preserve the SKU mapping.");

const vanity = products.find((product) =>
  product.category === "Bathroom Vanities" && (product.finishOptions?.length ?? 0) > 2
);
assert.ok(vanity?.finishOptions, "A multi-configuration vanity fixture is required.");
const englishOptions = presentProductFinishOptions(vanity.finishOptions, "en-CA");
const frenchVanity = localizeProduct(vanity, "fr-CA");
const frenchOptions = presentProductFinishOptions(frenchVanity.finishOptions ?? [], "fr-CA");
assert.deepEqual(
  frenchOptions.map(({ option, colorName, configuration }) => [option.sku, colorName, configuration]),
  englishOptions.map(({ option, configuration }, index) => [option.sku, frenchOptions[index].colorName, configuration]),
  "French display translation changed stable vanity SKU/configuration grouping."
);
assert.equal(new Set(englishOptions.map(({ colorName }) => colorName)).size, 2);
assert.deepEqual(new Set(englishOptions.map(({ configuration }) => configuration)), new Set(["cabinet-only", "with-top"]));
assert.deepEqual(new Set(frenchOptions.map(({ configurationLabel }) => configurationLabel)), new Set(["Meuble-lavabo", "Meuble-lavabo + comptoir"]));
assert.deepEqual(
  new Set(frenchOptions.filter(({ configuration }) => configuration === "cabinet-only").map(({ option }) => option.name)),
  new Set(["Blanc, sans comptoir", "Gris pâle, sans comptoir"])
);
const frenchVanityOptionText = JSON.stringify(frenchOptions.map(({ option }) => option.name));
assert.doesNotMatch(
  frenchVanityOptionText,
  /\bwith\b/i,
  "French vanity option labels must not contain mixed English copy."
);
assert.doesNotMatch(
  frenchVanityOptionText,
  /caisson seulement/i,
  "Cabinet-only vanity labels must use customer-facing vanity/countertop terminology."
);
const initial = englishOptions.find(({ configuration }) => configuration === "with-top");
assert.ok(initial, "A with-top vanity fixture is required.");
const alternateColor = englishOptions.find(({ colorName }) => colorName !== initial.colorName)?.colorName;
assert.ok(alternateColor, "A second vanity color fixture is required.");
assert.equal(
  findProductFinishOption(englishOptions, alternateColor, initial.configuration)?.configuration,
  "with-top",
  "Changing vanity color must retain the selected configuration."
);
assert.equal(
  findProductFinishOption(englishOptions, initial.colorName, "cabinet-only")?.colorName,
  initial.colorName,
  "Changing vanity configuration must retain the selected color."
);
for (const option of vanity.finishOptions) {
  assert.ok(option.sku, "Every vanity variant must retain a SKU.");
  assert.ok(option.manufacturerPartNumber, `Vanity ${option.sku} must retain a model number.`);
  assert.ok(option.colorName, `Vanity ${option.sku} must expose a stable color property.`);
  assert.ok(option.configuration, `Vanity ${option.sku} must expose a stable configuration code.`);
}

const expectedTrimDimensions = new Map([
  ["033516222", "H3-½\" × W ½\" × 10ft"],
  ["033918222", "H4-½\" × W ½\" × 10ft"],
  ["034114222", "H2-½\" × W ½\" × 10ft"],
  ["034910320", "H4-9⁄16\" × W 11⁄16\" × 7ft"]
]);
for (const [sku, dimensions] of expectedTrimDimensions) {
  const product = products.find((candidate) => candidate.sku === sku);
  assert.ok(product, `Missing trim product ${sku}.`);
  assert.equal(product.dimensions, dimensions, `${sku} must use its real source dimensions.`);
  assert.notEqual(product.dimensions, "See product specifications");
  assert.match(formatDisplayMeasurement(product.dimensions, "en-CA"), /\b(?:7|10) ft\b/);
  assert.match(product.manufacturerPartNumber ?? "", /\/(?:ea)$/, "Source MPN must remain immutable, including /ea.");
  const localized = localizeProduct(product, "fr-CA");
  assert.equal(localized.manufacturerPartNumber, product.manufacturerPartNumber, "French display projection must preserve the source MPN.");
  assert.doesNotMatch(formatDisplayMeasurement(localized.dimensions, "fr-CA"), /H\d|W\s|[¼½¾⁄／*＊★☆]|\(H × L\)H/);
  assert.match(formatDisplayMeasurement(localized.dimensions, "fr-CA"), /po \(H\) × .*po \(L\) × (?:7|10) pi/);
  assert.equal(product.unit, "each");
}
assert.match(formatUnitPrice({ amount: 18.5, currency: "CAD" }, "each", "en-CA"), /\/ea$/);
assert.match(formatUnitPrice({ amount: 18.5, currency: "CAD" }, "each", "fr-CA"), /l’unité$/);
assert.equal(localizeProductTaxonomyLabel("Casing", "fr-CA"), "Moulure de cadrage");

const handles = products.filter((product) => product.category === "Handle series");
assert.ok(handles.length > 0, "Handle fixtures are required.");
for (const handle of handles) {
  const localized = localizeProduct({ ...handle, ...metadata[handle.id] } as ProductDetail, "fr-CA");
  const text = JSON.stringify(localized);
  assert.match(text, /Alliage d’aluminium/);
  assert.match(text, /Entraxe/);
  assert.match(text, /Longueur hors tout/);
  assert.match(text, /Saillie/);
  assert.match(text, /Largeur de la poignée/);
  assert.match(text, /Épaisseur de la poignée/);
  assert.doesNotMatch(localized.name, /\s{2,}/, "Localized handle names must not contain doubled spaces.");
  const questions = JSON.stringify(createFrCaDefaultQuestions(localized));
  assert.match(questions, /la poignée « [^»]+ »/);
  assert.doesNotMatch(questions, /(?:pour|de|avec) Poignée\b/);
}

assert.equal(
  localizeSpecificationRows([["Fulfillment", "Pickup"]], "fr-CA", "Handle series")[0][0],
  "Préparation de la commande"
);
assert.equal(
  localizeSpecificationRows([["Fulfillment", "Pickup"]], "fr-CA", "Kitchen Cabinets")[0][0],
  "Mode de réception"
);

const faqFixture = {
  ...frenchVanity,
  description: "",
  specifications: {},
  questions: undefined
};
const cabinetOnlyOption = englishOptions.find(({ configuration }) => configuration === "cabinet-only")?.option;
const withTopOption = englishOptions.find(({ configuration }) => configuration === "with-top")?.option;
assert.ok(cabinetOnlyOption && withTopOption, "Both vanity configurations are required for FAQ verification.");
const viewModelSource = readFileSync(new URL("../src/lib/product/product-detail-view-model.ts", import.meta.url), "utf8");
assert.match(viewModelSource, /the vanity cabinet only; a countertop is not included/i);
assert.match(viewModelSource, /the vanity cabinet and countertop/i);
const vanityDetail = { ...vanity, ...metadata[vanity.id] } as ProductDetail;
const productForOption = (option: typeof cabinetOnlyOption) => ({
  ...vanityDetail,
  sku: option.sku,
  manufacturerPartNumber: option.manufacturerPartNumber ?? vanityDetail.manufacturerPartNumber,
  name: vanityDetail.name,
  finish: option.name,
  colorName: option.colorName ?? option.name,
  description: option.description ?? vanityDetail.description,
  specifications: option.specifications ?? vanityDetail.specifications
});
const frenchCabinetOnlyFaq = JSON.stringify(createFrCaDefaultQuestions(localizeProduct(productForOption(cabinetOnlyOption), "fr-CA")));
const frenchWithTopFaq = JSON.stringify(createFrCaDefaultQuestions(localizeProduct(productForOption(withTopOption), "fr-CA")));
assert.match(frenchCabinetOnlyFaq, /meuble-lavabo seulement/i);
assert.match(frenchWithTopFaq, /meuble-lavabo et le comptoir/i);
assert.doesNotMatch(`${frenchCabinetOnlyFaq}${frenchWithTopFaq}`, /\b(?:cabinet|armoire)\b/i);
const faqText = JSON.stringify(createFrCaDefaultQuestions(faqFixture));
assert.doesNotMatch(faqText, /\b(?:il|elle|son|sa|ses)\b(?=\s+(?:produit|article|meuble|armoire|poignée))/i, "Default French FAQ templates must remain gender-neutral.");
assert.match(faqText, /produit « [^»]+ »/, "Default French FAQ templates must quote the product naturally.");
assert.doesNotMatch(faqText, /"answer":"Meuble-lavabo[^.]+comprend le meuble-lavabo/i, "Vanity FAQ copy must not repeat meuble-lavabo as the sentence subject and object.");

const trimSource = products.find((product) => product.sku === "033516222")!;
const trimDetail = { ...trimSource, ...metadata[trimSource.id] } as ProductDetail;
const identifierFixture = {
  ...trimDetail,
  manufacturerPartNumber: "VS35-10FT /ea",
  specifications: {
    ...trimDetail.specifications,
    "Manufacturer Part #": "VS35-10FT /ea",
    "Item #": "ITEM-10FT-35",
    "Option name": "VS35-10FT",
    SKU: "033516222",
    UGS: "033516222-FR",
    "Source product ID": "trim-10FT-222",
    "Supplier source ID": "source-10FT-35",
    "External catalog identifier": "catalog-10FT-35",
    Finish: "Putty White (Sanded, Paint-Ready)"
  }
};
const categoryIdentitySnapshot = products.map(({ id, sku, slug, category, subCategory }) => ({ id, sku, slug, category, subCategory }));
const localizedIdentitySnapshot = products.map((product) => {
  const localized = localizeProduct(product, "fr-CA");
  return { id: localized.id, sku: localized.sku, slug: localized.slug, category: localized.category, subCategory: localized.subCategory };
});
assert.deepEqual(
  localizedIdentitySnapshot,
  categoryIdentitySnapshot,
  "fr-CA localization must not mutate canonical product identity or taxonomy keys."
);
const catalogConfigSource = readFileSync(new URL("../src/lib/product/catalog-config.ts", import.meta.url), "utf8");
assert.match(catalogConfigSource, /id: "baseboards"/, "Legacy baseboards category key must remain stable.");
assert.match(catalogConfigSource, /id: "baseboard-casing"/, "Legacy combined trim subcategory key must remain stable.");
assert.match(catalogConfigSource, /baseboards:\s*\{\s*label: "Moulures et plinthes"/, "Legacy baseboards key requires a French display mapping.");
assert.match(catalogConfigSource, /"baseboard-casing": "Plinthes et (?:cadrages|moulures de cadrage)"/, "Legacy combined trim key requires a French display mapping.");

const maliciousIdentifierOverrides = {
  "Manufacturer Part #": "OVERRIDDEN-MPN",
  "Item #": "OVERRIDDEN-ITEM",
  "Option name": "Nom traduit incorrect",
  SKU: "OVERRIDDEN-SKU",
  UGS: "UGS-REMPLACÉE",
  "Source product ID": "overridden-product-id",
  "Supplier source ID": "overridden-source-id",
  "External catalog identifier": "overridden-catalog-identifier",
  Finish: "Fini localisé autorisé"
};
const localizedSpecificationsWithOverrides = localizeSpecifications(
  identifierFixture.specifications,
  maliciousIdentifierOverrides
);
for (const label of [
  "Manufacturer Part #",
  "Item #",
  "Option name",
  "SKU",
  "UGS",
  "Source product ID",
  "Supplier source ID",
  "External catalog identifier"
]) {
  assert.equal(
    localizedSpecificationsWithOverrides[label],
    identifierFixture.specifications[label],
    `${label} must preserve its exact source value before localization overlays are applied.`
  );
}
assert.equal(
  localizedSpecificationsWithOverrides.Finish,
  "Fini localisé autorisé",
  "Non-identifier specification overlays must still apply."
);

const localizedTrim = localizeProduct(identifierFixture, "fr-CA");
assert.equal(localizedTrim.sku, "033516222", "UGS localization must not alter the SKU value.");
assert.equal(localizedTrim.manufacturerPartNumber, "VS35-10FT /ea", "Top-level MPN must remain immutable.");
for (const [label, expectedValue] of Object.entries(identifierFixture.specifications).filter(([label]) =>
  ["Manufacturer Part #", "Item #", "Option name", "SKU", "UGS", "Source product ID", "Supplier source ID"].includes(label)
)) {
  assert.equal(localizedTrim.specifications[label], expectedValue, `${label} identifier value must remain byte-for-byte exact.`);
  assert.doesNotMatch(localizedTrim.specifications[label], /10 pi/, `${label} must never translate 10FT into 10 pi.`);
}
const localizedTrimRows = localizeSpecificationRows(
  Object.entries(localizedTrim.specifications),
  "fr-CA",
  `${localizedTrim.category} ${localizedTrim.subCategory ?? ""}`
);
for (const [sourceLabel, expectedValue] of Object.entries(identifierFixture.specifications).filter(([label]) =>
  ["Manufacturer Part #", "Item #", "SKU", "Source product ID", "Supplier source ID"].includes(label)
)) {
  const localizedLabel = localizeSpecificationRows([[sourceLabel, expectedValue]], "fr-CA")[0][0];
  assert.equal(localizedTrimRows.find(([label]) => label === localizedLabel)?.[1], expectedValue, `Built row ${localizedLabel} changed its identifier value.`);
}
assert.equal(
  localizedTrimRows.find(([label]) => label === "N° de pièce du fabricant")?.[1],
  "VS35-10FT /ea",
  "Representative French specification rows must preserve the MPN value."
);
assert.equal(
  formatDisplayMeasurement(localizedTrim.dimensions, "fr-CA"),
  `3,5 po (H) × 0,5 po (L) × 10 pi`,
  "Representative French trim output must use natural suffix dimensions."
);
const selectedTrim = resolveProductVariant({
  ...identifierFixture,
  finishOptions: [{ name: "Alternate", sku: "033516222-ALT", manufacturerPartNumber: "ALT-10FT" }]
}, "Alternate");
assert.equal(selectedTrim.sku, "033516222-ALT", "Selected variant must still expose its SKU.");
assert.equal(selectedTrim.manufacturerPartNumber, "VS35-10FT /ea", "Variant resolution must not replace the immutable top-level MPN.");
assert.match(localizedTrim.images[0].alt, /\bUGS 033516222\b/);
assert.equal(localizeSpecificationRows([["SKU", "033516222"]], "fr-CA")[0][0], "UGS");
for (const trim of products.filter((product) => expectedTrimDimensions.has(product.sku))) {
  const localized = localizeProduct({ ...trim, ...metadata[trim.id] } as ProductDetail, "fr-CA");
  const trimFaq = JSON.stringify(createFrCaDefaultQuestions(localized));
  assert.match(trimFaq, trim.subCategory === "Casing" ? /moulure de cadrage/i : /plinthe/i);
  assert.doesNotMatch(trimFaq, /comptoir|électroménager|fileur/i, "Trim FAQs must not mention unrelated product types.");
}

const frenchDtcFixture = localizeProduct({
  ...pvcFixture,
  description: "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
  productHighlights: ["Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"],
  specifications: { Hardware: "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides" }
}, "fr-CA");
const frenchDtcText = JSON.stringify(frenchDtcFixture);
assert.match(frenchDtcText, /charnières DTC/i);
assert.doesNotMatch(frenchDtcText, /DTC charnières/i);

const identifierSource = readFileSync(new URL("../src/components/product/ProductVariantIdentifiers.tsx", import.meta.url), "utf8");
assert.match(identifierSource, /Nº de pièce du fabricant/);
assert.doesNotMatch(identifierSource, /Modèle \(MPN\)/);

const homeSource = readFileSync(new URL("../src/components/home/HomePageFr.tsx", import.meta.url), "utf8");
assert.match(homeSource, /text: "Meubles-lavabos[^"\n]*rangement[^"\n]*salle de bains"/);
assert.doesNotMatch(homeSource, /Armoires de vanité/);

const dashboardCopySource = readFileSync(new URL("../src/lib/i18n/dashboard-copy.ts", import.meta.url), "utf8");
assert.doesNotMatch(dashboardCopySource, /\bP1a?\b|\bP3\b|being completed|intentionally thin|pendant la réalisation/i);

const legalSource = readFileSync(new URL("../src/content/legalPages.ts", import.meta.url), "utf8");
assert.match(legalSource, /Façon dont sont traitées les commandes de produits/);
const legalTemplateSource = readFileSync(new URL("../src/components/legal/LegalPageTemplate.tsx", import.meta.url), "utf8");
assert.match(legalTemplateSource, /entry\.secondaryCta\.label/);
const checkoutSource = readFileSync(new URL("../src/lib/i18n/commerce-copy.ts", import.meta.url), "utf8");
assert.match(checkoutSource, /Review and place order/);
assert.match(checkoutSource, /Vérifier et passer la commande/);
const frenchHomeRouteSource = readFileSync(new URL("../src/app/fr/page.tsx", import.meta.url), "utf8");
assert.match(frenchHomeRouteSource, /getHomePageData\("fr-CA"\)/);
assert.doesNotMatch(homeSource, /localizeProducts/);

console.log(JSON.stringify({
  productsChecked: products.length,
  vanityVariantsChecked: vanity.finishOptions.length,
  trimProductsChecked: expectedTrimDimensions.size,
  handlesChecked: handles.length
}, null, 2));
