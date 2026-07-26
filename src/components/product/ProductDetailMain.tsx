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
  createDefaultQuestions,
  getPublicProductHighlights,
  type ProductDetailViewModel
} from "@/lib/product/product-detail-view-model";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import { resolveProductVariant } from "@/lib/product/product-variants";
import {
  createFrCaDefaultQuestions,
  localizeDocumentType,
  localizePackageQuantityLabel,
  localizeSpecificationRows
} from "@/lib/product/product-localization";
import { localeHref } from "@/lib/i18n/routes";
import type { SiteLocale } from "@/lib/i18n/locale";
import { formatUnitPrice } from "@/lib/i18n/display-format";

type ProductDetailMainProps = {
  viewModel: ProductDetailViewModel;
};

function ProductProjectCard({ product, locale }: { product: ProductSummary; locale: SiteLocale }) {
  const french = locale === "fr-CA";
  const productHref = localeHref(`/products/${product.slug}?sku=${encodeURIComponent(product.sku)}`, locale);
  const compareAtPrice = getCompareAtPrice(product);
  const effectivePrice = getEffectivePrice(product);
  const savingsLabel = getSavingsLabel(product, locale);
  const primaryPromotion = getPromotionBadges(product)[0];
  const localizedSavingsLabel = savingsLabel;
  const localizedPromotionLabel = french && primaryPromotion
    ? primaryPromotion.label
        .replace(/Special offer/gi, "Offre spéciale")
        .replace(/Limited time/gi, "Durée limitée")
        .replace(/Clearance/gi, "Liquidation")
    : primaryPromotion?.label;

  return (
    <article className="pdp-project-card">
      <Link className="pdp-project-image" href={productHref} prefetch={false}>
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
        <Link href={productHref} prefetch={false}>{product.name}</Link>
        <small>{formatProductSize(product.dimensions, locale)}</small>
        {localizedSavingsLabel || localizedPromotionLabel ? (
          <span className="commerce-badge-row">
            {localizedSavingsLabel ? <em className="commerce-badge strong">{localizedSavingsLabel}</em> : null}
            {localizedPromotionLabel ? <em className="commerce-badge">{localizedPromotionLabel}</em> : null}
          </span>
        ) : null}
        <strong>
          {compareAtPrice ? <span>{formatMoney(compareAtPrice, locale)}</span> : null}
          {formatUnitPrice(effectivePrice, product.unit, locale)}
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
    questions: configuredQuestions,
    reviews,
    reviewSummary,
    locale
  } = viewModel;
  const french = locale === "fr-CA";
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(product, productVariant?.selectedFinishName);
  const specRows = localizeSpecificationRows(buildSpecRows(
    {
      ...selectedProduct.specifications,
      Dimensions: formatProductSize(selectedProduct.specifications.Dimensions ?? selectedProduct.dimensions, locale)
    },
    selectedProduct.subCategory
  ), locale, `${selectedProduct.category} ${selectedProduct.subCategory ?? ""}`);
  const featuredSpecRows = specRows.slice(0, 6);
  const technicalSpecRows = specRows.slice(6, 14);
  const productHighlights = getPublicProductHighlights(selectedProduct);
  const colorName = selectedProduct.colorName ?? selectedProduct.finish ?? "Standard finish";
  const colorHex = selectedProduct.colorHex ?? "#f4f2ee";
  const questions = product.questions?.length
    ? configuredQuestions
    : french ? createFrCaDefaultQuestions(selectedProduct) : createDefaultQuestions(selectedProduct);

  return (
    <div className="pdp-detail-main">
      <section className="pdp-detail-section" id="overview" aria-labelledby="pdp-overview-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-overview-title">{french ? "Aperçu du produit" : "Product overview"}</h2>
          <span>{french ? `Détails du produit ${brandName}` : `${brandName} product details`}</span>
        </div>
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
              <small>{formatProductSize(selectedProduct.dimensions, locale)}</small>
            </span>
          </div>
          <div>
            <span className="pdp-color-dot" style={{ backgroundColor: colorHex }} />
            <span>
              <strong>{french ? "Couleur / fini" : "Color / Finish"}</strong>
              <small>{colorName}</small>
            </span>
          </div>
          <div>
            <PackageCheck size={18} strokeWidth={2.3} />
            <span>
              <strong>{french ? "Quantité par emballage" : "Package Quantity"}</strong>
              <small>
                {selectedProduct.packageQuantity?.displayLabel ??
                  packageRows.map(([label, value]) => `${localizePackageQuantityLabel(label, locale)} ${value}`).join(" / ")}
              </small>
            </span>
          </div>
        </div>
      </section>

      <section className="pdp-detail-section" id="specifications" aria-labelledby="pdp-specifications-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-specifications-title">{french ? "Spécifications" : "Specifications"}</h2>
          <span>{specRows.length} {french ? "champs" : "fields"}</span>
        </div>
        <dl className="pdp-spec-summary-grid" aria-label={french ? "Spécifications principales" : "Key specifications"}>
          {featuredSpecRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <dl className="pdp-spec-table pdp-spec-table-compact" aria-label={french ? "Spécifications techniques" : "Technical specifications"}>
          {technicalSpecRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {specRows.length > featuredSpecRows.length + technicalSpecRows.length ? (
          <p className="pdp-section-note">
            {french
              ? "D’autres champs techniques sont disponibles dans la fiche de spécifications."
              : "Additional technical fields are available in the specification sheet."}
          </p>
        ) : null}
      </section>

      <section className="pdp-detail-section pdp-documents" id="documents" aria-labelledby="pdp-documents-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-documents-title">{french ? "Manuels et documents" : "Manuals and Documents"}</h2>
          <span>{documents.length || (french ? "Aucun" : "No")} {french ? "fichiers" : "files"}</span>
        </div>
        {documents.length ? (
          <div className="pdp-document-list">
            {documents.map((document) => (
              <Link className="pdp-document-card" href={localeHref(document.href, locale)} key={document.label}>
                <FileText size={18} strokeWidth={2.2} />
                <span>
                  <strong>{document.label}</strong>
                  <small>{localizeDocumentType(document.type, locale)}</small>
                </span>
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="pdp-empty-copy">
            {french
              ? "Aucun document de produit n’a encore été téléversé pour cet article."
              : "No product documents have been uploaded for this item yet."}
          </p>
        )}
      </section>

      <section className="pdp-detail-section" id="qa" aria-labelledby="pdp-qa-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-qa-title">{french ? "Questions et réponses" : "Questions and Answers"}</h2>
          <span>{questions.length} {french ? "réponses" : "answered"}</span>
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
        locale={locale}
      />

      <section className="pdp-detail-section" id="complete-project" aria-labelledby="pdp-project-title">
        <div className="pdp-section-heading">
          <h2 id="pdp-project-title">{french ? "Complétez votre projet" : "Complete the project"}</h2>
          <Link className="section-link" href={localeHref(`/products?category=${categoryFilter}`, locale)}>
            {french ? "Voir les produits connexes" : "View related"}
            <ArrowUpRight size={16} strokeWidth={2.2} />
          </Link>
        </div>
        <p className="pdp-section-note">
          {french
            ? "Articles souvent jumelés et éléments complémentaires pour une même commande."
            : "Frequently paired items and nearby project pieces for the same order."}
        </p>
        <div className="pdp-project-grid">
          {completeProjectProducts.map((projectProduct) => (
            <ProductProjectCard product={projectProduct} locale={locale} key={projectProduct.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
