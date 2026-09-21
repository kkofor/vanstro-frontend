import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@vanstro/db";
import {
  applyIngestItem,
  createIngestJob,
  INGEST_KIND_PERMISSION,
  INGEST_KINDS,
  replaceIngestResults,
  resolveDealerLocationId,
  validateIngestItem,
  type IngestDatabase,
  type IngestItemOutcome
} from "./batch-ingest.js";

// In-memory batch_ingest_results double that enforces the real schema
// invariant (@@unique([jobId, itemIndex])) and Prisma's interactive
// transaction contract (work on a staged copy; commit only when the callback
// succeeds, otherwise roll back).
type Row = { jobId: string; itemIndex: number; status: string; error?: string | null };

function makeStore(initial: Row[] = [], options: { failNextCreate?: boolean } = {}) {
  const rows: Row[] = [...initial];
  const transactions: string[][] = [];
  const database = {
    async $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
      const staged = [...rows];
      const calls: string[] = [];
      // Test double implementing only the two result-ledger methods the
      // worker touches; cast at the Prisma library boundary.
      const tx = {
        batchIngestResult: {
          async deleteMany(args: { where: { jobId: string } }) {
            calls.push(`deleteMany(${args.where.jobId})`);
            for (let i = staged.length - 1; i >= 0; i -= 1) if (staged[i]!.jobId === args.where.jobId) staged.splice(i, 1);
            return { count: 0 };
          },
          async createMany(args: { data: Row[] }) {
            calls.push(`createMany(${args.data.length})`);
            if (options.failNextCreate) throw new Error("simulated createMany failure");
            for (const row of args.data) {
              if (staged.some((existing) => existing.jobId === row.jobId && existing.itemIndex === row.itemIndex)) {
                throw new Error("Unique constraint failed on the fields: (`jobId`,`itemIndex`)");
              }
              staged.push({ ...row });
            }
            return { count: args.data.length };
          }
        }
      } as unknown as Prisma.TransactionClient;
      try {
        await fn(tx);
        transactions.push(calls);
        rows.length = 0;
        rows.push(...staged);
      } catch (error) {
        transactions.push(calls);
        throw error;
      }
      return undefined as T;
    }
  };
  return { database, rows, transactions };
}

const JOB_A = "00000000-0000-4000-8000-00000000000a";
const JOB_B = "00000000-0000-4000-8000-00000000000b";

test("replaceIngestResults replaces a prior attempt's rows so a retry cannot violate unique (jobId,itemIndex)", async () => {
  // A failed first attempt already persisted results for the same job.
  const store = makeStore([
    { jobId: JOB_A, itemIndex: 0, status: "failed", error: "sku not found" },
    { jobId: JOB_A, itemIndex: 1, status: "committed" }
  ]);
  const retry: IngestItemOutcome[] = [
    { index: 0, status: "committed" },
    { index: 1, status: "committed" }
  ];
  // Old code path (createMany without clearing) would throw the unique
  // constraint; the retry execution must succeed instead.
  await replaceIngestResults(store.database, JOB_A, retry);
  assert.deepEqual(
    store.rows.map(({ jobId, itemIndex, status }) => ({ jobId, itemIndex, status })),
    [
      { jobId: JOB_A, itemIndex: 0, status: "committed" },
      { jobId: JOB_A, itemIndex: 1, status: "committed" }
    ]
  );
  assert.equal(store.rows.length, 2);
  // Results of the latest attempt only: no duplicate (jobId,itemIndex) rows.
  assert.equal(new Set(store.rows.map((row) => `${row.jobId}:${row.itemIndex}`)).size, store.rows.length);
  // Clear and insert happen inside one transaction, clear first.
  assert.deepEqual(store.transactions, [[`deleteMany(${JOB_A})`, "createMany(2)"]]);
});

test("replaceIngestResults leaves prior results intact when the insert fails (no half-cleared state)", async () => {
  const store = makeStore([{ jobId: JOB_A, itemIndex: 0, status: "failed", error: "sku not found" }], { failNextCreate: true });
  await assert.rejects(
    () => replaceIngestResults(store.database, JOB_A, [{ index: 0, status: "committed" }]),
    /simulated createMany failure/
  );
  // The delete rolled back with the failed transaction: the first attempt's
  // results are still the persisted state.
  assert.deepEqual(store.rows, [{ jobId: JOB_A, itemIndex: 0, status: "failed", error: "sku not found" }]);
});

test("replaceIngestResults clears stale rows even when the fresh attempt produced no outcomes", async () => {
  const store = makeStore([{ jobId: JOB_B, itemIndex: 0, status: "failed", error: "boom" }]);
  await replaceIngestResults(store.database, JOB_B, []);
  assert.deepEqual(store.rows, []);
  assert.deepEqual(store.transactions, [[`deleteMany(${JOB_B})`]]);
});

test("replaceIngestResults never touches another job's results", async () => {
  const store = makeStore([{ jobId: JOB_B, itemIndex: 0, status: "committed" }]);
  await replaceIngestResults(store.database, JOB_A, [{ index: 0, status: "committed" }]);
  assert.deepEqual(
    store.rows.map(({ jobId, itemIndex, status }) => ({ jobId, itemIndex, status })),
    [
      { jobId: JOB_B, itemIndex: 0, status: "committed" },
      { jobId: JOB_A, itemIndex: 0, status: "committed" }
    ]
  );
});

test("erp_links is registered as an ingest kind under settings.write", () => {
  assert.equal(INGEST_KIND_PERMISSION.erp_links, "settings.write");
  assert.ok(INGEST_KINDS.includes("erp_links"));
  // Same permission family as dealers/dealer_locations (settings.write).
  assert.equal(INGEST_KIND_PERMISSION.dealers, "settings.write");
  assert.equal(INGEST_KIND_PERMISSION.dealer_locations, "settings.write");
});

test("validateIngestItem: erp_links requires dealerCode, erpSystem and erpLocationId", () => {
  const valid = { dealerCode: "D-1", erpSystem: "vanstro-erp", erpLocationId: "EXT-1" };
  assert.equal(validateIngestItem("erp_links", valid), null);
  assert.equal(validateIngestItem("erp_links", { ...valid, dealerLocationCode: "LOC-1" }), null);
  assert.match(validateIngestItem("erp_links", { erpSystem: "vanstro-erp", erpLocationId: "EXT-1" })!, /dealerCode/);
  assert.match(validateIngestItem("erp_links", { dealerCode: "D-1", erpLocationId: "EXT-1" })!, /erpSystem/);
  assert.match(validateIngestItem("erp_links", { dealerCode: "D-1", erpSystem: "vanstro-erp" })!, /erpLocationId/);
  assert.match(validateIngestItem("erp_links", { ...valid, dealerLocationCode: "" })!, /dealerLocationCode/);
  assert.match(validateIngestItem("erp_links", { ...valid, dealerLocationCode: 42 })!, /dealerLocationCode/);
});

test("validateIngestItem: erp_links is never silently accepted with a wrong shape", () => {
  // Every recognized key must participate in validation: a link item whose
  // only fields are unknowns fails (dealerCode/erpSystem/erpLocationId are
  // mandatory), and blank strings never pass the str() trim gate.
  assert.notEqual(validateIngestItem("erp_links", { dealerCode: "   ", erpSystem: "vanstro-erp", erpLocationId: "EXT-1" }), null);
  assert.notEqual(validateIngestItem("erp_links", { dealerCode: "D-1", erpSystem: "   ", erpLocationId: "EXT-1" }), null);
  assert.notEqual(validateIngestItem("erp_links", { dealerCode: "D-1", erpSystem: "vanstro-erp", erpLocationId: "   " }), null);
});

// ---- V11-R1 ERP readiness §7: push ownership, mapping and zero-write dry-run ----

type LinkRow = { erpSystem: string; erpLocationId: string; dealerLocationId: string | null };
type SkuRow = { id: string; skuCode: string; name: string; productId: string; product: { id: string; slug: string; name: string; status: string } | null };
type PriceRow = { id: string; skuId: string; amountCents: number; currency: string; status: string; source: string; externalVersion: number | null; sourceUpdatedAt: Date | null };

// In-memory double of the IngestDatabase surface the apply paths touch
// (dealer/dealerLocation/productSkuErpMapping are stubbed; the tested paths
// never read them).
function makeApplyDb(initial: { links?: LinkRow[]; categoryMappings?: Array<{ erpSystem: string; erpCategoryKey: string; categoryId: string }>; skus?: SkuRow[]; prices?: PriceRow[] } = {}) {
  const links: LinkRow[] = [...(initial.links ?? [])];
  const categoryMappings: Array<{ erpSystem: string; erpCategoryKey: string; categoryId: string }> = [...(initial.categoryMappings ?? [])];
  const skus: SkuRow[] = [...(initial.skus ?? [])];
  const prices: PriceRow[] = [...(initial.prices ?? [])];
  const products: Array<{ id: string; slug: string; name: string; status: string; categoryId: string | null }> = [...(initial.skus ?? [])].map((sku) => ({ ...(sku.product as { id: string; slug: string; name: string; status: string })!, categoryId: null }));
  const snapshots: Array<{ skuId: string; dealerLocationId: string; quantityOnHand: number }> = [];
  const categories: Array<{ id: string; slug: string; name: string; isActive: boolean }> = [];
  const rawCalls: Array<{ kind: "query" | "execute"; values: unknown[] }> = [];
  let productSeq = 0;
  let skuSeq = 0;
  let priceSeq = 0;

  const database = {
    async $queryRaw<T>(query: { values?: unknown[] }): Promise<T> {
      const values = query.values ?? [];
      rawCalls.push({ kind: "query", values });
      const mapped = categoryMappings.find((entry) => entry.erpSystem === values[0] && entry.erpCategoryKey === values[1]);
      return (mapped ? [{ categoryId: mapped.categoryId }] : []) as T;
    },
    async $executeRaw(query: { values?: unknown[] }): Promise<number> {
      const values = query.values ?? [];
      rawCalls.push({ kind: "execute", values });
      // Query params are exactly [erpSystem, erpCategoryKey, erpCategoryId, categoryId];
      // gen_random_uuid()/CURRENT_TIMESTAMP are literal SQL, not bound values.
      // ON CONFLICT ("erpSystem","erpCategoryKey") DO UPDATE: re-point, never duplicate.
      const row = { erpSystem: String(values[0]), erpCategoryKey: String(values[1]), categoryId: String(values[3]) };
      const index = categoryMappings.findIndex((entry) => entry.erpSystem === row.erpSystem && entry.erpCategoryKey === row.erpCategoryKey);
      if (index >= 0) categoryMappings[index] = row;
      else categoryMappings.push(row);
      return 1;
    },
    platformSku: {
      async findUnique(args: { where: { skuCode: string } }) {
        const sku = skus.find((entry) => entry.skuCode === args.where.skuCode);
        return sku ? { id: sku.id, skuCode: sku.skuCode, name: sku.name, product: sku.product } : null;
      },
      async findUniqueOrThrow(args: { where: { skuCode: string } }) {
        const found = await database.platformSku.findUnique(args);
        if (!found) throw new Error("PlatformSku not found");
        return found;
      },
      async update(args: { where: { id: string }; data: { name?: string } }) {
        const sku = skus.find((entry) => entry.id === args.where.id);
        if (!sku) throw new Error("PlatformSku not found");
        if (args.data.name !== undefined) sku.name = args.data.name;
        return sku;
      },
      async create(args: { data: { skuCode: string; name: string; productId: string } }) {
        const product = products.find((entry) => entry.id === args.data.productId) ?? null;
        const row: SkuRow = { id: `sku-${++skuSeq}`, skuCode: args.data.skuCode, name: args.data.name, productId: args.data.productId, product };
        skus.push(row);
        return row;
      }
    },
    product: {
      async findUnique(args: { where: { slug: string } }) {
        return products.some((entry) => entry.slug === args.where.slug) ? { id: "occupied" } : null;
      },
      async create(args: { data: { slug: string; name: string; categoryId?: string | null; skus?: { create: { skuCode: string; name: string } } } }) {
        const id = `prod-${++productSeq}`;
        products.push({ id, slug: args.data.slug, name: args.data.name, status: "draft", categoryId: args.data.categoryId ?? null });
        if (args.data.skus) {
          const product = products[products.length - 1]!;
          skus.push({ id: `sku-${++skuSeq}`, skuCode: args.data.skus.create.skuCode, name: args.data.skus.create.name, productId: id, product: { id, slug: product.slug, name: product.name, status: product.status } });
        }
        return products[products.length - 1]!;
      },
      async update(args: { where: { id: string }; data: { name?: string; status?: string; categoryId?: string } }) {
        const product = products.find((entry) => entry.id === args.where.id);
        if (!product) throw new Error("Product not found");
        if (args.data.name !== undefined) product.name = args.data.name;
        if (args.data.status !== undefined) product.status = args.data.status;
        if (args.data.categoryId !== undefined) product.categoryId = args.data.categoryId;
        return product;
      }
    },
    category: {
      async upsert(args: { where: { slug: string }; update: { name: string; isActive?: boolean }; create: { slug: string; name: string; isActive?: boolean } }) {
        const existing = categories.find((entry) => entry.slug === args.where.slug);
        if (existing) {
          existing.name = args.update.name;
          if (args.update.isActive !== undefined) existing.isActive = args.update.isActive;
          return existing;
        }
        const created = { id: `cat-${categories.length + 1}`, slug: args.create.slug, name: args.create.name, isActive: args.create.isActive ?? true };
        categories.push(created);
        return created;
      }
    },
    dealer: { async findUnique() { return null; } },
    dealerLocation: { async findFirst() { return null; } },
    dealerErpLink: {
      async findUnique(args: { where: { erpSystem_erpLocationId: { erpSystem: string; erpLocationId: string } } }) {
        const { erpSystem, erpLocationId } = args.where.erpSystem_erpLocationId;
        const link = links.find((entry) => entry.erpSystem === erpSystem && entry.erpLocationId === erpLocationId);
        return link ? { dealerId: "dealer-1", dealerLocationId: link.dealerLocationId, erpSystem, erpLocationId } : null;
      },
      async findMany(args: { where: { erpLocationId: string } }) {
        return links.filter((entry) => entry.erpLocationId === args.where.erpLocationId).map((entry) => ({ dealerLocationId: entry.dealerLocationId }));
      },
      async upsert() { return { id: "link-1" }; }
    },
    inventorySnapshot: {
      async upsert(args: { where: { skuId_dealerLocationId: { skuId: string; dealerLocationId: string } }; update: { quantityOnHand: number }; create: { skuId: string; dealerLocationId: string; quantityOnHand: number } }) {
        const existing = snapshots.find((entry) => entry.skuId === args.where.skuId_dealerLocationId.skuId && entry.dealerLocationId === args.where.skuId_dealerLocationId.dealerLocationId);
        if (existing) {
          existing.quantityOnHand = args.update.quantityOnHand;
          return existing;
        }
        const created = { skuId: args.create.skuId, dealerLocationId: args.create.dealerLocationId, quantityOnHand: args.create.quantityOnHand };
        snapshots.push(created);
        return created;
      }
    },
    price: {
      async findFirst(args: { where: { skuId: string; status: string } }) {
        return prices.find((entry) => entry.skuId === args.where.skuId && entry.status === args.where.status) ?? null;
      },
      async update(args: { where: { id: string }; data: { status?: string; source?: string; externalVersion?: number | null; sourceUpdatedAt?: Date } }) {
        const price = prices.find((entry) => entry.id === args.where.id);
        if (!price) throw new Error("Price not found");
        if (args.data.status !== undefined) price.status = args.data.status;
        if (args.data.source !== undefined) price.source = args.data.source;
        if (args.data.externalVersion !== undefined) price.externalVersion = args.data.externalVersion;
        if (args.data.sourceUpdatedAt !== undefined) price.sourceUpdatedAt = args.data.sourceUpdatedAt;
        return price;
      },
      async create(args: { data: { key: string; skuId: string; amountCents: number; currency: string; status: string; source: string; externalVersion: number | null; sourceUpdatedAt?: Date } }) {
        const row: PriceRow = { id: `price-${++priceSeq}`, skuId: args.data.skuId, amountCents: args.data.amountCents, currency: args.data.currency, status: args.data.status, source: args.data.source, externalVersion: args.data.externalVersion, sourceUpdatedAt: args.data.sourceUpdatedAt ?? null };
        prices.push(row);
        return row;
      }
    },
    productSkuErpMapping: { async findUnique() { return null; }, async upsert() { return { id: "map-1" }; } }
  } as unknown as IngestDatabase;

  return { database, links, categoryMappings, skus, products, snapshots, prices, categories, rawCalls };
}

const PRODUCT_JOB = { permissionGrants: [{ permissionKey: "products.write" }] };
const PRICE_JOB = { permissionGrants: [{ permissionKey: "pricing.write" }] };
const INVENTORY_JOB = { permissionGrants: [{ permissionKey: "inventory.write" }] };
const CATEGORY_JOB = { permissionGrants: [{ permissionKey: "categories.write" }] };

test("validateIngestItem: products push rejects VanStro-owned and unsupported fields explicitly", () => {
  const valid = { skuCode: "SKU-1", name: "Widget" };
  assert.equal(validateIngestItem("products", valid), null);
  assert.match(validateIngestItem("products", { ...valid, slug: "widget" })!, /"slug".*VanStro-owned/);
  assert.match(validateIngestItem("products", { ...valid, status: "active" })!, /"status".*VanStro-owned/);
  assert.match(validateIngestItem("products", { ...valid, compareAtCents: 100 })!, /"compareAtCents".*VanStro-owned/);
  assert.match(validateIngestItem("products", { ...valid, brand: "Acme" })!, /"brand".*not supported by ERP push/);
  assert.match(validateIngestItem("products", { ...valid, shortDescription: "x" })!, /not supported by ERP push/);
  assert.match(validateIngestItem("products", { ...valid, categorySlug: "cat" })!, /not supported by ERP push/);
  assert.match(validateIngestItem("products", { ...valid, media: [] })!, /not supported by ERP push/);
  assert.match(validateIngestItem("products", { ...valid, seo: {} })!, /not supported by ERP push/);
  assert.match(validateIngestItem("products", { ...valid, unknownField: 1 })!, /not supported by ERP push/);
  assert.equal(validateIngestItem("products", { ...valid, priceCents: 1000, currency: "CAD", quantityOnHand: 5, locationCode: "EXT-1", source: "erp", externalVersion: 2, sourceUpdatedAt: "2026-08-12T00:00:00.000Z", erpSystem: "netsuite", erpCategoryKey: "CAT-1" }), null);
  assert.match(validateIngestItem("products", { ...valid, erpCategoryKey: "CAT-1" })!, /erpCategoryKey requires erpSystem/);
  assert.match(validateIngestItem("products", { ...valid, source: "shopify" })!, /source must be vanstro or erp/);
  assert.match(validateIngestItem("products", { ...valid, externalVersion: -1 })!, /externalVersion must be a non-negative integer/);
  assert.match(validateIngestItem("products", { ...valid, sourceUpdatedAt: "not-a-date" })!, /sourceUpdatedAt must be a valid date/);
  assert.match(validateIngestItem("products", { name: "No Sku" })!, /require name and skuCode/);
  assert.match(validateIngestItem("products", { skuCode: "SKU-1" })!, /require name and skuCode/);
  assert.equal(validateIngestItem("products", { erpSkuKey: "SKU-1", __unlist: true }), null);
  assert.match(validateIngestItem("products", { __unlist: true })!, /unlist requires erpSkuKey/);
});

test("validateIngestItem: prices/inventory/categories enforce their own ownership", () => {
  assert.equal(validateIngestItem("prices", { skuCode: "S", amountCents: 100 }), null);
  assert.match(validateIngestItem("prices", { skuCode: "S", amountCents: 100, compareAtCents: 50 })!, /"compareAtCents".*VanStro-owned/);
  assert.match(validateIngestItem("prices", { skuCode: "S", amountCents: 100, status: "active" })!, /"status".*VanStro-owned/);
  assert.match(validateIngestItem("prices", { skuCode: "S", amountCents: 100, note: "x" })!, /not supported by ERP push/);
  assert.equal(validateIngestItem("inventory", { skuCode: "S", locationCode: "EXT-1", quantityOnHand: 3 }), null);
  assert.match(validateIngestItem("inventory", { skuCode: "S", locationCode: "EXT-1", quantityOnHand: 3, reserved: 1 })!, /"reserved".*VanStro-owned/);
  assert.match(validateIngestItem("inventory", { skuCode: "S", locationCode: "EXT-1", quantityOnHand: 3, onHand: 1 })!, /not supported by ERP push/);
  assert.equal(validateIngestItem("categories", { slug: "c", name: "Cat" }), null);
  assert.match(validateIngestItem("categories", { slug: "c", name: "Cat", displayOrder: 1 })!, /"displayOrder".*VanStro-owned/);
  assert.match(validateIngestItem("categories", { slug: "c", name: "Cat", seo: {} })!, /"seo".*VanStro-owned/);
  assert.match(validateIngestItem("categories", { slug: "c", name: "Cat", erpCategoryKey: "K" })!, /erpCategoryKey requires erpSystem/);
  assert.match(validateIngestItem("categories", { slug: "c", name: "Cat", erpSystem: "s", erpCategoryId: 5 })!, /erpCategoryId requires/);
  assert.match(validateIngestItem("categories", { slug: "c", name: "Cat", isActive: "yes" })!, /isActive must be a boolean/);
  assert.equal(validateIngestItem("categories", { slug: "c", name: "Cat", erpSystem: "s", erpCategoryKey: "K", erpCategoryId: 5, isActive: true }), null);
});

test("createIngestJob: dry-run performs zero writes and returns synchronous per-item results", async () => {
  const outcome = await createIngestJob({
    kind: "products",
    items: [
      { skuCode: "SKU-1", name: "Widget" },
      { skuCode: "SKU-2", name: "Bad", status: "active" },
      { skuCode: "SKU-3", name: "Also Bad", brand: "Acme" }
    ],
    dryRun: true,
    requestHash: "req-12345678",
    authorization: { actorType: "service_account", actorId: "sa-1", effectiveRoles: [], permissionGrants: [], scope: { kind: "global" }, contextRevision: "machine" },
    scope: { kind: "global" },
    requestId: "req-1"
  });
  assert.equal(outcome.kind, "dry_run");
  assert.equal(outcome.jobId, undefined);
  assert.deepEqual(outcome.summary, { total: 3, committed: 1, failed: 0, skipped: 2 });
  assert.deepEqual(
    outcome.results?.map((entry) => ({ index: entry.index, status: entry.status })),
    [
      { index: 0, status: "committed" },
      { index: 1, status: "skipped" },
      { index: 2, status: "skipped" }
    ]
  );
  assert.match(outcome.results?.[1]?.error ?? "", /VanStro-owned/);
  assert.match(outcome.results?.[2]?.error ?? "", /not supported by ERP push/);
});

test("applyIngestItem: unmapped ERP location fails per-item with ERP_MAPPING_INCOMPLETE", async () => {
  const db = makeApplyDb({ skus: [{ id: "sku-1", skuCode: "SKU-1", name: "Widget", productId: "prod-1", product: { id: "prod-1", slug: "prod-1", name: "Widget", status: "active" } }] });
  await assert.rejects(
    () => applyIngestItem(INVENTORY_JOB, "inventory", { skuCode: "SKU-1", locationCode: "EXT-UNMAPPED", quantityOnHand: 5 }, db.database),
    /ERP_MAPPING_INCOMPLETE/
  );
  assert.equal(db.snapshots.length, 0, "no inventory write for an unmapped location");
});

test("applyIngestItem: inventory resolves inbound locations through DealerErpLink.erpLocationId", async () => {
  const db = makeApplyDb({
    links: [{ erpSystem: "netsuite", erpLocationId: "EXT-1", dealerLocationId: "loc-1" }],
    skus: [{ id: "sku-1", skuCode: "SKU-1", name: "Widget", productId: "prod-1", product: { id: "prod-1", slug: "prod-1", name: "Widget", status: "active" } }]
  });
  await applyIngestItem(INVENTORY_JOB, "inventory", { skuCode: "SKU-1", locationCode: "EXT-1", erpSystem: "netsuite", quantityOnHand: 7 }, db.database);
  assert.deepEqual(db.snapshots, [{ skuId: "sku-1", dealerLocationId: "loc-1", quantityOnHand: 7 }]);
});

test("applyIngestItem: ambiguous ERP location without erpSystem is never resolved arbitrarily", async () => {
  const sku = { id: "sku-1", skuCode: "SKU-1", name: "Widget", productId: "prod-1", product: { id: "prod-1", slug: "prod-1", name: "Widget", status: "active" } };
  const ambiguous = makeApplyDb({
    links: [
      { erpSystem: "a", erpLocationId: "EXT-1", dealerLocationId: "loc-1" },
      { erpSystem: "b", erpLocationId: "EXT-1", dealerLocationId: "loc-2" }
    ],
    skus: [sku]
  });
  await assert.rejects(
    () => applyIngestItem(INVENTORY_JOB, "inventory", { skuCode: "SKU-1", locationCode: "EXT-1", quantityOnHand: 1 }, ambiguous.database),
    /ERP_MAPPING_INCOMPLETE/
  );
  // Exactly one link row -> deterministic resolution even without erpSystem.
  const single = makeApplyDb({ links: [{ erpSystem: "a", erpLocationId: "EXT-1", dealerLocationId: "loc-9" }], skus: [sku] });
  await applyIngestItem(INVENTORY_JOB, "inventory", { skuCode: "SKU-1", locationCode: "EXT-1", quantityOnHand: 2 }, single.database);
  assert.deepEqual(single.snapshots, [{ skuId: "sku-1", dealerLocationId: "loc-9", quantityOnHand: 2 }]);
});

test("resolveDealerLocationId: deterministic exactly-one rule", async () => {
  const single = makeApplyDb({ links: [{ erpSystem: "a", erpLocationId: "EXT-1", dealerLocationId: "loc-1" }] });
  assert.equal(await resolveDealerLocationId(single.database, null, "EXT-1"), "loc-1");
  assert.equal(await resolveDealerLocationId(single.database, "a", "EXT-1"), "loc-1");
  assert.equal(await resolveDealerLocationId(single.database, "other", "EXT-1"), null);
  const ambiguous = makeApplyDb({
    links: [
      { erpSystem: "a", erpLocationId: "EXT-1", dealerLocationId: "loc-1" },
      { erpSystem: "b", erpLocationId: "EXT-1", dealerLocationId: "loc-2" }
    ]
  });
  assert.equal(await resolveDealerLocationId(ambiguous.database, null, "EXT-1"), null, "two systems claim the id: unresolved, no arbitrary pick");
  assert.equal(await resolveDealerLocationId(ambiguous.database, "b", "EXT-1"), "loc-2");
});

test("applyIngestItem: products resolve categories through erp_category_mappings and fail unmapped", async () => {
  const mapped = makeApplyDb({ categoryMappings: [{ erpSystem: "netsuite", erpCategoryKey: "CAT-1", categoryId: "cat-1" }] });
  await applyIngestItem(PRODUCT_JOB, "products", { skuCode: "SKU-NEW", name: "Widget", erpSystem: "netsuite", erpCategoryKey: "CAT-1" }, mapped.database);
  assert.deepEqual(mapped.products, [{ id: "prod-1", slug: "sku-new", name: "Widget", status: "draft", categoryId: "cat-1" }]);
  assert.deepEqual(mapped.skus.map(({ skuCode, productId }) => ({ skuCode, productId })), [{ skuCode: "SKU-NEW", productId: "prod-1" }]);

  const unmapped = makeApplyDb({ categoryMappings: [] });
  await assert.rejects(
    () => applyIngestItem(PRODUCT_JOB, "products", { skuCode: "SKU-NEW", name: "Widget", erpSystem: "netsuite", erpCategoryKey: "CAT-NOPE" }, unmapped.database),
    /ERP_MAPPING_INCOMPLETE/
  );
  assert.equal(unmapped.products.length, 0, "no product write for an unmapped category");
});

test("applyIngestItem: new ERP products get a deterministic slug, collision-safe against existing slugs", async () => {
  // An existing product already owns the slugified form of the new skuCode.
  const db = makeApplyDb({ skus: [{ id: "sku-0", skuCode: "OTHER", name: "Other", productId: "prod-0", product: { id: "prod-0", slug: "sku-new", name: "Other", status: "active" } }] });
  await applyIngestItem(PRODUCT_JOB, "products", { skuCode: "SKU-NEW", name: "Widget" }, db.database);
  assert.deepEqual(
    db.products.map(({ slug, name }) => ({ slug, name })),
    [
      { slug: "sku-new", name: "Other" },
      { slug: "sku-new-1", name: "Widget" }
    ]
  );
});

test("applyIngestItem: products __unlist archives through the canonical ingest", async () => {
  const db = makeApplyDb({ skus: [{ id: "sku-1", skuCode: "SKU-1", name: "Widget", productId: "prod-1", product: { id: "prod-1", slug: "prod-1", name: "Widget", status: "active" } }] });
  await applyIngestItem(PRODUCT_JOB, "products", { erpSkuKey: "SKU-1", skuCode: "SKU-1", __unlist: true }, db.database);
  assert.equal(db.products[0]!.status, "archived");
});

test("applyIngestItem: ERP price push records source/externalVersion and refreshes provenance on re-push", async () => {
  const sku = { id: "sku-1", skuCode: "SKU-1", name: "Widget", productId: "prod-1", product: { id: "prod-1", slug: "prod-1", name: "Widget", status: "active" } };
  const db = makeApplyDb({ skus: [sku] });
  await applyIngestItem(PRICE_JOB, "prices", { skuCode: "SKU-1", amountCents: 1999, source: "erp", externalVersion: 3 }, db.database);
  assert.deepEqual(
    db.prices.map(({ amountCents, currency, status, source, externalVersion }) => ({ amountCents, currency, status, source, externalVersion })),
    [{ amountCents: 1999, currency: "CAD", status: "active", source: "erp", externalVersion: 3 }]
  );
  // Same value re-pushed: no new row, provenance metadata refreshed only.
  await applyIngestItem(PRICE_JOB, "prices", { skuCode: "SKU-1", amountCents: 1999, source: "erp", externalVersion: 4 }, db.database);
  assert.equal(db.prices.length, 1);
  assert.equal(db.prices[0]!.externalVersion, 4);
  // A different amount archives the old active row and creates the new one.
  await applyIngestItem(PRICE_JOB, "prices", { skuCode: "SKU-1", amountCents: 2100, source: "erp", externalVersion: 5 }, db.database);
  assert.equal(db.prices.length, 2);
  assert.equal(db.prices[0]!.status, "archived");
  assert.equal(db.prices[1]!.status, "active");
});

test("applyIngestItem: product batch price push is ERP-sourced when the item says so", async () => {
  const db = makeApplyDb({ skus: [{ id: "sku-1", skuCode: "SKU-1", name: "Widget", productId: "prod-1", product: { id: "prod-1", slug: "prod-1", name: "Widget", status: "active" } }] });
  await applyIngestItem(PRODUCT_JOB, "products", { skuCode: "SKU-1", name: "Widget", priceCents: 999, source: "erp", externalVersion: 1 }, db.database);
  assert.equal(db.prices.length, 1);
  assert.equal(db.prices[0]!.source, "erp");
  assert.equal(db.prices[0]!.externalVersion, 1);
});

test("applyIngestItem: categories with erpCategoryKey persist the mapping row (raw upsert)", async () => {
  const db = makeApplyDb();
  await applyIngestItem(CATEGORY_JOB, "categories", { slug: "cat-1", name: "Cat 1", erpSystem: "netsuite", erpCategoryKey: "K-1", erpCategoryId: 42 }, db.database);
  assert.deepEqual(db.categoryMappings, [{ erpSystem: "netsuite", erpCategoryKey: "K-1", categoryId: "cat-1" }]);
  assert.equal(db.rawCalls.filter((call) => call.kind === "execute").length, 1);
  // Re-push of the same key re-points the mapping without a second row.
  await applyIngestItem(CATEGORY_JOB, "categories", { slug: "cat-2", name: "Cat 2", erpSystem: "netsuite", erpCategoryKey: "K-1" }, db.database);
  assert.equal(db.categoryMappings.length, 1);
  assert.equal(db.categoryMappings[0]!.categoryId, "cat-2");
});
