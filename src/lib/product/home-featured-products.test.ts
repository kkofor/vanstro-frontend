import assert from "node:assert/strict";
import test from "node:test";
import type { ProductSummary } from "../api/api-contract.ts";
import {
  HOME_FEATURED_SKUS,
  selectHomeFeaturedProducts
} from "./home-featured-products.ts";

function product(sku: string, category: string, subCategory?: string): ProductSummary {
  return {
    id: sku,
    slug: sku,
    sku,
    name: sku,
    category,
    subCategory,
    price: { amount: 1, currency: "CAD" },
    unit: "each",
    dimensions: "",
    images: [{ url: "/product.jpg", alt: sku }],
    inStock: true
  };
}

test("homepage featured products are eight representative cabinets and vanities", () => {
  const representative = HOME_FEATURED_SKUS.map((sku, index) => product(
    sku,
    index < 6 ? "Kitchen Cabinets" : "Bathroom Vanities",
    index < 6 ? "Cabinet" : "Bathroom Vanities"
  ));
  const catalog = [
    product("060101111", "Handle series"),
    product("034114222", "Baseboards & Mouldings", "Baseboard"),
    product("018810742", "Kitchen Cabinets", "Accessories"),
    ...[...representative].reverse()
  ];

  const selected = selectHomeFeaturedProducts(catalog);
  assert.deepEqual(selected.map(({ sku }) => sku), [...HOME_FEATURED_SKUS]);
  assert.equal(selected.length, 8);
  assert.ok(selected.every(({ category, subCategory }) =>
    category === "Bathroom Vanities" ||
    (category === "Kitchen Cabinets" && subCategory !== "Accessories")
  ));
});

test("homepage featured selection fails closed when a representative SKU is missing", () => {
  const incomplete = HOME_FEATURED_SKUS.slice(0, -1).map((sku) =>
    product(sku, "Kitchen Cabinets", "Base Cabinet")
  );
  assert.throws(
    () => selectHomeFeaturedProducts(incomplete),
    /featured catalog is incomplete/
  );
});
