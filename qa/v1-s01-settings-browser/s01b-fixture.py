#!/usr/bin/env python3
# S01B Settings browser fixture: a controlled owned state machine that mirrors
# the frozen settings-center.v1 contract exactly, including the append-only
# publication event stream, the invalid/blocker lifecycle, VERSION_CONFLICT vs
# SETTINGS_STATE_CONFLICT, real P02 roles/grants in Audit rows, and the
# consumer-generation readiness binding. Not a production provider.
import json, sys, uuid, urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1])
ACTOR = str(uuid.uuid4())
def now_ms():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
NOW = now_ms

state = {
  "requests": [],
  "profile": "writer",           # writer | read-only | forbidden
  "generation": 1,               # consumer generation for readiness binding
  "publishedGeneration": 0,      # published generation the consumer must match
  "publications": [],            # append-only publication events
  "drafts": {},                  # id -> draft dict (resource CAS)
  "nextDraftRevision": 1,        # descriptor-scoped draft CAS
  "nextSequence": 1,             # descriptor-scoped publication sequence
  "audit": [],                   # mutation Audit rows with real roles/grants
  "publishedValue": None,        # current effective published seconds
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
  ctx = {
    "actorId": ACTOR,
    "globalRoleKeys": roles_for(state["profile"]),
    "scopedRoleKeys": [],
    "permissionGrants": grants_for(state["profile"]),
    "contextRevision": f"ctx-{state['profile']}-{state['generation']}",
  }
  return ctx

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
  return {"data": [{
    "key": "settings.core.overview_refresh_seconds", "group": "core", "title": "Overview refresh interval",
    "description": "Controls how often the Settings overview refreshes safe status.",
    "schemaVersion": "settings.core.overview-refresh-seconds.v1", "availability": "available",
    "valueType": "integer", "secret": False, "mutable": True, "defaultValue": 60,
  }]}

def readiness(consumer_generation=None):
  published_generation = state["publications"][-1]["sequence"] if state["publications"] and state["publications"][-1]["eventType"] in ("published", "rollback_published") else 0
  projection = "published" if state["publishedValue"] is not None else "compiled_default"
  effective = state["publishedValue"] if state["publishedValue"] is not None else 60
  exact = consumer_generation == published_generation
  return {"state": "ready" if exact else "degraded",
          "reasonCode": "consumer_generation_missing" if consumer_generation is None else "ready" if exact else "consumer_generation_mismatch",
          "observedAt": NOW(), "publishedGeneration": published_generation,
          "publicationVersion": published_generation if projection == "published" else None,
          "consumerGeneration": consumer_generation, "effectiveOverviewRefreshSeconds": effective,
          "projectionState": projection}

def overview():
  return {"data": {
    "contractVersion": "settings-center.v1",
    "environment": {"label": "Browser fixture", "kind": "local"},
    "publication": {"generation": str(readiness()["publishedGeneration"]), "version": readiness()["publishedGeneration"], "publishedAt": state["publishedAt"]},
    "openDraftCount": len([d for d in state["drafts"].values() if d["status"] in ("draft", "invalid", "activation_failed", "rollback_draft")]),
    "latestLifecycle": {"status": "published" if state["publishedValue"] is not None else "none", "occurredAt": state["publishedAt"]},
    "readiness": readiness(),
    "registry": {"availableCount": 1, "comingInV1Count": 11, "notImplementedCount": 0},
  }}

def draft_dto(d):
  return {"id": d["id"], "descriptorKey": "settings.core.overview_refresh_seconds", "status": d["status"],
          "value": d["value"], "basePublicationVersion": d["base"], "version": d["version"],
          "changeReason": d["reason"], "createdAt": d["createdAt"], "updatedAt": d["updatedAt"],
          "validationRevision": d.get("validationRevision"), "rollbackOfPublicationId": d.get("rollbackOfPublicationId")}

def draft_list():
  open_states = ("draft", "invalid", "validated", "activation_failed", "rollback_draft")
  return {"data": [draft_dto(d) for d in state["drafts"].values() if d["status"] in open_states]}

def diff_for(d):
  return {"data": {"draftId": d["id"], "draftVersion": d["version"], "descriptorKey": "settings.core.overview_refresh_seconds",
                   "changes": [{"field": "value", "before": state["publishedValue"] if state["publishedValue"] is not None else 60, "after": d["value"], "sensitivity": "public"}],
                   "secretChangeCount": 0, "restartRequired": False, "affectedServices": ["dashboard"]}}

def history_entries():
  out = []
  for e in state["publications"]:
    status = "published" if e["eventType"] in ("published", "rollback_published") else e["eventType"]
    out.append({"publicationId": e["runtimeConfigId"], "generation": str(e["generation"]), "version": e["sequence"],
                "status": status, "descriptorKeys": ["settings.core.overview_refresh_seconds"],
                "changeReason": e["changeReason"], "publishedAt": e["occurredAt"],
                "rollbackOfPublicationId": e.get("rollbackSourcePublicationId"), "auditEventId": e["auditEventId"]})
  return out

def audit_row(action, resource_id, result="succeeded"):
  ctx = p02_context()
  row = {"id": str(uuid.uuid4()), "action": action, "resourceType": "runtime_config", "resourceId": resource_id,
         "result": result, "effectiveRoles": ctx["globalRoleKeys"], "permissionGrants": ctx["permissionGrants"],
         "contextRevision": ctx["contextRevision"], "occurredAt": NOW()}
  state["audit"].append(row)
  return row

def new_draft(value, reason, rollback_of=None):
  d = {"id": str(uuid.uuid4()), "status": "draft", "value": value, "base": readiness()["publishedGeneration"],
       "version": state["nextDraftRevision"], "reason": reason, "createdAt": NOW(), "updatedAt": NOW(),
       "validationRevision": None, "rollbackOfPublicationId": rollback_of}
  state["nextDraftRevision"] += 1
  state["drafts"][d["id"]] = d
  return d

def create_draft(body):
  if state["profile"] != "writer":
    return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
  if body.get("expectedPublishedVersion") != readiness()["publishedGeneration"]:
    return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
  d = new_draft(body["value"], body["changeReason"].strip())
  audit_row("create", d["id"])
  return 201, {"data": draft_dto(d)}

def update_draft(draft_id, body):
  if state["profile"] != "writer":
    return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
  d = state["drafts"].get(draft_id)
  if not d:
    return 404, {"error": "unavailable", "code": "SETTINGS_DESCRIPTOR_UNAVAILABLE"}
  if body.get("expectedVersion") != d["version"]:
    return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
  if d["status"] not in ("draft", "invalid", "activation_failed", "rollback_draft"):
    return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
  d["value"] = body["value"]; d["reason"] = body["changeReason"].strip()
  d["status"] = "draft"; d["version"] = state["nextDraftRevision"]; state["nextDraftRevision"] += 1
  d["validationRevision"] = None; d["updatedAt"] = NOW()
  audit_row("update", d["id"])
  return 200, {"data": draft_dto(d)}

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
  valid = 15 <= d["value"] <= 300
  d["status"] = "validated" if valid else "invalid"
  d["version"] = state["nextDraftRevision"]; state["nextDraftRevision"] += 1
  d["validationRevision"] = d["version"]; d["updatedAt"] = NOW()
  issues = [{"code": "SETTINGS_CHANGE_REVIEWED", "severity": "info", "field": "value", "message": "The refresh interval is within the supported range."}] if valid else \
           [{"code": "SETTINGS_VALUE_OUT_OF_RANGE", "severity": "blocker", "field": "value", "message": "The refresh interval must be between 15 and 300 seconds."}]
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
  # Append superseded event for the current publication (do not mutate it).
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
  state["publishedValue"] = d["value"]; state["publishedRevision"] = d["version"]
  state["publishedGeneration"] += 1; state["publishedAt"] = NOW()
  del state["drafts"][d["id"]]
  return 200, {"data": {"id": d["id"], "generation": str(published_sequence), "version": published_sequence,
                        "sourceDraftId": d["id"], "sourceDraftVersion": body["expectedVersion"], "status": "published",
                        "publishedAt": NOW(), "rollbackOfPublicationId": d.get("rollbackOfPublicationId"),
                        "readiness": readiness()}}

def rollback_draft(publication_id, body):
  if state["profile"] != "writer":
    return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
  current = state["publications"][-1] if state["publications"] else None
  if not current or current["runtimeConfigId"] != publication_id:
    return 409, {"error": "state conflict", "code": "SETTINGS_STATE_CONFLICT"}
  if body.get("expectedPublishedVersion") != readiness()["publishedGeneration"]:
    return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
  d = new_draft(state["publishedValue"], body["changeReason"].strip(), rollback_of=publication_id)
  d["status"] = "rollback_draft"; d["version"] = state["nextDraftRevision"]; state["nextDraftRevision"] += 1
  audit_row("create", d["id"])
  return 201, {"data": draft_dto(d)}

# Complete dashboard-foundation.v1.1 module projection. The 22-module
# registry is derived from the shared mechanical source of truth
# (src/lib/api/api-contract.ts DASHBOARD_FOUNDATION_MODULE_STATE) at
# fixture startup — never a hand-written second table. The S01 actor's read
# scope is overview + settings; every other module is denied with the
# registry-required reason.
import subprocess as _subprocess
ROOT = Path(__file__).resolve().parents[2]

def canonical_module_state():
  code = (
    "import { DASHBOARD_FOUNDATION_MODULE_STATE } from './src/lib/api/api-contract.ts';"
    "console.log(JSON.stringify(DASHBOARD_FOUNDATION_MODULE_STATE.map(m => "
    "({module: m.module, label: m.label, group: m.group, status: m.status, route: m.route, selectors: m.selectors}))));"
  )
  out = _subprocess.run(["node", "--experimental-strip-types", "-e", code], cwd=ROOT,
                        capture_output=True, text=True, check=True)
  return json.loads(out.stdout)

CANONICAL_MODULE_STATE = canonical_module_state()
# The S01 actor reads overview; settings stays coming_soon/denied in the
# foundation projection exactly like the real registry — the settings center
# renders through the specializedSettingsRouteEnabled shell bypass
# (settingsCenterV1 capability), not through a fabricated readable module.
READABLE_MODULES = {"overview"}

def foundation_modules():
  result = []
  for entry in CANONICAL_MODULE_STATE:
    readable = entry["module"] in READABLE_MODULES
    if entry["status"] == "coming_soon":
      assert not readable, f"coming-soon module must stay denied: {entry['module']}"
      reason = "coming_soon"
    elif readable:
      reason = None
    else:
      reason = "permission_required"
    module = {"module": entry["module"], "label": entry["label"], "group": entry["group"], "status": entry["status"], "readAllowed": readable, "route": entry["route"], "selectors": entry["selectors"]}
    if reason is not None:
      module["reason"] = reason
    result.append(module)
  return result

def foundation():
  return {"data": {"contractVersion": "dashboard-foundation.v1.1",
                   "actor": {"id": ACTOR, "displayLabel": "S01B QA", "roleLabels": roles_for(state["profile"])},
                   "modules": foundation_modules(),
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
                   "auditFoundationV1": {"enabled": False, "queryProfile": "dashboard.audit-events.v1", "eventVersion": "audit-event.v1", "sensitive": {"enabled": False}}, "workQueueFoundationV1": {"enabled": False},
                   "asyncJobFoundationV1": {"enabled": False}, "dataJobFoundationV1": {"enabled": False},
                   "mediaFoundationV1": {"enabled": False, "contractVersion": "media-asset.v1", "queryProfile": "dashboard.media-assets.v1", "registryVersion": "media-registry.v1", "safeProfile": "dashboard.media-assets.safe.v1", "sensitiveProfile": {"enabled": False}, "actions": {"create": False, "update": False, "archive": False, "restore": False, "downloadOriginal": False, "manageVariants": False}, "upload": {"enabled": False}, "preview": {"controlled": True, "pdfInline": False}, "legacyAdapters": {"enabled": True, "partial": True}, "externalDelivery": False, "ai": False, "bulkImportExport": False},
                   "settingsCenterV1": capability()}}

class H(BaseHTTPRequestHandler):
  def log_message(self, *a): pass
  def cors(self):
    self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:4550")
    self.send_header("Access-Control-Allow-Credentials", "true")
    self.send_header("Access-Control-Allow-Headers", "Content-Type,Accept,Idempotency-Key")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
  def sendj(self, o, s=200):
    b = json.dumps(o).encode()
    self.send_response(s); self.cors()
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(b)))
    self.end_headers()
    try:
      self.wfile.write(b)
    except BrokenPipeError:
      # The browser can abort an in-flight response (the panel unmounts and
      # aborts its fetch controller during the shell's URL-change remount);
      # the request is already recorded server-side and no retry is needed.
      pass
  def body(self):
    n = int(self.headers.get("Content-Length", "0") or 0)
    return json.loads(self.rfile.read(n) or b"{}")
  def record(self, b=None):
    state["requests"].append({"method": self.command, "path": self.path, "body": b, "idempotency": self.headers.get("Idempotency-Key")})
  def do_OPTIONS(self):
    self.send_response(204); self.cors(); self.end_headers()
  def do_GET(self):
    self.record(); p = urllib.parse.urlparse(self.path).path
    if p == "/control/state": return self.sendj({"actor": ACTOR, "state": {k: v for k, v in state.items() if k != "requests"}})
    if p in ("/auth/me", "/api/v1/auth/me"): return self.sendj({"data": {"user": {"id": ACTOR, "email": "qa@vanstro.test", "role": "admin"}}})
    if p in ("/storefront/config", "/api/v1/storefront/config"):
      query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)
      locale = query.get("locale", ["en-CA"])[0]
      return self.sendj({"data": {"projectionState": "compiled_default", "publishedGeneration": 0, "locale": locale,
        "effective": {"siteDisplayName": "VanStro", "brandName": "VanStro", "announcementRule": {"enabled": False, "message": "", "locale": None, "startsAt": None, "endsAt": None},
          "contact": {"email": "", "phone": ""}, "logoMedia": None, "defaultDealer": None, "defaultLocation": None}}})
    # Minimal storefront endpoints the shared layout requests during SSR/hydration.
    if p in ("/products", "/home/products", "/api/v1/products", "/api/v1/home/products"):
        skus = ["011770130", "012770130", "011950130", "013780130", "015190130", "017580130", "023021011", "023621011"]
        data = [{"id": f"fixture-product-{i}", "slug": f"fixture-product-{i}", "sku": sku, "name": f"Fixture product {sku}",
                 "category": "cabinets", "unit": "each", "dimensions": "30x30x30",
                 "images": [{"url": f"/assets/fixture-{sku}.png", "alt": f"Fixture product {sku}"}], "inStock": True,
                 "price": {"amount": 100, "amountCents": 10000, "currency": "CAD"}} for i, sku in enumerate(skus)]
        return self.sendj({"data": data, "meta": {"pagination": {"mode": "offset", "limit": 100, "offset": 0, "hasNext": False, "hasPrevious": False}, "limit": 100, "offset": 0, "total": 8, "snapshot": {"consistency": "transaction", "capturedAt": NOW()}, "visibility": {"profileId": "browser-fixture"}}})
    if p in ("/categories", "/api/v1/categories"):
        return self.sendj({"data": []})
    if p in ("/dealers", "/api/v1/dealers", "/dealers/lookup", "/api/v1/dealers/lookup"):
        return self.sendj({"data": [], "meta": {"matched": 0}})
    if p in ("/cart", "/api/v1/cart"):
        return self.sendj({"data": {"id": "fixture-cart", "items": [], "subtotal": {"amount": 0, "amountCents": 0, "currency": "CAD"}, "total": {"amount": 0, "amountCents": 0, "currency": "CAD"}}})
    if p in ("/account/favorites", "/api/v1/account/favorites"):
        return self.sendj({"data": {"items": []}})
    if p in ("/dashboard/foundation", "/api/v1/dashboard/foundation"): return self.sendj(foundation())
    if p in ("/dashboard/authorization", "/api/v1/dashboard/authorization"): return self.sendj(authorization())
    if p in ("/dashboard/settings/overview", "/api/v1/dashboard/settings/overview"): return self.sendj(overview())
    if p in ("/dashboard/settings/registry", "/api/v1/dashboard/settings/registry"): return self.sendj(registry())
    if p in ("/dashboard/settings/drafts", "/api/v1/dashboard/settings/drafts"): return self.sendj(draft_list())
    if p in ("/dashboard/settings/history", "/api/v1/dashboard/settings/history"): return self.sendj({"data": history_entries()})
    if p in ("/dashboard/settings/readiness", "/api/v1/dashboard/settings/readiness"):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)
        raw = query.get("consumerGeneration", [None])[0]
        if raw is not None and (not raw.isdigit() or (raw != "0" and raw.startswith("0")) or int(raw) > 2147483647):
            return self.sendj({"error": "invalid consumer generation", "code": "SETTINGS_VALIDATION_FAILED"}, 400)
        return self.sendj({"data": readiness(None if raw is None else int(raw))})
    if p.startswith(("/dashboard/settings/drafts/", "/api/v1/dashboard/settings/drafts/")):
      rest = p[len("/dashboard/settings/drafts/"):] if p.startswith("/dashboard/settings/drafts/") else p[len("/api/v1/dashboard/settings/drafts/"):]
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
    if p in ("/dashboard/settings/drafts", "/api/v1/dashboard/settings/drafts"):
      s, r = create_draft(b); return self.sendj(r, s)
    if p.startswith(("/dashboard/settings/drafts/", "/api/v1/dashboard/settings/drafts/")):
      rest = p[len("/dashboard/settings/drafts/"):] if p.startswith("/dashboard/settings/drafts/") else p[len("/api/v1/dashboard/settings/drafts/"):]
      if rest.endswith("/validate"):
        s, r = validate_draft(rest[:-9], b); return self.sendj(r, s)
      if rest.endswith("/publish"):
        s, r = publish_draft(rest[:-8], b); return self.sendj(r, s)
    if p.startswith(("/dashboard/settings/history/", "/api/v1/dashboard/settings/history/")):
      rest = p[len("/dashboard/settings/history/"):] if p.startswith("/dashboard/settings/history/") else p[len("/api/v1/dashboard/settings/history/"):]
      if rest.endswith("/rollback-draft"):
        s, r = rollback_draft(rest[:-15], b); return self.sendj(r, s)
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def do_PATCH(self):
    b = self.body(); self.record(b); p = urllib.parse.urlparse(self.path).path
    if p.startswith(("/dashboard/settings/drafts/", "/api/v1/dashboard/settings/drafts/")):
      rest = p[len("/dashboard/settings/drafts/"):] if p.startswith("/dashboard/settings/drafts/") else p[len("/api/v1/dashboard/settings/drafts/"):]
      if "/" not in rest:
        s, r = update_draft(rest, b); return self.sendj(r, s)
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def control(self, b):
    if "profile" in b: state["profile"] = b["profile"]
    if "generation" in b: state["generation"] = b["generation"]
    if "publishedValue" in b and state["publishedValue"] is not None: state["publishedValue"] = b["publishedValue"]
    if "reset" in b and b["reset"]:
      state["publications"] = []; state["drafts"] = {}; state["nextDraftRevision"] = 1
      state["nextSequence"] = 1; state["audit"] = []; state["publishedValue"] = None
      state["publishedRevision"] = 0; state["publishedAt"] = None; state["publishedGeneration"] = 0
    if "publishUnvalidated" in b and b["publishUnvalidated"]:
      # Force a state-conflict outcome for the current unvalidated draft by
      # marking it invalid (publish then refuses with SETTINGS_STATE_CONFLICT).
      for d in state["drafts"].values():
        if d["status"] in ("draft", "rollback_draft"):
          d["status"] = "invalid"
    return self.sendj({"ok": True})

if __name__ == "__main__":
  ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
