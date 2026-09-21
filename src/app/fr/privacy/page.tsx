import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("privacy", "fr-CA");

export const metadata = {
  ...buildLegalMetadata(pageEntry),
  ...buildPageMetadata({
    title: pageEntry.title,
    description: pageEntry.description,
    path: "/fr/privacy",
    locale: "fr_CA"
  })
};

export default function FrenchPrivacyPage() {
  return <LegalPageTemplate entry={pageEntry} locale="fr-CA" />;
}
