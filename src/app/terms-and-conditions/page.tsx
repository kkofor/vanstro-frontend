import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";

const pageEntry = requireLegalPage("terms-and-conditions");

export const metadata = buildLegalMetadata(pageEntry);

export default function TermsAndConditionsPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
