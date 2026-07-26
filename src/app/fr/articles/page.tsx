import type { Metadata } from "next";
import { ArticlesPageContent } from "@/app/articles/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides d’achat",
  description: "Guides VanStro sur les armoires, les meubles-lavabos, les plinthes, le ramassage et la livraison.",
  path: "/fr/articles",
  image: "/assets/resource-gallery.png",
  locale: "fr_CA"
});

export default function FrenchArticlesPage() {
  return <ArticlesPageContent locale="fr-CA" />;
}
