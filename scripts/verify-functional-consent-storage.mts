import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  COOKIE_PREFERENCES_KEY,
  FUNCTIONAL_STORAGE_KEYS,
  isCurrentCookiePreferences,
  isCookiePreferencesStorageEvent,
  makeCookiePreferences,
  recordCookiePreferences,
  writeCookiePreferences
} from "../src/lib/privacy/cookie-preferences.ts";

class MemoryStorage {
  #values = new Map<string, string>();

  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.#values.set(key, value);
  }

  removeItem(key: string) {
    this.#values.delete(key);
  }
}

const localStorage = new MemoryStorage();
let cookie = "";
const necessaryStorage = {
  language: "fr-CA",
  anonymousConsentId: "consent-id"
};
localStorage.setItem("vanstro-locale", necessaryStorage.language);
localStorage.setItem("vs_consent_id_v1", necessaryStorage.anonymousConsentId);

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage }
});
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    }
  }
});

function seedOptionalStorage() {
  for (const key of FUNCTIONAL_STORAGE_KEYS) {
    localStorage.setItem(key, `persisted:${key}`);
  }
}

function assertOptionalStorageCleared() {
  for (const key of FUNCTIONAL_STORAGE_KEYS) {
    assert.equal(localStorage.getItem(key), null, `${key} must be removed`);
  }
  assert.equal(localStorage.getItem("vanstro-locale"), necessaryStorage.language, "language must remain stored");
  assert.equal(
    localStorage.getItem("vs_consent_id_v1"),
    necessaryStorage.anonymousConsentId,
    "necessary consent identity must remain stored"
  );
}

assert.ok(
  FUNCTIONAL_STORAGE_KEYS.includes("vanstro-storefront-v1"),
  "storefront persistence must be classified as functional storage"
);

seedOptionalStorage();
writeCookiePreferences(makeCookiePreferences({
  functional: false,
  analytics: false,
  targeting: false,
  source: "reject-all"
}));
assertOptionalStorageCleared();
assert.equal(
  JSON.parse(localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? "{}").functional,
  false,
  "reject-all consent itself must remain stored"
);

seedOptionalStorage();
writeCookiePreferences(makeCookiePreferences({
  functional: false,
  analytics: true,
  targeting: false,
  source: "custom"
}));
assertOptionalStorageCleared();

seedOptionalStorage();
writeCookiePreferences(makeCookiePreferences({
  functional: true,
  analytics: true,
  targeting: true,
  source: "accept-all"
}));
for (const key of FUNCTIONAL_STORAGE_KEYS) {
  assert.equal(localStorage.getItem(key), `persisted:${key}`, `${key} must survive accept-all`);
}

seedOptionalStorage();
writeCookiePreferences(makeCookiePreferences({
  functional: true,
  analytics: false,
  targeting: false,
  source: "custom"
}));
for (const key of FUNCTIONAL_STORAGE_KEYS) {
  assert.equal(localStorage.getItem(key), `persisted:${key}`, `${key} must survive custom functional opt-in`);
}

await assert.rejects(
  recordCookiePreferences(
    makeCookiePreferences({ functional: false, analytics: false, targeting: false, source: "reject-all" }),
    async () => { throw new Error("consent database unavailable"); }
  ),
  /consent database unavailable/,
  "consent recording failures must reach the UI instead of being reported as saved"
);
assert.equal(
  JSON.parse(localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? "{}").functional,
  true,
  "a failed consent event must not undo the already-effective local choice"
);

const olderPreferences = makeCookiePreferences({
  functional: true,
  analytics: false,
  targeting: false,
  source: "custom"
});
await new Promise((resolve) => setTimeout(resolve, 2));
const newerPreferences = makeCookiePreferences({
  functional: false,
  analytics: false,
  targeting: false,
  source: "reject-all"
});
writeCookiePreferences(newerPreferences);
assert.equal(isCurrentCookiePreferences(olderPreferences), false, "a stale consent retry must be rejected");
assert.equal(isCurrentCookiePreferences(newerPreferences), true, "the newest saved preference remains current");
assert.equal(
  isCookiePreferencesStorageEvent({
    key: COOKIE_PREFERENCES_KEY,
    storageArea: localStorage
  } as never),
  true,
  "cross-tab consent changes must be recognized"
);
assert.equal(
  isCookiePreferencesStorageEvent({ key: "provider-owned-key", storageArea: localStorage } as never),
  false,
  "unrelated and cross-origin provider storage must not be guessed or cleared"
);

const tiledeskLifecycleSource = await readFile(
  new URL("../src/lib/support/tiledesk-lifecycle.ts", import.meta.url),
  "utf8"
);
assert.match(tiledeskLifecycleSource, /createTiledeskLoadGuard/);
assert.match(tiledeskLifecycleSource, /delete windowRef\.Tiledesk/);
assert.ok(
  tiledeskLifecycleSource.includes('iframe[src*="tiledesk.com"]'),
  "withdrawal must remove Tiledesk iframes"
);
const customerSupportSource = await readFile(
  new URL("../src/components/layout/CustomerSupportWidget.tsx", import.meta.url),
  "utf8"
);
assert.match(customerSupportSource, /readCookiePreferences\(\)\?\.functional === true/);
assert.match(customerSupportSource, /script\.onload/);
assert.match(customerSupportSource, /!consentAllowedRef\.current/);
assert.match(customerSupportSource, /FloatingSupportWidget/);

const { createQueuedTiledesk, createTiledeskLoadGuard, isTiledeskSdkReady, teardownTiledesk } = await import(
  "../src/lib/support/tiledesk-lifecycle.ts"
);
const loadGuard = createTiledeskLoadGuard();
const firstLoad = loadGuard.begin();
loadGuard.invalidate();
assert.equal(firstLoad(), false, "withdrawal must invalidate an in-flight Tiledesk load");
const grantedLoad = loadGuard.begin();
assert.equal(grantedLoad(), true, "a newly granted load remains current");
const staleLoad = loadGuard.begin();
const newerAuthorizedLoad = loadGuard.begin();
assert.equal(staleLoad(), false, "an older callback cannot destroy a newer authorized load");
assert.equal(newerAuthorizedLoad(), true, "the latest authorized load remains current");
const queuedWindow = {};
createQueuedTiledesk(queuedWindow as never);
assert.equal(isTiledeskSdkReady(queuedWindow as never), false, "the local queue is not verified SDK readiness");
(queuedWindow as { Tiledesk: { __vanstroQueued?: true } }).Tiledesk.__vanstroQueued = undefined;
assert.equal(isTiledeskSdkReady(queuedWindow as never), true, "a loaded SDK command is ready");

const tiledeskCommands: unknown[][] = [];
let removedElements = 0;
const tiledeskWindow = {
  Tiledesk: (...args: unknown[]) => tiledeskCommands.push(args),
  tiledeskSettings: { projectid: "test" },
  tiledesk: {},
  tiledeskWidget: {}
};
const tiledeskDocument = {
  querySelectorAll: () => [
    { remove: () => { removedElements += 1; } }
  ]
};
teardownTiledesk(tiledeskWindow as never, tiledeskDocument as never);
assert.deepEqual(tiledeskCommands, [["hide"], ["destroy"]], "revocation must destroy a loaded widget");
assert.equal(removedElements, 2, "revocation must remove scripts and embedded widget elements");
assert.equal("Tiledesk" in tiledeskWindow, false, "revocation must remove the SDK global");
assert.equal("tiledeskSettings" in tiledeskWindow, false, "revocation must remove SDK settings");
assert.equal(firstLoad(), false, "a revoked load must remain invalid and cannot initialize later");

const storefrontProviderSource = await readFile(
  new URL("../src/components/storefront/StorefrontProvider.tsx", import.meta.url),
  "utf8"
);
assert.match(
  storefrontProviderSource,
  /if \(!hydrated \|\| !functionalConsent\) return;/,
  "storefront persistence must be disabled without functional consent"
);
assert.match(
  storefrontProviderSource,
  /addEventListener\(COOKIE_PREFERENCES_SAVED_EVENT, syncFunctionalConsent\)/,
  "the mounted storefront must react to same-tab consent withdrawal"
);
assert.match(
  storefrontProviderSource,
  /addEventListener\("storage", syncCrossTabConsent\)/,
  "the mounted storefront must react to cross-tab consent withdrawal"
);
assert.match(
  customerSupportSource,
  /addEventListener\("storage", syncCrossTabConsent\)/,
  "customer support must tear down after cross-tab consent withdrawal"
);
assert.match(customerSupportSource, /isTiledeskSdkReady\(windowRef\)/);
assert.doesNotMatch(
  customerSupportSource,
  /document\.getElementById\("tiledesk-jssdk"\)[\s\S]{0,200}setThirdPartySupportReady\(true\)/,
  "a script element alone must never mark Tiledesk ready"
);
for (const reset of [
  "setOrders([])",
  "setSelectedDealerId(DEFAULT_DEALER_ID)",
  "setSelectedDealerName(DEFAULT_DEALER_NAME)",
  'setPostalCodeState("")',
  "setProductIdentityAliases({})"
]) {
  assert.ok(storefrontProviderSource.includes(reset), `withdrawal must reset optional state: ${reset}`);
}
assert.match(
  storefrontProviderSource,
  /void vanstroApi\.getCart\(\)/,
  "necessary cart loading must remain API-backed"
);
assert.match(
  storefrontProviderSource,
  /async addToCart[\s\S]*?vanstroApi\.addCartProduct/,
  "necessary add-to-cart operations must remain available"
);

console.log("Functional consent storage checks passed.");
