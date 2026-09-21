import assert from "node:assert/strict";
import test from "node:test";
import { loadWorkerConfig } from "./config.js";

const baseEnv: NodeJS.ProcessEnv = {
  VANSTRO_RUNTIME_MODE: "test",
  DATABASE_URL: "postgresql://localhost/vanstro_test",
  WORKER_LIFECYCLE_DATABASE_URL: "postgresql://vanstro_worker_runtime@localhost/vanstro_test"
};

const deploymentEnv: NodeJS.ProcessEnv = {
  ...baseEnv,
  VANSTRO_RUNTIME_MODE: "deployment",
  EMAIL_SETTINGS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  ERP_API_BASE_URL: "https://erp.example.com",
  ERP_SERVICE_TOKEN: "12345678901234567890123456789012"
};

test("deployment requires the independent Worker lifecycle credential", () => {
  assert.throws(
    () => loadWorkerConfig({ ...deploymentEnv, WORKER_LIFECYCLE_DATABASE_URL: undefined }),
    /WORKER_LIFECYCLE_DATABASE_URL is required/
  );
});

test("deployment 模式拒绝 Demo integrations", () => {
  assert.throws(
    () => loadWorkerConfig({ ...deploymentEnv, ENABLE_DEMO_INTEGRATIONS: "true" }),
    /must be false in deployment mode/
  );
});

test("deployment 模式拒绝无效邮件加密密钥", () => {
  assert.throws(
    () => loadWorkerConfig({ ...deploymentEnv, EMAIL_SETTINGS_ENCRYPTION_KEY: "invalid" }),
    /base64-encoded 32-byte key/
  );
});

test("deployment 模式允许供应商提供的短 SMTP 密码", () => {
  const config = loadWorkerConfig({
    ...deploymentEnv,
    SMTP_HOST: "smtp.example.com",
    SMTP_USER: "support@example.com",
    SMTP_PASSWORD: "vendor-pass",
    SMTP_FROM: "support@example.com"
  });
  assert.equal(config.smtp?.password, "vendor-pass");
});

test("deployment 模式拒绝过短 SMTP 密码", () => {
  assert.throws(
    () => loadWorkerConfig({
      ...deploymentEnv,
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "support@example.com",
      SMTP_PASSWORD: "short",
      SMTP_FROM: "support@example.com"
    }),
    /at least 8 characters/
  );
});

test("deployment 模式拒绝关闭 SMTP TLS", () => {
  assert.throws(
    () => loadWorkerConfig({ ...deploymentEnv, SMTP_REQUIRE_TLS: "false" }),
    /must not be false/
  );
});

test("deployment 模式允许暂不配置 ERP", () => {
  const { ERP_API_BASE_URL: _baseUrl, ERP_SERVICE_TOKEN: _token, ...withoutErp } = deploymentEnv;
  const config = loadWorkerConfig(withoutErp);
  assert.equal(config.erp, undefined);
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
