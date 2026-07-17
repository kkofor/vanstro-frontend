import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("return-policy");

export const metadata = {
  ...buildLegalMetadata(pageEntry),
  ...buildPageMetadata({
    title: pageEntry.title,
    description: pageEntry.description,
    path: "/return-policy"
  })
};

export default function ReturnPolicyPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
