import assert from "node:assert/strict";
import test from "node:test";
import type { ProductFinishOption } from "../api/api-contract.ts";
import {
  findProductFinishOption,
  inferFinishColorName,
  presentProductFinishOptions,
  uniqueProductFinishSwatches
} from "./product-finish-options.ts";

const vs24: ProductFinishOption[] = [
  {
    name: "White",
    sku: "022421011",
    manufacturerPartNumber: "VS24-PWMS-WH-TOP",
    colorName: "White",
    configuration: "with-top",
    colorHex: "#f7f6f2",
    price: { amount: 350, currency: "CAD" },
    active: true
  },
  {
    name: "White",
    sku: "022421012",
    manufacturerPartNumber: "VS24-PWMS-WH",
    colorName: "White",
    configuration: "cabinet-only",
    colorHex: "#f7f6f2",
    price: { amount: 195, currency: "CAD" }
  },
  {
    name: "Light Grey",
    sku: "022421014",
    manufacturerPartNumber: "VS24-PWMS-LG",
    colorName: "Light Grey",
    configuration: "cabinet-only",
    colorHex: "#b9b6b0",
    price: { amount: 195, currency: "CAD" }
  },
  {
    name: "Light Grey",
    sku: "022421013",
    manufacturerPartNumber: "VS24-PWMS-LG-TOP",
    colorName: "Light Grey",
    configuration: "with-top",
    colorHex: "#b9b6b0",
    price: { amount: 350, currency: "CAD" }
  }
];

test("vanity 2x2 keeps configuration when color changes", () => {
  const presented = presentProductFinishOptions(vs24, "en-CA");
  assert.equal(findProductFinishOption(presented, "White", "with-top")?.option.sku, "022421011");
  assert.equal(findProductFinishOption(presented, "Light Grey", "with-top")?.option.sku, "022421013");
  assert.equal(findProductFinishOption(presented, "White", "cabinet-only")?.option.sku, "022421012");
  assert.equal(findProductFinishOption(presented, "Light Grey", "cabinet-only")?.option.sku, "022421014");
});

test("does not fall back to first Light Grey when with-top is requested", () => {
  const presented = presentProductFinishOptions(vs24, "en-CA");
  assert.equal(findProductFinishOption(presented, "Light Grey", "with-top")?.option.sku, "022421013");
});

test("catalog swatches keep the active with-top SKU per color", () => {
  const swatches = uniqueProductFinishSwatches({ sku: "022421011", finishOptions: vs24 }, "en-CA");
  assert.deepEqual(
    swatches.map((swatch) => [swatch.name, swatch.sku]),
    [
      ["White", "022421011"],
      ["Light Grey", "022421013"]
    ]
  );
});

test("legacy White with top name infers color without configuration words", () => {
  assert.equal(inferFinishColorName({ name: "White with top" }), "White");
  assert.equal(inferFinishColorName({ name: "Light Grey cabinet only" }), "Light Grey");
});
