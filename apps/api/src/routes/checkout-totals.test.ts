import assert from "node:assert/strict";
import test from "node:test";
import { availableQuantity, computeCheckoutTotals } from "./commerce.js";

test("availableQuantity subtracts reserved stock and floors at zero", () => {
  assert.equal(
    availableQuantity([
      { quantityOnHand: 10, quantityReserved: 3 },
      { quantityOnHand: 5, quantityReserved: 5 },
      { quantityOnHand: 2, quantityReserved: 4 }
    ]),
    7
  );
  assert.equal(availableQuantity([]), 0);
});

test("computeCheckoutTotals applies MB 12% tax with free pickup", () => {
  const result = computeCheckoutTotals(1050, 0.12, "pickup", 1500);
  assert.deepEqual(result, { taxCents: 126, shippingCents: 0, totalCents: 1176 });
});

test("computeCheckoutTotals applies MB 12% tax plus flat delivery fee", () => {
  const result = computeCheckoutTotals(1050, 0.12, "delivery", 1500);
  assert.deepEqual(result, { taxCents: 126, shippingCents: 1500, totalCents: 2676 });
});

test("computeCheckoutTotals supports ON 13% HST with no shipping on pickup", () => {
  const result = computeCheckoutTotals(10000, 0.13, "pickup", 1500);
  assert.deepEqual(result, { taxCents: 1300, shippingCents: 0, totalCents: 11300 });
});

test("computeCheckoutTotals rounds tax using Math.round", () => {
  // 99 * 0.05 = 4.95 → 5
  assert.equal(computeCheckoutTotals(99, 0.05, "pickup", 1500).taxCents, 5);
});
