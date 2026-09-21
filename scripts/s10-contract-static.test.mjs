import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TESTED = "dad4ef63b1c6a15d39dcfa703e324a5d60a35242";
const CONTRACT_PATH = "tasks/contracts/v1-s10-privacy-retention-settings.v1.json";
const CONTRACT_MD = "tasks/contracts/v1-s10-privacy-retention-settings.v1.md";
const EVIDENCE_PATH = "tasks/evidence/v1-s10-settings-browser/acceptance-results.json";
const GOAL_SHA = "72cc5c86382c7ae25ea520d7166e5e793261c28889d44d94e09a5ac79a505c40";
const DEPENDENCIES = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-remaining-feature-dependencies.json";
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");

function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
}
function migrationDirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

test("S10 contract JSON is parseable with final certified identity and claims", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(artifact.schemaVersion, "vanstro.s10.privacy-retention-settings.v1");
  assert.equal(artifact.status, "IMPLEMENTED_INTEGRATION_CERTIFIED");
  assert.deepEqual(artifact.claims, { frozen: true, implemented: true, integrated: true, certified: true });
  assert.equal(artifact.package, "S10");
  assert.equal(artifact.descriptorKey, "settings.privacy-retention");
  assert.equal(artifact.settingsSchemaVersion, "settings.privacy-retention.v1");
  assert.deepEqual(artifact.authority.dependsOn, ["S01", "CG01"]);
  assert.deepEqual(artifact.authority.externalBaselineDependencies, ["P04", "D17-current-facts"]);
  assert.equal(artifact.authority.goalSha256, GOAL_SHA);
  assert.equal(artifact.authority.port, "cg01.privacy-retention.v1");
  const identity = artifact.finalIdentity;
  assert.equal(identity.testedCommit, TESTED);
  assert.equal(identity.migration77.migrationCount, 77);
  assert.equal(identity.migration77.latestMigration, "20260807000000_s10_privacy_retention_settings");
  assert.equal(identity.migration77.noMigration78, true);
  assert.equal(identity.mergeChain.length, 2);
  assert.equal(identity.mergeChain[0].commit, "87af4685b623c8f34092d71fdb8b0e14ef8fbdc6");
  assert.deepEqual(identity.mergeChain[0].parents, ["87682ba01894f90271718f3f83d4cc3f50c9aa44", "ff79840275a3c2844f5ae6bc7cbdd5890a99b2a2"]);
  assert.equal(identity.mergeChain[1].commit, "352e1214a179a5d229387b33488d12ab0cd6e59f");
  assert.deepEqual(identity.mergeChain[1].parents, ["87af4685b623c8f34092d71fdb8b0e14ef8fbdc6", "d972d21b895c4aaea1f52ecbe48200524e69af1d"]);
  assert.equal(identity.browserEvidence.testedCommit, TESTED);
  assert.deepEqual(identity.browserEvidence.counts, { pass: 23, fail: 0, "intentional-skip": 0, "not-executed": 0 });
});

test("S10 typed value schema is exact with bounds and compiled defaults", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const vs = artifact.valueSchema;
  assert.equal(vs.consentPolicy.retentionMonths.minimum, 6);
  assert.equal(vs.consentPolicy.retentionMonths.maximum, 120);
  assert.equal(vs.consentPolicy.retentionMonths.default, 24);
  assert.equal(vs.retentionPolicy.retentionByObjectFamily.items.retentionDays.minimum, 30);
  assert.equal(vs.retentionPolicy.retentionByObjectFamily.items.retentionDays.maximum, 7300);
  assert.equal(vs.lowRiskExecution.allowlist.max, 2);
  assert.deepEqual(vs.lowRiskExecution.allowlist.items.enum, ["consent_events", "async_jobs"]);
  assert.equal(vs.consentPolicy.authenticatedConsentEnabled.capability, "future_unavailable");
  const defaults = artifact.compiledDefaults;
  assert.equal(defaults.consentPolicy.anonymousConsentEnabled, true);
  assert.equal(defaults.consentPolicy.retentionMonths, 24);
  assert.deepEqual(defaults.retentionPolicy.retentionByObjectFamily, []);
  assert.deepEqual(defaults.lowRiskExecution.allowlist, []);
  assert.equal(defaults.lowRiskExecution.impactPreviewEnabled, true);
});

test("S10 routes reuse only settings.read/settings.write and preview is read-only", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const routes = artifact.routes.settingsLifecycle;
  assert.equal(routes.length, 11);
  for (const [, , permission] of routes) {
    assert.ok(["settings.read", "settings.write"].includes(permission), `unexpected permission ${permission}`);
  }
  assert.deepEqual(artifact.routes.preview, ["POST", "/dashboard/settings/s10-impact-preview", "settings.read"]);
  assert.ok(artifact.routes.errorFamilies["409"].includes("LEGAL_HOLD_CONFLICT"));
});

test("S10 zero-side-effect publish and degraded readiness are explicit", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const pa = artifact.publishAdapter;
  for (const forbidden of ["no delete/anonymize/archive/purge on publish/rollback/validate/preview", "no Worker job creation or scheduling"]) {
    assert.ok(pa.forbiddenSideEffects.includes(forbidden), `missing forbidden side effect: ${forbidden}`);
  }
  assert.equal(pa.rollback, "policy version rollback never restores deleted/anonymized data; real delete/purge requires separate user authorization");
  const ra = artifact.readinessAdapter;
  assert.equal(ra.state, "degraded always while cleanup consumer missing");
  assert.equal(ra.neverFakeReady, true);
  assert.ok(ra.degradedReasons.includes("cleanup_consumer_unavailable"));
  assert.equal(artifact.currentFacts.cleanupConsumer.classification, "implementation_decision_required");
  assert.equal(artifact.capabilityLayering.authenticatedConsent, "future_unavailable");
  assert.equal(artifact.capabilityLayering.privacySubjectPurge, "future_unavailable");
});

test("migration77 boundary: exactly 77 migrations, one S10 dir, no 78", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(artifact.migration77.owner, "Backend/S10");
  assert.match(artifact.migration77.path, /20260807000000_s10_privacy_retention_settings/);
  assert.ok(artifact.migration77.forbidden.includes("modify migrations 1-76"));
  assert.ok(artifact.migration77.forbidden.includes("CREATE OR REPLACE s01_*/s02_*/s09_* functions"));
  assert.ok(artifact.migration77.allowed.includes("s10_* controlled functions"));
  const dirs = migrationDirs();
  assert.equal(dirs.length, 77, `expected exactly 77 migrations, got ${dirs.length}`);
  const s10 = dirs.filter((name) => name.includes("s10_privacy_retention_settings"));
  assert.equal(s10.length, 1, "exactly one s10 migration dir");
  assert.ok(!dirs.some((name) => name.includes("78")), "no migration78");
});

test("S10 runtime implementations exist and the certified delta is complete", async () => {
  const requiredRuntime = [
    "apps/api/src/dashboard/s10-settings.ts",
    "apps/api/src/dashboard/s10-settings-pg16.test.ts",
    "packages/db/src/s10-settings-controlled.ts",
    "packages/db/prisma/migrations/20260807000000_s10_privacy_retention_settings/migration.sql",
    "src/lib/dashboard/s10-settings.ts",
    "src/lib/dashboard/s10-settings-transport.ts",
    "src/lib/dashboard/s10-settings-readiness-consumer.ts",
    "src/components/dashboard/PrivacyRetentionSettingsPanel.tsx",
    "qa/v1-s10-settings-browser/run-s10.sh"
  ];
  for (const path of requiredRuntime) {
    const exists = execFileSync("bash", ["-c", `test -e "${join(ROOT, path)}" && echo yes || echo no`], { encoding: "utf8" }).trim();
    assert.equal(exists, "yes", `S10 runtime implementation must exist: ${path}`);
  }
  const s10Delta = git("diff", "--stat", "1d096b6dcdbcd634a99a9fe942ea5f32eb46cc8d", "HEAD").split("\n").filter(Boolean);
  assert.ok(s10Delta.some((line) => line.includes("files changed")), "S10 certified delta must be present");
});

test("authority commit scope: exactly contracts, evidence and status assertions since testedCommit", async () => {
  const changed = git("diff", "--name-only", TESTED, "HEAD").split("\n").filter(Boolean);
  const expected = new Set([
    CONTRACT_PATH,
    CONTRACT_MD,
    "scripts/s10-contract-static.test.mjs",
    EVIDENCE_PATH
  ]);
  assert.deepEqual(new Set(changed), expected, "authority commit must touch exactly contracts + evidence + static test");
  const evidence = JSON.parse(await readFile(join(ROOT, EVIDENCE_PATH), "utf8"));
  assert.equal(evidence.testedCommit, TESTED);
  assert.deepEqual(evidence.counts, { pass: 23, fail: 0, "intentional-skip": 0, "not-executed": 0 });
  assert.deepEqual(evidence.unexpectedEvidence, { consoleErrors: [], failedRequests: [] });
});

test("MD and JSON reference each other and stay semantically consistent at certification", async () => {
  const json = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const md = await readFile(join(ROOT, CONTRACT_MD), "utf8");
  assert.match(md, /v1-s10-privacy-retention-settings\.v1\.json/);
  assert.match(md, /settings\.privacy-retention/);
  assert.match(md, /settings\.privacy-retention\.v1/);
  assert.match(md, /IMPLEMENTED_INTEGRATION_CERTIFIED/);
  assert.doesNotMatch(md, /FROZEN_CONTRACT_ONLY/);
  assert.match(md, new RegExp(GOAL_SHA));
  assert.match(md, /cleanup_consumer_unavailable/);
  assert.match(md, /20260807000000_s10_privacy_retention_settings/);
  assert.match(md, new RegExp(TESTED));
  for (const route of json.routes.settingsLifecycle) {
    assert.ok(md.includes(route[1]), `markdown must mention route ${route[1]}`);
  }
  assert.ok(md.includes("/dashboard/settings/s10-impact-preview"));
  assert.ok(md.includes("LEGAL_HOLD_CONFLICT"));
  assert.ok(md.includes("future_unavailable"));
  assert.doesNotMatch(md, /assertLastSuperAdminPreserved/);
  assert.ok(md.includes("s01_settings_publication_event"));
});

test("no secret values or credential patterns in S10 contract and evidence files", async () => {
  for (const path of [CONTRACT_PATH, CONTRACT_MD, EVIDENCE_PATH]) {
    const text = await readFile(join(ROOT, path), "utf8");
    const pattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=])/i;
    assert.doesNotMatch(text, pattern, `${path} must not contain secret patterns`);
  }
});

test("S10 depends on S01 and CG01 in the certified DAG", async () => {
  const dependencies = JSON.parse(await readFile(DEPENDENCIES, "utf8"));
  const s10 = dependencies.packages.find((entry) => entry.id === "S10");
  assert.ok(s10, "S10 must exist in the dependency DAG");
  assert.deepEqual(s10.dependsOn, ["S01", "CG01"]);
  assert.deepEqual(s10.externalBaselineDependencies, ["P04", "D17-current-facts"]);
});
