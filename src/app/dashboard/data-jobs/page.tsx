import type { Metadata } from "next";
import { DashboardPageContent } from "@/app/dashboard/page";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = { ...buildPrivateMetadata("Dashboard — data jobs", "Manage controlled VanStro import and export jobs.", "/dashboard/data-jobs"), referrer: "no-referrer" };
export default function DashboardDataJobsPage() { return <DashboardPageContent section="cms" />; }
