ALTER TABLE "privacy_consent_events" ADD COLUMN "action" TEXT;

UPDATE "privacy_consent_events"
SET "action" = CASE
  WHEN "source" IN ('reject-all', 'essential-only')
    OR (
      COALESCE(("preferences"->>'functional')::boolean, false) = false
      AND COALESCE(("preferences"->>'analytics')::boolean, false) = false
      AND COALESCE(("preferences"->>'targeting')::boolean, false) = false
    ) THEN 'withdrawn'
  WHEN "source" = 'custom' THEN 'updated'
  ELSE 'granted'
END;

ALTER TABLE "privacy_consent_events" ALTER COLUMN "action" SET NOT NULL;
ALTER TABLE "privacy_consent_events" ADD CONSTRAINT "privacy_consent_events_action_check"
  CHECK ("action" IN ('granted', 'updated', 'withdrawn'));
