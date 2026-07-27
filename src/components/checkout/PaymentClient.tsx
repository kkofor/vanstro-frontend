"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  readCheckoutPaymentMeta,
  readGuestOrderToken,
  storeGuestOrderToken
} from "@/components/checkout/CheckoutClient";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { vanstroApi } from "@/lib/api/api-client";
import type { CheckoutSession } from "@/lib/api/api-contract";
import { formatMoney } from "@/lib/commerce/product-commerce";
import { localizeApiError } from "@/lib/i18n/api-error-localization";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

type MonerisCheckout = {
  setMode: (mode: string) => void;
  setTicket: (ticket: string) => void;
  setCallback: (callback: (event: { response_code?: string; ticket?: string }) => void) => void;
  startCheckout: (divId?: string) => void;
};

declare global {
  interface Window {
    monerisCheckout?: new () => MonerisCheckout;
  }
}

const MONERIS_SCRIPT =
  process.env.NEXT_PUBLIC_MONERIS_CHECKOUT_JS ??
  "https://gatewayt.moneris.com/chkt/js/chkt_v1.00.js";

export function PaymentClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const router = useRouter();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const [sessionId, setSessionId] = useState("");
  const [token, setToken] = useState("");
  const [session, setSession] = useState<CheckoutSession>();
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [monerisReady, setMonerisReady] = useState(false);
  const paymentMeta = sessionId ? readCheckoutPaymentMeta(sessionId) : undefined;
  const simulationEnabled = process.env.NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION === "true";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextSessionId = params.get("session") ?? "";
    const queryToken = params.get("token") ?? "";
    if (nextSessionId && queryToken) storeGuestOrderToken(nextSessionId, queryToken);
    setSessionId(nextSessionId);
    setToken(nextSessionId ? queryToken || readGuestOrderToken(nextSessionId) : "");
    if (queryToken) {
      params.delete("token");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !token) return;
    let active = true;
    void vanstroApi.getPaymentSession(sessionId, token)
      .then((response) => {
        if (!active) return;
        setSession(response.data);
      })
      .catch((error) => {
        if (!active) return;
        setMessage(localizeApiError(error, locale, copy.payment.unavailableTitle));
      });
    return () => {
      active = false;
    };
  }, [sessionId, token, locale, copy.payment.unavailableTitle]);

  useEffect(() => {
    if (!session || session.paymentMethod !== "card" || !paymentMeta?.ticket || paymentMeta.provider === "demo") return;
    if (window.monerisCheckout) {
      setMonerisReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = MONERIS_SCRIPT;
    script.async = true;
    script.onload = () => setMonerisReady(true);
    script.onerror = () => setMessage(copy.payment.cardUnavailable);
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [session, paymentMeta?.ticket, copy.payment.cardUnavailable]);

  async function redirectToOrder(orderId: string) {
    if (token) storeGuestOrderToken(orderId, token);
    router.push(localeHref(`/orders/${orderId}`, locale));
  }

  async function completePayment(input: { providerPaymentId?: string; ticket?: string; signature?: string }) {
    if (!sessionId) return;
    setProcessing(true);
    setMessage("");
    try {
      const result = await vanstroApi.confirmPayment(
        { sessionId, status: "paid", providerPaymentId: input.providerPaymentId, ticket: input.ticket },
        input.signature ? { signature: input.signature } : undefined
      );
      setMessage(copy.payment.successRedirect);
      await redirectToOrder(result.data.id);
    } catch (error) {
      setMessage(localizeApiError(error, locale, copy.payment.unavailableTitle));
      setProcessing(false);
    }
  }

  async function startCardPayment() {
    if (paymentMeta?.provider === "demo" && paymentMeta.ticket) {
      await completePayment({ ticket: paymentMeta.ticket });
      return;
    }
    if (!paymentMeta?.ticket || !window.monerisCheckout) {
      setMessage(copy.payment.cardUnavailable);
      return;
    }
    const checkout = new window.monerisCheckout();
    checkout.setMode(process.env.NEXT_PUBLIC_MONERIS_ENVIRONMENT === "prod" ? "prod" : "qa");
    checkout.setTicket(paymentMeta.ticket);
    checkout.setCallback((event) => {
      if (event.response_code === "001" || event.ticket) {
        void completePayment({ ticket: event.ticket ?? paymentMeta.ticket });
      }
    });
    checkout.startCheckout("moneris-checkout");
  }

  async function simulateInStorePayment() {
    if (!sessionId) return;
    setProcessing(true);
    try {
      const simulation = await vanstroApi.simulatePayment(sessionId);
      await completePayment({
        providerPaymentId: simulation.data.providerPaymentId,
        signature: simulation.data.signature
      });
    } catch (error) {
      setMessage(localizeApiError(error, locale, copy.payment.unavailableTitle));
      setProcessing(false);
    }
  }

  if (!sessionId || !token) {
    return (
      <div className="empty-panel">
        <h2>{copy.payment.unavailableTitle}</h2>
        <Link className="button button-primary" href={localeHref("/checkout", locale)}>{copy.payment.returnToCheckout}</Link>
      </div>
    );
  }

  if (!session) {
    return <div className="empty-panel"><h2>{copy.payment.loadingTitle}</h2><p>{message || copy.payment.loadingBody}</p></div>;
  }

  if (
    session.status === "expired" ||
    session.status === "failed" ||
    session.status === "refund_failed"
  ) {
    return (
      <div className="empty-panel">
        <h2>{copy.payment.sessionExpired}</h2>
        <Link className="button button-primary" href={localeHref("/checkout", locale)}>{copy.payment.returnToCheckout}</Link>
      </div>
    );
  }

  if (session.status === "paid") {
    return (
      <div className="empty-panel">
        <h2>{copy.order.paymentConfirmed}</h2>
        <p>{copy.payment.successRedirect}</p>
      </div>
    );
  }

  return (
    <div className="two-column-page">
      <section className="summary-panel">
        <h2>{copy.payment.summary}</h2>
        <p className="product-meta">
          {copy.order.fulfillment[session.fulfillment]} — {copy.order.paymentMethod[session.paymentMethod]}
        </p>
        <div className="spec-list">
          <div className="spec-row"><strong>{copy.common.subtotal}</strong><span>{formatMoney(session.subtotal, locale)}</span></div>
          <div className="spec-row"><strong>{copy.checkout.tax}</strong><span>{formatMoney(session.tax, locale)}</span></div>
          <div className="spec-row"><strong>{copy.checkout.shipping}</strong><span>{formatMoney(session.shipping, locale)}</span></div>
          <div className="spec-row"><strong>{copy.common.total}</strong><span>{formatMoney(session.total, locale)}</span></div>
        </div>
        {session.paymentMethod === "card" ? (
          <>
            {paymentMeta?.provider === "demo" ? (
              <p className="quantity-limit-note" role="status">Demo payment — no real card will be charged.</p>
            ) : null}
            <div id="moneris-checkout" />
            <button className="button button-primary" type="button" disabled={(paymentMeta?.provider !== "demo" && !monerisReady) || processing} onClick={() => void startCardPayment()}>
              {processing ? copy.payment.processing : copy.payment.payNow}
            </button>
          </>
        ) : (
          <>
            <h3>{copy.payment.inStoreTitle}</h3>
            <p>{copy.payment.inStoreBody}</p>
            <p><strong>{copy.payment.inStoreReference}</strong> {session.id}</p>
            {simulationEnabled ? (
              <button className="button button-secondary" type="button" disabled={processing} onClick={() => void simulateInStorePayment()}>
                {copy.payment.simulatePayment}
              </button>
            ) : null}
          </>
        )}
        {message ? <p role="alert">{message}</p> : null}
      </section>
      <aside className="summary-panel">
        <p>{copy.checkout.inventoryValue}</p>
        <Link className="button button-secondary" href={localeHref("/checkout", locale)}>{copy.payment.returnToCheckout}</Link>
      </aside>
    </div>
  );
}
