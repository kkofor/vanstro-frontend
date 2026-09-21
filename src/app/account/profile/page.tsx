import type { Metadata } from "next";
import { AccountProfileClient } from "@/components/account/AccountProfileClient";
import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Account profile",
  "Update your VanStro customer profile.",
  "/account/profile"
);

export function AccountProfilePageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  return (
    <AccountPageFrame
      locale={locale}
      title={french ? "Profil" : "Profile"}
      description={french ? "Tenez vos coordonnées à jour pour les communications relatives aux commandes." : "Keep contact details current for order and fulfillment communication."}
    >
      <AccountProfileClient locale={locale} />
    </AccountPageFrame>
  );
}

export default function AccountProfilePage() {
  return <AccountProfilePageContent />;
}
