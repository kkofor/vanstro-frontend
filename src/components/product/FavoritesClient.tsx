"use client";

import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { useStorefront } from "@/components/storefront/StorefrontProvider";

export function FavoritesClient() {
  const { favoriteItems } = useStorefront();

  if (!favoriteItems.length) {
    return (
      <div className="empty-panel">
        <h2>No saved products yet</h2>
        <p>Save products from the catalog to revisit them before checkout.</p>
        <Link className="button button-primary" href="/products">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {favoriteItems.map((product) => (
        <ProductCard product={product} key={product.id} />
      ))}
    </div>
  );
}
