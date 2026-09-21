-- V11-R1 P4 production closure: per-item batch ingest results ledger.
-- The async job is the idempotency ledger (createAsyncJob atomic claim); this
-- table holds replayable per-item results without storing full payloads.
CREATE TABLE "batch_ingest_results" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batch_ingest_results_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "batch_ingest_results_jobId_itemIndex_key" ON "batch_ingest_results"("jobId", "itemIndex");
CREATE INDEX "batch_ingest_results_jobId_idx" ON "batch_ingest_results"("jobId");
ALTER TABLE "batch_ingest_results" ADD CONSTRAINT "batch_ingest_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "async_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
