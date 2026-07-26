import {
  PUBLIC_API_ERROR_CODES,
  type PublicApiErrorCode as ApiContractErrorCode
} from "../api/api-contract.ts";
import type { SiteLocale } from "./locale.ts";

type ApiErrorShape = Error & { code: string; status: number };

function isApiError(error: unknown): error is ApiErrorShape {
  return error instanceof Error &&
    typeof (error as Partial<ApiErrorShape>).code === "string" &&
    typeof (error as Partial<ApiErrorShape>).status === "number";
}

export type PublicApiErrorCode = ApiContractErrorCode | "UNKNOWN";

const frenchMessages: Record<PublicApiErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: "Le courriel ou le mot de passe est invalide.",
  AUTH_ACCOUNT_EXISTS: "Un compte est déjà associé à cette adresse courriel. Connectez-vous ou utilisez une autre adresse.",
  AUTH_PASSWORD_TOO_SHORT: "Le mot de passe doit comporter au moins 12 caractères.",
  AUTH_INVALID_INPUT: "Veuillez remplir tous les champs obligatoires du compte.",
  AUTH_REQUIRED: "Vous devez vous connecter pour continuer.",
  CATALOG_INVALID: "Les renseignements fournis pour le catalogue sont invalides ou incomplets.",
  INVENTORY_REFRESHING: "La disponibilité du stock est en cours d’actualisation. Veuillez réessayer sous peu.",
  INVENTORY_INSUFFICIENT: "Le stock disponible est insuffisant pour cet article.",
  INVENTORY_NO_DEALER: "Aucun détaillant ne peut actuellement fournir tous les articles de ce panier.",
  CART_EMPTY: "Le panier ne contient aucun article pouvant être acheté.",
  CART_ITEM_NOT_FOUND: "Cet article ne se trouve plus dans votre panier.",
  CHECKOUT_INVALID: "Les renseignements requis pour passer à la caisse sont incomplets.",
  CHECKOUT_FULFILLMENT_UNAVAILABLE: "Le détaillant sélectionné n’offre pas le mode de livraison ou de ramassage demandé.",
  PAYMENT_SESSION_NOT_FOUND: "La session de paiement est introuvable.",
  PAYMENT_SESSION_DENIED: "Vous n’avez pas accès à cette session de paiement.",
  COMMERCE_INVALID: "Les renseignements fournis pour cette opération sont invalides ou incomplets.",
  COMMERCE_NOT_FOUND: "L’article demandé est introuvable.",
  COMMERCE_ACCESS_DENIED: "Vous n’avez pas accès à cette ressource.",
  PRODUCT_IDENTITY_MISMATCH: "Le produit sélectionné ne correspond plus au catalogue actuel. Actualisez la page et réessayez.",
  ERP_UNAVAILABLE: "Le service produit ERP est temporairement indisponible. Veuillez réessayer sous peu.",
  ERP_MAPPING_INCOMPLETE: "La liaison ERP de ce produit est incomplète. Contactez le support.",
  RATE_LIMITED: "Trop de demandes ont été envoyées. Veuillez réessayer plus tard.",
  CONTACT_INVALID: "Veuillez remplir le nom, le courriel, le sujet et le message.",
  DEALER_APPLICATION_INVALID: "Veuillez remplir tous les champs obligatoires de la demande de détaillant.",
  SUBMISSION_INVALID: "Les renseignements du formulaire sont incomplets ou invalides.",
  PRIVACY_CONSENT_INVALID: "Les renseignements requis pour enregistrer les préférences de témoins sont incomplets ou invalides.",
  PRIVACY_CONSENT_FAILED: "Le registre des préférences de témoins n’a pas pu être enregistré. Veuillez réessayer.",
  DASHBOARD_INVALID: "Les données fournies sont invalides ou incomplètes.",
  DASHBOARD_NOT_FOUND: "La ressource demandée est introuvable.",
  DASHBOARD_FORBIDDEN: "Vous n’avez pas l’autorisation d’effectuer cette action.",
  DASHBOARD_CONFLICT: "L’opération entre en conflit avec l’état actuel des données.",
  INTERNAL_ERROR: "Une erreur inattendue s’est produite. Veuillez réessayer.",
  UNKNOWN: "La demande n’a pas pu être traitée. Veuillez réessayer."
};

/**
 * Exact public backend messages maintained with the API routes. Keeping this
 * list explicit prevents an unrelated message ending in "required." from
 * being incorrectly classified as a public form validation failure.
 */
export const backendErrorMessageFixtures: Readonly<Record<string, ReadonlyArray<readonly [string, PublicApiErrorCode]>>> = {
  auth: [
    ["email, password, firstName and lastName are required.", "AUTH_INVALID_INPUT"],
    ["password must be at least 12 characters.", "AUTH_PASSWORD_TOO_SHORT"],
    ["An account already exists for this email.", "AUTH_ACCOUNT_EXISTS"],
    ["email and password are required.", "AUTH_INVALID_INPUT"],
    ["Invalid email or password.", "AUTH_INVALID_CREDENTIALS"],
    ["Authentication is required.", "AUTH_REQUIRED"]
  ],
  catalog: [
    ["limit and offset must be finite nonnegative integers.", "CATALOG_INVALID"],
    ["productIds must be a non-empty array of non-empty strings.", "CATALOG_INVALID"],
    ["Product not found.", "COMMERCE_NOT_FOUND"]
  ],
  commerce: [
    ["productId and a quantity between 1 and 999 are required.", "COMMERCE_INVALID"],
    ["Active product pricing was not found.", "COMMERCE_NOT_FOUND"],
    ["quantity must be between 1 and 999.", "COMMERCE_INVALID"],
    ["Cart item not found.", "CART_ITEM_NOT_FOUND"],
    ["firstName, lastName, email, phone, fulfillment and paymentMethod are required.", "CHECKOUT_INVALID"],
    ["The selected dealer location does not support the requested fulfillment method.", "CHECKOUT_FULFILLMENT_UNAVAILABLE"],
    ["Cart has no purchasable items.", "CART_EMPTY"],
    ["Inventory availability is being refreshed. Please try again shortly.", "INVENTORY_REFRESHING"],
    ["No single dealer location can fulfill this cart.", "INVENTORY_NO_DEALER"],
    ["Inventory snapshot disappeared during checkout.", "INVENTORY_REFRESHING"],
    ["Payment session not found.", "PAYMENT_SESSION_NOT_FOUND"],
    ["Payment session access is denied.", "PAYMENT_SESSION_DENIED"],
    ["paid sessionId and providerPaymentId are required.", "COMMERCE_INVALID"],
    ["Payment signature is invalid.", "COMMERCE_ACCESS_DENIED"],
    ["Payment session cannot be paid.", "COMMERCE_INVALID"],
    ["Order not found.", "COMMERCE_NOT_FOUND"],
    ["Order access is denied.", "COMMERCE_ACCESS_DENIED"],
    ["productId and positive quantity are required.", "COMMERCE_INVALID"],
    ["Insufficient inventory.", "INVENTORY_INSUFFICIENT"],
    ["Inventory is no longer available.", "INVENTORY_INSUFFICIENT"],
    ["Active reservation not found.", "COMMERCE_NOT_FOUND"],
    ["Product not found.", "COMMERCE_NOT_FOUND"],
    ["Customer authentication is required.", "AUTH_REQUIRED"],
    ["Address name, line 1, city, province and postalCode are required.", "COMMERCE_INVALID"],
    ["Address not found.", "COMMERCE_NOT_FOUND"],
    ["Active product not found.", "COMMERCE_NOT_FOUND"],
    ["Valid orderId and order status are required.", "COMMERCE_INVALID"],
    ["ERP webhook signature is invalid.", "COMMERCE_ACCESS_DENIED"],
    ["ERP product service is unavailable.", "ERP_UNAVAILABLE"],
    ["ERP product id is not configured for this SKU.", "ERP_MAPPING_INCOMPLETE"]
  ],
  rateLimit: [
    ["Too many requests. Please try again later.", "RATE_LIMITED"]
  ],
  submissions: [
    ["JSON or form body is required.", "SUBMISSION_INVALID"],
    ["Contact submission is invalid.", "CONTACT_INVALID"],
    ["Dealer application is invalid.", "DEALER_APPLICATION_INVALID"],
    ["Product not found.", "COMMERCE_NOT_FOUND"],
    ["Product review is invalid.", "SUBMISSION_INVALID"]
  ],
  privacy: [
    ["anonymousId, source and cookie preferences are required.", "PRIVACY_CONSENT_INVALID"],
    ["Cookie preferences could not be recorded. Please try again.", "PRIVACY_CONSENT_FAILED"]
  ]
};

const exactMessageCodes = new Map<string, PublicApiErrorCode>(
  Object.values(backendErrorMessageFixtures).flat().map(([message, code]) => [message, code])
);

const dynamicMessageRules: ReadonlyArray<readonly [RegExp, PublicApiErrorCode]> = [
  [/^Insufficient inventory for .+\.$/, "INVENTORY_INSUFFICIENT"],
  [/^productIds cannot contain more than \d+ items\.$/, "COMMERCE_INVALID"]
];

const stableCodeAliases: Record<string, PublicApiErrorCode> = {
  ...Object.fromEntries(PUBLIC_API_ERROR_CODES.map((code) => [code, code])) as Record<ApiContractErrorCode, ApiContractErrorCode>,
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  ACCOUNT_EXISTS: "AUTH_ACCOUNT_EXISTS",
  AUTHENTICATION_REQUIRED: "AUTH_REQUIRED",
  CUSTOMER_AUTHENTICATION_REQUIRED: "AUTH_REQUIRED",
  CATALOG_INVALID: "CATALOG_INVALID",
  INVENTORY_REFRESHING: "INVENTORY_REFRESHING",
  INSUFFICIENT_INVENTORY: "INVENTORY_INSUFFICIENT",
  NO_FULFILLING_DEALER: "INVENTORY_NO_DEALER",
  CART_EMPTY: "CART_EMPTY",
  CART_ITEM_NOT_FOUND: "CART_ITEM_NOT_FOUND",
  CHECKOUT_INVALID: "CHECKOUT_INVALID",
  CHECKOUT_FULFILLMENT_UNAVAILABLE: "CHECKOUT_FULFILLMENT_UNAVAILABLE",
  PAYMENT_SESSION_NOT_FOUND: "PAYMENT_SESSION_NOT_FOUND",
  PAYMENT_SESSION_ACCESS_DENIED: "PAYMENT_SESSION_DENIED",
  RATE_LIMITED: "RATE_LIMITED",
  CONTACT_INVALID: "CONTACT_INVALID",
  DEALER_APPLICATION_INVALID: "DEALER_APPLICATION_INVALID",
  SUBMISSION_INVALID: "SUBMISSION_INVALID",
  PRIVACY_CONSENT_INVALID: "PRIVACY_CONSENT_INVALID",
  PRIVACY_CONSENT_FAILED: "PRIVACY_CONSENT_FAILED",
  PRODUCT_IDENTITY_MISMATCH: "PRODUCT_IDENTITY_MISMATCH"
};

export function normalizeApiErrorCode(error: unknown): PublicApiErrorCode {
  if (isApiError(error)) {
    const stableCode = stableCodeAliases[error.code.toUpperCase()];
    if (stableCode) return stableCode;
    if (error.status === 429) return "RATE_LIMITED";
  }

  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return exactMessageCodes.get(message) ??
    dynamicMessageRules.find(([pattern]) => pattern.test(message))?.[1] ??
    "UNKNOWN";
}

export function localizeApiError(
  error: unknown,
  locale: SiteLocale,
  englishFallback = "The request could not be completed. Please try again."
) {
  if (locale === "fr-CA") return frenchMessages[normalizeApiErrorCode(error)];
  return error instanceof Error && error.message ? error.message : englishFallback;
}
