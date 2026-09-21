#!/usr/bin/env python3
import importlib.util
import json
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("v11_total_gate", HERE / "run-v11-total-gate.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def write_case(root, points, *, run_id="run", attestation_run_id="run"):
    root.mkdir(parents=True, exist_ok=True)
    final = {"runId": run_id, "testedCommit": "commit", "testedTree": "tree", "provenance": {}}
    attestation = {
        "runId": attestation_run_id,
        "testedCommit": "commit",
        "testedTree": "tree",
        "allowlistPolicySha256": "policy",
        "allOk": True,
        "checkpoints": [{"point": point, "ok": True} for point in points],
    }
    (root / "acceptance-results.json").write_text(json.dumps(final))
    (root / "attestation-results.json").write_text(json.dumps(attestation))


with tempfile.TemporaryDirectory(prefix="v11-attestation-sequence-") as tmp:
    module.OUT = Path(tmp)
    write_case(module.OUT, module.EXPECTED_POINTS)
    assert module.finalize_attestation()
    finalized = json.loads((module.OUT / "acceptance-results.json").read_text())
    assert finalized["attestation"]["checkpointCount"] == 11
    assert finalized["attestation"]["lastCheckpoint"] == "merge/after"

    write_case(module.OUT, module.EXPECTED_POINTS + ["merge/after"])
    assert not module.finalize_attestation()
    write_case(module.OUT, module.EXPECTED_POINTS[:-1])
    assert not module.finalize_attestation()
    write_case(module.OUT, module.EXPECTED_POINTS, attestation_run_id="old-run")
    assert not module.finalize_attestation()

    (module.OUT / "attestation-results.json").write_text('{"runId":"reused","checkpoints":[{"point":"old"}]}')
    observed = {"fresh": False}
    def fail_pre_identity(point, _env, commit=None, tree=None):
        observed["fresh"] = point == "pre-identity" and not (module.OUT / "attestation-results.json").exists()
        return 1
    module.attest = fail_pre_identity
    assert module.run_gate() == 1
    assert observed["fresh"]

print("V11 attestation sequence regression PASS")
