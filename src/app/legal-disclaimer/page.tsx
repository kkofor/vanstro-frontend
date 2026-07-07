import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";

const pageEntry = requireLegalPage("legal-disclaimer");

export const metadata = buildLegalMetadata(pageEntry);

export default function LegalDisclaimerPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
