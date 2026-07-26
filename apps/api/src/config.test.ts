import assert from "node:assert/strict";
import test from "node:test";
import { loadApiConfig } from "./config.js";

const deploymentEnv: NodeJS.ProcessEnv = {
  VANSTRO_RUNTIME_MODE: "deployment",
  DATABASE_URL: "postgresql://localhost/vanstro_test",
  API_HOST: "127.0.0.1",
  PAYMENT_CALLBACK_SECRET: "payment-callback-secret-at-least-32-characters",
  ERP_WEBHOOK_SECRET: "erp-webhook-secret-at-least-32-characters"
};

test("deployment 模式拒绝启用支付模拟", () => {
  assert.throws(
    () => loadApiConfig({ ...deploymentEnv, ENABLE_PAYMENT_SIMULATION: "true" }),
    /must be false in deployment mode/
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
