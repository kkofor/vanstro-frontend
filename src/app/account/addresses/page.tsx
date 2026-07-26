import type { Metadata } from "next";
import { AccountAddressesClient } from "@/components/account/AccountAddressesClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Account addresses",
  "Manage your VanStro delivery addresses.",
  "/account/addresses"
);

export function AccountAddressesPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <section className="page-panel">
      <div className="container">
        <AccountAddressesClient locale={locale} />
      </div>
    </section>
  );
}

export default function AccountAddressesPage() {
  return <AccountAddressesPageContent />;
}
