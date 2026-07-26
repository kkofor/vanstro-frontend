import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CartAddedDrawer } from "@/components/checkout/CartAddedDrawer";
import { CustomerSupportWidget } from "@/components/layout/CustomerSupportWidget";
import { LocationDetector } from "@/components/layout/LocationDetector";
import { LocalizedSkipLink } from "@/components/i18n/LocalizedSkipLink";

export function AppChrome({ children }: { children: React.ReactNode }) {
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
    </>
  );
}
