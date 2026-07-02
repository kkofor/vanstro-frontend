import type { Metadata } from "next";
import { CartClient } from "@/components/checkout/CartClient";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your VanStro cart and prepare a stock-aware order."
};

export default async function CartPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Cart</h1>
          <p>Cart actions are wired to the reserved API layer and ready for backend integration.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CartClient />
        </div>
      </section>
    </>
  );
}
