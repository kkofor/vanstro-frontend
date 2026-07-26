import type { Metadata } from "next";
import { PaymentClient } from "@/components/checkout/PaymentClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Payment",
  "Complete your VanStro order payment securely.",
  "/checkout/payment"
);

export function PaymentPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Paiement" : "Payment"}</h1>
          <p>
            {french
              ? "Finalisez votre paiement pour confirmer la réservation du stock et créer votre commande."
              : "Complete your payment to confirm inventory reservation and create your order."}
          </p>
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
