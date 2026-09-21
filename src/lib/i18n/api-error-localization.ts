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
  AUTH_RESET_INVALID: "Le lien de réinitialisation est invalide ou expiré. Demandez un nouveau lien.",
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
  DASHBOARD_AUTHORIZATION_UNAVAILABLE: "Le contexte d’autorisation du tableau de bord est temporairement indisponible.",
  QUERY_INVALID: "Les paramètres de recherche sont invalides.",
  QUERY_VERSION_UNSUPPORTED: "Cette version de recherche n’est pas prise en charge.",
  QUERY_SORT_INVALID: "Le tri demandé est invalide.",
  QUERY_FILTER_UNSUPPORTED: "Un filtre demandé n’est pas pris en charge.",
  QUERY_SEARCH_UNSUPPORTED: "La recherche n’est pas prise en charge pour cette ressource.",
  QUERY_TOO_COMPLEX: "La recherche demandée est trop complexe.",
  QUERY_DEPTH_EXCEEDED: "La profondeur de pagination demandée dépasse la limite permise.",
  CURSOR_INVALID: "Le curseur de pagination est invalide ou expiré.",
  QUERY_UNAVAILABLE: "Le service de recherche est temporairement indisponible.",
  JOB_TYPE_UNSUPPORTED: "Ce type de tâche n’est pas pris en charge.",
  JOB_TYPE_UNAVAILABLE: "Ce type de tâche est temporairement indisponible.",
  JOB_STATE_CONFLICT: "La tâche a changé. Actualisez les données et réessayez.",
  JOB_LEASE_LOST: "Le traitement de la tâche n’est plus actif.",
  JOB_NOT_CANCELLABLE: "Cette tâche ne peut pas être annulée dans son état actuel.",
  JOB_NOT_RETRYABLE: "Cette tâche ne peut pas être relancée.",
  JOB_PROGRESS_INVALID: "La progression de la tâche est invalide.",
  JOB_ARTIFACT_UNAVAILABLE: "Le résultat de la tâche n’est pas disponible.",
  OBJECT_DISABLED: "Cet objet de données est désactivé.",
  OBJECT_NOT_SUPPORTED: "Cet objet de données n’est pas pris en charge.",
  IMPORT_NOT_READY: "L’importation n’est pas prête pour cette action.",
  IMPORT_PREVIEW_FAILED: "L’aperçu de l’importation a échoué.",
  IMPORT_PREVIEW_STALE: "L’aperçu n’est plus à jour. Créez un nouvel aperçu.",
  IMPORT_EXPIRED: "L’importation a expiré.",
  SOURCE_ARTIFACT_MISSING: "Le fichier source de l’importation est introuvable.",
  SOURCE_HASH_MISMATCH: "L’intégrité du fichier source n’a pas pu être vérifiée.",
  CSV_INVALID_ENCODING: "Le fichier CSV doit utiliser un encodage UTF-8 valide.",
  CSV_MALFORMED: "Le fichier CSV est mal formé.",
  CSV_DUPLICATE_HEADER: "Le fichier CSV contient un en-tête en double.",
  CSV_MISSING_HEADER: "Le fichier CSV ne contient pas tous les en-têtes requis.",
  CSV_UNKNOWN_HEADER: "Le fichier CSV contient un en-tête non pris en charge.",
  CSV_PROHIBITED_HEADER: "Le fichier CSV contient un champ interdit.",
  CSV_ROW_LIMIT_EXCEEDED: "Le fichier CSV dépasse le nombre maximal de lignes.",
  CSV_BYTE_LIMIT_EXCEEDED: "Le fichier CSV dépasse la taille maximale permise.",
  FIELD_REQUIRED: "Une valeur obligatoire est manquante.",
  FIELD_INVALID_TYPE: "Une valeur ne respecte pas le type attendu.",
  FIELD_INVALID_ENUM: "Une valeur ne fait pas partie des choix permis.",
  FIELD_TOO_LONG: "Une valeur dépasse la longueur maximale permise.",
  FIELD_OUT_OF_RANGE: "Une valeur se trouve hors de la plage permise.",
  VERSION_CONFLICT: "La ressource a changé. Actualisez les données et réessayez.",
  FENCING_TOKEN_STALE: "Cette tentative de traitement n’est plus active.",
  EXPORT_NOT_READY: "L’exportation n’est pas encore prête.",
  EXPORT_EXPIRED: "L’exportation a expiré.",
  EXPORT_ARTIFACT_MISSING: "Le fichier d’exportation est introuvable.",
  DOWNLOAD_NOT_AUTHORIZED: "Vous n’êtes pas autorisé à télécharger cette exportation.",
  IDEMPOTENCY_CONFLICT: "Cette demande entre en conflit avec une demande antérieure.",
  WORK_ITEM_TYPE_UNSUPPORTED: "Ce type d’élément de travail n’est pas pris en charge.",
  WORK_ITEM_STATE_CONFLICT: "L’élément de travail a changé. Actualisez les données et réessayez.",
  WORK_ITEM_SCOPE_CHANGED: "La portée de l’élément de travail a changé.",
  WORK_ITEM_ASSIGNEE_INVALID: "La personne assignée n’est plus admissible.",
  WORK_ITEM_NOT_ACTIONABLE: "Cet élément de travail ne peut pas être modifié dans son état actuel.",
  WORK_ITEM_ORPHANED: "La ressource liée à cet élément de travail n’est plus disponible.",
  WORK_ITEM_DEDUP_CONFLICT: "Cet élément de travail entre en conflit avec une demande existante.",
  NOTIFICATION_NOT_FOUND: "La notification demandée est introuvable.",
  NOTIFICATION_SCOPE_CHANGED: "La portée de la notification a changé.",
  CONFIG_KEY_UNSUPPORTED: "Cette clé de configuration n’est pas prise en charge.",
  CONFIG_SCHEMA_UNSUPPORTED: "Cette version de schéma de configuration n’est pas prise en charge.",
  CONFIG_VALUE_INVALID: "La valeur de configuration est invalide.",
  CONFIG_SCOPE_DENIED: "Vous n’avez pas accès à cette portée de configuration.",
  CONFIG_IMMUTABLE: "Cette configuration ne peut pas être modifiée à l’exécution.",
  CONFIG_ACTIVATION_FAILED: "La configuration a été enregistrée, mais son activation a échoué.",
  SETTINGS_DESCRIPTOR_UNAVAILABLE: "Ce paramètre n’est pas encore disponible.",
  SETTINGS_STATE_CONFLICT: "Le brouillon de paramètres a changé. Actualisez les données et réessayez.",
  SETTINGS_VALIDATION_FAILED: "Le brouillon contient des erreurs bloquantes et ne peut pas être publié.",
  FLAG_KEY_UNSUPPORTED: "Ce commutateur de fonctionnalité n’est pas pris en charge.",
  FLAG_STATE_INVALID: "L’état du commutateur de fonctionnalité est invalide.",
  FLAG_KILL_CONFIRMATION_REQUIRED: "La confirmation exacte est requise pour l’arrêt d’urgence.",
  READINESS_STALE: "Les données de disponibilité ne sont plus à jour.",
  READINESS_UNAVAILABLE: "L’état de disponibilité est temporairement indisponible.",
  CURRENCY_MIXED: "Les montants de devises différentes ne peuvent pas être regroupés.",
  ANALYTICS_INGESTION_UNAVAILABLE: "L’ingestion des données analytiques est temporairement indisponible.",
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
    ["A valid email address is required.", "AUTH_INVALID_INPUT"],
    ["token and password are required.", "AUTH_INVALID_INPUT"],
    ["The password reset link is invalid or expired.", "AUTH_RESET_INVALID"],
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
    ["paid sessionId is required.", "COMMERCE_INVALID"],
    ["providerPaymentId is required for in-store payments.", "COMMERCE_INVALID"],
    ["ticket is required for card payments.", "COMMERCE_INVALID"],
    ["Payment signature is invalid.", "COMMERCE_ACCESS_DENIED"],
    ["Payment session has an unsupported payment method.", "COMMERCE_INVALID"],
    ["Order not found.", "COMMERCE_NOT_FOUND"],
    ["Order access is denied.", "COMMERCE_ACCESS_DENIED"],
    ["productId and quantity between 1 and 25 are required.", "COMMERCE_INVALID"],
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
  const messageCode = exactMessageCodes.get(message) ??
    dynamicMessageRules.find(([pattern]) => pattern.test(message))?.[1];
  if (messageCode) return messageCode;
  if (isApiError(error) && error.code === "API_ERROR") return "UNKNOWN";
  return "UNKNOWN";
}

export function localizeApiError(
  error: unknown,
  locale: SiteLocale,
  englishFallback = "The request could not be completed. Please try again."
) {
  const code = normalizeApiErrorCode(error);
  if (locale === "fr-CA") return frenchMessages[code];
  if (code === "UNKNOWN" || code === "INTERNAL_ERROR") return englishFallback;
  return error instanceof Error && error.message ? error.message : englishFallback;
}
