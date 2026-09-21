import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = "tasks/contracts/v1-s09-auth-rbac-settings.v1.json";
const CONTRACT_MD = "tasks/contracts/v1-s09-auth-rbac-settings.v1.md";
const GOAL_SHA = "6d8e9756616bc926ba0f7ee95965c40d228b28d09403704f526125dbe5152ec5";
const DEPENDENCIES = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-remaining-feature-dependencies.json";
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");

function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
}
function migrationDirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

test("S09 contract JSON is parseable and in final implemented/integrated/certified status", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(artifact.schemaVersion, "vanstro.s09.auth-rbac-settings.v1");
  assert.equal(artifact.status, "IMPLEMENTED_INTEGRATION_CERTIFIED");
  assert.equal(artifact.package, "S09");
  assert.equal(artifact.descriptorKey, "settings.auth-rbac");
  assert.equal(artifact.settingsSchemaVersion, "settings.auth-rbac.v1");
  assert.deepEqual(artifact.authority.dependsOn, ["S01", "CG01"]);
  assert.equal(artifact.authority.goalSha256, GOAL_SHA);
  const claims = artifact.claims;
  assert.equal(claims.frozen, true);
  assert.equal(claims.implemented, true);
  assert.equal(claims.integrated, true);
  assert.equal(claims.certified, true);
  assert.equal(artifact.finalIdentity.backendCommit, "a30598db4ec5015c87a57479fb4fe04295dd757f");
  assert.equal(artifact.finalIdentity.frontendCommit, "5c3c0f12c8bf15bb3f0e052af5b52a9a260319b0");
  assert.equal(artifact.finalIdentity.integrationCommit, "8ac3ad08d266498c1b9ecb01bb596425f6b86316");
  assert.equal(artifact.finalIdentity.integrationTree, "460ca2a0d3ba584f3d97e26a56d42e159340ffa8");
  assert.equal(artifact.finalIdentity.migration76.unique, true);
  assert.equal(artifact.finalIdentity.migration76.migrationCount, 76);
  assert.equal(artifact.finalIdentity.migration76.no77, true);
  assert.equal(artifact.finalIdentity.browserEvidence.sha256, "dd40304ea6cfb0f71ad6fdcf25a3feda2523773815632203858ef33fd102404e");
});

test("TTL authority is single-source with exact bounds and precedence", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const ttl = artifact.ttlAuthority;
  assert.equal(ttl.unit, "minutes");
  assert.equal(ttl.sessionDefault.valueMinutes, 10080);
  assert.equal(ttl.sessionSqlSafetyCeiling.valueMinutes, 11520);
  assert.equal(ttl.resetDefault.valueMinutes, 30);
  assert.equal(ttl.resetSqlSafetyCeiling.valueMinutes, 31);
  assert.match(ttl.sessionDefault.source, /SESSION_TTL_MS/);
  assert.match(ttl.resetDefault.source, /PASSWORD_RESET_TTL_MS/);
  const valueSchema = artifact.valueSchema;
  assert.equal(valueSchema.sessionPolicy.sessionLifetimeMinutes.maximum, 11520);
  assert.equal(valueSchema.sessionPolicy.sessionLifetimeMinutes.default, 10080);
  assert.equal(valueSchema.passwordPolicy.resetTokenTtlMinutes.maximum, 31);
  assert.equal(valueSchema.passwordPolicy.resetTokenTtlMinutes.default, 30);
});

test("S09 routes reuse only settings.read/settings.write plus sessions.revoke for revoke", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const routes = artifact.routes.settingsLifecycle;
  assert.equal(routes.length, 11);
  for (const [, , permission] of routes) {
    assert.ok(["settings.read", "settings.write"].includes(permission), `unexpected permission ${permission}`);
  }
  assert.deepEqual(artifact.routes.preview, ["POST", "/dashboard/settings/s09-impact-preview", "settings.read"]);
  assert.deepEqual(artifact.routes.revoke, ["POST", "/dashboard/settings/s09-session-revoke", "sessions.revoke"]);
  assert.ok(artifact.routes.errorFamilies["409"].includes("LAST_SUPER_ADMIN_CONFLICT"));
});

test("migration76 boundary: allowed and forbidden sets are explicit and migration76 is the unique final migration", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(artifact.migration76.owner, "Backend/S09");
  assert.match(artifact.migration76.path, /20260806100000_s09_auth_rbac_settings/);
  assert.ok(artifact.migration76.forbidden.includes("modify migrations 1-75"));
  assert.ok(artifact.migration76.forbidden.includes("CREATE OR REPLACE s01_* or s02_* functions"));
  assert.ok(artifact.migration76.allowed.includes("s09_* controlled functions"));
  const dirs = migrationDirs();
  assert.equal(dirs.length, 76, `final integration must have exactly 76 migrations, got ${dirs.length}`);
  const s09Dirs = dirs.filter((name) => name.includes("s09_auth_rbac_settings"));
  assert.equal(s09Dirs.length, 1, "exactly one migration76 directory");
  assert.ok(!dirs.some((name) => name.includes("77")), "no migration77");
});

const FINAL_BASELINE = "8ac3ad08d266498c1b9ecb01bb596425f6b86316";

test("authority/evidence commit adds only the S09 contract, evidence and static-test files", async () => {
  const tracked = git("diff", "--name-only", FINAL_BASELINE, "HEAD").split("\n").filter(Boolean);
  const S09_AUTHORITY_FILES = new Set([
    "tasks/contracts/v1-s09-auth-rbac-settings.v1.json",
    "tasks/contracts/v1-s09-auth-rbac-settings.v1.md",
    "tasks/evidence/v1-s09-settings-browser/acceptance-results.json",
    "scripts/s09-contract-static.test.mjs"
  ]);
  for (const path of tracked) {
    assert.ok(S09_AUTHORITY_FILES.has(path), `unexpected change outside S09 authority/evidence scope: ${path}`);
  }
  for (const path of S09_AUTHORITY_FILES) {
    assert.ok(tracked.includes(path), `missing S09 authority/evidence file ${path}`);
  }
  const runtime = [
    "apps/api/src/dashboard/s09-settings.ts",
    "packages/db/src/s09-settings-controlled.ts",
    "src/lib/dashboard/s09-settings.ts",
    "src/components/dashboard/AuthRbacSettingsPanel.tsx"
  ];
  for (const path of runtime) {
    const exists = execFileSync("bash", ["-c", `test -e "${join(ROOT, path)}" && echo yes || echo no`], { encoding: "utf8" }).trim();
    assert.equal(exists, "yes", `S09 runtime implementation must exist after integration: ${path}`);
  }
});

test("MD and JSON reference each other and stay semantically consistent", async () => {
  const json = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const md = await readFile(join(ROOT, CONTRACT_MD), "utf8");
  assert.match(md, /v1-s09-auth-rbac-settings\.v1\.json/);
  assert.match(md, /settings\.auth-rbac/);
  assert.match(md, /settings\.auth-rbac\.v1/);
  assert.match(md, /IMPLEMENTED_INTEGRATION_CERTIFIED/);
  assert.match(md, new RegExp(GOAL_SHA));
  assert.match(md, /10080/);
  assert.match(md, /11520/);
  assert.match(md, /20260806100000_s09_auth_rbac_settings/);
  for (const route of json.routes.settingsLifecycle) {
    assert.ok(md.includes(route[1]), `markdown must mention route ${route[1]}`);
  }
  assert.ok(md.includes("/dashboard/settings/s09-impact-preview"));
  assert.ok(md.includes("/dashboard/settings/s09-session-revoke"));
  assert.ok(md.includes("assertLastSuperAdminPreserved"));
  assert.ok(md.includes("auth_admin_revoke_user_sessions_v1"));
  assert.ok(md.includes("sessions.revoke"));
});

test("no secret values or credential patterns in S09 contract files", async () => {
  for (const path of [CONTRACT_PATH, CONTRACT_MD]) {
    const text = await readFile(join(ROOT, path), "utf8");
    const pattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=])/i;
    assert.doesNotMatch(text, pattern, `${path} must not contain secret patterns`);
  }
});

test("S09 depends on S01 and CG01 in the frozen DAG", async () => {
  const dependencies = JSON.parse(await readFile(DEPENDENCIES, "utf8"));
  const s09 = dependencies.packages.find((entry) => entry.id === "S09");
  assert.ok(s09, "S09 must exist in the dependency DAG");
  assert.deepEqual(s09.dependsOn, ["S01", "CG01"]);
  assert.deepEqual(s09.externalBaselineDependencies, ["P02-current-facts"]);
});
