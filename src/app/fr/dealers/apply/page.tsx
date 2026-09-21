import type { Metadata } from "next";
import { DealerApplicationPageContent } from "@/app/dealers/apply/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Demande pour devenir détaillant",
  description:
    "Présentez une demande pour devenir détaillant partenaire de VanStro. Transmettez les renseignements sur votre entreprise, la zone de service proposée et vos capacités locales aux fins d’évaluation.",
  path: "/fr/dealers/apply",
  image: "/assets/generated/dealer-program-handshake-v1.webp",
  locale: "fr_CA"
});

export default function FrenchDealerApplicationPage() {
  return <DealerApplicationPageContent locale="fr-CA" />;
}
