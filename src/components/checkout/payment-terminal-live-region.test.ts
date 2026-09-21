import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { paymentTerminalAnnouncement } from "./payment-session-poller.ts";
import { PaymentTerminalLiveRegion } from "./payment-terminal-live-region.ts";

for (const [locale, status, expected] of [
  ["en-CA", "expired", "The payment session expired. Return to checkout to check inventory again."],
  ["fr-CA", "expired", "La séance de paiement a expiré. Retournez à la caisse pour vérifier le stock de nouveau."],
  ["en-CA", "failed", "Payment could not be prepared. Return to checkout to try again."],
  ["fr-CA", "failed", "Le paiement n’a pas pu être préparé. Retournez à la caisse pour réessayer."]
] as const) {
  test(`rendered ${locale} ${status} live region contains the complete recovery message`, () => {
    const announcement = paymentTerminalAnnouncement(locale, status);
    const markup = renderToStaticMarkup(PaymentTerminalLiveRegion({ announcement }));

    assert.equal(announcement, expected);
    assert.match(markup, /role="status"/);
    assert.match(markup, /aria-live="polite"/);
    assert.match(markup, /aria-atomic="true"/);
    assert.ok(markup.includes(expected));
    assert.doesNotMatch(markup, /Payment status changed|L’état du paiement a changé/);
  });
}
