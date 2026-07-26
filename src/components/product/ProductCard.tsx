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
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { formatUnitPrice } from "@/lib/i18n/display-format";

export function ProductCard({ product, locale: explicitLocale }: { product: ProductSummary; locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const french = locale === "fr-CA";
  const productHref = localeHref(`/products/${product.slug}?sku=${encodeURIComponent(product.sku)}`, locale);
  const {
    addToCart,
    isFavorite,
    toggleFavorite
  } = useStorefront();
  const [actionState, setActionState] = useState<"idle" | "loading" | "error">("idle");
  const saved = isFavorite(product.id);
  const colorName = product.colorName ?? product.finish ?? (french ? "Blanc" : "White");
  const colorHex = product.colorHex ?? "#f8f7f3";
  const displaySize = formatProductSize(product.dimensions, locale);
  const effectivePrice = getEffectivePrice(product);
  const compareAtPrice = getCompareAtPrice(product);
  const primaryPromotion = getPrimaryPromotion(product);
  const savingsLabel = getSavingsLabel(product, locale);
  const localizedSavingsLabel = savingsLabel;
  const localizedPromotionLabel = french && primaryPromotion
    ? primaryPromotion.label
        .replace(/Special offer/gi, "Offre spéciale")
        .replace(/Limited time/gi, "Durée limitée")
        .replace(/Clearance/gi, "Liquidation")
    : primaryPromotion?.label;
  const hasPromotion = Boolean(primaryPromotion || savingsLabel);

  return (
    <article className="product-card">
      <Link
        className="product-image"
        href={productHref}
        prefetch={false}
        aria-hidden="true"
        tabIndex={-1}
      >
        <img
          src={product.images[0].url}
          alt=""
          width={product.images[0].width}
          height={product.images[0].height}
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="product-body">
        <div className="product-card-main">
          <h3 className="product-name">
            <Link href={productHref} prefetch={false}>{product.name}</Link>
          </h3>

          <dl className="product-specs">
            <div>
              <dt>{french ? "UGS :" : "SKU:"}</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>{french ? "Dimensions" : "Size"}</dt>
              <dd>{displaySize}</dd>
            </div>
            <div>
              <dt>{french ? "Couleur" : "Color"}</dt>
              <dd className="product-color-value">
                <span className="color-swatch" style={{ backgroundColor: colorHex }} aria-hidden="true" />
                {colorName}
              </dd>
            </div>
          </dl>
        </div>

        <div className="product-card-commerce">
          <div className="product-rating">
            <small>{french ? "Aucun avis publié" : "No published reviews"}</small>
          </div>

          <div className="price-stack">
            <div className="commerce-price-row">
              <div className="price-line">
                {formatUnitPrice(effectivePrice, product.unit, locale)}
              </div>
              {compareAtPrice ? (
                <span className="compare-price">{formatMoney(compareAtPrice, locale)}</span>
              ) : (
                <span className="compare-price is-empty" aria-hidden="true" />
              )}
              <div
                className={
                  hasPromotion
                    ? "commerce-badge-row price-badge-row"
                    : "commerce-badge-row price-badge-row is-empty"
                }
                aria-hidden={hasPromotion ? undefined : true}
              >
                {localizedSavingsLabel ? <span className="commerce-badge strong">{localizedSavingsLabel}</span> : null}
                {localizedPromotionLabel ? <span className="commerce-badge">{localizedPromotionLabel}</span> : null}
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
                ? french ? "Ajout…" : "Adding..."
                : actionState === "error"
                  ? french ? "Réessayer" : "Try again"
                  : french ? "Ajouter au panier" : "Add to cart"}
            </button>
          </div>
        </div>

        <button
          className={saved ? "icon-action saved" : "icon-action"}
          type="button"
          aria-label={saved
            ? french ? `Retirer ${product.name} des favoris` : `Remove ${product.name} from favorites`
            : french ? `Ajouter ${product.name} aux favoris` : `Save ${product.name}`}
          aria-pressed={saved}
              onClick={() => {
                setActionState("loading");
                void toggleFavorite(product).then((result) => {
                  setActionState(result.ok ? "idle" : "error");
                });
              }}
        >
          <Heart size={19} strokeWidth={2} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
