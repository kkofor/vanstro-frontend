#!/usr/bin/env python3
# S10 Privacy/Retention/Audit settings browser fixture: a controlled owned
# state machine that mirrors the frozen S10 settings.privacy-retention
# contract, including the typed six-family value (consentPolicy,
# retentionPolicy, legalHoldPolicy, dsarPolicy, piiDisplayPolicy,
# lowRiskExecution), retention bounds, lifecycle blockers, VERSION_CONFLICT
# vs SETTINGS_STATE_CONFLICT, append-only publication event stream,
# s10-overview with the frozen capability layering (anonymousConsent
# current_fact; authenticatedConsent/privacySubjectPurge future_unavailable),
# honestly degraded readiness (cleanup_consumer_unavailable, never
# fake-ready), the family-level zero-write impact preview (high-risk families
# blocked, legal-hold conflict) and Audit metadata that never carries PII or
# consent payloads. Not a production provider.
import json, sys, uuid, urllib.parse
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1])
ACTOR = str(uuid.uuid4())
def now_ms():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
NOW = now_ms

COMPILED = {
    "consentPolicy": {"anonymousConsentEnabled": True, "authenticatedConsentEnabled": False,
                      "consentCategories": ["functional", "analytics", "targeting"], "retentionMonths": 24},
    "retentionPolicy": {"retentionByObjectFamily": []},
    "legalHoldPolicy": {"legalHoldEnabled": False, "legalHoldRefs": []},
    "dsarPolicy": {"accessExportDeleteRules": []},
    "piiDisplayPolicy": {"piiDisplayRules": []},
    "lowRiskExecution": {"allowlist": [], "impactPreviewEnabled": True},
}

HIGH_RISK_FAMILIES = {"audit_events", "media_assets", "orders", "payments", "privacy_requests"}
OBJECT_FAMILIES = ["consent_events", "audit_events", "async_jobs", "media_assets", "orders", "payments", "privacy_requests"]
FAMILY_LABELS = {"consent_events": "同意事件", "audit_events": "审计事件", "async_jobs": "异步任务",
                 "media_assets": "媒体资产", "orders": "订单", "payments": "支付", "privacy_requests": "隐私请求"}
CONSENT_CATEGORIES = {"functional", "analytics", "targeting"}
DSAR_SCOPES = {"all_personal_data", "orders", "payments", "media", "communications"}
DSAR_METHODS = {"access", "export", "delete"}
DISPLAY_MODES = {"plain", "masked", "hidden"}

state = {
    "requests": [],
    "profile": "writer",           # writer | read-only | forbidden
    "generation": 1,
    "publishedGeneration": 0,
    "publications": [],            # append-only publication events (descriptor-scoped)
    "drafts": {},                  # id -> draft dict (resource CAS)
    "nextDraftRevision": 1,
    "nextSequence": 1,
    "audit": [],
    "publishedValue": None,        # current effective published S10 value (or None = compiled_default)
    "publishedRevision": 0,
    "publishedAt": None,
}

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

def s10_overview():
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

def draft_dto(d):
    return {"id": d["id"], "descriptorKey": "settings.privacy-retention", "status": d["status"],
            "value": d["value"], "basePublicationVersion": d["base"], "version": d["version"],
            "changeReason": d["reason"], "createdAt": d["createdAt"], "updatedAt": d["updatedAt"],
            "validationRevision": d.get("validationRevision"), "rollbackOfPublicationId": d.get("rollbackOfPublicationId")}

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

def business_issues(value):
    issues = []
    for e in value["retentionPolicy"]["retentionByObjectFamily"]:
        if e["autoCleanupEnabled"] and e["objectFamily"] in HIGH_RISK_FAMILIES:
            issues.append({"code": "S10_HIGH_RISK_AUTO_CLEANUP", "severity": "blocker",
                           "field": f"retentionPolicy.retentionByObjectFamily.{e['objectFamily']}.autoCleanupEnabled",
                           "message": f"{e['objectFamily']} is high-risk and may never enable auto-cleanup."})
    if value["legalHoldPolicy"]["legalHoldEnabled"]:
        if len(value["legalHoldPolicy"]["legalHoldRefs"]) == 0:
            issues.append({"code": "S10_HOLD_REFS_REQUIRED", "severity": "blocker", "field": "legalHoldPolicy.legalHoldRefs",
                           "message": "legalHoldRefs are required when legal hold is enabled."})
        if any(e["autoCleanupEnabled"] for e in value["retentionPolicy"]["retentionByObjectFamily"]):
            issues.append({"code": "S10_HOLD_CONFLICT", "severity": "blocker", "field": "legalHoldPolicy.legalHoldEnabled",
                           "message": "Auto-cleanup conflicts with an enabled legal hold."})
    for r in value["dsarPolicy"]["accessExportDeleteRules"]:
        if r["method"] == "delete" and not r["requireAdminApproval"]:
            issues.append({"code": "S10_DSAR_DELETE_APPROVAL", "severity": "blocker", "field": "dsarPolicy.accessExportDeleteRules",
                           "message": "DSAR delete rules always require admin approval."})
    if value["consentPolicy"]["authenticatedConsentEnabled"]:
        issues.append({"code": "S10_AUTHENTICATED_FUTURE", "severity": "warning", "field": "consentPolicy.authenticatedConsentEnabled",
                       "message": "Authenticated consent is not executable today (future_unavailable)."})
    if any(e["autoCleanupEnabled"] for e in value["retentionPolicy"]["retentionByObjectFamily"]):
        issues.append({"code": "S10_CLEANUP_SEPARATE_AUTHORIZATION", "severity": "warning",
                       "field": "retentionPolicy.retentionByObjectFamily",
                       "message": "Auto-cleanup execution requires a separately authorized cleanup consumer."})
    return issues

def validate_draft(draft_id, body):
    if state["profile"] != "writer":
        return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
    d = state["drafts"].get(draft_id)
    if not d:
        return 404, {"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}
    if body.get("expectedVersion") != d["version"]:
        return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
    if d["status"] not in ("draft", "invalid", "activation_failed", "rollback_draft"):
        return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
    issues = business_issues(d["value"])
    valid = not any(i["severity"] == "blocker" for i in issues)
    d["status"] = "validated" if valid else "invalid"
    d["version"] = state["nextDraftRevision"]; state["nextDraftRevision"] += 1
    d["validationRevision"] = d["version"]; d["updatedAt"] = NOW()
    audit_row("update", d["id"])
    return 200, {"data": {"draftId": d["id"], "draftVersion": d["version"], "validationRevision": d["version"],
                          "status": "validated" if valid else "invalid", "issues": issues, "validatedAt": NOW()}}

def publish_draft(draft_id, body):
    if state["profile"] != "writer":
        return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
    d = state["drafts"].get(draft_id)
    if not d:
        return 404, {"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}
    if body.get("expectedVersion") != d["version"]:
        return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
    if d["status"] != "validated":
        return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
    if state["publishedValue"] is not None:
        sup = audit_row("unpublish", state["publications"][-1]["runtimeConfigId"])
        state["publications"].append({"runtimeConfigId": state["publications"][-1]["runtimeConfigId"],
                                      "sequence": state["nextSequence"], "eventType": "superseded",
                                      "changeReason": d["reason"], "occurredAt": NOW(), "auditEventId": sup["id"],
                                      "generation": state["publishedGeneration"]})
        state["nextSequence"] += 1
    pub_audit = audit_row("config_publish", d["id"])
    event_type = "rollback_published" if d.get("rollbackOfPublicationId") else "published"
    published_sequence = state["nextSequence"]
    state["publications"].append({"runtimeConfigId": d["id"], "sequence": published_sequence, "eventType": event_type,
                                  "sourceDraftId": d["id"], "sourceDraftVersion": body["expectedVersion"],
                                  "rollbackSourcePublicationId": d.get("rollbackOfPublicationId"),
                                  "changeReason": d["reason"], "occurredAt": NOW(), "auditEventId": pub_audit["id"],
                                  "generation": state["publishedGeneration"] + 1})
    state["nextSequence"] += 1
    state["publishedValue"] = deepcopy(d["value"]); state["publishedRevision"] = d["version"]
    state["publishedGeneration"] += 1; state["publishedAt"] = NOW()
    del state["drafts"][d["id"]]
    # Publish only activates the policy version (zero data side effects); the
    # cleanup consumer is missing, so readiness is honestly degraded.
    return 200, {"data": {"id": d["id"], "generation": str(published_sequence), "version": published_sequence,
                          "sourceDraftId": d["id"], "sourceDraftVersion": body["expectedVersion"], "status": "published",
                          "publishedAt": NOW(), "rollbackOfPublicationId": d.get("rollbackOfPublicationId"),
                          "readiness": {"state": "degraded", "reasonCode": "cleanup_consumer_unavailable",
                                        "observedAt": NOW(), "publishedGeneration": published_sequence,
                                        "publicationVersion": published_sequence, "consumerGeneration": None,
                                        "projectionState": "published"}}}

def rollback_draft(publication_id, body):
    if state["profile"] != "writer":
        return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
    current = state["publications"][-1] if state["publications"] else None
    if not current or current["runtimeConfigId"] != publication_id:
        return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
    if body.get("expectedPublishedVersion") != state["publishedRevision"]:
        return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
    d = new_draft(deepcopy(state["publishedValue"]), body["changeReason"].strip(), rollback_of=publication_id)
    d["status"] = "rollback_draft"; d["version"] = state["nextDraftRevision"]; state["nextDraftRevision"] += 1
    audit_row("create", d["id"])
    return 201, {"data": draft_dto(d)}

def impact_preview(body):
    if state["profile"] == "read-only" or state["profile"] == "forbidden":
        return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
    keys = set(body.keys())
    if not keys <= {"candidateRetentionEntries", "candidateAllowlist"} or not keys:
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    raw_entries = body.get("candidateRetentionEntries")
    raw_allowlist = body.get("candidateAllowlist")
    has_entries = isinstance(raw_entries, list) and len(raw_entries) > 0
    has_allowlist = isinstance(raw_allowlist, list) and len(raw_allowlist) > 0
    if not has_entries and not has_allowlist:
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    if raw_entries is not None:
        if not isinstance(raw_entries, list) or len(raw_entries) > 7: return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
        seen = set()
        for e in raw_entries:
            if not isinstance(e, dict) or set(e.keys()) != {"objectFamily", "retentionDays", "autoCleanupEnabled"}: return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
            if e["objectFamily"] not in OBJECT_FAMILIES or e["objectFamily"] in seen: return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
            if not isinstance(e["retentionDays"], int) or not (30 <= e["retentionDays"] <= 7300): return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
            if not isinstance(e["autoCleanupEnabled"], bool): return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
            seen.add(e["objectFamily"])
    if raw_allowlist is not None:
        if not isinstance(raw_allowlist, list) or len(raw_allowlist) > 2: return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
        if not set(raw_allowlist) <= {"consent_events", "async_jobs"}: return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    blocked = []
    affected = []
    for e in (raw_entries or []):
        high = e["objectFamily"] in HIGH_RISK_FAMILIES
        if e["autoCleanupEnabled"] and high:
            blocked.append(e["objectFamily"])
        affected.append({"objectFamily": e["objectFamily"], "classification": "high_risk" if high else "low_risk",
                         "wouldEnableAutoCleanup": e["autoCleanupEnabled"] and not high})
    would_enable = any(x["wouldEnableAutoCleanup"] for x in affected) or bool(raw_allowlist)
    hold_enabled = bool(state["publishedValue"] and state["publishedValue"]["legalHoldPolicy"]["legalHoldEnabled"])
    return 200, {"data": {"wouldEnableAutoCleanup": would_enable,
                          "wouldConflictWithLegalHold": hold_enabled and would_enable,
                          "blockedHighRiskFamilies": blocked, "affectedFamilies": affected,
                          "contextRevision": p02_context()["contextRevision"]}}

def storefront_projection(locale):
    # S10 does not own the storefront projection; serve the compiled fallback
    # exactly like a fresh S02 publication would so the shell's safe
    # validation passes.
    return {"data": {"projectionState": "compiled_default", "publishedGeneration": 0, "locale": locale,
                     "effective": {"siteDisplayName": "VanStro Global Supply", "brandName": "VanStro",
                                   "announcementRule": {"enabled": False, "message": "", "locale": None, "startsAt": None, "endsAt": None},
                                   "contact": {"email": "", "phone": ""}, "logoMedia": None,
                                   "defaultDealer": None, "defaultLocation": None}}}

# Verified Foundation v1.1 projection (22 modules: 11 available + 11
# coming_soon) shared with the S02/S03/S08/S09 fixtures; the client-side
# api-contract validator rejects the legacy two-module v1 projection.
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
                     "actor": {"id": ACTOR, "displayLabel": "S10 QA", "roleLabels": roles_for(state["profile"])},
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
    def log_message(self, *a): pass
    def cors(self):
        origin = self.headers.get("Origin")
        allowed = origin and (origin.startswith("http://127.0.0.1:") or origin.startswith("http://localhost:"))
        if allowed:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Accept,Idempotency-Key")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
    def sendj(self, o, s=200):
        b = json.dumps(o).encode()
        self.send_response(s); self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)
    def body(self):
        n = int(self.headers.get("Content-Length", "0") or 0)
        return json.loads(self.rfile.read(n) or b"{}")
    def record(self, b=None):
        state["requests"].append({"method": self.command, "path": self.path, "body": b, "idempotency": self.headers.get("Idempotency-Key")})
        print(f"{self.command} {self.path}", flush=True)
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def do_GET(self):
        self.record(); p = urllib.parse.urlparse(self.path).path
        if p == "/control/state": return self.sendj({"actor": ACTOR, "state": {k: v for k, v in state.items() if k != "requests"}})
        if p in ("/auth/me", "/api/v1/auth/me"): return self.sendj({"data": {"user": {"id": ACTOR, "email": "qa@vanstro.test", "role": "admin"}}})
        if p in ("/storefront/config", "/api/v1/storefront/config"):
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)
            locale = query.get("locale", ["en-CA"])[0]
            if locale not in ("en-CA", "fr-CA"): locale = "en-CA"
            return self.sendj(storefront_projection(locale))
        if p in ("/products", "/home/products", "/api/v1/products", "/api/v1/home/products"):
            return self.sendj({"data": [], "meta": {"total": 0}})
        if p in ("/home/banners", "/api/v1/home/banners"): return self.sendj({"data": []})
        if p in ("/home/articles", "/api/v1/home/articles"): return self.sendj({"data": []})
        if p in ("/categories", "/api/v1/categories"): return self.sendj({"data": []})
        if p in ("/dealers", "/api/v1/dealers", "/dealers/lookup", "/api/v1/dealers/lookup"):
            return self.sendj({"data": [], "meta": {"matched": 0}})
        if p in ("/cart", "/api/v1/cart"):
            return self.sendj({"data": {"id": "fixture-cart", "items": [], "subtotal": {"amount": 0, "amountCents": 0, "currency": "CAD"}, "total": {"amount": 0, "amountCents": 0, "currency": "CAD"}}})
        if p in ("/account/favorites", "/api/v1/account/favorites"): return self.sendj({"data": {"items": []}})
        if p in ("/dashboard/foundation", "/api/v1/dashboard/foundation"): return self.sendj(foundation())
        if p in ("/dashboard/authorization", "/api/v1/dashboard/authorization"): return self.sendj(authorization())
        if p in ("/dashboard/settings/overview", "/api/v1/dashboard/settings/overview"): return self.sendj(s01_overview())
        if p in ("/dashboard/settings/registry", "/api/v1/dashboard/settings/registry"): return self.sendj(registry())
        if p in ("/dashboard/settings/drafts", "/api/v1/dashboard/settings/drafts"): return self.sendj({"data": []})
        if p in ("/dashboard/settings/s10-overview", "/api/v1/dashboard/settings/s10-overview"): return self.sendj(s10_overview())
        if p in ("/dashboard/settings/s10-drafts", "/api/v1/dashboard/settings/s10-drafts"): return self.sendj(draft_list())
        if p in ("/dashboard/settings/s10-history", "/api/v1/dashboard/settings/s10-history"): return self.sendj(history_entries())
        if p in ("/dashboard/settings/s10-readiness", "/api/v1/dashboard/settings/s10-readiness"):
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)
            raw = query.get("consumerGeneration", [None])[0]
            if raw is not None and (not raw.isdigit() or (raw != "0" and raw.startswith("0")) or int(raw) > 2147483647):
                return self.sendj({"error": "invalid consumer generation", "code": "SETTINGS_VALIDATION_FAILED"}, 400)
            return self.sendj({"data": s10_readiness(None if raw is None else int(raw))})
        if p in ("/dashboard/settings/readiness", "/api/v1/dashboard/settings/readiness"):
            return self.sendj({"data": s01_readiness(None)})
        if p.startswith(("/dashboard/settings/s10-drafts/", "/api/v1/dashboard/settings/s10-drafts/")):
            rest = p[len("/dashboard/settings/s10-drafts/"):] if p.startswith("/dashboard/settings/s10-drafts/") else p[len("/api/v1/dashboard/settings/s10-drafts/"):]
            try: uuid.UUID(rest.removesuffix("/diff"))
            except ValueError: return self.sendj({"error": "invalid identifier", "code": "SETTINGS_VALIDATION_FAILED"}, 400)
            if rest.endswith("/diff"):
                d = state["drafts"].get(rest[:-5])
                return self.sendj(diff_for(d)) if d else self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
            d = state["drafts"].get(rest)
            return self.sendj({"data": draft_dto(d)}) if d else self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
        return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
    def do_POST(self):
        b = self.body(); self.record(b); p = urllib.parse.urlparse(self.path).path
        if p in ("/auth/login", "/api/v1/auth/login"): return self.sendj({"data": {"accessToken": "fixture-token", "user": {"id": ACTOR, "email": "qa@vanstro.test", "role": "admin"}}})
        if p in ("/auth/logout", "/api/v1/auth/logout"): return self.sendj({"data": {"ok": True}})
        if p == "/control": return self.control(b)
        if p in ("/dashboard/settings/s10-impact-preview", "/api/v1/dashboard/settings/s10-impact-preview"):
            s, r = impact_preview(b); return self.sendj(r, s)
        if p in ("/dashboard/settings/s10-drafts", "/api/v1/dashboard/settings/s10-drafts"):
            if state["profile"] != "writer":
                return self.sendj({"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}, 403)
            if b.get("descriptorKey") != "settings.privacy-retention":
                return self.sendj({"error": "invalid request", "code": "COMMERCE_INVALID"}, 400)
            if b.get("expectedPublishedVersion") != state["publishedRevision"]:
                return self.sendj({"error": "version conflict", "code": "VERSION_CONFLICT"}, 409)
            if not is_structurally_valid(b.get("value")):
                return self.sendj({"error": "invalid request", "code": "COMMERCE_INVALID"}, 400)
            d = new_draft(deepcopy(b["value"]), str(b["changeReason"]).strip())
            audit_row("create", d["id"])
            return self.sendj({"data": draft_dto(d)}, 201)
        if p.startswith(("/dashboard/settings/s10-drafts/", "/api/v1/dashboard/settings/s10-drafts/")):
            rest = p[len("/dashboard/settings/s10-drafts/"):] if p.startswith("/dashboard/settings/s10-drafts/") else p[len("/api/v1/dashboard/settings/s10-drafts/"):]
            if rest.endswith("/validate"):
                s, r = validate_draft(rest[:-9], b); return self.sendj(r, s)
            if rest.endswith("/publish"):
                s, r = publish_draft(rest[:-8], b); return self.sendj(r, s)
        if p.startswith(("/dashboard/settings/s10-history/", "/api/v1/dashboard/settings/s10-history/")):
            rest = p[len("/dashboard/settings/s10-history/"):] if p.startswith("/dashboard/settings/s10-history/") else p[len("/api/v1/dashboard/settings/s10-history/"):]
            if rest.endswith("/rollback-draft"):
                s, r = rollback_draft(rest[:-15], b); return self.sendj(r, s)
        return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
    def do_PATCH(self):
        b = self.body(); self.record(b); p = urllib.parse.urlparse(self.path).path
        if p.startswith(("/dashboard/settings/s10-drafts/", "/api/v1/dashboard/settings/s10-drafts/")):
            rest = p[len("/dashboard/settings/s10-drafts/"):] if p.startswith("/dashboard/settings/s10-drafts/") else p[len("/api/v1/dashboard/settings/s10-drafts/"):]
            if "/" not in rest:
                if state["profile"] != "writer":
                    return self.sendj({"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}, 403)
                d = state["drafts"].get(rest)
                if not d:
                    return self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
                if b.get("expectedVersion") != d["version"]:
                    return self.sendj({"error": "version conflict", "code": "VERSION_CONFLICT"}, 409)
                if d["status"] not in ("draft", "invalid", "activation_failed", "rollback_draft"):
                    return self.sendj({"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}, 409)
                if not is_structurally_valid(b.get("value")):
                    return self.sendj({"error": "invalid request", "code": "COMMERCE_INVALID"}, 400)
                d["value"] = deepcopy(b["value"]); d["reason"] = str(b["changeReason"]).strip()
                d["status"] = "draft"; d["version"] = state["nextDraftRevision"]; state["nextDraftRevision"] += 1
                d["validationRevision"] = None; d["updatedAt"] = NOW()
                audit_row("update", d["id"])
                return self.sendj({"data": draft_dto(d)}, 200)
        return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
    def control(self, b):
        if "profile" in b: state["profile"] = b["profile"]
        if "generation" in b: state["generation"] = b["generation"]
        if "reset" in b and b["reset"]:
            state["publications"] = []; state["drafts"] = {}; state["nextDraftRevision"] = 1
            state["nextSequence"] = 1; state["audit"] = []; state["publishedValue"] = None
            state["publishedRevision"] = 0; state["publishedAt"] = None; state["publishedGeneration"] = 0
        return self.sendj({"ok": True})

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
