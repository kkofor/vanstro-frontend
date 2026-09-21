import type { Metadata } from "next";
import { AccountOverviewClient } from "@/components/account/AccountOverviewClient";
import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "My account",
  "Manage your VanStro customer account.",
  "/account"
);

export function AccountPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  return (
    <AccountPageFrame
      locale={locale}
      title={french ? "Mon compte" : "My Account"}
      description={french ? "Consultez vos commandes, gérez vos adresses et gardez vos renseignements à jour." : "Review orders, manage delivery addresses and keep your project details current."}
    >
      <AccountOverviewClient locale={locale} />
    </AccountPageFrame>
  );
}

export default function AccountPage() {
  return <AccountPageContent />;
}
