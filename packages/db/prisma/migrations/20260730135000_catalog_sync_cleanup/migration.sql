WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "startedAt" DESC, "id" DESC) AS row_number
  FROM "catalog_sync_runs"
  WHERE "source" = 'scheduled' AND "status" = 'running'
)
UPDATE "catalog_sync_runs"
SET "status" = 'failed',
    "error" = 'Superseded before catalog singleton constraint.',
    "finishedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ranked WHERE row_number > 1);
