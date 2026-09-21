-- GENERATED — POST-COMMIT CONCURRENT PHASE, NOT TRANSACTIONAL
-- model SHA-256: df097e6c6f4e312f51e6dc7861ae5d422e077ee277f4d0030b3358dc6fc2461c
-- schema SHA-256: 80a41274ec4a93fa0f2822b48404b1263f1e028e1a1711b9edcff0ad63069372
-- generator SHA-256: c28d864faf9f5c16aa744b6352aec9e9fea770a42b7df52a0b3c9c9c50dfe8b0
-- status: FROZEN
DROP INDEX CONCURRENTLY IF EXISTS privacy_consent_authenticated_latest_idx_v2;
CREATE INDEX CONCURRENTLY privacy_consent_authenticated_latest_idx_v2 ON public.privacy_consent_events("authenticatedSubjectDigest","subjectKeyVersion","identityRealmVersion","identityEpoch","consentSchemaVersion","createdAt" DESC,id DESC) WHERE "authorityVersion"=2;
DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='privacy_consent_authenticated_latest_idx_v2' AND i.indisvalid AND i.indisready) THEN RAISE EXCEPTION 'CONCURRENT_INDEX_NOT_READY';END IF;END$$;
