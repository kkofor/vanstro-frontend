"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CartAddedDrawer } from "@/components/checkout/CartAddedDrawer";
import { CustomerSupportWidget } from "@/components/layout/CustomerSupportWidget";
import { LocationDetector } from "@/components/layout/LocationDetector";
import { LocalizedSkipLink } from "@/components/i18n/LocalizedSkipLink";
import { CookieBar } from "@/components/layout/CookieBar";
import { CookiePreferenceDrawer } from "@/components/layout/CookiePreferenceDrawer";
import {
  DashboardFoundationBoundary,
  useDashboardFoundation
} from "@/components/dashboard/DashboardFoundationContext";
import { dashboardChromeOwned } from "@/lib/dashboard/f0-shell";

export { isDashboardPath } from "@/lib/dashboard/f0-shell";

function AppChromeContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const foundation = useDashboardFoundation();
  // V11-2: dashboard paths always own their chrome — including
  // /dashboard/login, /fr/dashboard/login and every anonymous dashboard
  // route — so the storefront chrome never renders inside the Dashboard.
  // The single exception is the legacy shell state, which keeps the
  // established storefront-chrome fallback (V11-1 behavior, byte-identical).
  if (dashboardChromeOwned(pathname, foundation.status)) return children;

  return (
    <>
      <LocalizedSkipLink />
      <SiteHeader />
      <main className="main-shell" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <CartAddedDrawer />
      <CustomerSupportWidget />
      <LocationDetector />
      <CookieBar />
      <CookiePreferenceDrawer />
    </>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <DashboardFoundationBoundary>
      <AppChromeContent>{children}</AppChromeContent>
    </DashboardFoundationBoundary>
  );
}
