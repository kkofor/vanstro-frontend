import assert from "node:assert/strict";
import test from "node:test";
import { DATA_RETENTION_DAYS } from "./data-retention.js";

test("data retention windows remain explicit and bounded", () => {
  assert.equal(DATA_RETENTION_DAYS.pageViews, 90);
  assert.ok(DATA_RETENTION_DAYS.loginEvents <= 365);
  assert.ok(DATA_RETENTION_DAYS.completedEmailPayloads <= 90);
  assert.ok(DATA_RETENTION_DAYS.processedWebhookPayloads <= 180);
});
