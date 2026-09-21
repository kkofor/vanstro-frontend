-- P08 v1.2: four P08-owned Import/Export Foundation tables.
-- Forward-only. Migrations 1-62 and P05 JobArtifact schema remain immutable.

CREATE FUNCTION public.p08_canonical_text_array(value text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $p08_canonical_text_array$
  SELECT COALESCE(array_agg(item ORDER BY item), ARRAY[]::text[])
  FROM (SELECT DISTINCT unnest(value) AS item) canonical
$p08_canonical_text_array$;

REVOKE ALL ON FUNCTION public.p08_canonical_text_array(text[]) FROM PUBLIC;

CREATE TABLE "dashboard_import_batch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "authorizationScopeKind" TEXT NOT NULL,
  "dealerIdsSnapshot" TEXT[] NOT NULL,
  "locationIdsSnapshot" TEXT[] NOT NULL,
  "contextRevision" TEXT NOT NULL,
  "scopeFingerprint" TEXT NOT NULL,
  "fieldVisibilityFingerprint" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sourceArtifactId" UUID,
  "uploadIntentFilename" TEXT NOT NULL,
  "uploadIntentContentType" TEXT NOT NULL,
  "uploadIntentDeclaredByteSize" BIGINT NOT NULL,
  "uploadTokenHash" TEXT NOT NULL,
  "uploadTokenExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "uploadTokenConsumedAt" TIMESTAMPTZ(3),
  "uploadIntentHash" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "validRowCount" INTEGER NOT NULL DEFAULT 0,
  "invalidRowCount" INTEGER NOT NULL DEFAULT 0,
  "committedRowCount" INTEGER NOT NULL DEFAULT 0,
  "failedCommitRowCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previewedAt" TIMESTAMPTZ(3),
  "commitRequestedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "registryVersion" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "parserVersion" TEXT NOT NULL,
  "securityPolicyVersion" TEXT NOT NULL,
  "normalizedRowsSha256" TEXT,
  "previewBindingHash" TEXT,
  "previewExpiresAt" TIMESTAMPTZ(3),
  "payloadPurgeDueAt" TIMESTAMPTZ(3),
  "payloadsPurgedAt" TIMESTAMPTZ(3),
  "payloadPurgeAttemptCount" INTEGER NOT NULL DEFAULT 0,
  "payloadPurgeLastAttemptAt" TIMESTAMPTZ(3),
  "payloadPurgeLastErrorCode" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "dashboard_import_batch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dashboard_import_batch_source_artifact_key" UNIQUE ("sourceArtifactId"),
  CONSTRAINT "dashboard_import_batch_identity_check" CHECK (
    btrim("authorizationScopeKind") <> '' AND btrim("contextRevision") <> '' AND btrim("createdBy") <> ''
    AND "objectKey" = 'foundation.sample'
  ),
  CONSTRAINT "dashboard_import_batch_hash_check" CHECK (
    "scopeFingerprint" ~ '^[0-9a-f]{64}$' AND "fieldVisibilityFingerprint" ~ '^[0-9a-f]{64}$'
    AND "uploadTokenHash" ~ '^[0-9a-f]{64}$' AND "uploadIntentHash" ~ '^[0-9a-f]{64}$'
    AND ("normalizedRowsSha256" IS NULL OR "normalizedRowsSha256" ~ '^[0-9a-f]{64}$')
    AND ("previewBindingHash" IS NULL OR "previewBindingHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "dashboard_import_batch_scope_check" CHECK (
    array_position("dealerIdsSnapshot", NULL) IS NULL AND array_position("locationIdsSnapshot", NULL) IS NULL
    AND "dealerIdsSnapshot" = public.p08_canonical_text_array("dealerIdsSnapshot")
    AND "locationIdsSnapshot" = public.p08_canonical_text_array("locationIdsSnapshot")
    AND (("authorizationScopeKind" = 'global' AND cardinality("dealerIdsSnapshot") = 0 AND cardinality("locationIdsSnapshot") = 0)
      OR ("authorizationScopeKind" = 'dealer' AND cardinality("dealerIdsSnapshot") > 0 AND cardinality("locationIdsSnapshot") = 0)
      OR ("authorizationScopeKind" = 'location' AND cardinality("dealerIdsSnapshot") > 0 AND cardinality("locationIdsSnapshot") > 0))
  ),
  CONSTRAINT "dashboard_import_batch_status_check" CHECK ("status" IN (
    'awaiting_upload','uploaded','parsing','preview_ready','preview_failed','commit_queued','committing',
    'completed','completed_with_errors','failed','cancelled','expired'
  )),
  CONSTRAINT "dashboard_import_batch_source_state_check" CHECK (
    ("status" = 'awaiting_upload' AND "sourceArtifactId" IS NULL AND "uploadTokenConsumedAt" IS NULL)
    OR ("status" <> 'awaiting_upload' AND "sourceArtifactId" IS NOT NULL AND "uploadTokenConsumedAt" IS NOT NULL)
  ),
  CONSTRAINT "dashboard_import_batch_upload_check" CHECK (
    btrim("uploadIntentFilename") <> '' AND btrim("uploadIntentContentType") <> ''
    AND "uploadIntentDeclaredByteSize" > 0 AND "uploadTokenExpiresAt" > "createdAt"
  ),
  CONSTRAINT "dashboard_import_batch_counters_check" CHECK (
    "rowCount" >= 0 AND "validRowCount" >= 0 AND "invalidRowCount" >= 0
    AND "committedRowCount" >= 0 AND "failedCommitRowCount" >= 0
    AND "validRowCount" + "invalidRowCount" <= "rowCount"
    AND "committedRowCount" + "failedCommitRowCount" <= "validRowCount"
    AND "payloadPurgeAttemptCount" >= 0
  ),
  CONSTRAINT "dashboard_import_batch_preview_check" CHECK (
    ("previewBindingHash" IS NULL) = ("previewedAt" IS NULL)
    AND ("previewExpiresAt" IS NULL OR ("previewedAt" IS NOT NULL AND "previewExpiresAt" > "previewedAt"))
    AND ("payloadPurgeDueAt" IS NULL OR "previewedAt" IS NOT NULL)
    AND ("payloadsPurgedAt" IS NULL OR ("payloadPurgeDueAt" IS NOT NULL AND "payloadsPurgedAt" >= "payloadPurgeDueAt"))
  ),
  CONSTRAINT "dashboard_import_batch_source_artifact_fkey" FOREIGN KEY ("sourceArtifactId") REFERENCES "job_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "dashboard_import_row" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchId" UUID NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "rawPayload" JSONB,
  "normalizedPayload" JSONB,
  "validationStatus" TEXT NOT NULL,
  "validationErrors" JSONB NOT NULL,
  "commitStatus" TEXT NOT NULL,
  "targetRecordId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_import_row_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dashboard_import_row_row_number_check" CHECK ("rowNumber" >= 2),
  CONSTRAINT "dashboard_import_row_validation_check" CHECK ("validationStatus" IN ('valid','invalid')),
  CONSTRAINT "dashboard_import_row_commit_check" CHECK ("commitStatus" IN ('not_attempted','committed','failed','skipped')),
  CONSTRAINT "dashboard_import_row_errors_check" CHECK (jsonb_typeof("validationErrors") = 'array'),
  CONSTRAINT "dashboard_import_row_batch_row_key" UNIQUE ("batchId", "rowNumber"),
  CONSTRAINT "dashboard_import_row_batch_fkey" FOREIGN KEY ("batchId") REFERENCES "dashboard_import_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "dashboard_export_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "authorizationScopeKind" TEXT NOT NULL,
  "dealerIdsSnapshot" TEXT[] NOT NULL,
  "locationIdsSnapshot" TEXT[] NOT NULL,
  "contextRevision" TEXT NOT NULL,
  "scopeFingerprint" TEXT NOT NULL,
  "fieldVisibilityFingerprint" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "querySnapshot" JSONB NOT NULL,
  "formulaVersion" TEXT NOT NULL,
  "requestedFormat" TEXT NOT NULL,
  "jobId" UUID NOT NULL,
  "artifactId" UUID,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "dashboard_export_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dashboard_export_request_identity_check" CHECK (
    btrim("authorizationScopeKind") <> '' AND btrim("contextRevision") <> '' AND btrim("createdBy") <> ''
    AND "objectKey" = 'foundation.sample'
  ),
  CONSTRAINT "dashboard_export_request_hash_check" CHECK (
    "scopeFingerprint" ~ '^[0-9a-f]{64}$' AND "fieldVisibilityFingerprint" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "dashboard_export_request_scope_check" CHECK (
    array_position("dealerIdsSnapshot", NULL) IS NULL AND array_position("locationIdsSnapshot", NULL) IS NULL
    AND "dealerIdsSnapshot" = public.p08_canonical_text_array("dealerIdsSnapshot")
    AND "locationIdsSnapshot" = public.p08_canonical_text_array("locationIdsSnapshot")
    AND (("authorizationScopeKind" = 'global' AND cardinality("dealerIdsSnapshot") = 0 AND cardinality("locationIdsSnapshot") = 0)
      OR ("authorizationScopeKind" = 'dealer' AND cardinality("dealerIdsSnapshot") > 0 AND cardinality("locationIdsSnapshot") = 0)
      OR ("authorizationScopeKind" = 'location' AND cardinality("dealerIdsSnapshot") > 0 AND cardinality("locationIdsSnapshot") > 0))
  ),
  CONSTRAINT "dashboard_export_request_status_check" CHECK ("status" IN ('queued','running','completed','failed','cancelled','expired')),
  CONSTRAINT "dashboard_export_request_format_check" CHECK ("formulaVersion" = 'foundation.sample.export.v1' AND "requestedFormat" = 'csv'),
  CONSTRAINT "dashboard_export_request_counter_check" CHECK ("rowCount" >= 0),
  CONSTRAINT "dashboard_export_request_job_fkey" FOREIGN KEY ("jobId") REFERENCES "async_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dashboard_export_request_artifact_fkey" FOREIGN KEY ("artifactId") REFERENCES "job_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "foundation_sample" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "externalKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "effectiveDate" DATE,
  "note" TEXT,
  "authorizationScopeKind" TEXT NOT NULL,
  "dealerIdsSnapshot" TEXT[] NOT NULL,
  "locationIdsSnapshot" TEXT[] NOT NULL,
  "scopeFingerprint" TEXT NOT NULL,
  "fieldVisibilityFingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "foundation_sample_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "foundation_sample_data_check" CHECK (
    char_length("externalKey") BETWEEN 1 AND 64 AND char_length("label") BETWEEN 1 AND 120
    AND "state" IN ('active','inactive') AND "quantity" BETWEEN 0 AND 1000000
    AND ("note" IS NULL OR char_length("note") <= 500)
  ),
  CONSTRAINT "foundation_sample_hash_check" CHECK (
    "scopeFingerprint" ~ '^[0-9a-f]{64}$' AND "fieldVisibilityFingerprint" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "foundation_sample_scope_check" CHECK (
    array_position("dealerIdsSnapshot", NULL) IS NULL AND array_position("locationIdsSnapshot", NULL) IS NULL
    AND "dealerIdsSnapshot" = public.p08_canonical_text_array("dealerIdsSnapshot")
    AND "locationIdsSnapshot" = public.p08_canonical_text_array("locationIdsSnapshot")
    AND (("authorizationScopeKind" = 'global' AND cardinality("dealerIdsSnapshot") = 0 AND cardinality("locationIdsSnapshot") = 0)
      OR ("authorizationScopeKind" = 'dealer' AND cardinality("dealerIdsSnapshot") > 0 AND cardinality("locationIdsSnapshot") = 0)
      OR ("authorizationScopeKind" = 'location' AND cardinality("dealerIdsSnapshot") > 0 AND cardinality("locationIdsSnapshot") > 0))
  ),
  CONSTRAINT "foundation_sample_scope_external_key" UNIQUE (
    "authorizationScopeKind", "dealerIdsSnapshot", "locationIdsSnapshot", "scopeFingerprint", "fieldVisibilityFingerprint", "externalKey"
  )
);

CREATE INDEX "dashboard_import_batch_scope_created_idx" ON "dashboard_import_batch" ("scopeFingerprint", "createdAt" DESC, "id" DESC);
CREATE INDEX "dashboard_import_batch_status_upload_expiry_idx" ON "dashboard_import_batch" ("status", "uploadTokenExpiresAt");
CREATE INDEX "dashboard_import_batch_payload_purge_idx" ON "dashboard_import_batch" ("payloadPurgeDueAt", "payloadsPurgedAt");
CREATE INDEX "dashboard_import_batch_creator_created_idx" ON "dashboard_import_batch" ("createdBy", "createdAt" DESC);
CREATE INDEX "dashboard_import_row_batch_pagination_idx" ON "dashboard_import_row" ("batchId", "rowNumber", "id");
CREATE INDEX "dashboard_export_request_scope_created_idx" ON "dashboard_export_request" ("scopeFingerprint", "createdAt" DESC, "id" DESC);
CREATE INDEX "dashboard_export_request_status_created_idx" ON "dashboard_export_request" ("status", "createdAt" DESC);
CREATE INDEX "dashboard_export_request_creator_created_idx" ON "dashboard_export_request" ("createdBy", "createdAt" DESC);
CREATE INDEX "dashboard_export_request_job_idx" ON "dashboard_export_request" ("jobId");
CREATE INDEX "foundation_sample_scope_external_idx" ON "foundation_sample" ("scopeFingerprint", "externalKey", "id");

INSERT INTO "permissions" ("id", "key", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'dashboard.import.foundation_sample.read', 'Read foundation sample imports', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'dashboard.import.foundation_sample.create', 'Create foundation sample imports', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'dashboard.import.foundation_sample.commit', 'Commit foundation sample imports', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'dashboard.export.foundation_sample.read', 'Read foundation sample exports', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'dashboard.export.foundation_sample.create', 'Create foundation sample exports', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'dashboard.export.foundation_sample.download', 'Download foundation sample exports', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

REVOKE ALL ON TABLE "dashboard_import_batch", "dashboard_import_row", "dashboard_export_request", "foundation_sample" FROM PUBLIC, vanstro_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE "dashboard_import_batch", "dashboard_import_row", "dashboard_export_request", "foundation_sample" TO vanstro_runtime;

DO $p08_post_assertions$
BEGIN
  IF pg_catalog.has_schema_privilege('vanstro_runtime', 'public', 'CREATE')
     OR pg_catalog.has_table_privilege('public', 'public.dashboard_import_batch', 'SELECT')
     OR pg_catalog.has_table_privilege('public', 'public.foundation_sample', 'SELECT')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.dashboard_import_batch', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.dashboard_import_row', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.dashboard_export_request', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.foundation_sample', 'DELETE') THEN
    RAISE EXCEPTION 'migration 63 runtime permission boundary mismatch';
  END IF;
END
$p08_post_assertions$;
