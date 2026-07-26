import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Dashboard",
  "VanStro admin dashboard for catalog, pricing and operations data.",
  "/dashboard"
);

export function DashboardPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return <DashboardShell locale={locale} />;
}

export default function DashboardPage() {
  return <DashboardPageContent />;
}
