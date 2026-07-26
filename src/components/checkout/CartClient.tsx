"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { formatMoney, getEffectivePrice } from "@/lib/commerce/product-commerce";
import { formatProductSize } from "@/lib/product/product-display";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";


export function CartClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const {
    cartItems,
    cartSubtotal,
    cartState,
    mutationState,
    selectedDealerName,
    updateCartQuantity,
    removeFromCart
  } = useStorefront();

  const cartMutationPending = mutationState.status === "loading" &&
    mutationState.action?.includes("cart");

  function changeQuantity(productId: string, quantity: number) {
    void updateCartQuantity(productId, quantity);
  }

  function removeItem(productId: string) {
    void removeFromCart(productId);
  }

  if (cartState.status === "loading") {
    return <div className="empty-panel"><h2>{copy.cart.loadingTitle}</h2><p>{copy.cart.loadingBody}</p></div>;
  }

  if (cartState.status === "error" && !cartItems.length) {
    return <div className="empty-panel"><h2>{copy.cart.unavailableTitle}</h2><p role="alert">{locale === "fr-CA" ? copy.storefront.requestError : cartState.error}</p></div>;
  }

  if (!cartItems.length) {
    return (
      <div className="empty-panel">
        <h2>{copy.cart.emptyTitle}</h2>
        <p>{copy.cart.emptyBody}</p>
        <Link className="button button-primary" href={localeHref("/products", locale)}>
          {copy.common.shopProducts}
        </Link>
      </div>
    );
  }

  return (
    <div className="two-column-page">
      <div className="cart-list">
        {cartItems.map((item) => (
          <article className="cart-row" key={item.product.id}>
            <img
              src={item.product.images[0].url}
              alt={item.product.images[0].alt}
              width={item.product.images[0].width}
              height={item.product.images[0].height}
              loading="lazy"
              decoding="async"
            />
            <div>
              <h2 className="product-name">{item.product.name}</h2>
              <p className="product-meta">
                {formatProductSize(item.product.dimensions, locale)} - {selectedDealerName}
              </p>
              <div className="quantity-stepper" aria-label={copy.cart.quantityFor(item.product.name)}>
                <button
                  type="button"
                  onClick={() =>
                    changeQuantity(item.product.id, item.quantity - 1)
                  }
                  aria-label={copy.cart.decrease}
                  disabled={cartMutationPending}
                >
                  <Minus size={15} strokeWidth={2} />
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    changeQuantity(item.product.id, item.quantity + 1)
                  }
                  aria-label={copy.cart.increase}
                  disabled={cartMutationPending}
                >
                  <Plus size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="cart-line-actions">
              <strong>{formatMoney({ amount: getEffectivePrice(item.product).amount * item.quantity, currency: item.product.price.currency }, locale)}</strong>
              <button
                className="icon-only"
                type="button"
                onClick={() => removeItem(item.product.id)}
                aria-label={copy.cart.remove(item.product.name)}
                disabled={cartMutationPending}
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <aside className="summary-panel">
        <h2>{copy.cart.summary}</h2>
        <div className="spec-list">
          <div className="spec-row">
            <strong>{copy.cart.servingStore}</strong>
            <span>{selectedDealerName}</span>
          </div>
          <div className="spec-row">
            <strong>{copy.common.subtotal}</strong>
            <span>{formatMoney({ amount: cartSubtotal, currency: "CAD" }, locale)}</span>
          </div>
          <div className="spec-row">
            <strong>{copy.cart.payment}</strong>
            <span>{copy.cart.paymentValue}</span>
          </div>
        </div>
        <Link className="button button-primary" href={localeHref("/checkout", locale)}>
          {copy.cart.checkout}
        </Link>
        {mutationState.status === "error" ? (
          <p className="quantity-limit-note" role="alert">{locale === "fr-CA" ? copy.storefront.requestError : mutationState.error}</p>
        ) : null}
      </aside>
    </div>
  );
}
