"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import type { CheckoutSession } from "@/lib/api/api-contract";
import { vanstroApi } from "@/lib/api/api-client";
import { formatMoney, getEffectivePrice } from "@/lib/commerce/product-commerce";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { localizeApiError } from "@/lib/i18n/api-error-localization";


export function OrderDetailClient({ orderId, locale: explicitLocale }: { orderId: string; locale?: SiteLocale }) {
  const { getOrder, persistenceReady } = useStorefront();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
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
          error: localizeApiError(error, locale, copy.order.unavailableTitle)
        });
      });
    return () => {
      active = false;
    };
  }, []);

  if (sessionState.status === "checking" || (sessionState.status === "local" && !persistenceReady)) {
    return <div className="empty-panel"><h2>{copy.order.loadingTitle}</h2><p>{copy.order.loadingBody}</p></div>;
  }

  if (sessionState.status === "error") {
    return <div className="empty-panel"><h2>{copy.order.unavailableTitle}</h2><p role="alert">{sessionState.error}</p><Link className="button button-primary" href={localeHref("/checkout", locale)}>{copy.order.returnToCheckout}</Link></div>;
  }

  if (sessionState.status === "success" && session) {
    return (
      <div className="two-column-page">
        <section className="summary-panel">
          <h2>{copy.order.session} {session.id}</h2>
          <p className="product-meta">
            {copy.order.status}: {copy.order.statusLabels[session.status as keyof typeof copy.order.statusLabels] ?? session.status}
          </p>
          <div className="timeline">
            <div className="timeline-row">
              <CheckCircle2 size={22} strokeWidth={2.2} />
              <span><strong>{copy.order.inventoryReserved}</strong><small>{copy.order.reservationExpires(new Date(session.expiresAt).toLocaleString(locale))}</small></span>
            </div>
            <div className="timeline-row">
              {session.status === "paid" ? <CheckCircle2 size={22} strokeWidth={2.2} /> : <Circle size={22} strokeWidth={2.2} />}
              <span><strong>{copy.order.paymentConfirmation}</strong><small>{session.status === "paid" ? copy.order.paymentConfirmed : copy.order.paymentPending}</small></span>
            </div>
          </div>
        </section>
        <aside className="summary-panel">
          <h2>{copy.order.sessionTotal}</h2>
          <div className="spec-list"><div className="spec-row"><strong>{copy.common.total}</strong><span>{formatMoney(session.total, locale)}</span></div></div>
          <Link className="button button-secondary" href={localeHref("/products", locale)}>{copy.common.continueShopping}</Link>
        </aside>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty-panel">
        <h2>{copy.order.notFoundTitle}</h2>
        <p>{copy.order.notFoundBody}</p>
        <Link className="button button-primary" href={localeHref("/products", locale)}>
          {copy.common.shopProducts}
        </Link>
      </div>
    );
  }

  return (
    <div className="two-column-page">
      <section className="summary-panel">
        <h2>{copy.order.order} {order.id}</h2>
        <p className="product-meta">
          {order.dealerName} - {copy.order.fulfillment[order.fulfillment]} - {copy.order.paymentMethod[order.paymentMethod]}
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
        <h2>{copy.order.items}</h2>
        <div className="mini-lines">
          {order.items.map((item) => (
            <div className="mini-line" key={item.product.id}>
              <span>{item.product.name}</span>
              <strong>
                {item.quantity} {copy.order.unitSeparator} {formatMoney(getEffectivePrice(item.product), locale)}
              </strong>
            </div>
          ))}
        </div>
        <div className="spec-list">
          <div className="spec-row">
            <strong>{copy.common.total}</strong>
            <span>{formatMoney({ amount: order.subtotal, currency: "CAD" }, locale)}</span>
          </div>
        </div>
        <Link className="button button-secondary" href={localeHref("/products", locale)}>
          {copy.common.continueShopping}
        </Link>
      </aside>
    </div>
  );
}
