"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { vanstroApi } from "@/lib/api/api-client";

function formatCad(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount);
}

export function CheckoutClient() {
  const router = useRouter();
  const {
    cartItems,
    cartSubtotal,
    cartState,
    selectedDealerId,
    selectedDealerName
  } = useStorefront();
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"pos" | "cash">("pos");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartItems.length) return;
    const form = new FormData(event.currentTarget);
    setCheckoutMessage("");
    setSubmitting(true);
    try {
      const session = await vanstroApi.createCheckoutSession({
        email: String(form.get("email") ?? ""),
        fulfillment,
        ...(selectedDealerId === "winnipeg"
          ? {}
          : { dealerLocationId: selectedDealerId })
      });
      if (!session.data.guestOrderToken) {
        throw new Error("Checkout did not return an order access token.");
      }
      const query = new URLSearchParams({
        session: session.data.id,
        token: session.data.guestOrderToken
      });
      router.push(`/orders/demo-order?${query.toString()}`);
    } catch (error) {
      setCheckoutMessage("Checkout could not reserve inventory. Please review your cart and try again.");
      setSubmitting(false);
    }
  }

  if (cartState.status === "loading") {
    return <div className="empty-panel"><h2>Loading checkout</h2><p>Checking your current cart.</p></div>;
  }

  if (cartState.status === "error") {
    return <div className="empty-panel"><h2>Checkout is unavailable</h2><p>{cartState.error}</p><Link className="button button-primary" href="/cart">Return to cart</Link></div>;
  }

  if (!cartItems.length) {
    return (
      <div className="empty-panel">
        <h2>No items ready for checkout</h2>
        <p>Add products first, then return to checkout.</p>
        <Link className="button button-primary" href="/products">
          Shop Products
        </Link>
      </div>
    );
  }

  return (
    <form className="two-column-page" onSubmit={handleSubmit}>
      <div className="form-panel form-grid two">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" autoComplete="given-name" required />
        </div>
        <div className="field">
          <label htmlFor="lastName">Last name</label>
          <input id="lastName" name="lastName" autoComplete="family-name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" required />
        </div>
        <div className="field">
          <label htmlFor="fulfillment">Fulfillment</label>
          <select
            id="fulfillment"
            value={fulfillment}
            onChange={(event) =>
              setFulfillment(event.target.value as "pickup" | "delivery")
            }
          >
            <option value="pickup">Store pickup</option>
            <option value="delivery">Local delivery</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="paymentMethod">Payment registration</label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as "pos" | "cash")
            }
          >
            <option value="pos">POS at store</option>
            <option value="cash">Cash at store</option>
          </select>
        </div>
        <div className="field form-wide">
          <label htmlFor="notes">Order notes</label>
          <textarea id="notes" name="notes" placeholder="Pickup timing, delivery notes or project details" />
        </div>
      </div>

      <aside className="summary-panel">
        <h2>Checkout summary</h2>
        <div className="spec-list">
          <div className="spec-row">
            <strong>Store</strong>
            <span>{selectedDealerName}</span>
          </div>
          <div className="spec-row">
            <strong>Items</strong>
            <span>{cartItems.length}</span>
          </div>
          <div className="spec-row">
            <strong>Subtotal</strong>
            <span>{formatCad(cartSubtotal)}</span>
          </div>
          <div className="spec-row">
            <strong>Inventory</strong>
            <span>Reserved after payment registration</span>
          </div>
        </div>
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? "Creating payment session..." : "Continue to payment"}
        </button>
        {checkoutMessage ? <p className="quantity-limit-note" aria-live="polite">{checkoutMessage}</p> : null}
      </aside>
    </form>
  );
}
