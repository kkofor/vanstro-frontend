import type { Metadata } from "next";
import { CookieSettingsRouteClient } from "@/components/layout/CookieSettingsRouteClient";

export const metadata: Metadata = {
  title: "Cookie Settings",
  description: "Manage VanStro cookie preferences."
};

export default function CookieSettingsPage() {
  return <CookieSettingsRouteClient />;
}
