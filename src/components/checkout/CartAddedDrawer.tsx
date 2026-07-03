"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ShoppingCart, X } from "lucide-react";
import type { ProductSummary } from "@/lib/api/api-contract";
import { productsWithCommerce } from "@/lib/data/mock-data";
import { formatMoney, getEffectivePrice } from "@/lib/commerce/product-commerce";
import { useStorefront } from "@/components/storefront/StorefrontProvider";

type CartAddedEventDetail = {
  product: ProductSummary;
  quantity: number;
};

export function CartAddedDrawer() {
  const { cartCount, cartSubtotal, selectedDealerName } = useStorefront();
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartAddedEventDetail | null>(null);

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

  const suggestedProducts = useMemo(() => {
    const currentId = lastAdded?.product.id;
    return productsWithCommerce
      .filter((product) => product.id !== currentId)
      .slice(0, 2);
  }, [lastAdded?.product.id]);

  if (!lastAdded) return null;

  const itemTotal = getEffectivePrice(lastAdded.product).amount * lastAdded.quantity;

  return (
    <div className={open ? "cart-added-drawer open" : "cart-added-drawer"} aria-hidden={!open}>
      <button
        className="cart-added-backdrop"
        type="button"
        aria-label="Close cart drawer"
        onClick={() => setOpen(false)}
      />
      <aside className="cart-added-panel" role="dialog" aria-modal="true" aria-labelledby="cart-added-title">
        <header className="cart-added-header">
          <button type="button" aria-label="Close cart drawer" onClick={() => setOpen(false)}>
            <X size={22} strokeWidth={2.4} />
          </button>
          <h2 id="cart-added-title">Added to cart</h2>
          <span aria-label={`${cartCount} items in cart`}>
            <ShoppingCart size={22} strokeWidth={2.3} />
            <em>{cartCount}</em>
          </span>
        </header>

        <div className="cart-added-confirmation">
          <Check size={22} strokeWidth={2.5} />
          <span>{lastAdded.quantity} item has been added to your cart</span>
        </div>

        <article className="cart-added-item">
          <img src={lastAdded.product.images[0].url} alt={lastAdded.product.images[0].alt} />
          <div>
            <h3>{lastAdded.product.name}</h3>
            <p>
              {formatMoney(getEffectivePrice(lastAdded.product))} / {lastAdded.product.unit} | Qty: {lastAdded.quantity}
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
          <Link className="button button-accent" href="/cart" onClick={() => setOpen(false)}>
            View cart
          </Link>
          <button className="button button-outline" type="button" onClick={() => setOpen(false)}>
            Continue shopping
          </button>
        </section>

        <section className="cart-added-suggestions" aria-labelledby="cart-added-suggestions-title">
          <h3 id="cart-added-suggestions-title">Suggested items with your purchase</h3>
          <div>
            {suggestedProducts.map((product) => (
              <Link className="cart-added-suggestion" href={`/products/${product.slug}`} key={product.id} onClick={() => setOpen(false)}>
                <img src={product.images[0].url} alt={product.images[0].alt} />
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
