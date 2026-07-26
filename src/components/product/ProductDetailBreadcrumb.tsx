import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import type { ProductDetailViewModel } from "@/lib/product/product-detail-view-model";
import { localeHref } from "@/lib/i18n/routes";
import { localizeProductTaxonomyLabel } from "@/lib/product/product-localization";

type ProductDetailBreadcrumbProps = {
  viewModel: ProductDetailViewModel;
};

export function ProductDetailBreadcrumb({ viewModel }: ProductDetailBreadcrumbProps) {
  const { product, categoryFilter, locale } = viewModel;
  const french = locale === "fr-CA";

  return (
    <PageBreadcrumb
      className="pdp-breadcrumb"
      items={[
        { label: french ? "Accueil" : "Home", href: localeHref("/", locale) },
        { label: french ? "Produits" : "Products", href: localeHref("/products", locale) },
        {
          label: localizeProductTaxonomyLabel(product.category, locale),
          href: localeHref(`/products?category=${categoryFilter}`, locale)
        },
        { label: product.name }
      ]}
    />
  );
}
