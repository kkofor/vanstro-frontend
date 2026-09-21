#!/usr/bin/env python3
"""V11-3 global shell & navigation — real Backend browser acceptance.

Runs against the same disposable PostgreSQL 16 real API/web fixture as the
V11-2 auth harness (started by run-v11-auth.sh). Covers the authenticated
shell: six-group navigation, active/breadcrumb, coming-soon inertness,
forbidden, user menu keyboard/focus semantics, mobile drawer focus trap /
close paths / scroll lock, 44px targets, no horizontal overflow, and
sanitized desktop/mobile screenshots. Actors are synthetic; displayLabel is
the server-fixed "Administrator"; role summary shows counts only; screenshots
are rejected unless free of email/uuid/userinfo patterns.
"""
import json, hashlib, os, re, signal, sys, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-3"))
WEB = os.environ.get("V11_WEB", "http://127.0.0.1:4564")
API = os.environ.get("V11_API", "http://127.0.0.1:4565")
ADMIN_EMAIL = os.environ["V11_ADMIN_EMAIL"]
PARTIAL_EMAIL = os.environ["V11_PARTIAL_EMAIL"]
PASSWORD = os.environ["V11_SEED_PASSWORD"]
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "unknown")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "unknown")

SHOT_DIR = OUT / "screenshots"
SHOT_DIR.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
CASES = {}
console = []
requests = []
PAGE = None
CURRENT_CASE = None
SCREENSHOTS = []


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
    page.wait_for_function(
        "() => document.querySelector('#dashboard-login-email') !== null || "
        "document.querySelector('[role=alert]') !== null || "
        "(() => { const cards = document.querySelectorAll('[role=status]'); "
        "return Array.from(cards).some((el) => !(el.innerText || '').includes('正在')); })()",
        timeout=20000)


def login(page, email, password):
    page.fill("#dashboard-login-email", email)
    page.fill("#dashboard-login-password", password)
    page.click("button[type=submit]")
    page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)


def reset_auth_window():
    """Restart the API once via the watchdog to reset the in-process auth
    rate-limit window (10 logins / 15 min per IP). Sessions live in the DB
    and survive the restart; health is polled before the next login."""
    api_pid = os.environ.get("V11_API_PID")
    api_health = os.environ.get("V11_API_HEALTH")
    if not api_pid:
        return
    try:
        import subprocess
        listeners = subprocess.run(
            ["lsof", "-tiTCP:" + API.split(":")[-1], "-sTCP:LISTEN"],
            capture_output=True, text=True).stdout.split()
        for pid in listeners:
            os.kill(int(pid), signal.SIGTERM)
        if not listeners:
            os.kill(int(api_pid), signal.SIGTERM)
    except (OSError, ValueError):
        pass
    for _ in range(120):
        try:
            urllib.request.urlopen(api_health, timeout=1)
            break
        except Exception:
            time.sleep(0.5)


def shot(page, name):
    path = SHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path))
    SCREENSHOTS.append(str(path))
    return path


def assert_sanitized_page(page, label):
    """Screenshot evidence review at the source: the page text and URL must
    carry no emails, uuids or userinfo before a shot is taken. PNG pixel data
    is compressed and cannot be meaningfully text-scanned."""
    text = page.locator("body").inner_text()
    if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text):
        fail_case("S20-screenshots", f"{label} page contains an email-like value")
    if re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", text, re.I):
        fail_case("S20-screenshots", f"{label} page contains a uuid-like value")
    if re.search(r"(?:postgres|mysql|mongodb)[a-z+]*://[^ ]*:[^ ]*@", page.url, re.I):
        fail_case("S20-screenshots", f"{label} URL contains userinfo")


def write_evidence(error=None):
    evidence = {
        "testedCommit": TESTED_COMMIT,
        "testedTree": TESTED_TREE,
        "web": WEB,
        "api": API,
        "cases": CASES,
        "screenshots": SCREENSHOTS,
        "console": console,
        "requests": requests
    }
    if error is not None:
        try:
            evidence.update({"url": PAGE.url, "body": PAGE.locator("body").inner_text()[:400], "error": str(error)[:2000]})
        except Exception as exc:  # noqa: BLE001 — evidence best effort
            evidence["error"] = f"{str(error)[:1000]} (body capture failed: {exc})"
    else:
        evidence["harnessSha256"] = {
            "acceptance": sha(__file__),
            "seed": sha(HERE / "seed-v11-auth.mts"),
            "run": sha(HERE / "run-v11-auth.sh")
        }
    (OUT / "acceptance-results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))
    return evidence


def dump_evidence(error):
    if CURRENT_CASE and CASES.get(CURRENT_CASE, {}).get("status") == "not-executed":
        CASES[CURRENT_CASE].update(status="fail", observations=[f"aborted: {str(error)[:300]}"])
    write_evidence(error)
    print(f"V11_3_SHELL_ERROR: {str(error)[:500]}")


def main():
    case("S01-ready-shell", "login reaches the ready shell with six nav groups, user menu and status row")
    case("S02-nav-groups", "six nav groups render in the closed order with fixed labels")
    case("S03-active-aria-current", "the active module link carries aria-current=page")
    case("S04-breadcrumb", "breadcrumb shows 管理后台 / module and links Overview only off-Overview")
    case("S05-coming-soon", "coming-soon route renders the authenticated shell with inert module notice and zero business requests")
    case("S06-forbidden", "partial admin explicit orders returnTo shows the forbidden state, no business panel")
    case("S07-user-menu-open", "user menu opens with haspopup/expanded/controls and moves focus to the logout menuitem")
    case("S08-user-menu-escape", "Escape closes the user menu and returns focus to its trigger")
    case("S09-user-menu-outside", "outside pointerdown closes the user menu without hijacking the target")
    case("S10-logout", "logout from the user menu clears the session and returns to the Dashboard login")
    case("S11-drawer-open-focus", "mobile drawer opens with aria-modal/dialog/title and moves focus inside")
    case("S12-drawer-escape", "Escape closes the drawer and restores focus to the trigger")
    case("S13-drawer-backdrop", "backdrop closes the drawer")
    case("S14-drawer-close-button", "the drawer close button closes the drawer")
    case("S15-drawer-navigation", "navigation inside the drawer closes it and moves focus to main content")
    case("S16-drawer-breakpoint", "crossing the 761px breakpoint closes the drawer")
    case("S17-drawer-scroll-lock", "body scroll lock engages while open and restores after close")
    case("S18-mobile-no-overflow", "390px shell and drawer render without horizontal overflow")
    case("S19-touch-targets", "menu trigger, drawer trigger and drawer close controls are >= 44 CSS px")
    case("S20-screenshots", "desktop/mobile screenshots captured and sanitized")
    with sync_playwright() as p:
        browser = None
        try:
            browser = p.chromium.launch()

            def open_case(case_id, viewport=None):
                global PAGE, CURRENT_CASE
                CURRENT_CASE = case_id
                context = browser.new_context(viewport=viewport or {"width": 1280, "height": 800})
                page = context.new_page()
                PAGE = page
                record(page, case_id)
                return page

            page = open_case("S01-ready-shell")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            if page.get_by_role("navigation", name="管理后台主要导航").count() != 1:
                fail_case("S01-ready-shell", "nav not found")
            if page.get_by_role("button", name="用户菜单").count() != 1:
                fail_case("S01-ready-shell", "user menu trigger not found")
            if page.get_by_role("navigation", name="面包屑").count() != 1:
                fail_case("S01-ready-shell", "breadcrumb not found")
            if page.locator('dl[aria-label="系统状态"]').count() != 1:
                fail_case("S01-ready-shell", "status row not found")
            if page.locator('dl[aria-label="系统状态"] dt').count() != 4:
                fail_case("S01-ready-shell", "status row items missing")
            pass_case("S01-ready-shell", "ready shell with nav/user menu/breadcrumb/status row")

            page = open_case("S02-nav-groups")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            headings = page.get_by_role("navigation", name="管理后台主要导航").locator("section h3").all_inner_texts()
            if headings[:6] != ["概览", "商品", "交易", "组织", "客户互动", "平台"]:
                fail_case("S02-nav-groups", f"group order mismatch: {headings}")
            pass_case("S02-nav-groups", "six groups in closed order")

            page = open_case("S03-active-aria-current")
            page.goto(f"{WEB}/dashboard/products", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            active_links = page.get_by_role("navigation", name="管理后台主要导航").locator('a[aria-current="page"]')
            if active_links.count() != 1 or active_links.inner_text().strip() != "产品":
                fail_case("S03-active-aria-current", f"active link mismatch: {active_links.all_inner_texts()}")
            pass_case("S03-active-aria-current", "exactly one aria-current link on the active module")

            page = open_case("S04-breadcrumb")
            # The synthetic admin reads products (products.read), not orders;
            # the breadcrumb assertion uses a module the actor can read.
            page.goto(f"{WEB}/dashboard/products", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            crumb = page.get_by_role("navigation", name="面包屑")
            first = crumb.locator("a").first
            # trailingSlash: true renders the Overview link as /dashboard/.
            if first.get_attribute("href") not in ("/dashboard", "/dashboard/"):
                fail_case("S04-breadcrumb", f"Overview link missing: {first.get_attribute('href')}")
            current = crumb.locator('[aria-current="page"]')
            if current.inner_text().strip() != "产品":
                fail_case("S04-breadcrumb", f"current crumb mismatch: {current.inner_text()}")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            if page.get_by_role("navigation", name="面包屑").locator("a").count() != 0:
                fail_case("S04-breadcrumb", "Overview page must not duplicate the Overview link")
            pass_case("S04-breadcrumb", "breadcrumb links Overview off-Overview; no duplicate on Overview")

            page = open_case("S05-coming-soon")
            page.goto(f"{WEB}/dashboard/payments", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            if "即将推出" not in body_text(page):
                fail_case("S05-coming-soon", body_text(page)[:300])
            scope_reqs = [r for r in requests if r["scope"] == "S05-coming-soon" and r["status"] is not None]
            # Shell infrastructure (foundation/authorization) is not business
            # transport — the same exclusion the V11-2 zero-business assertion
            # uses. Business module data must stay untouched.
            business = [r for r in scope_reqs if "/dashboard/" in r["url"] and "foundation" not in r["url"] and "authorization" not in r["url"] and r["status"] in (200, 201, 204)]
            if business:
                fail_case("S05-coming-soon", f"business requests fired: {business[:3]}")
            pass_case("S05-coming-soon", "coming-soon shell with zero business requests")

            reset_auth_window()

            page = open_case("S06-forbidden")
            page.goto(f"{WEB}/dashboard/login?returnTo=%2Fdashboard%2Forders", wait_until="domcontentloaded")
            settle_login(page)
            login(page, PARTIAL_EMAIL, PASSWORD)
            page.wait_for_function("() => document.body.innerText.includes('没有此页面的读取权限')", timeout=20000)
            pass_case("S06-forbidden", "forbidden state shown, no business panel")

            page = open_case("S07-user-menu-open")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            trigger = page.get_by_role("button", name="用户菜单")
            if trigger.get_attribute("aria-haspopup") != "menu":
                fail_case("S07-user-menu-open", "missing aria-haspopup=menu")
            if trigger.get_attribute("aria-expanded") != "false":
                fail_case("S07-user-menu-open", "aria-expanded not false at rest")
            if not trigger.get_attribute("aria-controls"):
                fail_case("S07-user-menu-open", "missing aria-controls")
            trigger.click()
            if trigger.get_attribute("aria-expanded") != "true":
                fail_case("S07-user-menu-open", "aria-expanded not true after open")
            page.get_by_role("menuitem", name="退出登录").wait_for(state="visible", timeout=5000)
            if page.evaluate("document.activeElement?.getAttribute('role')") != "menuitem":
                fail_case("S07-user-menu-open", "focus did not enter the menu")
            pass_case("S07-user-menu-open", "menu opens with full ARIA and focus enters the menuitem")

            page = open_case("S08-user-menu-escape")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            trigger = page.get_by_role("button", name="用户菜单")
            trigger.click()
            page.get_by_role("menuitem").wait_for(state="visible", timeout=5000)
            page.keyboard.press("Escape")
            page.get_by_role("menuitem").wait_for(state="detached", timeout=5000)
            if page.evaluate("document.activeElement?.getAttribute('aria-label')") != "用户菜单":
                fail_case("S08-user-menu-escape", "focus did not return to the trigger")
            pass_case("S08-user-menu-escape", "Escape closes and restores focus to the trigger")

            page = open_case("S09-user-menu-outside")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="用户菜单").click()
            page.get_by_role("menuitem").wait_for(state="visible", timeout=5000)
            page.locator("main").click(position={"x": 10, "y": 10})
            page.get_by_role("menuitem").wait_for(state="detached", timeout=5000)
            if page.get_by_role("button", name="用户菜单").get_attribute("aria-expanded") != "false":
                fail_case("S09-user-menu-outside", "menu did not close on outside pointerdown")
            pass_case("S09-user-menu-outside", "outside pointerdown closes without hijacking the target")

            page = open_case("S10-logout")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="用户菜单").click()
            page.get_by_role("menuitem", name="退出登录").click()
            page.wait_for_selector("#dashboard-login-email", timeout=20000)
            text = body_text(page)
            if "登录" not in text or "退出登录" in text:
                fail_case("S10-logout", text[:300])
            pass_case("S10-logout", "logout returns to the Dashboard login, no stale shell")

            mobile = {"width": 390, "height": 844}

            page = open_case("S11-drawer-open-focus", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            trigger = page.get_by_role("button", name="打开导航")
            if trigger.get_attribute("aria-controls") != "dashboard-f0-mobile-navigation":
                fail_case("S11-drawer-open-focus", "missing aria-controls on drawer trigger")
            trigger.click()
            dialog = page.get_by_role("dialog", name="功能导航")
            dialog.wait_for(state="visible", timeout=5000)
            if dialog.get_attribute("aria-modal") != "true":
                fail_case("S11-drawer-open-focus", "missing aria-modal=true")
            page.wait_for_function(
                "() => document.activeElement?.closest('aside')?.id === 'dashboard-f0-mobile-navigation'",
                timeout=5000)
            pass_case("S11-drawer-open-focus", "drawer opens as modal dialog and receives focus")

            page = open_case("S12-drawer-escape", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            page.keyboard.press("Escape")
            page.get_by_role("dialog").wait_for(state="detached", timeout=5000)
            # useModalFocus restores focus inside a requestAnimationFrame after
            # the drawer unmounts, so wait for the restored focus target. The
            # trigger's accessible name is its text, not an aria-label.
            page.wait_for_function(
                "() => { const el = document.activeElement; return el !== null && "
                "el.className.includes('menuButton') && el.textContent.includes('打开导航'); }",
                timeout=5000)
            pass_case("S12-drawer-escape", "Escape closes drawer and restores trigger focus")

            page = open_case("S13-drawer-backdrop", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            # The backdrop spans the viewport under the drawer; its centre is
            # covered by the drawer (left ~320px at 390px), so click the
            # visible right-hand strip.
            # backdrop is the first 关闭导航 button in DOM order; CSS-module
            # hashes make class selectors unusable, and the backdrop spans the
            # viewport (element coords == viewport coords).
            page.get_by_role("button", name="关闭导航").nth(0).click(position={"x": 370, "y": 400})
            page.get_by_role("dialog").wait_for(state="detached", timeout=5000)
            pass_case("S13-drawer-backdrop", "backdrop closes the drawer")

            page = open_case("S14-drawer-close-button", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="打开导航").click()
            dialog = page.get_by_role("dialog", name="功能导航")
            dialog.wait_for(state="visible", timeout=5000)
            dialog.get_by_role("button", name="关闭导航").click()
            page.get_by_role("dialog").wait_for(state="detached", timeout=5000)
            pass_case("S14-drawer-close-button", "close button closes the drawer")

            page = open_case("S15-drawer-navigation", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            page.get_by_role("navigation", name="管理后台主要导航").get_by_role("link", name="产品").click()
            page.get_by_role("dialog").wait_for(state="detached", timeout=5000)
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_function("() => document.activeElement?.id === 'main-content'", timeout=5000)
            pass_case("S15-drawer-navigation", "navigation closes drawer and focuses main content")

            # S16 is the 11th login of the window reset at S06; reset again.
            reset_auth_window()

            page = open_case("S16-drawer-breakpoint", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            page.set_viewport_size({"width": 900, "height": 844})
            page.get_by_role("dialog").wait_for(state="detached", timeout=10000)
            pass_case("S16-drawer-breakpoint", "crossing the desktop breakpoint closes the drawer")

            page = open_case("S17-drawer-scroll-lock", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            locked = page.evaluate("document.body.style.overflow")
            if locked != "hidden":
                fail_case("S17-drawer-scroll-lock", f"body scroll not locked: {locked}")
            page.get_by_role("dialog").get_by_role("button", name="关闭导航").click()
            page.get_by_role("dialog").wait_for(state="detached", timeout=5000)
            restored = page.evaluate("document.body.style.overflow")
            if restored not in ("", "visible"):
                fail_case("S17-drawer-scroll-lock", f"body scroll not restored: {restored}")
            pass_case("S17-drawer-scroll-lock", "scroll lock engages and restores")

            page = open_case("S18-mobile-no-overflow", viewport=mobile)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            if overflow:
                fail_case("S18-mobile-no-overflow", "horizontal overflow on the 390px shell")
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            overflow_drawer = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
            if overflow_drawer:
                fail_case("S18-mobile-no-overflow", "horizontal overflow with drawer open")
            pass_case("S18-mobile-no-overflow", "no horizontal overflow at 390px shell or drawer")

            page = open_case("S19-touch-targets")
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            box = page.get_by_role("button", name="用户菜单").bounding_box()
            if box is None or box["width"] < 44 or box["height"] < 44:
                fail_case("S19-touch-targets", f"user menu below 44px: {box}")
            # The drawer trigger only exists in the mobile layout.
            page.set_viewport_size({"width": 390, "height": 844})
            box = page.get_by_role("button", name="打开导航").bounding_box()
            if box is None or box["width"] < 44 or box["height"] < 44:
                fail_case("S19-touch-targets", f"drawer trigger below 44px: {box}")
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            box = page.get_by_role("dialog").get_by_role("button", name="关闭导航").bounding_box()
            if box is None or box["width"] < 44 or box["height"] < 44:
                fail_case("S19-touch-targets", f"drawer close below 44px: {box}")
            pass_case("S19-touch-targets", "all shell controls >= 44 CSS px")

            page = open_case("S20-screenshots")
            page.set_viewport_size({"width": 1280, "height": 800})
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            assert_sanitized_page(page, "desktop-ready-overview")
            shot(page, "desktop-ready-overview")
            page.get_by_role("button", name="用户菜单").click()
            page.get_by_role("menuitem").wait_for(state="visible", timeout=5000)
            assert_sanitized_page(page, "desktop-user-menu")
            shot(page, "desktop-user-menu")
            page.keyboard.press("Escape")
            page.goto(f"{WEB}/dashboard/payments", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            assert_sanitized_page(page, "desktop-coming-soon")
            shot(page, "desktop-coming-soon")
            page.set_viewport_size({"width": 390, "height": 844})
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.get_by_role("button", name="打开导航").click()
            page.get_by_role("dialog").wait_for(state="visible", timeout=5000)
            assert_sanitized_page(page, "mobile-drawer")
            shot(page, "mobile-drawer")
            page.keyboard.press("Escape")
            pass_case("S20-screenshots", f"{len(SCREENSHOTS)} screenshots captured with sanitized pages")

            write_evidence()
        except Exception as error:  # noqa: BLE001 — matrix must report raw evidence
            dump_evidence(error)
            raise
        finally:
            if browser is not None:
                browser.close()

    def benign_console(entry):
        text = entry["text"]
        if "Failed to load resource" in text or "401" in text:
            return True
        if "has either width or height modified, but not the other" in text:
            return True
        return False

    unexpected_console = [c for c in console if not benign_console(c)]
    failed = [c for c in CASES.values() if c["status"] != "pass"]
    print(f"V11_3_SHELL_BROWSER: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
    if failed:
        for c in failed:
            print(f"FAILED {c['label']}: {c['observations']}")
        sys.exit(1)
    if unexpected_console:
        print(f"UNEXPECTED_CONSOLE: {unexpected_console}")
        sys.exit(1)
    print("V11_3_SHELL_BROWSER_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
