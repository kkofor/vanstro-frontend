import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Tableau de bord",
  description: "Tableau de bord d’administration VanStro pour le catalogue, la tarification et les opérations.",
  path: "/fr/dashboard",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchDashboardPage() {
  return <DashboardPageContent locale="fr-CA" />;
}
