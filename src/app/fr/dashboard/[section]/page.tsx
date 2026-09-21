import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardPageContent } from "@/app/dashboard/page";
import { DASHBOARD_SECTION_SLUGS, DASHBOARD_SLUG_TO_TAB } from "@/lib/dashboard/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return Object.values(DASHBOARD_SECTION_SLUGS)
    .filter((section) => section !== "overview")
    .map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return {
    ...buildPageMetadata({
      title: `Tableau de bord — ${section.replaceAll("-", " ")}`,
      description: `Gérez les données VanStro : ${section.replaceAll("-", " ")}.`,
      path: `/fr/dashboard/${section}`,
      locale: "fr_CA",
      noIndex: true
    }),
    referrer: "no-referrer"
  };
}

export default async function FrenchDashboardSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const tab = DASHBOARD_SLUG_TO_TAB[section];
  if (!tab || tab === "overview") notFound();
  return <DashboardPageContent locale="fr-CA" section={tab} />;
}
