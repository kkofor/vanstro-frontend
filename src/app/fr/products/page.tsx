import type { Metadata } from "next";
import { ProductsPageContent } from "@/app/products/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Produits",
  description: "Parcourez les armoires de cuisine, les meubles-lavabos, les plinthes et les matériaux résidentiels VanStro.",
  path: "/fr/products",
  image: "/assets/category-kitchen.png",
  locale: "fr_CA"
});

export default function FrenchProductsPage() {
  return <ProductsPageContent locale="fr-CA" />;
}
