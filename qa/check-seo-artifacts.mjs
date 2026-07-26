import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { STATIC_LOCALE_ROUTE_PAIRS } from "../src/lib/i18n/routes.ts";

const root = process.cwd();
const out = join(root, "out");
const catalogSource = readFileSync(join(root, "src/lib/data/mb01-products.ts"), "utf8");
const productSlugs = [...catalogSource.matchAll(/^\s*"slug":\s*"([^"]+)",$/gm)].map((match) => match[1]);
const productSkus = [...catalogSource.matchAll(/^\s*"sku":\s*"([^"]+)",$/gm)].map((match) => match[1]);
const uniqueProductSlugs = new Set(productSlugs);
const uniqueProductSkus = new Set(productSkus);

assert.equal(uniqueProductSlugs.size, productSlugs.length, "Catalog parent slugs must be unique");

function findHtml(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findHtml(path);
    return entry.name === "index.html" ? [path] : [];
  });
}

function routeFromHtml(file) {
  const relativePath = relative(out, file).split(sep).join("/");
  if (relativePath === "index.html") return "/";
  return `/${relativePath.replace(/\/index\.html$/, "")}`;
}

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1])
  );
}

function urlsFromSitemap(xml) {
  return [...xml.matchAll(/<url>(.*?)<\/url>/gs)].map((match) => ({
    loc: match[1].match(/<loc>(.*?)<\/loc>/)?.[1],
    alternates: Object.fromEntries(
      [...match[1].matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/>/g)].map(
        (alternate) => [alternate[1], alternate[2]]
      )
    )
  }));
}

function absoluteRoute(path, host) {
  return new URL(path === "/" ? "/" : `${path}/`, host).href;
}

const htmlFiles = findHtml(out);
const actualHtmlRoutes = new Set(htmlFiles.map(routeFromHtml));
const articleSlugs = [
  "how-to-measure-for-cabinets",
  "what-finishes-are-available",
  "pickup-and-delivery-options"
];
const expectedApplicationRoutes = new Set([
  ...STATIC_LOCALE_ROUTE_PAIRS.flatMap(({ en, fr, frAvailable }) =>
    (frAvailable === false ? [en] : [en, fr]).filter((route) => route !== "/404")
  ),
  ...productSlugs.flatMap((slug) => [`/products/${slug}`, `/fr/products/${slug}`]),
  ...articleSlugs.flatMap((slug) => [`/articles/${slug}`, `/fr/articles/${slug}`]),
  "/orders/demo-order",
  "/fr/orders/demo-order"
]);
const frameworkRoutes = new Set(["/404", "/_not-found"]);

assert.deepEqual(
  [...actualHtmlRoutes].filter((route) => !frameworkRoutes.has(route)).sort(),
  [...expectedApplicationRoutes].sort(),
  "Static export routes must match the locale manifest and dynamic source sets"
);
assert([...actualHtmlRoutes].every((route) => !route.startsWith("/zh")), "Static export must not include Chinese routes");

const robots = readFileSync(join(out, "robots.txt"), "utf8");
const host = robots.match(/^Host: (https:\/\/[^\s]+)$/m)?.[1];
assert(host, "Configured build must emit an HTTPS robots host");
for (const route of ["account", "cart", "checkout", "cookie-settings", "dashboard", "favorites", "orders", "v1-1"]) {
  for (const prefix of ["", "/fr"]) {
    const disallowedPath = new URL(`${prefix}/${route}`, host).pathname;
    assert(robots.includes(`Disallow: ${disallowedPath}`), `robots.txt must disallow ${disallowedPath}`);
  }
}

const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
const sitemapEntries = urlsFromSitemap(sitemap);
const sitemapByUrl = new Map(sitemapEntries.map((entry) => [entry.loc, entry]));
const indexableStaticPairs = STATIC_LOCALE_ROUTE_PAIRS.filter((pair) => pair.indexable && pair.frAvailable !== false);
const indexablePairs = [
  ...indexableStaticPairs,
  ...productSlugs.map((slug) => ({ en: `/products/${slug}`, fr: `/fr/products/${slug}` }))
];
const expectedSitemapUrls = new Set(
  indexablePairs.flatMap(({ en, fr }) => [absoluteRoute(en, host), absoluteRoute(fr, host)])
);

assert.deepEqual(
  [...sitemapByUrl.keys()].sort(),
  [...expectedSitemapUrls].sort(),
  "Sitemap URLs must match all indexable EN/FR static routes and PDPs"
);
assert(![...sitemapByUrl.keys()].some((url) => new URL(url).pathname.startsWith("/zh/")), "Sitemap must not include Chinese routes");

for (const pair of indexablePairs) {
  const enUrl = absoluteRoute(pair.en, host);
  const frUrl = absoluteRoute(pair.fr, host);
  for (const url of [enUrl, frUrl]) {
    const entry = sitemapByUrl.get(url);
    assert(entry, `Missing sitemap URL: ${url}`);
    assert.equal(entry.alternates["en-CA"], enUrl, `Missing reciprocal en-CA sitemap alternate: ${url}`);
    assert.equal(entry.alternates["fr-CA"], frUrl, `Missing reciprocal fr-CA sitemap alternate: ${url}`);
    assert.equal(entry.alternates["x-default"], enUrl, `Missing x-default sitemap alternate: ${url}`);
  }
}

const productRoutesByLocale = {
  en: [...actualHtmlRoutes].filter((route) => /^\/products\/[^/]+$/.test(route)),
  fr: [...actualHtmlRoutes].filter((route) => /^\/fr\/products\/[^/]+$/.test(route))
};
for (const [locale, routes] of Object.entries(productRoutesByLocale)) {
  const slugs = new Set(routes.map((route) => route.split("/").at(-1)));
  assert.deepEqual([...slugs].sort(), [...uniqueProductSlugs].sort(), `${locale} PDP slugs must match the catalog`);
}

let productGroups = 0;
let variants = 0;
const schemaSkus = new Set();
for (const route of productRoutesByLocale.en) {
  const file = join(out, route.slice(1), "index.html");
  const html = readFileSync(file, "utf8");
  assert(/<link rel="canonical" href="https:\/\//.test(html), `Missing canonical: ${route}`);
  assert(/<link rel="alternate" hrefLang="fr-CA" href="https:\/\//.test(html), `Missing fr-CA hreflang: ${route}`);
  assert(/<meta property="og:image" content="https:\/\//.test(html), `Missing OG image: ${route}`);
  assert(/<meta name="twitter:image" content="https:\/\//.test(html), `Missing Twitter image: ${route}`);
  assert(!html.includes("AggregateRating"), `Unverified rating schema: ${route}`);

  const group = jsonLd(html).find((entry) => entry["@type"] === "ProductGroup");
  assert(group, `Missing ProductGroup: ${route}`);
  productGroups += 1;
  for (const variant of group.hasVariant) {
    assert(!schemaSkus.has(variant.sku), `Duplicate EN schema SKU: ${variant.sku}`);
    schemaSkus.add(variant.sku);
    variants += 1;
    for (const image of variant.image ?? []) {
      assert(image.startsWith(`${host}/assets/`), `Non-controlled schema image: ${image}`);
    }
  }
}
assert.equal(productGroups, uniqueProductSlugs.size, "EN ProductGroup count must match catalog parents");
assert.equal(variants, uniqueProductSkus.size, "EN schema variants must match unique catalog SKUs");
assert.deepEqual([...schemaSkus].sort(), [...uniqueProductSkus].sort(), "EN schema SKUs must match the catalog");

for (const pair of indexablePairs) {
  for (const [locale, route] of [["en", pair.en], ["fr", pair.fr]]) {
    const file = join(out, route === "/" ? "" : route.slice(1), "index.html");
    const html = readFileSync(file, "utf8");
    const ownUrl = absoluteRoute(route, host);
    const enUrl = absoluteRoute(pair.en, host);
    const frUrl = absoluteRoute(pair.fr, host);
    assert(html.includes(`rel="canonical" href="${ownUrl}"`), `${locale} canonical must be self-referencing: ${route}`);
    assert(html.includes(`hrefLang="en-CA" href="${enUrl}"`), `Missing en-CA hreflang: ${route}`);
    assert(html.includes(`hrefLang="fr-CA" href="${frUrl}"`), `Missing fr-CA hreflang: ${route}`);
    if (locale === "fr") {
      assert(html.includes('<html lang="fr-CA"'), `French document language missing: ${route}`);
      assert(!html.includes('<html lang="en-CA"'), `French document still declares en-CA: ${route}`);
    }
  }
}

for (const slug of articleSlugs) {
  for (const prefix of ["", "fr/"]) {
    const html = readFileSync(join(out, prefix, "articles", slug, "index.html"), "utf8");
    assert(html.includes('name="robots" content="noindex, nofollow, noarchive"'), `Article must be noindex: ${prefix}${slug}`);
    assert(!jsonLd(html).some((entry) => entry["@type"] === "Article"), `Placeholder Article schema: ${prefix}${slug}`);
  }
}

console.log(
  `SEO artifact checks passed: ${expectedApplicationRoutes.size} application routes, ` +
    `${expectedSitemapUrls.size} indexable URLs, ${uniqueProductSlugs.size} PDPs per locale, ` +
    `${uniqueProductSkus.size} catalog SKUs.`
);
