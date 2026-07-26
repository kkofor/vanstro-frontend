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
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Créer un compte" : "Create account"}</h1>
          <p>{french ? "Créez un compte pour enregistrer et retrouver vos produits favoris." : "Create an account to save and revisit favorite products."}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CustomerAuthForm mode="register" locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function RegisterPage() {
  return <RegisterPageContent />;
}
