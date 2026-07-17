import type { Metadata } from "next";
import { OrderDetailClient } from "@/components/checkout/OrderDetailClient";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "demo-order" }];
}

export const metadata: Metadata = buildPrivateMetadata(
  "Order status",
  "Review VanStro order status, reservation and fulfillment progress.",
  "/orders/demo-order"
);

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Order status</h1>
          <p>Follow payment registration, inventory reservation and dealer fulfillment.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <OrderDetailClient orderId={id} />
        </div>
      </section>
    </>
  );
}
