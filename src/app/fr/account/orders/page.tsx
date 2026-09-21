import type { Metadata } from "next";
import { AccountOrdersPageContent } from "@/app/account/orders/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Commandes du compte",
  description: "Consultez l'historique de vos commandes VanStro.",
  path: "/fr/account/orders",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchAccountOrdersPage() {
  return <AccountOrdersPageContent locale="fr-CA" />;
}
