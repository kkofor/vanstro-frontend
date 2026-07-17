import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import type { ProductDetailViewModel } from "@/lib/product/product-detail-view-model";

type ProductDetailBreadcrumbProps = {
  viewModel: ProductDetailViewModel;
};

export function ProductDetailBreadcrumb({ viewModel }: ProductDetailBreadcrumbProps) {
  const { product, categoryFilter } = viewModel;

  return (
    <PageBreadcrumb
      className="pdp-breadcrumb"
      items={[
        { label: "Home", href: "/" },
        { label: "Products", href: "/products" },
        { label: product.category, href: `/products?category=${categoryFilter}` },
        { label: product.name }
      ]}
    />
  );
}
