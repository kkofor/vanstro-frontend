import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Dashboard",
  "VanStro admin dashboard for catalog, pricing and operations data.",
  "/dashboard"
);

export function DashboardPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <Suspense fallback={<div className="dashboard-page" />}>
      <DashboardShell locale={locale} />
    </Suspense>
  );
}

export default function DashboardPage() {
  return <DashboardPageContent />;
}
