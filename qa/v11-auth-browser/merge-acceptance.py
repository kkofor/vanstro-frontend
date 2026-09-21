#!/usr/bin/env python3
"""Unified acceptance evidence merge gate (total-gate v2).

Combines the cross-system harness (C/D/O/R), token-resume harness
(S08/B01-B13) and headed lifecycle gate (R2/B08/B10) into ONE authoritative
evidence file carrying the full 34-case REQUIRED matrix. Any case
not-executed or fail keeps the overall gate failed (exitCode != 0).

Before writing the authoritative file, ALL of the following must hold:

  1. Provenance: all three inputs carry the SAME testedCommit, testedTree,
     runId and runnerSha256. Injected V11_TESTED_COMMIT / V11_TESTED_TREE /
     V11_RUN_ID must match every input.
  2. SHA binding: crossSystemHarnessSha256 / tokenResumeHarnessSha256 /
     lifecycleGateSha256 / totalRunnerSha256 / mergeGateSha256 /
     runnerSha256 are recomputed from the ACTUAL files on disk.
  3. Ownership: cross-system contributes C/D/O/R except R2; token-resume
     contributes S08/B except B08/B10; lifecycle contributes R2/B08/B10.
     Missing, duplicate or out-of-scope passing keys fail the merge.

Any failed gate exits non-zero WITHOUT writing or overwriting the
authoritative acceptance-results.json.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).parent
OUT = Path(os.environ.get("V11_BROWSER_OUT", "tasks/evidence/v11-auth-browser"))
ROOT = HERE.parent.parent
if not OUT.is_absolute():
    OUT = ROOT / OUT

CROSS = OUT / "cross-system-results.json"
TOKEN = OUT / "token-resume-results.json"
LIFECYCLE = OUT / "lifecycle-gate-results.json"
BUILD = OUT / "build-gate-results.json"
ATTESTATION = OUT / "attestation-results.json"
FINAL = OUT / "acceptance-results.json"

# Authoritative required matrix order (34 cases).
ALL_CASES = [
    "C1", "C2", "C3", "C4", "D1", "D2", "D3", "D4", "D5",
    "O1", "O2", "O3", "O4", "O5", "O6",
    "R1", "R2", "R3", "R4", "R5",
    "S08",
    "B01", "B02", "B03", "B04", "B05", "B06", "B07",
    "B08", "B09", "B10", "B11", "B12", "B13",
]
LIFECYCLE_OWNED = ["R2", "B08", "B10"]
CROSS_OWNED = [k for k in ALL_CASES if k != "S08" and not k.startswith("B") and k not in LIFECYCLE_OWNED]
TOKEN_OWNED = [k for k in ALL_CASES if k not in CROSS_OWNED and k not in LIFECYCLE_OWNED]

# Harness files whose SHAs must be bound into the authoritative evidence.
TOTAL_RUNNER = Path(os.environ.get("V11_TOTAL_RUNNER", str(HERE / "run-v11-total-gate.py")))
MERGE_GATE = Path(__file__).resolve()


def sha256_of(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _no_duplicate_keys(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError(f"duplicate key {key!r}")
        obj[key] = value
    return obj


def load(path):
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(), object_pairs_hook=_no_duplicate_keys)
    except ValueError as exc:
        raise ValueError(f"{path.name}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError(f"{path.name}: expected a JSON object")
    return data


def main():
    try:
        cross = load(CROSS)
        token = load(TOKEN)
        lifecycle = load(LIFECYCLE)
        build = load(BUILD)
        attestation = load(ATTESTATION)
    except ValueError as exc:
        sys.exit(f"merge-acceptance: invalid input: {exc}")
    for required in (CROSS, TOKEN, LIFECYCLE, BUILD, ATTESTATION):
        if not required.exists():
            sys.exit(f"merge-acceptance: missing {required.name}")

    errors = []

    # ---- provenance: same final HEAD/TREE + same run identity -------------
    cross_commit = cross.get("testedCommit"); token_commit = token.get("testedCommit"); lifecycle_commit = lifecycle.get("testedCommit"); build_commit = build.get("testedCommit")
    cross_tree = cross.get("testedTree"); token_tree = token.get("testedTree"); lifecycle_tree = lifecycle.get("testedTree"); build_tree = build.get("testedTree")
    cross_runner = cross.get("runnerSha256"); token_runner = token.get("runnerSha256"); lifecycle_runner = lifecycle.get("runnerSha256"); build_runner = build.get("runnerSha256")
    cross_run_id = cross.get("runId"); token_run_id = token.get("runId"); lifecycle_run_id = lifecycle.get("runId"); build_run_id = build.get("runId")
    commits=(cross_commit,token_commit,lifecycle_commit,build_commit); trees=(cross_tree,token_tree,lifecycle_tree,build_tree); runners=(cross_runner,token_runner,lifecycle_runner,build_runner); run_ids=(cross_run_id,token_run_id,lifecycle_run_id,build_run_id)
    if not all(commits+trees): errors.append("all inputs must record non-empty testedCommit and testedTree")
    elif len(set(commits))!=1 or len(set(trees))!=1: errors.append("testedCommit/testedTree mismatch across inputs")
    if not all(runners): errors.append("all inputs must record a non-empty runnerSha256")
    elif len(set(runners))!=1: errors.append("runnerSha256 mismatch between inputs")
    injected_commit = os.environ.get("V11_TESTED_COMMIT")
    injected_tree = os.environ.get("V11_TESTED_TREE")
    if bool(injected_commit) != bool(injected_tree):
        errors.append("V11_TESTED_COMMIT and V11_TESTED_TREE must be injected together")
    elif injected_commit:
        if any(value != injected_commit for value in commits): errors.append("inputs do not match injected V11_TESTED_COMMIT")
        if any(value != injected_tree for value in trees): errors.append("inputs do not match injected V11_TESTED_TREE")

    injected_run_id = os.environ.get("V11_RUN_ID")
    if not all(run_ids): errors.append("all inputs must record a non-empty runId")
    elif len(set(run_ids)) != 1: errors.append("runId mismatch across inputs")
    elif injected_run_id and any(value != injected_run_id for value in run_ids): errors.append("inputs do not match injected V11_RUN_ID")

    actual = {}
    for field, filename, recorded in (
        ("crossSystemHarnessSha256", "v11-cross-system-acceptance.py", cross.get("harnessSha256")),
        ("tokenResumeHarnessSha256", "v11-token-resume-acceptance.py", token.get("harnessSha256")),
        ("lifecycleGateSha256", "v11-lifecycle-gate.py", lifecycle.get("harnessSha256")),
        ("buildGateSha256", "v11-build-gate.py", build.get("harnessSha256")),
    ):
        path = HERE / filename
        if not path.exists():
            errors.append(f"{field}: file not found {filename}")
            continue
        actual[field] = sha256_of(path)
        if not recorded:
            errors.append(f"{field}: input did not record a value")
        elif recorded != actual[field]:
            errors.append(f"{field}: input recorded {recorded} but actual file is {actual[field]}")

    runner_path = HERE / "run-v11-token-resume.sh"
    if not runner_path.exists():
        errors.append(f"runnerSha256: file not found {runner_path.name}")
    else:
        actual["runnerSha256"] = sha256_of(runner_path)
        if cross_runner != actual["runnerSha256"]:
            errors.append(
                f"runnerSha256: cross input recorded {cross_runner} but actual file is {actual['runnerSha256']}")
        if token_runner != actual["runnerSha256"]:
            errors.append(
                f"runnerSha256: token input recorded {token_runner} but actual file is {actual['runnerSha256']}")
        if lifecycle_runner != actual["runnerSha256"]:
            errors.append(
                f"runnerSha256: lifecycle input recorded {lifecycle_runner} but actual file is {actual['runnerSha256']}")
        if build_runner != actual["runnerSha256"]:
            errors.append(
                f"runnerSha256: build input recorded {build_runner} but actual file is {actual['runnerSha256']}")

    if build.get("exitCode") != 0 or not build.get("completed"):
        errors.append("build gate did not complete successfully")

    policy_path = HERE / "attestation-policy.json"
    actual["attestationPolicySha256"] = sha256_of(policy_path)
    if not attestation.get("allOk"):
        errors.append("workspace attestation is not allOk")
    if attestation.get("runId") != cross_run_id or attestation.get("testedCommit") != cross_commit or attestation.get("testedTree") != cross_tree:
        errors.append("workspace attestation identity mismatch")
    if attestation.get("allowlistPolicySha256") != actual["attestationPolicySha256"]:
        errors.append("workspace attestation policy SHA mismatch")

    for field, path in (("totalRunnerSha256", TOTAL_RUNNER), ("mergeGateSha256", MERGE_GATE)):
        if not path.exists():
            errors.append(f"{field}: file not found {path}")
            continue
        actual[field] = sha256_of(path)

    # ---- ownership: scoped contribution + missing/duplicate/out-of-scope ---
    cross_results = cross.get("results", {})
    token_cases = token.get("cases", {})
    lifecycle_cases = lifecycle.get("cases", {})
    if not isinstance(cross_results, dict):
        errors.append("cross input: 'results' must be an object")
    if not isinstance(token_cases, dict):
        errors.append("token input: 'cases' must be an object")
    if not isinstance(lifecycle_cases, dict):
        errors.append("lifecycle input: 'cases' must be an object")

    if not errors:
        for owner, keys, data in (("cross-system", CROSS_OWNED, cross_results),
                                  ("token-resume", TOKEN_OWNED, token_cases),
                                  ("lifecycle", LIFECYCLE_OWNED, lifecycle_cases)):
            for key in keys:
                if key not in data:
                    errors.append(f"{owner} input missing owned case {key}")
        for owner, keys, data in (("cross-system", CROSS_OWNED, cross_results),
                                  ("token-resume", TOKEN_OWNED, token_cases),
                                  ("lifecycle", LIFECYCLE_OWNED, lifecycle_cases)):
            for key, entry in data.items():
                if key not in keys and entry.get("status") not in (None, "not-executed"):
                    errors.append(f"{owner} input claims out-of-scope case {key} (status={entry.get('status')})")

    if errors:
        print("merge-acceptance: provenance/ownership validation FAILED", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        print(f"  authoritative file {FINAL} NOT written", file=sys.stderr)
        sys.exit(1)

    # ---- merge: every case from its owning input, tagged with source -------
    merged = {}
    for key in ALL_CASES:
        if key in CROSS_OWNED:
            base = cross_results.get(key) or {}
            source = "cross-system"
        elif key in TOKEN_OWNED:
            base = token_cases.get(key) or {}
            source = "token-resume"
        else:
            base = lifecycle_cases.get(key) or {}
            source = "lifecycle"
        case = dict(base)
        case.setdefault("label", key)
        case.setdefault("status", "not-executed")
        case.setdefault("observations", {})
        case["source"] = source
        merged[key] = case

    executed = [k for k in ALL_CASES if merged[k].get("status") != "not-executed"]
    phase_complete = bool(executed) and all(merged[k].get("status") == "pass" for k in executed)
    overall_complete = all(merged[k].get("status") == "pass" for k in ALL_CASES)
    exit_code = 0 if overall_complete else 1

    run_id = injected_run_id or cross_run_id

    final = {
        "schemaVersion": "v11-auth-browser-total-gate-4",
        "runId": run_id,
        "testedCommit": cross_commit,
        "testedTree": cross_tree,
        "provenance": {
            "crossSystemHarnessSha256": actual["crossSystemHarnessSha256"],
            "tokenResumeHarnessSha256": actual["tokenResumeHarnessSha256"],
            "lifecycleGateSha256": actual["lifecycleGateSha256"],
            "buildGateSha256": actual["buildGateSha256"],
            "totalRunnerSha256": actual["totalRunnerSha256"],
            "mergeGateSha256": actual["mergeGateSha256"],
            "runnerSha256": actual["runnerSha256"],
            "attestationPolicySha256": actual["attestationPolicySha256"],
        },
        "harnessExitCodes": {"crossSystem": cross.get("exitCode"), "tokenResume": token.get("exitCode"), "lifecycle": 0, "build": build.get("exitCode")},
        "attestation": {"allOk": attestation.get("allOk"), "allowlistPolicySha256": attestation.get("allowlistPolicySha256"), "checkpointCount": len(attestation.get("checkpoints", [])), "lastCheckpointBeforeMerge": attestation.get("checkpoints", [])[-1]["point"] if attestation.get("checkpoints") else None},
        "build": {"completed": build.get("completed"), "buildExitCode": build.get("buildExitCode"), "buildId": build.get("buildId"), "outIndex": build.get("outIndex"), "outFrench": build.get("outFrench")},
        "phaseComplete": phase_complete,
        "overallComplete": overall_complete,
        "completed": overall_complete,
        "exitCode": exit_code,
        "web": cross.get("web"),
        "api": cross.get("api"),
        "results": merged,
        "traces": {"crossSystem": {}, "tokenResume": {"buckets": token.get("buckets", {}), "console": token.get("console", [])}, "lifecycle": {"proven": lifecycle.get("proven"), "winningMethod": lifecycle.get("winningMethod"), "methods": lifecycle.get("methods", [])}},
    }
    FINAL.write_text(json.dumps(final, indent=2, ensure_ascii=False))
    print(f"merged {len(ALL_CASES)} cases -> {FINAL}")
    print(f"runId={run_id} testedCommit={cross_commit} testedTree={cross_tree}")
    print(f"overallComplete={overall_complete} phaseComplete={phase_complete} exitCode={final['exitCode']}")
    for key in ALL_CASES:
        print(f"  {key}: {merged[key]['status']} [{merged[key]['source']}]")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
