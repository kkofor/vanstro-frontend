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
import { localizeProduct, localizeProducts } from "@/lib/product/product-localization";
import type { SiteLocale } from "@/lib/i18n/locale";

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

export async function ProductPageContent({
  slug,
  locale = "en-CA"
}: {
  slug: string;
  locale?: SiteLocale;
}) {
  const product = localizeProduct(await getProductBySlug(slug), locale);
  const localizedCatalog = localizeProducts(productsWithCommerce, locale);
  const viewModel = createProductDetailViewModel(product, localizedCatalog, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(productSchema(product, locale === "fr-CA" ? `/fr/products/${product.slug}` : undefined))
        }}
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
                    locale={locale}
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

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  return <ProductPageContent slug={slug} />;
}
