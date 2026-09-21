-- GENERATED — POST-COMMIT CONCURRENT PHASE, NOT TRANSACTIONAL
-- model SHA-256: 7376e74962984bf4a73733edcfdf308b979d62a0fc34a8ee9c11e9e013a181a8
-- schema SHA-256: b40af890b5a81e3aacde2d2715c6b10fe0a64f930d0c3c5eb97c147e5ae56f2b
-- generator SHA-256: f19cee679a0c112b62e5cc19465ffce409adfd4a32b97a2101bd6013e7627301
-- status: FROZEN
DROP INDEX CONCURRENTLY IF EXISTS privacy_consent_authenticated_latest_idx_v2;
CREATE INDEX CONCURRENTLY privacy_consent_authenticated_latest_idx_v2 ON public.privacy_consent_events("authenticatedSubjectDigest","subjectKeyVersion","identityRealmVersion","identityEpoch","consentSchemaVersion","createdAt" DESC,id DESC) WHERE "authorityVersion"=2;
DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='privacy_consent_authenticated_latest_idx_v2' AND i.indisvalid AND i.indisready) THEN RAISE EXCEPTION 'CONCURRENT_INDEX_NOT_READY';END IF;END$$;
