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
  getEffectivePrice,
  getProductPricing
} from "@/lib/commerce/product-commerce";
import type { ProductDetailViewModel } from "@/lib/product/product-detail-view-model";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import { resolveProductVariant } from "@/lib/product/product-variants";

type ProductBuyPanelProps = {
  viewModel: ProductDetailViewModel;
  dealers: Dealer[];
};

export function ProductBuyPanel({ viewModel, dealers }: ProductBuyPanelProps) {
  const {
    brandName,
    colorHex,
    colorName,
    manufacturerPartNumber,
    product,
    reviewSummary
  } = viewModel;
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(product, productVariant?.selectedFinishName);
  const pricing = getProductPricing(selectedProduct);
  const effectivePrice = getEffectivePrice(selectedProduct);
  const compareAtPrice = getCompareAtPrice(selectedProduct);

  return (
    <aside className="pdp-sticky-column">
      <article className="purchase-panel pdp-buy-panel">
        <p className="pdp-buy-brand">{brandName}</p>
        <h1>{product.name}</h1>
        <ProductVariantIdentifiers
          manufacturerPartNumber={manufacturerPartNumber}
          product={product}
        />
        <div
          className="pdp-rating-line"
          aria-label={reviewSummary.count > 0
            ? `${reviewSummary.average} out of 5 stars from ${reviewSummary.count} reviews`
            : "No published reviews"}
        >
          {reviewSummary.count > 0 ? (
            <>
              <span aria-hidden="true">
                {[0, 1, 2, 3, 4].map((index) => (
                  <Star
                    className={index < Math.round(reviewSummary.average) ? "rating-star filled" : "rating-star"}
                    size={15}
                    strokeWidth={2}
                    fill={index < Math.round(reviewSummary.average) ? "currentColor" : "none"}
                    key={index}
                  />
                ))}
              </span>
              <small>{reviewSummary.average.toFixed(1)} ({reviewSummary.count} reviews)</small>
            </>
          ) : (
            <small>No published reviews</small>
          )}
          {reviewSummary.writeReviewEnabled ?? true ? (
            <ProductReviewOpenButton />
          ) : null}
        </div>

        <div className="pdp-price-stack">
          {compareAtPrice ? <span className="compare-price">{formatMoney(compareAtPrice)}</span> : null}
          <div className="price-line pdp-price">
            {formatMoney(effectivePrice)}
            <span>/ {selectedProduct.unit}</span>
          </div>
          <small>{pricing.priceLabel ?? "Current price"}</small>
        </div>
        <ProductFinishSelector
          options={product.finishOptions}
          fallbackColorHex={colorHex}
          fallbackName={colorName}
        />

        <ProductPurchaseActions product={product} dealers={dealers} />
      </article>
    </aside>
  );
}
