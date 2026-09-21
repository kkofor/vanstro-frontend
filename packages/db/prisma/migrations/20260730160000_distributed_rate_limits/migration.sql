CREATE TABLE "rate_limit_buckets" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "window" BIGINT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_buckets_key_window_key"
  ON "rate_limit_buckets"("key", "window");
CREATE INDEX "rate_limit_buckets_expiresAt_idx"
  ON "rate_limit_buckets"("expiresAt");
