import type { Metadata } from "next";
import { LoginPageContent } from "@/app/account/login/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Se connecter",
  description: "Connectez-vous à votre compte VanStro pour enregistrer et retrouver vos produits favoris.",
  path: "/fr/account/login",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchLoginPage() {
  return <LoginPageContent locale="fr-CA" />;
}
