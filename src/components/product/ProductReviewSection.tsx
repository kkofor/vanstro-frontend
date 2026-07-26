"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star, X } from "lucide-react";
import type {
  ProductDetail,
  ProductRatingSummary,
  ProductReview
} from "@/lib/api/api-contract";
import { PRODUCT_REVIEW_OPEN_EVENT } from "@/components/product/ProductReviewOpenButton";
import { vanstroApi } from "@/lib/api/api-client";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

type ProductReviewSectionProps = {
  product: ProductDetail;
  reviews: ProductReview[];
  reviewSummary: ProductRatingSummary;
  locale?: SiteLocale;
};

const reviewTopics = [
  { value: "Cabinet fit", fr: "Dimensions et installation de l’armoire" },
  { value: "Finish quality", fr: "Qualité de la finition" },
  { value: "Pickup", fr: "Ramassage" },
  { value: "Delivery", fr: "Livraison" },
  { value: "Packaging", fr: "Emballage" }
] as const;
const ratingLabels = ["", "Poor", "Fair", "Average", "Good", "Excellent"];
const frRatingLabels = ["", "médiocre", "passable", "moyen", "bon", "excellent"];

export function ProductReviewSection({ product, locale = "en-CA" }: ProductReviewSectionProps) {
  const french = locale === "fr-CA";
  const [open, setOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const guidelinesRootRef = useRef<HTMLDivElement | null>(null);
  const guidelinesRef = useRef<HTMLElement | null>(null);
  const publishedReviews = product.reviews ?? [];
  const publishedSummary = product.ratingSummary;
  const hasPublishedReviewTruth = Boolean(
    publishedSummary &&
    publishedSummary.count > 0 &&
    publishedSummary.count === publishedReviews.length
  );

  function openReviewModal() {
    setOpen(true);
  }

  const closeReviewModal = useCallback(() => {
    setGuidelinesOpen(false);
    setOpen(false);
  }, []);
  const closeGuidelines = useCallback(() => setGuidelinesOpen(false), []);

  useModalFocus({
    active: open && !guidelinesOpen,
    containerRef: formRef,
    modalRootRef,
    onEscape: closeReviewModal
  });
  useModalFocus({
    active: guidelinesOpen,
    containerRef: guidelinesRef,
    modalRootRef: guidelinesRootRef,
    onEscape: closeGuidelines
  });

  useEffect(() => {
    const openFromGlobalButton = () => openReviewModal();
    window.addEventListener(PRODUCT_REVIEW_OPEN_EVENT, openFromGlobalButton);

    return () => window.removeEventListener(PRODUCT_REVIEW_OPEN_EVENT, openFromGlobalButton);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("review-modal-open", open);

    return () => {
      document.body.classList.remove("review-modal-open");
    };
  }, [open]);

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

    const showValidationError = (fieldId: string, message: string) => {
      setInvalidField(fieldId);
      setStatus({ tone: "error", message });
      window.requestAnimationFrame(() => document.getElementById(fieldId)?.focus());
    };

    if (!rating) {
      showValidationError("review-rating-1", french ? "Veuillez choisir une note globale." : "Please choose an overall rating.");
      return;
    }
    if (!body) {
      showValidationError("review-body", french ? "Veuillez saisir votre avis." : "Please enter your review.");
      return;
    }
    if (!nickname) {
      showValidationError("review-name", french ? "Veuillez saisir votre pseudonyme." : "Please enter your nickname.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showValidationError("review-email", french ? "Veuillez saisir une adresse courriel valide." : "Please enter a valid email address.");
      return;
    }
    if (!acceptedTerms) {
      showValidationError("review-terms", french ? "Veuillez accepter les conditions d’utilisation." : "Please agree to the Terms of Use.");
      return;
    }

    setInvalidField(null);

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
        message: french
          ? "Merci! Votre avis a été soumis et sera publié après vérification."
          : "Review submitted. It is now pending Dashboard moderation."
      });
      event.currentTarget.reset();
      setRating(0);
      setSelectedTopics([]);
    } catch {
      setStatus({
        tone: "error",
        message: french
          ? "L’avis n’a pas pu être soumis. Veuillez réessayer."
          : "Review could not be submitted. Please try again."
      });
    } finally {
      window.setTimeout(() => setSubmitting(false), 650);
    }
  }

  return (
    <section className="pdp-detail-section" id="reviews" aria-labelledby="pdp-reviews-title">
      <div className="pdp-section-heading">
        <h2 id="pdp-reviews-title">{french ? "Avis des clients" : "Customer Reviews"}</h2>
        <span>{hasPublishedReviewTruth ? `${publishedSummary?.count} ${french ? "avis" : "reviews"}` : french ? "Aucun avis publié" : "No published reviews"}</span>
      </div>
      {hasPublishedReviewTruth && publishedSummary ? (
        <>
          <div className="pdp-review-summary">
            <strong>{publishedSummary.average.toFixed(1)}</strong>
            <span aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <Star
                  className={index < Math.round(publishedSummary.average) ? "rating-star filled" : "rating-star"}
                  size={15}
                  strokeWidth={2}
                  fill={index < Math.round(publishedSummary.average) ? "currentColor" : "none"}
                  key={index}
                />
              ))}
            </span>
            <small>{french ? "Avis de clients publiés." : publishedSummary.sourceLabel ?? "Published customer reviews."}</small>
          </div>
          <div className="pdp-community-list">
            {publishedReviews.map((review) => (
              <article className="pdp-community-card" key={review.id}>
                <strong>{review.title?.trim() || (french ? "Avis sur le produit" : "Product review")}</strong>
                <p>{review.body}</p>
                <small>{review.name}</small>
              </article>
            ))}
          </div>
        </>
      ) : null}
      {publishedSummary?.writeReviewEnabled ?? true ? (
        <button className="pdp-review-section-cta" type="button" onClick={openReviewModal}>
          {french ? "Rédiger un avis" : "Write a Review"}
        </button>
      ) : null}

      {open ? (
        <div className="pdp-review-modal" role="presentation" ref={modalRootRef}>
          <button
            className="pdp-review-modal-backdrop"
            type="button"
            aria-label={french ? "Fermer le formulaire d’avis" : "Close review form"}
            onClick={closeReviewModal}
          />
          <form
            className="pdp-review-modal-sheet"
            id="write-review"
            aria-labelledby="write-review-title"
            aria-describedby="write-review-instructions"
            aria-hidden={guidelinesOpen || undefined}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onSubmit={handleSubmit}
            noValidate
            ref={formRef}
          >
            <div className="pdp-review-modal-head">
              <img
                src={product.images[0].url}
                alt={product.images[0].alt}
                width={product.images[0].width}
                height={product.images[0].height}
                loading="lazy"
                decoding="async"
              />
              <span>
                <small>{french ? "Mon avis" : "My Review"}</small>
                <h3 id="write-review-title">{product.name}</h3>
              </span>
              <button className="pdp-review-modal-close" type="button" aria-label={french ? "Fermer le formulaire d’avis" : "Close review form"} onClick={closeReviewModal}>
                <X size={18} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
            <p className="pdp-review-required" id="write-review-instructions">{french ? "Les champs obligatoires sont marqués d’un astérisque (*)." : "Required fields are marked with *"}</p>
            <div className="pdp-review-step-row">
              <span className="pdp-review-step-number">1</span>
              <strong>{french ? "VOTRE AVIS" : "YOUR REVIEWS"}</strong>
              <small>{french ? "En cours" : "In Progress"}</small>
            </div>
            <fieldset
              className="pdp-review-stars"
              aria-invalid={invalidField === "review-rating-1" || undefined}
              aria-describedby={invalidField === "review-rating-1" ? "review-submit-status" : undefined}
            >
              <legend>{french ? "Note globale*" : "Overall Rating*"}</legend>
              <div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label className={value <= rating ? "selected" : ""} key={value}>
                    <input
                      type="radio"
                      id={`review-rating-${value}`}
                      name="review-rating"
                      value={value}
                      checked={rating === value}
                      onChange={() => {
                        setInvalidField(null);
                        setStatus(null);
                        setRating(value);
                      }}
                    />
                    <span aria-hidden="true">&#9733;</span>
                    <small>{value} {french ? `étoile${value === 1 ? "" : "s"}` : `star${value === 1 ? "" : "s"}`}</small>
                  </label>
                ))}
              </div>
              <p aria-live="polite">
                {french
                  ? rating
                    ? `${rating} étoile${rating === 1 ? "" : "s"} sur 5 sélectionnée${rating === 1 ? "" : "s"}. Le produit est jugé ${frRatingLabels[rating]}.`
                    : "Aucune note sélectionnée."
                  : rating
                    ? `${rating} out of 5 stars selected. Product is ${ratingLabels[rating]}.`
                    : "No rating selected."}
              </p>
            </fieldset>
            <div className="pdp-review-label-row">
              <strong>{french ? "Avis" : "Review"}</strong>
              <button type="button" onClick={() => setGuidelinesOpen(true)}>
                {french ? "Directives de rédaction" : "Review guidelines"}
              </button>
            </div>
            <section className="pdp-review-topic-box" aria-label={french ? "Sujets d’avis suggérés" : "Suggested review topics"}>
              <div>
                <strong>{french ? "Sujets d’avis suggérés" : "Suggested review topics"}</strong>
                <button type="button" onClick={() => setSelectedTopics([])}>{french ? "Effacer" : "Clear"}</button>
              </div>
              <p>{french ? "Choisissez jusqu’à cinq sujets pertinents." : "Suggested review topics"}</p>
              <div className="pdp-review-topic-list">
                {reviewTopics.map((topic) => {
                  const selected = selectedTopics.includes(topic.value);

                  return (
                    <button
                      className={selected ? "selected" : ""}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTopic(topic.value)}
                      key={topic.value}
                    >
                      {french ? topic.fr : topic.value}
                    </button>
                  );
                })}
              </div>
            </section>
            <label className="pdp-review-textarea">
              <span>{french ? "Avis*" : "Review*"}</span>
              <textarea
                id="review-body"
                name="review-body"
                rows={5}
                required
                aria-invalid={invalidField === "review-body" || undefined}
                aria-describedby={invalidField === "review-body" ? "review-submit-status" : undefined}
                onChange={() => invalidField === "review-body" && setInvalidField(null)}
                placeholder={french ? "Exemple : Le fini de l’armoire convenait à notre projet et le ramassage était prêt comme prévu…" : "Example: The cabinet finish matched our project and pickup was ready as expected..."}
              />
              <small>{french ? `${selectedTopics.length}/5 sujets utilisés` : `${selectedTopics.length}/5 topics used`}</small>
            </label>
            <label className="pdp-review-input">
              <span>{french ? "Titre de l’avis" : "Review Title"}</span>
              <input id="review-title" name="review-title" type="text" placeholder={french ? "Exemple : Fini soigné et dimensions exactes" : "Example: Clean finish and accurate sizing"} />
            </label>
            <label className="pdp-review-input">
              <span>{french ? "Pseudonyme*" : "Nickname*"}</span>
              <input
                id="review-name"
                name="review-name"
                type="text"
                autoComplete="nickname"
                required
                aria-invalid={invalidField === "review-name" || undefined}
                aria-describedby={invalidField === "review-name" ? "review-submit-status" : undefined}
                onChange={() => invalidField === "review-name" && setInvalidField(null)}
                placeholder={french ? "Exemple : ProjetWinnipeg27" : "Example: WinnipegProject27"}
              />
            </label>
            <label className="pdp-review-input">
              <span>{french ? "Adresse courriel*" : "Email Address*"}</span>
              <input
                id="review-email"
                name="review-email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={invalidField === "review-email" || undefined}
                aria-describedby={invalidField === "review-email" ? "review-submit-status" : undefined}
                onChange={() => invalidField === "review-email" && setInvalidField(null)}
                placeholder={french ? "Exemple : votrenom@exemple.com" : "Example: yourname@example.com"}
              />
            </label>
            <label className="pdp-review-terms">
              <input
                id="review-terms"
                type="checkbox"
                name="review-terms"
                required
                aria-invalid={invalidField === "review-terms" || undefined}
                aria-describedby={invalidField === "review-terms" ? "review-submit-status" : undefined}
                onChange={() => invalidField === "review-terms" && setInvalidField(null)}
              />
              <span>{french ? "J’accepte les " : "I agree to the "}<Link href={localeHref("/terms-and-conditions", locale)}>{french ? "conditions d’utilisation" : "Terms of Use"}</Link></span>
            </label>
            <p className="pdp-review-privacy">
              {french
                ? "Les avis sont soumis à VanStro et modérés dans le tableau de bord avant leur publication."
                : "Reviews are submitted to VanStro for Dashboard moderation before publishing."}
            </p>
            {status ? (
              <p
                id="review-submit-status"
                className={`pdp-review-submit-status ${status.tone}`}
                role={status.tone === "error" ? "alert" : "status"}
                aria-live={status.tone === "error" ? "assertive" : "polite"}
              >
                {status.message}
              </p>
            ) : null}
            <button className="button button-accent" type="submit" disabled={submitting}>
              {submitting ? (french ? "Envoi…" : "Submitting...") : (french ? "Soumettre et continuer" : "Submit & Continue")}
            </button>
            <details className="pdp-review-optional">
              <summary>{french ? "Autres détails (facultatif)" : "Other Details (Optional)"}</summary>
              <p>{french
                ? "Le type de projet, la pièce, les notes d’installation et les photos pourront être ajoutés lors de la prochaine intégration au système."
                : "Project type, room, installation notes, and photos can be connected in the next backend pass."}</p>
            </details>
          </form>

          {guidelinesOpen ? (
            <div className="pdp-review-guidelines" role="presentation" ref={guidelinesRootRef}>
              <section ref={guidelinesRef} className="pdp-review-guidelines-card" role="dialog" aria-modal="true" aria-labelledby="review-guidelines-title" tabIndex={-1}>
                <button className="pdp-review-guidelines-x" type="button" aria-label={french ? "Fermer les directives de rédaction" : "Close review guidelines"} onClick={closeGuidelines}>
                  <X size={18} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <h4 id="review-guidelines-title">{french ? "Directives de rédaction" : "Writing guidelines"}</h4>
                <p>{french ? "Nous souhaitons publier votre avis. Veuillez donc :" : "We want to publish your review, so please:"}</p>
                <ul>
                  <li>{french ? "Centrer votre avis sur le produit." : "Keep your review focused on the product."}</li>
                  <li>{french ? "Éviter les commentaires sur le service à la clientèle ou les problèmes de commande qui exigent une attention immédiate." : "Avoid writing about customer service or order issues that require immediate attention."}</li>
                  <li>{french ? "Ne pas mentionner de concurrents ni le prix précis payé." : "Do not mention competitors or the specific price you paid."}</li>
                  <li>{french ? "Ne pas inclure de renseignements permettant de vous identifier, comme un nom complet." : "Do not include personally identifiable information, such as full names."}</li>
                </ul>
                <button className="button button-primary" type="button" onClick={closeGuidelines}>
                  {french ? "Fermer" : "Close"}
                </button>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
