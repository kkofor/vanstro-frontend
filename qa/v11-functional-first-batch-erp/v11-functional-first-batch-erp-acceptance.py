#!/usr/bin/env python3
"""V11-R1 functional-first F4 — real-backend acceptance matrix for the batch
and ERP v1 surfaces that previously had no runnable coverage:

  * dashboard batch kinds categories/prices/inventory/dealers/
    dealer_locations/erp_links/sku_mappings: dry-run, commit, per-item results,
    replay, conflict, partial retry 409, failed-job retry after heal,
    permission gate; erp_links also covers location readback, idempotent
    re-commit, dealer replace, wrong-dealer location rejection and the
    no-physical-unlink invariant;
  * ERP v1 (service-account surface): products list/get with real
    price/inventory data, cursor pagination, batch create/update/unlist,
    idempotency replay/conflict, sync-jobs list/detail/status filter,
    retry (state/version conflicts + heal retry), OpenAPI, webhook CRUD,
    connection-test, auth/scope deny;
  * ERP v1 orders list/get (Contract A consumption): safe operational DTO
    with line items, cursor pagination, detail, 404 and validation gates,
    zero customer PII.

Every case hits the real API process against a disposable PG16 fixture.
Secrets (service-account token, webhook secret) stay in process memory;
the persisted evidence carries case status and synthetic identifiers only.
"""

import hashlib
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("V11_BATCHERP_API", "http://127.0.0.1:4566")
OUT = os.environ.get("V11_BATCHERP_OUT", "/tmp/v11-functional-first-batch-erp")
ADMIN_EMAIL = os.environ.get("V11_ADMIN_EMAIL", "admin@example.com")
PARTIAL_EMAIL = os.environ.get("V11_PARTIAL_EMAIL", "partial@example.com")
PASSWORD = os.environ["V11_SEED_PASSWORD"]
SA_TOKEN = os.environ["V11_SA_TOKEN"]
PG_CONTAINER = os.environ["V11_PG_CONTAINER"]
PG_PASSWORD = os.environ["V11_DB_PASSWORD"]
PG_DATABASE = os.environ.get("V11_DB_NAME", "vanstro_v11_auth_fixture")
TESTED_COMMIT = os.environ.get("V11_TESTED_COMMIT", "")
TESTED_TREE = os.environ.get("V11_TESTED_TREE", "")

DASH_BATCH = "/api/v1/dashboard/batch/import"
ERP = "/api/v1/integrations/erp/v1"

# Contract A: the exact safe operational order DTO. Any extra key (customer
# PII, payment internals) or missing key is a contract violation.
ORDER_SAFE_KEYS = {
    "id", "status", "fulfillment", "currency", "subtotalCents", "discountCents",
    "taxCents", "shippingCents", "totalCents", "dealerId", "dealerLocationId",
    "createdAt", "updatedAt", "items",
}
ORDER_LINE_KEYS = {"id", "skuCode", "productName", "quantity", "unitPriceCents", "lineTotalCents"}
ORDER_PII_KEYS = {
    "email", "firstName", "lastName", "phone", "guestOrderToken",
    "guestTokenExpiresAt", "guestTokenRevokedAt", "paymentMethod",
    "paymentSessionId", "userId", "notes", "promotionKey",
    "shippingAddressLine1", "shippingAddressLine2", "shippingCity",
    "shippingProvince", "shippingPostalCode", "shippingCountry",
}


def pii_keys_present(value):
    """Recursively collect any order PII/payment key present in a response."""
    found = set()

    def walk(node):
        if isinstance(node, dict):
            for key, child in node.items():
                if key in ORDER_PII_KEYS:
                    found.add(key)
                walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)

    walk(value)
    return found

os.makedirs(OUT, exist_ok=True)
results = {}
request_count = {"sa": 0}


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


def sql_scalar(sql):
    completed = subprocess.run(
        [
            "docker", "exec", "-e", f"PGPASSWORD={PG_PASSWORD}", PG_CONTAINER,
            "psql", "-X", "-U", "postgres", "-d", PG_DATABASE, "-Atc", sql,
        ],
        check=True, capture_output=True, text=True,
    )
    return completed.stdout.strip()


def sql_exec(sql):
    subprocess.run(
        [
            "docker", "exec", "-e", f"PGPASSWORD={PG_PASSWORD}", PG_CONTAINER,
            "psql", "-X", "-U", "postgres", "-d", PG_DATABASE, "-c", sql,
        ],
        check=True, capture_output=True, text=True,
    )


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


def safe(value):
    return str(value).replace("'", "")


def poll_job_dashboard(job_id, token, max_attempts=90, step="poll"):
    for _ in range(max_attempts):
        status, payload, _ = request_json(f"{DASH_BATCH}/{job_id}", bearer=token)
        if status != 200:
            raise AssertionError(f"{step}: poll GET {status}")
        job_status = payload["data"]["job"]["status"]
        if job_status in ("succeeded", "partially_succeeded", "failed"):
            return job_status, payload["data"]
        time.sleep(0.5)
    return "timeout", None


def poll_job_erp(job_id, max_attempts=90, step="poll"):
    for _ in range(max_attempts):
        request_count["sa"] += 1
        status, payload, _ = request_json(f"{ERP}/sync-jobs/{job_id}", bearer=SA_TOKEN)
        if status != 200:
            raise AssertionError(f"{step}: poll GET {status}")
        job_status = payload["data"]["status"]
        if job_status in ("succeeded", "partially_succeeded", "failed"):
            return job_status, payload["data"]
        time.sleep(0.5)
    return "timeout", None


def dash_batch(kind, items, token, request_hash=None, dry_run=False):
    body = {"kind": kind, "items": items, "dryRun": dry_run}
    if request_hash:
        body["requestHash"] = request_hash
    status, payload, _ = request_json(DASH_BATCH, "POST", body, bearer=token)
    return status, payload


def dash_retry(job_id, token):
    status, payload, _ = request_json(f"{DASH_BATCH}/{job_id}/retry", "POST", bearer=token)
    return status, payload


def exists_sql(kind, item, sku, loc):
    if kind == "categories":
        return f"SELECT count(*) FROM categories WHERE slug='{safe(item['slug'])}'"
    if kind == "dealers":
        return f"SELECT count(*) FROM dealers WHERE code='{safe(item['code'])}'"
    if kind == "dealer_locations":
        return f"SELECT count(*) FROM dealer_locations WHERE code='{safe(item['code'])}'"
    if kind == "prices":
        return (
            "SELECT count(*) FROM prices p JOIN platform_skus s ON s.id=p.\"skuId\" "
            f"WHERE s.\"skuCode\"='{safe(sku)}' AND p.\"amountCents\"={int(item['amountCents'])} AND p.status='active'"
        )
    if kind == "inventory":
        # Contract §3: inbound inventory locations resolve through
        # DealerErpLink.erpLocationId, so the proof joins the link row.
        return (
            "SELECT count(*) FROM inventory_snapshots i JOIN platform_skus s ON s.id=i.\"skuId\" "
            "JOIN dealer_erp_links l ON l.\"dealerLocationId\"=i.\"dealerLocationId\" "
            f"WHERE s.\"skuCode\"='{safe(sku)}' AND l.\"erpSystem\"='f4-erp' AND l.\"erpLocationId\"='f4-erp-loc-main' AND i.\"quantityOnHand\"={int(item['quantityOnHand'])}"
        )
    if kind == "sku_mappings":
        return (
            "SELECT count(*) FROM product_sku_erp_mappings m JOIN platform_skus s ON s.id=m.\"skuId\" "
            f"WHERE s.\"skuCode\"='{safe(sku)}' AND m.\"erpSystem\"='{safe(item['erpSystem'])}' AND m.\"erpSkuKey\"='{safe(item['erpSkuKey'])}'"
        )
    if kind == "erp_links":
        return (
            "SELECT count(*) FROM dealer_erp_links l "
            f"WHERE l.\"erpSystem\"='{safe(item['erpSystem'])}' AND l.\"erpLocationId\"='{safe(item['erpLocationId'])}'"
        )
    raise AssertionError(f"unknown kind for exists_sql: {kind}")


def absent_sql(kind, invalid_item, sku, loc):
    """Prove an invalid/structural item was NOT persisted. Per-kind key that
    the item would have produced had it been written."""
    if kind == "dealers":
        return f"SELECT count(*) FROM dealers WHERE name='{safe(invalid_item['name'])}'"
    if kind == "inventory":
        return (
            "SELECT count(*) FROM inventory_snapshots i JOIN platform_skus s ON s.id=i.\"skuId\" "
            "JOIN dealer_erp_links l ON l.\"dealerLocationId\"=i.\"dealerLocationId\" "
            f"WHERE s.\"skuCode\"='{safe(sku)}' AND l.\"erpSystem\"='f4-erp' AND l.\"erpLocationId\"='f4-erp-loc-main' AND i.\"quantityOnHand\" IS NULL"
        )
    if kind == "sku_mappings":
        return (
            "SELECT count(*) FROM product_sku_erp_mappings m JOIN platform_skus s ON s.id=m.\"skuId\" "
            f"WHERE s.\"skuCode\"='{safe(sku)}' AND m.\"erpSystem\"='{safe(invalid_item['erpSystem'])}' AND m.\"erpSkuKey\" IS NULL"
        )
    if kind == "erp_links":
        # erpLocationId is NOT NULL in the schema, so a structurally-invalid
        # link item (missing erpLocationId) can never produce a row: assert
        # no NULL-keyed link was invented for the invalid item's system.
        return (
            "SELECT count(*) FROM dealer_erp_links l "
            f"WHERE l.\"erpSystem\"='{safe(invalid_item['erpSystem'])}' AND l.\"erpLocationId\" IS NULL"
        )
    return exists_sql(kind, invalid_item, sku, loc)


def item_templates(kind, sku, loc, dealer, n):
    if kind == "categories":
        return (
            {"slug": f"f4-cat-{n}", "name": f"F4 Category {n}"},
            {"slug": f"f4-cat-bad-{n}"},
            None,
        )
    if kind == "dealers":
        return (
            {"code": f"f4-dealer-{n}", "name": f"F4 Dealer {n}"},
            {"name": f"F4 NoCode {n}"},
            None,
        )
    if kind == "dealer_locations":
        return (
            {"dealerCode": dealer, "code": f"f4-loc-{n}", "name": f"F4 Location {n}"},
            {"dealerCode": dealer, "code": f"f4-loc-bad-{n}"},
            {"dealerCode": f"f4-no-dealer-{n}", "code": f"f4-loc-dep-{n}", "name": "F4 Dep"},
        )
    if kind == "prices":
        return (
            {"skuCode": sku, "amountCents": 5000 + n, "currency": "CAD"},
            {"skuCode": "", "amountCents": 1},
            {"skuCode": f"f4-no-sku-{n}", "amountCents": 1},
        )
    if kind == "inventory":
        return (
            {"skuCode": sku, "locationCode": "f4-erp-loc-main", "erpSystem": "f4-erp", "quantityOnHand": 50 + n},
            {"skuCode": sku, "locationCode": "f4-erp-loc-main", "erpSystem": "f4-erp"},
            {"skuCode": f"f4-no-sku-{n}", "locationCode": "f4-erp-loc-main", "erpSystem": "f4-erp", "quantityOnHand": 5},
        )
    if kind == "sku_mappings":
        return (
            {"skuCode": sku, "erpSystem": "f4-erp", "erpSkuKey": f"f4-map-{n}"},
            {"skuCode": sku, "erpSystem": "f4-erp"},
            {"skuCode": f"f4-no-sku-{n}", "erpSystem": "f4-erp", "erpSkuKey": f"f4-map-dep-{n}"},
        )
    if kind == "erp_links":
        return (
            {"dealerCode": dealer, "erpSystem": "f4-erp", "erpLocationId": "f4-erp-loc-main", "dealerLocationCode": loc},
            {"dealerCode": dealer, "erpSystem": "f4-erp"},
            {"dealerCode": f"f4-no-dealer-{n}", "erpSystem": "f4-erp", "erpLocationId": f"f4-erp-loc-dep-{n}"},
        )
    raise AssertionError(f"unknown kind: {kind}")


def run_dashboard_kind_matrix(kind, sku, loc, dealer, admin, counter):
    """One kind: dry-run (no writes), commit with per-item results, replay,
    conflict 409, terminal-but-not-failed retry 409."""
    counter["n"] += 1
    n = counter["n"]
    valid, invalid, depfail = item_templates(kind, sku, loc, dealer, n)

    # 1. dry-run (contract §7 dryRunZeroWrites): no AsyncJob claim, no
    # batch_ingest_results ledger rows, no domain writes; the response carries
    # no jobId, and re-issuing the same key with a different payload stays 200
    # (no idempotency key was ever claimed).
    try:
        jobs_before = int(sql_scalar("SELECT count(*) FROM async_jobs WHERE \"jobType\"='dashboard.batch.ingest'"))
        ledger_before = int(sql_scalar("SELECT count(*) FROM batch_ingest_results"))
        dry_hash = f"f4-dash-{kind}-dry-{n}"
        status, data = dash_batch(kind, [valid, invalid], admin, request_hash=dry_hash, dry_run=True)
        if status != 200 or data.get("data", {}).get("jobId") is not None:
            raise AssertionError(f"dry-run must be synchronous without a job: {status} {json.dumps(data)[:200]}")
        other, _, _ = item_templates(kind, sku, loc, dealer, n + 2000)
        status2, _ = dash_batch(kind, [other], admin, request_hash=dry_hash, dry_run=True)
        if status2 != 200:
            raise AssertionError(f"dry-run same key + different payload must stay 200 (no key claim): {status2}")
        jobs_after = int(sql_scalar("SELECT count(*) FROM async_jobs WHERE \"jobType\"='dashboard.batch.ingest'"))
        ledger_after = int(sql_scalar("SELECT count(*) FROM batch_ingest_results"))
        if jobs_after != jobs_before or ledger_after != ledger_before:
            raise AssertionError(f"dry-run wrote AsyncJob/ledger rows: jobs {jobs_before}->{jobs_after} ledger {ledger_before}->{ledger_after}")
        if sql_scalar(exists_sql(kind, valid, sku, loc)) != "0":
            raise AssertionError(f"dry-run wrote state for {kind}")
        record(f"D-{kind}-dry-run", "pass", "200 without jobId; zero AsyncJob/ledger/domain writes; same key+different payload stays 200")
    except Exception as error:  # noqa: BLE001
        record(f"D-{kind}-dry-run", "fail", "dry-run contract failed", error)

    # 2. commit with per-item results: valid commits, invalid skipped, dependency failure (when applicable) failed
    try:
        commit_hash = f"f4-dash-{kind}-commit-{n}"
        items = [valid, invalid] + ([depfail] if depfail else [])
        status, data = dash_batch(kind, items, admin, request_hash=commit_hash)
        if status != 200:
            raise AssertionError(f"commit create failed: {status} {json.dumps(data)[:200]}")
        job_id = data["data"]["jobId"]
        job_status, payload = poll_job_dashboard(job_id, admin, step=f"commit-{kind}")
        summary = payload.get("summary", {}) if payload else {}
        expected_status = "partially_succeeded" if depfail else "succeeded"
        expected_failed = 1 if depfail else 0
        if job_status != expected_status or summary.get("committed") != 1 or summary.get("skipped") != 1 or summary.get("failed") != expected_failed:
            raise AssertionError(f"commit summary wrong: {job_status} {summary} (expected {expected_status})")
        if depfail:
            failed_entries = [r for r in payload.get("results", []) if r["status"] == "failed"]
            if not failed_entries or not failed_entries[0].get("error"):
                raise AssertionError(f"failed item result missing error: {payload.get('results')}")
        if sql_scalar(exists_sql(kind, valid, sku, loc)) != "1":
            raise AssertionError(f"commit did not persist {kind} row")
        if sql_scalar(absent_sql(kind, invalid, sku, loc)) != "0":
            raise AssertionError(f"invalid item was persisted for {kind}")
        record(f"D-{kind}-commit-item-results", "pass", f"{job_status} committed=1 skipped=1 failed={expected_failed}; row persisted; per-item results present")
    except Exception as error:  # noqa: BLE001
        record(f"D-{kind}-commit-item-results", "fail", "commit/item-result contract failed", error)

    # 3. replay: same key + same payload returns the original job result
    try:
        status, data = dash_batch(kind, items, admin, request_hash=commit_hash)
        if status != 200 or data.get("data", {}).get("replayed") is not True:
            raise AssertionError(f"replay failed: {status} {json.dumps(data)[:200]}")
        if not data["data"].get("results") or not data["data"].get("summary"):
            raise AssertionError("replay did not carry results/summary")
        record(f"D-{kind}-replay", "pass", "same key+payload returned replayed job with results")
    except Exception as error:  # noqa: BLE001
        record(f"D-{kind}-replay", "fail", "idempotency replay failed", error)

    # 4. conflict: same key + different payload -> stable 409
    try:
        other, _, _ = item_templates(kind, sku, loc, dealer, n + 1000)
        status, data = dash_batch(kind, [other], admin, request_hash=commit_hash)
        if status != 409 or data.get("code") != "DASHBOARD_CONFLICT":
            raise AssertionError(f"conflict expected 409 DASHBOARD_CONFLICT got {status} {data.get('code')}")
        record(f"D-{kind}-conflict", "pass", "same key+different payload -> 409 DASHBOARD_CONFLICT")
    except Exception as error:  # noqa: BLE001
        record(f"D-{kind}-conflict", "fail", "idempotency conflict failed", error)

    # 5. retry gate: terminal but not failed -> 409
    try:
        status, data = dash_retry(job_id, admin)
        if status != 409 or data.get("code") != "DASHBOARD_CONFLICT":
            raise AssertionError(f"retry gate expected 409 DASHBOARD_CONFLICT got {status} {data.get('code')}")
        record(f"D-{kind}-partial-retry-409", "pass", f"retry of {job_status} job -> 409 (only failed jobs may retry)")
    except Exception as error:  # noqa: BLE001
        record(f"D-{kind}-partial-retry-409", "fail", "retry state gate failed", error)


def run_dashboard_erp_links_extra(admin, counter, dealer_code, loc_code):
    """erp_links semantics beyond the generic matrix: location readback,
    idempotent re-commit, dealer replace, wrong-dealer location rejection and
    the no-physical-unlink invariant (the batch never deletes link rows)."""
    counter["n"] += 1
    n = counter["n"]
    system = "f4-erp"
    erp_key = f"f4-erp-loc-x-{n}"
    dealer_id = sql_scalar(f"SELECT id FROM dealers WHERE code='{safe(dealer_code)}'")
    loc_id = sql_scalar(f"SELECT id FROM dealer_locations WHERE code='{safe(loc_code)}'")
    if not dealer_id or not loc_id:
        raise AssertionError(f"erp_links fixture dealer/location missing: {dealer_code} {loc_code}")

    def commit_link(item, tag):
        status, data = dash_batch("erp_links", [item], admin, request_hash=f"f4-dash-erp-links-{tag}-{n}")
        if status != 200:
            raise AssertionError(f"erp_links {tag} create failed: {status} {json.dumps(data)[:200]}")
        job_status, payload = poll_job_dashboard(data["data"]["jobId"], admin, step=f"erp-links-{tag}")
        summary = payload.get("summary", {}) if payload else {}
        if job_status != "succeeded" or summary.get("committed") != 1 or summary.get("failed") != 0:
            raise AssertionError(f"erp_links {tag} job wrong: {job_status} {summary}")
        return payload

    # 1. link with a location: readback shows both pointers persisted
    try:
        commit_link({"dealerCode": dealer_code, "erpSystem": system, "erpLocationId": erp_key, "dealerLocationCode": loc_code}, "loc")
        row = sql_scalar(
            f"SELECT \"dealerId\"||':'||coalesce(\"dealerLocationId\",'') FROM dealer_erp_links WHERE \"erpSystem\"='{system}' AND \"erpLocationId\"='{erp_key}'"
        )
        if row != f"{dealer_id}:{loc_id}":
            raise AssertionError(f"link readback mismatch: {row}")
        record("D-erp_links-location-readback", "pass", "link committed with location; dealerId/dealerLocationId pointers persisted")
    except Exception as error:  # noqa: BLE001
        record("D-erp_links-location-readback", "fail", "location readback failed", error)

    # 2. idempotent re-commit of the identical item (fresh job): still one row
    try:
        commit_link({"dealerCode": dealer_code, "erpSystem": system, "erpLocationId": erp_key, "dealerLocationCode": loc_code}, "loc-replay")
        if sql_scalar(f"SELECT count(*) FROM dealer_erp_links WHERE \"erpSystem\"='{system}' AND \"erpLocationId\"='{erp_key}'") != "1":
            raise AssertionError("idempotent re-commit duplicated the link row")
        record("D-erp_links-idempotent-recommit", "pass", "same link item re-committed; unique (erpSystem,erpLocationId) kept exactly one row")
    except Exception as error:  # noqa: BLE001
        record("D-erp_links-idempotent-recommit", "fail", "idempotent re-commit failed", error)

    # 3. a location of a different dealer is rejected per item
    try:
        wrong_key = f"f4-erp-loc-wrong-{n}"
        status, data = dash_batch(
            "erp_links",
            [{"dealerCode": dealer_code, "erpSystem": system, "erpLocationId": wrong_key, "dealerLocationCode": "v11-r1-p1-loc"}],
            admin,
            request_hash=f"f4-dash-erp-links-wrong-{n}",
        )
        if status != 200:
            raise AssertionError(f"wrong-dealer create failed: {status}")
        job_status, payload = poll_job_dashboard(data["data"]["jobId"], admin, step="erp-links-wrong")
        summary = payload.get("summary", {}) if payload else {}
        failed_entries = [r for r in (payload.get("results", []) if payload else []) if r["status"] == "failed"]
        if job_status != "failed" or summary.get("failed") != 1 or not failed_entries or "dealer location not found for dealer" not in (failed_entries[0].get("error") or ""):
            raise AssertionError(f"wrong-dealer location not rejected: {job_status} {summary} {failed_entries}")
        if sql_scalar(f"SELECT count(*) FROM dealer_erp_links WHERE \"erpSystem\"='{system}' AND \"erpLocationId\"='{wrong_key}'") != "0":
            raise AssertionError("wrong-dealer link row was persisted")
        record("D-erp_links-wrong-dealer-location", "pass", "location of another dealer -> per-item failed; no row persisted")
    except Exception as error:  # noqa: BLE001
        record("D-erp_links-wrong-dealer-location", "fail", "location ownership failed", error)

    # 4. same ERP location re-pointed to a different dealer (logical replace)
    try:
        repl_dealer = f"f4-dealer-repl-{n}"
        status, data = dash_batch("dealers", [{"code": repl_dealer, "name": f"F4 Replace Dealer {n}"}], admin, request_hash=f"f4-dash-dealer-repl-{n}")
        if status != 200:
            raise AssertionError(f"replace dealer create failed: {status}")
        repl_status, _ = poll_job_dashboard(data["data"]["jobId"], admin, step="erp-links-repl-dealer")
        if repl_status != "succeeded":
            raise AssertionError(f"replace dealer job failed: {repl_status}")
        repl_dealer_id = sql_scalar(f"SELECT id FROM dealers WHERE code='{safe(repl_dealer)}'")
        commit_link({"dealerCode": repl_dealer, "erpSystem": system, "erpLocationId": erp_key}, "replace")
        row = sql_scalar(f"SELECT \"dealerId\" FROM dealer_erp_links WHERE \"erpSystem\"='{system}' AND \"erpLocationId\"='{erp_key}'")
        if row != repl_dealer_id:
            raise AssertionError(f"link dealer replace failed: {row}")
        if sql_scalar(f"SELECT count(*) FROM dealer_erp_links WHERE \"erpSystem\"='{system}' AND \"erpLocationId\"='{erp_key}'") != "1":
            raise AssertionError("replace duplicated the link row")
        record("D-erp_links-replace-dealer", "pass", "same ERP location re-pointed to another dealer; single row kept")
    except Exception as error:  # noqa: BLE001
        record("D-erp_links-replace-dealer", "fail", "dealer replace failed", error)

    # 5. item without dealerLocationCode replaces the link at dealer level
    try:
        commit_link({"dealerCode": repl_dealer, "erpSystem": system, "erpLocationId": erp_key}, "dealer-level")
        row = sql_scalar(f"SELECT coalesce(\"dealerLocationId\",'') FROM dealer_erp_links WHERE \"erpSystem\"='{system}' AND \"erpLocationId\"='{erp_key}'")
        if row != "":
            raise AssertionError(f"dealer-level replace kept a location: {row}")
        record("D-erp_links-dealer-level-replace", "pass", "item without dealerLocationCode -> dealer-level link (dealerLocationId null)")
    except Exception as error:  # noqa: BLE001
        record("D-erp_links-dealer-level-replace", "fail", "dealer-level replace failed", error)

    # 6. the batch never physically unlinks: every key still has exactly one
    # row and no row was deleted or duplicated across this whole block
    try:
        total = int(sql_scalar(f"SELECT count(*) FROM dealer_erp_links WHERE \"erpSystem\"='{system}'"))
        rows = sql_scalar(
            "SELECT string_agg(c, ',') FROM ("
            f"SELECT \"erpLocationId\"||':'||count(*)::text AS c FROM dealer_erp_links WHERE \"erpSystem\"='{system}' GROUP BY \"erpLocationId\" ORDER BY 1) t"
        )
        parts = rows.split(",") if rows else []
        key_counts = dict(part.split(":", 1) for part in parts)
        if total != 2 or len(key_counts) != 2 or key_counts.get(f"f4-erp-loc-x-{n}") != "1" or any(value != "1" for value in key_counts.values()):
            raise AssertionError(f"link rows diverged (physical unlink?): total={total} keys={key_counts}")
        record("D-erp_links-no-physical-unlink", "pass", "two link keys, one row each; nothing deleted or duplicated by the batch")
    except Exception as error:  # noqa: BLE001
        record("D-erp_links-no-physical-unlink", "fail", "no-unlink invariant failed", error)


def run_dashboard_heal_retry(admin, counter):
    """A prices job whose item fails (unknown sku) ends 'failed'; after the sku
    is created through another batch, retry binds to the original job and
    succeeds (dependency-heal retry)."""
    try:
        counter["n"] += 1
        n = counter["n"]
        sku_code = f"f4-heal-sku-{n}"
        status, data = dash_batch("prices", [{"skuCode": sku_code, "amountCents": 1111}], admin, request_hash=f"f4-dash-heal-{n}")
        if status != 200:
            raise AssertionError(f"heal create failed: {status}")
        job_id = data["data"]["jobId"]
        job_status, payload = poll_job_dashboard(job_id, admin, step="heal-fail")
        summary = payload.get("summary", {}) if payload else {}
        if job_status != "failed" or summary.get("failed") != 1:
            raise AssertionError(f"expected failed job with 1 failed item, got {job_status} {summary}")
        status, data = dash_batch(
            "products",
            [{"name": f"F4 Heal Product {n}", "skuCode": sku_code}],
            admin,
            request_hash=f"f4-dash-heal-product-{n}",
        )
        if status != 200:
            raise AssertionError(f"heal product create failed: {status}")
        heal_status, _ = poll_job_dashboard(data["data"]["jobId"], admin, step="heal-product")
        if heal_status != "succeeded":
            raise AssertionError(f"heal product job failed: {heal_status}")
        status, data = dash_retry(job_id, admin)
        if status != 200 or data.get("data", {}).get("status") != "queued":
            raise AssertionError(f"heal retry did not queue: {status} {data}")
        retry_status, payload = poll_job_dashboard(job_id, admin, step="heal-retry")
        summary = payload.get("summary", {}) if payload else {}
        if retry_status != "succeeded" or summary.get("committed") != 1:
            job_error = sql_scalar(f"SELECT coalesce(\"errorSummary\"::text, '') FROM async_jobs WHERE id='{job_id}'")
            raise AssertionError(f"heal retry did not succeed: {retry_status} {summary} jobError={job_error[:240]}")
        if sql_scalar(f"SELECT count(*) FROM prices p JOIN platform_skus s ON s.id=p.\"skuId\" WHERE s.\"skuCode\"='{sku_code}' AND p.\"amountCents\"=1111 AND p.status='active'") != "1":
            raise AssertionError("heal retry did not persist the price")
        record("D-prices-retry-succeeds", "pass", "failed job retried after dependency heal; same job id succeeded with committed=1")
    except Exception as error:  # noqa: BLE001
        record("D-prices-retry-succeeds", "fail", "failed-job retry contract failed", error)


def run_dashboard_gates(admin, partial):
    try:
        status, data = dash_batch("categories", [{"slug": "f4-gate", "name": "Gate"}], partial)
        if status != 403 or data.get("code") != "DASHBOARD_FORBIDDEN":
            raise AssertionError(f"partial gate expected 403 DASHBOARD_FORBIDDEN got {status} {data.get('code')}")
        record("D-permission-gate-403", "pass", "partial admin POST categories -> 403 DASHBOARD_FORBIDDEN")
    except Exception as error:  # noqa: BLE001
        record("D-permission-gate-403", "fail", "permission gate failed", error)
    try:
        status, data = dash_batch("bogus_kind", [{"slug": "x", "name": "X"}], admin)
        if status != 400:
            raise AssertionError(f"unknown kind expected 400 got {status}")
        record("D-unknown-kind-400", "pass", "unsupported kind -> 400")
    except Exception as error:  # noqa: BLE001
        record("D-unknown-kind-400", "fail", "unknown-kind gate failed", error)


def run_field_ownership_matrix(admin, counter, sku_a, loc):
    """Contract §2/§3/§4/§5 + §7 nonOwnerField: VanStro-owned push fields are
    rejected per item with an explicit result — never silently ignored or
    overwritten. Each job runs one ownership-violating item; the item is
    'skipped' with the field name in the error and nothing is persisted."""
    counter["n"] += 1
    n = counter["n"]

    def one_owned_case(case_id, kind, item, absent_sql, field):
        try:
            status, data = dash_batch(kind, [item], admin, request_hash=f"f4-dash-owned-{kind}-{field}-{n}")
            if status != 200:
                raise AssertionError(f"{case_id} create failed: {status} {json.dumps(data)[:200]}")
            job_status, payload = poll_job_dashboard(data["data"]["jobId"], admin, step=f"owned-{kind}-{field}")
            summary = payload.get("summary", {}) if payload else {}
            skipped_entries = [r for r in (payload.get("results", []) if payload else []) if r["status"] == "skipped"]
            if summary.get("committed") != 0 or summary.get("skipped") != 1 or summary.get("failed") != 0:
                raise AssertionError(f"{case_id} summary wrong: {job_status} {summary}")
            error_text = (skipped_entries[0].get("error") or "") if skipped_entries else ""
            if "VanStro-owned" not in error_text or field not in error_text:
                raise AssertionError(f"{case_id} error did not name the owned field: {error_text}")
            if sql_scalar(absent_sql) != "0":
                raise AssertionError(f"{case_id} persisted the rejected item")
            # Per-item outcome is the contract surface (§7 nonOwnerField); the
            # job-level status is a product observation — all-skipped jobs
            # surface as 'failed' (completeAsyncJob rejects processed<1).
            record(case_id, "pass", f"item with VanStro-owned '{field}' -> per-item skipped, explicit error, nothing persisted (job status {job_status})")
        except Exception as error:  # noqa: BLE001
            record(case_id, "fail", f"field-ownership rejection failed ({field})", error)

    # §4 price owner: compareAtCents (marketing) and status (publish state)
    # are VanStro-owned; amountCents is ERP-owned.
    one_owned_case(
        "D-prices-owner-compareAtCents",
        "prices",
        {"skuCode": sku_a, "amountCents": 12345, "compareAtCents": 10000},
        "SELECT count(*) FROM prices p JOIN platform_skus s ON s.id=p.\"skuId\" WHERE s.\"skuCode\"='%s' AND p.\"amountCents\"=12345" % safe(sku_a),
        "compareAtCents",
    )
    one_owned_case(
        "D-prices-owner-status",
        "prices",
        {"skuCode": sku_a, "amountCents": 12346, "status": "active"},
        "SELECT count(*) FROM prices p JOIN platform_skus s ON s.id=p.\"skuId\" WHERE s.\"skuCode\"='%s' AND p.\"amountCents\"=12346" % safe(sku_a),
        "status",
    )
    # §3 inventory owner: reserved is VanStro-owned; onHand is ERP-owned.
    one_owned_case(
        "D-inventory-owner-reserved",
        "inventory",
        {"skuCode": sku_a, "locationCode": loc, "quantityOnHand": 77, "reserved": 3},
        "SELECT count(*) FROM inventory_snapshots i JOIN platform_skus s ON s.id=i.\"skuId\" WHERE s.\"skuCode\"='%s' AND i.\"quantityOnHand\"=77" % safe(sku_a),
        "reserved",
    )
    # §5 category owner: displayOrder and seo are VanStro-owned.
    one_owned_case(
        "D-categories-owner-displayOrder",
        "categories",
        {"slug": f"f4-owned-cat-{n}-a", "name": "Owned Cat A", "displayOrder": 5},
        "SELECT count(*) FROM categories WHERE slug='f4-owned-cat-%d-a'" % n,
        "displayOrder",
    )
    one_owned_case(
        "D-categories-owner-seo",
        "categories",
        {"slug": f"f4-owned-cat-{n}-b", "name": "Owned Cat B", "seo": {"title": "x"}},
        "SELECT count(*) FROM categories WHERE slug='f4-owned-cat-%d-b'" % n,
        "seo",
    )
    # §2/§7 products: slug is the VanStro-internal unique identity; status and
    # compareAtCents are VanStro-owned on the product push surface too.
    one_owned_case(
        "D-products-owner-slug",
        "products",
        {"name": f"Owned Product {n}", "skuCode": f"f4-owned-sku-{n}", "slug": f"owned-slug-{n}"},
        "SELECT count(*) FROM platform_skus WHERE \"skuCode\"='f4-owned-sku-%d'" % n,
        "slug",
    )
    one_owned_case(
        "D-products-owner-status",
        "products",
        {"name": f"Owned Product {n}", "skuCode": f"f4-owned-sku-{n}", "status": "active"},
        "SELECT count(*) FROM platform_skus WHERE \"skuCode\"='f4-owned-sku-%d'" % n,
        "status",
    )
    one_owned_case(
        "D-products-owner-compareAtCents",
        "products",
        {"name": f"Owned Product {n}", "skuCode": f"f4-owned-sku-{n}", "compareAtCents": 100},
        "SELECT count(*) FROM platform_skus WHERE \"skuCode\"='f4-owned-sku-%d'" % n,
        "compareAtCents",
    )


def publish_high_rate_limit(admin):
    """Publish the S08 API-service-account policy via the real settings
    lifecycle so the ERP v1 matrix can run without tripping the default
    100 req/min per-token ceiling inside a single window. The published value
    is the compiled default with a raised requestsPerMinute."""
    value = {
        "tokenLifecyclePolicy": {"defaultTtlDays": 90, "maximumTtlDays": 365, "rotationOverlapMinutes": 0, "maximumActiveTokensPerAccount": 1, "requireExpiry": False},
        "machineScopePolicy": {"allowedRoleKeys": [], "allowedPermissionFamilies": [], "environment": "production", "dealerLocationScopeMode": "global", "denySensitivePermissionsByDefault": True},
        "rateLimitPolicy": {"requestsPerMinute": 50000, "burst": 0, "mode": "per-token", "retryAfterSemantics": "seconds"},
        "auditInvocationPolicy": {"invocationRetentionDays": 365, "metadataRedactionMode": "standard", "lastUsedTrackingEnabled": True, "failedAuthenticationAuditEnabled": True},
    }
    status, data, _ = request_json(
        "/api/v1/dashboard/settings/s08-drafts", "POST",
        {"descriptorKey": "settings.api-service-account", "expectedPublishedVersion": 0, "value": value, "changeReason": "F4 batch-erp evidence: raise SA rate ceiling", "idempotencyKey": "f4-rate-limit-policy-0001"},
        admin,
    )
    if status != 201:
        raise AssertionError(f"rate policy draft create failed: {status} {json.dumps(data)[:200]}")
    draft_id = data["data"]["id"]
    draft_version = data["data"].get("version", 1)
    status, data, _ = request_json(f"/api/v1/dashboard/settings/s08-drafts/{draft_id}/validate", "POST", {"expectedVersion": draft_version, "idempotencyKey": "f4-rate-limit-policy-validate-0001"}, admin)
    validated = data.get("data", {})
    if status != 200 or validated.get("status") not in ("validated",):
        raise AssertionError(f"rate policy validate failed: {status} {json.dumps(data)[:200]}")
    # validate bumps the draft revision; publish must use the post-validate one
    draft_version = validated.get("validationRevision", validated.get("draftVersion", draft_version))
    status, data, _ = request_json(f"/api/v1/dashboard/settings/s08-drafts/{draft_id}/publish", "POST", {"expectedVersion": draft_version, "idempotencyKey": "f4-rate-limit-policy-publish-0001"}, admin)
    if status != 200 or data.get("data", {}).get("status") != "published":
        raise AssertionError(f"rate policy publish failed: {status} {json.dumps(data)[:200]}")


def grant_sa_write_permissions():
    """Fixture provisioning: give the seeded service account the write
    permissions the ERP v1 batch kinds enforce at apply time (products.write
    etc.), mirroring the machine role the seed already binds (cli.access +
    erp.sync.retry)."""
    sql_exec(
        "INSERT INTO roles (id, key, name, \"createdAt\", \"updatedAt\") "
        "VALUES ('f4-erp-writer-role', 'f4-erp-writer', 'F4 ERP Writer', now(), now()) "
        "ON CONFLICT (key) DO NOTHING"
    )
    for permission in ("products.write", "pricing.write", "inventory.write", "settings.write", "categories.write", "cli.access", "erp.sync.retry"):
        sql_exec(
            "INSERT INTO role_permissions (id, \"roleId\", \"permissionId\", \"createdAt\") "
            "SELECT 'f4-erp-writer-role-" + permission + "', r.id, p.id, now() FROM roles r, permissions p "
            f"WHERE r.key='f4-erp-writer' AND p.key='{permission}' ON CONFLICT DO NOTHING"
        )
    sql_exec(
        "INSERT INTO service_account_roles (id, \"serviceAccountId\", \"roleId\", \"createdAt\") "
        "SELECT 'f4-erp-binding', sa.id, r.id, now() FROM service_accounts sa, roles r "
        "WHERE sa.key='synthetic-v11' AND r.key='f4-erp-writer' ON CONFLICT DO NOTHING"
    )


def run_erp_matrix(admin, sku_a, sku_b, loc, counter):
    counter["n"] += 1
    n = counter["n"]

    publish_high_rate_limit(admin)

    # auth + scope deny
    try:
        status, _, _ = request_json(f"{ERP}/products")
        if status != 401:
            raise AssertionError(f"anonymous expected 401 got {status}")
        record("E-auth-deny-401", "pass", "anonymous ERP v1 request -> 401")
    except Exception as error:  # noqa: BLE001
        record("E-auth-deny-401", "fail", "auth deny failed", error)

    try:
        account_key = f"f4-no-role-{secrets.token_hex(6)}"
        status, payload, _ = request_json(
            "/api/v1/dashboard/mcp/service-accounts", "POST",
            {"key": account_key, "name": "F4 No Role", "roleIds": []}, admin,
        )
        if status != 201:
            raise AssertionError(f"no-role account create failed: {status}")
        account_id = payload["data"]["id"]
        status, payload, _ = request_json(
            f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens", "POST",
            {"name": "F4 no-role", "ttlDays": 1}, admin,
        )
        if status != 201 or not payload.get("data", {}).get("token"):
            raise AssertionError(f"no-role token create failed: {status}")
        no_role_token = payload["data"]["token"]
        status, _, _ = request_json(f"{ERP}/products", bearer=no_role_token)
        if status != 403:
            raise AssertionError(f"no-role machine expected 403 got {status}")
        token_id = payload["data"]["id"]
        request_json(f"/api/v1/dashboard/mcp/service-accounts/{account_id}/tokens/{token_id}", "DELETE", {"reason": "F4 evidence"}, admin)
        record("E-machine-deny-403", "pass", "SA without roles -> 403; anonymous -> 401")
    except Exception as error:  # noqa: BLE001
        record("E-machine-deny-403", "fail", "machine scope deny failed", error)

    # contract §7: requestHash is required (400 if missing/invalid)
    try:
        probe_item = [{"erpSkuKey": f"F4-REQ-{n}", "name": "Req"}]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": probe_item}, bearer=SA_TOKEN)
        if status != 400 or "requestHash is required" not in (data.get("error") or ""):
            raise AssertionError(f"missing requestHash expected 400 'requestHash is required' got {status} {data.get('error')}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": probe_item, "requestHash": "short"}, bearer=SA_TOKEN)
        if status != 400 or "requestHash is invalid" not in (data.get("error") or ""):
            raise AssertionError(f"invalid requestHash expected 400 got {status} {data.get('error')}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/unlist", "POST", {"items": [{"erpSkuKey": f"F4-REQ-{n}"}]}, bearer=SA_TOKEN)
        if status != 400 or "requestHash is required" not in (data.get("error") or ""):
            raise AssertionError(f"unlist missing requestHash expected 400 got {status} {data.get('error')}")
        record("E-request-hash-required-400", "pass", "batch/unlist without requestHash -> 400 'requestHash is required'; short hash -> 400")
    except Exception as error:  # noqa: BLE001
        record("E-request-hash-required-400", "fail", "requestHash-required contract failed", error)

    # contract §7: over-limit batches fail with 413, not 400
    try:
        over_items = [{"erpSkuKey": f"F4-OL-{i}-{n}", "name": f"OL {i}"} for i in range(501)]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": over_items, "requestHash": f"f4-erp-overlimit-{n}-0001"}, bearer=SA_TOKEN)
        if status != 413 or data.get("code") != "ERP_BATCH_LIMIT":
            raise AssertionError(f"over-limit batch expected 413 ERP_BATCH_LIMIT got {status} {data.get('code')}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/unlist", "POST", {"items": [{"erpSkuKey": f"F4-OLU-{i}"} for i in range(501)], "requestHash": f"f4-erp-overlimit-{n}-0002"}, bearer=SA_TOKEN)
        if status != 413 or data.get("code") != "ERP_BATCH_LIMIT":
            raise AssertionError(f"over-limit unlist expected 413 ERP_BATCH_LIMIT got {status} {data.get('code')}")
        record("E-over-limit-413", "pass", "501-item batch and unlist -> 413 ERP_BATCH_LIMIT")
    except Exception as error:  # noqa: BLE001
        record("E-over-limit-413", "fail", "413 over-limit contract failed", error)

    # contract §7: dry-run performs ZERO AsyncJob/ledger writes and returns the
    # synchronous per-item preview; VanStro-owned fields appear as skipped
    # items with explicit errors even before any permission is checked.
    try:
        jobs_before = int(sql_scalar("SELECT count(*) FROM async_jobs WHERE \"jobType\"='dashboard.batch.ingest'"))
        ledger_before = int(sql_scalar("SELECT count(*) FROM batch_ingest_results"))
        preview_items = [
            {"erpSkuKey": f"F4-PREV-SLUG-{n}", "name": f"Prev {n}", "slug": f"prev-slug-{n}"},
            {"erpSkuKey": f"F4-PREV-ST-{n}", "name": f"Prev {n}", "status": "active"},
            {"erpSkuKey": f"F4-PREV-CAC-{n}", "name": f"Prev {n}", "compareAtCents": 100},
            {"erpSkuKey": f"F4-PREV-OK-{n}", "name": f"Prev OK {n}"},
        ]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": preview_items, "dryRun": True, "requestHash": f"f4-erp-drypreview-{n}-0001"}, bearer=SA_TOKEN)
        body = data.get("data", {})
        if status != 200 or body.get("status") != "dry_run" or body.get("jobId") is not None:
            raise AssertionError(f"ERP dry-run preview wrong: {status} {json.dumps(data)[:200]}")
        results_list = body.get("results", [])
        summary = body.get("summary", {})
        errors_by_index = {entry["index"]: entry.get("error", "") for entry in results_list}
        if summary.get("committed") != 1 or summary.get("skipped") != 3 or summary.get("failed") != 0:
            raise AssertionError(f"dry-run preview summary wrong: {summary}")
        for idx in range(3):
            if "VanStro-owned" not in errors_by_index.get(idx, ""):
                raise AssertionError(f"dry-run preview did not flag owned field at index {idx}: {errors_by_index}")
        jobs_after = int(sql_scalar("SELECT count(*) FROM async_jobs WHERE \"jobType\"='dashboard.batch.ingest'"))
        ledger_after = int(sql_scalar("SELECT count(*) FROM batch_ingest_results"))
        if jobs_after != jobs_before or ledger_after != ledger_before:
            raise AssertionError(f"ERP dry-run wrote AsyncJob/ledger rows: jobs {jobs_before}->{jobs_after} ledger {ledger_before}->{ledger_after}")
        record("E-dry-run-zero-job-ledger", "pass", "dry_run preview with 1 committed + 3 VanStro-owned skipped; zero AsyncJob/ledger rows")
    except Exception as error:  # noqa: BLE001
        record("E-dry-run-zero-job-ledger", "fail", "ERP dry-run zero-write contract failed", error)

    # permission binding: ERP batch with an SA lacking products.write -> per-item failures, job failed
    try:
        heal_sku = f"F4-ERP-HEAL-{n}"
        items = [{"erpSkuKey": heal_sku, "name": f"F4 ERP Heal {n}", "priceCents": 4321, "currency": "CAD", "quantityOnHand": 9, "locationCode": "f4-erp-loc-main", "erpSystem": "f4-erp"}]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": items, "requestHash": f"f4-erp-perm-{n}"}, bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("status") != "queued":
            raise AssertionError(f"batch create failed: {status} {json.dumps(data)[:200]}")
        job_id = data["data"]["jobId"]
        job_status, payload = poll_job_erp(job_id, step="perm-binding")
        summary = payload.get("summary", {}) if payload else {}
        results_list = payload.get("results", []) if payload else []
        if job_status != "failed" or summary.get("failed") != 1 or not results_list or "products.write" not in (results_list[0].get("error") or ""):
            raise AssertionError(f"permission binding not enforced: {job_status} {summary} {results_list}")
        version = sql_scalar(f"SELECT version FROM async_jobs WHERE id='{job_id}'")
        status, data, _ = request_json(f"{ERP}/sync-jobs/{job_id}/retry?expectedVersion={int(version) + 1}", "POST", bearer=SA_TOKEN)
        if status != 409 or data.get("code") != "ERP_JOB_VERSION_CONFLICT":
            raise AssertionError(f"version conflict expected 409 ERP_JOB_VERSION_CONFLICT got {status} {data.get('code')}")
        record("E-batch-version-conflict-409", "pass", "retry with stale expectedVersion -> 409 ERP_JOB_VERSION_CONFLICT")
        record("E-batch-permission-binding", "pass", "SA without products.write -> per-item failed, job failed")
    except Exception as error:  # noqa: BLE001
        record("E-batch-version-conflict-409", "fail", "version conflict contract failed", error)
        record("E-batch-permission-binding", "fail", "permission binding contract failed", error)

    # grant write permissions, then heal-retry a data-dependency failure:
    # the retry re-executes the original job payload/authorization, so the
    # healable failure must be a missing row (unmapped category), not
    # authorization. Contract §1/§5: category identity resolves through
    # erp_category_mappings (erpCategoryKey+erpSystem) only; an unmapped key
    # fails per item with ERP_MAPPING_INCOMPLETE and never falls back.
    try:
        grant_sa_write_permissions()
        heal_sku = f"F4-ERP-HEAL-{n}"
        heal_cat_slug = f"f4-erp-heal-cat-{n}"
        heal_cat_key = f"f4-erp-heal-cat-key-{n}"
        items = [{"erpSkuKey": heal_sku, "name": f"F4 ERP Heal {n}", "erpCategoryKey": heal_cat_key, "erpSystem": "f4-erp", "priceCents": 4321, "currency": "CAD", "quantityOnHand": 9, "locationCode": "f4-erp-loc-main"}]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": items, "requestHash": f"f4-erp-heal-{n}"}, bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("status") != "queued":
            raise AssertionError(f"heal batch create failed: {status} {json.dumps(data)[:200]}")
        heal_job = data["data"]["jobId"]
        job_status, payload = poll_job_erp(heal_job, step="heal-fail")
        summary = payload.get("summary", {}) if payload else {}
        results_list = payload.get("results", []) if payload else []
        if job_status != "failed" or summary.get("failed") != 1 or not results_list or "ERP_MAPPING_INCOMPLETE" not in (results_list[0].get("error") or ""):
            raise AssertionError(f"heal job did not fail with ERP_MAPPING_INCOMPLETE: {job_status} {summary} {results_list}")
        if sql_scalar(f"SELECT count(*) FROM platform_skus WHERE \"skuCode\"='{safe(heal_sku)}'") != "0":
            raise AssertionError("unmapped-category item left a partial product row")
        version = sql_scalar(f"SELECT version FROM async_jobs WHERE id='{heal_job}'")
        # heal the dependency through the dashboard categories kind: the item
        # carries the ERP identity so the mapping row is upserted alongside.
        status, data = dash_batch("categories", [{"slug": heal_cat_slug, "name": f"F4 ERP Heal Category {n}", "erpSystem": "f4-erp", "erpCategoryKey": heal_cat_key}], admin, request_hash=f"f4-dash-heal-cat-{n}")
        if status != 200:
            raise AssertionError(f"heal category create failed: {status} {json.dumps(data)[:200]}")
        heal_cat_status, _ = poll_job_dashboard(data["data"]["jobId"], admin, step="heal-cat")
        if heal_cat_status != "succeeded":
            raise AssertionError(f"heal category job failed: {heal_cat_status}")
        if sql_scalar(f"SELECT count(*) FROM erp_category_mappings WHERE \"erpSystem\"='f4-erp' AND \"erpCategoryKey\"='{safe(heal_cat_key)}'") != "1":
            raise AssertionError("category mapping row was not persisted by the categories kind")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/sync-jobs/{heal_job}/retry?expectedVersion={version}", "POST", bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("status") != "queued":
            raise AssertionError(f"retry did not queue: {status} {json.dumps(data)[:200]}")
        retry_status, payload = poll_job_erp(heal_job, step="heal-retry")
        summary = payload.get("summary", {}) if payload else {}
        if retry_status != "succeeded" or summary.get("committed") != 1:
            job_error = sql_scalar(f"SELECT coalesce(\"errorSummary\"::text, '') FROM async_jobs WHERE id='{heal_job}'")
            raise AssertionError(f"heal retry failed: {retry_status} {summary} jobError={job_error[:240]}")
        record("E-batch-retry-succeeds", "pass", "unmapped erpCategoryKey -> per-item ERP_MAPPING_INCOMPLETE, job failed, no partial row; after mapping heal, same job id retried and succeeded committed=1")
    except Exception as error:  # noqa: BLE001
        record("E-batch-retry-succeeds", "fail", "retry-succeeds contract failed", error)

    # contract §7: Idempotency-Key header is honored as the canonical key and
    # must match the body requestHash. Runs post-grant so the commit job
    # applies (products.write is bound to the SA by now).
    try:
        header_key = f"f4-erp-header-{n}-0001"
        header_items = [{"erpSkuKey": f"F4-HDR-{n}", "name": f"F4 Header {n}", "priceCents": 777, "currency": "CAD"}]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": header_items, "requestHash": header_key}, bearer=SA_TOKEN, headers={"Idempotency-Key": header_key})
        if status != 200 or data.get("data", {}).get("status") != "queued":
            raise AssertionError(f"header-keyed create failed: {status} {json.dumps(data)[:200]}")
        header_job = data["data"]["jobId"]
        header_status, _ = poll_job_erp(header_job, step="header-key")
        if header_status != "succeeded":
            raise AssertionError(f"header-keyed job failed: {header_status}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": header_items, "requestHash": header_key}, bearer=SA_TOKEN, headers={"Idempotency-Key": header_key})
        if status != 200 or data.get("data", {}).get("status") != "replayed" or not data.get("data", {}).get("results"):
            raise AssertionError(f"header-keyed replay failed: {status} {json.dumps(data)[:200]}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": header_items, "requestHash": header_key}, bearer=SA_TOKEN, headers={"Idempotency-Key": f"f4-erp-header-{n}-9999"})
        if status != 400 or "does not match" not in (data.get("error") or ""):
            raise AssertionError(f"header mismatch expected 400 got {status} {data.get('error')}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": header_items, "requestHash": header_key}, bearer=SA_TOKEN, headers={"Idempotency-Key": "x"})
        if status != 400 or "Idempotency-Key header is invalid" not in (data.get("error") or ""):
            raise AssertionError(f"invalid header expected 400 got {status} {data.get('error')}")
        record("E-idempotency-key-header", "pass", "matching Idempotency-Key header creates+replays; mismatch and invalid header -> 400")
    except Exception as error:  # noqa: BLE001
        record("E-idempotency-key-header", "fail", "Idempotency-Key header contract failed", error)

    # product get: price/inventory correctness for the healed product. The
    # inventory read is deterministic (contract §3): the snapshot is only ever
    # the one for the resolved ERP location; the ERP-created product's publish
    # status stays the VanStro-owned default (draft).
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{heal_sku}?locationCode=f4-erp-loc-main&erpSystem=f4-erp", bearer=SA_TOKEN)
        product = data.get("data", {})
        if (
            status != 200
            or product.get("priceCents") != 4321
            or product.get("quantityOnHand") != 9
            or product.get("locationCode") != "v11-r1-p1-loc"
            or product.get("inventoryStatus") != "inventory_ok"
            or product.get("status") != "draft"
            or product.get("categorySlug") != heal_cat_slug
        ):
            raise AssertionError(f"product read mismatch: {status} {json.dumps(product)[:300]}")
        record("E-product-get-price-inventory", "pass", "GET /v1/products/:key?locationCode=... returned priceCents/quantityOnHand/locationCode/inventoryStatus/categorySlug; publish status stays draft")
    except Exception as error:  # noqa: BLE001
        record("E-product-get-price-inventory", "fail", "product data correctness failed", error)

    # batch create (fresh product) + sync-job detail
    try:
        create_sku = f"F4-ERP-CREATE-{n}"
        create_items = [{"erpSkuKey": create_sku, "name": f"F4 ERP Create {n}", "priceCents": 12345, "currency": "CAD", "quantityOnHand": 42, "locationCode": "f4-erp-loc-main", "erpSystem": "f4-erp"}]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": create_items, "requestHash": f"f4-erp-create-{n}"}, bearer=SA_TOKEN)
        if status != 200:
            raise AssertionError(f"create batch failed: {status}")
        create_job = data["data"]["jobId"]
        create_status, payload = poll_job_erp(create_job, step="create")
        if create_status != "succeeded" or payload.get("summary", {}).get("committed") != 1:
            raise AssertionError(f"create job wrong: {create_status} {payload.get('summary')}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/sync-jobs/{create_job}", bearer=SA_TOKEN)
        detail = data.get("data", {})
        if status != 200 or detail.get("status") != "succeeded" or detail.get("summary", {}).get("committed") != 1 or detail.get("results", [{}])[0].get("status") != "committed":
            raise AssertionError(f"sync-job detail mismatch: {status} {json.dumps(detail)[:300]}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{create_sku}?locationCode=f4-erp-loc-main&erpSystem=f4-erp", bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("priceCents") != 12345 or data.get("data", {}).get("quantityOnHand") != 42 or data.get("data", {}).get("inventoryStatus") != "inventory_ok":
            raise AssertionError(f"created product read mismatch: {status} {json.dumps(data.get('data', {}))[:200]}")
        record("E-batch-create", "pass", "create batch committed; sync-job detail shows per-item results; product read confirms price/inventory at the resolved location")
    except Exception as error:  # noqa: BLE001
        record("E-batch-create", "fail", "batch create contract failed", error)

    # contract §3: deterministic inventory read — without a location the read
    # explicitly says inventory_no_dealer instead of picking an arbitrary
    # snapshot; with a mapped location it returns that location's snapshot;
    # an unmapped ERP location id is inventory_no_dealer as well.
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{create_sku}", bearer=SA_TOKEN)
        nod = data.get("data", {})
        if status != 200 or nod.get("quantityOnHand") is not None or nod.get("locationCode") is not None or nod.get("inventoryStatus") != "inventory_no_dealer":
            raise AssertionError(f"no-location read must be inventory_no_dealer: {status} {json.dumps(nod)[:200]}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{create_sku}?locationCode=f4-erp-loc-main&erpSystem=f4-erp", bearer=SA_TOKEN)
        located = data.get("data", {})
        if status != 200 or located.get("quantityOnHand") != 42 or located.get("locationCode") != "v11-r1-p1-loc" or located.get("inventoryStatus") != "inventory_ok":
            raise AssertionError(f"located read mismatch: {status} {json.dumps(located)[:200]}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{create_sku}?locationCode=f4-erp-unmapped-{n}&erpSystem=f4-erp", bearer=SA_TOKEN)
        unmapped = data.get("data", {})
        if status != 200 or unmapped.get("quantityOnHand") is not None or unmapped.get("inventoryStatus") != "inventory_no_dealer":
            raise AssertionError(f"unmapped location read must be inventory_no_dealer: {status} {json.dumps(unmapped)[:200]}")
        record("E-inventory-deterministic", "pass", "no location -> inventory_no_dealer; mapped location -> exact snapshot; unmapped id -> inventory_no_dealer (never an arbitrary snapshot)")
    except Exception as error:  # noqa: BLE001
        record("E-inventory-deterministic", "fail", "deterministic inventory read failed", error)

    # batch update: change price/inventory of the seeded sku_b product; verify data + price history
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{sku_b}", bearer=SA_TOKEN)
        if status != 200:
            raise AssertionError(f"sku_b read failed: {status}")
        before = data["data"]
        update_items = [{"erpSkuKey": sku_b, "name": before["name"], "priceCents": 9876, "currency": "CAD", "quantityOnHand": 31, "locationCode": "f4-erp-loc-main", "erpSystem": "f4-erp"}]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": update_items, "requestHash": f"f4-erp-update-{n}"}, bearer=SA_TOKEN)
        if status != 200:
            raise AssertionError(f"update batch failed: {status}")
        update_job = data["data"]["jobId"]
        update_status, _ = poll_job_erp(update_job, step="update")
        if update_status != "succeeded":
            raise AssertionError(f"update job failed: {update_status}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{sku_b}?locationCode=f4-erp-loc-main&erpSystem=f4-erp", bearer=SA_TOKEN)
        after = data.get("data", {})
        if status != 200 or after.get("priceCents") != 9876 or after.get("quantityOnHand") != 31 or after.get("status") != "active" or after.get("inventoryStatus") != "inventory_ok":
            raise AssertionError(f"update read mismatch: {status} {json.dumps(after)[:300]}")
        price_history = sql_scalar(
            "SELECT count(*) FROM prices p JOIN platform_skus s ON s.id=p.\"skuId\" "
            f"WHERE s.\"skuCode\"='{safe(sku_b)}' AND p.status='active' AND p.\"amountCents\"=9876"
        )
        if price_history != "1":
            raise AssertionError("active price row for updated value missing")
        record("E-batch-update", "pass", "update batch committed; GET returns new priceCents/quantityOnHand; active price row persisted")
    except Exception as error:  # noqa: BLE001
        record("E-batch-update", "fail", "batch update contract failed", error)

    # idempotency replay + conflict on the ERP surface
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": update_items, "requestHash": f"f4-erp-update-{n}"}, bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("status") != "replayed" or not data["data"].get("results"):
            raise AssertionError(f"ERP replay failed: {status} {json.dumps(data)[:200]}")
        record("E-idempotency-replay", "pass", "same requestHash+payload -> 200 replayed with per-item results")
    except Exception as error:  # noqa: BLE001
        record("E-idempotency-replay", "fail", "ERP idempotency replay failed", error)
    try:
        conflicting = [{"erpSkuKey": sku_b, "name": before["name"], "priceCents": 9999, "currency": "CAD", "quantityOnHand": 31, "locationCode": "f4-erp-loc-main", "erpSystem": "f4-erp"}]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/batch", "POST", {"items": conflicting, "requestHash": f"f4-erp-update-{n}"}, bearer=SA_TOKEN)
        if status != 409 or data.get("code") != "ERP_IDEMPOTENCY_CONFLICT":
            raise AssertionError(f"ERP conflict expected 409 ERP_IDEMPOTENCY_CONFLICT got {status} {data.get('code')}")
        record("E-idempotency-conflict-409", "pass", "same requestHash+different payload -> 409 ERP_IDEMPOTENCY_CONFLICT")
    except Exception as error:  # noqa: BLE001
        record("E-idempotency-conflict-409", "fail", "ERP idempotency conflict failed", error)

    # unlist: dry-run preview (zero AsyncJob/ledger writes), then commit -> archived
    try:
        jobs_before = int(sql_scalar("SELECT count(*) FROM async_jobs WHERE \"jobType\"='dashboard.batch.ingest'"))
        ledger_before = int(sql_scalar("SELECT count(*) FROM batch_ingest_results"))
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/unlist", "POST", {"items": [{"erpSkuKey": sku_b}], "dryRun": True, "requestHash": f"f4-erp-unlist-dry-{n}"}, bearer=SA_TOKEN)
        body = data.get("data", {})
        if status != 200 or body.get("status") != "dry_run" or body.get("jobId") is not None or body.get("summary", {}).get("committed") != 1:
            raise AssertionError(f"unlist dry-run preview wrong: {status} {json.dumps(data)[:200]}")
        jobs_after = int(sql_scalar("SELECT count(*) FROM async_jobs WHERE \"jobType\"='dashboard.batch.ingest'"))
        ledger_after = int(sql_scalar("SELECT count(*) FROM batch_ingest_results"))
        if jobs_after != jobs_before or ledger_after != ledger_before:
            raise AssertionError(f"unlist dry-run wrote AsyncJob/ledger rows: jobs {jobs_before}->{jobs_after} ledger {ledger_before}->{ledger_after}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{sku_b}", bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("status") != "active":
            raise AssertionError("unlist dry-run changed status")
        record("E-unlist-dry-run", "pass", "dry_run preview committed=1 with jobId null; zero AsyncJob/ledger rows; product still active")
    except Exception as error:  # noqa: BLE001
        record("E-unlist-dry-run", "fail", "unlist dry-run failed", error)
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/unlist", "POST", {"items": [{"erpSkuKey": sku_b}], "requestHash": f"f4-erp-unlist-{n}"}, bearer=SA_TOKEN)
        if status != 200:
            raise AssertionError(f"unlist failed: {status}")
        unlist_job = data["data"]["jobId"]
        unlist_status, _ = poll_job_erp(unlist_job, step="unlist")
        if unlist_status != "succeeded":
            raise AssertionError(f"unlist job failed: {unlist_status}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/{sku_b}", bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("status") != "archived":
            raise AssertionError(f"unlist did not archive: {status} {json.dumps(data.get('data', {}))[:200]}")
        record("E-unlist-commit", "pass", "unlist committed; product read shows status archived")
    except Exception as error:  # noqa: BLE001
        record("E-unlist-commit", "fail", "unlist commit failed", error)

    # products list + cursor pagination
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products?limit=3", bearer=SA_TOKEN)
        page1 = data.get("data", {})
        if status != 200 or len(page1.get("items", [])) != 3 or not page1.get("nextCursor"):
            raise AssertionError(f"list page1 mismatch: {status} {json.dumps(page1)[:200]}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products?limit=3&cursor={urllib.parse.quote(page1['nextCursor'])}", bearer=SA_TOKEN)
        page2 = data.get("data", {})
        ids1 = {item["erpSkuKey"] for item in page1["items"]}
        ids2 = {item["erpSkuKey"] for item in page2.get("items", [])}
        if status != 200 or not ids2 or ids1 & ids2:
            raise AssertionError("cursor page overlaps with page1")
        stamps1 = [item["updatedAt"] for item in page1["items"]]
        stamps2 = [item["updatedAt"] for item in page2["items"]]
        if any(a < b for a, b in zip(stamps1, stamps1[1:])) or any(a < b for a, b in zip(stamps2, stamps2[1:])) or page1["items"][-1]["updatedAt"] < page2["items"][0]["updatedAt"]:
            raise AssertionError("updatedAt ordering broken across cursor pages")
        request_count["sa"] += 1
        status, _, _ = request_json(f"{ERP}/products?cursor=garbage", bearer=SA_TOKEN)
        if status != 400:
            raise AssertionError(f"bad cursor expected 400 got {status}")
        request_count["sa"] += 1
        status, _, _ = request_json(f"{ERP}/products?updatedSince=not-a-date", bearer=SA_TOKEN)
        if status != 400:
            raise AssertionError(f"bad updatedSince expected 400 got {status}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/products/f4-no-such-sku-xyz", bearer=SA_TOKEN)
        if status != 404 or data.get("code") != "ERP_SKU_NOT_FOUND":
            raise AssertionError(f"missing product expected 404 ERP_SKU_NOT_FOUND got {status} {data.get('code')}")
        record("E-products-list-cursor", "pass", "limit/cursor pages disjoint and ordered; bad cursor/updatedSince -> 400; missing sku -> 404 ERP_SKU_NOT_FOUND")
    except Exception as error:  # noqa: BLE001
        record("E-products-list-cursor", "fail", "products list/cursor contract failed", error)

    # sync-jobs list, cursor and status filter
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/sync-jobs?limit=3", bearer=SA_TOKEN)
        jobs1 = data.get("data", {})
        if status != 200 or len(jobs1.get("items", [])) != 3 or not jobs1.get("nextCursor"):
            raise AssertionError(f"sync-jobs page1 mismatch: {status} {json.dumps(jobs1)[:200]}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/sync-jobs?limit=3&cursor={urllib.parse.quote(jobs1['nextCursor'])}", bearer=SA_TOKEN)
        jobs2 = data.get("data", {})
        jids1 = {item["id"] for item in jobs1["items"]}
        jids2 = {item["id"] for item in jobs2.get("items", [])}
        if status != 200 or not jids2 or jids1 & jids2:
            raise AssertionError("sync-jobs cursor page overlaps")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/sync-jobs?status=succeeded&limit=100", bearer=SA_TOKEN)
        if status != 200 or not data["data"]["items"] or any(item["status"] != "succeeded" for item in data["data"]["items"]):
            raise AssertionError("status=succeeded filter mismatch")
        request_count["sa"] += 1
        status, _, _ = request_json(f"{ERP}/sync-jobs/00000000-0000-4000-8000-000000000000", bearer=SA_TOKEN)
        if status != 404:
            raise AssertionError(f"unknown sync job expected 404 got {status}")
        record("E-sync-jobs-list-cursor-filter", "pass", "sync-jobs cursor pages disjoint; status filter honored; unknown id -> 404")
    except Exception as error:  # noqa: BLE001
        record("E-sync-jobs-list-cursor-filter", "fail", "sync-jobs list contract failed", error)

    # retry state conflict on a succeeded job
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/sync-jobs/{create_job}/retry", "POST", bearer=SA_TOKEN)
        if status != 409 or data.get("code") != "ERP_JOB_STATE_CONFLICT":
            raise AssertionError(f"succeeded retry expected 409 ERP_JOB_STATE_CONFLICT got {status} {data.get('code')}")
        record("E-retry-state-conflict-409", "pass", "retry of succeeded job -> 409 ERP_JOB_STATE_CONFLICT")
    except Exception as error:  # noqa: BLE001
        record("E-retry-state-conflict-409", "fail", "retry state conflict failed", error)

    # OpenAPI document served live
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/openapi", bearer=SA_TOKEN)
        if status != 200 or data.get("openapi") != "3.0.3":
            raise AssertionError(f"openapi doc mismatch: {status}")
        paths = set(data.get("paths", {}))
        required = {"/v1/products", "/v1/products/{erpSkuKey}", "/v1/products/batch", "/v1/products/unlist", "/v1/sync-jobs", "/v1/sync-jobs/{id}", "/v1/sync-jobs/{id}/retry", "/v1/connection-test", "/v1/webhooks", "/v1/webhooks/{id}", "/v1/openapi"}
        if not required.issubset(paths):
            raise AssertionError(f"openapi paths missing: {sorted(required - paths)}")
        if data.get("security") != [{"serviceAccountBearer": []}]:
            raise AssertionError("openapi security scheme mismatch")
        record("E-openapi-doc", "pass", "live /v1/openapi 3.0.3 with 11 required paths and serviceAccountBearer security")
    except Exception as error:  # noqa: BLE001
        record("E-openapi-doc", "fail", "openapi contract failed", error)

    # connection test
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/connection-test", "POST", bearer=SA_TOKEN)
        info = data.get("data", {})
        if status != 200 or set(info) != {"configured", "maskedUrl", "lastTestedAt", "status", "reachable", "serviceAccountKey"}:
            raise AssertionError(f"connection-test DTO mismatch: {status} {sorted(info)}")
        if not info["configured"] or not info["reachable"] or "…" not in info["maskedUrl"]:
            raise AssertionError("connection-test bounded state mismatch")
        record("E-connection-test", "pass", "connection-test 200 with six-field safe DTO and masked URL")
    except Exception as error:  # noqa: BLE001
        record("E-connection-test", "fail", "connection-test failed", error)

    # webhook CRUD on the ERP v1 surface
    try:
        webhook_url = f"https://example.invalid/f4-{secrets.token_hex(8)}"
        webhook_secret = f"f4-{secrets.token_urlsafe(20)}"
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/webhooks", "POST", {"url": webhook_url, "events": ["sync.completed"], "secret": webhook_secret}, bearer=SA_TOKEN)
        created = data.get("data", {})
        if status != 200 or created.get("secret") != webhook_secret:
            raise AssertionError(f"webhook create failed or secret not returned once: {status} {json.dumps(created)[:200]}")
        webhook_id = created["id"]
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/webhooks", bearer=SA_TOKEN)
        listed_text = json.dumps(data)
        if status != 200 or contains_sensitive_key(data) or webhook_secret in listed_text:
            raise AssertionError("webhook list exposed secret/hash")
        expected_hash = hashlib.sha256(b"vanstro:erp-webhook:v1\0" + webhook_secret.encode()).hexdigest()
        stored = sql_scalar(f"SELECT count(*) FROM erp_webhooks WHERE id='{safe(webhook_id)}' AND \"secretHash\"='{expected_hash}'")
        if stored != "1":
            raise AssertionError("webhook secretHash mismatch")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/webhooks/{webhook_id}", "DELETE", bearer=SA_TOKEN)
        if status != 200 or data.get("data", {}).get("deleted") is not True:
            raise AssertionError(f"webhook delete failed: {status}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/webhooks/{webhook_id}", "DELETE", bearer=SA_TOKEN)
        if status != 404 or data.get("code") != "ERP_WEBHOOK_NOT_FOUND":
            raise AssertionError(f"repeat delete expected 404 ERP_WEBHOOK_NOT_FOUND got {status} {data.get('code')}")
        request_count["sa"] += 1
        status, _, _ = request_json(f"{ERP}/webhooks", "POST", {"url": webhook_url, "events": ["sync.completed"], "secret": "short"}, bearer=SA_TOKEN)
        if status != 400:
            raise AssertionError(f"short secret expected 400 got {status}")
        record("E-webhooks-crud", "pass", "create returns secret once; list is safe; hash persisted domain-separated; delete 200 then 404; short secret -> 400")
    except Exception as error:  # noqa: BLE001
        record("E-webhooks-crud", "fail", "webhook CRUD failed", error)


def run_erp_orders_matrix(admin, counter, sku_a):
    """Contract A consumption — ERP v1 orders list/get against the real API.

    The disposable fixture carries one seeded order; two synthetic orders with
    pinned updatedAt values are inserted so cursor pagination is deterministic:
    the seeded order is newest, then synthetic A (120 min old), then synthetic
    B (180 min old). Only safe operational fields and line items are asserted;
    customer PII and payment internals must never appear."""
    counter["n"] += 1
    n = counter["n"]
    order_a = f"00000000-0000-4000-8000-00000000f4a{n:02d}"
    order_b = f"00000000-0000-4000-8000-00000000f4b{n:02d}"
    session_a = f"00000000-0000-4000-8000-00000000f4c{n:02d}"
    session_b = f"00000000-0000-4000-8000-00000000f4d{n:02d}"
    # Provision two synthetic orders (disposable fixture; synthetic identifiers).
    for suffix, order_id, session_id, age_min, cents, tax, total, qty in (
        ("a", order_a, session_a, 120, 20000, 2600, 22600, 2),
        ("b", order_b, session_b, 180, 5000, 650, 5650, 1),
    ):
        sql_exec(
            "INSERT INTO payment_sessions (id, \"guestEmail\", \"guestFirstName\", \"guestLastName\", \"guestPhone\", \"guestOrderToken\", status, fulfillment, \"paymentMethod\", items, \"subtotalCents\", \"taxCents\", \"totalCents\", \"expiresAt\", \"createdAt\", \"updatedAt\") "
            f"VALUES ('{session_id}', 'synthetic-f4{suffix}@vanstro.test', 'Synthetic', 'F4 {suffix.upper()}', '555-01{suffix}', 'f4-order-token-{suffix}-{n}', 'paid', 'pickup', 'card', '[]'::jsonb, {cents}, {tax}, {total}, now() + interval '1 hour', now() - interval '{age_min} minutes', now() - interval '{age_min} minutes')"
        )
        sql_exec(
            "INSERT INTO orders (id, email, \"firstName\", \"lastName\", phone, \"guestOrderToken\", \"paymentMethod\", \"paymentSessionId\", status, fulfillment, currency, \"subtotalCents\", \"discountCents\", \"taxCents\", \"shippingCents\", \"totalCents\", \"createdAt\", \"updatedAt\") "
            f"VALUES ('{order_id}', 'synthetic-f4{suffix}@vanstro.test', 'Synthetic', 'F4 {suffix.upper()}', '555-01{suffix}', 'f4-order-token-{suffix}-{n}', 'card', '{session_id}', 'paid', 'pickup', 'CAD', {cents}, 0, {tax}, 0, {total}, now() - interval '{age_min} minutes', now() - interval '{age_min} minutes')"
        )
        sql_exec(
            "INSERT INTO order_items (id, \"orderId\", \"skuCode\", \"productName\", quantity, \"unitPriceCents\", \"lineTotalCents\", currency) "
            f"VALUES ('{order_id}-i1', '{order_id}', '{safe(sku_a)}', 'Synthetic F4 Item {suffix.upper()}', {qty}, {cents // qty}, {cents}, 'CAD')"
        )
    seeded_id = sql_scalar("SELECT id FROM orders WHERE email='synthetic-buyer@vanstro.test'")
    if not seeded_id:
        raise AssertionError("seeded order missing")

    # list: safe DTO on every row, line items present, no PII keys
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/orders?limit=2", bearer=SA_TOKEN)
        page = data.get("data", {})
        items = page.get("items", [])
        if status != 200 or len(items) != 2 or not page.get("nextCursor"):
            raise AssertionError(f"orders page1 mismatch: {status} {json.dumps(page)[:300]}")
        for entry in items:
            if set(entry) != ORDER_SAFE_KEYS:
                raise AssertionError(f"order item field set mismatch: {sorted(entry)}")
            lines = entry.get("items", [])
            if not isinstance(lines, list) or not lines:
                raise AssertionError("order item missing line items")
            for line in lines:
                if set(line) != ORDER_LINE_KEYS:
                    raise AssertionError(f"order line field set mismatch: {sorted(line)}")
        leaked = pii_keys_present(page)
        if leaked:
            raise AssertionError(f"order list leaked PII keys: {sorted(leaked)}")
        record("E-orders-list-safe", "pass", "list returns exactly the safe order DTO with line items; no customer PII keys")
    except Exception as error:  # noqa: BLE001
        record("E-orders-list-safe", "fail", "orders list safe DTO failed", error)

    # cursor pagination: disjoint pages, descending updatedAt, terminal page has no cursor
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/orders?limit=2&cursor={urllib.parse.quote(page['nextCursor'])}", bearer=SA_TOKEN)
        page2 = data.get("data", {})
        ids1 = {item["id"] for item in items}
        ids2 = {item["id"] for item in page2.get("items", [])}
        if status != 200 or not ids2 or ids1 & ids2:
            raise AssertionError("orders cursor page overlaps with page1")
        if page2.get("nextCursor") is not None:
            raise AssertionError("last orders page must not carry a cursor")
        stamps1 = [item["updatedAt"] for item in items]
        stamps2 = [item["updatedAt"] for item in page2["items"]]
        if any(a < b for a, b in zip(stamps1, stamps1[1:])) or any(a < b for a, b in zip(stamps2, stamps2[1:])) or items[-1]["updatedAt"] < page2["items"][0]["updatedAt"]:
            raise AssertionError("orders updatedAt ordering broken across cursor pages")
        record("E-orders-list-cursor", "pass", "limit/cursor pages disjoint, descending updatedAt, terminal page has no cursor")
    except Exception as error:  # noqa: BLE001
        record("E-orders-list-cursor", "fail", "orders cursor contract failed", error)

    # detail: same safe DTO, seed values intact, one line item
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/orders/{seeded_id}", bearer=SA_TOKEN)
        detail = data.get("data", {})
        if status != 200 or not isinstance(detail, dict) or set(detail) != ORDER_SAFE_KEYS:
            raise AssertionError(f"detail field set mismatch: {status} {sorted(detail) if isinstance(detail, dict) else detail}")
        for key, value in {
            "status": "paid", "fulfillment": "pickup", "currency": "CAD",
            "subtotalCents": 10000, "discountCents": 0, "taxCents": 1300,
            "shippingCents": 0, "totalCents": 11300,
            "dealerId": None, "dealerLocationId": None,
        }.items():
            if detail.get(key) != value:
                raise AssertionError(f"detail {key} mismatch: {detail.get(key)!r} != {value!r}")
        lines = detail.get("items", [])
        if len(lines) != 1 or set(lines[0]) != ORDER_LINE_KEYS:
            raise AssertionError(f"detail lines mismatch: {lines}")
        for key, value in {"skuCode": "SYN-CAB-1", "productName": "Synthetic Cabinet", "quantity": 1, "unitPriceCents": 10000, "lineTotalCents": 10000}.items():
            if lines[0].get(key) != value:
                raise AssertionError(f"detail line {key} mismatch: {lines[0].get(key)!r}")
        leaked = pii_keys_present(detail)
        if leaked:
            raise AssertionError(f"order detail leaked PII keys: {sorted(leaked)}")
        record("E-orders-detail-safe", "pass", "GET /v1/orders/:id returns the safe DTO with seed values and one line item")
    except Exception as error:  # noqa: BLE001
        record("E-orders-detail-safe", "fail", "order detail contract failed", error)

    # unknown order -> stable 404
    try:
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/orders/00000000-0000-4000-8000-000000000000", bearer=SA_TOKEN)
        if status != 404 or not str(data.get("code", "")).endswith("NOT_FOUND"):
            raise AssertionError(f"unknown order expected 404 *NOT_FOUND got {status} {data.get('code')}")
        record("E-orders-404", "pass", "unknown order id -> 404 with NOT_FOUND code")
    except Exception as error:  # noqa: BLE001
        record("E-orders-404", "fail", "order 404 contract failed", error)

    # validation gates consistent with the products surface: 400 on bad
    # cursor/updatedSince/status; the status filter is honored when valid
    try:
        request_count["sa"] += 1
        status, _, _ = request_json(f"{ERP}/orders?cursor=garbage", bearer=SA_TOKEN)
        if status != 400:
            raise AssertionError(f"bad orders cursor expected 400 got {status}")
        request_count["sa"] += 1
        status, _, _ = request_json(f"{ERP}/orders?updatedSince=not-a-date", bearer=SA_TOKEN)
        if status != 400:
            raise AssertionError(f"bad orders updatedSince expected 400 got {status}")
        request_count["sa"] += 1
        status, _, _ = request_json(f"{ERP}/orders?status=bogus-status", bearer=SA_TOKEN)
        if status != 400:
            raise AssertionError(f"bad orders status expected 400 got {status}")
        request_count["sa"] += 1
        status, data, _ = request_json(f"{ERP}/orders?status=paid", bearer=SA_TOKEN)
        if status != 200 or not data.get("data", {}).get("items") or any(item["status"] != "paid" for item in data["data"]["items"]):
            raise AssertionError(f"orders status=paid filter mismatch: {status}")
        record("E-orders-validation-400", "pass", "bad cursor/updatedSince/status -> 400; status=paid filter honored")
    except Exception as error:  # noqa: BLE001
        record("E-orders-validation-400", "fail", "orders validation contract failed", error)


def provision_erp_location_link(admin, counter):
    """Fixture: map the ERP location id f4-erp-loc-main to the seeded dealer
    location v11-r1-p1-loc through the canonical erp_links kind so the ERP v1
    matrix exercises deterministic inbound inventory resolution (contract §3).
    Runs after the erp_links extra block so its two-key invariant holds."""
    counter["n"] += 1
    n = counter["n"]
    try:
        status, data = dash_batch(
            "erp_links",
            [{"dealerCode": "v11-r1-p1-dealer", "erpSystem": "f4-erp", "erpLocationId": "f4-erp-loc-main", "dealerLocationCode": "v11-r1-p1-loc"}],
            admin,
            request_hash=f"f4-dash-erp-links-main-{n}",
        )
        if status != 200:
            raise AssertionError(f"main erp link create failed: {status} {json.dumps(data)[:200]}")
        job_status, payload = poll_job_dashboard(data["data"]["jobId"], admin, step="erp-links-main")
        summary = payload.get("summary", {}) if payload else {}
        if job_status != "succeeded" or summary.get("committed") != 1:
            raise AssertionError(f"main erp link job wrong: {job_status} {summary}")
        row = sql_scalar(
            "SELECT l.\"dealerLocationId\" FROM dealer_erp_links l "
            "JOIN dealer_locations dl ON dl.id=l.\"dealerLocationId\" "
            "WHERE l.\"erpSystem\"='f4-erp' AND l.\"erpLocationId\"='f4-erp-loc-main' AND dl.code='v11-r1-p1-loc'"
        )
        if not row:
            raise AssertionError("main erp link did not map to v11-r1-p1-loc")
        record("D-erp-links-main-fixture", "pass", "f4-erp-loc-main -> v11-r1-p1-loc link provisioned for the ERP matrix")
    except Exception as error:  # noqa: BLE001
        record("D-erp-links-main-fixture", "fail", "main erp link provisioning failed", error)


def main():
    admin = login_token(ADMIN_EMAIL)
    partial = login_token(PARTIAL_EMAIL)
    counter = {"n": 0}

    sku_rows = sql_scalar("SELECT string_agg(\"skuCode\", ',') FROM (SELECT \"skuCode\" FROM platform_skus ORDER BY \"skuCode\" LIMIT 2) t")
    sku_codes = [entry for entry in (sku_rows or "").split(",") if entry]
    if len(sku_codes) != 2:
        raise AssertionError(f"need 2 seeded skus, got {sku_codes}")
    sku_a, sku_b = sku_codes[0], sku_codes[1]
    loc = "v11-r1-p1-loc"
    if sql_scalar(f"SELECT count(*) FROM dealer_locations WHERE code='{loc}'") != "1":
        raise AssertionError("seeded dealer location v11-r1-p1-loc missing")

    # dealers commit first: dealer_locations depend on it
    run_dashboard_kind_matrix("dealers", sku_a, loc, "f4-dealer-none", admin, counter)
    dealer_code = f"f4-dealer-{counter['n']}"
    run_dashboard_kind_matrix("dealer_locations", sku_a, loc, dealer_code, admin, counter)
    loc_code = f"f4-loc-{counter['n']}"
    for kind in ("erp_links", "categories", "prices", "inventory", "sku_mappings"):
        run_dashboard_kind_matrix(kind, sku_a, loc_code, dealer_code, admin, counter)
    run_dashboard_erp_links_extra(admin, counter, dealer_code, loc_code)

    run_dashboard_heal_retry(admin, counter)
    run_dashboard_gates(admin, partial)
    run_field_ownership_matrix(admin, counter, sku_a, loc_code)

    provision_erp_location_link(admin, counter)

    run_erp_matrix(admin, sku_a, sku_b, loc, counter)
    run_erp_orders_matrix(admin, counter, sku_a)

    artifact = {
        "schemaVersion": "vanstro.v11-r1.functional-first.batch-erp.v1",
        "testedCommit": TESTED_COMMIT,
        "testedTree": TESTED_TREE,
        "cases": results,
        "saRequestCount": request_count["sa"],
        "priorEvidence": {
            "p4": "qa/v11-auth-browser/v11-r1-p4-final-evidence.py B01/B02/B03 (products kind, panel)",
            "p6": "qa/v11-auth-browser/v11-r1-p6-final-evidence.py R1-R8 (webhook/connection/openapi proxy/429/SA lifecycle/audit)",
        },
        "sensitive": False,
        "error": None,
    }
    with open(os.path.join(OUT, "acceptance-results.json"), "w", encoding="utf8") as handle:
        json.dump(artifact, handle, indent=1, ensure_ascii=False)

    failed = [case_id for case_id, result in results.items() if result["status"] != "pass"]
    print(f"V11_FUNCTIONAL_FIRST_BATCH_ERP: {len(results) - len(failed)}/{len(results)} cases passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
