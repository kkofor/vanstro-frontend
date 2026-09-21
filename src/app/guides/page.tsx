import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { guideArticles } from "@/lib/data/mock-data";
import { frenchArticles } from "@/app/articles/page";
import { assetPath } from "@/lib/assets";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides",
  description: "Measuring, finishes, care, adjustment, pickup and delivery.",
  path: "/guides",
  image: "/assets/resource-gallery.png"
});

export function GuidesPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  return (
    <div className="guides-index resource-center-page">
      <header className="resource-center-hero unified-content-hero">
        <div className="container resource-center-hero-layout unified-content-hero-grid">
          <PageBreadcrumb
            className="unified-content-hero-breadcrumb"
            items={[
              { label: french ? "Accueil" : "Home", href: localeHref("/", locale) },
              { label: "Guides" }
            ]}
          />
          <div className="unified-content-hero-copy">
            <h1>Guides</h1>
            <p>
              {french
                ? "Prise de mesures, finis, entretien, réglage, ramassage et livraison."
                : "Measuring, finishes, care, adjustment, pickup and delivery."}
            </p>
            <div className="resource-center-hero-actions">
              <a className="button button-primary" href="#guides-list">
                {french ? "Parcourir les guides" : "Browse guides"}
                <ArrowDownToLine size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
          <figure className="secondary-page-hero-visual">
            <img
              src={assetPath("/assets/generated/vanstro-guide-white-v1.webp")}
              alt="White kitchen drawer detail with cabinet hardware and measuring tools"
              width={1672}
              height={941}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </div>
      </header>

      <section className="guides-index-list" id="guides-list" aria-label="Guides">
        <div className="container">
          <div className="contents">
            <ol>
              {[...guideArticles]
                .sort((a, b) => {
                  const titleA = french
                    ? (frenchArticles[a.slug as keyof typeof frenchArticles]?.title ?? a.title)
                    : a.title;
                  const titleB = french
                    ? (frenchArticles[b.slug as keyof typeof frenchArticles]?.title ?? b.title)
                    : b.title;
                  return titleA.length - titleB.length || titleA.localeCompare(titleB);
                })
                .map((article) => {
                  const localized = french ? frenchArticles[article.slug as keyof typeof frenchArticles] : undefined;
                  return (
                    <li key={article.id}>
                      <Link href={localeHref(`/guides/${article.slug}`, locale)}>
                        <h2>{localized?.title ?? article.title}</h2>
                        <p>{localized?.excerpt ?? article.excerpt}</p>
                        <span className="inline-link">{french ? "Lire le guide" : "Read guide"}</span>
                      </Link>
                    </li>
                  );
                })}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function GuidesPage() {
  return <GuidesPageContent />;
}
