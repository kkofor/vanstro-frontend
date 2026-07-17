import type { Metadata } from "next";
import "./globals.css";
import { AppChrome } from "@/components/layout/AppChrome";
import { CookieBar } from "@/components/layout/CookieBar";
import { CookiePreferenceDrawer } from "@/components/layout/CookiePreferenceDrawer";
import { StorefrontProvider } from "@/components/storefront/StorefrontProvider";
import { DocumentLanguage } from "@/components/layout/DocumentLanguage";
import { organizationSchema, serializeJsonLd } from "@/lib/seo/schema";
import { getSiteBaseUrl } from "@/lib/seo/site";

const siteBaseUrl = getSiteBaseUrl();

export const metadata: Metadata = {
  title: {
    default: "VanStro Global Supply",
    template: "%s | VanStro Global Supply"
  },
  description:
    "Shop kitchen cabinets, bathroom vanities, baseboards and home materials with local Canadian stock and dealer support.",
  ...(siteBaseUrl ? { metadataBase: new URL(siteBaseUrl) } : {})
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const schema = organizationSchema();

  return (
    <html lang="en-CA">
      <body>
        <DocumentLanguage />
        {schema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
          />
        ) : null}
        <StorefrontProvider>
          <AppChrome>{children}</AppChrome>
          <CookieBar />
          <CookiePreferenceDrawer />
        </StorefrontProvider>
      </body>
    </html>
  );
}
