-- Forward-only P07 registry extension. Migrations 1-56 remain immutable.
ALTER TABLE "work_queue_items" DROP CONSTRAINT "work_queue_contract_check";
ALTER TABLE "work_queue_items" ADD CONSTRAINT "work_queue_contract_check" CHECK (
  "contractVersion"='work-queue-item.v1' AND "registryVersion"='work-queue-registry.v1' AND (
    ("type"='foundation.attention' AND "typeVersion"='foundation.attention.v1' AND "source"='async_job' AND "resourceType"='async_job' AND "sourcePermission"='jobs.read') OR
    ("type"='media.processing_failure' AND "typeVersion"='media.processing_failure.v1' AND "source"='media_processing' AND "resourceType"='media_asset' AND "sourcePermission"='media.read')
  )
);
ALTER TABLE "work_queue_items" DROP CONSTRAINT "work_queue_foundation_attention_expiry_check";
ALTER TABLE "work_queue_items" ADD CONSTRAINT "work_queue_attention_expiry_check" CHECK (
  ("type" IN ('foundation.attention','media.processing_failure') AND "attentionExpiresAt" IS NULL)
);
ALTER TABLE "work_queue_items" ADD CONSTRAINT "work_queue_media_summary_check" CHECK (
  "type" <> 'media.processing_failure' OR (
    jsonb_typeof("safeSummary")='object'
    AND "safeSummary" ? 'stage' AND "safeSummary" ? 'failureCode'
    AND "safeSummary" - 'stage' - 'failureCode' = '{}'::jsonb
    AND "safeSummary"->>'stage' IN ('upload','scan','extract','sanitize','variants','verify','publish','storage','cleanup')
    AND "safeSummary"->>'failureCode' IN ('upload_failed','upload_abandoned','scan_quarantined','processing_failed','variant_failed','parser_isolation_failure','storage_inconsistent','cleanup_required')
    AND "deepLink" = '/dashboard/media?assetId=' || "resourceId"
  )
);

-- P05 registry is service-dispatched; DB constrains exact type/version/payload/result tuples.
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_job_registry_check" CHECK (
  "contractVersion"='async-job.v1' AND "schemaVersion"='async-job-schema.v1' AND (
    ("jobType"='foundation.probe' AND "jobTypeVersion"='foundation.probe.v1' AND "payloadSchemaVersion"='foundation-probe-input.v1' AND "resultSchemaVersion"='foundation-probe-result.v1') OR
    ("jobType"='media.process' AND "jobTypeVersion"='media.process.v1' AND "payloadSchemaVersion"='media-process-input.v1' AND "resultSchemaVersion"='media-process-result.v1') OR
    ("jobType"='media.cleanup' AND "jobTypeVersion"='media.cleanup.v1' AND "payloadSchemaVersion"='media-cleanup-input.v1' AND "resultSchemaVersion"='media-cleanup-result.v1')
  )
);
