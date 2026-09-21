"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderDetailClient } from "@/components/checkout/OrderDetailClient";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export function OrderLookupClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const requestedOrderId = searchParams.get("order")?.trim() ?? "";
  const [orderId, setOrderId] = useState(requestedOrderId);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (requestedOrderId) setOrderId(requestedOrderId);
  }, [requestedOrderId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedId = orderId.trim();
    const trimmedToken = token.trim();
    if (!trimmedId || !trimmedToken) {
      setMessage(copy.lookup.error);
      return;
    }
    const query = new URLSearchParams({ order: trimmedId, token: trimmedToken });
    router.push(`${localeHref("/orders/lookup", locale)}?${query.toString()}`);
  }

  if (requestedOrderId) {
    return <OrderDetailClient orderId={requestedOrderId} locale={locale} />;
  }

  return (
    <div className="order-lookup-layout">
      <section className="order-lookup-intro">
        <Search size={28} strokeWidth={2} aria-hidden="true" />
        <h2>{copy.lookup.title}</h2>
        <p>{copy.lookup.intro}</p>
        <p className="order-lookup-security"><LockKeyhole size={17} aria-hidden="true" />{copy.lookup.help}</p>
        <Link href={localeHref("/account/orders", locale)}>{copy.lookup.signedInHint}</Link>
      </section>
      <form className="order-lookup-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="orderId">{copy.lookup.orderId}</label>
          <input id="orderId" value={orderId} onChange={(event) => setOrderId(event.target.value)} autoComplete="off" required />
        </div>
        <div className="field">
          <label htmlFor="token">{copy.lookup.token}</label>
          <input id="token" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" required />
        </div>
        {message ? <p className="form-message form-message-error" role="alert">{message}</p> : null}
        <button className="button button-primary" type="submit">{copy.lookup.submit}</button>
      </form>
    </div>
  );
}
