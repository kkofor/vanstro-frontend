"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export function OrderLookupClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const router = useRouter();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const [orderId, setOrderId] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedId = orderId.trim();
    const trimmedToken = token.trim();
    if (!trimmedId || !trimmedToken) {
      setMessage(copy.lookup.error);
      return;
    }
    const query = new URLSearchParams({ token: trimmedToken });
    router.push(`${localeHref(`/orders/${trimmedId}`, locale)}?${query.toString()}`);
  }

  return (
    <form className="form-panel form-grid two" onSubmit={handleSubmit}>
      <p className="form-wide">{copy.lookup.intro}</p>
      <div className="field form-wide">
        <label htmlFor="orderId">{copy.lookup.orderId}</label>
        <input id="orderId" value={orderId} onChange={(event) => setOrderId(event.target.value)} required />
      </div>
      <div className="field form-wide">
        <label htmlFor="token">{copy.lookup.token}</label>
        <input id="token" value={token} onChange={(event) => setToken(event.target.value)} required />
      </div>
      <button className="button button-primary" type="submit">{copy.lookup.submit}</button>
      {message ? <p className="quantity-limit-note" role="alert">{message}</p> : null}
    </form>
  );
}
