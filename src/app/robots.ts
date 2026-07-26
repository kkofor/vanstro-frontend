import type { MetadataRoute } from "next";
import { basePath, deployedPath, getSiteBaseUrl, publicUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const siteBaseUrl = getSiteBaseUrl();
  const sitemapUrl = publicUrl("/sitemap.xml");

  if (!siteBaseUrl || !sitemapUrl) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: deployedPath("/"),
      disallow: [
        "/account/",
        "/cart/",
        "/checkout/",
        "/cookie-settings/",
        "/dashboard/",
        "/favorites/",
        "/orders/",
        "/v1-1/",
        "/fr/account/",
        "/fr/cart/",
        "/fr/checkout/",
        "/fr/cookie-settings/",
        "/fr/dashboard/",
        "/fr/favorites/",
        "/fr/orders/",
        "/fr/v1-1/"
      ].map(deployedPath)
    },
    sitemap: sitemapUrl,
    host: `${new URL(siteBaseUrl).origin}${basePath}`
  };
}
