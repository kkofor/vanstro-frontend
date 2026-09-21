#!/usr/bin/env python3
# S09 Auth/RBAC settings browser fixture: a controlled owned state machine
# that mirrors the frozen S09 settings.auth-rbac contract, including the typed
# passwordPolicy/sessionPolicy value, TTL bounds, lifecycle blockers,
# VERSION_CONFLICT vs SETTINGS_STATE_CONFLICT, append-only publication event
# stream, s09-overview, the consumer-generation readiness binding (publish is
# ready because the auth consumer reads the published row directly), the
# zero-write impact preview (last-super-admin protection) and the explicit
# session revoke (REVOKE_SESSIONS confirmation). Not a production provider.
import json, sys, uuid, urllib.parse
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1])
ACTOR = str(uuid.uuid4())
def now_ms():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
NOW = now_ms

COMPILED = {
    "passwordPolicy": {"minimumLength": 12, "resetTokenTtlMinutes": 30},
    "sessionPolicy": {"sessionLifetimeMinutes": 10080},
}

state = {
    "requests": [],
    "profile": "writer",           # writer | read-only | forbidden
    "generation": 1,               # consumer generation for readiness binding
    "publishedGeneration": 0,      # published generation the consumer must match
    "publications": [],            # append-only publication events (descriptor-scoped)
    "drafts": {},                  # id -> draft dict (resource CAS)
    "nextDraftRevision": 1,
    "nextSequence": 1,
    "audit": [],
    "publishedValue": None,        # current effective published S09 value (or None = compiled_default)
    "publishedRevision": 0,        # descriptor-scoped CAS used by create/rollback expectedPublishedVersion
    "publishedAt": None,
    "superAdminCount": 2,          # active super admin count used by the impact preview
    "revokedTargets": {},          # target user id -> revokedAt
}

def grant(permission, global_=True):
    return {"permissionKey": permission, "global": global_, "dealerIds": [], "locationIds": []}

def grants_for(profile):
    if profile == "writer":
        return [grant("settings.read"), grant("settings.write"), grant("sessions.revoke")]
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

def s09_readiness(consumer_generation=None):
    published_generation = state["publishedGeneration"]
    projection = "published" if state["publishedValue"] is not None else "compiled_default"
    exact = consumer_generation is not None and consumer_generation == published_generation and published_generation > 0
    return {"state": "ready" if exact else "degraded",
            "reasonCode": "ready" if exact else "consumer_generation_missing" if consumer_generation is None else "consumer_generation_mismatch",
            "observedAt": NOW(), "publishedGeneration": published_generation,
            "publicationVersion": published_generation if state["publishedValue"] is not None else None,
            "publicationCas": state["publishedRevision"] if state["publishedValue"] is not None else None,
            "consumerGeneration": consumer_generation, "projectionState": projection}

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

def s09_overview():
    effective = deepcopy(state["publishedValue"]) if state["publishedValue"] is not None else deepcopy(COMPILED)
    return {"data": {"descriptorKey": "settings.auth-rbac", "schemaVersion": "settings.auth-rbac.v1",
                     "projectionState": "published" if state["publishedValue"] is not None else "compiled_default",
                     "publishedGeneration": state["publishedGeneration"],
                     "publication": None if state["publishedValue"] is None else {
                         "version": state["publishedGeneration"], "cas": state["publishedRevision"],
                         "publishedAt": state["publishedAt"], "changeReason": state["publications"][-1]["changeReason"]},
                     "effective": effective}}

def draft_dto(d):
    return {"id": d["id"], "descriptorKey": "settings.auth-rbac", "status": d["status"],
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
        ("passwordPolicy.minimumLength", before["passwordPolicy"]["minimumLength"], d["value"]["passwordPolicy"]["minimumLength"]),
        ("passwordPolicy.resetTokenTtlMinutes", before["passwordPolicy"]["resetTokenTtlMinutes"], d["value"]["passwordPolicy"]["resetTokenTtlMinutes"]),
        ("sessionPolicy.sessionLifetimeMinutes", before["sessionPolicy"]["sessionLifetimeMinutes"], d["value"]["sessionPolicy"]["sessionLifetimeMinutes"])
    ]
    for field, b, a in fields:
        if b != a:
            changes.append({"field": field, "before": b, "after": a, "sensitivity": "public"})
    if not changes:
        changes.append({"field": "sessionPolicy.sessionLifetimeMinutes", "before": before["sessionPolicy"]["sessionLifetimeMinutes"],
                        "after": d["value"]["sessionPolicy"]["sessionLifetimeMinutes"], "sensitivity": "public"})
    return {"data": {"draftId": d["id"], "draftVersion": d["version"], "descriptorKey": "settings.auth-rbac",
                     "changes": changes, "secretChangeCount": 0, "restartRequired": False,
                     "affectedServices": ["auth", "dashboard"]}}

def history_entries():
    out = []
    for e in state["publications"]:
        status = "published" if e["eventType"] in ("published", "rollback_published") else "superseded"
        out.append({"publicationId": e["runtimeConfigId"], "generation": str(e["generation"]), "version": e["sequence"],
                    "status": status, "descriptorKeys": ["settings.auth-rbac"],
                    "changeReason": e["changeReason"], "publishedAt": e["occurredAt"],
                    "rollbackOfPublicationId": e.get("rollbackSourcePublicationId"), "auditEventId": e["auditEventId"]})
    return {"data": out}

def audit_row(action, resource_id, resource_type="runtime_config", metadata=None):
    ctx = p02_context()
    row = {"id": str(uuid.uuid4()), "action": action, "resourceType": resource_type, "resourceId": resource_id,
           "result": "succeeded", "effectiveRoles": ctx["globalRoleKeys"], "permissionGrants": ctx["permissionGrants"],
           "contextRevision": ctx["contextRevision"], "occurredAt": NOW(),
           "metadata": metadata if metadata is not None else {"descriptorKey": "settings.auth-rbac"}}
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
        pp, sp = value["passwordPolicy"], value["sessionPolicy"]
        if not (isinstance(pp, dict) and isinstance(sp, dict)): return False
        if set(pp.keys()) != {"minimumLength", "resetTokenTtlMinutes"}: return False
        if set(sp.keys()) != {"sessionLifetimeMinutes"}: return False
        if not isinstance(pp["minimumLength"], int) or not (12 <= pp["minimumLength"] <= 128): return False
        if not isinstance(pp["resetTokenTtlMinutes"], int) or not (5 <= pp["resetTokenTtlMinutes"] <= 31): return False
        if not isinstance(sp["sessionLifetimeMinutes"], int) or not (15 <= sp["sessionLifetimeMinutes"] <= 11520): return False
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
    pp, sp = value["passwordPolicy"], value["sessionPolicy"]
    if not (12 <= pp["minimumLength"] <= 128):
        issues.append({"code": "S09_PASSWORD_LENGTH", "severity": "blocker", "field": "passwordPolicy.minimumLength",
                       "message": "minimumLength must be between 12 and 128."})
    if not (5 <= pp["resetTokenTtlMinutes"] <= 31):
        issues.append({"code": "S09_RESET_TTL", "severity": "blocker", "field": "passwordPolicy.resetTokenTtlMinutes",
                       "message": "resetTokenTtlMinutes must be between 5 and 31."})
    if not (15 <= sp["sessionLifetimeMinutes"] <= 11520):
        issues.append({"code": "S09_SESSION_TTL", "severity": "blocker", "field": "sessionPolicy.sessionLifetimeMinutes",
                       "message": "sessionLifetimeMinutes must be between 15 and 11520."})
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
    # The auth consumer resolves the published row directly: readiness is ready
    # at the publication, consumerGeneration equals publishedGeneration.
    return 200, {"data": {"id": d["id"], "generation": str(published_sequence), "version": published_sequence,
                          "sourceDraftId": d["id"], "sourceDraftVersion": body["expectedVersion"], "status": "published",
                          "publishedAt": NOW(), "rollbackOfPublicationId": d.get("rollbackOfPublicationId"),
                          "readiness": {"state": "ready", "reasonCode": "ready",
                                        "observedAt": NOW(), "publishedGeneration": published_sequence,
                                        "publicationVersion": published_sequence, "consumerGeneration": published_sequence,
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
    if not is_uuid(body.get("targetUserId")):
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    if "nextStatus" not in body and "removeRoleId" not in body:
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    next_status = body.get("nextStatus")
    if next_status not in (None, "active", "suspended", "archived"):
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    if body.get("removeRoleId") is not None and not is_uuid(body["removeRoleId"]):
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    disables = next_status in ("suspended", "archived") or (body.get("removeRoleId") == "99999999-9999-4999-8999-999999999999")
    would_block = disables and state["superAdminCount"] <= 1
    return 200, {"data": {"targetUserId": body["targetUserId"], "wouldBlockLastSuperAdmin": would_block,
                          "activeSuperAdminCount": state["superAdminCount"],
                          "safeReasonCode": "LAST_SUPER_ADMIN_BLOCKED" if would_block else "allowed",
                          "contextRevision": p02_context()["contextRevision"]}}

def session_revoke(body):
    if state["profile"] != "writer":
        return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
    if set(body.keys()) != {"targetUserId", "confirmation", "reason"}:
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    if not is_uuid(body.get("targetUserId")):
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    if body.get("confirmation") != "REVOKE_SESSIONS":
        return 400, {"error": "invalid confirmation", "code": "AUTH_RBAC_CONFIRMATION_INVALID"}
    reason = str(body.get("reason", "")).strip()
    if not (8 <= len(reason) <= 500):
        return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
    if body["targetUserId"] == "00000000-0000-4000-8000-000000000000":
        return 404, {"error": "target unavailable", "code": "AUTH_RBAC_TARGET_NOT_FOUND"}
    revoked = 0
    if body["targetUserId"] not in state["revokedTargets"]:
        revoked = 2
        state["revokedTargets"][body["targetUserId"]] = NOW()
    audit_row("session_revoke", body["targetUserId"], resource_type="user",
              metadata={"targetUserId": body["targetUserId"], "reasonCode": "operator_requested"})
    return 200, {"data": {"targetUserId": body["targetUserId"], "revokedCount": revoked,
                          "reason": reason, "revokedAt": NOW()}}

def storefront_projection(locale):
    # S09 does not own the storefront projection; serve the compiled fallback
    # exactly like a fresh S02 publication would so the shell's safe
    # validation passes.
    return {"data": {"projectionState": "compiled_default", "publishedGeneration": 0, "locale": locale,
                     "effective": {"siteDisplayName": "VanStro Global Supply", "brandName": "VanStro",
                                   "announcementRule": {"enabled": False, "message": "", "locale": None, "startsAt": None, "endsAt": None},
                                   "contact": {"email": "", "phone": ""}, "logoMedia": None,
                                   "defaultDealer": None, "defaultLocation": None}}}

# Verified Foundation v1.1 projection (22 modules: 11 available + 11
# coming_soon) shared with the S02/S03/S08 fixtures; the client-side
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
                     "actor": {"id": ACTOR, "displayLabel": "S09 QA", "roleLabels": roles_for(state["profile"])},
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
        if p in ("/dashboard/settings/s09-overview", "/api/v1/dashboard/settings/s09-overview"): return self.sendj(s09_overview())
        if p in ("/dashboard/settings/s09-drafts", "/api/v1/dashboard/settings/s09-drafts"): return self.sendj(draft_list())
        if p in ("/dashboard/settings/s09-history", "/api/v1/dashboard/settings/s09-history"): return self.sendj(history_entries())
        if p in ("/dashboard/settings/s09-readiness", "/api/v1/dashboard/settings/s09-readiness"):
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)
            raw = query.get("consumerGeneration", [None])[0]
            if raw is not None and (not raw.isdigit() or (raw != "0" and raw.startswith("0")) or int(raw) > 2147483647):
                return self.sendj({"error": "invalid consumer generation", "code": "SETTINGS_VALIDATION_FAILED"}, 400)
            return self.sendj({"data": s09_readiness(None if raw is None else int(raw))})
        if p in ("/dashboard/settings/readiness", "/api/v1/dashboard/settings/readiness"):
            return self.sendj({"data": s01_readiness(None)})
        if p.startswith(("/dashboard/settings/s09-drafts/", "/api/v1/dashboard/settings/s09-drafts/")):
            rest = p[len("/dashboard/settings/s09-drafts/"):] if p.startswith("/dashboard/settings/s09-drafts/") else p[len("/api/v1/dashboard/settings/s09-drafts/"):]
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
        if p in ("/dashboard/settings/s09-impact-preview", "/api/v1/dashboard/settings/s09-impact-preview"):
            s, r = impact_preview(b); return self.sendj(r, s)
        if p in ("/dashboard/settings/s09-session-revoke", "/api/v1/dashboard/settings/s09-session-revoke"):
            s, r = session_revoke(b); return self.sendj(r, s)
        if p in ("/dashboard/settings/s09-drafts", "/api/v1/dashboard/settings/s09-drafts"):
            if state["profile"] != "writer":
                return self.sendj({"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}, 403)
            if b.get("descriptorKey") != "settings.auth-rbac":
                return self.sendj({"error": "invalid request", "code": "COMMERCE_INVALID"}, 400)
            if b.get("expectedPublishedVersion") != state["publishedRevision"]:
                return self.sendj({"error": "version conflict", "code": "VERSION_CONFLICT"}, 409)
            if not is_structurally_valid(b.get("value")):
                return self.sendj({"error": "invalid request", "code": "COMMERCE_INVALID"}, 400)
            d = new_draft(deepcopy(b["value"]), str(b["changeReason"]).strip())
            audit_row("create", d["id"])
            return self.sendj({"data": draft_dto(d)}, 201)
        if p.startswith(("/dashboard/settings/s09-drafts/", "/api/v1/dashboard/settings/s09-drafts/")):
            rest = p[len("/dashboard/settings/s09-drafts/"):] if p.startswith("/dashboard/settings/s09-drafts/") else p[len("/api/v1/dashboard/settings/s09-drafts/"):]
            if rest.endswith("/validate"):
                s, r = validate_draft(rest[:-9], b); return self.sendj(r, s)
            if rest.endswith("/publish"):
                s, r = publish_draft(rest[:-8], b); return self.sendj(r, s)
        if p.startswith(("/dashboard/settings/s09-history/", "/api/v1/dashboard/settings/s09-history/")):
            rest = p[len("/dashboard/settings/s09-history/"):] if p.startswith("/dashboard/settings/s09-history/") else p[len("/api/v1/dashboard/settings/s09-history/"):]
            if rest.endswith("/rollback-draft"):
                s, r = rollback_draft(rest[:-15], b); return self.sendj(r, s)
        return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
    def do_PATCH(self):
        b = self.body(); self.record(b); p = urllib.parse.urlparse(self.path).path
        if p.startswith(("/dashboard/settings/s09-drafts/", "/api/v1/dashboard/settings/s09-drafts/")):
            rest = p[len("/dashboard/settings/s09-drafts/"):] if p.startswith("/dashboard/settings/s09-drafts/") else p[len("/api/v1/dashboard/settings/s09-drafts/"):]
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
        if "superAdminCount" in b: state["superAdminCount"] = b["superAdminCount"]
        if "revokedTargets" in b: state["revokedTargets"] = b["revokedTargets"]
        if "reset" in b and b["reset"]:
            state["publications"] = []; state["drafts"] = {}; state["nextDraftRevision"] = 1
            state["nextSequence"] = 1; state["audit"] = []; state["publishedValue"] = None
            state["publishedRevision"] = 0; state["publishedAt"] = None; state["publishedGeneration"] = 0
            state["superAdminCount"] = 2; state["revokedTargets"] = {}
        return self.sendj({"ok": True})

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
