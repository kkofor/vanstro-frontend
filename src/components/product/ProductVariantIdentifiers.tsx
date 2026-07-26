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
    <dl className="pdp-meta-line" aria-label={french ? "Identifiants du produit" : "Product identifiers"}>
      <div>
        <dt>{french ? "Nº de pièce du fabricant" : "Model (MPN)"}</dt>
        <dd title={selectedProduct.manufacturerPartNumber ?? manufacturerPartNumber}>
          {selectedProduct.manufacturerPartNumber ?? manufacturerPartNumber}
        </dd>
      </div>
      <div>
        <dt>{french ? "UGS :" : "SKU:"}</dt>
        <dd title={selectedProduct.sku}>{selectedProduct.sku}</dd>
      </div>
    </dl>
  );
}
