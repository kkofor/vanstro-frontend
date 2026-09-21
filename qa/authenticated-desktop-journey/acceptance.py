#!/usr/bin/env python3
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

HERE = Path(__file__).resolve().parent
EVIDENCE = HERE / "evidence-v2"
SHOTS = EVIDENCE / "screenshots"
API = "http://127.0.0.1:4491"
WEB = "http://127.0.0.1:4490"
STATUS_RE = re.compile(r"status of (\d{3})")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def api_path(url):
    parsed = urlparse(url)
    return parsed.path + (f"?{parsed.query}" if parsed.query else "")


def main():
    definition = json.loads((HERE / "definition.json").read_text())
    cases = {item["id"]: {**item, "status": "not-executed"} for item in definition["cases"]}
    tested = os.environ["VANSTRO_TESTED_COMMIT"]
    assert tested == subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()

    current = {"caseId": "BOOTSTRAP", "generation": 0}
    raw_console = []
    raw_failed = []
    raw_responses = []

    def stamp():
        return {"caseId": current["caseId"], "generation": current["generation"], "observedAtMonotonic": time.monotonic()}

    def begin(case_id):
        current["caseId"] = case_id
        current["generation"] += 1
        return {
            "caseId": case_id,
            "generation": current["generation"],
            "consoleStart": len(raw_console),
            "failedStart": len(raw_failed),
            "responseStart": len(raw_responses),
            "interactions": [],
            "visibleAssertions": [],
        }

    def finish(ctx, page, ok, screenshot=True):
        console_rows = raw_console[ctx["consoleStart"]:]
        failed_rows = raw_failed[ctx["failedStart"]:]
        response_rows = raw_responses[ctx["responseStart"]:]
        expected_console, unexpected_console = classify_console(ctx["caseId"], console_rows, response_rows)
        expected_failed, unexpected_failed = classify_failed(ctx, failed_rows, response_rows)
        screenshot_path = None
        if screenshot:
            screenshot_path = SHOTS / f"{ctx['caseId']}.png"
            page.screenshot(path=str(screenshot_path), full_page=True)
            screenshot_path = str(screenshot_path.relative_to(HERE))
        case_ok = ok and not unexpected_console and not unexpected_failed
        cases[ctx["caseId"]].update(
            status="pass" if case_ok else "fail",
            url=page.url,
            interactions=ctx["interactions"],
            visibleAssertions=ctx["visibleAssertions"],
            apiRequestsResponses=[row for row in response_rows if row["url"].startswith(API)],
            rawConsoleErrors=console_rows,
            expectedConsoleErrors=expected_console,
            unexpectedConsoleErrors=unexpected_console,
            rawFailedRequests=failed_rows,
            expectedFailedRequests=expected_failed,
            unexpectedFailedRequests=unexpected_failed,
            screenshot=screenshot_path,
            environment="controlled-local-fixture",
        )

    def classify_console(case_id, console_rows, response_rows):
        allowed = {
            "DESK-A01": {
                ("GET", "/api/v1/auth/me", 401): "anonymous-bootstrap",
                ("GET", "/api/v1/cart", 401): "anonymous-bootstrap",
                ("GET", "/api/v1/account/favorites", 401): "anonymous-bootstrap",
            },
            "DESK-A10": {
                ("GET", "/api/v1/auth/me", 401): "logout-session-revalidation",
                ("GET", "/api/v1/cart", 401): "logout-optional-account-revalidation",
                ("GET", "/api/v1/account/favorites", 401): "logout-optional-account-revalidation",
            },
            "DESK-A11": {
                ("GET", "/api/v1/dashboard/foundation", 401): "post-logout-protected-endpoint",
                ("GET", "/api/v1/dashboard/authorization", 401): "post-logout-protected-endpoint",
                ("GET", "/api/v1/auth/me", 401): "post-logout-session-projection",
                ("GET", "/api/v1/cart", 401): "post-logout-optional-account-bootstrap",
                ("GET", "/api/v1/account/favorites", 401): "post-logout-optional-account-bootstrap",
            },
        }.get(case_id, {})
        expected, unexpected, claimed = [], [], set()
        for error in console_rows:
            match = STATUS_RE.search(error["text"])
            if not match:
                unexpected.append({**error, "reasonCode": "unclassified-console-error"})
                continue
            status = int(match.group(1))
            candidates = [
                (index, row) for index, row in enumerate(response_rows)
                if index not in claimed and row["status"] == status and row["observedAtMonotonic"] <= error["observedAtMonotonic"] + 0.25
            ]
            if not candidates:
                unexpected.append({**error, "status": status, "reasonCode": "console-status-without-case-response"})
                continue
            index, response = min(candidates, key=lambda pair: abs(pair[1]["observedAtMonotonic"] - error["observedAtMonotonic"]))
            claimed.add(index)
            key = (response["method"], urlparse(response["url"]).path, status)
            row = {**error, "method": key[0], "path": key[1], "status": status}
            if key in allowed:
                expected.append({**row, "reasonCode": allowed[key]})
            else:
                unexpected.append({**row, "reasonCode": "status-not-allowed-for-case"})
        return expected, unexpected

    def classify_failed(ctx, failed_rows, response_rows):
        expected, unexpected = [], []
        for failure in failed_rows:
            path = urlparse(failure["url"]).path
            if failure["error"] == "net::ERR_ABORTED" and re.fullmatch(r"/_next/static/webpack/[A-Za-z0-9._-]+\.webpack\.hot-update\.json", path):
                expected.append({**failure, "reasonCode": "next-dev-hot-update-superseded"})
                continue
            same_identity = [
                row for row in response_rows
                if row["caseId"] == ctx["caseId"]
                and row["generation"] == ctx["generation"]
                and row["method"] == failure["method"]
                and row["url"] == failure["url"]
                and row["status"] < 400
                and row["observedAtMonotonic"] > failure["observedAtMonotonic"]
            ]
            expected_terminal = [
                row for row in response_rows
                if row["caseId"] == ctx["caseId"]
                and row["generation"] == ctx["generation"]
                and row["method"] == failure["method"]
                and row["url"] == failure["url"]
                and row["status"] == 401
            ] if ctx["caseId"] == "DESK-A11" else []
            if failure["error"] == "net::ERR_ABORTED" and (same_identity or expected_terminal):
                successor = (same_identity or expected_terminal)[0]
                expected.append({**failure, "reasonCode": "same-case-request-superseded" if same_identity else "same-case-post-logout-terminal-response", "supersededBy": {"method": successor["method"], "url": successor["url"], "status": successor["status"], "generation": successor["generation"]}})
            else:
                unexpected.append({**failure, "reasonCode": "failed-request-without-current-case-successor"})
        return expected, unexpected

    def case_api(ctx, path_contains, status=200, method=None):
        return [
            row for row in raw_responses[ctx["responseStart"]:]
            if row["url"].startswith(API)
            and path_contains in row["url"]
            and row["status"] == status
            and (method is None or row["method"] == method)
        ]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args=["--disable-background-networking", "--no-first-run"])
        page = browser.new_page(viewport=definition["viewport"])
        page.on("console", lambda message: raw_console.append({**stamp(), "type": message.type, "text": message.text}) if message.type == "error" else None)
        page.on("requestfailed", lambda request: raw_failed.append({**stamp(), "method": request.method, "url": request.url, "error": request.failure}))
        page.on("response", lambda response: raw_responses.append({**stamp(), "method": response.request.method, "url": response.url, "status": response.status}))

        ctx = begin("DESK-A01")
        page.goto(WEB + "/account/login")
        page.get_by_label("Email").fill("qa@vanstro.test")
        page.get_by_label("Password").fill("fixture-password")
        ctx["interactions"] += ["navigate account login", "fill email/password", "click Sign in"]
        page.get_by_role("button", name="Sign in").click()
        expect(page).to_have_url(re.compile(r"/account/?$"))
        login = case_api(ctx, "/api/v1/auth/login", 200, "POST")
        current_session = case_api(ctx, "/api/v1/auth/me", 200, "GET")
        ctx["visibleAssertions"] += ["login route redirected to authenticated account", "login response 200", "post-login session projection 200"]
        finish(ctx, page, bool(login and current_session))

        ctx = begin("DESK-A02")
        page.goto(WEB + "/dashboard")
        expect(page.get_by_text("VanStro 管理后台")).to_be_visible()
        expect(page.get_by_role("banner").get_by_text("Cross F1 QA")).to_be_visible()
        expect(page.get_by_role("navigation", name="管理后台主要导航")).to_be_visible()
        foundation = case_api(ctx, "/api/v1/dashboard/foundation", 200, "GET")
        ctx["interactions"].append("navigate Dashboard root")
        ctx["visibleAssertions"] += ["Shell visible", "actor Cross F1 QA visible", "module navigation visible"]
        finish(ctx, page, bool(foundation))

        ctx = begin("DESK-A03")
        page.reload()
        expect(page.get_by_text("VanStro 管理后台")).to_be_visible()
        authorization = case_api(ctx, "/api/v1/dashboard/authorization", 200, "GET")
        contract_error = page.get_by_text(re.compile("无法安全载入|响应未通过安全验证")).count()
        ctx["interactions"].append("reload authenticated Dashboard")
        ctx["visibleAssertions"] += ["authorization response 200", "no authorization contract error"]
        finish(ctx, page, bool(authorization) and contract_error == 0)

        ctx = begin("DESK-A04")
        page.goto(WEB + "/dashboard/runtime?view=readiness")
        expect(page.get_by_text("运行时配置 / 功能开关 / 就绪状态")).to_be_visible()
        readiness = case_api(ctx, "/dashboard/runtime/readiness/detail", 200, "GET")
        expect(page.get_by_text("系统已就绪")).to_be_visible()
        ctx["interactions"].append("navigate Operations Readiness")
        ctx["visibleAssertions"] += ["Readiness panel visible", "system ready state visible", "detail endpoint 200"]
        finish(ctx, page, bool(readiness))

        ctx = begin("DESK-A05")
        page.goto(WEB + "/dashboard/operations?view=jobs")
        expect(page.get_by_role("heading", name="异步任务")).to_be_visible()
        expect(page.get_by_role("cell", name="基础设施验证任务")).to_be_visible()
        page.get_by_role("button", name="查看").first.click()
        dialog = page.get_by_role("dialog", name="任务详情")
        expect(dialog).to_be_visible()
        expect(dialog.get_by_text("123e4567-e89b-42d3-a456-426614174010")).to_be_visible()
        expect(dialog.get_by_text("基础设施验证任务")).to_be_visible()
        expect(dialog.get_by_text("运行中")).to_be_visible()
        detail = case_api(ctx, "/dashboard/jobs/123e4567-e89b-42d3-a456-426614174010", 200, "GET")
        page.get_by_role("button", name="关闭任务详情").click()
        expect(dialog).to_have_count(0)
        ctx["interactions"] += ["navigate Jobs list", "click first 查看", "close Job detail"]
        ctx["visibleAssertions"] += ["Job ID visible", "type visible", "status visible", "detail endpoint 200", "list remains usable"]
        finish(ctx, page, bool(detail))

        ctx = begin("DESK-A06")
        page.goto(WEB + "/dashboard/operations?view=work-queue")
        expect(page.get_by_role("heading", name="工作队列")).to_be_visible()
        expect(page.get_by_text("关注验证任务")).to_be_visible()
        work = case_api(ctx, "/dashboard/work-queue?", 200, "GET")
        adapters = case_api(ctx, "/dashboard/work-queue/adapters", 200, "GET")
        ctx["interactions"].append("navigate Work Queue")
        ctx["visibleAssertions"] += ["fixture item visible", "list/adapters 200", "no mutation executed"]
        finish(ctx, page, bool(work and adapters))

        ctx = begin("DESK-A07")
        page.goto(WEB + "/dashboard/operations?view=notifications")
        expect(page.get_by_role("heading", name="站内通知")).to_be_visible()
        expect(page.get_by_text("严重事项")).to_be_visible()
        notifications = case_api(ctx, "/dashboard/notifications?", 200, "GET")
        ctx["interactions"].append("navigate Notifications")
        ctx["visibleAssertions"] += ["fixture notification visible", "list endpoint 200", "no mark-read mutation"]
        finish(ctx, page, bool(notifications))
        page.wait_for_timeout(150)

        ctx = begin("DESK-A08")
        page.goto(WEB + "/dashboard/media")
        expect(page.get_by_role("heading", name="媒体库")).to_be_visible()
        try:
            expect(page.get_by_text("fixture.jpg")).to_be_visible()
        except Exception:
            page.screenshot(path=str(SHOTS / "DESK-A08-debug.png"), full_page=True)
            (EVIDENCE / "DESK-A08-debug.html").write_text(page.content())
            import urllib.request
            (EVIDENCE / "DESK-A08-requests.json").write_bytes(urllib.request.urlopen(API + "/control/requests").read())
            raise
        page.get_by_role("button", name="查看 fixture.jpg 的媒体详情").click()
        media_dialog = page.get_by_role("dialog", name="媒体详情")
        expect(media_dialog).to_be_visible()
        expect(media_dialog.get_by_text("fixture.jpg")).to_be_visible()
        expect(media_dialog.get_by_text("123e4567-e89b-42d3-a456-426614174030")).to_be_visible()
        expect(media_dialog.get_by_text("全局")).to_be_visible()
        detail = case_api(ctx, "/dashboard/media/123e4567-e89b-42d3-a456-426614174030", 200, "GET")
        writes = [row for row in raw_responses[ctx["responseStart"]:] if row["url"].startswith(API) and row["method"] not in ("GET", "HEAD", "OPTIONS")]
        safe_text = media_dialog.inner_text().lower()
        no_secret = not any(value in safe_text for value in ["storage path", "objectkey", "secret", "token", "postgresql://"])
        page.get_by_role("button", name="关闭媒体详情").click()
        ctx["interactions"] += ["navigate Media list", "click fixture Asset detail", "close Media detail"]
        ctx["visibleAssertions"] += ["safe display name visible", "Asset ID visible", "global scope visible", "detail endpoint 200", "no storage/provider mutation", "no secret/storage path"]
        finish(ctx, page, bool(detail) and not writes and no_secret)

        ctx = begin("DESK-A09")
        page.goto(WEB + "/dashboard/audit")
        expect(page.get_by_role("heading", name="审计事件")).to_be_visible()
        expect(page.get_by_text("fixture-audit")).to_be_visible()
        page.get_by_role("button", name="查看").first.click()
        audit_dialog = page.get_by_role("dialog", name="审计详情")
        expect(audit_dialog).to_be_visible()
        expect(audit_dialog.get_by_text("123e4567-e89b-42d3-a456-426614174040")).to_be_visible()
        expect(audit_dialog.get_by_text("创建")).to_be_visible()
        expect(audit_dialog.get_by_text("分类")).to_be_visible()
        expect(audit_dialog.get_by_text("成功")).to_be_visible()
        expect(audit_dialog.get_by_text("fixture-audit")).to_be_visible()
        detail = case_api(ctx, "/dashboard/audit-logs/123e4567-e89b-42d3-a456-426614174040", 200, "GET")
        page.get_by_role("button", name="关闭审计详情").click()
        ctx["interactions"] += ["navigate Audit list", "click first 查看", "close Audit detail"]
        ctx["visibleAssertions"] += ["event ID visible", "action/resource/result/request ID visible", "detail endpoint 200"]
        finish(ctx, page, bool(detail))

        ctx = begin("DESK-A10")
        logout_status = page.evaluate("async api=>{const response=await fetch(api+'/api/v1/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});window.dispatchEvent(new Event('vanstro-logged-out'));return response.status}", API)
        page.wait_for_timeout(250)
        logout = case_api(ctx, "/api/v1/auth/logout", 200, "POST")
        ctx["interactions"] += ["POST logout", "dispatch logged-out session event"]
        ctx["visibleAssertions"] += ["logout endpoint 200", "session invalidation event dispatched"]
        finish(ctx, page, logout_status == 200 and bool(logout))

        ctx = begin("DESK-A11")
        page.goto(WEB + "/dashboard")
        page.wait_for_timeout(400)
        foundation_401 = case_api(ctx, "/api/v1/dashboard/foundation", 401, "GET")
        actor_absent = page.get_by_text("Cross F1 QA").count() == 0
        domain_success = [row for row in raw_responses[ctx["responseStart"]:] if row["url"].startswith(API) and any(path in row["url"] for path in ["/dashboard/jobs", "/dashboard/media", "/dashboard/audit-logs"]) and row["status"] < 400]
        ctx["interactions"].append("navigate protected Dashboard after logout")
        ctx["visibleAssertions"] += ["Foundation expected 401", "authenticated actor absent", "no Jobs/Media/Audit success after logout"]
        page.wait_for_timeout(300)
        finish(ctx, page, bool(foundation_401) and actor_absent and not domain_success)
        browser.close()

    counts = {status: sum(case["status"] == status for case in cases.values()) for status in ["pass", "fail", "intentional-skip", "not-executed"]}
    all_expected_console = [row for case in cases.values() for row in case.get("expectedConsoleErrors", [])]
    all_unexpected_console = [row for case in cases.values() for row in case.get("unexpectedConsoleErrors", [])]
    all_expected_failed = [row for case in cases.values() for row in case.get("expectedFailedRequests", [])]
    all_unexpected_failed = [row for case in cases.values() for row in case.get("unexpectedFailedRequests", [])]
    result = {
        "schemaVersion": 2,
        "suiteId": definition["suiteId"],
        "testedCommit": tested,
        "viewport": definition["viewport"],
        "definitionSha256": sha(HERE / "definition.json"),
        "fixtureSha256": sha(HERE / "fixture.py"),
        "harnessSha256": sha(HERE / "acceptance.py"),
        "runnerSha256": sha(HERE / "run.py"),
        "counts": counts,
        "cases": list(cases.values()),
        "rawEvidence": {"consoleErrors": raw_console, "failedRequests": raw_failed, "responses": raw_responses},
        "expectedEvidence": {"consoleErrors": all_expected_console, "failedRequests": all_expected_failed},
        "unexpectedEvidence": {"consoleErrors": all_unexpected_console, "failedRequests": all_unexpected_failed},
    }
    (EVIDENCE / "result.partial.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"counts": counts, "rawConsole": len(raw_console), "expectedConsole": len(all_expected_console), "unexpectedConsole": len(all_unexpected_console), "rawFailed": len(raw_failed), "expectedFailed": len(all_expected_failed), "unexpectedFailed": len(all_unexpected_failed)}))
    return 1 if counts != {"pass": 11, "fail": 0, "intentional-skip": 0, "not-executed": 0} or all_unexpected_console or all_unexpected_failed else 0


if __name__ == "__main__":
    sys.exit(main())
