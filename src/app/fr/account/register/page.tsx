import type { Metadata } from "next";
import { RegisterPageContent } from "@/app/account/register/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Créer un compte",
  description: "Créez un compte VanStro pour enregistrer et retrouver vos produits favoris.",
  path: "/fr/account/register",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchRegisterPage() {
  return <RegisterPageContent locale="fr-CA" />;
}
