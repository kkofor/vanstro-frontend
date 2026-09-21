import assert from "node:assert/strict";
import test from "node:test";
import type { Cart } from "../../lib/api/api-contract.ts";
import { addedCartAmount, toCartSnapshot } from "./cart-view-model.ts";

const product = {
  id: "product-1",
  slug: "sample-product",
  name: "Sample product",
  unit: "each",
  dimensions: "24 in",
  images: [{ url: "/sample.jpg", alt: "Sample" }],
  inStock: true
};

const cart: Cart = {
  id: "cart-1",
  items: [
    {
      id: "cart-item-1",
      skuId: "sku-id-1",
      product: { ...product, sku: "SKU-1" },
      quantity: 2,
      unitPrice: { amount: 9.99, currency: "CAD" },
      lineTotal: { amount: 17.5, currency: "CAD" }
    },
    {
      id: "cart-item-2",
      skuId: "sku-id-2",
      product: { ...product, sku: "SKU-2" },
      quantity: 1,
      unitPrice: { amount: 12, currency: "CAD" },
      lineTotal: { amount: 11.5, currency: "CAD" }
    }
  ],
  subtotal: { amount: 29, currency: "CAD" }
};

test("cart snapshot preserves authoritative identity and totals", () => {
  const snapshot = toCartSnapshot(cart);

  assert.equal(snapshot.cartId, "cart-1");
  assert.deepEqual(snapshot.items.map(({ cartItemId, skuId, product: itemProduct }) => ({
    cartItemId,
    skuId,
    sku: itemProduct.sku
  })), [
    { cartItemId: "cart-item-1", skuId: "sku-id-1", sku: "SKU-1" },
    { cartItemId: "cart-item-2", skuId: "sku-id-2", sku: "SKU-2" }
  ]);
  assert.deepEqual(snapshot.items[0].lineTotal, { amount: 17.5, currency: "CAD" });
  assert.deepEqual(snapshot.subtotal, { amount: 29, currency: "CAD" });
  assert.notEqual(snapshot.items[0].lineTotal.amount, snapshot.items[0].unitPrice.amount * 2);
});

test("added cart amount uses the authoritative total for a new line", () => {
  assert.deepEqual(addedCartAmount(undefined, cart.items[0]), {
    amount: 17.5,
    currency: "CAD"
  });
});

test("added cart amount uses the authoritative line-total delta for an existing variant", () => {
  const previous = {
    ...toCartSnapshot(cart).items[0],
    quantity: 1,
    lineTotal: { amount: 8.25, currency: "CAD" as const }
  };

  assert.deepEqual(addedCartAmount(previous, cart.items[0]), {
    amount: 9.25,
    currency: "CAD"
  });
});
