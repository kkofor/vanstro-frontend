import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Culture",
  description: "Cette page sera bientôt disponible.",
  path: "/fr/our-culture",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchOurCulturePage() {
  return (
    <section className="page-hero unified-content-hero">
      <div className="container unified-content-hero-grid">
        <PageBreadcrumb
          className="unified-content-hero-breadcrumb"
          items={[{ label: "Accueil", href: "/fr" }, { label: "Culture" }]}
        />
        <div className="unified-content-hero-copy">
          <h1>Culture</h1>
          <p>Cette page sera bientôt disponible.</p>
        </div>
      </div>
    </section>
  );
}
