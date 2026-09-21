CREATE OR REPLACE FUNCTION guard_in_app_notification_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[];
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."recipientUserId" IS DISTINCT FROM OLD."recipientUserId"
     OR NEW."workItemId" IS DISTINCT FROM OLD."workItemId"
     OR NEW."contractVersion" IS DISTINCT FROM OLD."contractVersion"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."typeVersion" IS DISTINCT FROM OLD."typeVersion"
     OR NEW."severity" IS DISTINCT FROM OLD."severity"
     OR NEW."titleKey" IS DISTINCT FROM OLD."titleKey"
     OR NEW."messageKey" IS DISTINCT FROM OLD."messageKey"
     OR NEW."safeMessageArgs" IS DISTINCT FROM OLD."safeMessageArgs"
     OR NEW."resourceType" IS DISTINCT FROM OLD."resourceType"
     OR NEW."resourceId" IS DISTINCT FROM OLD."resourceId"
     OR NEW."deepLink" IS DISTINCT FROM OLD."deepLink"
     OR NEW."authorizationScopeKind" IS DISTINCT FROM OLD."authorizationScopeKind"
     OR NEW."dealerIds" IS DISTINCT FROM OLD."dealerIds"
     OR NEW."locationIds" IS DISTINCT FROM OLD."locationIds"
     OR NEW."deduplicationKeyKid" IS DISTINCT FROM OLD."deduplicationKeyKid"
     OR NEW."deduplicationKeyHash" IS DISTINCT FROM OLD."deduplicationKeyHash"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
     OR OLD."readAt" IS NOT NULL
     OR NEW."readAt" IS NULL
     OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'notification identity is immutable';
  END IF;

  NEW."readAt" := CURRENT_TIMESTAMP;
  SELECT coalesce(array_agg(n.key ORDER BY n.key), ARRAY[]::text[]) INTO changed
  FROM jsonb_each(to_jsonb(NEW)) n
  JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
  WHERE n.value IS DISTINCT FROM o.value;
  IF changed <> ARRAY['readAt','version']::text[] THEN
    RAISE EXCEPTION 'notification permits only readAt transition';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION guard_work_queue_item_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[];
  business_changed text[];
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."contractVersion" IS DISTINCT FROM OLD."contractVersion"
     OR NEW."registryVersion" IS DISTINCT FROM OLD."registryVersion"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."typeVersion" IS DISTINCT FROM OLD."typeVersion"
     OR NEW."source" IS DISTINCT FROM OLD."source"
     OR NEW."resourceType" IS DISTINCT FROM OLD."resourceType"
     OR NEW."resourceId" IS DISTINCT FROM OLD."resourceId"
     OR NEW."authorizationScopeKind" IS DISTINCT FROM OLD."authorizationScopeKind"
     OR NEW."dealerIds" IS DISTINCT FROM OLD."dealerIds"
     OR NEW."locationIds" IS DISTINCT FROM OLD."locationIds"
     OR NEW."sourcePermission" IS DISTINCT FROM OLD."sourcePermission"
     OR NEW."deduplicationKeyKid" IS DISTINCT FROM OLD."deduplicationKeyKid"
     OR NEW."deduplicationKeyHash" IS DISTINCT FROM OLD."deduplicationKeyHash"
     OR NEW."occurrence" IS DISTINCT FROM OLD."occurrence"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR NEW."requestId" IS DISTINCT FROM OLD."requestId"
     OR NEW."retentionClass" IS DISTINCT FROM OLD."retentionClass"
     OR NEW."retentionPolicyVersion" IS DISTINCT FROM OLD."retentionPolicyVersion"
     OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'work queue identity is immutable';
  END IF;

  SELECT coalesce(array_agg(n.key ORDER BY n.key), ARRAY[]::text[]) INTO changed
  FROM jsonb_each(to_jsonb(NEW)) n
  JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
  WHERE n.value IS DISTINCT FROM o.value;
  business_changed := array_remove(array_remove(changed, 'version'), 'updatedAt');
  IF cardinality(business_changed) = 0 THEN
    RAISE EXCEPTION 'work queue no-op version bump is forbidden';
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status" THEN
    IF OLD."status" = 'open' AND NEW."status" = 'acknowledged' THEN
      IF NOT (changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','lastTransitionReason','status','updatedAt','version']::text[]) THEN RAISE EXCEPTION 'invalid acknowledge columns'; END IF;
    ELSIF OLD."status" IN ('open','acknowledged') AND NEW."status" = 'resolved' THEN
      IF NOT (changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','health','lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','updatedAt','version']::text[]) THEN RAISE EXCEPTION 'invalid resolve columns'; END IF;
    ELSIF OLD."status" IN ('open','acknowledged') AND NEW."status" = 'dismissed' THEN
      IF NOT (changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','retentionExpiresAt','status','updatedAt','version']::text[]) THEN RAISE EXCEPTION 'invalid dismiss columns'; END IF;
    ELSIF OLD."status" IN ('resolved','dismissed') AND NEW."status" = 'open' THEN
      IF NOT (changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','updatedAt','version']::text[]) THEN RAISE EXCEPTION 'invalid reopen columns'; END IF;
    ELSIF OLD."status" IN ('open','acknowledged') AND NEW."status" = 'expired' THEN
      IF NOT (changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','lastTransitionReason','retentionExpiresAt','status','updatedAt','version']::text[]) THEN RAISE EXCEPTION 'invalid expiry columns'; END IF;
    ELSE
      RAISE EXCEPTION 'illegal work queue transition';
    END IF;
  ELSIF changed && ARRAY['assignedAt','assignedByActorId','assignedByActorType','assignedToUserId']::text[] THEN
    IF NOT (changed <@ ARRAY['assignedAt','assignedByActorId','assignedByActorType','assignedToUserId','updatedAt','version']::text[]) THEN RAISE EXCEPTION 'invalid assignment columns'; END IF;
  ELSIF changed && ARRAY['deepLink']::text[] THEN
    IF NOT (changed <@ ARRAY['deepLink','health','lastTransitionReason','updatedAt','version']::text[]) THEN RAISE EXCEPTION 'invalid orphan columns'; END IF;
  ELSIF NOT (changed <@ ARRAY['dueAt','health','lastObservedAt','lastTransitionReason','safeSummary','severity','sourceIntentHash','sourceRevision','updatedAt','version']::text[]) THEN
    RAISE EXCEPTION 'invalid source observation columns';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION guard_work_queue_source_state_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[];
  business_changed text[];
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."adapterKey" IS DISTINCT FROM OLD."adapterKey"
     OR NEW."adapterVersion" IS DISTINCT FROM OLD."adapterVersion"
     OR NEW."revision" <> OLD."revision" + 1 THEN
    RAISE EXCEPTION 'work queue source identity is immutable';
  END IF;
  SELECT coalesce(array_agg(n.key ORDER BY n.key), ARRAY[]::text[]) INTO changed
  FROM jsonb_each(to_jsonb(NEW)) n
  JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
  WHERE n.value IS DISTINCT FROM o.value;
  business_changed := array_remove(array_remove(changed, 'revision'), 'updatedAt');
  IF cardinality(business_changed) = 0
     OR NOT (changed <@ ARRAY['capturedAt','health','lastFailureAt','lastSuccessAt','revision','safeErrorCode','updatedAt']::text[]) THEN
    RAISE EXCEPTION 'invalid work queue source transition columns';
  END IF;
  RETURN NEW;
END $$;
