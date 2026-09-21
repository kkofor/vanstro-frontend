"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import { resolveProductVariant } from "@/lib/product/product-variants";
import { formatMoney, getEffectivePrice } from "@/lib/commerce/product-commerce";
import type { ProductSummary } from "@/lib/api/api-contract";
import type { SiteLocale } from "@/lib/i18n/locale";

type ProductStickyBarProps = {
  product: ProductSummary;
  locale: SiteLocale;
};

/**
 * PDP mobile sticky add-to-cart bar.
 *
 * Rendered as a SIBLING of .pdp-shell (never a child) but still inside
 * ProductVariantProvider so the finish picker stays in sync. Styling lives in
 * src/app/pdp-v2.css: display:none above 980px, fixed grid bar at <=980px.
 */
export function ProductStickyBar({ product, locale }: ProductStickyBarProps) {
  const french = locale === "fr-CA";
  const { addToCart } = useStorefront();
  // Same variant resolution + price source as ProductBuyPanel/ProductDetailMain, so the bar
  // tracks the selected finish (sku, price, color name) instead of the base product.
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(product, productVariant?.selectedFinishName);
  const price = formatMoney(getEffectivePrice(selectedProduct), locale);
  const colorName = selectedProduct.colorName ?? selectedProduct.finish ?? "Standard finish";
  const [isAdded, setIsAdded] = useState(false);

  async function handleAdd() {
    // Quantity is always 1 from the bar (no stepper). Failure is silent: the bar has no room
    // for error copy, and the full purchase panel already surfaces add-to-cart errors.
    const result = await addToCart(selectedProduct, 1);
    if (!result.ok) return;
    // Mirrors ProductPurchaseActions' 650ms is-added feedback.
    setIsAdded(true);
    window.setTimeout(() => setIsAdded(false), 650);
  }

  return (
    <div className="stickybar" id="stickybar">
      <span className="p"><span>{price}</span><small>{product.name} · {colorName}</small></span>
      <button
        type="button"
        className={isAdded ? "btn btn--primary is-added" : "btn btn--primary"}
        onClick={handleAdd}
      >
        <ShoppingCart className="btn__icon" size={18} aria-hidden="true" />
        {french ? "Ajouter au panier" : "Add to cart"}
      </button>
    </div>
  );
}
