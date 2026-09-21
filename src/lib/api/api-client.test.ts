import assert from "node:assert/strict";
import test, { after, afterEach, before } from "node:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test/api/v1";
process.env.NEXT_PUBLIC_DEMO_READ_ONLY = "false";

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const {
  dispatchBrowserEvent,
  parseApiErrorResponse,
  vanstroApi,
  VanstroApiError
} = await import("./api-client.ts");

const cart = {
  id: "cart-1",
  items: [{
    id: "cart-item-1",
    skuId: "sku-id-1",
    product: {
      id: "product-1",
      slug: "sample-product",
      sku: "SKU-1",
      name: "Sample product",
      unit: "each",
      dimensions: "24 in",
      images: [{ url: "/sample.jpg", alt: "Sample" }],
      inStock: true
    },
    quantity: 1,
    unitPrice: { amount: 10, amountCents: 1000, currency: "CAD" },
    lineTotal: { amount: 10, amountCents: 1000, currency: "CAD" }
  }],
  subtotal: { amount: 10, amountCents: 1000, currency: "CAD" }
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function setWindow(value: unknown) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value
  });
}

function removeWindow() {
  Reflect.deleteProperty(globalThis, "window");
}

before(() => removeWindow());

afterEach(() => {
  globalThis.fetch = originalFetch;
  removeWindow();
});

after(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
});

test("unknown and internal API errors discard backend messages and fields", () => {
  for (const payload of [
    {
      code: "DATABASE_CONNECTION_FAILED",
      error: "postgresql://admin:secret@db.internal/prod",
      fields: { email: "users_email_key failed" }
    },
    {
      code: "INTERNAL_ERROR",
      error: "Prisma connection failed for db.internal:5432",
      fields: { email: "tenant=production" }
    }
  ]) {
    const error = parseApiErrorResponse(payload, 500);
    assert.equal(error.code, "API_ERROR");
    assert.equal(error.message, "Request failed with status 500.");
  }
});

test("public errors discard unlocalized field strings", () => {
  const error = parseApiErrorResponse({
    code: "AUTH_INVALID_INPUT",
    error: "The submitted account is invalid.",
    fields: { email: "Enter a valid email address." }
  }, 400);
  assert.equal(error.code, "AUTH_INVALID_INPUT");
  assert.equal(error.message, "The submitted account is invalid.");

  const diagnostic = parseApiErrorResponse({
    code: "AUTH_INVALID_INPUT",
    error: "The submitted account is invalid.",
    fields: { email: "SQLSTATE 23505: users_email_key, tenant=production" }
  }, 400);
  assert.equal("fields" in diagnostic, false);

  for (const fields of [
    { email: { internal: true } },
    { database: "users_email_key failed" },
    { email: "" }
  ]) {
    const malformed = parseApiErrorResponse({
      code: "AUTH_INVALID_INPUT",
      error: "The submitted account is invalid.",
      fields
    }, 400);
    assert.equal("fields" in malformed, false);
  }
});

test("authentication methods are safe without window", async () => {
  const auth = {
    data: {
      user: { id: "customer-1", email: "customer@example.com", role: "customer" }
    }
  };
  globalThis.fetch = async () => jsonResponse(auth);
  await assert.doesNotReject(vanstroApi.login({ email: "customer@example.com", password: "password" }));
  await assert.doesNotReject(vanstroApi.register({
    email: "customer@example.com",
    password: "password",
    firstName: "Customer",
    lastName: "Example"
  }));
  globalThis.fetch = async () => jsonResponse({ data: { ok: true } });
  await assert.doesNotReject(vanstroApi.logout());
  assert.doesNotThrow(() => dispatchBrowserEvent("test-event"));
});

test("browser API requests use the same-origin fallback when no base URL is configured", async () => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  setWindow({ location: { origin: "https://shop.example.test" } });
  let requestedUrl: string | undefined;
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return jsonResponse({ data: [] });
  };

  try {
    const result = await vanstroApi.getCategories();
    assert.deepEqual(result.data, []);
    assert.equal(requestedUrl, "https://shop.example.test/api/v1/categories");
  } finally {
    if (configuredBaseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = configuredBaseUrl;
  }
});

test("storage failures preserve guest cart continuity without reversing success", async () => {
  setWindow({
    get sessionStorage() {
      throw new DOMException("blocked", "SecurityError");
    }
  });
  const requestTokens: Array<string | null> = [];
  globalThis.fetch = async (_input, init) => {
    requestTokens.push(new Headers(init?.headers).get("X-Cart-Token"));
    return requestTokens.length === 1
      ? jsonResponse({ data: cart, meta: { cartToken: "guest-token" } })
      : jsonResponse({ data: cart });
  };
  const first = await vanstroApi.getCart();
  const second = await vanstroApi.getCart();
  assert.equal(first.data.id, "cart-1");
  assert.equal(second.data.id, "cart-1");
  assert.deepEqual(requestTokens, [null, "guest-token"]);

  setWindow({
    sessionStorage: {
      getItem: () => null,
      setItem: () => { throw new DOMException("full", "QuotaExceededError"); },
      removeItem: () => undefined
    }
  });
  const quotaTokens: Array<string | null> = [];
  globalThis.fetch = async (_input, init) => {
    quotaTokens.push(new Headers(init?.headers).get("X-Cart-Token"));
    return quotaTokens.length === 1
      ? jsonResponse({ data: cart, meta: { cartToken: "quota-token" } })
      : jsonResponse({ data: cart });
  };
  const quotaResult = await vanstroApi.getCart();
  await vanstroApi.getCart();
  assert.equal(quotaResult.data.id, "cart-1");
  assert.deepEqual(quotaTokens, [null, "quota-token"]);
});

test("cart token and credentials stay on the configured API request", async () => {
  const removed: string[] = [];
  setWindow({
    sessionStorage: {
      getItem: () => "guest-token",
      setItem: () => undefined,
      removeItem: (key: string) => removed.push(key)
    }
  });
  let request: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = async (input, init) => {
    request = { url: String(input), init };
    return jsonResponse({ data: cart });
  };
  const result = await vanstroApi.setCartItemQuantity("cart-item-1", 1);
  assert.equal(result.data.items[0].skuId, "sku-id-1");
  assert.equal(request?.url, "https://api.example.test/api/v1/cart/items/cart-item-1");
  assert.equal(request?.init?.credentials, "include");
  assert.equal(new Headers(request?.init?.headers).get("X-Cart-Token"), "guest-token");
  assert.deepEqual(removed, ["vanstro-cart-token"]);
});

test("cart mutations reject quantities outside the Backend 1..999 contract", async () => {
  globalThis.fetch = async () => {
    assert.fail("fetch must not run for an invalid quantity");
  };
  for (const quantity of [0, -1, 1.5, 1000]) {
    assert.throws(
      () => vanstroApi.setCartItemQuantity("cart-item-1", quantity),
      (error: unknown) => error instanceof VanstroApiError && error.code === "COMMERCE_INVALID"
    );
  }
});
