"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  PackageCheck,
  Ruler
} from "lucide-react";
import type { ProductSummary } from "@/lib/api/api-contract";
import { ProductReviewSection } from "@/components/product/ProductReviewSection";
import {
  formatMoney,
  getCompareAtPrice,
  getEffectivePrice,
  getPromotionBadges,
  getSavingsLabel
} from "@/lib/commerce/product-commerce";
import { formatProductSize } from "@/lib/product/product-display";
import {
  buildSpecRows,
  type ProductDetailViewModel
} from "@/lib/product/product-detail-view-model";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import { resolveProductVariant } from "@/lib/product/product-variants";

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
      <Link className="pdp-project-image" href={`/products/${product.slug}`} prefetch={false}>
        <img
          src={product.images[0].url}
          alt={product.images[0].alt}
          width={product.images[0].width}
          height={product.images[0].height}
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="pdp-project-copy">
        <Link href={`/products/${product.slug}`} prefetch={false}>{product.name}</Link>
        <small>{formatProductSize(product.dimensions)}</small>
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
    completeProjectProducts,
    documents,
    packageRows,
    product,
    questions,
    reviews,
    reviewSummary,
  } = viewModel;
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(product, productVariant?.selectedFinishName);
  const specRows = buildSpecRows({
    ...selectedProduct.specifications,
    Dimensions: formatProductSize(selectedProduct.specifications.Dimensions ?? selectedProduct.dimensions)
  });
  const featuredSpecRows = specRows.slice(0, 6);
  const technicalSpecRows = specRows.slice(6, 14);
  const productHighlights = selectedProduct.productHighlights ?? [];
  const colorName = selectedProduct.colorName ?? selectedProduct.finish ?? "Standard finish";
  const colorHex = selectedProduct.colorHex ?? "#f4f2ee";

  return (
    <div className="pdp-detail-main">
      <section className="pdp-detail-section" id="overview" aria-labelledby="pdp-overview-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-overview-title">Product overview</h2>
          <span>{brandName} product details</span>
        </div>
        <p>{selectedProduct.description}</p>
        <ul className="pdp-overview-list">
          {productHighlights.map((highlight) => (
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
              <small>{formatProductSize(selectedProduct.dimensions)}</small>
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

      <ProductReviewSection
        product={product}
        reviews={reviews}
        reviewSummary={reviewSummary}
      />

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
    </div>
  );
}
