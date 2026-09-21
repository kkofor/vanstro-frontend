"use client";

import { Star } from "lucide-react";
import { ProductFinishSelector } from "@/components/product/ProductFinishSelector";
import { ProductPurchaseActions } from "@/components/product/ProductPurchaseActions";
import { ProductReviewOpenButton } from "@/components/product/ProductReviewOpenButton";
import { ProductVariantIdentifiers } from "@/components/product/ProductVariantIdentifiers";
import type { Dealer } from "@/lib/api/api-contract";
import {
  formatMoney,
  getCompareAtPrice,
  getEffectivePrice
} from "@/lib/commerce/product-commerce";
import type { ProductDetailViewModel } from "@/lib/product/product-detail-view-model";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import { resolveProductVariant } from "@/lib/product/product-variants";
import {
  CATEGORY_DISPLAY_NAME_BY_SLUG,
  localizeProductTaxonomyLabel
} from "@/lib/product/product-localization";

type ProductBuyPanelProps = {
  viewModel: ProductDetailViewModel;
  dealers: Dealer[];
};

export function ProductBuyPanel({ viewModel, dealers }: ProductBuyPanelProps) {
  const {
    colorHex,
    colorName,
    manufacturerPartNumber,
    product,
    promotionBadges,
    reviewSummary,
    locale
  } = viewModel;
  const french = locale === "fr-CA";
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(product, productVariant?.selectedFinishName);
  const effectivePrice = getEffectivePrice(selectedProduct);
  const compareAtPrice = getCompareAtPrice(selectedProduct);
  const primaryPromotion = promotionBadges[0];
  const promoChipLabel = french && primaryPromotion
    ? primaryPromotion.label
        .replace(/Special offer/gi, "Offre spéciale")
        .replace(/Limited time/gi, "Durée limitée")
        .replace(/Clearance/gi, "Liquidation")
    : primaryPromotion?.label;
  // Unit suffix matches the aside.buy prototype: “/ea · CAD, before tax” (EN) / “/ch · CAD, avant taxes” (FR).
  const unitSuffix = selectedProduct.unit === "each" ? (french ? "ch" : "ea") : selectedProduct.unit;
  // Kicker is the categoryFilter taxonomy label (category · subcategory), localized like the breadcrumb.
  const categoryLabel = localizeProductTaxonomyLabel(
    CATEGORY_DISPLAY_NAME_BY_SLUG[product.category] ?? product.category,
    locale
  );
  const subCategoryLabel = product.subCategory
    ? localizeProductTaxonomyLabel(product.subCategory, locale)
    : null;

  return (
    <aside className="buy" aria-label="Buy">
      <div className="buy__top">
        <div className="buy__kicker">
          <span>{categoryLabel}</span>
          {subCategoryLabel ? <span>{subCategoryLabel}</span> : null}
        </div>
        <h1>{product.name}</h1>
        <div className="buy__ids">
          <ProductVariantIdentifiers
            manufacturerPartNumber={manufacturerPartNumber}
            product={product}
            locale={locale}
          />
        </div>
        <div
          className="buy__rating"
          aria-label={reviewSummary.count > 0
            ? french
              ? `${reviewSummary.average} étoiles sur 5 selon ${reviewSummary.count} avis`
              : `${reviewSummary.average} out of 5 stars from ${reviewSummary.count} reviews`
            : french ? "Aucun avis publié" : "No published reviews"}
        >
          <span className="stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <Star
                className={index < Math.round(reviewSummary.average) ? "rating-star filled" : "rating-star"}
                size={14}
                strokeWidth={2}
                fill="currentColor"
                key={index}
              />
            ))}
          </span>
          {reviewSummary.count > 0 ? (
            <small>{reviewSummary.average.toFixed(1)} ({reviewSummary.count} {french ? "avis" : "reviews"})</small>
          ) : (
            <small>{french ? "Aucun avis publié" : "No published reviews"}</small>
          )}
          {reviewSummary.writeReviewEnabled ?? true ? (
            <ProductReviewOpenButton label={french ? "Rédiger un avis" : "Write a review"} />
          ) : null}
        </div>
      </div>

      <div className="buy__commerce">
        <div className="buy__price">
          <span className="n">{formatMoney(effectivePrice, locale)}</span>
          <small>
            {french
              ? `/${unitSuffix} · CAD, avant taxes`
              : `/${unitSuffix} · CAD, before tax`}
          </small>
          {compareAtPrice ? (
            <s>{formatMoney(compareAtPrice, locale)}</s>
          ) : null}
          {promoChipLabel ? (
            <span className="chip chip--orange">{promoChipLabel}</span>
          ) : null}
        </div>
        <ProductFinishSelector
          options={product.finishOptions}
          fallbackColorHex={colorHex}
          fallbackName={colorName}
          locale={locale}
          category={product.category}
        />

        <ProductPurchaseActions product={product} dealers={dealers} locale={locale} />
      </div>
    </aside>
  );
}
