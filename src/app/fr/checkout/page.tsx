import type { Metadata } from "next";
import { CheckoutPageContent } from "@/app/checkout/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Passer à la caisse",
  description: "Indiquez le mode de réception et les renseignements de paiement de votre commande VanStro.",
  path: "/fr/checkout",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchCheckoutPage() {
  return <CheckoutPageContent locale="fr-CA" />;
}
