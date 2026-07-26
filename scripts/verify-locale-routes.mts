import assert from "node:assert/strict";
import {
  DYNAMIC_LOCALE_ROUTE_FAMILIES,
  STATIC_LOCALE_ROUTE_PAIRS,
  alternateLocaleHref,
  getLocaleRoutePair,
  localeHref
} from "../src/lib/i18n/routes.ts";

assert.equal(STATIC_LOCALE_ROUTE_PAIRS.length, 23);
assert.deepEqual(
  DYNAMIC_LOCALE_ROUTE_FAMILIES.map(({ key, parameter, indexable }) => ({ key, parameter, indexable })),
  [
    { key: "product", parameter: "slug", indexable: true },
    { key: "article", parameter: "slug", indexable: false },
    { key: "order", parameter: "id", indexable: false }
  ]
);

for (const pair of STATIC_LOCALE_ROUTE_PAIRS) {
  assert.equal(
    localeHref(pair.en, "fr-CA"),
    pair.frAvailable === false ? pair.en : pair.fr,
    `${pair.en} should respect French route availability`
  );
  assert.equal(localeHref(pair.fr, "en-CA"), pair.en, `${pair.fr} should map to English`);
  assert.deepEqual(getLocaleRoutePair(pair.en), pair);
  assert.deepEqual(getLocaleRoutePair(pair.fr), pair);
}

const conversions = [
  ["/products/base-cabinet-b33?finish=white#specs", "fr-CA", "/fr/products/base-cabinet-b33?finish=white#specs"],
  ["/fr/articles/pickup-and-delivery-options/#shipping", "en-CA", "/articles/pickup-and-delivery-options/#shipping"],
  ["/orders/demo-order?source=header#status", "fr-CA", "/fr/orders/demo-order?source=header#status"],
  ["/products?category=kitchen-cabinets#results", "fr-CA", "/fr/products?category=kitchen-cabinets#results"],
  ["/fr/about/?ref=footer#team", "en-CA", "/about/?ref=footer#team"],
  ["https://tools.vanstro.ca/?locale=en", "fr-CA", "https://tools.vanstro.ca/?locale=en"],
  ["/unknown/path?keep=yes#here", "fr-CA", "/unknown/path?keep=yes#here"]
] as const;

for (const [source, locale, expected] of conversions) {
  assert.equal(localeHref(source, locale), expected);
}

assert.equal(
  alternateLocaleHref("/articles/choosing-cabinets?q=oak#sizes"),
  "/fr/articles/choosing-cabinets?q=oak#sizes"
);
assert.equal(
  alternateLocaleHref("/fr/orders/VS-1001?tab=items#total"),
  "/orders/VS-1001?tab=items#total"
);
assert.equal(alternateLocaleHref("/404"), "/fr/404");
assert.equal(alternateLocaleHref("/fr/404"), "/404");
assert.equal(alternateLocaleHref("/unknown/path"), "/fr/404");
assert.equal(alternateLocaleHref("/fr/chemin-inconnu"), "/404");

process.env.NEXT_PUBLIC_BASE_PATH = "/preview";
assert.equal(
  localeHref("/preview/products/base-cabinet-b33?finish=white#specs", "fr-CA"),
  "/preview/fr/products/base-cabinet-b33?finish=white#specs"
);
assert.equal(
  alternateLocaleHref("/preview/fr/contact?from=footer#form"),
  "/preview/contact?from=footer#form"
);

console.log(`Locale route checks passed: ${STATIC_LOCALE_ROUTE_PAIRS.length} static pairs, ${DYNAMIC_LOCALE_ROUTE_FAMILIES.length} dynamic families.`);
