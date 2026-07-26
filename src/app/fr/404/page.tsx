import type { Metadata } from "next";
import { NotFoundPage } from "@/components/layout/NotFoundPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Page introuvable",
  description: "La page demandée est introuvable. Revenez à l’accueil ou parcourez les produits VanStro.",
  path: "/fr/404",
  locale: "fr_CA",
  noIndex: true,
  languages: {
    "en-CA": "/404",
    "fr-CA": "/fr/404",
    "x-default": "/404"
  }
});

export default function FrenchNotFoundPage() {
  return <NotFoundPage locale="fr-CA" />;
}
