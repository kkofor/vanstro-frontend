import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { CommerceSteps } from "@/components/checkout/CommerceSteps";
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
      <section className="page-hero commerce-page-hero">
        <div className="container">
          <h1>{french ? "Passer à la caisse" : "Checkout"}</h1>
          <p>{french ? "Choisissez le mode de réception et le paiement. En continuant, le stock sera vérifié et pourra être réservé pendant au plus 30 minutes." : "Choose fulfillment and payment. Continuing verifies stock and may create a reservation for up to 30 minutes."}</p>
          <div className="visually-hidden">
            <CommerceSteps current="checkout" locale={locale} />
          </div>
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
