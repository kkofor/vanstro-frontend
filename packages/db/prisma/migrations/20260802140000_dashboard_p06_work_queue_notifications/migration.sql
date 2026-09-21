-- CreateTable
CREATE TABLE "work_queue_items" (
    "id" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "registryVersion" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "typeVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "health" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "safeSummary" JSONB NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "deepLink" TEXT,
    "authorizationScopeKind" TEXT NOT NULL,
    "dealerIds" JSONB NOT NULL,
    "locationIds" JSONB NOT NULL,
    "sourcePermission" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "lastObservedAt" TIMESTAMPTZ(3) NOT NULL,
    "deduplicationKeyKid" TEXT NOT NULL,
    "deduplicationKeyHash" TEXT NOT NULL,
    "sourceIntentHash" TEXT NOT NULL,
    "occurrence" INTEGER NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "assignedToUserId" TEXT,
    "assignedAt" TIMESTAMPTZ(3),
    "assignedByActorType" TEXT,
    "assignedByActorId" TEXT,
    "acknowledgedAt" TIMESTAMPTZ(3),
    "acknowledgedByActorType" TEXT,
    "acknowledgedByActorId" TEXT,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedByActorType" TEXT,
    "resolvedByActorId" TEXT,
    "resolutionReason" TEXT,
    "dismissedAt" TIMESTAMPTZ(3),
    "dismissedByActorType" TEXT,
    "dismissedByActorId" TEXT,
    "dismissalReason" TEXT,
    "lastTransitionReason" TEXT,
    "requestId" TEXT NOT NULL,
    "retentionClass" TEXT NOT NULL,
    "retentionPolicyVersion" TEXT NOT NULL,
    "retentionExpiresAt" TIMESTAMPTZ(3),
    "attentionExpiresAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "typeVersion" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "workItemId" UUID NOT NULL,
    "severity" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "messageKey" TEXT NOT NULL,
    "safeMessageArgs" JSONB NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "deepLink" TEXT,
    "authorizationScopeKind" TEXT NOT NULL,
    "dealerIds" JSONB NOT NULL,
    "locationIds" JSONB NOT NULL,
    "deduplicationKeyKid" TEXT NOT NULL,
    "deduplicationKeyHash" TEXT NOT NULL,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_queue_source_states" (
    "id" UUID NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "adapterVersion" TEXT NOT NULL,
    "health" TEXT NOT NULL,
    "lastSuccessAt" TIMESTAMPTZ(3),
    "lastFailureAt" TIMESTAMPTZ(3),
    "safeErrorCode" TEXT,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_queue_source_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_queue_items_status_severity_dueAt_createdAt_id_idx" ON "work_queue_items"("status", "severity", "dueAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "work_queue_items_assignedToUserId_status_dueAt_idx" ON "work_queue_items"("assignedToUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "work_queue_items_resourceType_resourceId_idx" ON "work_queue_items"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "work_queue_items_source_status_createdAt_idx" ON "work_queue_items"("source", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "work_queue_items_retentionExpiresAt_idx" ON "work_queue_items"("retentionExpiresAt");

-- CreateIndex
CREATE INDEX "in_app_notifications_recipientUserId_createdAt_id_idx" ON "in_app_notifications"("recipientUserId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "in_app_notifications_expiresAt_idx" ON "in_app_notifications"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "in_app_notifications_recipientUserId_type_deduplicationKeyH_key" ON "in_app_notifications"("recipientUserId", "type", "deduplicationKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "work_queue_source_states_adapterKey_adapterVersion_key" ON "work_queue_source_states"("adapterKey", "adapterVersion");

-- AddForeignKey
ALTER TABLE "work_queue_items" ADD CONSTRAINT "work_queue_items_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_queue_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "work_queue_items_active_dedup_key" ON "work_queue_items"("type","deduplicationKeyHash") WHERE "status" IN ('open','acknowledged');
CREATE INDEX "work_queue_items_dealer_gin" ON "work_queue_items" USING GIN ("dealerIds");
CREATE INDEX "work_queue_items_location_gin" ON "work_queue_items" USING GIN ("locationIds");
CREATE INDEX "in_app_notifications_dealer_gin" ON "in_app_notifications" USING GIN ("dealerIds");
CREATE INDEX "in_app_notifications_location_gin" ON "in_app_notifications" USING GIN ("locationIds");

ALTER TABLE "work_queue_items"
  ADD CONSTRAINT "work_queue_contract_check" CHECK ("contractVersion"='work-queue-item.v1' AND "registryVersion"='work-queue-registry.v1' AND "type"='foundation.attention' AND "typeVersion"='foundation.attention.v1' AND "source"='async_job' AND "resourceType"='async_job'),
  ADD CONSTRAINT "work_queue_enum_check" CHECK ("status" IN ('open','acknowledged','resolved','dismissed','expired') AND "severity" IN ('critical','warning','info') AND "health" IN ('fresh','stale','orphaned')),
  ADD CONSTRAINT "work_queue_scope_check" CHECK (("authorizationScopeKind"='global' AND "dealerIds"='[]'::jsonb AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='dealer' AND jsonb_array_length("dealerIds")>0 AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='location' AND jsonb_array_length("dealerIds")>0 AND jsonb_array_length("locationIds")>0)),
  ADD CONSTRAINT "work_queue_retention_check" CHECK (("status" IN ('open','acknowledged') AND "retentionExpiresAt" IS NULL) OR ("status" IN ('resolved','dismissed','expired') AND "retentionExpiresAt" IS NOT NULL)),
  ADD CONSTRAINT "work_queue_foundation_attention_expiry_check" CHECK ("attentionExpiresAt" IS NULL),
  ADD CONSTRAINT "work_queue_assignment_check" CHECK (("assignedToUserId" IS NULL AND "assignedAt" IS NULL AND "assignedByActorType" IS NULL AND "assignedByActorId" IS NULL) OR ("assignedToUserId" IS NOT NULL AND "assignedAt" IS NOT NULL AND "assignedByActorType" IN ('admin_user','system'))),
  ADD CONSTRAINT "work_queue_status_time_check" CHECK (("status"='acknowledged')=("acknowledgedAt" IS NOT NULL) AND ("status"='resolved')=("resolvedAt" IS NOT NULL) AND ("status"='dismissed')=("dismissedAt" IS NOT NULL)),
  ADD CONSTRAINT "work_queue_bounds_check" CHECK ("occurrence">0 AND "version">=0 AND length("requestId") BETWEEN 1 AND 128 AND length("sourceRevision") BETWEEN 1 AND 128 AND length("deduplicationKeyHash")=43 AND length("sourceIntentHash")=43);

ALTER TABLE "in_app_notifications"
  ADD CONSTRAINT "notification_contract_check" CHECK ("contractVersion"='in-app-notification.v1'),
  ADD CONSTRAINT "notification_scope_check" CHECK (("authorizationScopeKind"='global' AND "dealerIds"='[]'::jsonb AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='dealer' AND jsonb_array_length("dealerIds")>0 AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='location' AND jsonb_array_length("dealerIds")>0 AND jsonb_array_length("locationIds")>0)),
  ADD CONSTRAINT "notification_bounds_check" CHECK ("severity" IN ('critical','warning','info') AND "expiresAt">"createdAt" AND length("deduplicationKeyHash")=43 AND "version">=0);

ALTER TABLE "work_queue_source_states"
  ADD CONSTRAINT "work_queue_source_health_check" CHECK ("health" IN ('ready','stale','unavailable') AND "revision">=0);

ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_resource_type_check";
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_resource_type_check" CHECK ("resourceType" IN ('user','role','permission','dealer','dealer_location','membership','product','category','inventory','price','promotion','order','shipment','checkout_session','payment_session','refund','customer','content','review','lead','support','email','erp_job','runtime_config','feature_flag','audit_event','async_job','job_artifact','work_queue_item','in_app_notification','work_queue_source_state'));
