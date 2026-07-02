import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Register pickup, delivery and POS payment details for a VanStro order."
};

export default function CheckoutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Checkout</h1>
          <p>Choose fulfillment and register POS or cash payment before inventory is reserved.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CheckoutClient />
        </div>
      </section>
    </>
  );
}
