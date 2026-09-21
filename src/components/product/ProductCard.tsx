"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Star } from "lucide-react";
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
import {
  finishConfigurationLabel,
  inferFinishConfiguration,
  uniqueProductFinishSwatches
} from "@/lib/product/product-finish-options";
import { resolveProductVariant } from "@/lib/product/product-variants";
import { Button } from "@/components/ui/button";

export function ProductCard({ product, locale: explicitLocale }: { product: ProductSummary; locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const french = locale === "fr-CA";
  const finishSwatches = uniqueProductFinishSwatches(product, locale, product.category);
  const [selectedSku, setSelectedSku] = useState(product.sku);
  const selectedSwatch =
    finishSwatches.find((swatch) => swatch.sku === selectedSku) ??
    finishSwatches.find((swatch) => swatch.sku === product.sku) ??
    finishSwatches[0];
  const selectedProduct = selectedSwatch?.sku || selectedSwatch?.optionName
    ? resolveProductVariant(product, selectedSwatch.sku || selectedSwatch.optionName)
    : product;
  const selectedConfiguration = product.finishOptions?.find((option) => option.sku === selectedProduct.sku);
  const configurationLabel = finishConfigurationLabel(
    selectedConfiguration ? inferFinishConfiguration(selectedConfiguration) : undefined,
    locale,
    product.category
  );
  const productHref = localeHref(`/products/${selectedProduct.slug}?sku=${encodeURIComponent(selectedProduct.sku)}`, locale);
  const {
    addToCart,
    isFavorite,
    toggleFavorite
  } = useStorefront();
  const [cartActionState, setCartActionState] = useState<"idle" | "loading" | "error">("idle");
  const [favoriteActionState, setFavoriteActionState] = useState<"idle" | "loading" | "error">("idle");
  const saved = isFavorite(selectedProduct.id);
  const displaySize = formatProductSize(selectedProduct.dimensions, locale);
  const effectivePrice = getEffectivePrice(selectedProduct);
  const compareAtPrice = getCompareAtPrice(selectedProduct);
  const primaryPromotion = getPrimaryPromotion(selectedProduct);
  const savingsLabel = getSavingsLabel(selectedProduct, locale);
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
          src={selectedProduct.images[0].url}
          alt=""
          width={selectedProduct.images[0].width}
          height={selectedProduct.images[0].height}
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
              <dd>{selectedProduct.sku}</dd>
            </div>
            <div>
              <dt>{french ? "Dimensions" : "Size"}</dt>
              <dd>{displaySize}</dd>
            </div>
            <div>
              <dt>{french ? "Couleur" : "Color"}</dt>
              <dd className="product-color-value">
                {finishSwatches.map((swatch) => {
                  const selected = swatch.sku === selectedProduct.sku;
                  return (
                    <Button
                      className={selected ? "color-swatch is-selected" : "color-swatch"}
                      type="button"
                      size="icon"
                      variant="ghost"
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                      aria-label={swatch.name}
                      aria-pressed={selected}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (swatch.sku) setSelectedSku(swatch.sku);
                      }}
                      key={`${swatch.hex}-${swatch.sku}`}
                    />
                  );
                })}
                {selectedSwatch?.name ? (
                  <span className="product-color-names">
                    {selectedSwatch.name}
                    {configurationLabel ? ` · ${configurationLabel}` : ""}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>

        <div className="product-card-commerce">
          <div className="product-rating">
            {product.ratingSummary && product.ratingSummary.count > 0 ? (
              <span className="product-rating-stars" aria-label={`${product.ratingSummary.average.toFixed(1)} out of 5 stars from ${product.ratingSummary.count} reviews`}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <Star
                    className={index < Math.round(product.ratingSummary!.average) ? "rating-star filled" : "rating-star"}
                    size={13}
                    strokeWidth={2}
                    fill="currentColor"
                    aria-hidden="true"
                    key={index}
                  />
                ))}
                <small>{product.ratingSummary.count} {french ? "avis" : product.ratingSummary.count === 1 ? "review" : "reviews"}</small>
              </span>
            ) : null}
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
              disabled={cartActionState === "loading"}
              onClick={() => {
                setCartActionState("loading");
                void addToCart(selectedProduct).then((result) => {
                  setCartActionState(result.ok ? "idle" : "error");
                });
              }}
            >
              {cartActionState === "loading"
                ? french ? "Ajout…" : "Adding..."
                : cartActionState === "error"
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
          aria-describedby={favoriteActionState === "error" ? `favorite-error-${selectedProduct.id}` : undefined}
          disabled={favoriteActionState === "loading"}
          onClick={() => {
            setFavoriteActionState("loading");
            void toggleFavorite(selectedProduct).then((result) => {
              setFavoriteActionState(result.ok ? "idle" : "error");
            });
          }}
        >
          <Heart size={19} strokeWidth={2} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        {favoriteActionState === "error" ? (
          <p className="product-favorite-error" id={`favorite-error-${selectedProduct.id}`} role="alert">
            {french ? "Impossible de modifier ce favori. Réessayez." : "Unable to update this saved product. Try again."}
          </p>
        ) : null}
      </div>
    </article>
  );
}
