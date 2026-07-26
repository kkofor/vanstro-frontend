"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { vanstroApi } from "@/lib/api/api-client";
import type { CustomerAccount } from "@/lib/api/api-contract";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";

export function AccountProfileClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const [profile, setProfile] = useState<CustomerAccount | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void vanstroApi.getAccountMe().then((response) => setProfile(response.data)).catch(() => setProfile(null));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await vanstroApi.updateAccountMe({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone
      });
      setProfile(response.data);
      setMessage(copy.account.profileSaved);
    } catch {
      setMessage(copy.storefront.requestError);
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) {
    return (
      <AccountShell active="profile" locale={locale}>
        <div className="empty-panel"><p>{copy.account.loading}</p></div>
      </AccountShell>
    );
  }

  return (
    <AccountShell active="profile" locale={locale}>
      <form className="form-panel form-grid two" onSubmit={submit}>
        <h3>{copy.account.profile}</h3>
        <div className="field">
          <label htmlFor="email">{copy.common.email}</label>
          <input id="email" value={profile.email} readOnly />
        </div>
        <div className="field">
          <label htmlFor="firstName">{copy.common.firstName}</label>
          <input
            id="firstName"
            value={profile.firstName ?? ""}
            onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">{copy.common.lastName}</label>
          <input
            id="lastName"
            value={profile.lastName ?? ""}
            onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="phone">{copy.checkout.phone}</label>
          <input
            id="phone"
            value={profile.phone ?? ""}
            onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
          />
        </div>
        <button className="button button-primary" disabled={submitting} type="submit">
          {submitting ? copy.auth.wait : copy.account.saveProfile}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </AccountShell>
  );
}
