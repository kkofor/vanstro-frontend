import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsExplorer } from "@/components/product/ProductsExplorer";
import { getCatalogCategories, getCatalogFilterableCategories, getProductsForCatalog } from "@/lib/api/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localizeCatalogCategoryOption } from "@/lib/product/catalog-config";
import { localizeProducts, localizeProductTaxonomyLabel } from "@/lib/product/product-localization";
import type { CatalogCategoryOption } from "@/lib/product/catalog-config";
import type { SiteLocale } from "@/lib/i18n/locale";

const PRODUCTS_TITLE = { "en-CA": "Products", "fr-CA": "Produits" } as const;
const PRODUCTS_DESCRIPTION = {
  "en-CA": "Browse VanStro kitchen cabinets, vanities, baseboards and home materials.",
  "fr-CA":
    "Parcourez les armoires de cuisine, les meubles-lavabos, les plinthes et les matériaux résidentiels VanStro."
} as const;

/**
 * Category description for the `?category=<slug>` meta description. English
 * uses the Website API's own `category.description` (never invented). French
 * has no per-category description field on the API today, so it reuses the
 * existing FR override map already shipped for the fixture/build-time
 * category options (`localizeCatalogCategoryOption`, catalog-config.ts) —
 * that map only covers the four top-level parents; child slugs (Base/Wall/
 * Tall Cabinets, Accessories) fall through to `null`, matching the "do not
 * invent, report as missing" instruction.
 */
function resolveCategoryDescription(category: CatalogCategoryOption, locale: SiteLocale): string | null {
  if (locale === "fr-CA") return localizeCatalogCategoryOption(category, "fr-CA").description;
  return category.description;
}

type ProductsSearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Builds per-`?category=<slug>` metadata (title/description/self-canonical)
 * shared by both the EN and FR `/products` routes. `?category=all`, an
 * unrecognized slug, or no query param at all keeps today's single generic
 * "Products"/"Produits" metadata unchanged — only a real, known category slug
 * gets its own title/canonical/description. Canonical is the plain page URL
 * plus the original `?category=` query, so each category variant is
 * self-referencing instead of all variants collapsing onto the bare
 * `/products/` canonical.
 */
export async function buildProductsMetadata(
  locale: SiteLocale,
  path: "/products" | "/fr/products",
  searchParams: ProductsSearchParams
): Promise<Metadata> {
  const params = await searchParams;
  const rawCategory = params?.category;
  const categorySlug = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
  const openGraphLocale = locale === "fr-CA" ? "fr_CA" : undefined;

  const defaultMetadata = () =>
    buildPageMetadata({
      title: PRODUCTS_TITLE[locale],
      description: PRODUCTS_DESCRIPTION[locale],
      path,
      image: "/assets/category-kitchen.png",
      locale: openGraphLocale
    });

  if (!categorySlug || categorySlug === "all") return defaultMetadata();

  const categories = await getCatalogFilterableCategories();
  const category = categories.find((option) => option.slug === categorySlug);
  if (!category) return defaultMetadata();

  const title = localizeProductTaxonomyLabel(category.label, locale);
  const description = resolveCategoryDescription(category, locale) ?? PRODUCTS_DESCRIPTION[locale];
  const metadata = buildPageMetadata({
    title,
    description,
    path,
    image: "/assets/category-kitchen.png",
    locale: openGraphLocale
  });
  if (metadata.alternates?.canonical) {
    metadata.alternates.canonical = `${metadata.alternates.canonical}?category=${encodeURIComponent(categorySlug)}`;
  }
  return metadata;
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: ProductsSearchParams;
}): Promise<Metadata> {
  return buildProductsMetadata("en-CA", "/products", searchParams);
}

export async function ProductsPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const [products, categories, filterableCategories] = await Promise.all([
    getProductsForCatalog(),
    getCatalogCategories(),
    getCatalogFilterableCategories()
  ]);

  return (
    <section className="catalog-page">
      <div className="container">
        <Suspense fallback={<div className="catalog-loading">{locale === "fr-CA" ? "Chargement du catalogue…" : "Loading catalog..."}</div>}>
          <ProductsExplorer
            products={localizeProducts(products, locale)}
            categories={categories}
            filterableCategories={filterableCategories}
            locale={locale}
          />
        </Suspense>
      </div>
    </section>
  );
}

export default function ProductsPage() {
  return <ProductsPageContent />;
}
