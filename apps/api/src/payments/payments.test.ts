import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { ManualPaymentProvider } from "./manual.js";
import { MonerisPaymentProvider, type MonerisConfig } from "./moneris.js";

const SECRET = "manual-callback-test-secret";

function sign(sessionId: string, providerPaymentId: string) {
  return createHmac("sha256", SECRET).update(`${sessionId}:${providerPaymentId}`).digest("hex");
}

test("manual provider verifies a correctly signed callback", async () => {
  const provider = new ManualPaymentProvider(SECRET);
  const result = await provider.verify({
    paymentSessionId: "sess-1",
    amountCents: 1000,
    currency: "CAD",
    providerPaymentId: "pay-1",
    signature: sign("sess-1", "pay-1")
  });
  assert.deepEqual(result, { ok: true, providerPaymentId: "pay-1" });
});

test("manual provider rejects an invalid signature", async () => {
  const provider = new ManualPaymentProvider(SECRET);
  const result = await provider.verify({
    paymentSessionId: "sess-1",
    amountCents: 1000,
    currency: "CAD",
    providerPaymentId: "pay-1",
    signature: "deadbeef"
  });
  assert.equal(result.ok, false);
});

test("manual provider rejects a missing providerPaymentId", async () => {
  const provider = new ManualPaymentProvider(SECRET);
  const result = await provider.verify({ paymentSessionId: "sess-1", amountCents: 1000, currency: "CAD", signature: "x" });
  assert.equal(result.ok, false);
});

test("manual provider initiate is a no-op handoff", async () => {
  const provider = new ManualPaymentProvider(SECRET);
  const result = await provider.initiate({ paymentSessionId: "sess-1", amountCents: 1000, currency: "CAD", email: "a@b.ca" });
  assert.deepEqual(result, { provider: "manual" });
});

const monerisConfig: MonerisConfig = {
  environment: "qa",
  storeId: "store1",
  apiToken: "token1",
  checkoutId: "chkt1"
};

test("moneris initiate returns a ticket from a successful preload", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({ response: { success: "true", ticket: "ticket-abc" } }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  const result = await provider.initiate({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", email: "a@b.ca" });
  assert.equal(result.ticket, "ticket-abc");
  assert.equal(result.provider, "moneris");
});

test("moneris initiate throws when preload fails", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({ response: { success: "false" } }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  await assert.rejects(() => provider.initiate({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", email: "a@b.ca" }));
});

test("moneris verify confirms a successful receipt", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({
      response: {
        success: "true",
        receipt: {
          order_no: "order-1",
          txn_total: "25.00",
          cc: { result: { success: "true" } }
        }
      }
    }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  const result = await provider.verify({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", ticket: "ticket-abc" });
  assert.deepEqual(result, { ok: true, providerPaymentId: "ticket-abc" });
});

test("moneris verify rejects mismatched order_no", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({
      response: {
        success: "true",
        receipt: { order_no: "other-order", txn_total: "25.00", cc: { result: { success: "true" } } }
      }
    }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  const result = await provider.verify({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", ticket: "ticket-abc" });
  assert.equal(result.ok, false);
});

test("moneris verify rejects mismatched amount", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({
      response: {
        success: "true",
        receipt: { order_no: "order-1", txn_total: "10.00", cc: { result: { success: "true" } } }
      }
    }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  const result = await provider.verify({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", ticket: "ticket-abc" });
  assert.equal(result.ok, false);
});

test("moneris verify rejects a successful receipt without order_no", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({
      response: {
        success: "true",
        receipt: { txn_total: "25.00", cc: { result: { success: "true" } } }
      }
    }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  const result = await provider.verify({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", ticket: "ticket-abc" });
  assert.equal(result.ok, false);
});

test("moneris verify rejects a successful receipt without amount", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({
      response: {
        success: "true",
        receipt: { order_no: "order-1", cc: { result: { success: "true" } } }
      }
    }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  const result = await provider.verify({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", ticket: "ticket-abc" });
  assert.equal(result.ok, false);
});

test("moneris verify rejects an unsuccessful receipt", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response(JSON.stringify({ response: { success: "true", receipt: { cc: { result: { success: "false" } } } } }), { status: 200 });
  const provider = new MonerisPaymentProvider(monerisConfig, fetchMock);
  const result = await provider.verify({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD", ticket: "ticket-abc" });
  assert.equal(result.ok, false);
});

test("moneris verify requires a ticket", async () => {
  const provider = new MonerisPaymentProvider(monerisConfig, async () => new Response("{}"));
  const result = await provider.verify({ paymentSessionId: "order-1", amountCents: 2500, currency: "CAD" });
  assert.equal(result.ok, false);
});
