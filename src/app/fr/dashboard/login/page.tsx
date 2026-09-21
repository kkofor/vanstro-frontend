import type { Metadata } from "next";
import { DashboardLoginPage } from "@/components/dashboard/DashboardLogin";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Connexion au tableau de bord",
    description: "Connexion au tableau de bord d’administration VanStro.",
    path: "/fr/dashboard/login",
    locale: "fr_CA",
    noIndex: true
  }),
  referrer: "no-referrer"
};

export default function FrenchDashboardLoginRoute() {
  return <DashboardLoginPage locale="fr-CA" />;
}
