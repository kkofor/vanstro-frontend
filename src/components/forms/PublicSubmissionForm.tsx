"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import type { Locale } from "@/lib/api/api-contract";
import { vanstroApi } from "@/lib/api/api-client";
import {
  contactLeadFromForm,
  dealerApplicationFromForm
} from "@/lib/api/form-endpoints";

type PublicSubmissionFormProps = {
  children: ReactNode;
  className: string;
  id: string;
  kind: "contact" | "dealer-application";
  locale: Locale;
};

export function PublicSubmissionForm({
  children,
  className,
  id,
  kind,
  locale
}: PublicSubmissionFormProps) {
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
        message: locale === "zh-CN" ? "提交成功。我们会尽快跟进。" : "Submitted successfully. We will follow up soon."
      });
    } catch (error) {
      setResult({
        status: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : locale === "zh-CN"
              ? "提交失败，请稍后重试。"
              : "Submission failed. Please try again."
      });
    } finally {
      if (submitter instanceof HTMLButtonElement) submitter.disabled = false;
    }
  }

  return (
    <form className={className} id={id} onSubmit={submit} aria-busy={result.status === "submitting"}>
      {children}
      {result.status !== "idle" ? (
        <p className="quantity-limit-note" aria-live="polite">
          {result.status === "submitting"
            ? locale === "zh-CN" ? "正在提交..." : "Submitting..."
            : result.message}
        </p>
      ) : null}
    </form>
  );
}
