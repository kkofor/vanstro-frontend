import type { Metadata } from "next";
import { AboutPageContent } from "@/app/about/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "À propos de VanStro Global Supply | Matériaux de construction au Canada",
  description: "VanStro relie la fabrication mondiale de matériaux de construction à un service local fiable partout au Canada. Armoires RTA, vanités et panneaux muraux.",
  path: "/fr/about",
  image: "/assets/generated/vanstro-dealer-white-v1.webp",
  locale: "fr_CA"
});

export default function FrenchAboutPage() {
  return <AboutPageContent locale="fr-CA" />;
}
