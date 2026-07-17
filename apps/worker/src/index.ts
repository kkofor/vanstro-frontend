import { prisma } from "@vanstro/db";
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
  const reservations = await prisma.inventoryReservation.findMany({
    where: { status: "active", expiresAt: { lte: new Date() } },
    orderBy: { expiresAt: "asc" },
    take: 100
  });

  for (const reservation of reservations) {
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.inventoryReservation.updateMany({
        where: { id: reservation.id, status: "active" },
        data: { status: "expired" }
      });
      if (updated.count === 0) return;
      const snapshot = await transaction.inventorySnapshot.findFirst({
        where: { skuId: reservation.skuId, dealerLocationId: reservation.dealerLocationId }
      });
      if (snapshot) {
        await transaction.inventorySnapshot.update({
          where: { id: snapshot.id },
          data: { quantityReserved: { decrement: reservation.quantity } }
        });
      }
    });
  }

  await prisma.paymentSession.updateMany({
    where: { status: "pending", expiresAt: { lte: new Date() } },
    data: { status: "expired" }
  });
}

function getEmailTransport() {
  if (!config.smtp) return undefined;

  return {
    from: config.smtp.from,
    transport: nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      requireTLS: config.smtp.port !== 465,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      auth: { user: config.smtp.user, pass: config.smtp.password }
    })
  };
}

async function sendPendingEmails() {
  const configured = getEmailTransport();
  if (!configured) return;

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
      const delivery = await configured.transport.sendMail({
        from: configured.from,
        to: item.toEmail,
        subject,
        text,
        html
      });
      await prisma.$transaction([
        prisma.emailDeliveryAttempt.create({ data: { emailOutboxId: item.id, provider: "smtp", success: true } }),
        prisma.emailEvent.create({ data: { emailOutboxId: item.id, eventType: "sent", payload: { messageId: delivery.messageId } } }),
        prisma.emailOutbox.update({ where: { id: item.id }, data: { status: "sent", lastError: null, nextRunAt: null, lockedBy: null, lockedAt: null } })
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SMTP delivery failed.";
      const exhausted = item.attemptCount + 1 >= config.maxEmailAttempts;
      await prisma.$transaction([
        prisma.emailDeliveryAttempt.create({ data: { emailOutboxId: item.id, provider: "smtp", success: false, error: message } }),
        prisma.emailEvent.create({ data: { emailOutboxId: item.id, eventType: "failed", payload: { error: message } } }),
        prisma.emailOutbox.update({ where: { id: item.id }, data: { status: exhausted ? "failed" : "retry_wait", lastError: message, nextRunAt: exhausted ? null : new Date(Date.now() + 5 * 60 * 1000), lockedBy: null, lockedAt: null } })
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
      const response = await fetch(`${config.erp.baseUrl}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.erp.serviceToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": order.id
        },
        body: JSON.stringify({ externalOrderId: order.id, email: order.email, fulfillment: order.fulfillment, totalCents: order.totalCents, currency: order.currency, items: order.items.map((item) => ({ skuCode: item.skuCode, quantity: item.quantity, unitPriceCents: item.unitPriceCents })) }),
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

async function tick() {
  try {
    await releaseExpiredReservations();
    await sendPendingEmails();
    await pushPendingErpOrders();
    await readJobBacklog();
    return true;
  } catch (error) {
    console.error("Worker poll failed.", error);
    return false;
  }
}

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

pollForever()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Worker shutdown failed.", error);
    await prisma.$disconnect();
    process.exit(1);
  });
