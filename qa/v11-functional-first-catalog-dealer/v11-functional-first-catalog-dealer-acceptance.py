#!/usr/bin/env python3
"""V11-R1 Functional First F4 — catalog/dealer closed-loop acceptance.

Real API + real Next dev server + disposable PG16 fixture. Cases:
  P1 promotion API rejects inactive (create and update are 400)
  P2 promotion view under full admin renders the legal status select
     (draft/active/archived options, no inactive option/label)
  L1 location create through the drawer form (POST 201, list refresh)
  L2 location edit through the drawer form (PATCH 200, updated value)
  L3 location archive (confirm) and restore are soft status PATCHes
  E1 ERP link add through the drawer form (POST 201, list refresh)
  E2 ERP link unlink (confirm) removes the row (DELETE 200)
  G1 dealers.read-only admin sees zero write affordances in the drawer
  G2 dealers.read-only admin direct writes are 403
"""
import hashlib
import json
import os
import random
import string
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_CD_OUT", "tasks/evidence/v11-r1-functional-first-catalog-dealer"))
API = os.environ["V11_CD_API"]
WEB = os.environ["V11_CD_WEB"]
ADMIN_EMAIL = os.environ["V11_CD_ADMIN_EMAIL"]
READONLY_EMAIL = os.environ["V11_CD_READONLY_EMAIL"]
PASSWORD = os.environ["V11_CD_PASSWORD"]
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "unknown")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "unknown")

OUT.mkdir(parents=True, exist_ok=True)
CASES = {}
console = []
requests = []
PAGE = None
CURRENT_CASE = None
SCOPE = [None]


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def case(case_id, label):
    CASES[case_id] = {"label": label, "status": "not-executed", "observations": []}


def pass_case(case_id, *observations):
    CASES[case_id].update(status="pass", observations=list(observations))


def fail_case(case_id, *observations):
    CASES[case_id].update(status="fail", observations=list(observations))
    raise AssertionError(f"{case_id} failed: {observations}")


def record(page):
    def on_console(msg):
        if msg.type in ("error", "warning"):
            console.append({"scope": SCOPE[0], "type": msg.type, "text": msg.text[:400]})

    def on_request(req):
        url = req.url
        if "/api/v1/dashboard/" in url:
            requests.append({"scope": SCOPE[0], "kind": "request", "method": req.method, "url": url.split("/api/v1")[1][:200]})

    def on_response(resp):
        url = resp.url
        if "/api/v1/dashboard/" in url:
            requests.append({"scope": SCOPE[0], "kind": "response", "method": resp.request.method, "url": url.split("/api/v1")[1][:200], "status": resp.status})

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
        "document.querySelector('[role=alert]') !== null",
        timeout=20000)


def login(page, email, password):
    page.fill("#dashboard-login-email", email)
    page.fill("#dashboard-login-password", password)
    page.click("button[type=submit]")
    try:
        page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
    except Exception as exc:  # noqa: BLE001
        body = page.locator("body").inner_text()[:800]
        raise AssertionError(f"{exc}\nlogin shell not ready; body: {body}") from exc


def api(page, method, path, body=None):
    """In-page fetch with the browser session cookie (real API, CORS-enabled)."""
    return page.evaluate("""async ({ method, path, body, apiBase }) => {
      const response = await fetch(`${apiBase}/api/v1${path}`, {
        method,
        credentials: "include",
        headers: body ? { "content-type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined
      });
      let json = null;
      try { json = await response.json(); } catch { /* non-JSON */ }
      return { status: response.status, json };
    }""", {"method": method, "path": path, "body": body, "apiBase": API})


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
        try:
            evidence.update({"url": PAGE.url, "body": PAGE.locator("body").inner_text()[:400], "error": str(error)[:2000]})
        except Exception as exc:  # noqa: BLE001
            evidence["error"] = f"{str(error)[:1000]} (body capture failed: {exc})"
    else:
        evidence["harnessSha256"] = {
            "acceptance": sha(__file__),
            "run": sha(HERE / "run-v11-functional-first-catalog-dealer.sh")
        }
    (OUT / "acceptance-results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))


def dump_evidence(error):
    if CURRENT_CASE and CASES.get(CURRENT_CASE, {}).get("status") == "not-executed":
        CASES[CURRENT_CASE].update(status="fail", observations=[f"aborted: {str(error)[:300]}"])
    write_evidence(error)
    print(f"V11_CD_ERROR: {str(error)[:500]}")


def requests_since(marker):
    try:
        return requests[marker:]
    except IndexError:
        return []


def rand():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def main():
    case("P1-promotion-api-inactive", "promotion create/update with status inactive is 400")
    case("P2-promotion-ui-legal", "full-admin promotions view renders legal status select (draft/active/archived), no inactive")
    case("L1-location-create", "location create through drawer form POST 201 + refreshed list")
    case("L2-location-edit", "location edit through drawer form PATCH 200 + updated value")
    case("L3-location-archive-restore", "location archive (confirm) and restore are soft status PATCHes")
    case("E1-erp-link-add-list", "ERP link add POST 201 + listed in drawer")
    case("E2-erp-link-unlink", "ERP link unlink (confirm) DELETE 200 + removed")
    case("G1-readonly-no-controls", "dealers.read-only admin sees no write affordances")
    case("G2-readonly-403", "dealers.read-only admin direct writes are 403")

    suffix = rand()
    dealer_code = f"F4D-{suffix}"
    dealer_name = f"F4 Dealer {suffix}"
    promo_key = f"f4-promo-{suffix}"

    def begin(case_id, page):
        global CURRENT_CASE
        CURRENT_CASE = case_id
        SCOPE[0] = case_id

    def open_dealer_drawer(page, dealer_name):
        page.goto(f"{WEB}/dashboard/dealers", wait_until="domcontentloaded")
        page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
        row = page.locator("tbody tr", has_text=dealer_name).first
        row.wait_for(timeout=20000)
        row.get_by_role("button", name="查看详情").click()
        page.wait_for_selector(".dashboard-drawer-backdrop", timeout=15000)
        page.wait_for_timeout(800)

    def drawer_label_input(page, label):
        return page.locator(f'.dashboard-drawer label.field:has-text("{label}") input').first

    with sync_playwright() as p:
        browser = None
        try:
            browser = p.chromium.launch()
            global PAGE
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            page = context.new_page()
            PAGE = page
            deny_external(page)
            record(page)

            # --- Admin session: promotion status gate -------------------------
            begin("P1-promotion-api-inactive", page)
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)

            create_ok = api(page, "POST", "/dashboard/promotions", {"key": promo_key, "name": f"F4 Promo {suffix}", "status": "draft"})
            assert create_ok["status"] == 201, f"promotion create failed: {create_ok}"
            promo_id = create_ok["json"]["data"]["id"]

            bad_create = api(page, "POST", "/dashboard/promotions", {"key": f"{promo_key}-bad", "name": "F4 Bad", "status": "inactive"})
            if bad_create["status"] != 400:
                fail_case("P1-promotion-api-inactive", f"inactive create returned {bad_create['status']}")
            bad_patch = api(page, "PATCH", f"/dashboard/promotions/{promo_id}", {"status": "inactive"})
            if bad_patch["status"] != 400:
                fail_case("P1-promotion-api-inactive", f"inactive update returned {bad_patch['status']}")
            pass_case("P1-promotion-api-inactive", "create inactive 400", "update inactive 400")

            begin("P2-promotion-ui-legal", page)
            page.goto(f"{WEB}/dashboard/promotions", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            # V11-R1 F4: the full admin holds pricing.write, so the promotions
            # panel legitimately renders the editable status select. The legal
            # option set is the contract; absence of write affordances for a
            # read-only actor is covered by G1/G2 on the dealers drawer.
            row = page.locator("tbody tr", has_text=f"F4 Promo {suffix}").first
            row.wait_for(timeout=20000)
            status_select = row.locator("select").first
            status_select.wait_for(timeout=15000)
            option_values = status_select.evaluate(
                "(sel) => Array.from(sel.options).map((option) => option.value)")
            if option_values != ["draft", "active", "archived"]:
                fail_case("P2-promotion-ui-legal", f"status select options {option_values} != [draft, active, archived]")
            select_text = status_select.inner_text()
            body = page.locator("body").inner_text()
            if "停用" in select_text or "停用" in body:
                fail_case("P2-promotion-ui-legal", "inactive option/label rendered on promotions view")
            pass_case("P2-promotion-ui-legal", "promotion row visible", "status select rendered", "options exactly [draft, active, archived]", "no inactive option/label")

            # --- Admin session: dealer fixture ---------------------------------
            dealer = api(page, "POST", "/dashboard/dealers", {"code": dealer_code, "name": dealer_name})
            assert dealer["status"] == 201, f"dealer create failed: {dealer}"
            dealer_id = dealer["json"]["data"]["id"]

            # --- L1: location create -------------------------------------------
            begin("L1-location-create", page)
            marker = len(requests)
            open_dealer_drawer(page, dealer_name)
            drawer_label_input(page, "名称").fill("Winnipeg Hub")
            drawer_label_input(page, "代码").fill("WPG-1")
            drawer_label_input(page, "地址").fill("100 Main St")
            drawer_label_input(page, "城市").fill("Winnipeg")
            drawer_label_input(page, "省/州").fill("MB")
            drawer_label_input(page, "邮编").fill("R3C 0A1")
            page.locator('.dashboard-drawer button[type="submit"]', has_text="新增网点").click()
            page.wait_for_function(
                "() => document.querySelector('.dashboard-drawer')?.innerText?.includes('Winnipeg Hub') === true",
                timeout=15000)
            page.wait_for_timeout(600)
            writes = [r for r in requests_since(marker) if r.get("kind") == "response" and r["method"] == "POST" and "/locations" in r["url"]]
            if not any(r["status"] == 201 for r in writes):
                fail_case("L1-location-create", f"no 201 location POST: {writes}")
            if "Winnipeg Hub" not in page.locator(".dashboard-drawer").inner_text():
                fail_case("L1-location-create", "created location missing after refresh")
            pass_case("L1-location-create", "POST 201", "location listed after refresh")

            # --- L2: location edit ---------------------------------------------
            begin("L2-location-edit", page)
            marker = len(requests)
            open_dealer_drawer(page, dealer_name)
            page.locator(".dashboard-drawer").get_by_role("button", name="编辑").first.click()
            page.wait_for_timeout(300)
            name_input = page.locator('.dashboard-drawer label.field:has-text("名称") input').first
            name_input.fill("Winnipeg Hub 2")
            page.locator('.dashboard-drawer form button[type="submit"]').first.click()
            page.wait_for_function(
                "() => document.querySelector('.dashboard-drawer')?.innerText?.includes('Winnipeg Hub 2') === true",
                timeout=15000)
            page.wait_for_timeout(600)
            patches = [r for r in requests_since(marker) if r.get("kind") == "response" and r["method"] == "PATCH" and "/dealer-locations/" in r["url"]]
            if not any(r["status"] == 200 for r in patches):
                fail_case("L2-location-edit", f"no 200 location PATCH: {patches}")
            if "Winnipeg Hub 2" not in page.locator(".dashboard-drawer").inner_text():
                fail_case("L2-location-edit", "edited name missing after refresh")
            pass_case("L2-location-edit", "PATCH 200", "edited name rendered")

            # --- L3: location archive + restore --------------------------------
            begin("L3-location-archive-restore", page)
            marker = len(requests)
            open_dealer_drawer(page, dealer_name)
            drawer_text = page.locator(".dashboard-drawer").inner_text()
            if "停用" not in drawer_text:
                fail_case("L3-location-archive-restore", "archive button missing for active location")
            page.once("dialog", lambda dialog: dialog.accept())
            page.locator(".dashboard-drawer").get_by_role("button", name="停用").first.click()
            page.wait_for_function(
                "() => document.querySelector('.dashboard-drawer')?.innerText?.includes('恢复') === true",
                timeout=15000)
            page.wait_for_timeout(600)
            archive_patches = [r for r in requests_since(marker) if r.get("kind") == "response" and r["method"] == "PATCH" and "/dealer-locations/" in r["url"]]
            if not any(r["status"] == 200 for r in archive_patches):
                fail_case("L3-location-archive-restore", f"no 200 archive PATCH: {archive_patches}")
            marker = len(requests)
            page.locator(".dashboard-drawer").get_by_role("button", name="恢复").first.click()
            page.wait_for_function(
                "() => document.querySelector('.dashboard-drawer')?.innerText?.includes('停用') === true",
                timeout=15000)
            page.wait_for_timeout(600)
            restore_patches = [r for r in requests_since(marker) if r.get("kind") == "response" and r["method"] == "PATCH" and "/dealer-locations/" in r["url"]]
            if not any(r["status"] == 200 for r in restore_patches):
                fail_case("L3-location-archive-restore", f"no 200 restore PATCH: {restore_patches}")
            pass_case("L3-location-archive-restore", "archive PATCH 200", "restore PATCH 200")

            # --- E1: ERP link add ----------------------------------------------
            begin("E1-erp-link-add-list", page)
            marker = len(requests)
            open_dealer_drawer(page, dealer_name)
            page.locator(".dashboard-drawer").get_by_role("button", name="新增 ERP 关联").click()
            page.wait_for_timeout(400)
            page.locator('.dashboard-drawer label.field:has-text("外部键") input').fill(f"EXT-{suffix}")
            page.locator('.dashboard-drawer button[type="submit"]', has_text="保存关联").click()
            page.wait_for_function(
                f"() => document.querySelector('.dashboard-drawer')?.innerText?.includes('EXT-{suffix}') === true",
                timeout=15000)
            page.wait_for_timeout(600)
            posts = [r for r in requests_since(marker) if r.get("kind") == "response" and r["method"] == "POST" and "/erp-links" in r["url"]]
            if not any(r["status"] == 201 for r in posts):
                fail_case("E1-erp-link-add-list", f"no 201 erp-link POST: {posts}")
            if f"EXT-{suffix}" not in page.locator(".dashboard-drawer").inner_text():
                fail_case("E1-erp-link-add-list", "link missing after refresh")
            pass_case("E1-erp-link-add-list", "POST 201", "link listed after refresh")

            # --- E2: ERP link unlink -------------------------------------------
            begin("E2-erp-link-unlink", page)
            marker = len(requests)
            open_dealer_drawer(page, dealer_name)
            if f"EXT-{suffix}" not in page.locator(".dashboard-drawer").inner_text():
                fail_case("E2-erp-link-unlink", "link row missing before unlink")
            page.once("dialog", lambda dialog: dialog.accept())
            page.locator(".dashboard-drawer").get_by_role("button", name="解除关联").first.click()
            page.wait_for_function(
                f"() => !document.querySelector('.dashboard-drawer')?.innerText?.includes('EXT-{suffix}') === true",
                timeout=15000)
            page.wait_for_timeout(600)
            deletes = [r for r in requests_since(marker) if r.get("kind") == "response" and r["method"] == "DELETE" and "/erp-links/" in r["url"]]
            if not any(r["status"] == 200 for r in deletes):
                fail_case("E2-erp-link-unlink", f"no 200 erp-link DELETE: {deletes}")
            pass_case("E2-erp-link-unlink", "DELETE 200", "link row removed")

            # --- Read-only admin session: G1/G2 --------------------------------
            context2 = browser.new_context(viewport={"width": 1280, "height": 900})
            page2 = context2.new_page()
            PAGE = page2
            deny_external(page2)
            record(page2)

            begin("G1-readonly-no-controls", page2)
            page2.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page2)
            login(page2, READONLY_EMAIL, PASSWORD)
            open_dealer_drawer(page2, dealer_name)
            drawer_text = page2.locator(".dashboard-drawer").inner_text()
            for forbidden in ["编辑", "停用", "恢复", "新增网点", "新增 ERP 关联", "解除关联"]:
                if forbidden in drawer_text:
                    fail_case("G1-readonly-no-controls", f"write affordance {forbidden} visible to read-only admin")
            pass_case("G1-readonly-no-controls", "no write affordances in drawer")

            begin("G2-readonly-403", page2)
            detail = api(page2, "GET", f"/dashboard/dealers/{dealer_id}")
            if detail["status"] != 200:
                fail_case("G2-readonly-403", f"read-only GET detail {detail['status']}")
            location_id = detail["json"]["data"]["locations"][0]["id"]
            if api(page2, "POST", f"/dashboard/dealers/{dealer_id}/locations", {"code": "X1", "name": "Blocked"})["status"] != 403:
                fail_case("G2-readonly-403", "location create not 403")
            if api(page2, "PATCH", f"/dashboard/dealer-locations/{location_id}", {"status": "inactive"})["status"] != 403:
                fail_case("G2-readonly-403", "location archive not 403")
            if api(page2, "POST", f"/dashboard/dealers/{dealer_id}/erp-links", {"erpSystem": "vanstro-erp", "erpLocationId": "X-2"})["status"] != 403:
                fail_case("G2-readonly-403", "erp link create not 403")
            pass_case("G2-readonly-403", "GET detail 200", "create location 403", "archive location 403", "create erp link 403")

            write_evidence()
        except Exception as exc:  # noqa: BLE001
            dump_evidence(exc)
            raise
        finally:
            if browser is not None:
                browser.close()

    summary = {k: v["status"] for k, v in CASES.items()}
    print(f"V11_CD_CASES={json.dumps(summary)}")
    if any(status != "pass" for status in summary.values()):
        sys.exit(1)
    print("V11_CD_CATALOG_DEALER_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
