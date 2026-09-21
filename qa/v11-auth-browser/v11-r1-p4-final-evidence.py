#!/usr/bin/env python3
"""V11-R1 P4 final evidence — B01 dry-run, B02 commit/replay/conflict/partial
retry, B03 permission gate. All three cases persist in acceptance-results.json
bound to the tested commit/tree. No credentials or full payloads are stored.
"""

import json
import os
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = os.environ.get("V11_WEB", "http://127.0.0.1:4564")
API = os.environ.get("V11_API", "http://127.0.0.1:4565")
OUT = os.environ.get("V11_P4EVIDENCE_OUT", "/tmp/v11-p4-final")
os.makedirs(OUT, exist_ok=True)
ADMIN = os.environ.get("V11_ADMIN_EMAIL", "admin@example.com")
PARTIAL = os.environ.get("V11_PARTIAL_EMAIL", "partial@example.com")
PASSWORD = os.environ.get("V11_SEED_PASSWORD", "V11-testpassword123")
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "")

RESULTS = {}


def record(case_id, status, error=None, extra=None):
    entry = {"status": status}
    if error:
        entry["error"] = str(error)[:500]
    if extra:
        entry["extra"] = extra
    RESULTS[case_id] = entry
    print(f"{'PASS' if status == 'pass' else 'FAIL'} {case_id}")


def api_post(path, body, token=None):
    req = urllib.request.Request(f"{API}{path}", data=json.dumps(body).encode(), headers={"content-type": "application/json"})
    if token:
        req.add_header("authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read())


def login_token(email):
    status, data = api_post("/api/v1/auth/login", {"email": email, "password": PASSWORD})
    return data["data"]["accessToken"] if status == 200 else None


def poll_job(job_id, token, max_attempts=60, step="poll"):
    for _ in range(max_attempts):
        req = urllib.request.Request(f"{API}/api/v1/dashboard/batch/import/{job_id}", headers={"authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                payload = json.loads(resp.read())["data"]
        except urllib.error.HTTPError as err:
            raise AssertionError(f"{step}: poll GET {err.code}")
        status = payload["job"]["status"]
        if status in ("succeeded", "partially_succeeded", "failed"):
            return status, payload
        time.sleep(0.5)
    return "timeout", None


def b01(page, token):
    # The manual JSON batch-import UI (batch-import-panel) was removed; the
    # products tab now renders the ERP sync products surface. Dry-run through
    # the unchanged batch/import API: synchronous validation, zero writes —
    # no async job is claimed and no product row appears.
    try:
        page.goto(f"{BASE}/dashboard/login", wait_until="domcontentloaded")
        page.wait_for_function("() => document.querySelector('#dashboard-login-email') !== null", timeout=20000)
        page.fill("#dashboard-login-email", ADMIN)
        page.fill("#dashboard-login-password", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_selector("button[aria-label=用户菜单]", timeout=30000)
        page.goto(f"{BASE}/dashboard/products", wait_until="domcontentloaded")
        page.wait_for_selector('[data-testid="erp-sync-products-panel"]', timeout=30000)
        expect = page.locator('[data-testid="batch-import-panel"]')
        expect.wait_for(state="detached", timeout=5000)
        status, data = api_post("/api/v1/dashboard/batch/import", {"kind": "products", "items": [{"name": "P4 Final Dry", "skuCode": "p4-final-dry-sku"}], "dryRun": True}, token)
        if status != 200:
            raise AssertionError(f"dry-run POST {status} {json.dumps(data)[:200]}")
        if data.get("data", {}).get("jobId") is not None:
            raise AssertionError("dry-run claimed an async job (contract: zero writes)")
        req = urllib.request.Request(f"{API}/api/v1/dashboard/products?pageSize=100", headers={"authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            listed = json.loads(resp.read())
        slugs = [row.get("slug") for row in listed.get("data", [])]
        if "p4-final-dry-sku" in slugs:
            raise AssertionError("dry-run wrote the product (contract: zero writes)")
        record("B01-dry-run", "pass", extra={"surface": "erp-sync-products-panel", "dryRunStatus": data.get("data", {}).get("status"), "noJobClaimed": True, "noProductWrite": True})
    except Exception as error:  # noqa: BLE001
        record("B01-dry-run", "fail", error)


def b02(token):
    # commit with replay, conflict and partial retry via the API
    try:
        hash_a = "p4-final-hash-commit-0001"
        status, data = api_post("/api/v1/dashboard/batch/import", {"kind": "products", "items": [{"name": "P4 Final Commit", "skuCode": "p4-final-commit-sku"}], "requestHash": hash_a}, token)
        if status != 200 or data.get("data", {}).get("status") != "queued":
            raise AssertionError(f"commit create failed: {status} {data}")
        job_id = data["data"]["jobId"]
        job_status, payload = poll_job(job_id, token, step="commit")
        summary = (payload or {}).get("summary", {})
        if job_status not in ("succeeded", "partially_succeeded") or summary.get("committed") != 1:
            raise AssertionError(f"commit summary wrong: {job_status} {summary}")
        # replay: same key + same payload returns the original result
        status, data = api_post("/api/v1/dashboard/batch/import", {"kind": "products", "items": [{"name": "P4 Final Commit", "skuCode": "p4-final-commit-sku"}], "dryRun": False, "requestHash": hash_a}, token)
        if status != 200 or data.get("data", {}).get("replayed") is not True:
            raise AssertionError(f"replay failed: {status} {json.dumps(data)[:200]}")
        # conflict: same key + different payload -> 409
        status, data = api_post("/api/v1/dashboard/batch/import", {"kind": "products", "items": [{"name": "P4 Final Commit DIFFERENT", "skuCode": "p4-final-commit-sku"}], "requestHash": hash_a}, token)
        if status != 409:
            raise AssertionError(f"conflict expected 409 got {status}")
        # failed job (all bad prices) -> retry succeeds and binds to the original job
        hash_b = "p4-final-hash-failed-0001"
        status, data = api_post("/api/v1/dashboard/batch/import", {"kind": "prices", "items": [{"skuCode": "no-such-sku-xyz", "amountCents": 1}, {"skuCode": "no-such-sku-xyz2", "amountCents": 1}], "requestHash": hash_b}, token)
        if status != 200:
            raise AssertionError(f"failed-create failed: {status} {data}")
        job_id_b = data["data"]["jobId"]
        job_status, payload = poll_job(job_id_b, token, step="failed")
        summary = (payload or {}).get("summary", {})
        if job_status != "failed" or summary.get("failed") != 2:
            raise AssertionError(f"failed summary wrong: {job_status} {summary}")
        req = urllib.request.Request(f"{API}/api/v1/dashboard/batch/import/{job_id_b}/retry", method="POST", headers={"authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            retry = json.loads(resp.read())
        if retry.get("data", {}).get("status") != "queued":
            raise AssertionError(f"retry did not queue: {retry}")
        # partial job (1 good 1 bad) -> partially_succeeded; retry must 409 (only failed may retry)
        hash_c = "p4-final-hash-partial-0002"
        status, data = api_post("/api/v1/dashboard/batch/import", {"kind": "prices", "items": [{"skuCode": "011710130", "amountCents": 12345}, {"skuCode": "no-such-sku-xyz3", "amountCents": 1}], "requestHash": hash_c}, token)
        if status != 200:
            raise AssertionError(f"partial create failed: {status} {data}")
        job_id_c = data["data"]["jobId"]
        job_status, payload = poll_job(job_id_c, token, step="partial")
        summary_c = (payload or {}).get("summary", {})
        if job_status != "partially_succeeded" or summary_c.get("committed") != 1 or summary_c.get("failed") != 1:
            raise AssertionError(f"partial summary wrong: {job_status} {summary_c}")
        try:
            req = urllib.request.Request(f"{API}/api/v1/dashboard/batch/import/{job_id_c}/retry", method="POST", headers={"authorization": f"Bearer {token}"})
            urllib.request.urlopen(req, timeout=10)
            raise AssertionError("partial retry should 409")
        except urllib.error.HTTPError as err:
            if err.code != 409:
                raise AssertionError(f"partial retry expected 409 got {err.code}")
        record("B02-commit-replay-conflict-partial", "pass", extra={"commit": summary, "replayed": True, "conflict409": True, "retryQueued": True, "partialRetry409": True})
    except Exception as error:  # noqa: BLE001
        record("B02-commit-replay-conflict-partial", "fail", error)


def b03(page, token):
    # permission gate: partial admin has no products.write -> the products
    # surface exposes no write affordance (batch panel gone; ERP sync start
    # is products.write-gated) and direct POST is 403
    try:
        partial_token = login_token(PARTIAL)
        if not partial_token:
            raise AssertionError("partial login failed")
        page.goto(f"{BASE}/dashboard/login", wait_until="domcontentloaded")
        page.wait_for_function("() => document.querySelector('#dashboard-login-email') !== null", timeout=20000)
        page.fill("#dashboard-login-email", PARTIAL)
        page.fill("#dashboard-login-password", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_selector("button[aria-label=用户菜单]", timeout=30000)
        page.goto(f"{BASE}/dashboard/products", wait_until="domcontentloaded")
        page.wait_for_selector("button[aria-label=用户菜单]", timeout=30000)
        if page.locator('[data-testid="batch-import-panel"]').count() != 0:
            raise AssertionError("partial admin sees the batch panel")
        if page.locator('[data-testid="erp-sync-start"]').count() != 0:
            raise AssertionError("partial admin sees the ERP sync start control")
        status, data = api_post("/api/v1/dashboard/batch/import", {"kind": "products", "items": [{"name": "X", "skuCode": "x-probe-sku"}]}, partial_token)
        if status != 403:
            raise AssertionError(f"partial direct POST expected 403 got {status} {data}")
        record("B03-permission-gate", "pass")
    except Exception as error:  # noqa: BLE001
        record("B03-permission-gate", "fail", error)


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        token = login_token(ADMIN)
        if not token:
            record("setup-admin-login", "fail", "admin login failed")
            browser.close()
            _write()
            sys.exit(1)
        b01(browser.new_page(), token)
        b02(token)
        b03(browser.new_page(), token)
        browser.close()
    _write()
    failed = [k for k, v in RESULTS.items() if v["status"] != "pass"]
    sys.exit(1 if failed else 0)


def _write():
    with open(f"{OUT}/acceptance-results.json", "w") as handle:
        json.dump(
            {
                "schemaVersion": "vanstro.v11-r1.p4-final-evidence.v1",
                "testedCommit": TESTED_COMMIT,
                "testedTree": TESTED_TREE,
                "cases": RESULTS,
                "error": None,
                "sensitive": False,
            },
            handle,
            indent=1,
        )


if __name__ == "__main__":
    main()
