CREATE OR REPLACE FUNCTION guard_work_queue_item_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  changed text[];
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

  IF NEW."status" IS DISTINCT FROM OLD."status" THEN
    IF OLD."status" = 'open' AND NEW."status" = 'acknowledged'
       AND changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','lastTransitionReason','status','updatedAt','version']::text[]
       AND changed @> ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','lastTransitionReason','status','version']::text[]
       AND NEW."acknowledgedAt" IS NOT NULL AND NEW."acknowledgedByActorType" IN ('admin_user','system') AND NEW."acknowledgedByActorId" IS NOT NULL THEN RETURN NEW;
    ELSIF OLD."status" = 'open' AND NEW."status" = 'resolved'
       AND changed <@ ARRAY['health','lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','updatedAt','version']::text[]
       AND changed @> ARRAY['lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','version']::text[]
       AND NEW."resolvedAt" IS NOT NULL AND NEW."resolvedByActorType" IN ('admin_user','system') AND NEW."resolvedByActorId" IS NOT NULL AND NEW."resolutionReason" IS NOT NULL AND NEW."retentionExpiresAt" IS NOT NULL THEN RETURN NEW;
    ELSIF OLD."status" = 'acknowledged' AND NEW."status" = 'resolved'
       AND changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','health','lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','updatedAt','version']::text[]
       AND changed @> ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','version']::text[]
       AND NEW."acknowledgedAt" IS NULL AND NEW."acknowledgedByActorType" IS NULL AND NEW."acknowledgedByActorId" IS NULL AND NEW."resolvedAt" IS NOT NULL AND NEW."resolvedByActorType" IN ('admin_user','system') AND NEW."resolvedByActorId" IS NOT NULL AND NEW."resolutionReason" IS NOT NULL AND NEW."retentionExpiresAt" IS NOT NULL THEN RETURN NEW;
    ELSIF OLD."status" = 'open' AND NEW."status" = 'dismissed'
       AND changed <@ ARRAY['dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','retentionExpiresAt','status','updatedAt','version']::text[]
       AND changed @> ARRAY['dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','retentionExpiresAt','status','version']::text[]
       AND NEW."dismissedAt" IS NOT NULL AND NEW."dismissedByActorType" IN ('admin_user','system') AND NEW."dismissedByActorId" IS NOT NULL AND NEW."dismissalReason" IS NOT NULL AND NEW."retentionExpiresAt" IS NOT NULL THEN RETURN NEW;
    ELSIF OLD."status" = 'acknowledged' AND NEW."status" = 'dismissed'
       AND changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','retentionExpiresAt','status','updatedAt','version']::text[]
       AND changed @> ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','retentionExpiresAt','status','version']::text[]
       AND NEW."acknowledgedAt" IS NULL AND NEW."acknowledgedByActorType" IS NULL AND NEW."acknowledgedByActorId" IS NULL AND NEW."dismissedAt" IS NOT NULL AND NEW."dismissedByActorType" IN ('admin_user','system') AND NEW."dismissedByActorId" IS NOT NULL AND NEW."dismissalReason" IS NOT NULL AND NEW."retentionExpiresAt" IS NOT NULL THEN RETURN NEW;
    ELSIF OLD."status" = 'resolved' AND NEW."status" = 'open'
       AND changed <@ ARRAY['lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','updatedAt','version']::text[]
       AND changed @> ARRAY['lastTransitionReason','resolutionReason','resolvedAt','resolvedByActorId','resolvedByActorType','retentionExpiresAt','status','version']::text[]
       AND NEW."resolvedAt" IS NULL AND NEW."resolvedByActorType" IS NULL AND NEW."resolvedByActorId" IS NULL AND NEW."resolutionReason" IS NULL AND NEW."retentionExpiresAt" IS NULL THEN RETURN NEW;
    ELSIF OLD."status" = 'dismissed' AND NEW."status" = 'open'
       AND changed <@ ARRAY['dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','retentionExpiresAt','status','updatedAt','version']::text[]
       AND changed @> ARRAY['dismissalReason','dismissedAt','dismissedByActorId','dismissedByActorType','lastTransitionReason','retentionExpiresAt','status','version']::text[]
       AND NEW."dismissedAt" IS NULL AND NEW."dismissedByActorType" IS NULL AND NEW."dismissedByActorId" IS NULL AND NEW."dismissalReason" IS NULL AND NEW."retentionExpiresAt" IS NULL THEN RETURN NEW;
    ELSIF OLD."status" IN ('open','acknowledged') AND NEW."status" = 'expired'
       AND changed <@ ARRAY['acknowledgedAt','acknowledgedByActorId','acknowledgedByActorType','lastTransitionReason','retentionExpiresAt','status','updatedAt','version']::text[]
       AND changed @> ARRAY['lastTransitionReason','retentionExpiresAt','status','version']::text[] AND NEW."retentionExpiresAt" IS NOT NULL THEN RETURN NEW;
    END IF;
    RAISE EXCEPTION 'invalid work queue status transition family';
  END IF;

  IF changed && ARRAY['assignedAt','assignedByActorId','assignedByActorType','assignedToUserId']::text[] THEN
    IF changed <@ ARRAY['assignedAt','assignedByActorId','assignedByActorType','assignedToUserId','updatedAt','version']::text[]
       AND changed @> ARRAY['assignedAt','assignedToUserId','version']::text[]
       AND ((NEW."assignedToUserId" IS NULL AND NEW."assignedAt" IS NULL AND NEW."assignedByActorType" IS NULL AND NEW."assignedByActorId" IS NULL
             AND changed @> ARRAY['assignedByActorId','assignedByActorType']::text[])
         OR (NEW."assignedToUserId" IS NOT NULL AND NEW."assignedAt" IS NOT NULL AND NEW."assignedByActorType" IN ('admin_user','system') AND NEW."assignedByActorId" IS NOT NULL)) THEN RETURN NEW;
    END IF;
    RAISE EXCEPTION 'invalid work queue assignment family';
  END IF;

  IF changed && ARRAY['deepLink']::text[] THEN
    IF changed <@ ARRAY['deepLink','health','lastTransitionReason','updatedAt','version']::text[]
       AND changed @> ARRAY['deepLink','health','lastTransitionReason','version']::text[]
       AND NEW."deepLink" IS NULL AND NEW."health" = 'orphaned' THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'invalid work queue orphan family';
  END IF;

  IF changed && ARRAY['sourceRevision','sourceIntentHash','safeSummary','lastObservedAt']::text[] THEN
    IF changed <@ ARRAY['dueAt','lastObservedAt','safeSummary','severity','sourceIntentHash','sourceRevision','updatedAt','version']::text[]
       AND changed @> ARRAY['lastObservedAt','safeSummary','sourceIntentHash','sourceRevision','version']::text[] THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'invalid work queue observation family';
  END IF;

  IF changed && ARRAY['health']::text[] THEN
    IF changed <@ ARRAY['health','lastTransitionReason','updatedAt','version']::text[]
       AND changed @> ARRAY['health','lastTransitionReason','version']::text[] THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'invalid work queue health family';
  END IF;

  RAISE EXCEPTION 'invalid work queue changed-column family';
END $$;
