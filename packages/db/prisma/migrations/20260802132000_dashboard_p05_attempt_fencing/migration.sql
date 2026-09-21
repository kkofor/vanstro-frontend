CREATE OR REPLACE FUNCTION enforce_async_job_attempt_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_status TEXT;
  parent_attempt INTEGER;
  parent_lease_revision INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('app.async_job_retention_cleanup', true) = 'on'
       AND EXISTS (
         SELECT 1 FROM "async_jobs" j
         WHERE j."id" = OLD."jobId"
           AND j."status" IN ('succeeded','partially_succeeded','failed','cancelled')
           AND j."expiresAt" <= CURRENT_TIMESTAMP
       ) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'async job attempts are transition-constrained';
  END IF;

  IF OLD."outcome" <> 'running'
     OR NEW."outcome" NOT IN ('succeeded','partially_succeeded','failed','cancelled','lease_lost')
     OR NEW."jobId" <> OLD."jobId"
     OR NEW."attempt" <> OLD."attempt"
     OR NEW."leaseRevision" <> OLD."leaseRevision"
     OR NEW."workerIdentityClass" <> OLD."workerIdentityClass"
     OR NEW."workerIdentityHash" <> OLD."workerIdentityHash"
     OR NEW."acquiredAt" <> OLD."acquiredAt"
     OR NEW."startedAt" <> OLD."startedAt"
     OR NEW."createdAt" <> OLD."createdAt"
  THEN
    RAISE EXCEPTION 'async job attempts are transition-constrained';
  END IF;

  IF NEW."heartbeatEndedAt" IS NULL
     OR NEW."finishedAt" IS NULL
     OR NEW."processedCount" < OLD."processedCount"
     OR NEW."failedCount" < OLD."failedCount"
     OR NEW."processedCount" < NEW."failedCount"
  THEN
    RAISE EXCEPTION 'async job attempts are transition-constrained';
  END IF;

  SELECT j."status", j."attempt", j."leaseRevision"
    INTO parent_status, parent_attempt, parent_lease_revision
  FROM "async_jobs" j
  WHERE j."id" = OLD."jobId"
  FOR UPDATE;

  IF parent_status IS DISTINCT FROM 'running'
     OR parent_attempt IS DISTINCT FROM OLD."attempt"
     OR parent_lease_revision IS DISTINCT FROM OLD."leaseRevision"
  THEN
    RAISE EXCEPTION 'async job attempt lease is not current';
  END IF;

  RETURN NEW;
END $$;
