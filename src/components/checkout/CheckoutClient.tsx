"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, MapPin, PackageCheck, ShoppingBag, Store, WalletCards } from "lucide-react";
import { CanadaAddressFieldset, emptyAddressDraft } from "@/components/address/CanadaAddressFieldset";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { VanstroApiError, vanstroApi } from "@/lib/api/api-client";
import type { CustomerAddress } from "@/lib/api/api-contract";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";
import { localizeApiError, normalizeApiErrorCode } from "@/lib/i18n/api-error-localization";
import { formatMoney } from "@/lib/commerce/product-commerce";

const PAYMENT_META_KEY = "vanstro-checkout-payment-meta";
const GUEST_ORDER_TOKEN_KEY = "vanstro-guest-order-token";
const volatileGuestOrderTokens = new Map<string, string>();
const volatilePaymentMeta = new Map<string, unknown>();
const CARD_PAYMENT_ENABLED = process.env.NEXT_PUBLIC_ENABLE_CARD_PAYMENT === "true";

export function storeGuestOrderToken(resourceId: string, token: string) {
  volatileGuestOrderTokens.set(resourceId, token);
  try {
    sessionStorage.setItem(`${GUEST_ORDER_TOKEN_KEY}:${resourceId}`, token);
  } catch {}
}

export function readGuestOrderToken(resourceId: string) {
  try {
    return sessionStorage.getItem(`${GUEST_ORDER_TOKEN_KEY}:${resourceId}`) ?? volatileGuestOrderTokens.get(resourceId) ?? "";
  } catch {
    return volatileGuestOrderTokens.get(resourceId) ?? "";
  }
}

export function storeCheckoutPaymentMeta(sessionId: string, meta: unknown) {
  volatilePaymentMeta.set(sessionId, meta);
  try {
    sessionStorage.setItem(`${PAYMENT_META_KEY}:${sessionId}`, JSON.stringify(meta));
  } catch {}
}

export function readCheckoutPaymentMeta(sessionId: string) {
  try {
    const raw = sessionStorage.getItem(`${PAYMENT_META_KEY}:${sessionId}`);
    if (!raw) return volatilePaymentMeta.get(sessionId) as { provider?: string; ticket?: string } | undefined;
    return JSON.parse(raw) as { provider?: string; ticket?: string };
  } catch {
    return volatilePaymentMeta.get(sessionId) as { provider?: string; ticket?: string } | undefined;
  }
}

export function CheckoutClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const router = useRouter();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const {
    cartItems,
    cartSubtotal,
    cartState,
    selectedDealerId,
    selectedDealerName,
    selectedDealerLocationId
  } = useStorefront();
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pos" | "cash">(
    CARD_PAYMENT_ENABLED ? "card" : "pos"
  );
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutErrorCode, setCheckoutErrorCode] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const customerSession = useCustomerSession();
  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [shippingAddress, setShippingAddress] = useState(emptyAddressDraft);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (customerSession.status !== "authenticated") return;
    void vanstroApi.getAccountMe()
      .then((response) => {
        setContact({
          firstName: response.data.firstName ?? "",
          lastName: response.data.lastName ?? "",
          email: response.data.email,
          phone: response.data.phone ?? ""
        });
      })
      .catch(() => undefined);
    void vanstroApi.getAccountAddresses()
      .then((response) => setSavedAddresses(response.data))
      .catch(() => undefined);
  }, [customerSession.status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartItems.length) return;
    const checkoutIntentKey = "vanstro-checkout-intent";
    let idempotencyKey = crypto.randomUUID();
    try {
      idempotencyKey = window.sessionStorage.getItem(checkoutIntentKey) ?? idempotencyKey;
      window.sessionStorage.setItem(checkoutIntentKey, idempotencyKey);
    } catch {}
    const form = new FormData(event.currentTarget);
    setCheckoutMessage("");
    setCheckoutErrorCode(undefined);
    setSubmitting(true);
    try {
      const session = await vanstroApi.createCheckoutSession({
        firstName: String(form.get("firstName") ?? "").trim(),
        lastName: String(form.get("lastName") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        fulfillment,
        paymentMethod,
        notes: String(form.get("notes") ?? "").trim() || undefined,
        ...(fulfillment === "delivery"
          ? {
              shippingAddressLine1: shippingAddress.addressLine1,
              shippingAddressLine2: shippingAddress.addressLine2 || undefined,
              shippingCity: shippingAddress.city,
              shippingProvince: shippingAddress.province,
              shippingPostalCode: shippingAddress.postalCode,
              shippingCountry: shippingAddress.country
            }
          : {}),
        ...(selectedDealerLocationId ? { dealerLocationId: selectedDealerLocationId } : {}),
      }, idempotencyKey);
      if (!session.data.guestOrderToken) {
        throw new Error(copy.checkout.tokenError);
      }
      if (!activeRef.current) return;
      if (session.meta?.payment) {
        storeCheckoutPaymentMeta(session.data.id, session.meta.payment);
      }
      storeGuestOrderToken(session.data.id, session.data.guestOrderToken);
      try {
        window.sessionStorage.removeItem(checkoutIntentKey);
      } catch {}
      const query = new URLSearchParams({ session: session.data.id });
      router.push(`${localeHref("/checkout/payment", locale)}?${query.toString()}`);
    } catch (error) {
      if (error instanceof VanstroApiError && error.code === "CHECKOUT_INVALID" && error.status === 409) {
        try {
          window.sessionStorage.removeItem(checkoutIntentKey);
        } catch {}
      }
      setCheckoutErrorCode(normalizeApiErrorCode(error));
      setCheckoutMessage(localizeApiError(error, locale, copy.checkout.reserveError));
      setSubmitting(false);
    }
  }

  if (cartState.status === "loading") {
    return <div className="empty-panel"><h2>{copy.checkout.loadingTitle}</h2><p>{copy.checkout.loadingBody}</p></div>;
  }

  if (cartState.status === "error") {
    return <div className="empty-panel"><h2>{copy.checkout.unavailableTitle}</h2><p role="alert">{copy.storefront.requestError}</p><Link className="button button-primary" href={localeHref("/cart", locale)}>{copy.checkout.returnToCart}</Link></div>;
  }

  if (!cartItems.length) {
    return (
      <div className="empty-panel">
        <h2>{copy.checkout.emptyTitle}</h2>
        <p>{copy.checkout.emptyBody}</p>
        <Link className="button button-primary" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>
          {copy.common.shopProducts}
        </Link>
      </div>
    );
  }

  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const french = locale === "fr-CA";

  return (
    <form className="checkout-layout" onSubmit={handleSubmit} aria-busy={submitting}>
      <div className="checkout-form-stack">
        <fieldset className="form-panel form-grid two checkout-section">
          <legend>{french ? "Coordonnées" : "Contact information"}</legend>
          <p className="form-wide checkout-section-intro">{french ? "Nous utiliserons ces coordonnées pour la confirmation et les mises à jour sur la commande." : "We’ll use these details for confirmation and order updates."}</p>
          <div className="field">
            <label htmlFor="firstName">{copy.common.firstName}</label>
            <input id="firstName" name="firstName" autoComplete="given-name" required value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="lastName">{copy.common.lastName}</label>
            <input id="lastName" name="lastName" autoComplete="family-name" required value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="email">{copy.common.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="phone">{copy.checkout.phone}</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          </div>
        </fieldset>

        <fieldset className="form-panel checkout-section">
          <legend>{copy.checkout.fulfillment}</legend>
          <p className="checkout-section-intro">{french ? "Le détaillant final sera confirmé selon la disponibilité de toute la commande." : "The final fulfilling dealer is confirmed against availability for the entire order."}</p>
          <div className="checkout-choice-grid">
            <label className={fulfillment === "pickup" ? "checkout-choice selected" : "checkout-choice"}>
              <input type="radio" name="fulfillment" value="pickup" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")} />
              <Store aria-hidden="true" size={22} />
              <span><strong>{copy.checkout.pickup}</strong><small>{french ? "Ramassage chez le détaillant confirmé" : "Pick up from the confirmed dealer"}</small></span>
            </label>
            <label className={fulfillment === "delivery" ? "checkout-choice selected" : "checkout-choice"}>
              <input type="radio" name="fulfillment" value="delivery" checked={fulfillment === "delivery"} onChange={() => setFulfillment("delivery")} />
              <MapPin aria-hidden="true" size={22} />
              <span><strong>{copy.checkout.delivery}</strong><small>{french ? "Frais calculés avant le paiement" : "Delivery charge calculated before payment"}</small></span>
            </label>
          </div>
        </fieldset>

        {fulfillment === "delivery" ? (
          <CanadaAddressFieldset
            locale={locale}
            value={shippingAddress}
            onChange={setShippingAddress}
            savedAddresses={savedAddresses}
            onSelectSavedAddress={() => undefined}
            idPrefix="checkout-shipping"
          />
        ) : null}

        <fieldset className="form-panel checkout-section">
          <legend>{copy.checkout.paymentRegistration}</legend>
          <div className="checkout-choice-grid checkout-payment-choices">
            {CARD_PAYMENT_ENABLED ? (
              <label className={paymentMethod === "card" ? "checkout-choice selected" : "checkout-choice"}>
                <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
                <CreditCard aria-hidden="true" size={22} />
                <span><strong>{copy.checkout.card}</strong><small>{french ? "Paiement sécurisé en ligne" : "Secure online payment"}</small></span>
              </label>
            ) : null}
            <label className={paymentMethod === "pos" ? "checkout-choice selected" : "checkout-choice"}>
              <input type="radio" name="paymentMethod" value="pos" checked={paymentMethod === "pos"} onChange={() => setPaymentMethod("pos")} />
              <WalletCards aria-hidden="true" size={22} />
              <span><strong>{copy.checkout.pos}</strong><small>{fulfillment === "delivery" ? (french ? "Le détaillant confirmera les modalités de paiement avant la livraison" : "The dealer will confirm payment arrangements before delivery") : (french ? "Payez par carte au ramassage" : "Pay by card when you arrive")}</small></span>
            </label>
            <label className={paymentMethod === "cash" ? "checkout-choice selected" : "checkout-choice"}>
              <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} />
              <PackageCheck aria-hidden="true" size={22} />
              <span><strong>{copy.checkout.cash}</strong><small>{fulfillment === "delivery" ? (french ? "Le détaillant confirmera les modalités de paiement avant la livraison" : "The dealer will confirm payment arrangements before delivery") : (french ? "Payez en argent comptant au ramassage" : "Pay cash when you arrive")}</small></span>
            </label>
          </div>
        </fieldset>

        <div className="form-panel field checkout-section">
          <label htmlFor="notes">{copy.checkout.notes}</label>
          <textarea id="notes" name="notes" placeholder={copy.checkout.notesPlaceholder} />
          <small>{french ? "N’inscrivez aucun renseignement de paiement dans les notes." : "Do not include payment information in order notes."}</small>
        </div>
      </div>

      <aside className={`summary-panel checkout-summary${checkoutMessage ? " has-error" : ""}`}>
        <div className="checkout-summary-heading">
          <ShoppingBag aria-hidden="true" size={22} />
          <div><h2>{copy.checkout.summary}</h2><p>{copy.cart.itemCount(totalQuantity)}</p></div>
          <Link href={localeHref("/cart", locale)}>{french ? "Modifier" : "Edit cart"}</Link>
        </div>
        <div className="checkout-review-list">
          {cartItems.map((item) => (
            <article key={item.cartItemId}>
              <img src={item.product.images[0].url} alt="" width={56} height={56} />
              <div><strong>{item.product.name}</strong><small>{copy.order.sku} {item.product.sku} · {french ? "Qté" : "Qty"} {item.quantity}</small></div>
              <span>{formatMoney(item.lineTotal, locale)}</span>
            </article>
          ))}
        </div>
        <dl className="checkout-summary-facts">
          <div><dt>{french ? "Détaillant demandé" : "Requested dealer"}</dt><dd>{selectedDealerName}</dd></div>
          <div><dt>{copy.checkout.fulfillment}</dt><dd>{copy.order.fulfillment[fulfillment]}</dd></div>
          <div><dt>{copy.checkout.paymentRegistration}</dt><dd>{copy.order.paymentMethod[paymentMethod]}</dd></div>
          <div><dt>{copy.common.subtotal}</dt><dd>{formatMoney(cartSubtotal, locale)}</dd></div>
        </dl>
        <p className="cart-total-note">{copy.cart.taxesDelivery}</p>
        <p className="checkout-reservation-note"><PackageCheck aria-hidden="true" size={18} />{copy.checkout.inventoryValue}</p>
        {checkoutMessage ? (
          <div id="checkout-submit-error" className="checkout-submit-error" role="alert">
            <strong>{checkoutErrorCode === "INVENTORY_REFRESHING"
              ? french ? "La vérification du stock n’est pas terminée" : "Inventory verification is not complete"
              : french ? "Impossible de continuer" : "Unable to continue"}</strong>
            <p>{checkoutMessage}</p>
          </div>
        ) : null}
        <button className="button button-primary" type="submit" disabled={submitting} aria-describedby={checkoutMessage ? "checkout-submit-error" : undefined}>
          {submitting ? copy.checkout.creating : checkoutErrorCode === "INVENTORY_REFRESHING"
            ? french ? "Vérifier le stock de nouveau" : "Check inventory again"
            : copy.checkout.continuePayment}
        </button>
        <p className="visually-hidden" role="status">{submitting ? copy.checkout.creating : ""}</p>
        <Link className="checkout-return-link" href={localeHref("/cart", locale)}>{copy.checkout.returnToCart}</Link>
      </aside>
    </form>
  );
}
