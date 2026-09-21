import type { Metadata } from "next";
import { DealerAccessPage } from "@/components/dealer-access/DealerAccessPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Accès partenaire",
  description: "Accédez aux systèmes d’affaires des détaillants et partenaires VanStro.",
  path: "/fr/dealer-access",
  locale: "fr_CA",
  noIndex: true
});

export default function FrenchDealerAccessRoute() {
  return <DealerAccessPage locale="fr-CA" />;
}
