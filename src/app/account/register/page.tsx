import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/account/CustomerAuthForm";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Create account",
  "Create a VanStro account to save favorite products.",
  "/account/register"
);

export function RegisterPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <section className="auth-page">
      <div className="container">
        <CustomerAuthForm mode="register" locale={locale} />
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return <RegisterPageContent />;
}
