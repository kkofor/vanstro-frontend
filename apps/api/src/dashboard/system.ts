import { encryptSecret, prisma, Prisma } from "@vanstro/db";
import { createHmac, createHash, randomBytes, randomUUID } from "node:crypto";
import { Hono } from "hono";
import {
  createServiceAccountToken,
  lockServiceAccountLifecycle
} from "../auth/service-account.js";
import { loadApiConfig } from "../config.js";
import { resolvePaymentProvider } from "../payments/index.js";
import { getOperationalAlerts } from "../operations/alerts.js";
import { restockCancelledOrderItems } from "../integrations/erp-sync/inventory.js";
import { type DashboardEnv, writeAudit } from "./access.js";
import {
  assertAssignableRoles,
  assertManageableServiceAccounts,
  PermissionCeilingError
} from "./permission-ceiling.js";
import { permissionGrant, resolveDashboardAuthorization } from "./authorization.js";
import { handleStrictAuditDetail, handleStrictAuditList } from "../audit/query.js";
import { badRequest, optionalString, optionalStringArray, optionalBoolean, optionalNumber, pageMeta, parsePagination, readBody } from "./request.js";
import { publicError } from "../public-errors.js";
import { activeTokenCeilingReached, loadPublishedApiServiceAccountPolicy, resolveReplacementExpiry, rotateOverlapUntil } from "./s08-settings-policy.js";

const EMAIL_PROVIDER_KEY = "default_smtp";

const SAFE_INVOCATION_ERROR_CLASSES = new Set(["TIMEOUT", "PAYLOAD_TOO_LARGE", "UPSTREAM_UNAVAILABLE"]);
function safeErrorClass(error: string) {
  const normalized = error.trim().toUpperCase();
  return SAFE_INVOCATION_ERROR_CLASSES.has(normalized) ? normalized : "UNCLASSIFIED";
}

function maskSmtpSettings(settings: Record<string, unknown> | null | undefined) {
  if (!settings) return {};
  const next = { ...settings };
  if ("encryptedPassword" in next || (typeof next.password === "string" && next.password.length > 0)) {
    delete next.encryptedPassword;
    next.password = "********";
  }
  return next;
}

type DashboardOverviewObserver = (counts: { products: number; categories: number; dealers: number; dealerCountExecuted: boolean }) => void;

function reconciliationSelect(canReadPii: boolean, canReadReference: boolean) {
  return {
    id: true, status: true, paymentMethod: true, fulfillment: true,
    ...(canReadPii ? { guestEmail: true, guestFirstName: true, guestLastName: true } : {}),
    subtotalCents: true, discountCents: true, taxCents: true, shippingCents: true, totalCents: true, currency: true,
    ...(canReadReference ? { providerPaymentId: true } : {}),
    paidAt: true, createdAt: true, updatedAt: true,
    paymentEvents: { select: { id: true, type: true, amountCents: true, currency: true, createdAt: true }, orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }] },
    order: { select: { id: true, status: true, totalCents: true, currency: true, createdAt: true } }
  } satisfies Prisma.PaymentSessionSelect;
}
function reconciliationError(context: Parameters<typeof publicError>[0], status: 400 | 404 | 409 | 503, code: "DASHBOARD_INVALID" | "DASHBOARD_NOT_FOUND" | "DASHBOARD_CONFLICT" | "QUERY_UNAVAILABLE", message: string, retryable?: boolean) {
  const response = publicError(context, status, code, message);
  if (retryable !== undefined) {
    // Rebuild only from fixed safe literals; never include provider/internal reasons.
    const requestId = context.res.headers.get("X-Request-Id") ?? "unavailable";
    return context.json({ error: message, code, requestId, details: { retryable } }, status);
  }
  return response;
}
function reconciliationDto(session: any, canReadReference: boolean) {
  return {
    id: session.id, status: session.status, paymentMethod: session.paymentMethod, fulfillment: session.fulfillment,
    subtotalCents: session.subtotalCents, discountCents: session.discountCents, taxCents: session.taxCents, shippingCents: session.shippingCents, totalCents: session.totalCents, currency: session.currency,
    paidAt: session.paidAt?.toISOString() ?? null, createdAt: session.createdAt.toISOString(), updatedAt: session.updatedAt.toISOString(),
    order: session.order ? { ...session.order, createdAt: session.order.createdAt.toISOString() } : null,
    paymentEvents: session.paymentEvents.map((event: any) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    ...(typeof session.guestEmail === "string" && session.guestEmail.length > 0 ? { guestEmail: session.guestEmail } : {}),
    ...(typeof session.guestFirstName === "string" && session.guestFirstName.length > 0 ? { guestFirstName: session.guestFirstName } : {}),
    ...(typeof session.guestLastName === "string" && session.guestLastName.length > 0 ? { guestLastName: session.guestLastName } : {}),
    ...(canReadReference && session.providerPaymentId ? { providerReference: `…${session.providerPaymentId.slice(-6)}` } : {})
  };
}

export function createDashboardSystemRoutes(
  observeOverviewCounts?: DashboardOverviewObserver
) {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/overview", async (context) => {
    const authorization = context.get("p02Authorization");
    const can = (permission: string) => permissionGrant(authorization, permission)?.global === true;
    const canCountDealers = can("dashboard.access") && can("dealers.read");
    const [
      products,
      categories,
      prices,
      promotions,
      users,
      dealers,
      applications,
      leads,
      crmContacts,
      reviews,
      orders,
      inventory,
      pendingPayments,
      emailPending,
      erpPending,
      alerts
    ] = await Promise.all([
      can("products.read") ? prisma.product.count() : 0,
      can("products.read") ? prisma.category.count() : 0,
      can("products.read") ? prisma.price.count() : 0,
      can("products.read") ? prisma.promotion.count() : 0,
      can("users.read") ? prisma.user.count() : 0,
      canCountDealers ? prisma.dealer.count() : 0,
      can("dealer_applications.read") ? prisma.dealerApplication.count() : 0,
      can("leads.read") ? prisma.contactLead.count() : 0,
      can("crm.read") ? prisma.crmContact.count() : 0,
      can("reviews.read") ? prisma.productReview.count() : 0,
      can("orders.read") ? prisma.order.count() : 0,
      can("inventory.read") ? prisma.inventorySnapshot.aggregate({
        _sum: { quantityOnHand: true, quantityReserved: true }
      }) : null,
      can("orders.read") ? prisma.paymentSession.count({ where: { status: "pending" } }) : 0,
      can("email.outbox.read") ? prisma.emailOutbox.count({ where: { status: { in: ["pending", "retry_wait", "failed"] } } }) : 0,
      can("erp.sync.read") ? prisma.erpSyncJob.count({ where: { status: { in: ["pending", "retry_wait", "failed"] } } }) : 0,
      can("audit_logs.read") ? getOperationalAlerts() : []
    ]);
    observeOverviewCounts?.({ products, categories, dealers, dealerCountExecuted: canCountDealers });
    return context.json({
      data: {
        counts: { products, categories, prices, promotions, users, dealers, applications, leads, crmContacts, reviews, orders },
        commerce: {
          quantityOnHand: inventory?._sum.quantityOnHand ?? 0,
          quantityReserved: inventory?._sum.quantityReserved ?? 0,
          pendingPayments
        },
        queues: { email: emailPending, erp: erpPending, alerts: alerts.length },
        generatedAt: new Date().toISOString()
      }
    });
  });

  routes.get("/dashboard/email/outbox", async (context) => {
    const pagination = parsePagination(context);
    const [items, total] = await Promise.all([
      prisma.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.emailOutbox.count()
    ]);

    return context.json({
      data: items.map((item) => item.templateKey === "password_reset" || item.templateKey === "password_reset_fr"
        ? { ...item, payload: { redacted: true } }
        : item),
      meta: pageMeta(pagination, total)
    });
  });

  routes.get("/dashboard/mcp/service-accounts", async (context) => {
    const serviceAccounts = await prisma.serviceAccount.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        status: true,
        environment: true,
        createdAt: true,
        roles: { select: { role: { select: { key: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: serviceAccounts.map((account) => ({
      id: account.id,
      key: account.key,
      name: account.name,
      status: account.status,
      roles: account.roles.map((entry) => entry.role.key).sort(),
      environment: account.environment,
      createdAt: account.createdAt.toISOString()
    })) });
  });

  routes.post("/dashboard/mcp/service-accounts", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");

    const key = optionalString(body, "key");
    const name = optionalString(body, "name");
    const roleIdsValue = optionalStringArray(body, "roleIds");
    if (body.roleIds !== undefined && (!Array.isArray(body.roleIds) || roleIdsValue?.length !== body.roleIds.length)) {
      return badRequest(context, "roleIds must be an array of strings.");
    }
    const roleIds = [...new Set(roleIdsValue ?? [])];
    if (!key || !name) return badRequest(context, "key and name are required.");

    const serviceAccount = await prisma
      .$transaction(async (database) => {
        await assertAssignableRoles(database, roleIds, context.get("actorUserId"));

        return database.serviceAccount.create({
          data: { key, name, roles: roleIds.length ? { create: roleIds.map((roleId) => ({ roleId })) } : undefined },
          include: { roles: { include: { role: true } } }
        });
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError) return error;
        throw error;
      });

    if (serviceAccount instanceof PermissionCeilingError) {
      return context.json({ error: serviceAccount.message }, serviceAccount.status);
    }

    await writeAudit(context, "dashboard.mcp.service_accounts.create", "service_account", serviceAccount.id);

    return context.json({ data: serviceAccount }, 201);
  });

  routes.patch("/dashboard/mcp/service-accounts/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");

    const name = optionalString(body, "name");
    const status = optionalString(body, "status");
    const roleIdsValue = optionalStringArray(body, "roleIds");
    if (body.roleIds !== undefined && (!Array.isArray(body.roleIds) || roleIdsValue?.length !== body.roleIds.length)) {
      return badRequest(context, "roleIds must be an array of strings.");
    }
    const roleIds = roleIdsValue ? [...new Set(roleIdsValue)] : undefined;
    if (!name && !status && !roleIds) return badRequest(context, "name, status or roleIds is required.");
    if (status && !["active", "disabled"].includes(status)) return badRequest(context, "status must be active or disabled.");

    const serviceAccount = await prisma
      .$transaction(async (database) => {
        await lockServiceAccountLifecycle(database, context.req.param("id"));
        await assertManageableServiceAccounts(database, context.get("actorUserId"), [context.req.param("id")]);

        const existing = await database.serviceAccount.findUnique({
          where: { id: context.req.param("id") },
          select: { id: true, status: true }
        });
        if (!existing) return null;

        if (roleIds) {
          await assertAssignableRoles(database, roleIds, context.get("actorUserId"));
          await database.serviceAccountRole.deleteMany({ where: { serviceAccountId: existing.id } });
          if (roleIds.length) {
            await database.serviceAccountRole.createMany({
              data: roleIds.map((roleId) => ({ serviceAccountId: existing.id, roleId }))
            });
          }
        }

        const updatedServiceAccount = await database.serviceAccount.update({
          where: { id: existing.id },
          data: { name, status: status as "active" | "disabled" | undefined },
          include: { roles: { include: { role: true } } }
        });

        if (status === "disabled") {
          const revokedAt = new Date();
          await database.serviceAccountToken.updateMany({
            where: {
              serviceAccountId: existing.id,
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: revokedAt } }]
            },
            data: { revokedAt }
          });
        }

        await writeAudit(
          context,
          "dashboard.mcp.service_accounts.update",
          "service_account",
          updatedServiceAccount.id,
          undefined,
          database
        );

        return updatedServiceAccount;
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError) return error;
        throw error;
      });

    if (serviceAccount instanceof PermissionCeilingError) {
      return context.json({ error: serviceAccount.message }, serviceAccount.status);
    }
    if (!serviceAccount) return context.json({ error: "Service account not found." }, 404);

    return context.json({ data: serviceAccount });
  });

  routes.post("/dashboard/mcp/service-accounts/:id/tokens", async (context) => {
    const serviceAccountId = context.req.param("id");
    const body = await readBody(context);
    const idempotencyKey = context.req.header("idempotency-key")
      ?? (body && typeof body === "object" && "idempotencyKey" in body && typeof (body as Record<string, unknown>).idempotencyKey === "string"
        ? (body as Record<string, unknown>).idempotencyKey as string
        : undefined);
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(idempotencyKey)) {
      return badRequest(context, "A valid Idempotency-Key header (or idempotencyKey body field) is required.");
    }

    const name = body ? optionalString(body, "name") : undefined;
    const expiresAtValue = body ? optionalString(body, "expiresAt") : undefined;
    const ttlDaysValue = body && typeof body === "object" && "ttlDays" in body && typeof (body as Record<string, unknown>).ttlDays === "number" ? (body as Record<string, unknown>).ttlDays as number : undefined;
    const requestedExpiresAt = expiresAtValue ? new Date(expiresAtValue) : ttlDaysValue !== undefined ? new Date(Date.now() + ttlDaysValue * 86400000) : undefined;
    if (expiresAtValue && Number.isNaN(requestedExpiresAt?.getTime())) return badRequest(context, "expiresAt must be a valid ISO date.");
    if (ttlDaysValue !== undefined && (!Number.isSafeInteger(ttlDaysValue) || ttlDaysValue < 1 || ttlDaysValue > 365)) return badRequest(context, "ttlDays must be an integer between 1 and 365.");
    if (requestedExpiresAt && requestedExpiresAt <= new Date()) return badRequest(context, "expiresAt must be in the future.");

    // S08 token lifecycle: resolve default TTL / maximum TTL / requireExpiry /
    // maximum active tokens from the published settings.api-service-account
    // policy; compiled defaults apply when none is published. The one-time
    // plaintext reveal still happens only here.
    const policy = await loadPublishedApiServiceAccountPolicy();
    const expiryResolution = resolveReplacementExpiry(new Date(), requestedExpiresAt, policy);
    if ("error" in expiryResolution) return badRequest(context, expiryResolution.error);
    const expiresAt = expiryResolution.expiresAt;

    const idempotencyHash = createHash("sha256").update(`vanstro:sa:create-idempotency:v1\0${idempotencyKey}`, "utf8").digest("hex");
    const requestHash = createHash("sha256").update(JSON.stringify({ serviceAccountId, name: name?.trim() ?? null, expiresAt: expiresAtValue ?? null, ttlDays: ttlDaysValue ?? null }), "utf8").digest("hex");

    const outcome = await prisma.$transaction(async (database) => {
      await lockServiceAccountLifecycle(database, serviceAccountId);
      await assertManageableServiceAccounts(database, context.get("actorUserId"), [serviceAccountId]);

      const replayRows = await database.$queryRaw<Array<{ id: string; name: string | null; expiresAt: Date | null; createdAt: Date; createRequestHash: string | null }>>`
        SELECT "id","name","expiresAt","createdAt","createRequestHash"
        FROM "service_account_tokens"
        WHERE "serviceAccountId" = ${serviceAccountId} AND "createIdempotencyKey" = ${idempotencyHash}
        FOR UPDATE`;
      if (replayRows.length > 0) {
        const replay = replayRows[0];
        if (replay.createRequestHash !== requestHash) return { kind: "idempotency_conflict" } as const;
        return { kind: "replayed", token: replay } as const;
      }

      const serviceAccount = await database.serviceAccount.findUnique({
        where: { id: serviceAccountId },
        select: { id: true, status: true }
      });
      if (!serviceAccount) return { kind: "not_found" } as const;
      if (serviceAccount.status !== "active") return { kind: "account_disabled" } as const;

      const activeTokenCount = await database.serviceAccountToken.count({
        where: { serviceAccountId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      });
      if (activeTokenCeilingReached(activeTokenCount, policy)) return { kind: "ceiling" } as const;

      const token = `vsa_${randomBytes(32).toString("base64url")}`;
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const record = await database.serviceAccountToken.create({
        data: { serviceAccountId, tokenHash, name, expiresAt, createIdempotencyKey: idempotencyHash, createRequestHash: requestHash }
      });
      await writeAudit(context, "dashboard.mcp.service_account_tokens.create", "service_account", record.serviceAccountId, { tokenId: record.id }, database);
      return { kind: "created", token, record } as const;
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return { kind: "ceiling_denied", status: error.status, message: error.message } as const;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { kind: "unique_conflict" } as const;
      throw error;
    });

    switch (outcome.kind) {
      case "ceiling_denied":
        return context.json({ error: outcome.message }, outcome.status);
      case "unique_conflict": {
        const winner = await prisma.serviceAccountToken.findFirst({
          where: { serviceAccountId, createIdempotencyKey: idempotencyHash },
          select: { id: true, name: true, expiresAt: true, createdAt: true, createRequestHash: true }
        });
        if (winner && winner.createRequestHash === requestHash) {
          return context.json({ data: { id: winner.id, name: winner.name, expiresAt: winner.expiresAt, createdAt: winner.createdAt, plaintext: null, plaintextAvailable: false, replayed: true } });
        }
        return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
      }
      case "idempotency_conflict":
        return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
      case "not_found":
        return context.json({ error: "Service account not found." }, 404);
      case "account_disabled":
        return publicError(context, 409, "SERVICE_ACCOUNT_DISABLED", "A disabled service account cannot receive new tokens.");
      case "ceiling":
        return publicError(context, 409, "TOKEN_LIMIT_REACHED", `Maximum active tokens (${policy.tokenLifecyclePolicy.maximumActiveTokensPerAccount}) reached.`);
      case "replayed":
        return context.json({ data: { id: outcome.token.id, name: outcome.token.name, expiresAt: outcome.token.expiresAt, createdAt: outcome.token.createdAt, plaintext: null, plaintextAvailable: false, replayed: true } });
      case "created":
        return context.json({ data: { id: outcome.record.id, name: outcome.record.name, expiresAt: outcome.record.expiresAt, createdAt: outcome.record.createdAt, plaintext: outcome.token, plaintextAvailable: true, replayed: false } }, 201);
    }
  });

  /**
   * S08 token list: safe metadata only. Status is derived from existing data
   * (revokedAt -> revoked; replacedByTokenId -> rotated; expiresAt <= now ->
   * expired; otherwise active). The response is strictly the seven public
   * fields and never contains plaintext, tokenHash, secret or rotate
   * internals. Ordering is createdAt desc with an id tie-break for stable
   * pagination-free reads.
   */
  routes.get("/dashboard/mcp/service-accounts/:id/tokens", async (context) => {
    const serviceAccountId = context.req.param("id");
    const manageable = await prisma.$transaction(async (database) => {
      await assertManageableServiceAccounts(database, context.get("actorUserId"), [serviceAccountId]);
      return true;
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return error;
      throw error;
    });
    if (manageable instanceof PermissionCeilingError) {
      return context.json({ error: manageable.message }, manageable.status);
    }

    const account = await prisma.serviceAccount.findUnique({
      where: { id: serviceAccountId },
      select: { id: true }
    });
    if (!account) return context.json({ error: "Service account not found." }, 404);

    const tokens = await prisma.serviceAccountToken.findMany({
      where: { serviceAccountId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        replacedByTokenId: true,
        createdAt: true
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }]
    });

    const now = Date.now();
    return context.json({
      data: tokens.map((token) => ({
        id: token.id,
        name: token.name,
        status: token.revokedAt
          ? "revoked"
          : token.replacedByTokenId
            ? "rotated"
            : token.expiresAt && token.expiresAt.getTime() <= now
              ? "expired"
              : "active",
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        createdAt: token.createdAt
      }))
    });
  });

  /**
   * S08 rotate overlap: atomically create a replacement token, narrow the
   * predecessor expiresAt to min(existingExpiresAt, now + overlap minutes) and
   * record the predecessor/replacement relation. The authentication path keeps
   * the lazy expiresAt > now check (no scheduled job). Idempotent replay:
   * same Idempotency-Key + same requestHash returns the same replacement
   * metadata with plaintextAvailable=false and never creates a second token;
   * same key with a different requestHash returns a stable 409. Any CAS
   * failure aborts the whole transaction so no replacement orphan remains.
   * Plaintext is returned only on first success; there is no second-read or
   * recovery plaintext endpoint.
   */
  routes.post("/dashboard/mcp/service-accounts/:id/tokens/:tokenId/rotate", async (context) => {
    const serviceAccountId = context.req.param("id");
    const tokenId = context.req.param("tokenId");
    const body = (await readBody(context)) ?? {};
    const idempotencyKey = context.req.header("idempotency-key") ?? (typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined);
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(idempotencyKey)) {
      return badRequest(context, "A valid Idempotency-Key header (or idempotencyKey body field) is required.");
    }
    const expiresAtValue = optionalString(body, "expiresAt");
    const requestedExpiresAt = expiresAtValue ? new Date(expiresAtValue) : undefined;
    if (expiresAtValue && Number.isNaN(requestedExpiresAt?.getTime())) return badRequest(context, "expiresAt must be a valid ISO date.");
    if (requestedExpiresAt && requestedExpiresAt <= new Date()) return badRequest(context, "expiresAt must be in the future.");

    const policy = await loadPublishedApiServiceAccountPolicy();
    const idempotencyHash = createHash("sha256").update(`vanstro:sa:rotate-idempotency:v1\0${idempotencyKey}`, "utf8").digest("hex");
    const requestHash = createHash("sha256").update(JSON.stringify({ tokenId, ...(expiresAtValue ? { expiresAt: expiresAtValue } : {}), ...(body.name !== undefined ? { name: body.name } : {}) }), "utf8").digest("hex");

    const outcome = await prisma.$transaction(async (database) => {
      await lockServiceAccountLifecycle(database, serviceAccountId);
      await assertManageableServiceAccounts(database, context.get("actorUserId"), [serviceAccountId]);

      const account = await database.serviceAccount.findUnique({
        where: { id: serviceAccountId },
        select: { id: true, status: true }
      });
      if (!account || account.status !== "active") return { kind: "account_not_found" } as const;

      const replayRows = await database.$queryRaw<Array<{ id: string; name: string | null; expiresAt: Date | null; createdAt: Date; overlapUntil: Date | null; rotateRequestHash: string | null }>>`
        SELECT "id","name","expiresAt","createdAt","overlapUntil","rotateRequestHash"
        FROM "service_account_tokens"
        WHERE "serviceAccountId" = ${serviceAccountId} AND "rotateIdempotencyKey" = ${idempotencyHash} AND "rotateRequestHash" IS NOT NULL
        FOR UPDATE`;
      if (replayRows.length > 0) {
        const replay = replayRows[0];
        if (replay.rotateRequestHash !== requestHash) return { kind: "idempotency_conflict" } as const;
        return { kind: "replayed", replacement: replay, predecessorTokenId: tokenId } as const;
      }

      const predecessorRows = await database.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "service_account_tokens"
        WHERE "id" = ${tokenId} AND "serviceAccountId" = ${serviceAccountId} AND "revokedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt" > now())
        FOR UPDATE`;
      if (predecessorRows.length === 0) return { kind: "token_not_found" } as const;

      const expiryResolution = resolveReplacementExpiry(new Date(), requestedExpiresAt, policy);
      if ("error" in expiryResolution) return { kind: "expiry_invalid", error: expiryResolution.error } as const;

      const overlapUntil = rotateOverlapUntil(new Date(), policy);
      const token = `vsa_${randomBytes(32).toString("base64url")}`;
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const replacementId = randomUUID();

      const created = await database.$queryRaw<Array<{ id: string; name: string | null; expiresAt: Date | null; createdAt: Date; overlapUntil: Date | null }>>`
        INSERT INTO "service_account_tokens" ("id","serviceAccountId","tokenHash","name","expiresAt","replacedByTokenId","rotateIdempotencyKey","rotateRequestHash","overlapUntil","createdAt")
        VALUES (${replacementId}, ${serviceAccountId}, ${tokenHash}, ${body.name ?? null}, ${expiryResolution.expiresAt}, NULL, ${idempotencyHash}, ${requestHash}, ${overlapUntil}, CURRENT_TIMESTAMP)
        RETURNING "id","name","expiresAt","createdAt","overlapUntil"`;
      const replacement = created[0];

      const narrowed = await database.$executeRaw`
        UPDATE "service_account_tokens"
        SET "replacedByTokenId" = ${replacement.id},
            "expiresAt" = CASE
              WHEN "expiresAt" IS NULL THEN now() + make_interval(mins => (${policy.tokenLifecyclePolicy.rotationOverlapMinutes})::int)
              ELSE LEAST("expiresAt", now() + make_interval(mins => (${policy.tokenLifecyclePolicy.rotationOverlapMinutes})::int))
            END
        WHERE "id" = ${tokenId} AND "serviceAccountId" = ${serviceAccountId} AND "revokedAt" IS NULL AND "replacedByTokenId" IS NULL AND ("expiresAt" IS NULL OR "expiresAt" > now())`;
      if (narrowed !== 1) throw new Error("S08_ROTATE_CAS_CONFLICT");

      return { kind: "rotated", replacement, token, predecessorTokenId: tokenId } as const;
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return { kind: "ceiling_denied", status: error.status, message: error.message } as const;
      if (error instanceof Error && error.message.includes("S08_ROTATE_CAS_CONFLICT")) return { kind: "rotate_conflict" } as const;
      throw error;
    });

    switch (outcome.kind) {
      case "ceiling_denied":
        return context.json({ error: outcome.message }, outcome.status);
      case "rotate_conflict":
        return context.json({ error: "The token state changed concurrently. Retry the rotation.", code: "DASHBOARD_CONFLICT" }, 409);
      case "account_not_found":
        return context.json({ error: "Service account not found." }, 404);
      case "token_not_found":
        return context.json({ error: "Active service account token not found." }, 404);
      case "idempotency_conflict":
        return context.json({ error: "The idempotency key conflicts with another request.", code: "IDEMPOTENCY_CONFLICT" }, 409);
      case "expiry_invalid":
        return badRequest(context, outcome.error);
      case "replayed":
        return context.json({ data: { id: outcome.replacement.id, status: "active", expiresAt: outcome.replacement.expiresAt, overlapUntil: outcome.replacement.overlapUntil, plaintext: null, plaintextAvailable: false } });
      case "rotated": {
        await writeAudit(context, "dashboard.mcp.service_account_tokens.rotate", "service_account", serviceAccountId, { tokenId: outcome.replacement.id, predecessorTokenId: outcome.predecessorTokenId });
        return context.json({ data: { id: outcome.replacement.id, status: "active", expiresAt: outcome.replacement.expiresAt, overlapUntil: outcome.replacement.overlapUntil, plaintext: outcome.token, plaintextAvailable: true } }, 201);
      }
    }
  });

  /**
   * S08 revoke: atomically set revokedAt and write the revoke audit row in
   * one transaction, so a failed audit rolls the transition back with it.
   * The transport contract requires a trimmed 8-500 char reason and an
   * Idempotency-Key; the reason is never silently truncated. Durable
   * idempotent replay: the same key + same canonical request (serviceAccountId,
   * tokenId, reason) returns the already-revoked metadata with 200 and never
   * performs a second transition or writes a second audit row; the same key
   * with a different requestHash returns a stable 409 IDEMPOTENCY_CONFLICT.
   * The partial unique index (serviceAccountId, revokeIdempotencyKey) guards
   * same-key races even without the account row lock.
   */
  routes.delete("/dashboard/mcp/service-accounts/:id/tokens/:tokenId", async (context) => {
    const serviceAccountId = context.req.param("id");
    const tokenId = context.req.param("tokenId");
    const body = await readBody(context);
    const reasonValue = body && typeof body === "object" && "reason" in body && typeof (body as Record<string, unknown>).reason === "string" ? (body as Record<string, unknown>).reason as string : undefined;
    const reason = reasonValue?.trim() ?? "";
    if (reason.length < 8 || reason.length > 500) {
      return badRequest(context, "A revoke reason of 8-500 characters is required.");
    }
    const idempotencyKey = context.req.header("idempotency-key")
      ?? (body && typeof body === "object" && "idempotencyKey" in body && typeof (body as Record<string, unknown>).idempotencyKey === "string"
        ? (body as Record<string, unknown>).idempotencyKey as string
        : undefined);
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(idempotencyKey)) {
      return badRequest(context, "A valid Idempotency-Key header (or idempotencyKey body field) is required.");
    }

    const idempotencyHash = createHash("sha256").update(`vanstro:sa:revoke-idempotency:v1\0${idempotencyKey}`, "utf8").digest("hex");
    const requestHash = createHash("sha256").update(JSON.stringify({ serviceAccountId, tokenId, reason }), "utf8").digest("hex");

    const outcome = await prisma.$transaction(async (database) => {
      await lockServiceAccountLifecycle(database, serviceAccountId);
      await assertManageableServiceAccounts(database, context.get("actorUserId"), [serviceAccountId]);

      const replayRows = await database.$queryRaw<Array<{ id: string; name: string | null; lastUsedAt: Date | null; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date; revokeRequestHash: string | null }>>`
        SELECT "id","name","lastUsedAt","expiresAt","revokedAt","createdAt","revokeRequestHash"
        FROM "service_account_tokens"
        WHERE "serviceAccountId" = ${serviceAccountId} AND "revokeIdempotencyKey" = ${idempotencyHash}
        FOR UPDATE`;
      if (replayRows.length > 0) {
        const replay = replayRows[0];
        if (replay.revokeRequestHash !== requestHash) return { kind: "idempotency_conflict" } as const;
        return { kind: "replayed", token: replay } as const;
      }

      const revokedRows = await database.$queryRaw<Array<{ id: string; name: string | null; lastUsedAt: Date | null; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date }>>`
        UPDATE "service_account_tokens"
        SET "revokedAt" = now(),
            "revokeIdempotencyKey" = ${idempotencyHash},
            "revokeRequestHash" = ${requestHash}
        WHERE "id" = ${tokenId} AND "serviceAccountId" = ${serviceAccountId} AND "revokedAt" IS NULL
        RETURNING "id","name","lastUsedAt","expiresAt","revokedAt","createdAt"`;
      if (revokedRows.length === 0) return { kind: "token_not_found" } as const;
      const revoked = revokedRows[0];

      await writeAudit(context, "dashboard.mcp.service_account_tokens.revoke", "service_account", serviceAccountId, { tokenId, reason }, database);

      return { kind: "revoked", token: revoked } as const;
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return { kind: "ceiling_denied", status: error.status, message: error.message } as const;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { kind: "unique_conflict" } as const;
      throw error;
    });

    switch (outcome.kind) {
      case "ceiling_denied":
        return context.json({ error: outcome.message }, outcome.status);
      case "unique_conflict": {
        const winner = await prisma.serviceAccountToken.findFirst({
          where: { serviceAccountId, revokeIdempotencyKey: idempotencyHash },
          select: { id: true, name: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true, revokeRequestHash: true }
        });
        if (winner && winner.revokeRequestHash === requestHash) {
          return context.json({ data: { id: winner.id, name: winner.name, status: "revoked", lastUsedAt: winner.lastUsedAt, expiresAt: winner.expiresAt, revokedAt: winner.revokedAt?.toISOString() ?? null, createdAt: winner.createdAt } });
        }
        return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
      }
      case "idempotency_conflict":
        return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
      case "token_not_found":
        return context.json({ error: "Active service account token not found." }, 404);
      case "replayed": {
        const replayed = outcome.token;
        return context.json({ data: { id: replayed.id, name: replayed.name, status: "revoked", lastUsedAt: replayed.lastUsedAt, expiresAt: replayed.expiresAt, revokedAt: replayed.revokedAt?.toISOString() ?? null, createdAt: replayed.createdAt } });
      }
      case "revoked": {
        const revoked = outcome.token;
        return context.json({ data: { id: revoked.id, name: revoked.name, status: "revoked", lastUsedAt: revoked.lastUsedAt, expiresAt: revoked.expiresAt, revokedAt: revoked.revokedAt?.toISOString() ?? null, createdAt: revoked.createdAt } });
      }
    }
  });

  routes.get("/dashboard/mcp/invocations", async (context) => {
    const pagination = parsePagination(context);
    const [invocations, total] = await Promise.all([
      prisma.mcpToolInvocation.findMany({
        select: {
          id: true,
          toolKey: true,
          status: true,
          createdAt: true,
          error: true,
          serviceAccount: { select: { id: true, key: true, name: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.mcpToolInvocation.count()
    ]);
    // S08 safe invocation read model (audit-invocation-read-model consumer):
    // only the frozen safe fields are returned; raw input/output/error are
    // never exposed. errorClass is derived from error only when it matches the
    // small whitelist, otherwise UNCLASSIFIED — unknown fields fail closed.
    const data = invocations.map(({ error, ...safe }) => ({
      ...safe,
      serviceAccount: { id: safe.serviceAccount.id, key: safe.serviceAccount.key, name: safe.serviceAccount.name },
      errorClass: error ? safeErrorClass(error) : "NONE"
    }));
    return context.json({ data, meta: pageMeta(pagination, total) });
  });

  routes.post("/dashboard/email/outbox/:id/retry", async (context) => {
    const item = await prisma.emailOutbox.findUnique({ where: { id: context.req.param("id") } });
    if (!item) return context.json({ error: "Email outbox item not found." }, 404);
    if (!new Set(["retry_wait", "failed", "cancelled"]).has(item.status)) {
      return context.json({ error: "Only failed, cancelled or waiting emails can be retried." }, 409);
    }

    const retried = await prisma.emailOutbox.updateMany({
      where: { id: item.id, status: { in: ["retry_wait", "failed", "cancelled"] } },
      data: { status: "pending", nextRunAt: null, lastError: null, lockedBy: null, lockedAt: null }
    });
    if (retried.count !== 1) return context.json({ error: "Email status changed concurrently.", code: "DASHBOARD_CONFLICT" }, 409);
    const updatedItem = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: item.id } });
    await writeAudit(context, "dashboard.email_outbox.retry", "email_outbox", item.id);
    return context.json({ data: updatedItem });
  });

  routes.get("/dashboard/audit-logs/:id", async (context) => handleStrictAuditDetail(context));

  routes.get("/dashboard/audit-logs", async (context) => {
    if (context.req.query("queryVersion") !== undefined) return handleStrictAuditList(context);
    const pagination = parsePagination(context);
    const canReadSensitive = context.get("actorPermissions").includes("audit.read_sensitive");
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        select: {
          id: true, action: true, resourceType: true, resourceId: true, actorUserId: true,
          serviceAccountId: true, createdAt: true,
          ...(canReadSensitive ? { metadata: true } : {})
        },
        orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take
      }),
      prisma.auditLog.count()
    ]);
    const safeLogs = logs.map((log) => ({
      ...log,
      ...("metadata" in log ? { metadata: log.metadata && typeof log.metadata === "object" ? { available: true } : null } : {})
    }));
    context.header("Cache-Control", "private, no-store");
    return context.json({ data: safeLogs, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/operations/alerts", async (context) => context.json({ data: await getOperationalAlerts() }));

  routes.get("/dashboard/payment-sessions", async (context) => {
    const pagination = parsePagination(context);
    const canReadReference = context.get("actorPermissions").includes("payments.reference.read");
    const canReadPii = context.get("actorPermissions").includes("customers.pii.read");
    const select = {
      id: true, status: true, paymentMethod: true, fulfillment: true,
      ...(canReadPii ? { guestEmail: true, guestFirstName: true, guestLastName: true } : {}),
      subtotalCents: true, discountCents: true, taxCents: true, shippingCents: true, totalCents: true,
      currency: true, paidAt: true, expiresAt: true, createdAt: true, updatedAt: true,
      ...(canReadReference ? { providerPaymentId: true } : {})
    } satisfies Prisma.PaymentSessionSelect;
    const [sessions, total] = await Promise.all([
      prisma.paymentSession.findMany({ select, orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.paymentSession.count()
    ]);
    const safeSessions = sessions.map((session) => {
      const providerPaymentId = "providerPaymentId" in session ? session.providerPaymentId : null;
      const { providerPaymentId: _omitted, ...safe } = session as typeof session & { providerPaymentId?: string | null };
      return { ...safe, ...(canReadReference && providerPaymentId ? { providerReference: `…${providerPaymentId.slice(-6)}` } : {}) };
    });
    context.header("Cache-Control", "private, no-store");
    return context.json({ data: safeSessions, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/payment-reconciliation", async (context) => {
    const pagination = parsePagination(context);
    const authorization = context.get("p02Authorization");
    const canReadPii = permissionGrant(authorization, "customers.pii.read")?.global === true;
    const canReadReference = permissionGrant(authorization, "payments.reference.read")?.global === true;
    const where: Prisma.PaymentSessionWhereInput = {
      OR: [
        { status: { in: ["reconciliation_required", "refund_pending", "refund_processing", "refund_failed"] } },
        {
          status: "paid",
          paymentEvents: { some: { type: "reconciliation_required" } }
        }
      ]
    };
    const select = reconciliationSelect(canReadPii, canReadReference);
    const [sessions, total] = await Promise.all([
      prisma.paymentSession.findMany({
        where,
        select,
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.paymentSession.count({ where })
    ]);
    const safeSessions = sessions.map((session) => reconciliationDto(session, canReadReference));
    context.header("Cache-Control", "private, no-store");
    return context.json({ data: safeSessions, meta: pageMeta(pagination, total) });
  });

  routes.patch("/dashboard/payment-reconciliation/:id", async (context) => {
    context.header("Cache-Control", "private, no-store");
    const authorization = context.get("p02Authorization");
    const canReadPii = permissionGrant(authorization, "customers.pii.read")?.global === true;
    const canReadReference = permissionGrant(authorization, "payments.reference.read")?.global === true;
    const body = await readBody(context);
    if (!body) return reconciliationError(context, 400, "DASHBOARD_INVALID", "JSON body is required.");
    const action = optionalString(body, "action");
    const supportedActions = [
      "request_refund",
      "execute_refund",
      "check_refund_status",
      "confirm_refunded",
      "mark_refund_failed"
    ];
    if (!action || !supportedActions.includes(action)) {
      return reconciliationError(context, 400, "DASHBOARD_INVALID", "Reconciliation action is invalid.");
    }
    const session = await prisma.paymentSession.findUnique({ where: { id: context.req.param("id") } });
    if (!session || !["reconciliation_required", "refund_pending", "refund_processing", "refund_failed"].includes(session.status)) {
      return reconciliationError(context, 404, "DASHBOARD_NOT_FOUND", "Payment session is not awaiting reconciliation.");
    }
    const note = optionalString(body, "note");
    const providerRefundId = optionalString(body, "providerRefundId");

    if (action === "execute_refund" || action === "check_refund_status") {
      if (session.paymentMethod !== "card" || !session.providerPaymentId) {
        return reconciliationError(context, 400, "DASHBOARD_INVALID", "Provider refund is unavailable for this session.");
      }
      const expectedStatus = action === "execute_refund" ? "refund_pending" : "refund_processing";
      if (session.status !== expectedStatus) {
        return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Payment status does not allow this action.");
      }
      const provider = resolvePaymentProvider("card");
      if (!provider.refund) return reconciliationError(context, 503, "QUERY_UNAVAILABLE", "Provider refund is unavailable.", true);
      if (action === "execute_refund") {
        const claimed = await prisma.paymentSession.updateMany({
          where: { id: session.id, status: "refund_pending" },
          data: { status: "refund_processing" }
        });
        if (claimed.count !== 1) {
          return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Payment status changed concurrently.");
        }
      }
      const result = await provider.refund({
        orderId: session.id,
        providerPaymentId: session.providerPaymentId,
        amountCents: session.totalCents,
        currency: session.currency,
        statusCheck: action === "check_refund_status"
      });
      if (!result.ok && result.retryable) {
        await writeAudit(context, "dashboard.payment_refund.unknown", "payment_session", session.id, {
          action,
          reason: result.reason
        });
        return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Provider refund result is unknown.", true);
      }
      const nextStatus = result.ok ? "refunded" : "refund_failed";
      const updated = await prisma.$transaction(async (database) => {
        const claimed = await database.paymentSession.updateMany({
          where: { id: session.id, status: "refund_processing" },
          data: { status: nextStatus }
        });
        if (claimed.count !== 1) return undefined;
        await database.paymentEvent.create({
          data: {
            paymentSessionId: session.id,
            type: result.ok ? "refunded" : "refund_failed",
            providerEventId: result.ok ? result.providerRefundId : undefined,
            amountCents: session.totalCents,
            currency: session.currency,
            payload: {
              actorUserId: context.get("actorUserId"),
              action,
              note,
              ...(result.ok ? { providerRefundId: result.providerRefundId } : { reason: result.reason })
            }
          }
        });
        await writeAudit(context, "dashboard.payment_refund.provider", "payment_session", session.id, {
          action,
          result: nextStatus,
          ...(result.ok ? { providerRefundId: result.providerRefundId } : { reason: result.reason })
        }, database);
        return database.paymentSession.findUniqueOrThrow({ where: { id: session.id }, select: reconciliationSelect(canReadPii, canReadReference) });
      });
      if (!updated) return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Payment status changed concurrently.");
      if (!result.ok) return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Provider refund failed.", false);
      return context.json({ data: reconciliationDto(updated, canReadReference), ...(canReadReference && result.providerRefundId ? { meta: { providerReference: `…${result.providerRefundId.slice(-6)}` } } : {}) });
    }

    if (action === "request_refund" && !["reconciliation_required", "refund_failed"].includes(session.status)) {
      return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Payment status does not allow this action.");
    }
    if ((action === "confirm_refunded" || action === "mark_refund_failed") && session.status !== "refund_pending") {
      return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Payment status does not allow this action.");
    }
    if (action === "confirm_refunded" && session.paymentMethod === "card") {
      return reconciliationError(context, 400, "DASHBOARD_INVALID", "Card refunds require provider execution.");
    }
    if (action === "confirm_refunded" && !providerRefundId) {
      return reconciliationError(context, 400, "DASHBOARD_INVALID", "providerRefundId is required.");
    }
    const nextStatus = action === "request_refund"
      ? "refund_pending"
      : action === "confirm_refunded"
        ? "refunded"
        : "refund_failed";
    const eventType = action === "request_refund"
      ? "refund_requested"
      : action === "confirm_refunded"
        ? "refunded"
        : "refund_failed";
    const updated = await prisma.$transaction(async (database) => {
      const claimed = await database.paymentSession.updateMany({
        where: { id: session.id, status: session.status },
        data: { status: nextStatus }
      });
      if (claimed.count !== 1) return undefined;
      await database.paymentEvent.create({
        data: {
          paymentSessionId: session.id,
          type: eventType,
          providerEventId: providerRefundId ?? (action === "request_refund" ? undefined : session.providerPaymentId),
          amountCents: session.totalCents,
          currency: session.currency,
          payload: { actorUserId: context.get("actorUserId"), note, providerRefundId }
        }
      });
      await writeAudit(context, "dashboard.payment_reconciliation.update", "payment_session", session.id, { action }, database);
      return database.paymentSession.findUniqueOrThrow({ where: { id: session.id }, select: reconciliationSelect(canReadPii, canReadReference) });
    });
    if (!updated) return reconciliationError(context, 409, "DASHBOARD_CONFLICT", "Payment status changed concurrently.");
    return context.json({ data: reconciliationDto(updated, canReadReference) });
  });

  routes.post("/dashboard/payment-sessions/:id/mark-paid", async (context) => {
    const session = await prisma.paymentSession.findUnique({ where: { id: context.req.param("id") } });
    if (!session) return context.json({ error: "Payment session not found." }, 404);
    if (session.status !== "pending") {
      return context.json({ error: "Only pending payment sessions can be marked paid." }, 409);
    }
    if (session.paymentMethod === "card") {
      return context.json({ error: "Card payments must be confirmed by the payment provider." }, 400);
    }
    const config = loadApiConfig();
    const providerPaymentId = `dashboard-${randomBytes(8).toString("hex")}`;
    const signature = createHmac("sha256", config.paymentCallbackSecret)
      .update(`${session.id}:${providerPaymentId}`)
      .digest("hex");
    const app = (await import("../app.js")).createApp();
    const response = await app.request("/api/v1/payments/callback", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payment-signature": signature
      },
      body: JSON.stringify({
        sessionId: session.id,
        providerPaymentId,
        status: "paid"
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return context.json(
        { error: (payload as { error?: string } | null)?.error ?? "Unable to mark payment session as paid." },
        response.status as 400 | 401 | 409 | 500
      );
    }
    await writeAudit(context, "dashboard.payment_sessions.mark_paid", "payment_session", session.id, {
      providerPaymentId
    });
    return context.json({ data: (payload as { data: unknown }).data });
  });

  routes.get("/dashboard/erp-webhook-events", async (context) => {
    const pagination = parsePagination(context);
    const [events, total] = await Promise.all([
      prisma.erpWebhookEvent.findMany({
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.erpWebhookEvent.count()
    ]);
    return context.json({ data: events, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/email/provider", async (context) => {
    const account = await prisma.emailProviderAccount.findUnique({ where: { key: EMAIL_PROVIDER_KEY } });
    if (!account) {
      return context.json({
        data: {
          key: EMAIL_PROVIDER_KEY,
          provider: "smtp",
          status: "disabled",
          settings: {}
        }
      });
    }
    return context.json({
      data: {
        id: account.id,
        key: account.key,
        provider: account.provider,
        status: account.status,
        settings: maskSmtpSettings(account.settings as Record<string, unknown> | null)
      }
    });
  });

  routes.put("/dashboard/email/provider", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const host = optionalString(body, "host");
    const from = optionalString(body, "from");
    const user = optionalString(body, "user");
    const passwordInput = optionalString(body, "password");
    const port = optionalNumber(body, "port") ?? 587;
    const requireTls = optionalBoolean(body, "requireTls") ?? true;
    const status = optionalString(body, "status") === "enabled" ? "enabled" : "disabled";
    if (!host || !from || !user) return badRequest(context, "host, from and user are required.");
    if (process.env.VANSTRO_RUNTIME_MODE === "deployment" && !requireTls) {
      return badRequest(context, "SMTP transport encryption is required in deployment mode.");
    }

    const existing = await prisma.emailProviderAccount.findUnique({ where: { key: EMAIL_PROVIDER_KEY } });
    const existingSettings = (existing?.settings as Record<string, unknown> | null) ?? {};
    const encryptionKey = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim();
    if (!encryptionKey) return context.json({ error: "Email settings encryption is not configured.", code: "DASHBOARD_CONFLICT" }, 409);
    const encryptedPassword =
      passwordInput && passwordInput !== "********"
        ? encryptSecret(passwordInput, encryptionKey)
        : existingSettings.encryptedPassword;
    if (!encryptedPassword) return badRequest(context, "password is required.");

    const settings = { host, port, user, encryptedPassword, from, requireTls };
    const account = await prisma.emailProviderAccount.upsert({
      where: { key: EMAIL_PROVIDER_KEY },
      update: { provider: "smtp", status, settings },
      create: { key: EMAIL_PROVIDER_KEY, provider: "smtp", status, settings }
    });
    await writeAudit(context, "dashboard.email_provider.update", "email_provider_account", account.id, {
      status,
      host,
      port,
      from
    });
    return context.json({
      data: {
        id: account.id,
        key: account.key,
        provider: account.provider,
        status: account.status,
        settings: maskSmtpSettings(settings)
      }
    });
  });

  routes.post("/dashboard/email/provider/test", async (context) => {
    const body = await readBody(context);
    const account = await prisma.emailProviderAccount.findUnique({ where: { key: EMAIL_PROVIDER_KEY } });
    if (!account || account.status !== "enabled") {
      return context.json({ error: "Enable and save SMTP settings before sending a test email." }, 409);
    }
    const settings = account.settings as Record<string, unknown>;
    const target =
      optionalString(body ?? {}, "toEmail") ??
      (typeof settings.from === "string" ? settings.from : undefined);
    if (!target) return badRequest(context, "toEmail is required.");
    await prisma.emailOutbox.create({
      data: {
        templateKey: "welcome",
        toEmail: target.toLowerCase(),
        subject: "VanStro SMTP test",
        payload: { firstName: "Team", email: target, lastName: "", test: true }
      }
    });
    await writeAudit(context, "dashboard.email_provider.test", "email_provider_account", account.id, {
      toEmail: target
    });
    return context.json({ data: { ok: true, queuedTo: target.toLowerCase() } });
  });

  routes.get("/dashboard/analytics/summary", async (context) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [pageViews, uniqueSessions, topPaths, checkoutSessions, paidOrders, alerts] = await Promise.all([
      prisma.pageViewEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "sessionId") AS count
        FROM "page_view_events"
        WHERE "createdAt" >= ${since}
      `,
      prisma.pageViewEvent.groupBy({
        by: ["path"],
        where: { createdAt: { gte: since } },
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 10
      }),
      prisma.paymentSession.count({ where: { createdAt: { gte: since } } }),
      prisma.paymentSession.count({ where: { paidAt: { gte: since }, status: "paid" } }),
      getOperationalAlerts()
    ]);
    return context.json({
      data: {
        since: since.toISOString(),
        pageViews,
        uniqueSessions: Number(uniqueSessions[0]?.count ?? 0n),
        topPaths: topPaths.map((row) => ({ path: row.path, count: row._count.path })),
        funnel: {
          checkoutSessions,
          paidOrders
        },
        alerts
      }
    });
  });

  routes.get("/dashboard/orders", async (context) => {
    const pagination = parsePagination(context);
    const canReadPii = context.get("actorPermissions").includes("customers.pii.read");
    const statusParam = context.req.query("status");
    const orderStatusValues = ["pending_payment", "paid", "processing", "fulfilled", "cancelled", "payment_expired"] as const;
    const status = orderStatusValues.includes(statusParam as (typeof orderStatusValues)[number])
      ? (statusParam as (typeof orderStatusValues)[number])
      : undefined;
    const where = status ? { status } : {};
    const select = {
      id: true, status: true, paymentSessionId: true, paymentMethod: true, fulfillment: true, currency: true, subtotalCents: true, discountCents: true,
      taxCents: true, shippingCents: true, totalCents: true, createdAt: true, updatedAt: true,
      ...(canReadPii ? { email: true, firstName: true, lastName: true, phone: true } : {}),
      items: { select: { id: true, productName: true, skuCode: true, quantity: true, unitPriceCents: true, lineTotalCents: true } },
      statusEvents: { select: { id: true, status: true, source: true, createdAt: true }, orderBy: { createdAt: "desc" as const } }
    } satisfies Prisma.OrderSelect;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, select, orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.order.count({ where })
    ]);
    context.header("Cache-Control", "private, no-store");
    return context.json({ data: orders, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/orders/:id", async (context) => {
    const canReadPii = context.get("actorPermissions").includes("customers.pii.read");
    const order = await prisma.order.findUnique({
      where: { id: context.req.param("id") },
      select: {
        id: true, status: true, paymentSessionId: true, paymentMethod: true, fulfillment: true, currency: true, subtotalCents: true, discountCents: true,
        taxCents: true, shippingCents: true, totalCents: true, createdAt: true, updatedAt: true,
        ...(canReadPii ? { email: true, firstName: true, lastName: true, phone: true } : {}),
        items: { select: { id: true, productName: true, skuCode: true, quantity: true, unitPriceCents: true, lineTotalCents: true } },
        statusEvents: { select: { id: true, status: true, source: true, createdAt: true }, orderBy: { createdAt: "desc" } }
      }
    });
    if (!order) return context.json({ error: "Order not found.", code: "DASHBOARD_NOT_FOUND", requestId: context.res.headers.get("X-Request-Id") }, 404);
    context.header("Cache-Control", "private, no-store");
    return context.json({ data: order });
  });

  routes.get("/dashboard/erp-sync-jobs", async (context) => {
    const pagination = parsePagination(context);
    const [jobs, total] = await Promise.all([
      prisma.erpSyncJob.findMany({
        include: { attempts: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.erpSyncJob.count()
    ]);
    return context.json({ data: jobs, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/erp-sync-jobs/:id", async (context) => {
    const job = await prisma.erpSyncJob.findUnique({
      where: { id: context.req.param("id") },
      include: { attempts: { orderBy: { createdAt: "desc" } } }
    });
    if (!job) return context.json({ error: "ERP sync job not found." }, 404);
    return context.json({ data: job });
  });

  routes.post("/dashboard/erp-sync-jobs/:id/retry", async (context) => {
    const job = await prisma.erpSyncJob.findUnique({ where: { id: context.req.param("id") } });
    if (!job) return context.json({ error: "ERP sync job not found." }, 404);
    if (!new Set(["retry_wait", "failed", "cancelled"]).has(job.status)) {
      return context.json({ error: "Only failed, cancelled or waiting ERP jobs can be retried." }, 409);
    }

    const retried = await prisma.erpSyncJob.updateMany({
      where: { id: job.id, status: { in: ["retry_wait", "failed", "cancelled"] } },
      data: { status: "pending", nextRunAt: null, lastError: null, lockedAt: null, lockedBy: null }
    });
    if (retried.count !== 1) return context.json({ error: "ERP sync status changed concurrently.", code: "DASHBOARD_CONFLICT" }, 409);
    const updatedJob = await prisma.erpSyncJob.findUniqueOrThrow({ where: { id: job.id } });
    await writeAudit(context, "dashboard.erp_sync_jobs.retry", "erp_sync_job", job.id);
    return context.json({ data: updatedJob });
  });

  routes.get("/dashboard/inventory/snapshots", async (context) => {
    const pagination = parsePagination(context);
    const skuId = context.req.query("skuId");
    const dealerLocationId = context.req.query("dealerLocationId");
    const where = {
      ...(skuId ? { skuId } : {}),
      ...(dealerLocationId ? { dealerLocationId } : {})
    };
    const [snapshots, total] = await Promise.all([
      prisma.inventorySnapshot.findMany({
        where,
        include: {
          sku: { select: { id: true, skuCode: true, name: true, product: { select: { id: true, slug: true, name: true } } } },
          dealerLocation: { select: { id: true, code: true, name: true, province: true } }
        },
        orderBy: { updatedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.inventorySnapshot.count({ where })
    ]);
    return context.json({
      data: snapshots.map((snapshot) => ({
        ...snapshot,
        quantityAvailable: Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved)
      })),
      meta: pageMeta(pagination, total)
    });
  });

  routes.post("/dashboard/inventory/snapshots", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const skuId = optionalString(body, "skuId");
    const dealerLocationId = optionalString(body, "dealerLocationId");
    const quantityOnHand = optionalNumber(body, "quantityOnHand");
    if (!skuId || !dealerLocationId || quantityOnHand === undefined || quantityOnHand < 0) {
      return badRequest(context, "skuId, dealerLocationId and non-negative quantityOnHand are required.");
    }
    const location = await prisma.dealerLocation.findFirst({
      where: { id: dealerLocationId, status: "active", dealer: { status: "active" } },
      select: { id: true }
    });
    if (!location) {
      return badRequest(context, "dealerLocationId must identify an active location for an active dealer.");
    }
    const snapshot = await prisma.inventorySnapshot.upsert({
      where: { skuId_dealerLocationId: { skuId, dealerLocationId } },
      update: { quantityOnHand },
      create: { skuId, dealerLocationId, quantityOnHand }
    });
    await writeAudit(context, "dashboard.inventory.snapshots.upsert", "inventory_snapshot", snapshot.id, {
      quantityOnHand
    });
    return context.json({ data: snapshot }, 201);
  });

  routes.patch("/dashboard/inventory/snapshots/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const quantityOnHand = optionalNumber(body, "quantityOnHand");
    if (quantityOnHand === undefined || quantityOnHand < 0) {
      return badRequest(context, "non-negative quantityOnHand is required.");
    }
    const existing = await prisma.inventorySnapshot.findUnique({ where: { id: context.req.param("id") } });
    if (!existing) return context.json({ error: "Inventory snapshot not found." }, 404);
    if (quantityOnHand < existing.quantityReserved) {
      return badRequest(context, "quantityOnHand cannot be lower than quantityReserved.");
    }
    const snapshot = await prisma.inventorySnapshot.update({
      where: { id: existing.id },
      data: { quantityOnHand }
    });
    await writeAudit(context, "dashboard.inventory.snapshots.update", "inventory_snapshot", snapshot.id, {
      quantityOnHand
    });
    return context.json({
      data: {
        ...snapshot,
        quantityAvailable: Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved)
      }
    });
  });

  const ORDER_TRANSITIONS: Record<string, Set<string>> = {
    paid: new Set(["processing", "cancelled"]),
    processing: new Set(["fulfilled", "cancelled"]),
    fulfilled: new Set(),
    cancelled: new Set()
  };

  routes.patch("/dashboard/orders/:id/status", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const status = optionalString(body, "status");
    if (!status || !["paid", "processing", "fulfilled", "cancelled"].includes(status)) {
      return badRequest(context, "status must be paid, processing, fulfilled or cancelled.");
    }
    const order = await prisma.order.findUnique({ where: { id: context.req.param("id") } });
    if (!order) return context.json({ error: "Order not found." }, 404);
    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed?.has(status)) {
      return context.json({ error: `Cannot transition order from ${order.status} to ${status}.` }, 409);
    }
    const updated = await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: status as "paid" | "processing" | "fulfilled" | "cancelled" }
      });
      if (claimed.count !== 1) return undefined;
      const next = await transaction.order.findUniqueOrThrow({ where: { id: order.id } });
      await transaction.orderStatusEvent.create({
        data: { orderId: order.id, status: status as "paid" | "processing" | "fulfilled" | "cancelled", source: "dashboard", payload: { actorUserId: context.get("actorUserId") } }
      });
      if (status === "cancelled") {
        const orderWithItems = await transaction.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { items: true, paymentSession: true }
        });
        await restockCancelledOrderItems(transaction, orderWithItems);
        const refundClaim = await transaction.paymentSession.updateMany({
          where: { id: orderWithItems.paymentSessionId, status: "paid" },
          data: { status: "refund_pending" }
        });
        if (refundClaim.count === 1) {
          await transaction.paymentEvent.create({
            data: {
              paymentSessionId: orderWithItems.paymentSessionId,
              type: "refund_requested",
              amountCents: orderWithItems.totalCents,
              currency: orderWithItems.currency,
              payload: { reason: "order_cancelled", source: "dashboard" }
            }
          });
        }
      }
      return next;
    });
    if (!updated) {
      return context.json({ error: "Order status changed concurrently. Refresh and try again.", code: "DASHBOARD_CONFLICT" }, 409);
    }
    await writeAudit(context, "dashboard.orders.status.update", "order", order.id, { status });
    return context.json({ data: updated });
  });

  routes.post("/dashboard/orders/:id/assign-dealer", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const dealerLocationId = optionalString(body, "dealerLocationId");
    if (!dealerLocationId) return badRequest(context, "dealerLocationId is required.");
    const location = await prisma.dealerLocation.findUnique({
      where: { id: dealerLocationId },
      include: { dealer: true }
    });
    if (!location) return context.json({ error: "Dealer location not found." }, 404);
    const order = await prisma.order.update({
      where: { id: context.req.param("id") },
      data: { dealerLocationId: location.id }
    });
    await writeAudit(context, "dashboard.orders.assign_dealer", "order", order.id, {
      dealerLocationId: location.id,
      dealerId: location.dealerId
    });
    return context.json({ data: order });
  });

  routes.get("/dashboard/email/templates", async (context) => {
    const templates = await prisma.emailTemplate.findMany({
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      orderBy: { key: "asc" }
    });
    return context.json({ data: templates });
  });

  routes.get("/dashboard/email/templates/:id", async (context) => {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: context.req.param("id") },
      include: { versions: { orderBy: { version: "desc" } } }
    });
    if (!template) return context.json({ error: "Email template not found." }, 404);
    return context.json({ data: template });
  });

  routes.post("/dashboard/email/templates", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const key = optionalString(body, "key");
    const name = optionalString(body, "name");
    const subject = optionalString(body, "subject");
    if (!key || !name || !subject) return badRequest(context, "key, name and subject are required.");
    const template = await prisma.emailTemplate.create({
      data: {
        key,
        name,
        versions: {
          create: {
            version: 1,
            subject,
            bodyText: optionalString(body, "bodyText"),
            bodyHtml: optionalString(body, "bodyHtml"),
            isPublished: true
          }
        }
      },
      include: { versions: true }
    });
    await writeAudit(context, "dashboard.email_templates.create", "email_template", template.id);
    return context.json({ data: template }, 201);
  });

  routes.patch("/dashboard/email/templates/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const template = await prisma.emailTemplate.update({
      where: { id: context.req.param("id") },
      data: { key: optionalString(body, "key"), name: optionalString(body, "name") }
    });
    await writeAudit(context, "dashboard.email_templates.update", "email_template", template.id);
    return context.json({ data: template });
  });

  routes.post("/dashboard/email/templates/:id/versions", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const subject = optionalString(body, "subject");
    if (!subject) return badRequest(context, "subject is required.");
    const latest = await prisma.emailTemplateVersion.findFirst({
      where: { templateId: context.req.param("id") },
      orderBy: { version: "desc" }
    });
    const publish = optionalBoolean(body, "publish") ?? false;
    const version = await prisma.$transaction(async (transaction) => {
      if (publish) {
        await transaction.emailTemplateVersion.updateMany({
          where: { templateId: context.req.param("id"), isPublished: true },
          data: { isPublished: false }
        });
      }
      return transaction.emailTemplateVersion.create({
        data: {
          templateId: context.req.param("id"),
          version: (latest?.version ?? 0) + 1,
          subject,
          bodyText: optionalString(body, "bodyText"),
          bodyHtml: optionalString(body, "bodyHtml"),
          isPublished: publish
        }
      });
    });
    await writeAudit(context, "dashboard.email_templates.versions.create", "email_template", context.req.param("id"), { version: version.version });
    return context.json({ data: version }, 201);
  });

  return routes;
}
