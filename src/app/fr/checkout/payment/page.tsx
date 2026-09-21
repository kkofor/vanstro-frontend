import type { Metadata } from "next";
import { PaymentPageContent } from "@/app/checkout/payment/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Paiement",
  description: "Finalisez le paiement de votre commande VanStro en toute sécurité.",
  path: "/fr/checkout/payment",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchPaymentPage() {
  return <PaymentPageContent locale="fr-CA" />;
}
