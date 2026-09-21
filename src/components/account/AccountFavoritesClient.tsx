"use client";

import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { ProductCard } from "@/components/product/ProductCard";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { CommercePageSkeleton, CommerceStatePanel } from "@/components/ui/CommerceStatePanel";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getAccountCopy } from "@/lib/i18n/account-copy";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";

export function AccountFavoritesClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { favoriteItems, favoritesState, refreshFavorites } = useStorefront();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const accountCopy = getAccountCopy(locale);

  return (
    <AccountShell active="favorites" locale={locale}>
      <header className="account-section-heading account-section-heading-rich">
        <div><h2>{accountCopy.favorites.title}</h2><p>{accountCopy.favorites.intro}</p></div>
        {favoritesState.status === "success" ? <span className="account-count-badge">{accountCopy.favorites.count(favoriteItems.length)}</span> : null}
      </header>
      {favoritesState.status === "loading" ? <CommercePageSkeleton rows={2} label={copy.favorites.loadingTitle} /> : null}
      {favoritesState.status === "error" ? (
        <CommerceStatePanel
          tone="error"
          title={favoritesState.errorCode === "AUTH_REQUIRED" ? copy.favorites.authRequiredTitle : copy.favorites.unavailableTitle}
          body={favoritesState.errorCode === "AUTH_REQUIRED" ? copy.favorites.authRequiredBody : copy.favorites.unavailableBody}
          actions={favoritesState.errorCode === "AUTH_REQUIRED" ? (
            <Link className="button button-primary" href={localeHref("/account/login", locale)}>{copy.favorites.signIn}</Link>
          ) : (
            <button className="button button-primary" type="button" onClick={refreshFavorites}>{copy.favorites.retry}</button>
          )}
        />
      ) : null}
      {favoritesState.status === "success" && favoriteItems.length === 0 ? (
        <CommerceStatePanel title={copy.favorites.emptyTitle} body={copy.favorites.emptyBody} actions={<Link className="button button-primary" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>{copy.favorites.browse}</Link>} />
      ) : null}
      {favoritesState.status === "success" && favoriteItems.length > 0 ? (
        <>
          <aside className="account-planning-note"><strong>{accountCopy.favorites.noteTitle}</strong><p>{accountCopy.favorites.noteBody}</p></aside>
          <div className="product-grid account-favorites-grid">
            {favoriteItems.map((product) => <ProductCard product={product} locale={locale} key={product.id} />)}
          </div>
        </>
      ) : null}
    </AccountShell>
  );
}
