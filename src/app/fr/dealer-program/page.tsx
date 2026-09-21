import type { Metadata } from "next";
import { DealerProgramPageContent } from "@/app/dealer-program/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Programme pour les détaillants",
  description:
    "Découvrez le programme VanStro destiné aux détaillants locaux qualifiés de matériaux de construction, notamment les responsabilités, l’examen des demandes et les exigences des politiques.",
  path: "/fr/dealer-program",
  image: "/assets/generated/dealer-program-handshake-v1.webp",
  locale: "fr_CA"
});

export default function FrenchDealerProgramPage() {
  return <DealerProgramPageContent locale="fr-CA" />;
}
