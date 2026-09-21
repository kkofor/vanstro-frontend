import { createHash, randomUUID } from "node:crypto";
import { claimNextAsyncJob, completeAsyncJob, createAsyncJob, failAsyncJob, retryAsyncJob, serializeAsyncJob, type JobAuthorization, type JobLease, type JobScope, type JobTypeKey } from "@vanstro/db";
import { prisma, Prisma } from "@vanstro/db";
import { asyncJobReadiness } from "../config.js";

// V11-R1 P4/P5 production closure — canonical batch ingest.
// push (ERP v1), pull (Dashboard batch) and the Dashboard import entry all
// land here. Business writes happen ONLY inside this module's worker, driven
// by an async job whose creation is the atomic idempotency claim (P05
// createAsyncJob): same key + same payload replays the original job result;
// same key + different payload is a stable 409; in-progress/succeeded/
// partial/failed states are all recoverable from async_jobs.

export type IngestKind = "products" | "prices" | "inventory" | "dealers" | "dealer_locations" | "erp_links" | "categories" | "sku_mappings";

export const INGEST_KIND_PERMISSION: Record<IngestKind, string> = {
  products: "products.write",
  prices: "pricing.write",
  inventory: "inventory.write",
  dealers: "settings.write",
  dealer_locations: "settings.write",
  erp_links: "settings.write",
  categories: "categories.write",
  sku_mappings: "products.write"
};

export const INGEST_KINDS = Object.keys(INGEST_KIND_PERMISSION) as IngestKind[];
export const INGEST_MAX_ITEMS = 500;
export const INGEST_MAX_BYTES = 1_048_576;

// V11-R1 ERP readiness §7 — push field ownership. VanStro-owned fields must
// never be overwritten (nor silently ignored) by an inbound push: the item is
// rejected per-item with an explicit result. Fields outside the push contract
// (brand, media, seo, ...) are rejected the same way — never silently
// accepted-and-ignored. Every recognized push field is listed in the allowed
// set so a typo or a new field fails loudly instead of disappearing.
const VANSTRO_OWNED_PRODUCT_FIELDS = ["slug", "status", "compareAtCents"] as const;
const PRODUCTS_PUSH_FIELDS: Record<string, true> = {
  erpSkuKey: true,
  skuCode: true,
  name: true,
  erpSystem: true,
  erpCategoryKey: true,
  priceCents: true,
  currency: true,
  quantityOnHand: true,
  locationCode: true,
  source: true,
  externalVersion: true,
  sourceUpdatedAt: true,
  __validationError: true,
  __unlist: true,
  reason: true
};
const VANSTRO_OWNED_PRICE_FIELDS = ["status", "compareAtCents"] as const;
const PRICES_PUSH_FIELDS: Record<string, true> = { skuCode: true, amountCents: true, currency: true, source: true, externalVersion: true, sourceUpdatedAt: true, __validationError: true };
const VANSTRO_OWNED_INVENTORY_FIELDS = ["reserved"] as const;
const INVENTORY_PUSH_FIELDS: Record<string, true> = { skuCode: true, locationCode: true, quantityOnHand: true, erpSystem: true, __validationError: true };
const VANSTRO_OWNED_CATEGORY_FIELDS = ["displayOrder", "seo"] as const;
const CATEGORIES_PUSH_FIELDS: Record<string, true> = { slug: true, name: true, parentSlug: true, isActive: true, erpSystem: true, erpCategoryKey: true, erpCategoryId: true, __validationError: true };

export interface IngestItemOutcome {
  index: number;
  status: "committed" | "failed" | "skipped";
  error?: string;
}

function jobPermissions(job: { permissionGrants: Prisma.JsonValue }): string[] {
  const grants = Array.isArray(job.permissionGrants) ? (job.permissionGrants as Array<{ permissionKey?: unknown }>) : [];
  return grants.map((grant) => (typeof grant?.permissionKey === "string" ? grant.permissionKey : "")).filter(Boolean);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
}

/**
 * Ownership gate: a pushed field that is VanStro-owned (must never be
 * overwritten by ERP) or outside the push contract (brand, media, ...) makes
 * the whole item fail explicitly — never a silent ignore or overwrite.
 */
function rejectOwnedOrUnsupported(kindLabel: string, item: Record<string, unknown>, owned: readonly string[], allowed: Record<string, true>): string | null {
  for (const key of Object.keys(item)) {
    if (key === "__validationError") continue;
    if (owned.includes(key)) return `${kindLabel} field "${key}" is VanStro-owned and cannot be set via ERP push`;
    if (!allowed[key]) return `${kindLabel} field "${key}" is not supported by ERP push`;
  }
  return null;
}

function validateSourceFields(kindLabel: string, item: Record<string, unknown>): string | null {
  if (item.source !== undefined && item.source !== "vanstro" && item.source !== "erp") return `${kindLabel} source must be vanstro or erp`;
  if (item.externalVersion !== undefined && nonNegativeInt(item.externalVersion) === null) return `${kindLabel} externalVersion must be a non-negative integer`;
  if (item.sourceUpdatedAt !== undefined && (typeof item.sourceUpdatedAt !== "string" || Number.isNaN(new Date(item.sourceUpdatedAt).getTime()))) {
    return `${kindLabel} sourceUpdatedAt must be a valid date`;
  }
  return null;
}

/** Validate a single item structurally (field ownership). Returns error text or null. */
export function validateIngestItem(kind: IngestKind, item: Record<string, unknown>): string | null {
  switch (kind) {
    case "products": {
      const forced = str(item.__validationError);
      if (forced) return forced;
      const ownership = rejectOwnedOrUnsupported("products", item, VANSTRO_OWNED_PRODUCT_FIELDS, PRODUCTS_PUSH_FIELDS);
      if (ownership) return ownership;
      if (item.__unlist === true) {
        return str(item.erpSkuKey) || str(item.skuCode) ? null : "products unlist requires erpSkuKey";
      }
      if (!str(item.name) || !str(item.skuCode)) return "products require name and skuCode";
      if (item.erpCategoryKey !== undefined && !str(item.erpSystem)) return "products erpCategoryKey requires erpSystem";
      if (item.erpSystem !== undefined && !str(item.erpSystem)) return "products erpSystem must be a non-empty string when provided";
      const sourceFields = validateSourceFields("products", item);
      if (sourceFields) return sourceFields;
      if (item.priceCents !== undefined || item.currency !== undefined) {
        if (!str(item.skuCode) || nonNegativeInt(item.priceCents) === null) return "product price requires skuCode and non-negative priceCents";
      }
      if (item.quantityOnHand !== undefined || item.locationCode !== undefined) {
        if (!str(item.skuCode) || !str(item.locationCode) || nonNegativeInt(item.quantityOnHand) === null) return "product inventory requires skuCode, locationCode and non-negative quantityOnHand";
      }
      return null;
    }
    case "prices": {
      const ownership = rejectOwnedOrUnsupported("prices", item, VANSTRO_OWNED_PRICE_FIELDS, PRICES_PUSH_FIELDS);
      if (ownership) return ownership;
      const sourceFields = validateSourceFields("prices", item);
      if (sourceFields) return sourceFields;
      const cents = nonNegativeInt(item.amountCents);
      return !str(item.skuCode) || cents === null ? "prices require skuCode and non-negative amountCents" : null;
    }
    case "inventory": {
      const ownership = rejectOwnedOrUnsupported("inventory", item, VANSTRO_OWNED_INVENTORY_FIELDS, INVENTORY_PUSH_FIELDS);
      if (ownership) return ownership;
      const qty = nonNegativeInt(item.quantityOnHand);
      return !str(item.skuCode) || !str(item.locationCode) || qty === null ? "inventory requires skuCode, locationCode and non-negative quantityOnHand" : null;
    }
    case "dealers":
      return !str(item.code) || !str(item.name) ? "dealers require code and name" : null;
    case "dealer_locations":
      return !str(item.dealerCode) || !str(item.code) || !str(item.name) ? "dealer_locations require dealerCode, code and name" : null;
    case "erp_links":
      if (!str(item.dealerCode) || !str(item.erpSystem) || !str(item.erpLocationId)) return "erp_links require dealerCode, erpSystem and erpLocationId";
      if (item.dealerLocationCode !== undefined && !str(item.dealerLocationCode)) return "erp_links dealerLocationCode must be a non-empty string when provided";
      return null;
    case "categories": {
      const ownership = rejectOwnedOrUnsupported("categories", item, VANSTRO_OWNED_CATEGORY_FIELDS, CATEGORIES_PUSH_FIELDS);
      if (ownership) return ownership;
      if (item.isActive !== undefined && typeof item.isActive !== "boolean") return "categories isActive must be a boolean";
      if (item.erpCategoryKey !== undefined && !str(item.erpSystem)) return "categories erpCategoryKey requires erpSystem";
      if (item.erpCategoryId !== undefined && (nonNegativeInt(item.erpCategoryId) === null || !str(item.erpCategoryKey))) return "categories erpCategoryId requires a non-negative integer and erpCategoryKey";
      return !str(item.slug) || !str(item.name) ? "categories require slug and name" : null;
    }
    case "sku_mappings":
      return !str(item.skuCode) || !str(item.erpSystem) || !str(item.erpSkuKey) ? "sku_mappings require skuCode, erpSystem and erpSkuKey" : null;
    default:
      return "unsupported kind";
  }
}

// The subset of the Prisma surface the canonical ingest touches. Unit tests
// drive applyIngestItem with an in-memory double of this shape.
export type IngestDatabase = Pick<
  Prisma.TransactionClient,
  "platformSku" | "product" | "category" | "dealer" | "dealerLocation" | "dealerErpLink" | "inventorySnapshot" | "price" | "productSkuErpMapping" | "$queryRaw" | "$executeRaw"
>;

/**
 * Resolve the VanStro category for an ERP category key through
 * erp_category_mappings (migration 82). Raw SQL keeps this module independent
 * of Prisma client regeneration; an unmapped key must fail per-item with
 * ERP_MAPPING_INCOMPLETE at the caller, never fall back to a default category.
 */
export async function resolveCategoryMapping(database: IngestDatabase, erpSystem: string, erpCategoryKey: string): Promise<string | null> {
  const rows = await database.$queryRaw<Array<{ categoryId: string }>>(
    Prisma.sql`SELECT "categoryId" FROM "erp_category_mappings" WHERE "erpSystem" = ${erpSystem} AND "erpCategoryKey" = ${erpCategoryKey} LIMIT 1`
  );
  return rows[0]?.categoryId ?? null;
}

/** Upsert one (erpSystem, erpCategoryKey) -> categoryId mapping row (ON CONFLICT on the unique key). */
export async function upsertCategoryMapping(database: IngestDatabase, input: { erpSystem: string; erpCategoryKey: string; erpCategoryId: number | null; categoryId: string }): Promise<void> {
  await database.$executeRaw(Prisma.sql`
    INSERT INTO "erp_category_mappings" ("id", "erpSystem", "erpCategoryKey", "erpCategoryId", "categoryId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${input.erpSystem}, ${input.erpCategoryKey}, ${input.erpCategoryId}, ${input.categoryId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("erpSystem", "erpCategoryKey") DO UPDATE SET "erpCategoryId" = EXCLUDED."erpCategoryId", "categoryId" = EXCLUDED."categoryId", "updatedAt" = CURRENT_TIMESTAMP
  `);
}

/**
 * Deterministic inbound location resolution (contract §3): an ERP location id
 * maps through DealerErpLink. With an explicit erpSystem the
 * (erpSystem, erpLocationId) unique key decides; without one, exactly one link
 * row must own the erpLocationId or the resolution is absent/ambiguous (null)
 * — never an arbitrary first match.
 */
export async function resolveDealerLocationId(database: IngestDatabase, erpSystem: string | null, erpLocationId: string): Promise<string | null> {
  if (erpSystem) {
    const link = await database.dealerErpLink.findUnique({ where: { erpSystem_erpLocationId: { erpSystem, erpLocationId } } });
    return link?.dealerLocationId ?? null;
  }
  const links = await database.dealerErpLink.findMany({ where: { erpLocationId }, select: { dealerLocationId: true } });
  const mapped = links.filter((link) => link.dealerLocationId);
  return mapped.length === 1 ? (mapped[0]!.dealerLocationId as string) : null;
}

/**
 * Deterministic unique slug for ERP-created products (contract §1: slug is
 * the VanStro-internal unique identity; ERP push items cannot carry one —
 * slug is VanStro-owned and rejected by validation). Derived from the
 * skuCode; a collision suffix keeps the unique constraint.
 */
export async function uniqueProductSlug(database: IngestDatabase, base: string): Promise<string> {
  const normalized = base.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "erp-product";
  let candidate = normalized;
  let suffix = 1;
  while (await database.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** Canonical per-item application. Dry-run items never reach this path. */
export async function applyIngestItem(job: { permissionGrants: Prisma.JsonValue }, kind: IngestKind, item: Record<string, unknown>, database: IngestDatabase = prisma): Promise<void> {
  const required = INGEST_KIND_PERMISSION[kind];
  if (!jobPermissions(job).includes(required)) throw new Error(`${required} is required for ${kind} ingest`);
  switch (kind) {
    case "products": {
      // Soft-archive through the same canonical ingest. __unlist is an
      // internal marker set only by the ERP unlist route (never an ERP
      // payload field; slug/status are VanStro-owned and validation rejects
      // them on the push surface).
      if (item.__unlist === true) {
        const skuCode = str(item.skuCode);
        const sku = skuCode ? await database.platformSku.findUnique({ where: { skuCode }, include: { product: true } }) : null;
        if (!sku?.product) throw new Error("sku not found for unlist");
        await database.product.update({ where: { id: sku.product.id }, data: { status: "archived" } });
        break;
      }
      const skuCode = str(item.skuCode);
      const erpSystem = str(item.erpSystem);
      let categoryId: string | null = null;
      const erpCategoryKey = str(item.erpCategoryKey);
      if (erpCategoryKey) {
        // Contract §1/§7: category identity resolves through
        // erp_category_mappings only — never by name/slug/display order.
        const mapped = await resolveCategoryMapping(database, erpSystem!, erpCategoryKey);
        if (!mapped) throw new Error(`ERP_MAPPING_INCOMPLETE: no erp_category_mappings row for erpSystem=${erpSystem} erpCategoryKey=${erpCategoryKey}`);
        categoryId = mapped;
      }
      const existingSku = skuCode ? await database.platformSku.findUnique({ where: { skuCode }, include: { product: true } }) : null;
      const existing = existingSku?.product;
      if (existing) {
        await database.product.update({
          where: { id: existing.id },
          data: { name: str(item.name)!, ...(categoryId !== null ? { categoryId } : {}) }
        });
        if (existingSku) {
          await database.platformSku.update({ where: { id: existingSku.id }, data: { name: str(item.name)! } });
        }
      } else {
        const slug = await uniqueProductSlug(database, skuCode!);
        await database.product.create({
          data: {
            slug,
            name: str(item.name)!,
            categoryId: categoryId ?? null,
            skus: { create: { skuCode: skuCode!, name: str(item.name)! } }
          }
        });
      }
      // Contract: quantityOnHand/locationCode are honored when provided
      // (never accepted-and-ignored). They require a skuCode on the item.
      if (str(item.skuCode) && typeof item.quantityOnHand === "number" && str(item.locationCode)) {
        const sku = await database.platformSku.findUniqueOrThrow({ where: { skuCode: str(item.skuCode)! } });
        // Inbound locations resolve through DealerErpLink.erpLocationId
        // (contract §3); an unmapped location fails per-item, never silently
        // falls back to a default dealer or arbitrary snapshot.
        const dealerLocationId = await resolveDealerLocationId(database, erpSystem, str(item.locationCode)!);
        if (!dealerLocationId) throw new Error(`ERP_MAPPING_INCOMPLETE: no DealerErpLink maps erpLocationId "${str(item.locationCode)!}"`);
        const qty = nonNegativeInt(item.quantityOnHand);
        if (qty === null) throw new Error("quantityOnHand must be non-negative");
        await database.inventorySnapshot.upsert({
          where: { skuId_dealerLocationId: { skuId: sku.id, dealerLocationId } },
          update: { quantityOnHand: qty },
          create: { skuId: sku.id, dealerLocationId, quantityOnHand: qty }
        });
      }
      // Product batches may carry price alongside the SKU. Apply it here so
      // the ERP ProductWrite contract never accepts-and-ignores price fields.
      if (str(item.skuCode) && typeof item.priceCents === "number") {
        const sku = await database.platformSku.findUniqueOrThrow({ where: { skuCode: str(item.skuCode)! } });
        const cents = nonNegativeInt(item.priceCents);
        if (cents === null) throw new Error("priceCents must be non-negative");
        const currency = str(item.currency) ?? "CAD";
        const source = str(item.source) ?? "vanstro";
        const externalVersion = item.externalVersion === undefined ? null : nonNegativeInt(item.externalVersion);
        const sourceUpdatedAt = item.sourceUpdatedAt === undefined ? undefined : new Date(String(item.sourceUpdatedAt));
        const active = await database.price.findFirst({ where: { skuId: sku.id, status: "active" } });
        if (active && active.amountCents === cents && active.currency === currency) {
          // Same value re-pushed: refresh the ERP provenance metadata only —
          // never touch the VanStro-owned publish fields (status/compareAtCents).
          if (active.source !== source || active.externalVersion !== externalVersion || active.sourceUpdatedAt?.getTime() !== sourceUpdatedAt?.getTime()) {
            await database.price.update({ where: { id: active.id }, data: { source, externalVersion, sourceUpdatedAt } });
          }
        } else {
          if (active) await database.price.update({ where: { id: active.id }, data: { status: "archived", effectiveUntil: new Date() } });
          await database.price.create({ data: { key: `ingest-${sku.id}-${Date.now()}-${randomUUID().slice(0, 8)}`, skuId: sku.id, amountCents: cents, currency, status: "active", source, externalVersion, sourceUpdatedAt } });
        }
      }
      break;
    }
    case "prices": {
      const sku = await database.platformSku.findUnique({ where: { skuCode: str(item.skuCode)! } });
      if (!sku) throw new Error("sku not found");
      const cents = nonNegativeInt(item.amountCents)!;
      const currency = str(item.currency) ?? "CAD";
      const source = str(item.source) ?? "vanstro";
      const externalVersion = item.externalVersion === undefined ? null : nonNegativeInt(item.externalVersion);
      const sourceUpdatedAt = item.sourceUpdatedAt === undefined ? undefined : new Date(String(item.sourceUpdatedAt));
      const active = await database.price.findFirst({ where: { skuId: sku.id, status: "active" } });
      if (active && active.amountCents === cents && active.currency === currency) {
        // no-op on value; refresh ERP provenance metadata only (never
        // VanStro-owned status/compareAtCents).
        if (active.source !== source || active.externalVersion !== externalVersion || active.sourceUpdatedAt?.getTime() !== sourceUpdatedAt?.getTime()) {
          await database.price.update({ where: { id: active.id }, data: { source, externalVersion, sourceUpdatedAt } });
        }
        break;
      }
      if (active) await database.price.update({ where: { id: active.id }, data: { status: "archived", effectiveUntil: new Date() } });
      await database.price.create({ data: { key: `ingest-${sku.id}-${Date.now()}-${randomUUID().slice(0, 8)}`, skuId: sku.id, amountCents: cents, currency, status: "active", source, externalVersion, sourceUpdatedAt } });
      break;
    }
    case "inventory": {
      const sku = await database.platformSku.findUnique({ where: { skuCode: str(item.skuCode)! } });
      if (!sku) throw new Error("sku not found");
      // Inbound locations resolve through DealerErpLink.erpLocationId only
      // (contract §3); an unmapped location fails per-item with
      // ERP_MAPPING_INCOMPLETE — never a default dealer.
      const dealerLocationId = await resolveDealerLocationId(database, str(item.erpSystem), str(item.locationCode)!);
      if (!dealerLocationId) throw new Error(`ERP_MAPPING_INCOMPLETE: no DealerErpLink maps erpLocationId "${str(item.locationCode)!}"`);
      await database.inventorySnapshot.upsert({
        where: { skuId_dealerLocationId: { skuId: sku.id, dealerLocationId } },
        update: { quantityOnHand: nonNegativeInt(item.quantityOnHand)! },
        create: { skuId: sku.id, dealerLocationId, quantityOnHand: nonNegativeInt(item.quantityOnHand)! }
      });
      break;
    }
    case "dealers": {
      await prisma.dealer.upsert({
        where: { code: str(item.code)! },
        update: { name: str(item.name)!, status: ((item.status as never) ?? "active") },
        create: { code: str(item.code)!, name: str(item.name)!, status: ((item.status as never) ?? "active") }
      });
      break;
    }
    case "dealer_locations": {
      const dealer = await prisma.dealer.findUnique({ where: { code: str(item.dealerCode)! } });
      if (!dealer) throw new Error("dealer not found");
      const code = str(item.code)!;
      const existing = await prisma.dealerLocation.findFirst({ where: { code } });
      if (existing) {
        await prisma.dealerLocation.update({ where: { id: existing.id }, data: { name: str(item.name)!, status: ((item.status as never) ?? "active"), dealerId: dealer.id } });
      } else {
        await prisma.dealerLocation.create({ data: { code, name: str(item.name)!, dealerId: dealer.id, status: ((item.status as never) ?? "active") } });
      }
      break;
    }
    case "erp_links": {
      // A batch item defines the full logical link: dealer (by code) plus an
      // optional location that MUST belong to that dealer. The schema
      // identity is @@unique([erpSystem, erpLocationId]), so the upsert
      // replaces the link's dealer/location pointers idempotently — repeated
      // identical items are no-ops, a different dealer/location re-points the
      // same ERP location. The batch never deletes link rows (physical
      // unlink stays with the dashboard erp-links endpoint).
      const dealer = await prisma.dealer.findUnique({ where: { code: str(item.dealerCode)! } });
      if (!dealer) throw new Error("dealer not found");
      let dealerLocationId: string | null = null;
      const dealerLocationCode = str(item.dealerLocationCode);
      if (dealerLocationCode) {
        const location = await prisma.dealerLocation.findFirst({ where: { code: dealerLocationCode, dealerId: dealer.id } });
        if (!location) throw new Error("dealer location not found for dealer");
        dealerLocationId = location.id;
      }
      const erpSystem = str(item.erpSystem)!;
      const erpLocationId = str(item.erpLocationId)!;
      const existing = await prisma.dealerErpLink.findUnique({ where: { erpSystem_erpLocationId: { erpSystem, erpLocationId } } });
      if (existing && existing.dealerId === dealer.id && existing.dealerLocationId === dealerLocationId) return; // no-op
      await prisma.dealerErpLink.upsert({
        where: { erpSystem_erpLocationId: { erpSystem, erpLocationId } },
        update: { dealerId: dealer.id, dealerLocationId },
        create: { dealerId: dealer.id, dealerLocationId, erpSystem, erpLocationId }
      });
      break;
    }
    case "categories": {
      const category = await database.category.upsert({
        where: { slug: str(item.slug)! },
        update: {
          name: str(item.name)!,
          ...(typeof item.isActive === "boolean" ? { isActive: item.isActive } : {}),
          ...(str(item.parentSlug) ? { parent: { connect: { slug: str(item.parentSlug)! } } } : {})
        },
        create: {
          slug: str(item.slug)!,
          name: str(item.name)!,
          ...(typeof item.isActive === "boolean" ? { isActive: item.isActive } : {}),
          ...(str(item.parentSlug) ? { parent: { connect: { slug: str(item.parentSlug)! } } } : {})
        }
      });
      // Category mapping apply path (contract §1): when the item carries the
      // ERP identity, persist the stable (erpSystem, erpCategoryKey) ->
      // categoryId row. Unmapped categories never fall back to a default.
      if (str(item.erpCategoryKey)) {
        await upsertCategoryMapping(database, {
          erpSystem: str(item.erpSystem)!,
          erpCategoryKey: str(item.erpCategoryKey)!,
          erpCategoryId: item.erpCategoryId === undefined ? null : nonNegativeInt(item.erpCategoryId),
          categoryId: category.id
        });
      }
      break;
    }
    case "sku_mappings": {
      const sku = await prisma.platformSku.findUnique({ where: { skuCode: str(item.skuCode)! } });
      if (!sku) throw new Error("sku not found");
      const erpSystem = str(item.erpSystem)!;
      const erpSkuKey = str(item.erpSkuKey)!;
      const existing = await prisma.productSkuErpMapping.findUnique({ where: { skuId_erpSystem: { skuId: sku.id, erpSystem } } });
      if (existing && existing.erpSkuKey === erpSkuKey) return; // no-op
      await prisma.productSkuErpMapping.upsert({
        where: { skuId_erpSystem: { skuId: sku.id, erpSystem } },
        update: { erpSkuKey, erpProductId: typeof item.erpProductId === "number" ? item.erpProductId : undefined, erpSkuId: typeof item.erpSkuId === "number" ? item.erpSkuId : undefined },
        create: { skuId: sku.id, erpSystem, erpSkuKey, erpProductId: typeof item.erpProductId === "number" ? item.erpProductId : null, erpSkuId: typeof item.erpSkuId === "number" ? item.erpSkuId : null }
      });
      break;
    }
  }
}

function scopeFingerprint(scope: JobScope): string {
  const canonical = scope.kind === "global" ? { kind: "global" } : { kind: scope.kind, dealerIds: scope.dealerIds, locationIds: scope.locationIds };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export interface CreateIngestJobInput {
  kind: IngestKind;
  items: Array<Record<string, unknown>>;
  dryRun: boolean;
  requestHash: string | null;
  authorization: JobAuthorization;
  scope: JobScope;
  requestId: string;
}

export type IngestJobOutcome = { kind: "created" | "replayed" | "conflict" | "dry_run"; jobId: string | undefined; results?: IngestItemOutcome[]; summary?: { total: number; committed: number; failed: number; skipped: number }; replayed?: boolean };

export async function createIngestJob(input: CreateIngestJobInput): Promise<IngestJobOutcome> {
  // V11-R1 ERP readiness §7: dry-run performs ZERO writes — no AsyncJob
  // claim, no batch_ingest_results ledger rows. Per-item outcomes are the
  // synchronous validation result, so callers preview without touching the
  // async worker or the ledger (also works when the async foundation is not
  // configured yet).
  if (input.dryRun) {
    const results: IngestItemOutcome[] = input.items.map((item, index) => {
      const validation = validateIngestItem(input.kind, item);
      return validation ? { index, status: "skipped", error: validation } : { index, status: "committed" };
    });
    const summary = {
      total: results.length,
      committed: results.filter((entry) => entry.status === "committed").length,
      failed: 0,
      skipped: results.filter((entry) => entry.status === "skipped").length
    };
    return { kind: "dry_run", jobId: undefined, results, summary };
  }
  const readiness = asyncJobReadiness();
  if (!readiness.enabled || !readiness.keyset) throw new Error("JOB_TYPE_UNAVAILABLE");
  const idempotencyKey = input.requestHash ?? `batch-${randomUUID()}`;
  try {
    const created = await createAsyncJob(prisma, {
      runtimeMode: readiness.runtimeMode,
      typeKey: "dashboard.batch.ingest",
      payload: { kind: input.kind, items: input.items, dryRun: input.dryRun, scopeFingerprint: scopeFingerprint(input.scope) },
      idempotencyKey,
      authorization: input.authorization,
      requestId: input.requestId,
      keyset: readiness.keyset,
      allowApplicationType: true
    });
    if (created.replayed) {
      const { results, summary } = await readIngestResults(created.job.id);
      return { kind: "replayed", jobId: created.job.id, replayed: true, results, summary };
    }
    return { kind: "created", jobId: created.job.id };
  } catch (error) {
    if (error instanceof Error && /IDEMPOTENCY_CONFLICT/.test(error.message)) {
      return { kind: "conflict", jobId: "", results: [], summary: { total: 0, committed: 0, failed: 0, skipped: 0 } };
    }
    throw error;
  }
}

/** Read persisted per-item results for a job (empty when not yet executed). */
export async function readIngestResults(jobId: string): Promise<{ results: IngestItemOutcome[]; summary: { total: number; committed: number; failed: number; skipped: number } }> {
  const rows = await prisma.batchIngestResult.findMany({ where: { jobId }, orderBy: { itemIndex: "asc" } });
  const results = rows.map((row) => ({ index: row.itemIndex, status: row.status as IngestItemOutcome["status"], ...(row.error ? { error: row.error } : {}) }));
  const summary = {
    total: results.length,
    committed: results.filter((entry) => entry.status === "committed").length,
    failed: results.filter((entry) => entry.status === "failed").length,
    skipped: results.filter((entry) => entry.status === "skipped").length
  };
  return { results, summary };
}

/**
 * Atomically persist one execution's per-item outcomes for a job. A retry
 * stays bound to the original jobId+itemIndex, so rows a previous attempt
 * wrote must be cleared inside the same transaction before the new rows are
 * inserted (unique (jobId, itemIndex)); on failure the whole replacement
 * rolls back and the prior results remain intact (no half-cleared state).
 */
export async function replaceIngestResults(
  database: { $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> },
  jobId: string,
  outcomes: IngestItemOutcome[]
): Promise<void> {
  await database.$transaction(async (tx) => {
    await tx.batchIngestResult.deleteMany({ where: { jobId } });
    if (outcomes.length > 0) {
      await tx.batchIngestResult.createMany({
        data: outcomes.map((outcome) => ({ jobId, itemIndex: outcome.index, status: outcome.status, error: outcome.error ?? null }))
      });
    }
  });
}

/** Worker tick: claim one queued ingest job and execute it. */
export async function runBatchIngestWorkerTick(): Promise<void> {
  const readiness = asyncJobReadiness();
  if (!readiness.enabled || !readiness.keyset) return;
  const claimed = await claimNextAsyncJob(prisma, { runtimeMode: readiness.runtimeMode, workerId: "batch-ingest", typeKey: "dashboard.batch.ingest" });
  if (!claimed) return;
  const { lease, job } = claimed;
  try {
    const payload = job.payload as { kind: IngestKind; items: Array<Record<string, unknown>>; dryRun: boolean };
    const outcomes: IngestItemOutcome[] = [];
    for (let index = 0; index < payload.items.length; index += 1) {
      const item = payload.items[index] ?? {};
      const validation = validateIngestItem(payload.kind, item);
      if (validation) {
        outcomes.push({ index, status: "skipped", error: validation });
        continue;
      }
      if (payload.dryRun) {
        outcomes.push({ index, status: "committed" });
        continue;
      }
      try {
        await applyIngestItem(job, payload.kind, item);
        outcomes.push({ index, status: "committed" });
      } catch (error) {
        outcomes.push({ index, status: "failed", error: error instanceof Error ? error.message.slice(0, 240) : "commit failed" });
      }
    }
    await replaceIngestResults(prisma, job.id, outcomes);
    const summary = {
      total: outcomes.length,
      committed: outcomes.filter((entry) => entry.status === "committed").length,
      failed: outcomes.filter((entry) => entry.status === "failed").length,
      skipped: outcomes.filter((entry) => entry.status === "skipped").length
    };
    await completeAsyncJob(prisma, lease, {
      processed: summary.committed,
      failed: summary.failed,
      summary: { total: summary.total, committed: summary.committed, failed: summary.failed, skipped: summary.skipped }
    });
  } catch (error) {
    await failAsyncJob(prisma, lease, {
      failureClass: "internal",
      code: "BATCH_INGEST_FAILED",
      summary: { error: error instanceof Error ? error.message.slice(0, 200) : "ingest failed" }
    });
  }
}

/** Start the in-process worker loop (unref'd so it never blocks shutdown). */
export function startBatchIngestWorker(): NodeJS.Timeout {
  const timer = setInterval(() => {
    void runBatchIngestWorkerTick().catch(() => undefined);
  }, 1500);
  timer.unref();
  return timer;
}

/** Serialize a job for API responses (no sensitive payloads). */
export function serializeIngestJob(job: unknown, artifacts: unknown[] = []) {
  return serializeAsyncJob(job as never, artifacts);
}

/** Retry a failed ingest job (partial retry stays bound to the original job). */
export async function retryIngestJob(jobId: string, expectedVersion: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await retryAsyncJob(prisma, { jobId, expectedVersion });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "retry failed" };
  }
}
