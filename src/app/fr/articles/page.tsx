import type { Metadata } from "next";
import { ArticlesPageContent } from "@/app/articles/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Centre de téléchargement",
  description: "Téléchargez les catalogues, les guides d’installation et les documents de garantie VanStro, ou consultez les guides de planification.",
  path: "/fr/articles",
  image: "/assets/resource-gallery.png",
  locale: "fr_CA"
});

export default function FrenchArticlesPage() {
  return <ArticlesPageContent locale="fr-CA" />;
}
