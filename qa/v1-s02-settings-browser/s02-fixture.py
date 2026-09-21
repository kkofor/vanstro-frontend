#!/usr/bin/env python3
# S02 Settings browser fixture: a controlled owned state machine that mirrors
# the frozen S02 settings.general-storefront contract, including the object
# typed value, business blocker lifecycle, VERSION_CONFLICT vs
# SETTINGS_STATE_CONFLICT, append-only publication event stream, reference
# resolution/degradation, the public /storefront/config projection and the
# consumer-generation readiness binding. Not a production provider.
import json, sys, uuid, urllib.parse
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1])
ACTOR = str(uuid.uuid4())
def now_ms():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
NOW = now_ms

CANADA_TIMEZONES = {
  "America/St_Johns", "America/Halifax", "America/Moncton", "America/Glace_Bay", "America/Goose_Bay",
  "America/Blanc-Sablon", "America/Toronto", "America/Iqaluit", "America/Winnipeg", "America/Rankin_Inlet",
  "America/Regina", "America/Swift_Current", "America/Edmonton", "America/Cambridge_Bay", "America/Inuvik",
  "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston", "America/Vancouver", "America/Whitehorse",
  "America/Dawson"
}
SUPPORTED_LOCALES = {"en-CA", "fr-CA"}

COMPILED = {
  "generalIdentity": {
    "siteDisplayName": "VanStro Global Supply", "legalName": "VanStro Global Supply",
    "canonicalUrl": "https://www.vanstro.ca", "contactEmail": "support@vanstro.ca",
    "contactPhone": "+1 204 555 0187",
    "contactAddress": {"line1": "1700 Waverley St", "city": "Winnipeg", "province": "MB", "postalCode": "R3T 0A1", "country": "Canada"},
    "defaultTimezone": "America/Winnipeg"
  },
  "brand": {"brandName": "VanStro", "brandDescription": "", "logoMediaRef": None, "faviconMediaRef": None},
  "storefront": {
    "homeContentRef": None, "navigationRef": None, "footerRef": None,
    "defaultProductSort": "newest", "outOfStockDisplay": "show",
    "dealerSelectionEnabled": True, "cartCheckoutEnabled": True,
    "announcementRule": {"enabled": False, "message": ""},
    "maintenanceBannerRule": {"enabled": False, "message": ""},
    "storefrontConfigRef": None, "enFrRoutesEnabled": True
  },
  "localization": {
    "defaultLocale": "en-CA", "supportedLocales": ["en-CA", "fr-CA"], "dashboardLocale": "zh-CN",
    "currency": "CAD", "timezone": "America/Winnipeg", "dateFormat": "yyyy-mm-dd",
    "phoneFormat": "national", "addressFormat": "canada_default", "weightUnits": "kg",
    "dimensionUnits": "cm", "translationFallback": "en_ca", "provinceServiceMapping": []
  },
  "defaultDealerLocation": {"defaultDealerRef": None, "defaultLocationRef": None}
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
  "publishedValue": None,        # current effective published S02 value (or None = compiled_default)
  "publishedRevision": 0,        # descriptor-scoped CAS used by create/rollback expectedPublishedVersion
  "publishedAt": None,
  "mediaAssets": {
    "11111111-1111-4111-8111-111111111111": {"id": "11111111-1111-4111-8111-111111111111", "contentType": "image/png"},
    "22222222-2222-4222-8222-222222222222": {"id": "22222222-2222-4222-8222-222222222222", "contentType": "image/png"}
  },
  "cmsModules": {
    "33333333-3333-4333-8333-333333333333": {"id": "33333333-3333-4333-8333-333333333333"},
    "44444444-4444-4444-8444-444444444444": {"id": "44444444-4444-4444-8444-444444444444"}
  },
  "dealers": {
    "55555555-5555-4555-8555-555555555555": {"id": "55555555-5555-4555-8555-555555555555", "name": "Yuan Construction Ltd."},
    "66666666-6666-4666-8666-666666666666": {"id": "66666666-6666-4666-8666-666666666666", "name": "Winnipeg Materials Co."}
  },
  "dealerLocations": {
    "77777777-7777-4777-8777-777777777777": {"id": "77777777-7777-4777-8777-777777777777", "city": "Winnipeg", "province": "MB"},
    "88888888-8888-4888-8888-888888888888": {"id": "88888888-8888-4888-8888-888888888888", "city": "Toronto", "province": "ON"}
  },
  "referenceMode": "resolve",    # resolve | missing | degraded
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
  # The frozen Settings registry contract still exposes only the S01 core
  # descriptor (integer valueType, exactly one available entry); S02's
  # descriptor surface is the S02 panel + capability, not the S01 registry.
  return {"data": [
    {"key": "settings.core.overview_refresh_seconds", "group": "core", "title": "Overview refresh interval",
     "description": "Controls how often the Settings overview refreshes safe status.",
     "schemaVersion": "settings.core.overview-refresh-seconds.v1", "availability": "available",
     "valueType": "integer", "secret": False, "mutable": True, "defaultValue": 60}
  ]}

def s02_readiness(consumer_generation=None):
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
  published_generation = state["publications"][-1]["sequence"] if state["publications"] and state["publications"][-1]["eventType"] in ("published", "rollback_published") else 0
  projection = "published" if state["publishedValue"] is not None else "compiled_default"
  effective = 60
  exact = consumer_generation == published_generation and published_generation > 0
  return {"state": "ready" if exact else "degraded",
          "reasonCode": "consumer_generation_missing" if consumer_generation is None else "ready" if exact else "consumer_generation_mismatch",
          "observedAt": NOW(), "publishedGeneration": published_generation,
          "publicationVersion": published_generation if projection == "published" else None,
          "consumerGeneration": consumer_generation, "effectiveOverviewRefreshSeconds": effective,
          "projectionState": projection}

def s01_overview():
  return {"data": {
    "contractVersion": "settings-center.v1",
    "environment": {"label": "Browser fixture", "kind": "local"},
    "publication": {"generation": "0", "version": 0, "publishedAt": None},
    "openDraftCount": 0, "latestLifecycle": {"status": "none", "occurredAt": None},
    "readiness": s01_readiness(None),
    "registry": {"availableCount": 2, "comingInV1Count": 10, "notImplementedCount": 0}}}

def draft_dto(d):
  return {"id": d["id"], "descriptorKey": "settings.general-storefront", "status": d["status"],
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
    ("generalIdentity.siteDisplayName", before["generalIdentity"]["siteDisplayName"], d["value"]["generalIdentity"]["siteDisplayName"]),
    ("brand.brandName", before["brand"]["brandName"], d["value"]["brand"]["brandName"]),
    ("storefront.announcementRule", before["storefront"]["announcementRule"], d["value"]["storefront"]["announcementRule"]),
    ("localization.defaultLocale", before["localization"]["defaultLocale"], d["value"]["localization"]["defaultLocale"])
  ]
  for field, b, a in fields:
    if json.dumps(b, sort_keys=True) != json.dumps(a, sort_keys=True):
      changes.append({"field": field, "before": b, "after": a, "sensitivity": "public"})
  if not changes:
    changes.append({"field": "generalIdentity.siteDisplayName", "before": before["generalIdentity"]["siteDisplayName"], "after": d["value"]["generalIdentity"]["siteDisplayName"], "sensitivity": "public"})
  return {"data": {"draftId": d["id"], "draftVersion": d["version"], "descriptorKey": "settings.general-storefront",
                   "changes": changes, "secretChangeCount": 0, "restartRequired": False,
                   "affectedServices": ["storefront", "dashboard"]}}

def history_entries():
  out = []
  for e in state["publications"]:
    status = "published" if e["eventType"] in ("published", "rollback_published") else "superseded"
    out.append({"publicationId": e["runtimeConfigId"], "generation": str(e["generation"]), "version": e["sequence"],
                "status": status, "descriptorKeys": ["settings.general-storefront"],
                "changeReason": e["changeReason"], "publishedAt": e["occurredAt"],
                "rollbackOfPublicationId": e.get("rollbackSourcePublicationId"), "auditEventId": e["auditEventId"]})
  return {"data": out}

def audit_row(action, resource_id, result="succeeded"):
  ctx = p02_context()
  row = {"id": str(uuid.uuid4()), "action": action, "resourceType": "runtime_config", "resourceId": resource_id,
         "result": result, "effectiveRoles": ctx["globalRoleKeys"], "permissionGrants": ctx["permissionGrants"],
         "contextRevision": ctx["contextRevision"], "occurredAt": NOW(),
         "metadata": {"descriptorKey": "settings.general-storefront"}}
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

def create_draft(body):
  if state["profile"] != "writer":
    return 403, {"error": "forbidden", "code": "DASHBOARD_FORBIDDEN"}
  if body.get("expectedPublishedVersion") != state["publishedRevision"]:
    return 409, {"error": "version conflict", "code": "VERSION_CONFLICT"}
  if not is_structurally_valid(body.get("value")):
    return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
  d = new_draft(deepcopy(body["value"]), body["changeReason"].strip())
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
  if not is_structurally_valid(body.get("value")):
    return 400, {"error": "invalid request", "code": "COMMERCE_INVALID"}
  d["value"] = deepcopy(body["value"]); d["reason"] = body["changeReason"].strip()
  d["status"] = "draft"; d["version"] = state["nextDraftRevision"]; state["nextDraftRevision"] += 1
  d["validationRevision"] = None; d["updatedAt"] = NOW()
  audit_row("update", d["id"])
  return 200, {"data": draft_dto(d)}

def is_structurally_valid(value):
  if not isinstance(value, dict): return False
  try:
    v = value
    gi, br, sf, lz, dd = v["generalIdentity"], v["brand"], v["storefront"], v["localization"], v["defaultDealerLocation"]
    if not (isinstance(gi, dict) and isinstance(br, dict) and isinstance(sf, dict) and isinstance(lz, dict) and isinstance(dd, dict)):
      return False
    if not isinstance(gi["siteDisplayName"], str) or not (1 <= len(gi["siteDisplayName"].strip()) <= 120): return False
    if not isinstance(gi["legalName"], str) or not (1 <= len(gi["legalName"].strip()) <= 200): return False
    if not isinstance(gi["canonicalUrl"], str) or len(gi["canonicalUrl"]) > 2048 or not gi["canonicalUrl"].startswith("http"): return False
    if not isinstance(gi["contactEmail"], str) or "@" not in gi["contactEmail"]: return False
    if not isinstance(gi["contactPhone"], str) or not (7 <= len(gi["contactPhone"]) <= 25): return False
    if gi["defaultTimezone"] not in CANADA_TIMEZONES: return False
    if not isinstance(br["brandName"], str) or not (1 <= len(br["brandName"].strip()) <= 120): return False
    if not isinstance(br["brandDescription"], str) or len(br["brandDescription"]) > 500: return False
    for key in ("logoMediaRef", "faviconMediaRef"):
      if br[key] is not None and not is_uuid(br[key]): return False
    if sf["defaultProductSort"] not in ("newest", "price_asc", "price_desc", "featured"): return False
    if sf["outOfStockDisplay"] not in ("hide", "show", "hide_with_contact"): return False
    if not isinstance(sf["dealerSelectionEnabled"], bool) or not isinstance(sf["cartCheckoutEnabled"], bool) or not isinstance(sf["enFrRoutesEnabled"], bool): return False
    for key in ("homeContentRef", "navigationRef", "footerRef", "storefrontConfigRef"):
      if sf[key] is not None and not is_uuid(sf[key]): return False
    ann = sf["announcementRule"]
    if not isinstance(ann, dict) or not isinstance(ann.get("enabled"), bool) or not isinstance(ann.get("message"), str) or len(ann["message"]) > 300: return False
    if ann.get("locale") not in (None, "en-CA", "fr-CA"): return False
    if lz["defaultLocale"] not in SUPPORTED_LOCALES: return False
    if not isinstance(lz["supportedLocales"], list) or not lz["supportedLocales"] or len(lz["supportedLocales"]) > 2 or not all(x in SUPPORTED_LOCALES for x in lz["supportedLocales"]): return False
    if lz["dashboardLocale"] != "zh-CN" or lz["currency"] != "CAD" or lz["timezone"] not in CANADA_TIMEZONES: return False
    if lz["dateFormat"] not in ("yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"): return False
    if lz["phoneFormat"] not in ("national", "international"): return False
    if lz["addressFormat"] != "canada_default" or lz["weightUnits"] not in ("kg", "lb") or lz["dimensionUnits"] not in ("cm", "in") or lz["translationFallback"] != "en_ca": return False
    if not isinstance(lz["provinceServiceMapping"], list) or len(lz["provinceServiceMapping"]) > 13: return False
    for key in ("defaultDealerRef", "defaultLocationRef"):
      if dd[key] is not None and not is_uuid(dd[key]): return False
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
  lz = value["localization"]
  if lz["defaultLocale"] not in lz["supportedLocales"]:
    issues.append({"code": "S02_LOCALE_RELATION", "severity": "blocker", "field": "localization.supportedLocales",
                   "message": "defaultLocale must be in supportedLocales."})
  dd = value["defaultDealerLocation"]
  if dd["defaultDealerRef"] and not dd["defaultLocationRef"]:
    issues.append({"code": "S02_DEALER_PAIRING", "severity": "blocker", "field": "defaultDealerLocation.defaultLocationRef",
                   "message": "defaultLocationRef is required when defaultDealerRef is set."})
  if not dd["defaultDealerRef"] and dd["defaultLocationRef"]:
    issues.append({"code": "S02_DEALER_PAIRING", "severity": "blocker", "field": "defaultDealerLocation.defaultDealerRef",
                   "message": "defaultDealerRef is required when defaultLocationRef is set."})
  for key in ("logoMediaRef", "faviconMediaRef"):
    ref = value["brand"][key]
    if ref and ref not in state["mediaAssets"]:
      issues.append({"code": "S02_MEDIA_REF_MISSING", "severity": "blocker", "field": f"brand.{key}",
                     "message": f"The referenced media asset {ref} does not exist."})
  for key in ("homeContentRef", "navigationRef", "footerRef"):
    ref = value["storefront"][key]
    if ref and ref not in state["cmsModules"]:
      issues.append({"code": "S02_CMS_REF_MISSING", "severity": "blocker", "field": f"storefront.{key}",
                     "message": f"The referenced CMS module {ref} does not exist."})
  dd = value["defaultDealerLocation"]
  if dd["defaultDealerRef"] and dd["defaultDealerRef"] not in state["dealers"]:
    issues.append({"code": "S02_DEALER_REF_MISSING", "severity": "blocker", "field": "defaultDealerLocation.defaultDealerRef",
                   "message": f"The referenced dealer {dd['defaultDealerRef']} does not exist."})
  if dd["defaultLocationRef"] and dd["defaultLocationRef"] not in state["dealerLocations"]:
    issues.append({"code": "S02_DEALER_LOCATION_REF_MISSING", "severity": "blocker", "field": "defaultDealerLocation.defaultLocationRef",
                   "message": f"The referenced dealer location {dd['defaultLocationRef']} does not exist."})
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
  state["publishedValue"] = deepcopy(d["value"]); state["publishedRevision"] = d["version"]
  state["publishedGeneration"] += 1; state["publishedAt"] = NOW()
  del state["drafts"][d["id"]]
  return 200, {"data": {"id": d["id"], "generation": str(published_sequence), "version": published_sequence,
                        "sourceDraftId": d["id"], "sourceDraftVersion": body["expectedVersion"], "status": "published",
                        "publishedAt": NOW(), "rollbackOfPublicationId": d.get("rollbackOfPublicationId"),
                        "readiness": {"state": "degraded", "reasonCode": "consumer_generation_missing",
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

def public_projection(locale):
  if state["publishedValue"] is None:
    effective = {"siteDisplayName": COMPILED["generalIdentity"]["siteDisplayName"],
                 "brandName": COMPILED["brand"]["brandName"],
                 "announcementRule": {"enabled": False, "message": "", "locale": None, "startsAt": None, "endsAt": None},
                 "contact": {"email": "", "phone": ""}, "logoMedia": None,
                 "defaultDealer": None, "defaultLocation": None}
    return {"data": {"projectionState": "compiled_default", "publishedGeneration": 0, "locale": locale, "effective": effective}}
  v = state["publishedValue"]
  mode = state["referenceMode"]
  logo = None
  media_ref = v["brand"].get("logoMediaRef")
  if media_ref:
    if mode == "resolve" and media_ref in state["mediaAssets"]:
      logo = {"id": media_ref, "contentType": state["mediaAssets"][media_ref]["contentType"]}
    elif mode == "degraded":
      logo = None  # degraded: reference unresolved but projection still serves public-safe fields
  dealer, location = None, None
  dd = v["defaultDealerLocation"]
  if dd.get("defaultDealerRef") and dd.get("defaultLocationRef"):
    if mode == "resolve" and dd["defaultDealerRef"] in state["dealers"] and dd["defaultLocationRef"] in state["dealerLocations"]:
      dealer = {"id": dd["defaultDealerRef"], "name": state["dealers"][dd["defaultDealerRef"]]["name"]}
      location = {"id": dd["defaultLocationRef"], "city": state["dealerLocations"][dd["defaultLocationRef"]]["city"],
                  "province": state["dealerLocations"][dd["defaultLocationRef"]]["province"]}
  announcement = {"enabled": bool(v["storefront"]["announcementRule"]["enabled"]),
                  "message": v["storefront"]["announcementRule"]["message"],
                  "locale": v["storefront"]["announcementRule"].get("locale") or None,
                  "startsAt": v["storefront"]["announcementRule"].get("startsAt") or None,
                  "endsAt": v["storefront"]["announcementRule"].get("endsAt") or None}
  effective = {"siteDisplayName": v["generalIdentity"]["siteDisplayName"],
               "brandName": v["brand"]["brandName"],
               "announcementRule": announcement,
               "contact": {"email": v["generalIdentity"]["contactEmail"], "phone": v["generalIdentity"]["contactPhone"]},
               "logoMedia": logo, "defaultDealer": dealer, "defaultLocation": location}
  return {"data": {"projectionState": "published", "publishedGeneration": state["publishedGeneration"],
                   "locale": locale, "effective": effective}}

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
                   "actor": {"id": ACTOR, "displayLabel": "S02 QA", "roleLabels": roles_for(state["profile"])},
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
    # The dashboard/storefront clients fetch with credentials: "include", so the
    # browser requires an exact origin (never "*"). Echo a loopback origin back.
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
  def do_OPTIONS(self):
    self.send_response(204); self.cors(); self.end_headers()
  def do_GET(self):
    self.record(); p = urllib.parse.urlparse(self.path).path
    if p == "/control/state": return self.sendj({"actor": ACTOR, "state": {k: v for k, v in state.items() if k != "requests"}})
    if p in ("/auth/me", "/api/v1/auth/me"): return self.sendj({"data": {"user": {"id": ACTOR, "email": "qa@vanstro.test", "role": "admin"}}})
    if p in ("/storefront/config", "/api/v1/storefront/config"):
      query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)
      locale = query.get("locale", ["en-CA"])[0]
      if locale not in SUPPORTED_LOCALES: locale = "en-CA"
      return self.sendj(public_projection(locale))
    if p in ("/products", "/home/products", "/api/v1/products", "/api/v1/home/products"):
      skus = ["011770130", "012770130", "011950130", "013780130", "015190130", "017580130", "023021011", "023621011"]
      data = [{"id": f"fixture-product-{i}", "slug": f"fixture-product-{i}", "name": f"Fixture product {sku}",
               "primarySku": {"id": f"fixture-sku-{sku}", "skuCode": sku, "name": f"Fixture SKU {sku}"},
               "category": "cabinets", "unit": "each", "dimensions": "30x30x30",
               "images": [{"url": f"/assets/fixture-{sku}.png", "alt": f"Fixture product {sku}"}], "inStock": True,
               "price": {"amount": 100, "amountCents": 10000, "currency": "CAD"}} for i, sku in enumerate(skus)]
      return self.sendj({"data": data, "meta": {"limit": 100, "offset": 0, "total": 8, "pagination": {"mode": "offset", "limit": 100, "offset": 0, "hasNext": False, "hasPrevious": False}, "snapshot": {"consistency": "transaction", "capturedAt": NOW()}, "visibility": {"profileId": "browser-fixture"}}})
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
    if p in ("/dashboard/settings/s02-drafts", "/api/v1/dashboard/settings/s02-drafts"): return self.sendj(draft_list())
    if p in ("/dashboard/settings/s02-history", "/api/v1/dashboard/settings/s02-history"): return self.sendj(history_entries())
    if p in ("/dashboard/settings/s02-readiness", "/api/v1/dashboard/settings/s02-readiness"):
      query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)
      raw = query.get("consumerGeneration", [None])[0]
      if raw is not None and (not raw.isdigit() or (raw != "0" and raw.startswith("0")) or int(raw) > 2147483647):
        return self.sendj({"error": "invalid consumer generation", "code": "SETTINGS_VALIDATION_FAILED"}, 400)
      return self.sendj({"data": s02_readiness(None if raw is None else int(raw))})
    if p in ("/dashboard/settings/readiness", "/api/v1/dashboard/settings/readiness"):
      return self.sendj({"data": s01_readiness(None)})
    if p.startswith(("/dashboard/settings/s02-drafts/", "/api/v1/dashboard/settings/s02-drafts/")):
      rest = p[len("/dashboard/settings/s02-drafts/"):] if p.startswith("/dashboard/settings/s02-drafts/") else p[len("/api/v1/dashboard/settings/s02-drafts/"):]
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
    if p in ("/dashboard/settings/s02-drafts", "/api/v1/dashboard/settings/s02-drafts"):
      s, r = create_draft(b); return self.sendj(r, s)
    if p.startswith(("/dashboard/settings/s02-drafts/", "/api/v1/dashboard/settings/s02-drafts/")):
      rest = p[len("/dashboard/settings/s02-drafts/"):] if p.startswith("/dashboard/settings/s02-drafts/") else p[len("/api/v1/dashboard/settings/s02-drafts/"):]
      if rest.endswith("/validate"):
        s, r = validate_draft(rest[:-9], b); return self.sendj(r, s)
      if rest.endswith("/publish"):
        s, r = publish_draft(rest[:-8], b); return self.sendj(r, s)
    if p.startswith(("/dashboard/settings/s02-history/", "/api/v1/dashboard/settings/s02-history/")):
      rest = p[len("/dashboard/settings/s02-history/"):] if p.startswith("/dashboard/settings/s02-history/") else p[len("/api/v1/dashboard/settings/s02-history/"):]
      if rest.endswith("/rollback-draft"):
        s, r = rollback_draft(rest[:-15], b); return self.sendj(r, s)
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def do_PATCH(self):
    b = self.body(); self.record(b); p = urllib.parse.urlparse(self.path).path
    if p.startswith(("/dashboard/settings/s02-drafts/", "/api/v1/dashboard/settings/s02-drafts/")):
      rest = p[len("/dashboard/settings/s02-drafts/"):] if p.startswith("/dashboard/settings/s02-drafts/") else p[len("/api/v1/dashboard/settings/s02-drafts/"):]
      if "/" not in rest:
        s, r = update_draft(rest, b); return self.sendj(r, s)
    return self.sendj({"error": "not found", "code": "DASHBOARD_NOT_FOUND"}, 404)
  def control(self, b):
    if "profile" in b: state["profile"] = b["profile"]
    if "generation" in b: state["generation"] = b["generation"]
    if "referenceMode" in b: state["referenceMode"] = b["referenceMode"]
    if "publishedValue" in b and state["publishedValue"] is not None: state["publishedValue"] = b["publishedValue"]
    if "reset" in b and b["reset"]:
      state["publications"] = []; state["drafts"] = {}; state["nextDraftRevision"] = 1
      state["nextSequence"] = 1; state["audit"] = []; state["publishedValue"] = None
      state["publishedRevision"] = 0; state["publishedAt"] = None; state["publishedGeneration"] = 0
      state["referenceMode"] = "resolve"
    return self.sendj({"ok": True})

if __name__ == "__main__":
  ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
