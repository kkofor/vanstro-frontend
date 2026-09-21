import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = { ...buildPageMetadata({ title: "Tableau de bord — médias", description: "Gérer les médias VanStro.", path: "/fr/dashboard/media", locale: "fr_CA", noIndex: true }), referrer: "no-referrer" };
export default function FrenchDashboardMediaPage() { return <DashboardPageContent locale="fr-CA" section="cms" />; }
