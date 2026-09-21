CREATE TABLE "async_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "contractVersion" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "jobTypeVersion" TEXT NOT NULL,
  "payloadSchemaVersion" TEXT NOT NULL,
  "resultSchemaVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdByActorType" TEXT NOT NULL,
  "createdByActorId" TEXT,
  "effectiveRoles" JSONB NOT NULL,
  "permissionGrants" JSONB NOT NULL,
  "authorizationScopeKind" TEXT NOT NULL,
  "dealerIds" JSONB NOT NULL,
  "locationIds" JSONB NOT NULL,
  "contextRevision" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadIdentityHash" TEXT NOT NULL,
  "idempotencyKeyHash" TEXT,
  "idempotencyKeyKid" TEXT,
  "eventIntentHash" TEXT,
  "idempotencyExpiresAt" TIMESTAMPTZ(3),
  "progressKind" TEXT NOT NULL,
  "progressCurrent" INTEGER,
  "progressTotal" INTEGER,
  "progressStage" TEXT NOT NULL,
  "progressMessage" TEXT,
  "progressUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "totalCount" INTEGER,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "generationAttempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL,
  "retryGeneration" INTEGER NOT NULL DEFAULT 0,
  "maxRetryGenerations" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMPTZ(3),
  "leaseOwner" TEXT,
  "leaseRevision" INTEGER NOT NULL DEFAULT 0,
  "leaseAcquiredAt" TIMESTAMPTZ(3),
  "leaseExpiresAt" TIMESTAMPTZ(3),
  "heartbeatAt" TIMESTAMPTZ(3),
  "attemptDeadline" TIMESTAMPTZ(3),
  "cancellationRequestedAt" TIMESTAMPTZ(3),
  "cancellationRequestedBy" TEXT,
  "cancellationReason" TEXT,
  "cancelledAt" TIMESTAMPTZ(3),
  "startedAt" TIMESTAMPTZ(3),
  "finishedAt" TIMESTAMPTZ(3),
  "failureClass" TEXT,
  "resultSummary" JSONB,
  "errorSummary" JSONB,
  "requestId" TEXT NOT NULL,
  "retentionClass" TEXT NOT NULL,
  "retentionPolicyVersion" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "async_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "async_jobs_contract_check" CHECK ("contractVersion" = 'async-job.v1' AND "schemaVersion" = 'async-job-schema.v1'),
  CONSTRAINT "async_jobs_status_check" CHECK ("status" IN ('queued','running','succeeded','partially_succeeded','failed','cancelled')),
  CONSTRAINT "async_jobs_actor_check" CHECK ("createdByActorType" IN ('admin_user','service_account','worker','system')),
  CONSTRAINT "async_jobs_scope_check" CHECK (
    ("authorizationScopeKind" = 'global' AND "dealerIds" = '[]'::jsonb AND "locationIds" = '[]'::jsonb) OR
    ("authorizationScopeKind" = 'dealer' AND jsonb_array_length("dealerIds") > 0 AND "locationIds" = '[]'::jsonb) OR
    ("authorizationScopeKind" = 'location' AND jsonb_array_length("dealerIds") > 0 AND jsonb_array_length("locationIds") > 0)
  ),
  CONSTRAINT "async_jobs_hash_pair_check" CHECK (("idempotencyKeyHash" IS NULL AND "idempotencyKeyKid" IS NULL AND "eventIntentHash" IS NULL AND "idempotencyExpiresAt" IS NULL) OR ("idempotencyKeyHash" IS NOT NULL AND "idempotencyKeyKid" IS NOT NULL AND "eventIntentHash" IS NOT NULL AND "idempotencyExpiresAt" IS NOT NULL)),
  CONSTRAINT "async_jobs_count_check" CHECK ("processedCount" >= 0 AND "failedCount" >= 0 AND "processedCount" >= "failedCount" AND ("totalCount" IS NULL OR "totalCount" >= "processedCount")),
  CONSTRAINT "async_jobs_attempt_check" CHECK ("attempt" >= 0 AND "generationAttempt" >= 0 AND "generationAttempt" <= "maxAttempts" AND "maxAttempts" >= 1 AND "retryGeneration" >= 0 AND "retryGeneration" <= "maxRetryGenerations"),
  CONSTRAINT "async_jobs_lease_check" CHECK (("status" = 'running' AND "leaseOwner" IS NOT NULL AND "leaseAcquiredAt" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL AND "heartbeatAt" IS NOT NULL AND "attemptDeadline" IS NOT NULL) OR ("status" <> 'running' AND "leaseOwner" IS NULL AND "leaseAcquiredAt" IS NULL AND "leaseExpiresAt" IS NULL AND "heartbeatAt" IS NULL AND "attemptDeadline" IS NULL)),
  CONSTRAINT "async_jobs_terminal_check" CHECK (("status" IN ('succeeded','partially_succeeded','failed','cancelled')) = ("finishedAt" IS NOT NULL)),
  CONSTRAINT "async_jobs_cancelled_check" CHECK (("status" = 'cancelled') = ("cancelledAt" IS NOT NULL)),
  CONSTRAINT "async_jobs_partial_check" CHECK ("status" <> 'partially_succeeded' OR ("processedCount" > 0 AND "failedCount" > 0 AND ("resultSummary" IS NOT NULL OR "errorSummary" IS NOT NULL)))
);

CREATE TABLE "async_job_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "jobId" UUID NOT NULL, "attempt" INTEGER NOT NULL, "leaseRevision" INTEGER NOT NULL,
  "workerIdentityClass" TEXT NOT NULL, "workerIdentityHash" TEXT NOT NULL, "acquiredAt" TIMESTAMPTZ(3) NOT NULL, "startedAt" TIMESTAMPTZ(3) NOT NULL,
  "heartbeatEndedAt" TIMESTAMPTZ(3), "finishedAt" TIMESTAMPTZ(3), "outcome" TEXT NOT NULL, "failureClass" TEXT, "errorCode" TEXT, "errorSummary" TEXT,
  "processedCount" INTEGER NOT NULL DEFAULT 0, "failedCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "async_job_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "async_job_attempts_outcome_check" CHECK ("outcome" IN ('running','succeeded','partially_succeeded','failed','cancelled','lease_lost')),
  CONSTRAINT "async_job_attempts_close_check" CHECK (("outcome" = 'running' AND "finishedAt" IS NULL) OR ("outcome" <> 'running' AND "finishedAt" IS NOT NULL)),
  CONSTRAINT "async_job_attempts_count_check" CHECK ("attempt" > 0 AND "leaseRevision" > 0 AND "processedCount" >= 0 AND "failedCount" >= 0 AND "processedCount" >= "failedCount")
);

CREATE TABLE "job_artifacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "jobId" UUID NOT NULL, "ownerClass" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "artifactType" TEXT NOT NULL,
  "displayName" TEXT NOT NULL, "contentType" TEXT NOT NULL, "byteCount" BIGINT NOT NULL, "checksumAlgorithm" TEXT NOT NULL, "checksumDigest" TEXT NOT NULL,
  "storageProvider" TEXT, "storageReference" TEXT, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3), "requiredDownloadPermission" TEXT NOT NULL, "authorizationScopeKind" TEXT NOT NULL, "dealerIds" JSONB NOT NULL, "locationIds" JSONB NOT NULL,
  "sensitivityClass" TEXT NOT NULL, "retentionClass" TEXT NOT NULL, "retentionPolicyVersion" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "job_artifacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_artifacts_metadata_check" CHECK ("byteCount" >= 0 AND "checksumAlgorithm" IN ('sha256') AND "checksumDigest" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "job_artifacts_scope_check" CHECK (("authorizationScopeKind" = 'global' AND "dealerIds" = '[]'::jsonb AND "locationIds" = '[]'::jsonb) OR ("authorizationScopeKind" = 'dealer' AND jsonb_array_length("dealerIds") > 0 AND "locationIds" = '[]'::jsonb) OR ("authorizationScopeKind" = 'location' AND jsonb_array_length("dealerIds") > 0 AND jsonb_array_length("locationIds") > 0))
);

CREATE UNIQUE INDEX "async_jobs_jobType_idempotencyKeyHash_key" ON "async_jobs"("jobType", "idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;
CREATE INDEX "async_jobs_claim_idx" ON "async_jobs"("status", "nextRetryAt", "createdAt", "id");
CREATE INDEX "async_jobs_type_lease_idx" ON "async_jobs"("jobType", "status", "leaseExpiresAt");
CREATE INDEX "async_jobs_actor_idx" ON "async_jobs"("createdByActorType", "createdByActorId", "createdAt" DESC, "id" DESC);
CREATE INDEX "async_jobs_scope_idx" ON "async_jobs"("authorizationScopeKind", "createdAt" DESC, "id" DESC);
CREATE INDEX "async_jobs_dealer_gin" ON "async_jobs" USING GIN ("dealerIds");
CREATE INDEX "async_jobs_location_gin" ON "async_jobs" USING GIN ("locationIds");
CREATE INDEX "async_jobs_expiry_idx" ON "async_jobs"("expiresAt");
CREATE UNIQUE INDEX "async_job_attempts_jobId_attempt_key" ON "async_job_attempts"("jobId", "attempt");
CREATE UNIQUE INDEX "async_job_attempts_jobId_leaseRevision_key" ON "async_job_attempts"("jobId", "leaseRevision");
CREATE INDEX "async_job_attempts_job_created_idx" ON "async_job_attempts"("jobId", "createdAt");
CREATE INDEX "job_artifacts_job_created_idx" ON "job_artifacts"("jobId", "createdAt");
CREATE INDEX "job_artifacts_expiry_idx" ON "job_artifacts"("expiresAt", "deletedAt");

ALTER TABLE "async_job_attempts" ADD CONSTRAINT "async_job_attempts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "async_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_artifacts" ADD CONSTRAINT "job_artifacts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "async_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_async_job_attempt_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('app.async_job_retention_cleanup', true) = 'on' AND EXISTS (SELECT 1 FROM "async_jobs" j WHERE j."id" = OLD."jobId" AND j."status" IN ('succeeded','partially_succeeded','failed','cancelled') AND j."expiresAt" <= CURRENT_TIMESTAMP) THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'async job attempts are transition-constrained';
  END IF;
  IF OLD."outcome" <> 'running' OR NEW."outcome" = 'running' OR NEW."jobId" <> OLD."jobId" OR NEW."attempt" <> OLD."attempt" OR NEW."leaseRevision" <> OLD."leaseRevision" OR NEW."workerIdentityClass" <> OLD."workerIdentityClass" OR NEW."workerIdentityHash" <> OLD."workerIdentityHash" OR NEW."acquiredAt" <> OLD."acquiredAt" OR NEW."startedAt" <> OLD."startedAt" OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'async job attempts are transition-constrained';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "async_job_attempt_evidence_guard" BEFORE UPDATE OR DELETE ON "async_job_attempts" FOR EACH ROW EXECUTE FUNCTION enforce_async_job_attempt_evidence();
