import type { Metadata } from "next";
import { HomePageFr } from "@/components/home/HomePageFr";
import { getHomePageData } from "@/lib/api/server";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "VanStro Global Supply",
  description: "Magasinez des armoires de cuisine, des meubles-lavabos, des plinthes et des matériaux résidentiels avec des stocks canadiens et le soutien de détaillants locaux.",
  path: "/fr",
  image: "/assets/generated/vanstro-hero-white-v1.webp",
  locale: "fr_CA",
  languages: {
    "en-CA": "/",
    "fr-CA": "/fr",
    "x-default": "/"
  }
});

export default async function FrenchHomePage() {
  const data = await getHomePageData("fr-CA");

  return <HomePageFr {...data} />;
}
