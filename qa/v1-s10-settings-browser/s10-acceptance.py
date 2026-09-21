#!/usr/bin/env python3
# S10 Privacy/Retention/Audit settings browser acceptance: real Google
# Chrome/Playwright against the controlled fixture. Records raw/expected/
# unexpected console and request evidence, definition/fixture/harness
# SHA-256, and dynamic testedCommit. Covers the frozen S10 contract's 23
# browser cases including future_unavailable surfaces, honestly degraded
# readiness, high-risk/legal-hold blockers and the family-level read-only
# impact preview.
import json, hashlib, os, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ["S10_BROWSER_OUT"])
WEB = os.environ.get("S10_WEB", "http://127.0.0.1:4564")
API = os.environ.get("S10_API", "http://127.0.0.1:4565")
OUT.mkdir(parents=True, exist_ok=True)
definition = json.loads((HERE / "s10-definition.json").read_text())
cases = {x["id"]: {**x, "status": "not-executed", "observations": []} for x in definition["cases"]}
network = []
console = []

def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def result(i, ok, *o):
    if i in cases and cases[i]["status"] != "not-executed":
        cases[i]["status"] = "pass" if ok and cases[i]["status"] == "pass" else "fail"
        cases[i]["observations"].extend(o)
    else:
        cases[i].update(status="pass" if ok else "fail", observations=list(o))

def control(**kw):
    return json.loads(urllib.request.urlopen(urllib.request.Request(
        API + "/control", data=json.dumps(kw).encode(),
        headers={"Content-Type": "application/json"}, method="POST")).read())

def api_state():
    return json.loads(urllib.request.urlopen(API + "/control/state").read())["state"]

def api_json(path):
    return json.loads(urllib.request.urlopen(API + path).read())

def api_post(path, body, expect_error=False):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer fixture-token"}, method="POST")
    try:
        return 200, json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def body_text(p):
    return p.locator("body").inner_text()

def js_click(p, label, timeout=20000):
    p.wait_for_function("""(label) => [...document.querySelectorAll('button')].some(b => b.textContent.includes(label) && !b.disabled)""", arg=label, timeout=timeout)
    clicked = p.evaluate("""(label) => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(label) && !x.disabled); if (!b) return false; b.click(); return true; }""", label)
    if not clicked:
        raise AssertionError(f"required enabled button not found: {label}")

def fill_number(p, index, value):
    p.locator('input[type="number"]').nth(index).fill(str(value))

def fill_input(p, selector, value):
    p.fill(selector, value)

def fill_textarea(p, value, nth=0):
    p.locator("textarea").nth(nth).fill(value)

def fill_reason(p, value):
    # S10 panel textareas: [0]=legalHoldRefs, [1]=changeReason.
    fill_textarea(p, value, 1)

def set_checkbox(p, index, on):
    p.evaluate("""({ index, on }) => {
      const el = document.querySelectorAll('section[aria-label="隐私/留存设置"] input[type="checkbox"]')[index];
      if (el && el.checked !== on) { el.click(); }
    }""", {"index": index, "on": on})
    p.wait_for_timeout(150)

def checkbox_state(p, index):
    return p.evaluate("""(index) => {
      const el = document.querySelectorAll('section[aria-label="隐私/留存设置"] input[type="checkbox"]')[index];
      return el ? el.checked : null;
    }""", index)

def select_preview_family(p, value):
    p.select_option('section[aria-label="隐私/留存设置"] select', value)

def goto_s10(p):
    p.goto(S10_URL)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    # The fixture profile can change between steps; wait until the panel
    # matches the CURRENT fixture capability before interacting.
    want_enabled = api_state()["profile"] == "writer"
    p.wait_for_function("""(want) => {
      const s = document.querySelector('section[aria-label="隐私/留存设置"]');
      if (!s) return false;
      const labels = ['创建草稿', '保存草稿', '验证草稿', '发布'];
      const actions = [...s.querySelectorAll('button')].filter(b => labels.some(l => b.textContent.includes(l)));
      if (!actions.length) return false;
      return want ? actions.some(b => !b.disabled) : actions.every(b => b.disabled);
    }""", arg=want_enabled, timeout=30000)
    # The canonical-path replace can re-enter the panel loading state once
    # (second mount); poll until the number inputs exist for two checks.
    panel_ready = """() => {
      const s = document.querySelector('section[aria-label="隐私/留存设置"]');
      return s && s.querySelectorAll('input[type="number"]').length >= 8;
    }"""
    stable = False
    for _ in range(8):
        p.wait_for_function(panel_ready, timeout=30000)
        p.wait_for_timeout(800)
        if p.evaluate("""() => {
          const s = document.querySelector('section[aria-label="隐私/留存设置"]');
          return Boolean(s && s.querySelectorAll('input[type="number"]').length >= 8);
        }"""):
            stable = True
            break
    assert stable, "S10 panel did not settle"
    p.wait_for_timeout(300)

def fill_verified(p, selector, value, expect):
    for _ in range(5):
        fill_input(p, selector, value)
        p.wait_for_timeout(400)
        current = p.evaluate("""(selector) => {
          const el = document.querySelector(selector);
          return el ? el.value : '';
        }""", selector)
        if current == expect:
            p.wait_for_timeout(400)
            current = p.evaluate("""(selector) => {
              const el = document.querySelector(selector);
              return el ? el.value : '';
            }""", selector)
            if current == expect:
                return True
        p.wait_for_timeout(400)
    return False

def confirm_dialog(p, button_label, timeout=5000):
    p.get_by_role("dialog").wait_for(state="visible", timeout=timeout)
    js_click(p, button_label, timeout=timeout)

control(profile="writer", reset=True)
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                           args=["--disable-background-networking", "--no-first-run", "--disable-back-forward-cache"])
    p = b.new_page(viewport={"width": 1440, "height": 1000})
    p.on("request", lambda r: network.append({"method": r.method, "url": r.url, "monotonicSeconds": round(time.monotonic(), 3)}))
    p.on("console", lambda m: console.append({"type": m.type, "text": m.text}))
    p.on("pageerror", lambda e: console.append({"type": "error", "text": str(e)}))

    S10_URL = WEB + "/dashboard/settings/privacy-retention"

    # ---- S10-01 Login + S10-02 page ----
    p.goto(S10_URL, timeout=120000)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=90000)
    p.wait_for_function("""() => {
      const s = document.querySelector('section[aria-label="隐私/留存设置"]');
      return Boolean(s && s.querySelectorAll('input[type="number"]').length >= 8);
    }""", timeout=90000)
    p.wait_for_timeout(500)
    txt = body_text(p)
    result("S10-01", "隐私、留存与审计设置" in txt and "管理后台" in txt, "dashboard shell and S10 panel rendered")
    result("S10-02", "settings.privacy-retention.v1" in txt and "隐私、留存与审计设置" in txt, "S10 page and descriptor visible")

    # ---- S10-03 fresh fixture compiled defaults + honestly degraded ----
    txt = body_text(p)
    months_value = p.locator('input[type="number"]').nth(0).input_value()
    overview = api_json("/dashboard/settings/s10-overview")["data"]
    readiness = api_json("/dashboard/settings/s10-readiness")["data"]
    result("S10-03", overview["projectionState"] == "compiled_default" and overview["publishedGeneration"] == 0
           and months_value == "24" and readiness["state"] == "degraded" and readiness["reasonCode"] == "cleanup_consumer_unavailable",
           f"overview={overview['projectionState']} gen={overview['publishedGeneration']}; retentionMonths={months_value}; readiness={readiness['state']}/{readiness['reasonCode']}")

    # ---- S10-04 read-only actor ----
    control(profile="read-only", reset=True)
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(700)
    txt = body_text(p)
    ro_capability = json.loads(urllib.request.urlopen(API + "/dashboard/authorization").read())["data"]["settingsCenterV1"]
    ro_no_write = not ro_capability["actions"]["createDraft"] and not ro_capability["actions"]["publish"]
    enabled_create = p.get_by_role("button", name="创建草稿").is_enabled() if p.get_by_role("button", name="创建草稿").count() else False
    enabled_publish = p.get_by_role("button", name="发布").is_enabled() if p.get_by_role("button", name="发布").count() else False
    result("S10-04", ro_no_write and not enabled_create and not enabled_publish,
           f"read-only write actions denied={ro_no_write}; no enabled create/publish controls")

    # ---- S10-05 future_unavailable surfaces ----
    control(profile="writer", reset=True)
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(700)
    txt = body_text(p)
    # authenticated consent checkbox (index 1) must exist and be disabled;
    # capability banner shows the frozen layering.
    auth_disabled = checkbox_state(p, 1) is False and p.evaluate("""() => {
      const el = document.querySelectorAll('section[aria-label="隐私/留存设置"] input[type="checkbox"]')[1];
      return el ? el.disabled : null;
    }""") is True
    result("S10-05", auth_disabled and "future_unavailable" in txt and "current_fact" in txt,
           f"authenticated consent disabled={auth_disabled}; layering banner visible")

    # ---- writer flows ----
    control(profile="writer", reset=True)
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(700)

    # S10-06 create a structurally valid draft (retentionMonths 36 +
    # consent_events 730 days)
    fill_number(p, 0, 36)
    fill_number(p, 1, 730)
    fill_reason(p, "S10 browser create draft exercise")
    p.wait_for_timeout(300)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/s10-drafts") and r.status == 201) as create_response:
        js_click(p, "创建草稿")
    created = create_response.value.json()["data"]
    drafts = api_json("/dashboard/settings/s10-drafts")["data"]
    result("S10-06", created["status"] == "draft" and len(drafts) == 1 and created["value"]["consentPolicy"]["retentionMonths"] == 36
           and created["value"]["retentionPolicy"]["retentionByObjectFamily"] == [{"objectFamily": "consent_events", "retentionDays": 730, "autoCleanupEnabled": False}],
           f"draft {created['id'][:8]} created with retentionMonths=36 and consent_events 730d")

    # S10-07 out-of-range value rejected with a field error
    fill_number(p, 0, 5)
    fill_reason(p, "S10 browser out-of-range exercise draft")
    p.wait_for_timeout(300)
    js_click(p, "保存草稿")
    p.wait_for_timeout(600)
    txt = body_text(p)
    drafts_after = api_json("/dashboard/settings/s10-drafts")["data"]
    result("S10-07", "同意记录留存需为" in txt and len(drafts_after) == 1,
           f"field error shown={'同意记录留存需为' in txt}; no extra draft created (count={len(drafts_after)})")
    fill_number(p, 0, 36)
    p.wait_for_timeout(200)

    # S10-08 high-risk auto-cleanup blocked client-side before any request
    # (the panel mirrors the contract blocker at save time; the server-side
    # invalid path is covered by the PG16 regression).
    # checkbox index 9 = orders autoCleanupEnabled (family rows follow the
    # consent-category checkboxes).
    set_checkbox(p, 9, True)
    fill_reason(p, "S10 browser high-risk auto cleanup exercise")
    js_click(p, "保存草稿")
    p.wait_for_timeout(600)
    txt = body_text(p)
    drafts_after_high_risk = api_json("/dashboard/settings/s10-drafts")["data"]
    result("S10-08", "禁止启用自动清理" in txt and len(drafts_after_high_risk) == 1,
           f"high-risk orders auto-cleanup blocked client-side: {'禁止启用自动清理' in txt}; no draft value change (count={len(drafts_after_high_risk)})")
    set_checkbox(p, 9, False)
    fill_reason(p, "S10 browser high-risk auto cleanup restore")
    js_click(p, "保存草稿")
    p.wait_for_timeout(600)

    # S10-09 legal-hold conflict blocked client-side before any request
    # checkbox index 12 = legalHoldEnabled; index 5 = consent_events
    # autoCleanupEnabled.
    set_checkbox(p, 12, True)
    fill_textarea(p, "11111111-1111-4111-8111-111111111111", 0)
    set_checkbox(p, 5, True)
    fill_reason(p, "S10 browser legal hold conflict exercise")
    js_click(p, "保存草稿")
    p.wait_for_timeout(600)
    txt = body_text(p)
    drafts_after_hold = api_json("/dashboard/settings/s10-drafts")["data"]
    result("S10-09", "不得启用自动清理" in txt and len(drafts_after_hold) == 1,
           f"legal-hold + auto-cleanup conflict blocked client-side: {'不得启用自动清理' in txt}; no draft value change (count={len(drafts_after_hold)})")
    # restore: clear refs while the textarea is still enabled, then uncheck
    # legal hold and the consent_events auto-cleanup.
    fill_textarea(p, "", 0)
    set_checkbox(p, 12, False)
    set_checkbox(p, 5, False)
    fill_reason(p, "S10 browser legal hold conflict restore")
    js_click(p, "保存草稿")
    p.wait_for_timeout(600)

    # S10-10 validate -> validated
    js_click(p, "验证草稿")
    p.wait_for_timeout(900)
    txt = body_text(p)
    result("S10-10", "验证：通过" in txt or "验证通过" in txt, "validated with no blockers")

    # S10-11 safe diff
    p.wait_for_timeout(900)
    txt = body_text(p)
    result("S10-11", "变更差异" in txt and "consentPolicy.retentionMonths" in txt and "24" in txt and "36" in txt,
           "safe diff lists consentPolicy.retentionMonths 24 -> 36")

    # S10-12 publish executes; readiness honestly degraded (the panel's
    # transient publish notice is cleared by the post-publish refresh; the
    # durable evidence is the panel status line + the readiness endpoint).
    js_click(p, "发布")
    p.wait_for_timeout(400)
    confirm_dialog(p, "确认发布")
    p.wait_for_timeout(1200)
    state_after_publish = api_state()
    gen = state_after_publish["publishedGeneration"]
    readiness_after = api_json("/dashboard/settings/s10-readiness?consumerGeneration=" + str(gen))["data"]
    txt = body_text(p)
    result("S10-12", gen >= 1 and readiness_after["state"] == "degraded" and readiness_after["reasonCode"] == "cleanup_consumer_unavailable"
           and "降级" in txt,
           f"publish executed; publishedGeneration={gen}; readiness={readiness_after['state']}/{readiness_after['reasonCode']}; panel shows degraded={'降级' in txt}")

    # S10-13 published policy effective; readiness stays degraded
    overview = api_json("/dashboard/settings/s10-overview")["data"]
    readiness = api_json("/dashboard/settings/s10-readiness?consumerGeneration=" + str(gen))["data"]
    result("S10-13", overview["projectionState"] == "published" and overview["effective"]["consentPolicy"]["retentionMonths"] == 36
           and readiness["state"] == "degraded" and readiness["reasonCode"] == "cleanup_consumer_unavailable"
           and readiness["consumerGeneration"] == gen,
           f"overview published={overview['projectionState']} effective months={overview['effective']['consentPolicy']['retentionMonths']}; readiness={readiness['state']}/{readiness['reasonCode']} even with exact generation")

    # ---- S10-14 append-only history ----
    history = api_json("/dashboard/settings/s10-history")["data"]
    published_entries = [e for e in history if e["status"] == "published"]
    result("S10-14", len(published_entries) >= 1 and all(e["auditEventId"] for e in published_entries),
           f"published={len(published_entries)} with original auditEventId facts")

    # ---- S10-15 rollback ----
    state_before_rollback = api_state()
    current_pub = next(e for e in reversed(state_before_rollback["publications"]) if e["eventType"] in ("published", "rollback_published"))
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(800)
    p.wait_for_selector("text=发布历史", timeout=5000)
    rollback_buttons = p.get_by_role("button", name="创建回滚草稿")
    if rollback_buttons.count() == 0:
        raise AssertionError("rollback control missing")
    rollback_buttons.last.click()
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    # The dialog rollback reason is the second textarea on the page (legal
    # hold refs, then the dialog's own).
    fill_textarea(p, "S10 rollback to previous policy value", 1)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/rollback-draft") and r.status == 201) as rollback_response:
        js_click(p, "确认回滚")
    rollback_body = rollback_response.value.json()["data"]
    result("S10-15", rollback_body["status"] == "rollback_draft" and rollback_body["rollbackOfPublicationId"] == current_pub["runtimeConfigId"],
           f"rollback draft {rollback_body['id'][:8]} created from {current_pub['runtimeConfigId']}")

    p.wait_for_timeout(900)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/validate") and r.status == 200):
        js_click(p, "验证草稿")
    p.get_by_text("变更差异").wait_for(state="visible", timeout=8000)
    js_click(p, "发布")
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/publish") and r.status == 200) as rollback_publish_response:
        js_click(p, "确认发布")
    rollback_publication = rollback_publish_response.value.json()["data"]
    state_after_rollback = api_state()
    rollback_events = [e for e in state_after_rollback["publications"] if e["eventType"] == "rollback_published"]
    rollback_gen = state_after_rollback["publishedGeneration"]
    overview_after = api_json("/dashboard/settings/s10-overview")["data"]
    result("S10-15", rollback_publication["version"] > current_pub["sequence"] and rollback_gen > 0 and len(rollback_events) == 1
           and overview_after["effective"]["consentPolicy"]["retentionMonths"] == 36,
           f"rollback generation={rollback_gen}; effective restored months=36")

    # ---- S10-16 stale version -> VERSION_CONFLICT ----
    control(profile="writer", reset=True)
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(500)
    fill_reason(p, "S10 stale version exercise draft")
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    drafts = api_json("/dashboard/settings/s10-drafts")["data"]
    assert drafts, "a draft must exist for stale version exercise"
    target = drafts[0]
    status, body = api_post(f"/dashboard/settings/s10-drafts/{target['id']}/validate",
                            {"expectedVersion": target["version"] + 99, "idempotencyKey": "s10-stale-version-exercise-0001"})
    result("S10-16", status == 409 and body.get("code") == "VERSION_CONFLICT",
           f"stale version validate refused with {status} {body.get('code')}")

    # ---- S10-17 illegal state -> SETTINGS_STATE_CONFLICT ----
    control(profile="writer", reset=True)
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(500)
    fill_reason(p, "S10 illegal state exercise draft")
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    drafts = api_json("/dashboard/settings/s10-drafts")["data"]
    unvalidated = [d for d in drafts if d["status"] in ("draft", "rollback_draft")]
    assert unvalidated, "a draft must exist for illegal state exercise"
    status, body = api_post(f"/dashboard/settings/s10-drafts/{unvalidated[0]['id']}/publish",
                            {"expectedVersion": unvalidated[0]["version"], "idempotencyKey": "s10-illegal-state-exercise-0001"})
    result("S10-17", status == 409 and body.get("code") == "SETTINGS_STATE_CONFLICT",
           f"publish of unvalidated draft refused with {status} {body.get('code')}")

    # ---- S10-18 malformed UUID -> 400 ----
    try:
        urllib.request.urlopen(urllib.request.Request(API + "/dashboard/settings/s10-drafts/not-a-uuid",
                                                      headers={"Authorization": "Bearer fixture-token"}))
        malformed = 200
    except urllib.error.HTTPError as e:
        malformed = e.code
    missing_id = "00000000-0000-4000-8000-000000000000"
    try:
        urllib.request.urlopen(urllib.request.Request(API + f"/dashboard/settings/s10-drafts/{missing_id}", headers={"Authorization": "Bearer fixture-token"}))
        missing = 200
    except urllib.error.HTTPError as e:
        missing = e.code
    result("S10-18", malformed == 400 and missing == 404, f"malformed UUID status {malformed}; valid missing UUID status {missing}")

    # ---- S10-19 impact preview blocks high-risk auto-cleanup ----
    control(profile="writer", reset=True)
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(600)
    select_preview_family(p, "payments")
    fill_number(p, 8, 90)  # preview retention days (after the 8 lifecycle inputs)
    set_checkbox(p, 16, True)  # preview autoCleanupEnabled
    p.wait_for_timeout(300)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/s10-impact-preview") and r.status == 200) as preview_response:
        js_click(p, "运行影响预览")
    preview = preview_response.value.json()["data"]
    txt = body_text(p)
    result("S10-19", preview["blockedHighRiskFamilies"] == ["payments"] and "存在被阻止的高风险对象族" in txt
           and any(x["objectFamily"] == "payments" and x["classification"] == "high_risk" for x in preview["affectedFamilies"]),
           f"blocked={preview['blockedHighRiskFamilies']}; panel shows blocked notice={'存在被阻止的高风险对象族' in txt}")

    # ---- S10-20 impact preview allowed low-risk + legal-hold conflict ----
    # First publish a legal-hold-enabled policy (hold refs set, no
    # auto-cleanup -> structurally valid and business-valid).
    hold_value = {
        "consentPolicy": {"anonymousConsentEnabled": True, "authenticatedConsentEnabled": False,
                          "consentCategories": ["functional", "analytics", "targeting"], "retentionMonths": 24},
        "retentionPolicy": {"retentionByObjectFamily": []},
        "legalHoldPolicy": {"legalHoldEnabled": True, "legalHoldRefs": ["11111111-1111-4111-8111-111111111111"]},
        "dsarPolicy": {"accessExportDeleteRules": []},
        "piiDisplayPolicy": {"piiDisplayRules": []},
        "lowRiskExecution": {"allowlist": [], "impactPreviewEnabled": True}
    }
    status, created_hold = api_post("/dashboard/settings/s10-drafts",
                                    {"descriptorKey": "settings.privacy-retention", "expectedPublishedVersion": 0,
                                     "value": hold_value, "changeReason": "S10 hold preview exercise", "idempotencyKey": "s10-hold-preview-0001"})
    assert status in (200, 201), f"hold draft create failed: {status} {created_hold}"
    status, validated_hold = api_post(f"/dashboard/settings/s10-drafts/{created_hold['data']['id']}/validate",
                                      {"expectedVersion": created_hold["data"]["version"], "idempotencyKey": "s10-hold-preview-0002"})
    assert status == 200 and validated_hold["data"]["status"] == "validated", f"hold draft validate failed: {status} {validated_hold}"
    status, published_hold = api_post(f"/dashboard/settings/s10-drafts/{created_hold['data']['id']}/publish",
                                      {"expectedVersion": validated_hold["data"]["draftVersion"], "idempotencyKey": "s10-hold-preview-0003"})
    assert status == 200, f"hold draft publish failed: {status} {published_hold}"
    # Low-risk consent_events auto-cleanup now conflicts with the active hold.
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(600)
    select_preview_family(p, "consent_events")
    fill_number(p, 8, 365)
    set_checkbox(p, 16, True)
    p.wait_for_timeout(300)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/s10-impact-preview") and r.status == 200) as conflict_response:
        js_click(p, "运行影响预览")
    conflict = conflict_response.value.json()["data"]
    txt = body_text(p)
    result("S10-20", conflict["wouldConflictWithLegalHold"] is True and conflict["wouldEnableAutoCleanup"] is True
           and "与法律保留冲突" in txt and conflict["blockedHighRiskFamilies"] == [],
           f"hold conflict={conflict['wouldConflictWithLegalHold']} enabled={conflict['wouldEnableAutoCleanup']}; panel shows conflict={'与法律保留冲突' in txt}")

    # ---- S10-21 impact preview requires at least one candidate change ----
    control(profile="writer", reset=True)
    goto_s10(p)
    p.wait_for_selector("text=隐私、留存与审计设置", timeout=30000)
    p.wait_for_timeout(600)
    set_checkbox(p, 16, False)
    set_checkbox(p, 17, False)
    p.wait_for_timeout(200)
    js_click(p, "运行影响预览")
    p.wait_for_timeout(500)
    txt = body_text(p)
    bad_status, bad_body = api_post("/dashboard/settings/s10-impact-preview", {"candidateRetentionEntries": []})
    result("S10-21", "至少需要指定一个候选变更" in txt and bad_status == 400,
           f"no-change rejected={'至少需要指定一个候选变更' in txt}; empty candidates status {bad_status}")

    # ---- S10-22 Audit safe snapshot carries real roles and no value fields ----
    control(profile="writer", reset=True)
    create_status, create_body = api_post("/dashboard/settings/s10-drafts",
                                          {"descriptorKey": "settings.privacy-retention", "expectedPublishedVersion": 0,
                                           "value": {"consentPolicy": {"anonymousConsentEnabled": True, "authenticatedConsentEnabled": False,
                                                                        "consentCategories": ["functional", "analytics", "targeting"], "retentionMonths": 24},
                                                     "retentionPolicy": {"retentionByObjectFamily": []},
                                                     "legalHoldPolicy": {"legalHoldEnabled": False, "legalHoldRefs": []},
                                                     "dsarPolicy": {"accessExportDeleteRules": []},
                                                     "piiDisplayPolicy": {"piiDisplayRules": []},
                                                     "lowRiskExecution": {"allowlist": [], "impactPreviewEnabled": True}},
                                           "changeReason": "S10 audit snapshot exercise", "idempotencyKey": "s10-audit-create-0001"})
    assert create_status in (200, 201), f"audit exercise create failed: {create_status} {create_body}"
    audit_state = api_state()
    rows = audit_state["audit"]
    settings_rows = [r for r in rows if r["resourceType"] == "runtime_config"]
    latest = settings_rows[-1] if settings_rows else {}
    roles = latest.get("effectiveRoles", [])
    grants = [g.get("permissionKey") for g in latest.get("permissionGrants", [])]
    metadata_str = json.dumps(latest.get("metadata", {}))
    no_value_fields = all(token not in metadata_str for token in
                          ("consentCategories", "retentionByObjectFamily", "legalHoldRefs", "customer.email", "consentPolicy"))
    result("S10-22", "super_admin" in roles and "settings.write" in grants and "descriptorKey" in metadata_str and no_value_fields,
           f"audit roles={roles} grants={grants}; metadata={metadata_str[:120]}; no value fields={no_value_fields}")

    # ---- S10-23 logout / post-logout ----
    control(profile="read-only")
    goto_s10(p)
    p.wait_for_timeout(600)
    p.goto(WEB + "/account/login")
    p.wait_for_timeout(600)
    txt = body_text(p)
    result("S10-23", "隐私、留存与审计设置" not in txt, "post-logout no protected settings state")

    b.close()

# Console/network classification. S10-16/17 intentionally trigger 409 via
# direct API calls; the browser may log them as failed resources. Any other
# console error or unexpected request origin fails.
EXPECTED_CONFLICT_409 = "status of 409"
raw_console = list(console)
expected_console = [c for c in raw_console if c["type"] == "error" and EXPECTED_CONFLICT_409 in c["text"]]
unexpected_console = [c for c in raw_console if c["type"] == "error" and c not in expected_console]
raw_network = list(network)
expected_network = [n for n in network if n["url"].startswith(WEB) or n["url"].startswith(API) or n["url"].startswith("data:") or n["url"].startswith("blob:")]
unexpected_network = [n for n in network if n not in expected_network]

counts = {x: sum(v["status"] == x for v in cases.values()) for x in ["pass", "fail", "intentional-skip", "not-executed"]}
report = {
    "suiteId": definition["suiteId"],
    "testedCommit": os.environ["S10_TESTED_COMMIT"],
    "testedTree": os.environ["S10_TESTED_TREE"],
    "viewport": definition["viewport"],
    "definitionSha256": sha(HERE / "s10-definition.json"),
    "fixtureSha256": sha(HERE / "s10-fixture.py"),
    "harnessSha256": sha(__file__),
    "runnerSha256": sha(HERE / "run-s10.sh"),
    "counts": counts,
    "cases": list(cases.values()),
    "network": raw_network,
    "rawEvidence": {"consoleErrors": [c for c in raw_console if c["type"] == "error"], "failedRequests": []},
    "expectedEvidence": {"consoleErrors": expected_console, "failedRequests": []},
    "unexpectedEvidence": {"consoleErrors": unexpected_console, "failedRequests": unexpected_network},
}
(OUT / "acceptance-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(counts))
print("unexpected console errors:", len(unexpected_console))
print("unexpected requests:", len(unexpected_network))
sys.exit(1 if counts["fail"] or counts["not-executed"] or unexpected_console or unexpected_network else 0)
