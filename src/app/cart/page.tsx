import type { Metadata } from "next";
import { CartClient } from "@/components/checkout/CartClient";
import type { SiteLocale } from "@/lib/i18n/locale";
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
      <section className="page-hero">
        <div className="container">
          <h1>{french ? "Panier" : "Cart"}</h1>
          <p>{french ? "Vérifiez les articles, les quantités et le détaillant responsable avant de passer à la caisse." : "Cart actions are wired to the reserved API layer and ready for backend integration."}</p>
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
