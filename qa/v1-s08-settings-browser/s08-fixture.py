#!/usr/bin/env python3
"""S08 API/Service Account Settings browser fixture: a controlled owned state
machine mirroring the frozen S08 contract (settings.api-service-account.v1)
and the implemented-backend lifecycle. Serves typed four-family policy,
create/update/validate/publish/history/rollback-draft/readiness, aggregate
read-only impact preview, Service Account safe list/detail, token
create/rotate/revoke with one-time plaintext (never persisted, replay returns
plaintextAvailable=false), and the safe invocation read model. Explicit zero
business-side-effect counters (businessWrites/providerCalls/jobs)."""
import hashlib, json, secrets, sys, uuid
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1])
ACTOR = str(uuid.uuid4())
NOW = lambda: datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

VALUE = {
  "tokenLifecyclePolicy": {"defaultTtlDays": 90, "maximumTtlDays": 365, "rotationOverlapMinutes": 0, "maximumActiveTokensPerAccount": 1, "requireExpiry": False},
  "machineScopePolicy": {"allowedRoleKeys": [], "allowedPermissionFamilies": [], "environment": "production", "dealerLocationScopeMode": "global", "denySensitivePermissionsByDefault": True},
  "rateLimitPolicy": {"requestsPerMinute": 100, "burst": 0, "mode": "per-token", "retryAfterSemantics": "seconds"},
  "auditInvocationPolicy": {"invocationRetentionDays": 365, "metadataRedactionMode": "standard", "lastUsedTrackingEnabled": True, "failedAuthenticationAuditEnabled": True}
}
IDS = ["token-lifecycle", "rotate-overlap", "machine-scope-enforcement", "rate-limit", "audit-invocation-read-model", "erp-product-api-machine"]
FUTURE = {"erp-product-api-machine"}
KNOWN_ROLE_KEYS = {"cli_access", "erp_catalog_reader", "erp_order_sync"}
KNOWN_PERMISSION_FAMILIES = {"cli", "catalog", "orders", "audit", "settings"}
FORBIDDEN_KEYS = {"oneTimeRevealEnabled", "token", "tokenHash", "secret", "Authorization", "Cookie"}

state = {
  "profile": "writer",
  "generation": 0,
  "settingsRevision": 0,
  "published": None,           # published value or None
  "publishedId": None,
  "publishedAt": None,
  "drafts": {},                # id -> draft
  "nextVersion": 1,
  "history": [],
  "serviceAccounts": [],       # seeded below
  "tokens": {},                # accountId -> [token metadata]
  "tokenCreates": {},          # idempotencyKey -> {"hash", "tokenId", "name", "expiresAt", "createdAt"}
  "tokenRotates": {},          # idempotencyKey -> {"hash", "tokenId", "expiresAt", "overlapUntil", "name"}
  "invocations": [],           # seeded below
  "businessWrites": 0,         # Service Account/Token/Policy business mutations outside the Settings lifecycle
  "providerCalls": 0,          # ERP/notification/payment provider
  "jobs": 0                    # scheduled job enqueues
}

def seed_account(key, name, roles):
    account = {"id": str(uuid.uuid4()), "key": key, "name": name, "status": "active", "roles": roles, "environment": "production", "createdAt": NOW()}
    state["serviceAccounts"].append(account)
    state["tokens"][account["id"]] = []
    return account

ACCOUNT_CATALOG = seed_account("svc-catalog-reader", "商品目录读取服务", ["erp_catalog_reader"])
ACCOUNT_ORDER = seed_account("svc-order-sync", "订单同步服务", ["erp_order_sync"])

state["invocations"] = [
  {"id": str(uuid.uuid4()), "serviceAccount": {"id": ACCOUNT_CATALOG["id"], "key": ACCOUNT_CATALOG["key"], "name": ACCOUNT_CATALOG["name"]}, "toolKey": "catalog.list", "status": "succeeded", "createdAt": NOW(), "errorClass": None},
  {"id": str(uuid.uuid4()), "serviceAccount": {"id": ACCOUNT_CATALOG["id"], "key": ACCOUNT_CATALOG["key"], "name": ACCOUNT_CATALOG["name"]}, "toolKey": "catalog.get", "status": "rate_limited", "createdAt": NOW(), "errorClass": "RATE_LIMITED"},
  {"id": str(uuid.uuid4()), "serviceAccount": {"id": ACCOUNT_ORDER["id"], "key": ACCOUNT_ORDER["key"], "name": ACCOUNT_ORDER["name"]}, "toolKey": "orders.get", "status": "failed", "createdAt": NOW(), "errorClass": "DEPENDENCY_UNAVAILABLE"}
]

def consumers(generation):
    # Mirrors the S08 consumerMatrix: the five core consumers are
    # implemented and exact-generation confirmed when a generation is
    # observed; the ERP Product API machine consumer stays a future
    # obligation and is never counted as ready.
    if generation is None:
        return [{"id": x, "state": "future_obligation" if x in FUTURE else "implemented_degraded", "generation": None, "reasonCode": None if x in FUTURE else "consumer_generation_missing"} for x in IDS]
    return [{"id": x, "state": "future_obligation" if x in FUTURE else "implemented_ready", "generation": None if x in FUTURE else generation, "reasonCode": None} for x in IDS]

def projection():
    return "published" if state["published"] is not None else "compiled_default"

def readiness(consumer_generation=None):
    gen = state["generation"]
    active = state["published"] is not None
    if not active:
        exact = consumer_generation is None or consumer_generation == 0
        matrix_gen = 0 if exact else consumer_generation
    else:
        exact = consumer_generation == gen
        matrix_gen = gen if exact else consumer_generation
    matrix = consumers(matrix_gen)
    ready_count = sum(1 for c in matrix if c["state"] == "implemented_ready")
    if not exact:
        reason = "consumer_generation_mismatch"
    else:
        reason = "consumer_unavailable" if ready_count == 5 else "coverage_limited"
    return {
        "state": "degraded",
        "reasonCode": reason,
        "observedAt": NOW(), "publishedGeneration": gen,
        "publicationVersion": gen if active else None,
        "publicationCas": state["settingsRevision"] if active else None,
        "consumerGeneration": consumer_generation, "projectionState": projection(),
        "consumers": matrix
    }

def overview():
    return {
        "descriptorKey": "settings.api-service-account", "schemaVersion": "settings.api-service-account.v1",
        "projectionState": projection(), "publishedGeneration": state["generation"],
        "publication": None if state["published"] is None else {"version": state["generation"], "cas": state["settingsRevision"], "publishedAt": state["publishedAt"], "changeReason": "fixture publish"},
        "effective": state["published"] if state["published"] is not None else VALUE,
        "consumerMatrix": consumers(state["generation"])
    }

def draft_dto(d):
    return {"id": d["id"], "descriptorKey": "settings.api-service-account", "status": d["status"], "value": d["value"],
            "basePublicationVersion": d["base"], "version": d["version"], "changeReason": d["reason"],
            "createdAt": d["createdAt"], "updatedAt": d["updatedAt"], "validationRevision": d.get("validationRevision"),
            "rollbackOfPublicationId": d.get("rollbackOfPublicationId")}

def business_issues(value):
    issues = []
    token = value.get("tokenLifecyclePolicy", {})
    machine = value.get("machineScopePolicy", {})
    rate = value.get("rateLimitPolicy", {})
    audit = value.get("auditInvocationPolicy", {})
    for leaked in FORBIDDEN_KEYS:
        if leaked in value:
            issues.append({"code": "S08_SECRET_FIELD", "severity": "blocker", "field": leaked, "message": "secret-like Settings fields are rejected."})
    if token.get("maximumTtlDays", 365) < token.get("defaultTtlDays", 90):
        issues.append({"code": "S08_TTL_ORDER", "severity": "blocker", "field": "tokenLifecyclePolicy", "message": "maximum TTL must not be below the default TTL."})
    if not (1 <= token.get("maximumActiveTokensPerAccount", 1) <= 100):
        issues.append({"code": "S08_TOKEN_CAP", "severity": "blocker", "field": "tokenLifecyclePolicy.maximumActiveTokensPerAccount", "message": "per-account token cap must be 1..100."})
    for role in machine.get("allowedRoleKeys", []):
        if role not in KNOWN_ROLE_KEYS:
            issues.append({"code": "S08_ROLE_UNKNOWN", "severity": "blocker", "field": "machineScopePolicy.allowedRoleKeys", "message": f"Unknown role key {role}."})
    for family in machine.get("allowedPermissionFamilies", []):
        if family not in KNOWN_PERMISSION_FAMILIES:
            issues.append({"code": "S08_PERMISSION_FAMILY_UNKNOWN", "severity": "blocker", "field": "machineScopePolicy.allowedPermissionFamilies", "message": f"Unknown permission family {family}."})
    if not (1 <= rate.get("requestsPerMinute", 100) <= 100000):
        issues.append({"code": "S08_RATE_LIMIT_BOUNDS", "severity": "blocker", "field": "rateLimitPolicy.requestsPerMinute", "message": "requestsPerMinute must be 1..100000."})
    if not (1 <= audit.get("invocationRetentionDays", 365) <= 7300):
        issues.append({"code": "S08_RETENTION_BOUNDS", "severity": "blocker", "field": "auditInvocationPolicy.invocationRetentionDays", "message": "retention must be 1..7300 days."})
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
        state["history"].append({"publicationId": state["publishedId"], "generation": str(state["generation"]), "version": state["generation"], "status": "superseded", "descriptorKeys": ["settings.api-service-account"], "changeReason": "superseded", "publishedAt": state["publishedAt"], "rollbackOfPublicationId": None, "auditEventId": str(uuid.uuid4())})
    state["generation"] += 1; state["settingsRevision"] += 1
    state["published"] = d["value"]; state["publishedAt"] = NOW()
    state["publishedId"] = d["id"]
    state["history"].append({"publicationId": d["id"], "generation": str(state["generation"]), "version": state["generation"], "status": "published", "descriptorKeys": ["settings.api-service-account"], "changeReason": d["reason"], "publishedAt": NOW(), "rollbackOfPublicationId": d.get("rollbackOfPublicationId"), "auditEventId": str(uuid.uuid4())})
    del state["drafts"][d["id"]]
    # Publish activates the policy version only; readiness stays exact-generation gated.
    pub_readiness = {"state": "degraded", "reasonCode": "consumer_unavailable", "observedAt": NOW(), "publishedGeneration": state["generation"], "publicationVersion": state["generation"], "consumerGeneration": state["generation"], "projectionState": "published", "consumers": consumers(state["generation"])}
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
    active_tokens = sum(1 for tokens in state["tokens"].values() for t in tokens if t["status"] == "active")
    return 200, {"data": {
        "candidateAccepted": not any(i["severity"] == "blocker" for i in business_issues(candidate)),
        "affectedFamilies": ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"],
        "policyImpact": {
            "defaultTtlDays": candidate["tokenLifecyclePolicy"]["defaultTtlDays"],
            "maximumTtlDays": candidate["tokenLifecyclePolicy"]["maximumTtlDays"],
            "rotationOverlapMinutes": candidate["tokenLifecyclePolicy"]["rotationOverlapMinutes"],
            "maximumActiveTokensPerAccount": candidate["tokenLifecyclePolicy"]["maximumActiveTokensPerAccount"],
            "requireExpiry": candidate["tokenLifecyclePolicy"]["requireExpiry"],
            "environment": candidate["machineScopePolicy"]["environment"],
            "dealerLocationScopeMode": candidate["machineScopePolicy"]["dealerLocationScopeMode"],
            "allowedRoleKeyCount": len(candidate["machineScopePolicy"]["allowedRoleKeys"]),
            "allowedPermissionFamilyCount": len(candidate["machineScopePolicy"]["allowedPermissionFamilies"]),
            "denySensitivePermissionsByDefault": candidate["machineScopePolicy"]["denySensitivePermissionsByDefault"],
            "requestsPerMinute": candidate["rateLimitPolicy"]["requestsPerMinute"],
            "burst": candidate["rateLimitPolicy"]["burst"],
            "rateLimitMode": candidate["rateLimitPolicy"]["mode"],
            "invocationRetentionDays": candidate["auditInvocationPolicy"]["invocationRetentionDays"],
            "metadataRedactionMode": candidate["auditInvocationPolicy"]["metadataRedactionMode"],
            "lastUsedTrackingEnabled": candidate["auditInvocationPolicy"]["lastUsedTrackingEnabled"],
            "failedAuthenticationAuditEnabled": candidate["auditInvocationPolicy"]["failedAuthenticationAuditEnabled"],
            "serviceAccountCount": len(state["serviceAccounts"]),
            "activeTokenCount": active_tokens
        },
        "warnings": [], "contextRevision": "fixture-revision"
    }}

def effective_policy():
    return state["published"] if state["published"] is not None else VALUE

def request_hash(body):
    stripped = {k: v for k, v in body.items() if k != "idempotencyKey"}
    return hashlib.sha256(json.dumps(stripped, sort_keys=True).encode()).hexdigest()

def plaintext_token():
    return "s08_" + secrets.token_hex(24)

def create_token(account_id, body):
    tokens = state["tokens"].get(account_id)
    if tokens is None: return 404, {"error": "unavailable", "code": "DASHBOARD_NOT_FOUND"}
    if state["profile"] != "writer": return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
    token_key = body.get("idempotencyKey", "")
    if token_key:
        recorded = state["tokenCreates"].get(token_key)
        if recorded:
            if recorded["hash"] != request_hash(body): return 409, {"error": "idempotency conflict", "code": "IDEMPOTENCY_CONFLICT"}
            return 200, {"data": {"id": recorded["tokenId"], "name": recorded["name"], "expiresAt": recorded["expiresAt"], "createdAt": recorded["createdAt"], "plaintext": None, "plaintextAvailable": False}}
    policy = effective_policy()["tokenLifecyclePolicy"]
    active = [t for t in tokens if t["status"] == "active"]
    if len(active) >= policy["maximumActiveTokensPerAccount"]:
        return 409, {"error": "policy invalid", "code": "SERVICE_ACCOUNT_POLICY_INVALID"}
    name = body.get("name", "令牌").strip()
    ttl = body.get("ttlDays")
    if ttl is not None and not (1 <= int(ttl) <= 365): return 400, {"error": "invalid input", "code": "SETTINGS_VALIDATION_FAILED"}
    if ttl is not None or policy["requireExpiry"]:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=int(ttl) if ttl is not None else policy["defaultTtlDays"])).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    else:
        expires_at = None
    token = {"id": str(uuid.uuid4()), "name": name, "status": "active", "lastUsedAt": None, "expiresAt": expires_at, "revokedAt": None, "createdAt": NOW()}
    tokens.append(token)
    if token_key:
        state["tokenCreates"][token_key] = {"hash": request_hash(body), "tokenId": token["id"], "name": name, "expiresAt": expires_at, "createdAt": token["createdAt"]}
    return 201, {"data": {"id": token["id"], "name": name, "expiresAt": expires_at, "createdAt": token["createdAt"], "plaintext": plaintext_token(), "plaintextAvailable": True}}

def rotate_token(account_id, token_id, body):
    tokens = state["tokens"].get(account_id)
    if tokens is None: return 404, {"error": "unavailable", "code": "DASHBOARD_NOT_FOUND"}
    predecessor = next((t for t in tokens if t["id"] == token_id), None)
    if predecessor is None: return 404, {"error": "not found", "code": "DASHBOARD_NOT_FOUND"}
    token_key = body.get("idempotencyKey", "")
    if token_key:
        recorded = state["tokenRotates"].get(token_key)
        if recorded:
            if recorded["hash"] != request_hash(body): return 409, {"error": "idempotency conflict", "code": "IDEMPOTENCY_CONFLICT"}
            return 200, {"data": {"id": recorded["tokenId"], "status": "active", "expiresAt": recorded["expiresAt"], "overlapUntil": recorded["overlapUntil"], "plaintext": None, "plaintextAvailable": False}}
    if predecessor["status"] != "active": return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
    policy = effective_policy()["tokenLifecyclePolicy"]
    now = datetime.now(timezone.utc)
    replacement = {"id": str(uuid.uuid4()), "name": predecessor["name"] + "（轮换）", "status": "active", "lastUsedAt": None, "expiresAt": predecessor["expiresAt"], "revokedAt": None, "createdAt": NOW()}
    overlap_until = (now + timedelta(minutes=policy["rotationOverlapMinutes"])).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    if predecessor["expiresAt"] is not None:
        narrowed = min(datetime.fromisoformat(predecessor["expiresAt"].replace("Z", "+00:00")), now + timedelta(minutes=policy["rotationOverlapMinutes"])).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    else:
        narrowed = overlap_until
    predecessor["status"] = "rotated"; predecessor["expiresAt"] = narrowed
    tokens.append(replacement)
    result = {"id": replacement["id"], "status": "active", "expiresAt": replacement["expiresAt"], "overlapUntil": overlap_until, "plaintext": plaintext_token(), "plaintextAvailable": True}
    if token_key:
        state["tokenRotates"][token_key] = {"hash": request_hash(body), "tokenId": replacement["id"], "expiresAt": replacement["expiresAt"], "overlapUntil": overlap_until, "name": replacement["name"]}
    return 200, {"data": result}

def revoke_token(account_id, token_id, body):
    tokens = state["tokens"].get(account_id)
    if tokens is None: return 404, {"error": "unavailable", "code": "DASHBOARD_NOT_FOUND"}
    token = next((t for t in tokens if t["id"] == token_id), None)
    if token is None: return 404, {"error": "not found", "code": "DASHBOARD_NOT_FOUND"}
    if token["status"] == "revoked": return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
    reason = body.get("reason", "").strip()
    if len(reason) < 8 or len(reason) > 500: return 400, {"error": "invalid input", "code": "SETTINGS_VALIDATION_FAILED"}
    token["status"] = "revoked"; token["revokedAt"] = NOW()
    return 200, {"data": token}

def grant(permission):
    return {"permissionKey": permission, "global": True, "dealerIds": [], "locationIds": []}

def roles_for(profile):
    return ["super_admin"] if profile == "writer" else ["read_only_admin"]

def p02_context():
    return {
        "actorId": ACTOR,
        "globalRoleKeys": roles_for(state["profile"]),
        "scopedRoleKeys": [],
        "permissionGrants": [grant("settings.read"), grant("settings.write"), grant("service_accounts.manage")],
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

def storefront_projection(locale):
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
                     "actor": {"id": ACTOR, "displayLabel": "S08 QA", "roleLabels": roles_for(state["profile"])},
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
                     "serviceAccountsV1": {"enabled": state["profile"] == "writer", "manage": state["profile"] == "writer"},
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
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
    self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
  def do_OPTIONS(self):
    self.send_response(204); self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
    self.send_header("Access-Control-Allow-Credentials", "true")
    self.send_header("Access-Control-Allow-Headers", "Content-Type,Accept,Idempotency-Key")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS"); self.end_headers()
  def read_body(self):
    n = int(self.headers.get("Content-Length", "0"))
    return json.loads(self.rfile.read(n) or b"{}")
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
    if p.endswith("/dashboard/settings/overview"): return self.sendj({"data": {"contractVersion": "settings-center.v1", "environment": {"label": "S08 fixture", "kind": "local"}, "publication": {"generation": "0", "version": 0, "publishedAt": None}, "openDraftCount": 0, "latestLifecycle": {"status": "none", "occurredAt": None}, "readiness": {"state": "degraded", "reasonCode": "consumer_generation_missing", "observedAt": NOW(), "publishedGeneration": 0, "publicationVersion": None, "consumerGeneration": None, "projectionState": "compiled_default"}, "registry": {"availableCount": 2, "comingInV1Count": 10, "notImplementedCount": 0}}})
    if p.endswith("/dashboard/settings/drafts"): return self.sendj({"data": []})
    if p.endswith("/dashboard/settings/readiness"): return self.sendj({"data": {"state": "degraded", "reasonCode": "consumer_generation_missing", "observedAt": NOW(), "publishedGeneration": 0, "publicationVersion": None, "consumerGeneration": None, "projectionState": "compiled_default"}})
    if p == "/control/state": return self.sendj({"state": state})
    if p.endswith("/s08-overview"): return self.sendj({"data": overview()})
    if p.split("?")[0].endswith("/s08-readiness"):
      q = p.split("consumerGeneration=")
      raw = q[1].split("&")[0] if len(q) > 1 and q[1] else None
      return self.sendj({"data": readiness(None if raw is None else int(raw))})
    if p.endswith("/s08-drafts"):
      return self.sendj({"data": [draft_dto(d) for d in state["drafts"].values() if d["status"] in ("draft", "invalid", "validated", "activation_failed", "rollback_draft")]})
    if p.endswith("/s08-history"): return self.sendj({"data": state["history"]})
    if p.endswith("/diff") and "/s08-drafts/" in p:
      draft_id = p.split("/s08-drafts/")[1].split("/")[0]
      d = state["drafts"].get(draft_id)
      if not d: return self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
      base = state["published"] if state["published"] is not None else VALUE
      changes = []
      for family in ("tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"):
        if d["value"].get(family) != base.get(family):
          changes.append({"field": family, "before": base.get(family), "after": d["value"].get(family), "sensitivity": "public"})
      return self.sendj({"data": {"draftId": d["id"], "draftVersion": d["version"], "descriptorKey": "settings.api-service-account", "changes": changes, "secretChangeCount": 0, "restartRequired": False, "affectedServices": ["api-service-accounts"]}})
    if "/s08-drafts/" in p:
      draft_id = p.rsplit("/", 1)[-1]
      d = state["drafts"].get(draft_id)
      if not d: return self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
      return self.sendj({"data": draft_dto(d)})
    if p == "/dashboard/mcp/service-accounts":
      return self.sendj({"data": state["serviceAccounts"]})
    if "/dashboard/mcp/service-accounts/" in p and p.endswith("/tokens"):
      account_id = p.split("/dashboard/mcp/service-accounts/")[1].split("/")[0]
      return self.sendj({"data": state["tokens"].get(account_id, [])})
    if "/dashboard/mcp/service-accounts/" in p:
      account_id = p.rsplit("/", 1)[-1]
      account = next((a for a in state["serviceAccounts"] if a["id"] == account_id), None)
      if not account: return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
      return self.sendj({"data": account})
    if p == "/dashboard/mcp/invocations": return self.sendj({"data": state["invocations"]})
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def do_POST(self):
    body = self.read_body()
    p = self.path
    if p == "/control":
      state.update({k: v for k, v in body.items() if k in state}); return self.sendj({"state": state})
    if p.endswith("/s08-impact-preview"):
      status, data = impact_preview(body); return self.sendj(data, status)
    if p.endswith("/s08-drafts"):
      if state["profile"] != "writer": return self.sendj({"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}, 403)
      cas = state["settingsRevision"] if state["published"] is not None else 0
      if body.get("expectedPublishedVersion", 0) != cas: return self.sendj({"error": "version conflict", "code": "VERSION_CONFLICT"}, 409)
      d = {"id": str(uuid.uuid4()), "status": "draft", "value": body.get("value", VALUE), "base": cas, "version": state["nextVersion"], "reason": body.get("changeReason", "fixture draft"), "createdAt": NOW(), "updatedAt": NOW(), "validationRevision": None, "rollbackOfPublicationId": None}
      state["nextVersion"] += 1; state["settingsRevision"] += 1
      state["drafts"][d["id"]] = d
      return self.sendj({"data": draft_dto(d)}, 201)
    if "/s08-drafts/" in p and p.endswith("/validate"):
      status, data = validate_draft(p.rsplit("/", 2)[-2], body); return self.sendj(data, status)
    if "/s08-drafts/" in p and p.endswith("/publish"):
      status, data = publish_draft(p.rsplit("/", 2)[-2], body); return self.sendj(data, status)
    if "/s08-history/" in p and p.endswith("/rollback-draft"):
      status, data = rollback_draft(p.rsplit("/", 2)[-2], body); return self.sendj(data, status)
    if "/dashboard/mcp/service-accounts/" in p and p.endswith("/tokens"):
      account_id = p.split("/dashboard/mcp/service-accounts/")[1].split("/")[0]
      status, data = create_token(account_id, body); return self.sendj(data, status)
    if "/dashboard/mcp/service-accounts/" in p and p.endswith("/rotate"):
      parts = p.split("/dashboard/mcp/service-accounts/")[1].split("/")
      status, data = rotate_token(parts[0], parts[2], body); return self.sendj(data, status)
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def do_PATCH(self):
    body = self.read_body()
    p = self.path
    if "/s08-drafts/" in p:
      draft_id = p.rsplit("/", 1)[-1]
      d = state["drafts"].get(draft_id)
      if not d: return self.sendj({"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}, 404)
      if body.get("expectedVersion") != d["version"]: return self.sendj({"error": "version conflict", "code": "VERSION_CONFLICT"}, 409)
      if d["status"] not in ("draft", "invalid", "activation_failed", "rollback_draft"): return self.sendj({"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}, 409)
      d["value"] = body.get("value", d["value"]); d["reason"] = body.get("changeReason", d["reason"]); d["status"] = "draft"
      d["version"] = state["nextVersion"]; state["nextVersion"] += 1; state["settingsRevision"] += 1; d["validationRevision"] = None; d["updatedAt"] = NOW()
      return self.sendj({"data": draft_dto(d)})
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def do_DELETE(self):
    body = self.read_body()
    p = self.path
    if "/dashboard/mcp/service-accounts/" in p and "/tokens/" in p:
      parts = p.split("/dashboard/mcp/service-accounts/")[1].split("/")
      status, data = revoke_token(parts[0], parts[2], body); return self.sendj(data, status)
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)

if __name__ == "__main__":
  ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
