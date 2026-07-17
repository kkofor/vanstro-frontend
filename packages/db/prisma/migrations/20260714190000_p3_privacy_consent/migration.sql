CREATE TABLE "privacy_consent_events" (
    "id" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_consent_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "privacy_consent_events_anonymousId_createdAt_idx"
    ON "privacy_consent_events"("anonymousId", "createdAt");
