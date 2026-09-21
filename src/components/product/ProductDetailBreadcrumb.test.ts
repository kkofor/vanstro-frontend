import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const breadcrumb = await readFile(new URL("./ProductDetailBreadcrumb.tsx", import.meta.url), "utf8");
const viewModel = await readFile(
  new URL("../../lib/product/product-detail-view-model.ts", import.meta.url),
  "utf8"
);

test("PDP breadcrumb links kitchen subcategories to their own catalog filter, never the whole kitchen-cabinets category", () => {
  // The subcategory crumb href must use the resolved child slug filter.
  assert.match(breadcrumb, /kitchenSubcategoryFilter/);
  assert.match(breadcrumb, /href: localeHref\(`\/products\?category=\$\{subcategoryFilter\}`/);
  // The parent crumb points at the kitchen-cabinets parent filter only.
  assert.match(breadcrumb, /href: localeHref\(`\/products\?category=\$\{KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG\}`/);
  // Subcategory identity is derived from categorySlug / category / subCategory,
  // so a product whose API category is the child slug ("base-cabinets") or a
  // display name ("Base Cabinet") still resolves to its own filter.
  assert.match(breadcrumb, /\$\{product\.categorySlug \?\? ""\} \$\{product\.category \?\? ""\} \$\{product\.subCategory \?\? ""\}/);
});

test("categoryToProductFilter maps kitchen subcategory slugs and display names to their child filters", () => {
  assert.match(viewModel, /return "base-cabinets";/);
  assert.match(viewModel, /return "wall-cabinets";/);
  assert.match(viewModel, /return "tall-cabinets";/);
  assert.match(viewModel, /return "cabinet-accessories";/);
  // Live Website API products ship the child slug as product.category, e.g.
  // "base-cabinets"; the fixture ships display names like "Base Cabinet".
  assert.match(viewModel, /normalizedCategory\.includes\("base-cabinet"\)/);
  assert.match(viewModel, /normalizedCategory\.includes\("base cabinet"\)/);
  assert.match(viewModel, /normalizedCategory\.includes\("wall cabinet"\)/);
  assert.match(viewModel, /normalizedCategory\.includes\("tall cabinet"\)/);
  // Non-kitchen fallbacks stay on their existing filters.
  assert.match(viewModel, /return "bathroom-vanities";/);
  assert.match(viewModel, /return "baseboards";/);
});