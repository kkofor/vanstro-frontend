"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { CommercePageSkeleton, CommerceStatePanel } from "@/components/ui/CommerceStatePanel";
import { vanstroApi } from "@/lib/api/api-client";
import type { CustomerAccount } from "@/lib/api/api-contract";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getAccountCopy } from "@/lib/i18n/account-copy";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

function comparableProfile(profile: CustomerAccount) {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? ""
  };
}

export function AccountProfileClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const accountCopy = getAccountCopy(locale);
  const session = useCustomerSession();
  const requestGeneration = useRef(0);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "success"; profile: CustomerAccount }
    | { status: "error" }
  >({ status: "loading" });
  const [savedProfile, setSavedProfile] = useState<CustomerAccount>();
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = useCallback(() => {
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    setSavedProfile(undefined);
    setMessage("");
    void vanstroApi.getAccountMe()
      .then((response) => {
        if (generation !== requestGeneration.current) return;
        setSavedProfile(response.data);
        setState({ status: "success", profile: response.data });
      })
      .catch(() => {
        if (generation === requestGeneration.current) setState({ status: "error" });
      });
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated" || !session.user?.id) {
      requestGeneration.current += 1;
      setSavedProfile(undefined);
      setMessage("");
      setState({ status: "loading" });
      return;
    }
    loadProfile();
    return () => {
      requestGeneration.current += 1;
    };
  }, [loadProfile, session.status, session.user?.id]);

  function updateProfile(input: Partial<CustomerAccount>) {
    setMessage("");
    setState((current) => current.status === "success"
      ? { ...current, profile: { ...current.profile, ...input } }
      : current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "success") return;
    setSubmitting(true);
    setMessage("");
    try {
      await vanstroApi.updateAccountMe(comparableProfile(state.profile));
      const response = await vanstroApi.getAccountMe();
      setSavedProfile(response.data);
      setState({ status: "success", profile: response.data });
      setMessageTone("success");
      setMessage(copy.account.profileSaved);
    } catch {
      setMessageTone("error");
      setMessage(copy.storefront.requestError);
    } finally {
      setSubmitting(false);
    }
  }

  const complete = state.status === "success" && Boolean(
    state.profile.firstName?.trim() && state.profile.lastName?.trim() && state.profile.phone?.trim()
  );
  const dirty = state.status === "success" && savedProfile !== undefined && JSON.stringify(comparableProfile(state.profile)) !== JSON.stringify(comparableProfile(savedProfile));

  return (
    <AccountShell active="profile" locale={locale}>
      <header className="account-section-heading account-section-heading-rich">
        <div><h2>{accountCopy.profile.title}</h2><p>{accountCopy.profile.intro}</p></div>
        {state.status === "success" ? <span className={`account-completion-badge ${complete ? "complete" : "incomplete"}`}><CheckCircle2 size={16} aria-hidden="true" />{complete ? accountCopy.profile.readyTitle : accountCopy.profile.incompleteTitle}</span> : null}
      </header>
      {state.status === "loading" ? <CommercePageSkeleton rows={1} label={copy.account.loading} /> : null}
      {state.status === "error" ? (
        <CommerceStatePanel tone="error" title={copy.account.loadErrorTitle} body={copy.account.loadErrorBody} actions={<button className="button button-primary" type="button" onClick={loadProfile}>{copy.account.retry}</button>} />
      ) : null}
      {state.status === "success" ? (
        <div className="account-profile-grid">
          <form className="account-form" onSubmit={submit} aria-busy={submitting}>
            <div className={`account-profile-readiness ${complete ? "complete" : "incomplete"}`}>
              <CheckCircle2 size={20} aria-hidden="true" />
              <div><strong>{complete ? accountCopy.profile.readyTitle : accountCopy.profile.incompleteTitle}</strong><p>{complete ? accountCopy.profile.readyBody : accountCopy.profile.incompleteBody}</p></div>
            </div>
            <div className="field form-wide">
              <label htmlFor="email">{copy.common.email}</label>
              <input id="email" value={state.profile.email} readOnly aria-describedby="account-email-help" />
              <p className="field-help" id="account-email-help">{accountCopy.profile.emailHelp}</p>
            </div>
            <div className="field">
              <label htmlFor="firstName">{copy.common.firstName}</label>
              <input id="firstName" value={state.profile.firstName ?? ""} onChange={(event) => updateProfile({ firstName: event.target.value })} autoComplete="given-name" required />
            </div>
            <div className="field">
              <label htmlFor="lastName">{copy.common.lastName}</label>
              <input id="lastName" value={state.profile.lastName ?? ""} onChange={(event) => updateProfile({ lastName: event.target.value })} autoComplete="family-name" required />
            </div>
            <div className="field form-wide">
              <label htmlFor="phone">{copy.checkout.phone}</label>
              <input id="phone" value={state.profile.phone ?? ""} onChange={(event) => updateProfile({ phone: event.target.value })} autoComplete="tel" inputMode="tel" aria-describedby="account-phone-help" />
              <p className="field-help" id="account-phone-help">{accountCopy.profile.phoneHelp}</p>
            </div>
            {message ? <p className={`form-message form-message-${messageTone}`} role={messageTone === "error" ? "alert" : "status"}>{message}</p> : null}
            <div className="form-actions form-wide">
              <button className="button button-primary" disabled={submitting || !dirty} type="submit">{submitting ? copy.auth.wait : copy.account.saveProfile}</button>
            </div>
          </form>
          <aside className="account-security-panel">
            <ShieldCheck size={24} aria-hidden="true" />
            <h3>{accountCopy.profile.securityTitle}</h3>
            <p>{accountCopy.profile.securityBody}</p>
            <nav aria-label={accountCopy.profile.securityTitle}>
              <Link href={localeHref("/account/forgot-password", locale)}>{accountCopy.profile.resetPassword}</Link>
              <Link href={localeHref("/privacy", locale)}>{accountCopy.profile.privacy}</Link>
              <Link href={localeHref("/contact", locale)}>{accountCopy.profile.support}</Link>
            </nav>
          </aside>
        </div>
      ) : null}
    </AccountShell>
  );
}
