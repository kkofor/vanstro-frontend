import type { Metadata } from "next";
import { AccountPageContent } from "@/app/account/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Mon compte",
  description: "Gérez votre compte client VanStro.",
  path: "/fr/account",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchAccountPage() {
  return <AccountPageContent locale="fr-CA" />;
}
