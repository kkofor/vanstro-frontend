import { prisma, type Prisma } from "@vanstro/db";
import { Hono } from "hono";
import {
  createServiceAccountToken,
  lockServiceAccountLifecycle
} from "../auth/service-account.js";
import { getOperationalAlerts } from "../operations/alerts.js";
import { type DashboardEnv, writeAudit } from "./access.js";
import {
  assertAssignableRoles,
  PermissionCeilingError
} from "./permission-ceiling.js";
import { badRequest, optionalString, optionalStringArray, optionalBoolean, pageMeta, parsePagination, readBody } from "./request.js";

export function createDashboardSystemRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/email/outbox", async (context) => {
    const pagination = parsePagination(context);
    const [items, total] = await Promise.all([
      prisma.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.emailOutbox.count()
    ]);

    return context.json({ data: items, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/mcp/service-accounts", async (context) => {
    const serviceAccounts = await prisma.serviceAccount.findMany({
      include: {
        roles: { include: { role: true } },
        tokens: {
          select: { id: true, name: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: serviceAccounts });
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
    const body = await readBody(context);
    const expiresAtValue = body ? optionalString(body, "expiresAt") : undefined;
    const expiresAt = expiresAtValue ? new Date(expiresAtValue) : undefined;
    if (expiresAtValue && Number.isNaN(expiresAt?.getTime())) return badRequest(context, "expiresAt must be a valid ISO date.");
    if (expiresAt && expiresAt <= new Date()) return badRequest(context, "expiresAt must be in the future.");

    const result = await prisma.$transaction(async (database) => {
      const serviceAccountId = context.req.param("id");
      await lockServiceAccountLifecycle(database, serviceAccountId);

      const serviceAccount = await database.serviceAccount.findUnique({
        where: { id: serviceAccountId },
        select: { id: true, status: true }
      });

      if (!serviceAccount || serviceAccount.status !== "active") return serviceAccount;

      return createServiceAccountToken(serviceAccount.id, {
        name: body ? optionalString(body, "name") : undefined,
        expiresAt
      }, database);
    });

    if (!result) return context.json({ error: "Service account not found." }, 404);
    if (!("token" in result)) return context.json({ error: "A disabled service account cannot receive new tokens." }, 409);

    const { token, record } = result;
    await writeAudit(context, "dashboard.mcp.service_account_tokens.create", "service_account", record.serviceAccountId, { tokenId: record.id });

    return context.json({ data: { id: record.id, name: record.name, expiresAt: record.expiresAt, createdAt: record.createdAt, token } }, 201);
  });

  routes.delete("/dashboard/mcp/service-accounts/:id/tokens/:tokenId", async (context) => {
    const token = await prisma.serviceAccountToken.findFirst({
      where: { id: context.req.param("tokenId"), serviceAccountId: context.req.param("id"), revokedAt: null },
      select: { id: true, serviceAccountId: true }
    });
    if (!token) return context.json({ error: "Active service account token not found." }, 404);

    await prisma.serviceAccountToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    await writeAudit(context, "dashboard.mcp.service_account_tokens.revoke", "service_account", token.serviceAccountId, { tokenId: token.id });

    return context.json({ data: { id: token.id, revoked: true } });
  });

  routes.get("/dashboard/mcp/invocations", async (context) => {
    const pagination = parsePagination(context);
    const [invocations, total] = await Promise.all([
      prisma.mcpToolInvocation.findMany({
        include: { serviceAccount: { select: { id: true, key: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.mcpToolInvocation.count()
    ]);
    return context.json({ data: invocations, meta: pageMeta(pagination, total) });
  });

  routes.post("/dashboard/email/outbox/:id/retry", async (context) => {
    const item = await prisma.emailOutbox.findUnique({ where: { id: context.req.param("id") } });
    if (!item) return context.json({ error: "Email outbox item not found." }, 404);
    if (!new Set(["retry_wait", "failed", "cancelled"]).has(item.status)) {
      return context.json({ error: "Only failed, cancelled or waiting emails can be retried." }, 409);
    }

    const updatedItem = await prisma.emailOutbox.update({
      where: { id: item.id },
      data: { status: "pending", nextRunAt: null, lastError: null, lockedBy: null, lockedAt: null }
    });
    await writeAudit(context, "dashboard.email_outbox.retry", "email_outbox", item.id);
    return context.json({ data: updatedItem });
  });

  routes.get("/dashboard/audit-logs", async (context) => {
    const pagination = parsePagination(context);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.auditLog.count()
    ]);
    return context.json({ data: logs, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/operations/alerts", async (context) => context.json({ data: await getOperationalAlerts() }));

  routes.get("/dashboard/payment-sessions", async (context) => {
    const pagination = parsePagination(context);
    const [sessions, total] = await Promise.all([
      prisma.paymentSession.findMany({ orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.paymentSession.count()
    ]);
    return context.json({ data: sessions, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/orders", async (context) => {
    const pagination = parsePagination(context);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        include: { items: true, statusEvents: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.order.count()
    ]);
    return context.json({ data: orders, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/orders/:id", async (context) => {
    const order = await prisma.order.findUnique({
      where: { id: context.req.param("id") },
      include: { items: true, statusEvents: { orderBy: { createdAt: "desc" } } }
    });
    if (!order) return context.json({ error: "Order not found." }, 404);
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

    const updatedJob = await prisma.erpSyncJob.update({
      where: { id: job.id },
      data: { status: "pending", nextRunAt: null, lastError: null, lockedAt: null, lockedBy: null }
    });
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
      const next = await transaction.order.update({
        where: { id: order.id },
        data: { status: status as "paid" | "processing" | "fulfilled" | "cancelled" }
      });
      await transaction.orderStatusEvent.create({
        data: { orderId: order.id, status: status as "paid" | "processing" | "fulfilled" | "cancelled", source: "dashboard", payload: { actorUserId: context.get("actorUserId") } }
      });
      return next;
    });
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
