import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CustomerSupportWidget } from "@/components/layout/CustomerSupportWidget";
import { LocationDetector } from "@/components/layout/LocationDetector";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader />
      <main className="main-shell" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <CustomerSupportWidget />
      <LocationDetector />
    </>
  );
}
