import type { Metadata } from "next";
import "./globals.css";
import { AppChrome } from "@/components/layout/AppChrome";
import { CookieBar } from "@/components/layout/CookieBar";
import { CookiePreferenceDrawer } from "@/components/layout/CookiePreferenceDrawer";
import { StorefrontProvider } from "@/components/storefront/StorefrontProvider";
import { organizationSchema } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: {
    default: "VanStro Global Supply",
    template: "%s | VanStro Global Supply"
  },
  description:
    "Shop kitchen cabinets, bathroom vanities, baseboards and home materials with local Canadian stock and dealer support.",
  metadataBase: new URL("https://vanstro.vip"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "VanStro Global Supply",
    description:
      "Ready-to-order cabinets, vanities and home materials across Canada.",
    url: "https://vanstro.vip",
    siteName: "VanStro Global Supply",
    locale: "en_CA",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
        <StorefrontProvider>
          <AppChrome>{children}</AppChrome>
          <CookieBar />
          <CookiePreferenceDrawer />
        </StorefrontProvider>
      </body>
    </html>
  );
}
