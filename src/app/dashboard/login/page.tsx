import type { Metadata } from "next";
import { DashboardLoginPage } from "@/components/dashboard/DashboardLogin";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata(
    "Dashboard 登录",
    "VanStro 管理后台登录。",
    "/dashboard/login"
  ),
  referrer: "no-referrer"
};

export default function DashboardLoginRoute() {
  return <DashboardLoginPage locale="en-CA" />;
}
