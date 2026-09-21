import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

const views = ["overview", "lifecycle", "history", "general-storefront", "commerce", "api-service-accounts", "auth-rbac", "privacy-retention"] as const;
export function generateStaticParams() { return views.map((view) => ({ view })); }
export async function generateMetadata({ params }: { params: Promise<{ view: string }> }): Promise<Metadata> {
  const { view } = await params;
  return { ...buildPrivateMetadata("Tableau de bord — Paramètres", "Gérer le cycle de vie contrôlé des paramètres VanStro.", `/fr/dashboard/settings/${view}`), referrer: "no-referrer" };
}
export default async function SettingsViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!views.includes(view as typeof views[number])) notFound();
  return <DashboardPageContent locale="fr-CA" section="settings" />;
}
