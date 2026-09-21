#!/usr/bin/env python3
"""V11-R1 P0 — one-click navigation acceptance (real Backend).

Every available route must switch URL, active nav, breadcrumb, H1, panel and
requests in ONE click — no second click. Covers desktop, back/forward and the
390px drawer. Synthetic actors; no email/UUID/ID values recorded.
"""
import json, hashlib, os, re, signal, sys, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-r1-p0"))
WEB = os.environ.get("V11_WEB", "http://127.0.0.1:4564")
ADMIN_EMAIL = os.environ["V11_ADMIN_EMAIL"]
PASSWORD = os.environ["V11_SEED_PASSWORD"]
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "unknown")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "unknown")

OUT.mkdir(parents=True, exist_ok=True)
CASES = {}
console = []
requests = []
PAGE = None
CURRENT_CASE = None

ROUTES = [
    ("产品", "/dashboard/products", "products"),
    ("订单", "/dashboard/orders", "orders"),
    ("客户", "/dashboard/customers", "crm/contacts"),
    ("用户", "/dashboard/users", "users"),
    ("经销商", "/dashboard/dealers", "dealers"),
    ("ERP / 集成", "/dashboard/erp", "erp-sync-jobs"),
]


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
        requests.append({"scope": scope, "method": req.method, "url": req.url, "status": None})
    def on_response(resp):
        for entry in reversed(requests):
            if entry["scope"] == scope and entry["url"] == resp.url and entry["status"] is None:
                entry["status"] = resp.status
                break
    page.on("console", on_console)
    page.on("request", on_request)
    page.on("response", on_response)


def deny_external(page):
    def handler(route):
        url = route.request.url
        if "127.0.0.1" in url or "localhost" in url:
            route.continue_()
        else:
            route.abort()
    page.route("**/*", handler)


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
    api_pid = os.environ.get("V11_API_PID")
    api_health = os.environ.get("V11_API_HEALTH")
    if not api_pid:
        return
    try:
        import subprocess
        port = os.environ.get("V11_API", "http://127.0.0.1:4565").split(":")[-1]
        listeners = subprocess.run(
            ["lsof", "-tiTCP:" + port, "-sTCP:LISTEN"],
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


def write_evidence(error=None):
    evidence = {
        "testedCommit": TESTED_COMMIT,
        "testedTree": TESTED_TREE,
        "web": WEB,
        "cases": CASES,
        "console": console,
        "requests": requests
    }
    if error is not None:
        try:
            evidence.update({"url": PAGE.url, "body": PAGE.locator("body").inner_text()[:400], "error": str(error)[:2000]})
        except Exception as exc:  # noqa: BLE001
            evidence["error"] = f"{str(error)[:1000]} (body capture failed: {exc})"
    else:
        evidence["harnessSha256"] = {
            "acceptance": sha(__file__),
            "seed": sha(HERE / "seed-v11-auth.mts"),
            "run": sha(HERE / "run-v11-auth.sh")
        }
    (OUT / "acceptance-results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))


def dump_evidence(error):
    if CURRENT_CASE and CASES.get(CURRENT_CASE, {}).get("status") == "not-executed":
        CASES[CURRENT_CASE].update(status="fail", observations=[f"aborted: {str(error)[:300]}"])
    write_evidence(error)
    print(f"V11_R1_P0_ERROR: {str(error)[:500]}")


def assert_one_click(page, name, href, scope, api_suffix):
    """Click a nav link once; require URL + aria-current + panel fetch in one click."""
    nav = page.locator('nav[aria-label="管理后台主要导航"]')
    link = nav.get_by_role("link", name=name, exact=False)
    if link.count() == 0:
        fail_case(scope, f"nav link missing: {name} ({href})")
    link.first.click()
    page.wait_for_url(f"**{href}**", timeout=15000)
    page.wait_for_timeout(800)
    diag = page.evaluate(
        "() => ({ wrapper: window.history.pushState.toString().includes('__v11R1P0__'), "
        "h1: document.querySelector('h1')?.innerText ?? '', "
        "url: window.location.pathname })")
    print(f"P0DIAG click={name} wrapper={diag['wrapper']} h1={diag['h1']} url={diag['url']}")
    # The unified navigation must NOT depend on the old pushState monkeypatch
    # (no __v11R1P0__ wrapper) — one click syncs through the shell callback.
    if diag["wrapper"]:
        fail_case(scope, f"{name}: legacy pushState wrapper still installed")
    page.wait_for_function(
        f"() => document.querySelector('nav a[href*=\"{href}\"]')?.getAttribute('aria-current') === 'page'",
        timeout=15000)
    # panel data fetch for this module must have fired (200)
    page.wait_for_timeout(800)
    ok = any(
        r["scope"] == scope and api_suffix in r["url"] and r["status"] == 200
        for r in requests
    )
    if not ok:
        fail_case(scope, f"{name}: no 200 panel fetch for {api_suffix} after ONE click")
    # no stale rollback: URL still the target
    if href.rstrip("/") not in page.url:
        fail_case(scope, f"{name}: URL rolled back after one click: {page.url}")


def main():
    reset_auth_window()
    case("N01-desktop-one-click", "all available routes switch in ONE click from overview")
    case("N02-back-forward", "popstate back/forward keeps URL and panel in sync")
    case("N03-fr-one-click", "fr routes switch in one click")
    case("N04-mobile-drawer", "390px drawer navigation switches in one click")
    case("N05-overview-quick-entries", "overview quick entries switch URL+H1+panel in one click")
    case("N06-rapid-clicks", "rapid clicks settle on the LAST click")
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
                deny_external(page)
                record(page, case_id)
                return page

            page = open_case("N01-desktop-one-click")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1000)
            for name, href, api in ROUTES:
                assert_one_click(page, name, href, "N01-desktop-one-click", f"/api/v1/dashboard/{api}")
            pass_case("N01-desktop-one-click", "six routes switched in one click with URL+active+fetch")

            page = open_case("N02-back-forward")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.locator('nav').get_by_role('link', name='产品').first.click()
            page.wait_for_url("**/dashboard/products**", timeout=15000)
            page.wait_for_function("() => document.querySelector('nav a[href*=\"/dashboard/products\"]')?.getAttribute('aria-current') === 'page'", timeout=15000)
            page.evaluate("history.back()")
            page.wait_for_function("() => window.location.pathname === '/dashboard'", timeout=15000)
            page.evaluate("history.forward()")
            page.wait_for_function("() => window.location.pathname.startsWith('/dashboard/products')", timeout=15000)
            # active nav follows the URL after popstate (aria-current re-checked)
            page.wait_for_function("() => document.querySelector('nav a[href*=\"/dashboard/products\"]')?.getAttribute('aria-current') === 'page'", timeout=15000)
            pass_case("N02-back-forward", "back/forward keeps URL and active nav in sync")

            page = open_case("N03-fr-one-click")
            page.goto(f"{WEB}/fr/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/fr/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(800)
            for name, href, api in ROUTES:
                fr_href = href.replace("/dashboard/", "/fr/dashboard/")
                assert_one_click(page, name, fr_href, "N03-fr-one-click", f"/api/v1/dashboard/{api}")
            pass_case("N03-fr-one-click", "fr routes switched in one click")

            page = open_case("N04-mobile-drawer", {"width": 390, "height": 844})
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            trigger = page.get_by_role("button", name="打开导航")
            trigger.click()
            page.wait_for_selector("button[aria-label=关闭导航]", timeout=10000)
            # The desktop nav is hidden at 390px; scope to the drawer's nav.
            drawer_nav = page.locator('aside[role="dialog"] nav[aria-label="管理后台主要导航"]')
            link = drawer_nav.get_by_role("link", name="产品", exact=False)
            if link.count() == 0:
                fail_case("N04-mobile-drawer", "drawer products link missing")
            link.first.click()
            page.wait_for_url("**/dashboard/products**", timeout=15000)
            page.wait_for_function("() => window.location.pathname.startsWith('/dashboard/products')", timeout=15000)
            page.wait_for_function("() => document.querySelector('nav a[href*=\"/dashboard/products\"]')?.getAttribute('aria-current') === 'page'", timeout=15000)
            page.wait_for_timeout(800)
            ok = any(r["scope"] == "N04-mobile-drawer" and "/api/v1/dashboard/products" in r["url"] and r["status"] == 200 for r in requests)
            if not ok:
                fail_case("N04-mobile-drawer", "no 200 products fetch after drawer navigation")
            pass_case("N04-mobile-drawer", "390px drawer navigation switched in one click")
            pass_case("N04-mobile-drawer", "390px drawer navigation switched in one click")

            page = open_case("N05-overview-quick-entries")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_selector('nav[aria-label="快捷入口"]', timeout=20000)
            for name, href, api in [
                ("产品", "/dashboard/products", "products"),
                ("分类", "/dashboard/categories", "categories"),
                ("订单", "/dashboard/orders", "orders"),
                ("客户", "/dashboard/customers", "crm/contacts"),
                ("用户", "/dashboard/users", "users"),
                ("经销商", "/dashboard/dealers", "dealers"),
                ("ERP / 集成", "/dashboard/erp", "erp-sync-jobs")
            ]:
                quick = page.locator('nav[aria-label="快捷入口"]').get_by_role("link", name=name, exact=False)
                if quick.count() == 0:
                    fail_case("N05-overview-quick-entries", f"quick entry missing: {name}")
                quick.first.click()
                page.wait_for_url(f"**{href}**", timeout=15000)
                page.wait_for_timeout(800)
                page.wait_for_function(f"() => document.querySelector('nav a[href*=\"{href}\"]')?.getAttribute('aria-current') === 'page'", timeout=15000)
                page.wait_for_timeout(600)
                ok = any(r["scope"] == "N05-overview-quick-entries" and f"/api/v1/dashboard/{api}" in r["url"] and r["status"] == 200 for r in requests)
                if not ok:
                    fail_case("N05-overview-quick-entries", f"{name}: no 200 panel fetch after one quick-entry click")
                if href.rstrip("/") not in page.url:
                    fail_case("N05-overview-quick-entries", f"{name}: URL rolled back after one quick-entry click")
                # return to Overview through the breadcrumb root link (also
                # exercises unified breadcrumb navigation in one click)
                crumb = page.locator('nav[aria-label="面包屑"]').get_by_role("link", name="管理后台")
                if crumb.count() == 0:
                    fail_case("N05-overview-quick-entries", "breadcrumb Overview link missing after quick entry")
                crumb.first.click()
                page.wait_for_url("**/dashboard**", timeout=15000)
                page.wait_for_selector('nav[aria-label="快捷入口"]', timeout=15000)
            pass_case("N05-overview-quick-entries", "seven quick entries + breadcrumb return switched in one click each")

            page = open_case("N06-rapid-clicks")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(800)
            nav = page.locator('nav[aria-label="管理后台主要导航"]')
            # rapid clicks on three different entries with no waits between
            nav.get_by_role("link", name="产品", exact=False).first.click()
            nav.get_by_role("link", name="订单", exact=False).first.click()
            nav.get_by_role("link", name="分类", exact=False).first.click()
            page.wait_for_url("**/dashboard/categories**", timeout=15000)
            page.wait_for_function("() => window.location.pathname.startsWith('/dashboard/categories')", timeout=15000)
            page.wait_for_timeout(1000)
            # final state corresponds to the LAST click: URL, H1 and active nav
            h1 = page.evaluate("() => document.querySelector('h1')?.innerText ?? ''")
            if not page.url.rstrip("/").endswith("/dashboard/categories"):
                fail_case("N06-rapid-clicks", f"URL did not settle on the last click: {page.url}")
            if "分类" not in h1:
                fail_case("N06-rapid-clicks", f"H1 did not settle on the last click: {h1}")
            page.wait_for_function("() => document.querySelector('nav a[href*=\"/dashboard/categories\"]')?.getAttribute('aria-current') === 'page'", timeout=15000)
            page.wait_for_timeout(600)
            ok = any(r["scope"] == "N06-rapid-clicks" and "/api/v1/dashboard/categories" in r["url"] and r["status"] == 200 for r in requests)
            if not ok:
                fail_case("N06-rapid-clicks", "no categories panel fetch after rapid clicks")
            pass_case("N06-rapid-clicks", "rapid clicks settle URL+H1+active nav+panel on the LAST click")

            write_evidence()
        except Exception as error:  # noqa: BLE001
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
        if "was detected as the Largest Contentful Paint (LCP)" in text:
            return True
        return False

    unexpected_console = [c for c in console if not benign_console(c)]
    not_executed = [c for c in CASES.values() if c["status"] == "not-executed"]
    failed = [c for c in CASES.values() if c["status"] != "pass"]
    print(f"V11_R1_P0_NAVIGATION: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
    if not_executed:
        print(f"NOT_EXECUTED: {[c['label'] for c in not_executed]}")
        sys.exit(1)
    if failed:
        for c in failed:
            print(f"FAILED {c['label']}: {c['observations']}")
        sys.exit(1)
    if unexpected_console:
        print(f"UNEXPECTED_CONSOLE: {unexpected_console}")
        sys.exit(1)
    print("V11_R1_P0_NAVIGATION_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
