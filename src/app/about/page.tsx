import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About VanStro",
  description:
    "Learn about VanStro Global Supply Inc., a Canadian building materials supply and distribution platform headquartered in Winnipeg, Manitoba.",
  path: "/about",
  image: "/assets/generated/vanstro-hero-white-v1.webp"
});

const apartItems = [
  {
    title: "Consistent standards across Canada",
    text:
      "Customers and dealer partners can expect consistent product standards, fair pricing, and a practical commitment to service."
  },
  {
    title: "Global sourcing, competitive pricing",
    text:
      "Long-term manufacturing partnerships and supply chain management help VanStro bring quality products into Canada at competitive prices."
  },
  {
    title: "Local service, national support",
    text:
      "Participating independent dealers combine local market knowledge with access to a national product distribution platform."
  },
  {
    title: "Quality you can trust",
    text:
      "Products are inspected, quality-controlled, labeled, and traceable through the distribution process."
  }
];

export default function AboutPage() {
  return (
    <>
      <section className="page-hero about-profile-hero">
        <div className="container about-profile-hero-grid">
          <div>
            <PageBreadcrumb items={[{ label: "Home", href: "/" }, { label: "About us" }]} />
            <h1>More than a supplier.</h1>
            <p className="about-profile-lede">
              VanStro Global Supply Inc. is a Canadian-based company headquartered
              in Winnipeg, Manitoba.
            </p>
            <p>
              We are a national supply chain and distribution platform specializing
              in building materials, including ready-to-assemble kitchen cabinets,
              bathroom vanities, wall panels, baseboards, and related products.
            </p>
            <div className="about-profile-actions">
              <Link className="button button-primary" href="/products">
                Browse products
              </Link>
              <Link className="button button-secondary" href="/contact">
                Contact us
              </Link>
            </div>
          </div>
          <figure className="about-profile-visual">
            <img
              src={assetPath("/assets/generated/vanstro-dealer-white-v1.webp")}
              alt="White VanStro cabinet products stocked in dealer warehouse inventory"
              width={1672}
              height={941}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="page-panel about-profile-panel">
        <div className="container about-profile-layout">
          <article className="about-profile-main">
            <h2>A better way to bring building materials to Canada</h2>
            <p>
              Through long-term partnerships with leading manufacturers and a
              growing nationwide distribution network, VanStro provides Canadian
              customers and dealers with consistent quality, reliable supply,
              competitive pricing, and dependable local support.
            </p>
            <p>
              Our mission is to connect world-class manufacturing with local
              service, enabling a smarter and more efficient flow of building
              materials across Canada.
            </p>
            <p>
              We believe strong local businesses are the foundation of strong
              communities, and our platform is built to support their long-term
              growth.
            </p>
          </article>
          <aside className="about-profile-facts" aria-label="Company highlights">
            <span>Headquartered in Winnipeg, Manitoba</span>
            <span>Canadian building-materials supply platform</span>
            <span>Cabinets, vanities, wall panels, baseboards, and related products</span>
            <span>Independent local dealer distribution network</span>
          </aside>
        </div>
      </section>

      <section className="page-panel about-profile-panel alt">
        <div className="container about-profile-layout">
          <div className="about-profile-section-heading">
            <h2>What we do</h2>
            <p>
              VanStro manages product sourcing, supply chain coordination, and
              distribution support so customers and dealer partners can work with
              a more reliable materials platform.
            </p>
          </div>
          <div className="about-profile-copy">
            <p>
              We source high-quality products from leading manufacturers around
              the world and bring them into Canada through a carefully managed
              supply chain.
            </p>
            <p>
              Every product undergoes quality control and remains traceable
              throughout the distribution process.
            </p>
            <p>
              Our products are distributed through participating independent local
              dealers. Each dealer decides which delivery coordination, customer
              support, installation assistance and after-sales services it offers.
            </p>
            <p>
              This allows customers to benefit from the strength of a national
              platform while enjoying responsive local support.
            </p>
          </div>
        </div>
      </section>

      <section className="page-panel about-profile-panel">
        <div className="container">
          <div className="about-profile-section-heading narrow">
            <h2>A practical independent-dealer distribution model</h2>
            <p>
              VanStro supplies building products and product information to
              participating independent dealers serving local customers.
            </p>
          </div>
          <div className="about-profile-statement">
            <p>
              VanStro manages product sourcing, product information and supply
              coordination. Each participating dealer remains an independent
              business and controls its own operations, staffing and dealer-provided
              services.
            </p>
            <p>
              Dealers independently decide how to market their businesses, develop
              customer relationships and offer local services. Any dealer service
              agreement, pricing, scheduling, payment and workmanship responsibility
              is between the dealer and the customer.
            </p>
            <p>
              Each dealer remains responsible for its own business decisions and
              results. Customer referrals, orders, revenue and profit are not
              guaranteed. Commercial terms must be confirmed in writing.
            </p>
          </div>
        </div>
      </section>

      <section className="page-panel about-profile-panel alt">
        <div className="container">
          <div className="about-profile-section-heading narrow">
            <h2>What sets us apart</h2>
          </div>
          <div className="about-profile-apart-grid">
            {apartItems.map((item) => (
              <article className="about-profile-apart-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-panel about-profile-panel">
        <div className="container about-profile-commitment">
          <h2>Our commitment</h2>
          <ul aria-label="VanStro commitments">
            <li>High quality</li>
            <li>Competitive pricing</li>
            <li>Service close to home</li>
          </ul>
        </div>
      </section>

      <section className="about-profile-cta">
        <div className="container about-profile-cta-grid">
          <div>
            <h2>Build with a reliable supply chain and local support.</h2>
            <p>
              Whether you are planning a project or exploring a dealer
              partnership, VanStro is designed to help building materials move
              through Canada with confidence and stability.
            </p>
          </div>
          <div className="about-profile-actions">
            <Link className="button button-primary" href="/contact">
              Contact VanStro
            </Link>
            <Link className="button button-secondary" href="/dealers/apply">
              Become a dealer
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
