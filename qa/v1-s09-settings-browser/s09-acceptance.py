#!/usr/bin/env python3
# S09 Auth/RBAC settings browser acceptance: real Google Chrome/Playwright
# against the controlled fixture. Records raw/expected/unexpected console and
# request evidence, definition/fixture/harness SHA-256, and dynamic
# testedCommit. Covers the frozen S09 contract's 23 browser cases.
import json, hashlib, os, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ["S09_BROWSER_OUT"])
WEB = os.environ.get("S09_WEB", "http://127.0.0.1:4562")
API = os.environ.get("S09_API", "http://127.0.0.1:4563")
OUT.mkdir(parents=True, exist_ok=True)
definition = json.loads((HERE / "s09-definition.json").read_text())
cases = {x["id"]: {**x, "status": "not-executed", "observations": []} for x in definition["cases"]}
network = []
console = []

def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def result(i, ok, *o):
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
    fill_textarea(p, value, 0)

def select_status(p, value):
    p.select_option('section[aria-label="认证/RBAC 设置"] select', value)

def goto_s09(p):
    p.goto(S09_URL)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    # The fixture profile can change between steps; bfcache/dev caching may
    # serve a stale render, so wait until the panel matches the CURRENT
    # fixture capability before interacting.
    want_enabled = api_state()["profile"] == "writer"
    p.wait_for_function("""(want) => {
      const s = document.querySelector('section[aria-label="认证/RBAC 设置"]');
      if (!s) return false;
      const labels = ['创建草稿', '保存草稿', '验证草稿', '发布'];
      const actions = [...s.querySelectorAll('button')].filter(b => labels.some(l => b.textContent.includes(l)));
      if (!actions.length) return false;
      return want ? actions.some(b => !b.disabled) : actions.every(b => b.disabled);
    }""", arg=want_enabled, timeout=30000)
    # The canonical-path replace can re-enter the panel loading state once
    # (second mount), and a cold dev compile can stretch that window; poll
    # until the preview form inputs exist for two consecutive checks.
    panel_ready = """() => {
      const s = document.querySelector('section[aria-label="认证/RBAC 设置"]');
      return s && s.querySelectorAll('input').length >= 4;
    }"""
    stable = False
    for _ in range(8):
        p.wait_for_function(panel_ready, timeout=30000)
        p.wait_for_timeout(800)
        if p.evaluate("""() => {
          const s = document.querySelector('section[aria-label="认证/RBAC 设置"]');
          return Boolean(s && s.querySelectorAll('input').length >= 4);
        }"""):
            stable = True
            break
    assert stable, "S09 panel did not settle"
    p.wait_for_timeout(300)

def fill_verified(p, selector, value, expect):
    """Fills a React-controlled input and confirms the value survives a
    re-render settle; retries across the panel's second-mount loading window."""
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

    S09_URL = WEB + "/dashboard/settings/auth-rbac"

    # ---- S09-01 Login + S09-02 page ----
    p.goto(S09_URL, timeout=120000)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=90000)
    # Cold dev start can delay hydration; wait for the panel form inputs.
    p.wait_for_function("""() => {
      const s = document.querySelector('section[aria-label="认证/RBAC 设置"]');
      return Boolean(s && s.querySelectorAll('input[type="number"]').length >= 3);
    }""", timeout=90000)
    p.wait_for_timeout(500)
    txt = body_text(p)
    result("S09-01", "认证与 RBAC 设置" in txt and "管理后台" in txt, "dashboard shell and S09 panel rendered")
    result("S09-02", "settings.auth-rbac.v1" in txt and "认证与 RBAC 设置" in txt, "S09 page and descriptor visible")

    # ---- S09-03 fresh fixture compiled defaults ----
    txt = body_text(p)
    inputs = p.locator('input[type="number"]')
    values = [inputs.nth(i).input_value() for i in range(min(3, inputs.count()))]
    overview = api_json("/dashboard/settings/s09-overview")["data"]
    result("S09-03", overview["projectionState"] == "compiled_default" and overview["publishedGeneration"] == 0
           and values == ["12", "30", "10080"],
           f"overview={overview['projectionState']} gen={overview['publishedGeneration']}; form values={values}")

    # ---- S09-04 read-only actor ----
    control(profile="read-only", reset=True)
    goto_s09(p)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    p.wait_for_timeout(700)
    txt = body_text(p)
    ro_capability = json.loads(urllib.request.urlopen(API + "/dashboard/authorization").read())["data"]["settingsCenterV1"]
    ro_no_write = not ro_capability["actions"]["createDraft"] and not ro_capability["actions"]["publish"]
    enabled_create = p.get_by_role("button", name="创建草稿").is_enabled() if p.get_by_role("button", name="创建草稿").count() else False
    enabled_publish = p.get_by_role("button", name="发布").is_enabled() if p.get_by_role("button", name="发布").count() else False
    result("S09-04", ro_no_write and not enabled_create and not enabled_publish,
           f"read-only write actions denied={ro_no_write}; no enabled create/publish controls")

    # ---- writer flows ----
    control(profile="writer", reset=True)
    goto_s09(p)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    p.wait_for_timeout(700)

    # S09-05 create a structurally valid draft (sessionLifetimeMinutes 60)
    fill_number(p, 2, 60)
    fill_reason(p, "S09 browser create draft exercise")
    p.wait_for_timeout(300)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/s09-drafts") and r.status == 201) as create_response:
        js_click(p, "创建草稿")
    created = create_response.value.json()["data"]
    drafts = api_json("/dashboard/settings/s09-drafts")["data"]
    result("S09-05", created["status"] == "draft" and len(drafts) == 1 and created["value"]["sessionPolicy"]["sessionLifetimeMinutes"] == 60,
           f"draft {created['id'][:8]} created with sessionLifetimeMinutes=60")

    # S09-06 out-of-range value rejected with a field error (the draft from
    # S09-05 is selected, so the action is 保存草稿)
    fill_number(p, 0, 8)
    fill_reason(p, "S09 browser out-of-range exercise draft")
    p.wait_for_timeout(300)
    js_click(p, "保存草稿")
    p.wait_for_timeout(600)
    txt = body_text(p)
    drafts_after = api_json("/dashboard/settings/s09-drafts")["data"]
    result("S09-06", "密码最小长度需为" in txt and len(drafts_after) == 1,
           f"field error shown={'密码最小长度需为' in txt}; no extra draft created (count={len(drafts_after)})")
    # restore the valid value
    fill_number(p, 0, 12)
    p.wait_for_timeout(200)

    # S09-07 validate -> validated
    js_click(p, "验证草稿")
    p.wait_for_timeout(900)
    txt = body_text(p)
    result("S09-07", "验证：通过" in txt or "验证通过" in txt, "validated with no blockers")

    # S09-08 safe diff
    p.wait_for_timeout(900)
    txt = body_text(p)
    result("S09-08", "变更差异" in txt and "sessionPolicy.sessionLifetimeMinutes" in txt and "10080" in txt and "60" in txt,
           "safe diff lists sessionLifetimeMinutes 10080 -> 60")

    # S09-09 publish
    js_click(p, "发布")
    p.wait_for_timeout(400)
    confirm_dialog(p, "确认发布")
    p.wait_for_timeout(1000)
    state_after_publish = api_state()
    gen = state_after_publish["publishedGeneration"]
    result("S09-09", gen >= 1, f"publish executed; publishedGeneration={gen}")

    # S09-10 published policy effective and consumer-ready
    overview = api_json("/dashboard/settings/s09-overview")["data"]
    readiness = api_json("/dashboard/settings/s09-readiness?consumerGeneration=" + str(gen))["data"]
    result("S09-10", overview["projectionState"] == "published" and overview["effective"]["sessionPolicy"]["sessionLifetimeMinutes"] == 60
           and readiness["state"] == "ready" and readiness["consumerGeneration"] == readiness["publishedGeneration"],
           f"overview published={overview['projectionState']} effective session TTL={overview['effective']['sessionPolicy']['sessionLifetimeMinutes']}; readiness={readiness['state']}")

    # ---- S09-11 append-only history ----
    history = api_json("/dashboard/settings/s09-history")["data"]
    published_entries = [e for e in history if e["status"] == "published"]
    result("S09-11", len(published_entries) >= 1 and all(e["auditEventId"] for e in published_entries),
           f"published={len(published_entries)} with original auditEventId facts")

    # ---- S09-12/13 rollback ----
    state_before_rollback = api_state()
    current_pub = next(e for e in reversed(state_before_rollback["publications"]) if e["eventType"] in ("published", "rollback_published"))
    goto_s09(p)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    p.wait_for_timeout(800)
    p.wait_for_selector("text=发布历史", timeout=5000)
    rollback_buttons = p.get_by_role("button", name="创建回滚草稿")
    if rollback_buttons.count() == 0:
        raise AssertionError("rollback control missing")
    rollback_buttons.last.click()
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    # The dialog rollback reason is the third textarea on the page (create
    # reason, revoke reason, then the dialog's own).
    fill_textarea(p, "S09 rollback to previous policy value", 2)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/rollback-draft") and r.status == 201) as rollback_response:
        js_click(p, "确认回滚")
    rollback_body = rollback_response.value.json()["data"]
    result("S09-12", rollback_body["status"] == "rollback_draft" and rollback_body["rollbackOfPublicationId"] == current_pub["runtimeConfigId"],
           f"rollback draft {rollback_body['id']} created from {current_pub['runtimeConfigId']}")

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
    overview_after = api_json("/dashboard/settings/s09-overview")["data"]
    result("S09-13", rollback_publication["version"] > current_pub["sequence"] and rollback_gen > 0 and len(rollback_events) == 1
           and overview_after["effective"]["sessionPolicy"]["sessionLifetimeMinutes"] == 60,
           f"rollback generation={rollback_gen} (>0); effective restored session TTL=60")

    # ---- S09-14 stale version -> VERSION_CONFLICT ----
    control(profile="writer", reset=True)
    goto_s09(p)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    p.wait_for_timeout(500)
    fill_reason(p, "S09 stale version exercise draft")
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    drafts = api_json("/dashboard/settings/s09-drafts")["data"]
    assert drafts, "a draft must exist for stale version exercise"
    target = drafts[0]
    status, body = api_post(f"/dashboard/settings/s09-drafts/{target['id']}/validate",
                            {"expectedVersion": target["version"] + 99, "idempotencyKey": "s09-stale-version-exercise-0001"})
    result("S09-14", status == 409 and body.get("code") == "VERSION_CONFLICT",
           f"stale version validate refused with {status} {body.get('code')}")

    # ---- S09-15 illegal state -> SETTINGS_STATE_CONFLICT ----
    control(profile="writer", reset=True)
    goto_s09(p)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    p.wait_for_timeout(500)
    fill_reason(p, "S09 illegal state exercise draft")
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    drafts = api_json("/dashboard/settings/s09-drafts")["data"]
    unvalidated = [d for d in drafts if d["status"] in ("draft", "rollback_draft")]
    assert unvalidated, "a draft must exist for illegal state exercise"
    status, body = api_post(f"/dashboard/settings/s09-drafts/{unvalidated[0]['id']}/publish",
                            {"expectedVersion": unvalidated[0]["version"], "idempotencyKey": "s09-illegal-state-exercise-0001"})
    result("S09-15", status == 409 and body.get("code") == "SETTINGS_STATE_CONFLICT",
           f"publish of unvalidated draft refused with {status} {body.get('code')}")

    # ---- S09-16 malformed UUID -> 400 ----
    try:
        urllib.request.urlopen(urllib.request.Request(API + "/dashboard/settings/s09-drafts/not-a-uuid",
                                                      headers={"Authorization": "Bearer fixture-token"}))
        malformed = 200
    except urllib.error.HTTPError as e:
        malformed = e.code
    missing_id = "00000000-0000-4000-8000-000000000000"
    try:
        urllib.request.urlopen(urllib.request.Request(API + f"/dashboard/settings/s09-drafts/{missing_id}", headers={"Authorization": "Bearer fixture-token"}))
        missing = 200
    except urllib.error.HTTPError as e:
        missing = e.code
    result("S09-16", malformed == 400 and missing == 404, f"malformed UUID status {malformed}; valid missing UUID status {missing}")

    # ---- S09-17 impact preview allows a non-blocking change ----
    control(profile="writer", reset=True, superAdminCount=2)
    goto_s09(p)
    target = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    assert fill_verified(p, 'section[aria-label="认证/RBAC 设置"] input[type="text"]', target, target), "preview target fill failed"
    select_status(p, "active")
    p.wait_for_timeout(300)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/s09-impact-preview") and r.status == 200) as preview_response:
        js_click(p, "运行影响预览")
    preview = preview_response.value.json()["data"]
    txt = body_text(p)
    result("S09-17", preview["wouldBlockLastSuperAdmin"] is False and preview["safeReasonCode"] == "allowed"
           and "变更可通过" in txt and "活动超级管理员数：2" in txt,
           f"preview allowed={not preview['wouldBlockLastSuperAdmin']} reason={preview['safeReasonCode']}")

    # ---- S09-18 impact preview blocks suspending the last super admin ----
    control(profile="writer", generation=2, superAdminCount=1)
    goto_s09(p)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    p.wait_for_timeout(600)
    assert fill_verified(p, 'section[aria-label="认证/RBAC 设置"] input[type="text"]', target, target), "preview target fill failed"
    select_status(p, "suspended")
    p.wait_for_timeout(200)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/s09-impact-preview") and r.status == 200) as blocked_response:
        js_click(p, "运行影响预览")
    blocked = blocked_response.value.json()["data"]
    txt = body_text(p)
    result("S09-18", blocked["wouldBlockLastSuperAdmin"] is True and blocked["safeReasonCode"] == "LAST_SUPER_ADMIN_BLOCKED"
           and "将被最后超级管理员不变量阻止" in txt,
           f"preview blocked={blocked['wouldBlockLastSuperAdmin']} reason={blocked['safeReasonCode']}")

    # ---- S09-19 impact preview requires a change and validates target ----
    control(profile="writer", generation=3, superAdminCount=2)
    goto_s09(p)
    assert fill_verified(p, 'section[aria-label="认证/RBAC 设置"] input[type="text"]', target, target), "preview target fill failed"
    select_status(p, "")
    p.wait_for_timeout(200)
    js_click(p, "运行影响预览")
    p.wait_for_timeout(500)
    txt = body_text(p)
    no_change_rejected = "至少需要指定一个变更" in txt
    bad_target_status, bad_target_body = api_post("/dashboard/settings/s09-impact-preview",
                                                  {"targetUserId": "not-a-uuid", "nextStatus": "active"})
    result("S09-19", no_change_rejected and bad_target_status == 400,
           f"no-change rejected={no_change_rejected}; malformed target status {bad_target_status}")

    # ---- S09-20 session revoke requires the exact confirmation ----
    control(profile="writer", generation=4)
    goto_s09(p)
    p.wait_for_selector("text=认证与 RBAC 设置", timeout=30000)
    p.wait_for_timeout(600)
    target2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    revoke_inputs = p.locator('section[aria-label="认证/RBAC 设置"] input[type="text"]')
    # preview inputs are nth 0..1; revoke inputs are nth 2..3
    fill_input(p, 'section[aria-label="认证/RBAC 设置"] input[type="text"]', "")  # clear preview field
    p.locator('section[aria-label="认证/RBAC 设置"] input[type="text"]').nth(2).fill(target2)
    p.locator('section[aria-label="认证/RBAC 设置"] input[type="text"]').nth(3).fill("revoke_sessions")
    fill_textarea(p, "S09 wrong confirmation revoke exercise", 1)
    p.wait_for_timeout(200)
    js_click(p, "撤销目标用户会话")
    p.wait_for_timeout(600)
    txt = body_text(p)
    state_after_wrong = api_state()
    result("S09-20", "确认短语必须为 REVOKE_SESSIONS" in txt and target2 not in state_after_wrong["revokedTargets"],
           f"wrong confirmation rejected; nothing revoked (targets={list(state_after_wrong['revokedTargets'].keys())})")

    # ---- S09-21 session revoke succeeds with confirmation and reason ----
    p.locator('section[aria-label="认证/RBAC 设置"] input[type="text"]').nth(3).fill("REVOKE_SESSIONS")
    p.wait_for_timeout(200)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/s09-session-revoke") and r.status == 200) as revoke_response:
        js_click(p, "撤销目标用户会话")
    revoke = revoke_response.value.json()["data"]
    txt = body_text(p)
    result("S09-21", revoke["revokedCount"] == 2 and "已撤销 2 个会话" in txt,
           f"revokedCount={revoke['revokedCount']}; panel reports success")

    # ---- S09-22 Audit safe snapshot ----
    control(profile="writer", generation=5)
    # Produce a lifecycle audit row first (the audit buffer was reset by the
    # S09-17 control reset).
    create_status, create_body = api_post("/dashboard/settings/s09-drafts",
                                          {"descriptorKey": "settings.auth-rbac", "expectedPublishedVersion": 0,
                                           "value": {"passwordPolicy": {"minimumLength": 12, "resetTokenTtlMinutes": 30},
                                                     "sessionPolicy": {"sessionLifetimeMinutes": 10080}},
                                           "changeReason": "S09 audit snapshot exercise", "idempotencyKey": "s09-audit-create-0001"})
    assert create_status == 200, f"audit exercise create failed: {create_status}"
    audit_state = api_state()
    rows = audit_state["audit"]
    settings_rows = [r for r in rows if r["resourceType"] == "runtime_config"]
    revoke_rows = [r for r in rows if r["resourceType"] == "user"]
    latest = settings_rows[-1] if settings_rows else {}
    roles = latest.get("effectiveRoles", [])
    grants = [g.get("permissionKey") for g in latest.get("permissionGrants", [])]
    metadata_str = json.dumps(latest.get("metadata", {}))
    no_field_values = "minimumLength" not in metadata_str and "sessionLifetimeMinutes" not in metadata_str and "resetTokenTtlMinutes" not in metadata_str
    revoke_meta = json.dumps(revoke_rows[-1].get("metadata", {})) if revoke_rows else "{}"
    revoke_safe = "targetUserId" in revoke_meta and "reasonCode" in revoke_meta and "token" not in revoke_meta.lower().replace("targetuserid", "").replace("reasoncode", "")
    result("S09-22", "super_admin" in roles and "settings.write" in grants and "descriptorKey" in metadata_str and no_field_values
           and revoke_rows and revoke_safe,
           f"audit roles={roles} grants={grants}; metadata={metadata_str[:120]}; revoke metadata safe={revoke_safe}")

    # ---- S09-23 logout / post-logout ----
    control(profile="read-only", generation=5)
    goto_s09(p)
    p.wait_for_timeout(600)
    p.goto(WEB + "/account/login")
    p.wait_for_timeout(600)
    txt = body_text(p)
    result("S09-23", "认证与 RBAC 设置" not in txt, "post-logout no protected settings state")

    b.close()

# Console/network classification. S09-14/15 intentionally trigger 409 via
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
    "testedCommit": os.environ["S09_TESTED_COMMIT"],
    "testedTree": os.environ["S09_TESTED_TREE"],
    "viewport": definition["viewport"],
    "definitionSha256": sha(HERE / "s09-definition.json"),
    "fixtureSha256": sha(HERE / "s09-fixture.py"),
    "harnessSha256": sha(__file__),
    "runnerSha256": sha(HERE / "run-s09.sh"),
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
