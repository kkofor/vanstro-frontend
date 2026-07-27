import { applyDataRetention, decryptSecret, deleteExpiredConsentEvents, encryptSecret, Prisma, prisma } from "@vanstro/db";
import nodemailer from "nodemailer";
import { loadWorkerConfig } from "./config.js";

const config = loadWorkerConfig();
const runOnce = process.argv.includes("--once");
let shutdownRequested = false;
let sleepTimeout: NodeJS.Timeout | undefined;
let wakeSleep: (() => void) | undefined;

async function readJobBacklog() {
  const [erpSyncJobs, emailOutboxItems] = await Promise.all([
    prisma.erpSyncJob.count({
      where: { status: { in: ["pending", "retry_wait"] } }
    }),
    prisma.emailOutbox.count({
      where: { status: { in: ["pending", "retry_wait"] } }
    })
  ]);

  console.log(
    JSON.stringify({
      service: "vanstro-worker",
      erpSyncJobs,
      emailOutboxItems,
      timestamp: new Date().toISOString()
    })
  );
}

async function releaseExpiredReservations() {
  const now = new Date();
  const sessions = await prisma.paymentSession.findMany({
    where: { status: "pending", expiresAt: { lte: now } },
    orderBy: { expiresAt: "asc" },
    take: 100,
    select: { id: true }
  });

  for (const session of sessions) {
    await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.paymentSession.updateMany({
        where: { id: session.id, status: "pending", expiresAt: { lte: now } },
        data: { status: "expired" }
      });
      if (claimed.count === 0) return;

      const reservations = await transaction.inventoryReservation.findMany({
        where: { paymentSessionId: session.id, status: "active" }
      });
      for (const reservation of reservations) {
        const released = await transaction.inventoryReservation.updateMany({
          where: { id: reservation.id, status: "active" },
          data: { status: "expired" }
        });
        if (released.count === 0) continue;
        const snapshotUpdated = await transaction.$executeRaw`
          UPDATE "inventory_snapshots"
          SET "quantityReserved" = "quantityReserved" - ${reservation.quantity},
              "updatedAt" = NOW()
          WHERE "skuId" = ${reservation.skuId}
            AND "dealerLocationId" IS NOT DISTINCT FROM ${reservation.dealerLocationId}
            AND "quantityReserved" >= ${reservation.quantity}
        `;
        if (snapshotUpdated !== 1) {
          throw new Error(`Failed to release inventory reservation ${reservation.id}.`);
        }
        await transaction.erpSyncJob.create({
          data: {
            type: "inventory_release",
            payload: {
              reservationId: reservation.id,
              skuId: reservation.skuId,
              dealerLocationId: reservation.dealerLocationId,
              quantity: reservation.quantity,
              reason: "reservation_expired"
            }
          }
        });
      }
    });
  }

  const standaloneReservations = await prisma.inventoryReservation.findMany({
    where: {
      paymentSessionId: null,
      status: "active",
      expiresAt: { lte: now }
    },
    orderBy: { expiresAt: "asc" },
    take: 100
  });

  for (const reservation of standaloneReservations) {
    await prisma.$transaction(async (transaction) => {
      const released = await transaction.inventoryReservation.updateMany({
        where: { id: reservation.id, status: "active" },
        data: { status: "expired" }
      });
      if (released.count === 0) return;
      await transaction.$executeRaw`
        UPDATE "inventory_snapshots"
        SET "quantityReserved" = "quantityReserved" - ${reservation.quantity},
            "updatedAt" = NOW()
        WHERE "skuId" = ${reservation.skuId}
          AND "dealerLocationId" IS NOT DISTINCT FROM ${reservation.dealerLocationId}
          AND "quantityReserved" >= ${reservation.quantity}
      `;
      await transaction.erpSyncJob.create({
        data: {
          type: "inventory_release",
          payload: {
            reservationId: reservation.id,
            skuId: reservation.skuId,
            dealerLocationId: reservation.dealerLocationId,
            quantity: reservation.quantity,
            reason: "reservation_expired"
          }
        }
      });
    });
  }
}

async function resolveSmtpConfig() {
  const account = await prisma.emailProviderAccount.findFirst({
    where: { key: "default_smtp", status: "enabled" }
  });
  const settings = account?.settings;
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    const record = settings as Record<string, unknown>;
    const host = typeof record.host === "string" ? record.host : undefined;
    const user = typeof record.user === "string" ? record.user : undefined;
    const encryptionKey = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim();
    let password = record.encryptedPassword && encryptionKey
      ? decryptSecret(record.encryptedPassword, encryptionKey)
      : undefined;
    if (!password && typeof record.password === "string" && encryptionKey && account) {
      password = record.password;
      const { password: _legacyPassword, ...safeSettings } = record;
      await prisma.emailProviderAccount.update({
        where: { id: account.id },
        data: { settings: { ...safeSettings, encryptedPassword: encryptSecret(password, encryptionKey) } }
      });
    }
    const from = typeof record.from === "string" ? record.from : undefined;
    const port = typeof record.port === "number" ? record.port : Number(record.port ?? 587);
    if (host && user && password && from && Number.isInteger(port)) {
      return {
        host,
        port,
        user,
        password,
        from,
        requireTls: record.requireTls !== false
      };
    }
  }
  return config.smtp;
}

async function getEmailTransport() {
  const smtp = await resolveSmtpConfig();
  if (!smtp) return undefined;

  return {
    from: smtp.from,
    transport: nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      requireTLS: smtp.requireTls && smtp.port !== 465,
      ignoreTLS: !smtp.requireTls,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      auth: { user: smtp.user, pass: smtp.password }
    })
  };
}

async function sendPendingEmails() {
  const configured = await getEmailTransport();
  if (!configured) {
    if (process.env.VANSTRO_RUNTIME_MODE !== "development") {
      console.error(
        JSON.stringify({
          service: "vanstro-worker",
          level: "error",
          message: "SMTP is not configured; email outbox items will not be delivered.",
          timestamp: new Date().toISOString()
        })
      );
    }
    return;
  }

  await prisma.emailOutbox.updateMany({
    where: { status: "running", lockedAt: { lte: new Date(Date.now() - config.emailLockTtlMs) } },
    data: { status: "retry_wait", nextRunAt: new Date(), lockedBy: null, lockedAt: null, lastError: "Worker lease expired before delivery completed." }
  });

  const items = await prisma.emailOutbox.findMany({
    where: {
      OR: [
        { status: "pending" },
        { status: "retry_wait", nextRunAt: { lte: new Date() } }
      ]
    },
    orderBy: { createdAt: "asc" },
    take: 20
  });
  if (items.length === 0) return;

  const suppressions = await prisma.emailSuppressionList.findMany({
    where: { email: { in: [...new Set(items.map((item) => item.toEmail))] } }
  });
  const suppressionByEmail = new Map(suppressions.map((entry) => [entry.email, entry]));
  const templateKeys = [...new Set(items.flatMap((item) =>
    item.templateKey && !suppressionByEmail.has(item.toEmail) ? [item.templateKey] : []
  ))];
  const templates = templateKeys.length === 0
    ? []
    : await prisma.emailTemplate.findMany({
        where: { key: { in: templateKeys } },
        include: {
          versions: {
            where: { isPublished: true },
            orderBy: { version: "desc" },
            take: 1
          }
        }
      });
  const templateByKey = new Map(templates.map((template) => [template.key, template]));

  for (const item of items) {
    const suppressed = suppressionByEmail.get(item.toEmail);
    if (suppressed) {
      await prisma.$transaction([
        prisma.emailEvent.create({ data: { emailOutboxId: item.id, eventType: "suppressed", payload: { reason: suppressed.reason } } }),
        prisma.emailOutbox.update({ where: { id: item.id }, data: { status: "cancelled", lastError: `Suppressed: ${suppressed.reason ?? "listed"}` } })
      ]);
      continue;
    }
    const claimed = await prisma.emailOutbox.updateMany({
      where: { id: item.id, status: item.status },
      data: { status: "running", lockedBy: "worker", lockedAt: new Date(), attemptCount: { increment: 1 } }
    });
    if (claimed.count === 0) continue;

    try {
      const template = item.templateKey ? templateByKey.get(item.templateKey) : undefined;
      const publishedVersion = template?.versions[0];
      const values = item.payload && typeof item.payload === "object" ? item.payload as Record<string, unknown> : {};
      const render = (value: string) => value.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => String(values[key] ?? ""));
      const subject = publishedVersion ? render(publishedVersion.subject) : item.subject ?? item.templateKey ?? "VanStro notification";
      const text = publishedVersion?.bodyText ? render(publishedVersion.bodyText) : item.payload ? JSON.stringify(item.payload, null, 2) : "VanStro notification";
      const html = publishedVersion?.bodyHtml ? render(publishedVersion.bodyHtml) : undefined;
      const messageId = `<${item.id}@vanstro.local>`;
      const delivery = await configured.transport.sendMail({
        from: configured.from,
        to: item.toEmail,
        messageId,
        subject,
        text,
        html
      });
      await prisma.$transaction([
        prisma.emailDeliveryAttempt.create({ data: { emailOutboxId: item.id, provider: "smtp", success: true } }),
        prisma.emailEvent.create({ data: { emailOutboxId: item.id, eventType: "sent", payload: { messageId: delivery.messageId } } }),
        prisma.emailOutbox.updateMany({ where: { id: item.id, status: "running", lockedBy: "worker" }, data: { status: "sent", lastError: null, nextRunAt: null, lockedBy: null, lockedAt: null } })
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SMTP delivery failed.";
      const nextAttempt = item.attemptCount + 1;
      const exhausted = nextAttempt >= config.maxEmailAttempts;
      const retryDelayMs = 5 * 60 * 1000 * 2 ** Math.max(0, nextAttempt - 1);
      console.error(
        JSON.stringify({
          service: "vanstro-worker",
          level: "error",
          message: "Email delivery failed.",
          emailOutboxId: item.id,
          templateKey: item.templateKey,
          attempt: nextAttempt,
          error: message,
          timestamp: new Date().toISOString()
        })
      );
      await prisma.$transaction([
        prisma.emailDeliveryAttempt.create({ data: { emailOutboxId: item.id, provider: "smtp", success: false, error: message } }),
        prisma.emailEvent.create({ data: { emailOutboxId: item.id, eventType: "failed", payload: { error: message } } }),
        prisma.emailOutbox.updateMany({ where: { id: item.id, status: "running", lockedBy: "worker" }, data: { status: exhausted ? "failed" : "retry_wait", lastError: message, nextRunAt: exhausted ? null : new Date(Date.now() + retryDelayMs), lockedBy: null, lockedAt: null } })
      ]);
    }
  }
}

async function pushPendingErpOrders() {
  if (!config.erp) return;

  await prisma.erpSyncJob.updateMany({
    where: {
      status: "running",
      lockedAt: { lte: new Date(Date.now() - config.erp.lockTtlMs) }
    },
    data: {
      status: "retry_wait",
      nextRunAt: new Date(),
      lockedBy: null,
      lockedAt: null,
      lastError: "Worker lease expired before ERP delivery completed."
    }
  });

  const jobs = await prisma.erpSyncJob.findMany({
    where: {
      type: "order_create",
      OR: [
        { status: "pending" },
        { status: "retry_wait", nextRunAt: { lte: new Date() } }
      ]
    },
    orderBy: { createdAt: "asc" },
    take: 10
  });

  const orderIds = jobs.flatMap((job) => {
    const orderId = typeof job.payload === "object" && job.payload && "orderId" in job.payload
      ? String(job.payload.orderId)
      : undefined;
    return orderId ? [orderId] : [];
  });
  const orders = orderIds.length === 0
    ? []
    : await prisma.order.findMany({
        where: { id: { in: [...new Set(orderIds)] } },
        include: { items: true }
      });
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const dealerLocationIds = [...new Set(orders.map((order) => order.dealerLocationId).filter((id): id is string => Boolean(id)))];
  const dealerLocations = dealerLocationIds.length
    ? await prisma.dealerLocation.findMany({
        where: { id: { in: dealerLocationIds } },
        include: { erpLinks: true, dealer: { include: { erpLinks: true } } }
      })
    : [];
  const dealerLocationById = new Map(dealerLocations.map((location) => [location.id, location]));
  const skuIds = [
    ...new Set(
      orders.flatMap((order) => order.items.map((item) => item.skuId).filter((id): id is string => Boolean(id)))
    )
  ];
  const mappings = skuIds.length
    ? await prisma.productSkuErpMapping.findMany({ where: { skuId: { in: skuIds } } })
    : [];
  const mappingBySkuId = new Map(mappings.map((mapping) => [mapping.skuId, mapping]));

  for (const job of jobs) {
    const orderId = typeof job.payload === "object" && job.payload && "orderId" in job.payload
      ? String(job.payload.orderId)
      : undefined;
    if (!orderId) {
      await prisma.erpSyncJob.update({ where: { id: job.id }, data: { status: "cancelled", lastError: "ERP sync job is missing an orderId." } });
      continue;
    }

    const order = orderById.get(orderId);
    if (!order) {
      await prisma.erpSyncJob.update({ where: { id: job.id }, data: { status: "cancelled", lastError: "Platform order no longer exists." } });
      continue;
    }

    const claimed = await prisma.erpSyncJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "running", lockedBy: "worker", lockedAt: new Date(), attemptCount: { increment: 1 } }
    });
    if (claimed.count === 0) continue;
    try {
      const dealerLocation = order.dealerLocationId ? dealerLocationById.get(order.dealerLocationId) : undefined;
      const erpLocationId =
        dealerLocation?.erpLinks[0]?.erpLocationId ??
        dealerLocation?.dealer.erpLinks[0]?.erpLocationId ??
        null;
      const response = await fetch(`${config.erp.baseUrl}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.erp.serviceToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": order.id
        },
        body: JSON.stringify({
          externalOrderId: order.id,
          email: order.email,
          firstName: order.firstName,
          lastName: order.lastName,
          phone: order.phone,
          fulfillment: order.fulfillment,
          paymentMethod: order.paymentMethod,
          dealerLocationId: order.dealerLocationId,
          erpLocationId,
          subtotalCents: order.subtotalCents,
          discountCents: order.discountCents,
          promotionKey: order.promotionKey,
          taxCents: order.taxCents,
          shippingCents: order.shippingCents,
          totalCents: order.totalCents,
          currency: order.currency,
          items: order.items.map((item) => {
            const mapping = item.skuId ? mappingBySkuId.get(item.skuId) : undefined;
            return {
              skuCode: item.skuCode,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              erpSkuKey: mapping?.erpSkuKey ?? null,
              erpSkuId: mapping?.erpSkuId ?? null
            };
          }),
          inventoryLines: order.items.map((item) => ({
            skuId: item.skuId,
            dealerLocationId: order.dealerLocationId,
            quantity: item.quantity
          }))
        }),
        signal: AbortSignal.timeout(10_000)
      });
      const body = (await response.json().catch(() => null)) as { erpOrderId?: unknown } | null;
      if (!response.ok || typeof body?.erpOrderId !== "string") throw new Error(`ERP order create failed with ${response.status}.`);
      const erpOrderId = body.erpOrderId;
      await prisma.$transaction([
        prisma.erpOrderLink.upsert({ where: { websiteOrderId: order.id }, update: { erpOrderId, erpSystem: "configured-erp" }, create: { websiteOrderId: order.id, erpOrderId, erpSystem: "configured-erp" } }),
        prisma.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: true, request: { orderId: order.id }, response: { erpOrderId } } }),
        prisma.erpSyncJob.update({ where: { id: job.id }, data: { status: "succeeded", externalId: erpOrderId, lockedBy: null, lockedAt: null } })
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ERP order create failed.";
      const exhausted = job.attemptCount + 1 >= config.erp.maxAttempts;
      await prisma.$transaction([
        prisma.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: false, error: message } }),
        prisma.erpSyncJob.update({
          where: { id: job.id },
          data: {
            status: exhausted ? "failed" : "retry_wait",
            lastError: message,
            nextRunAt: exhausted ? null : new Date(Date.now() + 5 * 60 * 1000),
            lockedBy: null,
            lockedAt: null
          }
        })
      ]);
    }
  }
}

// Shared retry/backoff bookkeeping for a failed ERP job attempt.
async function recordErpFailure(jobId: string, attemptCount: number, maxAttempts: number, error: unknown) {
  const message = error instanceof Error ? error.message : "ERP sync failed.";
  const exhausted = attemptCount + 1 >= maxAttempts;
  await prisma.$transaction([
    prisma.erpSyncAttempt.create({ data: { erpSyncJobId: jobId, success: false, error: message } }),
    prisma.erpSyncJob.update({
      where: { id: jobId },
      data: {
        status: exhausted ? "failed" : "retry_wait",
        lastError: message,
        nextRunAt: exhausted ? null : new Date(Date.now() + 5 * 60 * 1000),
        lockedBy: null,
        lockedAt: null
      }
    })
  ]);
}

async function pushPendingErpCustomerSync() {
  if (!config.erp) return;
  const erp = config.erp;

  const jobs = await prisma.erpSyncJob.findMany({
    where: { type: "customer_sync", OR: [{ status: "pending" }, { status: "retry_wait", nextRunAt: { lte: new Date() } }] },
    orderBy: { createdAt: "asc" },
    take: 10
  });

  for (const job of jobs) {
    const payload = typeof job.payload === "object" && job.payload ? (job.payload as { userId?: unknown }) : {};
    const userId = typeof payload.userId === "string" ? payload.userId : undefined;
    const claimed = await prisma.erpSyncJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "running", lockedBy: "worker", lockedAt: new Date(), attemptCount: { increment: 1 } }
    });
    if (claimed.count === 0) continue;
    try {
      const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }) : null;
      if (!user) {
        await prisma.erpSyncJob.update({ where: { id: job.id }, data: { status: "cancelled", lastError: "Customer no longer exists." } });
        continue;
      }
      const response = await fetch(`${erp.baseUrl}/customers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${erp.serviceToken}`, "Content-Type": "application/json", "Idempotency-Key": user.id },
        body: JSON.stringify({ externalUserId: user.id, email: user.email }),
        signal: AbortSignal.timeout(10_000)
      });
      const body = (await response.json().catch(() => null)) as { erpCustomerId?: unknown } | null;
      if (!response.ok || typeof body?.erpCustomerId !== "string") throw new Error(`ERP customer sync failed with ${response.status}.`);
      const erpCustomerId = body.erpCustomerId;
      await prisma.$transaction([
        prisma.erpCustomerLink.upsert({
          where: { erpSystem_erpCustomerId: { erpSystem: "configured-erp", erpCustomerId } },
          update: { customerUserId: user.id, websiteEmail: user.email },
          create: { customerUserId: user.id, websiteEmail: user.email, erpCustomerId, erpSystem: "configured-erp" }
        }),
        prisma.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: true, response: { erpCustomerId } } }),
        prisma.erpSyncJob.update({ where: { id: job.id }, data: { status: "succeeded", externalId: erpCustomerId, lockedBy: null, lockedAt: null } })
      ]);
    } catch (error) {
      await recordErpFailure(job.id, job.attemptCount, erp.maxAttempts, error);
    }
  }
}

async function pushPendingErpInventoryRelease() {
  if (!config.erp) return;
  const erp = config.erp;

  const jobs = await prisma.erpSyncJob.findMany({
    where: { type: "inventory_release", OR: [{ status: "pending" }, { status: "retry_wait", nextRunAt: { lte: new Date() } }] },
    orderBy: { createdAt: "asc" },
    take: 10
  });

  for (const job of jobs) {
    const claimed = await prisma.erpSyncJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "running", lockedBy: "worker", lockedAt: new Date(), attemptCount: { increment: 1 } }
    });
    if (claimed.count === 0) continue;
    try {
      const requestBody = { jobId: job.id, ...(typeof job.payload === "object" && job.payload ? (job.payload as Record<string, unknown>) : {}) };
      const response = await fetch(`${erp.baseUrl}/inventory/release`, {
        method: "POST",
        headers: { Authorization: `Bearer ${erp.serviceToken}`, "Content-Type": "application/json", "Idempotency-Key": job.id },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10_000)
      });
      const body = (await response.json().catch(() => null)) as { ok?: unknown } | null;
      if (!response.ok || body?.ok !== true) throw new Error(`ERP inventory release failed with ${response.status}.`);
      await prisma.$transaction([
        prisma.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: true, request: requestBody } }),
        prisma.erpSyncJob.update({ where: { id: job.id }, data: { status: "succeeded", lockedBy: null, lockedAt: null } })
      ]);
    } catch (error) {
      await recordErpFailure(job.id, job.attemptCount, erp.maxAttempts, error);
    }
  }
}

async function maybeSyncCatalogFromErp() {
  const apiBase = process.env.VANSTRO_API_BASE_URL?.replace(/\/$/, "");
  const token = process.env.VANSTRO_SERVICE_ACCOUNT_TOKEN?.trim();
  if (!apiBase || !token) return;

  const latest = await prisma.catalogSyncRun.findFirst({ orderBy: { startedAt: "desc" } });
  if (latest) {
    const elapsed = Date.now() - latest.startedAt.getTime();
    if (latest.status === "succeeded" && elapsed < config.catalogSyncIntervalMs) return;
    if (latest.status === "failed" && elapsed < Math.min(config.catalogSyncIntervalMs, 15 * 60 * 1000)) return;
    if (latest.status === "running" && elapsed < 15 * 60 * 1000) return;
  }

  await prisma.catalogSyncRun.updateMany({
    where: {
      source: "scheduled",
      status: "running",
      startedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) }
    },
    data: {
      status: "failed",
      error: "Scheduled catalog sync lease expired.",
      finishedAt: new Date()
    }
  });
  const run = await prisma.catalogSyncRun.create({
    data: { status: "running", source: "scheduled" }
  }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return undefined;
    }
    throw error;
  });
  if (!run) return;

  try {
    const response = await fetch(`${apiBase}/dashboard/catalog/sync-from-erp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(120_000)
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: { imported?: number; updated?: number; errors?: string[] };
      error?: string;
    } | null;
    if (!response.ok || payload?.data?.errors?.length) {
      throw new Error(payload?.error ?? payload?.data?.errors?.slice(0, 10).join("; ") ?? `Catalog sync failed with HTTP ${response.status}.`);
    }
    const upserted = Number(payload?.data?.imported ?? 0) + Number(payload?.data?.updated ?? 0);
    await prisma.catalogSyncRun.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        productsUpserted: upserted,
        finishedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.catalogSyncRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date()
      }
    });
  }
}

async function processPrivacyRequests() {
  const requests = await prisma.privacyRequest.findMany({
    where: { status: "pending", type: "account_deletion" },
    orderBy: { requestedAt: "asc" },
    take: 10
  });
  for (const request of requests) {
    try {
      await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.privacyRequest.updateMany({
          where: { id: request.id, status: "pending" },
          data: { status: "processing" }
        });
        if (claimed.count !== 1) return;
        const anonymizedEmail = `deleted-${request.userId}@privacy.invalid`;
        await transaction.customerAddress.deleteMany({ where: { userId: request.userId } });
        await transaction.favorite.deleteMany({ where: { userId: request.userId } });
        await transaction.refreshSession.updateMany({ where: { userId: request.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await transaction.paymentSession.updateMany({ where: { userId: request.userId }, data: { userId: null, guestEmail: anonymizedEmail, guestFirstName: "Deleted", guestLastName: "User", guestPhone: "deleted" } });
        await transaction.order.updateMany({ where: { userId: request.userId }, data: { userId: null, email: anonymizedEmail, firstName: "Deleted", lastName: "User", phone: "deleted", notes: null, guestTokenRevokedAt: new Date() } });
        await transaction.crmContact.updateMany({ where: { userId: request.userId }, data: { userId: null, email: anonymizedEmail, firstName: null, lastName: null, phone: null } });
        await transaction.emailOutbox.updateMany({ where: { toEmail: request.email }, data: { toEmail: anonymizedEmail, payload: Prisma.DbNull } });
        await transaction.user.update({ where: { id: request.userId }, data: { email: anonymizedEmail, status: "archived" } });
        await transaction.customerProfile.updateMany({ where: { userId: request.userId }, data: { firstName: null, lastName: null, phone: null } });
        await transaction.passwordCredential.deleteMany({ where: { userId: request.userId } });
        await transaction.privacyRequest.update({ where: { id: request.id }, data: { status: "completed", completedAt: new Date(), error: null } });
      });
    } catch (error) {
      await prisma.privacyRequest.update({
        where: { id: request.id },
        data: { status: "failed", error: error instanceof Error ? error.message : String(error) }
      });
    }
  }
}

const WORKER_HANDLERS = [
  ["release-expired-reservations", releaseExpiredReservations],
  ["delete-expired-consent-events", () => deleteExpiredConsentEvents(prisma)],
  ["apply-data-retention", () => applyDataRetention(prisma)],
  ["process-privacy-requests", processPrivacyRequests],
  ["send-pending-emails", sendPendingEmails],
  ["push-pending-erp-orders", pushPendingErpOrders],
  ["push-pending-erp-customers", pushPendingErpCustomerSync],
  ["push-pending-erp-inventory", pushPendingErpInventoryRelease],
  ["sync-catalog", maybeSyncCatalogFromErp],
  ["read-job-backlog", readJobBacklog]
] as const;

async function tick() {
  let succeeded = true;
  for (const [name, handler] of WORKER_HANDLERS) {
    try {
      await handler();
    } catch (error) {
      succeeded = false;
      console.error(
        JSON.stringify({
          service: "vanstro-worker",
          level: "error",
          handler: name,
          message: "Worker handler failed.",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
      );
    }
  }
  return succeeded;
}

function shutdown() {
  shutdownRequested = true;

  if (sleepTimeout) {
    clearTimeout(sleepTimeout);
    sleepTimeout = undefined;
  }

  wakeSleep?.();
  wakeSleep = undefined;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const firstTickSucceeded = await tick();

if (runOnce) {
  await prisma.$disconnect();
  process.exit(firstTickSucceeded ? 0 : 1);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    wakeSleep = resolve;
    sleepTimeout = setTimeout(() => {
      sleepTimeout = undefined;
      wakeSleep = undefined;
      resolve();
    }, ms);
  });
}

async function pollForever() {
  while (!shutdownRequested) {
    await sleep(config.pollIntervalMs);

    if (!shutdownRequested) {
      await tick();
    }
  }
}

pollForever()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Worker shutdown failed.", error);
    await prisma.$disconnect();
    process.exit(1);
  });
