import assert from "node:assert/strict";
import test from "node:test";
import type { ProductSummary } from "../api/api-contract.ts";
import { resolveProductVariant } from "./product-variants.ts";

const v4221 = {
  id: "v4221",
  slug: "vanity-cabinet-v4221-401",
  sku: "024221611",
  name: "Vanity Cabinet-V4221",
  category: "Bathroom Vanities",
  price: { amount: 975, currency: "CAD" },
  unit: "each",
  dimensions: "",
  images: [{ url: "/v.jpg", alt: "v" }],
  inStock: true,
  commerce: {
    pricing: {
      source: "catalog",
      basePrice: { amount: 975, currency: "CAD" },
      currentPrice: { amount: 975, currency: "CAD" },
      updatedAt: "static-catalog"
    },
    promotions: []
  },
  finishOptions: [
    {
      name: "White",
      sku: "024221611",
      colorName: "White",
      configuration: "with-top",
      price: { amount: 975, currency: "CAD" },
      active: true
    },
    {
      name: "White",
      sku: "024221612",
      colorName: "White",
      configuration: "cabinet-only",
      price: { amount: 730, currency: "CAD" }
    }
  ]
} as ProductSummary;

test("visible price follows cabinet-only option, not product group commerce", () => {
  const selected = resolveProductVariant(v4221, "024221612");
  assert.equal(selected.sku, "024221612");
  assert.equal(selected.price.amount, 730);
  assert.equal(selected.commerce?.pricing.currentPrice.amount, 730);
});

test("default active finish keeps with-top price", () => {
  const selected = resolveProductVariant(v4221, "024221611");
  assert.equal(selected.commerce?.pricing.currentPrice.amount, 975);
});
