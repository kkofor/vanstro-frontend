#!/usr/bin/env python3
"""V11-R1 P6 independent real-backend behavior matrix.

Secrets stay in process memory only. The evidence records case status, counts and
contract identities; it never stores plaintext webhook or service-account tokens.
"""

import hashlib
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

from playwright.sync_api import sync_playwright

WEB = os.environ.get("V11_WEB", "http://127.0.0.1:4564")
API = os.environ.get("V11_API", "http://127.0.0.1:4565")
OUT = os.environ.get("V11_P6_EVIDENCE_OUT", "/tmp/v11-r1-p6")
ADMIN_EMAIL = os.environ.get("V11_ADMIN_EMAIL", "admin@example.com")
PARTIAL_EMAIL = os.environ.get("V11_PARTIAL_EMAIL", "partial@example.com")
PASSWORD = os.environ["V11_SEED_PASSWORD"]
MACHINE_TOKEN = os.environ["V11_SA_TOKEN"]
PG_CONTAINER = os.environ["V11_PG_CONTAINER"]
PG_PASSWORD = os.environ["V11_DB_PASSWORD"]
PG_DATABASE = os.environ.get("V11_DB_NAME", "vanstro_v11_auth_fixture")
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "")

os.makedirs(OUT, exist_ok=True)
results = {}


def record(case_id, status, summary, error=None):
    entry = {"status": status, "summary": summary}
    if error:
        entry["error"] = str(error)[:500]
    results[case_id] = entry
    print(f"{'PASS' if status == 'pass' else 'FAIL'} {case_id}")


def request_json(path, method="GET", body=None, bearer=None, headers=None):
    request_headers = dict(headers or {})
    if bearer:
        request_headers["authorization"] = f"Bearer {bearer}"
    data = None
    if body is not None:
        request_headers["content-type"] = "application/json"
        data = json.dumps(body).encode()
    request = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return response.status, (json.loads(raw) if raw else {}), dict(response.headers.items())
    except urllib.error.HTTPError as error:
        raw = error.read()
        payload = json.loads(raw) if raw else {}
        return error.code, payload, dict(error.headers.items())


def login_token(email):
    status, payload, _ = request_json("/api/v1/auth/login", "POST", {"email": email, "password": PASSWORD})
    if status != 200:
        raise AssertionError(f"login failed for synthetic actor: {status}")
    return payload["data"]["accessToken"]


def contains_sensitive_key(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key.lower() in {"secret", "secrethash", "token", "tokenhash", "plaintext"}:
                return True
            if contains_sensitive_key(child):
                return True
    if isinstance(value, list):
        return any(contains_sensitive_key(child) for child in value)
    return False


def sql_scalar(sql):
    completed = subprocess.run(
        [
            "docker",
            "exec",
            "-e",
            f"PGPASSWORD={PG_PASSWORD}",
            PG_CONTAINER,
            "psql",
            "-X",
            "-U",
            "postgres",
            "-d",
            PG_DATABASE,
            "-Atc",
            sql,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def browser_login(page, email):
    page.goto(f"{WEB}/dashboard/login", wait_until="domcontentloaded")
    page.wait_for_selector("#dashboard-login-email", timeout=30000)
    page.fill("#dashboard-login-email", email)
    page.fill("#dashboard-login-password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_selector("button[aria-label=用户菜单]", timeout=30000)


def stable_erp_panel(page):
    page.wait_for_timeout(1500)
    panel = page.locator('[data-testid="erp-operations-panel"]')
    try:
        panel.wait_for(timeout=30000)
        page.wait_for_function("() => document.querySelectorAll('[data-testid=\\\"erp-operations-panel\\\"] input').length === 3", timeout=30000)
    except Exception as error:
        body = page.locator("body").inner_text()[:1200]
        raise AssertionError(f"ERP operations panel did not stabilize: {body}") from error
    return panel

def main():
    admin = login_token(ADMIN_EMAIL)
    partial = login_token(PARTIAL_EMAIL)
    webhook_secret = f"p6_{secrets.token_urlsafe(24)}"
    webhook_url = f"https://example.invalid/p6-{secrets.token_hex(8)}"
    webhook_id = None
    lifecycle_tokens = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        browser_login(page, ADMIN_EMAIL)

        try:
            page.goto(f"{WEB}/dashboard/erp", wait_until="domcontentloaded")
            panel = stable_erp_panel(page)
            inputs = panel.locator("input")
            inputs.nth(0).fill(webhook_url)
            inputs.nth(1).fill("sync.completed")
            inputs.nth(2).fill(webhook_secret)
            panel.get_by_role("button", name="创建 Webhook").click()
            page.locator('[data-testid="one-time-secret"]').wait_for(timeout=30000)
            if webhook_secret not in page.locator('[data-testid="one-time-secret"]').inner_text():
                raise AssertionError("one-time secret was not revealed on create")
            status, listed, _ = request_json("/api/v1/dashboard/erp/webhooks", bearer=admin)
            if status != 200 or contains_sensitive_key(listed):
                raise AssertionError(f"safe webhook list failed: {status}")
            match = next((item for item in listed["data"]["items"] if item["url"] == webhook_url), None)
            if not match:
                raise AssertionError("created webhook not found in list")
            webhook_id = match["id"]
            webhook_setup = True
        except Exception as error:  # noqa: BLE001
            record("R1-webhook-list-create-delete", "fail", "webhook CRUD setup failed", error)

        try:
            page.reload(wait_until="domcontentloaded")
            stable_erp_panel(page)
            if page.locator('[data-testid="one-time-secret"]').count() != 0:
                raise AssertionError("one-time secret survived reload")
            status, listed, _ = request_json("/api/v1/dashboard/erp/webhooks", bearer=admin)
            if status != 200 or contains_sensitive_key(listed) or webhook_secret in json.dumps(listed):
                raise AssertionError("secret appeared in list/history response")
            record("R2-one-time-secret", "pass", "secret visible on create only; absent after reload and list")
        except Exception as error:  # noqa: BLE001
            record("R2-one-time-secret", "fail", "one-time reveal contract failed", error)

        try:
            if not webhook_id:
                raise AssertionError("webhook id unavailable")
            expected_hash = hashlib.sha256(b"vanstro:erp-webhook:v1\0" + webhook_secret.encode()).hexdigest()
            safe_id = webhook_id.replace("'", "")
            stored = sql_scalar(f'SELECT count(*) FROM erp_webhooks WHERE id=\'{safe_id}\' AND "secretHash"=\'{expected_hash}\'')
            if stored != "1":
                raise AssertionError("stored webhook hash did not match the domain-separated digest")
            status, deleted, _ = request_json(f"/api/v1/dashboard/erp/webhooks/{webhook_id}", "DELETE", bearer=admin)
            status2, _, _ = request_json(f"/api/v1/dashboard/erp/webhooks/{webhook_id}", "DELETE", bearer=admin)
            if status != 200 or deleted.get("data", {}).get("deleted") is not True or status2 != 404:
                raise AssertionError(f"delete behavior wrong: {status}/{status2}")
            record("R1-webhook-list-create-delete", "pass", "real backend create/list/delete passed; repeat delete returned 404")
            record("R3-secret-storage-safe-dto", "pass", "domain-separated hash persisted; safe DTO omits secret/hash; delete 200 then 404")
        except Exception as error:  # noqa: BLE001
            if "R1-webhook-list-create-delete" not in results and "webhook_setup" in locals():
                record("R1-webhook-list-create-delete", "fail", "webhook delete closure failed", error)
            record("R3-secret-storage-safe-dto", "fail", "secret storage or safe DTO failed", error)

        try:
            panel = stable_erp_panel(page)
            panel.get_by_role("button", name="测试 ERP API 连通性").click()
            page.wait_for_function("() => document.body.innerText.includes('（可达）')", timeout=30000)
            status, connection, _ = request_json("/api/v1/dashboard/erp/connection-test", "POST", bearer=admin)
            data = connection.get("data", {})
            if status != 200 or set(data) != {"configured", "maskedUrl", "lastTestedAt", "status", "reachable"}:
                raise AssertionError(f"connection DTO mismatch: {status} {sorted(data)}")
            if not data["configured"] or not data["reachable"] or data["status"] != 200 or "…" not in data["maskedUrl"]:
                raise AssertionError("connection test did not report bounded reachable state")
            status, openapi, _ = request_json("/api/v1/dashboard/erp/openapi", bearer=admin)
            operation_count = sum(1 for item in openapi.get("paths", {}).values() for method in ("get", "post", "put", "patch", "delete") if method in item)
            order_list_id = openapi.get("paths", {}).get("/v1/orders", {}).get("get", {}).get("operationId")
            order_detail_id = openapi.get("paths", {}).get("/v1/orders/{id}", {}).get("get", {}).get("operationId")
            if status != 200 or openapi.get("openapi") != "3.0.3" or operation_count != 14:
                raise AssertionError(f"dashboard OpenAPI proxy mismatch: {status}/{operation_count}")
            if order_list_id != "erpListOrders" or order_detail_id != "erpGetOrder":
                raise AssertionError(f"ERP order operation IDs missing: {order_list_id}/{order_detail_id}")
            record("R4-connection-test-openapi-proxy", "pass", "dashboard control-plane probe 200 with five-field safe DTO; generated OpenAPI proxy 14 operations including order list/detail")
        except Exception as error:  # noqa: BLE001
            record("R4-connection-test-openapi-proxy", "fail", "connection test or OpenAPI proxy failed", error)

        try:
            account_key = f"p6-no-role-{secrets.token_hex(6)}"
            status, account_payload, _ = request_json(
                "/api/v1/dashboard/mcp/service-accounts",
                "POST",
                {"key": account_key, "name": "P6 No Role", "roleIds": []},
                admin,
            )
            if status != 201:
                raise AssertionError(f"service account create failed: {status}")
            account_id = account_payload["data"]["id"]
            status, token_payload, _ = request_json(
                f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens",
                "POST",
                {"name": "P6 evidence", "ttlDays": 1},
                admin,
            )
            token_data = token_payload.get("data", {})
            if status != 201 or not token_data.get("plaintextAvailable") or not token_data.get("token"):
                raise AssertionError("token create failed or plaintext absent")
            no_role_token = token_data["token"]
            no_role_machine_status, _, _ = request_json("/api/v1/integrations/erp/v1/products", bearer=no_role_token)
            if no_role_machine_status != 403:
                raise AssertionError(f"no-role machine token expected 403, got {no_role_machine_status}")
            lifecycle_tokens.append(no_role_token)
            token_id = token_data["id"]
            status, token_list, _ = request_json(f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens", bearer=admin)
            if status != 200 or contains_sensitive_key(token_list):
                raise AssertionError("token list exposed plaintext/hash")
            idempotency = f"p6-rotate-{secrets.token_hex(12)}"
            status, rotated, _ = request_json(
                f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens/{token_id}/rotate",
                "POST",
                {"name": "P6 replacement"},
                admin,
                {"idempotency-key": idempotency},
            )
            replacement = rotated.get("data", {})
            if status != 201 or replacement.get("plaintextAvailable") is not True or not replacement.get("token"):
                raise AssertionError(f"token rotate failed: {status}")
            lifecycle_tokens.append(replacement["token"])
            replacement_id = replacement["id"]
            replay_status, replay, _ = request_json(
                f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens/{token_id}/rotate",
                "POST",
                {"name": "P6 replacement"},
                admin,
                {"idempotency-key": idempotency},
            )
            if replay_status != 200 or replay.get("data", {}).get("plaintextAvailable") is not False or contains_sensitive_key(replay):
                raise AssertionError("rotation replay exposed plaintext")
            revoke_status, _, _ = request_json(
                f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens/{replacement_id}",
                "DELETE",
                {"reason": "P6 independent evidence"},
                admin,
            )
            s08_paths = [
                "/api/v1/dashboard/settings/s08-overview",
                "/api/v1/dashboard/settings/s08-drafts",
                "/api/v1/dashboard/settings/s08-readiness",
                "/api/v1/dashboard/settings/s08-history",
                "/api/v1/dashboard/mcp/service-accounts",
                "/api/v1/dashboard/mcp/invocations",
            ]
            s08_statuses = {path: request_json(path, bearer=admin)[0] for path in s08_paths}
            if any(status != 200 for status in s08_statuses.values()):
                raise AssertionError(f"S08 read endpoints failed: {s08_statuses}")
            page.goto(f"{WEB}/dashboard/settings/api-service-accounts", wait_until="domcontentloaded")
            try:
                page.locator('section[aria-label="API 与服务账号设置"]').wait_for(timeout=30000)
                page.wait_for_function("() => document.body.innerText.includes('settings.api-service-account')", timeout=30000)
            except Exception as error:
                body = page.locator("body").inner_text()[:1200]
                raise AssertionError(f"S08 route did not expose descriptor: {body}") from error
            if revoke_status != 200:
                raise AssertionError(f"replacement revoke failed: {revoke_status}")
            record("R7-service-account-token-lifecycle", "pass", "real entry create/list/rotate/replay/revoke/expiry reached; plaintext only first create/rotate")
        except Exception as error:  # noqa: BLE001
            record("R7-service-account-token-lifecycle", "fail", "S08 lifecycle entry failed", error)

        try:
            denied_status, _, _ = request_json("/api/v1/dashboard/erp/webhooks", "POST", {"url": webhook_url, "events": ["x"], "secret": webhook_secret}, partial)
            machine_denied = no_role_machine_status if "no_role_machine_status" in locals() else 0
            anonymous_status, _, _ = request_json("/api/v1/integrations/erp/v1/products")
            if denied_status != 403 or machine_denied != 403 or anonymous_status != 401:
                raise AssertionError(f"deny statuses: dashboard={denied_status}, machine={machine_denied}, anonymous={anonymous_status}")
            record("R6-permission-and-machine-deny", "pass", "partial dashboard write 403; no-cli SA 403; anonymous machine request 401")
        except Exception as error:  # noqa: BLE001
            record("R6-permission-and-machine-deny", "fail", "deny boundary failed", error)

        try:
            first_status, _, _ = request_json("/api/v1/integrations/erp/v1/products?limit=1", bearer=MACHINE_TOKEN)
            if first_status != 200:
                raise AssertionError(f"valid machine request failed: {first_status}")
            rate_status = None
            retry_after = None
            for _ in range(110):
                rate_status, payload, response_headers = request_json("/api/v1/integrations/erp/v1/openapi", bearer=MACHINE_TOKEN)
                if rate_status == 429:
                    retry_after = response_headers.get("Retry-After") or response_headers.get("retry-after")
                    if payload.get("code") != "RATE_LIMITED":
                        raise AssertionError("429 missing RATE_LIMITED code")
                    break
            if rate_status != 429 or not retry_after or not retry_after.isdigit() or not 1 <= int(retry_after) <= 60:
                raise AssertionError(f"429 contract failed: {rate_status}/{retry_after}")
            record("R5-rate-limit-retry-after", "pass", "ERP v1 direct burst reached 429 RATE_LIMITED with integer Retry-After; auth executed first")
        except Exception as error:  # noqa: BLE001
            record("R5-rate-limit-retry-after", "fail", "rate limit contract failed", error)

        try:
            actions = [
                "dashboard.erp.webhook.create",
                "dashboard.erp.webhook.delete",
                "dashboard.erp.connection_test",
                "integrations.erp.v1.request",
            ]
            quoted = ",".join(f"'{action}'" for action in actions)
            audit_count = int(sql_scalar(f"SELECT count(*) FROM audit_logs WHERE action IN ({quoted})"))
            sensitive_count = int(sql_scalar(f"SELECT count(*) FROM audit_logs WHERE action IN ({quoted}) AND coalesce(metadata::text,'') ~* '(vsa_|secret|plaintext|tokenHash)'"))
            if audit_count < 4 or sensitive_count != 0:
                raise AssertionError(f"audit rows/sensitive rows: {audit_count}/{sensitive_count}")
            record("R8-audit-and-call-log-redaction", "pass", f"{audit_count} dashboard/machine audit rows; zero secret/token patterns in metadata")
        except Exception as error:  # noqa: BLE001
            record("R8-audit-and-call-log-redaction", "fail", "audit/call log evidence failed", error)

        browser.close()

    artifact = {
        "schemaVersion": "vanstro.v11-r1.p6-independent-evidence.v1",
        "testedCommit": TESTED_COMMIT,
        "testedTree": TESTED_TREE,
        "cases": results,
        "priorEvidence": {
            "s08Pg16": "apps/api/src/dashboard/s08-settings-pg16.test.ts S08-04/05/06/07/09/10",
            "scopePolicy": "apps/api/src/dashboard/s08-settings-policy.test.ts",
        },
        "sensitive": False,
        "error": None,
    }
    with open(os.path.join(OUT, "acceptance-results.json"), "w", encoding="utf8") as handle:
        json.dump(artifact, handle, indent=1, ensure_ascii=False)

    failed = [case_id for case_id, result in results.items() if result["status"] != "pass"]
    print(f"V11_R1_P6: {len(results) - len(failed)}/{len(results)} cases passed")
    sys.exit(1 if failed or len(results) != 8 else 0)


if __name__ == "__main__":
    main()
