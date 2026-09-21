import type { Metadata } from "next";
import { DealerContactCards } from "@/components/dealer/DealerContactCards";
import { DealerMapLocator } from "@/components/dealer/DealerMapLocator";
import { SecondaryPageHero } from "@/components/layout/SecondaryPageHero";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localeHref } from "@/lib/i18n/routes";
import type { SiteLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = buildPageMetadata({
  title: "Dealer map",
  description: "View VanStro dealer locations and local fulfillment coverage on the dealer map.",
  path: "/dealers/map",
  image: "/assets/generated/dealer-map-storefront-v1.webp"
});

export function DealerMapPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <SecondaryPageHero
        unified
        breadcrumbs={[
          { label: french ? "Accueil" : "Home", href: localeHref("/", locale) },
          { label: french ? "Programme pour les détaillants" : "Dealer program", href: localeHref("/dealer-program", locale) },
          { label: french ? "Carte des détaillants" : "Dealer map" }
        ]}
        title={french ? "Carte des détaillants" : "Dealer Map"}
        image={{
          src: "/assets/generated/dealer-map-storefront-v1.webp",
          alt: french
            ? "Client arrivant chez un détaillant VanStro indépendant participant"
            : "Customer arriving at a participating independent VanStro dealer location"
        }}
        actions={
          <>
            <a className="button button-primary" href="#dealer-map">
              {french ? "Voir la carte" : "View map"}
            </a>
          </>
        }
      >
        <p>
          {french
            ? "Trouvez un détaillant VanStro indépendant participant pour obtenir du soutien sur les produits et organiser le ramassage ou la livraison de votre commande."
            : "Find a participating independent VanStro dealer for local product support, pickup and order fulfillment."}
        </p>
      </SecondaryPageHero>

      <section className="page-panel dealer-map-panel" id="dealer-map">
        <div className="container">
          <DealerMapLocator locale={locale} />
        </div>
      </section>

      <section className="page-panel contact-page-panel" id="dealer-contacts">
        <div className="container contact-page-dealer-section">
          <div className="contact-page-section-heading">
            <span className="contact-page-kicker">{french ? "Coordonnées des détaillants locaux" : "Local dealer contacts"}</span>
            <h2>{french ? "Trouvez les coordonnées du détaillant le plus proche" : "Find the Nearest Support Contact"}</h2>
            <p>
              {french
                ? "Le détaillant local choisi pour une commande confirme la disponibilité et coordonne le ramassage, les options de livraison, les demandes de retour et le soutien après-vente. Communiquez avec ce détaillant pour l’installation ou tout autre service local offert séparément."
                : "The local dealer selected for an order confirms availability and coordinates pickup, delivery options, return requests and after-sales assistance. Contact that dealer for installation or other separately offered local services."}
            </p>
          </div>

          <DealerContactCards locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function DealerMapPage() {
  return <DealerMapPageContent />;
}
