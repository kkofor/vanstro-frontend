import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("legal-disclaimer", "fr-CA");

export const metadata = {
  ...buildLegalMetadata(pageEntry),
  ...buildPageMetadata({
    title: pageEntry.title,
    description: pageEntry.description,
    path: "/fr/legal-disclaimer",
    locale: "fr_CA"
  })
};

export default function FrenchLegalDisclaimerPage() {
  return <LegalPageTemplate entry={pageEntry} locale="fr-CA" />;
}
