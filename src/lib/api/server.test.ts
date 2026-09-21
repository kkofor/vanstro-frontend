import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { HOME_FEATURED_SKUS } from "../product/home-featured-products.ts";
import type { ProductInventory, ProductSummary } from "./api-contract.ts";
import {
  canFulfillQuantity,
  createInventoryFromDealerStock,
  getAvailableQuantity,
  getInventoryLabel,
  getInventoryLocation,
  getProductInventory,
  getTotalAvailable
} from "../commerce/product-inventory.ts";

process.env.VANSTRO_WEBSITE_API_BASE_URL = "https://catalog.example.test/api/v1";
delete process.env.NEXT_PUBLIC_API_BASE_URL;

// server.ts resolves @/lib/* and extensionless specifiers through tsconfig
// paths only when Next compiles it. For a direct Node test, map the same
// aliases here (and serve JSON modules without import attributes) so the
// module graph loads exactly as it does under the app.
const srcRoot = new URL("../../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    let url = new URL(specifier.slice(2), srcRoot).href;
    if (!/\.(ts|js|mjs|cjs|json)$/.test(url)) url += ".ts";
    return { url, shortCircuit: true };
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".json")) return nextLoad(url, context);
    return { format: "json", source: readFileSync(new URL(url), "utf8"), shortCircuit: true };
  }
});

// Dynamic import is required (module-loading-boundary test case): server.ts
// snapshots the API base URL and fixture flag from process.env at module
// evaluation, so the env and alias hooks above must be installed first. The
// module is kicked off once here and awaited inside each test — no top-level
// await, so `pnpm exec tsx --test` runs the file directly.
const serverModule = import("./server.ts");

const originalFetch = globalThis.fetch;
const SUBJECT_SLUG = "vanity-cabinet-vs30";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function apiProduct(index: number, amount: number) {
  const skuCode = HOME_FEATURED_SKUS[index];
  return {
    id: `catalog-product-${index + 1}`,
    slug: index === 6 ? SUBJECT_SLUG : `catalog-product-${index + 1}`,
    name: `Catalog product ${index + 1}`,
    primarySku: { id: `sku-${skuCode}`, skuCode, name: `Catalog product ${index + 1}` },
    price: { amount, amountCents: amount * 100, currency: "CAD" },
    category: "Cabinets"
  };
}

function installApiMock(catalogPrices: readonly number[], detailPrice: number) {
  let catalogRead = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/products" && url.searchParams.has("limit")) {
      const amount = catalogPrices[Math.min(catalogRead, catalogPrices.length - 1)];
      catalogRead += 1;
      const products = HOME_FEATURED_SKUS.map((_, index) => apiProduct(index, amount));
      return jsonResponse({
        data: products,
        meta: {
          limit: Number(url.searchParams.get("limit")),
          offset: Number(url.searchParams.get("offset")),
          total: products.length
        }
      });
    }
    if (url.pathname === `/api/v1/products/${SUBJECT_SLUG}`) {
      return jsonResponse({ data: apiProduct(6, detailPrice) });
    }
    if (url.pathname === "/api/v1/categories") {
      return jsonResponse({ data: [] });
    }
    if (url.pathname === "/api/v1/dealers") {
      return jsonResponse({ data: [] });
    }
    throw new Error(`Unexpected Website API request: ${url.pathname}`);
  };
}

const SEED_FIXTURE_PRODUCT = {
  id: "seed-product-1",
  slug: "seed-prod-prod",
  name: "Seed fixture product",
  primarySku: { id: "seed-sku-1", skuCode: "SEED-SKU-PROD", name: "Seed fixture SKU" },
  price: { amount: 0, amountCents: 0, currency: "CAD" },
  category: { id: "seed-cat-1", slug: "seed-cat-prod", name: "Seed fixture category" }
};

/** Catalog mock with the 140 valid MB01 products plus extra rows. */
function installApiMockWithRows(extraRows: Array<{ slug: string }>, detailSlugs: ReadonlySet<string>) {
  let catalogRead = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/products" && url.searchParams.has("limit")) {
      const amount = 100;
      catalogRead += 1;
      const products = [
        ...HOME_FEATURED_SKUS.map((_, index) => apiProduct(index, amount)),
        ...extraRows
      ];
      return jsonResponse({
        data: products,
        meta: {
          limit: Number(url.searchParams.get("limit")),
          offset: Number(url.searchParams.get("offset")),
          total: products.length
        }
      });
    }
    const slug = url.pathname.replace(/^\/api\/v1\/products\//, "");
    if (detailSlugs.has(slug)) {
      const row = extraRows.find((entry) => entry.slug === slug);
      return jsonResponse({ data: row });
    }
    if (url.pathname === "/api/v1/categories") {
      return jsonResponse({ data: [] });
    }
    if (url.pathname === "/api/v1/dealers") {
      return jsonResponse({ data: [] });
    }
    throw new Error(`Unexpected Website API request: ${url.pathname}`);
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("catalog projection preserves finish option configuration", async () => {
  const { getProductsForCatalog } = await serverModule;
  const sku = HOME_FEATURED_SKUS[0];
  const product = {
    id: "api-cabinet-with-top",
    slug: "api-cabinet-with-top",
    name: "API Cabinet With Top",
    primarySku: { id: "sku-cabinet-with-top", skuCode: sku, name: "API Cabinet With Top" },
    price: { amount: 499.5, amountCents: 49950, currency: "CAD" },
    category: "Kitchen Cabinets",
    finishOptions: [
      {
        name: "White with top",
        sku: "SKU-WHITE-TOP",
        configuration: "with-top",
        colorHex: "#ffffff",
        active: true
      }
    ]
  };
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/products" && url.searchParams.has("limit")) {
      return jsonResponse({
        data: [product],
        meta: { limit: 100, offset: 0, total: 1 }
      });
    }
    if (url.pathname === "/api/v1/dealers") return jsonResponse({ data: [] });
    throw new Error(`Unexpected Website API request: ${url.pathname}`);
  };

  const catalog = await getProductsForCatalog();
  const projected = catalog.find((candidate) => candidate.sku === sku);
  assert.ok(projected, "catalog product exists for the API SKU");
  assert.equal(projected.finishOptions?.[0]?.configuration, "with-top");
});

test("sequential catalog reads observe an updated price for the same SKU", async () => {
  const { getProductsForCatalog } = await serverModule;
  installApiMock([100, 200], 200);

  const first = await getProductsForCatalog();
  const second = await getProductsForCatalog();

  const firstSubject = first.find((product) => product.sku === HOME_FEATURED_SKUS[6]);
  const secondSubject = second.find((product) => product.sku === HOME_FEATURED_SKUS[6]);

  assert.ok(firstSubject, "first read contains the subject SKU");
  assert.ok(secondSubject, "second read contains the subject SKU");
  assert.equal(firstSubject.price.amount, 100);
  assert.equal(secondSubject.price.amount, 200);
  assert.ok(secondSubject.commerce, "second read carries commerce pricing");
  assert.equal(secondSubject.commerce.pricing.currentPrice.amount, 200);
});

test("catalog card, homepage card and product detail project the same current price", async () => {
  const { getHomePageData, getProductBySlug, getProductsForCatalog } = await serverModule;
  installApiMock([300, 300], 300);

  const catalog = await getProductsForCatalog();
  const home = await getHomePageData();
  const detail = await getProductBySlug(SUBJECT_SLUG);

  const catalogSubject = catalog.find((product) => product.sku === HOME_FEATURED_SKUS[6]);
  const homeSubject = home.products.find((product) => product.sku === HOME_FEATURED_SKUS[6]);

  assert.ok(catalogSubject && homeSubject, "subject appears on the catalog card and homepage");
  assert.ok(detail, "detail resolves from the current API");
  assert.equal(catalogSubject.price.amount, 300);
  assert.ok(catalogSubject.commerce, "catalog card carries commerce pricing");
  assert.equal(catalogSubject.commerce.pricing.currentPrice.amount, 300);
  assert.equal(homeSubject.price.amount, 300);
  assert.ok(homeSubject.commerce, "homepage card carries commerce pricing");
  assert.equal(homeSubject.commerce.pricing.currentPrice.amount, 300);
  assert.equal(detail.price.amount, 300);
  assert.ok(detail.commerce, "detail carries commerce pricing");
  assert.equal(detail.commerce.pricing.currentPrice.amount, 300);
});

test("catalog and detail projections never override real API fields with mock data", async () => {
  const { getProductBySlug, getProductsForCatalog } = await serverModule;
  const sku = HOME_FEATURED_SKUS[0]; // same SKU as a mock product, so any mock merge would collide
  const apiProduct = {
    id: "api-base-cabinet-b30",
    slug: "api-base-cabinet-b30",
    name: "API Base Cabinet B30",
    description: "API-supplied description for the B30 cabinet.",
    shortDescription: "API short description.",
    primarySku: { id: "sku-011770130", skuCode: sku, name: "API Base Cabinet B30" },
    price: { amount: 499.5, amountCents: 49950, currency: "CAD" },
    category: "Kitchen Cabinets",
    specifications: [
      { key: "Finish", value: "Matte Black" },
      { key: "Color", value: "Graphite" },
      { key: "Dimensions", value: "18 W x 34.5 H x 24 D" }
    ]
  };
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/products" && url.searchParams.has("limit")) {
      return jsonResponse({
        data: [apiProduct],
        meta: { limit: 100, offset: 0, total: 1 }
      });
    }
    if (url.pathname === "/api/v1/products/api-base-cabinet-b30") {
      return jsonResponse({ data: apiProduct });
    }
    if (url.pathname === "/api/v1/dealers") {
      return jsonResponse({ data: [] });
    }
    throw new Error(`Unexpected Website API request: ${url.pathname}`);
  };

  const catalog = await getProductsForCatalog();
  const card = catalog.find((product) => product.sku === sku);
  assert.ok(card, "catalog card exists for the API SKU");
  assert.equal(card.name, "API Base Cabinet B30", "API name is not replaced by the mock name");
  assert.equal(card.price.amount, 499.5, "API price is not replaced by the mock price");
  assert.equal(card.finish, "Matte Black", "API Finish specification wins over the mock finish");
  assert.equal(card.colorName, "Graphite", "API Color specification wins over the mock color");
  assert.equal(
    card.manufacturerPartNumber,
    "VS-011770130",
    "part number derives from the API SKU instead of the mock part number"
  );
  assert.equal(
    card.images[0].url,
    "/assets/generated/vanstro-hero-white-v1.webp",
    "missing API images fall back to the placeholder, not mock product images"
  );
  assert.equal(card.brand, "VanStro");
  assert.deepEqual(card.commerce?.promotions, [], "mock promotions are not merged into API products");

  const detail = await getProductBySlug("api-base-cabinet-b30");
  assert.ok(detail, "detail resolves from the API");
  assert.equal(detail.name, "API Base Cabinet B30");
  assert.equal(detail.price.amount, 499.5);
  assert.equal(detail.finish, "Matte Black");
  assert.equal(detail.colorName, "Graphite");
  assert.equal(detail.description, "API-supplied description for the B30 cabinet.");
  assert.equal(detail.specifications.Finish, "Matte Black");
  assert.equal(detail.specifications.SKU, "011770130");
  assert.equal(
    detail.images[0].url,
    "/assets/generated/vanstro-hero-white-v1.webp",
    "detail images fall back to the placeholder, not mock product images"
  );
  assert.equal(detail.availability, undefined, "mock inventory is not merged into API products");
  assert.equal(detail.dealerStock, undefined, "mock dealer stock is not merged into API products");
  assert.deepEqual(detail.inventory, [], "API detail carries no mock inventory rows");
  assert.deepEqual(detail.documents, [], "API detail carries no mock documents");
  assert.deepEqual(detail.supportLinks, [], "API detail carries no mock support links");
});

test("catalog list falls back to the fixture SKU dimensions when the API payload omits them (PDP-consistent dims)", async () => {
  const { getProductsForCatalog } = await serverModule;
  // Same SKU the existing no-override test drives from the API; here the list
  // payload carries neither `dimensions` nor a "Dimensions" specification key
  // (the exact shape observed for B15/B30 and the 3DB12–3DB30 ladder on the
  // live Website API), so the summary must resolve the fixture value the PDP
  // shows for the same SKU instead of "Dimensions pending".
  const sku = HOME_FEATURED_SKUS[0]; // 011770130 · Base Cabinet B30
  const apiProduct = {
    id: "api-base-cabinet-b30-lite",
    slug: "api-base-cabinet-b30-lite",
    name: "API Base Cabinet B30",
    primarySku: { id: "sku-011770130", skuCode: sku, name: "API Base Cabinet B30" },
    price: { amount: 499.5, amountCents: 49950, currency: "CAD" },
    category: "base-cabinets",
    specifications: [{ key: "Construction", value: "Frameless" }]
  };
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/products" && url.searchParams.has("limit")) {
      return jsonResponse({ data: [apiProduct], meta: { limit: 100, offset: 0, total: 1 } });
    }
    throw new Error(`Unexpected Website API request: ${url.pathname}`);
  };

  const catalog = await getProductsForCatalog();
  const card = catalog.find((product) => product.sku === sku);
  assert.ok(card, "catalog card exists for the API SKU");
  assert.equal(
    card.dimensions,
    "30\" W × 34½\" H × 24\" D",
    "list falls back to the fixture dimensions the PDP shows for the same SKU"
  );
});

function inventorySummary(overrides: Partial<ProductSummary> & { id: string; sku: string }): ProductSummary {
  return {
    slug: overrides.id,
    name: overrides.id,
    category: "Cabinets",
    price: { amount: 1, currency: "CAD" },
    unit: "each",
    dimensions: "",
    images: [{ url: "/product.jpg", alt: overrides.id }],
    inStock: true,
    ...overrides
  };
}

const multiDealerInventory: ProductInventory = {
  productId: "multi",
  sku: "SKU-MULTI",
  locations: [
    {
      dealerId: "winnipeg",
      quantity: 5,
      quantityOnHand: 5,
      quantityReserved: 0,
      status: "in_stock",
      pickupAvailable: true,
      deliveryAvailable: true,
      updatedAt: "2026-08-01T00:00:00.000Z"
    },
    {
      dealerId: "calgary",
      quantity: 0,
      quantityOnHand: 0,
      quantityReserved: 0,
      status: "out_of_stock",
      pickupAvailable: false,
      deliveryAvailable: false,
      updatedAt: "2026-08-01T00:00:00.000Z"
    }
  ],
  totalAvailable: 5,
  status: "in_stock",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const multiDealerProduct = inventorySummary({
  id: "multi",
  sku: "SKU-MULTI",
  availability: multiDealerInventory,
  dealerStock: { winnipeg: 5, calgary: 0 }
});

const dealerStockOnlyProduct = inventorySummary({
  id: "static",
  sku: "SKU-STATIC",
  dealerStock: { east: 4, west: 2 }
});

test("inventory without a dealer is a neutral state, never a cross-dealer aggregate", () => {
  const inventory = getProductInventory(multiDealerProduct);
  assert.equal(inventory.totalAvailable, 0, "no cross-dealer total is exposed");
  assert.equal(inventory.status, "out_of_stock", "no dealer means no stock claim");
  assert.deepEqual(inventory.locations, [], "no dealer means no locations");
  assert.equal(inventory.selectedDealerId, undefined);
});

test("selected dealer sees only that dealer's current SKU inventory", () => {
  const inventory = getProductInventory(multiDealerProduct, "winnipeg");
  assert.equal(inventory.selectedDealerId, "winnipeg");
  assert.equal(inventory.totalAvailable, 5);
  assert.equal(inventory.status, "in_stock");
  assert.deepEqual(inventory.locations, [multiDealerInventory.locations[0]]);

  const emptyDealer = getProductInventory(multiDealerProduct, "calgary");
  assert.equal(emptyDealer.totalAvailable, 0);
  assert.equal(emptyDealer.status, "out_of_stock");
  assert.deepEqual(emptyDealer.locations, [multiDealerInventory.locations[1]]);

  const unknownDealer = getProductInventory(multiDealerProduct, "toronto");
  assert.equal(unknownDealer.totalAvailable, 0);
  assert.equal(unknownDealer.status, "out_of_stock");
  assert.deepEqual(unknownDealer.locations, []);
});

test("quantity, location and fulfillment checks are dealer-scoped", () => {
  assert.equal(getAvailableQuantity(multiDealerProduct, "winnipeg"), 5);
  assert.equal(getAvailableQuantity(multiDealerProduct, "calgary"), 0);
  assert.equal(getAvailableQuantity(multiDealerProduct, "toronto"), 0);
  assert.equal(getInventoryLocation(multiDealerProduct, "winnipeg")?.dealerId, "winnipeg");
  assert.equal(getInventoryLocation(multiDealerProduct, "toronto"), undefined);
  assert.equal(canFulfillQuantity(multiDealerProduct, "winnipeg", 5), true);
  assert.equal(canFulfillQuantity(multiDealerProduct, "winnipeg", 6), false);
  assert.equal(canFulfillQuantity(multiDealerProduct, "calgary", 1), false);
  assert.equal(canFulfillQuantity(multiDealerProduct, "toronto", 1), false);
  assert.equal(
    getTotalAvailable(multiDealerProduct, "winnipeg"),
    5,
    "total availability is the selected dealer's quantity, not the sum across dealers"
  );
});

test("static dealer stock fallback is per-dealer and never aggregated", () => {
  const inventory = createInventoryFromDealerStock(dealerStockOnlyProduct);
  assert.equal(inventory.locations.length, 2);
  assert.equal(inventory.totalAvailable, 0, "static fallback exposes no cross-dealer total");
  assert.equal(inventory.status, "out_of_stock", "static fallback makes no stock claim without a dealer");
  assert.equal(inventory.locations.find((location) => location.dealerId === "east")?.quantity, 4);
  assert.equal(inventory.locations.find((location) => location.dealerId === "west")?.quantity, 2);

  assert.equal(getProductInventory(dealerStockOnlyProduct, "east").totalAvailable, 4);
  assert.equal(getProductInventory(dealerStockOnlyProduct, "east").status, "in_stock");
  assert.equal(getProductInventory(dealerStockOnlyProduct, "west").totalAvailable, 2);
  assert.equal(getProductInventory(dealerStockOnlyProduct, "west").status, "low_stock");
  assert.equal(getProductInventory(dealerStockOnlyProduct).totalAvailable, 0);
});

test("inventory labels describe the selected dealer state", () => {
  assert.equal(
    getInventoryLabel(getInventoryLocation(multiDealerProduct, "winnipeg")),
    "5 available"
  );
  assert.equal(
    getInventoryLabel(getInventoryLocation(multiDealerProduct, "calgary")),
    "Out of stock"
  );
  assert.equal(
    getInventoryLabel(getInventoryLocation(multiDealerProduct, "toronto")),
    "Not available at selected dealer"
  );
});

test("detail highlights are empty for live-API products in any locale (no internal-copy leak)", async () => {
  const { getProductBySlug } = await serverModule;
  installApiMock([100], 100);

  const french = await getProductBySlug(SUBJECT_SLUG, "fr-CA");
  assert.ok(french, "French detail resolves from the current API");
  assert.deepEqual(french.productHighlights, []);

  const english = await getProductBySlug(SUBJECT_SLUG, "en-CA");
  assert.ok(english, "English detail resolves from the current API");
  assert.deepEqual(english.productHighlights, []);
});

test("demo-seed fixture rows never reach catalog, homepage, static params or PDP", async () => {
  const { getHomePageData, getProductBySlug, getProductStaticParams, getProductsForCatalog } = await serverModule;
  installApiMockWithRows([SEED_FIXTURE_PRODUCT], new Set(["seed-prod-prod"]));

  const catalog = await getProductsForCatalog();
  assert.equal(catalog.length, HOME_FEATURED_SKUS.length, "140 valid products remain after the exact fixture filter");
  assert.ok(
    catalog.every((product) => product.slug !== "seed-prod-prod"),
    "the seed fixture product is absent from the catalog"
  );

  const params = await getProductStaticParams();
  assert.ok(
    params.every(({ slug }) => slug !== "seed-prod-prod"),
    "no seed fixture slug is emitted as a static product route"
  );

  const home = await getHomePageData();
  assert.ok(
    home.products.every((product) => product.slug !== "seed-prod-prod"),
    "the seed fixture product is absent from the homepage"
  );

  const detail = await getProductBySlug("seed-prod-prod");
  assert.equal(detail, undefined, "a direct seed fixture PDP request resolves as missing (404 + no JSON-LD)");
});

test("only the exact fixture identity is filtered; seed- prefixed business rows stay", async () => {
  const { getProductBySlug, getProductsForCatalog } = await serverModule;
  const businessRow = {
    id: "business-product-1",
    slug: "seed-vanity-mirror-pro",
    name: "Legitimate business product whose slug starts with seed-",
    primarySku: { id: "business-sku-1", skuCode: "SEED-VANITY-MIRROR", name: "Business SKU" },
    price: { amount: 149, amountCents: 14900, currency: "CAD" },
    category: "Cabinets"
  };
  installApiMockWithRows([businessRow], new Set(["seed-vanity-mirror-pro"]));

  const catalog = await getProductsForCatalog();
  assert.equal(catalog.length, HOME_FEATURED_SKUS.length + 1, "a seed- prefixed business row is NOT filtered");
  assert.ok(
    catalog.some((product) => product.slug === "seed-vanity-mirror-pro"),
    "the business row with a seed- prefix is still served"
  );
  const detail = await getProductBySlug("seed-vanity-mirror-pro");
  assert.ok(detail, "the business row's PDP still resolves");
  assert.equal(detail.slug, "seed-vanity-mirror-pro");
});

const API_CATEGORIES = [
  { id: "cat-1", slug: "kitchen-cabinets", name: "Kitchen Cabinets", description: "Ready-to-order cabinet boxes and accessories.", parentId: null },
  { id: "cat-2", slug: "bathroom-vanities", name: "Bathroom Vanities", description: "Vanity cabinets and bath storage.", parentId: null },
  { id: "cat-seed", slug: "seed-cat-prod", name: "Seed Category prod", description: null, parentId: null },
  { id: "cat-3", slug: "baseboards-and-mouldings", name: "Baseboards & Mouldings", description: null, parentId: null },
  { id: "cat-4", slug: "handle-series", name: "Handle series", description: null, parentId: null }
];

function installCategoryApiMock(categories: unknown[], products: unknown[] = []) {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/products" && url.searchParams.has("limit")) {
      return jsonResponse({
        data: products,
        meta: { limit: Number(url.searchParams.get("limit")), offset: Number(url.searchParams.get("offset")), total: products.length }
      });
    }
    if (url.pathname === "/api/v1/categories") {
      return jsonResponse({ data: categories });
    }
    if (url.pathname === "/api/v1/dealers") {
      return jsonResponse({ data: [] });
    }
    throw new Error(`Unexpected Website API request: ${url.pathname}`);
  };
}

test("storefront categories are driven by the API and exclude the demo-seed category", async () => {
  const { getCatalogCategories } = await serverModule;
  installCategoryApiMock(API_CATEGORIES);

  const categories = await getCatalogCategories();

  assert.equal(categories.length, 4, "the demo-seed category is excluded from the API payload");
  assert.deepEqual(
    categories.map((category) => category.slug),
    ["kitchen-cabinets", "bathroom-vanities", "baseboards-and-mouldings", "handle-series"],
    "API order (sortOrder/name) is preserved and the seed slug is absent"
  );
  assert.ok(
    categories.every((category) => category.id.startsWith("cat-")),
    "the API category UUID is carried as the stable identity"
  );
  assert.equal(categories[0].label, "Kitchen Cabinets", "the API name becomes the canonical label");
  assert.equal(categories[0].description, "Ready-to-order cabinet boxes and accessories.");
  assert.equal(categories[2].label, "Baseboards & Mouldings", "the real production slug is used, not the old config id");
  assert.ok(
    categories.every((category) => !category.slug.includes(" ")),
    "URL filters use canonical slugs, never display text"
  );
});

test("homepage data carries the API-driven categories", async () => {
  const { getHomePageData } = await serverModule;
  installCategoryApiMock(
    API_CATEGORIES,
    HOME_FEATURED_SKUS.map((_, index) => apiProduct(index, 100))
  );

  const home = await getHomePageData();

  assert.equal(home.categories.length, 4, "homepage categories exclude the demo-seed row");
  assert.equal(home.categories[0].slug, "kitchen-cabinets");
  assert.equal(home.categories[3].slug, "handle-series", "homepage keeps the API ordering");
});

test("catalog products project the canonical category slug for slug-based matching", async () => {
  const { getProductsForCatalog } = await serverModule;
  const withObjectCategory = {
    id: "product-with-object-category",
    slug: "product-with-object-category",
    name: "Product with object category",
    primarySku: { id: "sku-object-cat", skuCode: "OBJ-CAT", name: "Object category SKU" },
    price: { amount: 100, amountCents: 10000, currency: "CAD" },
    category: { id: "cat-3", slug: "baseboards-and-mouldings", name: "Baseboards & Mouldings" }
  };
  installCategoryApiMock([], [withObjectCategory]);

  const catalog = await getProductsForCatalog();

  const projected = catalog.find((product) => product.id === "product-with-object-category");
  assert.ok(projected, "product with an object category is projected");
  assert.equal(projected.categorySlug, "baseboards-and-mouldings", "the category slug is the matching key");
  assert.equal(projected.category, "Baseboards & Mouldings", "the display name stays localized separately");
});
