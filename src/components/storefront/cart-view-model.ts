import type { Cart, CartItem, Money, ProductSummary } from "@/lib/api/api-contract";

export type CartLine = {
  cartItemId: string;
  skuId: string;
  product: ProductSummary;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
};

export type CartSnapshot = {
  cartId: string;
  items: CartLine[];
  subtotal: Money;
};

export function addedCartAmount(previousItem: CartLine | undefined, nextItem: CartItem): Money {
  if (!previousItem) return nextItem.lineTotal;
  if (previousItem.lineTotal.currency !== nextItem.lineTotal.currency) return nextItem.lineTotal;
  return {
    amount: Math.max(0, nextItem.lineTotal.amount - previousItem.lineTotal.amount),
    currency: nextItem.lineTotal.currency
  };
}

export function toCartSnapshot(cart: Cart): CartSnapshot {
  return {
    cartId: cart.id,
    items: cart.items.map((item) => ({
      cartItemId: item.id,
      skuId: item.skuId,
      product: {
        id: item.product.id,
        slug: item.product.slug,
        sku: item.product.sku,
        name: item.product.name,
        price: item.unitPrice,
        category: item.product.category ?? "Catalog",
        unit: item.product.unit,
        dimensions: item.product.dimensions,
        images: item.product.images,
        inStock: item.product.inStock
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal
    })),
    subtotal: cart.subtotal
  };
}
