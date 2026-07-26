import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ProductSummary } from "../src/lib/api/api-contract.ts";
import { formatDisplayMeasurement } from "../src/lib/i18n/display-format.ts";
import {
  FR_CA_CATEGORY_LABELS,
  FR_CA_SUBCATEGORY_LABELS,
  localizeProduct,
  localizeProductTaxonomyLabel
} from "../src/lib/product/product-localization.ts";

const generatedPath = new URL("../src/lib/data/mb01-products.ts", import.meta.url);
const source = readFileSync(generatedPath, "utf8");
const marker = "const localizedProducts: ProductSummary[] = ";
const start = source.indexOf(marker) + marker.length;
const end = source.indexOf("\n];", start) + 2;
assert.ok(start >= marker.length && end > start, "Generated MB01 product array was not found.");
const products = JSON.parse(source.slice(start, end)) as ProductSummary[];

const preserved = [
  "id",
  "slug",
  "sku",
  "manufacturerPartNumber",
  "price",
  "commerce",
  "availability",
  "dealerStock",
  "inStock"
] as const;

const untranslatedNames: Array<{ id: string; sku: string; name: string }> = [];
let variants = 0;
let translatedNames = 0;
let translatedFinishNames = 0;

for (const product of products) {
  const localized = localizeProduct(product, "fr-CA");
  assert.notStrictEqual(localized, product, `${product.id} must resolve to a new French projection.`);
  for (const field of preserved) {
    assert.deepEqual(localized[field], product[field], `${product.id} changed invariant field ${field}.`);
  }
  assert.deepEqual(
    localized.images.map(({ url }) => url),
    product.images.map(({ url }) => url),
    `${product.id} changed product image URLs or gallery order.`
  );
  assert.equal(localized.category, product.category, `${product.id} changed canonical category key.`);
  assert.equal(localized.subCategory, product.subCategory, `${product.id} changed canonical subcategory key.`);
  assert.equal(
    localized.dimensions,
    product.dimensions === "See product specifications"
      ? "Voir les spécifications du produit"
      : formatDisplayMeasurement(product.dimensions, "fr-CA"),
    `${product.id} did not localize product dimensions deterministically.`
  );

  if (localized.name !== product.name) translatedNames += 1;
  else untranslatedNames.push({ id: product.id, sku: product.sku, name: product.name });

  for (const [index, option] of (product.finishOptions ?? []).entries()) {
    variants += 1;
    const localizedOption = localized.finishOptions?.[index];
    assert.ok(localizedOption, `${product.id} lost finish option ${index}.`);
    assert.equal(localizedOption.sku, option.sku, `${product.id} changed variant SKU.`);
    assert.equal(localizedOption.manufacturerPartNumber, option.manufacturerPartNumber, `${product.id} changed variant model.`);
    assert.deepEqual(localizedOption.price, option.price, `${product.id} changed variant price.`);
    assert.equal(
      localizedOption.dimensions,
      option.dimensions === "See product specifications"
        ? "Voir les spécifications du produit"
        : option.dimensions ? formatDisplayMeasurement(option.dimensions, "fr-CA") : undefined,
      `${product.id} did not localize variant dimensions deterministically.`
    );
    assert.deepEqual(
      localizedOption.images?.map(({ url }) => url),
      option.images?.map(({ url }) => url),
      `${product.id} changed variant image URLs or gallery order.`
    );
    if (localizedOption.name !== option.name) translatedFinishNames += 1;
  }
}

for (const key of Object.keys(FR_CA_CATEGORY_LABELS)) {
  assert.notEqual(localizeProductTaxonomyLabel(key, "fr-CA"), key, `Missing category translation: ${key}`);
}
for (const key of Object.keys(FR_CA_SUBCATEGORY_LABELS)) {
  assert.notEqual(localizeProductTaxonomyLabel(key, "fr-CA"), key, `Missing subcategory translation: ${key}`);
}

assert.equal(products.length, 140, "Catalog count changed; review localization coverage before reporting it.");
assert.equal(variants, 294, "Finish-option count changed; review invariant coverage before reporting it.");

console.log(JSON.stringify({
  parentsChecked: products.length,
  variantsChecked: variants,
  translatedParentNames: translatedNames,
  productSpecificEnglishNameFallbacks: untranslatedNames,
  translatedFinishOptionNames: translatedFinishNames,
  categoryLabelsCovered: Object.keys(FR_CA_CATEGORY_LABELS).length,
  subcategoryLabelsCovered: Object.keys(FR_CA_SUBCATEGORY_LABELS).length,
  invariantFieldsChecked: [...preserved, "category key", "subcategory key", "image URL", "gallery order"]
}, null, 2));
