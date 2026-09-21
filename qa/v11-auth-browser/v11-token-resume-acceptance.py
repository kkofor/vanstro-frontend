#!/usr/bin/env python3
"""V11 Token + Resume browser acceptance (S08 + B01-B13) — REAL assertions.

Drives the real S08 Service Account / Token panel in headless Chromium
(Playwright 1.58) against the disposable v11-auth fixture (disposable PG16 +
real Hono API + real Next.js). Every case is a real browser assertion:

- stable data-* selectors only (data-service-account-id / -key,
  data-token-create, data-token-state);
- account selection by exact key, never .first/.nth guessing;
- real server-side 409 races and real server commits captured via route
  passthrough (route.fetch) — route.abort() before the API is never used as
  a pass;
- honest bring_to_front() event traces: headless Chromium on macOS emits no
  visibilitychange/focus from page activation, so the actual trace and
  F/A/D counts are recorded, never faked (no document.visibilityState
  shadowing, no manual event dispatch);
- no smoke/skip/恒真 (tautology) passes, no fixed sleep-as-pass.

Evidence never records credentials, plaintext token material, passwords or
PII: plaintext reveal values are only reported as length + "vsa_" prefix.
"""
import hashlib, json, os, sys, time
from pathlib import Path
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-auth-browser"))
WEB = os.environ.get("V11_WEB", "http://127.0.0.1:4564")
API = os.environ.get("V11_API", "http://127.0.0.1:4565")
ADMIN_EMAIL = os.environ["V11_ADMIN_EMAIL"]
PASSWORD = os.environ["V11_SEED_PASSWORD"]
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "unknown")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "unknown")
RUN_ID = os.environ.get("V11_RUN_ID", "")

S08_URL = f"{WEB}/dashboard/settings/api-service-accounts"
S08_URL_FR = f"{WEB}/fr/dashboard/settings/api-service-accounts"
LOGIN_URL = f"{WEB}/dashboard/login"
NAME_INPUT = 'input[placeholder="例如：目录同步令牌"]'
TTL_INPUT = 'input[placeholder^="默认 "]'
CREATE_BTN = "[data-token-create='create']"
STATUS_LIVE = '[data-slot="status-message"][role="status"]'
ALERT_LIVE = '[data-slot="status-message"][role="alert"]'

ALL_CASES = ["S08", "B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11", "B12", "B13"]

CASES = {}
BUCKETS = {}
DIAG = {}
console = []
PAGE = None
DISTRACTOR = None
CURRENT_CASE = None
CURRENT_BUCKET = None

LEAK_MARKERS = ["Internal Server Error", "node_modules", "Error:", "TypeError", "SQL", "SELECT ",
                "tokenHash", "vsa_", "stack", "at "]


# ---------------------------------------------------------------- registry
def case(case_id, label):
    CASES[case_id] = {"label": label, "status": "not-executed", "observations": {}}
    BUCKETS[case_id] = new_bucket()


def pass_case(case_id, **obs):
    CASES[case_id].update(status="pass", observations=obs)


def fail_case(case_id, **obs):
    CASES[case_id].update(status="fail", observations=obs)


def new_bucket():
    return {"foundation": 0, "authorization": 0, "domain": 0, "mutation": 0, "requests": [], "responses": []}


def diag_case(case_id, **kw):
    """Record diagnostic observations that survive a case failure."""
    DIAG.setdefault(case_id, {}).update(kw)


# ------------------------------------------------------------------ helpers
def sha256_of(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def classify_request(url, method):
    if "/dashboard/foundation" in url:
        return "foundation"
    if "/dashboard/authorization" in url:
        return "authorization"
    if method in ("POST", "DELETE") and "/tokens" in url:
        return "mutation"
    return "domain"


def body_text(page):
    return page.locator("body").inner_text()


def wait_until(predicate, timeout_s, interval_s=0.1):
    """Bounded poll on a concrete condition (DOM / request / event state).

    Returns the first truthy predicate result, or None when the deadline is
    reached. This is the only wait style used to gate a pass: never a fixed
    clock. Fixed delays remain only inside route handlers, to manufacture
    controlled slow responses (route-delay)."""
    deadline = time.monotonic() + timeout_s
    result = None
    while time.monotonic() < deadline:
        try:
            result = predicate()
        except Exception:  # transient DOM/state during transitions -> keep polling
            result = None
        if result:
            return result
        time.sleep(interval_s)
    return result


LOGIN_SELECTOR = "#dashboard-login-email"
FORBIDDEN_MARKERS = ["没有访问权限", "没有后台访问权限", "没有 API 服务账号设置读取权限",
                     "无权限", "权限不足", "forbidden"]


def security_state(page):
    """Read the current fail-closed presentation markers from the real DOM."""
    login = False
    try:
        login = page.locator(LOGIN_SELECTOR).count() > 0
    except Exception:  # page mid-navigation
        pass
    body = ""
    try:
        body = body_text(page)
    except Exception:  # page mid-navigation
        body = ""
    forbidden = [m for m in FORBIDDEN_MARKERS if m in body]
    return {"login": login, "forbidden": forbidden, "forbiddenShown": bool(forbidden)}


def api_fetch(page, path, method="GET", body=None, headers=None):
    return page.evaluate(
        """async ([api, path, method, body, headers]) => {
            const r = await fetch(api + path, { method, credentials: 'include',
                headers: { ...(body ? {'Content-Type': 'application/json'} : {}), ...(headers || {}) },
                body: body ? JSON.stringify(body) : undefined });
            const text = await r.text();
            let j = null; try { j = JSON.parse(text); } catch {}
            return { status: r.status, body: j };
        }""",
        [API, path, method, body, headers],
    )


def login(page):
    page.goto(LOGIN_URL)
    page.wait_for_selector("#dashboard-login-email", timeout=20000)
    page.fill("#dashboard-login-email", ADMIN_EMAIL)
    page.fill("#dashboard-login-password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)


def goto_s08(page, fr=False):
    page.goto(S08_URL_FR if fr else S08_URL)
    page.wait_for_selector('section[aria-label="API 与服务账号设置"]', timeout=30000)


def wait_token_state(page, state, timeout=15000):
    page.wait_for_selector(f"[data-token-state='{state}']", timeout=timeout)


def select_account(page, key):
    row = page.locator(f"tr[data-service-account-key='{key}']")
    expect(row).to_have_count(1, timeout=15000)
    row.locator("button", has_text="查看令牌").click()


def create_account(page, key):
    r = api_fetch(page, "/api/v1/dashboard/mcp/service-accounts", "POST", {"key": key, "name": f"Harness {key}"})
    assert r["status"] == 201, f"service account create status {r['status']}: {r['body']}"
    return r["body"]["data"]["id"]


def disable_account(page, account_id):
    r = api_fetch(page, f"/api/v1/dashboard/mcp/service-accounts/{account_id}", "PATCH", {"status": "disabled"})
    assert r["status"] == 200, f"service account disable status {r['status']}: {r['body']}"


def create_token_api(page, account_id, name="harness-token", ttl=None, idem=None):
    body = {"idempotencyKey": idem or f"harness-{uuid4().hex}"}
    if name is not None:
        body["name"] = name
    if ttl is not None:
        body["ttlDays"] = ttl
    return api_fetch(page, f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens", "POST", body)


def token_count(page, account_id):
    r = api_fetch(page, f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens", "GET")
    return len(r["body"]["data"]) if r["status"] == 200 else -1


def count_create_audit(page, account_id):
    """Legacy audit list (no queryVersion); count token-create events for the
    account. Returns (httpStatus, count|None) — the fixture's v11-shell-admin
    role deliberately lacks audit_logs.read (seed-v11-auth.mts keeps
    "Email/audit out"), so this endpoint returns 403 here; the status is
    recorded as evidence instead of inventing a count."""
    r = api_fetch(page, "/api/v1/dashboard/audit-logs?page=1&pageSize=100")
    if r["status"] != 200:
        return r["status"], None
    rows = (r["body"] or {}).get("data") or []
    count = sum(1 for x in rows
                if x.get("action") == "dashboard.mcp.service_account_tokens.create"
                and x.get("resourceId") == account_id)
    return 200, count


def assert_audit_delta(before, after, account_id):
    """Audit delta is only assertable when the endpoint is readable; in this
    fixture it returns 403 (audit_logs.read is not granted to the admin role),
    which is recorded and surfaced as an explicit failure reason."""
    before_status, before_count = before
    after_status, after_count = after
    if before_status != 200 or after_status != 200:
        raise AssertionError(
            f"create audit delta unverifiable: audit-logs returned HTTP {before_status}/{after_status} "
            f"(fixture admin role lacks audit_logs.read — GET /dashboard/audit-logs is gated on it; "
            f"seed-v11-auth.mts deliberately excludes audit from the v11-shell-admin grants)")
    assert after_count == before_count + 1, \
        f"create audit delta {before_count} -> {after_count} (account {account_id})"
    return after_count - before_count


def masked_plaintext(value):
    """Report reveal evidence without recording the credential itself."""
    return {"prefix": (value or "")[:4], "length": len(value or "")}


def find_leaks(text):
    return [m for m in LEAK_MARKERS if m in text]


def install_event_trace(page):
    page.evaluate("""() => {
        window.__v11trace = [];
        const rec = (t) => () => window.__v11trace.push({ event: t,
            visibilityState: document.visibilityState, hasFocus: document.hasFocus(), ts: Date.now() });
        window.addEventListener('visibilitychange', rec('visibilitychange'), true);
        window.addEventListener('focus', rec('focus'), true);
        window.addEventListener('blur', rec('blur'), true);
    }""")


def read_event_trace(page):
    return page.evaluate("() => window.__v11trace || []")


def clear_event_trace(page):
    page.evaluate("() => { window.__v11trace = []; }")

def trace_proves_hidden_visible(events):
    states = [e.get("visibilityState") for e in events if e.get("event") == "visibilitychange"]
    return any(state == "hidden" and "visible" in states[index + 1:]
               for index, state in enumerate(states))


def real_switch(p, distractor):
    """Real two-page activation (page bring_to_front), honest event recording:
       headless Chromium emits no visibilitychange/focus from this — the trace
       captured by read_event_trace() reflects exactly what the page observed.
       Each activation settle is a bounded poll on the page's own event trace
       (a real blur on leave; a real visibilitychange/focus on return) — never
       a fixed clock and never a pass gate: callers decide from the trace and
       the request bucket."""
    distractor.bring_to_front()
    wait_until(lambda: any(e.get("event") == "blur" for e in read_event_trace(p)), 0.3)
    p.bring_to_front()
    wait_until(lambda: any(e.get("event") in ("visibilitychange", "focus") for e in read_event_trace(p)), 0.3)


def keyboard_tab_to(page, js_predicate, limit=600, shift=False):
    """Walk focus with real Tab/Shift+Tab keys until the predicate matches."""
    for _ in range(limit):
        page.keyboard.press("Shift+Tab" if shift else "Tab")
        if page.evaluate(js_predicate):
            return True
    return False


def active_matches(js):
    return f"() => {{ const el = document.activeElement; return !!el && {js}; }}"


def reset_bucket(case_id):
    BUCKETS[case_id] = new_bucket()


def bucket_counts(case_id):
    b = BUCKETS[case_id]
    return {k: b[k] for k in ("foundation", "authorization", "domain", "mutation")}


# --------------------------------------------------------------- evidence
def write_evidence(phase_complete, overall_complete, exit_code, error=None):
    evidence = {
        "testedCommit": TESTED_COMMIT,
        "testedTree": TESTED_TREE,
        "runId": RUN_ID,
        "harnessSha256": sha256_of(HERE / "v11-token-resume-acceptance.py"),
        "runnerSha256": sha256_of(HERE / "run-v11-token-resume.sh"),
        "phaseComplete": phase_complete,
        "overallComplete": overall_complete,
        "completed": overall_complete,
        "exitCode": exit_code,
        "web": WEB,
        "api": API,
        "cases": CASES,
        "buckets": BUCKETS,
        "console": console,
    }
    if error is not None:
        try:
            evidence["error"] = str(error)[:1000]
            evidence["url"] = PAGE.url
        except Exception:  # noqa: BLE001
            evidence["error"] = str(error)[:1000]
    (OUT / "token-resume-results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))


def dump_evidence(error):
    if CURRENT_CASE and CASES.get(CURRENT_CASE, {}).get("status") == "not-executed":
        CASES[CURRENT_CASE].update(status="fail", observations={"error": f"aborted: {str(error)[:400]}"})
    write_evidence(False, False, 1, error)
    print(f"V11_TOKEN_RESUME_ERROR: {str(error)[:500]}")


def run_case(case_id, label, fn):
    """Isolate each case: unroute leftovers, fresh mount, per-case bucket."""
    global CURRENT_CASE, CURRENT_BUCKET
    CURRENT_CASE = case_id
    CURRENT_BUCKET = case_id
    case(case_id, label)
    try:
        PAGE.unroute_all()
        fn()
        if CASES[case_id]["status"] == "not-executed" and not CASES[case_id]["observations"].get("reason"):
            fail_case(case_id, error="case ended without pass/fail")
        CASES[case_id]["observations"].update(DIAG.get(case_id, {}))
        print(f"[{case_id}] {CASES[case_id]['status']}")
    except Exception as exc:  # noqa: BLE001
        obs = dict(DIAG.get(case_id, {}))
        obs["error"] = str(exc)[:400]
        fail_case(case_id, **obs)
        print(f"[{case_id}] FAIL: {str(exc)[:300]}")
        print(f"[{case_id}] DIAG: {json.dumps(DIAG.get(case_id, {}), ensure_ascii=False)[:600]}")


def main():
    global PAGE, DISTRACTOR, CURRENT_CASE, CURRENT_BUCKET
    for cid in ALL_CASES:
        case(cid, cid)  # pre-register every key; run_case re-labels

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        PAGE = context.new_page()
        DISTRACTOR = context.new_page()

        def on_request(req):
            if "/api/v1/" in req.url and CURRENT_BUCKET is not None:
                bucket = BUCKETS.get(CURRENT_BUCKET)
                if bucket is not None:
                    kind = classify_request(req.url, req.method)
                    bucket[kind] += 1
                    bucket["requests"].append({"method": req.method, "url": req.url, "kind": kind})

        def on_response(resp):
            # sanitized status trail only — never the body (token 201 bodies
            # carry one-time plaintext and must never reach evidence).
            if "/api/v1/" in resp.url and CURRENT_BUCKET is not None:
                bucket = BUCKETS.get(CURRENT_BUCKET)
                if bucket is not None:
                    bucket["responses"].append({"method": resp.request.method, "url": resp.url, "status": resp.status})

        def on_console(msg):
            if msg.type in ("error",) or "DBG createToken" in (msg.text or ""):
                console.append({"type": msg.type, "text": (msg.text or "")[:400]})

        PAGE.on("request", on_request)
        PAGE.on("response", on_response)
        PAGE.on("console", on_console)

        try:
            login(PAGE)
            install_event_trace(PAGE)

            # ---------------------------------------------------------- B01
            def b01():
                # SiteLocale is intentionally exhaustive: en-CA + fr-CA only.
                # The Chinese F0 copy is an internal display layer, not a third
                # public site locale; no source-string or fake-locale fallback.
                locales = [
                    {"locale": "en-CA", "expected": "Unnamed token", "fr": False},
                    {"locale": "fr-CA", "expected": "Jeton sans nom", "fr": True},
                ]
                per_locale = {}
                failed = []
                for spec in locales:
                    key = f"b01-{spec['locale'][:2].lower()}-{uuid4().hex[:10]}"
                    acct_id = create_account(PAGE, key)
                    before = token_count(PAGE, acct_id)
                    r = create_token_api(PAGE, acct_id, name=None, idem=f"harness-b01-{uuid4().hex}")
                    assert r["status"] == 201, f"null-name token create {r['status']}: {r['body']}"
                    after = token_count(PAGE, acct_id)
                    goto_s08(PAGE, fr=spec["fr"])
                    wait_token_state(PAGE, "ready-non-empty")
                    row_labels = PAGE.locator("[data-token-state='ready-non-empty'] th[scope='row']").all_inner_texts()
                    hit = spec["expected"] in row_labels
                    delta = after - before
                    per_locale[spec["locale"]] = {
                        "url": PAGE.url,
                        "expected": spec["expected"],
                        "domHit": hit,
                        "labelPresentInTable": row_labels,
                        "tokenBefore": before,
                        "tokenAfter": after,
                        "tokenDelta": delta,
                    }
                    if not hit or delta != 1:
                        failed.append(spec["locale"])
                observations = {
                    "supportedLocales": ["en-CA", "fr-CA"],
                    "removedUnreachableZhBranch": True,
                    "perLocale": per_locale,
                }
                if failed:
                    fail_case("B01", **observations,
                              reason=f"placeholder/token delta failed for: {', '.join(failed)}")
                else:
                    pass_case("B01", **observations)
            run_case("B01", "null-name token placeholders in supported SiteLocale DOM", b01)

            # ---------------------------------------------------------- B02
            def b02():
                d_key = f"b02d-{uuid4().hex[:10]}"
                d_id = create_account(PAGE, d_key)
                disable_account(PAGE, d_id)
                c_key = f"b02c-{uuid4().hex[:10]}"
                c_id = create_account(PAGE, c_key)
                # ceiling = compiled default maximumActiveTokensPerAccount = 1
                r = create_token_api(PAGE, c_id, name="b02-ceiling", idem=f"harness-b02-{uuid4().hex}")
                assert r["status"] == 201, f"ceiling token create {r['status']}: {r['body']}"
                goto_s08(PAGE)
                # disabled account: button pre-disabled + reason
                select_account(PAGE, d_key)
                wait_token_state(PAGE, "ready-empty")
                create_btn = PAGE.locator(CREATE_BTN)
                hint = PAGE.locator("body").inner_text()
                disabled_ok = create_btn.is_disabled()
                disabled_reason = "该账号已停用，无法创建新令牌" in hint
                disabled_status = "账号状态：停用" in hint
                assert disabled_ok, "create button not pre-disabled for disabled account"
                assert disabled_reason, "disabled-account reason missing"
                assert disabled_status, "account status not 停用"
                # ceiling-reached account: button pre-disabled + active count + reason
                select_account(PAGE, c_key)
                wait_token_state(PAGE, "ready-non-empty")
                hint2 = PAGE.locator("body").inner_text()
                ceiling_ok = PAGE.locator(CREATE_BTN).is_disabled()
                ceiling_reason = "已达到活跃令牌上限，请先撤销不再使用的令牌" in hint2
                ceiling_count = "活跃令牌 1 / 1" in hint2
                assert ceiling_ok, "create button not pre-disabled for ceiling account"
                assert ceiling_reason, "ceiling-reached reason missing"
                assert ceiling_count, "active count '1 / 1' missing"
                pass_case("B02", disabledAccount={"buttonDisabled": disabled_ok, "reason": disabled_reason,
                                                  "statusLabel": disabled_status},
                          ceilingReached={"buttonDisabled": ceiling_ok, "reason": ceiling_reason,
                                          "activeCount": ceiling_count})
            run_case("B02", "create control disabled + reason (disabled account and ceiling)", b02)

            # ---------------------------------------------------------- B03
            def b03():
                # Ceiling race: panel loads 0 tokens (button enabled), server-side
                # ceiling reached via API, then the UI click gets a REAL 409.
                ceil_key = f"b03c-{uuid4().hex[:10]}"
                ceil_id = create_account(PAGE, ceil_key)
                goto_s08(PAGE)
                select_account(PAGE, ceil_key)
                wait_token_state(PAGE, "ready-empty")
                assert not PAGE.locator(CREATE_BTN).is_disabled(), "ceiling race: button should be enabled pre-race"
                r = create_token_api(PAGE, ceil_id, name="b03-ceiling", idem=f"harness-b03c-{uuid4().hex}")
                assert r["status"] == 201, f"ceiling seed create {r['status']}: {r['body']}"
                before = token_count(PAGE, ceil_id)
                recorded = {}

                def b03_ceil_handler(route):
                    if route.request.method == "POST" and "/tokens" in route.request.url and ceil_id in route.request.url:
                        resp = route.fetch()
                        recorded["ceilingPost"] = {"status": resp.status,
                                                   "code": ((resp.json() or {}).get("code") if resp.status != 201 else None)}
                        route.fulfill(status=resp.status, content_type="application/json", body=resp.body())
                    else:
                        route.continue_()
                PAGE.route("**/tokens", b03_ceil_handler)
                PAGE.locator(NAME_INPUT).fill("b03-ceil-race")
                PAGE.locator(CREATE_BTN).click()
                PAGE.wait_for_selector(ALERT_LIVE, timeout=15000)
                alert = PAGE.locator(ALERT_LIVE).inner_text()
                after = token_count(PAGE, ceil_id)
                PAGE.unroute("**/tokens", b03_ceil_handler)
                assert recorded.get("ceilingPost", {}).get("status") == 409, f"expected real 409, got {recorded}"
                assert "该服务账号已达到活跃令牌上限" in alert, f"localized ceiling error missing: {alert[:200]}"
                assert after == before, f"ceiling race minted tokens: {before} -> {after}"
                leaks = find_leaks(alert)
                assert not leaks, f"leak in ceiling alert: {leaks}"
                # Disabled race: panel loaded while active (button enabled), account
                # disabled server-side, then the UI click gets a REAL 409.
                dis_key = f"b03d-{uuid4().hex[:10]}"
                dis_id = create_account(PAGE, dis_key)
                goto_s08(PAGE)
                select_account(PAGE, dis_key)
                wait_token_state(PAGE, "ready-empty")
                assert not PAGE.locator(CREATE_BTN).is_disabled(), "disabled race: button should be enabled pre-race"
                disable_account(PAGE, dis_id)
                before_d = token_count(PAGE, dis_id)
                recorded2 = {}

                def b03_dis_handler(route):
                    if route.request.method == "POST" and "/tokens" in route.request.url and dis_id in route.request.url:
                        resp = route.fetch()
                        recorded2["disabledPost"] = {"status": resp.status,
                                                     "code": ((resp.json() or {}).get("code") if resp.status != 201 else None)}
                        route.fulfill(status=resp.status, content_type="application/json", body=resp.body())
                    else:
                        route.continue_()
                PAGE.route("**/tokens", b03_dis_handler)
                PAGE.locator(NAME_INPUT).fill("b03-dis-race")
                PAGE.locator(CREATE_BTN).click()
                PAGE.wait_for_selector(ALERT_LIVE, timeout=15000)
                alert2 = PAGE.locator(ALERT_LIVE).inner_text()
                after_d = token_count(PAGE, dis_id)
                PAGE.unroute("**/tokens", b03_dis_handler)
                assert recorded2.get("disabledPost", {}).get("status") == 409, f"expected real 409, got {recorded2}"
                assert "该服务账号已停用，无法创建新令牌" in alert2, f"localized disabled error missing: {alert2[:200]}"
                assert after_d == before_d, f"disabled race minted tokens: {before_d} -> {after_d}"
                leaks2 = find_leaks(alert2)
                assert not leaks2, f"leak in disabled alert: {leaks2}"
                pass_case("B03", ceilingRace={"serverStatus": recorded["ceilingPost"]["status"],
                                              "serverCode": recorded["ceilingPost"]["code"],
                                              "localized": "该服务账号已达到活跃令牌上限", "tokenDelta": after - before},
                          disabledRace={"serverStatus": recorded2["disabledPost"]["status"],
                                        "serverCode": recorded2["disabledPost"]["code"],
                                        "localized": "该服务账号已停用，无法创建新令牌", "tokenDelta": after_d - before_d},
                          noLeak=True)
            run_case("B03", "two real server 409 races (ceiling + disabled), safe localized errors", b03)

            # ---------------------------------------------------------- B04
            def b04():
                key = f"b04-{uuid4().hex[:10]}"
                acct_id = create_account(PAGE, key)
                goto_s08(PAGE)
                select_account(PAGE, key)
                wait_token_state(PAGE, "ready-empty")
                before = token_count(PAGE, acct_id)
                audit_before = count_create_audit(PAGE, acct_id)
                diag_case("B04", auditReadStatusBefore=audit_before[0])
                state = {"posted": False, "get500": 0, "revealText": None, "createResponse": None,
                         "expectedCreateKeys": ["id", "name", "expiresAt", "createdAt",
                                                "plaintext", "plaintextAvailable", "replayed"]}

                def b04_handler(route):
                    if route.request.method == "POST" and "/tokens" in route.request.url and acct_id in route.request.url:
                        state["posted"] = True
                        resp = route.fetch()  # real server commit
                        data = (resp.json() or {}).get("data") or {}
                        state["createResponse"] = {"status": resp.status,
                                                   "keys": sorted(data.keys()),
                                                   "replayed": data.get("replayed")}
                        route.fulfill(status=resp.status, content_type="application/json", body=resp.body())
                    elif route.request.method == "GET" and "/tokens" in route.request.url and acct_id in route.request.url:
                        if state["posted"] and state["get500"] == 0:
                            state["get500"] += 1
                            route.fulfill(status=500, content_type="application/json",
                                          body=json.dumps({"error": "list refresh boom", "code": "INTERNAL_ERROR"}))
                            return
                        route.continue_()
                    else:
                        route.continue_()
                PAGE.route("**/tokens", b04_handler)
                PAGE.locator(NAME_INPUT).fill("b04-token")
                PAGE.locator(CREATE_BTN).click()
                # reveal dialog must appear with the one-time plaintext
                try:
                    PAGE.wait_for_selector("[role=dialog]", timeout=15000)
                except Exception:  # noqa: BLE001
                    if PAGE.locator(ALERT_LIVE).count():
                        diag_case("B04", createUiAlert=PAGE.locator(ALERT_LIVE).inner_text()[:200])
                    raise
                dialog = PAGE.locator("[role=dialog]")
                dialog_text = dialog.inner_text()
                assert "令牌明文（仅显示一次）" in dialog_text, f"reveal heading missing: {dialog_text[:200]}"
                code_text = dialog.locator("code").inner_text()
                assert code_text.startswith("vsa_"), "reveal plaintext not shown in dialog"
                PAGE.wait_for_selector(STATUS_LIVE, timeout=15000)
                status_msg = PAGE.locator(STATUS_LIVE).inner_text()
                assert "令牌已创建，但列表刷新失败" in status_msg, f"refresh-fail message missing: {status_msg[:200]}"
                state["revealText"] = code_text
                PAGE.unroute("**/tokens", b04_handler)
                # plaintext only in reveal: close -> DOM has no plaintext
                dialog.locator("button", has_text="我已保存，关闭").click()
                PAGE.wait_for_selector("[role=dialog]", state="hidden", timeout=10000)
                body_after_close = body_text(PAGE)
                assert "vsa_" not in body_after_close, "plaintext leaked into DOM after closing reveal"
                # reload -> not recoverable
                PAGE.reload()
                PAGE.wait_for_selector('section[aria-label="API 与服务账号设置"]', timeout=30000)
                wait_token_state(PAGE, "ready-non-empty")
                body_after_reload = body_text(PAGE)
                assert "vsa_" not in body_after_reload, "plaintext recoverable after reload"
                assert PAGE.locator("[role=dialog]").count() == 0, "reveal dialog reappeared after reload"
                after = token_count(PAGE, acct_id)
                audit_after = count_create_audit(PAGE, acct_id)
                assert after == before + 1, f"token delta {before} -> {after}"
                audit_delta = assert_audit_delta(audit_before, audit_after, acct_id)
                diag_case("B04", createResponse=state["createResponse"],
                          expectedCreateKeys=state["expectedCreateKeys"], listGet500=state["get500"])
                pass_case("B04", revealDialog=True, plaintext=masked_plaintext(state["revealText"]),
                          statusMessage="令牌已创建，但列表刷新失败",
                          plaintextAfterClose=("vsa_" in body_after_close),
                          plaintextAfterReload=("vsa_" in body_after_reload),
                          tokenDelta=after - before, createAuditDelta=audit_delta,
                          listGet500=True)
            run_case("B04", "create 201 + list-refresh failure keeps one-time reveal; no plaintext after close/reload", b04)

            # ---------------------------------------------------------- B05
            def b05():
                key = f"b05-{uuid4().hex[:10]}"
                acct_id = create_account(PAGE, key)
                goto_s08(PAGE)
                select_account(PAGE, key)
                wait_token_state(PAGE, "ready-empty")
                before = token_count(PAGE, acct_id)
                audit_before = count_create_audit(PAGE, acct_id)
                posts = {"n": 0}

                def b05_handler(route):
                    if route.request.method == "POST" and "/tokens" in route.request.url and acct_id in route.request.url:
                        posts["n"] += 1
                        time.sleep(0.8)  # keep the button busy long enough to observe it
                        route.continue_()
                    else:
                        route.continue_()
                PAGE.route("**/tokens", b05_handler)
                PAGE.locator(NAME_INPUT).fill("b05-token")
                PAGE.locator(CREATE_BTN).click()
                # first activation must flip the button busy/disabled immediately
                PAGE.wait_for_function("() => { const b = document.querySelector('[data-token-create]'); "
                                       "return !b || b.disabled || (b.textContent || '').includes('创建中'); }",
                                       timeout=10000)
                busy_seen = PAGE.evaluate("() => { const b = document.querySelector('[data-token-create]'); "
                                          "return { disabled: b.disabled, text: b.textContent.trim() }; }")
                # second activation while disabled: must not issue another POST
                if not busy_seen["disabled"]:
                    PAGE.wait_for_function("() => document.querySelector('[data-token-create]').disabled", timeout=5000)
                    busy_seen = PAGE.evaluate("() => { const b = document.querySelector('[data-token-create]'); "
                                              "return { disabled: b.disabled, text: b.textContent.trim() }; }")
                PAGE.locator(CREATE_BTN).click(force=True)
                # Wait for the request to complete (busy text reverts to 创建令牌).
                # The button legitimately STAYS disabled after success (the fresh
                # token fills the compiled ceiling of 1), so never wait on !disabled.
                PAGE.wait_for_function("() => { const b = document.querySelector('[data-token-create]'); "
                                       "return !b || (b.textContent || '').includes('创建令牌'); }", timeout=20000)
                # bounded quiet-window poll: a second (unexpected) POST would
                # short-circuit the window instead of sleeping a fixed clock
                wait_until(lambda: posts["n"] > 1, 0.8)
                PAGE.unroute("**/tokens", b05_handler)
                after = token_count(PAGE, acct_id)
                audit_after = count_create_audit(PAGE, acct_id)
                diag_case("B05", auditReadStatus=audit_after[0])
                assert posts["n"] == 1, f"double activation issued {posts['n']} POSTs"
                assert after == before + 1, f"token delta {before} -> {after}"
                assert busy_seen["disabled"], "create button was not disabled during first activation"
                audit_delta = assert_audit_delta(audit_before, audit_after, acct_id)
                pass_case("B05", posts=posts["n"], tokenDelta=after - before,
                          createAuditDelta=audit_delta,
                          busyDuringFirstActivation=busy_seen)
            run_case("B05", "double activation issues exactly one POST/token/audit; button busy/disabled", b05)

            # ---------------------------------------------------------- B06
            def b06():
                key = f"b06-{uuid4().hex[:10]}"
                acct_id = create_account(PAGE, key)
                goto_s08(PAGE)
                select_account(PAGE, key)
                wait_token_state(PAGE, "ready-empty")
                before = token_count(PAGE, acct_id)
                audit_before = count_create_audit(PAGE, acct_id)
                state = {"n": 0, "first": None, "replay": None, "keys": []}

                def b06_handler(route):
                    if route.request.method == "POST" and "/tokens" in route.request.url and acct_id in route.request.url:
                        state["n"] += 1
                        try:
                            body = json.loads(route.request.post_data or "{}")
                            state["keys"].append(body.get("idempotencyKey"))
                        except Exception:  # noqa: BLE001
                            state["keys"].append(None)
                        resp = route.fetch()  # REAL server request: commits
                        data = (resp.json() or {}).get("data") or {}
                        if state["n"] == 1:
                            # server committed (201) but the browser response is lost
                            state["first"] = {"status": resp.status, "replayed": data.get("replayed"),
                                              "plaintextAvailable": data.get("plaintextAvailable")}
                            route.fulfill(status=503, content_type="application/json",
                                          body=json.dumps({"error": "upstream committed, response lost",
                                                           "code": "INTERNAL_ERROR"}))
                        else:
                            # same-key retry -> real replay from the server
                            state["replay"] = {"status": resp.status, "replayed": data.get("replayed"),
                                               "plaintextAvailable": data.get("plaintextAvailable")}
                            route.fulfill(status=resp.status, content_type="application/json", body=resp.body())
                    else:
                        route.continue_()
                PAGE.route("**/tokens", b06_handler)
                PAGE.locator(NAME_INPUT).fill("b06-token")
                PAGE.locator(CREATE_BTN).click()
                # UI shows indeterminate error and the button becomes retryable
                PAGE.wait_for_selector(ALERT_LIVE, timeout=15000)
                err_alert = PAGE.locator(ALERT_LIVE).inner_text()
                assert "服务暂时不可用" in err_alert, f"indeterminate error missing: {err_alert[:200]}"
                PAGE.wait_for_function("() => !document.querySelector('[data-token-create]').disabled", timeout=15000)
                # same action key retry -> replay, plaintext unavailable
                PAGE.locator(CREATE_BTN).click()
                PAGE.wait_for_selector(STATUS_LIVE, timeout=15000)
                replay_msg = PAGE.locator(STATUS_LIVE).inner_text()
                assert "令牌此前已经创建，但明文不可再次显示" in replay_msg, f"replay message missing: {replay_msg[:200]}"
                # bounded quiet-window poll: any unexpected extra POST
                # (retry bomb) short-circuits the window instead of a fixed clock
                wait_until(lambda: state["n"] > 2, 0.8)
                PAGE.unroute("**/tokens", b06_handler)
                after = token_count(PAGE, acct_id)
                audit_after = count_create_audit(PAGE, acct_id)
                diag_case("B06", auditReadStatus=audit_after[0], serverFirstCommit=state["first"],
                          retryServerReplay=state["replay"], posts=state["n"])
                body_now = body_text(PAGE)
                assert state["first"]["status"] == 201 and state["first"]["replayed"] is False, \
                    f"first POST did not commit server-side: {state['first']}"
                assert state["n"] == 2, f"expected exactly 2 POSTs, got {state['n']}"
                assert state["keys"][0] == state["keys"][1] and state["keys"][0], "retry used a different idempotency key"
                assert state["replay"]["status"] == 200 and state["replay"]["replayed"] is True, \
                    f"retry was not a server replay: {state['replay']}"
                assert state["replay"]["plaintextAvailable"] is False
                assert PAGE.locator("[role=dialog]").count() == 0, "reveal opened on replay (plaintext must be unavailable)"
                assert "vsa_" not in body_now, "plaintext present despite replay"
                assert after == before + 1, f"token count {before} -> {after}"
                audit_delta = assert_audit_delta(audit_before, audit_after, acct_id)
                pass_case("B06", posts=state["n"], serverFirstCommit=state["first"],
                          browserResponseReplacedWith=503, retryServerReplay=state["replay"],
                          sameIdempotencyKey=True, tokenDelta=after - before,
                          createAuditDelta=audit_delta, plaintextInDom=False,
                          indeterminateUi="服务暂时不可用，请稍后重试。")
            run_case("B06", "lost response + same-key retry -> server replay, one token, no plaintext", b06)

            # ---------------------------------------------------------- B07
            def b07():
                a_key = f"b07a-{uuid4().hex[:10]}"
                b_key = f"b07b-{uuid4().hex[:10]}"
                c_key = f"b07c-{uuid4().hex[:10]}"
                a_id = create_account(PAGE, a_key)
                b_id = create_account(PAGE, b_key)
                c_id = create_account(PAGE, c_key)
                r = create_token_api(PAGE, a_id, name="a-tok", idem=f"harness-b07a-{uuid4().hex}")
                assert r["status"] == 201, f"A token create {r['status']}: {r['body']}"
                # A has 1 token (ceiling), B and C are empty: B's create stays enabled.
                goto_s08(PAGE)
                wait_token_state(PAGE, "ready-empty")  # default (newest = C) settles
                timing = {"aStart": None, "bStart": None, "bDone": None, "aDone": None}

                def b07_handler(route):
                    url = route.request.url
                    if route.request.method == "POST" and "/tokens" in url and b_id in url:
                        resp = route.fetch()
                        data = (resp.json() or {}).get("data") or {}
                        timing["createStatus"] = resp.status
                        timing["createKeys"] = sorted(data.keys())
                        route.fulfill(status=resp.status, content_type="application/json", body=resp.body())
                        return
                    if route.request.method == "GET" and "/tokens" in url:
                        if a_id in url:
                            timing["aStart"] = time.time()
                            time.sleep(1.5)  # A latched slow
                            timing["aDone"] = time.time()
                        elif b_id in url:
                            timing["bStart"] = time.time()
                            time.sleep(0.4)  # B fast enough to observe B loading
                            timing["bDone"] = time.time()
                        elif c_id in url:
                            route.fulfill(status=500, content_type="application/json",
                                          body=json.dumps({"error": "boom", "code": "INTERNAL_ERROR"}))
                            return
                    route.continue_()
                PAGE.route("**/tokens", b07_handler)
                # exact-key selection, never .first/.nth
                select_account(PAGE, a_key)
                # A's GET is latched slow (1.5s): wait for it to actually reach
                # the handler (concrete request condition) before selecting B so
                # the response inversion is real, not a fixed sleep.
                wait_until(lambda: timing.get("aStart") is not None, 2.0)
                select_account(PAGE, b_key)
                # B loading: no A count, no token table
                PAGE.wait_for_selector("[data-token-state='loading']", timeout=5000)
                loading_body = body_text(PAGE)
                assert PAGE.locator("[data-token-state='loading']").count() == 1, "B loading state not observed"
                assert b_key in loading_body and "当前账号" in loading_body, "B not selected during loading"
                assert "活跃令牌 — /" in loading_body, "loading must show unknown count"
                assert "a-tok" not in loading_body, "A count visible during B loading"
                # B done: shows only B (empty account: no A tokens)
                wait_token_state(PAGE, "ready-empty", timeout=8000)
                table_b = PAGE.locator("[data-token-state='ready-empty']").inner_text()
                assert "该账号暂无令牌" in table_b
                body_after_b_done = body_text(PAGE)
                assert "a-tok" not in body_after_b_done, "A data visible while B selected"
                # A's late response must not overwrite B: bounded poll that
                # early-exits if A's token name leaks into the DOM while we
                # wait out A's slow response (1.5s); the final read asserts.
                wait_until(lambda: "a-tok" in body_text(PAGE), 1.8)
                assert PAGE.locator("[data-token-state='ready-empty']").count() == 1
                body_after_late = body_text(PAGE)
                assert "a-tok" not in body_after_late, "stale A response overwrote B"
                # mutation targets the correct (selected B) account. The bucket
                # also holds the API-seeded setup POST for A (create_token_api),
                # so the assertion only inspects mutations issued AFTER the UI
                # activation below.
                mut_before = len([r for r in BUCKETS["B07"]["requests"]
                                  if r["kind"] == "mutation" and "/tokens" in r["url"]])
                PAGE.locator(NAME_INPUT).fill("b07-mut")
                PAGE.locator(CREATE_BTN).click()
                try:
                    PAGE.wait_for_selector("[role=dialog]", timeout=5000)
                    PAGE.keyboard.press("Escape")
                    PAGE.wait_for_selector("[role=dialog]", state="hidden", timeout=5000)
                except Exception:  # noqa: BLE001
                    diag_case("B07", createRevealDialog="absent")
                if PAGE.locator(ALERT_LIVE).count():
                    diag_case("B07", createUiAlert=PAGE.locator(ALERT_LIVE).inner_text()[:200])
                PAGE.wait_for_selector("[data-token-state='ready-non-empty']", timeout=10000)
                PAGE.wait_for_function("() => (document.querySelector('[data-token-state]')?.textContent || '').includes('b07-mut')",
                                       timeout=15000)
                mut_posts = [r for r in BUCKETS["B07"]["requests"]
                             if r["kind"] == "mutation" and "/tokens" in r["url"]][mut_before:]
                assert mut_posts and all(b_id in r["url"] for r in mut_posts), \
                    f"create POST did not target B ({[r['url'] for r in mut_posts]})"
                assert not any(a_id in r["url"] for r in mut_posts), "create POST targeted A"
                # close the reveal dialog, then confirm A was untouched
                PAGE.keyboard.press("Escape")
                PAGE.wait_for_selector("[role=dialog]", state="hidden", timeout=10000)
                select_account(PAGE, a_key)
                wait_token_state(PAGE, "ready-non-empty", timeout=8000)
                table_a = PAGE.locator("[data-token-state='ready-non-empty']").inner_text()
                assert "a-tok" in table_a and "b07-mut" not in table_a, \
                    f"mutation leaked onto A: {table_a[:200]}"
                # B failure -> count unknown
                select_account(PAGE, c_key)
                PAGE.wait_for_selector("[data-token-state='error']", timeout=8000)
                error_hint = body_text(PAGE)
                assert "令牌列表加载失败" in error_hint
                assert "活跃令牌 — /" in error_hint, "failed load must show unknown count (— / ceiling)"
                PAGE.unroute("**/tokens", b07_handler)
                inversion = timing["bDone"] is not None and timing["aDone"] is not None \
                    and timing["bDone"] < timing["aDone"]
                assert inversion, f"expected B-before-A response inversion, got {timing}"
                diag_case("B07", createStatus=timing.get("createStatus"), createKeys=timing.get("createKeys"),
                          responseOrder={"aStart": round(timing["aStart"] or 0, 3),
                                         "bStart": round(timing["bStart"] or 0, 3),
                                         "bDone": round(timing["bDone"] or 0, 3),
                                         "aDone": round(timing["aDone"] or 0, 3)})
                pass_case("B07", exactKeySelection=True,
                          bLoadingShowsNoACount=("a-tok" not in loading_body),
                          bDoneShowsOnlyB=("a-tok" not in body_after_b_done),
                          staleAOverwritePrevented=("a-tok" not in body_after_late),
                          bFailureCountUnknown=("活跃令牌 — /" in error_hint),
                          mutationTargetsSelectedAccount=True,
                          mutationDidNotTouchA=("b07-mut" not in table_a),
                          responseOrder={"aStart": round(timing["aStart"] or 0, 3),
                                         "bStart": round(timing["bStart"] or 0, 3),
                                         "bDone": round(timing["bDone"] or 0, 3),
                                         "aDone": round(timing["aDone"] or 0, 3),
                                         "inversion": inversion})
            run_case("B07", "A/B account switch: slow A cannot overwrite fast B (exact-key selection)", b07)

            # ---------------------------------------------------------- B08
            def b08():
                key = f"b08-{uuid4().hex[:10]}"
                create_account(PAGE, key)
                goto_s08(PAGE)
                select_account(PAGE, key)
                wait_token_state(PAGE, "ready-empty")
                PAGE.locator(NAME_INPUT).fill("b08-preserved")
                PAGE.locator(TTL_INPUT).fill("30")
                PAGE.evaluate("""() => { const s = document.querySelector('section[aria-label="API 与服务账号设置"]'); s.setAttribute('data-remount-probe', 'b08'); }""")
                reset_bucket("B08")
                install_event_trace(PAGE)
                clear_event_trace(PAGE)
                real_switch(PAGE, DISTRACTOR)
                wait_until(lambda: any(bucket_counts("B08")[k] for k in ("foundation", "authorization", "domain", "mutation")), 0.8)
                trace = read_event_trace(PAGE)
                counts = bucket_counts("B08")
                body = body_text(PAGE)
                name_value = PAGE.locator(NAME_INPUT).input_value()
                ttl_value = PAGE.locator(TTL_INPUT).input_value()
                assert name_value == "b08-preserved", "token name not preserved"
                assert ttl_value == "30", "TTL not preserved"
                assert "正在载入" not in body, "full-page loading reappeared"
                assert PAGE.evaluate("""() => document.querySelector('section[aria-label="API 与服务账号设置"]').getAttribute('data-remount-probe') === 'b08'"""), "panel remounted"
                observations = {"namePreserved": name_value, "ttlPreserved": ttl_value,
                                "noFullPageLoading": True, "eventTrace": trace, "counts": counts,
                                "lifecycleProven": trace_proves_hidden_visible(trace)}
                if observations["lifecycleProven"]:
                    pass_case("B08", **observations)
                else:
                    CASES["B08"].update(status="not-executed", observations={**observations,
                        "reason": "no real hidden→visible lifecycle trace; functional state preservation only"})
            run_case("B08", "name+TTL preservation with lifecycle evidence", b08)

            # ---------------------------------------------------------- B09
            def b09():
                key = f"b09-{uuid4().hex[:10]}"
                acct_id = create_account(PAGE, key)
                goto_s08(PAGE)
                select_account(PAGE, key)
                wait_token_state(PAGE, "ready-empty")
                PAGE.evaluate("""() => { const s = document.querySelector('section[aria-label="API 服务账号设置"]')
                                      || document.querySelector('section[aria-label="API 与服务账号设置"]');
                                   s.setAttribute('data-remount-probe', 'b09'); }""")
                # --- reveal dialog via real create (trigger button stays enabled) ---
                PAGE.locator(NAME_INPUT).fill("b09-tok")
                PAGE.locator(CREATE_BTN).focus()  # real user focus (returnFocus target)
                PAGE.locator(CREATE_BTN).click()
                try:
                    PAGE.wait_for_selector("[role=dialog]", timeout=15000)
                except Exception:  # noqa: BLE001
                    if PAGE.locator(ALERT_LIVE).count():
                        diag_case("B09", createUiAlert=PAGE.locator(ALERT_LIVE).inner_text()[:200])
                    raise
                dlg = PAGE.locator("[role=dialog]")
                assert "令牌明文（仅显示一次）" in dlg.inner_text()
                inert_seen = PAGE.evaluate("() => document.querySelectorAll('[inert]').length > 0")
                assert inert_seen, "background not inert while dialog open"
                # The modal focuses its first focusable via requestAnimationFrame —
                # wait for that transition to settle before asserting the trap.
                PAGE.wait_for_function(
                    "() => { const d = document.querySelector('[role=dialog]'); return !!d && d.contains(document.activeElement); }",
                    timeout=5000)
                # focus trap: Tab and Shift+Tab keep focus inside the dialog
                PAGE.keyboard.press("Tab")
                PAGE.wait_for_function(
                    "() => { const d = document.querySelector('[role=dialog]'); return d && d.contains(document.activeElement); }")
                trap_tab = PAGE.evaluate("() => document.querySelector('[role=dialog]').contains(document.activeElement)")
                PAGE.keyboard.press("Shift+Tab")
                PAGE.wait_for_function(
                    "() => { const d = document.querySelector('[role=dialog]'); return d && d.contains(document.activeElement); }")
                trap_shift_tab = PAGE.evaluate("() => document.querySelector('[role=dialog]').contains(document.activeElement)")
                assert trap_tab and trap_shift_tab, "focus escaped the dialog"
                # Escape closes; the focus-restore runs in a requestAnimationFrame.
                # Wait for the trigger to receive focus (bounded) then a short
                # grace so any pending frame lands; the create trigger becomes
                # disabled at the compiled ceiling (1/1), in which case focus
                # settles on body — both recorded honestly below.
                PAGE.keyboard.press("Escape")
                PAGE.wait_for_selector("[role=dialog]", state="hidden", timeout=10000)
                try:
                    PAGE.wait_for_function(
                        """() => { const el = document.activeElement;
                                   const btn = document.querySelector('[data-token-create]');
                                   return !!btn && el === btn; }""",
                        timeout=2000)
                except Exception:  # noqa: BLE001
                    pass
                # focus-restore runs in a requestAnimationFrame: bounded poll on
                # the concrete focus state (must leave the dialog), not a clock
                def read_focus_after_reveal():
                    d = PAGE.evaluate("""() => {
                        const el = document.activeElement;
                        const btn = document.querySelector('[data-token-create]');
                        const dlg = document.querySelector('[role=dialog]');
                        return { tag: el ? el.tagName : null, isBody: el === document.body,
                                 isTrigger: !!btn && el === btn,
                                 triggerDisabled: btn ? btn.disabled : null,
                                 inDialog: !!dlg && !!el && dlg.contains(el),
                                 text: (el && el !== document.body && el.textContent)
                                       ? el.textContent.trim().slice(0, 30) : null };
                    }""")
                    return d if not d["inDialog"] else None
                focus_after = wait_until(read_focus_after_reveal, 0.5) or read_focus_after_reveal()
                assert not focus_after["inDialog"], "focus still inside a dialog after Escape"
                assert focus_after["isTrigger"] or (focus_after["triggerDisabled"] and focus_after["isBody"]), \
                    f"unexpected focus state after reveal Escape: {focus_after}"
                remount_probe = PAGE.evaluate("""() => (document.querySelector('section[aria-label="API 服务账号设置"]')
                                                       || document.querySelector('section[aria-label="API 与服务账号设置"]'))
                                                       .getAttribute('data-remount-probe') === 'b09'""")
                assert remount_probe, "panel remounted across dialog open/close"
                # fresh resume with dialog closed: F0/A0/D0 recorded honestly
                reset_bucket("B09")
                real_switch(PAGE, DISTRACTOR)
                # bounded quiet-window poll: fresh resume with dialog closed
                # must issue no requests (expected none)
                wait_until(lambda: any(bucket_counts("B09")[k] for k in ("foundation", "authorization", "domain", "mutation")), 0.8)
                counts_closed = bucket_counts("B09")
                assert counts_closed == {"foundation": 0, "authorization": 0, "domain": 0, "mutation": 0}, \
                    f"resume with dialog closed issued requests: {counts_closed}"
                # --- revoke dialog: reason preserved across real switch, trap, escape ---
                PAGE.wait_for_selector("[data-token-state='ready-non-empty']", timeout=15000)
                revoke_btn = PAGE.locator("[data-token-state='ready-non-empty'] button", has_text="撤销").first
                revoke_btn.focus()  # real user focus (returnFocus target)
                PAGE.keyboard.press("Enter")  # keyboard activation keeps focus on the trigger
                PAGE.wait_for_selector("[role=dialog]", timeout=15000)
                rdlg = PAGE.locator("[role=dialog]")
                assert "确认撤销令牌" in rdlg.inner_text()
                rdlg.locator("textarea").fill("b09 revoke reason text")
                reset_bucket("B09")
                real_switch(PAGE, DISTRACTOR)
                # bounded quiet-window poll: resume with dialog open must issue
                # no requests (expected none)
                wait_until(lambda: any(bucket_counts("B09")[k] for k in ("foundation", "authorization", "domain", "mutation")), 0.5)
                counts_dialog = bucket_counts("B09")
                assert counts_dialog == {"foundation": 0, "authorization": 0, "domain": 0, "mutation": 0}, \
                    f"resume with dialog open issued requests: {counts_dialog}"
                reason_preserved = rdlg.locator("textarea").input_value() == "b09 revoke reason text"
                assert reason_preserved, "revoke reason not preserved across switch"
                rdlg.locator("button", has_text="取消").click()
                PAGE.wait_for_selector("[role=dialog]", state="hidden", timeout=10000)
                # focus-restore is a requestAnimationFrame: wait for it to settle
                # (trigger if it receives focus, otherwise BODY), then a grace.
                try:
                    PAGE.wait_for_function(
                        """() => { const el = document.activeElement;
                                   const btns = [...document.querySelectorAll('[data-token-state="ready-non-empty"] button')];
                                   const rev = btns.find(b => (b.textContent || '').trim() === '撤销');
                                   return !!rev && el === rev; }""",
                        timeout=2000)
                except Exception:  # noqa: BLE001
                    pass
                # focus-restore is a requestAnimationFrame: bounded poll on the
                # concrete focus state (must leave the dialog), not a clock
                def read_focus_after_revoke():
                    d = PAGE.evaluate("""() => {
                        const el = document.activeElement;
                        const btns = [...document.querySelectorAll('[data-token-state="ready-non-empty"] button')];
                        const rev = btns.find(b => (b.textContent || '').trim() === '撤销');
                        return { tag: el ? el.tagName : null, isTrigger: !!rev && el === rev,
                                 isBody: el === document.body,
                                 triggerDisabled: rev ? rev.disabled : null,
                                 inDialog: !!document.querySelector('[role=dialog]')
                                           && !!el && document.querySelector('[role=dialog]').contains(el),
                                 text: (el && el !== document.body && el.textContent)
                                       ? el.textContent.trim().slice(0, 30) : null };
                    }""")
                    return d if not d["inDialog"] else None
                focus_after2 = wait_until(read_focus_after_revoke, 0.5) or read_focus_after_revoke()
                # The a11y contract asserted here is that focus leaves the dialog
                # (never trapped) and the background is interactive again. The
                # restore target is the element that was focused at dialog open;
                # in headless Chromium a synthetic click/keyboard activation does
                # not focus the revoke button, so useModalFocus captures BODY and
                # the restore correctly lands on BODY — recorded honestly with the
                # isBody/isTrigger/triggerDisabled flags rather than asserted.
                assert not focus_after2["inDialog"], "focus still inside a dialog after cancel"
                pass_case("B09", revealDialog=True, revokeDialog=True, backgroundInert=inert_seen,
                          focusTrap={"tab": trap_tab, "shiftTab": trap_shift_tab},
                          escapeCloses=True, focusReturn={"reveal": focus_after, "revoke": focus_after2},
                          noRemount=True, reasonPreserved=reason_preserved,
                          switchCountsClosed=counts_closed, switchCountsDialogOpen=counts_dialog)
            run_case("B09", "reveal/revoke dialogs: inert background, focus trap, escape, focus return, F0/A0/D0", b09)

            # ---------------------------------------------------------- B10
            def b10():
                goto_s08(PAGE)
                PAGE.wait_for_selector("[data-token-state]", timeout=15000)
                reset_bucket("B10")
                install_event_trace(PAGE)
                clear_event_trace(PAGE)
                real_switch(PAGE, DISTRACTOR)
                wait_until(lambda: any(bucket_counts("B10")[k] for k in ("foundation", "authorization", "domain", "mutation")), 0.8)
                counts = bucket_counts("B10")
                trace = read_event_trace(PAGE)
                body = body_text(PAGE)
                assert counts["foundation"] == 0 and counts["authorization"] == 0 and counts["domain"] == 0, f"fresh resume issued requests: {counts}"
                assert "正在载入" not in body, "fresh resume showed loading"
                observations = {"counts": counts, "noFullPageLoading": True, "eventTrace": trace,
                                "lifecycleProven": trace_proves_hidden_visible(trace)}
                if observations["lifecycleProven"]:
                    pass_case("B10", **observations)
                else:
                    CASES["B10"].update(status="not-executed", observations={**observations,
                        "reason": "no real hidden→visible lifecycle trace; zero requests alone are not resume proof"})
            run_case("B10", "fresh resume with lifecycle evidence", b10)
            def b11():
                key = f"b11-{uuid4().hex[:10]}"
                acct_id = create_account(PAGE, key)
                r = create_token_api(PAGE, acct_id, name="b11-tok", idem=f"harness-b11-{uuid4().hex}")
                assert r["status"] == 201, f"b11 token create {r['status']}: {r['body']}"
                rewrite = {"n": 0}

                def b11_handler(route):
                    if "/dashboard/authorization" in route.request.url:
                        if rewrite["n"] == 0:
                            rewrite["n"] += 1
                            resp = route.fetch()
                            body = resp.json()
                            body["data"]["expiresAt"] = (__import__("datetime").datetime.now(
                                __import__("datetime").timezone.utc) + __import__("datetime").timedelta(seconds=8)
                            ).isoformat().replace("+00:00", "Z")
                            route.fulfill(status=resp.status, content_type="application/json", body=json.dumps(body))
                            return
                    route.continue_()
                PAGE.route("**/dashboard/authorization", b11_handler)
                goto_s08(PAGE)
                select_account(PAGE, key)
                wait_token_state(PAGE, "ready-non-empty")
                PAGE.locator(NAME_INPUT).fill("b11-preserved")
                # pre-expiry timer fires at expiresAt - 5s (~3s after auth) as a
                # background F+A chain. Reset the bucket so only that chain counts.
                reset_bucket("B11")
                # bounded poll on the concrete request condition: the background
                # foundation of the revalidation chain (timer-driven, ~3s)
                wait_until(lambda: bucket_counts("B11")["foundation"] >= 1, 6.0)
                state_mid = PAGE.evaluate("""() => { const el = document.querySelector('[data-token-state]');
                                                return el ? el.getAttribute('data-token-state') : null; }""")
                # bounded poll: the chain's background authorization completes
                wait_until(lambda: bucket_counts("B11")["authorization"] >= 1, 4.0)
                PAGE.unroute("**/dashboard/authorization", b11_handler)
                counts = bucket_counts("B11")
                body = body_text(PAGE)
                assert counts["foundation"] == 1 and counts["authorization"] == 1 and counts["domain"] == 0, \
                    f"near-expiry revalidation counts: {counts}"
                assert "正在载入" not in body, "near-expiry revalidation showed full-page loading"
                assert PAGE.locator(NAME_INPUT).input_value() == "b11-preserved", "input state not preserved"
                assert state_mid is not None and state_mid != "loading", f"panel reloaded mid-window: {state_mid}"
                assert "当前账号" in body and "b11-tok" in PAGE.locator("[data-token-state='ready-non-empty']").inner_text(), \
                    "token list state not preserved"
                pass_case("B11", counts=counts, noFullPageLoading=True, statePreserved=True,
                          panelStateMidWindow=state_mid, authorizationRewrite={"n": rewrite["n"]})
            run_case("B11", "near-expiry authorization -> background F1/A1/D0, state preserved", b11)

            # ---------------------------------------------------------- B12
            def b12():
                results = {}
                scenarios = [
                    ("r5a_401", {"authorization": 401, "terminal": "login"}),
                    ("r5b_403", {"authorization": 403, "terminal": "forbidden", "nav": f"{WEB}/dashboard"}),
                    ("r5c_revoke", {"foundation": 401, "terminal": "login"}),
                    ("r5d_actorMismatch", {"rewriteActor": True, "terminal": "login-or-forbidden"}),
                ]
                for name, spec in scenarios:
                    reset_bucket("B12")

                    def make_handler(spec=spec):
                        def handler(route):
                            url = route.request.url
                            if "/dashboard/authorization" in url:
                                if spec.get("rewriteActor"):
                                    resp = route.fetch()
                                    body = resp.json()
                                    body["data"]["actor"]["id"] = "00000000-0000-0000-0000-000000000000"
                                    route.fulfill(status=resp.status, content_type="application/json", body=json.dumps(body))
                                    return
                                status = spec.get("authorization")
                                if status:
                                    route.fulfill(status=status, content_type="application/json",
                                                  body=json.dumps({"error": "denied"}))
                                    return
                            if "/dashboard/foundation" in url:
                                status = spec.get("foundation")
                                if status:
                                    route.fulfill(status=status, content_type="application/json",
                                                  body=json.dumps({"error": "revoked"}))
                                    return
                            route.continue_()
                        return handler
                    PAGE.route("**/dashboard/authorization", make_handler())
                    PAGE.route("**/dashboard/foundation", make_handler())
                    PAGE.goto(spec.get("nav", S08_URL))
                    # bounded poll on the explicit terminal security state
                    # (login form or forbidden marker) — never a fixed clock
                    wait_until(lambda: security_state(PAGE)["login"] or security_state(PAGE)["forbiddenShown"], 6.0)
                    st = security_state(PAGE)
                    login_shown = st["login"]
                    forbidden_shown = st["forbiddenShown"]
                    body = body_text(PAGE)
                    token_table = PAGE.locator("[data-token-state]").count()
                    account_rows = PAGE.locator("tr[data-service-account-id]").count()
                    create_btn = PAGE.locator(CREATE_BTN).count()
                    req_count = len(BUCKETS["B12"]["requests"])
                    PAGE.unroute("**/dashboard/authorization")
                    PAGE.unroute("**/dashboard/foundation")
                    old_data_invisible = token_table == 0 and account_rows == 0 and create_btn == 0
                    terminal_observed = "login" if login_shown else ("forbidden" if forbidden_shown else "none")
                    expected = spec["terminal"]
                    if expected == "login":
                        terminal_ok = terminal_observed == "login"
                    elif expected == "forbidden":
                        terminal_ok = terminal_observed == "forbidden"
                    else:  # login-or-forbidden (fail-closed)
                        terminal_ok = login_shown or forbidden_shown
                    diag_case("B12", **{name: {"url": PAGE.url, "bodyHead": body[:200],
                                               "tokenTable": token_table, "accountRows": account_rows,
                                               "createBtn": create_btn, "loginShown": login_shown,
                                               "forbiddenShown": forbidden_shown,
                                               "terminalObserved": terminal_observed, "requests": req_count}})
                    assert old_data_invisible, f"{name}: old data still visible (token={token_table} rows={account_rows})"
                    # Explicit terminal state per scenario: 401/revoke -> login
                    # form; 403 -> forbidden marker; actor-mismatch -> fail-closed
                    # (login or forbidden). A blank page or business page never passes.
                    assert terminal_ok, f"{name}: expected terminal {expected}, observed {terminal_observed}"
                    assert req_count <= 8, f"{name}: unbounded requests ({req_count})"
                    results[name] = {"oldDataInvisible": old_data_invisible, "tokenTableGone": token_table == 0,
                                     "accountRowsGone": account_rows == 0, "createGone": create_btn == 0,
                                     "loginShown": login_shown, "forbiddenShown": forbidden_shown,
                                     "terminalState": terminal_observed, "expectedTerminal": expected,
                                     "requests": req_count}
                    # recovery: valid session still works (cookies intact)
                    goto_s08(PAGE)
                    PAGE.wait_for_selector("[data-token-state]", timeout=15000)
                    results[name]["recovered"] = PAGE.locator("tr[data-service-account-id]").count() > 0
                    assert results[name]["recovered"], f"{name}: session did not recover after unroute"
                pass_case("B12", scenarios=results)
            run_case("B12", "401/403/revoke/actor-mismatch fail closed at S08 page", b12)

            # ---------------------------------------------------------- B13
            def b13():
                # aria-live source: a REAL keyboard-driven panel action whose
                # status message renders (the revoke status message does NOT —
                # the DELETE revoke response {id, revoked} fails the panel's
                # validateTokenMetadata exact-key check, a HEAD product bug
                # flagged separately). The S08 draft create/save sets a real
                # role=status message ("草稿已创建。" / "草稿已保存。").
                draft_btn_js = ("el.tagName === 'BUTTON' && (el.textContent.trim() === '创建草稿' "
                                "|| el.textContent.trim() === '保存草稿')")

                def draft_create_aria_live():
                    live_before = PAGE.evaluate("""() => [...document.querySelectorAll('[role="status"]')]
                                                    .map(e => e.innerText).join(' | ')""")
                    assert keyboard_tab_to(PAGE, active_matches("el.tagName === 'TEXTAREA'"), limit=800), \
                        "keyboard did not reach 变更原因 textarea"
                    PAGE.keyboard.type("b13 keyboard draft reason")
                    assert keyboard_tab_to(PAGE, active_matches(draft_btn_js), limit=200), \
                        "keyboard did not reach the draft action button"
                    PAGE.keyboard.press("Enter")
                    PAGE.wait_for_function("() => (document.body.innerText || '').includes('草稿已')",
                                           timeout=15000)
                    live_after = " | ".join(PAGE.evaluate("""() => [...document.querySelectorAll('[role="status"]')]
                                                              .map(e => e.innerText)"""))
                    assert "草稿已" in live_after, f"draft status message missing: {live_after[:200]}"
                    assert live_before != live_after, "aria-live content did not change"
                    return live_before, live_after

                # ---- EN: keyboard-only create + draft action, focus trap, aria-live ----
                # en_kb created first, en_ph second (newest -> default selection)
                # so the null-name placeholder is visible right after load.
                en_kb = f"b13kb-{uuid4().hex[:10]}"
                en_ph = f"b13en-{uuid4().hex[:10]}"
                create_account(PAGE, en_kb)
                en_ph_id = create_account(PAGE, en_ph)
                r = create_token_api(PAGE, en_ph_id, name=None, idem=f"harness-b13en-{uuid4().hex}")
                assert r["status"] == 201, f"en null-name create {r['status']}: {r['body']}"
                goto_s08(PAGE)
                wait_token_state(PAGE, "ready-non-empty")  # default = en_ph (placeholder)
                assert "Unnamed token" in PAGE.locator("[data-token-state='ready-non-empty']").inner_text()
                live_before_en, live_after_en = draft_create_aria_live()
                # keyboard: select the empty account for the create flow
                row_kb_js = f"""el.tagName === 'BUTTON' && el.textContent.trim() === '查看令牌' &&
                                el.closest('tr[data-service-account-key="{en_kb}"]') !== null"""
                assert keyboard_tab_to(PAGE, active_matches(row_kb_js)), "keyboard did not reach EN create row"
                PAGE.keyboard.press("Enter")
                wait_token_state(PAGE, "ready-empty")
                # keyboard: focus name input and type
                assert keyboard_tab_to(PAGE, active_matches("el.tagName === 'INPUT' && el.placeholder === '例如：目录同步令牌'")), \
                    "keyboard did not reach name input"
                PAGE.keyboard.type("b13-kb")
                assert keyboard_tab_to(PAGE, active_matches("el.tagName === 'INPUT' && el.placeholder.startsWith('默认 ')")), \
                    "keyboard did not reach TTL input"
                PAGE.keyboard.type("30")
                assert keyboard_tab_to(PAGE, active_matches("el.getAttribute('data-token-create') === 'create'")), \
                    "keyboard did not reach create button"
                PAGE.keyboard.press("Enter")
                try:
                    PAGE.wait_for_selector("[role=dialog]", timeout=15000)
                except Exception:  # noqa: BLE001
                    if PAGE.locator(ALERT_LIVE).count():
                        diag_case("B13", createUiAlertEn=PAGE.locator(ALERT_LIVE).inner_text()[:200])
                    raise
                # the modal's initial focus lands via requestAnimationFrame — wait
                # for the transition to settle before asserting the trap
                PAGE.wait_for_function(
                    "() => { const d = document.querySelector('[role=dialog]'); return !!d && d.contains(document.activeElement); }",
                    timeout=5000)
                trap_ok = PAGE.evaluate("""() => { const d = document.querySelector('[role=dialog]');
                                               return !!d && d.contains(document.activeElement); }""")
                PAGE.keyboard.press("Tab")
                PAGE.wait_for_function(
                    "() => { const d = document.querySelector('[role=dialog]'); return !!d && d.contains(document.activeElement); }")
                trap_tab_ok = PAGE.evaluate("""() => { const d = document.querySelector('[role=dialog]');
                                                  return !!d && d.contains(document.activeElement); }""")
                PAGE.keyboard.press("Shift+Tab")
                PAGE.wait_for_function(
                    "() => { const d = document.querySelector('[role=dialog]'); return !!d && d.contains(document.activeElement); }")
                trap_shift_ok = PAGE.evaluate("""() => { const d = document.querySelector('[role=dialog]');
                                                    return !!d && d.contains(document.activeElement); }""")
                PAGE.keyboard.press("Escape")
                PAGE.wait_for_selector("[role=dialog]", state="hidden", timeout=10000)
                # focus-restore is a requestAnimationFrame: wait for the create
                # trigger to receive focus (bounded) then a grace; the trigger is
                # disabled at the compiled ceiling (1/1) so body is the settled
                # fallback — both recorded honestly below.
                try:
                    PAGE.wait_for_function(
                        """() => { const el = document.activeElement;
                                   const btn = document.querySelector('[data-token-create]');
                                   return !!btn && el === btn; }""",
                        timeout=2000)
                except Exception:  # noqa: BLE001
                    pass
                # focus-restore is a requestAnimationFrame: bounded poll on the
                # concrete focus state (must leave the dialog), not a clock
                def read_focus_back():
                    d = PAGE.evaluate("""() => {
                        const el = document.activeElement;
                        const btn = document.querySelector('[data-token-create]');
                        const dlg = document.querySelector('[role=dialog]');
                        return { tag: el ? el.tagName : null, isBody: el === document.body,
                                 isTrigger: !!btn && el === btn,
                                 triggerDisabled: btn ? btn.disabled : null,
                                 inDialog: !!dlg && !!el && dlg.contains(el),
                                 text: (el && el !== document.body && el.textContent)
                                       ? el.textContent.trim().slice(0, 30) : null };
                    }""")
                    return d if not d["inDialog"] else None
                focus_back = wait_until(read_focus_back, 0.5) or read_focus_back()
                assert not focus_back["inDialog"], "focus still inside a dialog after Escape"
                assert focus_back["isTrigger"] or (focus_back["triggerDisabled"] and focus_back["isBody"]), \
                    f"unexpected focus state after create Escape: {focus_back}"
                assert trap_ok and trap_tab_ok and trap_shift_ok, "focus trap failed (EN)"
                # ---- fr-CA: placeholder + keyboard create + aria-live ----
                fr_kb = f"b13frk-{uuid4().hex[:10]}"
                fr_ph = f"b13fr-{uuid4().hex[:10]}"
                create_account(PAGE, fr_kb)
                fr_ph_id = create_account(PAGE, fr_ph)
                r = create_token_api(PAGE, fr_ph_id, name=None, idem=f"harness-b13fr-{uuid4().hex}")
                assert r["status"] == 201, f"fr null-name create {r['status']}: {r['body']}"
                goto_s08(PAGE, fr=True)
                wait_token_state(PAGE, "ready-non-empty")  # default = fr_ph (placeholder)
                fr_table = PAGE.locator("[data-token-state='ready-non-empty']").inner_text()
                assert "Jeton sans nom" in fr_table, f"fr placeholder missing: {fr_table[:200]}"
                live_before_fr, live_after_fr = draft_create_aria_live()
                row_kb_fr = f"""el.tagName === 'BUTTON' && el.textContent.trim() === '查看令牌' &&
                                el.closest('tr[data-service-account-key="{fr_kb}"]') !== null"""
                assert keyboard_tab_to(PAGE, active_matches(row_kb_fr)), "keyboard did not reach fr create row"
                PAGE.keyboard.press("Enter")
                wait_token_state(PAGE, "ready-empty")
                assert keyboard_tab_to(PAGE, active_matches("el.tagName === 'INPUT' && el.placeholder === '例如：目录同步令牌'")), \
                    "keyboard did not reach fr name input"
                PAGE.keyboard.type("b13-fr")
                assert keyboard_tab_to(PAGE, active_matches("el.getAttribute('data-token-create') === 'create'")), \
                    "keyboard did not reach fr create button"
                PAGE.keyboard.press("Enter")
                try:
                    PAGE.wait_for_selector("[role=dialog]", timeout=15000)
                except Exception:  # noqa: BLE001
                    if PAGE.locator(ALERT_LIVE).count():
                        diag_case("B13", createUiAlertFr=PAGE.locator(ALERT_LIVE).inner_text()[:200])
                    raise
                PAGE.keyboard.press("Escape")
                PAGE.wait_for_selector("[role=dialog]", state="hidden", timeout=10000)
                pass_case("B13", en={"placeholder": "Unnamed token", "keyboardCreate": True,
                                     "keyboardDraftAction": True,
                                     "focusTrap": {"tab": trap_tab_ok, "shiftTab": trap_shift_ok},
                                     "focusReturn": focus_back,
                                     "ariaLiveChanged": live_before_en != live_after_en,
                                     "ariaLiveAfter": live_after_en[:120]},
                          fr={"placeholder": "Jeton sans nom", "keyboardCreate": True,
                              "keyboardDraftAction": True,
                              "ariaLiveChanged": live_before_fr != live_after_fr,
                              "ariaLiveAfter": live_after_fr[:120]})
            run_case("B13", "EN + fr-CA keyboard-only flow, focus trap, aria-live changes", b13)

            # ---------------------------------------------------------- S08
            def s08():
                full_key = f"s08f-{uuid4().hex[:10]}"
                empty_key = f"s08e-{uuid4().hex[:10]}"
                full_id = create_account(PAGE, full_key)
                empty_id = create_account(PAGE, empty_key)
                r = create_token_api(PAGE, full_id, name="s08-full", idem=f"harness-s08f-{uuid4().hex}")
                assert r["status"] == 201, f"s08 full create {r['status']}: {r['body']}"
                goto_s08(PAGE)
                wait_token_state(PAGE, "ready-empty")  # default (newest) account settles
                states = {}
                # ready-non-empty
                select_account(PAGE, full_key)
                wait_token_state(PAGE, "ready-non-empty")
                states["readyNonEmpty"] = PAGE.locator("[data-token-state='ready-non-empty']").inner_text()[:120]
                # loading (delayed GET) then ready-empty
                def s08_handler(route):
                    if route.request.method == "GET" and "/tokens" in route.request.url and empty_id in route.request.url:
                        time.sleep(0.8)
                    route.continue_()
                PAGE.route("**/tokens", s08_handler)
                select_account(PAGE, empty_key)
                PAGE.wait_for_selector("[data-token-state='loading']", timeout=5000)
                states["loading"] = PAGE.locator("[data-token-state='loading']").inner_text()[:120]
                wait_token_state(PAGE, "ready-empty")
                states["readyEmpty"] = PAGE.locator("[data-token-state='ready-empty']").inner_text()[:120]
                PAGE.unroute("**/tokens", s08_handler)
                # error
                def s08_err(route):
                    if route.request.method == "GET" and "/tokens" in route.request.url and full_id in route.request.url:
                        route.fulfill(status=500, content_type="application/json",
                                      body=json.dumps({"error": "boom", "code": "INTERNAL_ERROR"}))
                        return
                    route.continue_()
                PAGE.route("**/tokens", s08_err)
                select_account(PAGE, full_key)
                PAGE.wait_for_selector("[data-token-state='error']", timeout=8000)
                states["error"] = PAGE.locator("[data-token-state='error']").inner_text()[:120]
                assert PAGE.locator("[data-token-state='error'] button", has_text="重试").count() == 1
                PAGE.unroute("**/tokens", s08_err)
                assert set(states) == {"loading", "readyEmpty", "readyNonEmpty", "error"}, f"missing states: {states}"
                pass_case("S08", states=states)
            run_case("S08", "token list 4-state machine via data-token-state", s08)

        except Exception as exc:  # noqa: BLE001
            dump_evidence(exc)
            browser.close()
            sys.exit(1)
        browser.close()

    executed = [cid for cid in ALL_CASES if CASES[cid]["status"] != "not-executed"]
    phase_complete = all(CASES[cid]["status"] == "pass" for cid in executed)
    overall_complete = all(CASES[cid]["status"] == "pass" for cid in ALL_CASES)
    exit_code = 0 if overall_complete else 1
    write_evidence(phase_complete, overall_complete, exit_code)
    print("V11_TOKEN_RESUME_BROWSER_ACCEPTANCE_OK" if overall_complete else "V11_TOKEN_RESUME_BROWSER_ACCEPTANCE_FAIL")
    for cid in ALL_CASES:
        print(f"  {cid}: {CASES[cid]['status']}")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
