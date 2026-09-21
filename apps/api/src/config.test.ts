import assert from "node:assert/strict";
import test from "node:test";
import { dashboardCommonQueryReadiness, loadApiConfig } from "./config.js";

const deploymentEnv: NodeJS.ProcessEnv = {
  VANSTRO_RUNTIME_MODE: "deployment",
  DATABASE_URL: "postgresql://localhost/vanstro_test",
  API_HOST: "127.0.0.1",
  PAYMENT_CALLBACK_SECRET: "payment-callback-secret-at-least-32-characters",
  ERP_WEBHOOK_SECRET: "erp-webhook-secret-at-least-32-characters",
  EMAIL_SETTINGS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "true",
  DASHBOARD_COMMON_QUERY_DEALERS_READY: "true",
  DASHBOARD_AUDIT_FOUNDATION_READY: "true",
  DASHBOARD_QUERY_CURSOR_KEYS: JSON.stringify({ activeKid: "k1", keys: [{ kid: "k1", key: Buffer.alloc(32, 2).toString("base64"), mode: "active" }] })
};

test("deployment 模式拒绝启用支付模拟", () => {
  assert.throws(
    () => loadApiConfig({ ...deploymentEnv, ENABLE_PAYMENT_SIMULATION: "true" }),
    /must be false in deployment mode/
  );
});

test("deployment 模式拒绝 Demo integrations", () => {
  assert.throws(
    () => loadApiConfig({ ...deploymentEnv, ENABLE_DEMO_INTEGRATIONS: "true" }),
    /must be false in deployment mode/
  );
});

test("deployment 模式拒绝无效邮件加密密钥", () => {
  assert.throws(
    () => loadApiConfig({ ...deploymentEnv, EMAIL_SETTINGS_ENCRYPTION_KEY: "invalid" }),
    /base64-encoded 32-byte key/
  );
});

test("deployment 模式要求独立有效的 Dashboard cursor keyset", () => {
  assert.throws(
    () => loadApiConfig({ ...deploymentEnv, DASHBOARD_QUERY_CURSOR_KEYS: "" }),
    /DASHBOARD_QUERY_CURSOR_KEYS is required/
  );
  assert.throws(
    () => loadApiConfig({ ...deploymentEnv, DASHBOARD_QUERY_CURSOR_KEYS: "invalid" }),
    /valid cursor keyset/
  );
  assert.equal(loadApiConfig(deploymentEnv).dashboardQueryCursorKeys, deploymentEnv.DASHBOARD_QUERY_CURSOR_KEYS);
  assert.equal(dashboardCommonQueryReadiness().dealers, true);
  assert.equal(dashboardCommonQueryReadiness().audit, true);
  assert.equal(dashboardCommonQueryReadiness().keyset?.activeKid, "k1");
  const firstHash = dashboardCommonQueryReadiness().generationHash;
  const reordered = JSON.stringify({ activeKid: "k1", keys: [
    { kid: "old", key: Buffer.alloc(32, 3).toString("base64"), mode: "decrypt-only" },
    { kid: "k1", key: Buffer.alloc(32, 2).toString("base64"), mode: "active" }
  ] });
  loadApiConfig({ ...deploymentEnv, DASHBOARD_QUERY_CURSOR_KEYS: reordered });
  const orderedHash = dashboardCommonQueryReadiness().generationHash;
  loadApiConfig({ ...deploymentEnv, DASHBOARD_QUERY_CURSOR_KEYS: JSON.stringify({ activeKid: "k1", keys: JSON.parse(reordered).keys.reverse() }) });
  assert.equal(dashboardCommonQueryReadiness().generationHash, orderedHash);
  loadApiConfig({ ...deploymentEnv, DASHBOARD_QUERY_CURSOR_KEYS: JSON.stringify({ activeKid: "k1", keys: [{ kid: "k1", key: Buffer.alloc(32, 9).toString("base64"), mode: "active" }] }) });
  assert.notEqual(dashboardCommonQueryReadiness().generationHash, firstHash);
});

test("Audit and Dealers readiness independently require the shared cursor keyset", () => {
  const keyset = deploymentEnv.DASHBOARD_QUERY_CURSOR_KEYS;
  loadApiConfig({ ...deploymentEnv, DASHBOARD_COMMON_QUERY_DEALERS_READY: "false", DASHBOARD_AUDIT_FOUNDATION_READY: "true", DASHBOARD_QUERY_CURSOR_KEYS: keyset });
  assert.equal(dashboardCommonQueryReadiness().dealers, false);
  assert.equal(dashboardCommonQueryReadiness().audit, true);
  loadApiConfig({ ...deploymentEnv, DASHBOARD_COMMON_QUERY_DEALERS_READY: "true", DASHBOARD_AUDIT_FOUNDATION_READY: "false", DASHBOARD_QUERY_CURSOR_KEYS: keyset });
  assert.equal(dashboardCommonQueryReadiness().dealers, true);
  assert.equal(dashboardCommonQueryReadiness().audit, false);
  assert.throws(() => loadApiConfig({ ...deploymentEnv, DASHBOARD_COMMON_QUERY_DEALERS_READY: "false", DASHBOARD_AUDIT_FOUNDATION_READY: "true", DASHBOARD_QUERY_CURSOR_KEYS: "" }), /required/);
  assert.throws(() => loadApiConfig({ ...deploymentEnv, DASHBOARD_AUDIT_FOUNDATION_READY: "yes" }), /true or false/);
});

test("development 模式默认关闭且仅server env显式开启 common query", () => {
  const config = loadApiConfig({ ...deploymentEnv, VANSTRO_RUNTIME_MODE: "development", DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "false", DASHBOARD_COMMON_QUERY_DEALERS_READY: "false", DASHBOARD_QUERY_CURSOR_KEYS: "" });
  assert.equal(config.dashboardQueryCursorKeys, undefined);
  assert.equal(dashboardCommonQueryReadiness().products, false);
  assert.equal(dashboardCommonQueryReadiness().dealers, false);
  assert.throws(() => loadApiConfig({ ...deploymentEnv, DASHBOARD_COMMON_QUERY_PRODUCTS_READY: "yes" }), /must be either true or false/);
});

test("库存源默认使用 ERP freshness 校验", () => {
  const config = loadApiConfig(deploymentEnv);
  assert.equal(config.inventorySourceMode, "erp");
});

test("生产模式允许明确使用人工库存", () => {
  const config = loadApiConfig({ ...deploymentEnv, INVENTORY_SOURCE_MODE: "manual" });
  assert.equal(config.inventorySourceMode, "manual");
});

test("拒绝未知库存源模式", () => {
  assert.throws(
    () => loadApiConfig({ ...deploymentEnv, INVENTORY_SOURCE_MODE: "unknown" }),
    /must be manual or erp/
  );
});

test("development 模式允许显式启用支付模拟", () => {
  const config = loadApiConfig({
    ...deploymentEnv,
    VANSTRO_RUNTIME_MODE: "development",
    ENABLE_PAYMENT_SIMULATION: "true"
  });
  assert.equal(config.enablePaymentSimulation, true);
});
