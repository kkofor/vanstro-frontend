CREATE TABLE "worker_heartbeats" (
    "key" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "lastStartedAt" TIMESTAMP(3) NOT NULL,
    "lastSucceededAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "worker_heartbeats_pkey" PRIMARY KEY ("key")
);
