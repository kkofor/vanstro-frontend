import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderLookupClient } from "@/components/checkout/OrderLookupClient";
import { CommercePageSkeleton } from "@/components/ui/CommerceStatePanel";
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
      <section className="page-hero commerce-page-hero">
        <div className="container">
          <h1>{french ? "Suivre une commande" : "Track Your Order"}</h1>
          <p>{french ? "Consultez le paiement, l’exécution locale et les mises à jour de livraison à partir de votre confirmation." : "Review payment, local fulfillment and delivery updates from your order confirmation."}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <Suspense fallback={<CommercePageSkeleton rows={2} label={french ? "Chargement de la commande" : "Loading order"} />}>
            <OrderLookupClient locale={locale} />
          </Suspense>
        </div>
      </section>
    </>
  );
}

export default function OrderLookupPage() {
  return <OrderLookupPageContent />;
}
