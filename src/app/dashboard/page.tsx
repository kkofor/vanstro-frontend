import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Dashboard",
  "VanStro admin dashboard for catalog, pricing and operations data.",
  "/dashboard"
);

export default function DashboardPage() {
  return <DashboardShell />;
}
