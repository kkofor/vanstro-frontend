import type { Metadata } from "next";
import { OrderDetailClient } from "@/components/checkout/OrderDetailClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivateMetadata(
  "Order status",
  "Review VanStro order status, reservation and fulfillment progress.",
  "/orders"
);

export async function OrderPageContent({ id, locale = "en-CA" }: { id: string; locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "État de la commande" : "Order status"}</h1>
          <p>{french ? "Suivez la confirmation du paiement, la réservation du stock et le traitement de la commande par le détaillant." : "Follow payment confirmation, inventory reservation and dealer fulfillment."}</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <OrderDetailClient orderId={id} locale={locale} />
        </div>
      </section>
    </>
  );
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  return <OrderPageContent id={id} />;
}
