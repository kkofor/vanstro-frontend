import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./HomePage.tsx", import.meta.url), "utf8");
const frenchSource = await readFile(new URL("./HomePageFr.tsx", import.meta.url), "utf8");
const hero = await readFile(new URL("./HomeHero.tsx", import.meta.url), "utf8");
const collection = await readFile(new URL("./HomeCollectionCard.tsx", import.meta.url), "utf8");
const productGrid = await readFile(new URL("./HomeProductGrid.tsx", import.meta.url), "utf8");
const productCard = await readFile(new URL("../product/ProductCard.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

test("homepage category cards use runtime catalog data without a fixed card count", () => {
  assert.match(source, /useLocale/);
  assert.match(source, /const \{ categories: runtimeCategories \} = useLocale\(\)/);
  assert.match(source, /const effectiveCategories = runtimeCategories\.length \? runtimeCategories : categories/);
  assert.match(source, /effectiveCategories\.map\(\(category\)/);
  assert.match(source, /HomeCollectionCard/);
  assert.doesNotMatch(source, /category-placeholder/);
});

test("homepage preserves five modules and production route split in both locales", () => {
  for (const page of [source, frenchSource]) {
    assert.equal((page.match(/<section/g) ?? []).length, 2);
    assert.match(page, /HomeHero/);
    assert.match(page, /category-section/);
    assert.match(page, /HomeProductGrid/);
    assert.match(page, /HomeProcess/);
    assert.match(page, /audience-section/);
    assert.match(page, /HomeFaq/);
    assert.doesNotMatch(page, /store-section/);
    assert.match(page, /dealer-access/);
    assert.doesNotMatch(page, /href="\/account\/login"|href: "\/account\/login"/);
  }
  assert.match(source, /href: "\/dealer-access"/);
  assert.match(frenchSource, /href: "\/fr\/dealer-access"/);
  assert.doesNotMatch(source, /Find a dealer or showroom/);
  assert.doesNotMatch(frenchSource, /Trouver un détaillant ou une salle d’exposition/);
});

test("homepage presentation primitives use semantic tokens and loaded runtime image props", () => {
  assert.match(hero, /var\(--color-focus\)|buttonVariants/);
  assert.match(collection, /home-collection-media/);
  assert.doesNotMatch(collection, /home-collection-overlay/);
  assert.match(productGrid, /ProductCard/);
  assert.doesNotMatch(productGrid, /HomeProductCard/);
  assert.match(productCard, /product-specs/);
  assert.match(productCard, /small-button dark/);
  assert.match(source, /HomeProductGrid/);
  assert.match(frenchSource, /HomeProductGrid/);
  assert.match(productGrid, /className="product-grid"/);
  assert.match(css, /\.product-grid/);
  assert.match(css, /\.home-product-grid/);
  assert.match(css, /\.product-section \.small-button\.dark/);
  assert.match(css, /\.home-store-cta/);
});
