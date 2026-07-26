import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("terms-and-conditions", "fr-CA");

export const metadata = {
  ...buildLegalMetadata(pageEntry),
  ...buildPageMetadata({
    title: pageEntry.title,
    description: pageEntry.description,
    path: "/fr/terms-and-conditions",
    locale: "fr_CA"
  })
};

export default function FrenchTermsAndConditionsPage() {
  return <LegalPageTemplate entry={pageEntry} locale="fr-CA" />;
}
