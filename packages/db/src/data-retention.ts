import { Prisma, type PrismaClient } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DATA_RETENTION_DAYS = {
  pageViews: 90,
  loginEvents: 365,
  completedEmailPayloads: 90,
  completedErpAttempts: 180,
  processedWebhookPayloads: 180,
  expiredPaymentSessions: 90,
  rateLimitBuckets: 2
} as const;

function cutoff(days: number, now: Date) {
  return new Date(now.getTime() - days * DAY_MS);
}

export async function applyDataRetention(
  database: Pick<
    PrismaClient,
    | "pageViewEvent"
    | "loginEvent"
    | "emailOutbox"
    | "erpSyncAttempt"
    | "erpWebhookEvent"
    | "paymentSession"
    | "rateLimitBucket"
  >,
  now = new Date()
) {
  const [pageViews, loginEvents, emailPayloads, erpAttempts, webhookPayloads, paymentSessions, rateLimitBuckets] = await Promise.all([
    database.pageViewEvent.deleteMany({ where: { createdAt: { lt: cutoff(DATA_RETENTION_DAYS.pageViews, now) } } }),
    database.loginEvent.deleteMany({ where: { createdAt: { lt: cutoff(DATA_RETENTION_DAYS.loginEvents, now) } } }),
    database.emailOutbox.updateMany({
      where: { status: { in: ["sent", "cancelled"] }, updatedAt: { lt: cutoff(DATA_RETENTION_DAYS.completedEmailPayloads, now) } },
      data: { payload: Prisma.DbNull }
    }),
    database.erpSyncAttempt.deleteMany({ where: { createdAt: { lt: cutoff(DATA_RETENTION_DAYS.completedErpAttempts, now) } } }),
    database.erpWebhookEvent.updateMany({
      where: { processedAt: { lt: cutoff(DATA_RETENTION_DAYS.processedWebhookPayloads, now) } },
      data: { payload: {} }
    }),
    database.paymentSession.deleteMany({
      where: {
        status: { in: ["failed", "expired", "refunded"] },
        updatedAt: { lt: cutoff(DATA_RETENTION_DAYS.expiredPaymentSessions, now) },
        order: null
      }
    }),
    database.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: cutoff(DATA_RETENTION_DAYS.rateLimitBuckets, now) } } })
  ]);
  return { pageViews, loginEvents, emailPayloads, erpAttempts, webhookPayloads, paymentSessions, rateLimitBuckets };
}
