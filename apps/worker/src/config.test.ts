import assert from "node:assert/strict";
import test from "node:test";
import { loadWorkerConfig } from "./config.js";

const baseEnv: NodeJS.ProcessEnv = {
  VANSTRO_RUNTIME_MODE: "test",
  DATABASE_URL: "postgresql://localhost/vanstro_test"
};

test("deployment 模式拒绝 Demo integrations", () => {
  assert.throws(
    () => loadWorkerConfig({ ...baseEnv, VANSTRO_RUNTIME_MODE: "deployment", ENABLE_DEMO_INTEGRATIONS: "true" }),
    /must be false in deployment mode/
  );
});

test("邮件租约必须长于 SMTP 最大请求窗口", () => {
  assert.throws(
    () => loadWorkerConfig({ ...baseEnv, EMAIL_LOCK_TTL_MS: "30000" }),
    /EMAIL_LOCK_TTL_MS must be an integer between 60000/
  );
});

test("ERP 租约必须长于请求超时", () => {
  assert.throws(
    () => loadWorkerConfig({
      ...baseEnv,
      ERP_API_BASE_URL: "http://localhost:4010",
      ERP_SERVICE_TOKEN: "test-token",
      ERP_LOCK_TTL_MS: "10000"
    }),
    /ERP_LOCK_TTL_MS must be an integer between 30000/
  );
});

test("最大重试次数有上限以避免退避溢出", () => {
  assert.throws(
    () => loadWorkerConfig({ ...baseEnv, EMAIL_MAX_ATTEMPTS: "100" }),
    /EMAIL_MAX_ATTEMPTS must be an integer between 1 and 20/
  );
});
