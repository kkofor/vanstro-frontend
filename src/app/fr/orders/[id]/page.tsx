import type { Metadata } from "next";
import { OrderPageContent } from "@/app/orders/[id]/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "demo-order" }];
}

export const metadata: Metadata = buildPageMetadata({
  title: "État de la commande",
  description: "Consultez l’état du paiement, la réservation du stock et l’avancement du traitement de votre commande VanStro.",
  path: "/fr/orders/demo-order",
  locale: "fr_CA",
  noIndex: true
});

export default async function FrenchOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderPageContent id={id} locale="fr-CA" />;
}
