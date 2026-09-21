#!/usr/bin/env node
// bootstrap-mb01-catalog.mts
//
// Deterministic, SKU-keyed reconciliation of the LOCAL MB01 catalog against ONE
// DB authority. The local catalog is the checked-in src/lib/data/mb01-products.ts
// (generated from the timestamped G3 inventory) — this script never fetches
// mb01.vanstro.ca and never seeds demo data.
//
// Modes:
//   node --experimental-strip-types scripts/bootstrap-mb01-catalog.mts          -> dry-run (read-only, full WOULD plan)
//   node --experimental-strip-types scripts/bootstrap-mb01-catalog.mts --apply  -> apply exactly the same plan
//   (re-run either mode after apply -> empty plan / 0 changed rows: no-op proof)
//
// Contract (authority §5):
//   - SKU-keyed reconciliation: local SKU -> PlatformSku (by skuCode) -> owning
//     Product (by slug).
//   - Price writes are limited to the canonical retail:<skuCode> row; amountCents
//     is derived from the local dollar amount via amount*100; at most one active
//     CAD price may exist per SKU (preflight abort otherwise).
//   - Field ownership:
//       Product (upsert by slug)  — base fields ONLY: name, status, categoryId,
//         manufacturerPartNumber, subCategoryKey, unit, dimensions, finish,
//         colorName, colorHex.
//       PlatformSku (upsert by skuCode) — structure/status ONLY: productId
//         linkage + status. On first creation the local name/manufacturerPartNumber
//         are initialized; updates never touch them (ERP-authoritative afterwards).
//       Price — canonical retail:<skuCode> row ONLY: skuId, amountCents, currency,
//         status=active.
//       Image references — validated against REAL media files (see media gate);
//         product_assets rows are an informational cross-check, never the gate.
//   - Explicitly NOT synced: ProductAsset rows, ProductSpecification,
//     Product.finishOptions/description/productHighlights/documents/supportLinks/
//     recommendations, SKU attributes/sortOrder, inventory (onHand/reserved).
//     Nothing is ever deleted.
//   - Media gate (read-only preflight, runs in both modes, BEFORE any write):
//       * local (default): every image URL must start with /assets/products/ and
//         exist on disk under public/assets/products/** (--media-root overrides).
//       * release (--media-mode=release): same prefix + existence under the
//         immutable release dir (--release-dir) plus a deterministic representative
//         sample of URLs must return HTTP 200 (--base-url).
//   - Dry-run and apply compute the SAME plan from the same DB snapshot; dry-run
//     never dereferences rows that do not exist yet — missing Product/SKU are
//     reported as WOULD CREATE, never a crash.
//   - Output: full plan (identical in both modes) + a deterministic catalogHash.
//     No production connection info: the authority is reported as
//     production|non-production only (DATABASE_URL is never echoed).
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { register } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Resolve the tsconfig "@/*" alias for the local catalog import under plain node.
register(new URL("./tsconfig-paths-hook.mjs", import.meta.url).href);
const { mb01Products } = await import("../src/lib/data/mb01-products.ts");

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA_PREFIX = "/assets/products/";
const NON_PRODUCTION_URL_PATTERN = /demo|test|fixture|smoke|disposable/i;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
type CliArgs = {
  apply: boolean;
  allowNonProduction: boolean;
  mediaMode: "local" | "release";
  mediaRoot: string | null;
  releaseDir: string | null;
  baseUrl: string | null;
};

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    apply: false,
    allowNonProduction: false,
    mediaMode: "local",
    mediaRoot: null,
    releaseDir: null,
    baseUrl: null
  };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--allow-non-production") args.allowNonProduction = true;
    else if (raw === "--media-mode=local") args.mediaMode = "local";
    else if (raw === "--media-mode=release") args.mediaMode = "release";
    else if (raw.startsWith("--media-root=")) args.mediaRoot = raw.slice("--media-root=".length);
    else if (raw.startsWith("--release-dir=")) args.releaseDir = raw.slice("--release-dir=".length);
    else if (raw.startsWith("--base-url=")) args.baseUrl = raw.slice("--base-url=".length);
    else if (raw === "--help") {
      console.log(`usage: node --experimental-strip-types scripts/bootstrap-mb01-catalog.mts [--apply] [--allow-non-production]
  --media-mode=local|release   media gate mode (default local)
  --media-root=<dir>           local mode: base dir containing assets/products/** (default <repo>/public)
  --release-dir=<dir>          release mode: immutable release dir containing assets/products/**
  --base-url=<origin>          release mode: public origin for representative HTTP 200 checks`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${raw}`);
    }
  }
  if (args.mediaMode === "release") {
    if (!args.releaseDir) throw new Error("--media-mode=release requires --release-dir=<immutable release dir>");
    if (!args.baseUrl) throw new Error("--media-mode=release requires --base-url=<public origin> for HTTP 200 checks");
  }
  return args;
}

function authorityLabel(dbUrl: string): "production" | "non-production" {
  return NON_PRODUCTION_URL_PATTERN.test(dbUrl) ? "non-production" : "production";
}

function assertAuthority(dbUrl: string, allowNonProduction: boolean): void {
  if (!dbUrl) throw new Error("DATABASE_URL is required (the target DB authority).");
  if (!allowNonProduction && authorityLabel(dbUrl) === "non-production") {
    throw new Error("Refusing a non-production authority. Use --allow-non-production only for disposable DBs.");
  }
}

// ---------------------------------------------------------------------------
// Local catalog extraction (deterministic)
// ---------------------------------------------------------------------------
function categorySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueVariants(product: (typeof mb01Products)[number]) {
  const variants = [
    {
      name: product.name,
      sku: product.sku,
      manufacturerPartNumber: product.manufacturerPartNumber,
      colorName: product.colorName,
      colorHex: product.colorHex,
      dimensions: product.dimensions,
      images: product.images,
      price: product.price,
      active: true
    },
    ...(product.finishOptions ?? [])
  ];
  return [...new Map(
    variants
      .filter((variant) => variant.sku?.trim())
      .map((variant) => [variant.sku!.trim(), variant])
  ).values()];
}

function variantImages(variant: { images?: Array<{ url: string }>; image?: { url: string } }): string[] {
  return [...new Set([...(variant.images ?? []), ...(variant.image ? [variant.image] : [])].map((image) => image.url))];
}

export type LocalEntry = {
  skuCode: string;
  productSlug: string;
  productName: string;
  categorySlug: string;
  manufacturerPartNumber: string | null | undefined;
  subCategory: string | null | undefined;
  unit: string | null | undefined;
  dimensions: string | null | undefined;
  finish: string | null | undefined;
  colorName: string | null | undefined;
  colorHex: string | null | undefined;
  skuName: string;
  active: boolean;
  amountCents: number;
  currency: string;
  imageUrls: string[];
};

export function localCatalog(): LocalEntry[] {
  const entries: LocalEntry[] = [];
  const seen = new Set<string>();
  for (const product of mb01Products) {
    const variants = uniqueVariants(product);
    for (const variant of variants) {
      const skuCode = variant.sku!.trim();
      if (seen.has(skuCode)) continue;
      seen.add(skuCode);
      const price = variant.price ?? product.price;
      const amountCents = Math.round(price.amount * 100);
      entries.push({
        skuCode,
        productSlug: product.slug,
        productName: product.name,
        categorySlug: categorySlug(product.category),
        manufacturerPartNumber: variant.manufacturerPartNumber ?? product.manufacturerPartNumber,
        subCategory: product.subCategory,
        unit: product.unit,
        dimensions: variant.dimensions ?? product.dimensions,
        finish: product.finish,
        colorName: variant.colorName ?? product.colorName,
        colorHex: variant.colorHex ?? product.colorHex,
        skuName: variant.name || product.name,
        active: variant.active !== false,
        amountCents,
        currency: price.currency ?? "CAD",
        imageUrls: variantImages(variant)
      });
    }
  }
  return entries.sort((a, b) => a.skuCode.localeCompare(b.skuCode));
}

export function catalogHash(entries: LocalEntry[]): string {
  const lines = entries.map((entry) =>
    [
      entry.skuCode,
      entry.productSlug,
      entry.skuName,
      entry.active ? "active" : "draft",
      entry.amountCents,
      entry.currency,
      [...entry.imageUrls].sort().join(";")
    ].join("|")
  );
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

// ---------------------------------------------------------------------------
// Media gate (real filesystem checks; DB rows are never part of this gate)
// ---------------------------------------------------------------------------
export type MediaViolation = {
  kind: "media_root_missing" | "image_url_not_controlled" | "image_file_missing" | "image_url_not_200";
  detail: string;
};

export function mediaRootDir(args: CliArgs): string {
  return args.mediaMode === "release" ? args.releaseDir! : args.mediaRoot ?? join(REPO_ROOT, "public");
}

export function representativeSample(urls: string[], max = 10): string[] {
  if (urls.length <= max) return urls;
  const step = Math.ceil(urls.length / max);
  const sample: string[] = [];
  for (let i = 0; i < urls.length && sample.length < max; i += step) sample.push(urls[i]!);
  return sample;
}

async function urlReturns200(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0", "User-Agent": "VanStro bootstrap media gate/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs)
    });
    return response.status === 200 || response.status === 206;
  } catch {
    return false;
  }
}

export async function checkMedia(
  imageUrls: string[],
  args: CliArgs,
  httpTimeoutMs = 10_000
): Promise<{ violations: MediaViolation[]; checked: number }> {
  const violations: MediaViolation[] = [];
  const root = mediaRootDir(args);
  if (!existsSync(join(root, "assets", "products"))) {
    violations.push({ kind: "media_root_missing", detail: join(root, "assets", "products") });
    return { violations, checked: 0 };
  }
  const urls = [...new Set(imageUrls)].sort();
  let checked = 0;
  for (const url of urls) {
    if (!url.startsWith(MEDIA_PREFIX)) {
      violations.push({ kind: "image_url_not_controlled", detail: url });
      continue;
    }
    checked += 1;
    if (!existsSync(join(root, url))) {
      violations.push({ kind: "image_file_missing", detail: url });
    }
  }
  if (args.mediaMode === "release") {
    const sample = representativeSample(urls.filter((url) => url.startsWith(MEDIA_PREFIX)));
    for (const url of sample) {
      const ok = await urlReturns200(`${args.baseUrl!.replace(/\/+$/, "")}${url}`, httpTimeoutMs);
      if (!ok) violations.push({ kind: "image_url_not_200", detail: url });
    }
  }
  return { violations, checked };
}

// ---------------------------------------------------------------------------
// Reconciliation plan (pure; identical for dry-run and apply)
// ---------------------------------------------------------------------------
export type PlanOp =
  | { kind: "product:create"; id: string }
  | { kind: "product:update"; id: string }
  | { kind: "sku:create"; id: string }
  | { kind: "sku:update"; id: string }
  | { kind: "price:create"; id: string }
  | { kind: "price:update"; id: string };

export type Violation = { kind: string; detail: string };

export type DbState = {
  categories: Array<{ id: string; slug: string }>;
  products: Array<{
    id: string;
    slug: string;
    name: string;
    status: string;
    categoryId: string | null;
    manufacturerPartNumber: string | null;
    subCategoryKey: string | null;
    unit: string | null;
    dimensions: string | null;
    finish: string | null;
    colorName: string | null;
    colorHex: string | null;
  }>;
  skus: Array<{ id: string; skuCode: string; productId: string; status: string }>;
  canonicalPrices: Array<{ key: string; skuId: string; amountCents: number; currency: string; status: string }>;
  activeCadPrices: Array<{ skuCode: string; skuId: string; key: string | null; amountCents: number }>;
  assetRowsMatching: number;
};

const PRODUCT_OWNED_FIELDS = [
  "name",
  "status",
  "categoryId",
  "manufacturerPartNumber",
  "subCategoryKey",
  "unit",
  "dimensions",
  "finish",
  "colorName",
  "colorHex"
] as const;

export function buildPlan(entries: LocalEntry[], state: DbState): { plan: PlanOp[]; violations: Violation[] } {
  const plan: PlanOp[] = [];
  const violations: Violation[] = [];

  const categoryIds = new Map(state.categories.map((category) => [category.slug, category.id]));
  const productBySlug = new Map(state.products.map((product) => [product.slug, product]));
  const skuByCode = new Map(state.skus.map((sku) => [sku.skuCode, sku]));
  const canonicalBySku = new Map<string, DbState["canonicalPrices"][number]>();
  for (const price of state.canonicalPrices) {
    if (price.key.startsWith("retail:")) canonicalBySku.set(price.key.slice("retail:".length), price);
  }
  const activeCadBySku = new Map<string, Array<{ skuId: string; key: string | null; amountCents: number }>>();
  for (const price of state.activeCadPrices) {
    const list = activeCadBySku.get(price.skuCode) ?? [];
    list.push(price);
    activeCadBySku.set(price.skuCode, list);
  }

  // category resolution (read-only preflight)
  for (const slug of new Set(entries.map((entry) => entry.productSlug))) {
    const entry = entries.find((candidate) => candidate.productSlug === slug)!;
    if (!categoryIds.has(entry.categorySlug)) {
      violations.push({ kind: "category_missing", detail: `${entry.categorySlug} (product ${slug})` });
    }
  }

  // products (upsert by slug, write only on change)
  for (const slug of [...new Set(entries.map((entry) => entry.productSlug))].sort()) {
    const entry = entries.find((candidate) => candidate.productSlug === slug)!;
    const wanted = {
      name: entry.productName,
      status: "active",
      categoryId: categoryIds.get(entry.categorySlug) ?? null,
      manufacturerPartNumber: entry.manufacturerPartNumber ?? null,
      subCategoryKey: entry.subCategory ?? null,
      unit: entry.unit ?? null,
      dimensions: entry.dimensions ?? null,
      finish: entry.finish ?? null,
      colorName: entry.colorName ?? null,
      colorHex: entry.colorHex ?? null
    };
    const existing = productBySlug.get(slug);
    if (!existing) {
      plan.push({ kind: "product:create", id: slug });
    } else {
      const differs = PRODUCT_OWNED_FIELDS.some((field) => existing[field] !== wanted[field]);
      if (differs) plan.push({ kind: "product:update", id: slug });
    }
  }

  // SKUs (upsert by skuCode, structure/status only) + canonical prices
  for (const entry of entries) {
    const existingSku = skuByCode.get(entry.skuCode);
    const wantedStatus = entry.active ? "active" : "draft";
    if (!existingSku) {
      plan.push({ kind: "sku:create", id: entry.skuCode });
    } else {
      const targetProduct = productBySlug.get(entry.productSlug);
      const productIdDiffers = !targetProduct || existingSku.productId !== targetProduct.id;
      if (productIdDiffers || existingSku.status !== wantedStatus) {
        plan.push({ kind: "sku:update", id: entry.skuCode });
      }
    }

    // canonical retail:<skuCode> price; at most one active CAD price per SKU
    const activeCad = activeCadBySku.get(entry.skuCode) ?? [];
    const canonical = canonicalBySku.get(entry.skuCode);
    if (activeCad.length > 1) {
      violations.push({ kind: "multiple_active_cad_prices", detail: entry.skuCode });
    } else if (canonical) {
      const skuIdDiffers = !existingSku || canonical.skuId !== existingSku.id;
      if (
        skuIdDiffers ||
        canonical.amountCents !== entry.amountCents ||
        canonical.currency !== entry.currency ||
        canonical.status !== "active"
      ) {
        plan.push({ kind: "price:update", id: entry.skuCode });
      }
    } else if (activeCad.length === 1) {
      if (activeCad[0]!.amountCents !== entry.amountCents) {
        // Cannot reconcile without deleting/archiving the non-canonical row: abort preflight.
        violations.push({ kind: "non_canonical_active_cad_price_differs", detail: entry.skuCode });
      }
    } else {
      plan.push({ kind: "price:create", id: entry.skuCode });
    }
  }

  return { plan, violations };
}

export function deriveCounters(
  plan: PlanOp[],
  entries: LocalEntry[],
  media: { checked: number },
  violations: Violation[]
) {
  const counters = {
    productsChecked: new Set(entries.map((entry) => entry.productSlug)).size,
    productsChanged: 0,
    skusChecked: entries.length,
    skusChanged: 0,
    pricesChecked: entries.length,
    pricesCreated: 0,
    pricesUpdated: 0,
    imagesChecked: media.checked,
    imagesMissing: violations.filter((violation) => violation.kind === "image_file_missing").length,
    inventoryWrites: 0 as const
  };
  for (const op of plan) {
    if (op.kind === "product:create" || op.kind === "product:update") counters.productsChanged += 1;
    else if (op.kind === "sku:create" || op.kind === "sku:update") counters.skusChanged += 1;
    else if (op.kind === "price:create") counters.pricesCreated += 1;
    else if (op.kind === "price:update") counters.pricesUpdated += 1;
  }
  return counters;
}

// ---------------------------------------------------------------------------
// DB access (narrow structural view of the prisma client; main() casts once)
// ---------------------------------------------------------------------------
type BootstrapDb = {
  category: {
    findMany(args: { select: { id: true; slug: true } }): Promise<Array<{ id: string; slug: string }>>;
  };
  product: {
    findMany(args: {
      select: {
        id: true;
        slug: true;
        name: true;
        status: true;
        categoryId: true;
        manufacturerPartNumber: true;
        subCategoryKey: true;
        unit: true;
        dimensions: true;
        finish: true;
        colorName: true;
        colorHex: true;
      };
    }): Promise<DbState["products"]>;
    findUnique(args: { where: { slug: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    update(args: { where: { slug: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  platformSku: {
    findMany(args: { select: { id: true; skuCode: true; productId: true; status: true } }): Promise<DbState["skus"]>;
    findUnique(args: { where: { skuCode: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    update(args: { where: { skuCode: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  price: {
    findMany(args: {
      where: { key: { in: string[] } };
      select: { key: true; skuId: true; amountCents: true; currency: true; status: true };
    }): Promise<DbState["canonicalPrices"]>;
    findMany(args: {
      where: { status: "active"; currency: "CAD"; sku: { skuCode: { in: string[] } } };
      select: { skuId: true; key: true; amountCents: true; sku: { select: { skuCode: true } } };
    }): Promise<Array<{ skuId: string; key: string | null; amountCents: number; sku: { skuCode: string } }>>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    update(args: { where: { key: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  productAsset: {
    count(args: { where: { url: { in: string[] } } }): Promise<number>;
  };
};

async function loadDbState(db: BootstrapDb, entries: LocalEntry[], uniqueImageUrls: string[]): Promise<DbState> {
  const skuCodes = entries.map((entry) => entry.skuCode);
  const canonicalKeys = skuCodes.map((skuCode) => `retail:${skuCode}`);
  const [categories, products, skus, canonicalPrices, activeCadPrices, assetRowsMatching] = await Promise.all([
    db.category.findMany({ select: { id: true, slug: true } }),
    db.product.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        categoryId: true,
        manufacturerPartNumber: true,
        subCategoryKey: true,
        unit: true,
        dimensions: true,
        finish: true,
        colorName: true,
        colorHex: true
      }
    }),
    db.platformSku.findMany({ select: { id: true, skuCode: true, productId: true, status: true } }),
    db.price.findMany({
      where: { key: { in: canonicalKeys } },
      select: { key: true, skuId: true, amountCents: true, currency: true, status: true }
    }),
    db.price.findMany({
      where: { status: "active", currency: "CAD", sku: { skuCode: { in: skuCodes } } },
      select: { skuId: true, key: true, amountCents: true, sku: { select: { skuCode: true } } }
    }),
    db.productAsset.count({ where: { url: { in: uniqueImageUrls } } })
  ]);
  return {
    categories,
    products,
    skus,
    canonicalPrices,
    activeCadPrices: activeCadPrices.map((price) => ({
      skuCode: price.sku.skuCode,
      skuId: price.skuId,
      key: price.key,
      amountCents: price.amountCents
    })),
    assetRowsMatching
  };
}

// ---------------------------------------------------------------------------
// Execution (apply mode only; executes exactly the ops buildPlan produced)
// ---------------------------------------------------------------------------
export async function executePlan(
  db: BootstrapDb,
  plan: PlanOp[],
  entries: LocalEntry[],
  categoryIds: Map<string, string>
): Promise<void> {
  // First entry per slug wins — must match buildPlan's entries.find semantics.
  const entryBySlug = new Map<string, LocalEntry>();
  for (const entry of entries) {
    if (!entryBySlug.has(entry.productSlug)) entryBySlug.set(entry.productSlug, entry);
  }
  const entryBySku = new Map(entries.map((entry) => [entry.skuCode, entry]));

  for (const op of plan) {
    if (op.kind !== "product:create" && op.kind !== "product:update") continue;
    const entry = entryBySlug.get(op.id);
    if (!entry) throw new Error(`No local entry for product ${op.id} (plan ${op.kind}).`);
    const data = {
      name: entry.productName,
      status: "active",
      categoryId: categoryIds.get(entry.categorySlug) ?? null,
      manufacturerPartNumber: entry.manufacturerPartNumber ?? null,
      subCategoryKey: entry.subCategory ?? null,
      unit: entry.unit ?? null,
      dimensions: entry.dimensions ?? null,
      finish: entry.finish ?? null,
      colorName: entry.colorName ?? null,
      colorHex: entry.colorHex ?? null
    };
    if (op.kind === "product:create") await db.product.create({ data: { slug: op.id, ...data } });
    else await db.product.update({ where: { slug: op.id }, data });
  }

  for (const op of plan) {
    if (op.kind !== "sku:create" && op.kind !== "sku:update") continue;
    const entry = entryBySku.get(op.id);
    if (!entry) throw new Error(`No local entry for SKU ${op.id} (plan ${op.kind}).`);
    const product = await db.product.findUnique({ where: { slug: entry.productSlug }, select: { id: true } });
    if (!product) throw new Error(`Product ${entry.productSlug} missing during SKU phase (plan ${op.kind}:${op.id}).`);
    const status = entry.active ? "active" : "draft";
    if (op.kind === "sku:create") {
      await db.platformSku.create({
        data: {
          skuCode: op.id,
          productId: product.id,
          name: entry.skuName,
          manufacturerPartNumber: entry.manufacturerPartNumber ?? null,
          status
        }
      });
    } else {
      await db.platformSku.update({ where: { skuCode: op.id }, data: { productId: product.id, status } });
    }
  }

  for (const op of plan) {
    if (op.kind !== "price:create" && op.kind !== "price:update") continue;
    const entry = entryBySku.get(op.id);
    if (!entry) throw new Error(`No local entry for SKU ${op.id} (plan ${op.kind}).`);
    const sku = await db.platformSku.findUnique({ where: { skuCode: op.id }, select: { id: true } });
    if (!sku) throw new Error(`PlatformSku ${op.id} missing during price phase (plan ${op.kind}).`);
    const data = { skuId: sku.id, amountCents: entry.amountCents, currency: entry.currency, status: "active" };
    if (op.kind === "price:create") {
      await db.price.create({ data: { key: `retail:${op.id}`, ...data } });
    } else {
      await db.price.update({ where: { key: `retail:${op.id}` }, data });
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
function abortPreflight(violations: Violation[]): never {
  const summary = violations.slice(0, 10).map((violation) => `${violation.kind}:${violation.detail}`);
  throw new Error(`Bootstrap preflight failed (${violations.length} violations): ${summary.join(" | ")}`);
}

async function main() {
  let client: { $disconnect(): Promise<void> } | null = null;
  try {
    const args = parseArgs(process.argv.slice(2));
    const dbUrl = process.env.DATABASE_URL ?? "";
    assertAuthority(dbUrl, args.allowNonProduction);
    const label = authorityLabel(dbUrl);

    const entries = localCatalog();
    const hash = catalogHash(entries);
    const uniqueSlugs = [...new Set(entries.map((entry) => entry.productSlug))].sort();
    const uniqueImageUrls = [...new Set(entries.flatMap((entry) => entry.imageUrls))].sort();

    console.log(
      `[bootstrap-mb01-catalog] mode=${args.apply ? "apply" : "dry-run"} authority=${label} media=${args.mediaMode} ` +
        `localSkus=${entries.length} localProducts=${uniqueSlugs.length} localImages=${uniqueImageUrls.length} catalogHash=${hash}`
    );

    // Media gate: REAL files only (fs + representative HTTP in release mode), before any DB write.
    const media = await checkMedia(uniqueImageUrls, args);
    const violations: Violation[] = [...media.violations];
    if (violations.length > 0) abortPreflight(violations);

    // DB preflight reads + plan (read-only; identical for dry-run and apply)
    const dbModule = await import("../packages/db/dist/index.js");
    client = dbModule.prisma as { $disconnect(): Promise<void> };
    const db = dbModule.prisma as unknown as BootstrapDb;
    const state = await loadDbState(db, entries, uniqueImageUrls);
    const { plan, violations: planViolations } = buildPlan(entries, state);
    violations.push(...planViolations);
    if (violations.length > 0) abortPreflight(violations);

    // Full plan report — the SAME plan in dry-run and apply.
    for (const op of plan) console.log(`[bootstrap-mb01-catalog] PLAN ${op.kind} ${op.id}`);

    if (args.apply && plan.length > 0) {
      const categoryIds = new Map(state.categories.map((category) => [category.slug, category.id]));
      await executePlan(db, plan, entries, categoryIds);
    }

    const counters = deriveCounters(plan, entries, media, violations);
    const summary = {
      mode: args.apply ? "apply" : "dry-run",
      authority: label,
      catalogHash: hash,
      media: { mode: args.mediaMode, checked: media.checked, dbAssetRows: state.assetRowsMatching },
      localSkuCount: entries.length,
      localProductCount: uniqueSlugs.length,
      localImageCount: uniqueImageUrls.length,
      plan,
      counters,
      violations: violations.length
    };
    console.log(`RESULT ${JSON.stringify(summary)}`);

    const total = counters.productsChanged + counters.skusChanged + counters.pricesCreated + counters.pricesUpdated;
    if (total === 0) {
      console.log("[bootstrap-mb01-catalog] NO-OP: catalog is already in sync (0 changed rows).");
    } else if (!args.apply) {
      console.log(
        `[bootstrap-mb01-catalog] dry-run: ${total} rows WOULD change. Re-run with --apply to reconcile.`
      );
    } else {
      console.log(`[bootstrap-mb01-catalog] applied: ${total} rows changed. Re-run to prove no-op.`);
    }
  } finally {
    await client?.$disconnect();
  }
}

const isEntrypoint = typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
