"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import type {
  ProductDetail,
  ProductRatingSummary,
  ProductReview
} from "@/lib/api/api-contract";
import { PRODUCT_REVIEW_OPEN_EVENT } from "@/components/product/ProductReviewOpenButton";
import { vanstroApi } from "@/lib/api/api-client";

type ProductReviewSectionProps = {
  product: ProductDetail;
  reviews: ProductReview[];
  reviewSummary: ProductRatingSummary;
};

const reviewTopics = ["Cabinet fit", "Finish quality", "Pickup", "Delivery", "Packaging"];
const ratingLabels = ["", "Poor", "Fair", "Average", "Good", "Excellent"];

export function ProductReviewSection({
  product,
  reviews,
  reviewSummary
}: ProductReviewSectionProps) {
  const [open, setOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [rating, setRating] = useState(4);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  function openReviewModal() {
    lastActiveRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }

  function closeReviewModal() {
    setGuidelinesOpen(false);
    setOpen(false);
    window.setTimeout(() => lastActiveRef.current?.focus(), 0);
  }

  useEffect(() => {
    const openFromGlobalButton = () => openReviewModal();
    window.addEventListener(PRODUCT_REVIEW_OPEN_EVENT, openFromGlobalButton);

    return () => window.removeEventListener(PRODUCT_REVIEW_OPEN_EVENT, openFromGlobalButton);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("review-modal-open", open);

    if (open) {
      window.setTimeout(() => {
        formRef.current?.querySelector<HTMLInputElement>(
          `input[name="review-rating"][value="${rating}"]`
        )?.focus();
      }, 0);
    }

    return () => {
      document.body.classList.remove("review-modal-open");
    };
  }, [open, rating]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (guidelinesOpen) {
        setGuidelinesOpen(false);
        return;
      }
      closeReviewModal();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guidelinesOpen, open]);

  function toggleTopic(topic: string) {
    setStatus(null);
    setSelectedTopics((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : [...current, topic].slice(0, 5)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("review-body") ?? "").trim();
    const title = String(formData.get("review-title") ?? "").trim();
    const nickname = String(formData.get("review-name") ?? "").trim();
    const email = String(formData.get("review-email") ?? "").trim();
    const acceptedTerms = Boolean(formData.get("review-terms"));

    if (!rating) {
      setStatus({ tone: "error", message: "Please choose an overall rating." });
      return;
    }
    if (!body) {
      setStatus({ tone: "error", message: "Please enter your review." });
      return;
    }
    if (!nickname) {
      setStatus({ tone: "error", message: "Please enter your nickname." });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ tone: "error", message: "Please enter a valid email address." });
      return;
    }
    if (!acceptedTerms) {
      setStatus({ tone: "error", message: "Please agree to the Terms of Use." });
      return;
    }

    const payload = {
      productId: product.id,
      rating,
      title,
      body,
      nickname,
      email,
      topics: selectedTopics,
      acceptedTerms,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    setSubmitting(true);

    try {
      await vanstroApi.submitProductReview(payload);
      window.dispatchEvent(new CustomEvent("vanstro-review-submitted", { detail: payload }));
      setStatus({
        tone: "success",
        message: "Review submitted. It is now pending Dashboard moderation."
      });
      event.currentTarget.reset();
      setRating(4);
      setSelectedTopics([]);
    } catch {
      setStatus({ tone: "error", message: "Review could not be submitted. Please try again." });
    } finally {
      window.setTimeout(() => setSubmitting(false), 650);
    }
  }

  return (
    <section className="pdp-detail-section" id="reviews" aria-labelledby="pdp-reviews-title">
      <div className="pdp-section-heading">
        <h2 id="pdp-reviews-title">Customer Reviews</h2>
        <span>{reviewSummary.count} reviews</span>
      </div>
      <div className="pdp-review-summary">
        <strong>{reviewSummary.average.toFixed(1)}</strong>
        <span aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => (
            <Star
              className={index < Math.round(reviewSummary.average) ? "rating-star filled" : "rating-star"}
              size={15}
              strokeWidth={2}
              fill={index < Math.round(reviewSummary.average) ? "currentColor" : "none"}
              key={index}
            />
          ))}
        </span>
        <small>{reviewSummary.sourceLabel ?? "Based on verified product feedback."}</small>
      </div>
      <div className="pdp-community-list">
        {reviews.map((review) => (
          <article className="pdp-community-card" key={review.id}>
            <strong>{review.title}</strong>
            <p>{review.body}</p>
            <small>{review.name}</small>
          </article>
        ))}
      </div>
      {reviewSummary.writeReviewEnabled ?? true ? (
        <button className="pdp-review-section-cta" type="button" onClick={openReviewModal}>
          Write a Review
        </button>
      ) : null}

      {open ? (
        <div className="pdp-review-modal" role="presentation">
          <button
            className="pdp-review-modal-backdrop"
            type="button"
            aria-label="Close review form"
            onClick={closeReviewModal}
          />
          <form
            className="pdp-review-modal-sheet"
            id="write-review"
            aria-labelledby="write-review-title"
            onSubmit={handleSubmit}
            ref={formRef}
          >
            <div className="pdp-review-modal-head">
              <img src={product.images[0].url} alt={product.images[0].alt} />
              <span>
                <small>My Review</small>
                <h3 id="write-review-title">{product.name}</h3>
              </span>
              <button className="pdp-review-modal-close" type="button" aria-label="Close review form" onClick={closeReviewModal}>
                <X size={18} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
            <p className="pdp-review-required">Required fields are marked with *</p>
            <div className="pdp-review-step-row">
              <span className="pdp-review-step-number">1</span>
              <strong>YOUR REVIEWS</strong>
              <small>In Progress</small>
            </div>
            <fieldset className="pdp-review-stars">
              <legend>Overall Rating*</legend>
              <div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label className={value <= rating ? "selected" : ""} key={value}>
                    <input
                      type="radio"
                      name="review-rating"
                      value={value}
                      checked={rating === value}
                      onChange={() => {
                        setStatus(null);
                        setRating(value);
                      }}
                    />
                    <span aria-hidden="true">&#9733;</span>
                    <small>{value} star</small>
                  </label>
                ))}
              </div>
              <p>{rating} out of 5 stars selected. Product is {ratingLabels[rating]}.</p>
            </fieldset>
            <div className="pdp-review-label-row">
              <strong>Review</strong>
              <button type="button" onClick={() => setGuidelinesOpen(true)}>
                Review guidelines
              </button>
            </div>
            <section className="pdp-review-topic-box" aria-label="Suggested review topics">
              <div>
                <strong>Suggested review topics</strong>
                <button type="button" onClick={() => setSelectedTopics([])}>Clear</button>
              </div>
              <p>Suggested review topics</p>
              <div className="pdp-review-topic-list">
                {reviewTopics.map((topic) => {
                  const selected = selectedTopics.includes(topic);

                  return (
                    <button
                      className={selected ? "selected" : ""}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTopic(topic)}
                      key={topic}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </section>
            <label className="pdp-review-textarea">
              <span>Review*</span>
              <textarea
                name="review-body"
                rows={5}
                placeholder="Example: The cabinet finish matched our project and pickup was ready as expected..."
              />
              <small>{selectedTopics.length}/5 topics used</small>
            </label>
            <label className="pdp-review-input">
              <span>Review Title</span>
              <input name="review-title" type="text" placeholder="Example: Clean finish and accurate sizing" />
            </label>
            <label className="pdp-review-input">
              <span>Nickname*</span>
              <input name="review-name" type="text" placeholder="Example: TorontoProject27" />
            </label>
            <label className="pdp-review-input">
              <span>Email Address*</span>
              <input name="review-email" type="email" placeholder="Example: yourname@example.com" />
            </label>
            <label className="pdp-review-terms">
              <input type="checkbox" name="review-terms" />
              <span>I agree to the Terms of Use</span>
            </label>
            <p className="pdp-review-privacy">
              Reviews are submitted to VanStro for Dashboard moderation before publishing.
            </p>
            {status ? (
              <p className={`pdp-review-submit-status ${status.tone}`} aria-live="polite">
                {status.message}
              </p>
            ) : null}
            <button className="button button-accent" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit & Continue"}
            </button>
            <details className="pdp-review-optional">
              <summary>Other Details (Optional)</summary>
              <p>Project type, room, installation notes, and photos can be connected in the next backend pass.</p>
            </details>
          </form>

          {guidelinesOpen ? (
            <div className="pdp-review-guidelines" role="presentation">
              <section className="pdp-review-guidelines-card" role="dialog" aria-modal="true" aria-labelledby="review-guidelines-title">
                <button className="pdp-review-guidelines-x" type="button" aria-label="Close review guidelines" onClick={() => setGuidelinesOpen(false)}>
                  <X size={18} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <h4 id="review-guidelines-title">Writing guidelines</h4>
                <p>We want to publish your review, so please:</p>
                <ul>
                  <li>Keep your review focused on the product.</li>
                  <li>Avoid writing about customer service or order issues that require immediate attention.</li>
                  <li>Do not mention competitors or the specific price you paid.</li>
                  <li>Do not include personally identifiable information, such as full names.</li>
                </ul>
                <button className="button button-primary" type="button" onClick={() => setGuidelinesOpen(false)}>
                  Close
                </button>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
