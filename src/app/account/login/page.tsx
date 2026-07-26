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
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Se connecter" : "Sign in"}</h1>
          <p>{french ? "Connectez-vous pour enregistrer et retrouver vos produits favoris." : "Sign in to save and revisit favorite products."}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CustomerAuthForm mode="login" locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}
