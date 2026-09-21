import type { Metadata } from "next";
import { AccountOrdersClient } from "@/components/account/AccountOrdersClient";
import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Account orders",
  "View your VanStro order history.",
  "/account/orders"
);

export function AccountOrdersPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  return (
    <AccountPageFrame
      locale={locale}
      title={french ? "Commandes" : "Orders"}
      description={french ? "Consultez le paiement, l’exécution locale et les mises à jour de chaque commande." : "Review payment, local fulfillment and delivery updates for each order."}
    >
      <AccountOrdersClient locale={locale} />
    </AccountPageFrame>
  );
}

export default function AccountOrdersPage() {
  return <AccountOrdersPageContent />;
}
