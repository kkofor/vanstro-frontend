import type { Metadata } from "next";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { DealerProgramDesign } from "./DealerProgramDesign";

export const metadata: Metadata = buildPageMetadata({
  title: "Dealer program",
  description:
    "Review the VanStro dealer program for qualified local building-materials operators, including platform responsibilities, dealer responsibilities, application review and policy requirements.",
  path: "/dealer-program",
  image: "/assets/dealers/kitchen-scene.webp"
});

export function DealerProgramPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return <DealerProgramDesign locale={locale} />;
}

export default function DealerProgramPage() {
  return <DealerProgramPageContent />;
}
