import { prisma, type Prisma } from "@vanstro/db";
import { type Context, type Next } from "hono";
import { getRequestIp, getSessionFromRequest } from "../auth/session.js";
import { hasGlobalPermission, permissionGrant, resolveDashboardAuthorization } from "./authorization.js";
import { consumeStrictQueryLimit } from "./strict-query-rate-limit.js";
import { publicError } from "../public-errors.js";
import { dashboardCommonQueryReadiness } from "../config.js";

export type DashboardEnv = {
  Variables: {
    actorUserId: string;
    actorSessionId: string;
    actorSessionTokenHash: string;
    actorPermissions: string[];
    actorRoles: string[];
    p02Authorization: Awaited<ReturnType<typeof resolveDashboardAuthorization>>;
  };
};

type DashboardPermissionRule = {
  method: string;
  path: string;
  permission: string;
};

export const DASHBOARD_PERMISSION_RULES: DashboardPermissionRule[] = [
  { method: "GET", path: "/dashboard/foundation", permission: "dashboard.access" },
  { method: "GET", path: "/dashboard/authorization", permission: "dashboard.access" },
  { method: "GET", path: "/dashboard/access/memberships", permission: "users.read" },
  { method: "GET", path: "/dashboard/access/memberships/:id", permission: "users.read" },
  { method: "POST", path: "/dashboard/access/memberships", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/access/memberships/:id", permission: "users.manage" },
  { method: "GET", path: "/dashboard/access/dealers", permission: "dealers.read" },
  { method: "GET", path: "/dashboard/access/dealers/:dealerId", permission: "dealers.read" },
  { method: "GET", path: "/dashboard/access/dealers/:dealerId/locations", permission: "dealers.read" },
  { method: "PATCH", path: "/dashboard/access/dealer-locations/:id", permission: "settings.write" },
  { method: "GET", path: "/dashboard/overview", permission: "dashboard.access" },
  { method: "GET", path: "/dashboard/permissions", permission: "users.read" },
  { method: "GET", path: "/dashboard/roles", permission: "users.read" },
  { method: "POST", path: "/dashboard/roles", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/roles/:id", permission: "users.manage" },
  { method: "PUT", path: "/dashboard/roles/:id/permissions", permission: "users.manage" },
  { method: "GET", path: "/dashboard/users", permission: "users.read" },
  { method: "GET", path: "/dashboard/users/:id", permission: "users.read" },
  { method: "POST", path: "/dashboard/users", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/users/:id", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/users/:id/status", permission: "users.manage" },
  { method: "POST", path: "/dashboard/users/:id/roles", permission: "users.manage" },
  { method: "DELETE", path: "/dashboard/users/:id/roles/:roleId", permission: "users.manage" },
  { method: "POST", path: "/dashboard/users/:id/addresses", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/users/:id/addresses/:addressId", permission: "users.manage" },
  { method: "DELETE", path: "/dashboard/users/:id/addresses/:addressId", permission: "users.manage" },
  { method: "GET", path: "/dashboard/categories", permission: "products.read" },
  { method: "GET", path: "/dashboard/categories/:id", permission: "products.read" },
  { method: "POST", path: "/dashboard/categories", permission: "categories.write" },
  { method: "PATCH", path: "/dashboard/categories/:id", permission: "categories.write" },
  { method: "DELETE", path: "/dashboard/categories/:id", permission: "categories.write" },
  { method: "GET", path: "/dashboard/products", permission: "products.read" },
  { method: "GET", path: "/dashboard/products/:id", permission: "products.read" },
  { method: "POST", path: "/dashboard/products", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/products/:id", permission: "products.write" },
  { method: "DELETE", path: "/dashboard/products/:id", permission: "products.write" },
  { method: "GET", path: "/dashboard/products/:id/specifications", permission: "products.read" },
  { method: "POST", path: "/dashboard/products/:id/specifications", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/products/:productId/specifications/:specId", permission: "products.write" },
  { method: "DELETE", path: "/dashboard/products/:productId/specifications/:specId", permission: "products.write" },
  { method: "POST", path: "/dashboard/products/:id/skus", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/skus/:id", permission: "products.write" },
  { method: "DELETE", path: "/dashboard/skus/:id", permission: "products.write" },
  { method: "POST", path: "/dashboard/products/:id/assets", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/assets/:id", permission: "products.write" },
  { method: "DELETE", path: "/dashboard/assets/:id", permission: "products.write" },
  { method: "GET", path: "/dashboard/sku-mappings", permission: "products.read" },
  { method: "POST", path: "/dashboard/batch/import", permission: "dashboard.access" },
  { method: "GET", path: "/dashboard/batch/import/:jobId", permission: "dashboard.access" },
  { method: "POST", path: "/dashboard/batch/import/:jobId/retry", permission: "dashboard.access" },
  { method: "GET", path: "/dashboard/erp/webhooks", permission: "settings.write" },
  { method: "POST", path: "/dashboard/erp/webhooks", permission: "settings.write" },
  { method: "DELETE", path: "/dashboard/erp/webhooks/:id", permission: "settings.write" },
  { method: "GET", path: "/dashboard/erp/openapi", permission: "erp.sync.read" },
  { method: "POST", path: "/dashboard/erp/connection-test", permission: "settings.write" },
  { method: "POST", path: "/dashboard/sku-mappings", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/sku-mappings/:id", permission: "products.write" },
  { method: "DELETE", path: "/dashboard/sku-mappings/:id", permission: "products.write" },
  { method: "POST", path: "/dashboard/catalog/sync-from-erp", permission: "products.write" },
  { method: "GET", path: "/dashboard/catalog/sync-runs/latest", permission: "products.read" },
  { method: "POST", path: "/dashboard/products/:id/refresh-erp-colors", permission: "products.write" },
  { method: "GET", path: "/dashboard/pricing", permission: "products.read" },
  { method: "POST", path: "/dashboard/pricing", permission: "pricing.write" },
  { method: "PATCH", path: "/dashboard/pricing/:id", permission: "pricing.write" },
  { method: "DELETE", path: "/dashboard/pricing/:id", permission: "pricing.write" },
  { method: "GET", path: "/dashboard/promotions", permission: "products.read" },
  { method: "POST", path: "/dashboard/promotions", permission: "pricing.write" },
  { method: "PATCH", path: "/dashboard/promotions/:id", permission: "pricing.write" },
  { method: "DELETE", path: "/dashboard/promotions/:id", permission: "pricing.write" },
  { method: "GET", path: "/dashboard/dealers", permission: "dealers.read" },
  { method: "GET", path: "/dashboard/dealers/:id", permission: "dealers.read" },
  { method: "GET", path: "/dashboard/dealers/:id/dependencies", permission: "dealers.read" },
  { method: "POST", path: "/dashboard/dealers", permission: "settings.write" },
  { method: "PATCH", path: "/dashboard/dealers/:id", permission: "settings.write" },
  { method: "DELETE", path: "/dashboard/dealers/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/dealers/:id/locations", permission: "settings.write" },
  { method: "POST", path: "/dashboard/dealers/:id/erp-links", permission: "settings.write" },
  { method: "DELETE", path: "/dashboard/dealers/:dealerId/erp-links/:linkId", permission: "settings.write" },
  { method: "PATCH", path: "/dashboard/dealer-locations/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/dealer-locations/:id/service-areas", permission: "settings.write" },
  { method: "DELETE", path: "/dashboard/dealer-locations/:locationId/service-areas/:areaId", permission: "settings.write" },
  { method: "GET", path: "/dashboard/dealer-applications", permission: "dealer_applications.read" },
  { method: "GET", path: "/dashboard/dealer-applications/:id", permission: "dealer_applications.read" },
  { method: "PATCH", path: "/dashboard/dealer-applications/:id/status", permission: "dealer_applications.update" },
  { method: "POST", path: "/dashboard/dealer-applications/:id/notes", permission: "dealer_applications.update" },
  { method: "GET", path: "/dashboard/contact-leads", permission: "leads.read" },
  { method: "GET", path: "/dashboard/contact-leads/:id", permission: "leads.read" },
  { method: "PATCH", path: "/dashboard/contact-leads/:id/status", permission: "leads.update" },
  { method: "POST", path: "/dashboard/contact-leads/:id/assign", permission: "leads.update" },
  { method: "POST", path: "/dashboard/contact-leads/:id/notes", permission: "leads.update" },
  { method: "GET", path: "/dashboard/product-reviews", permission: "reviews.read" },
  { method: "GET", path: "/dashboard/product-reviews/:id", permission: "reviews.read" },
  { method: "PATCH", path: "/dashboard/product-reviews/:id/status", permission: "reviews.moderate" },
  { method: "POST", path: "/dashboard/product-reviews/:id/notes", permission: "reviews.moderate" },
  { method: "GET", path: "/dashboard/email/outbox", permission: "email.outbox.read" },
  { method: "POST", path: "/dashboard/email/outbox/:id/retry", permission: "email.outbox.retry" },
  { method: "GET", path: "/dashboard/mcp/service-accounts", permission: "service_accounts.manage" },
  { method: "POST", path: "/dashboard/mcp/service-accounts", permission: "service_accounts.manage" },
  { method: "PATCH", path: "/dashboard/mcp/service-accounts/:id", permission: "service_accounts.manage" },
  { method: "GET", path: "/dashboard/mcp/service-accounts/:id/tokens", permission: "service_accounts.manage" },
  { method: "POST", path: "/dashboard/mcp/service-accounts/:id/tokens", permission: "service_accounts.manage" },
  { method: "POST", path: "/dashboard/mcp/service-accounts/:id/tokens/:tokenId/rotate", permission: "service_accounts.manage" },
  { method: "DELETE", path: "/dashboard/mcp/service-accounts/:id/tokens/:tokenId", permission: "service_accounts.manage" },
  { method: "GET", path: "/dashboard/mcp/invocations", permission: "service_accounts.manage" },
  { method: "GET", path: "/dashboard/audit-logs", permission: "audit_logs.read" },
  { method: "GET", path: "/dashboard/audit-logs/:id", permission: "audit_logs.read" },
  { method: "GET", path: "/dashboard/operations/alerts", permission: "audit_logs.read" },
  { method: "GET", path: "/dashboard/jobs", permission: "jobs.read" },
  { method: "GET", path: "/dashboard/jobs/adapters", permission: "jobs.read" },
  { method: "GET", path: "/dashboard/jobs/:id", permission: "jobs.read" },
  { method: "POST", path: "/dashboard/jobs", permission: "jobs.create" },
  { method: "POST", path: "/dashboard/jobs/:id/cancel", permission: "jobs.cancel" },
  { method: "POST", path: "/dashboard/jobs/:id/retry", permission: "jobs.retry" },
  { method: "GET", path: "/dashboard/work-queue", permission: "work_queue.read" },
  { method: "GET", path: "/dashboard/work-queue/adapters", permission: "work_queue.read" },
  { method: "GET", path: "/dashboard/work-queue/:id", permission: "work_queue.read" },
  { method: "POST", path: "/dashboard/work-queue/:id/assign", permission: "work_queue.assign" },
  { method: "POST", path: "/dashboard/work-queue/:id/unassign", permission: "work_queue.assign" },
  { method: "POST", path: "/dashboard/work-queue/:id/acknowledge", permission: "work_queue.acknowledge" },
  { method: "POST", path: "/dashboard/work-queue/:id/resolve", permission: "work_queue.resolve" },
  { method: "POST", path: "/dashboard/work-queue/:id/dismiss", permission: "work_queue.dismiss" },
  { method: "POST", path: "/dashboard/work-queue/:id/reopen", permission: "work_queue.reopen" },
  { method: "GET", path: "/dashboard/notifications", permission: "notifications.read" },
  { method: "GET", path: "/dashboard/notifications/:id", permission: "notifications.read" },
  { method: "POST", path: "/dashboard/notifications/:id/read", permission: "notifications.mark_read" },
  { method: "GET", path: "/dashboard/media", permission: "media.read" },
  { method: "GET", path: "/dashboard/media/adapters", permission: "media.read" },
  { method: "GET", path: "/dashboard/media/:id", permission: "media.read" },
  { method: "GET", path: "/dashboard/media/:id/usages", permission: "media.read" },
  { method: "POST", path: "/dashboard/media/upload-intents", permission: "media.create" },
  { method: "PUT", path: "/dashboard/media/upload-intents/:id/content", permission: "media.create" },
  { method: "PATCH", path: "/dashboard/media/:id/metadata", permission: "media.update" },
  { method: "POST", path: "/dashboard/media/:id/usages", permission: "media.update" },
  { method: "DELETE", path: "/dashboard/media/:id/usages/:usageId", permission: "media.update" },
  { method: "POST", path: "/dashboard/media/:id/variants/retry", permission: "media.manage_variants" },
  { method: "POST", path: "/dashboard/media/:id/archive", permission: "media.archive" },
  { method: "POST", path: "/dashboard/media/:id/restore", permission: "media.restore" },
  { method: "GET", path: "/dashboard/media/:id/preview/:variantId", permission: "media.read" },
  { method: "GET", path: "/dashboard/media/:id/download-original", permission: "media.download_original" },
  { method: "POST", path: "/dashboard/data-jobs/imports", permission: "dashboard.import.foundation_sample.create" },
  { method: "PUT", path: "/dashboard/data-jobs/imports/:id/content", permission: "dashboard.import.foundation_sample.create" },
  { method: "GET", path: "/dashboard/data-jobs/imports", permission: "dashboard.import.foundation_sample.read" },
  { method: "GET", path: "/dashboard/data-jobs/imports/:id", permission: "dashboard.import.foundation_sample.read" },
  { method: "GET", path: "/dashboard/data-jobs/imports/:id/preview", permission: "dashboard.import.foundation_sample.read" },
  { method: "POST", path: "/dashboard/data-jobs/imports/:id/commit", permission: "dashboard.import.foundation_sample.commit" },
  { method: "POST", path: "/dashboard/data-jobs/imports/:id/cancel", permission: "dashboard.import.foundation_sample.create" },
  { method: "POST", path: "/dashboard/data-jobs/exports", permission: "dashboard.export.foundation_sample.create" },
  { method: "GET", path: "/dashboard/data-jobs/exports", permission: "dashboard.export.foundation_sample.read" },
  { method: "GET", path: "/dashboard/data-jobs/exports/:id", permission: "dashboard.export.foundation_sample.read" },
  { method: "POST", path: "/dashboard/data-jobs/exports/:id/cancel", permission: "dashboard.export.foundation_sample.create" },
  { method: "GET", path: "/dashboard/data-jobs/exports/:id/download", permission: "dashboard.export.foundation_sample.download" },
  { method: "GET", path: "/dashboard/runtime/config", permission: "config.read" },
  { method: "GET", path: "/dashboard/runtime/config/:key", permission: "config.read" },
  { method: "POST", path: "/dashboard/runtime/config/:key/versions", permission: "config.manage" },
  { method: "POST", path: "/dashboard/runtime/config/:key/activate", permission: "config.activate" },
  { method: "POST", path: "/dashboard/runtime/config/:key/retry", permission: "config.activate" },
  { method: "POST", path: "/dashboard/runtime/config/:key/rollback", permission: "config.manage" },
  { method: "GET", path: "/dashboard/runtime/flags", permission: "flags.read" },
  { method: "GET", path: "/dashboard/runtime/flags/:key", permission: "flags.read" },
  { method: "POST", path: "/dashboard/runtime/flags/:key/versions", permission: "flags.manage" },
  { method: "POST", path: "/dashboard/runtime/flags/:key/activate", permission: "flags.manage" },
  { method: "POST", path: "/dashboard/runtime/flags/:key/kill", permission: "flags.kill_switch" },
  { method: "POST", path: "/dashboard/runtime/flags/:key/evaluate", permission: "flags.read" },
  { method: "GET", path: "/dashboard/runtime/readiness/summary", permission: "readiness.read_summary" },
  { method: "GET", path: "/dashboard/runtime/readiness/detail", permission: "readiness.read_detail" },
  { method: "GET", path: "/dashboard/settings/overview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/registry", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/drafts", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/drafts", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/drafts/:id", permission: "settings.read" },
  { method: "PATCH", path: "/dashboard/settings/drafts/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/settings/drafts/:id/validate", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/drafts/:id/diff", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/drafts/:id/publish", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/history", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/history/:publicationId/rollback-draft", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/readiness", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s02-drafts", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s02-drafts", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s02-drafts/:id", permission: "settings.read" },
  { method: "PATCH", path: "/dashboard/settings/s02-drafts/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/settings/s02-drafts/:id/validate", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s02-drafts/:id/diff", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s02-drafts/:id/publish", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s02-history", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s02-history/:publicationId/rollback-draft", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s02-readiness", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s09-overview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s09-drafts", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s09-drafts", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s09-drafts/:id", permission: "settings.read" },
  { method: "PATCH", path: "/dashboard/settings/s09-drafts/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/settings/s09-drafts/:id/validate", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s09-drafts/:id/diff", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s09-drafts/:id/publish", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s09-history", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s09-history/:publicationId/rollback-draft", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s09-readiness", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s09-impact-preview", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s09-session-revoke", permission: "sessions.revoke" },
  { method: "GET", path: "/dashboard/settings/s10-overview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s10-drafts", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s10-drafts", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s10-drafts/:id", permission: "settings.read" },
  { method: "PATCH", path: "/dashboard/settings/s10-drafts/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/settings/s10-drafts/:id/validate", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s10-drafts/:id/diff", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s10-drafts/:id/publish", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s10-history", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s10-history/:publicationId/rollback-draft", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s10-readiness", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s10-impact-preview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s03-overview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s03-drafts", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s03-drafts", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s03-drafts/:id", permission: "settings.read" },
  { method: "PATCH", path: "/dashboard/settings/s03-drafts/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/settings/s03-drafts/:id/validate", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s03-drafts/:id/diff", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s03-drafts/:id/publish", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s03-history", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s03-history/:publicationId/rollback-draft", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s03-readiness", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s03-impact-preview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s08-overview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/settings/s08-drafts", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s08-drafts", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s08-drafts/:id", permission: "settings.read" },
  { method: "PATCH", path: "/dashboard/settings/s08-drafts/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/settings/s08-drafts/:id/validate", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s08-drafts/:id/diff", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s08-drafts/:id/publish", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s08-history", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s08-history/:publicationId/rollback-draft", permission: "settings.write" },
  { method: "GET", path: "/dashboard/settings/s08-readiness", permission: "settings.read" },
  { method: "POST", path: "/dashboard/settings/s08-impact-preview", permission: "settings.read" },
  { method: "GET", path: "/dashboard/payment-sessions", permission: "orders.read" },
  { method: "POST", path: "/dashboard/payment-sessions/:id/mark-paid", permission: "orders.update" },
  { method: "GET", path: "/dashboard/payment-reconciliation", permission: "orders.read" },
  { method: "PATCH", path: "/dashboard/payment-reconciliation/:id", permission: "orders.update" },
  { method: "GET", path: "/dashboard/erp-webhook-events", permission: "erp.webhooks.read" },
  { method: "GET", path: "/dashboard/email/provider", permission: "email.provider.read" },
  { method: "PUT", path: "/dashboard/email/provider", permission: "email.provider.write" },
  { method: "POST", path: "/dashboard/email/provider/test", permission: "email.provider.write" },
  { method: "GET", path: "/dashboard/analytics/summary", permission: "analytics.read" },
  { method: "GET", path: "/dashboard/analytics/foundation/registry", permission: "analytics.registry.read" },
  { method: "POST", path: "/dashboard/analytics/events", permission: "analytics.ingest" },
  { method: "GET", path: "/dashboard/analytics/releases/:releaseDay", permission: "analytics.release.read" },
  { method: "GET", path: "/dashboard/analytics/foundation/metrics", permission: "analytics.metrics.read" },
  { method: "GET", path: "/dashboard/analytics/foundation/metrics/:key", permission: "analytics.metrics.read" },
  { method: "GET", path: "/dashboard/analytics/foundation/readiness", permission: "analytics.operations.read" },
  { method: "GET", path: "/dashboard/orders", permission: "orders.read" },
  { method: "GET", path: "/dashboard/orders/:id", permission: "orders.read" },
  { method: "PATCH", path: "/dashboard/orders/:id/status", permission: "orders.update" },
  { method: "POST", path: "/dashboard/orders/:id/assign-dealer", permission: "orders.assign" },
  { method: "GET", path: "/dashboard/inventory/snapshots", permission: "inventory.read" },
  { method: "POST", path: "/dashboard/inventory/snapshots", permission: "inventory.write" },
  { method: "PATCH", path: "/dashboard/inventory/snapshots/:id", permission: "inventory.write" },
  { method: "GET", path: "/dashboard/email/templates", permission: "email.templates.read" },
  { method: "GET", path: "/dashboard/email/templates/:id", permission: "email.templates.read" },
  { method: "POST", path: "/dashboard/email/templates", permission: "email.templates.write" },
  { method: "PATCH", path: "/dashboard/email/templates/:id", permission: "email.templates.write" },
  { method: "POST", path: "/dashboard/email/templates/:id/versions", permission: "email.templates.write" },
  { method: "GET", path: "/dashboard/support/handoffs", permission: "support.read" },
  { method: "PATCH", path: "/dashboard/support/handoffs/:id/status", permission: "support.update" },
  { method: "GET", path: "/dashboard/erp-sync-jobs", permission: "erp.sync.read" },
  { method: "GET", path: "/dashboard/erp-sync-jobs/:id", permission: "erp.sync.read" },
  { method: "POST", path: "/dashboard/erp-sync-jobs/:id/retry", permission: "erp.sync.retry" },
  { method: "DELETE", path: "/dashboard/roles/:id", permission: "users.manage" },
  { method: "GET", path: "/dashboard/navigation", permission: "content.read" },
  { method: "PUT", path: "/dashboard/navigation", permission: "content.write" },
  { method: "GET", path: "/dashboard/home-page", permission: "content.read" },
  { method: "PUT", path: "/dashboard/home-page", permission: "content.write" },
  { method: "GET", path: "/dashboard/footer", permission: "content.read" },
  { method: "PUT", path: "/dashboard/footer", permission: "content.write" },
  { method: "GET", path: "/dashboard/legal-pages", permission: "content.read" },
  { method: "GET", path: "/dashboard/legal-pages/:slug", permission: "content.read" },
  { method: "PUT", path: "/dashboard/legal-pages/:slug", permission: "content.write" },
  { method: "GET", path: "/dashboard/articles", permission: "content.read" },
  { method: "POST", path: "/dashboard/articles", permission: "content.write" },
  { method: "PATCH", path: "/dashboard/articles/:id", permission: "content.write" },
  { method: "DELETE", path: "/dashboard/articles/:id", permission: "content.write" },
  { method: "GET", path: "/dashboard/catalog", permission: "content.read" },
  { method: "PUT", path: "/dashboard/catalog", permission: "content.write" },
  { method: "GET", path: "/dashboard/storefront/config", permission: "content.read" },
  { method: "PUT", path: "/dashboard/storefront/config", permission: "content.write" },
  { method: "GET", path: "/dashboard/dealer-portal/settings", permission: "content.read" },
  { method: "PUT", path: "/dashboard/dealer-portal/settings", permission: "content.write" },
  { method: "GET", path: "/dashboard/modules/readiness", permission: "content.read" },
  { method: "GET", path: "/dashboard/modules/:moduleKey", permission: "content.read" },
  { method: "PUT", path: "/dashboard/modules/:moduleKey", permission: "content.write" },
  { method: "GET", path: "/dashboard/crm/contacts", permission: "crm.read" },
  { method: "GET", path: "/dashboard/crm/contacts/:id", permission: "crm.read" },
  { method: "PATCH", path: "/dashboard/crm/contacts/:id", permission: "crm.update" },
  { method: "POST", path: "/dashboard/crm/contacts/:id/notes", permission: "crm.update" },
  { method: "POST", path: "/dashboard/crm/contacts/:id/tasks", permission: "crm.update" },
  { method: "PATCH", path: "/dashboard/crm/tasks/:id", permission: "crm.update" },
  { method: "POST", path: "/dashboard/crm/contacts/:id/promote-to-erp", permission: "crm.promote" }
];

function matchesRoutePath(path: string, routePath: string) {
  const pathParts = path.split("/");
  const routeParts = routePath.split("/");

  return pathParts.length === routeParts.length && routeParts.every((part, index) =>
    part.startsWith(":") ? Boolean(pathParts[index]) : part === pathParts[index]
  );
}

function workQueueDeniedDescriptor(context:Context<DashboardEnv>){const path=context.req.path.replace(/^\/api\/v1/,""),m=path.match(/^\/dashboard\/(work-queue|notifications)\/([^/]+)\/(assign|unassign|acknowledge|resolve|dismiss|reopen|read)$/);if(!m)return;const action=m[3]==="dismiss"?"archive":m[3]==="reopen"?"restore":m[3]==="read"?"acknowledge":m[3];return{resource:{type:m[1]==="notifications"?"in_app_notification":"work_queue_item",id:m[2]},action}}
async function bestEffortWorkQueueDenied(context:Context<DashboardEnv>,authorization:any,permission:string){const descriptor=workQueueDeniedDescriptor(context);if(!descriptor)return;try{const{recordFailedAuditEvent}=await import("../audit/foundation.js");await recordFailedAuditEvent(context,authorization,{action:descriptor.action as any,resource:descriptor.resource as any,result:"denied",reason:"permission_required",requiredPermissions:[permission],primaryPermission:permission})}catch{}}

function requiredDashboardPermission(context: Context<DashboardEnv>) {
  const path = context.req.path.replace(/^\/api\/v1/, "");

  return DASHBOARD_PERMISSION_RULES.find(
    (rule) => rule.method === context.req.method && matchesRoutePath(path, rule.path)
  )?.permission;
}

export async function requireDashboardPermission(context: Context<DashboardEnv>, next: Next) {
  context.header("Cache-Control", "private, no-store");
  const session = await getSessionFromRequest(context);

  const requestId = context.res.headers.get("X-Request-Id")!;

  if (!session || session.user.kind !== "admin") {
    return context.json({
      error: "Authentication is required.",
      code: "AUTH_REQUIRED",
      requestId
    }, 401);
  }

  const permission = requiredDashboardPermission(context);

  if (!permission) {
    return context.json({ error: "Dashboard route is not allowed.", code: "DASHBOARD_FORBIDDEN", requestId }, 403);
  }

  const authorization = await resolveDashboardAuthorization(session.user.id, prisma, new Date(), session.sessionTokenHash);
  const rawVersions = new URL(context.req.url).searchParams.getAll("queryVersion");
  const strictAuditRequested = context.req.method === "GET"
    && /^\/api\/v1\/dashboard\/audit-logs(?:\/[^/]+)?$/.test(context.req.path)
    && rawVersions.length === 1 && rawVersions[0] === "common-query.v1";
  const scopedP02Route = context.req.path.startsWith("/api/v1/dashboard/access/")
    || context.req.path === "/api/v1/dashboard/authorization"
    || context.req.path === "/api/v1/dashboard/foundation"
    || (context.req.method === "GET" && /^\/api\/v1\/dashboard\/dealers(?:\/[^/]+)?$/.test(context.req.path))
    || /^\/api\/v1\/dashboard\/jobs(?:\/[^/]+)?(?:\/(?:cancel|retry))?$/.test(context.req.path)
    || /^\/api\/v1\/dashboard\/media(?:\/[^/]+)*(?:\/(?:metadata|usages|archive|restore|variants\/retry|preview\/[^/]+|download-original))?$/.test(context.req.path)
    || /^\/api\/v1\/dashboard\/data-jobs\/(?:imports|exports)(?:\/[^/]+)?(?:\/(?:content|preview|commit|cancel|download))?$/.test(context.req.path)
    || /^\/api\/v1\/dashboard\/(?:work-queue|notifications)(?:\/[^/]+)?(?:\/(?:assign|unassign|acknowledge|resolve|dismiss|reopen|read))?$/.test(context.req.path)
    || /^\/api\/v1\/dashboard\/analytics\/foundation\/(?:registry|events|metrics|readiness)(?:\/[^/]+)?$/.test(context.req.path)
    || /^\/api\/v1\/dashboard\/runtime\/(?:config|flags|readiness)(?:\/[^/]+)?(?:\/(?:versions|activate|retry|rollback|kill|evaluate))?$/.test(context.req.path)
    || /^\/api\/v1\/dashboard\/settings\/(?:overview|registry|drafts|history|readiness)(?:\/[^/]+)?(?:\/(?:validate|diff|publish|rollback-draft))?$/.test(context.req.path)
    || strictAuditRequested;
  const dashboardAccessGranted = scopedP02Route
    ? Boolean(permissionGrant(authorization, "dashboard.access"))
    : hasGlobalPermission(authorization, "dashboard.access");
  const dataJobRoute = context.req.path.startsWith("/api/v1/dashboard/data-jobs/") || context.req.path === "/api/v1/dashboard/data-jobs/imports" || context.req.path === "/api/v1/dashboard/data-jobs/exports";
  const settingsRoute = context.req.path.startsWith("/api/v1/dashboard/settings/");
  const routePermissionGranted = settingsRoute
    ? hasGlobalPermission(authorization, permission)
    : scopedP02Route || dataJobRoute
      ? Boolean(permissionGrant(authorization, permission))
      : hasGlobalPermission(authorization, permission);

  context.set("actorUserId", session.user.id);
  context.set("actorSessionId", session.sessionId);
  context.set("actorSessionTokenHash", session.sessionTokenHash);
  context.set("p02Authorization", authorization);
  if (!dashboardAccessGranted || !routePermissionGranted) {
    await bestEffortWorkQueueDenied(context,authorization,permission);
    return context.json({
      error: `${permission} is required.`,
      code: "DASHBOARD_FORBIDDEN",
      requestId
    }, 403);
  }

  context.set("actorUserId", session.user.id);
  context.set("actorSessionId", session.sessionId);
  context.set("actorSessionTokenHash", session.sessionTokenHash);
  context.set("actorPermissions", authorization.permissionGrants
    .filter((grant) => scopedP02Route || grant.global)
    .map((grant) => grant.permissionKey));
  context.set("actorRoles", [...authorization.globalRoleKeys, ...authorization.scopedRoleKeys]);
  context.set("p02Authorization", authorization);
  const strictProfile = context.req.method === "GET" && rawVersions.length === 1 && rawVersions[0] === "common-query.v1"
    ? context.req.path === "/api/v1/dashboard/products" ? "dashboard.products.v1"
      : context.req.path === "/api/v1/dashboard/dealers" ? "dashboard.dealers.v1"
        : /^\/api\/v1\/dashboard\/audit-logs(?:\/[^/]+)?$/.test(context.req.path) ? "dashboard.audit-events.v1"
          : /^\/api\/v1\/dashboard\/jobs(?:\/[^/]+)?$/.test(context.req.path) ? "dashboard.async-jobs.v1" : undefined
    : undefined;
  if (strictProfile) {
    const readiness = dashboardCommonQueryReadiness();
    const ready = strictProfile === "dashboard.products.v1" ? readiness.products
      : strictProfile === "dashboard.dealers.v1" ? readiness.dealers
        : strictProfile === "dashboard.audit-events.v1" ? readiness.audit : true;
    if (!ready) return publicError(context, 503, "QUERY_UNAVAILABLE", "Query capability is unavailable.");
    try {
      const limit = await consumeStrictQueryLimit(session.user.id, strictProfile);
      context.header("X-RateLimit-Limit", "60");
      context.header("X-RateLimit-Remaining", String(limit.remaining));
      context.header("X-RateLimit-Reset", String(limit.resetEpochSeconds));
      context.header("X-RateLimit-Burst-Limit", "10");
      context.header("X-RateLimit-Burst-Reset", String(limit.burstResetEpochSeconds));
      if (!limit.allowed) {
        context.header("Retry-After", String(limit.retryAfterSeconds));
        return publicError(context, 429, "RATE_LIMITED", "Too many requests. Please try again later.");
      }
    } catch {
      return publicError(context, 503, "QUERY_UNAVAILABLE", "Query service is unavailable.");
    }
  }
  await next();
}

export async function writeAudit(
  context: Context<DashboardEnv>,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Prisma.InputJsonObject,
  database: typeof prisma | Prisma.TransactionClient = prisma
) {
  const requestId = context.res.headers.get("X-Request-Id") ?? undefined;
  await database.auditLog.create({
    data: {
      actorUserId: context.get("actorUserId"),
      action,
      resourceType,
      resourceId,
      metadata: { ...(metadata ?? {}), ...(requestId ? { requestId } : {}) },
      ipAddress: getRequestIp(context),
      userAgent: context.req.header("user-agent")
    }
  });
}
