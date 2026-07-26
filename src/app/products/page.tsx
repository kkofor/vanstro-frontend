import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsExplorer } from "@/components/product/ProductsExplorer";
import { getProductsForCatalog } from "@/lib/api/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localizeProducts } from "@/lib/product/product-localization";
import type { SiteLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = buildPageMetadata({
  title: "Products",
  description: "Browse VanStro kitchen cabinets, vanities, baseboards and home materials.",
  path: "/products",
  image: "/assets/category-kitchen.png"
});

export async function ProductsPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const products = localizeProducts(await getProductsForCatalog(), locale);

  return (
    <section className="catalog-page">
      <div className="container">
        <Suspense fallback={<div className="catalog-loading">{locale === "fr-CA" ? "Chargement du catalogue…" : "Loading catalog..."}</div>}>
          <ProductsExplorer products={products} locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}

export default function ProductsPage() {
  return <ProductsPageContent />;
}
