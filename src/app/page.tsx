import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getHomePageData } from "@/lib/api/server";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "VanStro Global Supply",
  description:
    "Shop kitchen cabinets, bathroom vanities, baseboards and home materials with local Canadian stock and dealer support.",
  path: "/",
  image: "/assets/generated/vanstro-hero-white-v1.webp",
  languages: {
    "en-CA": "/",
    "fr-CA": "/fr",
    "x-default": "/"
  }
});

export default async function Page() {
  const data = await getHomePageData();

  return <HomePage {...data} />;
}
