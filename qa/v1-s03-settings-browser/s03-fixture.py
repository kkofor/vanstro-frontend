#!/usr/bin/env python3
"""S03 Commerce Settings browser fixture: a controlled owned state machine
mirroring the frozen S03 contract (settings.commerce) and the implemented
backend lifecycle. Serves typed five-family policy, create/update/validate/
publish/history/rollback-draft/readiness, aggregate read-only impact preview
and the sandbox quote with explicit zero business-side-effect counters.
Never creates Cart/Order/Payment, consumes reservations, enqueues jobs, or
calls providers."""
import json, sys, uuid
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1])
ACTOR = str(uuid.uuid4())
NOW = lambda: datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

VALUE = {
  "commercePolicy": {"minimumOrderAmountCents": 0, "guestCheckoutEnabled": True, "checkoutEnabled": True},
  "taxPolicy": {"enabledProvinceCodes": [], "calculationMode": "current-tax-rate-table", "roundingMode": "nearest-cent"},
  "shippingPolicy": {"pickupEnabled": True, "deliveryEnabled": True, "deliveryFlatFeeCents": 1500, "serviceZoneMode": "dealer-location-only", "fallbackMode": "reject"},
  "inventoryPolicy": {"reservationEnabled": True, "reservationTtlMinutes": 30, "availabilityMode": "manual", "staleAfterSeconds": 300, "staleBehavior": "degraded-reject"},
  "orderPolicy": {"allowedLifecycleTransitions": {"paid": ["processing", "fulfilled", "cancelled"], "processing": ["fulfilled", "cancelled"], "fulfilled": [], "cancelled": []}, "guestLookupEnabled": True, "cancellationMode": "erp-confirmed-only"}
}
IDS = ["checkout-availability", "checkout-guest-minimum", "tax-totals", "shipping-fee-service-zone", "inventory-ttl-stale", "order-transitions"]

state = {
  "profile": "writer",
  "generation": 0,
  "settingsRevision": 0,
  "published": None,           # published value or None
  "publishedAt": None,
  "drafts": {},                # id -> draft
  "nextVersion": 1,
  "history": [],
  "businessWrites": 0,         # Cart/Order/Payment/Inventory mutations
  "providerCalls": 0,          # Payment/ERP/Canada Post/carrier/tax provider
  "jobs": 0                    # ERP/email job enqueues
}

def consumers(generation):
  # Mirrors the backend consumerMatrix: a null consumer generation means the
  # generation is not observed and every consumer is degraded (the descriptor
  # is implemented but not exact-generation confirmed); partial consumers
  # (service-zone/fallback, reservation TTL) stay implemented_degraded with
  # coverage_limited even at an exact generation.
  partial = {"shipping-fee-service-zone", "inventory-ttl-stale"}
  if generation is None:
    return [{"id": x, "state": "implemented_degraded", "generation": None, "reasonCode": "consumer_generation_missing"} for x in IDS]
  return [{"id": x, "state": "implemented_degraded" if x in partial else "implemented_ready", "generation": generation, "reasonCode": "coverage_limited" if x in partial else None} for x in IDS]

def projection():
  return "published" if state["published"] is not None else "compiled_default"

def readiness(consumer_generation=None):
  # Mirror the backend exact-generation semantics: without an active
  # publication, null/0 consumer generation matches generation zero; with an
  # active publication only an exact generation match passes. The consumer
  # matrix follows the same rule (partial consumers stay coverage_limited).
  gen = state["generation"]
  active = state["published"] is not None
  if not active:
    exact = consumer_generation is None or consumer_generation == 0
    matrix_gen = 0 if exact else consumer_generation
  else:
    exact = consumer_generation == gen
    matrix_gen = gen if exact else consumer_generation
  return {
    "state": "degraded",
    "reasonCode": "coverage_limited" if exact else "consumer_generation_mismatch",
    "observedAt": NOW(), "publishedGeneration": gen,
    "publicationVersion": gen if active else None,
    "publicationCas": state["settingsRevision"] if active else None,
    "consumerGeneration": consumer_generation, "projectionState": projection(),
    "consumers": consumers(matrix_gen)
  }

def overview():
  return {
    "descriptorKey": "settings.commerce", "schemaVersion": "settings.commerce.v1",
    "projectionState": projection(), "publishedGeneration": state["generation"],
    "publication": None if state["published"] is None else {"version": state["generation"], "cas": state["settingsRevision"], "publishedAt": state["publishedAt"], "changeReason": "fixture publish"},
    "effective": state["published"] if state["published"] is not None else VALUE,
    "consumerMatrix": consumers(state["generation"])
  }

def draft_dto(d):
  return {"id": d["id"], "descriptorKey": "settings.commerce", "status": d["status"], "value": d["value"],
          "basePublicationVersion": d["base"], "version": d["version"], "changeReason": d["reason"],
          "createdAt": d["createdAt"], "updatedAt": d["updatedAt"], "validationRevision": d.get("validationRevision"),
          "rollbackOfPublicationId": d.get("rollbackOfPublicationId")}

def business_issues(value):
  issues = []
  if value["commercePolicy"]["minimumOrderAmountCents"] < 0:
    issues.append({"code": "S03_NEGATIVE_MINIMUM", "severity": "blocker", "field": "commercePolicy.minimumOrderAmountCents", "message": "minimum order must be non-negative."})
  if len(value["taxPolicy"]["enabledProvinceCodes"]) > 13 or len(set(value["taxPolicy"]["enabledProvinceCodes"])) != len(value["taxPolicy"]["enabledProvinceCodes"]):
    issues.append({"code": "S03_PROVINCE_SET", "severity": "blocker", "field": "taxPolicy.enabledProvinceCodes", "message": "province codes must be unique."})
  transitions = value["orderPolicy"]["allowedLifecycleTransitions"]
  for target in transitions.get("fulfilled", []) + transitions.get("cancelled", []):
    issues.append({"code": "S03_TERMINAL_TRANSITION", "severity": "blocker", "field": "orderPolicy.allowedLifecycleTransitions", "message": f"Illegal terminal transition to {target}."})
  return issues

def validate_draft(draft_id, body):
  d = state["drafts"].get(draft_id)
  if not d: return 404, {"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}
  if body.get("expectedVersion") != d["version"]: return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
  if d["status"] not in ("draft", "invalid", "activation_failed", "rollback_draft"): return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
  issues = business_issues(d["value"])
  valid = not any(i["severity"] == "blocker" for i in issues)
  d["status"] = "validated" if valid else "invalid"
  d["version"] = state["nextVersion"]; state["nextVersion"] += 1; state["settingsRevision"] += 1
  d["validationRevision"] = d["version"]; d["updatedAt"] = NOW()
  return 200, {"data": {"draftId": d["id"], "draftVersion": d["version"], "validationRevision": d["version"], "status": d["status"], "issues": issues, "validatedAt": NOW()}}

def publish_draft(draft_id, body):
  d = state["drafts"].get(draft_id)
  if not d: return 404, {"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}
  if body.get("expectedVersion") != d["version"]: return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
  if d["status"] != "validated": return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
  if state["published"] is not None:
    state["history"].append({"publicationId": state["publishedId"], "generation": str(state["generation"]), "version": state["generation"], "status": "superseded", "descriptorKeys": ["settings.commerce"], "changeReason": "superseded", "publishedAt": state["publishedAt"], "rollbackOfPublicationId": None, "auditEventId": str(uuid.uuid4())})
  state["generation"] += 1; state["settingsRevision"] += 1
  state["published"] = d["value"]; state["publishedAt"] = NOW()
  state["publishedId"] = d["id"]
  state["history"].append({"publicationId": d["id"], "generation": str(state["generation"]), "version": state["generation"], "status": "published", "descriptorKeys": ["settings.commerce"], "changeReason": d["reason"], "publishedAt": NOW(), "rollbackOfPublicationId": d.get("rollbackOfPublicationId"), "auditEventId": str(uuid.uuid4())})
  del state["drafts"][d["id"]]
  # Publish only activates the policy version; readiness remains exact-generation gated.
  # Mirror the backend publication response: its embedded readiness carries
  # no publicationCas (publication-scoped schema).
  pub_readiness = {"state": "degraded", "reasonCode": "coverage_limited", "observedAt": NOW(), "publishedGeneration": state["generation"], "publicationVersion": state["generation"], "consumerGeneration": state["generation"], "projectionState": "published", "consumers": consumers(state["generation"])}
  return 200, {"data": {"id": d["id"], "generation": str(state["generation"]), "version": state["generation"], "sourceDraftId": d["id"], "sourceDraftVersion": body["expectedVersion"], "status": "published", "publishedAt": NOW(), "rollbackOfPublicationId": d.get("rollbackOfPublicationId"), "readiness": pub_readiness}}

def rollback_draft(publication_id, body):
  current = state["published"]
  if current is None or state.get("publishedId") != publication_id: return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
  if body.get("expectedPublishedVersion") != state["settingsRevision"]: return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
  d = {"id": str(uuid.uuid4()), "status": "rollback_draft", "value": current, "base": state["settingsRevision"], "version": state["nextVersion"], "reason": body["changeReason"].strip(), "createdAt": NOW(), "updatedAt": NOW(), "validationRevision": None, "rollbackOfPublicationId": publication_id}
  state["nextVersion"] += 1; state["settingsRevision"] += 1
  state["drafts"][d["id"]] = d
  return 201, {"data": draft_dto(d)}

def impact_preview(body):
  candidate = body.get("candidate", VALUE)
  transitions = candidate["orderPolicy"]["allowedLifecycleTransitions"]
  return 200, {"data": {
    "candidateAccepted": not any(i["severity"] == "blocker" for i in business_issues(candidate)),
    "affectedFamilies": ["commercePolicy", "taxPolicy", "shippingPolicy", "inventoryPolicy", "orderPolicy"],
    "quoteImpact": {
      "checkoutAvailable": candidate["commercePolicy"]["checkoutEnabled"],
      "guestCheckoutAvailable": candidate["commercePolicy"]["guestCheckoutEnabled"],
      "minimumOrderAmountCents": candidate["commercePolicy"]["minimumOrderAmountCents"],
      "taxMode": candidate["taxPolicy"]["calculationMode"],
      "enabledProvinceCount": len(candidate["taxPolicy"]["enabledProvinceCodes"]),
      "pickupAvailable": candidate["shippingPolicy"]["pickupEnabled"],
      "deliveryAvailable": candidate["shippingPolicy"]["deliveryEnabled"],
      "deliveryFlatFeeCents": candidate["shippingPolicy"]["deliveryFlatFeeCents"],
      "inventoryMode": candidate["inventoryPolicy"]["availabilityMode"],
      "reservationTtlMinutes": candidate["inventoryPolicy"]["reservationTtlMinutes"],
      "staleAfterSeconds": candidate["inventoryPolicy"]["staleAfterSeconds"],
      "orderTransitionRuleCount": sum(map(len, transitions.values()))
    },
    "warnings": [], "contextRevision": "fixture-revision"
  }}

def grant(permission, global_=True):
    return {"permissionKey": permission, "global": global_, "dealerIds": [], "locationIds": []}

def grants_for(profile):
    if profile == "writer":
        return [grant("settings.read"), grant("settings.write")]
    return [grant("settings.read")]

def roles_for(profile):
    return ["super_admin"] if profile == "writer" else ["read_only_admin"]

def p02_context():
    return {
        "actorId": ACTOR,
        "globalRoleKeys": roles_for(state["profile"]),
        "scopedRoleKeys": [],
        "permissionGrants": grants_for(state["profile"]),
        "contextRevision": f"ctx-{state['profile']}-{state['generation']}",
    }

def capability():
    write = state["profile"] == "writer"
    return {
        "enabled": True, "contractVersion": "settings-center.v1", "registryVersion": "settings-registry.v1",
        "coreDescriptorKey": "settings.core.overview_refresh_seconds",
        "actions": {"read": True, "createDraft": write, "updateDraft": write, "validate": write, "publish": write, "rollback": write},
        "history": {"read": True}, "readiness": {"read": True}, "audit": {"integrated": True},
        "secrets": False, "externalSideEffects": False, "partialPublish": False,
    }

def registry():
    return {"data": [
        {"key": "settings.core.overview_refresh_seconds", "group": "core", "title": "Overview refresh interval",
         "description": "Controls how often the Settings overview refreshes safe status.",
         "schemaVersion": "settings.core.overview-refresh-seconds.v1", "availability": "available",
         "valueType": "integer", "secret": False, "mutable": True, "defaultValue": 60}
    ]}

def cleanup_consumer():
    return {"state": "degraded", "reasonCode": "cleanup_consumer_unavailable", "observedAt": NOW()}

def s10_readiness(consumer_generation=None):
    published_generation = state["publishedGeneration"]
    projection = "published" if state["publishedValue"] is not None else "compiled_default"
    # The cleanup consumer (Audit/async-job expiry) does not exist yet:
    # readiness is honestly degraded and never fake-ready, even with an exact
    # consumer generation match.
    return {"state": "degraded", "reasonCode": "cleanup_consumer_unavailable", "observedAt": NOW(),
            "publishedGeneration": published_generation,
            "publicationVersion": published_generation if state["publishedValue"] is not None else None,
            "publicationCas": state["publishedRevision"] if state["publishedValue"] is not None else None,
            "consumerGeneration": consumer_generation, "projectionState": projection,
            "cleanupConsumer": cleanup_consumer()}

def s01_readiness(consumer_generation=None):
    return {"state": "degraded", "reasonCode": "consumer_generation_missing", "observedAt": NOW(),
            "publishedGeneration": 0, "publicationVersion": None, "consumerGeneration": None,
            "effectiveOverviewRefreshSeconds": 60, "projectionState": "compiled_default"}

def s01_overview():
    return {"data": {
        "contractVersion": "settings-center.v1",
        "environment": {"label": "Browser fixture", "kind": "local"},
        "publication": {"generation": "0", "version": 0, "publishedAt": None},
        "openDraftCount": 0, "latestLifecycle": {"status": "none", "occurredAt": None},
        "readiness": s01_readiness(None),
        "registry": {"availableCount": 2, "comingInV1Count": 10, "notImplementedCount": 0}}}

def s03_overview():
    effective = deepcopy(state["publishedValue"]) if state["publishedValue"] is not None else deepcopy(COMPILED)
    return {"data": {"descriptorKey": "settings.privacy-retention", "schemaVersion": "settings.privacy-retention.v1",
                     "projectionState": "published" if state["publishedValue"] is not None else "compiled_default",
                     "publishedGeneration": state["publishedGeneration"],
                     "publication": None if state["publishedValue"] is None else {
                         "version": state["publishedGeneration"], "cas": state["publishedRevision"],
                         "publishedAt": state["publishedAt"], "changeReason": state["publications"][-1]["changeReason"]},
                     "effective": effective,
                     "capabilities": {"anonymousConsent": "current_fact",
                                      "authenticatedConsent": "future_unavailable",
                                      "privacySubjectPurge": "future_unavailable"},
                     "cleanupConsumer": cleanup_consumer()}}


def draft_list():
    open_states = ("draft", "invalid", "validated", "activation_failed", "rollback_draft")
    return {"data": [draft_dto(d) for d in state["drafts"].values() if d["status"] in open_states]}

def diff_for(d):
    changes = []
    before = state["publishedValue"] or COMPILED
    fields = [
        ("consentPolicy.anonymousConsentEnabled", before["consentPolicy"]["anonymousConsentEnabled"], d["value"]["consentPolicy"]["anonymousConsentEnabled"]),
        ("consentPolicy.retentionMonths", before["consentPolicy"]["retentionMonths"], d["value"]["consentPolicy"]["retentionMonths"]),
        ("retentionPolicy.retentionByObjectFamily", before["retentionPolicy"]["retentionByObjectFamily"], d["value"]["retentionPolicy"]["retentionByObjectFamily"]),
        ("legalHoldPolicy.legalHoldEnabled", before["legalHoldPolicy"]["legalHoldEnabled"], d["value"]["legalHoldPolicy"]["legalHoldEnabled"]),
        ("lowRiskExecution.allowlist", before["lowRiskExecution"]["allowlist"], d["value"]["lowRiskExecution"]["allowlist"])
    ]
    for field, b, a in fields:
        if b != a:
            changes.append({"field": field, "before": b, "after": a, "sensitivity": "public"})
    if not changes:
        changes.append({"field": "consentPolicy.retentionMonths", "before": before["consentPolicy"]["retentionMonths"],
                        "after": d["value"]["consentPolicy"]["retentionMonths"], "sensitivity": "public"})
    return {"data": {"draftId": d["id"], "draftVersion": d["version"], "descriptorKey": "settings.privacy-retention",
                     "changes": changes, "secretChangeCount": 0, "restartRequired": False,
                     "affectedServices": ["dashboard"]}}

def history_entries():
    out = []
    for e in state["publications"]:
        status = "published" if e["eventType"] in ("published", "rollback_published") else "superseded"
        out.append({"publicationId": e["runtimeConfigId"], "generation": str(e["generation"]), "version": e["sequence"],
                    "status": status, "descriptorKeys": ["settings.privacy-retention"],
                    "changeReason": e["changeReason"], "publishedAt": e["occurredAt"],
                    "rollbackOfPublicationId": e.get("rollbackSourcePublicationId"), "auditEventId": e["auditEventId"]})
    return {"data": out}

def audit_row(action, resource_id, resource_type="runtime_config", metadata=None):
    ctx = p02_context()
    row = {"id": str(uuid.uuid4()), "action": action, "resourceType": resource_type, "resourceId": resource_id,
           "result": "succeeded", "effectiveRoles": ctx["globalRoleKeys"], "permissionGrants": ctx["permissionGrants"],
           "contextRevision": ctx["contextRevision"], "occurredAt": NOW(),
           "metadata": metadata if metadata is not None else {"descriptorKey": "settings.privacy-retention"}}
    state["audit"].append(row)
    return row

def new_draft(value, reason, rollback_of=None):
    d = {"id": str(uuid.uuid4()), "status": "draft", "value": value, "base": state["publishedRevision"],
         "version": state["nextDraftRevision"], "reason": reason, "createdAt": NOW(), "updatedAt": NOW(),
         "validationRevision": None, "rollbackOfPublicationId": rollback_of}
    state["nextDraftRevision"] += 1
    state["drafts"][d["id"]] = d
    return d

def deepcopy(value):
    return json.loads(json.dumps(value))

def is_structurally_valid(value):
    if not isinstance(value, dict): return False
    try:
        families = {"consentPolicy", "retentionPolicy", "legalHoldPolicy", "dsarPolicy", "piiDisplayPolicy", "lowRiskExecution"}
        if set(value.keys()) != families: return False
        cp, rp, lh, ds, pp, lr = (value[k] for k in ("consentPolicy", "retentionPolicy", "legalHoldPolicy", "dsarPolicy", "piiDisplayPolicy", "lowRiskExecution"))
        if not all(isinstance(x, dict) for x in (cp, rp, lh, ds, pp, lr)): return False
        if set(cp.keys()) != {"anonymousConsentEnabled", "authenticatedConsentEnabled", "consentCategories", "retentionMonths"}: return False
        if set(rp.keys()) != {"retentionByObjectFamily"}: return False
        if set(lh.keys()) != {"legalHoldEnabled", "legalHoldRefs"}: return False
        if set(ds.keys()) != {"accessExportDeleteRules"}: return False
        if set(pp.keys()) != {"piiDisplayRules"}: return False
        if set(lr.keys()) != {"allowlist", "impactPreviewEnabled"}: return False
        if not isinstance(cp["anonymousConsentEnabled"], bool) or not isinstance(cp["authenticatedConsentEnabled"], bool): return False
        if not isinstance(cp["retentionMonths"], int) or not (6 <= cp["retentionMonths"] <= 120): return False
        cats = cp["consentCategories"]
        if not isinstance(cats, list) or not (1 <= len(cats) <= 3) or len(set(cats)) != len(cats) or not set(cats) <= CONSENT_CATEGORIES: return False
        if not isinstance(lr["impactPreviewEnabled"], bool): return False
        allow = lr["allowlist"]
        if not isinstance(allow, list) or len(allow) > 2 or len(set(allow)) != len(allow) or not set(allow) <= {"consent_events", "async_jobs"}: return False
        if not isinstance(lh["legalHoldEnabled"], bool): return False
        refs = lh["legalHoldRefs"]
        if not isinstance(refs, list) or len(refs) > 64 or not all(is_uuid(r) for r in refs): return False
        entries = rp["retentionByObjectFamily"]
        if not isinstance(entries, list) or len(entries) > 7: return False
        seen = set()
        for e in entries:
            if not isinstance(e, dict) or set(e.keys()) != {"objectFamily", "retentionDays", "autoCleanupEnabled"}: return False
            if e["objectFamily"] not in OBJECT_FAMILIES or e["objectFamily"] in seen: return False
            seen.add(e["objectFamily"])
            if not isinstance(e["retentionDays"], int) or not (30 <= e["retentionDays"] <= 7300): return False
            if not isinstance(e["autoCleanupEnabled"], bool): return False
        rules = ds["accessExportDeleteRules"]
        if not isinstance(rules, list) or len(rules) > 15: return False
        for r in rules:
            if not isinstance(r, dict) or set(r.keys()) != {"scope", "method", "enabled", "requireAdminApproval"}: return False
            if r["scope"] not in DSAR_SCOPES or r["method"] not in DSAR_METHODS: return False
            if not isinstance(r["enabled"], bool) or not isinstance(r["requireAdminApproval"], bool): return False
        prules = pp["piiDisplayRules"]
        if not isinstance(prules, list) or len(prules) > 20: return False
        for r in prules:
            if not isinstance(r, dict) or set(r.keys()) != {"field", "displayMode", "allowedRoles"}: return False
            if not isinstance(r["field"], str) or not (1 <= len(r["field"]) <= 80) or not __import__("re").match(r"^[A-Za-z][A-Za-z0-9_.-]*$", r["field"]): return False
            if r["displayMode"] not in DISPLAY_MODES: return False
            roles = r["allowedRoles"]
            if not isinstance(roles, list) or not (1 <= len(roles) <= 8) or not all(isinstance(x, str) and x for x in roles): return False
        return True
    except (KeyError, TypeError):
        return False

def is_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False






def storefront_projection(locale):
    # S10 does not own the storefront projection; serve the compiled fallback
    # exactly like a fresh S02 publication would so the shell's safe
    # validation passes.
    return {"data": {"projectionState": "compiled_default", "publishedGeneration": 0, "locale": locale,
                     "effective": {"siteDisplayName": "VanStro Global Supply", "brandName": "VanStro",
                                   "announcementRule": {"enabled": False, "message": "", "locale": None, "startsAt": None, "endsAt": None},
                                   "contact": {"email": "", "phone": ""}, "logoMedia": None,
                                   "defaultDealer": None, "defaultLocation": None}}}

# Dashboard Foundation v1.1 mechanical registry — mirror of
# DASHBOARD_FOUNDATION_MODULE_STATE in src/lib/api/api-contract.ts. The
# client runtime validator requires the full 22-module projection to match
# the registry byte-for-byte (module, label, group, status, route, selector
# summary, readAllowed/reason matrix); a partial projection is rejected as
# "invalid-response" and the shell never reaches ready.
# (module, label, status, group, route, selectors(kind, pathname, key, value))
FOUNDATION_REGISTRY = [
  ("overview", "工作台", "available", "workspace", "/dashboard", [("legacy_tab", "/dashboard", "tab", "overview")]),
  ("products", "产品", "available", "catalog", "/dashboard/products", [("legacy_tab", "/dashboard", "tab", "products")]),
  ("categories", "分类", "available", "catalog", "/dashboard/categories", [("legacy_tab", "/dashboard", "tab", "categories")]),
  ("pricing", "价格", "available", "catalog", "/dashboard/pricing", [("legacy_tab", "/dashboard", "tab", "pricing")]),
  ("promotions", "促销", "available", "catalog", "/dashboard/promotions", [("legacy_tab", "/dashboard", "tab", "promotions")]),
  ("inventory", "库存", "available", "catalog", "/dashboard/inventory", [("legacy_tab", "/dashboard", "tab", "inventorySnapshots")]),
  ("orders", "订单", "available", "commerce", "/dashboard/orders", [("legacy_tab", "/dashboard", "tab", "orders")]),
  ("customers", "客户", "available", "commerce", "/dashboard/customers", [("legacy_tab", "/dashboard", "tab", "crmContacts")]),
  ("users", "用户", "available", "organization", "/dashboard/users", [("legacy_tab", "/dashboard", "tab", "users")]),
  ("dealers", "经销商", "available", "organization", "/dashboard/dealers", [("legacy_tab", "/dashboard", "tab", "dealers")]),
  ("erp", "ERP / 集成", "available", "platform", "/dashboard/erp", [("legacy_tab", "/dashboard", "tab", "erpSyncJobs")]),
  ("payments", "支付", "coming_soon", "commerce", "/dashboard/payments", [("legacy_tab", "/dashboard", "tab", "paymentSessions")]),
  ("roles", "角色", "coming_soon", "organization", "/dashboard/roles", [("legacy_tab", "/dashboard", "tab", "roles")]),
  ("applications", "申请", "coming_soon", "organization", "/dashboard/applications", [("legacy_tab", "/dashboard", "tab", "dealerApplications")]),
  ("leads", "销售线索", "coming_soon", "engagement", "/dashboard/leads", [("legacy_tab", "/dashboard", "tab", "contactLeads")]),
  ("reviews", "评价", "coming_soon", "engagement", "/dashboard/reviews", [("legacy_tab", "/dashboard", "tab", "productReviews")]),
  ("support", "客户支持", "coming_soon", "engagement", "/dashboard/support", [("legacy_tab", "/dashboard", "tab", "supportHandoffs")]),
  ("email", "邮件", "coming_soon", "engagement", "/dashboard/email", [("legacy_tab", "/dashboard", "tab", "emailOutbox")]),
  ("content", "内容", "coming_soon", "platform", "/dashboard/content", [("path_exact", "/dashboard/media", None, None), ("path_exact", "/dashboard/data-jobs", None, None), ("legacy_tab", "/dashboard", "tab", "cms")]),
  ("operations", "运营", "coming_soon", "platform", "/dashboard/operations", [("path_exact", "/dashboard/runtime", None, None), ("path_exact", "/dashboard/analytics-foundation", None, None), ("query_value", "/dashboard/operations", "view", "jobs"), ("query_value", "/dashboard/operations", "view", "work-queue"), ("query_value", "/dashboard/operations", "view", "notifications"), ("legacy_tab", "/dashboard", "tab", "operations")]),
  ("audit", "审计", "coming_soon", "platform", "/dashboard/audit", [("legacy_tab", "/dashboard", "tab", "auditLogs")]),
  ("settings", "设置", "coming_soon", "platform", "/dashboard/settings", [("path_prefix", "/dashboard/settings/", None, None), ("legacy_tab", "/dashboard", "tab", "settings")]),
]

def foundation_module(entry):
    module, label, status, group, route, selectors = entry
    out = {"module": module, "label": label, "group": group, "status": status, "route": route,
           "selectors": [{"kind": k, "pathname": p} if k in ("path_exact", "path_prefix") else {"kind": k, "pathname": p, "key": key, "value": value} for (k, p, key, value) in selectors]}
    if status == "coming_soon":
        out.update({"readAllowed": False, "reason": "coming_soon"})
    else:
        out["readAllowed"] = True
    return out

def foundation():
    return {"data": {"contractVersion": "dashboard-foundation.v1.1",
                     "actor": {"id": ACTOR, "displayLabel": "S03 QA", "roleLabels": roles_for(state["profile"])},
                     "modules": [foundation_module(entry) for entry in FOUNDATION_REGISTRY],
                     "visibility": {"scope": "unavailable", "fields": "permission-only"},
                     "shell": {"flag": "dashboard.shell.v2", "mode": "internal", "enabled": True, "code": "DASHBOARD_SHELL_READY", "readOnly": True},
                     "readiness": "ready", "requestId": "f"}}

def authorization():
    actions = [{"action": "read", "permissionKey": "settings.read", "decision": "allow", "reason": "granted_by_persisted_permission", "scope": {"kind": "global"}}]
    return {"data": {"contractVersion": "dashboard-authorization.v1", "status": "ready", "requestId": "a",
                     "issuedAt": NOW(), "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                     "contextRevision": f"ctx-{state['profile']}-{state['generation']}",
                     "actor": {"principalType": "user", "id": ACTOR, "kind": "admin", "status": "active", "roleKeys": roles_for(state["profile"])},
                     "effectiveRoles": [{"roleKey": r, "scope": "global"} for r in roles_for(state["profile"])],
                     "modules": [{"module": "settings", "route": "/dashboard/settings", "status": "allowed", "actions": actions}],
                     "scope": {"kind": "global", "source": "persisted_grants"}, "fieldVisibility": [],
                     "commonQueryV1": {"products": {"enabled": False}, "dealers": {"enabled": False}},
                     "auditFoundationV1": {"enabled": False, "queryProfile": "dashboard.audit-events.v1", "eventVersion": "audit-event.v1", "sensitive": {"enabled": False}},
                     "workQueueFoundationV1": {"enabled": False}, "asyncJobFoundationV1": {"enabled": False}, "dataJobFoundationV1": {"enabled": False},
                     "mediaFoundationV1": {"enabled": False, "contractVersion": "media-asset.v1", "queryProfile": "dashboard.media-assets.v1", "registryVersion": "media-registry.v1", "safeProfile": "dashboard.media-assets.safe.v1", "sensitiveProfile": {"enabled": False}, "actions": {"create": False, "update": False, "archive": False, "restore": False, "downloadOriginal": False, "manageVariants": False}, "upload": {"enabled": False}, "preview": {"controlled": True, "pdfInline": False}, "legacyAdapters": {"enabled": True, "partial": True}, "externalDelivery": False, "ai": False, "bulkImportExport": False},
                     "settingsCenterV1": capability()}}


class H(BaseHTTPRequestHandler):
  def log_message(self, fmt, *args):
    print(f"{self.command} {self.path}", flush=True)
  def sendj(self, data, status=200):
    raw = json.dumps(data).encode()
    self.send_response(status); self.send_header("Content-Type", "application/json")
    self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
    self.send_header("Access-Control-Allow-Credentials", "true")
    self.send_header("Access-Control-Allow-Headers", "Content-Type,Accept,Idempotency-Key")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
    self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
  def do_OPTIONS(self):
    self.send_response(204); self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
    self.send_header("Access-Control-Allow-Credentials", "true")
    self.send_header("Access-Control-Allow-Headers", "Content-Type,Accept,Idempotency-Key")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS"); self.end_headers()
  def do_GET(self):
    p = self.path
    if p in ("/cart", "/api/v1/cart"):
      return self.sendj({"data": {"id": "fixture-cart", "items": [], "subtotal": {"amount": 0, "amountCents": 0, "currency": "CAD"}, "total": {"amount": 0, "amountCents": 0, "currency": "CAD"}}})
    if p in ("/account/favorites", "/api/v1/account/favorites"): return self.sendj({"data": {"items": []}})
    if p in ("/auth/me", "/api/v1/auth/me"): return self.sendj({"data": {"user": {"id": ACTOR, "email": "qa@vanstro.test", "role": "admin"}}})
    if p.endswith("/dashboard/foundation"): return self.sendj(foundation())
    if p.endswith("/dashboard/authorization"): return self.sendj(authorization())
    if p.endswith("/dashboard/settings/registry"): return self.sendj(registry())
    if p.split("?")[0].endswith("/storefront/config"):
      locale = "fr-CA" if "locale=fr-CA" in p else "en-CA"
      return self.sendj(storefront_projection(locale))
    if p.endswith("/dashboard/settings/overview"): return self.sendj({"data": {"contractVersion": "settings-center.v1", "environment": {"label": "S03 fixture", "kind": "local"}, "publication": {"generation": "0", "version": 0, "publishedAt": None}, "openDraftCount": 0, "latestLifecycle": {"status": "none", "occurredAt": None}, "readiness": {"state": "degraded", "reasonCode": "consumer_generation_missing", "observedAt": NOW(), "publishedGeneration": 0, "publicationVersion": None, "consumerGeneration": None, "projectionState": "compiled_default"}, "registry": {"availableCount": 2, "comingInV1Count": 10, "notImplementedCount": 0}}})
    if p.endswith("/dashboard/settings/drafts"): return self.sendj({"data": []})
    if p.endswith("/dashboard/settings/readiness"): return self.sendj({"data": {"state": "degraded", "reasonCode": "consumer_generation_missing", "observedAt": NOW(), "publishedGeneration": 0, "publicationVersion": None, "consumerGeneration": None, "projectionState": "compiled_default"}})
    if p == "/control/state": return self.sendj({"state": state})
    if p.endswith("/s03-overview"): return self.sendj({"data": overview()})
    if p.split("?")[0].endswith("/s03-readiness"):
      q = p.split("consumerGeneration=")
      raw = q[1].split("&")[0] if len(q) > 1 and q[1] else None
      return self.sendj({"data": readiness(None if raw is None else int(raw))})
    if p.endswith("/s03-drafts"):
      return self.sendj({"data": [draft_dto(d) for d in state["drafts"].values() if d["status"] in ("draft", "invalid", "validated", "activation_failed", "rollback_draft")]})
    if p.endswith("/s03-history"): return self.sendj({"data": state["history"]})
    if p.endswith("/diff") and "/s03-drafts/" in p:
      draft_id = p.split("/s03-drafts/")[1].split("/")[0]
      d = state["drafts"].get(draft_id)
      if not d: return self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
      base = state["published"] if state["published"] is not None else VALUE
      changes = []
      for family in ("commercePolicy", "taxPolicy", "shippingPolicy", "inventoryPolicy", "orderPolicy"):
        if d["value"].get(family) != base.get(family):
          changes.append({"field": family, "before": base.get(family), "after": d["value"].get(family), "sensitivity": "public"})
      return self.sendj({"data": {"draftId": d["id"], "draftVersion": d["version"], "descriptorKey": "settings.commerce", "changes": changes, "secretChangeCount": 0, "restartRequired": False, "affectedServices": ["commerce"]}})
    if "/s03-drafts/" in p:
      draft_id = p.rsplit("/", 1)[-1]
      d = state["drafts"].get(draft_id)
      if not d: return self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
      return self.sendj({"data": draft_dto(d)})
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def do_POST(self):
    n = int(self.headers.get("Content-Length", "0")); body = json.loads(self.rfile.read(n) or b"{}")
    p = self.path
    if p == "/control":
      state.update({k: v for k, v in body.items() if k in state}); return self.sendj({"state": state})
    if p.endswith("/s03-impact-preview"):
      status, data = impact_preview(body); return self.sendj(data, status)
    if p.endswith("/s03-drafts"):
      if state["profile"] != "writer": return self.sendj({"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}, 403)
      cas = state["settingsRevision"] if state["published"] is not None else 0
      if body.get("expectedPublishedVersion", 0) != cas: return self.sendj({"error": "version conflict", "code": "VERSION_CONFLICT"}, 409)
      d = {"id": str(uuid.uuid4()), "status": "draft", "value": body.get("value", VALUE), "base": cas, "version": state["nextVersion"], "reason": body.get("changeReason", "fixture draft"), "createdAt": NOW(), "updatedAt": NOW(), "validationRevision": None, "rollbackOfPublicationId": None}
      state["nextVersion"] += 1; state["settingsRevision"] += 1
      state["drafts"][d["id"]] = d
      return self.sendj({"data": draft_dto(d)}, 201)
    if "/s03-drafts/" in p and p.endswith("/validate"):
      status, data = validate_draft(p.rsplit("/", 2)[-2], body); return self.sendj(data, status)
    if "/s03-drafts/" in p and p.endswith("/publish"):
      status, data = publish_draft(p.rsplit("/", 2)[-2], body); return self.sendj(data, status)
    if "/s03-history/" in p and p.endswith("/rollback-draft"):
      status, data = rollback_draft(p.rsplit("/", 2)[-2], body); return self.sendj(data, status)
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def do_PATCH(self):
    n = int(self.headers.get("Content-Length", "0")); body = json.loads(self.rfile.read(n) or b"{}")
    p = self.path
    if "/s03-drafts/" in p:
      draft_id = p.rsplit("/", 1)[-1]
      d = state["drafts"].get(draft_id)
      if not d: return self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
      if body.get("expectedVersion") != d["version"]: return self.sendj({"error": "version conflict", "code": "VERSION_CONFLICT"}, 409)
      if d["status"] not in ("draft", "invalid", "activation_failed", "rollback_draft"): return self.sendj({"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}, 409)
      d["value"] = body.get("value", d["value"]); d["reason"] = body.get("changeReason", d["reason"]); d["status"] = "draft"
      d["version"] = state["nextVersion"]; state["nextVersion"] += 1; state["settingsRevision"] += 1; d["validationRevision"] = None; d["updatedAt"] = NOW()
      return self.sendj({"data": draft_dto(d)})
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)

if __name__ == "__main__":
  ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
