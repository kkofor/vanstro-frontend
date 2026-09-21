import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ",
  description: "This page is coming soon.",
  path: "/faq",
  noIndex: true
});

export default function FaqPage() {
  return (
    <section className="page-hero unified-content-hero">
      <div className="container unified-content-hero-grid">
        <PageBreadcrumb
          className="unified-content-hero-breadcrumb"
          items={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
        />
        <div className="unified-content-hero-copy">
          <h1>FAQ</h1>
          <p>This page is coming soon.</p>
        </div>
      </div>
    </section>
  );
}
