#!/usr/bin/env python3
import copy
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("v11_lifecycle", HERE / "v11-lifecycle-gate.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

foundation = f"{module.API}/api/v1/dashboard/foundation"
authorization = f"{module.API}/api/v1/dashboard/authorization"
canonical = [
    {"url": foundation, "method": "GET", "status": 200, "requestOrder": 1, "responseOrder": 1},
    {"url": authorization, "method": "GET", "status": 200, "requestOrder": 2, "responseOrder": 2},
]
assert module.exact_chain(copy.deepcopy(canonical))[0]

for mutate in (
    lambda rows: rows[1].update(method="POST"),
    lambda rows: rows[0].update(status=204),
    lambda rows: rows[0].update(requestOrder=3),
    lambda rows: rows[0].update(responseOrder=3),
    lambda rows: rows[0].update(url=foundation + "/near-match"),
    lambda rows: rows.append({"url": f"{module.API}/api/v1/dashboard/domain", "method": "GET", "status": 200, "requestOrder": 3, "responseOrder": 3}),
):
    candidate = copy.deepcopy(canonical)
    mutate(candidate)
    assert not module.exact_chain(candidate)[0]

print("V11 lifecycle exact-chain regression PASS")
