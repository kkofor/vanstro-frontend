import { applyDataRetention, decryptSecret, deleteExpiredConsentEvents, encryptSecret, heartbeatWorkerLifecycle, Prisma, prisma, registerWorkerLifecycle, transitionWorkerLifecycle, type WorkerAuthority } from "@vanstro/db";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { loadWorkerConfig } from "./config.js";
import { resolveEmailPayload } from "./email-payload.js";
import { dispatchConfiguredP08Jobs, dispatchFoundationJobs, dispatchMediaJobs } from "./async-job-dispatcher.js";

const config = loadWorkerConfig();
const runOnce = process.argv.includes("--once");
let shutdownRequested = false;
let sleepTimeout: NodeJS.Timeout | undefined;
let wakeSleep: (() => void) | undefined;
const shutdownController = new AbortController();
const workerInstanceId = `worker-${process.pid}-${randomUUID()}`;
const workerClaimCapacity = Math.max(0, Math.min(1024, Number.parseInt(process.env.VANSTRO_WORKER_CLAIM_CAPACITY ?? "1", 10) || 0));
let workerAuthority: WorkerAuthority | undefined;

function requestSignal(timeoutMs: number) {
  return AbortSignal.any([shutdownController.signal, AbortSignal.timeout(timeoutMs)]);
}

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
    where: {
      status: "pending",
      expiresAt: { lte: now },
      paymentEvents: { none: { type: "provider_confirmed" } }
    },
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
      const snapshotUpdated = await transaction.$executeRaw`
        UPDATE "inventory_snapshots"
        SET "quantityReserved" = "quantityReserved" - ${reservation.quantity},
            "updatedAt" = NOW()
        WHERE "skuId" = ${reservation.skuId}
          AND "dealerLocationId" IS NOT DISTINCT FROM ${reservation.dealerLocationId}
          AND "quantityReserved" >= ${reservation.quantity}
      `;
      if (snapshotUpdated !== 1) {
        throw new Error(`Failed to release standalone inventory reservation ${reservation.id}.`);
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
    if (process.env.VANSTRO_RUNTIME_MODE === "deployment" && record.requireTls === false) {
      throw new Error("Stored SMTP settings must require TLS in deployment mode.");
    }
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
      data: { status: "running", lockedBy: workerInstanceId, lockedAt: new Date(), attemptCount: { increment: 1 } }
    });
    if (claimed.count === 0) continue;

    try {
      const template = item.templateKey ? templateByKey.get(item.templateKey) : undefined;
      const publishedVersion = template?.versions[0];
      const securityEmail = item.templateKey === "password_reset" || item.templateKey === "password_reset_fr";
      if (securityEmail && !publishedVersion) {
        throw new Error(`Published email template is required for ${item.templateKey}.`);
      }
      const values = resolveEmailPayload(
        item.payload,
        process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim()
      );
      const render = (value: string) => value.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => String(values[key] ?? ""));
      const subject = publishedVersion ? render(publishedVersion.subject) : item.subject ?? item.templateKey ?? "VanStro notification";
      const text = publishedVersion?.bodyText
        ? render(publishedVersion.bodyText)
        : Object.keys(values).length > 0
          ? JSON.stringify(values, null, 2)
          : "VanStro notification";
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
        prisma.emailOutbox.updateMany({
          where: { id: item.id, status: "running", lockedBy: workerInstanceId },
          data: {
            status: "sent",
            lastError: null,
            nextRunAt: null,
            lockedBy: null,
            lockedAt: null,
            ...(securityEmail ? { payload: Prisma.DbNull } : {})
          }
        })
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
        prisma.emailOutbox.updateMany({ where: { id: item.id, status: "running", lockedBy: workerInstanceId }, data: { status: exhausted ? "failed" : "retry_wait", lastError: message, nextRunAt: exhausted ? null : new Date(Date.now() + retryDelayMs), lockedBy: null, lockedAt: null } })
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
      data: { status: "running", lockedBy: workerInstanceId, lockedAt: new Date(), attemptCount: { increment: 1 } }
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
        signal: requestSignal(10_000)
      });
      const body = (await response.json().catch(() => null)) as { erpOrderId?: unknown } | null;
      if (!response.ok || typeof body?.erpOrderId !== "string") throw new Error(`ERP order create failed with ${response.status}.`);
      const erpOrderId = body.erpOrderId;
      await prisma.$transaction(async (transaction) => {
        const fenced = await transaction.erpSyncJob.updateMany({
          where: { id: job.id, status: "running", lockedBy: workerInstanceId },
          data: { status: "succeeded", externalId: erpOrderId, lockedBy: null, lockedAt: null }
        });
        if (fenced.count !== 1) throw new Error("ERP order lease was lost before acknowledgement.");
        await transaction.erpOrderLink.upsert({ where: { websiteOrderId: order.id }, update: { erpOrderId, erpSystem: "configured-erp" }, create: { websiteOrderId: order.id, erpOrderId, erpSystem: "configured-erp" } });
        await transaction.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: true, request: { orderId: order.id }, response: { erpOrderId } } });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ERP order create failed.";
      const exhausted = job.attemptCount + 1 >= config.erp.maxAttempts;
      await prisma.$transaction([
        prisma.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: false, error: message } }),
        prisma.erpSyncJob.updateMany({
          where: { id: job.id, status: "running", lockedBy: workerInstanceId },
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
async function recordErpFailure(jobId: string, attemptCount: number, maxAttempts: number, error: unknown, leaseOwner = workerInstanceId) {
  const message = error instanceof Error ? error.message : "ERP sync failed.";
  const exhausted = attemptCount + 1 >= maxAttempts;
  return prisma.$transaction(async (transaction) => {
    const fenced = await transaction.erpSyncJob.updateMany({
      where: { id: jobId, status: "running", lockedBy: leaseOwner },
      data: {
        status: exhausted ? "failed" : "retry_wait",
        lastError: message,
        nextRunAt: exhausted ? null : new Date(Date.now() + 5 * 60 * 1000),
        lockedBy: null,
        lockedAt: null
      }
    });
    if (fenced.count !== 1) return false;
    await transaction.erpSyncAttempt.create({ data: { erpSyncJobId: jobId, success: false, error: message } });
    return true;
  });
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
    const payload = typeof job.payload === "object" && job.payload ? (job.payload as { userId?: unknown; contactId?: unknown }) : {};
    const userId = typeof payload.userId === "string" ? payload.userId : undefined;
    const claimed = await prisma.erpSyncJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "running", lockedBy: workerInstanceId, lockedAt: new Date(), attemptCount: { increment: 1 } }
    });
    if (claimed.count === 0) continue;
    try {
      const contactId = typeof payload.contactId === "string" ? payload.contactId : undefined;
      const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, customerProfile: { select: { firstName: true, lastName: true, phone: true } } }
      }) : null;
      if (!user) {
        await prisma.erpSyncJob.update({ where: { id: job.id }, data: { status: "cancelled", lastError: "Customer no longer exists." } });
        continue;
      }
      const response = await fetch(`${erp.baseUrl}/customers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${erp.serviceToken}`, "Content-Type": "application/json", "Idempotency-Key": user.id },
        body: JSON.stringify({
          externalUserId: user.id,
          email: user.email,
          firstName: user.customerProfile?.firstName ?? null,
          lastName: user.customerProfile?.lastName ?? null,
          phone: user.customerProfile?.phone ?? null
        }),
        signal: requestSignal(10_000)
      });
      const body = (await response.json().catch(() => null)) as { erpCustomerId?: unknown } | null;
      if (!response.ok || typeof body?.erpCustomerId !== "string") throw new Error(`ERP customer sync failed with ${response.status}.`);
      const erpCustomerId = body.erpCustomerId;
      await prisma.$transaction(async (transaction) => {
        const fenced = await transaction.erpSyncJob.updateMany({ where: { id: job.id, status: "running", lockedBy: workerInstanceId }, data: { status: "succeeded", externalId: erpCustomerId, lockedBy: null, lockedAt: null } });
        if (fenced.count !== 1) throw new Error("ERP customer lease was lost before acknowledgement.");
        await transaction.erpCustomerLink.upsert({
          where: { erpSystem_erpCustomerId: { erpSystem: "configured-erp", erpCustomerId } },
          update: { customerUserId: user.id, websiteEmail: user.email },
          create: { customerUserId: user.id, websiteEmail: user.email, erpCustomerId, erpSystem: "configured-erp" }
        });
        await transaction.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: true, response: { erpCustomerId } } });
        if (contactId) {
          await transaction.crmContact.updateMany({ where: { id: contactId }, data: { erpSyncStatus: "synced", lastActivityAt: new Date() } });
          await transaction.crmContactEvent.create({ data: { contactId, type: "erp_promoted", payload: { status: "synced", erpCustomerId } } });
        }
      });
    } catch (error) {
      const failureRecorded = await recordErpFailure(job.id, job.attemptCount, erp.maxAttempts, error);
      const contactId = typeof payload.contactId === "string" ? payload.contactId : undefined;
      if (failureRecorded && contactId && job.attemptCount + 1 >= erp.maxAttempts) {
        await prisma.$transaction(async (transaction) => {
          const stillFailed = await transaction.erpSyncJob.findFirst({ where: { id: job.id, status: "failed" }, select: { id: true } });
          if (!stillFailed) return;
          await transaction.crmContact.updateMany({ where: { id: contactId, erpSyncStatus: { not: "synced" } }, data: { erpSyncStatus: "failed", lastActivityAt: new Date() } });
          await transaction.crmContactEvent.create({ data: { contactId, type: "erp_promoted", payload: { status: "failed" } } });
        });
      }
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
      data: { status: "running", lockedBy: workerInstanceId, lockedAt: new Date(), attemptCount: { increment: 1 } }
    });
    if (claimed.count === 0) continue;
    try {
      const requestBody = { jobId: job.id, ...(typeof job.payload === "object" && job.payload ? (job.payload as Record<string, unknown>) : {}) };
      const response = await fetch(`${erp.baseUrl}/inventory/release`, {
        method: "POST",
        headers: { Authorization: `Bearer ${erp.serviceToken}`, "Content-Type": "application/json", "Idempotency-Key": job.id },
        body: JSON.stringify(requestBody),
        signal: requestSignal(10_000)
      });
      const body = (await response.json().catch(() => null)) as { ok?: unknown } | null;
      if (!response.ok || body?.ok !== true) throw new Error(`ERP inventory release failed with ${response.status}.`);
      await prisma.$transaction(async (transaction) => {
        const fenced = await transaction.erpSyncJob.updateMany({ where: { id: job.id, status: "running", lockedBy: workerInstanceId }, data: { status: "succeeded", lockedBy: null, lockedAt: null } });
        if (fenced.count !== 1) throw new Error("ERP inventory lease was lost before acknowledgement.");
        await transaction.erpSyncAttempt.create({ data: { erpSyncJobId: job.id, success: true, request: requestBody } });
      });
    } catch (error) {
      await recordErpFailure(job.id, job.attemptCount, erp.maxAttempts, error);
    }
  }
}

async function recoverConfirmedPayments() {
  const apiBase = process.env.VANSTRO_API_BASE_URL?.replace(/\/$/, "");
  const token = process.env.VANSTRO_SERVICE_ACCOUNT_TOKEN?.trim();
  if (!apiBase || !token) return;
  const response = await fetch(`${apiBase}/integrations/payments/recover`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: requestSignal(30_000)
  });
  if (!response.ok) throw new Error(`Payment recovery failed with HTTP ${response.status}.`);
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

  const response = await fetch(`${apiBase}/integrations/erp/catalog/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ syncCategories: true }),
    signal: requestSignal(120_000)
  });
  if (response.status === 409) return;
  const payload = (await response.json().catch(() => null)) as {
    data?: { errors?: string[] };
    error?: string;
  } | null;
  if (!response.ok || payload?.data?.errors?.length) {
    throw new Error(payload?.error ?? payload?.data?.errors?.slice(0, 10).join("; ") ?? `Catalog sync failed with HTTP ${response.status}.`);
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
        const email = request.email.trim().toLowerCase();
        await transaction.contactLead.updateMany({ where: { email }, data: { name: "Deleted User", email: anonymizedEmail, phone: null, city: null, preferredDealer: null, orderNumber: null, message: "Deleted", rawPayload: Prisma.DbNull } });
        await transaction.dealerApplication.updateMany({ where: { email }, data: { contactName: "Deleted User", email: anonymizedEmail, phone: "deleted", website: null, serviceArea: null, message: null, rawPayload: Prisma.DbNull } });
        await transaction.productReview.updateMany({ where: { email }, data: { email: anonymizedEmail, nickname: "Deleted User", title: null, body: "Deleted", topics: Prisma.DbNull } });
        await transaction.loginEvent.updateMany({ where: { OR: [{ userId: request.userId }, { email }] }, data: { userId: null, email: anonymizedEmail, ipAddress: null, userAgent: null } });
        await transaction.auditLog.updateMany({ where: { actorUserId: request.userId }, data: { actorUserId: null, metadata: Prisma.DbNull, ipAddress: null, userAgent: null } });
        await transaction.emailSuppressionList.updateMany({ where: { email }, data: { email: anonymizedEmail, reason: "Account deleted" } });
        await transaction.erpCustomerLink.updateMany({ where: { OR: [{ customerUserId: request.userId }, { websiteEmail: email }] }, data: { customerUserId: null, websiteEmail: anonymizedEmail } });
        await transaction.customerAddress.deleteMany({ where: { userId: request.userId } });
        await transaction.favorite.deleteMany({ where: { userId: request.userId } });
        await transaction.refreshSession.updateMany({ where: { userId: request.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await transaction.paymentSession.updateMany({ where: { userId: request.userId }, data: { userId: null, guestEmail: anonymizedEmail, guestFirstName: "Deleted", guestLastName: "User", guestPhone: "deleted" } });
        await transaction.order.updateMany({ where: { userId: request.userId }, data: { userId: null, email: anonymizedEmail, firstName: "Deleted", lastName: "User", phone: "deleted", notes: null, guestTokenRevokedAt: new Date() } });
        await transaction.crmContact.updateMany({ where: { userId: request.userId }, data: { userId: null, email: anonymizedEmail, firstName: null, lastName: null, phone: null } });
        await transaction.emailOutbox.updateMany({ where: { toEmail: email }, data: { toEmail: anonymizedEmail, payload: Prisma.DbNull, subject: null, lastError: null } });
        const relatedErpJobs = await transaction.erpSyncJob.findMany({
          where: {
            OR: [
              { payload: { path: ["userId"], equals: request.userId } },
              { payload: { path: ["email"], equals: email } }
            ]
          },
          select: { id: true }
        });
        if (relatedErpJobs.length) {
          const jobIds = relatedErpJobs.map((job) => job.id);
          await transaction.erpSyncAttempt.updateMany({ where: { erpSyncJobId: { in: jobIds } }, data: { request: Prisma.DbNull, response: Prisma.DbNull, error: null } });
          await transaction.erpSyncJob.updateMany({ where: { id: { in: jobIds } }, data: { payload: { subjectDeleted: true }, lastError: null } });
        }
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
  ["recover-confirmed-payments", recoverConfirmedPayments],
  ["release-expired-reservations", releaseExpiredReservations],
  ["delete-expired-consent-events", () => deleteExpiredConsentEvents(prisma)],
  ["apply-data-retention", () => applyDataRetention(prisma)],
  ["process-privacy-requests", processPrivacyRequests],
  ["send-pending-emails", sendPendingEmails],
  ["push-pending-erp-orders", pushPendingErpOrders],
  ["push-pending-erp-customers", pushPendingErpCustomerSync],
  ["push-pending-erp-inventory", pushPendingErpInventoryRelease],
  ["sync-catalog", maybeSyncCatalogFromErp],
  ["read-job-backlog", readJobBacklog],
  ["dispatch-async-jobs", async () => { const runtimeMode = process.env.VANSTRO_RUNTIME_MODE ?? "deployment"; await dispatchMediaJobs({runtimeMode,workerId:workerInstanceId,privateRoot:process.env.MEDIA_PRIVATE_ROOT,deploymentEnvironmentId:process.env.MEDIA_DEPLOYMENT_ENVIRONMENT_ID,sandboxImageDigest:process.env.MEDIA_SANDBOX_IMAGE_DIGEST,parserDigest:process.env.MEDIA_PARSER_DIGEST,securityPolicyDigest:process.env.MEDIA_SECURITY_POLICY_DIGEST,imageConfigDigest:process.env.MEDIA_IMAGE_CONFIG_DIGEST,pdfConfigDigest:process.env.MEDIA_PDF_CONFIG_DIGEST,launcher:process.env.MEDIA_SANDBOX_LAUNCHER,parserScript:process.env.MEDIA_PARSER_SCRIPT,jobKeysetRaw:process.env.ASYNC_JOB_IDEMPOTENCY_KEYS}); await dispatchConfiguredP08Jobs({ runtimeMode, workerId: workerInstanceId }); return dispatchFoundationJobs({ runtimeMode, workerId: workerInstanceId, signal: shutdownController.signal }) }]
] as const;

async function tick() {
  if (!workerAuthority) workerAuthority = await registerWorkerLifecycle(prisma,{instanceId:workerInstanceId,capacity:workerClaimCapacity});
  else if (workerAuthority.state === "active") workerAuthority = await heartbeatWorkerLifecycle(prisma,workerAuthority,workerClaimCapacity);
  let succeeded = true;
  let lastError: string | undefined;
  for (const [name, handler] of WORKER_HANDLERS) {
    try {
      await handler();
    } catch (error) {
      succeeded = false;
      lastError = `${name}: ${error instanceof Error ? error.message : String(error)}`;
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
  if (workerAuthority?.state === "active") workerAuthority = await heartbeatWorkerLifecycle(prisma,workerAuthority,succeeded?workerClaimCapacity:0);
  return succeeded;
}

function shutdown() {
  shutdownRequested = true;
  if (workerAuthority?.state === "active") void transitionWorkerLifecycle(prisma,workerAuthority,"draining").then(value=>{workerAuthority=value}).catch(()=>undefined);
  shutdownController.abort(new Error("Worker shutdown requested."));

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
  if (workerAuthority?.state === "active") workerAuthority = await transitionWorkerLifecycle(prisma,workerAuthority,"draining");
  if (workerAuthority?.state === "draining") workerAuthority = await transitionWorkerLifecycle(prisma,workerAuthority,"shutdown");
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
  let consecutiveFailedTicks = firstTickSucceeded ? 0 : 1;
  while (!shutdownRequested) {
    await sleep(config.pollIntervalMs);

    if (!shutdownRequested) {
      const succeeded = await tick();
      consecutiveFailedTicks = succeeded ? 0 : consecutiveFailedTicks + 1;
      if (consecutiveFailedTicks >= 3) {
        throw new Error("Worker failed three consecutive ticks.");
      }
    }
  }
}

pollForever()
  .then(async()=>{if(workerAuthority?.state==="active")workerAuthority=await transitionWorkerLifecycle(prisma,workerAuthority,"draining");if(workerAuthority?.state==="draining")workerAuthority=await transitionWorkerLifecycle(prisma,workerAuthority,"shutdown")})
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Worker shutdown failed.", error);
    await prisma.$disconnect();
    process.exit(1);
  });
