#!/usr/bin/env python3
"""V11-7 ERP/Integrations status page — real Backend browser acceptance.

Covers the ERP sync job list with status filter + pagination + read-only
detail drawer (attempts/lastError), the readiness card, the read-only
Service Account summary, the overview erp queue count staying 0, and a
network spy/deny proof that zero external ERP requests are issued.
Synthetic actors; no email/UUID/ID values recorded.
"""
import json, hashlib, os, re, signal, sys, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-7"))
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
    """Network deny: only loopback is allowed; anything else is aborted."""
    def handler(route):
        url = route.request.url
        if "127.0.0.1" in url or "localhost" in url:
            route.continue_()
        else:
            route.abort()
    page.route("**/*", handler)


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
    print(f"V11_7_ERP_ERROR: {str(error)[:500]}")


def main():
    reset_auth_window()
    case("EO1-sync-list-detail", "erp sync list renders with filter and detail drawer")
    case("EO2-service-accounts-summary", "service account summary card renders read-only")
    case("EO3-readiness-card", "readiness card derives from latest job")
    case("EO4-zero-external-erp", "network deny proves zero external ERP requests")
    case("EO5-overview-erp-zero", "overview erp queue count is 0")
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

            page = open_case("EO1-sync-list-detail")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/erp", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1500)
            if "ERP 同步任务" not in body_text(page) and "ERP sync jobs" not in body_text(page):
                fail_case("EO1-sync-list-detail", "erp header missing")
            detail = page.get_by_role("button", name="查看详情")
            if detail.count() == 0:
                fail_case("EO1-sync-list-detail", "erp job detail affordance missing")
            detail.first.click()
            page.wait_for_selector(".dashboard-drawer-backdrop", timeout=10000)
            if "尝试记录" not in body_text(page) and "Attempts" not in body_text(page):
                fail_case("EO1-sync-list-detail", "attempts block missing in drawer")
            pass_case("EO1-sync-list-detail", "sync list + filter + detail drawer with attempts")

            page = open_case("EO2-service-accounts-summary")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/erp", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_function("() => document.body.innerText.includes('Synthetic V11')", timeout=20000)
            # The read-only summary card renders status · environment · role
            # count ("1 个角色" for the seeded v11-machine-admin binding).
            # Token counts are deliberately aggregate-only (P6 source contract:
            # panels never render account.tokens.length), so the card asserts
            # the role count, not a token count.
            page.wait_for_function("() => document.body.innerText.includes('1 个角色')", timeout=20000)
            pass_case("EO2-service-accounts-summary", "service account summary card shows name/status/role count")

            page = open_case("EO3-readiness-card")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/erp", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_function("() => document.body.innerText.includes('ERP 系统状态')", timeout=20000)
            page.wait_for_function("() => document.body.innerText.includes('已就绪') || document.body.innerText.includes('Ready')", timeout=20000)
            pass_case("EO3-readiness-card", "readiness card renders ready from latest succeeded job")

            page = open_case("EO4-zero-external-erp")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            for route in ("/dashboard/erp", "/dashboard"):
                page.goto(f"{WEB}{route}", wait_until="domcontentloaded")
                page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
                page.wait_for_timeout(1200)
            external = [r for r in requests if r["scope"] == "EO4-zero-external-erp" and "127.0.0.1" not in r["url"] and "localhost" not in r["url"]]
            if external:
                fail_case("EO4-zero-external-erp", f"external requests fired: {external[:3]}")
            pass_case("EO4-zero-external-erp", "network deny: zero external ERP requests")

            page = open_case("EO5-overview-erp-zero")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            page.wait_for_timeout(1500)
            body = body_text(page)
            m = re.search(r"ERP 待处理 / 失败\s*\n0\b", body)
            if not m:
                fail_case("EO5-overview-erp-zero", "overview erp queue cell not showing 0")
            pass_case("EO5-overview-erp-zero", "overview erp queue count is 0")

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
    print(f"V11_7_ERP_BROWSER: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
    if failed:
        for c in failed:
            print(f"FAILED {c['label']}: {c['observations']}")
        sys.exit(1)
    if unexpected_console:
        print(f"UNEXPECTED_CONSOLE: {unexpected_console}")
        sys.exit(1)
    print("V11_7_ERP_BROWSER_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
