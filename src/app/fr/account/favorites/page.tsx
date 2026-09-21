import type { Metadata } from "next";
import { AccountFavoritesPageContent } from "@/app/account/favorites/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Favoris du compte",
  description: "Consultez les produits VanStro enregistrés dans votre compte.",
  path: "/fr/account/favorites",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchAccountFavoritesPage() {
  return <AccountFavoritesPageContent locale="fr-CA" />;
}
