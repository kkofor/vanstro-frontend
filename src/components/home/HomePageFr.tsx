"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MapPin, PencilRuler, Store } from "lucide-react";
import type { Banner, ProductSummary } from "@/lib/api/api-contract";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeAudienceCard } from "@/components/home/HomeAudienceCard";
import { HomeCollectionCard } from "@/components/home/HomeCollectionCard";
import { HomeProductGrid } from "@/components/home/HomeProductGrid";
import { HomeProcess, type AudienceRole } from "@/components/home/HomeProcess";
import { HomeFaq } from "@/components/home/HomeFaq";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { assetPath } from "@/lib/assets";
import { FRENCH_LOCALE } from "@/lib/i18n/locale";
import { canonicalCatalogUrl } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";
import type { CatalogCategoryOption } from "@/lib/product/catalog-config";
import { localizeProductTaxonomyLabel } from "@/lib/product/product-localization";

/**
 * Display assets for the category entry cards, keyed by canonical category
 * slug. The set of cards, their order and labels come from the Website API
 * `/categories` payload; this map only decorates known categories with
 * curated imagery and falls back to the generic hero image for new ones.
 */
const CATEGORY_CARD_IMAGES: Readonly<
  Record<string, { image: string; width: number; height: number; text: string; large?: boolean }>
> = {
  "kitchen-cabinets": {
    image: assetPath("/assets/generated/category-kitchen-cabinets-v2.webp"),
    width: 5504,
    height: 3072,
    text: "Collections d’armoires prêtes à commander",
    large: true
  },
  "bathroom-vanities": {
    image: assetPath("/assets/products/bathroom-vanities/vanity-cabinet-v3021-door-tdl-023021311-v3021stdl-pwms-wh-top-primary.jpg"),
    width: 936,
    height: 894,
    text: "Meubles-lavabos et solutions de rangement pour la salle de bains"
  },
  "handle-series": {
    image: assetPath("/assets/generated/category-handle-series-v2.webp"),
    width: 5504,
    height: 3072,
    text: "Poignées et quincaillerie d’armoires"
  },
  "baseboards-and-mouldings": {
    image: assetPath("/assets/products/baseboards-mouldings/baseboard-041-034114222-vs41-10ft-ea-primary.jpg"),
    width: 936,
    height: 894,
    text: "Plinthes, cadrages et profilés"
  }
};

const DEFAULT_CATEGORY_CARD_IMAGE = {
  image: assetPath("/assets/generated/vanstro-hero-white-v1.webp"),
  width: 1672,
  height: 941,
  text: ""
} as const;

const audiencePaths = [
  {
    id: "homeowner" as const,
    title: "Je suis propriétaire",
    text: "Devis gratuits et un plan 3D offert pour votre espace.",
    action: "Obtenir un devis gratuit",
    href: "/fr/contact",
    secondaryAction: "Demander un design 3D gratuit",
    secondaryHref: "/fr/contact",
    icon: PencilRuler
  },
  {
    id: "contractor" as const,
    title: "Nous sommes entrepreneurs",
    text: "Armoires, meubles-lavabos, moulures et quincaillerie en stock pour les chantiers.",
    action: "Trouver un détaillant local",
    href: "/fr/dealers/map",
    secondaryAction: "Télécharger les plans",
    secondaryHref: "/fr/articles",
    icon: MapPin
  },
  {
    id: "dealer" as const,
    title: "Je suis détaillant",
    text: "Gérez votre clientèle locale, les commandes de produits et les services offerts séparément.",
    action: "Portail détaillant",
    href: "/fr/dealer-access",
    secondaryAction: "Devenir détaillant",
    secondaryHref: "/fr/dealers/apply",
    icon: Store
  }
];

export function HomePageFr({ banner, products, categories }: { banner: Banner; products: ProductSummary[]; categories: CatalogCategoryOption[] }) {
  const { categories: runtimeCategories } = useLocale();
  const effectiveCategories = runtimeCategories.length ? runtimeCategories : categories;
  const [audienceRole, setAudienceRole] = useState<AudienceRole | null>(null);
  const processId = "audience-process-panel-fr";

  return (
    <>
      <HomeHero
        eyebrow="Votre plateforme mondiale d’approvisionnement"
        title="Armoires de cuisine et matériaux résidentiels, livrés partout au Canada"
        description="Magasinez en ligne des armoires, meubles-lavabos et moulures haut de gamme. Vérifiez la disponibilité locale pour un ramassage rapide ou une livraison à domicile dans votre région."
        ctas={[
          { label: "Magasiner les produits", href: canonicalCatalogUrl(FRENCH_LOCALE), variant: "primary", icon: "arrow", onClick: handleCanonicalCatalogClick(FRENCH_LOCALE) },
          { label: "Trouver un détaillant", href: "/fr/dealers/map", variant: "secondary", icon: "pin" },
          { label: "Devenir détaillant", href: "/fr/dealers/apply", variant: "ghost" }
        ]}
        image={{ src: banner.image.url, width: banner.image.width ?? 1672, height: banner.image.height ?? 941 }}
      />

      <section className="section category-section">
        <div className="container">
          <div className="section-heading category-heading">
            <h2 className="section-title">Magasiner par catégorie</h2>
            <Link className="section-link" href={canonicalCatalogUrl(FRENCH_LOCALE)} prefetch={false} onClick={handleCanonicalCatalogClick(FRENCH_LOCALE)}>
              Tout voir <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="home-collection-grid">
            {effectiveCategories.map((category) => {
              const visual = CATEGORY_CARD_IMAGES[category.slug] ?? DEFAULT_CATEGORY_CARD_IMAGE;
              const label = localizeProductTaxonomyLabel(category.label, "fr-CA");
              return (
                <HomeCollectionCard
                  key={category.id}
                  href={`/fr/products?category=${category.slug}`}
                  image={visual.image}
                  width={visual.width}
                  height={visual.height}
                  title={label}
                  alt={label}
                  description={visual.text || category.description || undefined}
                />
              );
            })}
          </div>
        </div>
      </section>

      <HomeProductGrid
        title="Produits populaires"
        viewAllLabel="Voir tous les produits"
        viewAllHref={canonicalCatalogUrl(FRENCH_LOCALE)}
        viewAllOnClick={handleCanonicalCatalogClick(FRENCH_LOCALE)}
        products={products}
        locale="fr-CA"
      />

      <section className="section audience-section" aria-labelledby="audience-paths-title-fr">
        <div className="container audience-shell">
          <span className="audience-band-rule" aria-hidden="true" />
          <div className="dealer-band audience-band">
            <div className="dealer-copy audience-copy">
              <span className="audience-eyebrow">Commencez votre projet</span>
              <h2 id="audience-paths-title-fr">Choisissez le parcours adapté à vos travaux</h2>
              <div className="audience-path-grid">
                {audiencePaths.map((path) => (
                  <HomeAudienceCard
                    key={path.id}
                    title={path.title}
                    text={path.text}
                    icon={path.icon}
                    selected={audienceRole === path.id}
                    controlsId={processId}
                    onToggle={() => setAudienceRole((current) => (current === path.id ? null : path.id))}
                  />
                ))}
              </div>
            </div>
            <div className="dealer-image audience-image">
              <img src={assetPath("/assets/generated/vanstro-dealer-white-v1.webp")} alt="Produits d’armoires VanStro blanches stockés pour l’exécution locale" width={1672} height={941} loading="lazy" decoding="async" />
            </div>
          </div>
          {audienceRole ? <HomeProcess key={audienceRole} role={audienceRole} locale={FRENCH_LOCALE} id={processId} /> : null}
        </div>
      </section>

      <HomeFaq locale={FRENCH_LOCALE} />
    </>
  );
}
