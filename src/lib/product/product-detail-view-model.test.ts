import assert from "node:assert/strict";
import test from "node:test";
import type { ProductDetail, ProductSummary } from "../api/api-contract.ts";
import { selectCompleteProjectProducts } from "./related-products.ts";

function product(id: string, category: string, subCategory?: string): ProductSummary {
  return {
    id,
    slug: id,
    sku: id,
    name: id,
    category,
    subCategory,
    price: { amount: 1, currency: "CAD" },
    unit: "each",
    dimensions: "",
    images: [{ url: "/product.jpg", alt: id }],
    inStock: true
  };
}

function detail(id: string, category: string, subCategory?: string): ProductDetail {
  return {
    ...product(id, category, subCategory),
    description: "",
    specifications: {},
    inventory: []
  };
}

test("related products prefer same category and subcategory, then complementary only", () => {
  const current = detail("b12", "Kitchen Cabinets", "Base Cabinet");
  const catalog = [
    product("b15", "Kitchen Cabinets", "Base Cabinet"),
    product("w30", "Kitchen Cabinets", "Wall Cabinet"),
    product("handle", "Handle series"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard"),
    product("vanity", "Bathroom Vanities", "Bathroom Vanities")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  // Same series first, then cabinet companion hardware (handles) — baseboards are
  // not padded in as a pairing.
  assert.deepEqual(selected.map(({ id }) => id), ["b15", "handle"]);
  assert.equal(selected.some(({ category }) => category === "Bathroom Vanities"), false);
});

test("related products do not pad with unrelated categories", () => {
  const current = detail("v30", "Bathroom Vanities", "Bathroom Vanities");
  const catalog = [
    product("v36", "Bathroom Vanities", "Bathroom Vanities"),
    product("handle", "Handle series"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard"),
    product("b12", "Kitchen Cabinets", "Base Cabinet")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["v36", "handle"]);
});
