"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Laptop,
  MapPin,
  PackageCheck,
  Plus
} from "lucide-react";
import { ArticleSummary, Banner, Dealer, ProductSummary } from "@/lib/api/api-contract";
import { ProductCard } from "@/components/product/ProductCard";
import { useMemo } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { assetPath } from "@/lib/assets";

type HomePageProps = {
  banner: Banner;
  products: ProductSummary[];
  articles: ArticleSummary[];
  dealers: Dealer[];
};

const categoryCards = [
  {
    title: "Kitchen",
    text: "Ready-to-order cabinets and hardware",
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
    title: "Handle series",
    text: "Cabinet handles and hardware",
    href: "/products?category=handle-series",
    image: assetPath("/assets/products/kitchen-cabinets/aluminum-alloy-handle-060101111-ctc-96mm-primary.jpg"),
    width: 602,
    height: 292
  },
  {
    title: "Trim",
    text: "Baseboards, casings and profiles",
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

const resources = [
  {
    title: "Planning ideas",
    text: "Compare room layouts and stocked product combinations.",
    action: "View planning ideas",
    href: "/articles",
    icon: BookOpen,
    image: assetPath("/assets/generated/vanstro-hero-white-v1.webp"),
    width: 1672,
    height: 941
  },
  {
    title: "3D Design Tool",
    text: "Visualize layouts before you build a product list.",
    action: "Start designing",
    href: "https://tools.vanstro.ca/",
    icon: Laptop,
    image: assetPath("/assets/generated/vanstro-guide-white-v1.webp"),
    width: 1672,
    height: 941
  },
  {
    title: "Product specs",
    text: "Download specs, warranty notes and installation guides.",
    action: "Read specs guide",
    href: "/articles/how-to-measure-for-cabinets",
    icon: ClipboardList,
    image: assetPath("/assets/generated/vanstro-dealer-white-v1.webp"),
    width: 1672,
    height: 941
  },
  {
    title: "Materials and finishes",
    text: "Review white cabinet finishes and primed trim materials.",
    action: "View finishes",
    href: "/articles/what-finishes-are-available",
    icon: PackageCheck,
    image: assetPath("/assets/original-site/img-b02.gif"),
    width: 602,
    height: 292
  }
];

export function HomePage({ banner, products, articles, dealers }: HomePageProps) {
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
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>
              <span>Kitchen cabinets and home materials</span>
              {" "}
              <span>delivered across Canada</span>
            </h1>
            <p>{banner.subtitle}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/products" prefetch={false}>
                Shop Products
              </Link>
              <Link className="button button-secondary" href="#stores">
                Find a Dealer
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
            <h2 className="section-title">Popular products</h2>
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
        <div className="container dealer-band">
          <div className="dealer-copy">
            <h2>For trade buyers and dealer partners</h2>
            <p>
              Contractors can order stocked products for projects, while independently
              owned businesses can apply to participate as local dealers. Each dealer
              manages its own operations, marketing, customers, personnel and services.
            </p>
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
            <h2 className="section-title">Project planning resources</h2>
          </div>
          <div className="resource-row">
            {resources.map((resource) => {
              return (
                <Link href={resource.href} className="resource-item" prefetch={false} key={resource.title}>
                  <img
                    src={resource.image}
                    alt={resource.title}
                    width={resource.width}
                    height={resource.height}
                    loading="lazy"
                    decoding="async"
                  />
                  <span>
                    <h3>{resource.title}</h3>
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
            <h2>Find a dealer or showroom</h2>
            <p>Choose a local VanStro dealer for pickup, delivery coordination and project support.</p>
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
          <Link className="button button-primary" href="/contact">
            Contact a Dealer
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
