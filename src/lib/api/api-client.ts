import { API_ENDPOINTS, PUBLIC_API_ERROR_CODES } from "./api-contract.ts";
import type {
  AiSupportChatInput,
  AiSupportChatResponse,
  ApiResult,
  ArticleDetail,
  ArticleSummary,
  AuthSession,
  AccountOrder,
  Banner,
  Cart,
  CategorySummary,
  CheckoutSession,
  CheckoutSessionInput,
  CommerceOrder,
  CustomerAccount,
  CustomerAccountUpdateInput,
  CustomerAddress,
  PaymentCallbackInput,
  PaymentCallbackResult,
  StorefrontDealerSummary,
  DealerApplicationInput,
  FavoriteItem,
  Locale,
  LoginInput,
  Order,
  InventoryReservationInput,
  ProductCommerce,
  ProductCommerceQuery,
  ProductDetail,
  ProductAssetUploadInput,
  ProductInventory,
  ProductInventoryQuery,
  ProductReviewSubmissionInput,
  ProductSummary,
  ProductUpsertInput,
  PublicApiErrorCode,
  RegisterInput,
  ShippingAddress,
  WebsiteApiProduct,
  WebsiteProductCommerce,
  WebsiteProductInventorySummary,
  S02CreateDraftRequest,
  S02Draft,
  S02HistoryEntry,
  S02Publication,
  S02Readiness,
  S02SafeDiff,
  S02UpdateDraftRequest,
  S02ValidationResult,
  StorefrontConfigProjection
} from "./api-contract.ts";
import { DASHBOARD_API_ENDPOINTS } from "./dashboard-contract.ts";
import type {
  ContactLeadInput,
  DashboardModuleConfig,
  DashboardModuleKey,
  DashboardModuleReadiness,
  DashboardModuleUpsertInput,
  DealerAssignmentInput,
  FooterConfig,
  HomePageModuleInput,
  LegalPageUpsertInput,
  NavigationConfig,
  ProductReviewModerationInput,
  SupportHandoffInput
} from "./dashboard-contract.ts";
import {
  arrayOf,
  validateAccountOrder,
  validateApiResult,
  validateAuthSession,
  validateCart,
  validateCheckoutSession,
  validateContactLeadResult,
  validateCustomerAccount,
  validateCustomerAddress,
  validateStorefrontDealerSummary,
  validateDealerApplicationResult,
  validateFavoriteItem,
  validateOk,
  validateWebsiteApiProduct,
  validateS02CreateDraftRequest,
  validateS02Draft,
  validateS02HistoryEntry,
  validateS02Publication,
  validateS02Readiness,
  validateS02SafeDiff,
  validateS02UpdateDraftRequest,
  validateS02ValidationResult,
  validateStorefrontConfigProjection
} from "./runtime-validation.ts";
import type { RuntimeValidator } from "./runtime-validation.ts";
import { canonicalProductIdFor, cartProductIdentityFor } from "./product-identity.ts";

const DEMO_READ_ONLY = process.env.NEXT_PUBLIC_DEMO_READ_ONLY === "true";
const CART_TOKEN_KEY = "vanstro-cart-token";
const publicApiErrorCodes = new Set<string>(PUBLIC_API_ERROR_CODES);
let volatileCartToken: string | undefined;

function resolveApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  if (configuredBaseUrl) return configuredBaseUrl;
  if (typeof globalThis.window !== "undefined") return `${globalThis.window.location.origin}/api/v1`;
  return "";
}

function isPublicApiErrorCode(value: unknown): value is PublicApiErrorCode {
  return typeof value === "string" && publicApiErrorCodes.has(value);
}

function browserStorage() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readCartToken() {
  try {
    return browserStorage()?.getItem(CART_TOKEN_KEY) ?? volatileCartToken;
  } catch {
    return volatileCartToken;
  }
}

function writeCartToken(token: string) {
  volatileCartToken = token;
  try {
    browserStorage()?.setItem(CART_TOKEN_KEY, token);
  } catch {
    // Keep the guest cart identity in memory when storage is unavailable.
  }
}

function clearCartToken() {
  volatileCartToken = undefined;
  try {
    browserStorage()?.removeItem(CART_TOKEN_KEY);
  } catch {
    // The in-memory identity is still retired when storage is unavailable.
  }
}

export function dispatchBrowserEvent(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new window.Event(name));
}

export class VanstroApiError extends Error {
  code: PublicApiErrorCode | "API_ERROR";
  status: number;

  constructor(input: {
    message: string;
    code: PublicApiErrorCode | "API_ERROR";
    status: number;
  }) {
    super(input.message);
    this.name = "VanstroApiError";
    this.code = input.code;
    this.status = input.status;
  }
}

export function parseApiErrorResponse(payload: unknown, status: number) {
  const errorPayload = payload && typeof payload === "object"
    ? (payload as { code?: unknown; error?: unknown; fields?: unknown })
    : undefined;
  const nestedError = errorPayload?.error && typeof errorPayload.error === "object"
    ? (errorPayload.error as { code?: unknown; message?: unknown; fields?: unknown })
    : undefined;
  const responseCode = errorPayload?.code ?? nestedError?.code;
  const publicCode = isPublicApiErrorCode(responseCode) && responseCode !== "INTERNAL_ERROR"
    ? responseCode
    : undefined;

  if (!publicCode) {
    return new VanstroApiError({
      status,
      code: "API_ERROR",
      message: `Request failed with status ${status}.`
    });
  }

  const message = typeof errorPayload?.error === "string"
    ? errorPayload.error
    : typeof nestedError?.message === "string"
      ? nestedError.message
      : `Request failed with status ${status}.`;
  return new VanstroApiError({
    status,
    code: publicCode,
    message
  });
}

function cartQuantity(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 999) {
    throw new VanstroApiError({
      status: 400,
      code: "COMMERCE_INVALID",
      message: "quantity must be between 1 and 999."
    });
  }
  return value;
}

function withQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  const url = new URL(path, "http://vanstro.local");
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  return `${url.pathname}${url.search}`;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  validateData?: RuntimeValidator<T>
): Promise<ApiResult<T>> {
  const method = (init.method ?? "GET").toUpperCase();
  if (DEMO_READ_ONLY && method !== "GET" && method !== "HEAD") {
    throw new VanstroApiError({
      status: 503,
      code: "API_ERROR",
      message: "This static demo is read-only."
    });
  }
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    throw new VanstroApiError({
      status: 503,
      code: "API_ERROR",
      message: "The API base URL is not configured."
    });
  }
  const cartToken = readCartToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
      ...init.headers
    },
    credentials: "include"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseApiErrorResponse(payload, response.status);
  }

  const validated = validateApiResult(
    payload,
    validateData ?? ((value) => value as T)
  );
  const responseCartToken = validated.meta?.cartToken;
  if (responseCartToken) {
    writeCartToken(responseCartToken);
  } else if (path === API_ENDPOINTS.cart || path.startsWith(`${API_ENDPOINTS.cart}/`)) {
    clearCartToken();
  }

  return validated;
}

function postJson<T>(path: string, body: unknown, validateData?: RuntimeValidator<T>) {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  }, validateData);
}

function putJson<T>(path: string, body: unknown) {
  return apiFetch<T>(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

function patchJson<T>(path: string, body: unknown, validateData?: RuntimeValidator<T>) {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  }, validateData);
}

const canonicalProductIds = new Map<string, string>();

function productIdentityKey(product: Pick<ProductSummary, "id" | "slug" | "sku">) {
  return `${product.id}:${product.slug}:${product.sku}`;
}

async function resolveCanonicalProductId(
  product: Pick<ProductSummary, "id" | "slug" | "sku">
) {
  const key = productIdentityKey(product);
  const cached = canonicalProductIds.get(key);
  if (cached) return cached;

  const response = await apiFetch<WebsiteApiProduct>(
    API_ENDPOINTS.productDetail(encodeURIComponent(product.slug)),
    {},
    validateWebsiteApiProduct
  );
  const canonical = response.data;

  let canonicalId: string;
  try {
    canonicalId = canonicalProductIdFor(product, canonical);
  } catch (error) {
    throw new VanstroApiError({
      status: 409,
      code: "PRODUCT_IDENTITY_MISMATCH",
      message: error instanceof Error ? error.message : "Product identity does not match."
    });
  }

  canonicalProductIds.set(key, canonicalId);
  return canonicalId;
}

export const vanstroApi = {
  resolveCanonicalProductId,
  supportAiChat(input: AiSupportChatInput) {
    return postJson<AiSupportChatResponse>(API_ENDPOINTS.supportAiChat, input);
  },
  getHomeProducts(input?: { locale?: Locale; limit?: number }) {
    return apiFetch<ProductSummary[]>(
      withQuery(API_ENDPOINTS.homeProducts, input)
    );
  },
  getHomeBanners(input?: { locale?: Locale }) {
    return apiFetch<Banner[]>(withQuery(API_ENDPOINTS.homeBanners, input));
  },
  getHomeArticles(input?: { locale?: Locale; limit?: number }) {
    return apiFetch<ArticleSummary[]>(
      withQuery(API_ENDPOINTS.homeArticles, input)
    );
  },
  getCategories() {
    return apiFetch<CategorySummary[]>(API_ENDPOINTS.categories);
  },
  getArticleDetail(articleId: string, input?: { locale?: Locale }) {
    return apiFetch<ArticleDetail>(
      withQuery(API_ENDPOINTS.articleDetail(articleId), input)
    );
  },
  getProductDetail(
    productId: string,
    input?: { locale?: Locale; postalCode?: string }
  ) {
    return apiFetch<WebsiteApiProduct>(
      withQuery(API_ENDPOINTS.productDetail(productId), input),
      {},
      validateWebsiteApiProduct
    );
  },
  createProduct(input: ProductUpsertInput) {
    return postJson<ProductDetail>(API_ENDPOINTS.dashboardProducts, input);
  },
  updateProduct(productId: string, input: ProductUpsertInput) {
    return patchJson<ProductDetail>(API_ENDPOINTS.dashboardProduct(productId), input);
  },
  createProductAssetUpload(input: ProductAssetUploadInput) {
    return postJson<{ uploadUrl: string; asset: { url: string; id: string } }>(
      API_ENDPOINTS.productAssets(input.productId),
      input
    );
  },
  submitProductReview(input: ProductReviewSubmissionInput) {
    return postJson<{ reviewId: string; status: "pending" | "published" }>(
      API_ENDPOINTS.productReviews(input.productId),
      input
    );
  },
  getProductCommerce(input: ProductCommerceQuery) {
    return postJson<WebsiteProductCommerce[]>(API_ENDPOINTS.productCommerce, input);
  },
  getProductCommerceDetail(
    productId: string,
    input?: Omit<ProductCommerceQuery, "productIds">
  ) {
    return apiFetch<WebsiteProductCommerce>(
      withQuery(API_ENDPOINTS.productCommerceDetail(productId), input)
    );
  },
  getProductInventory(input: ProductInventoryQuery) {
    return postJson<WebsiteProductInventorySummary[]>(API_ENDPOINTS.productInventory, input);
  },
  getProductInventoryDetail(
    productId: string,
    input?: Omit<ProductInventoryQuery, "productIds">
  ) {
    return apiFetch<ProductInventory>(
      withQuery(API_ENDPOINTS.productInventoryDetail(productId), input)
    );
  },
  reserveInventory(input: InventoryReservationInput) {
    return postJson<{ reservationId: string; reservationToken: string; expiresAt: string }>(
      API_ENDPOINTS.inventoryReservations,
      input
    );
  },
  async addCartProduct(product: ProductSummary, quantity: number, dealerLocationId?: string) {
    return postJson<Cart>(
      API_ENDPOINTS.cartItems,
      { ...cartProductIdentityFor(product), quantity: cartQuantity(quantity), ...(dealerLocationId ? { dealerLocationId } : {}) },
      validateCart
    );
  },
  getCart() {
    return apiFetch<Cart>(API_ENDPOINTS.cart, {}, validateCart);
  },
  createCheckoutSession(input: CheckoutSessionInput, idempotencyKey: string) {
    return apiFetch<CheckoutSession>(API_ENDPOINTS.checkoutSession, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input)
    }, validateCheckoutSession);
  },
  getPaymentSession(sessionId: string, token: string) {
    return apiFetch<CheckoutSession>(
      withQuery(API_ENDPOINTS.paymentSession(encodeURIComponent(sessionId)), { token }),
      {},
      validateCheckoutSession
    );
  },
  addressAutocomplete(query: string) {
    return apiFetch<{ suggestions: Array<{ id: string; label: string }> }>(
      withQuery(API_ENDPOINTS.addressAutocomplete, { query })
    );
  },
  addressRetrieve(id: string) {
    return apiFetch<{ address: ShippingAddress }>(
      withQuery(API_ENDPOINTS.addressAutocomplete, { id })
    );
  },
  simulatePayment(sessionId: string) {
    return postJson<{ sessionId: string; providerPaymentId: string; signature: string }>(
      API_ENDPOINTS.paymentSimulate,
      { sessionId }
    );
  },
  confirmPayment(input: PaymentCallbackInput, options?: { signature?: string }) {
    return apiFetch<PaymentCallbackResult>(
      API_ENDPOINTS.paymentCallback,
      {
        method: "POST",
        body: JSON.stringify(input),
        headers: options?.signature ? { "X-Payment-Signature": options.signature } : undefined
      },
      (value) => value as PaymentCallbackResult
    );
  },
  getOrder(orderId: string, token?: string) {
    return apiFetch<CommerceOrder>(
      withQuery(API_ENDPOINTS.order(encodeURIComponent(orderId)), token ? { token } : undefined),
      {},
      (value) => value as CommerceOrder
    );
  },
  getOrderStatus(orderId: string, token?: string) {
    return apiFetch<{ id: string; status: string; createdAt: string }>(
      withQuery(API_ENDPOINTS.orderStatus(encodeURIComponent(orderId)), token ? { token } : undefined)
    );
  },
  removeCartItem(cartItemId: string) {
    return apiFetch<Cart>(API_ENDPOINTS.cartItem(cartItemId), {
      method: "DELETE"
    }, validateCart);
  },
  clearCart() {
    return apiFetch<{ ok: true }>(API_ENDPOINTS.cart, { method: "DELETE" }, validateOk);
  },
  setCartItemQuantity(cartItemId: string, quantity: number) {
    return patchJson<Cart>(
      API_ENDPOINTS.cartItem(cartItemId),
      { quantity: cartQuantity(quantity) },
      validateCart
    );
  },
  async addFavoriteProduct(product: ProductSummary) {
    const productId = await resolveCanonicalProductId(product);
    const result = await postJson<FavoriteItem>(
      API_ENDPOINTS.favorites,
      { productId },
      validateFavoriteItem
    );
    return { ...result, canonicalProductId: productId };
  },
  addFavorite(productId: string) {
    return postJson<FavoriteItem>(API_ENDPOINTS.favorites, { productId }, validateFavoriteItem);
  },
  getFavorites() {
    return apiFetch<FavoriteItem[]>(API_ENDPOINTS.favorites, {}, arrayOf(validateFavoriteItem));
  },
  removeFavorite(productId: string) {
    return apiFetch<{ ok: true }>(API_ENDPOINTS.favorite(productId), {
      method: "DELETE"
    }, validateOk);
  },
  async removeFavoriteProduct(product: ProductSummary) {
    const productId = await resolveCanonicalProductId(product);
    await apiFetch<{ ok: true }>(API_ENDPOINTS.favorite(productId), {
      method: "DELETE"
    }, validateOk);
    return { productId };
  },
  getDealers(input?: { province?: string; postalCode?: string }) {
    return apiFetch<StorefrontDealerSummary[]>(
      withQuery(API_ENDPOINTS.dealers, input),
      {},
      arrayOf(validateStorefrontDealerSummary)
    );
  },
  login(input: LoginInput) {
    return postJson<AuthSession>(API_ENDPOINTS.login, input, validateAuthSession).then((result) => {
      dispatchBrowserEvent("vanstro-authenticated");
      return result;
    });
  },
  register(input: RegisterInput) {
    return postJson<AuthSession>(API_ENDPOINTS.register, input, validateAuthSession).then((result) => {
      dispatchBrowserEvent("vanstro-authenticated");
      return result;
    });
  },
  forgotPassword(email: string, locale: "en-CA" | "fr-CA") {
    return postJson<{ ok: true; message: string }>(API_ENDPOINTS.forgotPassword, { email, locale });
  },
  resetPassword(token: string, password: string) {
    return postJson<{ ok: true }>(API_ENDPOINTS.resetPassword, { token, password }, validateOk);
  },
  getCurrentSession() {
    return apiFetch<AuthSession>(API_ENDPOINTS.currentSession, {}, validateAuthSession);
  },
  getAccountMe() {
    return apiFetch<CustomerAccount>(API_ENDPOINTS.accountMe, {}, validateCustomerAccount);
  },
  updateAccountMe(input: CustomerAccountUpdateInput) {
    return apiFetch<CustomerAccount>(API_ENDPOINTS.accountMe, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, validateCustomerAccount);
  },
  getAccountAddresses() {
    return apiFetch<CustomerAddress[]>(API_ENDPOINTS.accountAddresses, {}, arrayOf(validateCustomerAddress));
  },
  createAccountAddress(input: Omit<CustomerAddress, "id">) {
    return postJson<CustomerAddress>(API_ENDPOINTS.accountAddresses, input, validateCustomerAddress);
  },
  updateAccountAddress(addressId: string, input: Partial<Omit<CustomerAddress, "id">>) {
    return apiFetch<CustomerAddress>(API_ENDPOINTS.accountAddress(addressId), {
      method: "PATCH",
      body: JSON.stringify(input)
    }, validateCustomerAddress);
  },
  deleteAccountAddress(addressId: string) {
    return apiFetch<{ ok: true }>(API_ENDPOINTS.accountAddress(addressId), { method: "DELETE" }, validateOk);
  },
  getAccountOrders(query?: { page?: number; pageSize?: number }) {
    return apiFetch<AccountOrder[]>(
      withQuery(API_ENDPOINTS.accountOrders, query),
      {},
      arrayOf(validateAccountOrder)
    );
  },
  getAccountOrder(orderId: string) {
    return apiFetch<AccountOrder>(API_ENDPOINTS.accountOrder(orderId), {}, validateAccountOrder);
  },
  async logout() {
    try {
      return await postJson<{ ok: true }>(API_ENDPOINTS.logout, {});
    } finally {
      dispatchBrowserEvent("vanstro-logged-out");
    }
  },
  submitDealerApplication(input: DealerApplicationInput) {
    return postJson<{ applicationId: string; status: "submitted" | "under_review" }>(
      API_ENDPOINTS.dealerApplications,
      input,
      validateDealerApplicationResult
    );
  },
  recordConsentEvent(input: {
    anonymousId: string;
    source: string;
    preferences: { strictlyNecessary: true; functional: boolean; analytics: boolean; targeting: boolean };
  }) {
    return postJson<{ id: string; createdAt: string }>("/privacy/consent-events", input);
  },
  trackPageView(input: {
    path: string;
    sessionId: string;
    consentAnalytics: true;
    consentAnonymousId: string;
    referrer?: string;
    locale?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }) {
    return postJson<{ id: string; createdAt: string }>(API_ENDPOINTS.analyticsPageviews, input);
  },
  getDashboardModuleReadiness() {
    return apiFetch<DashboardModuleReadiness[]>(DASHBOARD_API_ENDPOINTS.moduleReadiness);
  },
  getDashboardModuleConfig<T = unknown>(moduleKey: DashboardModuleKey) {
    return apiFetch<DashboardModuleConfig<T>>(DASHBOARD_API_ENDPOINTS.moduleConfig(moduleKey));
  },
  updateDashboardModuleConfig<T = unknown>(
    moduleKey: DashboardModuleKey,
    input: DashboardModuleUpsertInput<T>
  ) {
    return putJson<DashboardModuleConfig<T>>(
      DASHBOARD_API_ENDPOINTS.moduleConfig(moduleKey),
      input
    );
  },
  updateNavigation(input: NavigationConfig) {
    return putJson<NavigationConfig>(DASHBOARD_API_ENDPOINTS.navigation, input);
  },
  updateHomePage(input: HomePageModuleInput) {
    return putJson<HomePageModuleInput>(DASHBOARD_API_ENDPOINTS.homePage, input);
  },
  updateFooter(input: FooterConfig) {
    return putJson<FooterConfig>(DASHBOARD_API_ENDPOINTS.footer, input);
  },
  upsertLegalPage(input: LegalPageUpsertInput) {
    return putJson<LegalPageUpsertInput>(
      DASHBOARD_API_ENDPOINTS.legalPage(input.slug),
      input
    );
  },
  submitContactLead(input: ContactLeadInput) {
    return postJson<{ leadId: string; status: "new" | "routed" }>(
      DASHBOARD_API_ENDPOINTS.contactLeads,
      input,
      validateContactLeadResult
    );
  },
  requestSupportHandoff(input: SupportHandoffInput) {
    return postJson<{ id: string; status: string }>(
      DASHBOARD_API_ENDPOINTS.supportHandoffs,
      input
    );
  },
  assignOrderDealer(orderId: string, input: DealerAssignmentInput) {
    return postJson<Order>(
      DASHBOARD_API_ENDPOINTS.dealerAssignment(orderId),
      input
    );
  },
  moderateProductReview(reviewId: string, input: Pick<ProductReviewModerationInput, "status">) {
    return patchJson<{ id: string; status: "pending" | "published" | "rejected" | "archived" }>(
      DASHBOARD_API_ENDPOINTS.reviewModeration(reviewId),
      input
    );
  },
  getStorefrontConfig(locale: "en-CA" | "fr-CA") {
    return apiFetch<StorefrontConfigProjection>(
      withQuery(API_ENDPOINTS.storefrontConfig, { locale }),
      {},
      validateStorefrontConfigProjection
    );
  },
  createS02SettingsDraft(input: S02CreateDraftRequest) {
    return postJson<S02Draft>(API_ENDPOINTS.dashboardS02SettingsDrafts, input, validateS02Draft);
  },
  getS02SettingsDrafts() {
    return apiFetch<S02Draft[]>(API_ENDPOINTS.dashboardS02SettingsDrafts, {}, arrayOf(validateS02Draft));
  },
  getS02SettingsDraft(draftId: string) {
    return apiFetch<S02Draft>(API_ENDPOINTS.dashboardS02SettingsDraft(draftId), {}, validateS02Draft);
  },
  updateS02SettingsDraft(draftId: string, input: S02UpdateDraftRequest) {
    return patchJson<S02Draft>(API_ENDPOINTS.dashboardS02SettingsDraft(draftId), input, validateS02Draft);
  },
  validateS02SettingsDraft(draftId: string, input: { expectedVersion: number; idempotencyKey: string }) {
    return postJson<S02ValidationResult>(API_ENDPOINTS.dashboardS02SettingsDraftValidate(draftId), input, validateS02ValidationResult);
  },
  getS02SettingsDraftDiff(draftId: string) {
    return apiFetch<S02SafeDiff>(API_ENDPOINTS.dashboardS02SettingsDraftDiff(draftId), {}, validateS02SafeDiff);
  },
  publishS02SettingsDraft(draftId: string, input: { expectedVersion: number; idempotencyKey: string }) {
    return postJson<S02Publication>(API_ENDPOINTS.dashboardS02SettingsDraftPublish(draftId), input, validateS02Publication);
  },
  getS02SettingsHistory() {
    return apiFetch<S02HistoryEntry[]>(API_ENDPOINTS.dashboardS02SettingsHistory, {}, arrayOf(validateS02HistoryEntry));
  },
  createS02SettingsRollbackDraft(publicationId: string, input: { expectedPublishedVersion: number; changeReason: string; idempotencyKey: string }) {
    return postJson<S02Draft>(API_ENDPOINTS.dashboardS02SettingsRollbackDraft(publicationId), input, validateS02Draft);
  },
  getS02SettingsReadiness(consumerGeneration?: number) {
    return apiFetch<S02Readiness>(
      withQuery(API_ENDPOINTS.dashboardS02SettingsReadiness, consumerGeneration === undefined ? {} : { consumerGeneration }),
      {},
      validateS02Readiness
    );
  }
};
