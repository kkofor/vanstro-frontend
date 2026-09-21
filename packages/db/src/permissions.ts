const ROLE_GRANTED_PERMISSIONS = [
  "dashboard.access",
  "users.read",
  "users.manage",
  "content.read",
  "content.write",
  "products.read",
  "products.write",
  "categories.write",
  "pricing.write",
  "inventory.read",
  "inventory.write",
  "orders.read",
  "orders.update",
  "orders.assign",
  "payments.recover",
  "leads.read",
  "leads.update",
  "dealer_applications.read",
  "dealer_applications.update",
  "reviews.read",
  "reviews.moderate",
  "support.read",
  "support.update",
  "email.templates.read",
  "email.templates.write",
  "email.outbox.read",
  "email.outbox.retry",
  "email.provider.read",
  "email.provider.write",
  "analytics.read",
  "erp.sync.read",
  "erp.sync.retry",
  "erp.catalog.read",
  "erp.catalog.sync",
  "erp.webhooks.read",
  // PII-gated ERP order read: exposes order contact info, shipping address and
  // customer notes to machine tokens. Deliberately granted to super_admin, which
  // is already all-permissive (customers.pii.read, orders.read); the erp.orders.pii
  // gate only isolates future least-privilege service accounts.
  "erp.orders.pii",
  "crm.read",
  "crm.update",
  "crm.promote",
  "mcp.access",
  "mcp.tools.execute",
  "cli.access",
  "settings.read",
  "settings.write",
  "service_accounts.manage",
  "audit_logs.read",
  "customers.pii.read",
  "payments.reference.read",
  "audit.read_sensitive",
  "sessions.revoke",
  "dealers.read",
  "jobs.read",
  "jobs.create",
  "jobs.cancel",
  "jobs.retry",
  "jobs.read_sensitive",
  "job_artifacts.download",
  "work_queue.read",
  "work_queue.assign",
  "work_queue.acknowledge",
  "work_queue.resolve",
  "work_queue.dismiss",
  "work_queue.reopen",
  "work_queue.read_sensitive",
  "notifications.read",
  "notifications.mark_read",
  "media.read",
  "media.read_sensitive",
  "media.create",
  "media.update",
  "media.archive",
  "media.restore",
  "media.download_original",
  "media.manage_variants"
] as const;

export const P08_PERMISSIONS = [
  "dashboard.import.foundation_sample.read",
  "dashboard.import.foundation_sample.create",
  "dashboard.import.foundation_sample.commit",
  "dashboard.export.foundation_sample.read",
  "dashboard.export.foundation_sample.create",
  "dashboard.export.foundation_sample.download"
] as const;

export const P09_PERMISSIONS = [
  "config.read",
  "config.manage",
  "config.activate",
  "flags.read",
  "flags.manage",
  "flags.kill_switch",
  "readiness.read_summary",
  "readiness.read_detail"
] as const;

export const P10_PERMISSIONS = ["analytics.ingest","analytics.release.read","analytics.events.read_summary","analytics.metrics.read","analytics.metrics.read_detail","analytics.export","analytics.registry.read","analytics.operations.read"] as const;

export const INITIAL_PERMISSIONS = [...ROLE_GRANTED_PERMISSIONS, ...P08_PERMISSIONS, ...P09_PERMISSIONS, ...P10_PERMISSIONS] as const;

export type InitialPermission = (typeof INITIAL_PERMISSIONS)[number];

export const DASHBOARD_ROLE_MANIFEST = [
  { key: "super_admin", name: "超级管理员", scope: "global", permissions: [...ROLE_GRANTED_PERMISSIONS, ...P09_PERMISSIONS, ...P10_PERMISSIONS] },
  { key: "operations_admin", name: "运营管理员", scope: "global", permissions: ["dashboard.access", "products.read", "inventory.read", "inventory.write", "orders.read", "orders.update", "orders.assign", "dealer_applications.read", "dealer_applications.update", "leads.read", "leads.update", "reviews.read", "reviews.moderate", "support.read", "support.update", "crm.read", "crm.update", "dealers.read", "content.read", "content.write", "analytics.read", "audit_logs.read", "erp.sync.read", "jobs.read", "jobs.create", "jobs.cancel", "jobs.retry", "work_queue.read", "work_queue.assign", "work_queue.acknowledge", "work_queue.resolve", "work_queue.dismiss", "work_queue.reopen", "notifications.read", "notifications.mark_read", "media.read", "media.create", "media.update", "media.archive", "media.restore", "media.download_original", "media.manage_variants"] },
  { key: "catalog_manager", name: "商品管理员", scope: "global", permissions: ["dashboard.access", "products.read", "products.write", "categories.write", "pricing.write", "inventory.read", "dealers.read", "content.read", "erp.catalog.read", "media.read", "media.create", "media.update", "media.archive", "media.restore", "media.download_original", "media.manage_variants"] },
  { key: "inventory_manager", name: "库存管理员", scope: "global", permissions: ["dashboard.access", "products.read", "inventory.read", "inventory.write", "orders.read", "dealers.read", "erp.sync.read"] },
  { key: "order_manager", name: "订单管理员", scope: "global", permissions: ["dashboard.access", "orders.read", "orders.update", "orders.assign", "inventory.read", "customers.pii.read", "dealers.read", "support.read", "support.update", "crm.read"] },
  { key: "marketing_manager", name: "营销管理员", scope: "global", permissions: ["dashboard.access", "products.read", "orders.read", "dealers.read", "content.read", "content.write", "leads.read", "analytics.read", "media.read", "media.create", "media.update", "media.archive", "media.restore", "media.download_original"] },
  { key: "content_editor", name: "内容编辑", scope: "global", permissions: ["dashboard.access", "products.read", "content.read", "content.write", "media.read", "media.create", "media.update", "media.archive", "media.restore", "media.download_original"] },
  { key: "customer_support", name: "客户支持", scope: "global", permissions: ["dashboard.access", "products.read", "inventory.read", "orders.read", "orders.update", "customers.pii.read", "dealers.read", "leads.read", "leads.update", "support.read", "support.update", "crm.read", "crm.update"] },
  { key: "finance_reconciliation", name: "财务与对账", scope: "global", permissions: ["dashboard.access", "products.read", "orders.read", "orders.update", "payments.reference.read", "customers.pii.read", "audit_logs.read", "audit.read_sensitive", "analytics.read"] },
  { key: "dealer_admin", name: "经销商管理员", scope: "dealer", permissions: ["dashboard.access", "products.read", "inventory.read", "inventory.write", "orders.read", "orders.update", "orders.assign", "customers.pii.read", "dealers.read", "support.read", "support.update", "crm.read", "crm.update", "audit_logs.read", "jobs.read", "jobs.create", "jobs.cancel", "jobs.retry", "work_queue.read", "work_queue.assign", "work_queue.acknowledge", "work_queue.resolve", "work_queue.dismiss", "work_queue.reopen", "notifications.read", "notifications.mark_read", "media.read", "media.create", "media.update", "media.archive", "media.restore", "media.download_original", "media.manage_variants"] },
  { key: "analyst_viewer", name: "分析与只读", scope: "global", permissions: ["dashboard.access", "products.read", "inventory.read", "orders.read", "dealers.read", "content.read", "leads.read", "reviews.read", "support.read", "crm.read", "analytics.read"] },
  { key: "auditor", name: "审计员", scope: "global", permissions: ["dashboard.access", "products.read", "inventory.read", "orders.read", "payments.reference.read", "customers.pii.read", "dealers.read", "content.read", "leads.read", "reviews.read", "support.read", "crm.read", "analytics.read", "erp.sync.read", "erp.webhooks.read", "audit_logs.read", "audit.read_sensitive", "settings.read", "jobs.read", "jobs.read_sensitive", "work_queue.read", "work_queue.read_sensitive", "media.read", "media.read_sensitive"] }
] as const satisfies readonly {
  key: string;
  name: string;
  scope: "global" | "dealer";
  permissions: readonly InitialPermission[];
}[];
