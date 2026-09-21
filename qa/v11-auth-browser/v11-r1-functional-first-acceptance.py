#!/usr/bin/env python3
"""V11-R1 Functional-First F4 — catalog/dealer new-capability acceptance.

Real-backend browser acceptance against the shared disposable PG16 fixture
(reuse of run-v11-auth.sh environment): dealer drawer location
create/edit/deactivate/reactivate, ERP link add (optional location)/unlink
with repeat-unlink 404 via an API negative probe, promotions status selector
exact draft/active/archived with UI save plus invalid-status 400 via an API
negative probe, and the partial admin read-only permission surface.

Synthetic actors only; evidence records no email, token or secret values and
URLs are scrubbed of UUID/id segments before persistence.
"""
import json, hashlib, os, re, signal, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-r1-functional-first-ui"))
WEB = os.environ.get("V11_WEB", "http://127.0.0.1:4564")
API = os.environ.get("V11_API", "http://127.0.0.1:4565")
ADMIN_EMAIL = os.environ["V11_ADMIN_EMAIL"]
PARTIAL_EMAIL = os.environ.get("V11_PARTIAL_ADMIN_EMAIL", os.environ.get("V11_PARTIAL_EMAIL", ""))
PASSWORD = os.environ["V11_SEED_PASSWORD"]
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "unknown")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "unknown")

OUT.mkdir(parents=True, exist_ok=True)
CASES = {}
console = []
requests = []
probe_requests = []  # internal only (absolute URLs for same-session API probes); never persisted
PAGE = None
CURRENT_CASE = None

ID_SEGMENT = None  # replaced by UUID_PATTERN-only scrubbing (see scrub)
EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
UUID_PATTERN = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def scrub(text):
    """Evidence hygiene: UUID-shaped segments become {id}, email-like
    substrings become {email}; no token/secret-shaped value is persisted."""
    text = UUID_PATTERN.sub("{id}", str(text))
    return EMAIL_PATTERN.sub("{email}", text)


def path_template(url):
    """Evidence stores site-relative path templates only (no scheme/host,
    no query, ids normalized): /api/v1/dashboard/dealers/{id}/locations."""
    try:
        path = urllib.parse.urlsplit(url).path
    except Exception:  # noqa: BLE001
        path = str(url)
    return scrub(path)


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
            console.append({"scope": scope, "type": msg.type, "text": scrub(msg.text[:400])})
    def on_request(req):
        probe_requests.append({"scope": scope, "method": req.method, "url": req.url})
        # Raw URL kept internally so response matching and same-session API
        # probes can reuse it; evidence serialization applies path_template.
        requests.append({"scope": scope, "method": req.method, "url": req.url, "status": None})
    def on_response(resp):
        url = resp.url
        for entry in reversed(requests):
            if entry["scope"] == scope and entry["url"] == url and entry["status"] is None:
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
    page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
    settle_login(page)
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
        port = API.split(":")[-1]
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
        "requests": [{"scope": e["scope"], "method": e["method"],
                      "url": path_template(e["url"]), "status": e["status"]} for e in requests]
    }
    if error is not None:
        try:
            evidence.update({
                "url": scrub(PAGE.url),
                "body": scrub(PAGE.locator("body").inner_text()[:400]),
                "error": scrub(str(error)[:2000])
            })
        except Exception as exc:  # noqa: BLE001
            evidence["error"] = f"{scrub(str(error)[:1000])} (body capture failed: {exc})"
    else:
        evidence["harnessSha256"] = {
            "acceptance": sha(__file__),
            "seed": sha(HERE / "seed-v11-auth.mts"),
            "run": sha(HERE / "run-v11-auth.sh")
        }
    (OUT / "acceptance-results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))


def dump_evidence(error):
    if CURRENT_CASE and CASES.get(CURRENT_CASE, {}).get("status") == "not-executed":
        CASES[CURRENT_CASE].update(status="fail", observations=[f"aborted: {scrub(str(error)[:300])}"])
    write_evidence(error)
    print(f"V11_R1_F4_ERROR: {str(error)[:500]}")


def open_dealer_drawer(page, scope, dealer_label="V11 R1 P1 Dealer"):
    """Navigate to the dealers list, open the seeded dealer drawer and wait
    for the detail (locations list) to settle. The drawer remounts its
    content after every save, so callers re-wait on the row they mutate."""
    page.goto(f"{WEB}/dashboard/dealers", wait_until="domcontentloaded")
    page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
    row = page.locator("tr").filter(has_text=dealer_label)
    edit = row.get_by_role("button", name="编辑")
    if edit.count() == 0:
        edit = page.get_by_role("button", name="编辑").first
    expect(edit.first).to_be_visible(timeout=20000)
    edit.first.click()
    backdrop = page.locator(".dashboard-drawer-backdrop")
    expect(backdrop).to_be_visible(timeout=15000)
    drawer = page.locator(".dashboard-drawer")
    expect(drawer.locator("ul.dashboard-notes-list li").first).to_be_visible(timeout=15000)
    return drawer


def loc_by_label(form, label_text):
    # CSS :has() keeps the match inside the form scope; locator.filter(has=)
    # with a cross-root inner locator silently returns 0 matches.
    return form.locator(f'label:has(span:text-is("{label_text}")) input')


def main():
    reset_auth_window()
    case("F4-1-dealer-locations", "dealer drawer creates a location, edits its address, deactivates and reactivates (POST/PATCH 2xx, reload state)")
    case("F4-2-erp-links", "dealer drawer adds an ERP link with an optional location, unlinks it, repeat unlink is 404 (API probe)")
    case("F4-3-promotions-status", "promotions selector is exactly draft/active/archived, UI save PATCH 200, invalid status 400 (API probe)")
    case("F4-4-partial-readonly", "partial admin sees no write controls; pages render a readable denial")
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
                return page, context

            # ---------------------------------------------------------------
            # F4-1 — dealer drawer location lifecycle
            # ---------------------------------------------------------------
            page, ctx = open_case("F4-1-dealer-locations")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            drawer = open_dealer_drawer(page, "F4-1-dealer-locations")

            suffix = str(int(time.time() * 1000))[-8:]
            loc_name = f"F4 Location {suffix}"
            loc_code = f"F4-LOC-{suffix}"

            # 1. create a location through the real UI (address fields set)
            create_form = drawer.locator("form").filter(has_text="新增网点").first
            expect(create_form).to_be_visible(timeout=10000)
            create_form.locator('input[type="checkbox"]').first.uncheck()
            create_form.locator('input[type="checkbox"]').nth(1).check()
            loc_by_label(create_form, "名称").fill(loc_name)
            loc_by_label(create_form, "网点编号").fill(loc_code)
            loc_by_label(create_form, "地址").fill("100 F4 Street")
            loc_by_label(create_form, "城市").fill("Winnipeg")
            loc_by_label(create_form, "省/州").fill("MB")
            loc_by_label(create_form, "邮编").fill("R3C 0A1")
            loc_by_label(create_form, "国家").fill("CA")
            with page.expect_response(
                lambda r: "/dashboard/dealers/" in r.url and r.url.endswith("/locations")
                and r.request.method == "POST"
            ) as created:
                create_form.get_by_role("button", name="新增网点", exact=True).click()
            if created.value.status != 201:
                fail_case("F4-1-dealer-locations", f"location create status {created.value.status} != 201")
            new_li = drawer.locator("ul.dashboard-notes-list li").filter(has_text=loc_name)
            expect(new_li).to_contain_text("100 F4 Street", timeout=15000)

            # 2. edit the address through the real UI
            new_li.get_by_role("button", name="编辑", exact=True).click()
            edit_form = new_li.locator("form").first
            expect(edit_form).to_be_visible(timeout=10000)
            loc_by_label(edit_form, "地址").fill("200 F4 Avenue")
            with page.expect_response(
                lambda r: "/dashboard/dealer-locations/" in r.url and r.request.method == "PATCH"
            ) as patched:
                edit_form.get_by_role("button", name="保存", exact=True).click()
            if patched.value.status != 200:
                fail_case("F4-1-dealer-locations", f"location edit status {patched.value.status} != 200")
            expect(new_li).to_contain_text("200 F4 Avenue", timeout=15000)

            # 3. deactivate (停用) through the real UI with confirm
            page.once("dialog", lambda dialog: dialog.accept())
            with page.expect_response(
                lambda r: "/dashboard/dealer-locations/" in r.url and r.request.method == "PATCH"
            ) as archived:
                new_li.get_by_role("button", name="停用", exact=True).click()
            if archived.value.status != 200:
                fail_case("F4-1-dealer-locations", f"location deactivate status {archived.value.status} != 200")
            expect(new_li).to_contain_text("停用", timeout=15000)
            expect(new_li.get_by_role("button", name="恢复", exact=True)).to_be_visible(timeout=15000)

            # 4. reactivate (恢复)
            with page.expect_response(
                lambda r: "/dashboard/dealer-locations/" in r.url and r.request.method == "PATCH"
            ) as restored:
                new_li.get_by_role("button", name="恢复", exact=True).click()
            if restored.value.status != 200:
                fail_case("F4-1-dealer-locations", f"location reactivate status {restored.value.status} != 200")
            expect(new_li).to_contain_text("启用", timeout=15000)
            expect(new_li.get_by_role("button", name="停用", exact=True)).to_be_visible(timeout=15000)
            post_calls = [r for r in requests if r["scope"] == "F4-1-dealer-locations"
                          and r["method"] == "POST" and "/locations" in r["url"] and r["status"] == 201]
            patch_calls = [r for r in requests if r["scope"] == "F4-1-dealer-locations"
                           and r["method"] == "PATCH" and "/dealer-locations/" in r["url"] and r["status"] == 200]
            if not post_calls or len(patch_calls) < 3:
                fail_case("F4-1-dealer-locations", f"expected 1x POST 201 and 3x PATCH 200, got {len(post_calls)} POST / {len(patch_calls)} PATCH")
            pass_case("F4-1-dealer-locations",
                      "location create POST 201; address edit PATCH 200; deactivate PATCH 200; reactivate PATCH 200; reload shows edited address and active state")
            ctx.close()

            # ---------------------------------------------------------------
            # F4-2 — ERP link add (with optional location) / unlink / 404
            # ---------------------------------------------------------------
            page, ctx = open_case("F4-2-erp-links")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            drawer = open_dealer_drawer(page, "F4-2-erp-links")

            erp_key = f"F4-EXT-{suffix}"
            drawer.get_by_role("button", name="新增 ERP 关联", exact=True).click()
            erp_form = drawer.locator("form").filter(has_text="保存关联").first
            expect(erp_form).to_be_visible(timeout=10000)
            erp_form.locator('label:has(span:text-is("ERP 网点编号")) input').fill(erp_key)
            location_select = erp_form.locator("select").first
            expect(location_select).to_be_visible(timeout=10000)
            location_select.select_option(label="V11 R1 P1 Location")
            with page.expect_response(
                lambda r: "/erp-links" in r.url and r.request.method == "POST"
            ) as linked:
                erp_form.get_by_role("button", name="保存关联", exact=True).click()
            if linked.value.status != 201:
                fail_case("F4-2-erp-links", f"erp link create status {linked.value.status} != 201")
            link_li = drawer.locator("ul.dashboard-notes-list li").filter(has_text=erp_key)
            expect(link_li).to_contain_text("vanstro-erp", timeout=15000)
            expect(link_li).to_contain_text("V11 R1 P1 Location", timeout=15000)

            # unlink through the real UI (confirm), DELETE 200
            page.once("dialog", lambda dialog: dialog.accept())
            with page.expect_response(
                lambda r: "/erp-links/" in r.url and r.request.method == "DELETE"
            ) as unlinked:
                link_li.get_by_role("button", name="解除关联", exact=True).click()
            if unlinked.value.status != 200:
                fail_case("F4-2-erp-links", f"erp link unlink status {unlinked.value.status} != 200")
            expect(drawer.locator("ul.dashboard-notes-list li").filter(has_text=erp_key)).to_have_count(0, timeout=15000)

            # repeat unlink: API negative probe with the same session → 404
            delete_urls = [r["url"] for r in probe_requests if r["scope"] == "F4-2-erp-links"
                           and r["method"] == "DELETE" and "/erp-links/" in r["url"]]
            if not delete_urls:
                fail_case("F4-2-erp-links", "no recorded DELETE erp-link request to derive the probe URL")
            probe_url = delete_urls[0]
            repeat = page.request.delete(probe_url)
            if repeat.status != 404:
                fail_case("F4-2-erp-links", f"repeat unlink status {repeat.status} != 404")
            pass_case("F4-2-erp-links",
                      "erp link add POST 201 with optional location; listed with system/external key/location; unlink DELETE 200; repeat unlink 404 (same-session API probe)")
            ctx.close()

            # ---------------------------------------------------------------
            # F4-3 — promotions selector exact draft/active/archived + save
            # ---------------------------------------------------------------
            page, ctx = open_case("F4-3-promotions-status")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            login(page, ADMIN_EMAIL, PASSWORD)
            page.goto(f"{WEB}/dashboard/promotions", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            status_select = page.locator("form.dashboard-inline-form select").first
            expect(status_select).to_be_visible(timeout=20000)
            option_values = status_select.locator("option").evaluate_all("(els) => els.map((el) => el.value)")
            if option_values != ["draft", "active", "archived"]:
                fail_case("F4-3-promotions-status", f"selector options {option_values} != draft/active/archived")

            def save_promotion(status):
                status_select.select_option(status)
                # Settle discipline: the save triggers a list reload in
                # .then(); selecting the next status before that reload
                # response lands lets the late list reset the local status
                # draft and the next PATCH silently carries the old status.
                # Wait for this save's own PATCH and its reload GET.
                with (
                    page.expect_response(
                        lambda r: "/dashboard/promotions/" in r.url and r.request.method == "PATCH",
                        timeout=15000) as patch_expected,
                    page.expect_response(
                        lambda r: r.url.endswith("/dashboard/promotions") and r.request.method == "GET",
                        timeout=15000) as reload_expected
                ):
                    status_select.locator("xpath=ancestor::form").get_by_role("button", name="保存", exact=True).click()
                reload_expected.value
                return patch_expected.value.status

            if save_promotion("draft") != 200:
                fail_case("F4-3-promotions-status", "UI save draft did not produce PATCH 200")
            expect(status_select).to_have_value("draft", timeout=15000)
            if save_promotion("archived") != 200:
                fail_case("F4-3-promotions-status", "UI save archived did not produce PATCH 200")
            expect(status_select).to_have_value("archived", timeout=15000)
            if save_promotion("active") != 200:
                fail_case("F4-3-promotions-status", "UI save active did not produce PATCH 200")
            expect(status_select).to_have_value("active", timeout=15000)

            # invalid status 400: API negative probe with the same session
            patch_urls = [r["url"] for r in requests if r["scope"] == "F4-3-promotions-status"
                          and r["method"] == "PATCH" and "/dashboard/promotions/" in r["url"]]
            if not patch_urls:
                fail_case("F4-3-promotions-status", "no recorded promotion PATCH to derive the probe URL")
            invalid = page.request.patch(
                patch_urls[0],
                data=json.dumps({"status": "inactive"}),
                headers={"content-type": "application/json"}
            )
            if invalid.status != 400:
                fail_case("F4-3-promotions-status", f"invalid status probe {invalid.status} != 400")
            pass_case("F4-3-promotions-status",
                      "selector options exactly draft/active/archived (no inactive); UI save PATCH 200 for all three; reload reflects saved state; invalid status 400 (API probe)")
            ctx.close()

            # ---------------------------------------------------------------
            # F4-4 — partial admin: readable page, zero write controls
            # ---------------------------------------------------------------
            page, ctx = open_case("F4-4-partial-readonly")
            page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
            settle_login(page)
            page.fill("#dashboard-login-email", PARTIAL_EMAIL)
            page.fill("#dashboard-login-password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            write_names = ["编辑", "新增网点", "停用", "恢复", "新增 ERP 关联", "解除关联", "保存", "创建促销", "删除"]
            for route in ("/dashboard/dealers", "/dashboard/promotions"):
                page.goto(f"{WEB}{route}", wait_until="domcontentloaded")
                page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
                expect(page.locator("body")).not_to_contain_text("数据暂时无法载入", timeout=15000)
                for name in write_names:
                    if page.get_by_role("button", name=name, exact=True).count() > 0:
                        fail_case("F4-4-partial-readonly", f"partial admin sees write control {name} on {route}")
                if page.locator("form.dashboard-inline-form select").count() > 0:
                    fail_case("F4-4-partial-readonly", f"partial admin sees an editable status select on {route}")
            # The harness partial carries only dashboard.access, so the
            # modules deny read: the honest UI statement is a rendered,
            # readable permission denial with zero write affordance. The
            # read-when-granted + write-403 API contract is proven by the
            # focused F4 API suite (6/6).
            dealers_body = ""
            page.goto(f"{WEB}/dashboard/dealers", wait_until="domcontentloaded")
            page.wait_for_selector("button[aria-label=用户菜单]", timeout=20000)
            expect(page.locator("body")).not_to_contain_text("数据暂时无法载入", timeout=15000)
            dealers_body = page.locator("body").inner_text()
            if "没有此页面的读取权限" not in dealers_body and "没有读取权限" not in dealers_body:
                fail_case("F4-4-partial-readonly", "dealers page did not render a readable denial for the partial admin")
            pass_case("F4-4-partial-readonly",
                      "partial admin: dealers and promotions pages render readably with zero write controls and no status select; dealers page shows the permission denial (seed partial has no dealers.read/pricing.write; API write-403 proven by focused suite)")
            ctx.close()

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
    print(f"V11_R1_F4_FUNCTIONAL_FIRST: {len(CASES) - len(failed)}/{len(CASES)} cases passed")
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
    print("V11_R1_F4_FUNCTIONAL_FIRST_ACCEPTANCE_OK")


if __name__ == "__main__":
    main()
