import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./app.js";

test("CORS preflight allows X-Cart-Token for approved storefront origins", async () => {
  const previousEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    VANSTRO_RUNTIME_MODE: process.env.VANSTRO_RUNTIME_MODE,
    PAYMENT_CALLBACK_SECRET: process.env.PAYMENT_CALLBACK_SECRET
  };
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/vanstro_test";
  process.env.VANSTRO_RUNTIME_MODE = "development";
  process.env.PAYMENT_CALLBACK_SECRET = "test-secret";

  const response = await createApp().request("/api/v1/cart", {
    method: "OPTIONS",
    headers: {
      origin: "http://localhost:3000",
      "access-control-request-method": "GET",
      "access-control-request-headers": "x-cart-token"
    }
  });

  try {
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
    const allowedHeaders = response.headers.get("access-control-allow-headers")
      ?.toLowerCase()
      .split(",")
      .map((header) => header.trim());
    assert.ok(allowedHeaders?.includes("x-cart-token"));
    assert.ok(allowedHeaders?.includes("x-payment-signature"));
    assert.ok(allowedHeaders?.includes("x-reservation-token"));
    assert.ok(allowedHeaders?.includes("idempotency-key"));
  } finally {
    for (const [name, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
