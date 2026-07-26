import type { Metadata } from "next";
import { AccountOverviewClient } from "@/components/account/AccountOverviewClient";
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
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Mon compte" : "My account"}</h1>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <AccountOverviewClient locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function AccountPage() {
  return <AccountPageContent />;
}
