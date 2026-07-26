import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("careers", "fr-CA");

export const metadata: Metadata = buildPageMetadata({
  title: pageEntry.title,
  description: pageEntry.description,
  path: "/fr/careers",
  image: "/assets/dealer-warehouse.png",
  locale: "fr_CA"
});

export default function FrenchCareersPage() {
  return <LegalPageTemplate entry={pageEntry} locale="fr-CA" />;
}
