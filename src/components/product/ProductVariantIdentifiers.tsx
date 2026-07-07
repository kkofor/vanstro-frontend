"use client";

import type { ProductSummary } from "@/lib/api/api-contract";
import { resolveProductVariant } from "@/lib/product/product-variants";
import { useProductVariant } from "@/components/product/ProductVariantContext";

type ProductVariantIdentifiersProps = {
  manufacturerPartNumber: string;
  product: ProductSummary;
};

export function ProductVariantIdentifiers({
  manufacturerPartNumber,
  product
}: ProductVariantIdentifiersProps) {
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(
    product,
    productVariant?.selectedFinishName
  );

  return (
    <dl className="pdp-meta-line" aria-label="Product identifiers">
      <div>
        <dt>Model #</dt>
        <dd>{selectedProduct.manufacturerPartNumber ?? manufacturerPartNumber}</dd>
      </div>
      <div>
        <dt>SKU</dt>
        <dd>{selectedProduct.sku}</dd>
      </div>
    </dl>
  );
}
