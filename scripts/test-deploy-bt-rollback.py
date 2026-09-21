#!/usr/bin/env python3
"""Focused dry-run tests for rollback refusing nginx/BaoTa root drift."""

from __future__ import annotations

import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).with_name("deploy-bt-static.py")
spec = importlib.util.spec_from_file_location("deploy_bt_static", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeApi:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object] | None]] = []

    def call(self, endpoint: str, fields: dict[str, object] | None = None, **_: object) -> object:
        self.calls.append((endpoint, fields))
        if endpoint == "/files?action=GetFile":
            return {"status": True, "data": "server {\n    root /srv/nginx-active;\n}"}
        raise AssertionError(f"unexpected write/API call: {endpoint}")

    def list_sites(self, domain: str) -> list[dict[str, object]]:
        assert domain == "example.test"
        return [{"id": 7, "name": domain, "path": "/srv/baota-configured"}]

    def require_success(self, endpoint: str, fields: dict[str, object] | None = None, **_: object) -> object:
        raise AssertionError(f"rollback write must not happen: {endpoint} {fields}")


api = FakeApi()
try:
    module.rollback_after_verification_failure(
        api,
        domain="example.test",
        site_id=7,
        intended_target="/srv/previous-release",
        server_ip="192.0.2.10",
        manifest=[],
    )
except module.DeploymentError as error:
    output = str(error)
    assert "拒绝回滚" in output
    assert "A='/srv/nginx-active'" in output
    assert "B='/srv/baota-configured'" in output
    assert "不会自动选择 A 或 B" in output
    print(output)
else:
    raise AssertionError("mismatched roots must refuse rollback")

assert [endpoint for endpoint, _ in api.calls] == [
    "/files?action=GetFile",
]
print("PASS: mismatch dry-run made no SetPath, reload, or HTTP verification call")
