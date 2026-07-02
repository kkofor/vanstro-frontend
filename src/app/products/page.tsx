import type { Metadata } from "next";
import { ProductCard } from "@/components/product/ProductCard";
import { products } from "@/lib/data/mock-data";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse VanStro kitchen cabinets, vanities, baseboards and home materials."
};

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Products</h1>
          <p>Browse ready-to-order cabinets, vanities and finish materials with stock-aware purchase paths.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
