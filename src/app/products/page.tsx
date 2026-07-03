import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsExplorer } from "@/components/product/ProductsExplorer";
import { productsWithCommerce } from "@/lib/data/mock-data";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse VanStro kitchen cabinets, vanities, baseboards and home materials."
};

export default function ProductsPage() {
  return (
    <section className="catalog-page">
      <div className="container">
        <Suspense fallback={<div className="catalog-loading">Loading catalog...</div>}>
          <ProductsExplorer products={productsWithCommerce} />
        </Suspense>
      </div>
    </section>
  );
}
