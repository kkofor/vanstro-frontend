"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MapPin, PencilRuler, Store } from "lucide-react";
import { Banner, ProductSummary } from "@/lib/api/api-contract";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeAudienceCard } from "@/components/home/HomeAudienceCard";
import { HomeCollectionCard } from "@/components/home/HomeCollectionCard";
import { HomeProductGrid } from "@/components/home/HomeProductGrid";
import { HomeProcess, type AudienceRole } from "@/components/home/HomeProcess";
import { HomeFaq } from "@/components/home/HomeFaq";
import { assetPath } from "@/lib/assets";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { canonicalCatalogUrl } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { CatalogCategoryOption } from "@/lib/product/catalog-config";

type HomePageProps = {
  banner: Banner;
  products: ProductSummary[];
  categories: CatalogCategoryOption[];
};

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
    text: "Ready-to-order cabinet collections",
    large: true
  },
  "bathroom-vanities": {
    image: assetPath("/assets/products/bathroom-vanities/vanity-cabinet-v3021-door-tdl-023021311-v3021stdl-pwms-wh-top-primary.jpg"),
    width: 936,
    height: 894,
    text: "Vanity cabinets and bath storage"
  },
  "handle-series": {
    image: assetPath("/assets/generated/category-handle-series-v2.webp"),
    width: 5504,
    height: 3072,
    text: "Cabinet handles and hardware"
  },
  "baseboards-and-mouldings": {
    image: assetPath("/assets/products/baseboards-mouldings/baseboard-041-034114222-vs41-10ft-ea-primary.jpg"),
    width: 936,
    height: 894,
    text: "Baseboards, casings and profiles"
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
    title: "I am a homeowner",
    text: "Free quotes and a complimentary 3D layout for your space.",
    action: "Get a free quote",
    href: "/contact",
    secondaryAction: "Request a free 3D design",
    secondaryHref: "/contact",
    icon: PencilRuler
  },
  {
    id: "contractor" as const,
    title: "We are contractors",
    text: "In-stock cabinets, vanities, trim and hardware for active jobs.",
    action: "Find a local dealer",
    href: "/dealers/map",
    secondaryAction: "Download drawings",
    secondaryHref: "/articles",
    icon: MapPin
  },
  {
    id: "dealer" as const,
    title: "I am a dealer",
    text: "Manage local customers, product orders and separately offered services.",
    action: "Dealer Portal",
    href: "/dealer-access",
    secondaryAction: "Become a Dealer",
    secondaryHref: "/dealers/apply",
    icon: Store
  }
];

export function HomePage({ banner, products, categories }: HomePageProps) {
  // Prefer the runtime-revalidated catalog after hydration while retaining the
  // build-time snapshot for the first paint and API-unavailable fallback.
  const { categories: runtimeCategories } = useLocale();
  const effectiveCategories = runtimeCategories.length ? runtimeCategories : categories;
  const [audienceRole, setAudienceRole] = useState<AudienceRole | null>(null);
  const processId = "audience-process-panel";

  return (
    <>
      <HomeHero
        eyebrow="Your global supply platform"
        title="Kitchen Cabinets And Home Materials, Delivered Across Canada"
        description="Shop premium cabinets, vanities, and trim online. Check local availability for fast pickup or doorstep delivery in your area."
        ctas={[
          { label: "Shop Products", href: canonicalCatalogUrl(DEFAULT_LOCALE), variant: "primary", icon: "arrow", onClick: handleCanonicalCatalogClick(DEFAULT_LOCALE) },
          { label: "Find a Dealer", href: "/dealers/map", variant: "secondary", icon: "pin" },
          { label: "Become a Dealer", href: "/dealers/apply", variant: "ghost" }
        ]}
        image={{ src: banner.image.url, width: banner.image.width ?? 1672, height: banner.image.height ?? 941 }}
      />

      <section className="section category-section">
        <div className="container">
          <div className="section-heading category-heading">
            <h2 className="section-title">Shop By Category</h2>
            <Link className="section-link" href={canonicalCatalogUrl(DEFAULT_LOCALE)} prefetch={false} onClick={handleCanonicalCatalogClick(DEFAULT_LOCALE)}>
              View all
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="home-collection-grid">
            {effectiveCategories.map((category) => {
              const visual = CATEGORY_CARD_IMAGES[category.slug] ?? DEFAULT_CATEGORY_CARD_IMAGE;
              return (
                <HomeCollectionCard
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  image={visual.image}
                  width={visual.width}
                  height={visual.height}
                  title={category.label}
                  alt={category.label}
                  description={category.description ?? visual.text}
                />
              );
            })}
          </div>
        </div>
      </section>

      <HomeProductGrid
        title="Popular Products"
        viewAllLabel="View all products"
        viewAllHref={canonicalCatalogUrl(DEFAULT_LOCALE)}
        viewAllOnClick={handleCanonicalCatalogClick(DEFAULT_LOCALE)}
        products={products}
      />

      <section className="section audience-section" aria-labelledby="audience-paths-title">
        <div className="container audience-shell">
          <span className="audience-band-rule" aria-hidden="true" />
          <div className="dealer-band audience-band">
            <div className="dealer-copy audience-copy">
              <span className="audience-eyebrow">Start your project</span>
              <h2 id="audience-paths-title">Choose The Path That Fits Your Work</h2>
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
              <img
                src={assetPath("/assets/generated/vanstro-dealer-white-v1.webp")}
                alt="White VanStro cabinet products stocked for local fulfillment"
                width={1672}
                height={941}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          {audienceRole ? <HomeProcess key={audienceRole} role={audienceRole} locale={DEFAULT_LOCALE} id={processId} /> : null}
        </div>
      </section>

      <HomeFaq locale={DEFAULT_LOCALE} />
    </>
  );
}
