import type { ReactNode } from "react";
import { assetPath } from "@/lib/assets";
import { PageBreadcrumb, type PageBreadcrumbItem } from "@/components/layout/PageBreadcrumb";

type SecondaryPageHeroProps = {
  breadcrumbs: PageBreadcrumbItem[];
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  image?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
  className?: string;
};

export function SecondaryPageHero({
  breadcrumbs,
  title,
  children,
  actions,
  image,
  className
}: SecondaryPageHeroProps) {
  return (
    <section className={["page-hero", "secondary-page-hero", className].filter(Boolean).join(" ")}>
      <div className="container secondary-page-hero-grid">
        <div className="secondary-page-hero-copy">
          <PageBreadcrumb items={breadcrumbs} />
          <h1>{title}</h1>
          <div className="secondary-page-hero-body">{children}</div>
          {actions ? <div className="secondary-page-hero-actions">{actions}</div> : null}
        </div>

        {image ? (
          <figure className="secondary-page-hero-visual">
            <img
              src={assetPath(image.src)}
              alt={image.alt}
              width={image.width ?? 1672}
              height={image.height ?? 941}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        ) : null}
      </div>
    </section>
  );
}
