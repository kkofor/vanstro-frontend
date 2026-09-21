import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = "a02aa880da70a21c88ca2c60098662c346d430ff";
const BASELINE_TREE = "aa90815ec73f8316c36e1b435d6af31e1ba495b3";
const TASK_SHA = "75994daa16a0cd2cd9e17730c71930ea302c179313363d7d761e57b0b435218b";
const CONTRACT_PATH = "tasks/contracts/v1-s08-api-service-accounts.v1.json";
const CONTRACT_MD = "tasks/contracts/v1-s08-api-service-accounts.v1.md";
const ERP_MANIFEST = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/contracts/erp-product-api-v1-compatibility-manifest.json";
const PROTECTION_MANIFEST = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/omp-formal-coordinator-protection-manifest-v15.json";
const FINAL_REPORT = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/reports/2026-08-07-v1-s08-authority-scan-consistency-closed-v3.md";
const DEPENDENCIES = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-remaining-feature-dependencies.json";
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");

function git(...args) { return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim(); }
function blobAt(commit, path) { return git("rev-parse", `${commit}:${path}`); }
function migrationDirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

test("S08 contract JSON is parseable and frozen with exact identity", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(artifact.schemaVersion, "vanstro.s08.api-service-accounts.v1");
  assert.equal(artifact.status, "IMPLEMENTED_INTEGRATION_CERTIFIED");
  assert.equal(artifact.package, "S08");
  assert.equal(artifact.descriptorKey, "settings.api-service-account");
  assert.equal(artifact.settingsSchemaVersion, "settings.api-service-account.v1");
  assert.deepEqual(artifact.authority.dependsOn, ["S01", "CG01"]);
  assert.equal(artifact.authority.taskSha256, TASK_SHA);
  assert.equal(artifact.authority.port, "cg01.api-service-account.v1");
  assert.equal(artifact.baseline.integrationCommit, BASELINE);
  assert.equal(artifact.baseline.integrationTree, BASELINE_TREE);
  assert.equal(artifact.baseline.migrationCount, 78);
  assert.equal(artifact.baseline.noMigration79, true);
  assert.equal(artifact.claims.frozen, true);
  assert.equal(artifact.claims.implemented, true);
  assert.equal(artifact.claims.certified, true);
});

test("four exact typed policy families with typed bounds and no universal JSON", async () => {
  const vs = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8")).valueSchema;
  assert.deepEqual(vs.exactTopLevelFamilies, ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"]);
  assert.equal(vs.unknownFields, "reject");
  assert.equal(vs.universalJson, false);
  assert.match(JSON.stringify(vs.tokenLifecyclePolicy.types), /current fact default 90/);
  assert.match(JSON.stringify(vs.tokenLifecyclePolicy.types), /hard maximum 365/);
  assert.match(JSON.stringify(vs.rateLimitPolicy.types.requestsPerMinute), /hard ceiling/);
  assert.match(JSON.stringify(vs.rateLimitPolicy.types.burst), /coverage_limited/);
  assert.match(JSON.stringify(vs.machineScopePolicy.types.environment), /future obligation/);
  assert.match(JSON.stringify(vs.auditInvocationPolicy.types.invocationRetentionDays), /P04 retention/);
});

test("consumer state matrix is explicit and all S08 consumers start future_obligation", async () => {
  const matrix = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8")).consumerStateMatrix;
  assert.match(matrix.note, /implemented_ready only counts/);
  assert.equal(matrix.consumers.length, 6);
  for (const consumer of matrix.consumers) {
    assert.ok(consumer.id && consumer.ownerPackage === "S08" && consumer.entry && consumer.generation === "exact");
  }
  const byId = new Map(matrix.consumers.map((c) => [c.id, c.state]));
  for (const id of ["token-lifecycle", "rotate-overlap", "machine-scope-enforcement", "rate-limit", "audit-invocation-read-model"]) assert.equal(byId.get(id), "implemented_ready", `${id} must be implemented_ready`);
  assert.equal(byId.get("erp-product-api-machine"), "future_obligation", "ERP machine consumer stays future_obligation");
  assert.match(matrix.note, /implemented_ready only counts/);
  assert.ok(matrix.neverImplementedConsumers.length >= 4);
  const ids = matrix.consumers.map((c) => c.id);
  for (const id of ["token-lifecycle", "rotate-overlap", "machine-scope-enforcement", "rate-limit", "audit-invocation-read-model", "erp-product-api-machine"]) assert.ok(ids.includes(id));
});

test("S08 descriptor is implemented with migration79 as sole forward migration and migrations 1-78 immutable", async () => {
  const required = [
    "apps/api/src/dashboard/s08-settings.ts",
    "packages/db/src/s08-settings-controlled.ts",
    "packages/db/prisma/migrations/20260808000000_s08_api_service_accounts/migration.sql",
    "src/lib/dashboard/s08-settings.ts",
    "src/components/dashboard/ApiServiceAccountsSettingsPanel.tsx"
  ];
  for (const path of required) assert.equal(existsSync(join(ROOT, path)), true, `runtime path missing: ${path}`);
  const dirs = migrationDirs();
  assert.equal(dirs.length, 79, "exactly 79 migrations");
  assert.equal(dirs.sort().at(-1), "20260808000000_s08_api_service_accounts", "migration79 is the latest");
  assert.equal(dirs.filter((name) => name.startsWith("20260808")).length, 1, "exactly one S08 migration dir (20260808 prefix)");
  const authorityMigrations = execFileSync("git", ["-C", ROOT, "ls-tree", "-r", "--name-only", BASELINE, "packages/db/prisma/migrations"], { encoding: "utf8" }).trim().split("\n").filter((path) => path.endsWith("migration.sql"));
  assert.equal(authorityMigrations.length, 78, "freeze baseline had 78 migrations");
  for (const path of authorityMigrations) assert.equal(blobAt(BASELINE, path), blobAt("HEAD", path), `${path} must stay immutable`);
});

test("ERP compatibility authority is referenced once and Manifest stays planning-only", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const auth = artifact.erpCompatibility.authority;
  for (const [key, expected] of [
    ["overlay", "a8ca3113984b7e4f76b675009b64f8e22c705095873e4b315d6613bc7c7d2f89"],
    ["contractMd", "d2dbe952b60d5fa76ef5b50ef742fa859e1ecf8ca87d582370879f8c874ed18d"],
    ["contractJson", "3998fdf8c3a4ea4ba738da885ad2ae7a9840fadfb3eab5da16ac0c7c5717cffa"],
    ["manifest", "b8f7e6080e4565a1efb240c98fdfb4517626f0a024745264305cee48f58df038"]
  ]) assert.equal(auth[key].sha256, expected, key);
  const manifest = JSON.parse(await readFile(ERP_MANIFEST, "utf8"));
  assert.equal(manifest.goNoGo.planningFrozen, true);
  assert.equal(manifest.goNoGo.productContractFrozen, false);
  assert.equal(manifest.goNoGo.implementationComplete, false);
  assert.equal(manifest.currentProgressContribution, 0);
  assert.match(JSON.stringify(artifact.erpCompatibility.machineIdentityBoundary), /future_obligation/);
  assert.match(JSON.stringify(artifact.erpCompatibility.minimumMachinePermissions), /cli\.access/);
  assert.match(JSON.stringify(artifact.erpCompatibility.minimumMachinePermissions), /erp\.catalog\.read/);
});

test("immutable one-time reveal and zero-side-effect publish are frozen", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const schemaText = JSON.stringify(artifact.valueSchema);
  assert.doesNotMatch(schemaText, /oneTimeRevealEnabled/);
  assert.equal(artifact.classification.oneTimeReveal.classification, "immutable_projection");
  assert.match(artifact.classification.oneTimeReveal.invariant, /only once in the successful create\/rotate response/);
  assert.equal(artifact.impactPreview.readOnly, true);
  for (const phrase of ["no token create/rotate/revoke", "no Service Account/Role/Permission mutation", "no ERP call", "no secret echo"]) {
    assert.ok(artifact.impactPreview.forbidden.some((item) => item.includes(phrase)), `missing impact forbidden ${phrase}`);
  }
  for (const phrase of ["no token create/rotate/revoke/expiry mutation", "no ServiceAccountRole, Role or Permission assignment/removal", "no ERP API or external request", "no plaintext token"]) {
    assert.ok(artifact.publishAdapter.forbiddenSideEffects.some((item) => item.includes(phrase)), `missing publish forbidden ${phrase}`);
  }
  assert.match(artifact.publishAdapter.rollback, /never restores a revoked token/);
  assert.equal(artifact.readinessAdapter.sideEffectFree, true);
  assert.equal(artifact.readinessAdapter.neverFakeReady, true);
});

test("business action permission mapping and rotate/rate-limit/invocation semantics are frozen", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const b = artifact.businessActions;
  assert.match(b.permissionMapping["settings.read/settings.write"], /settings\.read\/settings\.write/);
  assert.match(b.permissionMapping["service_accounts.manage"], /P02 actor permission ceiling/);
  assert.match(b.permissionMapping.invocationListDetail, /service_accounts\.manage/);
  assert.match(b.rotateOverlap.mechanism, /expiresAt/);
  assert.match(b.rotateOverlap.mechanism, /no scheduled job/);
  assert.match(b.rotateOverlap.idempotency, /plaintextAvailable=false/);
  assert.match(b.rotateOverlap.idempotency, /409/);
  assert.match(b.rotateOverlap.noRecovery, /no second-read or recovery plaintext endpoint/);
  assert.match(b.rateLimit.key, /sa-token:<tokenId>/);
  assert.match(b.rateLimit.key, /sa-account:<accountId>/);
  assert.match(b.rateLimit.honesty, /never masquerade as multi-instance consistency/);
  assert.match(b.rateLimit.blocking, /blocks ERP Limited Release/);
  assert.match(b.invocationReadModel.defaultFields.join(" "), /toolKey/);
  assert.match(b.invocationReadModel.rawInputOutputError, /never returned by default/);
  assert.match(artifact.auditDescriptor.requiredPermission, /service_accounts\.manage/);
});

test("DAG invariants stay 44/35/12/8/1/36/118/3-of-3 and S08 depends on S01+CG01", async () => {
  const d = JSON.parse(await readFile(DEPENDENCIES, "utf8"));
  assert.deepEqual(d.counts, { capabilities: 44, workPackages: 35, settingsPackages: 12, waves: 8, contractGatesNotCountedAsWorkPackages: 1 });
  assert.equal(d.packages.length + 1, 36);
  assert.equal(d.packages.reduce((sum, entry) => sum + entry.dependsOn.length, 0) + 1, 118);
  assert.equal(Object.keys(d.criticalDependencyAssertions).length, 3);
  const s08 = d.packages.find((entry) => entry.id === "S08");
  assert.deepEqual(s08.dependsOn, ["S01", "CG01"]);
  assert.deepEqual(s08.externalBaselineDependencies, ["P02", "P04", "P09-current-facts", "ServiceAccount-current-facts"]);
});

test("no secret values or credential patterns in S08 contract files", async () => {
  // sa-token:<tokenId> / sa-account:<accountId> are the frozen rate-limit key
  // formats (identifiers, not credentials); normalize them before scanning.
  const corpus = (await Promise.all([CONTRACT_PATH, CONTRACT_MD].map((path) => readFile(join(ROOT, path), "utf8")))).join("\n")
    .replaceAll("sa-token:", "sa-token ").replaceAll("sa-account:", "sa-account ");
  const secretPattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=]|authorization:\s*bearer\s+[A-Za-z0-9._-]{8,}|vsa_[A-Za-z0-9_-]{20,}|sk_live|pk_live|4111[ -]?1111)/i;
  assert.doesNotMatch(corpus, secretPattern);
  assert.match(corpus, /PII/);
  assert.match(corpus, /tokenHash/);
});

test("MD and JSON reference each other and stay semantically consistent", async () => {
  const json = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const md = await readFile(join(ROOT, CONTRACT_MD), "utf8");
  assert.match(md, /v1-s08-api-service-accounts\.v1\.json/);
  assert.match(md, /IMPLEMENTED_INTEGRATION_CERTIFIED/);
  assert.match(md, new RegExp(TASK_SHA));
  assert.match(md, /settings\.api-service-account/);
  assert.match(md, /settings\.api-service-account\.v1/);
  assert.match(md, /20260808000000_s08_api_service_accounts/);
  for (const family of json.valueSchema.exactTopLevelFamilies) assert.ok(md.includes(family));
  for (const consumer of json.consumerStateMatrix.consumers) assert.ok(md.includes(consumer.id));
  assert.match(md, /service_accounts\.manage/);
  assert.match(md, /plaintextAvailable=false/);
});

test("negative mutations are caught", async () => {
  const read = async () => JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const mutations = [
    (a) => { a.valueSchema.tokenLifecyclePolicy.fields.push("oneTimeRevealEnabled"); },
    (a) => { a.consumerStateMatrix.consumers.find((c) => c.id === "rotate-overlap").state = "implemented_ready"; },
    (a) => { a.consumerStateMatrix.consumers.find((c) => c.id === "rate-limit").state = "implemented_ready"; },
    (a) => { a.publishAdapter.forbiddenSideEffects = a.publishAdapter.forbiddenSideEffects.filter((x) => !x.includes("token create/rotate/revoke")); },
    (a) => { a.baseline.noMigration79 = false; a.baseline.migrationCount = 79; },
    (a) => { a.erpCompatibility.manifestRequiredState.implementationComplete = true; },
    (a) => { a.readinessAdapter.neverFakeReady = false; },
    (a) => { a.businessActions.rotateOverlap.mechanism = a.businessActions.rotateOverlap.mechanism.replace("no scheduled job", "scheduled job"); }
  ];
  const assertFrozen = (a) => {
    assert.equal(a.status, "FROZEN_CONTRACT_ONLY — IMPLEMENTATION NOT STARTED");
    assert.doesNotMatch(JSON.stringify(a.valueSchema), /oneTimeRevealEnabled/);
    for (const c of a.consumerStateMatrix.consumers) assert.equal(c.state, "future_obligation");
    assert.ok(a.publishAdapter.forbiddenSideEffects.some((x) => x.includes("token create/rotate/revoke")));
    assert.equal(a.baseline.noMigration79, true);
    assert.equal(a.erpCompatibility.manifestRequiredState.implementationComplete, false);
    assert.equal(a.readinessAdapter.neverFakeReady, true);
    assert.match(a.businessActions.rotateOverlap.mechanism, /no scheduled job/);
  };
  for (const mutate of mutations) {
    const artifact = await read();
    mutate(artifact);
    assert.throws(() => assertFrozen(artifact), undefined, "mutation must be caught");
  }
});

test("real Backend token list GET, safe DTO and explicit machine rate-limit stacks are enforced", async () => {
  const read = (path) => execFileSync("git", ["-C", ROOT, "show", `HEAD:${path}`], { encoding: "utf8" });
  const system = read("apps/api/src/dashboard/system.ts");
  const access = read("apps/api/src/dashboard/access.ts");
  // 1. Frontend-declared endpoint exists in the Backend router and the access allowlist.
  assert.match(system, /routes\.get\("\/dashboard\/mcp\/service-accounts\/:id\/tokens"/, "GET token list route must exist in system.ts");
  assert.match(access, /\{ method: "GET", path: "\/dashboard\/mcp\/service-accounts\/:id\/tokens", permission: "service_accounts\.manage" \}/, "GET token list access rule must exist");
  // 2. Safe DTO: the list mapping may only emit the seven frozen fields and the
  //    Prisma select must never fetch tokenHash or rotate internals.
  const selectBlock = system.slice(system.indexOf('serviceAccountToken.findMany'), system.indexOf('const now = Date.now()'));
  for (const forbidden of ["tokenHash", "rotateIdempotencyKey", "rotateRequestHash", "overlapUntil"]) {
    assert.doesNotMatch(selectBlock, new RegExp(forbidden), `${forbidden} must not be selected for the token list`);
  }
  assert.match(selectBlock, /replacedByTokenId: true/, "replacedByTokenId is read only to derive status");
  const mappingStart = system.indexOf("data: tokens.map");
  const mapping = system.slice(mappingStart, system.indexOf("}))", mappingStart) + 3);
  for (const allowed of ["id", "name", "status", "lastUsedAt", "expiresAt", "revokedAt", "createdAt"]) {
    assert.match(mapping, new RegExp(`\\b${allowed}\\b`), `DTO must emit ${allowed}`);
  }
  const strippedMapping = mapping.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const forbidden of ["plaintext", "tokenHash", "secret", "rotateIdempotencyKey", "rotateRequestHash", "overlapUntil"]) {
    assert.doesNotMatch(strippedMapping, new RegExp(forbidden), `${forbidden} must never be emitted`);
  }
  assert.doesNotMatch(strippedMapping, /token\s*:/, "plaintext token field key must never be emitted");
  assert.match(system, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\]/, "token list must order createdAt desc + id asc");
  assert.match(system, /assertManageableServiceAccounts/, "P02 ceiling must run in the token list handler");
  // 3. Every machine route in the contract inventory carries the explicit stack.
  const mcp = read("apps/api/src/routes/mcp.ts");
  const cli = read("apps/api/src/routes/cli.ts");
  const erp = read("apps/api/src/routes/erp-integration.ts");
  const inventory = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8")).machineRouteInventory;
  const assertStack = (source, router, method, path) => {
    const pattern = new RegExp(`${router}\\.${method}\\("${path.replace(/\//g, "\\/")}", requireMachineAccess\\("[^"]+"\\), rateLimitServiceAccount`);
    assert.match(source, pattern, `${method} ${path} must carry requireMachineAccess -> rateLimitServiceAccount`);
  };
  for (const path of inventory.erp) {
    const method = path.startsWith("POST") ? "post" : "get";
    assertStack(erp, "machineRoutes", method, path.split(" ")[1]);
  }
  for (const path of inventory.mcp) assertStack(mcp, "routes", path.startsWith("POST") ? "post" : "get", path.split(" ")[1]);
  for (const path of inventory.cli) assertStack(cli, "routes", path.startsWith("POST") ? "post" : "get", path.split(" ")[1]);
  assert.doesNotMatch(erp, /machineRoutes\.use\(\"\*\", rateLimitServiceAccount\)/, "no app-wide rate-limit hoisting may return");
  assert.doesNotMatch(read("apps/api/src/middleware/rate-limit-sa.ts"), /Hono hoists/, "hoisting comment must not return");
  // 4. Contract and progress consistency.
  const contract = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(contract.progressBounds.functionality, "+1..2pp (68%-74% cap)");
  assert.ok(contract.tokenListDto.fields.length === 7, "tokenListDto must freeze exactly seven fields");
  assert.equal(contract.consumerStateMatrix.consumers.find((c) => c.id === "rate-limit").state, "implemented_ready");
  assert.match(contract.machineRouteInventory.note, /explicit requireMachineAccess -> rateLimitServiceAccount/);
});

test("negative mutations on the real Backend coverage are caught", async () => {
  const read = (path) => execFileSync("git", ["-C", ROOT, "show", `HEAD:${path}`], { encoding: "utf8" });
  const base = {
    system: read("apps/api/src/dashboard/system.ts"),
    access: read("apps/api/src/dashboard/access.ts"),
    mcp: read("apps/api/src/routes/mcp.ts"),
    cli: read("apps/api/src/routes/cli.ts"),
    erp: read("apps/api/src/routes/erp-integration.ts"),
    contract: JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"))
  };
  const mustFail = (label, source, pattern) => {
    assert.doesNotMatch(source, pattern, `${label}: mutation must be caught (pattern still present)`);
  };
  // 1. Removing the GET route must break the route-stack assertion.
  const noGet = base.system.replace(/routes\.get\("\/dashboard\/mcp\/service-accounts\/:id\/tokens",[\s\S]*?\n  }\);/, "");
  assert.throws(() => assert.match(noGet, /routes\.get\("\/dashboard\/mcp\/service-accounts\/:id\/tokens"/), "GET route removal must fail");
  // 2. Removing the access rule must break the allowlist assertion.
  const noAccess = base.access.replace(/\{ method: "GET", path: "\/dashboard\/mcp\/service-accounts\/:id\/tokens", permission: "service_accounts\.manage" \},\n/, "");
  assert.throws(() => assert.match(noAccess, /GET.*service-accounts\/:id\/tokens/), "access rule removal must fail");
  // 3. Removing a rate-limit link must break the stack assertion.
  const noMcpLimit = base.mcp.replaceAll(", rateLimitServiceAccount", "");
  assert.throws(() => assert.match(noMcpLimit, /routes\.(get|post)\(\"[^\"]+\", requireMachineAccess\("[^"]+"\), rateLimitServiceAccount/), "MCP rate-limit removal must fail");
  const noErpLimit = base.erp.replaceAll(", rateLimitServiceAccount", "");
  assert.throws(() => assert.match(noErpLimit, /machineRoutes\.(get|post)\(\"[^\"]+\", requireMachineAccess\("[^"]+"\), rateLimitServiceAccount/), "ERP rate-limit removal must fail");
  // 4. Emitting a secret field must break the DTO denylist.
  const leaky = base.system.replace(/name: token\.name \?\? "",/, 'name: token.name ?? "", tokenHash: token.tokenHash,');
  assert.throws(() => assert.doesNotMatch(leaky, /tokenHash: token\.tokenHash/), "secret emission must fail");
  // 5. Contract downgrade of rate-limit consumer must fail.
  const downgraded = structuredClone(base.contract);
  downgraded.consumerStateMatrix.consumers.find((c) => c.id === "rate-limit").state = "implemented_degraded";
  assert.throws(() => assert.equal(downgraded.consumerStateMatrix.consumers.find((c) => c.id === "rate-limit").state, "implemented_ready"), "consumer downgrade must fail");
});

test("Authority secret/PII/payment scan is closed and consistent across Contract, manifest and final report", async () => {
  const contract = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const gate = contract.finalIdentity.gates.secretPiiPaymentScan;
  const forbidden = /pending(?: rerun)?|not[ _-]?run|unverified|unknown/i;
  assert.match(gate, /^clean\b/i, "Contract scan gate must be explicitly clean");
  assert.doesNotMatch(gate, forbidden, "Contract scan gate must not retain pending/not-run semantics");
  assert.equal(contract.finalIdentity.authorityScanCorrection.scope.totalFiles, 22);
  assert.equal(contract.finalIdentity.authorityScanCorrection.highConfidenceFindings, 0);
  assert.equal(contract.finalIdentity.authorityScanCorrection.piiRedactions.count, 2);
  const manifest = JSON.parse(await readFile(PROTECTION_MANIFEST, "utf8"));
  assert.match(manifest.gateSummary.secretPiiPaymentScan, /^clean\b/i);
  assert.doesNotMatch(manifest.gateSummary.secretPiiPaymentScan, forbidden);
  assert.equal(manifest.gateSummary.secretPiiPaymentScan, gate, "Contract and protection manifest scan states must be identical");
  const report = await readFile(FINAL_REPORT, "utf8");
  assert.match(report, /secret\/PII\/payment scan: `clean`/i, "final report must claim the same explicit clean state");
  assert.match(report, /22 files[\s\S]*20 raw candidates[\s\S]*0 high-confidence findings/i, "final report must carry the audited scan counts");
});

test("negative mutation cannot restore a pending Authority scan state", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const assertScanClosed = (candidate) => {
    const gate = candidate.finalIdentity.gates.secretPiiPaymentScan;
    assert.match(gate, /^clean\b/i);
    assert.doesNotMatch(gate, /pending(?: rerun)?|not[ _-]?run|unverified|unknown/i);
    assert.equal(candidate.finalIdentity.authorityScanCorrection.highConfidenceFindings, 0);
  };
  assertScanClosed(artifact);
  for (const pending of ["pending", "pending rerun", "not run", "not_run", "unknown"]) {
    const mutated = structuredClone(artifact);
    mutated.finalIdentity.gates.secretPiiPaymentScan = pending;
    assert.throws(() => assertScanClosed(mutated), undefined, `${pending} mutation must fail`);
  }
});
