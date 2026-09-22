import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import type { ProductSummary } from "../api/api-contract.ts";

// catalog-config.ts resolves @/lib/* through tsconfig paths only when Next
// compiles it; map the same aliases here so the module graph loads under Node.
const srcRoot = new URL("../../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let url = new URL(specifier.slice(2), srcRoot).href;
      if (!/\.(ts|js|mjs|cjs|json)$/.test(url)) url += ".ts";
      return { url, shortCircuit: true };
    }
    if (specifier.startsWith(".") && !/\.(ts|js|mjs|cjs|json)$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".json")) return nextLoad(url, context);
    return { format: "json", source: readFileSync(new URL(url), "utf8"), shortCircuit: true };
  }
});

// Dynamic import is required: the alias hooks above must be installed before
// catalog-config.ts (and its @/lib transitive imports) are resolved.
const catalogModule = import("./catalog-config.ts");

type CatalogCategoryOption = {
  id: string;
  slug: string;
  label: string;
  shortLabel: string;
  description: string | null;
};

function apiCategory(overrides: Partial<CatalogCategoryOption>): CatalogCategoryOption {
  return {
    id: "cat-1",
    slug: "baseboards-and-mouldings",
    label: "Baseboards & Mouldings",
    shortLabel: "Baseboards & Mouldings",
    description: null,
    ...overrides
  };
}

function productWith(category: string, categorySlug?: string): Pick<ProductSummary, "category" | "categorySlug"> {
  return { category, categorySlug };
}

test("matching uses the canonical category slug as the business key", async () => {
  const { matchesCatalogCategory } = await catalogModule;
  const category = apiCategory({});

  assert.equal(
    matchesCatalogCategory(productWith("Baseboards & Mouldings", "baseboards-and-mouldings"), category),
    true,
    "product categorySlug equals the category slug"
  );
  assert.equal(
    matchesCatalogCategory(productWith("Baseboards & Mouldings", "baseboards"), category),
    false,
    "a different slug never matches, even with the same display name"
  );
  assert.equal(
    matchesCatalogCategory(productWith("Kitchen Cabinets", "kitchen-cabinets"), category),
    false,
    "display text is not a business key"
  );
});

test("the all pseudo-category matches every product", async () => {
  const { matchesCatalogCategory } = await catalogModule;
  const all = apiCategory({ slug: "all", label: "All products" });

  assert.equal(matchesCatalogCategory(productWith("Anything", "anything"), all), true);
  assert.equal(matchesCatalogCategory(productWith("Anything"), all), true);
});

test("fixture products without a slug fall back to canonical and localized labels", async () => {
  const { matchesCatalogCategory } = await catalogModule;
  const category = apiCategory({ label: "Kitchen Cabinets" });

  assert.equal(
    matchesCatalogCategory(productWith("Kitchen Cabinets"), category),
    true,
    "canonical English label matches fixture products"
  );
  assert.equal(
    matchesCatalogCategory(productWith("Armoires de cuisine"), category, "fr-CA"),
    true,
    "the French display label matches fixture products on fr-CA"
  );
  assert.equal(
    matchesCatalogCategory(productWith("Armoires de cuisine"), category, "en-CA"),
    false,
    "French fixture labels only match on the French locale"
  );
});

test("fallback category options mirror production slugs and localize display copy only", async () => {
  const { FALLBACK_CATEGORY_OPTIONS: fallbackOptions, getFallbackCatalogCategoryOptions } = await catalogModule;
  const slugs = fallbackOptions.map((option: CatalogCategoryOption) => option.slug);
  assert.deepEqual(
    slugs,
    ["kitchen-cabinets", "bathroom-vanities", "baseboards-and-mouldings", "handle-series"],
    "fallback slugs follow storefront order (no dead 'baseboards' slug)"
  );

  const french = getFallbackCatalogCategoryOptions("fr-CA");
  assert.equal(french[0].label, "Armoires de cuisine");
  assert.equal(french[0].slug, "kitchen-cabinets", "localization never changes the matching key");
  assert.equal(french[3].label, "Collection de poignées");
  assert.equal(fallbackOptions[3].label, "Handle Series");
});

test("French API category localization replaces known copy and omits unknown English descriptions", async () => {
  const { localizeCatalogCategoryOption } = await catalogModule;
  const known = localizeCatalogCategoryOption(
    apiCategory({
      slug: "kitchen-cabinets",
      label: "Kitchen Cabinets",
      description: "Ready-to-order cabinet boxes and accessories."
    }),
    "fr-CA"
  );
  assert.equal(known.label, "Armoires de cuisine");
  assert.equal(known.description, "Armoires de base, murales et hautes");

  const unknown = localizeCatalogCategoryOption(
    apiCategory({ slug: "new-category", label: "New Category", description: "English marketing copy." }),
    "fr-CA"
  );
  assert.equal(unknown.label, "New Category");
  assert.equal(unknown.description, null);
});

type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string;
};

test("C1: an active category with zero products projects into the storefront list", async () => {
  const { toCatalogCategoryOptions } = await catalogModule;
  const book: CategorySummary = { id: "cat-book", slug: "book", name: "Book" };

  const options = toCatalogCategoryOptions([book]);

  assert.equal(options.length, 1, "an empty-but-active category is not hidden");
  assert.equal(options[0].id, "cat-book");
  assert.equal(options[0].slug, "book");
  assert.equal(options[0].label, "Book");
  assert.equal(options[0].shortLabel, "Book");
  assert.equal(options[0].description, null);
});

test("C2: the demo-seed category is excluded from the storefront projection", async () => {
  const { toCatalogCategoryOptions, isSeedFixtureCategory } = await catalogModule;

  assert.equal(isSeedFixtureCategory("seed-cat-prod"), true);
  assert.equal(isSeedFixtureCategory("book"), false);

  const mixed: CategorySummary[] = [
    { id: "cat-seed", slug: "seed-cat-prod", name: "Seed Category prod" },
    { id: "cat-book", slug: "book", name: "Book" }
  ];
  const options = toCatalogCategoryOptions(mixed);

  assert.deepEqual(
    options.map((option: CatalogCategoryOption) => option.slug),
    ["book"],
    "the seed row is the only row dropped; a legitimate 'seed-' prefixed slug is untouched"
  );
});

test("C1/C3: the projection preserves order and identity across revalidation (no product dependency)", async () => {
  const { toCatalogCategoryOptions } = await catalogModule;
  const first: CategorySummary = { id: "cat-1", slug: "kitchen-cabinets", name: "Kitchen Cabinets" };
  const second: CategorySummary = { id: "cat-book", slug: "book", name: "Book" };

  const before = toCatalogCategoryOptions([first, second]);
  const after = toCatalogCategoryOptions([first, second]);

  assert.deepEqual(
    before.map((option: CatalogCategoryOption) => option.slug),
    ["kitchen-cabinets", "book"],
    "known storefront slugs stay first; unknown slugs follow"
  );
  assert.deepEqual(after, before, "same payload projects identically (stable identity across revalidation)");
});

test("descendant matching: kitchen-cabinets parent slug also matches its four child categorySlugs", async () => {
  const { matchesCatalogCategory } = await catalogModule;
  const kitchenParent = apiCategory({ slug: "kitchen-cabinets", label: "Kitchen Cabinets" });

  assert.equal(
    matchesCatalogCategory(productWith("Base Cabinets", "base-cabinets"), kitchenParent),
    true,
    "a product filed under the base-cabinets child still matches the kitchen-cabinets parent"
  );
  assert.equal(
    matchesCatalogCategory(productWith("Wall Cabinets", "wall-cabinets"), kitchenParent),
    true
  );
  assert.equal(
    matchesCatalogCategory(productWith("Tall Cabinets", "tall-cabinets"), kitchenParent),
    true
  );
  assert.equal(
    matchesCatalogCategory(productWith("Accessories", "cabinet-accessories"), kitchenParent),
    true
  );
  assert.equal(
    matchesCatalogCategory(productWith("Bathroom Vanities", "bathroom-vanities"), kitchenParent),
    false,
    "an unrelated slug still does not match the kitchen-cabinets parent"
  );

  const baseChild = apiCategory({ slug: "base-cabinets", label: "Base Cabinets" });
  assert.equal(
    matchesCatalogCategory(productWith("Wall Cabinets", "wall-cabinets"), baseChild),
    false,
    "child categories only exact-match their own slug, no sibling/descendant matching"
  );
});

test("toCatalogCategoryOptions excludes categories with a parentId (nav/home/footer stay parent-only)", async () => {
  const { toCatalogCategoryOptions } = await catalogModule;
  const rows: CategorySummary[] = [
    { id: "parent", slug: "kitchen-cabinets", name: "Kitchen Cabinets" },
    { id: "child-1", slug: "base-cabinets", name: "Base Cabinets", parentId: "parent" },
    { id: "child-2", slug: "wall-cabinets", name: "Wall Cabinets", parentId: "parent" }
  ];

  const options = toCatalogCategoryOptions(rows);

  assert.deepEqual(
    options.map((option: CatalogCategoryOption) => option.slug),
    ["kitchen-cabinets"],
    "child rows (parentId set) are excluded from the parent-only projection"
  );
});

test("toCatalogFilterableCategoryOptions keeps parents AND children (list-page matching set)", async () => {
  const { toCatalogFilterableCategoryOptions } = await catalogModule;
  const rows: CategorySummary[] = [
    { id: "parent", slug: "kitchen-cabinets", name: "Kitchen Cabinets" },
    { id: "child-1", slug: "base-cabinets", name: "Base Cabinets", parentId: "parent" },
    { id: "child-2", slug: "wall-cabinets", name: "Wall Cabinets", parentId: "parent" },
    { id: "seed", slug: "seed-cat-prod", name: "Seed Category prod" }
  ];

  const options = toCatalogFilterableCategoryOptions(rows);

  assert.deepEqual(
    options.map((option: CatalogCategoryOption) => option.slug).sort(),
    ["base-cabinets", "kitchen-cabinets", "wall-cabinets"].sort(),
    "children are kept (unlike toCatalogCategoryOptions) and the seed row is still excluded"
  );
});

test("storefront category projection uses Kitchen → Vanity → Baseboard → Handle order", async () => {
  const { toCatalogCategoryOptions } = await catalogModule;
  const options = toCatalogCategoryOptions([
    { id: "4", slug: "handle-series", name: "Handle series" },
    { id: "1", slug: "kitchen-cabinets", name: "Kitchen Cabinets" },
    { id: "3", slug: "baseboards-and-mouldings", name: "Baseboards & Mouldings" },
    { id: "2", slug: "bathroom-vanities", name: "Bathroom Vanities" }
  ]);
  assert.deepEqual(
    options.map((option: CatalogCategoryOption) => option.slug),
    ["kitchen-cabinets", "bathroom-vanities", "baseboards-and-mouldings", "handle-series"]
  );
  assert.equal(options[3].label, "Handle Series");
});

type SearchableProduct = Pick<
  ProductSummary,
  | "name"
  | "sku"
  | "manufacturerPartNumber"
  | "category"
  | "subCategory"
  | "dimensions"
  | "finish"
  | "colorName"
  | "finishOptions"
  | "variantSkus"
>;

function searchableProduct(overrides: Partial<SearchableProduct> = {}): SearchableProduct {
  return {
    name: "Vanity Cabinet V3021",
    sku: "V3021STDL",
    category: "Bathroom Vanities",
    dimensions: "30 in W",
    ...overrides
  };
}

test("catalog query matches a product by any of its variant SKU codes", async () => {
  const { matchesCatalogQuery } = await catalogModule;
  const product = searchableProduct({
    variantSkus: [
      { skuCode: "023021313", manufacturerPartNumber: "V3021STDL-PWMS-LG-TOP" },
      { skuCode: "060102411" }
    ]
  });

  assert.equal(matchesCatalogQuery(product, "023021313"), true, "variant skuCode hits the parent product");
  assert.equal(matchesCatalogQuery(product, "060102411"), true, "variant without a part number still hits by skuCode");
  assert.equal(matchesCatalogQuery(product, "023021399"), false, "unknown variant code never hits");
});

test("catalog query matches variant manufacturer part numbers case-insensitively", async () => {
  const { matchesCatalogQuery } = await catalogModule;
  const product = searchableProduct({
    variantSkus: [{ skuCode: "023021313", manufacturerPartNumber: "V3021STDL-PWMS-LG-TOP" }]
  });

  assert.equal(matchesCatalogQuery(product, "v3021stdl-pwms-lg-top"), true, "normalized query hits the stored part number");
  assert.equal(matchesCatalogQuery(product, "pwms-lg"), true, "partial part number hits");
});

test("catalog query keeps name, primary sku and manufacturer part number searchable", async () => {
  const { matchesCatalogQuery } = await catalogModule;
  const product = searchableProduct({ manufacturerPartNumber: "VS-V3021STDL" });

  assert.equal(matchesCatalogQuery(product, ""), true, "empty query matches every product");
  assert.equal(matchesCatalogQuery(product, "vanity"), true, "name keyword hits");
  assert.equal(matchesCatalogQuery(product, "v3021stdl"), true, "primary sku hits");
  assert.equal(matchesCatalogQuery(product, "vs-v3021stdl"), true, "product manufacturerPartNumber hits");
  assert.equal(matchesCatalogQuery(product, "unrelated-term"), false, "non-matching query is rejected");
});

test("catalog query is null-safe when variant fields are absent or null", async () => {
  const { matchesCatalogQuery } = await catalogModule;
  const product = searchableProduct({
    variantSkus: [{ skuCode: "023021313", manufacturerPartNumber: null }]
  });

  assert.equal(matchesCatalogQuery(product, "023021313"), true, "null manufacturerPartNumber is skipped safely");
  assert.equal(
    matchesCatalogQuery(searchableProduct(), "anything"),
    false,
    "missing variantSkus contributes nothing to the haystack"
  );
});
