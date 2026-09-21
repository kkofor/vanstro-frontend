import type { SiteLocale } from "@/lib/i18n/locale";
import type { TabKey } from "./types";

export const DASHBOARD_SECTION_SLUGS = {
  overview: "overview",
  products: "products",
  categories: "categories",
  pricing: "pricing",
  promotions: "promotions",
  inventorySnapshots: "inventory",
  orders: "orders",
  paymentSessions: "payments",
  crmContacts: "customers",
  users: "users",
  roles: "roles",
  dealers: "dealers",
  dealerApplications: "applications",
  contactLeads: "leads",
  productReviews: "reviews",
  supportHandoffs: "support",
  emailOutbox: "email",
  cms: "content",
  operations: "operations",
  erpSyncJobs: "erp",
  auditLogs: "audit",
  settings: "settings"
} as const satisfies Partial<Record<TabKey, string>>;

export const DASHBOARD_SLUG_TO_TAB = Object.fromEntries(
  Object.entries(DASHBOARD_SECTION_SLUGS).map(([tab, slug]) => [slug, tab])
) as Record<string, TabKey>;

export const DASHBOARD_NAV_GROUP_LABELS = {
  workspace: { "en-CA": "Workspace", "fr-CA": "Espace de travail" },
  catalog: { "en-CA": "Catalog", "fr-CA": "Catalogue" },
  commerce: { "en-CA": "Commerce", "fr-CA": "Commerce" },
  organization: { "en-CA": "Organization", "fr-CA": "Organisation" },
  engagement: { "en-CA": "Engagement", "fr-CA": "Engagement" },
  platform: { "en-CA": "Platform", "fr-CA": "Plateforme" }
} as const;

export const DASHBOARD_NAV_GROUPS: Array<{ key: keyof typeof DASHBOARD_NAV_GROUP_LABELS; tabs: TabKey[] }> = [
  { key: "workspace", tabs: ["overview"] },
  { key: "catalog", tabs: ["products", "categories", "pricing", "promotions", "inventorySnapshots"] },
  { key: "commerce", tabs: ["orders", "paymentSessions", "crmContacts"] },
  { key: "organization", tabs: ["users", "roles", "dealers", "dealerApplications"] },
  { key: "engagement", tabs: ["contactLeads", "productReviews", "supportHandoffs", "emailOutbox"] },
  { key: "platform", tabs: ["cms", "operations", "erpSyncJobs", "auditLogs", "settings"] }
];

export function dashboardHref(tab: TabKey, locale: SiteLocale) {
  const prefix = locale === "fr-CA" ? "/fr" : "";
  return tab === "overview" ? `${prefix}/dashboard` : `${prefix}/dashboard/${DASHBOARD_SECTION_SLUGS[tab as keyof typeof DASHBOARD_SECTION_SLUGS]}`;
}
