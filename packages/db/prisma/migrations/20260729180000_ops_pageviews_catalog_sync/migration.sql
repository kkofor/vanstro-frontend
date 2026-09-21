-- CreateTable
CREATE TABLE "page_view_events" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "locale" TEXT,
    "sessionId" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_runs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "productsUpserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "catalog_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_view_events_createdAt_idx" ON "page_view_events"("createdAt");

-- CreateIndex
CREATE INDEX "page_view_events_path_createdAt_idx" ON "page_view_events"("path", "createdAt");

-- CreateIndex
CREATE INDEX "page_view_events_sessionId_createdAt_idx" ON "page_view_events"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "catalog_sync_runs_startedAt_idx" ON "catalog_sync_runs"("startedAt");
