import type { Metadata } from "next";
import { AccountProfilePageContent } from "@/app/account/profile/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Profil du compte",
  description: "Mettez à jour votre profil client VanStro.",
  path: "/fr/account/profile",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchAccountProfilePage() {
  return <AccountProfilePageContent locale="fr-CA" />;
}
