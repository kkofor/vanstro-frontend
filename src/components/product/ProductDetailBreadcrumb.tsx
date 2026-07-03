import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ProductDetailViewModel } from "@/lib/product/product-detail-view-model";

type ProductDetailBreadcrumbProps = {
  viewModel: ProductDetailViewModel;
};

export function ProductDetailBreadcrumb({ viewModel }: ProductDetailBreadcrumbProps) {
  const { product, categoryFilter } = viewModel;

  return (
    <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <ChevronRight size={14} strokeWidth={2.4} />
      <Link href="/products">Products</Link>
      <ChevronRight size={14} strokeWidth={2.4} />
      <Link href={`/products?category=${categoryFilter}`}>{product.category}</Link>
      <ChevronRight size={14} strokeWidth={2.4} />
      <span>{product.name}</span>
    </nav>
  );
}
