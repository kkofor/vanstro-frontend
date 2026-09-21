import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = { ...buildPrivateMetadata("Dashboard — runtime foundation", "Manage controlled VanStro runtime configuration, feature flags, and readiness.", "/dashboard/runtime"), referrer: "no-referrer" };
export default function DashboardRuntimePage() { return <DashboardPageContent section="operations" />; }
