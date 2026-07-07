import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Mail,
  Phone,
  Shield,
  Truck,
  Users,
  Briefcase
} from "lucide-react";
import {
  legalNavLinks,
  type LegalPageEntry
} from "@/content/legalPages";
import { assetPath } from "@/lib/assets";

const heroVisuals: Record<string, { image: string; alt: string; caption: string }> = {
  "legal-disclaimer": {
    image: assetPath("/assets/generated/vanstro-guide-white-v1.png"),
    alt: "White cabinet drawer with organized samples and measuring tools",
    caption: "Reference details before ordering"
  },
  "terms-and-conditions": {
    image: assetPath("/assets/generated/vanstro-hero-white-v1.png"),
    alt: "Bright white kitchen cabinet installation with sample cabinet doors",
    caption: "Website terms and order documents"
  },
  privacy: {
    image: assetPath("/assets/generated/vanstro-guide-white-v1.png"),
    alt: "Cabinet drawer with material samples and project tools",
    caption: "Privacy and data handling"
  },
  "cookie-settings": {
    image: assetPath("/assets/generated/vanstro-guide-white-v1.png"),
    alt: "Cabinet drawer with organized finish samples",
    caption: "Manage site preferences"
  },
  "return-policy": {
    image: assetPath("/assets/generated/vanstro-dealer-white-v1.png"),
    alt: "VanStro cabinet inventory stored in a warehouse",
    caption: "Distributor return process"
  },
  "dealer-services-and-responsibility": {
    image: assetPath("/assets/generated/vanstro-dealer-white-v1.png"),
    alt: "Warehouse aisle with boxed cabinet inventory",
    caption: "Platform and dealer boundaries"
  },
  careers: {
    image: assetPath("/assets/generated/vanstro-hero-white-v1.png"),
    alt: "Bright kitchen showroom with white cabinets and sample doors",
    caption: "Join the VanStro network"
  }
};

function renderLegalBody(body: string) {
  const blocks = body.split(/\n{2,}/).filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n").filter(Boolean);
    const listItems = lines
      .filter((line) => line.trim().startsWith("- "))
      .map((line) => line.trim().replace(/^- /, ""));

    if (listItems.length > 0 && listItems.length === lines.length) {
      return (
        <ul className="legal-bullet-list" key={`list-${blockIndex}`}>
          {listItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    if (listItems.length > 0) {
      const lead = lines.filter((line) => !line.trim().startsWith("- ")).join(" ");

      return (
        <div className="legal-body-block" key={`mixed-${blockIndex}`}>
          {lead ? <p>{lead}</p> : null}
          <ul className="legal-bullet-list">
            {listItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      );
    }

    return <p key={`paragraph-${blockIndex}`}>{block}</p>;
  });
}

function LegalSectionIcon({
  icon
}: {
  icon?: LegalPageEntry["sections"][number]["icon"];
}) {
  const commonProps = { size: 22, strokeWidth: 1.8 };

  if (icon === "shield") {
    return <Shield {...commonProps} />;
  }

  if (icon === "truck") {
    return <Truck {...commonProps} />;
  }

  if (icon === "clipboard") {
    return <ClipboardList {...commonProps} />;
  }

  if (icon === "users") {
    return <Users {...commonProps} />;
  }

  if (icon === "briefcase") {
    return <Briefcase {...commonProps} />;
  }

  return <FileText {...commonProps} />;
}

export function LegalPageTemplate({ entry }: { entry: LegalPageEntry }) {
  const heroVisual = heroVisuals[entry.slug] ?? heroVisuals["legal-disclaimer"];

  return (
    <>
      <section className="page-hero">
        <div className="container legal-hero-grid">
          <div className="legal-hero-copy">
            <nav className="legal-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <ChevronRight size={14} strokeWidth={1.8} />
              <span>Legal</span>
              <ChevronRight size={14} strokeWidth={1.8} />
              <span>{entry.title}</span>
            </nav>
            <h1>{entry.title}</h1>
            <p>{entry.intro}</p>
            {entry.updated || entry.sourceSummary ? (
              <div className="legal-meta">
                {entry.updated ? <span>{entry.updated}</span> : null}
                {entry.sourceSummary ? <span>{entry.sourceSummary}</span> : null}
              </div>
            ) : null}
          </div>

          <figure className="legal-hero-visual">
            <img src={heroVisual.image} alt={heroVisual.alt} />
            <figcaption>{heroVisual.caption}</figcaption>
          </figure>
        </div>
      </section>

      <section className="page-panel">
        <div className="container legal-page">
          <div className="legal-content">
            <nav className="legal-link-row" aria-label="Legal pages">
              {legalNavLinks.map((link) => {
                const isActive = link.href === `/${entry.slug}`;

                return (
                  <Link
                    className={`legal-link-chip${isActive ? " is-active" : ""}`}
                    href={link.href}
                    key={link.href}
                    aria-label={link.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="legal-link-chip-desktop" aria-hidden="true">
                      {link.label}
                    </span>
                    <span className="legal-link-chip-mobile" aria-hidden="true">
                      {link.shortLabel ?? link.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {entry.sections.map((section) => (
              <section className="legal-section" key={section.title}>
                <div className="legal-section-marker" aria-hidden="true">
                  <LegalSectionIcon icon={section.icon} />
                </div>
                <div className="legal-section-copy">
                  <h2>{section.title}</h2>
                  {renderLegalBody(section.body)}
                  {section.accent ? <strong>{section.accent}</strong> : null}
                </div>
              </section>
            ))}
          </div>

          <aside className="summary-panel legal-summary">
            <div className="legal-summary-copy">
              <span className="legal-summary-kicker">Support</span>
              <h2>{entry.summaryTitle}</h2>
              <p>{entry.summaryBody}</p>
            </div>

            <div className="legal-support-list" aria-label="Support contact details">
              <a href="mailto:info@vanstro.ca">
                <Mail size={16} strokeWidth={2.1} />
                <span>info@vanstro.ca</span>
              </a>
              <a href="tel:+12042212288">
                <Phone size={16} strokeWidth={2.1} />
                <span>204-221-2288</span>
              </a>
              <span>
                <Clock3 size={16} strokeWidth={2.1} />
                <span>Business-day follow-up</span>
              </span>
            </div>

            {entry.supportNote ? <p className="legal-summary-note">{entry.supportNote}</p> : null}

            <div className="legal-summary-actions">
              <Link className="button button-primary" href={entry.primaryCta.href}>
                {entry.primaryCta.label}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
