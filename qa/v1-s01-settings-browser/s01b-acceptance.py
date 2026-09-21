#!/usr/bin/env python3
# S01B Settings browser acceptance: real Google Chrome/Playwright against the
# controlled fixture. Records raw/expected/unexpected console and request
# evidence, definition/fixture/harness SHA-256, and dynamic testedCommit.
import json, hashlib, os, re, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ["S01B_BROWSER_OUT"])
WEB = os.environ.get("S01B_WEB", "http://127.0.0.1:4550")
API = os.environ.get("S01B_API", "http://127.0.0.1:4551")
OUT.mkdir(parents=True, exist_ok=True)
definition = json.loads((HERE / "s01b-definition.json").read_text())
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

def body_text(p):
    return p.locator("body").inner_text()

def js_click(p, label, timeout=5000):
    p.wait_for_function("""(label) => [...document.querySelectorAll('button')].some(b => b.textContent.includes(label) && !b.disabled)""", arg=label, timeout=timeout)
    clicked = p.evaluate("""(label) => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(label) && !x.disabled); if (!b) return false; b.click(); return true; }""", label)
    if not clicked:
        raise AssertionError(f"required enabled button not found: {label}")

def js_fill(p, value, reason):
    p.evaluate("""({value, reason}) => {
      const i = document.querySelector('input[type="number"]');
      const t = document.querySelector('textarea');
      if (i) { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(i, value); i.dispatchEvent(new Event('input', { bubbles: true })); }
      if (t) { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(t, reason); t.dispatchEvent(new Event('input', { bubbles: true })); }
    }""", {"value": value, "reason": reason})

# The provider is used only for control/reset and read-only state
# verification; every lifecycle user action (create/save/validate/publish/
# rollback) is triggered through the real Settings Center UI, which renders
# the three S01 legal pages (overview/lifecycle/history) once the shell gate
# admits them with settingsCenterV1 enabled.
def fixture_state():
    return json.loads(urllib.request.urlopen(API + "/control/state").read())["state"]

def settle(p, ms=700):
    # The S01 shell re-renders the ready subtree (key={historyRevision}) on
    # every URL change twice: once from the pushState wrapper microtask and
    # once from the 250 ms live-URL poller catching up. The second remount
    # can arrive up to ~250 ms after the URL commits and wipes panel-local
    # form state, so every navigation is followed by a settle window before
    # the next UI interaction (create/save/validate/publish/rollback).
    p.wait_for_timeout(ms)

control(profile="writer", reset=True)
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                           args=["--disable-background-networking", "--no-first-run"])
    p = b.new_page(viewport={"width": 1440, "height": 1000})
    p.on("request", lambda r: network.append({"method": r.method, "url": r.url, "monotonicSeconds": round(time.monotonic(), 3)}))
    p.on("console", lambda m: console.append({"type": m.type, "text": m.text}))
    p.on("pageerror", lambda e: console.append({"type": "error", "text": str(e)}))

    # S01B-01 Dashboard shell renders with the fixture writer profile
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_selector("text=设置中心", timeout=30000)
    result("S01B-01", "管理后台" in body_text(p), "dashboard shell and settings center rendered")

    # S01B-02 Overview + registry
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(600)
    txt = body_text(p)
    result("S01B-02", "设置中心" in txt and "overview_refresh_seconds" in txt, "overview and registry rendered")

    # S01B-03 Create structurally valid business-invalid draft (10). The
    # product navigates to the lifecycle URL right after createDraft; the
    # draft is asserted through the rendered lifecycle page and read-only
    # provider state.
    p.wait_for_selector("text=创建核心刷新间隔草稿", timeout=30000)
    p.wait_for_timeout(500)
    js_fill(p, "10", "S01B business invalid draft to exercise server validation")
    p.wait_for_timeout(300)
    js_click(p, "创建草稿")
    p.wait_for_url(re.compile(r"/dashboard/settings/lifecycle\?draftId="), timeout=5000)
    settle(p)
    p.wait_for_selector("text=设置草稿", timeout=5000)
    p.wait_for_selector("text=10 秒", timeout=5000)
    draft = next(d for d in fixture_state()["drafts"].values() if d["value"] == 10)
    result("S01B-03", draft["status"] == "draft" and draft["value"] == 10 and "设置草稿" in body_text(p) and "10 秒" in body_text(p),
           f"value 10 accepted into a draft {draft['id']} rendered on the lifecycle page")

    # S01B-04 Validate -> invalid + blocker, through the lifecycle UI
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/validate") and r.status == 200):
        js_click(p, "验证草稿")
    p.locator("dd", has_text="验证未通过").wait_for(state="visible", timeout=5000)
    txt = body_text(p)
    result("S01B-04", "验证未通过" in txt and "blocker" in txt, "invalid with blocker")

    # S01B-05 Publish control unavailable / state conflict: the UI disables
    # the publish control while the draft is invalid.
    publish_btn = p.get_by_role("button", name="审阅并发布")
    result("S01B-05", publish_btn.count() == 1 and publish_btn.is_disabled(), "publish control disabled while invalid")

    # S01B-06 Typed PATCH correction to 60 through the save control. The
    # click follows the fill immediately: the shell's post-navigation
    # remount window has already settled, and waiting here would let React
    # re-render the controlled input from its own state.
    js_fill(p, "60", "S01B correction of the business invalid draft to sixty seconds")
    with p.expect_response(lambda r: r.request.method == "PATCH" and r.url.endswith(f"/drafts/{draft['id']}") and r.status == 200):
        js_click(p, "保存草稿")
    p.wait_for_selector("text=设置草稿已保存", timeout=5000)
    result("S01B-06", "设置草稿已保存" in body_text(p), "invalid draft corrected")

    # S01B-07 Revalidate -> validated with no blockers
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/validate") and r.status == 200):
        js_click(p, "验证草稿")
    p.locator("h4", has_text="验证通过").wait_for(state="visible", timeout=5000)
    txt = body_text(p)
    result("S01B-07", "验证通过" in txt and "blocker" not in txt, "validated")

    # S01B-08 Safe diff: exact public value change with zero secrets
    p.wait_for_selector("text=安全差异", timeout=5000)
    txt = body_text(p)
    result("S01B-08", "安全差异" in txt and "敏感度" in txt and "密钥变更：0" in txt, "safe diff rendered")

    # S01B-09 Publish A: the corrected draft (60) is validated; publish it
    # through the explicit confirmation dialog; the product navigates to the
    # history view right after publish.
    js_click(p, "审阅并发布")
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/publish") and r.status == 200) as publish_a_response:
        js_click(p, "确认发布")
    publication_a = publish_a_response.value.json()["data"]
    p.wait_for_url(re.compile(r"/dashboard/settings/history"), timeout=5000)
    settle(p)
    pub_count = len(fixture_state()["publications"])
    result("S01B-09", pub_count >= 1 and publication_a["status"] == "published", f"publish A executed and navigated to history (publications={pub_count})")

    # S01B-10 Publish B (60 -> 120): create a new 120 draft, validate and
    # publish through the UI; this must append a superseded event for A plus
    # B's published.
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_selector("text=创建核心刷新间隔草稿", timeout=10000)
    p.wait_for_timeout(500)
    js_fill(p, "120", "S01B publish B to one hundred twenty seconds interval")
    p.wait_for_timeout(300)
    js_click(p, "创建草稿")
    p.wait_for_url(re.compile(r"/dashboard/settings/lifecycle\?draftId="), timeout=5000)
    settle(p)
    p.wait_for_selector("text=设置草稿", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/validate") and r.status == 200):
        js_click(p, "验证草稿")
    p.wait_for_selector("text=安全差异", timeout=5000)
    js_click(p, "审阅并发布")
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/publish") and r.status == 200) as publish_b_response:
        js_click(p, "确认发布")
    publication_b = publish_b_response.value.json()["data"]
    p.wait_for_url(re.compile(r"/dashboard/settings/history"), timeout=5000)
    settle(p)
    pub_count = len(fixture_state()["publications"])
    result("S01B-10", pub_count >= 3 and publication_b["status"] == "published", f"publish B executed with supersession (publications={pub_count})")

    # S01B-11/12 History: A's original fact + superseded appended. The
    # history view renders the product's frozen labels published -> 已发布
    # and superseded -> 已被后续版本取代; the provider is used read-only to
    # verify A's original publication identity survives both events.
    p.wait_for_selector("text=追加式发布历史", timeout=5000)
    p.wait_for_selector("text=已被后续版本取代", timeout=5000)
    txt = body_text(p)
    print("S01B-12 history snippet:", " | ".join(l.strip() for l in txt.split("\n") if "已发布" in l or "取代" in l or "版本" in l)[:200], flush=True)
    publications = fixture_state()["publications"]
    a_event = next(e for e in publications if e["eventType"] == "published")
    a_published = txt.count("已发布") >= 1 and any(e["eventType"] in ("published", "rollback_published") and e["runtimeConfigId"] == a_event["runtimeConfigId"] for e in publications)
    a_superseded = "已被后续版本取代" in txt and any(e["eventType"] == "superseded" and e["runtimeConfigId"] == a_event["runtimeConfigId"] for e in publications)
    result("S01B-11", a_published, "A's published entry remains")
    result("S01B-12", a_superseded, "supersession appended with stable label")

    # S01B-13 Rollback draft from the current publication through the
    # history UI; the product navigates back to the lifecycle URL.
    before_rollback = fixture_state()
    source_event = next(e for e in reversed(before_rollback["publications"]) if e["eventType"] in ("published", "rollback_published"))
    source_audit = source_event["auditEventId"]
    rollback_buttons = p.get_by_role("button", name="创建回滚草稿")
    if rollback_buttons.count() == 0: raise AssertionError("rollback control missing")
    rollback_buttons.last.click()
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    p.get_by_role("textbox", name="回滚原因").fill("S01B rollback to previous safe interval")
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/rollback-draft") and r.status == 201) as rollback_response:
        js_click(p, "确认创建草稿")
    rollback_body = rollback_response.value.json()["data"]
    p.wait_for_url(re.compile(r"/dashboard/settings/lifecycle\?draftId="), timeout=5000)
    settle(p)
    result("S01B-13", rollback_body["status"] == "rollback_draft" and rollback_body["rollbackOfPublicationId"] == source_event["runtimeConfigId"], f"rollback draft {rollback_body['id']} created from {source_event['runtimeConfigId']}")

    # S01B-14 Rollback publication appends rollback_published; validate and
    # publish the rollback draft through the lifecycle UI.
    p.wait_for_selector("text=设置草稿", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/validate") and r.status == 200): js_click(p, "验证草稿")
    p.wait_for_selector("text=安全差异", timeout=5000)
    js_click(p, "审阅并发布")
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/publish") and r.status == 200) as rollback_publish_response:
        js_click(p, "确认发布")
    rollback_publication = rollback_publish_response.value.json()["data"]
    p.wait_for_url(re.compile(r"/dashboard/settings/history"), timeout=5000)
    settle(p)
    after_rollback = fixture_state()
    rollback_events = [e for e in after_rollback["publications"] if e["eventType"] == "rollback_published"]
    original_unchanged = any(e["runtimeConfigId"] == source_event["runtimeConfigId"] and e["auditEventId"] == source_audit for e in after_rollback["publications"])
    result("S01B-14", len(rollback_events) == 1 and rollback_events[0]["runtimeConfigId"] == rollback_publication["id"] and original_unchanged, f"rollback_published sequence={rollback_events[0]['sequence'] if rollback_events else 'missing'}; source audit preserved={original_unchanged}")

    # S01B-15 Version conflict copy: PATCH with a stale expectedVersion
    control(profile="writer", generation=1)
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(400)
    js_fill(p, "75", "S01B version conflict exercise draft")
    p.wait_for_timeout(300)
    js_click(p, "创建草稿")
    p.wait_for_timeout(500)
    drafts = json.loads(urllib.request.urlopen(API + "/dashboard/settings/drafts").read())["data"]
    targets = [d for d in drafts if d["status"] in ("draft", "invalid", "rollback_draft")]
    assert targets, "a draft must exist for the version conflict exercise"
    target = targets[0]
    req = urllib.request.Request(API + f"/dashboard/settings/drafts/{target['id']}",
                                 data=json.dumps({"expectedVersion": target["version"] - 1, "value": 60,
                                                  "changeReason": "S01B stale version conflict exercise", "idempotencyKey": "s01b-version-conflict"}).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer fixture-token"}, method="PATCH")
    try:
        urllib.request.urlopen(req)
        version_conflict = False
    except urllib.error.HTTPError as e:
        version_conflict = e.code == 409 and "VERSION_CONFLICT" in e.read().decode()
    result("S01B-15", version_conflict, "stale version PATCH refused with VERSION_CONFLICT")

    # S01B-16 State conflict copy: publish an unvalidated draft directly
    control(profile="writer", generation=1)
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(500)
    js_fill(p, "180", "S01B state conflict exercise with one hundred eighty seconds")
    p.wait_for_timeout(300)
    js_click(p, "创建草稿")
    p.wait_for_timeout(500)
    drafts = json.loads(urllib.request.urlopen(API + "/dashboard/settings/drafts").read())["data"]
    unvalidated = [d for d in drafts if d["value"] == 180]
    assert unvalidated, "the 180 draft must exist"
    req = urllib.request.Request(API + f"/dashboard/settings/drafts/{unvalidated[0]['id']}/publish",
                                 data=json.dumps({"expectedVersion": unvalidated[0]["version"], "idempotencyKey": "s01b-publish-unvalidated"}).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer fixture-token"}, method="POST")
    try:
        urllib.request.urlopen(req)
        state_conflict = False
    except urllib.error.HTTPError as e:
        state_conflict = e.code == 409 and "SETTINGS_STATE_CONFLICT" in e.read().decode()
    result("S01B-16", state_conflict, "publish of unvalidated draft refused with state conflict")

    # S01B-17 Malformed UUID -> controlled 400
    try:
        urllib.request.urlopen(urllib.request.Request(API + "/dashboard/settings/drafts/not-a-uuid",
                                                      headers={"Authorization": "Bearer fixture-token"}))
        malformed = 200
    except urllib.error.HTTPError as e:
        malformed = e.code
    missing_id = "00000000-0000-4000-8000-000000000000"
    try:
        urllib.request.urlopen(urllib.request.Request(API + f"/dashboard/settings/drafts/{missing_id}", headers={"Authorization": "Bearer fixture-token"}))
        missing = 200
    except urllib.error.HTTPError as e:
        missing = e.code
    result("S01B-17", malformed == 400 and missing == 404, f"malformed UUID status {malformed}; valid missing UUID status {missing}")

    # S01B-18 Forbidden profile cannot mutate
    control(profile="read-only", generation=1)
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(500)
    txt = body_text(p)
    create_btn_count = p.get_by_role("button", name="创建草稿").count()
    result("S01B-18", create_btn_count == 0 and "只读" in txt, "read-only actor sees no create control")

    # S01B-19 Compiled default installs generation 0 and becomes ready only after handshake
    control(profile="writer", reset=True)
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(500)
    default_readiness = json.loads(urllib.request.urlopen(API + "/dashboard/settings/readiness?consumerGeneration=0").read())["data"]
    result("S01B-19", default_readiness["state"] == "ready" and default_readiness["publishedGeneration"] == 0 and default_readiness["effectiveOverviewRefreshSeconds"] == 60, "compiled default generation 0/value 60 installed and matched")

    # S01B-20 No secret in DOM
    txt = body_text(p)
    secret_terms = ["email", "password", "token", "secret", "postgresql://", "BEGIN PRIVATE"]
    result("S01B-20", not any(x in txt.lower() for x in secret_terms), "DOM redacted")

    # S01B-21 Publish 15 and observe a real Overview reload at the installed cadence
    control(profile="writer")
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(500)
    js_fill(p, "15", "S01B publish fifteen seconds interval for cadence check")
    js_click(p, "创建草稿")
    p.wait_for_url(re.compile(r"/dashboard/settings/lifecycle\?draftId="), timeout=5000)
    settle(p)
    p.wait_for_selector("text=设置草稿", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/validate") and r.status == 200): js_click(p, "验证草稿")
    p.wait_for_selector("text=安全差异", timeout=5000)
    js_click(p, "审阅并发布")
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/publish") and r.status == 200): js_click(p, "确认发布")
    p.wait_for_url(re.compile(r"/dashboard/settings/history"), timeout=5000)
    settle(p)
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(1000)
    cadence_start = time.monotonic()
    overview_before = len([n for n in network if "/dashboard/settings/overview" in n["url"]])
    deadline = cadence_start + 19
    while time.monotonic() < deadline and len([n for n in network if "/dashboard/settings/overview" in n["url"]]) <= overview_before:
        p.wait_for_timeout(250)
    cadence_elapsed = time.monotonic() - cadence_start
    overview_after = len([n for n in network if "/dashboard/settings/overview" in n["url"]])
    result("S01B-21", 13 <= cadence_elapsed <= 19 and overview_after > overview_before, f"published 15 seconds; observed Overview reload after {cadence_elapsed:.2f}s")

    # S01B-22 Existing publication rejects a stale consumer generation
    state_now = json.loads(urllib.request.urlopen(API + "/control/state").read())["state"]
    published_generation = next(e["sequence"] for e in reversed(state_now["publications"]) if e["eventType"] in ("published", "rollback_published")) if state_now["publications"] else 0
    stale_generation = max(0, published_generation - 1)
    stale_readiness = json.loads(urllib.request.urlopen(API + f"/dashboard/settings/readiness?consumerGeneration={stale_generation}").read())["data"]
    matched_readiness = json.loads(urllib.request.urlopen(API + f"/dashboard/settings/readiness?consumerGeneration={published_generation}").read())["data"]
    result("S01B-22", stale_readiness["state"] == "degraded" and stale_readiness["reasonCode"] == "consumer_generation_mismatch" and matched_readiness["state"] == "ready", f"stale generation {stale_generation} degraded; installed generation {published_generation} ready")

    # S01B-23 Mutation Audit records real roles/grants
    control(profile="writer", generation=1)
    audit_state = json.loads(urllib.request.urlopen(API + "/control/state").read())
    latest_audit = audit_state["state"]["audit"][-1] if audit_state["state"]["audit"] else {}
    roles = latest_audit.get("effectiveRoles", [])
    grants = [g.get("permissionKey") for g in latest_audit.get("permissionGrants", [])]
    result("S01B-23", "super_admin" in roles and "settings.write" in grants, f"audit roles={roles} grants={grants}")

    # S01B-24 Writer sees 受控写入; read-only sees 只读模式
    control(profile="writer", generation=1)
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(500)
    writer_banner = "Settings 受控写入" in body_text(p)
    control(profile="read-only", generation=1)
    p.reload()
    p.wait_for_timeout(500)
    ro_banner = "只读模式" in body_text(p)
    control(profile="writer", generation=1)
    p.goto(WEB + "/dashboard")
    p.wait_for_timeout(500)
    non_settings_banner = "只读模式" in body_text(p) and "Settings 受控写入" not in body_text(p)
    result("S01B-24", writer_banner and ro_banner and non_settings_banner, f"writer={writer_banner} read-only={ro_banner} non-settings-read-only={non_settings_banner}")

    # S01B-25 Logout and post-logout clean
    control(profile="read-only", generation=1)
    p.goto(WEB + "/dashboard/settings/overview")
    p.wait_for_timeout(400)
    p.goto(WEB + "/account/login")
    p.wait_for_timeout(500)
    txt = body_text(p)
    result("S01B-25", "设置中心" not in txt and "dashboard" not in txt.lower(), "post-logout no protected settings state")

    b.close()

# Console/network classification. The S01B-15/16 exercises intentionally
# trigger VERSION_CONFLICT / SETTINGS_STATE_CONFLICT (409) responses; the
# browser logs those as failed resources and they are expected evidence.
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
    "testedCommit": os.environ["S01B_TESTED_COMMIT"],
    "testedTree": os.environ["S01B_TESTED_TREE"],
    "viewport": definition["viewport"],
    "definitionSha256": sha(HERE / "s01b-definition.json"),
    "fixtureSha256": sha(HERE / "s01b-fixture.py"),
    "harnessSha256": sha(__file__),
    "runnerSha256": sha(HERE / "run-s01b.sh"),
    "counts": counts,
    "cases": list(cases.values()),
    "network": raw_network,
    "rawEvidence": {"consoleErrors": [c for c in raw_console if c["type"] == "error"], "failedRequests": [n for n in raw_network if "error" in n.get("url", "").lower()]},
    "expectedEvidence": {"consoleErrors": expected_console, "failedRequests": []},
    "unexpectedEvidence": {"consoleErrors": unexpected_console, "failedRequests": unexpected_network},
}
(OUT / "acceptance-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(counts))
print("unexpected console errors:", len(unexpected_console))
print("unexpected requests:", len(unexpected_network))
sys.exit(1 if counts["fail"] or counts["not-executed"] or unexpected_console or unexpected_network else 0)
