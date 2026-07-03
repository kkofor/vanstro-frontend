"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { getEffectivePrice } from "@/lib/commerce/product-commerce";

function formatCad(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount);
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { getOrder } = useStorefront();
  const order = getOrder(orderId);

  if (!order) {
    return (
      <div className="empty-panel">
        <h2>Order not found</h2>
        <p>This local demo keeps orders in this browser. Create a checkout order to see the status timeline.</p>
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
