import {
  Money,
  ProductCommerce,
  ProductPricing,
  ProductSummary,
  Promotion
} from "../api/api-contract.ts";
import { DEFAULT_LOCALE, type SiteLocale } from "../i18n/locale.ts";
import { formatMoney } from "../i18n/display-format.ts";

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

export function getSavingsLabel(product: ProductSummary, locale: SiteLocale = DEFAULT_LOCALE) {
  const pricing = getProductPricing(product);

  const prefix = locale === "fr-CA" ? "Économisez" : "Save";

  if (pricing.savingsPercent) {
    const spacing = locale === "fr-CA" ? " " : "";
    return `${prefix} ${new Intl.NumberFormat(locale).format(pricing.savingsPercent)}${spacing}%`;
  }

  if (pricing.savings?.amount) {
    return `${prefix} ${formatMoney(pricing.savings, locale)}`;
  }

  const compareAtPrice = getCompareAtPrice(product);
  if (compareAtPrice) {
    return `${prefix} ${formatMoney({
      amount: compareAtPrice.amount - pricing.currentPrice.amount,
      currency: pricing.currentPrice.currency
    }, locale)}`;
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

export { formatMoney };
