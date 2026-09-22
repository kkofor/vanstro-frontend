export type Locale = "en-CA" | "fr-CA" | "zh-CN";
export type CurrencyCode = "CAD" | "USD";

export const PUBLIC_API_ERROR_CODES = [
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_ACCOUNT_EXISTS",
  "AUTH_PASSWORD_TOO_SHORT",
  "AUTH_INVALID_INPUT",
  "AUTH_RESET_INVALID",
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
  "DASHBOARD_AUTHORIZATION_UNAVAILABLE",
  "QUERY_INVALID",
  "QUERY_VERSION_UNSUPPORTED",
  "QUERY_SORT_INVALID",
  "QUERY_FILTER_UNSUPPORTED",
  "QUERY_SEARCH_UNSUPPORTED",
  "QUERY_TOO_COMPLEX",
  "QUERY_DEPTH_EXCEEDED",
  "CURSOR_INVALID",
  "QUERY_UNAVAILABLE",
  "JOB_TYPE_UNSUPPORTED",
  "JOB_TYPE_UNAVAILABLE",
  "JOB_STATE_CONFLICT",
  "JOB_LEASE_LOST",
  "JOB_NOT_CANCELLABLE",
  "JOB_NOT_RETRYABLE",
  "JOB_PROGRESS_INVALID",
  "JOB_ARTIFACT_UNAVAILABLE",
  "OBJECT_DISABLED",
  "OBJECT_NOT_SUPPORTED",
  "IMPORT_NOT_READY",
  "IMPORT_PREVIEW_FAILED",
  "IMPORT_PREVIEW_STALE",
  "IMPORT_EXPIRED",
  "SOURCE_ARTIFACT_MISSING",
  "SOURCE_HASH_MISMATCH",
  "CSV_INVALID_ENCODING",
  "CSV_MALFORMED",
  "CSV_DUPLICATE_HEADER",
  "CSV_MISSING_HEADER",
  "CSV_UNKNOWN_HEADER",
  "CSV_PROHIBITED_HEADER",
  "CSV_ROW_LIMIT_EXCEEDED",
  "CSV_BYTE_LIMIT_EXCEEDED",
  "FIELD_REQUIRED",
  "FIELD_INVALID_TYPE",
  "FIELD_INVALID_ENUM",
  "FIELD_TOO_LONG",
  "FIELD_OUT_OF_RANGE",
  "VERSION_CONFLICT",
  "FENCING_TOKEN_STALE",
  "EXPORT_NOT_READY",
  "EXPORT_EXPIRED",
  "EXPORT_ARTIFACT_MISSING",
  "DOWNLOAD_NOT_AUTHORIZED",
  "IDEMPOTENCY_CONFLICT",
  "WORK_ITEM_TYPE_UNSUPPORTED",
  "WORK_ITEM_STATE_CONFLICT",
  "WORK_ITEM_SCOPE_CHANGED",
  "WORK_ITEM_ASSIGNEE_INVALID",
  "WORK_ITEM_NOT_ACTIONABLE",
  "WORK_ITEM_ORPHANED",
  "WORK_ITEM_DEDUP_CONFLICT",
  "NOTIFICATION_NOT_FOUND",
  "NOTIFICATION_SCOPE_CHANGED",
  "CONFIG_KEY_UNSUPPORTED",
  "CONFIG_SCHEMA_UNSUPPORTED",
  "CONFIG_VALUE_INVALID",
  "CONFIG_SCOPE_DENIED",
  "CONFIG_IMMUTABLE",
  "CONFIG_ACTIVATION_FAILED",
  "SETTINGS_DESCRIPTOR_UNAVAILABLE",
  "SETTINGS_STATE_CONFLICT",
  "SETTINGS_VALIDATION_FAILED",
  "FLAG_KEY_UNSUPPORTED",
  "FLAG_STATE_INVALID",
  "FLAG_KILL_CONFIRMATION_REQUIRED",
  "READINESS_STALE",
  "READINESS_UNAVAILABLE",
  "ANALYTICS_INGESTION_UNAVAILABLE",
  "CURRENCY_MIXED",
  "INTERNAL_ERROR"
] as const;

export type PublicApiErrorCode = (typeof PUBLIC_API_ERROR_CODES)[number];

export type ApiErrorResult = {
  /** Legacy human-readable error retained for backward compatibility. */
  error: string;
  code: PublicApiErrorCode;
  requestId?: string;
  fields?: Record<string, string>;
};

export const COMMON_QUERY_VERSION = "common-query.v1" as const;
export type CommonQueryVersion = typeof COMMON_QUERY_VERSION;
export type CommonQueryDirection = "asc" | "desc";
export type CommonQueryNulls = "first" | "last";
export type CommonQuerySort = { field: string; direction: CommonQueryDirection; nulls: CommonQueryNulls };

export type CommonOffsetQueryV1<F extends object = Record<never, never>> = {
  queryVersion: CommonQueryVersion;
  limit: number;
  offset: number;
  sort: string;
  direction: CommonQueryDirection;
  q?: string;
  includeSummary: false;
  filters: Readonly<F>;
};
export type ProductQueryFiltersV1 = { status?: readonly ("draft" | "active" | "archived")[]; categoryId?: string; isUncategorized?: boolean };
export type DealerQueryFiltersV1 = { status?: "active" | "inactive"; dealerId?: readonly string[] };
export type ProductOffsetQueryV1 = CommonOffsetQueryV1<ProductQueryFiltersV1>;
export type CommonCursorQueryV1<F extends object = Record<never, never>> = Omit<CommonOffsetQueryV1<F>, "offset"> & { after?: string };
export type DealerCursorQueryV1 = CommonCursorQueryV1<DealerQueryFiltersV1>;

export type CommonOffsetResultV1<T, S = never> = {
  data: T[];
  meta: {
    requestId: string;
    queryContractVersion: CommonQueryVersion;
    pagination: { mode: "offset"; limit: number; offset: number; hasNext: boolean; hasPrevious: boolean };
    sort: CommonQuerySort[];
    total: { value: number; relation: "exact"; capturedAt: string };
    snapshot: { consistency: "transaction"; capturedAt: string };
    visibility: { profileId: string };
  };
  summary?: { data: S; relation: "exact"; capturedAt: string };
};

export type CommonCursorResultV1<T, S = never> = {
  data: T[];
  meta: {
    requestId: string;
    queryContractVersion: CommonQueryVersion;
    pagination: { mode: "cursor"; limit: number; nextCursor?: string; hasMore: boolean };
    sort: CommonQuerySort[];
    snapshot: { consistency: "statement"; capturedAt: string };
    visibility: { profileId: string };
  };
  summary?: { data: S; relation: "exact" | "estimated"; capturedAt: string };
};

export type DashboardSearchQueryV1 = { searchContractVersion: "dashboard-search.v1"; queryVersion: CommonQueryVersion; q: string; resourceTypes?: readonly ("product" | "dealer" | "dealerLocation")[]; limitPerResource?: number; totalLimit?: number };
export type DashboardSearchResultRef = { resourceType: "product" | "dealer" | "dealerLocation"; id: string; title: string; subtitle?: string; matchedField: "productName" | "slug" | "skuCode" | "code"; href: string; scoreBand: "exact" | "prefix" };
export type DashboardSearchGroupV1 = { resourceType: DashboardSearchResultRef["resourceType"]; status: "ok" | "unavailable"; results: DashboardSearchResultRef[]; truncated: boolean };
export type DashboardSearchResultV1 = { data: { groups: DashboardSearchGroupV1[] }; meta: { requestId: string; searchContractVersion: "dashboard-search.v1"; queryContractVersion: CommonQueryVersion; completion: "complete" | "partial"; capturedAt: string; actorId: string; contextRevision: string; authorizationFingerprint: string } };

export type ReconciliationEventSafeV1 = { id:string; type:"provider_confirmed"|"order_created"|"reconciliation_required"|"refund_requested"|"refunded"|"refund_failed"; amountCents:number|null; currency:string|null; createdAt:string };
export type ReconciliationItemSafeV1 = { id:string; status:"reconciliation_required"|"refund_pending"|"refund_processing"|"refund_failed"|"paid"|"refunded"; paymentMethod:string; fulfillment:"pickup"|"delivery"; subtotalCents:number; discountCents:number; taxCents:number; shippingCents:number; totalCents:number; currency:string; paidAt:string|null; createdAt:string; updatedAt:string; order:null|{id:string;status:"paid"|"processing"|"fulfilled"|"cancelled";totalCents:number;currency:string;createdAt:string}; paymentEvents:ReconciliationEventSafeV1[]; guestEmail?:string;guestFirstName?:string;guestLastName?:string;providerReference?:string };
export type CrmContactListItemV1 = { id:string;stage:"registered"|"engaged"|"checkout_started"|"customer"|"high_intent"|"archived";source:"registration"|"contact_form"|"guest_checkout";erpSyncStatus:"none"|"queued"|"synced"|"failed";lastActivityAt:string;createdAt:string;updatedAt:string;promotionEligible:boolean;owner?:{id:string;displayLabel?:string};email?:string|null;firstName?:string|null;lastName?:string|null;phone?:string|null };
export type CrmContactDetailV1 = CrmContactListItemV1 & { notes:Array<{id:string;createdAt:string}>;events:Array<{id:string;type:string;createdAt:string}>;tasks:Array<{id:string;status:string;dueAt:string|null;completedAt:string|null;createdAt:string;updatedAt:string}> };

export type AiSupportChatInput = {
  message: string;
  locale: Locale;
  pathname?: string;
  selectedDealerName?: string;
  cartCount?: number;
};

export type AiSupportChatResponse = {
  fallback: boolean;
  reason?: "unconfigured" | "timeout" | "upstream" | "empty";
  reply?: string;
  handoff?: boolean;
};

export type ApiResult<T> = {
  data: T;
  meta?: {
    requestId?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
    offset?: number;
    total?: number;
    totalPages?: number;
    cartToken?: string;
    replayed?: boolean;
    paymentInitializing?: boolean;
    providerRefundId?: string;
    payment?: PaymentInitiateMeta;
  };
};

export const DASHBOARD_FOUNDATION_MODULE_ROUTES = {
  overview: "/dashboard",
  products: "/dashboard/products",
  categories: "/dashboard/categories",
  pricing: "/dashboard/pricing",
  promotions: "/dashboard/promotions",
  inventory: "/dashboard/inventory",
  orders: "/dashboard/orders",
  payments: "/dashboard/payments",
  customers: "/dashboard/customers",
  users: "/dashboard/users",
  roles: "/dashboard/roles",
  dealers: "/dashboard/dealers",
  applications: "/dashboard/applications",
  leads: "/dashboard/leads",
  reviews: "/dashboard/reviews",
  support: "/dashboard/support",
  email: "/dashboard/email",
  content: "/dashboard/content",
  operations: "/dashboard/operations",
  erp: "/dashboard/erp",
  audit: "/dashboard/audit",
  settings: "/dashboard/settings"
} as const;

export const DASHBOARD_FOUNDATION_MODULE_PERMISSIONS = {
  overview: ["dashboard.access"],
  products: ["products.read", "products.write"],
  categories: ["products.read", "categories.write"],
  pricing: ["products.read", "pricing.write"],
  promotions: ["products.read", "pricing.write"],
  inventory: ["inventory.read", "inventory.write"],
  orders: ["orders.read", "orders.update", "orders.assign"],
  payments: ["orders.read"],
  customers: ["crm.read", "crm.update"],
  users: ["users.manage"],
  roles: ["users.read"],
  dealers: ["dealers.read", "settings.write"],
  applications: ["dealer_applications.read"],
  leads: ["leads.read"],
  reviews: ["reviews.read"],
  support: ["support.read"],
  email: ["email.outbox.read", "email.provider.read", "email.templates.read"],
  content: ["content.read", "dashboard.import.foundation_sample.read", "dashboard.import.foundation_sample.create", "dashboard.import.foundation_sample.commit", "dashboard.export.foundation_sample.read", "dashboard.export.foundation_sample.create", "dashboard.export.foundation_sample.download"],
  operations: ["audit_logs.read", "analytics.read", "jobs.read", "config.read", "config.manage", "config.activate", "flags.read", "flags.manage", "flags.kill_switch", "readiness.read_summary", "readiness.read_detail", "analytics.ingest", "analytics.release.read", "analytics.metrics.read", "analytics.metrics.read_detail", "analytics.export", "analytics.registry.read", "analytics.operations.read"],
  erp: ["erp.sync.read"],
  audit: ["audit_logs.read"],
  settings: ["settings.read"]
} as const satisfies Record<keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES, readonly string[]>;

// ---------------------------------------------------------------------------
// Dashboard Foundation v1.1 — shared mechanical module-state registry.
//
// Single client-side source for the authoritative V11-0 admin-module
// authority (frozen v1.1.1, SHA-256
// 2434e1affb9a4b226ec776870ce260ed560c0a2a3ec1a856c52d40465c36c271 — the
// same pin the backend registry validates). The runtime validator requires
// every projection module to match this registry byte-for-byte (status,
// route and selector summary), and the shell uses it to adjudicate known
// coming-soon routes before any legacy fallback or business transport when
// no projection is available (e.g. anonymous). It is mechanical: generated
// from the persisted authority, never hand-maintained per feature.
// ---------------------------------------------------------------------------

export type DashboardModuleStatus = "available" | "coming_soon";
export type DashboardSelectorKind = "path_exact" | "path_prefix" | "query_value" | "legacy_tab";

export type DashboardModuleSelectorSummary = {
  kind: DashboardSelectorKind;
  pathname: string;
  key?: string;
  value?: string;
};

export type DashboardFoundationModuleState = {
  module: keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES;
  label: string;
  group: string;
  status: DashboardModuleStatus;
  route: (typeof DASHBOARD_FOUNDATION_MODULE_ROUTES)[keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES];
  selectors: readonly DashboardModuleSelectorSummary[];
};

export const DASHBOARD_FOUNDATION_MODULE_STATE: readonly DashboardFoundationModuleState[] = [
  { module: "overview", label: "工作台", status: "available", group: "workspace", route: "/dashboard", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "overview" }] },
  { module: "products", label: "产品", status: "available", group: "catalog", route: "/dashboard/products", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "products" }] },
  { module: "categories", label: "分类", status: "available", group: "catalog", route: "/dashboard/categories", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "categories" }] },
  { module: "pricing", label: "价格", status: "available", group: "catalog", route: "/dashboard/pricing", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "pricing" }] },
  { module: "promotions", label: "促销", status: "available", group: "catalog", route: "/dashboard/promotions", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "promotions" }] },
  { module: "inventory", label: "库存", status: "available", group: "catalog", route: "/dashboard/inventory", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "inventorySnapshots" }] },
  { module: "orders", label: "订单", status: "available", group: "commerce", route: "/dashboard/orders", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "orders" }] },
  { module: "customers", label: "客户", status: "available", group: "commerce", route: "/dashboard/customers", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "crmContacts" }] },
  { module: "users", label: "用户", status: "available", group: "organization", route: "/dashboard/users", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "users" }] },
  { module: "dealers", label: "经销商", status: "available", group: "organization", route: "/dashboard/dealers", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "dealers" }] },
  { module: "erp", label: "ERP / 集成", status: "available", group: "platform", route: "/dashboard/erp", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "erpSyncJobs" }] },
  { module: "payments", label: "支付", status: "coming_soon", group: "commerce", route: "/dashboard/payments", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "paymentSessions" }] },
  { module: "roles", label: "角色", status: "coming_soon", group: "organization", route: "/dashboard/roles", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "roles" }] },
  { module: "applications", label: "申请", status: "coming_soon", group: "organization", route: "/dashboard/applications", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "dealerApplications" }] },
  { module: "leads", label: "销售线索", status: "coming_soon", group: "engagement", route: "/dashboard/leads", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "contactLeads" }] },
  { module: "reviews", label: "评价", status: "coming_soon", group: "engagement", route: "/dashboard/reviews", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "productReviews" }] },
  { module: "support", label: "客户支持", status: "coming_soon", group: "engagement", route: "/dashboard/support", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "supportHandoffs" }] },
  { module: "email", label: "邮件", status: "coming_soon", group: "engagement", route: "/dashboard/email", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "emailOutbox" }] },
  { module: "content", label: "内容", status: "coming_soon", group: "platform", route: "/dashboard/content", selectors: [{ kind: "path_exact", pathname: "/dashboard/media" }, { kind: "path_exact", pathname: "/dashboard/data-jobs" }, { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "cms" }] },
  { module: "operations", label: "运营", status: "coming_soon", group: "platform", route: "/dashboard/operations", selectors: [{ kind: "path_exact", pathname: "/dashboard/runtime" }, { kind: "path_exact", pathname: "/dashboard/analytics-foundation" }, { kind: "query_value", pathname: "/dashboard/operations", key: "view", value: "jobs" }, { kind: "query_value", pathname: "/dashboard/operations", key: "view", value: "work-queue" }, { kind: "query_value", pathname: "/dashboard/operations", key: "view", value: "notifications" }, { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "operations" }] },
  { module: "audit", label: "审计", status: "coming_soon", group: "platform", route: "/dashboard/audit", selectors: [{ kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "auditLogs" }] },
  { module: "settings", label: "设置", status: "coming_soon", group: "platform", route: "/dashboard/settings", selectors: [{ kind: "path_prefix", pathname: "/dashboard/settings/" }, { kind: "legacy_tab", pathname: "/dashboard", key: "tab", value: "settings" }] }
] as const;

export type DashboardFoundation = {
  contractVersion: "dashboard-foundation.v1.1";
  actor: {
    id: string;
    displayLabel: string;
    roleLabels: string[];
  };
  modules: Array<{
    module: keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES;
    label: string;
    group: string;
    status: DashboardModuleStatus;
    readAllowed: boolean;
    route: (typeof DASHBOARD_FOUNDATION_MODULE_ROUTES)[keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES];
    selectors: readonly DashboardModuleSelectorSummary[];
    reason?: "permission_required" | "coming_soon";
  }>;
  visibility: {
    scope: "unavailable";
    fields: "permission-only";
  };
  shell: {
    flag: "dashboard.shell.v2";
    mode: "disabled" | "internal";
    enabled: boolean;
    code: "DASHBOARD_SHELL_DISABLED" | "DASHBOARD_SHELL_ACTOR_NOT_ALLOWED" | "DASHBOARD_SHELL_READY";
    readOnly: true;
  };
  readiness: "disabled" | "ready";
  requestId: string;
};

export type DashboardAuthorization = {
  contractVersion: "dashboard-authorization.v1";
  status: "ready" | "degraded" | "unavailable";
  requestId: string;
  issuedAt: string;
  expiresAt: string;
  contextRevision: string;
  actor: {
    principalType: "user";
    id: string;
    kind: "admin";
    status: "active";
    roleKeys: string[];
  };
  effectiveRoles: Array<{ roleKey: string; scope: "global" | "dealer" }>;
  modules: Array<{
    module: keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES;
    route: (typeof DASHBOARD_FOUNDATION_MODULE_ROUTES)[keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES];
    status: "allowed" | "denied" | "degraded";
    actions: Array<{
      action: "read" | "create" | "update" | "delete" | "assign" | "retry" | "manage" | "execute" | "export" | "sensitive";
      permissionKey: string;
      decision: "allow" | "deny";
      reason: "granted_by_persisted_permission" | "permission_required" | "scope_required" | "scope_unavailable" | "scope_mismatch" | "field_policy_unavailable" | "assignment_expired" | "policy_changed" | "authorization_unavailable";
      scope:
        | { kind: "global" }
        | { kind: "dealer" | "location"; dealerIds: string[]; locationIds: string[] }
        | { kind: "unavailable" };
    }>;
  }>;
  scope:
    | { kind: "global" | "mixed"; source: "persisted_grants" }
    | { kind: "dealer" | "location"; source: "persisted_grants"; dealerIds: string[]; locationIds: string[] }
    | { kind: "unavailable"; source: "not_configured" };
  fieldVisibility: Array<{ resourceType: string; profileId: string }>;
  commonQueryV1: { products: { enabled: boolean }; dealers: { enabled: boolean } };
  auditFoundationV1: { enabled: boolean; queryProfile: "dashboard.audit-events.v1"; eventVersion: "audit-event.v1"; sensitive: { enabled: boolean } };
  workQueueFoundationV1: {
    enabled: boolean;
    contractVersion: "work-queue-item.v1";
    queryProfile: "dashboard.work-queue.v1";
    registryVersion: "work-queue-registry.v1";
    sensitive: { enabled: boolean };
    actions: { assign: boolean; acknowledge: boolean; resolve: boolean; dismiss: boolean; reopen: boolean };
    notifications: { enabled: boolean; contractVersion: "in-app-notification.v1"; queryProfile: "dashboard.in-app-notifications.v1"; markRead: boolean; externalDelivery: false };
  };
  asyncJobFoundationV1: {
    enabled: boolean;
    contractVersion: "async-job.v1";
    queryProfile: "dashboard.async-jobs.v1";
    registryVersion: "async-job-registry.v1";
    sensitive: { enabled: boolean };
    mutations: { create: boolean; cancel: boolean; retry: boolean };
    artifacts: { metadata: boolean; download: false };
  };
  dataJobFoundationV1: {
    enabled: boolean;
    contractVersion: "dashboard.data-jobs.v1";
    registryVersion: "dashboard.data-jobs.registry.v1";
    objectKey: "foundation.sample";
    imports: { read: boolean; create: boolean; commit: boolean };
    exports: { read: boolean; create: boolean; download: boolean };
    upload: { controlled: true; directAuthenticatedApi: true };
    download: { controlled: true; directAuthenticatedApi: true };
    tenantPartition: false;
  };
  mediaFoundationV1: {
    enabled: boolean;
    contractVersion: "media-asset.v1";
    queryProfile: "dashboard.media-assets.v1";
    registryVersion: "media-registry.v1";
    safeProfile: "dashboard.media-assets.safe.v1";
    sensitiveProfile: { enabled: boolean; profileId: "dashboard.media-assets.sensitive.v1" };
    actions: { create: boolean; update: boolean; archive: boolean; restore: boolean; downloadOriginal: boolean; manageVariants: boolean };
    upload: { enabled: boolean; image: boolean; pdf: boolean; maxBytes: { image: 10485760; pdf: 26214400 }; intentLifetimeSeconds: 600; directControlledApi: true };
    preview: { controlled: true; pdfInline: false };
    legacyAdapters: { enabled: true; partial: true };
    externalDelivery: false;
    ai: false;
    bulkImportExport: false;
  };
  /** S08 Service Account business capability (service_accounts.manage): a
   *  fail-closed field. manage is true only when the server granted the P02
   *  permission ceiling; policy lifecycle stays on settingsCenterV1. */
  serviceAccountsV1: { enabled: boolean; manage: boolean };
  settingsCenterV1: SettingsCenterCapability;
};

export const SETTINGS_CENTER_CONTRACT_VERSION = "settings-center.v1" as const;
export const SETTINGS_REGISTRY_VERSION = "settings-registry.v1" as const;
export const SETTINGS_CORE_DESCRIPTOR_KEY = "settings.core.overview_refresh_seconds" as const;
export const GENERAL_STOREFRONT_DESCRIPTOR_KEY = "settings.general-storefront" as const;
export const GENERAL_STOREFRONT_SCHEMA_VERSION = "settings.general-storefront.v1" as const;
export const CANADA_TIMEZONES = [
  "America/St_Johns", "America/Halifax", "America/Moncton", "America/Glace_Bay", "America/Goose_Bay",
  "America/Blanc-Sablon", "America/Toronto", "America/Iqaluit", "America/Winnipeg", "America/Rankin_Inlet",
  "America/Regina", "America/Swift_Current", "America/Edmonton", "America/Cambridge_Bay", "America/Inuvik",
  "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston", "America/Vancouver", "America/Whitehorse",
  "America/Dawson"
] as const;
export type CanadaTimezone = (typeof CANADA_TIMEZONES)[number];
export type SiteLocaleOption = "en-CA" | "fr-CA";
export type GeneralIdentityV1 = {
  siteDisplayName: string;
  legalName: string;
  canonicalUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: { line1: string; line2?: string; city: string; province: string; postalCode: string; country: string };
  defaultTimezone: CanadaTimezone;
};
export type BrandV1 = {
  brandName: string;
  brandDescription: string;
  logoMediaRef: string | null;
  faviconMediaRef: string | null;
};
export type AnnouncementRuleV1 = {
  enabled: boolean;
  message: string;
  locale?: SiteLocaleOption;
  startsAt?: string | null;
  endsAt?: string | null;
};
export type StorefrontRulesV1 = {
  homeContentRef: string | null;
  navigationRef: string | null;
  footerRef: string | null;
  defaultProductSort: "newest" | "price_asc" | "price_desc" | "featured";
  outOfStockDisplay: "hide" | "show" | "hide_with_contact";
  dealerSelectionEnabled: boolean;
  cartCheckoutEnabled: boolean;
  announcementRule: AnnouncementRuleV1;
  maintenanceBannerRule: { enabled: boolean; message: string };
  storefrontConfigRef: string | null;
  enFrRoutesEnabled: boolean;
};
export type ProvinceServiceMappingEntryV1 = { province: string; dealerRef?: string; locationRef?: string };
export type LocalizationV1 = {
  defaultLocale: SiteLocaleOption;
  supportedLocales: SiteLocaleOption[];
  dashboardLocale: "zh-CN";
  currency: "CAD";
  timezone: CanadaTimezone;
  dateFormat: "yyyy-mm-dd" | "dd-mm-yyyy" | "mm-dd-yyyy";
  phoneFormat: "national" | "international";
  addressFormat: "canada_default";
  weightUnits: "kg" | "lb";
  dimensionUnits: "cm" | "in";
  translationFallback: "en_ca";
  provinceServiceMapping: ProvinceServiceMappingEntryV1[];
};
export type DefaultDealerLocationV1 = { defaultDealerRef: string | null; defaultLocationRef: string | null };
export type GeneralStorefrontSettingsValueV1 = {
  generalIdentity: GeneralIdentityV1;
  brand: BrandV1;
  storefront: StorefrontRulesV1;
  localization: LocalizationV1;
  defaultDealerLocation: DefaultDealerLocationV1;
};
export type S02Draft = {
  id: string;
  descriptorKey: typeof GENERAL_STOREFRONT_DESCRIPTOR_KEY;
  status: SettingsDraft["status"];
  value: GeneralStorefrontSettingsValueV1;
  basePublicationVersion: number;
  version: number;
  changeReason: string;
  createdAt: string;
  updatedAt: string;
  validationRevision: number | null;
  rollbackOfPublicationId: string | null;
};
export type S02ValidationIssue = {
  code: string;
  severity: SettingsValidationSeverity;
  field: string;
  message: string;
};
export type S02ValidationResult = {
  draftId: string;
  draftVersion: number;
  validationRevision: number;
  status: "validated" | "invalid";
  issues: S02ValidationIssue[];
  validatedAt: string;
};
export type S02SafeDiffChange = {
  field: string;
  before: unknown;
  after: unknown;
  sensitivity: "public";
};
export type S02SafeDiff = {
  draftId: string;
  draftVersion: number;
  descriptorKey: typeof GENERAL_STOREFRONT_DESCRIPTOR_KEY;
  changes: S02SafeDiffChange[];
  secretChangeCount: 0;
  restartRequired: false;
  affectedServices: ["storefront", "dashboard"];
};
export type S02PublicationReadiness = {
  state: "ready" | "degraded" | "not_ready";
  reasonCode: "ready" | "consumer_generation_missing" | "consumer_generation_mismatch" | "consumer_unavailable" | "activation_failed" | "dependency_unavailable";
  observedAt: string;
  publishedGeneration: number;
  publicationVersion: number;
  consumerGeneration: number | null;
  projectionState: "compiled_default" | "published" | "activation_failed";
};
export type S02Publication = {
  id: string;
  generation: string;
  version: number;
  sourceDraftId: string;
  sourceDraftVersion: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  readiness: S02PublicationReadiness;
};
export type S02HistoryEntry = {
  publicationId: string;
  generation: string;
  version: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  descriptorKeys: [typeof GENERAL_STOREFRONT_DESCRIPTOR_KEY];
  changeReason: string;
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  auditEventId: string;
};
export type S02Readiness = {
  state: "ready" | "degraded" | "not_ready";
  reasonCode: "ready" | "consumer_generation_missing" | "consumer_generation_mismatch" | "consumer_unavailable" | "activation_failed" | "dependency_unavailable";
  observedAt: string;
  publishedGeneration: number;
  publicationVersion: number | null;
  publicationCas: number | null;
  consumerGeneration: number | null;
  projectionState: "compiled_default" | "published" | "activation_failed";
};
export type S02CreateDraftRequest = {
  descriptorKey: typeof GENERAL_STOREFRONT_DESCRIPTOR_KEY;
  expectedPublishedVersion: number;
  value: GeneralStorefrontSettingsValueV1;
  changeReason: string;
  idempotencyKey: string;
};
export type S02UpdateDraftRequest = {
  expectedVersion: number;
  value: GeneralStorefrontSettingsValueV1;
  changeReason: string;
  idempotencyKey: string;
};
export const AUTH_RBAC_DESCRIPTOR_KEY = "settings.auth-rbac" as const;
export const AUTH_RBAC_SCHEMA_VERSION = "settings.auth-rbac.v1" as const;
export type AuthRbacPasswordPolicyV1 = { minimumLength: number; resetTokenTtlMinutes: number };
export type AuthRbacSessionPolicyV1 = { sessionLifetimeMinutes: number };
export type AuthRbacSettingsValueV1 = {
  passwordPolicy: AuthRbacPasswordPolicyV1;
  sessionPolicy: AuthRbacSessionPolicyV1;
};
export type S09Draft = {
  id: string;
  descriptorKey: typeof AUTH_RBAC_DESCRIPTOR_KEY;
  status: SettingsDraft["status"];
  value: AuthRbacSettingsValueV1;
  basePublicationVersion: number;
  version: number;
  changeReason: string;
  createdAt: string;
  updatedAt: string;
  validationRevision: number | null;
  rollbackOfPublicationId: string | null;
};
export type S09ValidationIssue = {
  code: string;
  severity: SettingsValidationSeverity;
  field: string;
  message: string;
};
export type S09ValidationResult = {
  draftId: string;
  draftVersion: number;
  validationRevision: number;
  status: "validated" | "invalid";
  issues: S09ValidationIssue[];
  validatedAt: string;
};
export type S09SafeDiffChange = {
  field: string;
  before: unknown;
  after: unknown;
  sensitivity: "public";
};
export type S09SafeDiff = {
  draftId: string;
  draftVersion: number;
  descriptorKey: typeof AUTH_RBAC_DESCRIPTOR_KEY;
  changes: S09SafeDiffChange[];
  secretChangeCount: 0;
  restartRequired: false;
  affectedServices: ["auth", "dashboard"];
};
export type S09PublicationReadiness = {
  state: "ready" | "degraded" | "not_ready";
  reasonCode: "ready" | "consumer_generation_missing" | "consumer_generation_mismatch" | "consumer_unavailable" | "activation_failed" | "dependency_unavailable";
  observedAt: string;
  publishedGeneration: number;
  publicationVersion: number;
  consumerGeneration: number | null;
  projectionState: "compiled_default" | "published" | "activation_failed";
};
export type S09Publication = {
  id: string;
  generation: string;
  version: number;
  sourceDraftId: string;
  sourceDraftVersion: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  readiness: S09PublicationReadiness;
};
export type S09HistoryEntry = {
  publicationId: string;
  generation: string;
  version: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  descriptorKeys: [typeof AUTH_RBAC_DESCRIPTOR_KEY];
  changeReason: string;
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  auditEventId: string;
};
export type S09Readiness = {
  state: "ready" | "degraded" | "not_ready";
  reasonCode: "ready" | "consumer_generation_missing" | "consumer_generation_mismatch" | "consumer_unavailable" | "activation_failed" | "dependency_unavailable";
  observedAt: string;
  publishedGeneration: number;
  publicationVersion: number | null;
  publicationCas: number | null;
  consumerGeneration: number | null;
  projectionState: "compiled_default" | "published" | "activation_failed";
};
export type S09Overview = {
  descriptorKey: typeof AUTH_RBAC_DESCRIPTOR_KEY;
  schemaVersion: typeof AUTH_RBAC_SCHEMA_VERSION;
  projectionState: "compiled_default" | "published" | "activation_failed";
  publishedGeneration: number;
  publication: { version: number; cas: number | null; publishedAt: string; changeReason: string } | null;
  effective: AuthRbacSettingsValueV1;
};
export type S09CreateDraftRequest = {
  descriptorKey: typeof AUTH_RBAC_DESCRIPTOR_KEY;
  expectedPublishedVersion: number;
  value: AuthRbacSettingsValueV1;
  changeReason: string;
  idempotencyKey: string;
};
export type S09UpdateDraftRequest = {
  expectedVersion: number;
  value: AuthRbacSettingsValueV1;
  changeReason: string;
  idempotencyKey: string;
};
export type S09ImpactPreviewRequest = {
  targetUserId: string;
  nextStatus?: "active" | "suspended" | "archived";
  removeRoleId?: string;
};
export type S09ImpactPreviewResult = {
  targetUserId: string;
  wouldBlockLastSuperAdmin: boolean;
  activeSuperAdminCount: number | null;
  safeReasonCode: "allowed" | "LAST_SUPER_ADMIN_BLOCKED";
  contextRevision: string;
};
export type S09SessionRevokeRequest = {
  targetUserId: string;
  confirmation: "REVOKE_SESSIONS";
  reason: string;
};
export type S09SessionRevokeResult = {
  targetUserId: string;
  revokedCount: number;
  reason: string;
  revokedAt: string;
};
export const PRIVACY_RETENTION_DESCRIPTOR_KEY = "settings.privacy-retention" as const;
export const PRIVACY_RETENTION_SCHEMA_VERSION = "settings.privacy-retention.v1" as const;
export type ObjectFamily = "consent_events" | "audit_events" | "async_jobs" | "media_assets" | "orders" | "payments" | "privacy_requests";
export type ConsentCategory = "functional" | "analytics" | "targeting";
export type DsarScope = "all_personal_data" | "orders" | "payments" | "media" | "communications";
export type DsarMethod = "access" | "export" | "delete";
export type PiiDisplayMode = "plain" | "masked" | "hidden";
export type PrivacyRetentionSettingsValueV1 = {
  consentPolicy: {
    anonymousConsentEnabled: boolean;
    authenticatedConsentEnabled: boolean;
    consentCategories: ConsentCategory[];
    retentionMonths: number;
  };
  retentionPolicy: {
    retentionByObjectFamily: Array<{ objectFamily: ObjectFamily; retentionDays: number; autoCleanupEnabled: boolean }>;
  };
  legalHoldPolicy: {
    legalHoldEnabled: boolean;
    legalHoldRefs: string[];
  };
  dsarPolicy: {
    accessExportDeleteRules: Array<{ scope: DsarScope; method: DsarMethod; enabled: boolean; requireAdminApproval: boolean }>;
  };
  piiDisplayPolicy: {
    piiDisplayRules: Array<{ field: string; displayMode: PiiDisplayMode; allowedRoles: string[] }>;
  };
  lowRiskExecution: {
    allowlist: Array<"consent_events" | "async_jobs">;
    impactPreviewEnabled: boolean;
  };
};
export type S10Draft = {
  id: string;
  descriptorKey: typeof PRIVACY_RETENTION_DESCRIPTOR_KEY;
  status: SettingsDraft["status"];
  value: PrivacyRetentionSettingsValueV1;
  basePublicationVersion: number;
  version: number;
  changeReason: string;
  createdAt: string;
  updatedAt: string;
  validationRevision: number | null;
  rollbackOfPublicationId: string | null;
};
export type S10ValidationIssue = {
  code: string;
  severity: SettingsValidationSeverity;
  field: string;
  message: string;
};
export type S10ValidationResult = {
  draftId: string;
  draftVersion: number;
  validationRevision: number;
  status: "validated" | "invalid";
  issues: S10ValidationIssue[];
  validatedAt: string;
};
export type S10SafeDiffChange = {
  field: string;
  before: unknown;
  after: unknown;
  sensitivity: "public";
};
export type S10SafeDiff = {
  draftId: string;
  draftVersion: number;
  descriptorKey: typeof PRIVACY_RETENTION_DESCRIPTOR_KEY;
  changes: S10SafeDiffChange[];
  secretChangeCount: 0;
  restartRequired: false;
  affectedServices: ["dashboard"];
};
export type S10PublicationReadiness = {
  state: "degraded";
  reasonCode: "cleanup_consumer_unavailable";
  observedAt: string;
  publishedGeneration: number;
  publicationVersion: number;
  consumerGeneration: null;
  projectionState: "compiled_default" | "published" | "activation_failed";
};
export type S10Publication = {
  id: string;
  generation: string;
  version: number;
  sourceDraftId: string;
  sourceDraftVersion: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  readiness: S10PublicationReadiness;
};
export type S10HistoryEntry = {
  publicationId: string;
  generation: string;
  version: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  descriptorKeys: [typeof PRIVACY_RETENTION_DESCRIPTOR_KEY];
  changeReason: string;
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  auditEventId: string;
};
export type S10CleanupConsumer = {
  state: "degraded";
  reasonCode: "cleanup_consumer_unavailable";
  observedAt: string;
};
export type S10Readiness = {
  state: "degraded";
  reasonCode: "cleanup_consumer_unavailable";
  observedAt: string;
  publishedGeneration: number;
  publicationVersion: number | null;
  publicationCas: number | null;
  consumerGeneration: number | null;
  projectionState: "compiled_default" | "published" | "activation_failed";
  cleanupConsumer: S10CleanupConsumer;
};
export type S10Overview = {
  descriptorKey: typeof PRIVACY_RETENTION_DESCRIPTOR_KEY;
  schemaVersion: typeof PRIVACY_RETENTION_SCHEMA_VERSION;
  projectionState: "compiled_default" | "published" | "activation_failed";
  publishedGeneration: number;
  publication: { version: number; cas: number | null; publishedAt: string; changeReason: string } | null;
  effective: PrivacyRetentionSettingsValueV1;
  capabilities: { anonymousConsent: "current_fact"; authenticatedConsent: "future_unavailable"; privacySubjectPurge: "future_unavailable" };
  cleanupConsumer: S10CleanupConsumer;
};
export type S10CreateDraftRequest = {
  descriptorKey: typeof PRIVACY_RETENTION_DESCRIPTOR_KEY;
  expectedPublishedVersion: number;
  value: PrivacyRetentionSettingsValueV1;
  changeReason: string;
  idempotencyKey: string;
};
export type S10UpdateDraftRequest = {
  expectedVersion: number;
  value: PrivacyRetentionSettingsValueV1;
  changeReason: string;
  idempotencyKey: string;
};
export type S10ImpactPreviewRequest = {
  candidateRetentionEntries?: Array<{ objectFamily: ObjectFamily; retentionDays: number; autoCleanupEnabled: boolean }>;
  candidateAllowlist?: Array<"consent_events" | "async_jobs">;
};
export type S10ImpactPreviewResult = {
  wouldEnableAutoCleanup: boolean;
  wouldConflictWithLegalHold: boolean;
  blockedHighRiskFamilies: string[];
  affectedFamilies: Array<{ objectFamily: string; classification: "low_risk" | "high_risk"; wouldEnableAutoCleanup: boolean }>;
  contextRevision: string;
};
export const COMMERCE_SETTINGS_DESCRIPTOR_KEY = "settings.commerce" as const;
export const COMMERCE_SETTINGS_SCHEMA_VERSION = "settings.commerce.v1" as const;
export type CommerceOrderState = "paid" | "processing" | "fulfilled" | "cancelled";
export type CommerceSettingsValueV1 = {
  commercePolicy: { minimumOrderAmountCents: number; guestCheckoutEnabled: boolean; checkoutEnabled: boolean };
  taxPolicy: { enabledProvinceCodes: string[]; calculationMode: "current-tax-rate-table" | "disabled"; roundingMode: "nearest-cent" };
  shippingPolicy: { pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFlatFeeCents: number; serviceZoneMode: "dealer-location-only" | "postal-prefix"; fallbackMode: "reject" | "pickup-only" };
  inventoryPolicy: { reservationEnabled: boolean; reservationTtlMinutes: number; availabilityMode: "manual" | "erp"; staleAfterSeconds: number; staleBehavior: "degraded-reject" | "manual-fallback" };
  orderPolicy: { allowedLifecycleTransitions: Record<CommerceOrderState, CommerceOrderState[]>; guestLookupEnabled: boolean; cancellationMode: "erp-confirmed-only" | "disabled" };
};
export type S03Draft = { id: string; descriptorKey: typeof COMMERCE_SETTINGS_DESCRIPTOR_KEY; status: SettingsDraft["status"]; value: CommerceSettingsValueV1; basePublicationVersion: number; version: number; changeReason: string; createdAt: string; updatedAt: string; validationRevision: number | null; rollbackOfPublicationId: string | null };
export type S03ValidationIssue = { code: string; severity: SettingsValidationSeverity; field: string; message: string };
export type S03ValidationResult = { draftId: string; draftVersion: number; validationRevision: number; status: "validated" | "invalid"; issues: S03ValidationIssue[]; validatedAt: string };
export type S03SafeDiff = { draftId: string; draftVersion: number; descriptorKey: typeof COMMERCE_SETTINGS_DESCRIPTOR_KEY; changes: Array<{ field: string; before: unknown; after: unknown; sensitivity: "public" }>; secretChangeCount: 0; restartRequired: false; affectedServices: ["commerce"] };
export type S03ConsumerState = "implemented_ready" | "implemented_degraded" | "future_obligation";
export type S03ConsumerId = "checkout-availability" | "checkout-guest-minimum" | "tax-totals" | "shipping-fee-service-zone" | "inventory-ttl-stale" | "order-transitions";
export type S03ConsumerReadiness = { id: S03ConsumerId; state: S03ConsumerState; generation: number | null; reasonCode: string | null };
export type S03Readiness = { state: "ready" | "degraded"; reasonCode: string | null; observedAt: string; publishedGeneration: number; publicationVersion: number | null; publicationCas: number | null; consumerGeneration: number | null; projectionState: "compiled_default" | "published" | "activation_failed"; consumers: S03ConsumerReadiness[] };
export type S03Publication = { id: string; generation: string; version: number; sourceDraftId: string; sourceDraftVersion: number; status: "published" | "superseded" | "activation_failed" | "rolled_back"; publishedAt: string; rollbackOfPublicationId: string | null; readiness: Omit<S03Readiness, "publicationCas"> };
export type S03HistoryEntry = { publicationId: string; generation: string; version: number; status: S03Publication["status"]; descriptorKeys: [typeof COMMERCE_SETTINGS_DESCRIPTOR_KEY]; changeReason: string; publishedAt: string; rollbackOfPublicationId: string | null; auditEventId: string };
export type S03Overview = { descriptorKey: typeof COMMERCE_SETTINGS_DESCRIPTOR_KEY; schemaVersion: typeof COMMERCE_SETTINGS_SCHEMA_VERSION; projectionState: S03Readiness["projectionState"]; publishedGeneration: number; publication: { version: number; cas: number | null; publishedAt: string; changeReason: string } | null; effective: CommerceSettingsValueV1; consumerMatrix: S03ConsumerReadiness[] };
export type S03CreateDraftRequest = { descriptorKey: typeof COMMERCE_SETTINGS_DESCRIPTOR_KEY; expectedPublishedVersion: number; value: CommerceSettingsValueV1; changeReason: string; idempotencyKey: string };
export type S03UpdateDraftRequest = { expectedVersion: number; value: CommerceSettingsValueV1; changeReason: string; idempotencyKey: string };
export type S03ImpactPreviewRequest = { candidate: CommerceSettingsValueV1 };
export type S03ImpactPreviewResult = { candidateAccepted: boolean; affectedFamilies: Array<"commercePolicy" | "taxPolicy" | "shippingPolicy" | "inventoryPolicy" | "orderPolicy">; quoteImpact: { checkoutAvailable: boolean; guestCheckoutAvailable: boolean; minimumOrderAmountCents: number; taxMode: CommerceSettingsValueV1["taxPolicy"]["calculationMode"]; enabledProvinceCount: number; pickupAvailable: boolean; deliveryAvailable: boolean; deliveryFlatFeeCents: number; inventoryMode: CommerceSettingsValueV1["inventoryPolicy"]["availabilityMode"]; reservationTtlMinutes: number; staleAfterSeconds: number; orderTransitionRuleCount: number }; warnings: string[]; contextRevision: string };

export const API_SERVICE_ACCOUNT_DESCRIPTOR_KEY = "settings.api-service-account" as const;
export const API_SERVICE_ACCOUNT_SCHEMA_VERSION = "settings.api-service-account.v1" as const;
export type TokenLifecyclePolicyV1 = { defaultTtlDays: number; maximumTtlDays: number; rotationOverlapMinutes: number; maximumActiveTokensPerAccount: number; requireExpiry: boolean };
export type MachineScopeEnvironment = "production" | "staging" | "development" | "test";
export type DealerLocationScopeMode = "global" | "dealer" | "location";
export type MachineScopePolicyV1 = { allowedRoleKeys: string[]; allowedPermissionFamilies: string[]; environment: MachineScopeEnvironment; dealerLocationScopeMode: DealerLocationScopeMode; denySensitivePermissionsByDefault: boolean };
export type RateLimitMode = "per-token" | "per-account";
export type RetryAfterSemantics = "seconds";
export type RateLimitPolicyV1 = { requestsPerMinute: number; burst: number; mode: RateLimitMode; retryAfterSemantics: RetryAfterSemantics };
export type MetadataRedactionMode = "strict" | "standard";
export type AuditInvocationPolicyV1 = { invocationRetentionDays: number; metadataRedactionMode: MetadataRedactionMode; lastUsedTrackingEnabled: boolean; failedAuthenticationAuditEnabled: boolean };
export type ApiServiceAccountsValueV1 = { tokenLifecyclePolicy: TokenLifecyclePolicyV1; machineScopePolicy: MachineScopePolicyV1; rateLimitPolicy: RateLimitPolicyV1; auditInvocationPolicy: AuditInvocationPolicyV1 };

export type S08ConsumerState = "implemented_ready" | "implemented_degraded" | "future_obligation";
export type S08ConsumerId = "token-lifecycle" | "rotate-overlap" | "machine-scope-enforcement" | "rate-limit" | "audit-invocation-read-model" | "erp-product-api-machine";
export type S08ConsumerReadiness = { id: S08ConsumerId; state: S08ConsumerState; generation: number | null; reasonCode: string | null };
export type S08Readiness = { state: "ready" | "degraded"; reasonCode: string | null; observedAt: string; publishedGeneration: number; publicationVersion: number | null; publicationCas: number | null; consumerGeneration: number | null; projectionState: "compiled_default" | "published" | "activation_failed"; consumers: S08ConsumerReadiness[] };
export type S08Draft = { id: string; descriptorKey: typeof API_SERVICE_ACCOUNT_DESCRIPTOR_KEY; status: SettingsDraft["status"]; value: ApiServiceAccountsValueV1; basePublicationVersion: number; version: number; changeReason: string; createdAt: string; updatedAt: string; validationRevision: number | null; rollbackOfPublicationId: string | null };
export type S08ValidationIssue = { code: string; severity: SettingsValidationSeverity; field: string; message: string };
export type S08ValidationResult = { draftId: string; draftVersion: number; validationRevision: number; status: "validated" | "invalid"; issues: S08ValidationIssue[]; validatedAt: string };
export type S08SafeDiff = { draftId: string; draftVersion: number; descriptorKey: typeof API_SERVICE_ACCOUNT_DESCRIPTOR_KEY; changes: Array<{ field: string; before: unknown; after: unknown; sensitivity: "public" }>; secretChangeCount: 0; restartRequired: false; affectedServices: ["api-service-accounts"] };
export type S08Publication = { id: string; generation: string; version: number; sourceDraftId: string; sourceDraftVersion: number; status: "published" | "superseded" | "activation_failed" | "rolled_back"; publishedAt: string; rollbackOfPublicationId: string | null; readiness: Omit<S08Readiness, "publicationCas"> };
export type S08HistoryEntry = { publicationId: string; generation: string; version: number; status: S08Publication["status"]; descriptorKeys: [typeof API_SERVICE_ACCOUNT_DESCRIPTOR_KEY]; changeReason: string; publishedAt: string; rollbackOfPublicationId: string | null; auditEventId: string };
export type S08Overview = { descriptorKey: typeof API_SERVICE_ACCOUNT_DESCRIPTOR_KEY; schemaVersion: typeof API_SERVICE_ACCOUNT_SCHEMA_VERSION; projectionState: S08Readiness["projectionState"]; publishedGeneration: number; publication: { version: number; cas: number | null; publishedAt: string; changeReason: string } | null; effective: ApiServiceAccountsValueV1; consumerMatrix: S08ConsumerReadiness[] };
export type S08CreateDraftRequest = { descriptorKey: typeof API_SERVICE_ACCOUNT_DESCRIPTOR_KEY; expectedPublishedVersion: number; value: ApiServiceAccountsValueV1; changeReason: string; idempotencyKey: string };
export type S08UpdateDraftRequest = { expectedVersion: number; value: ApiServiceAccountsValueV1; changeReason: string; idempotencyKey: string };
export type S08ImpactPreviewRequest = { candidate: ApiServiceAccountsValueV1 };
export type S08ImpactPreviewResult = { candidateAccepted: boolean; affectedFamilies: Array<"tokenLifecyclePolicy" | "machineScopePolicy" | "rateLimitPolicy" | "auditInvocationPolicy">; policyImpact: { defaultTtlDays: number; maximumTtlDays: number; rotationOverlapMinutes: number; maximumActiveTokensPerAccount: number; requireExpiry: boolean; environment: MachineScopeEnvironment; dealerLocationScopeMode: DealerLocationScopeMode; allowedRoleKeyCount: number; allowedPermissionFamilyCount: number; denySensitivePermissionsByDefault: boolean; requestsPerMinute: number; burst: number; rateLimitMode: RateLimitMode; invocationRetentionDays: number; metadataRedactionMode: MetadataRedactionMode; lastUsedTrackingEnabled: boolean; failedAuthenticationAuditEnabled: boolean; serviceAccountCount: number; activeTokenCount: number }; warnings: string[]; contextRevision: string };

export type ServiceAccountStatus = "active" | "disabled";
export type ServiceAccountSummary = { id: string; key: string; name: string; status: ServiceAccountStatus; roles: string[]; environment: MachineScopeEnvironment; createdAt: string };
export type TokenStatus = "active" | "expired" | "revoked" | "rotated";
export type TokenMetadata = { id: string; name: string | null; status: TokenStatus; lastUsedAt: string | null; expiresAt: string | null; revokedAt: string | null; createdAt: string };
export type TokenCreateResult = { id: string; name: string | null; expiresAt: string | null; createdAt: string; plaintext: string | null; plaintextAvailable: boolean; replayed: boolean };
export type TokenRotateResult = { id: string; status: "active"; expiresAt: string | null; overlapUntil: string; plaintext: string | null; plaintextAvailable: boolean };
export type InvocationStatus = "succeeded" | "failed" | "rate_limited" | "denied";
export type InvocationErrorClass = "RATE_LIMITED" | "AUTH_INVALID" | "AUTH_REQUIRED" | "FORBIDDEN" | "TOOL_NOT_FOUND" | "INPUT_INVALID" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL";
export type InvocationSummary = { id: string; serviceAccount: { id: string; key: string; name: string }; toolKey: string; status: InvocationStatus; createdAt: string; errorClass: InvocationErrorClass | null };
export type StorefrontConfigAnnouncementRule = {
  enabled: boolean;
  message: string;
  locale?: SiteLocaleOption;
  startsAt?: string | null;
  endsAt?: string | null;
};
export type StorefrontConfigMediaRef = { id: string; contentType: string };
export type StorefrontConfigDealerRef = { id: string; name: string };
export type StorefrontConfigLocationRef = { id: string; city: string; province: string };
export type StorefrontEffectiveConfig = {
  siteDisplayName: string;
  brandName: string;
  announcementRule: StorefrontConfigAnnouncementRule;
  contact: { email: string; phone: string };
  logoMedia: StorefrontConfigMediaRef | null;
  defaultDealer: StorefrontConfigDealerRef | null;
  defaultLocation: StorefrontConfigLocationRef | null;
};
export type StorefrontConfigProjection = {
  projectionState: "compiled_default" | "published";
  publishedGeneration: number;
  locale: SiteLocaleOption;
  effective: StorefrontEffectiveConfig;
};
export const SETTINGS_LIFECYCLE_STATUSES = ["draft", "validated", "invalid", "publishing", "published", "superseded", "activation_failed", "rollback_draft", "rolled_back"] as const;
export const SETTINGS_VALIDATION_SEVERITIES = ["blocker", "warning", "info"] as const;
export const SETTINGS_AVAILABILITIES = ["available", "coming_in_v1", "not_implemented"] as const;
export type SettingsLifecycleStatus = (typeof SETTINGS_LIFECYCLE_STATUSES)[number];
export type SettingsValidationSeverity = (typeof SETTINGS_VALIDATION_SEVERITIES)[number];
export type SettingsAvailability = (typeof SETTINGS_AVAILABILITIES)[number];
export type SettingsCenterCapability = {
  enabled: boolean;
  contractVersion: typeof SETTINGS_CENTER_CONTRACT_VERSION;
  registryVersion: typeof SETTINGS_REGISTRY_VERSION;
  coreDescriptorKey: typeof SETTINGS_CORE_DESCRIPTOR_KEY;
  actions: { read: boolean; createDraft: boolean; updateDraft: boolean; validate: boolean; publish: boolean; rollback: boolean };
  history: { read: boolean };
  readiness: { read: boolean };
  audit: { integrated: true };
  secrets: false;
  externalSideEffects: false;
  partialPublish: false;
};
export type SettingsRegistryEntry = {
  key: string;
  group: "core" | "general" | "commerce" | "payments" | "email" | "integrations" | "webhooks" | "developer" | "auth" | "privacy" | "media" | "system";
  title: string;
  description: string;
  schemaVersion: string;
  availability: SettingsAvailability;
  valueType: "integer";
  secret: false;
  mutable: boolean;
  defaultValue: number;
};
export type SettingsReadiness = {
  state: "ready" | "degraded" | "not_ready";
  reasonCode: "ready" | "consumer_generation_missing" | "consumer_generation_mismatch" | "consumer_unavailable" | "activation_failed" | "dependency_unavailable";
  observedAt: string;
  publishedGeneration: number;
  publicationVersion: number | null;
  consumerGeneration: number | null;
  effectiveOverviewRefreshSeconds: number;
  projectionState: "compiled_default" | "published" | "activation_failed";
};
export type SettingsOverview = {
  contractVersion: typeof SETTINGS_CENTER_CONTRACT_VERSION;
  environment: { label: string; kind: "local" | "development" | "staging" | "production" };
  publication: { generation: string; version: number; publishedAt: string | null };
  openDraftCount: number;
  latestLifecycle: { status: SettingsLifecycleStatus | "none"; occurredAt: string | null };
  readiness: SettingsReadiness;
  registry: { availableCount: number; comingInV1Count: number; notImplementedCount: number };
};
export type SettingsCreateDraftRequest = {
  descriptorKey: typeof SETTINGS_CORE_DESCRIPTOR_KEY;
  expectedPublishedVersion: number;
  value: number;
  changeReason: string;
  idempotencyKey: string;
};
export type SettingsUpdateDraftRequest = { expectedVersion: number; value: number; changeReason: string; idempotencyKey: string };
export type SettingsDraftCommandRequest = { expectedVersion: number; idempotencyKey: string };
export type SettingsCreateRollbackDraftRequest = { expectedPublishedVersion: number; changeReason: string; idempotencyKey: string };
export type SettingsDraft = {
  id: string;
  descriptorKey: typeof SETTINGS_CORE_DESCRIPTOR_KEY;
  status: "draft" | "validated" | "invalid" | "publishing" | "activation_failed" | "rollback_draft";
  value: number;
  basePublicationVersion: number;
  version: number;
  changeReason: string;
  createdAt: string;
  updatedAt: string;
  validationRevision: number | null;
  rollbackOfPublicationId: string | null;
};
export type SettingsValidationIssue = {
  code: string;
  severity: SettingsValidationSeverity;
  field: "value" | "changeReason" | "publication";
  message: string;
};
export type SettingsValidationResult = {
  draftId: string;
  draftVersion: number;
  validationRevision: number;
  status: "validated" | "invalid";
  issues: SettingsValidationIssue[];
  validatedAt: string;
};
export type SettingsSafeDiff = {
  draftId: string;
  draftVersion: number;
  descriptorKey: typeof SETTINGS_CORE_DESCRIPTOR_KEY;
  changes: Array<{ field: "value"; before: number; after: number; sensitivity: "public" }>;
  secretChangeCount: 0;
  restartRequired: false;
  affectedServices: ["dashboard"];
};
export type SettingsPublication = {
  id: string;
  generation: string;
  version: number;
  sourceDraftId: string;
  sourceDraftVersion: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  readiness: SettingsReadiness;
};
export type SettingsHistoryEntry = {
  publicationId: string;
  generation: string;
  version: number;
  status: "published" | "superseded" | "activation_failed" | "rolled_back";
  descriptorKeys: [typeof SETTINGS_CORE_DESCRIPTOR_KEY];
  changeReason: string;
  publishedAt: string;
  rollbackOfPublicationId: string | null;
  auditEventId: string;
};

export const MEDIA_VARIANT_ROLES = ["original", "thumbnail", "small", "medium", "large"] as const;
export type MediaVariantRole = typeof MEDIA_VARIANT_ROLES[number];
export type MediaRetryBindingV1 = {
  jobId: string;
  jobVersion: number;
  variants: Array<{ role: MediaVariantRole; expectedVersion: number }>;
};
export type MediaRetryRequestV1 = {
  expectedAssetVersion: number;
  expectedJobId: string;
  expectedJobVersion: number;
  variants: MediaRetryBindingV1["variants"];
};
export type MediaRetryResponseV1 = { jobId: string; assetId: string; jobVersion: number; assetVersion: number; retryGeneration: number };

export const DATA_JOB_IMPORT_STATUSES = ["awaiting_upload", "uploaded", "parsing", "preview_ready", "preview_failed", "commit_queued", "committing", "completed", "completed_with_errors", "failed", "cancelled", "expired"] as const;
export const DATA_JOB_EXPORT_STATUSES = ["queued", "running", "completed", "failed", "cancelled", "expired"] as const;
export type DataJobImportStatus = (typeof DATA_JOB_IMPORT_STATUSES)[number];
export type DataJobExportStatus = (typeof DATA_JOB_EXPORT_STATUSES)[number];
export type DataJobCreateImportRequestV1 = { object_key: "foundation.sample"; filename: string; content_type: "text/csv"; byte_size: number };
export type DataJobCreateImportResponseV1 = { id: string; object_key: "foundation.sample"; status: "awaiting_upload"; upload: { method: "PUT"; endpoint: string; token: string; expires_at: string }; version: number };
export type DataJobCommitRequestV1 = { mode: "valid_rows"; expected_version: number };
export type DataJobCreateExportRequestV1 = { object_key: "foundation.sample"; format: "csv"; query: { filters: string[]; sort: string[] } };
export type DataJobExportDetailV1 = { id: string; object_key: "foundation.sample"; status: DataJobExportStatus; formula_version: "foundation.sample.export.v1"; row_count: number; byte_size: number; sha256: string; expires_at: string; version: number };

export type JobSafeSummaryV1 = { schemaVersion: "job-summary.v1"; entries: Record<string, string | number | boolean | null> };
export type JobSafeErrorSummaryV1 = JobSafeSummaryV1 & { code: string; failureClass: "transient" | "permanent" | "validation" | "authorization" | "conflict" | "provider_unavailable" | "rate_limited" | "cancelled" | "timeout" | "partial_failure" | "internal"; retryable: boolean };
export type JobArtifactMetadataV1 = { id: string; contractVersion: "job-artifact.v1"; artifactType: string; displayName: string; contentType: string; byteCount: number; checksumAlgorithm: "sha256"; checksumDigest: string; createdAt: string; expiresAt: string; deletedAt?: string; sensitivity: string; available: boolean };
export type LegacyJobAdapterV1 = { source: "email" | "erp" | "catalog"; adapterVersion: "legacy.email-delivery.v1" | "legacy.erp-sync.v1" | "legacy.catalog-sync.v1"; readOnly: true; execution: "legacy"; status: "ready" | "unavailable"; counts: Partial<Record<"queued"|"running"|"succeeded"|"partially_succeeded"|"failed"|"cancelled",number>>; oldestQueuedAt?: string; latestUpdatedAt?: string };
export type LegacyJobAdapterResultV1 = { data: LegacyJobAdapterV1[]; meta: { requestId: string; completion: "complete" | "partial"; capturedAt: string } };

export type PaymentInitiateMeta = {
  provider: "manual" | "moneris" | "demo";
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
  amountCents?: number;
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
  dealerLocationId?: string;
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
  /** All active variant SKU identities on the product (list payloads carry them for storefront search matching). */
  variantSkus?: { skuCode: string; manufacturerPartNumber?: string | null }[];
  name: string;
  category: string;
  /** Canonical category slug from the Website API; the business key for category matching. */
  categorySlug?: string;
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
  /** English-only review seed summary (en-CA only): average + count == published rows. */
  ratingSummary?: ProductRatingSummary;
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
  category?: string | {
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
  specifications?: Array<{ key: string; value: string }> | Record<string, string>;
  dimensions?: string | null;
  finishOptions?: ProductFinishOption[];
  manufacturerPartNumber?: string | null;
  variantSkus?: { skuCode: string; manufacturerPartNumber?: string | null }[];
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
  skuId: string;
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

export type StorefrontDealerLocation = {
  /** DealerLocation ID — the storefront fulfillment identity. */
  id: string;
  dealerLocationId?: string;
  dealerId: string;
  code?: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  availableForPickup: boolean;
  availableForDelivery?: boolean;
};

/**
 * Dealer master projection for the storefront directory. A Dealer is visible
 * as soon as it is active — even with zero active locations — while
 * fulfillment and map markers are derived from `locations`.
 */
export type StorefrontDealerSummary = {
  /** Dealer master ID. */
  id: string;
  code?: string;
  name: string;
  status: string;
  phone?: string;
  email?: string;
  website?: string;
  locations: StorefrontDealerLocation[];
};

/** @deprecated Location-level storefront projection; use `StorefrontDealerLocation`. */
export type Dealer = StorefrontDealerLocation;

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

export type CustomerAccountUpdateInput = Pick<CustomerAccount, "firstName" | "lastName" | "phone">;

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

export const CHECKOUT_SESSION_STATUSES = [
  "pending",
  "paid",
  "failed",
  "expired",
  "reconciliation_required",
  "refund_pending",
  "refund_processing",
  "refunded",
  "refund_failed"
] as const;

export type CheckoutSessionStatus = (typeof CHECKOUT_SESSION_STATUSES)[number];

export type CheckoutSession = {
  id: string;
  status: CheckoutSessionStatus;
  fulfillment: FulfillmentType;
  paymentMethod: "card" | "pos" | "cash";
  expiresAt: string;
  subtotal: Money;
  tax: Money;
  shipping: Money;
  total: Money;
  guestOrderToken?: string;
  orderId?: string;
  shippingAddress?: ShippingAddress;
};

export type PaymentCallbackInput = {
  sessionId: string;
  status: "paid";
  providerPaymentId?: string;
  ticket?: string;
};

export type PaymentCallbackResult =
  | CommerceOrder
  | { accepted: true; status: "processing" };

export type ProductCommerceQuery = {
  productIds: string[];
  dealerId?: string;
  postalCode?: string;
  customerGroup?: "retail" | "dealer" | "contractor";
  couponCode?: string;
  asOf?: string;
};

export type WebsiteProductCommerce = {
  productId: string;
  slug: string;
  skus: Array<{
    id: string;
    skuCode: string;
    name: string;
    attributes?: unknown;
    price: (Money & { amountCents: number }) | null;
    erpMappings: Array<{ erpSystem: string; erpSkuKey: string }>;
  }>;
};

export type WebsiteProductInventorySummary = {
  productId: string;
  sku: string;
  totalAvailable: number;
  updatedAt: string | null;
};

export type ProductInventoryQuery = {
  productIds: string[];
  skuCode?: string;
  dealerId?: string;
  postalCode?: string;
  fulfillment?: FulfillmentType;
  quantity?: number;
  includeNearby?: boolean;
  asOf?: string;
};

export type InventoryReservationInput = {
  productId: string;
  dealerLocationId: string;
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
  dashboardFoundation: "/dashboard/foundation",
  dashboardAuthorization: "/dashboard/authorization",
  dashboardSettingsOverview: "/dashboard/settings/overview",
  dashboardSettingsRegistry: "/dashboard/settings/registry",
  dashboardSettingsDrafts: "/dashboard/settings/drafts",
  dashboardSettingsDraft: (draftId: string) => `/dashboard/settings/drafts/${draftId}`,
  dashboardSettingsDraftValidate: (draftId: string) => `/dashboard/settings/drafts/${draftId}/validate`,
  dashboardSettingsDraftDiff: (draftId: string) => `/dashboard/settings/drafts/${draftId}/diff`,
  dashboardSettingsDraftPublish: (draftId: string) => `/dashboard/settings/drafts/${draftId}/publish`,
  dashboardSettingsHistory: "/dashboard/settings/history",
  dashboardSettingsRollbackDraft: (publicationId: string) => `/dashboard/settings/history/${publicationId}/rollback-draft`,
  dashboardSettingsReadiness: "/dashboard/settings/readiness",
  dashboardS02SettingsDrafts: "/dashboard/settings/s02-drafts",
  dashboardS02SettingsDraft: (draftId: string) => `/dashboard/settings/s02-drafts/${draftId}`,
  dashboardS02SettingsDraftValidate: (draftId: string) => `/dashboard/settings/s02-drafts/${draftId}/validate`,
  dashboardS02SettingsDraftDiff: (draftId: string) => `/dashboard/settings/s02-drafts/${draftId}/diff`,
  dashboardS02SettingsDraftPublish: (draftId: string) => `/dashboard/settings/s02-drafts/${draftId}/publish`,
  dashboardS02SettingsHistory: "/dashboard/settings/s02-history",
  dashboardS02SettingsRollbackDraft: (publicationId: string) => `/dashboard/settings/s02-history/${publicationId}/rollback-draft`,
  dashboardS02SettingsReadiness: "/dashboard/settings/s02-readiness",
  dashboardS09SettingsOverview: "/dashboard/settings/s09-overview",
  dashboardS09SettingsDrafts: "/dashboard/settings/s09-drafts",
  dashboardS09SettingsDraft: (draftId: string) => `/dashboard/settings/s09-drafts/${draftId}`,
  dashboardS09SettingsDraftValidate: (draftId: string) => `/dashboard/settings/s09-drafts/${draftId}/validate`,
  dashboardS09SettingsDraftDiff: (draftId: string) => `/dashboard/settings/s09-drafts/${draftId}/diff`,
  dashboardS09SettingsDraftPublish: (draftId: string) => `/dashboard/settings/s09-drafts/${draftId}/publish`,
  dashboardS09SettingsHistory: "/dashboard/settings/s09-history",
  dashboardS09SettingsRollbackDraft: (publicationId: string) => `/dashboard/settings/s09-history/${publicationId}/rollback-draft`,
  dashboardS09SettingsReadiness: "/dashboard/settings/s09-readiness",
  dashboardS09SettingsImpactPreview: "/dashboard/settings/s09-impact-preview",
  dashboardS09SettingsSessionRevoke: "/dashboard/settings/s09-session-revoke",
  dashboardS10SettingsOverview: "/dashboard/settings/s10-overview",
  dashboardS10SettingsDrafts: "/dashboard/settings/s10-drafts",
  dashboardS10SettingsDraft: (draftId: string) => `/dashboard/settings/s10-drafts/${draftId}`,
  dashboardS10SettingsDraftValidate: (draftId: string) => `/dashboard/settings/s10-drafts/${draftId}/validate`,
  dashboardS10SettingsDraftDiff: (draftId: string) => `/dashboard/settings/s10-drafts/${draftId}/diff`,
  dashboardS10SettingsDraftPublish: (draftId: string) => `/dashboard/settings/s10-drafts/${draftId}/publish`,
  dashboardS10SettingsHistory: "/dashboard/settings/s10-history",
  dashboardS10SettingsRollbackDraft: (publicationId: string) => `/dashboard/settings/s10-history/${publicationId}/rollback-draft`,
  dashboardS10SettingsReadiness: "/dashboard/settings/s10-readiness",
  dashboardS10SettingsImpactPreview: "/dashboard/settings/s10-impact-preview",
  dashboardS03SettingsOverview: "/dashboard/settings/s03-overview",
  dashboardS03SettingsDrafts: "/dashboard/settings/s03-drafts",
  dashboardS03SettingsDraft: (draftId: string) => `/dashboard/settings/s03-drafts/${draftId}`,
  dashboardS03SettingsDraftValidate: (draftId: string) => `/dashboard/settings/s03-drafts/${draftId}/validate`,
  dashboardS03SettingsDraftDiff: (draftId: string) => `/dashboard/settings/s03-drafts/${draftId}/diff`,
  dashboardS03SettingsDraftPublish: (draftId: string) => `/dashboard/settings/s03-drafts/${draftId}/publish`,
  dashboardS03SettingsHistory: "/dashboard/settings/s03-history",
  dashboardS03SettingsRollbackDraft: (publicationId: string) => `/dashboard/settings/s03-history/${publicationId}/rollback-draft`,
  dashboardS03SettingsReadiness: "/dashboard/settings/s03-readiness",
  dashboardS03SettingsImpactPreview: "/dashboard/settings/s03-impact-preview",
  dashboardS08SettingsOverview: "/dashboard/settings/s08-overview",
  dashboardS08SettingsDrafts: "/dashboard/settings/s08-drafts",
  dashboardS08SettingsDraft: (draftId: string) => `/dashboard/settings/s08-drafts/${draftId}`,
  dashboardS08SettingsDraftValidate: (draftId: string) => `/dashboard/settings/s08-drafts/${draftId}/validate`,
  dashboardS08SettingsDraftDiff: (draftId: string) => `/dashboard/settings/s08-drafts/${draftId}/diff`,
  dashboardS08SettingsDraftPublish: (draftId: string) => `/dashboard/settings/s08-drafts/${draftId}/publish`,
  dashboardS08SettingsHistory: "/dashboard/settings/s08-history",
  dashboardS08SettingsRollbackDraft: (publicationId: string) => `/dashboard/settings/s08-history/${publicationId}/rollback-draft`,
  dashboardS08SettingsReadiness: "/dashboard/settings/s08-readiness",
  dashboardS08SettingsImpactPreview: "/dashboard/settings/s08-impact-preview",
  dashboardS08ServiceAccounts: "/dashboard/mcp/service-accounts",
  dashboardS08ServiceAccount: (accountId: string) => `/dashboard/mcp/service-accounts/${accountId}`,
  dashboardS08ServiceAccountTokens: (accountId: string) => `/dashboard/mcp/service-accounts/${accountId}/tokens`,
  dashboardS08ServiceAccountTokenRotate: (accountId: string, tokenId: string) => `/dashboard/mcp/service-accounts/${accountId}/tokens/${tokenId}/rotate`,
  dashboardS08InvocationReadModel: "/dashboard/mcp/invocations",
  storefrontConfig: "/storefront/config",
  supportAiChat: "/support/ai-chat",
  dashboardProducts: "/dashboard/products",
  dashboardProduct: (productId: string) => `/dashboard/products/${productId}`,
  dashboardProductSpecifications: (productId: string) => `/dashboard/products/${productId}/specifications`,
  dashboardCatalog: "/dashboard/catalog",
  dashboardStorefrontConfig: "/dashboard/storefront/config",
  dashboardDealerPortalSettings: "/dashboard/dealer-portal/settings",
  dashboardModulesReadiness: "/dashboard/modules/readiness",
  dashboardDataImports: "/dashboard/data-jobs/imports",
  dashboardDataImport: (id: string) => `/dashboard/data-jobs/imports/${id}`,
  dashboardDataImportContent: (id: string) => `/dashboard/data-jobs/imports/${id}/content`,
  dashboardDataImportPreview: (id: string) => `/dashboard/data-jobs/imports/${id}/preview`,
  dashboardDataImportCommit: (id: string) => `/dashboard/data-jobs/imports/${id}/commit`,
  dashboardDataImportCancel: (id: string) => `/dashboard/data-jobs/imports/${id}/cancel`,
  dashboardDataExports: "/dashboard/data-jobs/exports",
  dashboardDataExport: (id: string) => `/dashboard/data-jobs/exports/${id}`,
  dashboardDataExportCancel: (id: string) => `/dashboard/data-jobs/exports/${id}/cancel`,
  dashboardDataExportDownload: (id: string) => `/dashboard/data-jobs/exports/${id}/download`,
  dashboardAnalyticsRelease: (releaseDay: string) => `/dashboard/analytics/releases/${releaseDay}`,
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
  forgotPassword: "/auth/password/forgot",
  resetPassword: "/auth/password/reset",
  currentSession: "/auth/me",
  refreshSession: "/auth/refresh",
  logout: "/auth/logout",
  logoutAll: "/auth/logout-all",
  dealerApplications: "/dealer-applications",
  contactLeads: "/contact/leads"
} as const;
