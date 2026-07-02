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
    text: "Cabinets, vanities, hardware",
    href: "/products?category=kitchen-cabinets",
    image: assetPath("/assets/generated/vanstro-hero-white-v1.png"),
    large: true
  },
  {
    title: "Bathroom",
    text: "Vanities and fixtures",
    href: "/products?category=bathroom-vanities",
    image: assetPath("/assets/original-site/img-b03.gif")
  },
  {
    title: "Flooring",
    text: "Laminate and vinyl",
    href: "/products?category=flooring",
    image: assetPath("/assets/original-site/img-b02.gif"),
    comingSoon: true
  },
  {
    title: "Trim",
    text: "Baseboards and casings",
    href: "/products?category=baseboards",
    image: assetPath("/assets/original-site/img-b04.gif")
  },
  {
    title: "Doors and windows",
    text: "Interior and exterior",
    href: "/products?category=doors-windows",
    image: assetPath("/assets/generated/category-doors-windows.png"),
    comingSoon: true
  }
];

const resources = [
  {
    title: "Project Gallery",
    text: "See real projects for inspiration.",
    action: "View gallery",
    icon: BookOpen,
    image: assetPath("/assets/generated/vanstro-hero-white-v1.png")
  },
  {
    title: "3D Design Tool",
    text: "Visualize your space and plan with ease.",
    action: "Start designing",
    icon: Laptop,
    image: assetPath("/assets/generated/vanstro-guide-white-v1.png")
  },
  {
    title: "Product Brochures",
    text: "Download specs and installation guides.",
    action: "View brochures",
    icon: ClipboardList,
    image: assetPath("/assets/generated/vanstro-dealer-white-v1.png")
  },
  {
    title: "Samples",
    text: "Order cabinet door and finish samples.",
    action: "Order samples",
    icon: PackageCheck,
    image: assetPath("/assets/original-site/img-b02.gif")
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
              <span>Kitchen cabinets and</span>
              {" "}
              <span>home materials across Canada</span>
            </h1>
            <p>{banner.subtitle}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/products">
                Shop Products
              </Link>
              <Link className="button button-secondary" href="#stores">
                View Stores
              </Link>
            </div>
          </div>
          <div className="hero-media" aria-hidden="true">
            <img src={banner.image.url} alt="" />
          </div>
        </div>
      </section>

      <section className="section category-section">
        <div className="container">
          <div className="section-heading category-heading">
            <h2 className="section-title">Shop by category</h2>
            <Link className="section-link" href="/products">
              View all
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>
          <div className="category-grid">
            {categoryCards.map((category) => (
              <Link
                className={category.large ? "category-card large" : "category-card"}
                href={category.href}
                key={category.title}
              >
                <img src={category.image} alt={category.title} />
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
            <Link className="section-link" href="/products">
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
            <h2>For contractors and dealers</h2>
            <p>Access trade pricing, stocked inventory and dedicated support across Canada.</p>
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
            <img src={assetPath("/assets/generated/vanstro-dealer-white-v1.png")} alt="White VanStro cabinet products stocked in dealer warehouse inventory" />
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
              return (
                <Link href="/" className="resource-item" key={resource.title}>
                  <img src={resource.image} alt={resource.title} />
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
            <h2>Find a store near you</h2>
            <p>Visit one of our showrooms across Canada.</p>
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
          <Link className="button button-primary" href="/dealers/apply">
            Find a Store
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
            <img src={assetPath("/assets/generated/vanstro-guide-white-v1.png")} alt="White kitchen drawer detail with cabinet hardware and measuring tools" />
          </div>
        </div>
      </section>
    </>
  );
}
