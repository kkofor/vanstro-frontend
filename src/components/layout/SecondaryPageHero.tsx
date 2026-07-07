import type { ReactNode } from "react";
import Link from "next/link";
import { assetPath } from "@/lib/assets";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type SecondaryPageHeroProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  image?: {
    src: string;
    alt: string;
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
          <nav className="legal-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => (
              <span className="secondary-page-hero-breadcrumb-item" key={`${item.label}-${index}`}>
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
              </span>
            ))}
          </nav>
          <h1>{title}</h1>
          <div className="secondary-page-hero-body">{children}</div>
          {actions ? <div className="secondary-page-hero-actions">{actions}</div> : null}
        </div>

        {image ? (
          <figure className="secondary-page-hero-visual">
            <img src={assetPath(image.src)} alt={image.alt} />
          </figure>
        ) : null}
      </div>
    </section>
  );
}
