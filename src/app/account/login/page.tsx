import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/account/CustomerAuthForm";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Sign in",
  "Sign in to save and revisit favorite VanStro products.",
  "/account/login"
);

export function LoginPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <section className="auth-page">
      <div className="container">
        <CustomerAuthForm mode="login" locale={locale} />
      </div>
    </section>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
