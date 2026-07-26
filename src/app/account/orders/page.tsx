import type { Metadata } from "next";
import { AccountOrdersClient } from "@/components/account/AccountOrdersClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Account orders",
  "View your VanStro order history.",
  "/account/orders"
);

export function AccountOrdersPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  return (
    <section className="page-panel">
      <div className="container">
        <AccountOrdersClient locale={locale} />
      </div>
    </section>
  );
}

export default function AccountOrdersPage() {
  return <AccountOrdersPageContent />;
}
