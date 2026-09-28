import assert from "node:assert/strict";
import test from "node:test";
import { ErpProductClient } from "./client.js";
import { loadErpProductApiBaseUrl } from "./config.js";

test("loadErpProductApiBaseUrl is disabled when the env var is unset", () => {
  assert.equal(loadErpProductApiBaseUrl({}), undefined);
  assert.equal(loadErpProductApiBaseUrl({ ERP_PRODUCT_API_BASE_URL: "   " }), undefined);
  assert.equal(loadErpProductApiBaseUrl({ VANSTRO_RUNTIME_MODE: "deployment" }), undefined);
});

test("loadErpProductApiBaseUrl returns the configured base URL", () => {
  assert.equal(
    loadErpProductApiBaseUrl({ ERP_PRODUCT_API_BASE_URL: "https://erp.example.com/api/Product/" }),
    "https://erp.example.com/api/Product"
  );
});

test("loadErpProductApiBaseUrl rejects non-HTTPS URLs in deployment mode", () => {
  assert.throws(
    () => loadErpProductApiBaseUrl({
      VANSTRO_RUNTIME_MODE: "deployment",
      ERP_PRODUCT_API_BASE_URL: "http://erp.example.com/api/Product"
    }),
    /must use HTTPS in deployment mode/
  );
});

test("ErpProductClient reports the product API as unconfigured when no base URL is set", async () => {
  // An omitted argument would read process.env. Pass an empty base URL so this stays hermetic.
  const client = new ErpProductClient("");
  await assert.rejects(() => client.productList(), /ERP product API is not configured/);
});
