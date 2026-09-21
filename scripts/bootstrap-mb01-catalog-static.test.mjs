// bootstrap-mb01-catalog-static.test.mjs
//
// Direct static tests for scripts/bootstrap-mb01-catalog.mts. Pure logic only:
// CLI parsing, local catalog extraction, deterministic hash, media gate
// (filesystem + representative HTTP), plan computation, and an in-memory
// dry-run/apply/no-op cycle against a fake prisma-shaped DB.
//
// Run: node --experimental-strip-types --test scripts/bootstrap-mb01-catalog-static.test.mjs
// (no DATABASE_URL, no Docker, no build required — the script module never
// touches prisma unless main() runs).
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseArgs,
  localCatalog,
  catalogHash,
  checkMedia,
  representativeSample,
  buildPlan,
  deriveCounters,
  executePlan
} from "./bootstrap-mb01-catalog.mts";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
test("parseArgs defaults to dry-run + local media gate", () => {
  const args = parseArgs([]);
  assert.equal(args.apply, false);
  assert.equal(args.allowNonProduction, false);
  assert.equal(args.mediaMode, "local");
  assert.equal(args.mediaRoot, null);
});

test("parseArgs honors --apply / --allow-non-production / media overrides", () => {
  const args = parseArgs(["--apply", "--allow-non-production", "--media-mode=release", "--release-dir=/tmp/rel", "--base-url=https://example.test"]);
  assert.equal(args.apply, true);
  assert.equal(args.allowNonProduction, true);
  assert.equal(args.mediaMode, "release");
  assert.equal(args.releaseDir, "/tmp/rel");
  assert.equal(args.baseUrl, "https://example.test");
});

test("parseArgs rejects release mode without release-dir or base-url", () => {
  assert.throws(() => parseArgs(["--media-mode=release", "--base-url=https://x.test"]), /--release-dir/);
  assert.throws(() => parseArgs(["--media-mode=release", "--release-dir=/tmp/rel"]), /--base-url/);
});

test("parseArgs rejects unknown flags", () => {
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);
});

// ---------------------------------------------------------------------------
// Local catalog extraction
// ---------------------------------------------------------------------------
test("localCatalog is sorted, deduplicated, and price-correct", () => {
  const entries = localCatalog();
  assert.ok(entries.length > 0, "local catalog is non-empty");
  const codes = entries.map((entry) => entry.skuCode);
  assert.deepEqual(codes, [...codes].sort((a, b) => a.localeCompare(b)), "entries sorted by skuCode");
  assert.equal(new Set(codes).size, codes.length, "no duplicate skuCodes");
  for (const entry of entries) {
    assert.ok(Number.isInteger(entry.amountCents) && entry.amountCents > 0, `amountCents integer for ${entry.skuCode}`);
    assert.ok(entry.currency, `currency set for ${entry.skuCode}`);
    for (const url of entry.imageUrls) {
      assert.ok(url.startsWith("/assets/products/"), `controlled image URL for ${entry.skuCode}: ${url}`);
    }
  }
});

test("localCatalog contains 140 products and 300 all-active SKUs (no draft finish variants)", () => {
  const entries = localCatalog();
  const products = new Set(entries.map((entry) => entry.productSlug));
  assert.equal(products.size, 140, "140 unique products");
  assert.equal(entries.length, 300, "300 unique SKUs");
  assert.equal(
    entries.filter((entry) => !entry.active).length,
    0,
    "no draft SKUs — every finish/color variant is active"
  );
  assert.equal(entries.filter((entry) => entry.active).length, 300, "all 300 SKUs active");
});

// ---------------------------------------------------------------------------
// Deterministic catalog hash
// ---------------------------------------------------------------------------
test("catalogHash is deterministic and content-sensitive", () => {
  const entries = localCatalog();
  assert.equal(catalogHash(entries), catalogHash(entries), "stable across calls");
  const mutated = entries.map((entry, index) =>
    index === 0 ? { ...entry, amountCents: entry.amountCents + 1 } : entry
  );
  assert.notEqual(catalogHash(mutated), catalogHash(entries), "changes with content");
  const reorderedImages = entries.map((entry, index) =>
    index === 0 ? { ...entry, imageUrls: [...entry.imageUrls].reverse() } : entry
  );
  assert.equal(catalogHash(reorderedImages), catalogHash(entries), "image order does not matter");
});

// ---------------------------------------------------------------------------
// Representative sample (release-mode HTTP checks)
// ---------------------------------------------------------------------------
test("representativeSample is bounded and deterministic", () => {
  const urls = Array.from({ length: 25 }, (_, i) => `/assets/products/x/${i}.jpg`);
  assert.deepEqual(representativeSample(urls), representativeSample(urls));
  assert.ok(representativeSample(urls).length <= 10);
  assert.deepEqual(representativeSample(["/a"]), ["/a"]);
});

// ---------------------------------------------------------------------------
// Media gate (filesystem + HTTP)
// ---------------------------------------------------------------------------
function fixtureRoot(files) {
  const root = mkdtempSync(join(tmpdir(), "mb01-bootstrap-media-"));
  for (const file of files) {
    const full = join(root, file);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, "x");
  }
  return root;
}

test("checkMedia reports missing media root", async () => {
  const args = parseArgs([`--media-root=${join(tmpdir(), "does-not-exist-mb01")}`]);
  const result = await checkMedia(["/assets/products/a/b.jpg"], args);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, "media_root_missing");
  assert.equal(result.checked, 0);
});

test("checkMedia flags uncontrolled URLs and missing files", async () => {
  const root = fixtureRoot(["assets/products/kitchen-cabinets/exists.jpg"]);
  try {
    const args = parseArgs([`--media-root=${root}`]);
    const result = await checkMedia(
      ["https://mb01.vanstro.ca/x.jpg", "/not-products/y.jpg", "/assets/products/kitchen-cabinets/missing.jpg", "/assets/products/kitchen-cabinets/exists.jpg"],
      args
    );
    const kinds = result.violations.map((violation) => violation.kind).sort();
    assert.deepEqual(kinds, ["image_file_missing", "image_url_not_controlled", "image_url_not_controlled"]);
    assert.equal(result.checked, 2, "only controlled-prefix URLs are counted as checked");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("checkMedia passes when every controlled URL exists on disk", async () => {
  const root = fixtureRoot([
    "assets/products/kitchen-cabinets/a.jpg",
    "assets/products/bathroom-vanities/b.jpg",
    "assets/products/baseboards-mouldings/c.jpg"
  ]);
  try {
    const args = parseArgs([`--media-root=${root}`]);
    const result = await checkMedia(
      ["/assets/products/kitchen-cabinets/a.jpg", "/assets/products/bathroom-vanities/b.jpg", "/assets/products/baseboards-mouldings/c.jpg"],
      args
    );
    assert.deepEqual(result.violations, []);
    assert.equal(result.checked, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("checkMedia release mode requires files in release dir and HTTP 200 on the sample", async () => {
  const root = fixtureRoot(["assets/products/kitchen-cabinets/ok.jpg", "assets/products/kitchen-cabinets/bad.jpg"]);
  const server = createServer((req, res) => {
    if (req.url === "/assets/products/kitchen-cabinets/ok.jpg") {
      res.writeHead(206, { "Content-Range": "bytes 0-0/1" });
      res.end("x");
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const args = parseArgs([
      "--media-mode=release",
      `--release-dir=${root}`,
      `--base-url=http://127.0.0.1:${port}`
    ]);
    const result = await checkMedia(["/assets/products/kitchen-cabinets/ok.jpg", "/assets/products/kitchen-cabinets/bad.jpg"], args);
    assert.equal(result.violations.length, 1);
    assert.equal(result.violations[0].kind, "image_url_not_200");
    assert.equal(result.violations[0].detail, "/assets/products/kitchen-cabinets/bad.jpg");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Plan computation
// ---------------------------------------------------------------------------
const CATEGORY_IDS = { "kitchen-cabinets": "cat-1", "bathroom-vanities": "cat-2" };

function entry(skuCode, productSlug, overrides = {}) {
  return {
    skuCode,
    productSlug,
    productName: `${productSlug} name`,
    categorySlug: productSlug.startsWith("vanity") ? "bathroom-vanities" : "kitchen-cabinets",
    manufacturerPartNumber: null,
    subCategory: null,
    unit: "each",
    dimensions: null,
    finish: null,
    colorName: null,
    colorHex: null,
    skuName: `${productSlug} sku`,
    active: true,
    amountCents: 30200,
    currency: "CAD",
    imageUrls: [`/assets/products/${productSlug}/1.jpg`],
    ...overrides
  };
}

function stateFrom(overrides = {}) {
  return {
    categories: [
      { id: "cat-1", slug: "kitchen-cabinets" },
      { id: "cat-2", slug: "bathroom-vanities" }
    ],
    products: [],
    skus: [],
    canonicalPrices: [],
    activeCadPrices: [],
    assetRowsMatching: 0,
    ...overrides
  };
}

test("buildPlan on an empty DB reports WOULD CREATE for every product, sku and price", () => {
  const entries = [entry("SKU-A", "cabinet-a"), entry("SKU-B", "cabinet-b"), entry("SKU-C", "vanity-c")];
  const { plan, violations } = buildPlan(entries, stateFrom());
  assert.deepEqual(violations, []);
  assert.deepEqual(plan, [
    { kind: "product:create", id: "cabinet-a" },
    { kind: "product:create", id: "cabinet-b" },
    { kind: "product:create", id: "vanity-c" },
    { kind: "sku:create", id: "SKU-A" },
    { kind: "price:create", id: "SKU-A" },
    { kind: "sku:create", id: "SKU-B" },
    { kind: "price:create", id: "SKU-B" },
    { kind: "sku:create", id: "SKU-C" },
    { kind: "price:create", id: "SKU-C" }
  ]);
});

test("buildPlan on a fully synced DB is an empty plan (no-op)", () => {
  const entries = [entry("SKU-A", "cabinet-a")];
  const state = stateFrom({
    products: [{ id: "p1", slug: "cabinet-a", name: "cabinet-a name", status: "active", categoryId: "cat-1", manufacturerPartNumber: null, subCategoryKey: null, unit: "each", dimensions: null, finish: null, colorName: null, colorHex: null }],
    skus: [{ id: "s1", skuCode: "SKU-A", productId: "p1", status: "active" }],
    canonicalPrices: [{ key: "retail:SKU-A", skuId: "s1", amountCents: 30200, currency: "CAD", status: "active" }]
  });
  const { plan, violations } = buildPlan(entries, state);
  assert.deepEqual(violations, []);
  assert.deepEqual(plan, []);
});

test("buildPlan detects product field drift and SKU status drift as updates", () => {
  const entries = [entry("SKU-A", "cabinet-a", { amountCents: 31000 })];
  const state = stateFrom({
    products: [{ id: "p1", slug: "cabinet-a", name: "cabinet-a name", status: "active", categoryId: "cat-1", manufacturerPartNumber: null, subCategoryKey: null, unit: "each", dimensions: null, finish: null, colorName: null, colorHex: null }],
    skus: [{ id: "s1", skuCode: "SKU-A", productId: "p1", status: "draft" }],
    canonicalPrices: [{ key: "retail:SKU-A", skuId: "s1", amountCents: 30200, currency: "CAD", status: "active" }]
  });
  const { plan, violations } = buildPlan(entries, state);
  assert.deepEqual(violations, []);
  assert.deepEqual(plan, [
    { kind: "sku:update", id: "SKU-A" },
    { kind: "price:update", id: "SKU-A" }
  ]);
});

test("buildPlan flags multiple active CAD prices and non-canonical drift", () => {
  const entries = [entry("SKU-A", "cabinet-a")];
  const duplicate = buildPlan(entries, stateFrom({
    products: [{ id: "p1", slug: "cabinet-a", name: "cabinet-a name", status: "active", categoryId: "cat-1", manufacturerPartNumber: null, subCategoryKey: null, unit: "each", dimensions: null, finish: null, colorName: null, colorHex: null }],
    skus: [{ id: "s1", skuCode: "SKU-A", productId: "p1", status: "active" }],
    activeCadPrices: [
      { skuCode: "SKU-A", skuId: "s1", key: "retail:SKU-A", amountCents: 30200 },
      { skuCode: "SKU-A", skuId: "s1", key: "other:SKU-A", amountCents: 19900 }
    ]
  }));
  assert.deepEqual(duplicate.violations, [{ kind: "multiple_active_cad_prices", detail: "SKU-A" }]);

  const drifted = buildPlan(entries, stateFrom({
    products: [{ id: "p1", slug: "cabinet-a", name: "cabinet-a name", status: "active", categoryId: "cat-1", manufacturerPartNumber: null, subCategoryKey: null, unit: "each", dimensions: null, finish: null, colorName: null, colorHex: null }],
    skus: [{ id: "s1", skuCode: "SKU-A", productId: "p1", status: "active" }],
    activeCadPrices: [{ skuCode: "SKU-A", skuId: "s1", key: "legacy:SKU-A", amountCents: 19900 }]
  }));
  assert.deepEqual(drifted.violations, [{ kind: "non_canonical_active_cad_price_differs", detail: "SKU-A" }]);

  const inSync = buildPlan(entries, stateFrom({
    products: [{ id: "p1", slug: "cabinet-a", name: "cabinet-a name", status: "active", categoryId: "cat-1", manufacturerPartNumber: null, subCategoryKey: null, unit: "each", dimensions: null, finish: null, colorName: null, colorHex: null }],
    skus: [{ id: "s1", skuCode: "SKU-A", productId: "p1", status: "active" }],
    activeCadPrices: [{ skuCode: "SKU-A", skuId: "s1", key: "legacy:SKU-A", amountCents: 30200 }]
  }));
  assert.deepEqual(inSync.violations, []);
  assert.deepEqual(inSync.plan, []);
});

test("buildPlan flags missing category and is deterministic", () => {
  const entries = [entry("SKU-A", "cabinet-a")];
  const state = stateFrom({ categories: [] });
  const first = buildPlan(entries, state);
  const second = buildPlan(entries, state);
  assert.deepEqual(first, second, "same input -> same plan and violations");
  assert.ok(first.violations.some((violation) => violation.kind === "category_missing"));
});

// ---------------------------------------------------------------------------
// In-memory dry-run / apply / no-op cycle (fake prisma-shaped DB)
// ---------------------------------------------------------------------------
function createFakeDb(initial) {
  const state = {
    categories: initial.categories ?? [],
    products: initial.products ?? [],
    skus: initial.skus ?? [],
    prices: initial.prices ?? []
  };
  const db = {
    category: {
      findMany: async () => state.categories.map((category) => ({ id: category.id, slug: category.slug }))
    },
    product: {
      findMany: async () => state.products.map((product) => ({ ...product })),
      findUnique: async ({ where }) => state.products.find((product) => product.slug === where.slug) ?? null,
      create: async ({ data }) => {
        state.products.push({ id: `p${state.products.length + 1}`, ...data });
      },
      update: async ({ where, data }) => {
        Object.assign(state.products.find((product) => product.slug === where.slug), data);
      }
    },
    platformSku: {
      findMany: async () => state.skus.map((sku) => ({ ...sku })),
      findUnique: async ({ where }) => state.skus.find((sku) => sku.skuCode === where.skuCode) ?? null,
      create: async ({ data }) => {
        state.skus.push({ id: `s${state.skus.length + 1}`, ...data });
      },
      update: async ({ where, data }) => {
        Object.assign(state.skus.find((sku) => sku.skuCode === where.skuCode), data);
      }
    },
    price: {
      findMany: async (args) => {
        if (args.where?.status === "active" && args.where?.currency === "CAD") {
          const codes = new Set(args.where.sku.skuCode.in);
          return state.prices
            .filter((price) => price.status === "active" && price.currency === "CAD")
            .filter((price) => codes.has(state.skus.find((sku) => sku.id === price.skuId)?.skuCode))
            .map((price) => ({
              skuId: price.skuId,
              key: price.key,
              amountCents: price.amountCents,
              sku: { skuCode: state.skus.find((sku) => sku.id === price.skuId)?.skuCode }
            }));
        }
        const keys = new Set(args.where.key.in);
        return state.prices.filter((price) => keys.has(price.key)).map((price) => ({ ...price }));
      },
      create: async ({ data }) => {
        state.prices.push({ ...data });
      },
      update: async ({ where, data }) => {
        Object.assign(state.prices.find((price) => price.key === where.key), data);
      }
    },
    productAsset: { count: async () => 0 }
  };
  return { state, db };
}

function snapshot(state) {
  return {
    categories: state.categories.map((category) => ({ id: category.id, slug: category.slug })),
    products: state.products.map((product) => ({ ...product })),
    skus: state.skus.map((sku) => ({ ...sku })),
    canonicalPrices: state.prices.map((price) => ({ ...price })),
    activeCadPrices: state.prices
      .filter((price) => price.status === "active" && price.currency === "CAD")
      .map((price) => ({
        skuCode: state.skus.find((sku) => sku.id === price.skuId)?.skuCode,
        skuId: price.skuId,
        key: price.key,
        amountCents: price.amountCents
      })),
    assetRowsMatching: 0
  };
}

test("executePlan applies exactly the plan; re-running yields an empty plan (no-op)", async () => {
  const entries = [
    entry("SKU-A", "cabinet-a"),
    entry("SKU-B", "cabinet-b", { amountCents: 129900 }),
    entry("SKU-C", "vanity-c", { active: false })
  ];
  const { state, db } = createFakeDb({
    categories: [
      { id: "cat-1", slug: "kitchen-cabinets" },
      { id: "cat-2", slug: "bathroom-vanities" }
    ]
  });

  // dry-run: full WOULD plan, nothing written
  const dryRunPlan = buildPlan(entries, snapshot(state));
  assert.equal(dryRunPlan.plan.length, 9, "3 products + 3 skus + 3 prices");
  assert.equal(state.products.length, 0);
  assert.equal(state.skus.length, 0);
  assert.equal(state.prices.length, 0);

  // apply: exactly the same plan ops execute
  const categoryIds = new Map(state.categories.map((category) => [category.slug, category.id]));
  await executePlan(db, dryRunPlan.plan, entries, categoryIds);
  assert.equal(state.products.length, 3);
  assert.equal(state.skus.length, 3);
  assert.equal(state.prices.length, 3);
  assert.equal(state.skus.find((sku) => sku.skuCode === "SKU-C").status, "draft", "inactive SKU lands as draft");

  // single active CAD price per SKU after apply
  for (const skuCode of ["SKU-A", "SKU-B", "SKU-C"]) {
    const sku = state.skus.find((row) => row.skuCode === skuCode);
    const activeCad = state.prices.filter((price) => price.skuId === sku.id && price.status === "active" && price.currency === "CAD");
    assert.equal(activeCad.length, 1, `one active CAD price for ${skuCode}`);
    assert.equal(activeCad[0].key, `retail:${skuCode}`, `canonical key for ${skuCode}`);
  }

  // second plan: no-op
  const secondPlan = buildPlan(entries, snapshot(state));
  assert.deepEqual(secondPlan.violations, []);
  assert.deepEqual(secondPlan.plan, []);
  assert.equal(deriveCounters(secondPlan.plan, entries, { checked: 3 }, []).inventoryWrites, 0);
});

test("executePlan writes the FIRST entry per product slug, matching buildPlan (no-op on re-run)", async () => {
  // Two variants of the same product with different owned fields.
  const entries = [
    entry("SKU-A", "cabinet-a", { manufacturerPartNumber: "WH-1", colorName: "White", colorHex: "#f7f6f2", amountCents: 10000 }),
    entry("SKU-B", "cabinet-a", { manufacturerPartNumber: "LG-1", colorName: "Light Grey", colorHex: "#c9cbc7", amountCents: 20000 })
  ];
  const { state, db } = createFakeDb({
    categories: [{ id: "cat-1", slug: "kitchen-cabinets" }]
  });
  const { plan } = buildPlan(entries, snapshot(state));
  const categoryIds = new Map(state.categories.map((category) => [category.slug, category.id]));
  await executePlan(db, plan, entries, categoryIds);
  const written = state.products.find((product) => product.slug === "cabinet-a");
  assert.equal(written.manufacturerPartNumber, "WH-1", "first entry per slug is authoritative");
  assert.equal(written.colorName, "White");
  assert.equal(written.colorHex, "#f7f6f2");
  const secondPlan = buildPlan(entries, snapshot(state));
  assert.deepEqual(secondPlan.violations, []);
  assert.deepEqual(secondPlan.plan, [], "no drift after apply");
});

test("deriveCounters never counts inventory writes", () => {
  const entries = [entry("SKU-A", "cabinet-a")];
  const { plan } = buildPlan(entries, stateFrom());
  const counters = deriveCounters(plan, entries, { checked: 1 }, []);
  assert.equal(counters.inventoryWrites, 0);
  assert.equal(counters.productsChanged, 1);
  assert.equal(counters.skusChanged, 1);
  assert.equal(counters.pricesCreated, 1);
  assert.equal(counters.pricesUpdated, 0);
});
