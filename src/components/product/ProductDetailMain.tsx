"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  FileText
} from "lucide-react";
import type { ProductSummary } from "@/lib/api/api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getEffectivePrice } from "@/lib/commerce/product-commerce";
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
import { ProductReviewOpenButton } from "@/components/product/ProductReviewOpenButton";

type ProductDetailMainProps = {
  viewModel: ProductDetailViewModel;
};

function ProductProjectCard({ product, locale }: { product: ProductSummary; locale: SiteLocale }) {
  const productHref = localeHref(`/products/${product.slug}?sku=${encodeURIComponent(product.sku)}`, locale);
  const spec = [formatProductSize(product.dimensions, locale), product.finish].filter(Boolean).join(" · ");

  return (
    <div className="rc">
      <Link className="rc__img" href={productHref} prefetch={false} tabIndex={-1} aria-hidden="true">
        <img
          src={product.images[0].url}
          alt=""
          width={product.images[0].width}
          height={product.images[0].height}
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div>
        <Link className="rc__name" href={productHref} prefetch={false}>
          {product.name}
        </Link>
        {spec ? <span className="rc__spec">{spec}</span> : null}
        <div className="rc__price">{formatUnitPrice(getEffectivePrice(product), product.unit, locale)}</div>
      </div>
    </div>
  );
}

export function ProductDetailMain({ viewModel }: ProductDetailMainProps) {
  const {
    categoryFilter,
    completeProjectProducts,
    documents,
    packageRows,
    product,
    questions: configuredQuestions,
    reviewSummary,
    reviews,
    locale
  } = viewModel;
  const french = locale === "fr-CA";
  const [specsCopied, setSpecsCopied] = useState(false);
  // Per-star review distribution (5★..1★). Sum always equals the published review count.
  const starDistribution = useMemo<number[]>(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const review of reviews) {
      const rating = Math.min(5, Math.max(1, review.rating ?? 0));
      counts[5 - rating] += 1;
    }
    return counts;
  }, [reviews]);
  const productVariant = useProductVariant();
  const selectedProduct = resolveProductVariant(product, productVariant?.selectedFinishName);
  const specRows = localizeSpecificationRows(buildSpecRows(
    {
      ...selectedProduct.specifications,
      Dimensions: formatProductSize(selectedProduct.specifications.Dimensions ?? selectedProduct.dimensions, locale)
    },
    selectedProduct.subCategory
  ), locale, `${selectedProduct.category} ${selectedProduct.subCategory ?? ""}`).filter(([label]) => !/^construction$/i.test(label));

  const isMonoSpecLabel = (label: string) => /(mpn|sku|model)/i.test(label);
  const resolvedHighlights = getPublicProductHighlights(selectedProduct).filter((highlight) => !/^construction\s*:/i.test(highlight));
  const rawDimensions = selectedProduct.specifications.Dimensions ?? selectedProduct.dimensions ?? "";
  const trimmedDimensions = (rawDimensions.startsWith("Dimensions:")
    ? rawDimensions.slice("Dimensions:".length)
    : rawDimensions).trim();
  const dimensionParts = trimmedDimensions.split(" × ");
  const dimensionCards = dimensionParts.length === 3
    ? dimensionParts.map((part) => {
        const dimMatch = /^(.+?)\s+([WHD])$/.exec(part.trim());
        return dimMatch ? { value: dimMatch[1], letter: dimMatch[2] as "W" | "H" | "D" } : null;
      })
    : [];
  const DIMENSION_LABELS: Record<"W" | "H" | "D", string> = french
    ? { W: "Largeur", H: "Hauteur", D: "Profondeur" }
    : { W: "Width", H: "Height", D: "Depth" };
  const renderDimensions = dimensionCards.length === 3
    && dimensionCards[0]?.letter === "W"
    && dimensionCards[1]?.letter === "H"
    && dimensionCards[2]?.letter === "D";
  const colorName = selectedProduct.colorName ?? selectedProduct.finish ?? "Standard finish";
  const sourceCategory = selectedProduct.specifications["Source category"] ?? selectedProduct.subCategory ?? "";
  const identityRows: Array<[string, string]> = [
    [french ? "Nº de modèle (MPN)" : "Model (MPN)", selectedProduct.manufacturerPartNumber ?? ""],
    ["SKU", selectedProduct.sku ?? ""],
    ...specRows.filter(([label]) => /^dimensions/i.test(label)),
    [french ? "Couleur / fini" : "Colour / finish", colorName],
    [french ? "Catégorie source" : "Source category", sourceCategory],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;
  const featuredSpecRows = identityRows;
  const technicalSpecRows = specRows.filter(([label]) => !/^dimensions/i.test(label));
  const questions = product.questions?.length
    ? configuredQuestions
    : french ? createFrCaDefaultQuestions(selectedProduct) : createDefaultQuestions(selectedProduct);

  return (
    <div className="sec">
      <section
        className="card"
        id="overview"
        aria-labelledby="pdp-overview-title"
      >
        <div className="card__head row row--between">
          <div>
            <h2 id="pdp-overview-title">{french ? "Aperçu du produit" : "Product overview"}</h2>
            <p className="sub">Frameless European construction, plywood box, PVC matte soft-touch Shaker door.</p>
          </div>
          <span>{resolvedHighlights.length} {french ? "points forts du produit" : "product highlights"}</span>
        </div>
        <div className="card__body">
          <div className="ov">
            {resolvedHighlights.length > 0 ? (
              <ul className="ov__list" id="ovList">
                {resolvedHighlights.map((highlight) => {
                  const colonIndex = highlight.indexOf(":");
                  return (
                    <li key={highlight}>
                      <Check className="ov__icon" size={16} strokeWidth={2.4} aria-hidden="true" />
                      {colonIndex === -1 ? (
                        <span>{highlight}</span>
                      ) : (
                        <span>
                          <b>{highlight.slice(0, colonIndex + 1)}</b>
                          {highlight.slice(colonIndex + 1)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="kv">
              {renderDimensions ? (
                <div className="dims">
                  {dimensionCards.map((dimCard, dimIndex) => (
                    <div className="card dim" key={`dim-${dimIndex}`}>
                      <span className="n">{dimCard!.value}</span>
                      <small>{DIMENSION_LABELS[dimCard!.letter]}</small>
                    </div>
                  ))}
                </div>
              ) : null}
              <dl style={{ margin: 0, display: "grid", gap: 10 }}>
                <div className="kv__row">
                  <dt>{french ? "Couleur / fini" : "Color / Finish"}</dt>
                  <dd id="kvFinish">{colorName}</dd>
                </div>
                <div className="kv__row">
                  <dt>{french ? "Quantité par emballage" : "Package Quantity"}</dt>
                  <dd>
                    {selectedProduct.packageQuantity?.displayLabel ??
                      packageRows.map(([label, value]) => `${localizePackageQuantityLabel(label, locale)} ${value}`).join(" / ")}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="card" id="specifications" aria-labelledby="pdp-specifications-title">
        <span id="specs" aria-hidden="true" className="pdp-anchor-alias" />
        <div className="card__head row row--between">
          <div>
            <h2 id="pdp-specifications-title">{french ? "Spécifications" : "Specifications"}</h2>
            <p className="sub">
              {(featuredSpecRows.length + technicalSpecRows.length)} {french ? "champs · du catalogue Vanstro" : "fields · from the Vanstro catalogue"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const text = specRows.map(([label, value]) => `${label}: ${value}`).join("\n");
              void navigator.clipboard?.writeText(text);
              setSpecsCopied(true);
              window.setTimeout(() => setSpecsCopied(false), 650);
            }}
          >
            <Copy className="btn__icon" size={18} aria-hidden="true" />
            {specsCopied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="card__body">
          <div className="spec-cols">
            <table className="spec" aria-label={french ? "Spécifications principales" : "Key specifications"}>
              <tbody>
                {featuredSpecRows.map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    <td className={isMonoSpecLabel(label) ? "mono" : undefined}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="spec" aria-label={french ? "Spécifications techniques" : "Technical specifications"}>
              <tbody>
                {technicalSpecRows.map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    <td className={isMonoSpecLabel(label) ? "mono" : undefined}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {specRows.length > featuredSpecRows.length + technicalSpecRows.length ? (
          <p className="pdp-section-note">
            {french
              ? "D’autres champs techniques sont disponibles dans la fiche de spécifications."
              : "Additional technical fields are available in the specification sheet."}
          </p>
        ) : null}
      </section>

      <section className="card" id="documents" aria-labelledby="pdp-documents-title">
        <span id="docs" aria-hidden="true" className="pdp-anchor-alias" />
        <div className="card__head">
          <h2 id="pdp-documents-title">{french ? "Manuels et documents" : "Manuals and Documents"}</h2>
        </div>
        <div className="card__body">
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
            <div className="alert alert--info empty" role="status">
              <FileText size={18} strokeWidth={2.2} />
              <div>
                <strong>
                  {french
                    ? "Aucun document de produit n’a encore été téléversé pour cet article."
                    : "No product documents have been uploaded for this item yet."}
                </strong>
              </div>
              <a className="btn btn--secondary btn--sm" href={localeHref("/contact", locale)}>
                Ask your dealer
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="card" id="qa" aria-labelledby="pdp-qa-title">
        <div className="card__head row row--between">
          <div>
            <h2 id="pdp-qa-title">{french ? "Questions et réponses" : "Questions and Answers"}</h2>
            <p className="sub">{questions.length} {french ? "réponses" : "answered"}</p>
          </div>
        </div>
        <div className="card__body">
          <div className="qa" id="qaList">
            {questions.map((item, index) => (
              <details key={item.id} open={index === 0}>
                <summary>
                  {item.question}
                  <ChevronDown size={18} strokeWidth={2.2} />
                </summary>
                <div className="qa__a">
                  {item.answer}
                  {item.sourceLabel ? <span className="by">{item.sourceLabel}</span> : null}
                </div>
              </details>
            ))}
          </div>
          <form className="qa__ask" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <label className="field__label" htmlFor="askQ">
                Have a question about this cabinet?
              </label>
              <div className="control">
                <Input
                  id="askQ"
                  name="productQuestion"
                  placeholder="e.g. Can the door be hinged on the right?"
                  autoComplete="off"
                />
              </div>
              <div className="field__hint">
                Answered by the Vanstro product team, usually within 1 business day.
              </div>
            </div>
            <Button type="submit" variant="secondary" className="btn btn--secondary">
              Ask
            </Button>
          </form>
        </div>
      </section>

      <section className="card" id="reviews" aria-labelledby="pdp-reviews-title">
        <div className="card__head row row--between">
          <div>
            <h2 id="pdp-reviews-title">{french ? "Avis des clients" : "Customer reviews"}</h2>
            <p className="sub">
              {reviewSummary.count > 0
                ? `${reviewSummary.count} ${french ? "avis" : "reviews"}`
                : french
                  ? "Aucun avis publié"
                  : reviewSummary.sourceLabel ?? "No published reviews"}
            </p>
          </div>
          <ProductReviewOpenButton
            className="btn btn--secondary btn--sm"
            label={french ? "Rédiger un avis" : "Write a review"}
          />
        </div>
        <div className="card__body">
          <div className="rv">
            <div className="rv__score">
              <span className="n">
                {reviewSummary.average > 0 ? reviewSummary.average.toFixed(1) : "—"}
              </span>
              <span className="stars" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <svg
                    className={index < Math.round(reviewSummary.average) ? "is-filled" : undefined}
                    viewBox="0 0 24 24"
                    key={index}
                  >
                    <path d="m12 2 3 6.6 7 .8-5.2 4.9 1.4 7L12 17.8 5.8 21.3l1.4-7L2 9.4l7-.8Z" />
                  </svg>
                ))}
              </span>
              {reviewSummary.average > 0 ? null : (
                <span className="muted small">
                  {french ? "Soyez le premier à commenter" : "Be the first to review"}
                </span>
              )}
            </div>
            <div className="rv__bars" aria-label={french ? "Répartition des notes" : "Rating breakdown"}>
              {[5, 4, 3, 2, 1].map((n, index) => (
                <div className="rv__bar" key={n}>
                  <span>{n}</span>
                  <span className="rv__bar-track">
                    <i style={{ width: reviews.length ? `${Math.round((starDistribution[index] / reviews.length) * 100)}%` : "0%" }} />
                  </span>
                  <span>{starDistribution[index]}</span>
                </div>
              ))}
            </div>
          </div>
          {reviews.length > 0 ? (
            <div className="pdp-community-list" data-review-list>
              {reviews.map((review) => (
                <article className="pdp-community-card" key={review.id}>
                  <strong>{review.title?.trim() || (french ? "Avis sur le produit" : "Product review")}</strong>
                  <p>{review.body}</p>
                  <small>{review.name}</small>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="card" id="complete-project" aria-labelledby="pdp-project-title">
          <span id="pairs" aria-hidden="true" className="pdp-anchor-alias" />
          <div className="card__head row row--between">
            <div>
              <h2 id="pdp-project-title">{french ? "Complétez votre projet" : "Complete The Project"}</h2>
              <p className="sub">
                {french
                  ? "Articles souvent jumelés et éléments complémentaires pour une même commande."
                  : "Frequently paired items and nearby project pieces for the same order."}
              </p>
            </div>
            <Link
              className="small"
              href={localeHref(`/products?category=${categoryFilter}`, locale)}
            >
              {french ? "Voir les produits connexes" : "View related"}
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </Link>
          </div>
          <div className="card__body">
            <div className="reco">
              {completeProjectProducts.map((projectProduct) => (
                <ProductProjectCard product={projectProduct} locale={locale} key={projectProduct.id} />
              ))}
            </div>
          </div>
      </section>
    </div>
  );
}
