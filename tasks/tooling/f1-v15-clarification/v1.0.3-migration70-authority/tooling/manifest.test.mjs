import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inspect, run, MEMBERS } from "./manifest.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

test("manifest membership is the v1.0.3 functional-first closure", () => {
  assert.deepEqual(MEMBERS, [
    "source/clarification-model.yaml",
    "source/clarification-model.schema.json",
    "generated/10-migration70-executable-authority.sql",
    "generated/MANIFEST.staging.json",
    "tooling/generate.mjs",
    "tooling/manifest.mjs",
    "tooling/clarification.test.mjs",
    "tooling/manifest.test.mjs",
  ]);
});

test("inspect: every member is a regular file with LF and trailing newline", async () => {
  const x = await inspect(root);
  assert.equal(x.records.length, MEMBERS.length);
  for (const r of x.records) {
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
    assert.ok(r.bytes > 0);
    assert.ok(r.lfLines > 0);
  }
});

test("run(generate) then run(verify) round-trips the envelope", async () => {
  const generated = await run("generate", root, undefined);
  assert.equal(generated.ok, true);
  assert.equal(generated.memberCount, MEMBERS.length);
  assert.match(generated.manifestSha256, /^[0-9a-f]{64}$/);
  const verified = await run("verify", root, generated.manifestSha256);
  assert.equal(verified.ok, true);
});
