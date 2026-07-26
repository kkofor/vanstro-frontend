export type Locale = "en-CA" | "fr-CA" | "zh-CN";
export type CurrencyCode = "CAD" | "USD";

export const PUBLIC_API_ERROR_CODES = [
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_ACCOUNT_EXISTS",
  "AUTH_PASSWORD_TOO_SHORT",
  "AUTH_INVALID_INPUT",
  "AUTH_REQUIRED",
  "CATALOG_INVALID",
  "INVENTORY_REFRESHING",
  "INVENTORY_INSUFFICIENT",
  "INVENTORY_NO_DEALER",
  "CART_EMPTY",
  "CART_ITEM_NOT_FOUND",
  "CHECKOUT_INVALID",
  "CHECKOUT_FULFILLMENT_UNAVAILABLE",
  "PAYMENT_SESSION_NOT_FOUND",
  "PAYMENT_SESSION_DENIED",
  "COMMERCE_INVALID",
  "COMMERCE_NOT_FOUND",
  "COMMERCE_ACCESS_DENIED",
  "RATE_LIMITED",
  "CONTACT_INVALID",
  "DEALER_APPLICATION_INVALID",
  "SUBMISSION_INVALID",
  "PRIVACY_CONSENT_INVALID",
  "PRIVACY_CONSENT_FAILED",
  "PRODUCT_IDENTITY_MISMATCH",
  "ERP_UNAVAILABLE",
  "ERP_MAPPING_INCOMPLETE",
  "DASHBOARD_INVALID",
  "DASHBOARD_NOT_FOUND",
  "DASHBOARD_FORBIDDEN",
  "DASHBOARD_CONFLICT",
  "INTERNAL_ERROR"
] as const;

export type PublicApiErrorCode = (typeof PUBLIC_API_ERROR_CODES)[number];

export type ApiErrorResult = {
  /** Legacy human-readable error retained for backward compatibility. */
  error: string;
  code: PublicApiErrorCode;
  fields?: Record<string, string>;
};

export type ApiResult<T> = {
  data: T;
  meta?: {
    requestId?: string;
    page?: number;
    pageSize?: number;
    total?: number;
    cartToken?: string;
    payment?: PaymentInitiateMeta;
  };
};

export type PaymentInitiateMeta = {
  provider: "manual" | "moneris";
  paymentUrl?: string;
  ticket?: string;
  providerRef?: string;
};

export type ShippingAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

export type AddressSuggestion = {
  id: string;
  label: string;
};

export type Money = {
  amount: number;
  currency: CurrencyCode;
};

export type PromotionType =
  | "sale"
  | "rebate"
  | "bulk"
  | "dealer"
  | "clearance"
  | "launch";

export type Promotion = {
  id: string;
  type: PromotionType;
  label: string;
  description?: string;
  terms?: string;
  startsAt?: string;
  endsAt?: string;
  href?: string;
  priority?: number;
};

export type ProductPricing = {
  source: "catalog" | "dealer" | "promotion";
  basePrice: Money;
  currentPrice: Money;
  compareAtPrice?: Money;
  savings?: Money;
  savingsPercent?: number;
  priceLabel?: string;
  validFrom?: string;
  validUntil?: string;
  dealerId?: string;
  customerGroup?: "retail" | "dealer" | "contractor";
  updatedAt: string;
  promotionIds?: string[];
};

export type ProductCommerce = {
  pricing: ProductPricing;
  promotions?: Promotion[];
  priceMessage?: string;
  availabilityMessage?: string;
};

export type InventoryStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "backorder"
  | "unavailable";

export type ProductInventoryLocation = {
  dealerId: string;
  quantity: number;
  quantityKnown?: boolean;
  quantityOnHand?: number;
  quantityReserved?: number;
  safetyStock?: number;
  status: InventoryStatus;
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  leadTimeDays?: number;
  updatedAt: string;
};

export type ProductInventory = {
  productId: string;
  sku: string;
  locations: ProductInventoryLocation[];
  selectedDealerId?: string;
  totalAvailable: number;
  status: InventoryStatus;
  availabilityMessage?: string;
  updatedAt: string;
};

export type ImageAsset = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type PackageQuantity = {
  each: number;
  innerPack?: number;
  case?: number;
  pallet?: number;
  displayLabel?: string;
};

export type ProductFinishOption = {
  name: string;
  sku?: string;
  manufacturerPartNumber?: string;
  colorName?: string;
  configuration?: "cabinet-only" | "with-top";
  colorHex?: string;
  image?: ImageAsset;
  images?: ImageAsset[];
  price?: Money;
  dimensions?: string;
  description?: string;
  productHighlights?: string[];
  specifications?: Record<string, string>;
  active?: boolean;
};

export type ProductDocument = {
  label: string;
  type: "warranty" | "specification" | "installation" | "care";
  href: string;
};

export type ProductSupportLink = {
  label: string;
  description: string;
  href: string;
};

export type ProductRatingSummary = {
  average: number;
  count: number;
  sourceLabel?: string;
  writeReviewEnabled?: boolean;
};

export type ProductReview = {
  id: string;
  name: string;
  title?: string | null;
  body: string;
  rating?: number;
  createdAt?: string;
  verifiedBuyer?: boolean;
};

export type ProductQuestion = {
  id: string;
  question: string;
  answer: string;
  answeredAt?: string;
  sourceLabel?: string;
};

export type ProductRecommendationConfig = {
  completeProjectProductIds?: string[];
  youMayAlsoLikeProductIds?: string[];
  onSaleProductIds?: string[];
  relatedProductIds?: string[];
  recentlyViewedProductIds?: string[];
};

export type ProductSummary = {
  id: string;
  slug: string;
  sku: string;
  brand?: string;
  manufacturerPartNumber?: string;
  name: string;
  category: string;
  subCategory?: string;
  price: Money;
  commerce?: ProductCommerce;
  availability?: ProductInventory;
  unit: string;
  dimensions: string;
  finish?: string;
  colorName?: string;
  colorHex?: string;
  packageQuantity?: PackageQuantity;
  finishOptions?: ProductFinishOption[];
  certificationRequired?: boolean;
  dealerStock?: Record<string, number>;
  images: ImageAsset[];
  inStock: boolean;
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string;
};

export type ProductDetail = ProductSummary & {
  description: string;
  productHighlights?: string[];
  documents?: ProductDocument[];
  supportLinks?: ProductSupportLink[];
  ratingSummary?: ProductRatingSummary;
  reviews?: ProductReview[];
  questions?: ProductQuestion[];
  recommendations?: ProductRecommendationConfig;
  specifications: Record<string, string>;
  inventory: ProductInventoryLocation[];
};

export type WebsiteApiProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  category?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  primarySku?: {
    id: string;
    skuCode: string;
    name: string;
    attributes?: unknown;
  } | null;
  price?: {
    amount: number;
    amountCents: number;
    currency: string;
  } | null;
  assets?: Array<{
    id: string;
    url: string;
    altText?: string | null;
    kind: string;
    sortOrder: number;
  }>;
  specifications?: Array<{ key: string; value: string }>;
  ratingSummary?: ProductRatingSummary;
  reviews?: ProductReview[];
};

export type ProductUpsertInput = {
  id?: string;
  slug?: string;
  sku: string;
  brand?: string;
  manufacturerPartNumber?: string;
  name: string;
  category: string;
  subCategory?: string;
  description: string;
  price: Money;
  unit: string;
  dimensions: string;
  finish?: string;
  colorName?: string;
  colorHex?: string;
  packageQuantity?: PackageQuantity;
  finishOptions?: ProductFinishOption[];
  productHighlights?: string[];
  documents?: ProductDocument[];
  supportLinks?: ProductSupportLink[];
  specifications: Record<string, string>;
  certificationRequired?: boolean;
  recommendations?: ProductRecommendationConfig;
  ratingSummary?: ProductRatingSummary;
  status?: "draft" | "active" | "archived";
};

export type ProductAssetUploadInput = {
  productId: string;
  assetType: "image" | "document";
  fileName: string;
  contentType: string;
  alt?: string;
  documentType?: ProductDocument["type"];
};

export type ProductReviewSubmissionInput = {
  productId: string;
  rating: number;
  title?: string;
  body: string;
  nickname: string;
  email: string;
  topics?: string[];
  acceptedTerms: boolean;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image: ImageAsset;
  href: string;
};

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: ImageAsset;
  publishedAt: string;
};

export type ArticleDetail = ArticleSummary & {
  content: string;
};

export type CartItem = {
  id: string;
  product: Pick<
    ProductSummary,
    "id" | "slug" | "sku" | "name" | "unit" | "dimensions" | "images" | "inStock"
  > & Partial<Pick<ProductSummary, "category">>;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
};

export type Cart = {
  id: string;
  items: CartItem[];
  subtotal: Money;
};

export type FavoriteItem = {
  id: string;
  product: ProductSummary;
};

export type Dealer = {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  availableForPickup: boolean;
};

export type FulfillmentType = "pickup" | "delivery";

/** @deprecated Use CheckoutSessionInput and POST /checkout/session instead. */
export type DirectOrderInput = {
  productId: string;
  quantity: number;
  fulfillment: FulfillmentType;
  dealerId?: string;
};

/** @deprecated Use CheckoutSessionInput and POST /checkout/session instead. */
export type CartOrderInput = {
  cartId: string;
  fulfillment: FulfillmentType;
  dealerId?: string;
};

export type Order = {
  id: string;
  status: "draft" | "pending_payment" | "paid" | "cancelled";
  total: Money;
  paymentUrl?: string;
};

export type CustomerAccount = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type CustomerAddress = {
  id: string;
  label?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type AccountOrder = {
  id: string;
  status: string;
  fulfillment: string;
  paymentMethod?: string;
  total: Money;
  subtotal?: Money;
  tax?: Money;
  shipping?: Money;
  createdAt: string;
  shippingAddress?: ShippingAddress;
  shipment?: {
    shipmentId?: string;
    trackingNumber?: string;
    status: string;
    updatedAt: string;
  };
  statusEvents?: Array<{
    id: string;
    status: string;
    source: string;
    payload?: unknown;
    createdAt: string;
  }>;
  items: Array<{ skuCode: string; productName: string; quantity: number; unitPrice?: Money; lineTotal?: Money }>;
};

export type CommerceOrder = AccountOrder & {
  firstName?: string;
  lastName?: string;
  phone?: string;
  notes?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: "customer" | "dealer" | "admin";
};

export type AuthSession = {
  user: AuthUser;
  accessToken?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  firstName: string;
  lastName: string;
};

export type DealerApplicationInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  businessType?: string;
  website?: string;
  serviceArea?: string;
  productFocus?: string;
  capabilities?: string[];
  message?: string;
  source?: string;
  locale?: Locale;
  applicationAcknowledgement?: boolean;
};

export type CheckoutSessionInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fulfillment: FulfillmentType;
  paymentMethod: "card" | "pos" | "cash";
  notes?: string;
  dealerLocationId?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
};

export type CheckoutSession = {
  id: string;
  status: "pending" | "paid" | "expired" | "cancelled" | "failed";
  fulfillment: FulfillmentType;
  paymentMethod: "card" | "pos" | "cash";
  expiresAt: string;
  subtotal: Money;
  tax: Money;
  shipping: Money;
  total: Money;
  guestOrderToken?: string;
  shippingAddress?: ShippingAddress;
};

export type PaymentCallbackInput = {
  sessionId: string;
  status: "paid";
  providerPaymentId?: string;
  ticket?: string;
};

export type ProductCommerceQuery = {
  productIds: string[];
  dealerId?: string;
  postalCode?: string;
  customerGroup?: "retail" | "dealer" | "contractor";
  couponCode?: string;
  asOf?: string;
};

export type ProductInventoryQuery = {
  productIds: string[];
  dealerId?: string;
  postalCode?: string;
  fulfillment?: FulfillmentType;
  quantity?: number;
  includeNearby?: boolean;
  asOf?: string;
};

export type InventoryReservationInput = {
  productId: string;
  dealerId: string;
  quantity: number;
  fulfillment: FulfillmentType;
  cartId?: string;
  expiresAt?: string;
};

export const API_ENDPOINTS = {
  homeProducts: "/home/products",
  homeBanners: "/home/banners",
  homeArticles: "/home/articles",
  articleDetail: (articleId: string) => `/articles/${articleId}`,
  categories: "/categories",
  products: "/products",
  productDetail: (productId: string) => `/products/${productId}`,
  productAssets: (productId: string) => `/products/${productId}/assets`,
  productReviews: (productId: string) => `/products/${productId}/reviews`,
  dashboardProducts: "/dashboard/products",
  dashboardProduct: (productId: string) => `/dashboard/products/${productId}`,
  dashboardProductSpecifications: (productId: string) => `/dashboard/products/${productId}/specifications`,
  dashboardCatalog: "/dashboard/catalog",
  dashboardStorefrontConfig: "/dashboard/storefront/config",
  dashboardDealerPortalSettings: "/dashboard/dealer-portal/settings",
  dashboardModulesReadiness: "/dashboard/modules/readiness",
  dashboardModuleConfig: (moduleKey: string) => `/dashboard/modules/${moduleKey}`,
  dashboardInventorySnapshots: "/dashboard/inventory/snapshots",
  dashboardOrderStatus: (orderId: string) => `/dashboard/orders/${orderId}/status`,
  dashboardOrderAssignDealer: (orderId: string) => `/dashboard/orders/${orderId}/assign-dealer`,
  dashboardEmailTemplates: "/dashboard/email/templates",
  dashboardSupportHandoffs: "/dashboard/support/handoffs",
  supportHandoffs: "/support/handoffs",
  dealersLookup: "/dealers/lookup",
  productErpColors: (productId: string) => `/products/${productId}/erp-colors`,
  erpCatalogSkus: "/integrations/erp/catalog/skus",
  erpUpstreamProducts: "/integrations/erp/upstream/products",
  erpUpstreamSkus: "/integrations/erp/upstream/skus",
  erpUpstreamColors: "/integrations/erp/upstream/colors",
  erpUpstreamCategories: "/integrations/erp/upstream/categories",
  productCommerce: "/products/commerce",
  productCommerceDetail: (productId: string) => `/products/${productId}/commerce`,
  productInventory: "/products/inventory",
  productInventoryDetail: (productId: string) => `/products/${productId}/inventory`,
  inventoryReservations: "/inventory/reservations",
  activePromotions: "/promotions/active",
  cart: "/cart",
  cartItems: "/cart/items",
  cartItem: (cartItemId: string) => `/cart/items/${cartItemId}`,
  favorites: "/account/favorites",
  favorite: (productId: string) => `/account/favorites/${productId}`,
  accountMe: "/account/me",
  accountAddresses: "/account/addresses",
  accountAddress: (addressId: string) => `/account/addresses/${addressId}`,
  accountOrders: "/account/orders",
  accountOrder: (orderId: string) => `/account/orders/${orderId}`,
  dealers: "/dealers",
  checkoutSession: "/checkout/session",
  addressAutocomplete: "/address/autocomplete",
  paymentSession: (sessionId: string) => `/payments/sessions/${sessionId}`,
  order: (orderId: string) => `/orders/${orderId}`,
  orderStatus: (orderId: string) => `/orders/${orderId}/status`,
  paymentCallback: "/payments/callback",
  paymentSimulate: "/payments/simulate",
  analyticsPageviews: "/analytics/pageviews",
  login: "/auth/login",
  register: "/auth/customer/register",
  currentSession: "/auth/me",
  logout: "/auth/logout",
  dealerApplications: "/dealer-applications",
  contactLeads: "/contact/leads"
} as const;
