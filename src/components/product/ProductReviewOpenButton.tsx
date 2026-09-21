"use client";

export const PRODUCT_REVIEW_OPEN_EVENT = "vanstro:open-product-review";

export function ProductReviewOpenButton({
  label = "Write a review",
  className = "pdp-review-open",
}: { label?: string; className?: string }) {
  return (
    <button
      className={className}
      type="button"
      onClick={() => window.dispatchEvent(new Event(PRODUCT_REVIEW_OPEN_EVENT))}
    >
      {label}
    </button>
  );
}
