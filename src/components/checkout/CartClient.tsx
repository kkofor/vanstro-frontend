"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { getEffectivePrice } from "@/lib/commerce/product-commerce";
import { formatProductSize } from "@/lib/product/product-display";

function formatCad(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount);
}

export function CartClient() {
  const {
    cartItems,
    cartSubtotal,
    selectedDealerName,
    updateCartQuantity,
    removeFromCart
  } = useStorefront();

  function changeQuantity(productId: string, quantity: number) {
    updateCartQuantity(productId, quantity);
  }

  function removeItem(productId: string) {
    removeFromCart(productId);
  }

  if (!cartItems.length) {
    return (
      <div className="empty-panel">
        <h2>Your cart is empty</h2>
        <p>Add stocked products to start a pickup or delivery order.</p>
        <Link className="button button-primary" href="/products">
          Shop Products
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
                {formatProductSize(item.product.dimensions)} - {selectedDealerName}
              </p>
              <div className="quantity-stepper" aria-label={`Quantity for ${item.product.name}`}>
                <button
                  type="button"
                  onClick={() =>
                    changeQuantity(item.product.id, item.quantity - 1)
                  }
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} strokeWidth={2} />
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    changeQuantity(item.product.id, item.quantity + 1)
                  }
                  aria-label="Increase quantity"
                >
                  <Plus size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="cart-line-actions">
              <strong>{formatCad(getEffectivePrice(item.product).amount * item.quantity)}</strong>
              <button
                className="icon-only"
                type="button"
                onClick={() => removeItem(item.product.id)}
                aria-label={`Remove ${item.product.name}`}
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <aside className="summary-panel">
        <h2>Order summary</h2>
        <div className="spec-list">
          <div className="spec-row">
            <strong>Serving store</strong>
            <span>{selectedDealerName}</span>
          </div>
          <div className="spec-row">
            <strong>Subtotal</strong>
            <span>{formatCad(cartSubtotal)}</span>
          </div>
          <div className="spec-row">
            <strong>Payment</strong>
            <span>POS or cash</span>
          </div>
        </div>
        <Link className="button button-primary" href="/checkout">
          Continue to checkout
        </Link>
      </aside>
    </div>
  );
}
