import type { Metadata } from "next";
import { AccountAddressesPageContent } from "@/app/account/addresses/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Adresses du compte",
  description: "Gérez vos adresses de livraison VanStro.",
  path: "/fr/account/addresses",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchAccountAddressesPage() {
  return <AccountAddressesPageContent locale="fr-CA" />;
}
