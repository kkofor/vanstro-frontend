import type { Metadata } from "next";
import { DealerMapPageContent } from "@/app/dealers/map/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Carte des détaillants",
  description: "Consultez les emplacements des détaillants VanStro et leur zone locale d’exécution des commandes.",
  path: "/fr/dealers/map",
  image: "/assets/generated/dealer-map-storefront-v1.webp",
  locale: "fr_CA"
});

export default function FrenchDealerMapPage() {
  return <DealerMapPageContent locale="fr-CA" />;
}
