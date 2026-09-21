import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = { ...buildPageMetadata({ title: "Tableau de bord — fondation d’exécution", description: "Gérer la configuration, les indicateurs de fonctionnalité et l’état de préparation contrôlés VanStro.", path: "/fr/dashboard/runtime", locale: "fr_CA", noIndex: true }), referrer: "no-referrer" };
export default function FrenchDashboardRuntimePage() { return <DashboardPageContent locale="fr-CA" section="operations" />; }
