import type { DashboardCopy } from "@/lib/i18n/dashboard-copy";

export type DashboardUser = {
  id: string;
  email: string;
  permissions: string[];
  roles: string[];
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T;
  meta: PageMeta;
};

export type TabKey =
  | "products"
  | "categories"
  | "pricing"
  | "promotions"
  | "users"
  | "roles"
  | "dealers"
  | "dealerApplications"
  | "contactLeads"
  | "crmContacts"
  | "productReviews"
  | "supportHandoffs"
  | "orders"
  | "paymentSessions"
  | "erpSyncJobs"
  | "inventorySnapshots"
  | "cms"
  | "operations"
  | "emailOutbox"
  | "auditLogs";

export type CmsSubTab =
  | "navigation"
  | "homePage"
  | "footer"
  | "legalPages"
  | "articles"
  | "catalogConfig"
  | "storefrontConfig"
  | "moduleReadiness";

export type QueueFilters = {
  contactLeads: string;
  crmContacts: string;
  dealerApplications: string;
  productReviews: string;
  supportHandoffs: string;
  orders: string;
  erpSyncJobs: string;
};

export type QueuePagination = {
  contactLeads: number;
  crmContacts: number;
  dealerApplications: number;
  productReviews: number;
  supportHandoffs: number;
  orders: number;
  paymentSessions: number;
  erpSyncJobs: number;
  inventorySnapshots: number;
  emailOutbox: number;
  auditLogs: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  status: string;
  description?: string | null;
  category?: Category | null;
  skus?: Array<{
    id: string;
    skuCode: string;
    name: string;
    status?: string;
    prices?: Array<{ id?: string; amountCents: number; currency: string; status: string }>;
    erpMappings?: Array<{
      id?: string;
      erpSystem: string;
      erpSkuKey: string;
      erpProductId?: number | null;
      erpSkuId?: number | null;
    }>;
  }>;
  assets?: Array<{ id: string; url: string; altText?: string | null; sortOrder?: number }>;
  specifications?: Array<{ id: string; key?: string; label?: string; value: string; sortOrder?: number }>;
  manufacturerPartNumber?: string | null;
  brand?: string | null;
  shortDescription?: string | null;
  productHighlights?: unknown;
};

export type Price = {
  id: string;
  key: string;
  amountCents: number;
  currency: string;
  status: string;
  sku?: { id?: string; skuCode: string; product?: { name: string } };
};

export type Promotion = {
  id: string;
  key: string;
  name: string;
  status: string;
  discountLabel?: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  kind: string;
  status: string;
  adminProfile?: { displayName?: string | null } | null;
  userRoles?: Array<{ role: { key: string; name: string } }>;
};

export type Role = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  rolePermissions?: Array<{ permission: { key: string } }>;
};

export type Dealer = {
  id: string;
  code: string;
  name: string;
  status: string;
  locations?: Array<{ id?: string; code?: string; name: string; city?: string | null; province?: string | null }>;
};

export type NoteRecord = { note: string; createdAt: string };

export type DealerApplication = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  status: string;
  message?: string | null;
  notes?: NoteRecord[];
};

export type CrmContactRecord = {
  id: string;
  userId?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  stage: string;
  source: string;
  erpSyncStatus: string;
  lastActivityAt: string;
  createdAt: string;
};

export type CrmContactDetail = CrmContactRecord & {
  events: Array<{ id: string; type: string; payload?: unknown; createdAt: string }>;
  notes: NoteRecord[];
  orders: Array<{ id: string; status: string; totalCents: number; currency: string; itemCount: number; createdAt: string }>;
  erpLinks: Array<{ id: string; erpCustomerId: string; erpSystem: string }>;
  syncJobs: Array<{ id: string; status: string; lastError?: string | null; externalId?: string | null; createdAt: string }>;
  relatedLead?: { id: string; status: string; topic: string; createdAt: string } | null;
};

export type ContactLead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  topic: string;
  city?: string | null;
  preferredDealer?: string | null;
  orderNumber?: string | null;
  message: string;
  status: string;
  assignedToUserId?: string | null;
  assignedDealerId?: string | null;
  notes?: NoteRecord[];
};

export type ProductReviewQueueItem = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  nickname: string;
  email: string;
  status: string;
  product?: { name: string; slug: string } | null;
  notes?: NoteRecord[];
};

export type SupportHandoffItem = {
  id: string;
  channel: string;
  sourcePath: string;
  status: string;
  dealerId?: string | null;
  cartId?: string | null;
  transcript?: unknown;
  createdAt: string;
};

export type EmailOutboxItem = {
  id: string;
  templateKey?: string | null;
  toEmail: string;
  subject?: string | null;
  status: string;
  attemptCount: number;
  lastError?: string | null;
  createdAt: string;
};

export type EmailTemplateVersionItem = {
  id: string;
  version: number;
  subject: string;
  bodyText?: string | null;
  bodyHtml?: string | null;
  isPublished: boolean;
};

export type EmailTemplateItem = {
  id: string;
  key: string;
  name: string;
  status?: string;
  versions?: EmailTemplateVersionItem[];
};

export type EmailProviderAccount = {
  id?: string;
  key: string;
  provider: string;
  status: string;
  settings: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    from?: string;
    requireTls?: boolean;
  };
};

export type AuditLogRecord = {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  createdAt: string;
};

export type OperationalAlert = {
  key: string;
  severity: "warning" | "critical";
  title: string;
  count: number;
  actionPath: string;
};

export type AnalyticsSummary = {
  since: string;
  pageViews: number;
  uniqueSessions: number;
  topPaths: Array<{ path: string; count: number }>;
  funnel: { checkoutSessions: number; paidOrders: number };
  alerts?: OperationalAlert[];
};

export type OrderItem = {
  id: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type OrderRecord = {
  id: string;
  status: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  fulfillment: string;
  totalCents: number;
  currency: string;
  dealerId?: string | null;
  dealerLocationId?: string | null;
  createdAt: string;
  items?: OrderItem[];
  statusEvents?: OrderStatusEventRecord[];
};

export type PaymentSessionRecord = {
  id: string;
  status: string;
  guestEmail: string;
  totalCents: number;
  currency: string;
  fulfillment?: string | null;
  paymentMethod?: string | null;
  expiresAt: string;
  createdAt: string;
};

export type OrderStatusEventRecord = {
  id: string;
  status: string;
  source: string;
  payload?: unknown;
  createdAt: string;
};

export type ErpSyncJobRecord = {
  id: string;
  type: string;
  status: string;
  attemptCount: number;
  lastError?: string | null;
  createdAt: string;
  payload?: unknown;
};

export type InventorySnapshotRecord = {
  id: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  sku?: { skuCode: string; name: string; product?: { name: string } };
  dealerLocation?: { code: string; name: string; province?: string | null };
};

export type LegalPageSummary = { slug: string; title: string; locale: string; status: string };
export type ArticleRecord = {
  id: string;
  slug: string;
  title: string;
  status: string;
  locale: string;
  publishedAt?: string | null;
};

export type DashboardStats = {
  products: number;
  categories: number;
  prices: number;
  promotions: number;
  users: number;
  dealers: number;
  applications: number;
  leads: number;
  crmContacts: number;
  reviews: number;
  opsAlerts: number;
  orders: number;
};

export type DashboardData = {
  categories: Category[];
  products: Product[];
  pricing: Price[];
  promotions: Promotion[];
  users: AdminUser[];
  roles: Role[];
  dealers: Dealer[];
  dealerApplications: DealerApplication[];
  contactLeads: ContactLead[];
  crmContacts: CrmContactRecord[];
  productReviews: ProductReviewQueueItem[];
  supportHandoffs: SupportHandoffItem[];
  orders: OrderRecord[];
  paymentSessions: PaymentSessionRecord[];
  erpSyncJobs: ErpSyncJobRecord[];
  inventorySnapshots: InventorySnapshotRecord[];
  operationAlerts: OperationalAlert[];
  analyticsSummary: AnalyticsSummary | null;
  emailOutbox: EmailOutboxItem[];
  emailTemplates: EmailTemplateItem[];
  emailProvider: EmailProviderAccount | null;
  auditLogs: AuditLogRecord[];
  legalPages: LegalPageSummary[];
  articles: ArticleRecord[];
  cmsNavigation: unknown;
  cmsHomePage: unknown;
  cmsFooter: unknown;
  cmsCatalogConfig: unknown;
  cmsStorefrontConfig: unknown;
  moduleReadiness: unknown;
};

export type DashboardContext = {
  copy: DashboardCopy;
  locale: string;
  token: string;
  permissions: string[];
  onAction: (
    path: string,
    body: Record<string, unknown>,
    options: { method?: string; success: string }
  ) => Promise<void>;
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  reloadTab: () => Promise<void>;
};

export type StatusDomain = keyof DashboardCopy["statusValues"];
