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

type HomePageV11Props = {
  banner: Banner;
  products: ProductSummary[];
  articles: ArticleSummary[];
  dealers: Dealer[];
};

const categoryCards = [
  {
    title: "Kitchen",
    text: "Cabinets, vanities, hardware",
    href: "/products?category=kitchen-cabinets",
    image: assetPath("/assets/generated/vanstro-hero-white-v1.webp"),
    width: 1672,
    height: 941,
    large: true
  },
  {
    title: "Bathroom",
    text: "Vanities and fixtures",
    href: "/products?category=bathroom-vanities",
    image: assetPath("/assets/original-site/img-b03.gif"),
    width: 602,
    height: 292
  },
  {
    title: "Flooring",
    text: "Laminate and vinyl",
    href: "/products?category=flooring",
    image: assetPath("/assets/original-site/img-b02.gif"),
    width: 602,
    height: 292,
    comingSoon: true
  },
  {
    title: "Trim",
    text: "Baseboards and casings",
    href: "/products?category=baseboards",
    image: assetPath("/assets/original-site/img-b04.gif"),
    width: 1220,
    height: 292
  },
  {
    title: "Doors and windows",
    text: "Interior and exterior",
    href: "/products?category=doors-windows",
    image: assetPath("/assets/generated/category-doors-windows.webp"),
    width: 1774,
    height: 887,
    comingSoon: true
  }
];

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
    title: "Dealer handles fulfillment",
    text: "The assigned VanStro dealer receives the order for pickup, delivery or project support."
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
  "Access stocked VanStro product supply",
  "Receive online orders from local customers",
  "Use dealer pricing, CRM and POS support",
  "Get marketing assets and settlement workflows"
];

export function HomePageV11({ banner, products, articles, dealers }: HomePageV11Props) {
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
              <span>home materials across Canada</span>
            </h1>
            <p>
              Shop ready-to-order cabinets, vanities and baseboards online. After checkout,
              a local VanStro dealer handles pickup, delivery or project support.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/products" prefetch={false}>
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
            <Link className="section-link" href="/products" prefetch={false}>
              View all
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="category-grid">
            {categoryCards.map((category) => (
              <Link
                className={category.large ? "category-card large" : "category-card"}
                href={category.href}
                prefetch={false}
                key={category.title}
              >
                <img
                  src={category.image}
                  alt={category.title}
                  width={category.width}
                  height={category.height}
                  loading="lazy"
                  decoding="async"
                />
                {category.comingSoon ? <span className="category-badge">Coming soon</span> : null}
                <div className="category-copy">
                  <h3>{category.title}</h3>
                  <p>{category.text}</p>
                </div>
              </Link>
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
            <Link className="section-link" href="/products" prefetch={false}>
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
              Join the VanStro dealer network to access supply resources, ecommerce demand,
              dealer pricing and operating tools across Canadian markets.
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
              <Link className="button button-secondary" href="/account/login">
                Dealer Login
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
          <Link className="button button-primary" href="/products">
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
              <Link className="section-link" href="/articles/how-to-measure-for-cabinets">
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
