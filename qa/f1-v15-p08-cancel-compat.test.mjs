import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modelPath = "/Users/zhangguannan/Documents/codex/vanstro-backups/f1-authority-package-v1.5-20260804/source/authority-model.yaml";
const model = JSON.parse(await readFile(modelPath, "utf8"));
const authority = model.p08CancelCompatibility;
const expand = model.constraints.find(item => item.id === authority.migration69ConstraintRef);
const contract = model.constraints.find(item => item.id === authority.migration70ConstraintRef);

function expected(status, artifact, consumed, authorityVersion) {
  if (status === "awaiting_upload") return !artifact && !consumed;
  if (["cancelled", "expired"].includes(status) && !artifact) return consumed;
  if (status === "cancelled" && artifact) return consumed && authorityVersion === 1;
  if (["uploaded", "parsing", "preview_ready", "preview_failed", "commit_queued", "committing", "completed", "completed_with_errors", "failed"].includes(status)) return artifact && consumed;
  return false;
}

test("expand69 and contract70 use the exact compatible row predicate", () => {
  assert.equal(expand.sqlPredicate, contract.sqlPredicate);
  assert.equal(expand.phase, "69_expand");
  assert.equal(contract.phase, "70_contract");
});

test("all 12 statuses × Artifact × token × authorityVersion vectors are closed", () => {
  assert.equal(expand.tupleVectors.length, 12 * 2 * 2 * 2);
  for (const vector of expand.tupleVectors) {
    const value = vector.values;
    assert.equal(vector.expected === "allow", expected(value.status, Boolean(value.sourceArtifactIdValue), Boolean(value.uploadTokenConsumedAt), value.authorityVersion), vector.id);
  }
});

test("old68 source-bound cancel is the sole legacy exception", () => {
  for (const from of ["uploaded", "commit_queued"]) assert.equal(expected("cancelled", true, true, 1), true, from);
  assert.equal(expected("cancelled", true, true, 2), false);
  assert.equal(expected("expired", true, true, 1), false);
  assert.equal(expected("expired", true, true, 2), false);
});

test("new v2 source-bound cancel preserves evidence and terminates as failed", () => {
  assert.equal(authority.newV2.sourceBoundCancel, "request_job_cancellation_then_failed");
  assert.equal(authority.newV2.reason, "cancelled_after_source_bound");
  assert.equal(authority.newV2.preserveArtifact, true);
  assert.equal(authority.newV2.preserveTokenConsumed, true);
  assert.equal(authority.newV2.unlinkArtifact, false);
  assert.equal(authority.newV2.deleteSourceObject, false);
});

test("contract70 revokes the exact old function and preserves legacy rows", () => {
  assert.equal(authority.migration70.revokeFunctionRef, "function.old.p08_transition_import");
  assert.deepEqual(authority.migration70.revokeRoleRefs, ["role.runtime"]);
  assert.equal(authority.migration70.revokePublic, true);
  assert.equal(authority.migration70.preserveLegacyRows, true);
  const fn = model.functions.find(item => item.id === authority.migration70.revokeFunctionRef);
  assert.equal(fn.disposition, "revoke_in_70");
  assert.ok(model.migration70Contract.revokedFunctionRefs.includes(fn.id));
});
