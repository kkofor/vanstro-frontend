import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordRecoveryForm } from "@/components/account/PasswordRecoveryForm";
import { CommercePageSkeleton } from "@/components/ui/CommerceStatePanel";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata(
    "Choose a new password",
    "Complete a secure VanStro password reset.",
    "/account/reset-password"
  ),
  referrer: "no-referrer"
};

export function ResetPasswordPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <>
      <meta name="referrer" content="no-referrer" />
      <section className="auth-page">
      <div className="container">
        <Suspense fallback={<CommercePageSkeleton rows={1} label={locale === "fr-CA" ? "Chargement du lien sécurisé" : "Loading secure reset link"} />}>
          <PasswordRecoveryForm mode="reset" locale={locale} />
        </Suspense>
      </div>
      </section>
    </>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordPageContent />;
}
