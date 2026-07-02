"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { ProductSummary } from "@/lib/api/api-contract";
import { useStorefront } from "@/components/storefront/StorefrontProvider";

export function ProductPurchaseActions({ product }: { product: ProductSummary }) {
  const router = useRouter();
  const { addToCart } = useStorefront();

  return (
    <div className="button-row">
      <button
        className="button button-primary"
        type="button"
        onClick={() => addToCart(product)}
      >
        <ShoppingCart size={18} strokeWidth={2} />
        Add to cart
      </button>
      <button
        className="button button-secondary"
        type="button"
        onClick={() => {
          addToCart(product);
          router.push("/checkout");
        }}
      >
        Buy now
      </button>
      <button
        className="button button-accent"
        type="button"
        onClick={() => {
          addToCart(product);
          router.push("/cart");
        }}
      >
        View cart
      </button>
    </div>
  );
}
