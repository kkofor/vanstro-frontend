"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShoppingCart, X } from "lucide-react";
import type { ProductSummary } from "@/lib/api/api-contract";
import { formatMoney, getEffectivePrice } from "@/lib/commerce/product-commerce";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";

type CartAddedEventDetail = {
  product: ProductSummary;
  quantity: number;
};

export function CartAddedDrawer({ suggestedProducts }: { suggestedProducts: ProductSummary[] }) {
  const { cartCount, cartSubtotal, selectedDealerName } = useStorefront();
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartAddedEventDetail | null>(null);
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
      if (!detail?.product) return;
      setLastAdded(detail);
      setOpen(true);
    }

    window.addEventListener("vanstro-cart-added", handleCartAdded);
    return () => window.removeEventListener("vanstro-cart-added", handleCartAdded);
  }, []);

  if (!lastAdded) return null;

  const itemTotal = getEffectivePrice(lastAdded.product).amount * lastAdded.quantity;

  return (
    <div
      ref={drawerRef}
      className={open ? "cart-added-drawer open" : "cart-added-drawer"}
      aria-hidden={!open}
    >
      <button
        className="cart-added-backdrop"
        type="button"
        aria-label="Close cart drawer"
        onClick={closeDrawer}
      />
      <aside
        ref={panelRef}
        className="cart-added-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-added-title"
        tabIndex={-1}
      >
        <header className="cart-added-header">
          <button type="button" aria-label="Close cart drawer" onClick={closeDrawer}>
            <X size={22} strokeWidth={2.4} />
          </button>
          <h2 id="cart-added-title">Added to cart</h2>
          <span aria-label={`${cartCount} items in cart`}>
            <ShoppingCart size={22} strokeWidth={2.3} />
            <em>{cartCount}</em>
          </span>
        </header>

        <div className="cart-added-confirmation" role="status" aria-live="polite" aria-atomic="true">
          <Check size={22} strokeWidth={2.5} />
          <span>{lastAdded.quantity} item has been added to your cart</span>
        </div>

        <article className="cart-added-item">
          <img
            src={lastAdded.product.images[0].url}
            alt={lastAdded.product.images[0].alt}
            width={lastAdded.product.images[0].width}
            height={lastAdded.product.images[0].height}
            loading="lazy"
            decoding="async"
          />
          <div>
            <h3>{lastAdded.product.name}</h3>
            <p>
              {formatMoney(getEffectivePrice(lastAdded.product))} / {lastAdded.product.unit} | Qty: {lastAdded.quantity}
            </p>
            <p>
              SKU: {lastAdded.product.sku}
              {lastAdded.product.colorName ? ` / ${lastAdded.product.colorName}` : ""}
            </p>
            <small>{selectedDealerName} pickup or coordinated local delivery</small>
          </div>
          <strong>{formatMoney({ amount: itemTotal, currency: lastAdded.product.price.currency })}</strong>
        </article>

        <section className="cart-added-summary" aria-label="Cart subtotal">
          <strong>{cartCount} item(s) in cart</strong>
          <div>
            <span>Order subtotal</span>
            <b>{formatMoney({ amount: cartSubtotal, currency: lastAdded.product.price.currency })}</b>
          </div>
          <p>Final taxes and shipping/delivery will be calculated during checkout.</p>
          <Link className="button button-accent" href="/cart" onClick={closeDrawer}>
            View cart
          </Link>
          <button className="button button-outline" type="button" onClick={closeDrawer}>
            Continue shopping
          </button>
        </section>

        <section className="cart-added-suggestions" aria-labelledby="cart-added-suggestions-title">
          <h3 id="cart-added-suggestions-title">Suggested items with your purchase</h3>
          <div>
            {suggestedProducts
              .filter((product) => product.id !== lastAdded.product.id)
              .slice(0, 2)
              .map((product) => (
              <Link className="cart-added-suggestion" href={`/products/${product.slug}`} prefetch={false} key={product.id} onClick={closeDrawer}>
                <img
                  src={product.images[0].url}
                  alt={product.images[0].alt}
                  width={product.images[0].width}
                  height={product.images[0].height}
                  loading="lazy"
                  decoding="async"
                />
                <strong>{product.name}</strong>
                <span>{formatMoney(getEffectivePrice(product))} / {product.unit}</span>
              </Link>
              ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
