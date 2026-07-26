import type { Metadata } from "next";
import { AboutPageContent } from "@/app/about/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "À propos de VanStro",
  description: "Découvrez comment VanStro relie la commande en ligne de matériaux de construction à l’exécution et au soutien de détaillants locaux.",
  path: "/fr/about",
  image: "/assets/generated/vanstro-dealer-white-v1.webp",
  locale: "fr_CA"
});

export default function FrenchAboutPage() {
  return <AboutPageContent locale="fr-CA" />;
}
