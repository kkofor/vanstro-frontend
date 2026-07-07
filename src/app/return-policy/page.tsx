import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";

const pageEntry = requireLegalPage("return-policy");

export const metadata = buildLegalMetadata(pageEntry);

export default function ReturnPolicyPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
