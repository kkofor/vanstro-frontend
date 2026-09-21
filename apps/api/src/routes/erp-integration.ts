import { prisma, Prisma } from "@vanstro/db";
import { createErpApiV1Routes } from "../erp-api/routes.js";
import { type Context, Hono } from "hono";
import {
  requireMachineAccess,
  requireMachinePermission,
  type MachineEnv,
  writeMachineAudit
} from "../auth/service-account-access.js";
import { rateLimitServiceAccount } from "../middleware/rate-limit-sa.js";
import { ErpProductApiError, ErpProductClient } from "../integrations/erp-product/client.js";
import { mapErpColorsToFinishOptions, parseErpDealerId } from "../integrations/erp-product/mappers.js";
import { syncProductsFromUpstream } from "../integrations/erp-catalog-sync/service.js";
import { finalizeConfirmedPayment, markPaymentForReconciliation } from "../payments/finalize.js";
import { resolvePaymentProvider } from "../payments/index.js";
import { publicError } from "../public-errors.js";

function parsePositiveInt(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function resolveErpDealerId(dealerLocationId?: string) {
  if (!dealerLocationId) return undefined;
  const location = await prisma.dealerLocation.findUnique({
    where: { id: dealerLocationId },
    include: {
      erpLinks: true,
      dealer: { include: { erpLinks: true } }
    }
  });
  const link = location?.erpLinks[0] ?? location?.dealer.erpLinks[0];
  return parseErpDealerId(link?.erpLocationId);
}

async function resolveProductErpMapping(productIdentifier: string) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: productIdentifier }, { slug: productIdentifier }], status: "active" },
    include: {
      skus: {
        where: { status: "active" },
        orderBy: { sortOrder: "asc" },
        include: { erpMappings: true }
      }
    }
  });
  if (!product) return undefined;
  const sku = product.skus[0];
  const mapping = sku?.erpMappings[0];
  if (!sku || !mapping) return undefined;
  return { product, sku, mapping };
}

function erpUnavailable(context: Context, error: unknown) {
  const message = error instanceof ErpProductApiError ? error.message : "ERP product service is unavailable.";
  return publicError(context, 502, "ERP_UNAVAILABLE", message);
}

/** Machine-facing catalog export + upstream ERP product proxy + public color enrichment. */
export function createErpIntegrationRoutes() {
  const routes = new Hono();
  const machineRoutes = new Hono<MachineEnv>();

  // Every machine route carries an explicit requireMachineAccess ->
  // rateLimitServiceAccount stack (auth strictly before rate limiting) so the
  // ordering is statically visible per route and no app-wide `use("*")`
  // hoisting is relied on. rateLimitServiceAccount applies the account-level
  // safety ceiling always and per-token buckets when mode=per-token.

  machineRoutes.get("/integrations/erp/catalog/skus", requireMachineAccess("cli.access"), rateLimitServiceAccount, async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;

    const limit = Math.min(parsePositiveInt(context.req.query("limit")) ?? 100, 500);
    const offset = parsePositiveInt(context.req.query("offset")) ?? 0;
    const updatedSince = context.req.query("updatedSince");
    const updatedSinceDate = updatedSince ? new Date(updatedSince) : undefined;
    if (updatedSince && Number.isNaN(updatedSinceDate?.getTime())) {
      return publicError(context, 400, "COMMERCE_INVALID", "updatedSince must be a valid ISO date.");
    }

    const where = {
      status: "active" as const,
      product: { status: "active" as const },
      ...(updatedSinceDate ? { updatedAt: { gte: updatedSinceDate } } : {})
    };

    const [skus, total] = await Promise.all([
      prisma.platformSku.findMany({
        where,
        include: {
          product: { include: { category: true } },
          prices: {
            where: {
              status: "active",
              AND: [
                { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: new Date() } }] },
                { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] }
              ]
            },
            orderBy: { effectiveFrom: { sort: "desc", nulls: "last" } },
            take: 1
          },
          assets: { orderBy: { sortOrder: "asc" }, take: 1 },
          erpMappings: true
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit
      }),
      prisma.platformSku.count({ where })
    ]);

    await writeMachineAudit(context, "integrations.erp.catalog.skus.list", "platform_sku");

    return context.json({
      data: skus.map((sku) => {
        const price = sku.prices[0];
        const mapping = sku.erpMappings[0];
        return {
          productId: sku.product.id,
          productSlug: sku.product.slug,
          productName: sku.product.name,
          platformSkuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          category: sku.product.category?.name ?? null,
          status: sku.status,
          price: price ? { amountCents: price.amountCents, currency: price.currency } : null,
          imageUrl: sku.assets[0]?.url ?? null,
          erpSystem: mapping?.erpSystem ?? null,
          erpSkuKey: mapping?.erpSkuKey ?? null,
          erpProductId: mapping?.erpProductId ?? null,
          erpSkuId: mapping?.erpSkuId ?? null,
          updatedAt: sku.updatedAt.toISOString()
        };
      }),
      meta: { limit, offset, total }
    });
  });

  machineRoutes.post("/integrations/payments/recover", requireMachineAccess("cli.access"), rateLimitServiceAccount, async (context) => {
    const denied = requireMachinePermission(context, "payments.recover");
    if (denied) return denied;
    const candidates = await prisma.paymentEvent.findMany({
      where: {
        type: "provider_confirmed",
        paymentSession: { order: null, status: { in: ["pending", "expired", "reconciliation_required"] } },
        NOT: { payload: { path: ["automaticRecoveryTerminal"], equals: true } }
      },
      orderBy: { createdAt: "asc" },
      take: 20,
      include: { paymentSession: true }
    });
    let recovered = 0;
    let reconciled = 0;
    for (const event of candidates) {
      if (!event.providerEventId) continue;
      try {
        const result = await finalizeConfirmedPayment(event.paymentSessionId, event.providerEventId);
        if (result.status === "completed") recovered += 1;
        else if (result.status === "not_payable") {
          await markPaymentForReconciliation({
            paymentSession: event.paymentSession,
            providerPaymentId: event.providerEventId,
            payload: { reason: "payment_recovery_not_payable", automaticRecoveryTerminal: true }
          });
          reconciled += 1;
        }
      } catch (error) {
        await markPaymentForReconciliation({
          paymentSession: event.paymentSession,
          providerPaymentId: event.providerEventId,
          payload: { reason: "payment_recovery_failed", automaticRecoveryTerminal: true }
        });
        reconciled += 1;
      }
    }
    await writeMachineAudit(context, "integrations.payments.recover", "payment_session", undefined, { recovered, reconciled });
    return context.json({ data: { scanned: candidates.length, recovered, reconciled } });
  });

  // Legacy-isolated pull (v11-r1-erp-readiness §7): this endpoint drives the
  // historical syncProductsFromUpstream adapter, NOT the canonical batch
  // ingest. It keeps per-item source identity on ProductSkuErpMapping rows,
  // constraint-backed per-item idempotency, and CatalogSyncRun as the run
  // ledger watermark (payload fingerprint + sourceSystem ride in the result
  // and the machine audit payload). Migrating pull onto createIngestJob
  // requires extending canonical item kinds (SKU attributes/dimensions/
  // mapping ids) and an async job status flow — deferred; `legacyPull: true`
  // marks the endpoint until that migration lands.
  machineRoutes.post("/integrations/erp/catalog/sync", requireMachineAccess("cli.access"), rateLimitServiceAccount, async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.sync");
    if (denied) return denied;
    const body = (await context.req.json().catch(() => null)) as { syncCategories?: unknown; erpSystem?: unknown } | null;
    const erpSystem = typeof body?.erpSystem === "string" && body.erpSystem.trim() ? body.erpSystem.trim() : undefined;
    const existingRun = await prisma.catalogSyncRun.findFirst({ where: { status: "running" } });
    if (existingRun) return context.json({ error: "A catalog sync is already running.", code: "COMMERCE_INVALID", runId: existingRun.id }, 409);
    let run;
    try {
      run = await prisma.catalogSyncRun.create({ data: { status: "running", source: "scheduled" } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return publicError(context, 409, "COMMERCE_INVALID", "A catalog sync is already running.");
      }
      throw error;
    }
    try {
      const result = await syncProductsFromUpstream(new ErpProductClient(), {
        syncCategories: body?.syncCategories !== false,
        ...(erpSystem ? { erpSystem } : {})
      });
      await prisma.catalogSyncRun.update({
        where: { id: run.id },
        data: {
          status: result.errors.length ? "failed" : "succeeded",
          productsUpserted: result.imported + result.updated,
          error: result.errors.length ? result.errors.slice(0, 50).join("\n") : null,
          finishedAt: new Date()
        }
      });
      await writeMachineAudit(context, "integrations.erp.catalog.sync", "catalog_sync", run.id, result as never);
      return context.json(
        { data: { ...result, syncRunId: run.id, legacyPull: true } },
        result.errors.length ? 207 : 200
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "ERP catalog sync failed.";
      await prisma.catalogSyncRun.update({ where: { id: run.id }, data: { status: "failed", error: message, finishedAt: new Date() } });
      return erpUnavailable(context, error);
    }
  });

  machineRoutes.get("/integrations/erp/upstream/products", requireMachineAccess("cli.access"), rateLimitServiceAccount, async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.productList({
        limit: parsePositiveInt(context.req.query("limit")),
        page: parsePositiveInt(context.req.query("page"))
      });
      await writeMachineAudit(context, "integrations.erp.upstream.products.list", "erp_product");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  machineRoutes.get("/integrations/erp/upstream/skus", requireMachineAccess("cli.access"), rateLimitServiceAccount, async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.skuList({ productId: parsePositiveInt(context.req.query("product_id")) });
      await writeMachineAudit(context, "integrations.erp.upstream.skus.list", "erp_sku");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  machineRoutes.get("/integrations/erp/upstream/colors", requireMachineAccess("cli.access"), rateLimitServiceAccount, async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.colorList({
        productId: parsePositiveInt(context.req.query("product_id")),
        productSkuId: parsePositiveInt(context.req.query("product_sku_id")),
        dealerId: parsePositiveInt(context.req.query("dealer_id"))
      });
      await writeMachineAudit(context, "integrations.erp.upstream.colors.list", "erp_color");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  machineRoutes.get("/integrations/erp/upstream/categories", requireMachineAccess("cli.access"), rateLimitServiceAccount, async (context) => {
    const denied = requireMachinePermission(context, "erp.catalog.read");
    if (denied) return denied;
    try {
      const client = new ErpProductClient();
      const data = await client.categoryList({ tree: context.req.query("tree") === "1" });
      await writeMachineAudit(context, "integrations.erp.upstream.categories.list", "erp_category");
      return context.json({ data });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  routes.get("/products/:identifier/erp-colors", async (context) => {
    const resolved = await resolveProductErpMapping(context.req.param("identifier"));
    if (!resolved) {
      return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product ERP mapping not found.");
    }
    const { mapping } = resolved;
    if (!mapping.erpProductId) {
      return publicError(context, 409, "ERP_MAPPING_INCOMPLETE", "ERP product id is not configured for this SKU.");
    }

    const locale = context.req.query("locale") === "fr-CA" ? "fr-CA" : "en-CA";
    const dealerLocationId = context.req.query("dealerLocationId")?.trim();
    const dealerId = await resolveErpDealerId(dealerLocationId);

    try {
      const client = new ErpProductClient();
      const data = await client.colorList({
        productId: mapping.erpProductId,
        productSkuId: mapping.erpSkuId ?? undefined,
        dealerId
      });
      return context.json({
        data: mapErpColorsToFinishOptions(data.list, locale),
        meta: {
          locale,
          erpProductId: mapping.erpProductId,
          erpSkuId: mapping.erpSkuId,
          dealerId: dealerId ?? null,
          hasColor: data.list.length > 0
        }
      });
    } catch (error) {
      return erpUnavailable(context, error);
    }
  });

  // V11-R1 P5: ERP Integration API v1 — generated OpenAPI + machine routes.
  const erpV1 = createErpApiV1Routes();
  machineRoutes.route("/integrations/erp", erpV1);
  routes.route("/", machineRoutes);
  return routes;
}
