import type { MetadataRoute } from "next";
import { products } from "@/lib/data/mock-data";
import { getSiteBaseUrl, publicUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

const staticRoutes = [
  "/",
  "/about",
  "/articles",
  "/careers",
  "/contact",
  "/dealer-program",
  "/dealer-services-and-responsibility",
  "/dealers/apply",
  "/legal-disclaimer",
  "/privacy",
  "/products",
  "/return-policy",
  "/terms-and-conditions",
  "/zh/about",
  "/zh/contact",
  "/zh/dealer-program",
  "/zh/dealers/apply"
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!getSiteBaseUrl()) return [];

  const routes = [
    ...staticRoutes,
    ...products.map((product) => `/products/${product.slug}`)
  ];

  return routes.flatMap((route) => {
    const url = publicUrl(route);
    return url ? [{ url, changeFrequency: "weekly" as const }] : [];
  });
}
