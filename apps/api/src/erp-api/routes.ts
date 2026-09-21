import { Hono } from "hono";
import { Prisma, prisma, type OrderStatus } from "@vanstro/db";
import { badRequest } from "../dashboard/request.js";
import { type DashboardEnv } from "../dashboard/access.js";
import { hasMachinePermission, requireMachineAccess, writeMachineAudit } from "../auth/service-account-access.js";
import { machineScopeDenial } from "../dashboard/s08-settings-policy.js";
import { type ServiceAccountPrincipal } from "../auth/service-account.js";
import { rateLimitServiceAccount } from "../middleware/rate-limit-sa.js";
import { createIngestJob, readIngestResults, resolveDealerLocationId, retryIngestJob } from "../dashboard/batch-ingest.js";
import { createErpWebhook, deleteErpWebhook, listErpWebhooks } from "./webhooks.js";
import { buildErpOpenApiDocument, ERP_BATCH_BYTES, ERP_BATCH_LIMIT, ERP_PAGE_LIMIT_MAX, type ErpOrderRead, type ErpProductRead } from "./openapi.js";

// V11-R1 P5 — ERP Integration API v1 (machine service-account surface).
// Mounted at /api/v1/integrations/erp; machine auth + rate limiting come
// from the existing erp-integration middleware (requireMachineAccess +
// rateLimitServiceAccount).

const ERP_STATUS_TO_PRODUCT: Record<string, "draft" | "active" | "archived" | "inactive"> = {
  draft: "draft",
  active: "active",
  archived: "archived",
  inactive: "inactive"
};

const IDEMPOTENCY_KEY = /^[\x21-\x7e]{8,128}$/;
const IDEMPOTENCY_KEY_FORBIDDEN = /(email|phone|address|token|secret|path)/i;

function validRequestHash(value: unknown): value is string {
  return typeof value === "string" && IDEMPOTENCY_KEY.test(value) && !IDEMPOTENCY_KEY_FORBIDDEN.test(value);
}

function parseCompositeCursor(value: string | undefined): { updatedAt: Date; id: string } | null {
  if (!value) return null;
  const separator = value.lastIndexOf(":");
  if (separator <= 0 || separator === value.length - 1) return null;
  const updatedAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  return Number.isNaN(updatedAt.getTime()) ? null : { updatedAt, id };
}

// Row shape produced by the product read queries (product+category, one
// active price, and — deterministically — the snapshots of ONE resolved
// dealer location). The location filter uses an impossible id when no
// location was requested so the include shape stays uniform and never picks
// an arbitrary snapshot.
type ProductReadRow = {
  skuCode: string;
  name: string;
  updatedAt: Date;
  product: {
    slug: string;
    status: string;
    brand: string | null;
    shortDescription: string | null;
    category: { slug: string } | null;
  } | null;
  prices: Array<{ status: string; amountCents: number; currency: string }>;
  inventorySnapshots: Array<{ quantityOnHand: number; dealerLocation: { code: string } | null }>;
};

const NO_DEALER_LOCATION = "00000000-0000-4000-8000-000000000000";

async function toProductRead(sku: ProductReadRow, targetLocationId: string | null): Promise<ErpProductRead> {
  const product = sku.product;
  const price = sku.prices?.find((entry: { status: string }) => entry.status === "active");
  // V11-R1 ERP readiness §3: deterministic inventory read. The snapshot is
  // only ever the one for the resolved dealer location (never an arbitrary
  // first snapshot); when no location was requested/resolved the response
  // says so explicitly with INVENTORY_NO_DEALER instead of guessing.
  const snapshot = targetLocationId ? sku.inventorySnapshots?.[0] : undefined;
  return {
    erpSkuKey: sku.skuCode,
    name: sku.name,
    slug: product?.slug ?? sku.skuCode,
    status: product ? (ERP_STATUS_TO_PRODUCT[product.status] ?? "inactive") : "inactive",
    brand: product?.brand ?? null,
    shortDescription: product?.shortDescription ?? null,
    categorySlug: product?.category?.slug ?? null,
    priceCents: price?.amountCents ?? null,
    currency: price?.currency ?? null,
    quantityOnHand: snapshot?.quantityOnHand ?? null,
    locationCode: snapshot?.dealerLocation?.code ?? null,
    inventoryStatus: targetLocationId ? "inventory_ok" : "inventory_no_dealer",
    updatedAt: sku.updatedAt.toISOString()
  };
}

const ERP_ORDER_STATUSES: ReadonlyArray<string> = ["paid", "processing", "fulfilled", "cancelled"];

// Safe order read: operational order data + line items only. The select
// explicitly omits every PII/payment field (email, names, phone, guest
// token, payment session/method, notes, shipping address).
const ORDER_SAFE_SELECT = {
  id: true,
  status: true,
  fulfillment: true,
  currency: true,
  subtotalCents: true,
  discountCents: true,
  taxCents: true,
  shippingCents: true,
  totalCents: true,
  dealerLocationId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      skuCode: true,
      productName: true,
      quantity: true,
      unitPriceCents: true,
      lineTotalCents: true
    }
  }
} satisfies Prisma.OrderSelect;

type SafeOrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SAFE_SELECT }>;

// PII-gated order read: ORDER_SAFE_SELECT plus the PII/payment fields,
// gated behind the erp.orders.pii machine permission. Explicit whitelist;
// guest token fields and the full payment session are never selected.
// providerPaymentId lives on PaymentSession (not Order) in the schema.
const ORDER_PII_SELECT = {
  ...ORDER_SAFE_SELECT,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  notes: true,
  shippingAddressLine1: true,
  shippingAddressLine2: true,
  paymentMethod: true,
  paymentSession: {
    select: {
      providerPaymentId: true,
      shippingCity: true,
      shippingProvince: true,
      shippingPostalCode: true,
      shippingCountry: true
    }
  }
} satisfies Prisma.OrderSelect;

type PiiOrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_PII_SELECT }>;

async function dealerIdsByLocation(locationIds: Array<string | null>): Promise<Map<string, string>> {
  const ids = [...new Set(locationIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();
  const locations = await prisma.dealerLocation.findMany({
    where: { id: { in: ids } },
    select: { id: true, dealerId: true }
  });
  return new Map(locations.map((location) => [location.id, location.dealerId]));
}

function toOrderRead(row: SafeOrderRow, dealerIds: Map<string, string>): ErpOrderRead {
  return {
    id: row.id,
    status: row.status,
    fulfillment: row.fulfillment,
    currency: row.currency,
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    taxCents: row.taxCents,
    shippingCents: row.shippingCents,
    totalCents: row.totalCents,
    dealerId: row.dealerLocationId ? dealerIds.get(row.dealerLocationId) ?? null : null,
    dealerLocationId: row.dealerLocationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      skuCode: item.skuCode,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents
    }))
  };
}

// PII-gated order read serializer: toOrderRead plus every erp.orders.pii
// field. The four shipping fields come from the (nullable) payment session
// and are null when the session is absent — never an error.
function toOrderReadWithPii(row: PiiOrderRow, dealerIds: Map<string, string>): ErpOrderRead {
  return {
    ...toOrderRead(row, dealerIds),
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    shippingAddressLine1: row.shippingAddressLine1,
    shippingAddressLine2: row.shippingAddressLine2,
    paymentMethod: row.paymentMethod,
    providerPaymentId: row.paymentSession?.providerPaymentId ?? null,
    shippingCity: row.paymentSession?.shippingCity ?? null,
    shippingProvince: row.paymentSession?.shippingProvince ?? null,
    shippingPostalCode: row.paymentSession?.shippingPostalCode ?? null,
    shippingCountry: row.paymentSession?.shippingCountry ?? null
  };
}

export function createErpApiV1Routes() {
  const routes = new Hono<DashboardEnv>();
  // Machine service-account auth before rate limiting, exactly like the
  // legacy machine routes (auth strictly before rate limiting).
  routes.use("*", requireMachineAccess("cli.access"), rateLimitServiceAccount);
  routes.use("*", async (context, next) => {
    await next();
    await writeMachineAudit(context as never, "integrations.erp.v1.request", "erp_api", undefined, {
      method: context.req.method,
      path: context.req.path,
      status: context.res.status
    });
  });

  routes.get("/v1/openapi", async (context) => {
    return context.json(buildErpOpenApiDocument());
  });

  routes.get("/v1/products", async (context) => {
    const limitRaw = Number(context.req.query("limit") ?? 100);
    const limit = Number.isInteger(limitRaw) && limitRaw >= 1 && limitRaw <= ERP_PAGE_LIMIT_MAX ? limitRaw : 100;
    const updatedSince = context.req.query("updatedSince");
    const cursor = context.req.query("cursor");
    const updatedSinceDate = updatedSince ? new Date(updatedSince) : null;
    const parsedCursor = parseCompositeCursor(cursor);
    if (updatedSinceDate && Number.isNaN(updatedSinceDate.getTime())) return badRequest(context, "updatedSince is invalid");
    if (cursor && !parsedCursor) return badRequest(context, "cursor is invalid");
    const where: Prisma.PlatformSkuWhereInput = {
      AND: [
        ...(parsedCursor ? [{ OR: [{ updatedAt: { lt: parsedCursor.updatedAt } }, { updatedAt: parsedCursor.updatedAt, id: { lt: parsedCursor.id } }] }] : []),
        ...(updatedSinceDate ? [{ updatedAt: { gte: updatedSinceDate } }] : [])
      ]
    };
    // Deterministic multi-location read (contract §3): the ERP location id
    // resolves through DealerErpLink; snapshots are only ever read for that
    // one resolved dealer location. Absent/unmapped location ->
    // INVENTORY_NO_DEALER per item, never an arbitrary first snapshot.
    const locationCode = context.req.query("locationCode")?.trim() || undefined;
    const erpSystem = context.req.query("erpSystem")?.trim() || undefined;
    const targetLocationId = locationCode ? await resolveDealerLocationId(prisma, erpSystem ?? null, locationCode) : null;
    const rows = await prisma.platformSku.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        product: { include: { category: true } },
        prices: { where: { status: "active" }, take: 1 },
        inventorySnapshots: { where: { dealerLocationId: targetLocationId ?? NO_DEALER_LOCATION }, take: 1, include: { dealerLocation: true } }
      }
    });
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    const last = rows.at(-1);
    const nextCursor = hasMore && last ? `${last.updatedAt.toISOString()}:${last.id}` : null;
    const items = await Promise.all(rows.map((row) => toProductRead(row, targetLocationId)));
    return context.json({ data: { items, nextCursor } });
  });

  routes.get("/v1/products/:erpSkuKey", async (context) => {
    const erpSkuKey = context.req.param("erpSkuKey");
    const locationCode = context.req.query("locationCode")?.trim() || undefined;
    const erpSystem = context.req.query("erpSystem")?.trim() || undefined;
    const targetLocationId = locationCode ? await resolveDealerLocationId(prisma, erpSystem ?? null, locationCode) : null;
    const sku = await prisma.platformSku.findUnique({
      where: { skuCode: erpSkuKey },
      include: {
        product: { include: { category: true } },
        prices: { where: { status: "active" }, take: 1 },
        inventorySnapshots: { where: { dealerLocationId: targetLocationId ?? NO_DEALER_LOCATION }, take: 1, include: { dealerLocation: true } }
      }
    });
    if (!sku) return context.json({ error: "sku not found", code: "ERP_SKU_NOT_FOUND" }, 404);
    return context.json({ data: await toProductRead(sku, targetLocationId) });
  });

  routes.get("/v1/orders", async (context) => {
    const principal = context.get("serviceAccount" as never) as ServiceAccountPrincipal;
    const canReadPii = hasMachinePermission(principal, "erp.orders.pii") && !machineScopeDenial(principal, "erp.orders.pii", context.get("machineScopePolicy" as never));
    const limitRaw = Number(context.req.query("limit") ?? 100);
    const limit = Number.isInteger(limitRaw) && limitRaw >= 1 && limitRaw <= ERP_PAGE_LIMIT_MAX ? limitRaw : 100;
    const status = context.req.query("status");
    const updatedSince = context.req.query("updatedSince");
    const cursor = context.req.query("cursor");
    const updatedSinceDate = updatedSince ? new Date(updatedSince) : null;
    const parsedCursor = parseCompositeCursor(cursor);
    if (status && !ERP_ORDER_STATUSES.includes(status)) return badRequest(context, "status is invalid");
    if (updatedSinceDate && Number.isNaN(updatedSinceDate.getTime())) return badRequest(context, "updatedSince is invalid");
    if (cursor && !parsedCursor) return badRequest(context, "cursor is invalid");
    const where: Prisma.OrderWhereInput = {
      AND: [
        ...(status ? [{ status: status as OrderStatus }] : []),
        ...(parsedCursor ? [{ OR: [{ updatedAt: { lt: parsedCursor.updatedAt } }, { updatedAt: parsedCursor.updatedAt, id: { lt: parsedCursor.id } }] }] : []),
        ...(updatedSinceDate ? [{ updatedAt: { gte: updatedSinceDate } }] : [])
      ]
    };
    const rows = await prisma.order.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: canReadPii ? ORDER_PII_SELECT : ORDER_SAFE_SELECT
    });
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    const nextCursor = hasMore && rows.length > 0 ? `${rows[rows.length - 1]!.updatedAt.toISOString()}:${rows[rows.length - 1]!.id}` : null;
    const dealerIds = await dealerIdsByLocation(rows.map((row) => row.dealerLocationId));
    const items = canReadPii
      ? rows.map((row) => toOrderReadWithPii(row as PiiOrderRow, dealerIds))
      : rows.map((row) => toOrderRead(row, dealerIds));
    return context.json({ data: { items, nextCursor } });
  });

  routes.get("/v1/orders/:id", async (context) => {
    const principal = context.get("serviceAccount" as never) as ServiceAccountPrincipal;
    const canReadPii = hasMachinePermission(principal, "erp.orders.pii") && !machineScopeDenial(principal, "erp.orders.pii", context.get("machineScopePolicy" as never));
    const row = await prisma.order.findUnique({ where: { id: context.req.param("id") }, select: canReadPii ? ORDER_PII_SELECT : ORDER_SAFE_SELECT });
    if (!row) return context.json({ error: "order not found", code: "ERP_ORDER_NOT_FOUND" }, 404);
    const dealerIds = await dealerIdsByLocation([row.dealerLocationId]);
    return context.json({ data: canReadPii ? toOrderReadWithPii(row as PiiOrderRow, dealerIds) : toOrderRead(row, dealerIds) });
  });

  routes.post("/v1/products/batch", async (context) => {
    const body = await context.req.json().catch(() => null);
    if (!body || !Array.isArray(body.items)) return badRequest(context, "items array is required");
    if (body.items.length === 0) return badRequest(context, "items array must not be empty");
    // V11-R1 ERP readiness §7: over-limit batches fail with 413, not 400.
    if (body.items.length > ERP_BATCH_LIMIT) return context.json({ error: `batch limit is ${ERP_BATCH_LIMIT} items`, code: "ERP_BATCH_LIMIT" }, 413);
    const raw = JSON.stringify(body);
    if (Buffer.byteLength(raw, "utf8") > ERP_BATCH_BYTES) return context.json({ error: "batch payload exceeds 1 MiB", code: "ERP_BATCH_LIMIT" }, 413);
    const dryRun = body.dryRun === true;
    // Contract §7: requestHash is REQUIRED in the body; the Idempotency-Key
    // header is honored as the canonical idempotency key when present and
    // must match the body value. Replays return 200 with the original
    // results; a different payload under the same key is a 409.
    if (typeof body.requestHash !== "string" || !validRequestHash(body.requestHash)) {
      return badRequest(context, body.requestHash === undefined ? "requestHash is required" : "requestHash is invalid");
    }
    const idempotencyKeyHeader = context.req.header("Idempotency-Key");
    if (idempotencyKeyHeader !== undefined && !validRequestHash(idempotencyKeyHeader)) return badRequest(context, "Idempotency-Key header is invalid");
    if (idempotencyKeyHeader !== undefined && idempotencyKeyHeader !== body.requestHash) return badRequest(context, "Idempotency-Key header does not match requestHash");
    const requestHash = idempotencyKeyHeader ?? body.requestHash;
    const items = (body.items as Array<Record<string, unknown>>).map((item) => {
      const erpSkuKey = typeof item.erpSkuKey === "string" ? item.erpSkuKey.trim() : "";
      return {
        ...item,
        skuCode: erpSkuKey || item.skuCode,
        source: "erp", // this surface is the ERP writer: every price write is marked ERP-owned
        ...(erpSkuKey ? {} : { __validationError: "products require erpSkuKey" })
      };
    });
    const principal = context.get("serviceAccount" as never) as { id: string; roles: string[]; permissions: string[] };
    const created = await createIngestJob({
      kind: "products",
      items,
      dryRun,
      requestHash,
      scope: { kind: "global" },
      authorization: {
        actorType: "service_account",
        actorId: principal.id,
        effectiveRoles: principal.roles,
        permissionGrants: principal.permissions.map((permissionKey: string) => ({ permissionKey, scope: { kind: "global" as const } })),
        scope: { kind: "global" as const },
        contextRevision: "machine"
      },
      requestId: context.req.header("x-correlation-id") ?? `erp-${crypto.randomUUID()}`
    }).catch((error: Error) => {
      if (error.message === "JOB_TYPE_UNAVAILABLE") return null;
      throw error;
    });
    if (!created) return context.json({ error: "ERP ingest is not available.", code: "ERP_UNAVAILABLE" }, 503);
    if (created.kind === "conflict") {
      return context.json({ error: "Idempotency-Key conflict: same key with a different payload.", code: "ERP_IDEMPOTENCY_CONFLICT" }, 409);
    }
    if (created.kind === "dry_run") {
      // Dry-run performs zero AsyncJob/ledger writes; the per-item validation
      // outcome IS the preview.
      return context.json({ data: { jobId: null, status: "dry_run", results: created.results, summary: created.summary } });
    }
    return context.json({
      data: {
        jobId: created.jobId,
        status: created.kind === "replayed" ? "replayed" : "queued",
        ...(created.kind === "replayed" ? { results: created.results, summary: created.summary } : {})
      }
    });
  });

  routes.post("/v1/products/unlist", async (context) => {
    const body = await context.req.json().catch(() => null);
    if (!body || !Array.isArray(body.items)) return badRequest(context, "items array is required");
    if (body.items.length === 0) return badRequest(context, "items array must not be empty");
    // V11-R1 ERP readiness §7: over-limit batches fail with 413, not 400.
    if (body.items.length > ERP_BATCH_LIMIT) return context.json({ error: `batch limit is ${ERP_BATCH_LIMIT} items`, code: "ERP_BATCH_LIMIT" }, 413);
    const raw = JSON.stringify(body);
    if (Buffer.byteLength(raw, "utf8") > ERP_BATCH_BYTES) return context.json({ error: "batch payload exceeds 1 MiB", code: "ERP_BATCH_LIMIT" }, 413);
    const dryRun = body.dryRun === true;
    // Contract §7: requestHash is REQUIRED in the body; the Idempotency-Key
    // header is honored as the canonical idempotency key when present and
    // must match the body value.
    if (typeof body.requestHash !== "string" || !validRequestHash(body.requestHash)) {
      return badRequest(context, body.requestHash === undefined ? "requestHash is required" : "requestHash is invalid");
    }
    const idempotencyKeyHeader = context.req.header("Idempotency-Key");
    if (idempotencyKeyHeader !== undefined && !validRequestHash(idempotencyKeyHeader)) return badRequest(context, "Idempotency-Key header is invalid");
    if (idempotencyKeyHeader !== undefined && idempotencyKeyHeader !== body.requestHash) return badRequest(context, "Idempotency-Key header does not match requestHash");
    const requestHash = idempotencyKeyHeader ?? body.requestHash;
    // Soft-archive through the same canonical ingest (no physical deletes).
    // The apply path resolves the product from erpSkuKey and archives it; the
    // VanStro-owned slug/status fields never appear on the push surface.
    const items: Array<Record<string, unknown>> = [];
    for (const item of body.items as Array<Record<string, unknown>>) {
      const erpSkuKey = typeof item.erpSkuKey === "string" ? item.erpSkuKey.trim() : "";
      if (!erpSkuKey) {
        items.push({ erpSkuKey, skuCode: erpSkuKey, __unlist: true, __validationError: "unlist requires erpSkuKey" });
        continue;
      }
      items.push({ erpSkuKey, skuCode: erpSkuKey, __unlist: true });
    }
    const principal = context.get("serviceAccount" as never) as { id: string; roles: string[]; permissions: string[] };
    const created = await createIngestJob({
      kind: "products",
      items,
      dryRun,
      requestHash,
      scope: { kind: "global" },
      authorization: {
        actorType: "service_account",
        actorId: principal.id,
        effectiveRoles: principal.roles,
        permissionGrants: principal.permissions.map((permissionKey: string) => ({ permissionKey, scope: { kind: "global" as const } })),
        scope: { kind: "global" as const },
        contextRevision: "machine"
      },
      requestId: context.req.header("x-correlation-id") ?? `erp-${crypto.randomUUID()}`
    }).catch((error: Error) => {
      if (error.message === "JOB_TYPE_UNAVAILABLE") return null;
      throw error;
    });
    if (!created) return context.json({ error: "ERP ingest is not available.", code: "ERP_UNAVAILABLE" }, 503);
    if (created.kind === "conflict") {
      return context.json({ error: "Idempotency-Key conflict: same key with a different payload.", code: "ERP_IDEMPOTENCY_CONFLICT" }, 409);
    }
    if (created.kind === "dry_run") {
      // Dry-run performs zero AsyncJob/ledger writes; the per-item validation
      // outcome IS the preview.
      return context.json({ data: { jobId: null, status: "dry_run", results: created.results, summary: created.summary } });
    }
    return context.json({
      data: {
        jobId: created.jobId,
        status: created.kind === "replayed" ? "replayed" : "queued",
        ...(created.kind === "replayed" ? { results: created.results, summary: created.summary } : {})
      }
    });
  });

  routes.get("/v1/sync-jobs", async (context) => {
    const status = context.req.query("status");
    const limitRaw = Number(context.req.query("limit") ?? 100);
    const limit = Number.isInteger(limitRaw) && limitRaw >= 1 && limitRaw <= ERP_PAGE_LIMIT_MAX ? limitRaw : 100;
    const cursor = context.req.query("cursor");
    const parsedCursor = parseCompositeCursor(cursor);
    if (cursor && !parsedCursor) return badRequest(context, "cursor is invalid");
    const where: Prisma.AsyncJobWhereInput = {
      jobType: "dashboard.batch.ingest",
      ...(status ? { status: status as never } : {}),
      ...(parsedCursor ? { OR: [{ updatedAt: { lt: parsedCursor.updatedAt } }, { updatedAt: parsedCursor.updatedAt, id: { lt: parsedCursor.id } }] } : {})
    };
    const rows = await prisma.asyncJob.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    const nextCursor = hasMore && rows.length > 0 ? `${rows[rows.length - 1]!.updatedAt.toISOString()}:${rows[rows.length - 1]!.id}` : null;
    return context.json({
      data: {
        items: rows.map((row) => ({
          id: row.id,
          jobType: row.jobType,
          status: row.status,
          idempotencyKeyHash: row.idempotencyKeyHash,
          resultSummary: row.resultSummary as Record<string, unknown> | null,
          errorCode: row.attempts[0]?.errorCode ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        })),
        nextCursor
      }
    });
  });

  routes.get("/v1/sync-jobs/:id", async (context) => {
    const row = await prisma.asyncJob.findUnique({ where: { id: context.req.param("id") }, include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!row) return context.json({ error: "job not found", code: "ERP_JOB_NOT_FOUND" }, 404);
    const { results, summary } = await readIngestResults(row.id);
    return context.json({
      data: {
        id: row.id,
        jobType: row.jobType,
        status: row.status,
        idempotencyKeyHash: row.idempotencyKeyHash,
        resultSummary: row.resultSummary as Record<string, unknown> | null,
        errorCode: row.attempts[0]?.errorCode ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        results,
        summary
      }
    });
  });

  routes.post("/v1/sync-jobs/:id/retry", async (context) => {
    const principal = context.get("serviceAccount" as never) as { id: string; roles: string[]; permissions: string[] };
    if (!principal.permissions.includes("erp.sync.retry")) {
      return context.json({ error: "erp.sync.retry is required.", code: "ERP_FORBIDDEN" }, 403);
    }
    const row = await prisma.asyncJob.findUnique({ where: { id: context.req.param("id") } });
    if (!row || row.jobType !== "dashboard.batch.ingest") return context.json({ error: "job not found", code: "ERP_JOB_NOT_FOUND" }, 404);
    if (row.status !== "failed") return context.json({ error: "only failed jobs can be retried", code: "ERP_JOB_STATE_CONFLICT" }, 409);
    const expectedVersion = Number(context.req.query("expectedVersion") ?? row.version);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== row.version) {
      return context.json({ error: "version conflict", code: "ERP_JOB_VERSION_CONFLICT" }, 409);
    }
    const outcome = await retryIngestJob(row.id, expectedVersion);
    if (!outcome.ok) return context.json({ error: outcome.error, code: "ERP_JOB_STATE_CONFLICT" }, 409);
    return context.json({ data: { id: row.id, jobType: row.jobType, status: "queued" } });
  });

  routes.post("/v1/connection-test", async (context) => {
    // Controlled connectivity test against the VanStro ERP API itself
    // (SA-authenticated). The DTO only exposes configured/masked/last-tested;
    // real ERP endpoint testing is a P8 activity.
    const principal = context.get("serviceAccount" as never) as { id: string; key: string };
    const baseUrl = `${context.req.url.split("/api/v1/integrations")[0]}/api/v1/integrations/erp/v1`;
    let reachable = false;
    let status = 0;
    try {
      const response = await fetch(`${baseUrl}/products?limit=1`, { headers: { authorization: context.req.header("authorization") ?? "" }, signal: AbortSignal.timeout(5_000) });
      status = response.status;
      reachable = response.ok;
    } catch {
      reachable = false;
    }
    return context.json({
      data: {
        configured: true,
        maskedUrl: `${baseUrl.slice(0, 16)}…${baseUrl.slice(-12)}`,
        lastTestedAt: new Date().toISOString(),
        status,
        reachable,
        serviceAccountKey: principal.key
      }
    });
  });

  routes.post("/v1/webhooks", async (context) => {
    const body = await context.req.json().catch(() => null);
    if (!body) return badRequest(context, "JSON body is required.");
    const url = typeof body.url === "string" && /^https?:\/\//.test(body.url) ? body.url : null;
    const events = Array.isArray(body.events) && body.events.every((entry: unknown) => typeof entry === "string") ? body.events : null;
    const secret = typeof body.secret === "string" && body.secret.length >= 16 ? body.secret : null;
    if (!url || !events || !secret) return badRequest(context, "url, events and a secret of at least 16 chars are required");
    const created = await createErpWebhook({ url, events, secret, active: body.active !== false });
    // the one-time plaintext secret is returned exactly once here
    return context.json({ data: { id: created.id, url: created.url, events: created.events, active: created.active, secret: created.secret } });
  });

  routes.get("/v1/webhooks", async (context) => {
    const webhooks = await listErpWebhooks();
    return context.json({ data: { items: webhooks } });
  });

  routes.delete("/v1/webhooks/:id", async (context) => {
    const deleted = await deleteErpWebhook(context.req.param("id"));
    if (!deleted) return context.json({ error: "webhook not found", code: "ERP_WEBHOOK_NOT_FOUND" }, 404);
    return context.json({ data: { deleted: true } });
  });

  return routes;
}
