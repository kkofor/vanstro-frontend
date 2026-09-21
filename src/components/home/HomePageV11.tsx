"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Laptop,
  MapPin,
  PackageCheck,
  Plus
} from "lucide-react";
import { useMemo } from "react";
import { ArticleSummary, Banner, Dealer, ProductSummary } from "@/lib/api/api-contract";
import { ProductCard } from "@/components/product/ProductCard";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { assetPath } from "@/lib/assets";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { canonicalCatalogUrl } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";
import type { CatalogCategoryOption } from "@/lib/product/catalog-config";

type HomePageV11Props = {
  banner: Banner;
  products: ProductSummary[];
  articles: ArticleSummary[];
  dealers: Dealer[];
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
    image: assetPath("/assets/generated/vanstro-hero-white-v1.webp"),
    width: 1672,
    height: 941,
    text: "Cabinets, vanities, hardware",
    large: true
  },
  "bathroom-vanities": {
    image: assetPath("/assets/original-site/img-b03.gif"),
    width: 602,
    height: 292,
    text: "Vanities and fixtures"
  },
  "handle-series": {
    image: assetPath("/assets/products/kitchen-cabinets/aluminum-alloy-handle-060101111-ctc-96mm-primary.jpg"),
    width: 602,
    height: 292,
    text: "Cabinet handles and hardware"
  },
  "baseboards-and-mouldings": {
    image: assetPath("/assets/original-site/img-b04.gif"),
    width: 1220,
    height: 292,
    text: "Baseboards and casings"
  }
};

const DEFAULT_CATEGORY_CARD_IMAGE = {
  image: assetPath("/assets/generated/vanstro-hero-white-v1.webp"),
  width: 1672,
  height: 941,
  text: ""
} as const;

const fulfillmentSteps = [
  {
    title: "Shop online",
    text: "Browse categories, compare SKUs and add products to your cart."
  },
  {
    title: "Checkout and pay",
    text: "Checkout captures customer details, fulfillment choice and online payment."
  },
  {
    title: "Local dealer confirms fulfillment",
    text: "The local dealer selected for the order confirms availability and pickup or delivery arrangements."
  }
];

const resources = [
  {
    title: "Project Gallery",
    text: "See real room ideas before selecting cabinets or vanities.",
    action: "View gallery",
    icon: BookOpen,
    image: assetPath("/assets/generated/vanstro-hero-white-v1.webp"),
    width: 1672,
    height: 941
  },
  {
    title: "3D Design Tool",
    text: "Plan a kitchen, generate visuals and prepare your product list.",
    action: "Start designing",
    icon: Laptop,
    image: assetPath("/assets/generated/vanstro-guide-white-v1.webp"),
    width: 1672,
    height: 941
  },
  {
    title: "Project Cart",
    text: "Save products by room, then checkout or send the list to a dealer.",
    action: "Open cart",
    icon: ClipboardList,
    image: assetPath("/assets/generated/vanstro-dealer-white-v1.webp"),
    width: 1672,
    height: 941,
    href: "/cart"
  },
  {
    title: "Samples",
    text: "Order door and finish samples before a larger purchase.",
    action: "Order samples",
    icon: PackageCheck,
    image: assetPath("/assets/original-site/img-b02.gif"),
    width: 602,
    height: 292
  }
];

const dealerBenefits = [
  "Purchase available VanStro products under written commercial terms",
  "Choose whether to accept customer-selected fulfillment requests",
  "Use optional product information and order-status tools",
  "Access optional product images and approved brand materials"
];

export function HomePageV11({ banner, products, articles, dealers, categories }: HomePageV11Props) {
  const {
    selectedDealerId,
    setSelectedDealer
  } = useStorefront();

  const selectedDealer = useMemo(
    () => dealers.find((dealer) => dealer.id === selectedDealerId) ?? dealers[0],
    [dealers, selectedDealerId]
  );

  return (
    <>
      <section className="hero hero-v1plus">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">VanStro Canada</span>
            <h1>
              <span>Kitchen cabinets and</span>
              {" "}
              <span>home materials in participating Canadian service areas</span>
            </h1>
            <p>
              Shop ready-to-order cabinets, vanities and baseboards online. After checkout,
              your local dealer confirms pickup, delivery or project-support options.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={canonicalCatalogUrl(DEFAULT_LOCALE)} prefetch={false} onClick={handleCanonicalCatalogClick(DEFAULT_LOCALE)}>
                Shop Products
              </Link>
              <Link className="button button-secondary" href="#stores">
                View Stores
              </Link>
              <Link className="button button-soft" href="/dealers/apply">
                Become a Dealer
              </Link>
            </div>
          </div>
          <div className="hero-media" aria-hidden="true">
            <img
              src={banner.image.url}
              alt=""
              width={banner.image.width ?? 1672}
              height={banner.image.height ?? 941}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="section section-compact fulfillment-section">
        <div className="container fulfillment-flow" aria-label="Order fulfillment flow">
          {fulfillmentSteps.map((step, index) => (
            <article className="fulfillment-step" key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section category-section">
        <div className="container">
          <div className="section-heading category-heading">
            <h2 className="section-title">Shop by category</h2>
            <Link className="section-link" href={canonicalCatalogUrl(DEFAULT_LOCALE)} prefetch={false} onClick={handleCanonicalCatalogClick(DEFAULT_LOCALE)}>
              View all
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((category) => {
              const visual = CATEGORY_CARD_IMAGES[category.slug] ?? DEFAULT_CATEGORY_CARD_IMAGE;

              return (
                <Link
                  className={visual.large ? "category-card large" : "category-card"}
                  href={`/products?category=${category.slug}`}
                  prefetch={false}
                  key={category.id}
                >
                  <img
                    src={visual.image}
                    alt={category.label}
                    width={visual.width}
                    height={visual.height}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="category-copy">
                    <h3>{category.label}</h3>
                    <p>{category.description ?? visual.text}</p>
                  </div>
                </Link>
              );
            })}
            {Array.from({ length: Math.max(0, 6 - categories.reduce((n, c) => n + (CATEGORY_CARD_IMAGES[c.slug]?.large ? 2 : 1), 0)) }, (_, index) => (
              <div className="category-card-placeholder" aria-hidden="true" key={`category-placeholder-${index}`}>
                <img src={assetPath("/assets/generated/category-doors-windows.webp")} alt="" loading="lazy" decoding="async" />
                <span>Coming soon</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section product-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Popular products</h2>
              <p className="section-subcopy">
                Product cards stay focused on price, dimensions, stock and the next purchase
                action.
              </p>
            </div>
            <Link className="section-link" href={canonicalCatalogUrl(DEFAULT_LOCALE)} prefetch={false} onClick={handleCanonicalCatalogClick(DEFAULT_LOCALE)}>
              View all products
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="section dealer-section">
        <div className="container dealer-band dealer-band-plus">
          <div className="dealer-copy">
            <span className="eyebrow light">Dealer program</span>
            <h2>For contractors and dealers</h2>
            <p>
              Apply to participate as an independently owned local dealer with access
              to VanStro product supply and optional order-administration resources.
              Customer demand, order volume, revenue and business results are not guaranteed.
            </p>
            <div className="dealer-benefit-list">
              {dealerBenefits.map((benefit) => (
                <span key={benefit}>
                  <CheckCircle2 size={15} strokeWidth={2.4} />
                  {benefit}
                </span>
              ))}
            </div>
            <div className="button-row">
              <Link className="button button-accent" href="/dealers/apply">
                Become a Dealer
              </Link>
              <Link className="button button-secondary" href="/dealer-access">
                Dealer Portal
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
            </div>
          </div>
          <div className="dealer-image">
            <img
              src={assetPath("/assets/generated/vanstro-dealer-white-v1.webp")}
              alt="White VanStro cabinet products stocked in dealer warehouse inventory"
              width={1672}
              height={941}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="section resource-section">
        <div className="container">
          <div className="section-heading">
            <h2 className="section-title">Design Studio Resources</h2>
          </div>
          <div className="resource-row">
            {resources.map((resource) => {
              const Icon = resource.icon;
              return (
                <Link href={resource.href ?? "/"} className="resource-item" prefetch={false} key={resource.title}>
                  <img
                    src={resource.image}
                    alt={resource.title}
                    width={resource.width}
                    height={resource.height}
                    loading="lazy"
                    decoding="async"
                  />
                  <span>
                    <h3>
                      <Icon size={18} strokeWidth={2} />
                      {resource.title}
                    </h3>
                    <p>{resource.text}</p>
                    <span className="inline-link">
                      {resource.action}
                      <ArrowRight size={16} strokeWidth={2} />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section store-section" id="stores">
        <div className="container store-band">
          <MapPin size={42} strokeWidth={1.8} />
          <div>
            <h2>Find a store near you</h2>
            <p>Choose a local dealer market for pickup and availability.</p>
          </div>
          <div className="store-list">
            {dealers.slice(0, 4).map((dealer) => (
              <button
                className={dealer.id === selectedDealer.id ? "city-chip active" : "city-chip"}
                type="button"
                onClick={() => setSelectedDealer(dealer)}
                key={dealer.id}
              >
                {dealer.city}
              </button>
            ))}
          </div>
          <Link className="button button-primary" href={canonicalCatalogUrl(DEFAULT_LOCALE)} prefetch={false} onClick={handleCanonicalCatalogClick(DEFAULT_LOCALE)}>
            Shop Selected Store
          </Link>
        </div>
      </section>

      <section className="section guide-section">
        <div className="container guide-grid">
          <div>
            <div className="section-heading">
              <h2 className="section-title">Buying guide</h2>
            </div>
            <div className="faq-list">
              {articles.map((article) => (
                <Link className="faq-row" href={`/articles/${article.slug}`} key={article.id}>
                  {article.title}
                  <Plus size={18} strokeWidth={2} />
                </Link>
              ))}
            </div>
            <div className="button-row">
              <Link className="section-link" href="/faq">
                View all FAQs
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
            </div>
          </div>
          <div className="guide-image">
            <img
              src={assetPath("/assets/generated/vanstro-guide-white-v1.webp")}
              alt="White kitchen drawer detail with cabinet hardware and measuring tools"
              width={1672}
              height={941}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>
    </>
  );
}
