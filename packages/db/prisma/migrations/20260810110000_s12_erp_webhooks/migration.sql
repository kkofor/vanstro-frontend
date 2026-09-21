-- V11-R1 P5 production closure: ERP webhook configuration with HMAC
-- signature delivery and bounded retry state.
CREATE TABLE "erp_webhooks" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "events" TEXT[] NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastStatus" TEXT,
    "lastAttemptAt" TIMESTAMPTZ(3),
    "nextRetryAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "erp_webhooks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "erp_webhooks_active_nextRetryAt_idx" ON "erp_webhooks"("active", "nextRetryAt");
