import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Checkout",
  "Choose pickup or delivery, select a payment method, and review your VanStro order.",
  "/checkout"
);

export function CheckoutPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Passer à la caisse" : "Checkout"}</h1>
          <p>{french ? "Choisissez le mode de réception et le mode de paiement, puis vérifiez votre commande avant de la passer. Le stock est réservé après la confirmation du paiement." : "Choose pickup or delivery and a payment method, then review your order before placing it. Inventory is reserved after payment is confirmed."}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CheckoutClient locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
