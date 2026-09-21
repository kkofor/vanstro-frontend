import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPageContent } from "@/app/products/[slug]/page";
import { getProductBySlug, getProductStaticParams } from "@/lib/api/server";
import { humanReadableProductCategory } from "@/lib/product/product-localization";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { formatProductSize } from "@/lib/product/product-display";

type FrenchProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getProductStaticParams();
}

export async function generateMetadata({ params }: FrenchProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  // getProductBySlug(slug, "fr-CA") already returns a fully localized product (see
  // lib/api/server.ts). Localizing it again here used to run the already-French text
  // back through translateValue()'s English-only sentence regexes (no match on a second
  // pass) while formatDisplayMeasurement still fired on the ¾ glyph, silently decimalizing
  // the Shelves/Drawer Box sentences to "0,75 po" (confirmed live during #47 deploy
  // verification). Do not re-localize an already-localized product.
  const product = await getProductBySlug(slug, "fr-CA");
  if (!product) notFound();
  const category = humanReadableProductCategory(product.category, "fr-CA");
  const description = category
    ? `${product.name}. UGS ${product.sku}. ${category}. ${formatProductSize(product.dimensions, "fr-CA")}.`
    : `${product.name}. UGS ${product.sku}. ${formatProductSize(product.dimensions, "fr-CA")}.`;

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
