import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = new URL("./scripts/f1-authority-package-manifest.mjs", import.meta.url).pathname;
const members = [
  "01-dashboard-p09-runtime-config-flags-readiness-contract-v1.3.md",
  "02-dashboard-p10-analytics-event-metric-foundation-contract-v1.3.md",
  "03-dashboard-p04-replay-legacy-audit-erratum-v1.0.md",
  "04-dashboard-p05-p08-artifact-payload-token-joint-erratum-v1.0.md",
  "05-dashboard-p02-current-context-authority-clarification-v1.0.md",
  "06-dashboard-f1-unified-migrations69-70-authority-ledger-v1.0.md",
  "07-dashboard-f1-sql-authority-catalog-v1.0.md",
  "08-dashboard-f1-authority-manifest-spec-v1.0.md",
  "09-dashboard-f1-authority-review-checklist-v1.0.md"
];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "vanstro-f1-manifest-"));
  for (const [index, member] of members.entries()) {
    await writeFile(join(root, member), `member-${index + 1}\n`, "utf8");
  }
  return root;
}

function run(...args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

function summary(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("v1.5 nested member manifest is deterministic", async () => {
  const root = await mkdtemp(join(tmpdir(), "vanstro-f1-v15-manifest-"));
  const v15Members = [
    "source/authority-model.yaml", "source/authority-model.schema.json", "source/baseline-physical-inventory.json", "source/owned-pg16-probe.json",
    "generated/01-dashboard-p02-resource-authority-clarification-v1.5.md",
    "generated/02-dashboard-p04-fact-audit-erratum-v1.5.md",
    "generated/03-dashboard-p05-p08-joint-erratum-v1.5.md",
    "generated/04-dashboard-p09-contract-v1.5.md", "generated/05-dashboard-p10-contract-v1.5.md",
    "generated/06-dashboard-f1-migrations69-70-ledger-v1.5.md",
    "generated/07-dashboard-f1-closed-sql-authority-catalog-v1.5.md",
    "generated/08-dashboard-f1-physical-object-inventory-v1.5.json",
    "generated/09-dashboard-f1-wire-dto-registry-v1.5.json",
    "generated/10-dashboard-f1-permission-action-reason-registry-v1.5.json",
    "generated/11-dashboard-f1-rollout-upgrade-matrix-v1.5.md",
    "generated/12-dashboard-f1-review-checklist-v1.5.md", "generated/MANIFEST.staging.json",
    "tooling/f1-v15-extract-baseline.mjs", "tooling/f1-v15-owned-probe.mjs", "tooling/f1-v15-generate.mjs",
    "tooling/f1-v15-semantic-verify.mjs", "tooling/f1-v15-extract-baseline.test.mjs",
    "tooling/f1-v15-authority.test.mjs", "tooling/f1-v15-hmac-vectors.test.mjs", "tooling/f1-v15-p08-cancel-compat.test.mjs"
  ];
  try {
    for (const [index, member] of v15Members.entries()) {
      await mkdir(join(root, member.split("/").slice(0, -1).join("/")), { recursive: true });
      await writeFile(join(root, member), `member-${index + 1}\n`);
    }
    const generated = summary(run("generate", "--root", root, "--package-version", "v1.5"));
    assert.equal(generated.memberCount, v15Members.length);
    const verified = summary(run("verify", "--root", root, "--package-version", "v1.5", "--expected-manifest-sha256", generated.manifestSha256));
    assert.equal(verified.manifestSha256, generated.manifestSha256);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generate and verify are deterministic", async () => {
  const root = await fixture();
  try {
    const first = summary(run("generate", "--root", root));
    const manifest = await readFile(join(root, "MANIFEST.sha256"));
    const metadata = await readFile(join(root, "MANIFEST.metadata.tsv"));
    const second = summary(run("generate", "--root", root));
    assert.equal(first.manifestSha256, second.manifestSha256);
    assert.deepEqual(await readFile(join(root, "MANIFEST.sha256")), manifest);
    assert.deepEqual(await readFile(join(root, "MANIFEST.metadata.tsv")), metadata);
    const verified = summary(
      run(
        "verify",
        "--root",
        root,
        "--expected-manifest-sha256",
        first.manifestSha256
      )
    );
    assert.equal(verified.memberCount, 9);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const [name, bytes, code] of [
  ["CRLF", Buffer.from("bad\r\n"), "CR_REJECTED"],
  ["missing final LF", Buffer.from("bad"), "MISSING_FINAL_LF"],
  ["UTF-8 BOM", Buffer.from([0xef, 0xbb, 0xbf, 0x78, 0x0a]), "BOM_REJECTED"],
  ["invalid UTF-8", Buffer.from([0xff, 0x0a]), "INVALID_UTF8"]
]) {
  test(`rejects ${name}`, async () => {
    const root = await fixture();
    try {
      await writeFile(join(root, members[0]), bytes);
      const result = run("generate", "--root", root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(code));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("rejects missing and extra members", async () => {
  const missingRoot = await fixture();
  const extraRoot = await fixture();
  try {
    await rm(join(missingRoot, members[0]));
    let result = run("generate", "--root", missingRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /MEMBER_MISSING/);

    await writeFile(join(extraRoot, "extra.md"), "extra\n");
    result = run("generate", "--root", extraRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /EXTRA_MEMBER/);
  } finally {
    await rm(missingRoot, { recursive: true, force: true });
    await rm(extraRoot, { recursive: true, force: true });
  }
});

test("rejects symlink members", async () => {
  const root = await fixture();
  try {
    await rm(join(root, members[0]));
    await symlink(join(root, members[1]), join(root, members[0]));
    const result = run("generate", "--root", root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SYMLINK_REJECTED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detects manifest, metadata, and expected-SHA changes", async () => {
  const root = await fixture();
  try {
    const generated = summary(run("generate", "--root", root));
    let result = run(
      "verify",
      "--root",
      root,
      "--expected-manifest-sha256",
      "0".repeat(64)
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /MANIFEST_SHA_MISMATCH/);

    await writeFile(join(root, "MANIFEST.metadata.tsv"), "changed\n");
    result = run(
      "verify",
      "--root",
      root,
      "--expected-manifest-sha256",
      generated.manifestSha256
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /METADATA_MISMATCH/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
