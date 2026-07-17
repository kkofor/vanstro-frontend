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
  paymentSessions: "/payments/sessions",
  dealerAssignment: (orderId: string) => `/orders/${orderId}/dealer-assignment`,
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
    status: "reserved",
    notes: "Primary nav, product dropdown, utility links and CTA order should be managed from dashboard."
  },
  {
    key: "homeHero",
    label: "Homepage hero",
    routeSurface: "/",
    currentSource: "src/lib/data/mock-data.ts banners",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.homePage,
    dashboardOwner: "content",
    status: "mocked",
    notes: "Hero headline, body, CTA, image and publish state need CMS controls."
  },
  {
    key: "homeCategories",
    label: "Shop by category tiles",
    routeSurface: "/",
    currentSource: "src/lib/product/catalog-config.ts",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.catalog,
    dashboardOwner: "catalog",
    status: "reserved",
    notes: "Category order, visibility, images and coming-soon state should be dashboard-editable."
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
    status: "needs-backend",
    notes: "Needs paginated products, facets, pricing, promotions and availability by dealer/postal code."
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
    status: "reserved",
    notes: "Client now stages payloads with ProductReviewSubmissionInput shape; backend moderation endpoint is reserved."
  },
  {
    key: "cart",
    label: "Cart state and drawer",
    routeSurface: "/cart and global cart drawer",
    currentSource: "src/components/storefront/StorefrontProvider.tsx",
    reservedEndpoint: "/cart",
    dashboardOwner: "commerce",
    status: "reserved",
    notes: "Demo uses localStorage; API client has cart item endpoints ready for session-backed carts."
  },
  {
    key: "checkout",
    label: "Checkout and payment handoff",
    routeSurface: "/checkout",
    currentSource: "src/components/checkout/CheckoutClient.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.paymentSessions,
    dashboardOwner: "commerce",
    status: "needs-backend",
    notes: "Payment session creation, tax, delivery, inventory reservation and dealer assignment remain backend-owned."
  },
  {
    key: "dealerSelector",
    label: "Dealer selector and location matching",
    routeSurface: "header, PDP, checkout",
    currentSource: "src/lib/data/mock-data.ts dealers",
    reservedEndpoint: "/dealers",
    dashboardOwner: "dealer",
    status: "reserved",
    notes: "Dealer coverage, postal-code matching, hours and service capability need dashboard management."
  },
  {
    key: "dealerProgram",
    label: "Dealer program content",
    routeSurface: "/dealer-program",
    currentSource: "src/app/dealer-program/page.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.moduleConfig("dealerProgram"),
    dashboardOwner: "dealer",
    status: "reserved",
    notes: "Program copy, policy links, imagery and CTA can move into dashboard module config."
  },
  {
    key: "dealerApplications",
    label: "Dealer application intake",
    routeSurface: "/dealers/apply",
    currentSource: "static form action",
    reservedEndpoint: "/dealer-applications",
    dashboardOwner: "dealer",
    status: "reserved",
    notes: "Form endpoint exists in API contract; backend should add validation, workflow and status tracking."
  },
  {
    key: "contactLeads",
    label: "Contact and project support leads",
    routeSurface: "/contact",
    currentSource: "src/app/contact/page.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.contactLeads,
    dashboardOwner: "support",
    status: "reserved",
    notes: "Contact forms should create support/dealer leads with source path and selected dealer context."
  },
  {
    key: "legalPages",
    label: "Legal and policy pages",
    routeSurface: "/privacy, /terms-and-conditions, /return-policy, etc.",
    currentSource: "src/content/legalPages.ts",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.legalPages,
    dashboardOwner: "system",
    status: "reserved",
    notes: "Legal copy has a structured content shape and can be admin-managed by slug and locale."
  },
  {
    key: "footer",
    label: "Footer links, contact and social channels",
    routeSurface: "global footer",
    currentSource: "src/components/layout/SiteFooter.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.footer,
    dashboardOwner: "content",
    status: "reserved",
    notes: "Footer groups, social links, legal links and contact metadata should be dashboard managed."
  },
  {
    key: "cookieConsent",
    label: "Cookie consent and preferences",
    routeSurface: "cookie bar and /cookie-settings",
    currentSource: "src/lib/privacy/cookie-preferences.ts",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.cookieConsentLog,
    dashboardOwner: "system",
    status: "reserved",
    notes: "Preferences are local now; future backend should receive consent audit events where legally required."
  },
  {
    key: "supportWidget",
    label: "AI support and human handoff",
    routeSurface: "global floating support",
    currentSource: "src/components/layout/CustomerSupportWidget.tsx",
    reservedEndpoint: DASHBOARD_API_ENDPOINTS.supportHandoffs,
    dashboardOwner: "support",
    status: "third-party-ready",
    notes: "Tiledesk is env-gated and consent-gated; custom fallback emits handoff events for future support backend."
  },
  {
    key: "auth",
    label: "Customer and partner auth",
    routeSurface: "/account/login, /account/register, partner login",
    currentSource: "static form action and API contract",
    reservedEndpoint: "/auth/login",
    dashboardOwner: "system",
    status: "reserved",
    notes: "API client has auth session types; role-based dashboard permissions still need backend implementation."
  },
  {
    key: "favorites",
    label: "Favorites and saved products",
    routeSurface: "/favorites and product cards",
    currentSource: "src/components/storefront/StorefrontProvider.tsx",
    reservedEndpoint: "/favorites",
    dashboardOwner: "commerce",
    status: "reserved",
    notes: "Demo uses localStorage; API client has favorite endpoints ready for account-backed saves."
  }
];
