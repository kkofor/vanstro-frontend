import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDealersPreview, getProductBySlug, getProductStaticParams } from "@/lib/api/server";
import { fulfillableDealerLocations } from "@/lib/dealer/dealer-projection";
import { ProductBuyPanel } from "@/components/product/ProductBuyPanel";
import { ProductDetailBreadcrumb } from "@/components/product/ProductDetailBreadcrumb";
import { ProductDetailMain } from "@/components/product/ProductDetailMain";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductSectionNav } from "@/components/product/ProductSectionNav";
import { ProductStickyBar } from "@/components/product/ProductStickyBar";
import { ProductTrustBand } from "@/components/product/ProductTrustBand";
import { ProductVariantProvider } from "@/components/product/ProductVariantContext";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { productSchema, serializeJsonLd } from "@/lib/seo/schema";
import { productsWithCommerce } from "@/lib/data/mock-data";
import { formatProductSize } from "@/lib/product/product-display";
import {
  buildSpecRows,
  createDefaultQuestions,
  createProductDetailViewModel
} from "@/lib/product/product-detail-view-model";
import {
  createFrCaDefaultQuestions,
  humanReadableProductCategory,
  localizeProducts,
  localizeSpecificationRows
} from "@/lib/product/product-localization";
import { resolveProductVariant } from "@/lib/product/product-variants";
import type { SiteLocale } from "@/lib/i18n/locale";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getProductStaticParams();
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const category = humanReadableProductCategory(product.category, "en-CA");
  const description = category
    ? `${product.name}. SKU ${product.sku}. ${category}. ${product.dimensions}.`
    : `${product.name}. SKU ${product.sku}. ${product.dimensions}.`;

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
  // getProductBySlug(slug, locale) already returns a fully localized product for fr-CA (see
  // lib/api/server.ts). Localizing it again here used to run the already-French text back
  // through translateValue()'s English-only sentence regexes (no match on a second pass)
  // while formatDisplayMeasurement still fired on the ¾ glyph, silently decimalizing the
  // Shelves/Drawer Box sentences to "0,75 po" (confirmed live during #47 deploy
  // verification). Do not re-localize an already-localized product. productsWithCommerce
  // (used for the related-products catalog below) is a separate, never-localized source, so
  // localizeProducts() on that catalog is still correct and unaffected by this fix.
  const product = await getProductBySlug(slug, locale);
  if (!product) notFound();
  const localizedCatalog = localizeProducts(productsWithCommerce, locale);
  const viewModel = createProductDetailViewModel(product, localizedCatalog, locale);
  const dealers = fulfillableDealerLocations(await getDealersPreview());

  // Section pill counts are computed on the server from the same default variant the
  // client renders: ProductDetailMain resolves resolveProductVariant(product,
  // productVariant?.selectedFinishName), which starts at viewModel.activeFinishName.
  // The nav must not recompute these on the client.
  const resolvedProduct = resolveProductVariant(product, viewModel.activeFinishName);
  const specificationsCount = localizeSpecificationRows(
    buildSpecRows(
      {
        ...resolvedProduct.specifications,
        Dimensions: formatProductSize(
          resolvedProduct.specifications.Dimensions ?? resolvedProduct.dimensions,
          locale
        )
      },
      resolvedProduct.subCategory
    ),
    locale,
    `${resolvedProduct.category} ${resolvedProduct.subCategory ?? ""}`
  ).filter(([label]) => !/^construction$/i.test(label)).length;
  const resolvedQuestions = product.questions?.length
    ? viewModel.questions
    : locale === "fr-CA"
      ? createFrCaDefaultQuestions(resolvedProduct)
      : createDefaultQuestions(resolvedProduct);

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
          <ProductVariantProvider
            initialFinishName={viewModel.activeFinishName}
            finishOptions={product.finishOptions}
          >
            <section className="pdp-shell">
              {/* Row 1, col 1 / -1: breadcrumb is the first grid item so gallery + buy share row 2. */}
              <div className="crumbs pdp-crumbs">
                <ProductDetailBreadcrumb viewModel={viewModel} />
              </div>

              {/* .pdp is display: contents — .pdp__left and aside.buy are the grid items. */}
              <section className="pdp">
                <div className="pdp__left">
                  <ProductImageGallery
                    images={product.images}
                    finishOptions={product.finishOptions}
                    locale={locale}
                  />

                  <ProductTrustBand />
                </div>

                <ProductBuyPanel viewModel={viewModel} dealers={dealers} />
              </section>

              {/* Row 3, col 1: on-this-page section navigation. */}
              <ProductSectionNav
                specificationsCount={specificationsCount}
                qaCount={resolvedQuestions.length}
              />

              {/* Row 4, cols 1 / -1: product detail sections.
                  ProductDetailMain renders <div className="sec"> (v2). */}
              <ProductDetailMain viewModel={viewModel} />
            </section>

            {/* Mobile sticky add-to-cart bar: sibling of .pdp-shell (not a child),
                inside ProductVariantProvider so it follows the selected finish. */}
            <ProductStickyBar product={product} locale={locale} />
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
