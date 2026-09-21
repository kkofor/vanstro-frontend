-- P07 v1.10 migration 58: forward-only invariant guards. Migrations 56 and 57 are immutable.

-- Retry-command retention is derived from one database timestamp. Existing rows are
-- validated before this migration can commit.
ALTER TABLE "media_retry_commands" DROP CONSTRAINT IF EXISTS "media_retry_command_check";
ALTER TABLE "media_retry_commands" ADD CONSTRAINT "media_retry_command_check"
  CHECK ("contractVersion" = 'media-retry-command.v1'
    AND "expiresAt" = "createdAt" + INTERVAL '8 days') NOT VALID;
ALTER TABLE "media_retry_commands" VALIDATE CONSTRAINT "media_retry_command_check";

-- A single-cardinality target slot is unique across Assets, not merely per Asset.
CREATE UNIQUE INDEX "media_usages_target_single_slot_key"
  ON "media_usages" ("entityType", "entityId", "slot")
  WHERE "slot" IN ('primary', 'hero', 'tile', 'logo', 'header');

CREATE OR REPLACE FUNCTION media_changed_columns(old_row jsonb, new_row jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
  FROM jsonb_each(old_row) old_value
  WHERE old_value.value IS DISTINCT FROM new_row -> old_value.key
$$;

CREATE OR REPLACE FUNCTION guard_media_asset_update()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[] := media_changed_columns(to_jsonb(OLD), to_jsonb(NEW));
  business_changed text[] := array_remove(array_remove(changed, 'version'), 'updatedAt');
  allowed text[];
BEGIN
  IF NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'media asset version must increment exactly once';
  END IF;
  IF business_changed = ARRAY[]::text[] THEN
    RAISE EXCEPTION 'media asset no-op/version-only update is forbidden';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status','priorRestorableStatus','receivedBytes','uploadChecksum','originalBytes','originalChecksum','detectedContentType','width','height','variantSetState','safeFailureCode','safeDisplayName','decorative','accessibilityComplete','focalX','focalY','credit','copyright','tags','archivedAt','archivedByActorType','archivedByActorId','archiveReason','retiring','tombstonedAt','retentionExpiresAt','version','updatedAt'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','priorRestorableStatus','receivedBytes','uploadChecksum','originalBytes','originalChecksum','detectedContentType','width','height','variantSetState','safeFailureCode','safeDisplayName','decorative','accessibilityComplete','focalX','focalY','credit','copyright','tags','archivedAt','archivedByActorType','archivedByActorId','archiveReason','retiring','tombstonedAt','retentionExpiresAt','version','updatedAt']) THEN
    RAISE EXCEPTION 'media asset immutable identity/scope/contract field changed';
  END IF;

  IF OLD."status" = NEW."status" THEN
    IF OLD."status" = 'processing' AND OLD."variantSetState" IN ('unresolved','resolved')
       AND NEW."variantSetState" IN ('resolved','unresolved_failed')
       AND NEW."variantSetState" <> OLD."variantSetState" THEN
      allowed := ARRAY['width','height','variantSetState','safeFailureCode'];
    ELSIF NEW."retiring" IS TRUE AND OLD."retiring" IS FALSE AND NEW."tombstonedAt" IS NOT NULL THEN
      allowed := ARRAY['retiring','tombstonedAt','retentionExpiresAt'];
    ELSE
      allowed := ARRAY['safeDisplayName','decorative','accessibilityComplete','focalX','focalY','credit','copyright','tags'];
    END IF;
  ELSIF OLD."status" = 'uploading' AND NEW."status" = 'processing' THEN
    allowed := ARRAY['status','receivedBytes','uploadChecksum','originalBytes','originalChecksum','detectedContentType','safeFailureCode'];
  ELSIF OLD."status" = 'uploading' AND NEW."status" = 'failed' THEN
    allowed := ARRAY['status','safeFailureCode'];
  ELSIF OLD."status" = 'processing' AND NEW."status" IN ('ready','failed','quarantined') THEN
    allowed := ARRAY['status','receivedBytes','uploadChecksum','originalBytes','originalChecksum','detectedContentType','width','height','variantSetState','safeFailureCode','accessibilityComplete'];
  ELSIF OLD."status" = 'failed' AND NEW."status" = 'processing' THEN
    allowed := ARRAY['status','safeFailureCode'];
  ELSIF OLD."status" IN ('ready','failed','quarantined') AND NEW."status" = 'archived'
        AND NEW."priorRestorableStatus" = OLD."status" AND NEW."archivedAt" IS NOT NULL THEN
    allowed := ARRAY['status','priorRestorableStatus','archivedAt','archivedByActorType','archivedByActorId','archiveReason'];
  ELSIF OLD."status" = 'archived' AND NEW."status" = OLD."priorRestorableStatus"
        AND NEW."priorRestorableStatus" IS NULL AND NEW."archivedAt" IS NULL
        AND NEW."archivedByActorType" IS NULL AND NEW."archivedByActorId" IS NULL
        AND NEW."archiveReason" IS NULL THEN
    allowed := ARRAY['status','priorRestorableStatus','archivedAt','archivedByActorType','archivedByActorId','archiveReason'];
  ELSE
    RAISE EXCEPTION 'illegal media asset status transition';
  END IF;

  IF NOT business_changed <@ allowed OR ('status' = ANY(business_changed) AND OLD."status" = NEW."status") THEN
    RAISE EXCEPTION 'invalid or mixed media asset transition family';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER media_asset_update_guard
BEFORE UPDATE ON "media_assets"
FOR EACH ROW EXECUTE FUNCTION guard_media_asset_update();

CREATE OR REPLACE FUNCTION guard_media_variant_update()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[] := media_changed_columns(to_jsonb(OLD), to_jsonb(NEW));
  business_changed text[] := array_remove(array_remove(changed, 'version'), 'updatedAt');
  allowed text[];
BEGIN
  IF NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'media variant version must increment exactly once';
  END IF;
  IF business_changed = ARRAY[]::text[] THEN
    RAISE EXCEPTION 'media variant no-op/version-only update is forbidden';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status','contentType','width','height','byteCount','checksum','storageOperationId','safeFailureCode','version','updatedAt'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','contentType','width','height','byteCount','checksum','storageOperationId','safeFailureCode','version','updatedAt']) THEN
    RAISE EXCEPTION 'media variant immutable identity/contract/relation field changed';
  END IF;

  IF OLD."status" = 'processing' AND NEW."status" = 'ready'
     AND NEW."storageOperationId" IS NOT NULL AND NEW."contentType" IS NOT NULL
     AND NEW."byteCount" IS NOT NULL AND NEW."checksum" IS NOT NULL THEN
    allowed := ARRAY['status','contentType','width','height','byteCount','checksum','storageOperationId','safeFailureCode'];
  ELSIF OLD."status" = 'processing' AND NEW."status" = 'failed' THEN
    allowed := ARRAY['status','safeFailureCode'];
  ELSIF OLD."status" = 'failed' AND NEW."status" = 'processing' THEN
    allowed := ARRAY['status','safeFailureCode'];
  ELSE
    RAISE EXCEPTION 'illegal media variant status transition';
  END IF;
  IF NOT business_changed <@ allowed OR NOT ('status' = ANY(business_changed)) THEN
    RAISE EXCEPTION 'invalid or mixed media variant transition family';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER media_variant_update_guard
BEFORE UPDATE ON "media_variants"
FOR EACH ROW EXECUTE FUNCTION guard_media_variant_update();

CREATE OR REPLACE FUNCTION guard_media_storage_operation_update()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[] := media_changed_columns(to_jsonb(OLD), to_jsonb(NEW));
  business_changed text[] := array_remove(array_remove(changed, 'version'), 'updatedAt');
  allowed text[];
BEGIN
  IF NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'media storage operation version must increment exactly once';
  END IF;
  IF business_changed = ARRAY[]::text[] THEN
    RAISE EXCEPTION 'media storage operation no-op/version-only update is forbidden';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['state','cleanupStatus','cleanupReason','byteCount','checksum','expiresAt','version','updatedAt'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['state','cleanupStatus','cleanupReason','byteCount','checksum','expiresAt','version','updatedAt']) THEN
    RAISE EXCEPTION 'media storage operation immutable identity/provider/object-key/relation field changed';
  END IF;

  IF OLD."state"='prepared' AND NEW."state"='writing' THEN allowed := ARRAY['state'];
  ELSIF OLD."state"='writing' AND NEW."state"='written' AND NEW."byteCount" IS NOT NULL AND NEW."checksum" IS NOT NULL THEN allowed := ARRAY['state','byteCount','checksum'];
  ELSIF OLD."state"='written' AND NEW."state"='selected' THEN allowed := ARRAY['state'];
  ELSIF OLD."state" IN ('prepared','writing','written') AND NEW."state"='cleanup_required' AND NEW."cleanupStatus"='required' THEN allowed := ARRAY['state','cleanupStatus','cleanupReason','expiresAt'];
  ELSIF OLD."state"='selected' AND NEW."state"='superseded'
        AND NOT EXISTS (SELECT 1 FROM "media_variants" v WHERE v."storageOperationId"=OLD."id") THEN allowed := ARRAY['state'];
  ELSIF OLD."state"='selected' AND NEW."state"='retiring'
        AND NOT EXISTS (SELECT 1 FROM "media_variants" v WHERE v."storageOperationId"=OLD."id") THEN allowed := ARRAY['state','cleanupReason','expiresAt'];
  ELSIF OLD."state" IN ('superseded','retiring') AND NEW."state"='cleanup_required' AND NEW."cleanupStatus"='required' THEN allowed := ARRAY['state','cleanupStatus','cleanupReason','expiresAt'];
  ELSIF OLD."state"='cleanup_required' AND NEW."state"='delete_evidence_required' AND NEW."cleanupStatus"='evidence_required' THEN allowed := ARRAY['state','cleanupStatus','cleanupReason'];
  ELSIF OLD."state" IN ('cleanup_required','delete_evidence_required') AND NEW."state"='cleaned' AND NEW."cleanupStatus"='complete'
        AND NOT EXISTS (SELECT 1 FROM "media_variants" v WHERE v."storageOperationId"=OLD."id") THEN allowed := ARRAY['state','cleanupStatus','cleanupReason'];
  ELSE
    RAISE EXCEPTION 'illegal media storage operation state transition';
  END IF;
  IF NOT business_changed <@ allowed OR NOT ('state' = ANY(business_changed)) THEN
    RAISE EXCEPTION 'invalid or mixed media storage operation transition family';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER media_storage_operation_update_guard
BEFORE UPDATE ON "media_storage_operations"
FOR EACH ROW EXECUTE FUNCTION guard_media_storage_operation_update();

CREATE OR REPLACE FUNCTION guard_media_usage_write()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent "media_assets"%ROWTYPE;
DECLARE changed text[];
BEGIN
  SELECT * INTO parent FROM "media_assets" WHERE "id"=NEW."assetId" FOR KEY SHARE;
  IF NOT FOUND OR parent."status" <> 'ready' OR parent."archivedAt" IS NOT NULL
     OR parent."retiring" OR parent."tombstonedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'media usage parent asset is not attachable';
  END IF;
  IF parent."authorizationScopeKind" IS DISTINCT FROM NEW."authorizationScopeKind"
     OR parent."dealerIds" IS DISTINCT FROM NEW."dealerIds"
     OR parent."locationIds" IS DISTINCT FROM NEW."locationIds" THEN
    RAISE EXCEPTION 'media usage scope must exactly equal parent asset scope';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'media usage version must increment exactly once'; END IF;
    IF (to_jsonb(NEW) - ARRAY['requiredLocales','version','updatedAt']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['requiredLocales','version','updatedAt']) THEN
      RAISE EXCEPTION 'media usage identity/scope is immutable';
    END IF;
    changed := array_remove(array_remove(media_changed_columns(to_jsonb(OLD),to_jsonb(NEW)),'version'),'updatedAt');
    IF changed = ARRAY[]::text[] OR NOT changed <@ ARRAY['requiredLocales'] THEN
      RAISE EXCEPTION 'media usage no-op or mixed update is forbidden';
    END IF;
  ELSIF NEW."version" <> 0 THEN
    RAISE EXCEPTION 'media usage insert version must be zero';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER media_usage_write_guard
BEFORE INSERT OR UPDATE ON "media_usages"
FOR EACH ROW EXECUTE FUNCTION guard_media_usage_write();

-- Physical evidence deletion is available only while executing the owner-only,
-- security-definer retention function below. Direct DELETE is always rejected.
CREATE OR REPLACE FUNCTION guard_media_evidence_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('vanstro.media_retention_delete', true) IS DISTINCT FROM 'enabled' THEN
    RAISE EXCEPTION 'direct media evidence delete is forbidden';
  END IF;
  IF TG_TABLE_NAME='media_storage_operations' AND (OLD."state" <> 'cleaned' OR OLD."cleanupStatus" <> 'complete'
      OR EXISTS (SELECT 1 FROM "media_variants" v WHERE v."storageOperationId"=OLD."id")) THEN
    RAISE EXCEPTION 'media storage operation cleanup prerequisites not proven';
  ELSIF TG_TABLE_NAME='media_retry_commands' AND OLD."expiresAt" > CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'media retry command retention has not elapsed';
  ELSIF TG_TABLE_NAME='media_upload_intents' AND (OLD."status" NOT IN ('consumed','failed','expired') OR OLD."cleanupState" <> 'complete') THEN
    RAISE EXCEPTION 'media upload intent cleanup prerequisites not proven';
  ELSIF TG_TABLE_NAME='media_assets' AND (OLD."tombstonedAt" IS NULL OR OLD."legalHold"
      OR EXISTS (SELECT 1 FROM "media_usages" u WHERE u."assetId"=OLD."id")
      OR EXISTS (SELECT 1 FROM "media_variants" v WHERE v."assetId"=OLD."id")
      OR EXISTS (SELECT 1 FROM "media_storage_operations" o WHERE o."assetId"=OLD."id" AND (o."state"<>'cleaned' OR o."cleanupStatus"<>'complete'))) THEN
    RAISE EXCEPTION 'media asset retention prerequisites not proven';
  ELSIF TG_TABLE_NAME='media_variants' AND EXISTS (SELECT 1 FROM "media_storage_operations" o WHERE o."variantId"=OLD."id" OR o."id"=OLD."storageOperationId") THEN
    RAISE EXCEPTION 'media variant retention prerequisites not proven';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER media_asset_delete_guard BEFORE DELETE ON "media_assets" FOR EACH ROW EXECUTE FUNCTION guard_media_evidence_delete();
CREATE TRIGGER media_variant_delete_guard BEFORE DELETE ON "media_variants" FOR EACH ROW EXECUTE FUNCTION guard_media_evidence_delete();
CREATE TRIGGER media_usage_delete_guard BEFORE DELETE ON "media_usages" FOR EACH ROW EXECUTE FUNCTION guard_media_evidence_delete();
CREATE TRIGGER media_upload_intent_delete_guard BEFORE DELETE ON "media_upload_intents" FOR EACH ROW EXECUTE FUNCTION guard_media_evidence_delete();
CREATE TRIGGER media_storage_operation_delete_guard BEFORE DELETE ON "media_storage_operations" FOR EACH ROW EXECUTE FUNCTION guard_media_evidence_delete();
CREATE TRIGGER media_retry_command_delete_guard BEFORE DELETE ON "media_retry_commands" FOR EACH ROW EXECUTE FUNCTION guard_media_evidence_delete();

CREATE OR REPLACE FUNCTION media_internal_retention_delete(table_name text, row_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE deleted bigint;
BEGIN
  IF table_name NOT IN ('media_assets','media_variants','media_usages','media_upload_intents','media_storage_operations','media_retry_commands') THEN
    RAISE EXCEPTION 'unsupported media retention table';
  END IF;
  PERFORM set_config('vanstro.media_retention_delete','enabled',true);
  EXECUTE format('DELETE FROM %I WHERE id=$1',table_name) USING row_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END $$;
REVOKE ALL ON FUNCTION media_internal_retention_delete(text,uuid) FROM PUBLIC;
