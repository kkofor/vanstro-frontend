"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, MailCheck } from "lucide-react";
import { vanstroApi } from "@/lib/api/api-client";
import { localizeApiError } from "@/lib/i18n/api-error-localization";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export function PasswordRecoveryForm({
  mode,
  locale
}: {
  mode: "forgot" | "reset";
  locale: SiteLocale;
}) {
  const french = locale === "fr-CA";
  const searchParams = useSearchParams();
  const tokenRef = useRef("");
  const [tokenReady, setTokenReady] = useState(mode !== "reset");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "reset") return;
    tokenRef.current = searchParams.get("token")?.trim() ?? "";
    setTokenReady(true);
    if (tokenRef.current) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [mode, searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "forgot") {
        await vanstroApi.forgotPassword(String(form.get("email") ?? ""), locale);
      } else {
        const password = String(form.get("password") ?? "");
        const confirmation = String(form.get("passwordConfirmation") ?? "");
        if (password !== confirmation) {
          setMessage(french ? "Les mots de passe ne correspondent pas." : "The passwords do not match.");
          setSubmitting(false);
          return;
        }
        await vanstroApi.resetPassword(tokenRef.current, password);
      }
      setComplete(true);
    } catch (error) {
      setMessage(localizeApiError(
        error,
        locale,
        french ? "La demande n’a pas pu être traitée. Veuillez réessayer." : "We couldn’t complete this request. Please try again."
      ));
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "forgot"
    ? french ? "Réinitialiser votre mot de passe" : "Reset Your Password"
    : french ? "Choisir un nouveau mot de passe" : "Choose A New Password";
  const body = mode === "forgot"
    ? french
      ? "Entrez le courriel de votre compte. Si le compte est admissible, nous vous enverrons un lien sécurisé valide pendant 30 minutes."
      : "Enter your account email. If the account is eligible, we’ll send a secure link that is valid for 30 minutes."
    : french
      ? "Créez un mot de passe unique d’au moins 12 caractères. Toutes les séances existantes seront fermées."
      : "Create a unique password with at least 12 characters. All existing sessions will be signed out.";

  if (complete) {
    return (
      <section className="auth-recovery-complete" role="status">
        <MailCheck size={34} strokeWidth={2} aria-hidden="true" />
        <h1>{mode === "forgot"
          ? french ? "Vérifiez votre courriel" : "Check Your Email"
          : french ? "Mot de passe modifié" : "Password Changed"}</h1>
        <p>{mode === "forgot"
          ? french ? "Si un compte admissible existe pour ce courriel, les instructions sont en route." : "If an eligible account exists for that email, reset instructions are on the way."
          : french ? "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe." : "You can now sign in with your new password."}</p>
        <Link className="button button-primary" href={localeHref("/account/login", locale)}>
          {french ? "Retour à la connexion" : "Return to sign in"}
        </Link>
      </section>
    );
  }

  if (mode === "reset" && !tokenReady) {
    return (
      <div className="auth-recovery-loading" role="status" aria-live="polite" aria-busy="true">
        <LockKeyhole size={26} aria-hidden="true" />
        <div>
          <strong>{french ? "Vérification du lien sécurisé" : "Checking your secure link"}</strong>
          <p>{french ? "Veuillez patienter pendant la préparation du formulaire." : "Please wait while the password form is prepared."}</p>
        </div>
      </div>
    );
  }

  if (mode === "reset" && !tokenRef.current) {
    return (
      <section className="auth-recovery-complete" role="alert">
        <LockKeyhole size={34} strokeWidth={2} aria-hidden="true" />
        <h1>{french ? "Lien de réinitialisation requis" : "Reset Link Required"}</h1>
        <p>{french ? "Ouvrez le lien sécurisé reçu par courriel ou demandez-en un nouveau." : "Open the secure link from your email or request a new one."}</p>
        <Link className="button button-primary" href={localeHref("/account/forgot-password", locale)}>
          {french ? "Demander un nouveau lien" : "Request a new link"}
        </Link>
      </section>
    );
  }

  return (
    <div className="auth-layout auth-recovery-layout">
      <section className="auth-intro">
        <div><h1>{title}</h1><p>{body}</p></div>
        <p className="auth-security-note"><LockKeyhole size={18} aria-hidden="true" /><span>{french ? "Pour votre sécurité, le lien ne peut être utilisé qu’une fois." : "For your security, the link can only be used once."}</span></p>
      </section>
      <form className="auth-form" onSubmit={submit} aria-busy={submitting}>
        {mode === "forgot" ? (
          <div className="field">
            <label htmlFor="recovery-email">{french ? "Courriel" : "Email"}</label>
            <input id="recovery-email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="new-password">{french ? "Nouveau mot de passe" : "New password"}</label>
              <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} aria-describedby="reset-password-help" required />
              <p className="field-help" id="reset-password-help">{french ? "Utilisez au moins 12 caractères." : "Use at least 12 characters."}</p>
            </div>
            <div className="field">
              <label htmlFor="password-confirmation">{french ? "Confirmer le mot de passe" : "Confirm password"}</label>
              <input id="password-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} required />
            </div>
          </>
        )}
        {message ? <p className="form-message form-message-error" role="alert">{message}</p> : null}
        <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
          {submitting
            ? french ? "Veuillez patienter…" : "Please wait…"
            : mode === "forgot"
              ? french ? "Envoyer les instructions" : "Send reset instructions"
              : french ? "Modifier le mot de passe" : "Change password"}
        </button>
        <p className="auth-switch"><Link href={localeHref("/account/login", locale)}>{french ? "Retour à la connexion" : "Back to sign in"}</Link></p>
      </form>
    </div>
  );
}
