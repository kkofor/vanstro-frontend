import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("dealer-services-and-responsibility", "fr-CA");

export const metadata = {
  ...buildLegalMetadata(pageEntry),
  ...buildPageMetadata({
    title: pageEntry.title,
    description: pageEntry.description,
    path: "/fr/dealer-services-and-responsibility",
    image: "/assets/dealer-warehouse.png",
    locale: "fr_CA"
  })
};

export default function FrenchDealerServicesAndResponsibilityPage() {
  return <LegalPageTemplate entry={pageEntry} locale="fr-CA" />;
}
