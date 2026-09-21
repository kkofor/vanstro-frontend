-- AlterTable
ALTER TABLE "async_jobs" ADD COLUMN "bindingHash" TEXT,
ADD COLUMN "bindingRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "executionBinding" JSONB;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "registryVersion" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priorRestorableStatus" TEXT,
    "originalFilename" TEXT NOT NULL,
    "safeDisplayName" TEXT NOT NULL,
    "declaredContentType" TEXT NOT NULL,
    "detectedContentType" TEXT,
    "expectedBytes" BIGINT NOT NULL,
    "receivedBytes" BIGINT,
    "uploadChecksum" TEXT,
    "originalBytes" BIGINT,
    "originalChecksum" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "source" TEXT NOT NULL,
    "provenanceOrigin" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "processingPolicyVersion" TEXT NOT NULL,
    "securityPolicyVersion" TEXT NOT NULL,
    "processingConfigHash" TEXT NOT NULL,
    "variantSetState" TEXT NOT NULL,
    "safeFailureCode" TEXT,
    "decorative" BOOLEAN NOT NULL DEFAULT false,
    "accessibilityComplete" BOOLEAN NOT NULL DEFAULT false,
    "focalX" DOUBLE PRECISION,
    "focalY" DOUBLE PRECISION,
    "credit" TEXT,
    "copyright" TEXT,
    "tags" JSONB NOT NULL,
    "duplicateGroupFingerprint" TEXT,
    "authorizationScopeKind" TEXT NOT NULL,
    "dealerIds" JSONB NOT NULL,
    "locationIds" JSONB NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "createdByActorId" TEXT,
    "effectiveRoles" JSONB NOT NULL,
    "permissionGrants" JSONB NOT NULL,
    "contextRevision" TEXT NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "archivedByActorType" TEXT,
    "archivedByActorId" TEXT,
    "archiveReason" TEXT,
    "retiring" BOOLEAN NOT NULL DEFAULT false,
    "tombstonedAt" TIMESTAMPTZ(3),
    "retentionClass" TEXT NOT NULL,
    "retentionPolicyVersion" TEXT NOT NULL,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "retentionExpiresAt" TIMESTAMPTZ(3),
    "requestId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset_locales" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "updatedByActorType" TEXT NOT NULL,
    "updatedByActorId" TEXT,
    "contextRevision" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_asset_locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_variants" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceAssetVersion" INTEGER NOT NULL,
    "contentType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "byteCount" BIGINT,
    "checksum" TEXT,
    "storageOperationId" UUID,
    "configVersion" TEXT NOT NULL,
    "configHash" TEXT NOT NULL,
    "safeFailureCode" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_usages" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "slot" TEXT,
    "requiredLocales" JSONB NOT NULL,
    "authorizationScopeKind" TEXT NOT NULL,
    "dealerIds" JSONB NOT NULL,
    "locationIds" JSONB NOT NULL,
    "attachedByActorType" TEXT NOT NULL,
    "attachedByActorId" TEXT,
    "permissionGrants" JSONB NOT NULL,
    "contextRevision" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_upload_intents" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "contextRevision" TEXT NOT NULL,
    "permissionGrantHash" TEXT NOT NULL,
    "scopeHash" TEXT NOT NULL,
    "authorizationScopeKind" TEXT NOT NULL,
    "dealerIds" JSONB NOT NULL,
    "locationIds" JSONB NOT NULL,
    "expectedBytes" BIGINT NOT NULL,
    "capabilityKid" TEXT NOT NULL,
    "capabilityHash" TEXT NOT NULL,
    "intentHash" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "failureCode" TEXT,
    "operationId" UUID,
    "tempEntryName" TEXT,
    "leaseOwner" TEXT,
    "leaseRevision" INTEGER NOT NULL DEFAULT 0,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "heartbeatAt" TIMESTAMPTZ(3),
    "operationState" TEXT NOT NULL,
    "cleanupState" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_upload_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_storage_operations" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "variantId" UUID,
    "uploadIntentId" UUID,
    "jobId" UUID,
    "contractVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "objectRole" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "cleanupStatus" TEXT NOT NULL,
    "cleanupReason" TEXT,
    "jobRetryGeneration" INTEGER,
    "jobAttempt" INTEGER,
    "leaseRevision" INTEGER,
    "expectedAssetVersion" INTEGER NOT NULL,
    "sourceChecksum" TEXT,
    "processingConfigHash" TEXT NOT NULL,
    "authorizationScopeKind" TEXT NOT NULL,
    "dealerIds" JSONB NOT NULL,
    "locationIds" JSONB NOT NULL,
    "byteCount" BIGINT,
    "checksum" TEXT,
    "expiresAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_storage_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_retry_commands" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "commandKeyKid" TEXT NOT NULL,
    "commandKeyHash" TEXT NOT NULL,
    "intentHash" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "contextRevision" TEXT NOT NULL,
    "authorizationScopeKind" TEXT NOT NULL,
    "dealerIds" JSONB NOT NULL,
    "locationIds" JSONB NOT NULL,
    "retryGeneration" INTEGER NOT NULL,
    "executionBinding" JSONB NOT NULL,
    "responseProjection" JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_retry_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_hmac_kid_retirements" (
    "kid" TEXT NOT NULL,
    "lastCommandExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "removeAfter" TIMESTAMPTZ(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_hmac_kid_retirements_pkey" PRIMARY KEY ("kid")
);

-- CreateTable
CREATE TABLE "media_processing_readiness" (
    "id" UUID NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "deploymentEnvironmentId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "sandboxImageDigest" TEXT NOT NULL,
    "parserDigest" TEXT NOT NULL,
    "securityPolicyDigest" TEXT NOT NULL,
    "processingConfigDigest" TEXT NOT NULL,
    "supportedKinds" JSONB NOT NULL,
    "capacityByKind" JSONB NOT NULL,
    "probeResult" TEXT NOT NULL,
    "probedAt" TIMESTAMPTZ(3) NOT NULL,
    "probeExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "heartbeatAt" TIMESTAMPTZ(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_processing_readiness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_status_createdAt_id_idx" ON "media_assets"("status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "media_assets_kind_detectedContentType_createdAt_id_idx" ON "media_assets"("kind", "detectedContentType", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "media_assets_authorizationScopeKind_createdAt_id_idx" ON "media_assets"("authorizationScopeKind", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "media_assets_retentionExpiresAt_idx" ON "media_assets"("retentionExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_locales_assetId_locale_key" ON "media_asset_locales"("assetId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "media_variants_storageOperationId_key" ON "media_variants"("storageOperationId");

-- CreateIndex
CREATE INDEX "media_variants_assetId_status_role_idx" ON "media_variants"("assetId", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "media_variants_assetId_sourceAssetVersion_role_configHash_key" ON "media_variants"("assetId", "sourceAssetVersion", "role", "configHash");

-- CreateIndex
CREATE INDEX "media_usages_entityType_entityId_idx" ON "media_usages"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "media_usages_assetId_entityType_entityId_slot_key" ON "media_usages"("assetId", "entityType", "entityId", "slot");

-- CreateIndex
CREATE INDEX "media_upload_intents_status_expiresAt_idx" ON "media_upload_intents"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_upload_intents_contractVersion_capabilityHash_key" ON "media_upload_intents"("contractVersion", "capabilityHash");

-- CreateIndex
CREATE UNIQUE INDEX "media_upload_intents_tempEntryName_key" ON "media_upload_intents"("tempEntryName");

-- CreateIndex
CREATE INDEX "media_storage_operations_cleanupStatus_state_expiresAt_idx" ON "media_storage_operations"("cleanupStatus", "state", "expiresAt");

-- CreateIndex
CREATE INDEX "media_storage_operations_assetId_state_idx" ON "media_storage_operations"("assetId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "media_storage_operations_provider_objectKey_key" ON "media_storage_operations"("provider", "objectKey");

-- CreateIndex
CREATE INDEX "media_retry_commands_commandKeyKid_expiresAt_idx" ON "media_retry_commands"("commandKeyKid", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_retry_commands_contractVersion_commandKeyHash_key" ON "media_retry_commands"("contractVersion", "commandKeyHash");

-- CreateIndex
CREATE INDEX "media_hmac_kid_retirements_removeAfter_idx" ON "media_hmac_kid_retirements"("removeAfter");

-- CreateIndex
CREATE INDEX "media_processing_readiness_probeResult_probeExpiresAt_idx" ON "media_processing_readiness"("probeResult", "probeExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_processing_readiness_contractVersion_deploymentEnviro_key" ON "media_processing_readiness"("contractVersion", "deploymentEnvironmentId", "instanceId");

-- AddForeignKey
ALTER TABLE "media_asset_locales" ADD CONSTRAINT "media_asset_locales_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_storageOperationId_fkey" FOREIGN KEY ("storageOperationId") REFERENCES "media_storage_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_usages" ADD CONSTRAINT "media_usages_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_upload_intents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_storage_operations" ADD CONSTRAINT "media_storage_operations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_storage_operations" ADD CONSTRAINT "media_storage_operations_uploadIntentId_fkey" FOREIGN KEY ("uploadIntentId") REFERENCES "media_upload_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_retry_commands" ADD CONSTRAINT "media_retry_commands_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- P07 frozen registry constraints and indexes.
ALTER TABLE "media_assets" ADD CONSTRAINT "media_asset_contract_check" CHECK (
  "contractVersion"='media-asset.v1' AND "schemaVersion"='media-asset-schema.v1' AND "registryVersion"='media-registry.v1'
  AND "kind" IN ('image','pdf') AND "status" IN ('uploading','processing','ready','failed','quarantined','archived')
  AND "source"='dashboard_upload' AND "provenanceOrigin"='human_upload'
  AND "storageProvider"='private_filesystem.v1' AND "processingPolicyVersion"='media-processing.v1' AND "securityPolicyVersion"='media-security.v1'
), ADD CONSTRAINT "media_asset_scope_check" CHECK (("authorizationScopeKind"='global' AND "dealerIds"='[]'::jsonb AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='dealer' AND jsonb_array_length("dealerIds")>0 AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='location' AND jsonb_array_length("dealerIds")>0 AND jsonb_array_length("locationIds")>0)),
ADD CONSTRAINT "media_asset_bounds_check" CHECK ("expectedBytes">0 AND "version">=0 AND length("safeDisplayName") BETWEEN 1 AND 128 AND length("originalFilename") BETWEEN 1 AND 255 AND ("focalX" IS NULL)=("focalY" IS NULL) AND ("focalX" IS NULL OR ("focalX">=0 AND "focalX"<=1 AND "focalY">=0 AND "focalY"<=1))),
ADD CONSTRAINT "media_asset_kind_check" CHECK (("kind"='image' AND "declaredContentType" IN ('image/jpeg','image/png','image/webp') AND "expectedBytes"<=10485760) OR ("kind"='pdf' AND "declaredContentType"='application/pdf' AND "expectedBytes"<=26214400)),
ADD CONSTRAINT "media_asset_archive_check" CHECK (("status"='archived')=("archivedAt" IS NOT NULL) AND ("status"<>'archived' OR "priorRestorableStatus" IN ('ready','failed','quarantined'))),
ADD CONSTRAINT "media_asset_dimensions_check" CHECK (("width" IS NULL AND "height" IS NULL) OR ("kind"='image' AND "width" BETWEEN 1 AND 12000 AND "height" BETWEEN 1 AND 12000 AND ("width"::bigint*"height"::bigint)<=40000000));

ALTER TABLE "media_asset_locales" ADD CONSTRAINT "media_locale_contract_check" CHECK ("contractVersion"='media-locale-metadata.v1' AND "locale" IN ('en-CA','fr-CA') AND char_length(coalesce("altText",''))<=500 AND char_length(coalesce("caption",''))<=1000 AND "version">=0);
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variant_contract_check" CHECK ("contractVersion"='media-variant.v1' AND "role" IN ('original','thumbnail','small','medium','large') AND "status" IN ('processing','ready','failed') AND "version">=0 AND length("configHash")=43);
ALTER TABLE "media_usages" ADD CONSTRAINT "media_usage_contract_check" CHECK ("contractVersion"='media-usage.v1' AND "entityType" IN ('product','product_variant','category','cms_module','article','dealer') AND "version">=0);
ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_intent_contract_check" CHECK ("contractVersion"='media-upload-intent.v1' AND "status" IN ('pending','claimed','consumed','failed','expired','cleanup_required') AND "operationState" IN ('pending','claimed','consumed','failed') AND "cleanupState" IN ('none','required','complete') AND "expectedBytes">0 AND "version">=0 AND ("tempEntryName" IS NULL OR "tempEntryName" ~ '^upload-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.part$'));
ALTER TABLE "media_storage_operations" ADD CONSTRAINT "media_storage_operation_contract_check" CHECK ("contractVersion"='media-storage-operation.v1' AND "provider"='private_filesystem.v1' AND "objectRole" IN ('upload_staging','parser_input','attempt_original','attempt_variant') AND "state" IN ('prepared','writing','written','selected','superseded','retiring','cleanup_required','delete_evidence_required','cleaned') AND "cleanupStatus" IN ('none','required','deleting','evidence_required','complete') AND "version">=0 AND "objectKey" ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$' AND position('..' in "objectKey")=0 AND position('\' in "objectKey")=0);
ALTER TABLE "media_processing_readiness" ADD CONSTRAINT "media_processing_readiness_check" CHECK ("contractVersion"='media-processing-readiness.v1' AND "probeResult" IN ('healthy','failed') AND "probeExpiresAt"="probedAt"+INTERVAL '30 seconds' AND "revision">=0);
ALTER TABLE "media_retry_commands" ADD CONSTRAINT "media_retry_command_check" CHECK ("contractVersion"='media-retry-command.v1' AND "expiresAt"="createdAt"+INTERVAL '8 days');

CREATE INDEX "media_assets_dealer_gin" ON "media_assets" USING GIN ("dealerIds");
CREATE INDEX "media_assets_location_gin" ON "media_assets" USING GIN ("locationIds");
CREATE INDEX "media_usages_dealer_gin" ON "media_usages" USING GIN ("dealerIds");
CREATE INDEX "media_usages_location_gin" ON "media_usages" USING GIN ("locationIds");

ALTER TABLE "media_storage_operations" ADD CONSTRAINT "media_storage_operations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "media_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_storage_operations" ADD CONSTRAINT "media_storage_operations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "async_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_retry_commands" ADD CONSTRAINT "media_retry_commands_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "async_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend immutable P04 resource registry for exact P07 resources.
ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_resource_type_check";
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_resource_type_check" CHECK ("resourceType" IN ('user','role','permission','dealer','dealer_location','membership','product','category','inventory','price','promotion','order','shipment','checkout_session','payment_session','refund','customer','content','review','lead','support','email','erp_job','runtime_config','feature_flag','audit_event','async_job','job_artifact','work_queue_item','in_app_notification','work_queue_source_state','media_asset','media_variant','media_usage','media_upload_intent','media_storage_operation'));
