import type { QueueFilters, TabKey } from "./types";

export type AlertRoute = {
  tab: TabKey;
  filterKey?: keyof QueueFilters;
  filterValue?: string;
};

const ALERT_ROUTES: Record<string, AlertRoute> = {
  erp_failed: { tab: "erpSyncJobs", filterKey: "erpSyncJobs", filterValue: "failed" },
  erp_retry_wait: { tab: "erpSyncJobs", filterKey: "erpSyncJobs", filterValue: "retry_wait" },
  email_failed: { tab: "emailOutbox" },
  email_retry_wait: { tab: "emailOutbox" },
  contact_leads_new: { tab: "contactLeads", filterKey: "contactLeads", filterValue: "new" },
  dealer_applications_submitted: { tab: "dealerApplications", filterKey: "dealerApplications", filterValue: "submitted" },
  product_reviews_pending: { tab: "productReviews", filterKey: "productReviews", filterValue: "pending" },
  support_handoffs_new: { tab: "supportHandoffs", filterKey: "supportHandoffs", filterValue: "new" }
};

export function resolveAlertRoute(alertKey: string): AlertRoute | undefined {
  return ALERT_ROUTES[alertKey];
}

export function parseTabFromQuery(value: string | null): TabKey | null {
  const tabs: TabKey[] = [
    "products", "categories", "pricing", "promotions", "users", "roles", "dealers",
    "dealerApplications", "contactLeads", "crmContacts", "productReviews", "supportHandoffs",
    "orders", "paymentSessions", "erpSyncJobs", "inventorySnapshots", "cms",
    "operations", "emailOutbox", "auditLogs"
  ];
  return tabs.includes(value as TabKey) ? (value as TabKey) : null;
}
