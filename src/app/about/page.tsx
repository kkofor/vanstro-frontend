import type { Metadata } from "next";
import Link from "next/link";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About VanStro",
  description:
    "Learn about VanStro Global Supply Inc., a Canadian building materials supply and distribution platform headquartered in Winnipeg, Manitoba.",
  path: "/about",
  image: "/assets/generated/vanstro-hero-white-v1.webp",
  languages: { "en-CA": "/about", "zh-CN": "/zh/about" }
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
      "Authorized local dealers combine local market knowledge with the resources of a national distribution platform."
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
            <nav className="legal-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <span>About us</span>
            </nav>
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
            <span>Authorized local dealer distribution network</span>
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
              Our products are distributed through a network of authorized local
              dealers who provide delivery coordination, customer support,
              installation assistance where offered, and after-sales service.
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
            <h2>A different way to build a distribution network</h2>
            <p>
              Traditional distribution models often require dealers to invest
              heavily in inventory, marketing, customer acquisition, and operating
              infrastructure before they can begin growing.
            </p>
          </div>
          <div className="about-profile-statement">
            <p>
              VanStro takes a different approach. By centralizing branding,
              marketing, customer development, supply chain management, and
              operational support, VanStro supports many of the functions that
              traditionally required significant time, capital, and resources from
              independent dealers.
            </p>
            <p>
              As a result, our partners can focus on customer communication,
              order execution, and local service support, while inventory risk,
              marketing, customer development, and supply chain management are
              supported by the VanStro system.
            </p>
            <p>
              We believe success should not be built on large investments and
              high levels of risk. It should be built on continuous opportunities
              and a reliable operating system.
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
