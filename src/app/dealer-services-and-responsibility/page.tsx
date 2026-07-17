import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";
import { buildPageMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("dealer-services-and-responsibility");

export const metadata = {
  ...buildLegalMetadata(pageEntry),
  ...buildPageMetadata({
    title: pageEntry.title,
    description: pageEntry.description,
    path: "/dealer-services-and-responsibility",
    image: "/assets/dealer-warehouse.png"
  })
};

export default function DealerServicesAndResponsibilityPage() {
  return <LegalPageTemplate entry={pageEntry} />;
}
