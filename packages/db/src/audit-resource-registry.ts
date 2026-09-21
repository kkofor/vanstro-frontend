export const AUDIT_RESOURCE_TYPES = [
  "user",
  "role",
  "permission",
  "dealer",
  "dealer_location",
  "membership",
  "product",
  "category",
  "inventory",
  "price",
  "promotion",
  "order",
  "shipment",
  "checkout_session",
  "payment_session",
  "refund",
  "customer",
  "content",
  "review",
  "lead",
  "support",
  "email",
  "erp_job",
  "runtime_config",
  "feature_flag",
  "audit_event",
  "async_job",
  "job_artifact",
  "work_queue_item",
  "in_app_notification",
  "work_queue_source_state",
  "media_asset",
  "media_variant",
  "media_usage",
  "media_upload_intent",
  "media_storage_operation",
  "analytics_event",
  "analytics_release",
  "privacy_consent"
] as const;

export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

const AUDIT_RESOURCE_TYPE_SET: ReadonlySet<string> = new Set(AUDIT_RESOURCE_TYPES);

export function isAuditResourceType(value: unknown): value is AuditResourceType {
  return typeof value === "string" && AUDIT_RESOURCE_TYPE_SET.has(value);
}
