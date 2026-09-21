import assert from "node:assert/strict";
import test from "node:test";
import { AUDIT_RESOURCE_TYPES, isAuditResourceType } from "./audit-resource-registry.js";

const expected = [
  "user","role","permission","dealer","dealer_location","membership","product","category",
  "inventory","price","promotion","order","shipment","checkout_session","payment_session",
  "refund","customer","content","review","lead","support","email","erp_job","runtime_config",
  "feature_flag","audit_event","async_job","job_artifact","work_queue_item","in_app_notification",
  "work_queue_source_state","media_asset","media_variant","media_usage","media_upload_intent",
  "media_storage_operation","analytics_event","analytics_release","privacy_consent"
] as const;

test("Audit resource registry is the exact historical and F1 union", () => {
  assert.deepEqual(AUDIT_RESOURCE_TYPES, expected);
  assert.equal(new Set(AUDIT_RESOURCE_TYPES).size, expected.length);
  for (const resource of expected) assert.equal(isAuditResourceType(resource), true, resource);
});

test("Audit resource registry rejects unknown and malformed values", () => {
  for (const value of ["unknown", "ASYNC_JOB", "async-job", "", null, undefined, 1, {}]) {
    assert.equal(isAuditResourceType(value), false);
  }
});
