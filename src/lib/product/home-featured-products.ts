import type { ProductSummary } from "@/lib/api/api-contract";
import { HOME_PRODUCT_LIMIT } from "./catalog-config.ts";

export const HOME_FEATURED_SKUS = [
  "011770130", // Base Cabinet B30
  "012770130", // 3-Drawer Base 3DB30
  "011950130", // Sink Base SB30
  "013780130", // Lazy Susan Base LSB33
  "015190130", // Wall Cabinet W2730
  "017580130", // Tall Cabinet U248424
  "023021011", // Vanity Cabinet VS30
  "023621011" // Vanity Cabinet VS36
] as const;

export function selectHomeFeaturedProducts(products: readonly ProductSummary[]) {
  const featured = HOME_FEATURED_SKUS.map((sku) =>
    products.find((product) => product.sku === sku)
  ).filter((product): product is ProductSummary => Boolean(product));

  if (featured.length !== HOME_PRODUCT_LIMIT) {
    throw new Error("The homepage featured catalog is incomplete.");
  }
  return featured;
}
