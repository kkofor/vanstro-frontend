CREATE FUNCTION guard_in_app_notification_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."recipientUserId" IS DISTINCT FROM OLD."recipientUserId" OR NEW."workItemId" IS DISTINCT FROM OLD."workItemId" OR NEW."contractVersion" IS DISTINCT FROM OLD."contractVersion" OR NEW."type" IS DISTINCT FROM OLD."type" OR NEW."typeVersion" IS DISTINCT FROM OLD."typeVersion" OR NEW."severity" IS DISTINCT FROM OLD."severity" OR NEW."titleKey" IS DISTINCT FROM OLD."titleKey" OR NEW."messageKey" IS DISTINCT FROM OLD."messageKey" OR NEW."safeMessageArgs" IS DISTINCT FROM OLD."safeMessageArgs" OR NEW."resourceType" IS DISTINCT FROM OLD."resourceType" OR NEW."resourceId" IS DISTINCT FROM OLD."resourceId" OR NEW."deepLink" IS DISTINCT FROM OLD."deepLink" OR NEW."authorizationScopeKind" IS DISTINCT FROM OLD."authorizationScopeKind" OR NEW."dealerIds" IS DISTINCT FROM OLD."dealerIds" OR NEW."locationIds" IS DISTINCT FROM OLD."locationIds" OR NEW."deduplicationKeyKid" IS DISTINCT FROM OLD."deduplicationKeyKid" OR NEW."deduplicationKeyHash" IS DISTINCT FROM OLD."deduplicationKeyHash" OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt" OR NEW."version" <> OLD."version" + 1 OR (OLD."readAt" IS NOT NULL AND NEW."readAt" IS DISTINCT FROM OLD."readAt") OR (OLD."readAt" IS NULL AND NEW."readAt" IS NULL) THEN RAISE EXCEPTION 'notification identity is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "in_app_notification_identity_guard" BEFORE UPDATE ON "in_app_notifications" FOR EACH ROW EXECUTE FUNCTION guard_in_app_notification_identity();

CREATE FUNCTION guard_work_queue_item_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."contractVersion" IS DISTINCT FROM OLD."contractVersion" OR NEW."registryVersion" IS DISTINCT FROM OLD."registryVersion" OR NEW."type" IS DISTINCT FROM OLD."type" OR NEW."typeVersion" IS DISTINCT FROM OLD."typeVersion" OR NEW."source" IS DISTINCT FROM OLD."source" OR NEW."resourceType" IS DISTINCT FROM OLD."resourceType" OR NEW."resourceId" IS DISTINCT FROM OLD."resourceId" OR NEW."authorizationScopeKind" IS DISTINCT FROM OLD."authorizationScopeKind" OR NEW."dealerIds" IS DISTINCT FROM OLD."dealerIds" OR NEW."locationIds" IS DISTINCT FROM OLD."locationIds" OR NEW."sourcePermission" IS DISTINCT FROM OLD."sourcePermission" OR NEW."deduplicationKeyKid" IS DISTINCT FROM OLD."deduplicationKeyKid" OR NEW."deduplicationKeyHash" IS DISTINCT FROM OLD."deduplicationKeyHash" OR NEW."occurrence" IS DISTINCT FROM OLD."occurrence" OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" OR NEW."requestId" IS DISTINCT FROM OLD."requestId" OR NEW."retentionClass" IS DISTINCT FROM OLD."retentionClass" OR NEW."retentionPolicyVersion" IS DISTINCT FROM OLD."retentionPolicyVersion" OR NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'work queue identity is immutable'; END IF;
  IF NOT ((OLD."status"='open' AND NEW."status" IN ('open','acknowledged','resolved','dismissed')) OR (OLD."status"='acknowledged' AND NEW."status" IN ('acknowledged','resolved','dismissed')) OR (OLD."status" IN ('resolved','dismissed') AND NEW."status" IN (OLD."status",'open')) OR (OLD."status"='expired' AND NEW."status"='expired')) THEN RAISE EXCEPTION 'illegal work queue transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "work_queue_item_identity_guard" BEFORE UPDATE ON "work_queue_items" FOR EACH ROW EXECUTE FUNCTION guard_work_queue_item_identity();

CREATE FUNCTION guard_work_queue_source_state_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."adapterKey" IS DISTINCT FROM OLD."adapterKey" OR NEW."adapterVersion" IS DISTINCT FROM OLD."adapterVersion" OR NEW."id" IS DISTINCT FROM OLD."id" OR NEW."revision" <> OLD."revision" + 1 THEN RAISE EXCEPTION 'work queue source identity is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "work_queue_source_state_identity_guard" BEFORE UPDATE ON "work_queue_source_states" FOR EACH ROW EXECUTE FUNCTION guard_work_queue_source_state_identity();
