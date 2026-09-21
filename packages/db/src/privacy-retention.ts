import type { PrismaClient } from "@prisma/client";

export const CONSENT_RECORD_RETENTION_MONTHS = 24;

export function consentRetentionCutoff(now = new Date()) {
  const targetMonthIndex = now.getUTCFullYear() * 12 + now.getUTCMonth() - CONSENT_RECORD_RETENTION_MONTHS;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(now.getUTCDate(), lastDayOfTargetMonth),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  ));
}

export function deleteExpiredConsentEvents(
  database: Pick<PrismaClient, "privacyConsentEvent">,
  now = new Date()
) {
  return database.privacyConsentEvent.deleteMany({
    where: { createdAt: { lt: consentRetentionCutoff(now) } }
  });
}
