import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  PackageCheck,
  Ruler,
  Star,
  X
} from "lucide-react";
import type { ProductSummary } from "@/lib/api/api-contract";
import {
  formatMoney,
  getCompareAtPrice,
  getEffectivePrice,
  getPromotionBadges,
  getSavingsLabel
} from "@/lib/commerce/product-commerce";
import type { ProductDetailViewModel } from "@/lib/product/product-detail-view-model";

type ProductDetailMainProps = {
  viewModel: ProductDetailViewModel;
};

function formatDocumentType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function ProductProjectCard({ product }: { product: ProductSummary }) {
  const compareAtPrice = getCompareAtPrice(product);
  const effectivePrice = getEffectivePrice(product);
  const savingsLabel = getSavingsLabel(product);
  const primaryPromotion = getPromotionBadges(product)[0];

  return (
    <article className="pdp-project-card">
      <Link className="pdp-project-image" href={`/products/${product.slug}`}>
        <img src={product.images[0].url} alt={product.images[0].alt} />
      </Link>
      <div className="pdp-project-copy">
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
        <small>{product.dimensions}</small>
        {savingsLabel || primaryPromotion ? (
          <span className="commerce-badge-row">
            {savingsLabel ? <em className="commerce-badge strong">{savingsLabel}</em> : null}
            {primaryPromotion ? <em className="commerce-badge">{primaryPromotion.label}</em> : null}
          </span>
        ) : null}
        <strong>
          {compareAtPrice ? <span>{formatMoney(compareAtPrice)}</span> : null}
          {formatMoney(effectivePrice)}
          <small>/ {product.unit}</small>
        </strong>
      </div>
    </article>
  );
}

export function ProductDetailMain({ viewModel }: ProductDetailMainProps) {
  const {
    brandName,
    categoryFilter,
    colorHex,
    colorName,
    completeProjectProducts,
    documents,
    featuredSpecRows,
    packageRows,
    product,
    productHighlights,
    questions,
    reviews,
    reviewSummary,
    specRows,
    technicalSpecRows
  } = viewModel;

  return (
    <main className="pdp-detail-main">
      <section className="pdp-detail-section" id="overview" aria-labelledby="pdp-overview-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-overview-title">Product overview</h2>
          <span>{brandName} product details</span>
        </div>
        <p>{product.description}</p>
        <ul className="pdp-overview-list">
          {productHighlights.slice(0, 3).map((highlight) => (
            <li key={highlight}>
              <CheckCircle2 size={17} strokeWidth={2.4} />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
        <div className="pdp-policy-strip">
          <div>
            <Ruler size={18} strokeWidth={2.3} />
            <span>
              <strong>Dimensions</strong>
              <small>{product.dimensions}</small>
            </span>
          </div>
          <div>
            <span className="pdp-color-dot" style={{ backgroundColor: colorHex }} />
            <span>
              <strong>Color / Finish</strong>
              <small>{colorName}</small>
            </span>
          </div>
          <div>
            <PackageCheck size={18} strokeWidth={2.3} />
            <span>
              <strong>Package Quantity</strong>
              <small>{packageRows.map(([label, value]) => `${label} ${value}`).join(" / ")}</small>
            </span>
          </div>
        </div>
      </section>

      <section className="pdp-detail-section" id="specifications" aria-labelledby="pdp-specifications-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-specifications-title">Specifications</h2>
          <span>{specRows.length} fields</span>
        </div>
        <dl className="pdp-spec-summary-grid" aria-label="Key specifications">
          {featuredSpecRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <dl className="pdp-spec-table pdp-spec-table-compact" aria-label="Technical specifications">
          {technicalSpecRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {specRows.length > featuredSpecRows.length + technicalSpecRows.length ? (
          <p className="pdp-section-note">
            Additional technical fields are available in the specification sheet.
          </p>
        ) : null}
      </section>

      <section className="pdp-detail-section pdp-documents" id="documents" aria-labelledby="pdp-documents-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-documents-title">Manuals and Documents</h2>
          <span>{documents.length || "No"} files</span>
        </div>
        {documents.length ? (
          <div className="pdp-document-list">
            {documents.map((document) => (
              <Link className="pdp-document-card" href={document.href} key={document.label}>
                <FileText size={18} strokeWidth={2.2} />
                <span>
                  <strong>{document.label}</strong>
                  <small>{formatDocumentType(document.type)}</small>
                </span>
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="pdp-empty-copy">No product documents have been uploaded for this item yet.</p>
        )}
      </section>

      <section className="pdp-detail-section" id="qa" aria-labelledby="pdp-qa-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-qa-title">Questions and Answers</h2>
          <span>{questions.length} answered</span>
        </div>
        <div className="pdp-accordion-list">
          {questions.map((item) => (
            <details className="pdp-accordion-item" key={item.id}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

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
          <button className="pdp-review-section-cta" type="button" data-review-modal-open>
            Write a Review
          </button>
        ) : null}
        <div className="pdp-review-modal" data-review-modal hidden>
          <button
            className="pdp-review-modal-backdrop"
            type="button"
            aria-label="Close review form"
            data-review-modal-close
          />
          <form
            className="pdp-review-modal-sheet"
            id="write-review"
            aria-labelledby="write-review-title"
            data-product-id={product.id}
          >
            <div className="pdp-review-modal-head">
              <img src={product.images[0].url} alt={product.images[0].alt} />
              <span>
                <small>My Review</small>
                <h3 id="write-review-title">{product.name}</h3>
              </span>
              <button className="pdp-review-modal-close" type="button" aria-label="Close review form" data-review-modal-close>
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
                {[1, 2, 3, 4, 5].map((rating) => (
                  <label key={rating}>
                    <input type="radio" name="review-rating" value={rating} defaultChecked={rating === 4} />
                    <span aria-hidden="true">&#9733;</span>
                    <small>{rating} star</small>
                  </label>
                ))}
              </div>
              <p data-review-rating-status>4 out of 5 stars selected.</p>
            </fieldset>
            <div className="pdp-review-label-row">
              <strong>Review</strong>
              <button type="button" data-review-guidelines-open>
                Review guidelines
              </button>
            </div>
            <section className="pdp-review-topic-box" aria-label="Suggested review topics">
              <div>
                <strong>Suggested review topics</strong>
                <button type="button">Hide</button>
              </div>
              <p>Suggested review topics</p>
              <div className="pdp-review-topic-list">
                {["Cabinet fit", "Finish quality", "Pickup", "Delivery", "Packaging"].map((topic) => (
                  <button type="button" aria-pressed="false" data-review-topic key={topic}>
                    {topic}
                  </button>
                ))}
              </div>
            </section>
            <label className="pdp-review-textarea">
              <span>Review*</span>
              <textarea
                name="review-body"
                rows={5}
                placeholder="Example: The cabinet finish matched our project and pickup was ready as expected..."
              />
              <small data-review-topic-count>0/5 topics used</small>
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
              Reviews are staged for moderation and backend API connection before publishing.
            </p>
            <p className="pdp-review-submit-status" data-review-submit-status aria-live="polite" hidden />
            <button className="button button-accent" type="submit" data-review-submit>
              Submit & Continue
            </button>
            <details className="pdp-review-optional">
              <summary>Other Details (Optional)</summary>
              <p>Project type, room, installation notes, and photos can be connected in the next backend pass.</p>
            </details>
            <div className="pdp-review-guidelines" data-review-guidelines hidden>
              <section className="pdp-review-guidelines-card" role="dialog" aria-modal="true" aria-labelledby="review-guidelines-title">
                <button className="pdp-review-guidelines-x" type="button" aria-label="Close review guidelines" data-review-guidelines-close>
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
                <button className="button button-primary" type="button" data-review-guidelines-close>
                  Close
                </button>
              </section>
            </div>
          </form>
        </div>
      </section>

      <section className="pdp-detail-section" id="complete-project" aria-labelledby="pdp-project-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-project-title">Complete the project</h2>
          <Link className="section-link" href={`/products?category=${categoryFilter}`}>
            View related
            <ArrowUpRight size={16} strokeWidth={2.2} />
          </Link>
        </div>
        <p className="pdp-section-note">
          Frequently paired items and nearby project pieces for the same order.
        </p>
        <div className="pdp-project-grid">
          {completeProjectProducts.map((projectProduct) => (
            <ProductProjectCard product={projectProduct} key={projectProduct.id} />
          ))}
        </div>
      </section>
    </main>
  );
}
