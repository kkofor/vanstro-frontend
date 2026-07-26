import type { Metadata } from "next";
import { OrderLookupClient } from "@/components/checkout/OrderLookupClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Track order",
  "Look up your VanStro order with your order number and access token.",
  "/orders/lookup"
);

export function OrderLookupPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Suivre une commande" : "Track your order"}</h1>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <OrderLookupClient locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function OrderLookupPage() {
  return <OrderLookupPageContent />;
}
