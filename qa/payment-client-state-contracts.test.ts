import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/checkout/PaymentClient.tsx", import.meta.url),
  "utf8"
);

test("Payment session loading and provider or action errors use separate state channels", () => {
  assert.match(source, /const \[sessionLoadError, setSessionLoadError\] = useState\(""\)/);
  assert.match(source, /const \[actionMessage, setActionMessage\] = useState\(""\)/);
  assert.match(source, /const \[actionMessageTone, setActionMessageTone\]/);

  const onSession = source.slice(source.indexOf("onSession:"), source.indexOf("onError:"));
  assert.match(onSession, /setSessionLoadError\(""\)/);
  assert.doesNotMatch(onSession, /setActionMessage/);

  const monerisError = source.slice(source.indexOf("script.onerror"), source.indexOf("document.body.appendChild"));
  assert.match(monerisError, /setActionMessage\(copy\.payment\.cardUnavailable\)/);
  assert.doesNotMatch(monerisError, /setSessionLoadError/);

  const confirmPayment = source.slice(source.indexOf("async function completePayment"), source.indexOf("async function startCardPayment"));
  assert.match(confirmPayment, /setActionMessage\(localizeApiError/);
  assert.doesNotMatch(confirmPayment, /setSessionLoadError/);

  const simulatePayment = source.slice(source.indexOf("async function simulateInStorePayment"), source.indexOf("const remainingMs"));
  assert.match(simulatePayment, /setActionMessage\(localizeApiError/);
  assert.doesNotMatch(simulatePayment, /setSessionLoadError/);
});

test("late accepted confirmations preserve the latest authoritative session", () => {
  const acceptedBranch = source.slice(
    source.indexOf('if ("accepted" in result.data)'),
    source.indexOf("setActionMessage(copy.payment.successRedirect)")
  );
  assert.match(acceptedBranch, /applyAcceptedPaymentConfirmation\(\{/);
  assert.match(acceptedBranch, /setSession,/);
  assert.doesNotMatch(acceptedBranch, /status: "pending"/);
  assert.doesNotMatch(acceptedBranch, /pollerRef\.current\?\.(?:retry|start)/);
});

test("Moneris, confirm and simulate errors survive successful session polls", () => {
  const onSession = source.slice(source.indexOf("onSession:"), source.indexOf("onError:"));
  assert.doesNotMatch(onSession, /setActionMessage/);

  const monerisError = source.slice(source.indexOf("script.onerror"), source.indexOf("document.body.appendChild"));
  assert.match(monerisError, /setActionMessage\(copy\.payment\.cardUnavailable\)/);

  const confirmCatch = source.slice(source.indexOf("async function completePayment"), source.indexOf("async function startCardPayment"));
  assert.match(confirmCatch, /setActionMessage\(localizeApiError/);

  const simulateCatch = source.slice(source.indexOf("async function simulateInStorePayment"), source.indexOf("const remainingMs"));
  assert.match(simulateCatch, /setActionMessage\(localizeApiError/);
});

test("loaded and initial session Retry controls remain mounted while checking", () => {
  const retryHandlers = [...source.matchAll(/setManualChecking\(true\);\s*pollerRef\.current\?\.retry\(\)/g)];
  assert.equal(retryHandlers.length, 3);
  assert.doesNotMatch(source, /onClick=\{\(\) => \{\s*setSessionLoadError\(""\)/);
  assert.doesNotMatch(source, /<button[^>]*\sdisabled=\{sessionRetrying/);
  assert.match(source, /aria-disabled=\{sessionRetrying \|\| manualChecking\}/);
  assert.match(source, /if \(sessionRetrying \|\| manualChecking\) return/);
  assert.match(source, /Checking again…/);
  assert.match(source, /Nouvelle vérification…/);
});

test("Payment async terminal state announces and receives focus only after pending transition", () => {
  assert.match(source, /previousStatus !== "pending"/);
  assert.match(source, /status !== "expired" && status !== "failed"/);
  assert.match(source, /setTerminalAnnouncement\(paymentTerminalAnnouncement\(locale, status\)\)/);
  assert.match(source, /requestAnimationFrame\(\(\) => terminalHeadingRef\.current\?\.focus\(\)\)/);
  assert.match(source, /pendingTerminalRef\.current = status/);
  assert.match(source, /document\.visibilityState !== "visible"/);
  assert.match(source, /<PaymentTerminalLiveRegion announcement=\{terminalAnnouncement\} \/>/);
  assert.doesNotMatch(source, /Payment status changed\.|L’état du paiement a changé\./);
  assert.match(source, /<h2 ref=\{terminalHeadingRef\} tabIndex=\{-1\}>/);
});

test("pollable reconciliation and refund states expose session errors and Retry", () => {
  const lifecycleState = source.slice(
    source.indexOf('if (["reconciliation_required"'),
    source.indexOf("return (\n    <div className=\"payment-layout\">")
  );
  assert.match(lifecycleState, /\{sessionLoadError \? \(/);
  assert.match(lifecycleState, /role="status">\{sessionLoadError\}/);
  assert.match(lifecycleState, /pollerRef\.current\?\.retry\(\)/);
  assert.match(lifecycleState, /aria-disabled=\{sessionRetrying \|\| manualChecking\}/);
});

test("Payment rendered live region receives the complete localized terminal recovery message", () => {
  const liveRegion = source.slice(
    source.indexOf("<PaymentTerminalLiveRegion"),
    source.indexOf("<h2 ref={terminalHeadingRef}")
  );
  assert.match(liveRegion, /announcement=\{terminalAnnouncement\}/);
  assert.doesNotMatch(liveRegion, /terminalAnnouncement \?/);

  const announcementHelper = source.replaceAll("\r\n", "\n");
  assert.match(
    announcementHelper,
    /setTerminalAnnouncement\(paymentTerminalAnnouncement\(locale, status\)\)/
  );
});
