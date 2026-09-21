import type { Metadata } from "next";

import { notFound } from "next/navigation";
import { DashboardPageContent } from "@/app/dashboard/page";
import { DASHBOARD_SECTION_SLUGS, DASHBOARD_SLUG_TO_TAB } from "@/lib/dashboard/routes";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return Object.values(DASHBOARD_SECTION_SLUGS)
    .filter((section) => section !== "overview")
    .map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const tab = DASHBOARD_SLUG_TO_TAB[section];
  if (!tab || tab === "overview") return { ...buildPrivateMetadata("Dashboard", "VanStro administration.", "/dashboard"), referrer: "no-referrer" };
  return {
    ...buildPrivateMetadata(
      `Dashboard — ${section.replaceAll("-", " ")}`,
      `Manage VanStro ${section.replaceAll("-", " ")}.`,
      `/dashboard/${section}`
    ),
    referrer: "no-referrer"
  };
}

export default async function DashboardSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const tab = DASHBOARD_SLUG_TO_TAB[section];
  if (!tab || tab === "overview") notFound();
  return <DashboardPageContent section={tab} />;
}
