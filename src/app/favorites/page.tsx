import type { Metadata } from "next";
import { FavoritesClient } from "@/components/product/FavoritesClient";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Saved VanStro products for future cart and checkout workflows."
};

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
