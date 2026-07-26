import type { Metadata } from "next";
import { ContactPageContent } from "@/app/contact/page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Nous joindre",
  description: "Communiquez avec VanStro pour obtenir du soutien concernant les produits, les commandes, les détaillants et vos projets.",
  path: "/fr/contact",
  image: "/assets/generated/contact-support-hero-v1.webp",
  locale: "fr_CA"
});

export default function FrenchContactPage() {
  return <ContactPageContent locale="fr-CA" />;
}
