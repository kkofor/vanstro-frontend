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
        deployedPath("/account/"),
        deployedPath("/cart/"),
        deployedPath("/checkout/"),
        deployedPath("/cookie-settings/"),
        deployedPath("/dashboard/"),
        deployedPath("/favorites/"),
        deployedPath("/orders/"),
        deployedPath("/v1-1/")
      ]
    },
    sitemap: sitemapUrl,
    host: `${new URL(siteBaseUrl).origin}${basePath}`
  };
}
