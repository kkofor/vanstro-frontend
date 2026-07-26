"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { vanstroApi } from "@/lib/api/api-client";
import {
  contactLeadFromForm,
  dealerApplicationFromForm
} from "@/lib/api/form-endpoints";
import { localizeApiError } from "@/lib/i18n/api-error-localization";

type PublicSubmissionFormProps = {
  children: ReactNode;
  className: string;
  id: string;
  kind: "contact" | "dealer-application";
};

export function PublicSubmissionForm({
  children,
  className,
  id,
  kind
}: PublicSubmissionFormProps) {
  const { copy, locale } = useLocale();
  const [result, setResult] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result.status === "submitting") return;

    const formElement = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement) submitter.disabled = true;
    setResult({ status: "submitting" });

    try {
      const form = new FormData(formElement);
      if (kind === "contact") {
        await vanstroApi.submitContactLead(
          contactLeadFromForm(form, locale, window.location.pathname)
        );
      } else {
        await vanstroApi.submitDealerApplication(
          dealerApplicationFromForm(form, locale)
        );
      }
      formElement.reset();
      setResult({
        status: "success",
        message: copy.publicSubmission.success
      });
    } catch (error) {
      setResult({
        status: "error",
        message: locale === "fr-CA"
          ? localizeApiError(error, locale)
          : copy.publicSubmission.error
      });
    } finally {
      if (submitter instanceof HTMLButtonElement) submitter.disabled = false;
    }
  }

  return (
    <form className={className} id={id} onSubmit={submit} aria-busy={result.status === "submitting"}>
      {children}
      {result.status !== "idle" ? (
        <p
          className="quantity-limit-note"
          role={result.status === "error" ? "alert" : "status"}
          aria-live={result.status === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {result.status === "submitting" ? copy.publicSubmission.submitting : result.message}
        </p>
      ) : null}
    </form>
  );
}
