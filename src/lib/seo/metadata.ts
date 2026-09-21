import type { Metadata } from "next";
import { DEFAULT_LOCALE, FRENCH_LOCALE, localeFromPathname, type SiteLocale } from "@/lib/i18n/locale";
import { getLocaleRoutePair } from "@/lib/i18n/routes";
import { getSiteBaseUrl, publicAssetUrl, publicUrl } from "@/lib/seo/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  locale?: "en_CA" | "fr_CA";
  noIndex?: boolean;
  languages?: Record<string, string>;
};

const OPEN_GRAPH_LOCALE_BY_SITE_LOCALE = {
  "en-CA": "en_CA",
  "fr-CA": "fr_CA"
} as const satisfies Record<SiteLocale, "en_CA" | "fr_CA">;

function localeMetadataForPath(path: string) {
  const siteLocale = localeFromPathname(path);
  const routePair = getLocaleRoutePair(path);

  return {
    locale: OPEN_GRAPH_LOCALE_BY_SITE_LOCALE[siteLocale],
    languages: routePair
      ? {
          "en-CA": routePair.en,
          ...(routePair.frAvailable === false ? {} : { "fr-CA": routePair.fr }),
          "x-default": routePair.en
        }
      : undefined
  };
}

const defaultSocialImage = "/assets/home-hero-kitchen.png";

export function buildPageMetadata({
  title,
  description,
  path,
  image = defaultSocialImage,
  locale,
  noIndex = false,
  languages
}: PageMetadataInput): Metadata {
  const siteBaseUrl = getSiteBaseUrl();
  const canonical = publicUrl(path);
  const socialImage = publicAssetUrl(image);
  const shouldIndex = Boolean(siteBaseUrl) && !noIndex;
  const localeMetadata = localeMetadataForPath(path);
  const resolvedLocale = locale ?? localeMetadata.locale;
  const resolvedLanguages = languages ?? localeMetadata.languages;
  const languageAlternates = resolvedLanguages
    ? Object.fromEntries(
        Object.entries(resolvedLanguages).flatMap(([language, languagePath]) => {
          const url = publicUrl(languagePath);
          return url ? [[language, url]] : [];
        })
      )
    : undefined;

  return {
    title,
    description,
    alternates: canonical
      ? {
          canonical,
          ...(languageAlternates && Object.keys(languageAlternates).length
            ? { languages: languageAlternates }
            : {})
        }
      : undefined,
    robots: shouldIndex
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true },
    openGraph: {
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      siteName: "VanStro Global Supply",
      locale: resolvedLocale,
      type: "website",
      ...(socialImage ? { images: [{ url: socialImage, alt: title }] } : {})
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(socialImage ? { images: [socialImage] } : {})
    },
    other: {
      "content-language": resolvedLocale === "fr_CA" ? "fr-CA" : "en-CA"
    }
  };
}

export function buildPrivateMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  return buildPageMetadata({ title, description, path, noIndex: true });
}
