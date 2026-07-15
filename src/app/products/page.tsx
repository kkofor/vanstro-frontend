import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsExplorer } from "@/components/product/ProductsExplorer";
import { getProductsForCatalog } from "@/lib/api/server";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse VanStro kitchen cabinets, vanities, baseboards and home materials."
};

export default async function ProductsPage() {
  const products = await getProductsForCatalog();

  return (
    <section className="catalog-page">
      <div className="container">
        <Suspense fallback={<div className="catalog-loading">Loading catalog...</div>}>
          <ProductsExplorer products={products} />
        </Suspense>
      </div>
    </section>
  );
}
