export const DEFAULT_DATA_JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export function calculateDataJobExpiry(
  finalizedAt: Date,
  retentionMs = DEFAULT_DATA_JOB_RETENTION_MS,
): Date {
  if (!Number.isSafeInteger(retentionMs) || retentionMs <= 0) {
    throw new RangeError("Retention must be a positive safe integer number of milliseconds.");
  }
  const expiresAt = new Date(finalizedAt.getTime() + retentionMs);
  if (!Number.isFinite(expiresAt.getTime())) throw new RangeError("Retention expiry is outside the Date range.");
  return expiresAt;
}

export function isExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
