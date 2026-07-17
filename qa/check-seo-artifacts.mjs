import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "out");

function findHtml(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findHtml(path);
    return entry.name === "index.html" ? [path] : [];
  });
}

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1])
  );
}

const htmlFiles = findHtml(out);
assert.equal(htmlFiles.length, 171, "Static export route count changed");

const robots = readFileSync(join(out, "robots.txt"), "utf8");
const host = robots.match(/^Host: (https:\/\/[^\s]+)$/m)?.[1];
assert(host, "Configured build must emit an HTTPS robots host");
for (const route of ["account", "cart", "checkout", "cookie-settings", "dashboard", "favorites", "orders", "v1-1"]) {
  assert(robots.includes(`Disallow: ${new URL(host).pathname}/${route}`.replace("//", "/")), `robots.txt must disallow ${route}`);
}

const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.equal(sitemapUrls.length, 157, "Sitemap must contain 17 public routes and 140 PDPs");
assert(!sitemapUrls.some((url) => /\/articles\/(?!$)/.test(new URL(url).pathname)), "Placeholder article details must not enter the sitemap");

const productFiles = htmlFiles.filter((path) => /\/products\/[^/]+\/index\.html$/.test(path));
assert.equal(productFiles.length, 140, "Expected all 140 PDP artifacts");

let productGroups = 0;
let variants = 0;
const skus = new Set();
const allowedAvailability = new Set([
  "https://schema.org/InStock",
  "https://schema.org/OutOfStock",
  "https://schema.org/BackOrder"
]);

for (const file of productFiles) {
  const html = readFileSync(file, "utf8");
  assert(/<link rel="canonical" href="https:\/\//.test(html), `Missing canonical: ${file}`);
  assert(/<meta property="og:image" content="https:\/\//.test(html), `Missing OG image: ${file}`);
  assert(/<meta name="twitter:image" content="https:\/\//.test(html), `Missing Twitter image: ${file}`);
  assert(!html.includes("AggregateRating"), `Unverified rating schema: ${file}`);

  const group = jsonLd(html).find((entry) => entry["@type"] === "ProductGroup");
  assert(group, `Missing ProductGroup: ${file}`);
  productGroups += 1;

  for (const variant of group.hasVariant) {
    assert(!skus.has(variant.sku), `Duplicate schema SKU: ${variant.sku}`);
    skus.add(variant.sku);
    variants += 1;
    assert(allowedAvailability.has(variant.offers.availability), `Invalid availability: ${variant.sku}`);
    for (const image of variant.image ?? []) {
      assert(image.startsWith(`${host}/assets/`), `Non-controlled schema image: ${image}`);
    }
  }
}

assert.equal(productGroups, 140, "Expected 140 ProductGroup graphs");
assert.equal(variants, 300, "Expected 300 schema variants");
assert.equal(skus.size, 300, "Expected 300 unique schema SKUs");

for (const slug of [
  "how-to-measure-for-cabinets",
  "what-finishes-are-available",
  "pickup-and-delivery-options"
]) {
  const html = readFileSync(join(out, "articles", slug, "index.html"), "utf8");
  assert(html.includes('name="robots" content="noindex, nofollow, noarchive"'), `Article must be noindex: ${slug}`);
  assert(!jsonLd(html).some((entry) => entry["@type"] === "Article"), `Placeholder Article schema: ${slug}`);
}

const chineseAbout = readFileSync(join(out, "zh", "about", "index.html"), "utf8");
assert(/hreflang="en-CA"/i.test(chineseAbout), "Chinese route needs English hreflang");
assert(/hreflang="zh-CN"/i.test(chineseAbout), "Chinese route needs Chinese hreflang");
assert(chineseAbout.includes('name="content-language" content="zh-CN"'), "Chinese route needs a content-language signal");

console.log("SEO artifact checks passed: 171 routes, 140 ProductGroups, 300 variants");
