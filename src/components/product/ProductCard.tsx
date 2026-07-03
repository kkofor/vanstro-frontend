"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { ProductSummary } from "@/lib/api/api-contract";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import {
  formatMoney,
  getCompareAtPrice,
  getEffectivePrice,
  getPrimaryPromotion,
  getProductPricing,
  getSavingsLabel
} from "@/lib/commerce/product-commerce";

function getReviewCount(productId: string) {
  const reviewCounts: Record<string, number> = {
    "269": 4078,
    "414": 2146,
    "357": 1389,
    "407": 4078
  };
  return reviewCounts[productId] ?? 128;
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const {
    addToCart,
    isFavorite,
    toggleFavorite
  } = useStorefront();
  const saved = isFavorite(product.id);
  const reviewCount = getReviewCount(product.id);
  const colorName = product.colorName ?? product.finish ?? "White";
  const colorHex = product.colorHex ?? "#f8f7f3";
  const pricing = getProductPricing(product);
  const effectivePrice = getEffectivePrice(product);
  const compareAtPrice = getCompareAtPrice(product);
  const primaryPromotion = getPrimaryPromotion(product);
  const savingsLabel = getSavingsLabel(product);

  return (
    <article className="product-card">
      <Link className="product-image" href={`/products/${product.slug}`}>
        <img src={product.images[0].url} alt={product.images[0].alt} />
      </Link>
      <div className="product-body">
        <div className="product-card-main">
          <h3 className="product-name">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>

          <dl className="product-specs">
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{product.dimensions}</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd className="product-color-value">
                <span className="color-swatch" style={{ backgroundColor: colorHex }} />
                {colorName}
              </dd>
            </div>
          </dl>
        </div>

        <div className="product-card-commerce">
          {primaryPromotion || savingsLabel ? (
            <div className="commerce-badge-row" aria-label="Product promotion">
              {savingsLabel ? <span className="commerce-badge strong">{savingsLabel}</span> : null}
              {primaryPromotion ? <span className="commerce-badge">{primaryPromotion.label}</span> : null}
            </div>
          ) : null}

          <div className="product-rating" aria-label={`4 out of 5 stars from ${reviewCount} reviews`}>
            <span aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <Star
                  className={index < 4 ? "rating-star filled" : "rating-star"}
                  size={13}
                  strokeWidth={2}
                  fill={index < 4 ? "currentColor" : "none"}
                  key={index}
                />
              ))}
            </span>
            <small>({reviewCount})</small>
          </div>

          <div className="price-stack">
            {compareAtPrice ? (
              <span className="compare-price">{formatMoney(compareAtPrice)}</span>
            ) : null}
            <div className="price-line">
              {formatMoney(effectivePrice)}
              <span>/ {product.unit}</span>
            </div>
            {pricing.priceLabel ? <small className="price-label">{pricing.priceLabel}</small> : null}
          </div>

          <div className="product-actions">
            <button
              className="small-button dark"
              type="button"
              onClick={() => addToCart(product)}
            >
              Add to cart
            </button>
          </div>
        </div>

        <button
          className={saved ? "icon-action saved" : "icon-action"}
          type="button"
          aria-label={saved ? `Remove ${product.name} from favorites` : `Save ${product.name}`}
          aria-pressed={saved}
          onClick={() => toggleFavorite(product)}
        >
          <Heart size={19} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
