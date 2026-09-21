import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description: "This page is coming soon.",
  path: "/blog",
  noIndex: true
});

export default function BlogPage() {
  return (
    <section className="page-hero unified-content-hero">
      <div className="container unified-content-hero-grid">
        <PageBreadcrumb
          className="unified-content-hero-breadcrumb"
          items={[{ label: "Home", href: "/" }, { label: "Blog" }]}
        />
        <div className="unified-content-hero-copy">
          <h1>Blog</h1>
          <p>This page is coming soon.</p>
        </div>
      </div>
    </section>
  );
}
