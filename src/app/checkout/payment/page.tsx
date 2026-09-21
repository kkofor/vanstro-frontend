import type { Metadata } from "next";
import { PaymentClient } from "@/components/checkout/PaymentClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { CommerceSteps } from "@/components/checkout/CommerceSteps";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPrivateMetadata(
    "Payment",
    "Complete your VanStro order payment securely.",
    "/checkout/payment"
  ),
  referrer: "no-referrer"
};

export function PaymentPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <meta name="referrer" content="no-referrer" />
      <section className="page-hero commerce-page-hero">
        <div className="container">
          <h1>{french ? "Paiement" : "Payment"}</h1>
          <p>
            {french
              ? "Finalisez votre paiement pour confirmer la réservation du stock et créer votre commande."
              : "Complete your payment to confirm inventory reservation and create your order."}
          </p>
          <div className="visually-hidden">
            <CommerceSteps current="payment" locale={locale} />
          </div>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <PaymentClient locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function PaymentPage() {
  return <PaymentPageContent />;
}
