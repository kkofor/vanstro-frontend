"use client";

import type { ProductSummary } from "@/lib/api/api-contract";
import { resolveProductVariant } from "@/lib/product/product-variants";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import type { SiteLocale } from "@/lib/i18n/locale";

type ProductVariantIdentifiersProps = {
  manufacturerPartNumber: string;
  product: ProductSummary;
  locale?: SiteLocale;
};

export function ProductVariantIdentifiers({
  manufacturerPartNumber,
  product,
  locale = "en-CA"
}: ProductVariantIdentifiersProps) {
  const french = locale === "fr-CA";
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(
    product,
    productVariant?.selectedFinishName
  );

  return (
    <div className="pdp-meta-line" aria-label={french ? "Identifiants du produit" : "Product identifiers"}>
      <span title={selectedProduct.manufacturerPartNumber ?? manufacturerPartNumber}>
        {french ? "Modèle" : "Model"} {selectedProduct.manufacturerPartNumber ?? manufacturerPartNumber}
      </span>
      <span title={selectedProduct.sku}>
        {french ? "UGS" : "SKU"} {selectedProduct.sku}
      </span>
    </div>
  );
}
