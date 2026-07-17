"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import type { CheckoutSession } from "@/lib/api/api-contract";
import { vanstroApi } from "@/lib/api/api-client";
import { getEffectivePrice } from "@/lib/commerce/product-commerce";

function formatCad(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount);
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { getOrder, persistenceReady } = useStorefront();
  const [session, setSession] = useState<CheckoutSession>();
  const [sessionState, setSessionState] = useState<{
    status: "checking" | "success" | "error" | "local";
    error?: string;
  }>({ status: "checking" });
  const order = getOrder(orderId);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get("session");
    const token = query.get("token");
    if (!sessionId || !token) {
      setSessionState({ status: "local" });
      return;
    }

    let active = true;
    void vanstroApi.getPaymentSession(sessionId, token)
      .then((response) => {
        if (!active) return;
        setSession(response.data);
        setSessionState({ status: "success" });
      })
      .catch((error) => {
        if (!active) return;
        setSessionState({
          status: "error",
          error: error instanceof Error ? error.message : "Order status could not be loaded."
        });
      });
    return () => {
      active = false;
    };
  }, []);

  if (sessionState.status === "checking" || (sessionState.status === "local" && !persistenceReady)) {
    return <div className="empty-panel"><h2>Loading order status</h2><p>Checking the latest payment session.</p></div>;
  }

  if (sessionState.status === "error") {
    return <div className="empty-panel"><h2>Order status is unavailable</h2><p>{sessionState.error}</p><Link className="button button-primary" href="/checkout">Return to checkout</Link></div>;
  }

  if (sessionState.status === "success" && session) {
    return (
      <div className="two-column-page">
        <section className="summary-panel">
          <h2>Payment session {session.id}</h2>
          <p className="product-meta">Status: {session.status}</p>
          <div className="timeline">
            <div className="timeline-row">
              <CheckCircle2 size={22} strokeWidth={2.2} />
              <span><strong>Inventory reserved</strong><small>Reservation expires {new Date(session.expiresAt).toLocaleString("en-CA")}.</small></span>
            </div>
            <div className="timeline-row">
              {session.status === "paid" ? <CheckCircle2 size={22} strokeWidth={2.2} /> : <Circle size={22} strokeWidth={2.2} />}
              <span><strong>Payment confirmation</strong><small>{session.status === "paid" ? "Payment has been confirmed." : "Payment confirmation has not been received yet."}</small></span>
            </div>
          </div>
        </section>
        <aside className="summary-panel">
          <h2>Session total</h2>
          <div className="spec-list"><div className="spec-row"><strong>Total</strong><span>{formatCad(session.total.amount)}</span></div></div>
          <Link className="button button-secondary" href="/products">Continue shopping</Link>
        </aside>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty-panel">
        <h2>Order not found</h2>
        <p>No order or payment-session query was found for this static route.</p>
        <Link className="button button-primary" href="/products">
          Shop Products
        </Link>
      </div>
    );
  }

  return (
    <div className="two-column-page">
      <section className="summary-panel">
        <h2>Order {order.id}</h2>
        <p className="product-meta">
          {order.dealerName} - {order.fulfillment} - {order.paymentMethod.toUpperCase()}
        </p>
        <div className="timeline">
          {order.timeline.map((item) => (
            <div className="timeline-row" key={item.label}>
              {item.complete ? (
                <CheckCircle2 size={22} strokeWidth={2.2} />
              ) : (
                <Circle size={22} strokeWidth={2.2} />
              )}
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <aside className="summary-panel">
        <h2>Items</h2>
        <div className="mini-lines">
          {order.items.map((item) => (
            <div className="mini-line" key={item.product.id}>
              <span>{item.product.name}</span>
              <strong>
                {item.quantity} x {formatCad(getEffectivePrice(item.product).amount)}
              </strong>
            </div>
          ))}
        </div>
        <div className="spec-list">
          <div className="spec-row">
            <strong>Total</strong>
            <span>{formatCad(order.subtotal)}</span>
          </div>
        </div>
        <Link className="button button-secondary" href="/products">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
