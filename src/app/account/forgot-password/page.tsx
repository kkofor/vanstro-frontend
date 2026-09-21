import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordRecoveryForm } from "@/components/account/PasswordRecoveryForm";
import { CommercePageSkeleton } from "@/components/ui/CommerceStatePanel";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Reset password",
  "Request a secure VanStro password reset link.",
  "/account/forgot-password"
);

export function ForgotPasswordPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <section className="auth-page">
      <div className="container">
        <Suspense fallback={<CommercePageSkeleton rows={1} label={locale === "fr-CA" ? "Chargement du formulaire" : "Loading recovery form"} />}>
          <PasswordRecoveryForm mode="forgot" locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageContent />;
}
