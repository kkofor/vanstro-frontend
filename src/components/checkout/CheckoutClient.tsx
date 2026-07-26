"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CanadaAddressFieldset, emptyAddressDraft } from "@/components/address/CanadaAddressFieldset";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { vanstroApi } from "@/lib/api/api-client";
import type { CustomerAddress } from "@/lib/api/api-contract";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { localizeApiError } from "@/lib/i18n/api-error-localization";
import { formatMoney } from "@/lib/commerce/product-commerce";

const PAYMENT_META_KEY = "vanstro-checkout-payment-meta";
const GUEST_ORDER_TOKEN_KEY = "vanstro-guest-order-token";

export function storeGuestOrderToken(resourceId: string, token: string) {
  sessionStorage.setItem(`${GUEST_ORDER_TOKEN_KEY}:${resourceId}`, token);
}

export function readGuestOrderToken(resourceId: string) {
  return sessionStorage.getItem(`${GUEST_ORDER_TOKEN_KEY}:${resourceId}`) ?? "";
}

export function storeCheckoutPaymentMeta(sessionId: string, meta: unknown) {
  sessionStorage.setItem(`${PAYMENT_META_KEY}:${sessionId}`, JSON.stringify(meta));
}

export function readCheckoutPaymentMeta(sessionId: string) {
  const raw = sessionStorage.getItem(`${PAYMENT_META_KEY}:${sessionId}`);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as { provider?: string; ticket?: string };
  } catch {
    return undefined;
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
    selectedDealerName
  } = useStorefront();
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pos" | "cash">("card");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const customerSession = useCustomerSession();
  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [shippingAddress, setShippingAddress] = useState(emptyAddressDraft);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);

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
    const idempotencyKey = crypto.randomUUID();
    const form = new FormData(event.currentTarget);
    setCheckoutMessage("");
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
        ...(selectedDealerId === "winnipeg"
          ? {}
          : { dealerLocationId: selectedDealerId })
      }, idempotencyKey);
      if (!session.data.guestOrderToken) {
        throw new Error(copy.checkout.tokenError);
      }
      if (session.meta?.payment) {
        storeCheckoutPaymentMeta(session.data.id, session.meta.payment);
      }
      storeGuestOrderToken(session.data.id, session.data.guestOrderToken);
      const query = new URLSearchParams({ session: session.data.id });
      router.push(`${localeHref("/checkout/payment", locale)}?${query.toString()}`);
    } catch (error) {
      setCheckoutMessage(locale === "fr-CA"
        ? localizeApiError(error, locale)
        : copy.checkout.reserveError);
      setSubmitting(false);
    }
  }

  if (cartState.status === "loading") {
    return <div className="empty-panel"><h2>{copy.checkout.loadingTitle}</h2><p>{copy.checkout.loadingBody}</p></div>;
  }

  if (cartState.status === "error") {
    return <div className="empty-panel"><h2>{copy.checkout.unavailableTitle}</h2><p role="alert">{locale === "fr-CA" ? copy.storefront.requestError : cartState.error}</p><Link className="button button-primary" href={localeHref("/cart", locale)}>{copy.checkout.returnToCart}</Link></div>;
  }

  if (!cartItems.length) {
    return (
      <div className="empty-panel">
        <h2>{copy.checkout.emptyTitle}</h2>
        <p>{copy.checkout.emptyBody}</p>
        <Link className="button button-primary" href={localeHref("/products", locale)}>
          {copy.common.shopProducts}
        </Link>
      </div>
    );
  }

  return (
    <form className="two-column-page" onSubmit={handleSubmit}>
      <div className="form-panel form-grid two">
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
        <div className="field">
          <label htmlFor="fulfillment">{copy.checkout.fulfillment}</label>
          <select
            id="fulfillment"
            value={fulfillment}
            onChange={(event) =>
              setFulfillment(event.target.value as "pickup" | "delivery")
            }
          >
            <option value="pickup">{copy.checkout.pickup}</option>
            <option value="delivery">{copy.checkout.delivery}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="paymentMethod">{copy.checkout.paymentRegistration}</label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as "card" | "pos" | "cash")
            }
          >
            <option value="card">{copy.checkout.card}</option>
            <option value="pos">{copy.checkout.pos}</option>
            <option value="cash">{copy.checkout.cash}</option>
          </select>
        </div>
        {fulfillment === "delivery" ? (
          <div className="form-wide">
            <h3>{copy.checkout.deliveryAddress}</h3>
            <CanadaAddressFieldset
              locale={locale}
              value={shippingAddress}
              onChange={setShippingAddress}
              savedAddresses={savedAddresses}
              onSelectSavedAddress={() => undefined}
              idPrefix="checkout-shipping"
            />
          </div>
        ) : null}
        <div className="field form-wide">
          <label htmlFor="notes">{copy.checkout.notes}</label>
          <textarea id="notes" name="notes" placeholder={copy.checkout.notesPlaceholder} />
        </div>
      </div>

      <aside className="summary-panel">
        <h2>{copy.checkout.summary}</h2>
        <div className="spec-list">
          <div className="spec-row">
            <strong>{copy.checkout.store}</strong>
            <span>{selectedDealerName}</span>
          </div>
          <div className="spec-row">
            <strong>{copy.common.items}</strong>
            <span>{cartItems.length}</span>
          </div>
          <div className="spec-row">
            <strong>{copy.common.subtotal}</strong>
            <span>{formatMoney({ amount: cartSubtotal, currency: "CAD" }, locale)}</span>
          </div>
          <div className="spec-row">
            <strong>{copy.checkout.inventory}</strong>
            <span>{copy.checkout.inventoryValue}</span>
          </div>
        </div>
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? copy.checkout.creating : copy.checkout.continuePayment}
        </button>
        {checkoutMessage ? <p className="quantity-limit-note" role="alert">{checkoutMessage}</p> : null}
      </aside>
    </form>
  );
}
