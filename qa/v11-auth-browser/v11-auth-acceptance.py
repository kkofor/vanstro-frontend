#!/usr/bin/env python3
"""V11-2 Dashboard Authentication & Session — real Backend browser acceptance.

Runs against a real VanStro API backed by a disposable PostgreSQL 16 database
with synthetic admin/customer actors (created by seed-v11-auth.mts). Records
raw/expected/unexpected console and request evidence, definition/harness
SHA-256 and the tested commit. Never uses real credentials or a persistent
database.

Session isolation: every case runs in its own fresh browser context (zero
cookies at start), so no identity's session can leak into another case — an
admin cookie from case 07 can never race the customer login in case 10.
Evidence is written while the browser and its contexts are still open so the
console/network recordings are complete and reliable; the browser is closed
only afterwards (finally).
"""
import json, hashlib, os, signal, sys, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-auth-browser"))
WEB = os.environ.get("V11_WEB", "http://127.0.0.1:4564")
API = os.environ.get("V11_API", "http://127.0.0.1:4565")
ADMIN_EMAIL = os.environ["V11_ADMIN_EMAIL"]
CUSTOMER_EMAIL = os.environ["V11_CUSTOMER_EMAIL"]
NODASH_EMAIL = os.environ["V11_NODASH_EMAIL"]
PARTIAL_EMAIL = os.environ["V11_PARTIAL_EMAIL"]
PASSWORD = os.environ["V11_SEED_PASSWORD"]
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "unknown")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "unknown")

OUT.mkdir(parents=True, exist_ok=True)
CASES = {}
console = []
requests = []
PAGE = None
CURRENT_CASE = None


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def case(case_id, label):
    CASES[case_id] = {"label": label, "status": "not-executed", "observations": []}


def pass_case(case_id, *observations):
    CASES[case_id].update(status="pass", observations=list(observations))


def fail_case(case_id, *observations):
    CASES[case_id].update(status="fail", observations=list(observations))
    raise AssertionError(f"{case_id} failed: {observations}")


def record(page, scope):
    def on_console(msg):
        if msg.type in ("error", "warning") or "uncaught" in msg.text.lower():
            console.append({"scope": scope, "type": msg.type, "text": msg.text[:400]})
    def on_request(req):
        if "/api/v1/" in req.url:
            requests.append({"scope": scope, "method": req.method, "url": req.url, "status": None})
    def on_response(resp):
        for entry in reversed(requests):
            if entry["scope"] == scope and entry["url"] == resp.url and entry["status"] is None:
                entry["status"] = resp.status
                break
    page.on("console", on_console)
    page.on("request", on_request)
    page.on("response", on_response)


def body_text(page):
    return page.locator("body").inner_text()


def settle_login(page):
    """Wait until the anonymous login surface resolves: the login form (email
    input) or a terminal state. Transitional status cards ("正在…" restoring /
    entering / logging out) are explicitly excluded so the wait cannot
    resolve on a state that is about to be replaced by the form."""
    page.wait_for_function(
        "() => document.querySelector('#dashboard-login-email') !== null || "
        "document.querySelector('[role=alert]') !== null || "
        "(() => { const cards = document.querySelectorAll('[role=status]'); "
        "return Array.from(cards).some((el) => !(el.innerText || '').includes('正在')); })()",
        timeout=20000)


def dashboard_api_calls(scope):
    return [r for r in requests if r["scope"] == scope and r["status"] is not None]


def login(page, email, password):
    page.fill("#dashboard-login-email", email)
    page.fill("#dashboard-login-password", password)
    page.click("button[type=submit]")


def open_user_menu(page):
    """V11-3: the single logout action lives in the user menu; open it so the
    logout menuitem is visible and reachable."""
    page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
    page.click("button[aria-label=用户菜单]")
    page.wait_for_selector("button[role=menuitem]", timeout=5000)


def close_user_menu(page):
    """Keyboard path: Escape closes the menu and returns focus to its trigger."""
    page.keyboard.press("Escape")
    page.wait_for_selector("button[role=menuitem]", state="detached", timeout=5000)


def write_evidence(error=None):
    evidence = {
        "testedCommit": TESTED_COMMIT,
        "testedTree": TESTED_TREE,
        "web": WEB,
        "api": API,
        "cases": CASES,
        "console": console,
        "requests": requests
    }
    if error is not None:
        body_snippet = ""
        url_snippet = None
        try:
            body_snippet = PAGE.locator("body").inner_text()[:400]
            url_snippet = PAGE.url
        except Exception as exc:  # noqa: BLE001 — evidence best effort
            body_snippet = f"<capture failed: {str(exc)[:200]}>"
        evidence.update({"url": url_snippet, "body": body_snippet, "error": str(error)[:2000]})
    else:
        evidence["harnessSha256"] = {
            "acceptance": sha(__file__),
            "seed": sha(HERE / "seed-v11-auth.mts"),
            "run": sha(HERE / "run-v11-auth.sh")
        }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "acceptance-results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))
    return evidence


def dump_evidence(error):
    # An abort inside a case (timeout, assertion outside fail_case, transport
    # error) must record that case as failed — never as not-executed — so the
    # evidence distinguishes "reached and failed" from "never reached".
    if CURRENT_CASE and CASES.get(CURRENT_CASE, {}).get("status") == "not-executed":
        CASES[CURRENT_CASE].update(status="fail", observations=[f"aborted: {str(error)[:300]}"])
    evidence = write_evidence(error)
    print(f"V11_AUTH_BROWSER_ERROR: {str(error)[:500]}")
    print(f"V11_AUTH_BROWSER_URL: {evidence.get('url')}")
    print(f"V11_AUTH_BROWSER_BODY: {evidence.get('body')!r}")


def main():
    case("01-anonymous-dashboard-login", "anonymous /dashboard renders the Dashboard login, no storefront chrome")
    case("02-anonymous-available-login", "anonymous available route renders login with zero business requests")
    case("03-anonymous-coming-soon-login", "anonymous coming-soon canonical route renders login")
    case("04-anonymous-fr-login", "anonymous /fr/dashboard renders login")
    case("05-login-form-semantics", "login form has labels, autocomplete, autofocus and no password echo")
    case("06-wrong-credentials", "wrong credentials show one generic enumeration-safe error")
    case("07-admin-login-returnTo", "admin login restores a legal returnTo after /auth/me + Foundation + Authorization")
    case("08-admin-overview", "admin login reaches the Overview shell with logout affordance")
    case("09-coming-soon-returnTo", "coming-soon returnTo stays coming-soon after login")
    case("10-customer-forbidden", "customer login is forbidden and never mounts the shell")
    case("11-nodash-admin-forbidden", "admin without dashboard.access is forbidden")
    case("12-logout", "logout clears local state and returns to the login page")
    case("13-session-expiry", "server-side session revocation surfaces expired login, no stale data")
    case("14-mobile-viewport", "mobile viewport renders the login and shell without horizontal overflow")
    case("15-unknown-returnTo-overview", "unknown explicit returnTo lands on the locale Overview after login, never a 404")
    case("16-explicit-returnTo", "explicit login returnTo query restores the known route with its query")
    case("17-explicit-fr-returnTo", "explicit fr login returnTo keeps the fr locale and route")
    case("18-explicit-coming-soon-returnTo", "explicit coming-soon returnTo shows the coming-soon page after login")
    case("19-explicit-external-returnTo", "encoded external returnTo falls back to the locale Overview, never leaves the site")
    case("20-explicit-denied-returnTo", "explicit returnTo to a denied module shows the forbidden state, no business panel")

    with sync_playwright() as p:
        browser = None
        try:
            browser = p.chromium.launch()

            # Every case owns a fresh context (zero cookies) and its own
            # recording scope: sessions cannot bleed between identities and
            # the evidence stays per-case. Contexts stay open until the
            # evidence file is written below.
            def open_case(case_id, viewport=None):
                global PAGE, CURRENT_CASE
                CURRENT_CASE = case_id
                context = browser.new_context(viewport=viewport or {"width": 1280, "height": 800})
                page = context.new_page()
                record(page, case_id)
                PAGE = page
                return page

            page = open_case("01-anonymous-dashboard-login")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            text = body_text(page)
            if "VanStro 管理后台" not in text or "登录" not in text:
                fail_case("01-anonymous-dashboard-login", text[:300])
            for storefront_marker in ["我的账户", "购物车", "联系我们"]:
                if storefront_marker in text:
                    fail_case("01-anonymous-dashboard-login", f"storefront chrome leaked: {storefront_marker}")
            pass_case("01-anonymous-dashboard-login", "login form rendered without storefront chrome")

            page = open_case("02-anonymous-available-login")
            page.goto(f"{WEB}/dashboard/orders?orderStatus=paid", wait_until="domcontentloaded")
            settle_login(page)
            text = body_text(page)
            if "登录" not in text:
                fail_case("02-anonymous-available-login", text[:300])
            business = [r for r in dashboard_api_calls("01-anonymous-dashboard-login") + dashboard_api_calls("02-anonymous-available-login")
                        if "/dashboard/" in r["url"] and "foundation" not in r["url"] and "authorization" not in r["url"]]
            if business:
                fail_case("02-anonymous-available-login", f"business requests fired while anonymous: {business}")
            pass_case("02-anonymous-available-login", "login shown, zero business requests")

            page = open_case("03-anonymous-coming-soon-login")
            page.goto(f"{WEB}/dashboard/audit", wait_until="domcontentloaded")
            settle_login(page)
            text = body_text(page)
            if "登录" not in text or "即将推出" in text:
                fail_case("03-anonymous-coming-soon-login", text[:300])
            pass_case("03-anonymous-coming-soon-login", "coming-soon URL renders login, not the shell")

            page = open_case("04-anonymous-fr-login")
            page.goto(f"{WEB}/fr/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            text = body_text(page)
            if "登录" not in text:
                fail_case("04-anonymous-fr-login", text[:300])
            pass_case("04-anonymous-fr-login", "fr login rendered")

            page = open_case("05-login-form-semantics")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            email_input = page.locator("#dashboard-login-email")
            password_input = page.locator("#dashboard-login-password")
            if not email_input.get_attribute("autocomplete") == "email":
                fail_case("05-login-form-semantics", "email autocomplete")
            if not password_input.get_attribute("autocomplete") == "current-password":
                fail_case("05-login-form-semantics", "password autocomplete")
            if not password_input.get_attribute("type") == "password":
                fail_case("05-login-form-semantics", "password type")
            if email_input.evaluate("el => el === document.activeElement") is not True:
                fail_case("05-login-form-semantics", "email autofocus")
            if not page.locator("label[for=dashboard-login-email]").count() or not page.locator("label[for=dashboard-login-password]").count():
                fail_case("05-login-form-semantics", "labels")
            pass_case("05-login-form-semantics", "labels/autocomplete/autofocus/password semantics verified")

            page = open_case("06-wrong-credentials")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, "wrong-password-1")
            page.wait_for_function("() => document.body.innerText.includes('邮箱或密码不正确')", timeout=10000)
            text = body_text(page)
            if "邮箱或密码不正确" not in text:
                fail_case("06-wrong-credentials", text[:300])
            pass_case("06-wrong-credentials", "generic error shown")

            # Admin login restores the legal returnTo (orders + orderStatus
            # query): the anonymous visit renders the login in place, so the
            # submit keeps the original business URL and the ready shell
            # mounts at that same URL (no client navigation needed).
            page = open_case("07-admin-login-returnTo")
            page.goto(f"{WEB}/dashboard/orders?orderStatus=paid", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(1000)
            text = body_text(page)
            if "退出登录" not in text or "VanStro 管理后台" not in text:
                fail_case("07-admin-login-returnTo", text[:400])
            if page.url.split("?")[0] not in (f"{WEB}/dashboard/orders/", f"{WEB}/dashboard/orders"):
                fail_case("07-admin-login-returnTo", f"unexpected URL after login: {page.url}")
            pass_case("07-admin-login-returnTo", "returnTo restored with the ready shell")

            page = open_case("08-admin-overview")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(800)
            text = body_text(page)
            if "退出登录" not in text:
                fail_case("08-admin-overview", text[:400])
            pass_case("08-admin-overview", "overview shell rendered")

            # Coming-soon returnTo: a fresh session logged in through the
            # coming-soon route stays on the coming-soon page.
            page = open_case("09-coming-soon-returnTo")
            page.goto(f"{WEB}/dashboard/audit", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.wait_for_function("() => document.body.innerText.includes('即将推出')", timeout=20000)
            page.wait_for_timeout(800)
            text = body_text(page)
            if "即将推出" not in text:
                fail_case("09-coming-soon-returnTo", text[:400])
            pass_case("09-coming-soon-returnTo", "coming-soon page shown after login")

            # Customer login → forbidden, never the shell. Fresh context:
            # no admin cookies can exist here.
            page = open_case("10-customer-forbidden")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, CUSTOMER_EMAIL, PASSWORD)
            page.wait_for_function("() => document.body.innerText.includes('没有后台访问权限')", timeout=20000)
            text = body_text(page)
            if "没有后台访问权限" not in text:
                fail_case("10-customer-forbidden", text[:400])
            if "退出登录" in text:
                fail_case("10-customer-forbidden", "business shell mounted for a customer")
            pass_case("10-customer-forbidden", "forbidden state, no business shell")

            # No-dashboard admin → forbidden too (own fresh context).
            page = open_case("11-nodash-admin-forbidden")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, NODASH_EMAIL, PASSWORD)
            page.wait_for_function("() => document.body.innerText.includes('没有后台访问权限')", timeout=20000)
            text = body_text(page)
            if "没有后台访问权限" not in text:
                fail_case("11-nodash-admin-forbidden", text[:400])
            pass_case("11-nodash-admin-forbidden", "forbidden state for admin without dashboard.access")

            # Logout from a live session clears local state regardless of network.
            page = open_case("12-logout")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(800)
            page.click("button[role=menuitem]")
            # The login form is the terminal logout state. The generic
            # settle_login cannot be used here: the mounted shell renders
            # role=status regions, so it would resolve before the async
            # logout transition (POST /auth/logout → session-changed →
            # foundation invalidate) renders the login page.
            page.wait_for_selector("#dashboard-login-email", timeout=20000)
            text = body_text(page)
            if "登录" not in text or "退出登录" in text:
                fail_case("12-logout", text[:400])
            pass_case("12-logout", "logout cleared state and returned to login")

            # Server-side session revocation → in-place business 401 clears the
            # session and surfaces the expired login; no stale data remains.
            page = open_case("13-session-expiry")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(800)
            cookies = page.context.cookies(WEB)
            session_cookie = next((c for c in cookies if "session" in c["name"]), None)
            if not session_cookie:
                fail_case("13-session-expiry", "session cookie not found")
            req = urllib.request.Request(
                f"{API}/api/v1/auth/logout-all",
                data=b"{}",
                headers={"Content-Type": "application/json", "Cookie": f"{session_cookie['name']}={session_cookie['value']}"},
                method="POST")
            try:
                urllib.request.urlopen(req)
            except urllib.error.HTTPError:
                pass
            # Client-side navigation to a business module: its 401 clears the
            # session snapshot and the shell renders the expired login in place.
            # Role-based selector scoped to the sidebar nav: the app runs
            # trailingSlash: true, so nav anchors render as /dashboard/products/
            # — never match an exact non-slash href. (The overview panel also
            # links to 产品, hence the nav scoping.)
            page.get_by_role("navigation", name="管理后台主要导航").get_by_role("link", name="产品", exact=True).click()
            page.wait_for_function("() => document.body.innerText.includes('会话已过期')", timeout=20000)
            text = body_text(page)
            if "会话已过期" not in text:
                fail_case("13-session-expiry", text[:400])
            # The user menu was opened as the ready-shell proof; close it via
            # Escape (keyboard path) so the stale-shell assertion below cannot
            # false-positive on the menu's own logout item.
            close_user_menu(page)
            text = body_text(page)
            if "退出登录" in text:
                fail_case("13-session-expiry", "stale business shell remained after expiry")
            # Case 13 continues: the expired notice is persisted (tab-scoped,
            # short TTL) and must survive a route remount — a fresh shell
            # instance on another module — and a full reload within the TTL.
            page.goto(f"{WEB}/dashboard/", wait_until="domcontentloaded")
            page.wait_for_function("() => document.body.innerText.includes('会话已过期')", timeout=20000)
            text = body_text(page)
            if "会话已过期" not in text or "退出登录" in text:
                fail_case("13-session-expiry", f"notice lost after route remount: {text[:400]}")
            page.reload(wait_until="domcontentloaded")
            page.wait_for_function("() => document.body.innerText.includes('会话已过期')", timeout=20000)
            text = body_text(page)
            if "会话已过期" not in text or "退出登录" in text:
                fail_case("13-session-expiry", f"notice lost after reload: {text[:400]}")
            # Only a successful re-login clears the notice and restores the
            # ready shell.
            page.wait_for_selector("#dashboard-login-email", timeout=20000)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.wait_for_function("() => document.body.innerText.includes('已就绪') && !document.body.innerText.includes('会话已过期')", timeout=20000)
            pass_case("13-session-expiry", "expired notice shown, survives remount + reload, cleared by re-login")

            # The real API enforces an auth rate limit (10 logins / 15 min
            # per IP) in its in-process bucket; the 20-case matrix performs
            # 16 logins (including the case-13 re-login after the server-side
            # revocation), so after case 13 (the 8th login) the matrix
            # restarts the API once to reset the bucket. Sessions live in the
            # DB, so the restart invalidates nothing; the run script's
            # watchdog relaunches the API. The restart is verified in two
            # phases: the API must actually go DOWN (proving the SIGTERM
            # landed and the old in-process bucket is gone — a silent kill
            # failure used to slip through because the health loop returned
            # immediately on the still-alive old instance and the matrix
            # walked straight into the 11th-login 429), then come back UP.
            # Any failure here aborts loudly with diagnostics instead of
            # masquerading as a browser-side login failure. The 429 on the
            # 11th login is real production behavior — the restart is
            # harness-environment management, not a product change.
            api_pid = os.environ.get("V11_API_PID")
            api_health = os.environ.get("V11_API_HEALTH")
            if api_pid and api_health:
                import subprocess
                listeners = subprocess.run(
                    ["lsof", "-tiTCP:" + API.split(":")[-1], "-sTCP:LISTEN"],
                    capture_output=True, text=True).stdout.split()
                targets = [int(pid) for pid in listeners if pid.strip().isdigit()]
                if not targets:
                    # The API is launched through a pnpm/tsx chain whose
                    # parent shell PID is not the port owner; fall back to
                    # the recorded PID, and the SIGKILL pass below still
                    # clears the port owner if the graceful kill stalls.
                    targets = [int(api_pid)]

                def api_reachable():
                    try:
                        urllib.request.urlopen(api_health, timeout=0.5)
                        return True
                    except Exception:
                        return False

                for pid in targets:
                    try:
                        os.kill(pid, signal.SIGTERM)
                    except OSError:
                        pass
                down = False
                for _ in range(20):  # graceful shutdown grace, ~10s
                    if not api_reachable():
                        down = True
                        break
                    time.sleep(0.5)
                if not down:
                    for pid in targets:
                        try:
                            os.kill(pid, signal.SIGKILL)
                        except OSError:
                            pass
                    for _ in range(20):
                        if not api_reachable():
                            down = True
                            break
                        time.sleep(0.5)
                if not down:
                    raise RuntimeError(
                        "restart_api: API never went down after SIGTERM/SIGKILL; "
                        f"rate-limit bucket cannot reset before the 11th login (targets={targets})")
                up = False
                for _ in range(120):  # watchdog relaunch, up to ~60s
                    if api_reachable():
                        up = True
                        break
                    time.sleep(0.5)
                if not up:
                    raise RuntimeError("restart_api: API did not come back up after the restart")

            # Mobile viewport sanity (own context).
            page = open_case("14-mobile-viewport", viewport={"width": 390, "height": 844})
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            if overflow:
                fail_case("14-mobile-viewport", "horizontal overflow on login")
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(800)
            overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            if overflow:
                fail_case("14-mobile-viewport", "horizontal overflow on shell")
            pass_case("14-mobile-viewport", "mobile login + shell render without overflow")

            # Unknown explicit returnTo → the locale Overview after login,
            # never a 404: the two-layer adjudication (input safety +
            # V11-1 Authority resolver) classifies the unknown route and
            # the login navigates to /dashboard.
            page = open_case("15-unknown-returnTo-overview")
            page.goto(f"{WEB}/dashboard/login?returnTo=%2Fdashboard%2Fnot-a-real-route", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(1000)
            text = body_text(page)
            if "退出登录" not in text:
                fail_case("15-unknown-returnTo-overview", text[:400])
            if page.url.split("?")[0] not in (f"{WEB}/dashboard/", f"{WEB}/dashboard"):
                fail_case("15-unknown-returnTo-overview", f"unknown returnTo did not land on Overview: {page.url}")
            if "404" in text or "无法找到" in text:
                fail_case("15-unknown-returnTo-overview", f"unknown returnTo landed on a 404: {text[:400]}")
            pass_case("15-unknown-returnTo-overview", "unknown returnTo resolved to the Overview shell")

            # Explicit encoded returnTo (orders + orderStatus query) is
            # decoded once, passes both layers and is restored verbatim.
            page = open_case("16-explicit-returnTo")
            page.goto(f"{WEB}/dashboard/login?returnTo=%2Fdashboard%2Forders%3ForderStatus%3Dpaid", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(1000)
            if page.url.split("?")[0] not in (f"{WEB}/dashboard/orders/", f"{WEB}/dashboard/orders"):
                fail_case("16-explicit-returnTo", f"explicit returnTo not restored: {page.url}")
            if "orderStatus=paid" not in page.url:
                fail_case("16-explicit-returnTo", f"explicit returnTo lost its query: {page.url}")
            pass_case("16-explicit-returnTo", "explicit returnTo restored with its query")

            # The /fr login page keeps the fr locale and route through the
            # same two layers.
            page = open_case("17-explicit-fr-returnTo")
            page.goto(f"{WEB}/fr/dashboard/login?returnTo=%2Ffr%2Fdashboard%2Forders%3ForderStatus%3Dpaid", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(1000)
            if page.url.split("?")[0] not in (f"{WEB}/fr/dashboard/orders/", f"{WEB}/fr/dashboard/orders"):
                fail_case("17-explicit-fr-returnTo", f"fr explicit returnTo not restored: {page.url}")
            if "orderStatus=paid" not in page.url:
                fail_case("17-explicit-fr-returnTo", f"fr explicit returnTo lost its query: {page.url}")
            pass_case("17-explicit-fr-returnTo", "fr explicit returnTo restored with locale and query")

            # Explicit coming-soon returnTo stays on the coming-soon page
            # after login (the shell's own adjudication, never a business
            # panel).
            page = open_case("18-explicit-coming-soon-returnTo")
            page.goto(f"{WEB}/dashboard/login?returnTo=%2Fdashboard%2Faudit", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.wait_for_function("() => document.body.innerText.includes('即将推出')", timeout=20000)
            page.wait_for_timeout(800)
            text = body_text(page)
            if "即将推出" not in text:
                fail_case("18-explicit-coming-soon-returnTo", text[:400])
            pass_case("18-explicit-coming-soon-returnTo", "explicit coming-soon returnTo shown after login")

            # Encoded external returnTo (protocol-relative) is rejected by
            # the input layer: the login never navigates off-site and falls
            # back to the locale Overview.
            page = open_case("19-explicit-external-returnTo")
            page.goto(f"{WEB}/dashboard/login?returnTo=%2F%2Fevil.example%2Fdashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_user_menu(page)
            page.wait_for_timeout(1000)
            if not page.url.startswith(f"{WEB}/dashboard"):
                fail_case("19-explicit-external-returnTo", f"external returnTo escaped the site: {page.url}")
            if page.url.split("?")[0] not in (f"{WEB}/dashboard/", f"{WEB}/dashboard"):
                fail_case("19-explicit-external-returnTo", f"external returnTo did not fall back to Overview: {page.url}")
            pass_case("19-explicit-external-returnTo", "external returnTo fell back to Overview, same origin")

            # Known available + deny: the partial admin (dashboard.access
            # only) logs in through an explicit orders returnTo; the ready
            # shell renders the forbidden state for the module and never
            # mounts a business panel.
            page = open_case("20-explicit-denied-returnTo")
            page.goto(f"{WEB}/dashboard/login?returnTo=%2Fdashboard%2Forders", wait_until="domcontentloaded")
            settle_login(page)
            login(page, PARTIAL_EMAIL, PASSWORD)
            page.wait_for_function("() => document.body.innerText.includes('没有此页面的读取权限')", timeout=20000)
            page.wait_for_timeout(800)
            text = body_text(page)
            if "没有此页面的读取权限" not in text:
                fail_case("20-explicit-denied-returnTo", text[:400])
            # The forbidden page lives inside the shell: the user menu (with
            # its logout action) must be reachable — the logout item only
            # exists once the menu is opened (V11-3 single-action menu).
            open_user_menu(page)
            if page.get_by_role("menuitem", name="退出登录").count() != 1:
                fail_case("20-explicit-denied-returnTo", "denied module never mounts the shell with logout")
            pass_case("20-explicit-denied-returnTo", "denied module shows the forbidden state, no business panel")

            # Evidence is written while every context is still open so the
            # console/network recordings are complete and reliable.
            write_evidence()
        except Exception as error:  # noqa: BLE001 — matrix must report raw evidence
            dump_evidence(error)
            raise
        finally:
            if browser is not None:
                browser.close()

    # Console/network evidence must be clean except:
    # 1. the intended 401s from the anonymous restore and the deliberate
    #    session revocation ("Failed to load resource" + 401 texts), and
    # 2. the Next.js dev-mode Image aspect-ratio advisory for the product
    #    logo (vanstro-logo.png: "has either width or height modified, but
    #    not the other"). That warning is a dev-only heuristic emitted by
    #    next/image about the logo sizing CSS; it never appears in
    #    production builds, carries no auth/session behavior, and is out of
    #    scope for this harness. Everything else (errors, uncaught
    #    exceptions, any other warning) still fails the gate.
    def benign_console(entry):
        text = entry["text"]
        if "Failed to load resource" in text or "401" in text:
            return True
        if "has either width or height modified, but not the other" in text:
            return True
        return False

    unexpected_console = [c for c in console if not benign_console(c)]
    failed = [c for c in CASES.values() if c["status"] != "pass"]
    print(f"V11_AUTH_BROWSER: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
    if failed:
        for c in failed:
            print(f"FAILED {c['label']}: {c['observations']}")
        sys.exit(1)
    if unexpected_console:
        print(f"UNEXPECTED_CONSOLE: {unexpected_console}")
        sys.exit(1)
    print("V11_AUTH_BROWSER_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
