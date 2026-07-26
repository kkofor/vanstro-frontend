import type {
  Banner,
  Dealer,
  FulfillmentType,
  ImageAsset,
  Locale,
  Money,
  ProductReviewSubmissionInput,
  ProductSummary,
  Promotion
} from "@/lib/api/api-contract";
import type { CatalogCategoryOption } from "@/lib/product/catalog-config";

export type DashboardModuleStatus =
  | "mocked"
  | "reserved"
  | "client-ready"
  | "needs-backend"
  | "third-party-ready";

export type DashboardModuleKey =
  | "navigation"
  | "homeHero"
  | "homeCategories"
  | "homeProducts"
  | "homeContentRails"
  | "catalogCategories"
  | "catalogFilters"
  | "catalogProducts"
  | "productDetail"
  | "productMedia"
  | "productReviews"
  | "cart"
  | "checkout"
  | "orders"
  | "dealerSelector"
  | "dealerProgram"
  | "dealerApplications"
  | "contactLeads"
  | "articles"
  | "legalPages"
  | "footer"
  | "cookieConsent"
  | "supportWidget"
  | "auth"
  | "favorites";

export type DashboardModuleReadiness = {
  key: DashboardModuleKey;
  label: string;
  routeSurface: string;
  currentSource: string;
  reservedEndpoint: string;
  dashboardOwner: "content" | "catalog" | "commerce" | "dealer" | "support" | "system";
  status: DashboardModuleStatus;
  notes: string;
};

export type NavigationItemInput = {
  label: string;
  href: string;
  order: number;
  parentKey?: string;
  visible: boolean;
};

export type NavigationConfig = {
  locale: Locale;
  primaryItems: NavigationItemInput[];
  productMenuItems: NavigationItemInput[];
  utilityItems: NavigationItemInput[];
};

export type HomePageModuleInput = {
  locale: Locale;
  hero: Banner;
  categoryTiles: Array<CatalogCategoryOption & { image?: ImageAsset; order: number }>;
  featuredProducts: ProductSummary[];
  contentRails: Array<{
    id: string;
    title: string;
    body: string;
    image?: ImageAsset;
    href: string;
    order: number;
  }>;
  dealerCta: {
    title: string;
    body: string;
    image?: ImageAsset;
    primaryHref: string;
    secondaryHref?: string;
  };
};

export type CatalogModuleInput = {
  locale: Locale;
  categories: CatalogCategoryOption[];
  filters: Array<{
    key: string;
    label: string;
    type: "checkbox" | "range" | "select";
    enabled: boolean;
    order: number;
  }>;
  defaultSort: "featured" | "price-asc" | "price-desc";
  pageSize: number;
};

export type FooterConfig = {
  locale: Locale;
  contactLines: string[];
  linkGroups: Array<{
    title: string;
    links: NavigationItemInput[];
  }>;
  socialChannels: Array<{
    label: string;
    href: string;
    icon: "facebook" | "instagram" | "youtube" | "pinterest" | "tiktok" | "linkedin" | "x";
    visible: boolean;
  }>;
  legalLinks: NavigationItemInput[];
};

export type LegalPageUpsertInput = {
  slug: string;
  locale: Locale;
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    body: string[];
    order: number;
  }>;
  status: "draft" | "published" | "archived";
};

export type ContactLeadInput = {
  name: string;
  email: string;
  phone?: string;
  topic:
    | "products"
    | "orders"
    | "dealer-service"
    | "dealer-program"
    | "careers"
    | "website-support";
  message: string;
  city?: string;
  dealer?: string;
  orderNumber?: string;
  locale: Locale;
  sourcePath?: string;
};

export type SupportHandoffInput = {
  channel: "ai" | "human";
  sourcePath: string;
  dealerId?: string;
  cartId?: string;
  transcript: Array<{
    role: "user" | "assistant" | "system";
    message: string;
    createdAt: string;
  }>;
};

export type PaymentSessionInput = {
  orderId: string;
  amount: Money;
  returnUrl: string;
  cancelUrl: string;
};

export type PaymentSession = {
  id: string;
  status: "created" | "requires_action" | "paid" | "cancelled" | "failed";
  paymentUrl?: string;
  provider?: "stripe" | "moneris" | "manual";
};

export type DealerAssignmentInput = {
  dealerId: string;
  fulfillment: FulfillmentType;
  postalCode?: string;
  notes?: string;
};

export type ProductReviewModerationInput = ProductReviewSubmissionInput & {
  sourcePath?: string;
  status?: "pending" | "published" | "rejected" | "archived";
};

export type DashboardModuleConfig<T = unknown> = {
  moduleKey: DashboardModuleKey;
  locale: Locale;
  payload: T;
  status: "draft" | "published" | "archived";
  updatedAt?: string;
  updatedBy?: string;
};

export type DashboardModuleUpsertInput<T = unknown> = Omit<
  DashboardModuleConfig<T>,
  "updatedAt" | "updatedBy"
>;

export const DASHBOARD_API_ENDPOINTS = {
  moduleReadiness: "/dashboard/modules/readiness",
  moduleConfig: (moduleKey: DashboardModuleKey) => `/dashboard/modules/${moduleKey}`,
  navigation: "/dashboard/navigation",
  homePage: "/dashboard/home-page",
  catalog: "/dashboard/catalog",
  footer: "/dashboard/footer",
  legalPages: "/dashboard/legal-pages",
  legalPage: (slug: string) => `/dashboard/legal-pages/${slug}`,
  contactLeads: "/contact/leads",
  supportHandoffs: "/support/handoffs",
  checkoutSession: "/checkout/session",
  dealerAssignment: (orderId: string) => `/dashboard/orders/${orderId}/assign-dealer`,
  reviewModeration: (reviewId: string) => `/dashboard/product-reviews/${reviewId}/status`,
  dealerPortalSettings: "/dashboard/dealer-portal/settings",
  cookieConsentLog: "/privacy/consent-events"
} as const;

export const DASHBOARD_MODULE_READINESS: DashboardModuleReadiness[] = [
  {
    key: "navigation",
    label: "Header navigation and product menu",
    routeSurface: "global header",
    currentSource: "src/components/layout/SiteHeader.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.navigation,
    dashboardOwner: "content",
    status: "client-ready",
    notes: "Primary nav managed via PUT /dashboard/navigation (Pattern A CMS)."
  },
  {
    key: "homeHero",
    label: "Homepage hero",
    routeSurface: "/",
    currentSource: "src/lib/data/mock-data.ts banners",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.homePage,
    dashboardOwner: "content",
    status: "client-ready",
    notes: "Hero and banners managed via PUT /dashboard/home-page."
  },
  {
    key: "homeCategories",
    label: "Shop by category tiles",
    routeSurface: "/",
    currentSource: "src/lib/product/catalog-config.ts",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.catalog,
    dashboardOwner: "catalog",
    status: "client-ready",
    notes: "Catalog tiles/filters via PUT /dashboard/catalog."
  },
  {
    key: "homeProducts",
    label: "Homepage product rail",
    routeSurface: "/",
    currentSource: "src/lib/product/catalog-config.ts HOME_PRODUCT_LIMIT",
    reservedEndpoint: "/home/products",
    dashboardOwner: "catalog",
    status: "client-ready",
    notes: "Product rail already consumes ProductSummary; backend can replace mock source."
  },
  {
    key: "catalogProducts",
    label: "Product listing data",
    routeSurface: "/products",
    currentSource: "src/lib/data/mock-data.ts productsWithCommerce",
    reservedEndpoint: "/products",
    dashboardOwner: "catalog",
    status: "client-ready",
    notes: "Paginated products API with extended product fields (MPN, finishOptions, packageQuantity)."
  },
  {
    key: "productDetail",
    label: "Product detail page",
    routeSurface: "/products/[slug]",
    currentSource: "src/lib/api/server.ts getProductBySlug",
    reservedEndpoint: "/products/{productId}",
    dashboardOwner: "catalog",
    status: "client-ready",
    notes: "Detail page uses ProductDetail and view model; mock source can be swapped behind server wrapper."
  },
  {
    key: "productReviews",
    label: "Review submission and moderation",
    routeSurface: "/products/[slug]#reviews",
    currentSource: "src/components/product/ProductReviewSection.tsx",
    reservedEndpoint: "/products/{productId}/reviews",
    dashboardOwner: "support",
    status: "client-ready",
    notes: "Review submission, published-only retrieval, and Dashboard moderation endpoints are implemented."
  },
  {
    key: "cart",
    label: "Cart state and drawer",
    routeSurface: "/cart and global cart drawer",
    currentSource: "src/components/storefront/StorefrontProvider.tsx",
    reservedEndpoint: "/cart",
    dashboardOwner: "commerce",
    status: "client-ready",
    notes: "Session-backed cart via GET/POST/PATCH/DELETE /cart endpoints."
  },
  {
    key: "checkout",
    label: "Checkout and payment handoff",
    routeSurface: "/checkout",
    currentSource: "src/components/checkout/CheckoutClient.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.checkoutSession,
    dashboardOwner: "commerce",
    status: "client-ready",
    notes: "Checkout session creation, tax, delivery, inventory reservation and dealer assignment via POST /checkout/session."
  },
  {
    key: "dealerSelector",
    label: "Dealer selector and location matching",
    routeSurface: "header, PDP, checkout",
    currentSource: "src/lib/data/mock-data.ts dealers",
    reservedEndpoint: "/dealers",
    dashboardOwner: "dealer",
    status: "client-ready",
    notes: "Dealer list + postal lookup via GET /dealers/lookup."
  },
  {
    key: "dealerProgram",
    label: "Dealer program content",
    routeSurface: "/dealer-program",
    currentSource: "src/app/dealer-program/page.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.moduleConfig("dealerProgram"),
    dashboardOwner: "dealer",
    status: "client-ready",
    notes: "Dealer program content via PUT /dashboard/dealer-portal/settings."
  },
  {
    key: "dealerApplications",
    label: "Dealer application intake",
    routeSurface: "/dealers/apply",
    currentSource: "src/components/forms/PublicSubmissionForm.tsx",
    reservedEndpoint: "/dealer-applications",
    dashboardOwner: "dealer",
    status: "client-ready",
    notes: "Validated public intake, persistence, status tracking and internal email outbox are implemented."
  },
  {
    key: "contactLeads",
    label: "Contact and project support leads",
    routeSurface: "/contact",
    currentSource: "src/components/forms/PublicSubmissionForm.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.contactLeads,
    dashboardOwner: "support",
    status: "client-ready",
    notes: "Validated public intake persists source path, locale and selected dealer context with status tracking."
  },
  {
    key: "legalPages",
    label: "Legal and policy pages",
    routeSurface: "/privacy, /terms-and-conditions, /return-policy, etc.",
    currentSource: "src/content/legalPages.ts",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.legalPages,
    dashboardOwner: "system",
    status: "client-ready",
    notes: "Legal pages managed via dashboard CMS by slug/locale."
  },
  {
    key: "footer",
    label: "Footer links, contact and social channels",
    routeSurface: "global footer",
    currentSource: "src/components/layout/SiteFooter.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.footer,
    dashboardOwner: "content",
    status: "client-ready",
    notes: "Footer managed via PUT /dashboard/footer."
  },
  {
    key: "cookieConsent",
    label: "Cookie consent and preferences",
    routeSurface: "cookie bar and /cookie-settings",
    currentSource: "src/lib/privacy/cookie-preferences.ts",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.cookieConsentLog,
    dashboardOwner: "system",
    status: "client-ready",
    notes: "Consent events are logged via POST /privacy/consent-events."
  },
  {
    key: "supportWidget",
    label: "AI support and human handoff",
    routeSurface: "global floating support",
    currentSource: "src/components/layout/CustomerSupportWidget.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.supportHandoffs,
    dashboardOwner: "support",
    status: "client-ready",
    notes: "Support handoff intake via POST /support/handoffs and dashboard queue."
  },
  {
    key: "auth",
    label: "Customer and partner auth",
    routeSurface: "/account/login, /account/register, partner login",
    currentSource: "static form action and API contract",
    reservedEndpoint: "/auth/login",
    dashboardOwner: "system",
    status: "client-ready",
    notes: "Customer auth session endpoints implemented; dashboard RBAC enforced on admin routes."
  },
  {
    key: "favorites",
    label: "Favorites and saved products",
    routeSurface: "/favorites and product cards",
    currentSource: "src/components/storefront/StorefrontProvider.tsx",
    reservedEndpoint: "/account/favorites",
    dashboardOwner: "commerce",
    status: "client-ready",
    notes: "Account-backed favorites via GET/POST/DELETE /account/favorites."
  }
];
