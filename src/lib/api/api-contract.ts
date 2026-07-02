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

export type ImageAsset = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type ProductSummary = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category: string;
  price: Money;
  unit: string;
  dimensions: string;
  finish?: string;
  colorName?: string;
  colorHex?: string;
  dealerStock?: Record<string, number>;
  images: ImageAsset[];
  inStock: boolean;
};

export type ProductDetail = ProductSummary & {
  description: string;
  specifications: Record<string, string>;
  inventory: Array<{
    dealerId: string;
    quantity: number;
    status: "in_stock" | "low_stock" | "out_of_stock";
  }>;
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

export const API_ENDPOINTS = {
  homeProducts: "/home/products",
  homeBanners: "/home/banners",
  homeArticles: "/home/articles",
  articleDetail: (articleId: string) => `/articles/${articleId}`,
  productDetail: (productId: string) => `/products/${productId}`,
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
