import type { Metadata } from "next";
import { FavoritesClient } from "@/components/product/FavoritesClient";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Favorites",
  "Saved VanStro products for future cart and checkout workflows.",
  "/favorites"
);

export default function FavoritesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Favorites</h1>
          <p>Saved products for future cart and checkout planning.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <FavoritesClient />
        </div>
      </section>
    </>
  );
}
