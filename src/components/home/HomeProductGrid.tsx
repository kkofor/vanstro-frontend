"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MouseEventHandler } from "react";
import type { ProductSummary } from "@/lib/api/api-contract";
import type { SiteLocale } from "@/lib/i18n/locale";
import { ProductCard } from "@/components/product/ProductCard";

type HomeProductGridProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  viewAllOnClick?: MouseEventHandler<HTMLAnchorElement>;
  products: ProductSummary[];
  locale?: SiteLocale;
};

/** Homepage equivalent of the reference ProductGridBlock, retaining production copy and routes. */
export function HomeProductGrid({ title, viewAllLabel, viewAllHref, viewAllOnClick, products, locale }: HomeProductGridProps) {
  return (
    <section className="section product-section">
      <div className="container">
        <div className="section-heading">
          <h2 className="section-title">{title}</h2>
          <Link className="section-link" href={viewAllHref} prefetch={false} onClick={viewAllOnClick}>
            {viewAllLabel}<ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              product={product}
              locale={locale}
              key={product.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
