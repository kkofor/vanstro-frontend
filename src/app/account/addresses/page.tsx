import type { Metadata } from "next";
import { AccountAddressesClient } from "@/components/account/AccountAddressesClient";
import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Account addresses",
  "Manage your VanStro delivery addresses.",
  "/account/addresses"
);

export function AccountAddressesPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  return (
    <AccountPageFrame
      locale={locale}
      title={french ? "Adresses" : "Addresses"}
      description={french ? "Enregistrez les adresses utilisées pour la livraison locale et vos futurs projets." : "Save addresses used for local delivery and future project orders."}
    >
      <AccountAddressesClient locale={locale} />
    </AccountPageFrame>
  );
}

export default function AccountAddressesPage() {
  return <AccountAddressesPageContent />;
}
