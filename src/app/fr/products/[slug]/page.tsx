import type { Metadata } from "next";
import { ProductPageContent } from "@/app/products/[slug]/page";
import { getProductBySlug } from "@/lib/api/server";
import { products } from "@/lib/data/mock-data";
import { localizeProduct, localizeProductTaxonomyLabel } from "@/lib/product/product-localization";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { formatProductSize } from "@/lib/product/product-display";

type FrenchProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: FrenchProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = localizeProduct(await getProductBySlug(slug), "fr-CA");
  const category = localizeProductTaxonomyLabel(product.category, "fr-CA");
  const description = `${product.name}. UGS ${product.sku}. ${category}. ${formatProductSize(product.dimensions, "fr-CA")}.`;

  return buildPageMetadata({
    title: product.name,
    description,
    path: `/fr/products/${product.slug}`,
    image: product.images[0]?.url,
    locale: "fr_CA"
  });
}

export default async function FrenchProductPage({ params }: FrenchProductPageProps) {
  const { slug } = await params;
  return <ProductPageContent slug={slug} locale="fr-CA" />;
}
