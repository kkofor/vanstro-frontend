WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "startedAt" DESC, "id" DESC) AS row_number
  FROM "catalog_sync_runs"
  WHERE "status" = 'running'
)
UPDATE "catalog_sync_runs"
SET "status" = 'failed',
    "error" = 'Superseded while enabling the global catalog sync singleton.',
    "finishedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ranked WHERE row_number > 1);

DROP INDEX IF EXISTS "catalog_sync_runs_single_scheduled_running";
CREATE UNIQUE INDEX "catalog_sync_runs_one_running"
  ON "catalog_sync_runs" ((1))
  WHERE "status" = 'running';
