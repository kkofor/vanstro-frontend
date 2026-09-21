"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LockKeyhole } from "lucide-react";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";
  const title = isRegister ? copy.auth.registerTitle : copy.auth.loginTitle;
  const body = isRegister ? copy.auth.registerBody : copy.auth.loginBody;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setFieldErrors({});
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
    } catch (caughtError) {
      const fields = caughtError && typeof caughtError === "object" && "fields" in caughtError
        ? (caughtError as { fields?: Record<string, string> }).fields
        : undefined;
      setFieldErrors(fields ?? {});
      setError(locale === "fr-CA"
        ? localizeApiError(caughtError, locale)
        : localizeApiError(caughtError, locale, isRegister ? copy.auth.registrationError : copy.auth.error));
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-intro" aria-labelledby="auth-title">
        <div>
          <h1 id="auth-title">{title}</h1>
          <p>{body}</p>
        </div>
        <ul className="auth-benefits">
          {copy.auth.accountBenefits.map((benefit) => (
            <li key={benefit}>
              <CheckCircle2 size={19} strokeWidth={2.2} aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <p className="auth-security-note">
          <LockKeyhole size={18} strokeWidth={2} aria-hidden="true" />
          <span>{copy.auth.secureSession}</span>
        </p>
      </section>

      <form className="auth-form" onSubmit={submit} aria-busy={submitting}>
        {isRegister ? (
          <div className="auth-name-grid">
            <div className="field">
              <label htmlFor="firstName">{copy.common.firstName}</label>
              <input id="firstName" name="firstName" autoComplete="given-name" aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? "first-name-error" : undefined} required />
              {fieldErrors.firstName ? <p className="field-error" id="first-name-error">{fieldErrors.firstName}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="lastName">{copy.common.lastName}</label>
              <input id="lastName" name="lastName" autoComplete="family-name" aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? "last-name-error" : undefined} required />
              {fieldErrors.lastName ? <p className="field-error" id="last-name-error">{fieldErrors.lastName}</p> : null}
            </div>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="email">{copy.common.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "auth-email-error" : undefined} required />
          {fieldErrors.email ? <p className="field-error" id="auth-email-error">{fieldErrors.email}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="password">{copy.common.password}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 12 : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "auth-password-error" : isRegister ? "password-requirement" : undefined}
            required
          />
          {fieldErrors.password ? <p className="field-error" id="auth-password-error">{fieldErrors.password}</p> : null}
          {isRegister ? <p id="password-requirement" className="field-help">{copy.auth.passwordRequirement}</p> : null}
        </div>
        {error ? <p className="form-message form-message-error" role="alert">{error}</p> : null}
        {!isRegister ? (
          <p className="auth-forgot-link"><Link href={localeHref("/account/forgot-password", locale)}>{locale === "fr-CA" ? "Mot de passe oublié?" : "Forgot password?"}</Link></p>
        ) : null}
        <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? copy.auth.wait : isRegister ? copy.auth.createAccount : copy.auth.signIn}
        </button>
        <p className="auth-switch">
          <Link href={localeHref(isRegister ? "/account/login" : "/account/register", locale)}>
            {isRegister ? copy.auth.existingAccount : copy.auth.newAccount}
          </Link>
        </p>
      </form>
    </div>
  );
}
