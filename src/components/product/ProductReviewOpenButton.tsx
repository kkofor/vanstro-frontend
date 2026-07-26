"use client";

export const PRODUCT_REVIEW_OPEN_EVENT = "vanstro:open-product-review";

export function ProductReviewOpenButton({ label = "Write a Review" }: { label?: string }) {
  return (
    <button
      className="pdp-review-open"
      type="button"
      onClick={() => window.dispatchEvent(new Event(PRODUCT_REVIEW_OPEN_EVENT))}
    >
      {label}
    </button>
  );
}
