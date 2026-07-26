import type { MetadataRoute } from "next";
import { products } from "@/lib/data/mock-data";
import { STATIC_LOCALE_ROUTE_PAIRS } from "@/lib/i18n/routes";
import { getSiteBaseUrl, publicUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

type IndexableLocalePair = Readonly<{ en: string; fr: string }>;

function sitemapEntry(path: string, pair: IndexableLocalePair): MetadataRoute.Sitemap[number] | null {
  const url = publicUrl(path);
  const en = publicUrl(pair.en);
  const fr = publicUrl(pair.fr);
  if (!url || !en || !fr) return null;

  return {
    url,
    changeFrequency: "weekly",
    alternates: {
      languages: {
        "en-CA": en,
        "fr-CA": fr,
        "x-default": en
      }
    }
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  if (!getSiteBaseUrl()) return [];

  const staticPairs = STATIC_LOCALE_ROUTE_PAIRS.filter((pair) => pair.indexable);
  const productPairs = products.map(({ slug }) => ({
    en: `/products/${slug}`,
    fr: `/fr/products/${slug}`
  }));

  return [...staticPairs, ...productPairs].flatMap((pair) =>
    [pair.en, pair.fr].flatMap((path) => {
      const entry = sitemapEntry(path, pair);
      return entry ? [entry] : [];
    })
  );
}
