import type { Metadata } from "next";
import { GuidesPageContent } from "@/app/guides/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides",
  description: "Prise de mesures, finis, entretien, réglage, ramassage et livraison.",
  path: "/fr/guides",
  image: "/assets/resource-gallery.png",
  locale: "fr_CA"
});

export default function FrenchGuidesPage() {
  return <GuidesPageContent locale="fr-CA" />;
}
