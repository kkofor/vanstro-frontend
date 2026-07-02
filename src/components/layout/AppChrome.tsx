import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FloatingSupportWidget } from "@/components/layout/FloatingSupportWidget";
import { LocationDetector } from "@/components/layout/LocationDetector";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="main-shell">{children}</main>
      <SiteFooter />
      <FloatingSupportWidget />
      <LocationDetector />
    </>
  );
}
