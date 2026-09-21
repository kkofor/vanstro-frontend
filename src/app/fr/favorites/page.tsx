import type { Metadata } from "next";
import { FavoritesPageContent } from "@/app/favorites/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Favoris",
  description: "Retrouvez vos produits VanStro favoris pour vos prochains achats.",
  path: "/fr/favorites",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchFavoritesPage() {
  return <FavoritesPageContent locale="fr-CA" />;
}
