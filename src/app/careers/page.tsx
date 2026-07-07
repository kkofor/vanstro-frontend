import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";

const pageEntry = requireLegalPage("careers");

export const metadata = buildLegalMetadata(pageEntry);

export default function CareersPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
