import type { Metadata } from "next";
import { AccountProfileClient } from "@/components/account/AccountProfileClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Account profile",
  "Update your VanStro customer profile.",
  "/account/profile"
);

export function AccountProfilePageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <section className="page-panel">
      <div className="container">
        <AccountProfileClient locale={locale} />
      </div>
    </section>
  );
}

export default function AccountProfilePage() {
  return <AccountProfilePageContent />;
}
