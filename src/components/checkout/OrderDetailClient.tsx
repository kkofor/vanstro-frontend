"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { CommercePageSkeleton, CommerceStatePanel } from "@/components/ui/CommerceStatePanel";
import { useEffect, useState } from "react";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import type { CommerceOrder } from "@/lib/api/api-contract";
import { vanstroApi } from "@/lib/api/api-client";
import { formatMoney } from "@/lib/commerce/product-commerce";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";
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
  const [reloadKey, setReloadKey] = useState(0);

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
        if (!["fulfilled", "delivered", "cancelled", "expired", "failed", "refunded", "refund_failed"].includes(response.data.status)) {
          timer = window.setTimeout(() => void loadOrder(), 5000);
        }
      } catch (error) {
        if (!active) return;
        if (customerSession.status === "authenticated") {
          try {
            const accountOrder = await vanstroApi.getAccountOrder(orderId);
            if (!active) return;
            setRemoteOrder(accountOrder.data);
            setSessionState({ status: "success" });
            if (!["fulfilled", "delivered", "cancelled", "expired", "failed", "refunded", "refund_failed"].includes(accountOrder.data.status)) {
              timer = window.setTimeout(() => void loadOrder(), 5000);
            }
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

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") {
        if (timer) window.clearTimeout(timer);
        timer = undefined;
        return;
      }
      if (timer) window.clearTimeout(timer);
      void loadOrder();
    };
    void loadOrder();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [orderId, guestToken, customerSession.status, locale, copy.order.unavailableTitle, reloadKey]);

  if (sessionState.status === "checking" || (sessionState.status === "local" && !persistenceReady)) {
    return <CommercePageSkeleton rows={2} label={copy.order.loadingTitle} />;
  }

  if (sessionState.status === "error") {
    return (
      <CommerceStatePanel
        tone="error"
        title={copy.order.unavailableTitle}
        body={sessionState.error}
        actions={(
          <>
            <button className="button button-primary" type="button" onClick={() => {
              setSessionState({ status: "checking" });
              setReloadKey((current) => current + 1);
            }}>{copy.order.retry}</button>
            <Link className="button button-secondary" href={localeHref("/orders/lookup", locale)}>{copy.lookup.title}</Link>
          </>
        )}
      />
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
                <span>{item.product.name}<small>{copy.order.sku} {item.product.sku}</small></span>
                <strong>{locale === "fr-CA" ? `Qté ${item.quantity}` : `Qty ${item.quantity}`}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  if (!order) {
    return (
      <CommerceStatePanel
        title={copy.order.notFoundTitle}
        body={copy.order.notFoundBody}
        actions={(
          <>
            <Link className="button button-primary" href={localeHref("/orders/lookup", locale)}>{copy.lookup.title}</Link>
            <Link className="button button-secondary" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>{copy.common.shopProducts}</Link>
          </>
        )}
      />
    );
  }

  const paymentLabel = order.paymentMethod && order.paymentMethod in copy.order.paymentMethod
    ? copy.order.paymentMethod[order.paymentMethod as keyof typeof copy.order.paymentMethod]
    : locale === "fr-CA" ? "Mode de paiement non disponible" : "Payment method unavailable";

  const timelineEvents = order.statusEvents ?? [];

  const statusLabel = copy.order.statusLabels[order.status as keyof typeof copy.order.statusLabels] ?? (locale === "fr-CA" ? "État non disponible" : "Status unavailable");
  const fulfillmentLabel = copy.order.fulfillment[order.fulfillment as keyof typeof copy.order.fulfillment] ?? (locale === "fr-CA" ? "Détails d’exécution non disponibles" : "Fulfillment details unavailable");

  return (
    <div className="order-detail-layout">
      <section className="order-detail-main">
        <header className="order-detail-header">
          <div><span>{copy.order.order}</span><h2>{order.id}</h2><p>{copy.order.placedOn} {new Date(order.createdAt).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</p></div>
          <span className={`status-badge status-${order.status}`}>{statusLabel}</span>
        </header>
        <dl className="order-detail-facts">
          <div><dt>{copy.order.placedOn}</dt><dd>{new Date(order.createdAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}</dd></div>
          <div><dt>{copy.order.fulfillmentDetails}</dt><dd>{fulfillmentLabel}</dd></div>
          <div><dt>{copy.order.paymentDetails}</dt><dd>{paymentLabel}</dd></div>
        </dl>
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
        {timelineEvents.length > 0 ? (
          <div className="timeline order-event-log">
            {timelineEvents.map((event) => {
              const label = copy.order.statusLabels[event.status as keyof typeof copy.order.statusLabels] ?? (locale === "fr-CA" ? "Mise à jour de la commande" : "Order update");
              return (
                <div className="timeline-row" key={event.id}>
                  <CheckCircle2 size={22} strokeWidth={2.2} />
                  <span>
                    <strong>{label}</strong>
                    <small>{new Date(event.createdAt).toLocaleString(locale)}</small>
                  </span>
                </div>
              );
            })}
          </div>
        ) : <p className="order-history-empty">{locale === "fr-CA" ? "Aucun historique détaillé n’est encore disponible." : "Detailed status history is not available yet."}</p>}
      </section>
      <aside className="summary-panel order-detail-summary">
        <h2>{copy.order.orderSummary}</h2>
        <div className="mini-lines">
          {order.items.map((item) => (
            <div className="mini-line order-summary-line" key={`${item.skuCode}-${item.productName}`}>
              <span><strong>{item.productName}</strong><small>{copy.order.sku} {item.skuCode} · {locale === "fr-CA" ? "Qté" : "Qty"} {item.quantity}</small></span>
              <strong>{item.lineTotal
                ? formatMoney(item.lineTotal, locale)
                : item.unitPrice
                  ? `${item.quantity} ${copy.order.unitSeparator} ${formatMoney(item.unitPrice, locale)}`
                  : ""}</strong>
            </div>
          ))}
        </div>
        <div className="spec-list">
          {order.subtotal !== undefined ? <div className="spec-row"><strong>{copy.common.subtotal}</strong><span>{formatMoney(order.subtotal, locale)}</span></div> : null}
          {order.tax !== undefined ? <div className="spec-row"><strong>{copy.checkout.tax}</strong><span>{formatMoney(order.tax, locale)}</span></div> : null}
          {order.shipping !== undefined ? <div className="spec-row"><strong>{copy.checkout.shipping}</strong><span>{formatMoney(order.shipping, locale)}</span></div> : null}
          <div className="spec-row"><strong>{copy.common.total}</strong><span>{formatMoney(order.total, locale)}</span></div>
        </div>
        <Link className="button button-secondary" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>
          {copy.common.continueShopping}
        </Link>
      </aside>
    </div>
  );
}
