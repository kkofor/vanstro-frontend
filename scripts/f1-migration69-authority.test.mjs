import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const authority = new URL("../tasks/tooling/f1-v15-clarification/v1.0.1-migration69-authority/", import.meta.url);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

test("migration69 is the byte-exact frozen executable authority", async () => {
  const expected = await readFile(new URL("generated/09-migration69-executable-authority.sql", authority));
  const actual = await readFile(new URL("packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql", root));
  assert.deepEqual(actual, expected);
  assert.equal(sha(actual), "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051");
});

test("vendored v1.0.1 authority manifest and hashes match the frozen package", async () => {
  const vendored = ["generated/03-old68-runtime-surface.json", "generated/09-migration69-executable-authority.sql", "generated/10-migration70-executable-authority.sql", "generated/11-privileged-bootstrap-authority.sql", "generated/12-migration69-concurrent-indexes.sql", "tooling/owned-pg16-conformance.mjs"];
  const manifest = (await readFile(new URL("MANIFEST.sha256", authority), "utf8")).trim().split("\n").map((line) => line.split(/\s+/));
  for (const file of vendored) {
    const entry = manifest.find(([, path]) => path === file);
    assert.ok(entry, `vendored ${file} missing from MANIFEST.sha256`);
    assert.equal(sha(await readFile(new URL(file, authority))), entry[0], `vendored ${file} drifts from MANIFEST.sha256`);
  }
  assert.equal(sha(await readFile(new URL("generated/09-migration69-executable-authority.sql", authority))), "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051");
});

test("81-tree source keeps migration69 in exact order before 70 and 71", async () => {
  const entries = (await readdir(new URL("packages/db/prisma/migrations/", root), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  assert.equal(entries.length, 81);
  const index69 = entries.indexOf("20260804100000_f1_v15_expand");
  const index70 = entries.indexOf("20260804110000_f1_v15_phase_b");
  const index71 = entries.indexOf("20260804120000_f1_v15_compatibility_closure");
  assert.ok(index69 >= 0 && index70 > index69 && index71 > index70, "migration69/70/71 order must be preserved");
  assert.equal(entries.at(-1), "20260810110000_s12_erp_webhooks");
  assert.equal(entries.some(entry => /f1_v15_contract/.test(entry)), false);
  const generated = await readFile(new URL("packages/db/src/generated/source-latest-migration.ts", root), "utf8");
  assert.match(generated, /SOURCE_LATEST_MIGRATION_NUMBER = 73/);
  assert.match(generated, /20260805100000_s01_settings_core/);
});
