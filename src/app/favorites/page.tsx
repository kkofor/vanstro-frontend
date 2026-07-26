import type { Metadata } from "next";
import { FavoritesClient } from "@/components/product/FavoritesClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Favorites",
  "Saved VanStro products for future cart and checkout workflows.",
  "/favorites"
);

export function FavoritesPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Favoris" : "Favorites"}</h1>
          <p>{french ? "Retrouvez les produits enregistrés pour vos prochains achats." : "Saved products for future cart and checkout planning."}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <FavoritesClient locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function FavoritesPage() {
  return <FavoritesPageContent />;
}
