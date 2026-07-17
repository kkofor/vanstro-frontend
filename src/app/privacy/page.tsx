import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("privacy");

export const metadata = {
  ...buildLegalMetadata(pageEntry),
  ...buildPageMetadata({
    title: pageEntry.title,
    description: pageEntry.description,
    path: "/privacy"
  })
};

export default function PrivacyPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
