"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import type { CommerceOrder } from "@/lib/api/api-contract";
import { vanstroApi } from "@/lib/api/api-client";
import { formatMoney, getEffectivePrice } from "@/lib/commerce/product-commerce";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { localizeApiError } from "@/lib/i18n/api-error-localization";
import { readGuestOrderToken, storeGuestOrderToken } from "./CheckoutClient";

export function OrderDetailClient({ orderId, locale: explicitLocale }: { orderId: string; locale?: SiteLocale }) {
  const { getOrder: getLocalOrder, persistenceReady } = useStorefront();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const [remoteOrder, setRemoteOrder] = useState<CommerceOrder | null>(null);
  const [sessionState, setSessionState] = useState<{
    status: "checking" | "success" | "error" | "local";
    error?: string;
  }>({ status: "checking" });
  const localOrder = getLocalOrder(orderId);
  const customerSession = useCustomerSession();
  const [guestToken, setGuestToken] = useState<string>();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const queryToken = query.get("token") ?? "";
    if (queryToken) storeGuestOrderToken(orderId, queryToken);
    setGuestToken(queryToken || readGuestOrderToken(orderId) || undefined);
    if (queryToken) {
      query.delete("token");
      const nextQuery = query.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
    }
  }, [orderId]);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    async function loadOrder() {
      try {
        const response = await vanstroApi.getOrder(orderId, guestToken);
        if (!active) return;
        setRemoteOrder(response.data);
        setSessionState({ status: "success" });
        if (response.data.status !== "paid") {
          timer = window.setTimeout(() => void loadOrder(), 3000);
        }
      } catch (error) {
        if (!active) return;
        if (customerSession.status === "authenticated") {
          try {
            const accountOrder = await vanstroApi.getAccountOrder(orderId);
            if (!active) return;
            setRemoteOrder(accountOrder.data);
            setSessionState({ status: "success" });
            return;
          } catch {
            // fall through
          }
        }
        const query = new URLSearchParams(window.location.search);
        const sessionId = query.get("session");
        const token = query.get("token");
        if (sessionId && token) {
          try {
            const session = await vanstroApi.getPaymentSession(sessionId, token);
            if (!active) return;
            if (session.data.status === "paid") {
              const paidOrder = await vanstroApi.getOrder(orderId, token);
              if (!active) return;
              setRemoteOrder(paidOrder.data);
              setSessionState({ status: "success" });
              return;
            }
            setSessionState({ status: "success" });
            timer = window.setTimeout(() => void loadOrder(), 3000);
            return;
          } catch {
            // fall through
          }
        }
        setSessionState({
          status: "error",
          error: localizeApiError(error, locale, copy.order.unavailableTitle)
        });
      }
    }

    void loadOrder();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, guestToken, customerSession.status, locale, copy.order.unavailableTitle]);

  if (sessionState.status === "checking" || (sessionState.status === "local" && !persistenceReady)) {
    return <div className="empty-panel"><h2>{copy.order.loadingTitle}</h2><p>{copy.order.loadingBody}</p></div>;
  }

  if (sessionState.status === "error") {
    return (
      <div className="empty-panel">
        <h2>{copy.order.unavailableTitle}</h2>
        <p role="alert">{sessionState.error}</p>
        <Link className="button button-primary" href={localeHref("/orders/lookup", locale)}>{copy.lookup.submit}</Link>
      </div>
    );
  }

  const order = remoteOrder;
  if (!order && localOrder) {
    return (
      <div className="two-column-page">
        <section className="summary-panel">
          <h2>{copy.order.order} {localOrder.id}</h2>
          <p className="product-meta">
            {localOrder.dealerName} - {copy.order.fulfillment[localOrder.fulfillment]} - {copy.order.paymentMethod[localOrder.paymentMethod as keyof typeof copy.order.paymentMethod] ?? localOrder.paymentMethod}
          </p>
          <div className="timeline">
            {localOrder.timeline.map((item) => (
              <div className="timeline-row" key={item.label}>
                {item.complete ? <CheckCircle2 size={22} strokeWidth={2.2} /> : <Circle size={22} strokeWidth={2.2} />}
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </div>
            ))}
          </div>
        </section>
        <aside className="summary-panel">
          <h2>{copy.order.items}</h2>
          <div className="mini-lines">
            {localOrder.items.map((item) => (
              <div className="mini-line" key={item.product.id}>
                <span>{item.product.name}</span>
                <strong>{item.quantity} {copy.order.unitSeparator} {formatMoney(getEffectivePrice(item.product), locale)}</strong>
              </div>
            ))}
          </div>
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

  const paymentLabel = order.paymentMethod && order.paymentMethod in copy.order.paymentMethod
    ? copy.order.paymentMethod[order.paymentMethod as keyof typeof copy.order.paymentMethod]
    : order.paymentMethod;

  const timelineEvents = (order.statusEvents ?? []).length > 0
    ? order.statusEvents!
    : [{ id: "paid", status: order.status, source: "order", createdAt: order.createdAt }];

  return (
    <div className="two-column-page">
      <section className="summary-panel">
        <h2>{copy.order.order} {order.id}</h2>
        <p className="product-meta">
          {copy.order.statusLabels[order.status as keyof typeof copy.order.statusLabels] ?? order.status}
          {" — "}
          {copy.order.fulfillment[order.fulfillment as keyof typeof copy.order.fulfillment] ?? order.fulfillment}
          {paymentLabel ? ` — ${paymentLabel}` : ""}
        </p>
        {order.shippingAddress ? (
          <p>
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
            , {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
          </p>
        ) : null}
        {order.shipment ? (
          <div className="spec-list">
            <div className="spec-row">
              <strong>{copy.order.tracking}</strong>
              <span>{copy.order.statusLabels[order.shipment.status as keyof typeof copy.order.statusLabels] ?? order.shipment.status}</span>
            </div>
            {order.shipment.trackingNumber ? (
              <div className="spec-row">
                <strong>{copy.order.trackingNumber}</strong>
                <span>{order.shipment.trackingNumber}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <h3>{copy.order.statusHistory}</h3>
        <div className="timeline">
          {timelineEvents.map((event, index) => {
            const complete = index === timelineEvents.length - 1 || event.status === order.status;
            const label = copy.order.statusLabels[event.status as keyof typeof copy.order.statusLabels] ?? event.status;
            return (
              <div className="timeline-row" key={event.id}>
                {complete ? <CheckCircle2 size={22} strokeWidth={2.2} /> : <Circle size={22} strokeWidth={2.2} />}
                <span>
                  <strong>{label}</strong>
                  <small>{new Date(event.createdAt).toLocaleString(locale)} · {event.source}</small>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <aside className="summary-panel">
        <h2>{copy.order.items}</h2>
        <div className="mini-lines">
          {order.items.map((item) => (
            <div className="mini-line" key={`${item.skuCode}-${item.productName}`}>
              <span>{item.productName}</span>
              <strong>{item.quantity} {copy.order.unitSeparator} {item.unitPrice ? formatMoney(item.unitPrice, locale) : item.skuCode}</strong>
            </div>
          ))}
        </div>
        <div className="spec-list">
          {order.subtotal ? <div className="spec-row"><strong>{copy.common.subtotal}</strong><span>{formatMoney(order.subtotal, locale)}</span></div> : null}
          {order.tax ? <div className="spec-row"><strong>{copy.checkout.tax}</strong><span>{formatMoney(order.tax, locale)}</span></div> : null}
          {order.shipping ? <div className="spec-row"><strong>{copy.checkout.shipping}</strong><span>{formatMoney(order.shipping, locale)}</span></div> : null}
          <div className="spec-row"><strong>{copy.common.total}</strong><span>{formatMoney(order.total, locale)}</span></div>
        </div>
        <Link className="button button-secondary" href={localeHref("/products", locale)}>
          {copy.common.continueShopping}
        </Link>
      </aside>
    </div>
  );
}
