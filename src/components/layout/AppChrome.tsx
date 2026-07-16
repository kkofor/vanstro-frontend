import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CartAddedDrawer } from "@/components/checkout/CartAddedDrawer";
import { CustomerSupportWidget } from "@/components/layout/CustomerSupportWidget";
import { LocationDetector } from "@/components/layout/LocationDetector";
import { getCartSuggestions } from "@/lib/api/server";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const cartSuggestions = getCartSuggestions();

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
      <CartAddedDrawer suggestedProducts={cartSuggestions} />
      <CustomerSupportWidget />
      <LocationDetector />
    </>
  );
}
