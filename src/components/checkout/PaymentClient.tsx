"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Clock3, CreditCard, MapPin, PackageCheck, ShieldCheck, Store } from "lucide-react";
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
import { applyAcceptedPaymentConfirmation } from "./payment-confirmation-state";
import { PaymentSessionPoller, paymentTerminalAnnouncement } from "./payment-session-poller";
import { PaymentTerminalLiveRegion } from "./payment-terminal-live-region";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

type MonerisCheckoutEvent = { ticket?: string };

type MonerisCheckout = {
  setMode: (mode: string) => void;
  setCheckoutDiv: (divId: string) => void;
  setCallback: (event: string, callback: (payload?: MonerisCheckoutEvent) => void) => void;
  startCheckout: (ticket: string) => void;
  closeCheckout?: (ticket: string) => void;
};

declare global {
  interface Window {
    monerisCheckout?: new () => MonerisCheckout;
  }
}

const MONERIS_SCRIPT =
  process.env.NEXT_PUBLIC_MONERIS_CHECKOUT_JS ??
  "https://gatewayt.moneris.com/chktv2/js/chkt_v3.00.min.js";

export function PaymentClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const [sessionId, setSessionId] = useState("");
  const [token, setToken] = useState("");
  const [session, setSession] = useState<CheckoutSession>();
  const [sessionLoadError, setSessionLoadError] = useState("");
  const [sessionRetrying, setSessionRetrying] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionMessageTone, setActionMessageTone] = useState<"error" | "status">("status");
  const [processing, setProcessing] = useState(false);
  const [monerisReady, setMonerisReady] = useState(false);
  const [now, setNow] = useState(0);
  const [terminalAnnouncement, setTerminalAnnouncement] = useState("");
  const pollerRef = useRef<PaymentSessionPoller | undefined>(undefined);
  const previousStatusRef = useRef<CheckoutSession["status"] | undefined>(undefined);
  const terminalHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingTerminalRef = useRef<CheckoutSession["status"] | undefined>(undefined);
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
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sessionId || !token) return;
    const poller = new PaymentSessionPoller({
      load: async () => (await vanstroApi.getPaymentSession(sessionId, token)).data,
      onSession: (nextSession) => {
        setSession(nextSession);
        setSessionLoadError("");
        setSessionRetrying(false);
        setManualChecking(false);
      },
      onError: (error, retrying) => {
        setSessionLoadError(localizeApiError(error, locale, copy.payment.unavailableTitle));
        setSessionRetrying(retrying);
        setManualChecking(false);
      }
    });
    pollerRef.current = poller;
    const refreshWhenVisible = () => poller.setVisible(document.visibilityState === "visible");
    poller.setVisible(document.visibilityState === "visible");
    poller.start();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      poller.stop();
      if (pollerRef.current === poller) pollerRef.current = undefined;
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [sessionId, token, locale, copy.payment.unavailableTitle]);

  useEffect(() => {
    if (session?.status === "paid" && session.orderId && token) {
      storeGuestOrderToken(session.orderId, token);
    }
  }, [session?.orderId, session?.status, token]);

  useEffect(() => {
    const status = session?.status;
    const previousStatus = previousStatusRef.current;
    if (status) previousStatusRef.current = status;
    if (previousStatus !== "pending" || (status !== "expired" && status !== "failed")) return;
    if (document.visibilityState !== "visible") {
      pendingTerminalRef.current = status;
      return;
    }
    setTerminalAnnouncement(paymentTerminalAnnouncement(locale, status));
    requestAnimationFrame(() => terminalHeadingRef.current?.focus());
  }, [locale, session?.status]);

  useEffect(() => {
    const announceWhenVisible = () => {
      const status = pendingTerminalRef.current;
      if (document.visibilityState !== "visible" || (status !== "expired" && status !== "failed")) return;
      pendingTerminalRef.current = undefined;
      setTerminalAnnouncement(paymentTerminalAnnouncement(locale, status));
      requestAnimationFrame(() => terminalHeadingRef.current?.focus());
    };
    document.addEventListener("visibilitychange", announceWhenVisible);
    return () => document.removeEventListener("visibilitychange", announceWhenVisible);
  }, [locale]);

  useEffect(() => {
    if (!session || session.paymentMethod !== "card" || !paymentMeta?.ticket || paymentMeta.provider === "demo") return;
    if (window.monerisCheckout) {
      setMonerisReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = MONERIS_SCRIPT;
    script.async = true;
    script.onload = () => {
      setMonerisReady(true);
      setActionMessage((current) => current === copy.payment.cardUnavailable ? "" : current);
    };
    script.onerror = () => {
      setActionMessageTone("error");
      setActionMessage(copy.payment.cardUnavailable);
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [session, paymentMeta?.ticket, copy.payment.cardUnavailable]);

  async function redirectToOrder(orderId: string) {
    if (token) storeGuestOrderToken(orderId, token);
    const query = new URLSearchParams({ order: orderId });
    window.location.assign(`${localeHref("/orders/lookup", locale)}?${query.toString()}`);
  }

  async function completePayment(input: { providerPaymentId?: string; ticket?: string; signature?: string }) {
    if (!sessionId) return;
    setProcessing(true);
    setActionMessage("");
    setActionMessageTone("status");
    try {
      const result = await vanstroApi.confirmPayment(
        { sessionId, status: "paid", providerPaymentId: input.providerPaymentId, ticket: input.ticket },
        input.signature ? { signature: input.signature } : undefined
      );
      if ("accepted" in result.data) {
        applyAcceptedPaymentConfirmation({
          setSession,
          setActionMessage,
          setProcessing,
          confirmationPendingMessage: copy.payment.confirmationPending
        });
        return;
      }
      setActionMessage(copy.payment.successRedirect);
      await redirectToOrder(result.data.id);
    } catch (error) {
      setActionMessageTone("error");
      setActionMessage(localizeApiError(error, locale, copy.payment.unavailableTitle));
      setProcessing(false);
    }
  }

  async function startCardPayment() {
    setActionMessage("");
    setActionMessageTone("status");
    if (paymentMeta?.provider === "demo" && paymentMeta.ticket) {
      await completePayment({ ticket: paymentMeta.ticket });
      return;
    }
    if (!paymentMeta?.ticket || !window.monerisCheckout) {
      setActionMessageTone("error");
      setActionMessage(copy.payment.cardUnavailable);
      return;
    }
    setProcessing(true);
    const checkout = new window.monerisCheckout();
    checkout.setMode(process.env.NEXT_PUBLIC_MONERIS_ENVIRONMENT === "prod" ? "prod" : "qa");
    checkout.setCheckoutDiv("moneris-checkout");
    let completing = false;
    const finalize = (event?: MonerisCheckoutEvent) => {
      if (completing) return;
      completing = true;
      void completePayment({ ticket: event?.ticket ?? paymentMeta.ticket });
    };
    checkout.setCallback("cancel_transaction", () => setProcessing(false));
    checkout.setCallback("page_closed", () => setProcessing(false));
    checkout.setCallback("payment_receipt", finalize);
    checkout.setCallback("payment_complete", finalize);
    checkout.startCheckout(paymentMeta.ticket);
  }

  async function simulateInStorePayment() {
    if (!sessionId) return;
    setActionMessage("");
    setActionMessageTone("status");
    setProcessing(true);
    try {
      const simulation = await vanstroApi.simulatePayment(sessionId);
      await completePayment({
        providerPaymentId: simulation.data.providerPaymentId,
        signature: simulation.data.signature
      });
    } catch (error) {
      setActionMessageTone("error");
      setActionMessage(localizeApiError(error, locale, copy.payment.unavailableTitle));
      setProcessing(false);
    }
  }

  const remainingMs = session && now ? Math.max(0, new Date(session.expiresAt).getTime() - now) : 0;
  const remainingMinutes = now ? Math.ceil(remainingMs / 60000) : 30;
  const expiresAt = session
    ? new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(session.expiresAt))
    : "";
  const french = locale === "fr-CA";

  if (!sessionId || !token) {
    return (
      <div className="empty-panel">
        <h2>{copy.payment.unavailableTitle}</h2>
        <Link className="button button-primary" href={localeHref("/checkout", locale)}>{copy.payment.returnToCheckout}</Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="empty-panel">
        <h2>{sessionLoadError ? copy.payment.unavailableTitle : copy.payment.loadingTitle}</h2>
        <p role={sessionLoadError ? "alert" : "status"}>{sessionLoadError || copy.payment.loadingBody}</p>
        {sessionLoadError ? (
          <div className="empty-panel-actions">
            <button className="button button-primary" type="button" aria-disabled={sessionRetrying || manualChecking} onClick={() => {
              if (sessionRetrying || manualChecking) return;
              setManualChecking(true);
              pollerRef.current?.retry();
            }}>{sessionRetrying || manualChecking ? (french ? "Nouvelle vérification…" : "Checking again…") : copy.common.retry}</button>
            <Link className="button button-secondary" href={localeHref("/checkout", locale)}>{copy.payment.returnToCheckout}</Link>
          </div>
        ) : null}
      </div>
    );
  }

  if (session.status === "expired" || session.status === "failed") {
    const failed = session.status === "failed";
    return (
      <div className="empty-panel payment-terminal-state">
        <PaymentTerminalLiveRegion announcement={terminalAnnouncement} />
        <h2 ref={terminalHeadingRef} tabIndex={-1}>{failed
          ? french ? "Le paiement n’a pas pu être préparé" : "Payment could not be prepared"
          : copy.payment.sessionExpired}</h2>
        <p>{failed
          ? french ? "La réservation a été libérée. Retournez à la caisse pour vérifier les choix et recommencer." : "The reservation was released. Return to checkout to review your choices and try again."
          : french ? "La réservation a expiré. Retournez à la caisse pour vérifier le stock de nouveau." : "The reservation expired. Return to checkout to check inventory again."}</p>
        <Link className="button button-primary" href={localeHref("/checkout", locale)}>{copy.payment.returnToCheckout}</Link>
      </div>
    );
  }

  if (session.status === "paid") {
    return (
      <div className="empty-panel">
        <h2>{copy.order.paymentConfirmed}</h2>
        <p>{copy.payment.successRedirect}</p>
        {session.orderId ? (
          <Link className="button button-primary" href={`${localeHref("/orders/lookup", locale)}?order=${encodeURIComponent(session.orderId)}`}>
            {copy.payment.viewOrder}
          </Link>
        ) : null}
      </div>
    );
  }

  if (["reconciliation_required", "refund_pending", "refund_processing", "refunded", "refund_failed"].includes(session.status)) {
    const statusCopy = session.status === "reconciliation_required"
      ? { title: copy.payment.reconciliationTitle, body: copy.payment.reconciliationBody }
      : session.status === "refund_pending" || session.status === "refund_processing"
        ? { title: copy.payment.refundPendingTitle, body: copy.payment.refundPendingBody }
        : session.status === "refunded"
          ? { title: copy.payment.refundedTitle, body: copy.payment.refundedBody }
          : { title: copy.payment.refundFailedTitle, body: copy.payment.refundFailedBody };
    return (
      <div className="empty-panel">
        <h2>{statusCopy.title}</h2>
        <p role="status">{statusCopy.body}</p>
        {sessionLoadError ? (
          <div className="payment-session-refresh-error">
            <p className="form-message form-message-error" role="status">{sessionLoadError}{sessionRetrying && !manualChecking ? (french ? " Nouvelle tentative automatique en cours." : " Retrying automatically.") : ""}</p>
            <button className="button button-secondary" type="button" aria-disabled={sessionRetrying || manualChecking} onClick={() => {
              if (sessionRetrying || manualChecking) return;
              setManualChecking(true);
              pollerRef.current?.retry();
            }}>{sessionRetrying || manualChecking ? (french ? "Nouvelle vérification…" : "Checking again…") : copy.common.retry}</button>
          </div>
        ) : null}
        {session.orderId ? (
          <Link className="button button-primary" href={`${localeHref("/orders/lookup", locale)}?order=${encodeURIComponent(session.orderId)}`}>
            {copy.payment.viewOrder}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="payment-layout">
      <section className="summary-panel payment-main" aria-labelledby="payment-action-title">
        <header className="payment-session-header">
          <span>{french ? "Séance sécurisée" : "Secure checkout session"}</span>
          <strong>{copy.order.fulfillment[session.fulfillment]} · {copy.order.paymentMethod[session.paymentMethod]}</strong>
          <small>{copy.payment.inStoreReference}: {session.id}</small>
        </header>

        <div className={remainingMinutes <= 5 ? "payment-expiry urgent" : "payment-expiry"}>
          <Clock3 aria-hidden="true" size={21} />
          <div>
            <strong>{remainingMinutes > 0
              ? french ? `Réservation maintenue pendant encore ${remainingMinutes} min` : `Reservation held for ${remainingMinutes} more min`
              : french ? "La réservation arrive à échéance" : "Reservation is expiring"}</strong>
            <span>{french ? `Expiration à ${expiresAt}` : `Expires at ${expiresAt}`}</span>
          </div>
        </div>

        {session.paymentMethod === "card" ? (
          <div className="payment-action-block">
            <CreditCard aria-hidden="true" size={26} />
            <div>
              <h2 id="payment-action-title">{french ? "Payer en ligne" : "Pay online"}</h2>
              <p>{french ? "Votre carte est traitée dans le formulaire sécurisé du fournisseur de paiement. VanStro ne conserve pas le numéro complet de votre carte." : "Your card is handled in the payment provider’s secure form. VanStro does not store your full card number."}</p>
            </div>
            {paymentMeta?.provider === "demo" ? (
              <p className="quantity-limit-note" role="status">Demo payment — no real card will be charged.</p>
            ) : null}
            <div id="moneris-checkout" className="form-wide" />
            <button className="button button-primary form-wide" type="button" disabled={(paymentMeta?.provider !== "demo" && !monerisReady) || processing} onClick={() => void startCardPayment()}>
              {processing ? copy.payment.processing : `${copy.payment.payNow} · ${formatMoney(session.total, locale)}`}
            </button>
          </div>
        ) : (
          <div className="payment-action-block">
            <Store aria-hidden="true" size={26} />
            <div>
              <h2 id="payment-action-title">{copy.payment.inStoreTitle}</h2>
              <p>{copy.payment.inStoreBody}</p>
            </div>
            <div className="payment-reference form-wide">
              <span>{copy.payment.inStoreReference}</span>
              <strong>{session.id}</strong>
              <small>{session.fulfillment === "delivery"
                ? french ? "Conservez cette référence; le détaillant confirmera les modalités avant la livraison." : "Keep this reference; the dealer will confirm arrangements before delivery."
                : french ? "Présentez cette référence au détaillant." : "Bring this reference to the dealer."}</small>
            </div>
            {simulationEnabled ? (
              <button className="button button-secondary form-wide" type="button" disabled={processing} onClick={() => void simulateInStorePayment()}>
                {copy.payment.simulatePayment}
              </button>
            ) : null}
          </div>
        )}
        {sessionLoadError ? (
          <div className="payment-session-refresh-error">
            <p className="form-message form-message-error" role="status">{sessionLoadError}{sessionRetrying && !manualChecking ? (french ? " Nouvelle tentative automatique en cours." : " Retrying automatically.") : ""}</p>
            <button className="button button-secondary" type="button" aria-disabled={sessionRetrying || manualChecking} onClick={() => {
              if (sessionRetrying || manualChecking) return;
              setManualChecking(true);
              pollerRef.current?.retry();
            }}>{sessionRetrying || manualChecking ? (french ? "Nouvelle vérification…" : "Checking again…") : copy.common.retry}</button>
          </div>
        ) : null}
        {actionMessage ? <p className={`form-message form-message-${actionMessageTone === "error" ? "error" : "success"}`} role={actionMessageTone === "error" ? "alert" : "status"}>{actionMessage}</p> : null}
        <p className="visually-hidden" aria-live="polite">{processing ? copy.payment.processing : ""}</p>
      </section>

      <aside className="summary-panel payment-summary">
        <h2>{copy.payment.summary}</h2>
        <dl className="payment-summary-facts">
          <div><dt>{copy.common.subtotal}</dt><dd>{formatMoney(session.subtotal, locale)}</dd></div>
          <div><dt>{copy.checkout.tax}</dt><dd>{formatMoney(session.tax, locale)}</dd></div>
          <div><dt>{copy.checkout.shipping}</dt><dd>{formatMoney(session.shipping, locale)}</dd></div>
          <div className="total"><dt>{copy.common.total}</dt><dd>{formatMoney(session.total, locale)}</dd></div>
        </dl>
        {session.shippingAddress ? (
          <div className="payment-detail-block">
            <MapPin aria-hidden="true" size={19} />
            <div><strong>{copy.checkout.deliveryAddress}</strong><address>{session.shippingAddress.addressLine1}{session.shippingAddress.addressLine2 ? <><br />{session.shippingAddress.addressLine2}</> : null}<br />{session.shippingAddress.city}, {session.shippingAddress.province} {session.shippingAddress.postalCode}</address></div>
          </div>
        ) : (
          <div className="payment-detail-block">
            <Store aria-hidden="true" size={19} />
            <div><strong>{copy.checkout.pickup}</strong><p>{french ? "Le lieu confirmé figurera dans les détails de la commande." : "The confirmed location will appear in your order details."}</p></div>
          </div>
        )}
        <div className="payment-detail-block">
          <PackageCheck aria-hidden="true" size={19} />
          <div><strong>{french ? "Stock réservé" : "Inventory reserved"}</strong><p>{french ? "La disponibilité est revérifiée lors de la création de la commande." : "Availability is rechecked when the order is created."}</p></div>
        </div>
        <div className="payment-detail-block">
          <ShieldCheck aria-hidden="true" size={19} />
          <div><strong>{french ? "Besoin de modifier quelque chose?" : "Need to make a change?"}</strong><p>{french ? "Retournez à la caisse avant de payer." : "Return to checkout before completing payment."}</p></div>
        </div>
        <Link className="button button-secondary" href={localeHref("/checkout", locale)}>{copy.payment.returnToCheckout}</Link>
      </aside>
    </div>
  );
}
