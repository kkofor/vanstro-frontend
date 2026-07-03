export type Locale = "en-CA" | "fr-CA";
export type CurrencyCode = "CAD" | "USD";

export type ApiResult<T> = {
  data: T;
  meta?: {
    requestId?: string;
    page?: number;
    pageSize?: number;
    total?: number;
  };
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
};

export type ProductFinishOption = {
  name: string;
  sku?: string;
  manufacturerPartNumber?: string;
  colorHex?: string;
  image?: ImageAsset;
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
  title: string;
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

export type ProductUpsertInput = {
  id?: string;
  slug?: string;
  sku: string;
  brand?: string;
  manufacturerPartNumber?: string;
  name: string;
  category: string;
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
  product: ProductSummary;
  quantity: number;
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

export type DirectOrderInput = {
  productId: string;
  quantity: number;
  fulfillment: FulfillmentType;
  dealerId?: string;
};

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
  message?: string;
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
  productDetail: (productId: string) => `/products/${productId}`,
  productAssets: (productId: string) => `/products/${productId}/assets`,
  productReviews: (productId: string) => `/products/${productId}/reviews`,
  adminProducts: "/admin/products",
  adminProduct: (productId: string) => `/admin/products/${productId}`,
  productCommerce: "/products/commerce",
  productCommerceDetail: (productId: string) => `/products/${productId}/commerce`,
  productInventory: "/products/inventory",
  productInventoryDetail: (productId: string) => `/products/${productId}/inventory`,
  inventoryReservations: "/inventory/reservations",
  promotions: "/promotions",
  cart: "/cart",
  cartItems: "/cart/items",
  cartItem: (cartItemId: string) => `/cart/items/${cartItemId}`,
  favorites: "/favorites",
  favorite: (favoriteId: string) => `/favorites/${favoriteId}`,
  dealers: "/dealers",
  directOrder: "/orders/direct",
  cartOrder: "/orders/cart",
  paymentCallback: "/payments/callback",
  login: "/auth/login",
  register: "/auth/register",
  dealerApplications: "/dealer-applications"
} as const;
