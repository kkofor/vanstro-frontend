import type { Metadata } from "next";
import { CartPageContent } from "@/app/cart/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Panier",
  description: "Vérifiez votre panier VanStro et préparez une commande selon le stock disponible.",
  path: "/fr/cart",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchCartPage() {
  return <CartPageContent locale="fr-CA" />;
}
