import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";

const pageEntry = requireLegalPage("privacy");

export const metadata = buildLegalMetadata(pageEntry);

export default function PrivacyPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
