"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { ProductSummary } from "@/lib/api/api-contract";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import {
  formatMoney,
  getCompareAtPrice,
  getEffectivePrice,
  getPrimaryPromotion,
  getSavingsLabel
} from "@/lib/commerce/product-commerce";
import { formatProductSize } from "@/lib/product/product-display";

export function ProductCard({ product }: { product: ProductSummary }) {
  const {
    addToCart,
    isFavorite,
    toggleFavorite
  } = useStorefront();
  const [actionState, setActionState] = useState<"idle" | "loading" | "error">("idle");
  const saved = isFavorite(product.id);
  const colorName = product.colorName ?? product.finish ?? "White";
  const colorHex = product.colorHex ?? "#f8f7f3";
  const displaySize = formatProductSize(product.dimensions);
  const effectivePrice = getEffectivePrice(product);
  const compareAtPrice = getCompareAtPrice(product);
  const primaryPromotion = getPrimaryPromotion(product);
  const savingsLabel = getSavingsLabel(product);
  const hasPromotion = Boolean(primaryPromotion || savingsLabel);

  return (
    <article className="product-card">
      <Link className="product-image" href={`/products/${product.slug}`} prefetch={false}>
        <img
          src={product.images[0].url}
          alt={product.images[0].alt}
          width={product.images[0].width}
          height={product.images[0].height}
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="product-body">
        <div className="product-card-main">
          <h3 className="product-name">
            <Link href={`/products/${product.slug}`} prefetch={false}>{product.name}</Link>
          </h3>

          <dl className="product-specs">
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{displaySize}</dd>
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
          <div className="product-rating">
            <small>No published reviews</small>
          </div>

          <div className="price-stack">
            <div className="commerce-price-row">
              <div className="price-line">
                {formatMoney(effectivePrice)}
                <span>/ {product.unit}</span>
              </div>
              {compareAtPrice ? (
                <span className="compare-price">{formatMoney(compareAtPrice)}</span>
              ) : (
                <span className="compare-price is-empty" aria-hidden="true" />
              )}
              <div
                className={
                  hasPromotion
                    ? "commerce-badge-row price-badge-row"
                    : "commerce-badge-row price-badge-row is-empty"
                }
                aria-label={hasPromotion ? "Product promotion" : undefined}
                aria-hidden={hasPromotion ? undefined : true}
              >
                {savingsLabel ? <span className="commerce-badge strong">{savingsLabel}</span> : null}
                {primaryPromotion ? <span className="commerce-badge">{primaryPromotion.label}</span> : null}
              </div>
            </div>
          </div>

          <div className="product-actions">
            <button
              className="small-button dark"
              type="button"
              disabled={actionState === "loading"}
              onClick={() => {
                setActionState("loading");
                void addToCart(product).then((result) => {
                  setActionState(result.ok ? "idle" : "error");
                });
              }}
            >
              {actionState === "loading"
                ? "Adding..."
                : actionState === "error"
                  ? "Try again"
                  : "Add to cart"}
            </button>
          </div>
        </div>

        <button
          className={saved ? "icon-action saved" : "icon-action"}
          type="button"
          aria-label={saved ? `Remove ${product.name} from favorites` : `Save ${product.name}`}
          aria-pressed={saved}
              onClick={() => {
                setActionState("loading");
                void toggleFavorite(product).then((result) => {
                  setActionState(result.ok ? "idle" : "error");
                });
              }}
        >
          <Heart size={19} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
