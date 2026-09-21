#!/usr/bin/env node
/**
 * Storefront round-trip acceptance driver (real API + real Next dev server,
 * disposable PG16 fixture). No hard sleeps: every wait polls a condition.
 *
 * Authority points asserted:
 *   A1 shared admin can log in with real grants (products.write/pricing.write/inventory.write)
 *   A2 admin product edit  -> storefront API reflects it
 *   A3 admin product edit  -> rendered product page reflects it after refresh
 *   A4 admin price edit    -> storefront API + rendered page reflect it
 *   A5 admin inventory edit-> storefront API reflects quantity
 *   A6 admin status edit   -> storefront API + rendered page 404 when archived, back when restored
 *   A7 write permission gate: partial admin PATCH is 403
 *   A8 cart -> checkout session totals equal the edited price
 *   A9 checkout reserves inventory (storefront quantityAvailable drops)
 *   A10 simulated payment -> paid order with the edited price on line items
 *   A11 payment replay is idempotent (same order)
 *   A12 guest order visibility requires the guest token (403 without)
 *   A13 order consumes inventory (quantityOnHand decremented, reservation cleared)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";

const API = process.env.V11_SF_API;
const WEB = process.env.V11_SF_WEB;
const OUT = process.env.V11_SF_OUT;
const PASSWORD = process.env.V11_SF_PASSWORD;
const TESTED_COMMIT = process.env.V11_TESTED_COMMIT;
const TESTED_TREE = process.env.V11_TESTED_TREE;
if (!API || !WEB || !OUT || !PASSWORD) {
  throw new Error("V11_SF_API/V11_SF_WEB/V11_SF_OUT/V11_SF_PASSWORD are required.");
}
const seed = JSON.parse(readFileSync(process.env.V11_SF_SEED, "utf8"));
const fixture = JSON.parse(readFileSync(process.env.V11_SF_FIXTURE, "utf8"));
const ADMIN_EMAIL = process.env.V11_SF_ADMIN_EMAIL ?? seed.admin?.email;
const PARTIAL_EMAIL = process.env.V11_SF_PARTIAL_EMAIL ?? seed.partialAdmin?.email;
if (!ADMIN_EMAIL || !PARTIAL_EMAIL || !seed.admin?.id) {
  throw new Error("seed.json must carry admin.email, admin.id and partialAdmin.email.");
}
const { productId, slug, skuId, skuCode, priceId, locationId } = fixture;
if (!productId || !slug || !skuId || !skuCode || !priceId || !locationId) {
  throw new Error(`fixture.json is incomplete: ${JSON.stringify(fixture)}`);
}
const NEW_NAME = `Storefront Roundtrip ${randomBytes4()}`;
const NEW_PRICE_CENTS = 12345;
const ORDER_QTY = 2;
const TAX_RATE_MB = 0.12;
const SUBTOTAL = NEW_PRICE_CENTS * ORDER_QTY; // 24690
const TAX = Math.round(SUBTOTAL * TAX_RATE_MB); // 2963
const TOTAL = SUBTOTAL + TAX; // 27653

function randomBytes4() {
  return [...randomBytes(4)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const results = [];
function record(caseId, point, ok, detail) {
  results.push({ case: caseId, point, ok, detail });
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status} ${caseId} — ${point}`);
  if (!ok) console.log(`      detail: ${JSON.stringify(detail)}`);
}

function assert(caseId, point, condition, detail) {
  record(caseId, point, !!condition, condition ? detail : detail);
  if (!condition) throw new Error(`${caseId} failed: ${JSON.stringify(detail)}`);
}

async function api(path, { method = "GET", body, headers = {}, cookie } = {}) {
  const response = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, json, cookie: response.headers.get("set-cookie") ?? undefined };
}

async function login(email) {
  const response = await api("/auth/login", { method: "POST", body: { email, password: PASSWORD } });
  const cookie = response.cookie?.split(";")[0];
  return { ...response, cookie };
}

async function until(predicate, { timeoutMs = 60_000, intervalMs = 1500, label }) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await predicate();
      if (last) return last;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`condition not reached within ${timeoutMs}ms: ${label} (last: ${String(last)})`);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { accept: "text/html" } });
  return { status: response.status, text: await response.text() };
}

const totalAvailable = (detail) =>
  (detail?.inventory ?? []).reduce((sum, entry) => sum + Math.max(0, entry.quantityOnHand - entry.quantityReserved), 0);

const main = async () => {
  // A1: shared admin login with the write grants the round trip needs.
  const adminLogin = await login(ADMIN_EMAIL);
  assert("admin-login", "shared admin authenticates with a session cookie", adminLogin.status === 200 && adminLogin.cookie?.startsWith("vanstro-session="), { status: adminLogin.status });
  assert("admin-login", "session belongs to the seeded admin", adminLogin.json?.data?.user?.id === seed.admin.id, { user: adminLogin.json?.data?.user?.id });
  const permissions = adminLogin.json?.data?.user?.permissions ?? [];
  for (const permission of ["products.write", "pricing.write", "inventory.write"]) {
    assert("admin-login", `grant ${permission} present`, permissions.includes(permission), { permission });
  }
  const adminCookie = adminLogin.cookie;

  // A1b: storefront baseline — the seeded product is visible with seed price.
  const baseline = await api(`/products/${slug}`);
  assert("storefront-baseline", "product detail is public and active", baseline.status === 200 && baseline.json?.data?.status === "active", { status: baseline.status });
  assert("storefront-baseline", "seed price is $100.00", baseline.json?.data?.price?.amountCents === 10000, { price: baseline.json?.data?.price });
  assert("storefront-baseline", "seed inventory shows 10 on hand", (baseline.json?.data?.inventory ?? []).some((entry) => entry.quantityOnHand === 10), { inventory: baseline.json?.data?.inventory });

  // A2: admin edits product name -> storefront API reflects it.
  const productEdit = await api(`/dashboard/products/${productId}`, { method: "PATCH", cookie: adminCookie, body: { name: NEW_NAME } });
  assert("admin-product-edit", "PATCH /dashboard/products/:id returns 200 with the new name", productEdit.status === 200 && productEdit.json?.data?.name === NEW_NAME, { status: productEdit.status, name: productEdit.json?.data?.name });
  const afterName = await api(`/products/${slug}`);
  assert("storefront-product-refresh", "storefront API returns the edited name", afterName.status === 200 && afterName.json?.data?.name === NEW_NAME, { status: afterName.status, name: afterName.json?.data?.name });

  // A3: rendered product page (real Next dev, per-request server fetch) reflects it.
  const pageWithName = await until(
    () => fetchText(`${WEB}/products/${slug}`).then(({ status, text }) => status === 200 && text.includes(NEW_NAME) ? text : null),
    { timeoutMs: 180_000, label: `rendered page contains ${NEW_NAME}` }
  );
  assert("rendered-page-refresh", "product page shows the edited name after refresh", !!pageWithName, { slug });

  // A4: admin edits price -> storefront API + rendered page reflect it.
  const priceEdit = await api(`/dashboard/pricing/${priceId}`, { method: "PATCH", cookie: adminCookie, body: { amountCents: NEW_PRICE_CENTS } });
  assert("admin-price-edit", "PATCH /dashboard/pricing/:id returns 200 with the new amount", priceEdit.status === 200 && priceEdit.json?.data?.amountCents === NEW_PRICE_CENTS, { status: priceEdit.status, amountCents: priceEdit.json?.data?.amountCents });
  const afterPrice = await api(`/products/${slug}`);
  assert("storefront-price-refresh", "storefront API returns the edited price", afterPrice.status === 200 && afterPrice.json?.data?.price?.amountCents === NEW_PRICE_CENTS, { price: afterPrice.json?.data?.price });
  const pageWithPrice = await until(
    () => fetchText(`${WEB}/products/${slug}`).then(({ status, text }) => status === 200 && text.includes(String(NEW_PRICE_CENTS / 100)) ? text : null),
    { timeoutMs: 120_000, label: `rendered page contains ${(NEW_PRICE_CENTS / 100).toFixed(2)}` }
  );
  assert("rendered-page-price", "product page shows the edited price after refresh", !!pageWithPrice, { slug });

  // A5: admin sets inventory at the pickup location -> storefront API reflects it.
  const inventoryEdit = await api("/dashboard/inventory/snapshots", { method: "POST", cookie: adminCookie, body: { skuId, dealerLocationId: locationId, quantityOnHand: 7 } });
  assert("admin-inventory-edit", "POST /dashboard/inventory/snapshots returns 201 with quantityOnHand 7", inventoryEdit.status === 201 && inventoryEdit.json?.data?.quantityOnHand === 7, { status: inventoryEdit.status, quantityOnHand: inventoryEdit.json?.data?.quantityOnHand });
  const afterInventory = await api(`/products/${slug}`);
  const inventoryEntries = afterInventory.json?.data?.inventory ?? [];
  assert("storefront-inventory-refresh", "storefront API shows the 7-unit snapshot at the pickup location", inventoryEntries.some((entry) => entry.quantityOnHand === 7 && entry.quantityReserved === 0), { inventory: inventoryEntries });
  assert("storefront-inventory-refresh", "total available is 17 (10 seed + 7 pickup)", totalAvailable(afterInventory.json?.data) === 17, { available: totalAvailable(afterInventory.json?.data) });

  // A6: admin archives -> storefront API + rendered page 404; restore brings it back.
  const archiveEdit = await api(`/dashboard/products/${productId}`, { method: "PATCH", cookie: adminCookie, body: { status: "archived" } });
  assert("admin-status-archive", "PATCH status=archived returns 200", archiveEdit.status === 200 && archiveEdit.json?.data?.status === "archived", { status: archiveEdit.status, productStatus: archiveEdit.json?.data?.status });
  const archivedApi = await api(`/products/${slug}`);
  assert("storefront-status-404", "archived product disappears from the storefront API", archivedApi.status === 404, { status: archivedApi.status });
  const archivedPage = await until(
    () => fetchText(`${WEB}/products/${slug}`).then(({ status }) => status === 404 ? true : null),
    { timeoutMs: 120_000, label: `rendered page 404 for archived ${slug}` }
  );
  assert("rendered-page-status-404", "archived product renders 404 on the product page", archivedPage === true, { slug });
  const restoreEdit = await api(`/dashboard/products/${productId}`, { method: "PATCH", cookie: adminCookie, body: { status: "active" } });
  assert("admin-status-restore", "PATCH status=active returns 200", restoreEdit.status === 200 && restoreEdit.json?.data?.status === "active", { status: restoreEdit.status, productStatus: restoreEdit.json?.data?.status });
  const restoredApi = await api(`/products/${slug}`);
  assert("storefront-status-restore", "restored product is public again with the edited name and price", restoredApi.status === 200 && restoredApi.json?.data?.name === NEW_NAME && restoredApi.json?.data?.price?.amountCents === NEW_PRICE_CENTS, { status: restoredApi.status, name: restoredApi.json?.data?.name, price: restoredApi.json?.data?.price });

  // A7: partial admin (dashboard.access only) is denied the same product write.
  const partialLogin = await login(PARTIAL_EMAIL);
  assert("partial-admin-login", "partial admin authenticates", partialLogin.status === 200 && !!partialLogin.cookie, { status: partialLogin.status });
  const partialEdit = await api(`/dashboard/products/${productId}`, { method: "PATCH", cookie: partialLogin.cookie, body: { name: `${NEW_NAME}-denied` } });
  assert("permission-gate", "partial admin PATCH is forbidden (403)", partialEdit.status === 403, { status: partialEdit.status, error: partialEdit.json?.error });

  // A8: cart -> checkout session with the edited price.
  const cart = await api("/cart");
  const cartToken = cart.json?.meta?.cartToken;
  assert("cart-create", "anonymous cart issues a cart token", cart.status === 200 && !!cartToken, { status: cart.status, cartToken: !!cartToken });
  const cartAdd = await api("/cart/items", { method: "POST", headers: { "x-cart-token": cartToken }, body: { productId, quantity: ORDER_QTY } });
  assert("cart-add", "cart line uses the edited unit price", cartAdd.status === 201 && cartAdd.json?.data?.items?.[0]?.unitPrice?.amountCents === NEW_PRICE_CENTS, { status: cartAdd.status, items: cartAdd.json?.data?.items });
  assert("cart-add", "cart line total is 2 x edited price", cartAdd.json?.data?.items?.[0]?.lineTotal?.amountCents === SUBTOTAL, { lineTotal: cartAdd.json?.data?.items?.[0]?.lineTotal });

  const checkoutBody = {
    firstName: "Roundtrip",
    lastName: "Buyer",
    email: `roundtrip-${randomBytes4()}@vanstro.test`,
    phone: "2045550100",
    fulfillment: "pickup",
    paymentMethod: "cash",
    dealerLocationId: locationId
  };
  const session = await api("/checkout/session", { method: "POST", headers: { "x-cart-token": cartToken, "idempotency-key": randomUUID() }, body: checkoutBody });
  assert("checkout-session", "checkout session is created (201)", session.status === 201 && session.json?.data?.id, { status: session.status, sessionId: session.json?.data?.id });
  assert("checkout-session", "subtotal equals 2 x edited price", session.json?.data?.subtotal?.amountCents === SUBTOTAL, { subtotal: session.json?.data?.subtotal });
  assert("checkout-session", "MB tax is 12% of subtotal", session.json?.data?.tax?.amountCents === TAX, { tax: session.json?.data?.tax });
  assert("checkout-session", "pickup shipping is zero", session.json?.data?.shipping?.amountCents === 0, { shipping: session.json?.data?.shipping });
  assert("checkout-session", "total equals subtotal + tax", session.json?.data?.total?.amountCents === TOTAL, { total: session.json?.data?.total });
  const sessionId = session.json.data.id;
  const guestOrderToken = session.json.data.guestOrderToken;

  // A9: checkout reserves inventory — storefront quantityAvailable drops.
  const reserved = await api(`/products/${slug}`);
  const reservedEntries = reserved.json?.data?.inventory ?? [];
  assert("checkout-reserves-inventory", "7-unit snapshot now has 2 reserved", reservedEntries.some((entry) => entry.quantityOnHand === 7 && entry.quantityReserved === ORDER_QTY), { inventory: reservedEntries });
  assert("checkout-reserves-inventory", "total available dropped to 15", totalAvailable(reserved.json?.data) === 15, { available: totalAvailable(reserved.json?.data) });

  // A10: simulated in-store payment -> paid order with the edited price.
  const simulation = await api("/payments/simulate", { method: "POST", body: { sessionId } });
  assert("payment-simulate", "in-store payment simulation returns a signature", simulation.status === 200 && !!simulation.json?.data?.signature && !!simulation.json?.data?.providerPaymentId, { status: simulation.status });
  const callbackBody = { sessionId, status: "paid", providerPaymentId: simulation.json.data.providerPaymentId };
  const callback = await api("/payments/callback", { method: "POST", headers: { "x-payment-signature": simulation.json.data.signature }, body: callbackBody });
  assert("payment-callback", "payment callback finalizes a paid order", callback.status === 200 && callback.json?.data?.status === "paid" && !!callback.json?.data?.id, { status: callback.status, orderStatus: callback.json?.data?.status });
  assert("payment-callback", "order totals equal the edited price totals", callback.json?.data?.subtotal?.amountCents === SUBTOTAL && callback.json?.data?.tax?.amountCents === TAX && callback.json?.data?.total?.amountCents === TOTAL, { subtotal: callback.json?.data?.subtotal, tax: callback.json?.data?.tax, total: callback.json?.data?.total });
  const orderId = callback.json.data.id;
  assert("payment-callback", "order line carries the edited unit price and quantity", callback.json?.data?.items?.[0]?.unitPriceCents === NEW_PRICE_CENTS && callback.json?.data?.items?.[0]?.quantity === ORDER_QTY && callback.json?.data?.items?.[0]?.lineTotalCents === SUBTOTAL, { items: callback.json?.data?.items });
  assert("payment-callback", "order line references the edited SKU", callback.json?.data?.items?.[0]?.skuCode === skuCode, { skuCode: callback.json?.data?.items?.[0]?.skuCode });

  // A11: replaying the same callback is idempotent — same order, no duplicate.
  const replay = await api("/payments/callback", { method: "POST", headers: { "x-payment-signature": simulation.json.data.signature }, body: callbackBody });
  assert("payment-callback-replay", "replayed callback returns the same order", replay.status === 200 && replay.json?.data?.id === orderId, { status: replay.status, orderId: replay.json?.data?.id });

  // A12: guest order visibility requires the guest token.
  const denied = await api(`/orders/${orderId}`);
  assert("order-visibility-gate", "order without the guest token is 403", denied.status === 403, { status: denied.status, error: denied.json?.error });
  const order = await api(`/orders/${orderId}?token=${encodeURIComponent(guestOrderToken)}`);
  assert("order-fetch", "order with the guest token returns the paid order", order.status === 200 && order.json?.data?.status === "paid", { status: order.status, orderStatus: order.json?.data?.status });
  assert("order-fetch", "order totals match the session totals", order.json?.data?.subtotal?.amountCents === SUBTOTAL && order.json?.data?.tax?.amountCents === TAX && order.json?.data?.total?.amountCents === TOTAL, { subtotal: order.json?.data?.subtotal, total: order.json?.data?.total });
  assert("order-fetch", "order line keeps the edited unit price", order.json?.data?.items?.[0]?.unitPriceCents === NEW_PRICE_CENTS && order.json?.data?.items?.[0]?.lineTotalCents === SUBTOTAL, { items: order.json?.data?.items });

  // A13: payment consumes inventory — on hand decremented, reservation cleared.
  const consumed = await api(`/products/${slug}`);
  const consumedEntries = consumed.json?.data?.inventory ?? [];
  assert("inventory-consumed", "7-unit snapshot consumed 2 units", consumedEntries.some((entry) => entry.quantityOnHand === 5 && entry.quantityReserved === 0), { inventory: consumedEntries });
  assert("inventory-consumed", "total available stays 15 after consumption", totalAvailable(consumed.json?.data) === 15, { available: totalAvailable(consumed.json?.data) });

  // Cart is cleared by finalization.
  const cartAfter = await api("/cart", { headers: { "x-cart-token": cartToken } });
  assert("cart-cleared-after-order", "paid cart is emptied", cartAfter.status === 200 && (cartAfter.json?.data?.items?.length ?? 0) === 0, { items: cartAfter.json?.data?.items });

  const evidence = {
    harness: "v11-functional-first-storefront",
    testedCommit: TESTED_COMMIT,
    testedTree: TESTED_TREE,
    fixture: { productId, slug, skuId, skuCode, priceId, locationId },
    summary: { total: results.length, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length },
    cases: results
  };
  writeFileSync(`${OUT}/acceptance-results.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.summary.failed > 0) {
    console.error(`STOREFFRONT ROUND-TRIP FAILED: ${evidence.summary.failed}/${evidence.summary.total} cases failed`);
    process.exitCode = 1;
    return;
  }
  console.log(`STOREFFRONT ROUND-TRIP PASSED: ${evidence.summary.passed}/${evidence.summary.total} cases`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  const evidence = {
    harness: "v11-functional-first-storefront",
    testedCommit: TESTED_COMMIT,
    testedTree: TESTED_TREE,
    summary: { total: results.length, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length },
    cases: results,
    error: error instanceof Error ? error.message : String(error)
  };
  try {
    writeFileSync(`${OUT}/acceptance-results.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  } catch {}
  process.exitCode = 1;
});
