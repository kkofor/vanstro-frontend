import {
  API_ENDPOINTS,
  ApiResult,
  ArticleDetail,
  ArticleSummary,
  AuthSession,
  Banner,
  Cart,
  CategorySummary,
  CartOrderInput,
  CheckoutSession,
  CheckoutSessionInput,
  Dealer,
  DealerApplicationInput,
  DirectOrderInput,
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
  RegisterInput,
  WebsiteApiProduct
} from "./api-contract";
import {
  ContactLeadInput,
  DASHBOARD_API_ENDPOINTS,
  DashboardModuleConfig,
  DashboardModuleKey,
  DashboardModuleReadiness,
  DashboardModuleUpsertInput,
  DealerAssignmentInput,
  FooterConfig,
  HomePageModuleInput,
  LegalPageUpsertInput,
  NavigationConfig,
  PaymentSession,
  PaymentSessionInput,
  ProductReviewModerationInput,
  SupportHandoffInput
} from "./dashboard-contract";
import {
  arrayOf,
  RuntimeValidator,
  validateApiResult,
  validateAuthSession,
  validateCart,
  validateCheckoutSession,
  validateContactLeadResult,
  validateDealer,
  validateDealerApplicationResult,
  validateFavoriteItem,
  validateOk,
  validateWebsiteApiProduct
} from "./runtime-validation";
import { canonicalProductIdFor, cartProductIdentityFor } from "./product-identity";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "https://api.vanstro.ca/api/v1";
const CART_TOKEN_KEY = "vanstro-cart-token";
const ACCESS_TOKEN_KEY = "vanstro-access-token";

function browserStorage() {
  return typeof window === "undefined" ? undefined : window.sessionStorage;
}

export class VanstroApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;

  constructor(input: {
    message: string;
    code: string;
    status: number;
    fields?: Record<string, string>;
  }) {
    super(input.message);
    this.name = "VanstroApiError";
    this.code = input.code;
    this.status = input.status;
    this.fields = input.fields;
  }
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(browserStorage()?.getItem(ACCESS_TOKEN_KEY)
        ? { Authorization: `Bearer ${browserStorage()?.getItem(ACCESS_TOKEN_KEY)}` }
        : {}),
      ...(browserStorage()?.getItem(CART_TOKEN_KEY)
        ? { "X-Cart-Token": browserStorage()?.getItem(CART_TOKEN_KEY)! }
        : {}),
      ...init.headers
    },
    credentials: "include"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload && typeof payload === "object"
      ? (payload as { error?: unknown })
      : undefined;
    const nestedError = errorPayload?.error && typeof errorPayload.error === "object"
      ? (errorPayload.error as { code?: unknown; message?: unknown; fields?: unknown })
      : undefined;
    throw new VanstroApiError({
      status: response.status,
      code: typeof nestedError?.code === "string" ? nestedError.code : "API_ERROR",
      message:
        typeof errorPayload?.error === "string"
          ? errorPayload.error
          : typeof nestedError?.message === "string"
            ? nestedError.message
            : `Request failed with status ${response.status}.`,
      fields:
        nestedError?.fields && typeof nestedError.fields === "object"
          ? (nestedError.fields as Record<string, string>)
          : undefined
    });
  }

  const validated = validateApiResult(
    payload,
    validateData ?? ((value) => value as T)
  );
  const cartToken = (validated.meta as { cartToken?: unknown } | undefined)?.cartToken;
  if (typeof cartToken === "string") browserStorage()?.setItem(CART_TOKEN_KEY, cartToken);

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

function patchJson<T>(path: string, body: unknown) {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
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
    return postJson<Record<string, ProductCommerce>>(
      API_ENDPOINTS.productCommerce,
      input
    );
  },
  getProductCommerceDetail(
    productId: string,
    input?: Omit<ProductCommerceQuery, "productIds">
  ) {
    return apiFetch<ProductCommerce>(
      withQuery(API_ENDPOINTS.productCommerceDetail(productId), input)
    );
  },
  getProductInventory(input: ProductInventoryQuery) {
    return postJson<Record<string, ProductInventory>>(
      API_ENDPOINTS.productInventory,
      input
    );
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
    return postJson<{ reservationId: string; expiresAt: string }>(
      API_ENDPOINTS.inventoryReservations,
      input
    );
  },
  async addCartProduct(product: ProductSummary, quantity: number) {
    return postJson<Cart>(
      API_ENDPOINTS.cartItems,
      { ...cartProductIdentityFor(product), quantity },
      validateCart
    );
  },
  addCartItem(input: { productId: string; quantity: number }) {
    return postJson<Cart>(API_ENDPOINTS.cartItems, input, validateCart);
  },
  getCart() {
    return apiFetch<Cart>(API_ENDPOINTS.cart, {}, validateCart);
  },
  createCheckoutSession(input: CheckoutSessionInput) {
    return postJson<CheckoutSession>(API_ENDPOINTS.checkoutSession, input, validateCheckoutSession);
  },
  getPaymentSession(sessionId: string, token: string) {
    return apiFetch<CheckoutSession>(
      withQuery(API_ENDPOINTS.paymentSession(encodeURIComponent(sessionId)), { token }),
      {},
      validateCheckoutSession
    );
  },
  removeCartItem(cartItemId: string) {
    return apiFetch<Cart>(API_ENDPOINTS.cartItem(cartItemId), {
      method: "DELETE"
    });
  },
  clearCart() {
    return apiFetch<{ ok: true }>(API_ENDPOINTS.cart, { method: "DELETE" }, validateOk);
  },
  async setCartProductQuantity(productId: string, quantity: number) {
    const cart = await apiFetch<Cart>(API_ENDPOINTS.cart, {}, validateCart);
    const item = cart.data.items.find((candidate) => candidate.product.id === productId);
    if (!item) throw new VanstroApiError({ status: 404, code: "CART_ITEM_NOT_FOUND", message: "Cart item not found." });
    return patchJson<Cart>(API_ENDPOINTS.cartItem(item.id), { quantity }).then((result) =>
      validateApiResult(result, validateCart)
    );
  },
  async removeCartProduct(productId: string) {
    const cart = await apiFetch<Cart>(API_ENDPOINTS.cart, {}, validateCart);
    const item = cart.data.items.find((candidate) => candidate.product.id === productId);
    if (!item) return cart;
    return apiFetch<Cart>(API_ENDPOINTS.cartItem(item.id), { method: "DELETE" }, validateCart);
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
    return apiFetch<Dealer[]>(withQuery(API_ENDPOINTS.dealers, input), {}, arrayOf(validateDealer));
  },
  createDirectOrder(input: DirectOrderInput) {
    return postJson<Order>(API_ENDPOINTS.directOrder, input);
  },
  createCartOrder(input: CartOrderInput) {
    return postJson<Order>(API_ENDPOINTS.cartOrder, input);
  },
  login(input: LoginInput) {
    return postJson<AuthSession>(API_ENDPOINTS.login, input, validateAuthSession).then((result) => {
      if (result.data.accessToken) browserStorage()?.setItem(ACCESS_TOKEN_KEY, result.data.accessToken);
      window.dispatchEvent(new Event("vanstro-authenticated"));
      return result;
    });
  },
  register(input: RegisterInput) {
    return postJson<AuthSession>(API_ENDPOINTS.register, input, validateAuthSession).then((result) => {
      if (result.data.accessToken) browserStorage()?.setItem(ACCESS_TOKEN_KEY, result.data.accessToken);
      window.dispatchEvent(new Event("vanstro-authenticated"));
      return result;
    });
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
    return postJson<{ handoffId: string; status: "queued" | "assigned" }>(
      DASHBOARD_API_ENDPOINTS.supportHandoffs,
      input
    );
  },
  createPaymentSession(input: PaymentSessionInput) {
    return postJson<PaymentSession>(DASHBOARD_API_ENDPOINTS.paymentSessions, input);
  },
  assignOrderDealer(orderId: string, input: DealerAssignmentInput) {
    return putJson<Order>(
      DASHBOARD_API_ENDPOINTS.dealerAssignment(orderId),
      input
    );
  },
  moderateProductReview(reviewId: string, input: Pick<ProductReviewModerationInput, "status">) {
    return patchJson<{ id: string; status: "pending" | "published" | "rejected" | "archived" }>(
      DASHBOARD_API_ENDPOINTS.reviewModeration(reviewId),
      input
    );
  }
};
