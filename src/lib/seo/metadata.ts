import type { Metadata } from "next";
import { getSiteBaseUrl, publicAssetUrl, publicUrl } from "@/lib/seo/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  locale?: "en_CA" | "zh_CN";
  noIndex?: boolean;
  languages?: Record<string, string>;
};

const defaultSocialImage = "/assets/home-hero-kitchen.png";

export function buildPageMetadata({
  title,
  description,
  path,
  image = defaultSocialImage,
  locale = "en_CA",
  noIndex = false,
  languages
}: PageMetadataInput): Metadata {
  const siteBaseUrl = getSiteBaseUrl();
  const canonical = publicUrl(path);
  const socialImage = publicAssetUrl(image);
  const shouldIndex = Boolean(siteBaseUrl) && !noIndex;
  const languageAlternates = languages
    ? Object.fromEntries(
        Object.entries(languages).flatMap(([language, languagePath]) => {
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
      locale,
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
      "content-language": locale === "zh_CN" ? "zh-CN" : "en-CA"
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
