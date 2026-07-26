CREATE INDEX IF NOT EXISTS "email_delivery_attempts_emailOutboxId_createdAt_idx"
  ON "email_delivery_attempts"("emailOutboxId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "email_events_emailOutboxId_createdAt_idx"
  ON "email_events"("emailOutboxId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "erp_sync_attempts_erpSyncJobId_createdAt_idx"
  ON "erp_sync_attempts"("erpSyncJobId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "refresh_sessions_userId_idx"
  ON "refresh_sessions"("userId");
CREATE INDEX IF NOT EXISTS "service_account_tokens_serviceAccountId_idx"
  ON "service_account_tokens"("serviceAccountId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_id_idx"
  ON "audit_logs"("createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "erp_webhook_events_createdAt_id_idx"
  ON "erp_webhook_events"("createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "payment_sessions_createdAt_id_idx"
  ON "payment_sessions"("createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "erp_sync_jobs_createdAt_id_idx"
  ON "erp_sync_jobs"("createdAt" DESC, "id" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_addresses_one_default_per_user"
  ON "customer_addresses"("userId")
  WHERE "isDefault" = true;
