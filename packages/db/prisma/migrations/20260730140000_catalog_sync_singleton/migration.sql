CREATE UNIQUE INDEX "catalog_sync_runs_single_scheduled_running"
  ON "catalog_sync_runs" ((1))
  WHERE "source" = 'scheduled' AND "status" = 'running';
