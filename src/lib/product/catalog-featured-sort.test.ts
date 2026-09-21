import assert from "node:assert/strict";
import test from "node:test";
import type { ProductSummary } from "../api/api-contract.ts";
import { BATHROOM_VANITY_FEATURED_SKUS } from "./catalog-config.ts";
import { sortCatalogFeaturedProducts } from "./catalog-featured-sort.ts";

function product(input: Partial<ProductSummary> & Pick<ProductSummary, "sku" | "name" | "category">): ProductSummary {
  return {
    id: input.sku,
    slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${input.sku}`,
    price: { amount: 1, currency: "CAD" },
    unit: "each",
    dimensions: "",
    images: [{ url: "/product.jpg", alt: input.name }],
    inStock: true,
    ...input
  };
}

/**
 * Fixture-taxonomy products: display category + subCategory, no categorySlug.
 */
function fixtureProduct(
  sku: string,
  name: string,
  category: string,
  subCategory?: string
): ProductSummary {
  return product({ sku, name, category, subCategory });
}

/**
 * Live Website API-shape products: canonical categorySlug (the business key),
 * no subCategory. `slug` carries the canonical product slug used to recover
 * the vanity end panel's accessory family.
 */
function apiProduct(
  sku: string,
  name: string,
  category: string,
  categorySlug: string,
  slug: string
): ProductSummary {
  return product({ sku, name, category, categorySlug, slug });
}

test("featured sorting applies main-goods-first, accessories-last business priority", () => {
  const input = [
    product({ sku: "060102411", name: "Handle CTC-192mm", category: "Handle series" }),
    fixtureProduct("018810742", "Filler F342", "Kitchen Cabinets", "Accessories"),
    fixtureProduct("034910320", "Casing-049", "Baseboards & Mouldings", "Casing"),
    fixtureProduct("015010130", "Wall Cabinet W0930", "Kitchen Cabinets", "Wall Cabinet"),
    fixtureProduct("011710130", "Base Cabinet B12", "Kitchen Cabinets", "Base Cabinet"),
    fixtureProduct("022421011", "Vanity Cabinet VS24", "Bathroom Vanities", "Bathroom Vanities"),
    fixtureProduct("033516222", "Baseboard-035", "Baseboards & Mouldings", "Baseboard")
  ];

  assert.deepEqual(sortCatalogFeaturedProducts(input).map(({ sku }) => sku), [
    "011710130",
    "022421011",
    "015010130",
    "033516222",
    "034910320",
    "018810742",
    "060102411"
  ]);
  assert.deepEqual(input.map(({ sku }) => sku), [
    "060102411",
    "018810742",
    "034910320",
    "015010130",
    "011710130",
    "022421011",
    "033516222"
  ]);
});

test("featured sorting ranks main families Base, Vanity, Wall, Tall before accessories", () => {
  const input = [
    fixtureProduct("017580130", "Tall Cabinet U248424", "Kitchen Cabinets", "Tall Cabinet"),
    fixtureProduct("015010130", "Wall Cabinet W0930", "Kitchen Cabinets", "Wall Cabinet"),
    fixtureProduct("022421011", "Vanity Cabinet VS24", "Bathroom Vanities", "Bathroom Vanities"),
    fixtureProduct("011710130", "Base Cabinet B12", "Kitchen Cabinets", "Base Cabinet")
  ];

  assert.deepEqual(sortCatalogFeaturedProducts(input).map(({ sku }) => sku), [
    "011710130",
    "022421011",
    "015010130",
    "017580130"
  ]);
});

test("featured sorting is independent of API input order and uses natural SKU order", () => {
  const products = [
    fixtureProduct("sku-42", "Base Cabinet A", "Kitchen Cabinets", "Base Cabinet"),
    fixtureProduct("sku-9", "Base Cabinet Z", "Kitchen Cabinets", "Base Cabinet"),
    fixtureProduct("sku-12", "Base Cabinet M", "Kitchen Cabinets", "Base Cabinet")
  ];
  const expected = ["sku-9", "sku-12", "sku-42"];

  assert.deepEqual(sortCatalogFeaturedProducts(products).map(({ sku }) => sku), expected);
  assert.deepEqual(sortCatalogFeaturedProducts([...products].reverse()).map(({ sku }) => sku), expected);
});

test("featured sorting preserves the approved bathroom merchandising order", () => {
  const products = [...BATHROOM_VANITY_FEATURED_SKUS]
    .reverse()
    .map((sku) => fixtureProduct(sku, `Vanity ${sku}`, "Bathroom Vanities", "Bathroom Vanities"));

  assert.deepEqual(
    sortCatalogFeaturedProducts(products).map(({ sku }) => sku),
    [...BATHROOM_VANITY_FEATURED_SKUS]
  );
});

test("featured sorting ignores localized display fields and remains locale-independent", () => {
  const canonical = [
    fixtureProduct("011720130", "Base Cabinet B15", "Kitchen Cabinets", "Base Cabinet"),
    fixtureProduct("011710130", "Base Cabinet B12", "Kitchen Cabinets", "Base Cabinet")
  ];
  const localized = canonical.map((item) => ({
    ...item,
    name: item.sku === "011710130" ? "Armoire Z" : "Armoire A",
    dimensions: item.sku === "011710130" ? "12 po (L)" : "15 po (L)"
  }));

  assert.deepEqual(
    sortCatalogFeaturedProducts(canonical).map(({ sku }) => sku),
    sortCatalogFeaturedProducts(localized).map(({ sku }) => sku)
  );
});

test("featured sorting classifies the live Website API category-slug taxonomy", () => {
  // Live products carry only the canonical categorySlug; no subCategory is
  // present, so the previous category-only rank degenerated to raw SKU order.
  const input = [
    apiProduct("060102411", "Handle CTC-192mm", "Handle Series", "handle-series", "handle-ctc-192mm"),
    apiProduct("018810742", "Filler F342", "Accessories", "cabinet-accessories", "filler-f342"),
    apiProduct("033516222", "Baseboard-035", "Baseboards & Mouldings", "baseboards-and-mouldings", "baseboard-035"),
    apiProduct("017580130", "Tall Cabinet U248424", "Tall Cabinets", "tall-cabinets", "tall-cabinet-u248424"),
    apiProduct("015010130", "Wall Cabinet W0930", "Wall Cabinets", "wall-cabinets", "wall-cabinet-w0930"),
    apiProduct("011710130", "Base Cabinet B12", "Base Cabinets", "base-cabinets", "base-cabinet-b12"),
    apiProduct("022421011", "Vanity Cabinet VS24", "Bathroom Vanities", "bathroom-vanities", "vanity-cabinet-vs24")
  ];

  assert.deepEqual(sortCatalogFeaturedProducts(input).map(({ sku }) => sku), [
    "011710130",
    "022421011",
    "015010130",
    "017580130",
    "033516222",
    "018810742",
    "060102411"
  ]);
});

test("featured sorting sinks the vanity end panel with the other end panels", () => {
  // Live API: VEP2230 is taxonomically "Bathroom Vanities" but is an end
  // panel accessory; its canonical slug carries the same "-end-panel" marker
  // as the cabinet end panels, so it must sink below the main goods.
  const live = [
    apiProduct("018850942", "Vanity End Panel VEP2230", "Bathroom Vanities", "bathroom-vanities", "vanity-end-panel-vep2230-380"),
    apiProduct("015010130", "Wall Cabinet W0930", "Wall Cabinets", "wall-cabinets", "wall-cabinet-w0930"),
    apiProduct("022421011", "Vanity Cabinet VS24", "Bathroom Vanities", "bathroom-vanities", "vanity-cabinet-vs24"),
    apiProduct("018810742", "Filler F342", "Accessories", "cabinet-accessories", "filler-f342-373")
  ];
  assert.deepEqual(sortCatalogFeaturedProducts(live).map(({ sku }) => sku), [
    "022421011",
    "015010130",
    "018810742",
    "018850942"
  ]);

  // Fixture taxonomy: the same product carries Bathroom Vanities / Accessories.
  const fixture = [
    fixtureProduct("018850942", "Vanity End Panel VEP2230", "Bathroom Vanities", "Accessories"),
    fixtureProduct("022421011", "Vanity Cabinet VS24", "Bathroom Vanities", "Bathroom Vanities")
  ];
  assert.deepEqual(sortCatalogFeaturedProducts(fixture).map(({ sku }) => sku), [
    "022421011",
    "018850942"
  ]);
});

test("featured sorting places unknown groups last with stable SKU fallback", () => {
  const products = [
    product({ sku: "sku-20", name: "Unknown", category: "Other" }),
    product({ sku: "sku-3", name: "Unknown", category: "Other" }),
    fixtureProduct("base-1", "Base Cabinet B12", "Kitchen Cabinets", "Base Cabinet")
  ];

  assert.deepEqual(sortCatalogFeaturedProducts(products).map(({ sku }) => sku), [
    "base-1",
    "sku-3",
    "sku-20"
  ]);
});