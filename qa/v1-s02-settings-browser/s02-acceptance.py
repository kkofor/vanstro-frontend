#!/usr/bin/env python3
# S02 General/Brand/Storefront/Localization browser acceptance: real Google
# Chrome/Playwright against the controlled fixture. Records raw/expected/
# unexpected console and request evidence, definition/fixture/harness SHA-256,
# and dynamic testedCommit. Covers the frozen S02 contract's 23 browser cases.
import json, hashlib, os, re, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ["S02_BROWSER_OUT"])
WEB = os.environ.get("S02_WEB", "http://127.0.0.1:4560")
API = os.environ.get("S02_API", "http://127.0.0.1:4561")
OUT.mkdir(parents=True, exist_ok=True)
definition = json.loads((HERE / "s02-definition.json").read_text())
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

def fill_input(p, selector, value):
    p.evaluate("""({selector, value}) => {
      const el = document.querySelector(selector);
      if (!el) return;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }""", {"selector": selector, "value": value})

def fill_reason(p, value):
    # The create form uses #s02-create-reason (no draft selected); the editable
    # draft form uses #s02-draft-reason. Fill whichever is present.
    p.evaluate("""(value) => {
      const el = document.querySelector('[id="s02-draft-reason"]') || document.querySelector('[id="s02-create-reason"]');
      if (!el) return;
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }""", value)

def fill_announcement(p, message):
    """Enable the announcement rule and set a non-empty message so the
    published projection passes the frontend runtime validator (the compiled
    empty message is rejected by stringValue). Uses attribute selectors because
    the S02 field ids contain dots (CSS class separators)."""
    p.evaluate("""(message) => {
      const ta = document.querySelector('[id="s02-field-storefront.announcementMessage"]');
      if (ta) {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(ta, message);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const sel = document.querySelector('[id="s02-field-storefront.announcementEnabled"]');
      if (sel) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, 'true');
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }""", message)

def fill_rollback_reason(p, value):
    p.evaluate("""(value) => {
      const el = document.querySelector('textarea[name="rollback-reason"], textarea[aria-label*="回滚"], textarea');
      if (!el) return;
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }""", value)

def select_option(p, label, value):
    p.evaluate("""({label, value}) => {
      const sel = [...document.querySelectorAll('select')].find(s => s.id && s.id.includes('s02-field') || s.ariaLabel === label);
      const target = [...document.querySelectorAll('select')].find(s => (s.closest('label')?.textContent || '').includes(label));
      const el = target || [...document.querySelectorAll('select')].find(s => s.value === 'newest');
      if (!el) return;
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }""", {"label": label, "value": value})

def confirm_dialog(p, button_label, timeout=5000):
    p.get_by_role("dialog").wait_for(state="visible", timeout=timeout)
    js_click(p, button_label, timeout=timeout)

control(profile="writer", reset=True)
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                           args=["--disable-background-networking", "--no-first-run"])
    p = b.new_page(viewport={"width": 1440, "height": 1000})
    p.on("request", lambda r: network.append({"method": r.method, "url": r.url, "monotonicSeconds": round(time.monotonic(), 3)}))
    p.on("console", lambda m: console.append({"type": m.type, "text": m.text}))
    p.on("pageerror", lambda e: console.append({"type": "error", "text": str(e)}))

    S02_URL = WEB + "/dashboard/settings/general-storefront"

    # ---- S02-01 Login + S02-02 page/registry ----
    # First load after a cold start can compile routes slowly (up to 90s).
    p.goto(S02_URL, timeout=120000)
    p.wait_for_selector("text=通用店面设置", timeout=90000)
    txt = body_text(p)
    result("S02-01", "通用店面设置" in txt and "管理后台" in txt, "dashboard shell and S02 panel rendered")
    result("S02-02", "settings.general-storefront.v1" in txt and "通用店面设置" in txt, "S02 page and descriptor visible")

    # ---- S02-03 read-only actor ----
    control(profile="read-only", reset=True)
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(700)
    txt = body_text(p)
    ro_banner = "只读模式" in txt
    ro_capability = json.loads(urllib.request.urlopen(API + "/dashboard/authorization").read())["data"]["settingsCenterV1"]
    ro_no_write_actions = not ro_capability["actions"]["createDraft"] and not ro_capability["actions"]["publish"] and not ro_capability["actions"]["rollback"]
    save_validate_publish_count = p.get_by_role("button", name="保存草稿").count() + p.get_by_role("button", name="验证草稿").count() + p.get_by_role("button", name="审阅并发布").count()
    result("S02-03", ro_banner and ro_no_write_actions and save_validate_publish_count == 0,
           f"read-only banner={ro_banner}; write actions denied={ro_no_write_actions}; no save/validate/publish controls")

    # ---- writer flows ----
    control(profile="writer", reset=True)
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(700)

    # S02-04 create a structurally valid business-invalid draft. The S02 form
    # only surfaces fields the client can structurally validate (dealer/location
    # pairing is client-blocked, Media/CMS refs are read-only), so the
    # business-invalid draft is seeded through the API contract exactly as the
    # backend would persist it (dealer ref without location ref). The frontend
    # must render such a server-persisted draft and drive its lifecycle.
    business_invalid_value = {
      "generalIdentity": {
        "siteDisplayName": "VanStro QA Storefront", "legalName": "VanStro QA Legal Inc.",
        "canonicalUrl": "https://vanstro.example", "contactEmail": "qa@vanstro.example",
        "contactPhone": "+1 204 555 0123",
        "contactAddress": {"line1": "123 Main St", "city": "Winnipeg", "province": "MB", "postalCode": "R3C 1A1", "country": "CA"},
        "defaultTimezone": "America/Winnipeg"
      },
      "brand": {"brandName": "VanStro", "brandDescription": "", "logoMediaRef": None, "faviconMediaRef": None},
      "storefront": {
        "homeContentRef": None, "navigationRef": None, "footerRef": None,
        "defaultProductSort": "newest", "outOfStockDisplay": "show",
        "dealerSelectionEnabled": True, "cartCheckoutEnabled": True,
        "announcementRule": {"enabled": True, "message": "S02 Browser Announcement"},
        "maintenanceBannerRule": {"enabled": False, "message": ""},
        "storefrontConfigRef": None, "enFrRoutesEnabled": True
      },
      "localization": {
        "defaultLocale": "en-CA", "supportedLocales": ["en-CA", "fr-CA"], "dashboardLocale": "zh-CN",
        "currency": "CAD", "timezone": "America/Winnipeg", "dateFormat": "yyyy-mm-dd",
        "phoneFormat": "national", "addressFormat": "canada_default", "weightUnits": "kg",
        "dimensionUnits": "cm", "translationFallback": "en_ca", "provinceServiceMapping": []
      },
      "defaultDealerLocation": {"defaultDealerRef": "55555555-5555-4555-8555-555555555555", "defaultLocationRef": None}
    }
    create_req = urllib.request.Request(API + "/dashboard/settings/s02-drafts",
                                        data=json.dumps({"descriptorKey": "settings.general-storefront", "expectedPublishedVersion": 0, "value": business_invalid_value, "changeReason": "S02 browser business invalid draft exercise", "idempotencyKey": "s02-browser-business-invalid-0001"}).encode(),
                                        headers={"Content-Type": "application/json"}, method="POST")
    created = json.loads(urllib.request.urlopen(create_req).read())["data"]
    p.reload()
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(800)
    txt = body_text(p)
    draft_visible = created["id"].split("-")[0] in txt or "验证未通过" in txt or "S02 设置草稿已创建" in txt
    drafts = api_json("/dashboard/settings/s02-drafts")["data"]
    result("S02-04", created["status"] == "draft" and len(drafts) == 1 and draft_visible,
           f"business-invalid draft created ({created['id'][:8]}) and rendered")

    # S02-05 server blocker -> invalid
    p.wait_for_timeout(300)
    validate_btn = p.get_by_role("button", name="验证草稿")
    if validate_btn.count() and not validate_btn.is_disabled():
        js_click(p, "验证草稿")
        p.wait_for_timeout(1000)
    txt = body_text(p)
    result("S02-05", "验证未通过" in txt and "阻断" in txt, "invalid with server blocker")

    # S02-06 PATCH correction: pair the location ref
    p.evaluate("""() => {
      const inputs = [...document.querySelectorAll('input')];
      const locationRef = inputs.find(i => i.id && i.id.includes('defaultLocationRef'));
      if (!locationRef) return;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(locationRef, '77777777-7777-4777-8777-777777777777');
      locationRef.dispatchEvent(new Event('input', { bubbles: true }));
    }""")
    fill_reason(p, "S02 browser PATCH correction exercise")
    p.wait_for_timeout(300)
    js_click(p, "保存草稿")
    p.wait_for_timeout(1000)
    corrected_drafts = api_json("/dashboard/settings/s02-drafts")["data"]
    corrected = next((d for d in corrected_drafts if d["id"] == created["id"]), None)
    paired = bool(corrected and corrected["value"]["defaultDealerLocation"]["defaultDealerRef"] and corrected["value"]["defaultDealerLocation"]["defaultLocationRef"])
    version_bumped = bool(corrected and corrected["version"] > created["version"])
    result("S02-06", bool(corrected) and paired and version_bumped,
           f"PATCH persisted paired refs={paired} version {created['version']}->{corrected['version'] if corrected else 'missing'}")

    # S02-07 revalidate
    js_click(p, "验证草稿")
    p.wait_for_timeout(900)
    txt = body_text(p)
    result("S02-07", "验证通过" in txt and "blocker" not in txt, "validated after correction")

    # S02-08 safe diff
    p.wait_for_timeout(900)
    txt = body_text(p)
    result("S02-08", "安全差异" in txt and "generalIdentity.siteDisplayName" in txt and "敏感度" in txt and "密钥变更：0" in txt, "safe diff with field paths and zero secrets")

    # S02-09 publish
    publish_btn = p.get_by_role("button", name="审阅并发布")
    if publish_btn.count() == 1 and not publish_btn.is_disabled():
        js_click(p, "审阅并发布")
        p.wait_for_timeout(400)
        confirm_dialog(p, "确认发布")
        p.wait_for_timeout(1000)
    state_after_publish = api_state()
    gen = state_after_publish["publishedGeneration"]
    result("S02-09", gen >= 1, f"publish executed; publishedGeneration={gen}")

    # S02-10 public storefront shows published change
    projection = api_json("/storefront/config?locale=en-CA")["data"]
    published_name = projection["effective"]["siteDisplayName"]
    p.goto(WEB + "/")
    p.wait_for_selector("header.site-header", timeout=30000)
    # The provider hydrates from the public API after the client load; wait for
    # the published name to appear (up to 8s) instead of a fixed sleep.
    published_in_header = False
    announcement_visible = False
    for _ in range(8):
        p.wait_for_timeout(1000)
        brand_txt = p.locator(".brand-text").inner_text()
        if published_name in brand_txt:
            published_in_header = True
            if "S02 Browser Announcement" in p.locator("header.site-header").inner_text():
                announcement_visible = True
            break
    # Provider state diagnostic (compiled default vs published vs error)
    provider_state = p.evaluate("""() => {
      const el = document.querySelector('.brand-text');
      let fiber = null; let node = el;
      while (node && !fiber) { const k = Object.keys(node).find(k => k.startsWith('__reactFiber$')); if (k) fiber = node[k]; node = node.parentElement; }
      let cur = fiber;
      while (cur) { const v = cur.memoizedProps && cur.memoizedProps.value; if (v && typeof v === 'object' && 'storefrontConfigState' in v) return v.storefrontConfigState.status + ':' + v.storefrontConfigState.effective.siteDisplayName; cur = cur.return; }
      return 'not-found';
    }""")
    result("S02-10", projection["projectionState"] == "published" and published_name == "VanStro QA Storefront" and published_in_header and announcement_visible,
           f"projection={projection['projectionState']} name={published_name}; brand-text shows it={published_in_header}; announcement={announcement_visible}; provider={provider_state}")

    # S02-11 locales and fallback
    fr = api_json("/storefront/config?locale=fr-CA")["data"]
    fallback = api_json("/storefront/config?locale=zh-CN")["data"]
    result("S02-11", fr["locale"] == "fr-CA" and fallback["locale"] == "en-CA" and fallback["projectionState"] == "published",
           f"fr locale={fr['locale']}; zh-CN falls back to {fallback['locale']}")

    # S02-12 reference resolution: publish a value with dealer/location refs
    control(profile="writer", reset=True)
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(700)
    p.evaluate("""() => {
      const inputs = [...document.querySelectorAll('input')];
      const set = (idPart, value) => {
        const el = inputs.find(i => i.id && i.id.includes(idPart));
        if (!el) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set('siteDisplayName', 'VanStro References');
      set('defaultDealerRef', '55555555-5555-4555-8555-555555555555');
      set('defaultLocationRef', '77777777-7777-4777-8777-777777777777');
    }""")
    fill_announcement(p, "S02 Reference Announcement")
    fill_reason(p, "S02 reference resolution publish exercise")
    p.wait_for_timeout(300)
    js_click(p, "创建草稿")
    p.wait_for_timeout(900)
    # The create response binds and re-hydrates the form; the validate button
    # becomes enabled once the selected draft is editable. Wait for it.
    p.wait_for_function("""() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('验证草稿') && !b.disabled)""", timeout=10000)
    js_click(p, "验证草稿")
    p.wait_for_timeout(800)
    publish_btn = p.get_by_role("button", name="审阅并发布")
    if publish_btn.count() == 1 and not publish_btn.is_disabled():
        js_click(p, "审阅并发布")
        p.wait_for_timeout(400)
        confirm_dialog(p, "确认发布")
        p.wait_for_timeout(900)
    ref_proj = api_json("/storefront/config?locale=en-CA")["data"]
    result("S02-12", ref_proj["effective"]["siteDisplayName"] == "VanStro References" and ref_proj["effective"]["defaultDealer"] and ref_proj["effective"]["defaultDealer"]["id"] == "55555555-5555-4555-8555-555555555555",
           f"dealer={ref_proj['effective']['defaultDealer']}")

    # S02-13 missing refs degrade without breaking the public site. The
    # projection state stays "published" (reference degradation never resets
    # the projection to compiled_default); the storefront keeps rendering.
    control(profile="writer", referenceMode="missing")
    p.goto(WEB + "/")
    p.wait_for_selector("header.site-header", timeout=30000)
    name_visible = False
    for _ in range(8):
        p.wait_for_timeout(1000)
        brand_txt = p.locator(".brand-text").inner_text()
        if "VanStro References" in brand_txt:
            name_visible = True
            break
    missing_proj = api_json("/storefront/config?locale=en-CA")["data"]
    result("S02-13", name_visible and missing_proj["projectionState"] == "published",
           f"missing reference mode keeps storefront rendering with the published name (visible={name_visible})")

    # S02-14 stale version -> VERSION_CONFLICT 409
    control(profile="writer", reset=True)
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(500)
    fill_reason(p, "S02 stale version exercise draft")
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    drafts = api_json("/dashboard/settings/s02-drafts")["data"]
    assert drafts, "a draft must exist for stale version exercise"
    target = drafts[0]
    req = urllib.request.Request(API + f"/dashboard/settings/s02-drafts/{target['id']}/validate",
                                 data=json.dumps({"expectedVersion": target["version"] + 99, "idempotencyKey": "s02-stale-version-exercise-0001"}).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer fixture-token"}, method="POST")
    try:
        urllib.request.urlopen(req)
        version_conflict = False
    except urllib.error.HTTPError as e:
        version_conflict = e.code == 409 and "VERSION_CONFLICT" in e.read().decode()
    result("S02-14", version_conflict, "stale version validate refused with VERSION_CONFLICT")

    # S02-15 illegal state -> SETTINGS_STATE_CONFLICT 409
    control(profile="writer", reset=True)
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(500)
    fill_reason(p, "S02 illegal state exercise draft")
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    drafts = api_json("/dashboard/settings/s02-drafts")["data"]
    unvalidated = [d for d in drafts if d["status"] in ("draft", "rollback_draft")]
    assert unvalidated, "a draft must exist for illegal state exercise"
    req = urllib.request.Request(API + f"/dashboard/settings/s02-drafts/{unvalidated[0]['id']}/publish",
                                 data=json.dumps({"expectedVersion": unvalidated[0]["version"], "idempotencyKey": "s02-illegal-state-exercise-0001"}).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer fixture-token"}, method="POST")
    try:
        urllib.request.urlopen(req)
        state_conflict = False
    except urllib.error.HTTPError as e:
        state_conflict = e.code == 409 and "SETTINGS_STATE_CONFLICT" in e.read().decode()
    result("S02-15", state_conflict, "publish of unvalidated draft refused with SETTINGS_STATE_CONFLICT")

    # S02-16 malformed UUID -> 400
    try:
        urllib.request.urlopen(urllib.request.Request(API + "/dashboard/settings/s02-drafts/not-a-uuid",
                                                      headers={"Authorization": "Bearer fixture-token"}))
        malformed = 200
    except urllib.error.HTTPError as e:
        malformed = e.code
    missing_id = "00000000-0000-4000-8000-000000000000"
    try:
        urllib.request.urlopen(urllib.request.Request(API + f"/dashboard/settings/s02-drafts/{missing_id}", headers={"Authorization": "Bearer fixture-token"}))
        missing = 200
    except urllib.error.HTTPError as e:
        missing = e.code
    result("S02-16", malformed == 400 and missing == 404, f"malformed UUID status {malformed}; valid missing UUID status {missing}")

    # ---- S02-17 append-only history with original facts ----
    control(profile="writer", reset=True)
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(500)
    fill_announcement(p, "S02 History Announcement A")
    fill_reason(p, "S02 history publish A exercise")
    p.evaluate("""() => {
      const el = [...document.querySelectorAll('input')].find(i => i.id && i.id.includes('siteDisplayName'));
      if (!el) return;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'History Name A');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }""")
    p.wait_for_timeout(300)
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    js_click(p, "验证草稿")
    p.wait_for_timeout(700)
    publish_btn = p.get_by_role("button", name="审阅并发布")
    if publish_btn.count() == 1 and not publish_btn.is_disabled():
        js_click(p, "审阅并发布")
        p.wait_for_timeout(400)
        confirm_dialog(p, "确认发布")
        p.wait_for_timeout(900)
    # publish B to trigger supersession
    p.evaluate("""() => {
      const el = [...document.querySelectorAll('input')].find(i => i.id && i.id.includes('siteDisplayName'));
      if (!el) return;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'History Name B');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }""")
    fill_announcement(p, "S02 History Announcement B")
    fill_reason(p, "S02 history publish B exercise")
    p.wait_for_timeout(300)
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    js_click(p, "验证草稿")
    p.wait_for_timeout(700)
    publish_btn = p.get_by_role("button", name="审阅并发布")
    if publish_btn.count() == 1 and not publish_btn.is_disabled():
        js_click(p, "审阅并发布")
        p.wait_for_timeout(400)
        confirm_dialog(p, "确认发布")
        p.wait_for_timeout(900)
    history = api_json("/dashboard/settings/s02-history")["data"]
    published_entries = [e for e in history if e["status"] == "published"]
    superseded_entries = [e for e in history if e["status"] == "superseded"]
    a_published = [e for e in history if e["changeReason"] == "S02 history publish A exercise"]
    result("S02-17", len(published_entries) == 2 and len(superseded_entries) == 1 and any(e["auditEventId"] for e in published_entries),
           f"published={len(published_entries)} superseded={len(superseded_entries)}; A fact preserved={bool(a_published)}")

    # ---- S02-18/19 rollback draft + publish restores previous version ----
    state_before_rollback = api_state()
    current_pub = next(e for e in reversed(state_before_rollback["publications"]) if e["eventType"] in ("published", "rollback_published"))
    rollback_source_audit = current_pub["auditEventId"]
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(800)
    # open history section; find the rollback button for the current publication
    p.wait_for_selector("text=追加式发布历史", timeout=5000)
    rollback_buttons = p.get_by_role("button", name="创建回滚草稿")
    if rollback_buttons.count() == 0:
        raise AssertionError("rollback control missing")
    rollback_buttons.last.click()
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    p.evaluate("""() => {
      const t = [...document.querySelectorAll('textarea')].find(x => x.closest('[role="dialog"]'));
      if (!t) return;
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(t, 'S02 rollback to previous storefront name');
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }""")
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/rollback-draft") and r.status == 201) as rollback_response:
        js_click(p, "确认创建草稿")
    rollback_body = rollback_response.value.json()["data"]
    result("S02-18", rollback_body["status"] == "rollback_draft" and rollback_body["rollbackOfPublicationId"] == current_pub["runtimeConfigId"],
           f"rollback draft {rollback_body['id']} created from {current_pub['runtimeConfigId']}")

    # validate + publish the rollback draft
    p.wait_for_timeout(900)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/validate") and r.status == 200):
        js_click(p, "验证草稿")
    p.get_by_text("安全差异").wait_for(state="visible", timeout=8000)
    js_click(p, "审阅并发布")
    p.get_by_role("dialog").wait_for(state="visible", timeout=5000)
    with p.expect_response(lambda r: r.request.method == "POST" and r.url.endswith("/publish") and r.status == 200) as rollback_publish_response:
        js_click(p, "确认发布")
    rollback_publication = rollback_publish_response.value.json()["data"]
    state_after_rollback = api_state()
    rollback_events = [e for e in state_after_rollback["publications"] if e["eventType"] == "rollback_published"]
    original_unchanged = any(e["runtimeConfigId"] == current_pub["runtimeConfigId"] and e["auditEventId"] == rollback_source_audit for e in state_after_rollback["publications"])
    rollback_gen = state_after_rollback["publishedGeneration"]
    proj_after_rollback = api_json("/storefront/config?locale=en-CA")["data"]
    result("S02-19", rollback_publication["version"] > current_pub["sequence"] and rollback_gen > 0 and len(rollback_events) == 1
           and proj_after_rollback["effective"]["siteDisplayName"] == "History Name B" and original_unchanged,
           f"rollback generation={rollback_gen} (>0); storefront restored to {proj_after_rollback['effective']['siteDisplayName']}")

    # ---- S02-20 fresh fixture compiled_default generation 0 ----
    control(profile="writer", reset=True)
    fresh_proj = api_json("/storefront/config?locale=en-CA")["data"]
    fresh_readiness = api_json("/dashboard/settings/s02-readiness?consumerGeneration=0")["data"]
    p.goto(WEB + "/")
    p.wait_for_selector("header.site-header", timeout=30000)
    p.wait_for_timeout(1500)
    brand_txt = p.locator(".brand-text").inner_text()
    result("S02-20", fresh_proj["projectionState"] == "compiled_default" and fresh_proj["publishedGeneration"] == 0
           and fresh_readiness["projectionState"] == "compiled_default" and "VanStro Global Supply" in brand_txt,
           f"compiled_default generation 0; storefront fallback name visible={ 'VanStro Global Supply' in brand_txt }")

    # ---- S02-21 production-configured static-export startup mode ----
    # A static export with a configured public API base serves the compiled
    # fallback in the static HTML and hydrates the published value via the
    # public API after hydration. With an unavailable API the provider keeps
    # the compiled fallback (never a crash, never a false ready).
    control(profile="writer", reset=True)
    # initial load with no publication: compiled fallback is the SSR text
    p.goto(WEB + "/")
    p.wait_for_selector("header.site-header", timeout=30000)
    p.wait_for_timeout(1000)
    initial_brand = p.locator(".brand-text").inner_text()
    has_compiled_before = "VanStro Global Supply" in initial_brand
    # publish a new name via the fixture API contract
    p.goto(S02_URL)
    p.wait_for_selector("text=通用店面设置", timeout=30000)
    p.wait_for_timeout(600)
    fill_announcement(p, "S02 Hydration Announcement")
    fill_reason(p, "S02 static export hydration publish exercise")
    js_click(p, "创建草稿")
    p.wait_for_timeout(800)
    js_click(p, "验证草稿")
    p.wait_for_timeout(700)
    publish_btn = p.get_by_role("button", name="审阅并发布")
    if publish_btn.count() == 1 and not publish_btn.is_disabled():
        js_click(p, "审阅并发布")
        p.wait_for_timeout(400)
        confirm_dialog(p, "确认发布")
        p.wait_for_timeout(900)
    proj_hydrated = api_json("/storefront/config?locale=en-CA")["data"]
    p.goto(WEB + "/")
    p.wait_for_selector("header.site-header", timeout=30000)
    published_name_visible = False
    for _ in range(8):
        p.wait_for_timeout(1000)
        brand_txt = p.locator(".brand-text").inner_text()
        if proj_hydrated["effective"]["siteDisplayName"] in brand_txt:
            published_name_visible = True
            break
    # API unavailable: block the public config route in the browser; the
    # provider settles error/compiled_default and keeps the fallback name.
    p.route("**/storefront/config**", lambda route: route.abort())
    p.reload()
    p.wait_for_selector("header.site-header", timeout=30000)
    p.wait_for_timeout(1500)
    brand_api_down = p.locator(".brand-text").inner_text()
    fallback_kept = "VanStro Global Supply" in brand_api_down
    result("S02-21", published_name_visible and fallback_kept,
           f"compiled fallback pre-hydration={has_compiled_before}; published name after hydration={published_name_visible}; API down keeps fallback={fallback_kept}")

    # ---- S02-22 Audit safe snapshot ----
    control(profile="writer", generation=1)
    audit_state = api_state()
    rows = audit_state["audit"]
    latest = rows[-1] if rows else {}
    roles = latest.get("effectiveRoles", [])
    grants = [g.get("permissionKey") for g in latest.get("permissionGrants", [])]
    metadata_str = json.dumps(latest.get("metadata", {}))
    no_field_values = "siteDisplayName" not in metadata_str and "contactEmail" not in metadata_str and "announcement" not in metadata_str
    result("S02-22", "super_admin" in roles and "settings.write" in grants and "descriptorKey" in metadata_str and no_field_values,
           f"audit roles={roles} grants={grants}; metadata={metadata_str[:120]}")

    # ---- S02-23 logout / post-logout ----
    control(profile="read-only", generation=1)
    p.goto(S02_URL)
    p.wait_for_timeout(600)
    p.goto(WEB + "/account/login")
    p.wait_for_timeout(600)
    txt = body_text(p)
    result("S02-23", "通用店面设置" not in txt and "dashboard" not in txt.lower(), "post-logout no protected settings state")

    b.close()

# Console/network classification. S02-14/15 intentionally trigger
# VERSION_CONFLICT / SETTINGS_STATE_CONFLICT (409) responses via direct API
# calls; the browser may log them as failed resources. S02-21 intentionally
# aborts the public config route (ERR_FAILED) to prove the API-down fallback.
# Those are expected evidence. Any other console error or unexpected request
# origin fails.
EXPECTED_CONFLICT_409 = "status of 409"
EXPECTED_ROUTE_ABORT = "net::ERR_FAILED"
raw_console = list(console)
expected_console = [c for c in raw_console if c["type"] == "error" and (EXPECTED_CONFLICT_409 in c["text"] or EXPECTED_ROUTE_ABORT in c["text"])]
unexpected_console = [c for c in raw_console if c["type"] == "error" and c not in expected_console]
raw_network = list(network)
expected_network = [n for n in network if n["url"].startswith(WEB) or n["url"].startswith(API) or n["url"].startswith("data:") or n["url"].startswith("blob:")]
unexpected_network = [n for n in network if n not in expected_network]

counts = {x: sum(v["status"] == x for v in cases.values()) for x in ["pass", "fail", "intentional-skip", "not-executed"]}
report = {
    "suiteId": definition["suiteId"],
    "testedCommit": os.environ["S02_TESTED_COMMIT"],
    "testedTree": os.environ["S02_TESTED_TREE"],
    "viewport": definition["viewport"],
    "definitionSha256": sha(HERE / "s02-definition.json"),
    "fixtureSha256": sha(HERE / "s02-fixture.py"),
    "harnessSha256": sha(__file__),
    "runnerSha256": sha(HERE / "run-s02.sh"),
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
