import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = { ...buildPageMetadata({ title: "Tableau de bord — tâches de données", description: "Gérer les imports et exports contrôlés VanStro.", path: "/fr/dashboard/data-jobs", locale: "fr_CA", noIndex: true }), referrer: "no-referrer" };
export default function FrenchDashboardDataJobsPage() { return <DashboardPageContent locale="fr-CA" section="cms" />; }
