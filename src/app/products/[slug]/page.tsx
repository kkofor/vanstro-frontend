import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getProductBySlug } from "@/lib/api/server";
import { ProductPurchaseActions } from "@/components/product/ProductPurchaseActions";
import { productSchema } from "@/lib/seo/schema";
import { products } from "@/lib/data/mock-data";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: `/products/${product.slug}`
    }
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema(product)) }}
      />
      <section className="page-panel">
        <div className="container product-detail-grid">
          <div>
            <div className="product-gallery">
              <img src={product.images[0].url} alt={product.images[0].alt} />
            </div>
          </div>

          <aside className="purchase-panel">
            <p className="product-meta">{product.category}</p>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <div className="price-line">
              {new Intl.NumberFormat("en-CA", {
                style: "currency",
                currency: "CAD"
              }).format(product.price.amount)}
              <span>/ {product.unit}</span>
            </div>
            <span className="stock-status">
              <CheckCircle2 size={16} strokeWidth={2.4} />
              In stock near selected stores
            </span>

            <div className="spec-list">
              {Object.entries(product.specifications).map(([label, value]) => (
                <div className="spec-row" key={label}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
              ))}
            </div>

            <ProductPurchaseActions product={product} />
          </aside>
        </div>
      </section>
    </>
  );
}
