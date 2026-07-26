import type { TabKey } from "./types";

export const TAB_READ_PERMISSIONS: Record<TabKey, string | string[] | null> = {
  products: "products.read",
  categories: "products.read",
  pricing: "products.read",
  promotions: "products.read",
  users: "users.read",
  roles: "users.read",
  dealers: "settings.write",
  dealerApplications: "dealer_applications.read",
  contactLeads: "leads.read",
  crmContacts: "crm.read",
  productReviews: "reviews.read",
  supportHandoffs: "support.read",
  orders: "orders.read",
  paymentSessions: "orders.read",
  erpSyncJobs: "erp.sync.read",
  inventorySnapshots: "inventory.read",
  cms: "content.read",
  operations: ["audit_logs.read", "analytics.read"],
  emailOutbox: ["email.outbox.read", "email.provider.read", "email.templates.read"],
  auditLogs: "audit_logs.read"
};

export const MUTATION_PERMISSIONS = {
  productsWrite: "products.write",
  categoriesWrite: "categories.write",
  pricingWrite: "pricing.write",
  usersManage: "users.manage",
  leadsUpdate: "leads.update",
  applicationsUpdate: "dealer_applications.update",
  reviewsModerate: "reviews.moderate",
  supportUpdate: "support.update",
  ordersUpdate: "orders.update",
  ordersAssign: "orders.assign",
  crmUpdate: "crm.update",
  crmPromote: "crm.promote",
  erpRetry: "erp.sync.retry",
  emailRetry: "email.outbox.retry",
  emailProviderWrite: "email.provider.write",
  emailTemplatesWrite: "email.templates.write",
  contentWrite: "content.write",
  inventoryWrite: "inventory.write"
} as const;

export function hasPermission(permissions: string[], required: string | string[] | null) {
  if (!required) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((permission) => permissions.includes(permission));
}

export function visibleTabs(permissions: string[], allTabs: TabKey[]) {
  return allTabs.filter((tab) => hasPermission(permissions, TAB_READ_PERMISSIONS[tab]));
}
