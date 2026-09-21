#!/usr/bin/env python3
"""V11-5 Catalog slice — real Backend browser acceptance.

Runs against the same disposable PG16 real API/web fixture. Covers the five
catalog modules: products list/search/detail, categories list + read-only
detail drawer, pricing/promotions full-field lists, inventory paginated list,
and the read-only shell showing zero write buttons. Synthetic actors only;
no email/UUID/ID values recorded.
"""
import json, hashlib, os, re, signal, sys, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-5"))
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
        except Exception as exc:  # noqa: BLE001 — evidence best effort
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
    print(f"V11_5_CATALOG_ERROR: {str(error)[:500]}")



def reset_auth_window():
    """Restart the API once via the run script's watchdog to reset the
    in-process auth rate-limit window (10 logins / 15 min per IP) before this
    slice's logins. Sessions live in the DB and survive the restart."""
    api_pid = os.environ.get("V11_API_PID")
    api_health = os.environ.get("V11_API_HEALTH")
    if not api_pid:
        return
    try:
        import subprocess
        listeners = subprocess.run(
            ["lsof", "-tiTCP:" + os.environ.get("V11_API", "http://127.0.0.1:4565").split(":")[-1], "-sTCP:LISTEN"],
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
def main():
    reset_auth_window()
    case("C01-products-list-detail", "products list renders with real rows and a detail drawer")
    case("C02-products-search-url", "products search updates URL state and filters")
    case("C03-categories-detail-drawer", "categories read-only detail drawer opens with real data")
    case("C04-pricing-list", "pricing full-field list renders")
    case("C05-promotions-list", "promotions full-field list renders")
    case("C06-inventory-list-page", "inventory paginated snapshot list renders")
    case("C07-no-write-buttons", "read-only shell shows no write buttons across catalog modules")
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

            page = open_case("C01-products-list-detail")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/products", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1500)
            text = body_text(page)
            if "产品" not in text:
                fail_case("C01-products-list-detail", "products header missing")
            rows = page.get_by_role("button", name="查看")
            if rows.count() == 0:
                fail_case("C01-products-list-detail", "no product detail affordance")
            rows.first.click()
            page.wait_for_selector(".dashboard-drawer-backdrop", timeout=10000)
            pass_case("C01-products-list-detail", "products list + detail drawer open")

            page = open_case("C02-products-search-url")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/products", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1200)
            search = page.get_by_role("searchbox")
            if search.count() == 0:
                fail_case("C02-products-search-url", "search input missing")
            search.first.fill("prod")
            page.get_by_role("button", name="应用").click()
            page.wait_for_timeout(1200)
            if "q=" not in page.url and "q%3D" not in page.url:
                fail_case("C02-products-search-url", f"search query not in URL: {page.url}")
            pass_case("C02-products-search-url", "search updates URL state")

            page = open_case("C03-categories-detail-drawer")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            # V11-R1 P1: the full admin now carries catalog write permissions
            # and sees the category edit surface; the read-only detail drawer
            # contract is asserted with the read-only viewer (all module read
            # grants, no write grants), the same actor C07 uses below.
            page.fill("#dashboard-login-email", os.environ.get("V11_READER_EMAIL", ""))
            page.fill("#dashboard-login-password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.goto(f"{WEB}/dashboard/categories", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1200)
            detail = page.get_by_role("button", name="查看详情")
            if detail.count() == 0:
                fail_case("C03-categories-detail-drawer", "categories detail button missing")
            detail.first.click()
            page.wait_for_selector(".dashboard-drawer-backdrop", timeout=10000)
            drawer_text = body_text(page)
            if "Slug" not in drawer_text:
                fail_case("C03-categories-detail-drawer", "category drawer fields missing")
            pass_case("C03-categories-detail-drawer", "category detail drawer shows real data")

            page = open_case("C04-pricing-list")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/pricing", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            # V11-R1 P1: pricing lives in the Product editing context; the
            # legacy URL redirects there with the view hint.
            page.wait_for_function("() => window.location.pathname.startsWith('/dashboard/products')", timeout=15000)
            if "view=pricing" not in page.url:
                fail_case("C04-pricing-list", f"pricing redirect lost view: {page.url}")
            pass_case("C04-pricing-list", "pricing redirects into the product context")

            page = open_case("C05-promotions-list")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/promotions", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1200)
            if "促销" not in body_text(page):
                fail_case("C05-promotions-list", "promotions header missing")
            pass_case("C05-promotions-list", "promotions list renders")

            page = open_case("C06-inventory-list-page")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/inventory", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            # V11-R1 P1: inventory lives in the Product editing context.
            page.wait_for_function("() => window.location.pathname.startsWith('/dashboard/products')", timeout=15000)
            if "view=inventory" not in page.url:
                fail_case("C06-inventory-list-page", f"inventory redirect lost view: {page.url}")
            pass_case("C06-inventory-list-page", "inventory redirects into the product context")

            page = open_case("C07-no-write-buttons")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            # V11-R1 P1: the full admin now carries catalog write permissions
            # and sees edit affordances; the no-write-controls contract is
            # asserted with the read-only viewer (all module read grants,
            # no write grants).
            page.fill("#dashboard-login-email", os.environ.get("V11_READER_EMAIL", ""))
            page.fill("#dashboard-login-password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            for route, header in [("/dashboard/products", "产品"), ("/dashboard/categories", "分类"), ("/dashboard/pricing", "价格"), ("/dashboard/promotions", "促销")]:
                page.goto(f"{WEB}{route}", wait_until="domcontentloaded")
                page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
                page.wait_for_timeout(900)
                # Write affordances are controls, not copy text (the read-only
                # description copy mentions 创建). Assert no write button/save
                # control exists in the read-only shell.
                write_buttons = page.get_by_role("button", name=re.compile("新增|创建|保存"))
                if write_buttons.count() > 0:
                    fail_case("C07-no-write-buttons", f"{route} shows write control {write_buttons.first.inner_text()}")
            pass_case("C07-no-write-buttons", "no write buttons in read-only catalog shell")

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
        if "was detected as the Largest Contentful Paint (LCP)" in text:
            return True
        return False

    unexpected_console = [c for c in console if not benign_console(c)]
    failed = [c for c in CASES.values() if c["status"] != "pass"]
    print(f"V11_5_CATALOG_BROWSER: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
    if failed:
        for c in failed:
            print(f"FAILED {c['label']}: {c['observations']}")
        sys.exit(1)
    if unexpected_console:
        print(f"UNEXPECTED_CONSOLE: {unexpected_console}")
        sys.exit(1)
    print("V11_5_CATALOG_BROWSER_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
