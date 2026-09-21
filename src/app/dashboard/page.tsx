import type { Metadata } from "next";

import { Suspense } from "react";
import { DashboardF0Shell } from "@/components/dashboard/DashboardF0Shell";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata(
    "Dashboard",
    "VanStro admin dashboard for catalog, pricing and operations data.",
    "/dashboard"
  ),
  referrer: "no-referrer"
};

export function DashboardPageContent({ locale = "en-CA", section = "overview" }: { locale?: SiteLocale; section?: import("@/lib/dashboard/types").TabKey }) {
  return (
    <>
      <meta content="no-referrer" name="referrer" />
      <Suspense fallback={<div className="dashboard-page" />}>
        <DashboardF0Shell locale={locale} section={section} />
      </Suspense>
    </>
  );
}

export default function DashboardPage() {
  return <DashboardPageContent />;
}
