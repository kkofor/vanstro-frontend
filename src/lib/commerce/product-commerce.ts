import {
  Money,
  ProductCommerce,
  ProductPricing,
  ProductSummary,
  Promotion
} from "@/lib/api/api-contract";

export function createCatalogCommerce(product: ProductSummary): ProductCommerce {
  return {
    pricing: {
      source: "catalog",
      basePrice: product.price,
      currentPrice: product.price,
      updatedAt: "static-catalog"
    },
    promotions: []
  };
}

export function getProductCommerce(product: ProductSummary): ProductCommerce {
  return product.commerce ?? createCatalogCommerce(product);
}

export function getProductPricing(product: ProductSummary): ProductPricing {
  return getProductCommerce(product).pricing;
}

export function getEffectivePrice(product: ProductSummary): Money {
  return getProductPricing(product).currentPrice;
}

export function getCompareAtPrice(product: ProductSummary): Money | undefined {
  const pricing = getProductPricing(product);
  if (!pricing.compareAtPrice) return undefined;
  if (pricing.compareAtPrice.amount <= pricing.currentPrice.amount) return undefined;
  return pricing.compareAtPrice;
}

export function getPromotionBadges(product: ProductSummary): Promotion[] {
  return [...(getProductCommerce(product).promotions ?? [])].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );
}

export function getPrimaryPromotion(product: ProductSummary): Promotion | undefined {
  return getPromotionBadges(product)[0];
}

export function getSavingsLabel(product: ProductSummary) {
  const pricing = getProductPricing(product);

  if (pricing.savingsPercent) {
    return `Save ${pricing.savingsPercent}%`;
  }

  if (pricing.savings?.amount) {
    return `Save ${formatMoney(pricing.savings)}`;
  }

  const compareAtPrice = getCompareAtPrice(product);
  if (compareAtPrice) {
    return `Save ${formatMoney({
      amount: compareAtPrice.amount - pricing.currentPrice.amount,
      currency: pricing.currentPrice.currency
    })}`;
  }

  return "";
}

export function withEffectiveProductPrice<T extends ProductSummary>(product: T): T {
  const currentPrice = getEffectivePrice(product);

  if (
    product.price.amount === currentPrice.amount &&
    product.price.currency === currentPrice.currency
  ) {
    return product;
  }

  return {
    ...product,
    price: currentPrice
  };
}

export function formatMoney(money: Money) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: money.currency
  }).format(money.amount);
}
