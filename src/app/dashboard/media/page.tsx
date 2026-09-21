import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = { ...buildPrivateMetadata("Dashboard — media", "Manage VanStro media.", "/dashboard/media"), referrer: "no-referrer" };
export default function DashboardMediaPage() { return <DashboardPageContent section="cms" />; }
