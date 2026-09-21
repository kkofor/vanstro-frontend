import type { Metadata } from "next";
import { CartClient } from "@/components/checkout/CartClient";
import type { SiteLocale } from "@/lib/i18n/locale";
import { CommerceSteps } from "@/components/checkout/CommerceSteps";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Cart",
  "Review your VanStro cart and prepare a stock-aware order.",
  "/cart"
);

export function CartPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <>
      <section className="page-hero commerce-page-hero">
        <div className="container">
          <h1>{french ? "Panier" : "Cart"}</h1>
          <p>{french ? "Vérifiez les produits et les quantités. Vous choisirez ensuite le mode de réception et de paiement avant de confirmer la commande." : "Review products and quantities, then choose fulfillment and payment before confirming your order."}</p>
          <div className="visually-hidden">
            <CommerceSteps current="cart" locale={locale} />
          </div>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CartClient locale={locale} />
        </div>
      </section>
    </>
  );
}

export default function CartPage() {
  return <CartPageContent />;
}
