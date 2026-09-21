CREATE TABLE "audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventVersion" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "actorDisplayClass" TEXT NOT NULL,
  "effectiveRoles" JSONB NOT NULL,
  "permissionGrants" JSONB NOT NULL,
  "authorizationScopeKind" TEXT NOT NULL,
  "dealerIds" JSONB NOT NULL,
  "locationIds" JSONB NOT NULL,
  "contextRevision" TEXT NOT NULL,
  "authorizationContractVersion" TEXT NOT NULL,
  "capabilityVersion" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "result" TEXT NOT NULL,
  "reason" TEXT,
  "requestId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "correlationId" TEXT,
  "parentEventId" UUID,
  "idempotencyKeyHash" TEXT,
  "eventIntentHash" TEXT,
  "beforeSummary" JSONB,
  "afterSummary" JSONB,
  "metadata" JSONB,
  "sensitive" BOOLEAN NOT NULL DEFAULT false,
  "retentionClass" TEXT NOT NULL,
  "retentionPolicyVersion" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_events_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "audit_events"("id") ON DELETE RESTRICT,
  CONSTRAINT "audit_events_version_check" CHECK ("eventVersion" = 'audit-event.v1'),
  CONSTRAINT "audit_events_actor_check" CHECK ("actorType" IN ('admin_user','dealer_user','customer','service_account','worker','system','anonymous')),
  CONSTRAINT "audit_events_scope_check" CHECK ("authorizationScopeKind" IN ('global','dealer','location','none')),
  CONSTRAINT "audit_events_result_check" CHECK ("result" IN ('succeeded','failed','denied','partially_succeeded','cancelled')),
  CONSTRAINT "audit_events_source_check" CHECK ("source" IN ('dashboard_api','public_api','worker','service_api','system')),
  CONSTRAINT "audit_events_retention_class_check" CHECK ("retentionClass" IN ('default','high_risk')),
  CONSTRAINT "audit_events_retention_version_check" CHECK ("retentionPolicyVersion" = 'audit-retention.v1'),
  CONSTRAINT "audit_events_intent_pair_check" CHECK (("idempotencyKeyHash" IS NULL AND "eventIntentHash" IS NULL) OR ("idempotencyKeyHash" IS NOT NULL AND "eventIntentHash" IS NOT NULL)),
  CONSTRAINT "audit_events_actor_id_check" CHECK ("actorType" IN ('anonymous','system') OR "actorId" IS NOT NULL),
  CONSTRAINT "audit_events_json_shapes_check" CHECK (jsonb_typeof("effectiveRoles")='array' AND jsonb_typeof("permissionGrants")='array' AND jsonb_typeof("dealerIds")='array' AND jsonb_typeof("locationIds")='array' AND ("beforeSummary" IS NULL OR jsonb_typeof("beforeSummary")='object') AND ("afterSummary" IS NULL OR jsonb_typeof("afterSummary")='object') AND ("metadata" IS NULL OR jsonb_typeof("metadata")='object')),
  CONSTRAINT "audit_events_scope_arrays_check" CHECK (("authorizationScopeKind" IN ('global','none') AND "dealerIds"='[]'::jsonb AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='dealer' AND jsonb_array_length("dealerIds")>0 AND "locationIds"='[]'::jsonb) OR ("authorizationScopeKind"='location' AND jsonb_array_length("dealerIds")>0 AND jsonb_array_length("locationIds")>0)),
  CONSTRAINT "audit_events_expiry_check" CHECK ("expiresAt" > "occurredAt"),
  CONSTRAINT "audit_events_hash_length_check" CHECK (("idempotencyKeyHash" IS NULL OR length("idempotencyKeyHash")=43) AND ("eventIntentHash" IS NULL OR length("eventIntentHash")=43)),
  CONSTRAINT "audit_events_reason_check" CHECK (("result" IN ('failed','denied','partially_succeeded','cancelled') OR "action" IN ('permission_grant','permission_revoke','archive','delete','publish','config_publish')) IS FALSE OR "reason" IS NOT NULL),
  CONSTRAINT "audit_events_action_check" CHECK ("action" IN ('create','update','archive','restore','delete','publish','unpublish','approve','reject','assign','unassign','acknowledge','resolve','cancel','retry','login','logout','session_revoke','permission_grant','permission_revoke','config_publish','read_sensitive')),
  CONSTRAINT "audit_events_resource_type_check" CHECK ("resourceType" IN ('user','role','permission','dealer','dealer_location','membership','product','category','inventory','price','promotion','order','shipment','checkout_session','payment_session','refund','customer','content','review','lead','support','email','erp_job','runtime_config','feature_flag','audit_event')),
  CONSTRAINT "audit_events_reason_enum_check" CHECK ("reason" IS NULL OR "reason" IN ('completed','validation_rejected','permission_required','scope_mismatch','field_permission_required','resource_not_available','state_conflict','idempotent_replay','idempotency_conflict','transaction_rolled_back','dependency_unavailable','internal_failure','operator_requested')),
  CONSTRAINT "audit_events_display_class_check" CHECK ("actorDisplayClass" IN ('staff','partner','customer','machine','anonymous')),
  CONSTRAINT "audit_events_auth_contract_check" CHECK ("authorizationContractVersion" IN ('dashboard-authorization.v1','service-authorization.v1','system-authorization.v1')),
  CONSTRAINT "audit_events_capability_check" CHECK ("capabilityVersion" IS NULL OR "capabilityVersion"='common-query.v1'),
  CONSTRAINT "audit_events_retention_duration_check" CHECK (("retentionClass"='default' AND "expiresAt"="occurredAt"+INTERVAL '730 days') OR ("retentionClass"='high_risk' AND "expiresAt"="occurredAt"+INTERVAL '2555 days')),
  CONSTRAINT "audit_events_text_bounds_check" CHECK (length("requestId") BETWEEN 1 AND 128 AND ("resourceId" IS NULL OR length("resourceId") BETWEEN 1 AND 128) AND ("correlationId" IS NULL OR length("correlationId") BETWEEN 1 AND 128)),
  CONSTRAINT "audit_events_required_auth_check" CHECK ("result" NOT IN ('succeeded','denied') OR jsonb_array_length("permissionGrants")>0)
);

CREATE INDEX "audit_events_occurred_id_idx" ON "audit_events" ("occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_actor_idx" ON "audit_events" ("actorType", "actorId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_action_idx" ON "audit_events" ("action", "occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_resource_idx" ON "audit_events" ("resourceType", "resourceId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_result_idx" ON "audit_events" ("result", "occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_request_idx" ON "audit_events" ("requestId", "occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_scope_idx" ON "audit_events" ("authorizationScopeKind", "occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_expiry_idx" ON "audit_events" ("expiresAt", "occurredAt" DESC, "id" DESC);
CREATE INDEX "audit_events_dealer_ids_gin" ON "audit_events" USING GIN ("dealerIds" jsonb_path_ops);
CREATE INDEX "audit_events_location_ids_gin" ON "audit_events" USING GIN ("locationIds" jsonb_path_ops);
CREATE UNIQUE INDEX "audit_events_dedup_unique" ON "audit_events" ("eventVersion", "source", "idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;

CREATE FUNCTION reject_audit_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are immutable';
END;
$$;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();
