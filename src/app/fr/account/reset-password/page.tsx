import type { Metadata } from "next";
import { ResetPasswordPageContent } from "@/app/account/reset-password/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Choisir un nouveau mot de passe",
    description: "Terminez la réinitialisation sécurisée de votre mot de passe VanStro.",
    path: "/fr/account/reset-password",
    locale: "fr_CA",
    noIndex: true
  }),
  referrer: "no-referrer"
};

export default function FrenchResetPasswordPage() {
  return <ResetPasswordPageContent locale="fr-CA" />;
}
