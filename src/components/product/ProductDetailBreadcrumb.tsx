"use client";

import { PageBreadcrumb, type PageBreadcrumbItem } from "@/components/layout/PageBreadcrumb";
import type { ProductDetailViewModel } from "@/lib/product/product-detail-view-model";
import { categoryToProductFilter } from "@/lib/product/product-detail-view-model";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";
import {
  CATEGORY_DISPLAY_NAME_BY_SLUG,
  KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG,
  KITCHEN_CABINET_SUBCATEGORY_SLUGS,
  localizeProductTaxonomyLabel
} from "@/lib/product/product-localization";

type ProductDetailBreadcrumbProps = {
  viewModel: ProductDetailViewModel;
};

/**
 * Resolve the Kitchen Cabinets subcategory filter for the PDP breadcrumb.
 * The child slug can arrive three ways: the catalog filter the customer
 * browsed from (categoryFilter), the Website API child slug shipped as
 * product.category ("base-cabinets"), or a subcategory display name
 * ("Base Cabinet"/"Wall Cabinet (GD)"/"Oven Tall Cabinet"…). Any of them
 * yields the two-level crumb; products that are not a kitchen subcategory
 * return undefined and keep the single category crumb.
 */
function kitchenSubcategoryFilter(
  product: ProductDetailViewModel["product"],
  categoryFilter: string
): string | undefined {
  if (KITCHEN_CABINET_SUBCATEGORY_SLUGS.has(categoryFilter)) return categoryFilter;

  const identity = `${product.categorySlug ?? ""} ${product.category ?? ""} ${product.subCategory ?? ""}`;
  const slug = categoryToProductFilter(identity);
  return KITCHEN_CABINET_SUBCATEGORY_SLUGS.has(slug) ? slug : undefined;
}

export function ProductDetailBreadcrumb({ viewModel }: ProductDetailBreadcrumbProps) {
  const { product, categoryFilter, locale } = viewModel;
  const french = locale === "fr-CA";
  const categoryDisplayName = CATEGORY_DISPLAY_NAME_BY_SLUG[product.category] ?? product.category;

  // Kitchen Cabinets subcategory products (base-cabinets, wall-cabinets,
  // tall-cabinets, cabinet-accessories) get a two-level category breadcrumb
  // (Kitchen Cabinets / <subcategory>): the parent crumb links to the whole
  // kitchen-cabinets filter, the subcategory crumb to its own filter (e.g.
  // base-cabinets) — never to the parent category.
  const subcategoryFilter = kitchenSubcategoryFilter(product, categoryFilter);
  const categoryCrumbs: PageBreadcrumbItem[] = subcategoryFilter
    ? [
        {
          label: localizeProductTaxonomyLabel(
            CATEGORY_DISPLAY_NAME_BY_SLUG[KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG],
            locale
          ),
          href: localeHref(`/products?category=${KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG}`, locale)
        },
        {
          label: localizeProductTaxonomyLabel(
            CATEGORY_DISPLAY_NAME_BY_SLUG[subcategoryFilter] ?? subcategoryFilter,
            locale
          ),
          href: localeHref(`/products?category=${subcategoryFilter}`, locale)
        }
      ]
    : [
        {
          label: localizeProductTaxonomyLabel(categoryDisplayName, locale),
          href: localeHref(`/products?category=${categoryFilter}`, locale)
        }
      ];

  return (
    <PageBreadcrumb
      className="pdp-breadcrumb"
      items={[
        { label: french ? "Accueil" : "Home", href: localeHref("/", locale) },
        {
          label: french ? "Produits" : "Products",
          href: canonicalCatalogUrl(locale),
          onClick: handleCanonicalCatalogClick(locale)
        },
        ...categoryCrumbs,
        { label: product.name }
      ]}
    />
  );
}