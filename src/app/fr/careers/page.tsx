import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { CareersBoard } from "@/components/careers/CareersBoard";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { CAREERS_EMAIL, careersContent } from "@/content/careers";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = careersContent["fr-CA"];

export const metadata: Metadata = buildPageMetadata({
  title: content.pageTitle,
  description: content.pageDescription,
  path: "/fr/careers",
  image: "/assets/generated/contact-support-hero-v1.webp",
  locale: "fr_CA"
});

export default function FrenchCareersPage() {
  return (
    <div className="careers-page">
      <header className="careers-intro unified-content-hero">
        <div className="container careers-intro-layout unified-content-hero-grid">
          <PageBreadcrumb
            className="careers-breadcrumb unified-content-hero-breadcrumb"
            items={[{ label: "Accueil", href: "/fr" }, { label: "Carrières" }]}
          />
          <div className="careers-intro-copy unified-content-hero-copy">
            <h1>{content.heroTitle}</h1>
            <p className="careers-intro-lede">{content.heroDescription}</p>
            <div className="careers-intro-contact">
              <strong>{content.roles.length} postes à pourvoir</strong>
              <a href={`mailto:${CAREERS_EMAIL}`}>
                <Mail size={17} aria-hidden="true" />
                {CAREERS_EMAIL}
              </a>
            </div>
          </div>
          <figure className="careers-intro-visual">
            <img
              src={assetPath("/assets/generated/contact-support-hero-v1.webp")}
              alt={content.heroImageAlt}
              width={1774}
              height={887}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </div>
      </header>
      <CareersBoard content={content} />
    </div>
  );
}
