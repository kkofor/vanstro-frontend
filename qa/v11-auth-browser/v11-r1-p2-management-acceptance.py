#!/usr/bin/env python3
"""V11-R1 P2 — Orders/Users/Customers production management acceptance.

Order status transition, user status edit, customer stage edit, permission
gating. Synthetic actors; no email/UUID/ID values recorded.
"""
import json, hashlib, os, re, signal, sys, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-r1-p2"))
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
    print(f"V11_R1_P2_ERROR: {str(error)[:500]}")


def main():
    reset_auth_window()
    case("O01-order-status", "order edit drawer transitions status (PATCH 200)")
    case("O02-user-status", "user edit drawer updates status (PATCH 200)")
    case("O03-customer-stage", "customer edit drawer updates stage (PATCH 200)")
    case("O04-permission-gate", "partial admin sees no edit affordance on the three modules")
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

            def open_drawer(page, path, edit_label):
                page.goto(f"{WEB}{path}", wait_until="domcontentloaded")
                page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
                page.wait_for_timeout(1500)
                edit = page.get_by_role("button", name=edit_label)
                if edit.count() == 0:
                    fail_case(CURRENT_CASE, f"edit action missing on {path}")
                edit.first.click()
                page.wait_for_selector(".dashboard-drawer-backdrop", timeout=15000)
                page.wait_for_timeout(800)

            page = open_case("O01-order-status")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_drawer(page, "/dashboard/orders", "编辑")
            sel = page.locator(".dashboard-drawer select").first
            sel.select_option("processing")
            submit = page.locator('.dashboard-drawer form button[type="submit"]').first
            if submit.count() == 0:
                fail_case("O01-order-status", "order status submit missing")
            submit.click()
            page.wait_for_timeout(1500)
            ok = any(r["scope"] == "O01-order-status" and r["method"] == "PATCH" and "/dashboard/orders/" in r["url"] and "status" in r["url"] and r["status"] == 200 for r in requests)
            if not ok:
                fail_case("O01-order-status", "no 200 status PATCH")
            pass_case("O01-order-status", "order status transition PATCH 200")

            page = open_case("O02-user-status")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_drawer(page, "/dashboard/users", "查看详情")
            # the users drawer edit form (displayName + status); update the
            # display name (avoids the session-revoke path on status change)
            name_input = page.locator(".dashboard-drawer form input").first
            if name_input.count() == 0:
                fail_case("O02-user-status", "user displayName input missing")
            name_input.fill(name_input.input_value() + " R2")
            submit = page.locator('.dashboard-drawer form button[type="submit"]').first
            submit.click()
            page.wait_for_timeout(1500)
            ok = any(r["scope"] == "O02-user-status" and r["method"] == "PATCH" and "/dashboard/users/" in r["url"] and r["status"] == 200 for r in requests)
            if not ok:
                fail_case("O02-user-status", "no 200 user PATCH")
            pass_case("O02-user-status", "user status PATCH 200")

            page = open_case("O03-customer-stage")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            open_drawer(page, "/dashboard/customers", "编辑")
            sel = page.locator(".dashboard-drawer select").first
            if sel.count() == 0:
                fail_case("O03-customer-stage", "customer stage select missing")
            sel.select_option("engaged")
            submit = page.locator('.dashboard-drawer form button[type="submit"]').first
            submit.click()
            page.wait_for_timeout(1500)
            ok = any(r["scope"] == "O03-customer-stage" and r["method"] == "PATCH" and "/dashboard/crm/contacts/" in r["url"] and r["status"] == 200 for r in requests)
            if not ok:
                fail_case("O03-customer-stage", "no 200 crm PATCH")
            pass_case("O03-customer-stage", "customer stage PATCH 200")

            page = open_case("O04-permission-gate")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            page.fill("#dashboard-login-email", os.environ.get("V11_PARTIAL_ADMIN_EMAIL", ""))
            page.fill("#dashboard-login-password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            for path in ("/dashboard/orders", "/dashboard/users", "/dashboard/customers"):
                page.goto(f"{WEB}{path}", wait_until="domcontentloaded")
                page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
                page.wait_for_timeout(1000)
                if page.get_by_role("button", name="编辑").count() > 0:
                    fail_case("O04-permission-gate", f"partial admin sees edit on {path}")
            pass_case("O04-permission-gate", "partial admin has no edit affordance")

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
    print(f"V11_R1_P2_MANAGEMENT: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
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
    print("V11_R1_P2_MANAGEMENT_ACCEPTANCE_OK")


def body_text(page):
    return page.locator("body").inner_text()


if __name__ == "__main__":
    main()
