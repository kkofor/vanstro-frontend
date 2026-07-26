"use client";

import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export function FavoritesClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { favoriteItems, favoritesState, refreshFavorites } = useStorefront();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);

  if (favoritesState.status === "loading") {
    return (
      <div className="empty-panel" aria-live="polite">
        <h2>{copy.favorites.loadingTitle}</h2>
        <p>{copy.favorites.loadingBody}</p>
      </div>
    );
  }

  if (favoritesState.status === "error") {
    const authenticationRequired = favoritesState.errorCode === "AUTH_REQUIRED";

    return (
      <div className="empty-panel">
        <h2>{authenticationRequired ? copy.favorites.authRequiredTitle : copy.favorites.unavailableTitle}</h2>
        <p role="alert">{authenticationRequired ? copy.favorites.authRequiredBody : copy.favorites.unavailableBody}</p>
        <div className="empty-panel-actions">
          {authenticationRequired ? (
            <Link className="button button-primary" href={localeHref("/account/login", locale)}>
              {copy.favorites.signIn}
            </Link>
          ) : (
            <button className="button button-primary" type="button" onClick={refreshFavorites}>
              {copy.favorites.retry}
            </button>
          )}
          <Link className="button button-secondary" href={localeHref("/products", locale)}>
            {copy.favorites.browse}
          </Link>
        </div>
      </div>
    );
  }

  if (!favoriteItems.length) {
    return (
      <div className="empty-panel">
        <h2>{copy.favorites.emptyTitle}</h2>
        <p>{copy.favorites.emptyBody}</p>
        <Link className="button button-primary" href={localeHref("/products", locale)}>
          {copy.favorites.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {favoriteItems.map((product) => (
        <ProductCard product={product} locale={locale} key={product.id} />
      ))}
    </div>
  );
}
