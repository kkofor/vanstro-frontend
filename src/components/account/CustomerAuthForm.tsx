"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vanstroApi } from "@/lib/api/api-client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { localizeApiError } from "@/lib/i18n/api-error-localization";

export function CustomerAuthForm({ mode, locale: explicitLocale }: { mode: "login" | "register"; locale?: SiteLocale }) {
  const router = useRouter();
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) {
        await vanstroApi.register({
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? "")
        });
      } else {
        await vanstroApi.login({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? "")
        });
      }
      router.push(localeHref("/account", locale));
      router.refresh();
    } catch (error) {
      setError(locale === "fr-CA"
        ? localizeApiError(error, locale)
        : isRegister ? copy.auth.registrationError : copy.auth.error);
      setSubmitting(false);
    }
  }

  return (
    <form className="form-panel form-grid two" onSubmit={submit}>
      {isRegister ? <>
        <div className="field"><label htmlFor="firstName">{copy.common.firstName}</label><input id="firstName" name="firstName" autoComplete="given-name" required /></div>
        <div className="field"><label htmlFor="lastName">{copy.common.lastName}</label><input id="lastName" name="lastName" autoComplete="family-name" required /></div>
      </> : null}
      <div className="field"><label htmlFor="email">{copy.common.email}</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="field">
        <label htmlFor="password">{copy.common.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 12 : undefined}
          aria-describedby={isRegister ? "password-requirement" : undefined}
          required
        />
        {isRegister ? <p id="password-requirement" className="field-help">{copy.auth.passwordRequirement}</p> : null}
      </div>
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? copy.auth.wait : isRegister ? copy.auth.createAccount : copy.auth.signIn}</button>
      <Link className="section-link" href={localeHref(isRegister ? "/account/login" : "/account/register", locale)}>{isRegister ? copy.auth.existingAccount : copy.auth.newAccount}</Link>
      {error ? <p className="quantity-limit-note" role="alert">{error}</p> : null}
    </form>
  );
}
