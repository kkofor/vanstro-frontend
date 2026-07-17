import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/api/server";
import { ProductBuyPanel } from "@/components/product/ProductBuyPanel";
import { ProductDetailBreadcrumb } from "@/components/product/ProductDetailBreadcrumb";
import { ProductDetailMain } from "@/components/product/ProductDetailMain";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductVariantProvider } from "@/components/product/ProductVariantContext";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { productSchema, serializeJsonLd } from "@/lib/seo/schema";
import { dealers, products, productsWithCommerce } from "@/lib/data/mock-data";
import { createProductDetailViewModel } from "@/lib/product/product-detail-view-model";

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
  const description = `${product.name}. SKU ${product.sku}. ${product.category}. ${product.dimensions}.`;

  return buildPageMetadata({
    title: product.name,
    description,
    path: `/products/${product.slug}`,
    image: product.images[0]?.url
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const viewModel = createProductDetailViewModel(product, productsWithCommerce);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema(product)) }}
      />
      <section className="page-panel pdp-page">
        <div className="container">
          <ProductDetailBreadcrumb viewModel={viewModel} />

          <ProductVariantProvider
            initialFinishName={viewModel.activeFinishName}
            finishOptions={product.finishOptions}
          >
            <section className="pdp-shell">
              <div className="pdp-media-column">
                <div className="pdp-media-sheet">
                  <ProductImageGallery
                    images={product.images}
                    finishOptions={product.finishOptions}
                  />
                </div>
              </div>

              <ProductBuyPanel viewModel={viewModel} dealers={dealers} />

              <ProductDetailMain viewModel={viewModel} />
            </section>
          </ProductVariantProvider>
        </div>
      </section>
    </>
  );
}
