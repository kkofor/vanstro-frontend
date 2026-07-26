import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PUBLIC_API_ERROR_CODES } from "../src/lib/api/api-contract.ts";
import {
  backendErrorMessageFixtures,
  localizeApiError,
  normalizeApiErrorCode,
  type PublicApiErrorCode
} from "../src/lib/i18n/api-error-localization.ts";

type Failure = {
  domain: string;
  message: string;
  expectedCode: PublicApiErrorCode;
};

function apiError(message: string, status = 400, code = "API_ERROR") {
  return Object.assign(new Error(message), { code, status });
}

const failures: Failure[] = Object.entries(backendErrorMessageFixtures).flatMap(
  ([domain, entries]) => entries.map(([message, expectedCode]) => ({ domain, message, expectedCode }))
);

for (const failure of failures) {
  const error = apiError(failure.message, failure.domain === "rateLimit" ? 429 : 400);
  assert.equal(
    normalizeApiErrorCode(error),
    failure.expectedCode,
    `${failure.domain}: ${failure.message}`
  );
  const french = localizeApiError(error, "fr-CA");
  assert.notEqual(french, failure.message, `${failure.domain}: raw English must not leak to fr-CA`);
  assert.equal(localizeApiError(error, "en-CA"), failure.message, `${failure.domain}: English must remain unchanged`);
}

const dynamicFailures: Failure[] = [
  { domain: "commerce", message: "Insufficient inventory for VS-101.", expectedCode: "INVENTORY_INSUFFICIENT" },
  { domain: "commerce", message: "productIds cannot contain more than 100 items.", expectedCode: "COMMERCE_INVALID" }
];
for (const failure of dynamicFailures) {
  assert.equal(normalizeApiErrorCode(apiError(failure.message)), failure.expectedCode, failure.message);
}

assert.equal(
  normalizeApiErrorCode(apiError("A valid service account token is required.", 401)),
  "UNKNOWN",
  "unrelated required messages must not be treated as submission validation"
);
assert.equal(
  normalizeApiErrorCode(apiError("Changed server wording", 409, "INVENTORY_REFRESHING")),
  "INVENTORY_REFRESHING",
  "stable API codes take precedence over wording"
);
assert.equal(
  normalizeApiErrorCode(apiError("Changed privacy failure wording", 500, "PRIVACY_CONSENT_FAILED")),
  "PRIVACY_CONSENT_FAILED",
  "privacy persistence failures normalize by stable code"
);
assert.notEqual(
  localizeApiError(apiError("Cookie preferences could not be recorded. Please try again.", 500, "PRIVACY_CONSENT_FAILED"), "fr-CA"),
  "Cookie preferences could not be recorded. Please try again.",
  "privacy persistence failures must be localized"
);
assert.equal(
  normalizeApiErrorCode(apiError("Changed identity wording", 409, "PRODUCT_IDENTITY_MISMATCH")),
  "PRODUCT_IDENTITY_MISMATCH",
  "client call-site codes normalize without relying on message text"
);
assert.equal(
  normalizeApiErrorCode(apiError("Product mb01 does not match API SKU MB-02.", 409, "PRODUCT_IDENTITY_MISMATCH")),
  "PRODUCT_IDENTITY_MISMATCH",
  "product identity call-site errors use their stable code"
);
assert.equal(
  normalizeApiErrorCode(apiError("Unrecognized upstream throttle text", 429)),
  "RATE_LIMITED",
  "HTTP 429 remains a domain-aware rate-limit fallback"
);
assert.equal(
  localizeApiError({ unexpected: true }, "fr-CA"),
  "La demande n’a pas pu être traitée. Veuillez réessayer.",
  "non-Error unknown fallback"
);
assert.equal(
  localizeApiError({ unexpected: true }, "en-CA", "English fallback"),
  "English fallback",
  "English fallback remains caller-controlled"
);

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceByDomain = {
  auth: await readFile(`${root}/apps/api/src/routes/auth.ts`, "utf8"),
  catalog: await readFile(`${root}/apps/api/src/routes/catalog.ts`, "utf8"),
  commerce: await readFile(`${root}/apps/api/src/routes/commerce.ts`, "utf8"),
  rateLimit: await readFile(`${root}/apps/api/src/middleware/rate-limit.ts`, "utf8"),
  submissions: await readFile(`${root}/apps/api/src/routes/submissions.ts`, "utf8"),
  privacy: await readFile(`${root}/apps/api/src/routes/privacy.ts`, "utf8")
};
for (const [domain, entries] of Object.entries(backendErrorMessageFixtures)) {
  const source = sourceByDomain[domain as keyof typeof sourceByDomain];
  for (const [message, expectedCode] of entries) {
    assert.ok(source.includes(message), `${domain}: maintained backend literal drifted: ${message}`);
    const escapedMessage = message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const directResponse = new RegExp(
      `publicError\\([\\s\\S]{0,80}?"${expectedCode}"[\\s\\S]{0,160}?${escapedMessage}`
    );
    const transactionConflict = new RegExp(
      `InventoryConflictError\\("${escapedMessage}",\\s*"${expectedCode}"\\)`
    );
    const badRequestResponse = new RegExp(
      `badRequest\\([\\s\\S]{0,80}?"${expectedCode}"[\\s\\S]{0,160}?${escapedMessage}`
    );
    assert.ok(
      directResponse.test(source) || transactionConflict.test(source) || badRequestResponse.test(source),
      `${domain}: ${message} must be paired with ${expectedCode}`
    );
  }
}

for (const [domain, source] of Object.entries(sourceByDomain)) {
  assert.doesNotMatch(
    source,
    /context\.json\(\{\s*error\s*:/,
    `${domain}: public error responses must use publicError and include a stable code`
  );
}

const backendCatalogSource = await readFile(`${root}/apps/api/src/public-errors.ts`, "utf8");
for (const code of PUBLIC_API_ERROR_CODES) {
  if (code === "PRODUCT_IDENTITY_MISMATCH") continue;
  assert.ok(backendCatalogSource.includes(`"${code}"`), `backend catalog is missing ${code}`);
}
const backendCodes = [...backendCatalogSource.matchAll(/^  "([A-Z_]+)"[,]?$/gm)].map((match) => match[1]);
assert.deepEqual(
  backendCodes,
  PUBLIC_API_ERROR_CODES.filter((code) => code !== "PRODUCT_IDENTITY_MISMATCH"),
  "backend and frontend public API code catalogs must remain exhaustive and ordered"
);

assert.equal(
  normalizeApiErrorCode(apiError("Legacy wording", 400, "COMMERCE_NOT_FOUND")),
  "COMMERCE_NOT_FOUND",
  "every canonical backend code must be preferred over message text"
);

const storefrontSource = await readFile(`${root}/src/components/storefront/StorefrontProvider.tsx`, "utf8");
assert.match(storefrontSource, /const localizationRef = useRef\(\{ locale, requestError:/);
assert.match(storefrontSource, /localizationRef\.current = \{ locale, requestError:/);
assert.ok(
  storefrontSource.match(/localizationRef\.current\.locale/g)?.length === 3,
  "cart, favorites, and mutation failures must read the current locale at catch time"
);
assert.match(
  storefrontSource,
  /const runMutation = useCallback[\s\S]*?localizationRef\.current\.locale[\s\S]*?\}, \[\]\);/,
  "stable mutation callbacks must localize through the current-locale ref"
);

console.log(
  `Verified ${failures.length} maintained backend literals, ${dynamicFailures.length} dynamic commerce messages, stable call-site codes, and EN/FR locale switching architecture.`
);
