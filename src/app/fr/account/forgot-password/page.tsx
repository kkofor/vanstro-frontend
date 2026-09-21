import type { Metadata } from "next";
import { ForgotPasswordPageContent } from "@/app/account/forgot-password/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Réinitialiser le mot de passe",
  description: "Demandez un lien sécurisé pour réinitialiser votre mot de passe VanStro.",
  path: "/fr/account/forgot-password",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchForgotPasswordPage() {
  return <ForgotPasswordPageContent locale="fr-CA" />;
}
