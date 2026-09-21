import type { Metadata } from "next";
import { OrderLookupPageContent } from "@/app/orders/lookup/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Suivre une commande",
  description: "Consultez votre commande VanStro à l’aide du numéro de commande et du jeton d’accès.",
  path: "/fr/orders/lookup",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchOrderLookupPage() {
  return <OrderLookupPageContent locale="fr-CA" />;
}
