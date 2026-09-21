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
  unified?: boolean;
};

export function SecondaryPageHero({
  breadcrumbs,
  title,
  children,
  actions,
  image,
  className,
  unified = false
}: SecondaryPageHeroProps) {
  return (
    <section className={["page-hero", "secondary-page-hero", unified && "unified-content-hero", className].filter(Boolean).join(" ")}>
      <div className={["container", "secondary-page-hero-grid", unified && "unified-content-hero-grid"].filter(Boolean).join(" ")}>
        {unified ? <PageBreadcrumb className="unified-content-hero-breadcrumb" items={breadcrumbs} /> : null}
        <div className={["secondary-page-hero-copy", unified && "unified-content-hero-copy"].filter(Boolean).join(" ")}>
          {!unified ? <PageBreadcrumb items={breadcrumbs} /> : null}
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
