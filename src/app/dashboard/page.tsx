import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "VanStro admin dashboard for catalog, pricing and operations data."
};

export default function DashboardPage() {
  return <DashboardShell />;
}
