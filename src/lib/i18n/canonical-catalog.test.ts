import assert from "node:assert/strict";
import test from "node:test";
import { canonicalCatalogUrl } from "./routes.ts";
import { isCanonicalCatalogHref } from "./canonical-catalog.ts";

test("canonical catalog URL is a clean locale route with trailing slash", () => {
  assert.equal(canonicalCatalogUrl("en-CA"), "/products/");
  assert.equal(canonicalCatalogUrl("fr-CA"), "/fr/products/");
});

test("canonical catalog URL never carries search, filter or pagination state", () => {
  for (const locale of ["en-CA", "fr-CA"] as const) {
    const url = canonicalCatalogUrl(locale);
    assert.ok(!url.includes("?"), `${url} must not contain a query string`);
    assert.ok(!url.includes("q="), `${url} must not contain a q param`);
    assert.ok(!url.includes("category="), `${url} must not contain a category param`);
    assert.ok(!url.includes("subcategory="), `${url} must not contain a subcategory param`);
    assert.ok(!url.includes("sort="), `${url} must not contain a sort param`);
  }
});

test("canonical catalog URL is derived purely from locale and ignores any previous query state", () => {
  const previousState = "?q=cabinet&category=kitchen-cabinets&sort=price-asc&page=3";
  assert.equal(
    `${canonicalCatalogUrl("en-CA")}${previousState}`.split("?")[0],
    canonicalCatalogUrl("en-CA")
  );
  assert.equal(
    `${canonicalCatalogUrl("fr-CA")}${previousState}`.split("?")[0],
    canonicalCatalogUrl("fr-CA")
  );
});

test("canonical href detection accepts only query-free catalog URLs", () => {
  assert.equal(isCanonicalCatalogHref(canonicalCatalogUrl("en-CA")), true);
  assert.equal(isCanonicalCatalogHref(canonicalCatalogUrl("fr-CA")), true);
  assert.equal(isCanonicalCatalogHref("/products"), true);
  assert.equal(isCanonicalCatalogHref("/fr/products"), true);
  assert.equal(isCanonicalCatalogHref("/products/?q=cabinet"), false);
  assert.equal(isCanonicalCatalogHref("/fr/products/?category=kitchen-cabinets"), false);
  assert.equal(isCanonicalCatalogHref("/products/?subcategory=accessories"), false);
  assert.equal(isCanonicalCatalogHref("/products/vanity-cabinet-vs24-384"), false);
  assert.equal(isCanonicalCatalogHref("/fr/products/vanity-cabinet-vs24-384"), false);
});
