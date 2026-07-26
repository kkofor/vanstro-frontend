import Link from "next/link";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export function NotFoundPage({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <section className="legal-page-shell" lang={locale}>
      <div className="container legal-hero">
        <span className="legal-eyebrow">404</span>
        <h1>{french ? "Cette page est introuvable" : "This page could not be found"}</h1>
        <p>
          {french
            ? "L’adresse est peut-être incorrecte, ou la page a été déplacée. Revenez à l’accueil ou parcourez les produits VanStro."
            : "The address may be incorrect, or the page may have moved. Return home or browse VanStro products."}
        </p>
        <div className="button-row">
          <Link className="button button-primary" href={localeHref("/", locale)}>
            {french ? "Retour à l’accueil" : "Return home"}
          </Link>
          <Link className="button button-secondary" href={localeHref("/products", locale)}>
            {french ? "Voir les produits" : "Browse products"}
          </Link>
        </div>
      </div>
    </section>
  );
}
