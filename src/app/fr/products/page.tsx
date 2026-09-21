import type { Metadata } from "next";
import { ProductsPageContent, buildProductsMetadata } from "@/app/products/page";

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return buildProductsMetadata("fr-CA", "/fr/products", searchParams);
}

export default function FrenchProductsPage() {
  return <ProductsPageContent locale="fr-CA" />;
}
