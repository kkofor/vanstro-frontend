import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";

const pageEntry = requireLegalPage("dealer-services-and-responsibility");

export const metadata = buildLegalMetadata(pageEntry);

export default function DealerServicesAndResponsibilityPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
