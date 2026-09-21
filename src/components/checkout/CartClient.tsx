"use client";

import Link from "next/link";
import { MapPin, Minus, PackageCheck, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { CommercePageSkeleton, CommerceStatePanel } from "@/components/ui/CommerceStatePanel";
import { formatMoney } from "@/lib/commerce/product-commerce";
import { formatProductSize } from "@/lib/product/product-display";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";

export function CartClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    cartState,
    mutationState,
    selectedDealerName,
    refreshCart,
    updateCartQuantity,
    removeFromCart
  } = useStorefront();

  const cartMutationPending = mutationState.status === "loading" &&
    mutationState.action?.includes("cart");

  if (cartState.status === "loading") {
    return <CommercePageSkeleton label={copy.cart.loadingTitle} />;
  }

  if (cartState.status === "error" && !cartItems.length) {
    return (
      <CommerceStatePanel
        tone="error"
        title={copy.cart.unavailableTitle}
        body={copy.storefront.requestError}
        actions={(
          <>
            <button className="button button-primary" type="button" onClick={refreshCart}>
              {copy.cart.retry}
            </button>
            <Link className="button button-secondary" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>
              {copy.cart.continueShopping}
            </Link>
          </>
        )}
      />
    );
  }

  if (!cartItems.length) {
    return (
      <CommerceStatePanel
        title={copy.cart.emptyTitle}
        body={copy.cart.emptyBody}
        actions={(
          <Link className="button button-primary" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>
            {copy.common.shopProducts}
          </Link>
        )}
      />
    );
  }

  return (
    <div className="cart-layout">
      <section className="cart-main" aria-labelledby="cart-items-title">
        <header className="commerce-section-heading cart-section-heading">
          <div>
            <h2 id="cart-items-title">{copy.cart.reviewTitle}</h2>
            <p>{copy.cart.reviewBody}</p>
          </div>
          <Link className="text-link" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>
            {copy.cart.continueShopping}
          </Link>
        </header>
        <div className="cart-item-count">
          <PackageCheck size={18} aria-hidden="true" />
          <strong>{copy.cart.itemCount(cartCount)}</strong>
        </div>

        {cartState.status === "error" ? (
          <CommerceStatePanel
            compact
            tone="error"
            title={copy.cart.unavailableTitle}
            body={copy.storefront.requestError}
            actions={<button className="button button-secondary" type="button" onClick={refreshCart}>{copy.cart.retry}</button>}
          />
        ) : null}

        <div className="cart-list">
          {cartItems.map((item) => {
            const headingId = `cart-item-${item.cartItemId}`;
            return (
              <article className="cart-row" key={item.cartItemId} aria-labelledby={headingId}>
                <Link className="cart-product-image" href={localeHref(`/products/${item.product.slug}`, locale)}>
                  <img
                    src={item.product.images[0].url}
                    alt={item.product.images[0].alt}
                    width={item.product.images[0].width}
                    height={item.product.images[0].height}
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
                <div className="cart-product-copy">
                  <h3 id={headingId}>
                    <Link className="cart-product-name" href={localeHref(`/products/${item.product.slug}`, locale)}>
                      {item.product.name}
                    </Link>
                  </h3>
                  <dl className="cart-product-meta">
                    <div><dt>{copy.order.sku}</dt><dd>{item.product.sku}</dd></div>
                    <div><dt>{copy.cart.unitPrice}</dt><dd>{formatMoney(item.unitPrice, locale)}</dd></div>
                    <div><dt>{locale === "fr-CA" ? "Dimensions" : "Dimensions"}</dt><dd>{formatProductSize(item.product.dimensions, locale)}</dd></div>
                  </dl>
                  <div className="cart-quantity-control">
                    <span>{copy.cart.quantity}</span>
                    <div className="quantity-stepper" aria-label={copy.cart.quantityFor(item.product.name)}>
                    <button
                      type="button"
                      onClick={() => void updateCartQuantity(item.cartItemId, item.quantity - 1)}
                      aria-label={`${copy.cart.decrease}: ${item.product.name}`}
                      disabled={cartMutationPending || item.quantity <= 1}
                    >
                      <Minus size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => void updateCartQuantity(item.cartItemId, item.quantity + 1)}
                      aria-label={`${copy.cart.increase}: ${item.product.name}`}
                      disabled={cartMutationPending}
                    >
                      <Plus size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                    </div>
                  </div>
                </div>
                <div className="cart-line-actions">
                  <span>{copy.cart.lineTotal}</span>
                  <strong>{formatMoney(item.lineTotal, locale)}</strong>
                  <button
                    className="icon-only"
                    type="button"
                    onClick={() => void removeFromCart(item.cartItemId)}
                    aria-label={copy.cart.remove(item.product.name)}
                    disabled={cartMutationPending}
                  >
                    <Trash2 size={19} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="cart-summary">
        <section className="cart-fulfillment">
          <MapPin size={22} strokeWidth={2} aria-hidden="true" />
          <div>
            <span>{copy.cart.fulfillmentTitle}</span>
            <strong>{copy.cart.chooseAtCheckout}</strong>
            <p>{copy.cart.fulfillmentConfirmation}</p>
            <small>{copy.cart.requestedDealer(selectedDealerName)}</small>
          </div>
        </section>
        <section className="summary-panel">
          <h2>{copy.cart.summary}</h2>
          <dl className="cart-totals">
            <div className="cart-current-total"><dt>{copy.cart.productsSubtotal}<small>{copy.cart.itemCount(cartCount)}</small></dt><dd>{formatMoney(cartSubtotal, locale)}</dd></div>
          </dl>
          <p className="cart-total-note">{copy.cart.taxesDelivery}</p>
          <p className="cart-inventory-notice"><ShieldCheck size={18} aria-hidden="true" />{copy.cart.inventoryNotice}</p>
          {cartMutationPending ? <p className="cart-update-status" role="status">{copy.cart.mutationPending}</p> : null}
          {mutationState.status === "error" ? (
            <p className="form-message form-message-error" role="alert">
              {copy.storefront.requestError}
            </p>
          ) : null}
          {cartMutationPending ? (
            <button className="button button-primary" type="button" disabled>{copy.cart.mutationPending}</button>
          ) : (
            <Link className="button button-primary" href={localeHref("/checkout", locale)}>
              <ShieldCheck size={18} aria-hidden="true" />{copy.cart.secureCheckout}
            </Link>
          )}
          <Link className="cart-summary-link" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>
            {copy.cart.continueShopping}
          </Link>
        </section>
      </aside>
    </div>
  );
}
