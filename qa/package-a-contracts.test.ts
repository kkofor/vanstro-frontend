import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalProductIdFor,
  cartProductIdentityFor
} from "../src/lib/api/product-identity.ts";
import {
  contactLeadFromForm,
  dealerApplicationFromForm
} from "../src/lib/api/form-endpoints.ts";
import {
  ApiValidationError,
  validateApiResult,
  validateCart,
  validateCheckoutSession
} from "../src/lib/api/runtime-validation.ts";

test("runtime validation rejects malformed envelopes and currency", () => {
  assert.throws(
    () => validateApiResult({}, validateCart),
    ApiValidationError
  );
  assert.throws(
    () => validateApiResult({ data: {
      id: "cart-1",
      items: [],
      subtotal: { amount: 10, currency: "EUR" }
    } }, validateCart),
    /CAD or USD/
  );
});

test("runtime validation accepts the checkout session wire contract", () => {
  const result = validateApiResult({ data: {
    id: "session-1",
    status: "pending",
    fulfillment: "pickup",
    paymentMethod: "cash",
    expiresAt: "2026-07-16T12:00:00.000Z",
    subtotal: { amount: 100, currency: "CAD" },
    tax: { amount: 12, currency: "CAD" },
    shipping: { amount: 13, currency: "CAD" },
    total: { amount: 125, currency: "CAD" },
    guestOrderToken: "guest-token"
  } }, validateCheckoutSession);
  assert.equal(result.data.total.currency, "CAD");
  assert.equal(result.data.guestOrderToken, "guest-token");
});

test("canonical product identity requires matching slug and SKU", () => {
  const product = { id: "mb01-1", slug: "sample-product", sku: "SKU-1" };
  const canonical = {
    id: "product-1",
    slug: "sample-product",
    name: "Sample",
    primarySku: { id: "sku-1", skuCode: "SKU-1", name: "Sample SKU" }
  };
  assert.equal(canonicalProductIdFor(product, canonical), "product-1");
  assert.throws(
    () => canonicalProductIdFor(product, {
      ...canonical,
      primarySku: { ...canonical.primarySku, skuCode: "SKU-2" }
    }),
    /does not match/
  );
});

test("variant cart identity preserves the selected SKU", () => {
  const selectedVariant = {
    id: "sample-product-sku-2",
    slug: "sample-product",
    sku: "SKU-2"
  };
  assert.deepEqual(
    cartProductIdentityFor(selectedVariant),
    { productId: "sample-product", skuCode: "SKU-2" }
  );
});

test("contact and dealer forms produce canonical locale-aware payloads", () => {
  const contact = new FormData();
  contact.set("name", " Ada ");
  contact.set("email", "ada@example.com");
  contact.set("topic", "products");
  contact.set("message", "Details");
  assert.deepEqual(contactLeadFromForm(contact, "zh-CN", "/zh/contact"), {
    name: "Ada",
    email: "ada@example.com",
    topic: "products",
    message: "Details",
    locale: "zh-CN",
    sourcePath: "/zh/contact"
  });

  const dealer = new FormData();
  for (const [key, value] of Object.entries({
    companyName: "VanStro Dealer",
    contactName: "Ada",
    email: "ada@example.com",
    phone: "204-555-0100",
    city: "Winnipeg",
    province: "MB"
  })) dealer.set(key, value);
  dealer.set("applicationAcknowledgement", "on");
  dealer.append("capabilities", "Pickup coordination");
  const payload = dealerApplicationFromForm(dealer, "en-CA");
  assert.equal(payload.locale, "en-CA");
  assert.equal(payload.applicationAcknowledgement, true);
  assert.deepEqual(payload.capabilities, ["Pickup coordination"]);
});
