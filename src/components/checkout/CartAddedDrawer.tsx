"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { formatMoney } from "@/lib/commerce/product-commerce";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import { localeHref } from "@/lib/i18n/routes";
import { formatUnitPrice } from "@/lib/i18n/display-format";
import "./cart-mini-drawer.css";

const MAX_QTY = 50;

type CartAddedEventDetail = {
  product: { sku: string };
};

/**
 * Mini cart drawer — replaces the previous "just added" confirmation panel.
 * Port of account-ux assets/cart-drawer.js/.css into the Next storefront.
 * Single data source: StorefrontProvider / vs.cart (no separate cart state,
 * no localStorage writes here — updateCartQuantity/removeFromCart own that).
 * Opens on `vanstro-cart-added` (add-to-cart) and `vanstro-open-cart-drawer`
 * (header cart icon intercept, dispatched by SiteHeader off /cart /checkout).
 */
export function CartAddedDrawer() {
  const { cartCount, cartItems, cartSubtotal, selectedDealerName, updateCartQuantity, removeFromCart } = useStorefront();
  const { locale } = useLocale();
  const copy = getCommerceCopy(locale);
  const french = locale === "fr-CA";
  const [open, setOpen] = useState(false);
  const [justAddedSku, setJustAddedSku] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useModalFocus({
    active: open,
    containerRef: panelRef,
    modalRootRef: drawerRef,
    onEscape: closeDrawer
  });

  useEffect(() => {
    function handleCartAdded(event: Event) {
      const detail = (event as CustomEvent<CartAddedEventDetail>).detail;
      setJustAddedSku(detail?.product?.sku ?? null);
      setOpen(true);
    }
    function handleOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("vanstro-cart-added", handleCartAdded);
    window.addEventListener("vanstro-open-cart-drawer", handleOpenRequest);
    return () => {
      window.removeEventListener("vanstro-cart-added", handleCartAdded);
      window.removeEventListener("vanstro-open-cart-drawer", handleOpenRequest);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cd-lock", open);
    return () => document.body.classList.remove("cd-lock");
  }, [open]);

  const dealer = selectedDealerName || (french ? "votre détaillant" : "your dealer");
  const hasItems = cartItems.length > 0;

  function onQtyChange(cartItemId: string, next: number) {
    const clamped = Math.max(1, Math.min(MAX_QTY, Math.round(next) || 1));
    void updateCartQuantity(cartItemId, clamped);
  }

  return (
    <div
      ref={drawerRef}
      className={open ? "cd-root is-open is-in" : "cd-root"}
      aria-hidden={!open}
    >
      <button
        className="cd-backdrop"
        type="button"
        aria-label={copy.drawer.close}
        onClick={closeDrawer}
      />
      <aside
        ref={panelRef}
        className="cd"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        tabIndex={-1}
      >
        <div className="cd__head">
          <div>
            <h2 id="cd-title">{copy.drawer.title}</h2>
            <span className="sub">{hasItems ? copy.drawer.count(cartCount) : ""}</span>
          </div>
          <button type="button" className="cd__close" aria-label={copy.drawer.close} onClick={closeDrawer}>
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        {justAddedSku && cartItems.some((line) => line.skuId === justAddedSku) ? (
          <div className="cd__added" role="status">
            <Check size={18} strokeWidth={2.5} />
            <div>
              <b>{cartItems.find((line) => line.skuId === justAddedSku)?.product.name}</b>{" "}
              <span className="muted">{french ? "ajouté au panier" : "added to your cart"}</span>
            </div>
          </div>
        ) : null}

        <div className="cd__body">
          {!hasItems ? (
            <div className="cd__empty">
              <div className="cd__empty-ic" aria-hidden="true">
                <ShoppingCart size={30} strokeWidth={1.8} />
              </div>
              <h3>{copy.drawer.emptyTitle}</h3>
              <p>{copy.drawer.emptyBody(dealer)}</p>
              <Link className="btn btn--primary" href={localeHref("/products", locale)} onClick={closeDrawer}>
                {french ? "Continuer vos achats" : "Continue shopping"}
              </Link>
            </div>
          ) : (
            <>
              <div className="cd-lines">
                {cartItems.map((line) => {
                  const image = line.product.images[0];
                  const isNew = line.skuId === justAddedSku;
                  return (
                    <div className={isNew ? "cd-ln is-new" : "cd-ln"} key={line.cartItemId}>
                      <Link className="cd-ln__img" href={localeHref(`/products/${line.product.slug}`, locale)} tabIndex={-1} aria-hidden="true">
                        {image ? (
                          <img src={image.url} alt="" loading="lazy" />
                        ) : null}
                      </Link>
                      <div className="cd-ln__meta">
                        <Link className="cd-ln__name" href={localeHref(`/products/${line.product.slug}`, locale)}>
                          {line.product.name}
                        </Link>
                        {line.product.dimensions ? <span className="cd-ln__spec">{line.product.dimensions}</span> : null}
                        <span className="cd-ln__unit">{formatUnitPrice(line.unitPrice, line.product.unit, locale)}</span>
                        <div className="cd-ln__ctl">
                          <div className="qty" role="group" aria-label={copy.drawer.quantity}>
                            <button
                              type="button"
                              aria-label="-1"
                              disabled={line.quantity <= 1}
                              onClick={() => onQtyChange(line.cartItemId, line.quantity - 1)}
                            >
                              <Minus size={15} strokeWidth={2.2} />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={MAX_QTY}
                              value={line.quantity}
                              aria-label={copy.drawer.quantity}
                              onChange={(event) => onQtyChange(line.cartItemId, Number(event.target.value))}
                            />
                            <button
                              type="button"
                              aria-label="+1"
                              disabled={line.quantity >= MAX_QTY}
                              onClick={() => onQtyChange(line.cartItemId, line.quantity + 1)}
                            >
                              <Plus size={15} strokeWidth={2.2} />
                            </button>
                          </div>
                          <button type="button" className="cd-ln__rm" onClick={() => void removeFromCart(line.cartItemId)}>
                            <Trash2 size={14} strokeWidth={2.2} />
                            {copy.drawer.remove}
                          </button>
                        </div>
                      </div>
                      <div className="cd-ln__right">
                        <span className="cd-ln__total">{formatMoney(line.lineTotal, locale)}</span>
                        {line.quantity > 1 ? (
                          <span className="cd-ln__each">
                            {line.quantity} × {formatMoney(line.unitPrice, locale)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="cd__dealer">
                <ShoppingCart size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  {(() => {
                    const text = copy.drawer.pickupDelivery(dealer);
                    const idx = text.indexOf(dealer);
                    if (idx === -1) return text;
                    return (
                      <>
                        {text.slice(0, idx)}
                        <b>{dealer}</b>
                        {text.slice(idx + dealer.length)}
                      </>
                    );
                  })()}
                </span>
              </div>
            </>
          )}
        </div>

        {hasItems ? (
          <div className="cd__foot">
            <div className="cd__sum">
              <span className="k">
                {french ? "Sous-total" : "Subtotal"}
                <small>{french ? "avant taxes et livraison" : "before tax and delivery"}</small>
              </span>
              <span>
                <span className="v">{formatMoney(cartSubtotal, locale)}</span>
                <span className="cur">{cartSubtotal.currency}</span>
              </span>
            </div>
            <p className="cd__note">{copy.drawer.taxes}</p>
            <div className="cd__cta">
              <Link className="btn btn--primary btn--block" href={localeHref("/checkout", locale)} onClick={closeDrawer}>
                {copy.cart.checkout}
              </Link>
              <Link className="btn btn--secondary btn--block" href={localeHref("/cart", locale)} onClick={closeDrawer}>
                {copy.drawer.viewCart}
              </Link>
            </div>
            <div className="cd__pay">
              <span>{french ? "Payer avec" : "Pay with"}</span>
              <i>VISA</i><i>MC</i><i>AMEX</i>
              <span className="w">{french ? "Apple Pay" : "Apple Pay"}</span>
              <span className="w">{french ? "Google Pay" : "Google Pay"}</span>
            </div>
            <div className="cd__continue">
              <button type="button" onClick={closeDrawer}>
                {copy.drawer.continueShopping}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
