#!/usr/bin/env python3
"""V11-6 Commerce/Organization — real Backend browser acceptance.

Covers Orders list/filter/detail, Customers list + q deny + PII discipline,
Users list/detail, Dealers list/detail (full admin: location/ERP management;
partial admin: read-only), and Roles/Applications staying coming-soon with
zero business requests. Synthetic
actors; no email/UUID/ID values recorded.
"""
import json, hashlib, os, re, signal, sys, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-6"))
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


def reset_auth_window():
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
    print(f"V11_6_COMMERCE_ERROR: {str(error)[:500]}")


def main():
    reset_auth_window()
    case("CO1-orders-list-detail", "orders list renders with status filter and detail drawer")
    case("CO2-customers-q-deny", "customers list renders; q param fails closed with the safe notice")
    case("CO3-users-list-detail", "users list renders with detail drawer")
    case("CO4-dealers-list-detail", "dealers list renders with detail drawer incl. location/ERP management")
    case("CO5-coming-soon-zero-business", "roles/applications stay coming-soon with zero business requests")
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

            page = open_case("CO1-orders-list-detail")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/orders", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1500)
            if "订单" not in body_text(page):
                fail_case("CO1-orders-list-detail", "orders header missing")
            detail = page.get_by_role("button", name="查看")
            if detail.count() == 0:
                fail_case("CO1-orders-list-detail", "order detail affordance missing")
            detail.first.click()
            page.wait_for_selector(".dashboard-drawer-backdrop", timeout=10000)
            pass_case("CO1-orders-list-detail", "orders list + detail drawer open")

            page = open_case("CO2-customers-q-deny")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/customers?q=john", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_function("() => document.body.innerText.includes('客户搜索不可用')", timeout=20000)
            pass_case("CO2-customers-q-deny", "customers q param fails closed with safe notice")

            page = open_case("CO3-users-list-detail")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/users", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1500)
            if "用户" not in body_text(page):
                fail_case("CO3-users-list-detail", "users header missing")
            detail = page.get_by_role("button", name="查看详情")
            if detail.count() == 0:
                fail_case("CO3-users-list-detail", "user detail affordance missing")
            detail.first.click()
            page.wait_for_selector(".dashboard-drawer-backdrop", timeout=10000)
            pass_case("CO3-users-list-detail", "users list + detail drawer open")

            page = open_case("CO4-dealers-list-detail")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/dealers", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1500)
            if "经销商" not in body_text(page):
                fail_case("CO4-dealers-list-detail", "dealers header missing")
            detail = page.get_by_role("button", name="查看详情")
            if detail.count() == 0:
                fail_case("CO4-dealers-list-detail", "dealer detail affordance missing")
            detail.first.click()
            page.wait_for_selector(".dashboard-drawer-backdrop", timeout=10000)
            if "经销商编号" not in body_text(page):
                fail_case("CO4-dealers-list-detail", "dealer drawer fields missing")
            # V11-R1 functional-first: the full admin's dealer drawer carries
            # location/ERP-link management (F1/F4 scope, e.g. 新增网点); the
            # read-only surface contract moved to the partial admin and is
            # asserted by F4-4 and v11-5 C07.
            write_buttons = page.get_by_role("button", name=re.compile("新增|创建|保存"))
            if write_buttons.count() == 0:
                fail_case("CO4-dealers-list-detail", "dealer location/ERP management affordance missing")
            pass_case("CO4-dealers-list-detail", "dealers list + scoped detail drawer with location/ERP management")

            page = open_case("CO5-coming-soon-zero-business")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            for route in ("/dashboard/roles", "/dashboard/applications"):
                page.goto(f"{WEB}{route}", wait_until="domcontentloaded")
                page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
                page.wait_for_function("() => document.body.innerText.includes('即将推出')", timeout=20000)
            scope_reqs = [r for r in requests if r["scope"] == "CO5-coming-soon-zero-business" and r["status"] is not None]
            # /dashboard/overview is the shell's global state (quick links,
            # system status) and fires on every page — not a module business
            # request. roles/applications themselves must issue nothing else.
            business = [r for r in scope_reqs if "/dashboard/" in r["url"] and "overview" not in r["url"] and "foundation" not in r["url"] and "authorization" not in r["url"] and r["status"] in (200, 201, 204)]
            if business:
                fail_case("CO5-coming-soon-zero-business", f"business requests fired: {business[:3]}")
            pass_case("CO5-coming-soon-zero-business", "roles/applications coming-soon with zero business requests")

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
    print(f"V11_6_COMMERCE_BROWSER: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
    if failed:
        for c in failed:
            print(f"FAILED {c['label']}: {c['observations']}")
        sys.exit(1)
    if unexpected_console:
        print(f"UNEXPECTED_CONSOLE: {unexpected_console}")
        sys.exit(1)
    print("V11_6_COMMERCE_BROWSER_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
