"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Laptop,
  MapPin,
  PackageCheck
} from "lucide-react";
import { Banner, ProductSummary } from "@/lib/api/api-contract";
import { ProductCard } from "@/components/product/ProductCard";
import { assetPath } from "@/lib/assets";

type HomePageProps = {
  banner: Banner;
  products: ProductSummary[];
};

const categoryCards = [
  {
    title: "Kitchen cabinets",
    text: "Ready-to-order cabinet collections",
    href: "/products?category=kitchen-cabinets",
    image: assetPath("/assets/generated/category-kitchen-cabinets-v2.webp"),
    width: 5504,
    height: 3072,
    large: true
  },
  {
    title: "Bathroom vanities",
    text: "Vanity cabinets and bath storage",
    href: "/products?category=bathroom-vanities",
    image: assetPath("/assets/original-site/img-b03.gif"),
    width: 602,
    height: 292
  },
  {
    title: "Cabinet accessories",
    text: "Fillers, panels, toe kicks and mouldings",
    href: "/products?category=kitchen-cabinets&q=Accessories",
    image: assetPath("/assets/products/kitchen-cabinets/wall-end-panel-wep1242-018930942-wep1242-ms-wh-primary.jpg"),
    width: 936,
    height: 894
  },
  {
    title: "Handle series",
    text: "Cabinet handles and hardware",
    href: "/products?category=handle-series",
    image: assetPath("/assets/generated/category-handle-series-v2.webp"),
    width: 5504,
    height: 3072
  },
  {
    title: "Trim & mouldings",
    text: "Baseboards, casings and profiles",
    href: "/products?category=baseboards",
    image: assetPath("/assets/original-site/img-b04.gif"),
    width: 1220,
    height: 292
  }
];

const audiencePaths = [
  {
    title: "For homeowners",
    text: "Plan your space, compare materials and confirm measurements before ordering.",
    action: "Plan your project",
    href: "/articles",
    secondaryAction: "Open 3D Design Tool",
    secondaryHref: "https://tools.vanstro.ca/",
    icon: BookOpen
  },
  {
    title: "For contractors",
    text: "Source stocked cabinets, vanities, trim and hardware for active projects.",
    action: "Shop project materials",
    href: "/products",
    secondaryAction: "Review delivery options",
    secondaryHref: "/articles/pickup-and-delivery-options",
    icon: ClipboardList
  },
  {
    title: "For local dealers",
    text: "Manage local customers, product orders and separately offered services.",
    action: "Dealer Login",
    href: "/account/login",
    secondaryAction: "Become a Dealer",
    secondaryHref: "/dealers/apply",
    icon: PackageCheck
  }
];

export function HomePage({ banner, products }: HomePageProps) {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>
              <span>Kitchen cabinets and home materials</span>
              {" "}
              <span>available in participating service areas across Canada</span>
            </h1>
            <p>{banner.subtitle}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/products" prefetch={false}>
                Shop Products
              </Link>
              <Link className="button button-secondary" href="/dealers/map">
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

      <section className="section audience-section" aria-labelledby="audience-paths-title">
        <div className="container dealer-band audience-band">
          <div className="dealer-copy audience-copy">
            <span className="audience-eyebrow">Start your project</span>
            <h2 id="audience-paths-title">Choose the path that fits your work</h2>
            <div className="audience-path-grid">
              {audiencePaths.map((path) => {
                const Icon = path.icon;

                return (
                  <article className="audience-path" key={path.title}>
                    <Icon aria-hidden="true" size={22} strokeWidth={2.1} />
                    <h3>{path.title}</h3>
                    <p>{path.text}</p>
                    <Link className="audience-primary-link" href={path.href} prefetch={false}>
                      {path.action}
                      <ArrowRight aria-hidden="true" size={16} strokeWidth={2.2} />
                    </Link>
                    <Link className="audience-secondary-link" href={path.secondaryHref} prefetch={false}>
                      {path.secondaryAction}
                    </Link>
                  </article>
                );
              })}
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
      </section>

      <section className="section store-section">
        <div className="container store-band store-band-compact">
          <MapPin aria-hidden="true" size={42} strokeWidth={1.8} />
          <div>
            <h2>Find a dealer or showroom</h2>
            <p>Check participating locations for pickup, delivery coordination and project support.</p>
          </div>
          <Link className="button button-primary" href="/dealers/map">
            Find a Dealer
          </Link>
        </div>
      </section>
    </>
  );
}
