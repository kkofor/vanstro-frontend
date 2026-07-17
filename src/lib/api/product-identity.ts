import type { ProductSummary, WebsiteApiProduct } from "./api-contract";

export type ProductIdentity = Pick<ProductSummary, "id" | "slug" | "sku">;

export function cartProductIdentityFor(product: ProductIdentity) {
  return {
    productId: product.slug,
    skuCode: product.sku
  };
}

export function canonicalProductIdFor(
  product: ProductIdentity,
  canonical: WebsiteApiProduct
) {
  if (canonical.slug !== product.slug || canonical.primarySku?.skuCode !== product.sku) {
    throw new Error(`Product ${product.slug} does not match API SKU ${product.sku}.`);
  }

  return canonical.id;
}
