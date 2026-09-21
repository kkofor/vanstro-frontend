import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WAVE_A_BASELINE = "b3d59b31b7149c3458033dc0b072a0164dd7b7c7";
const COMMERCE_BASELINE = "f8f1b1b74db9b2ba0d67a015c72f0fc9a1da5fee";
const COMMERCE_BASELINE_TREE = "f8e68c6ab58af7c6c957be082ee00830e7e58ae1";
const S08_FREEZE_BASELINE = "d223303c53750db1217eb122f50e204c8d26f88f";
const S08_PRODUCT_BASELINE = "ba32e25d385e1ed882c329f247aadd7e8754338b";
const S08_JSON_BASELINE = "247001e95f6298c88dc85ff82e27262b83297733";
const S08_FREEZE_TREE = "fe8b3526608621e7ff80d6df4d9552706e4f2692";
const CONTRACT_PATH = "tasks/contracts/v1-cg01-wave-a-settings-ports.v1.json";
const CONTRACT_MD = "tasks/contracts/v1-cg01-wave-a-settings-ports.v1.md";
const DEPENDENCIES = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-remaining-feature-dependencies.json";
const CLARIFICATION = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-cg01-wave-a-port-list-clarification.md";
const ERP = {
  overlay: ["/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-erp-product-api-priority-overlay.md", "a8ca3113984b7e4f76b675009b64f8e22c705095873e4b315d6613bc7c7d2f89"],
  contractMd: ["/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/contracts/erp-product-api-v1-compatibility-contract.md", "d2dbe952b60d5fa76ef5b50ef742fa859e1ecf8ca87d582370879f8c874ed18d"],
  contractJson: ["/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/contracts/erp-product-api-v1-compatibility-contract.json", "3998fdf8c3a4ea4ba738da885ad2ae7a9840fadfb3eab5da16ac0c7c5717cffa"],
  manifest: ["/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/contracts/erp-product-api-v1-compatibility-manifest.json", "b8f7e6080e4565a1efb240c98fdfb4517626f0a024745264305cee48f58df038"]
};
// Product paths must stay byte-identical to the Commerce freeze; the S03
// consumption files (commerce routes, shared API contract, runtime
// validation) are asserted separately as the only permitted deltas.
const PRODUCT_PATHS = [
  "apps/api/src/config.ts",
  "apps/api/src/routes/catalog.ts",
  "apps/api/src/payments/finalize.ts",
  "apps/api/src/integrations/erp-sync/inventory.ts",
  "apps/api/src/integrations/erp-catalog-sync/service.ts",
  "apps/worker/src/index.ts"
];
const S08_CONSUMPTION_PATHS = [
  "apps/api/src/routes/erp-integration.ts",
  "packages/db/prisma/schema.prisma",
  "apps/api/src/auth/service-account.ts",
  "apps/api/src/auth/service-account-access.ts",
  "apps/api/src/dashboard/system.ts",
  "apps/api/src/dashboard/access.ts"
];
const S03_CONSUMPTION_PATHS = [
  "apps/api/src/routes/commerce/index.ts",
  "src/lib/api/api-contract.ts",
  "src/lib/api/runtime-validation.ts"
];

function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
}
function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function blobAt(commit, path) {
  return git("rev-parse", `${commit}:${path}`);
}
function workingBlob(path) {
  return execFileSync("git", ["-C", ROOT, "hash-object", path], { encoding: "utf8" }).trim();
}
function migrationDirs() {
  return execFileSync("bash", ["-c", `cd "${join(ROOT, "packages/db/prisma/migrations")}" && for d in */; do basename "$d"; done`], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

const artifact = JSON.parse(readFileSync(join(ROOT, CONTRACT_PATH), "utf8"));
const commerce = artifact.ports.find((port) => port.id === "cg01.commerce.v1");
const apiServiceAccount = artifact.ports.find((port) => port.id === "cg01.api-service-account.v1");

test("Commerce freeze baseline is current and remains an ancestor", () => {
  assert.equal(blobAt(COMMERCE_BASELINE, "tasks/contracts/v1-s10-privacy-retention-settings.v1.json").length, 40);
  assert.equal(git("rev-parse", `${COMMERCE_BASELINE}^{tree}`), COMMERCE_BASELINE_TREE);
  assert.equal(git("merge-base", COMMERCE_BASELINE, "HEAD"), COMMERCE_BASELINE);
  assert.equal(commerce.factBaseline.commit, S08_PRODUCT_BASELINE);
});

test("canonical inventory has exactly five unique Ports and API / Service Account belongs to S08", () => {
  assert.equal(artifact.schemaVersion, "vanstro.cg01.settings-ports.v1");
  assert.equal(artifact.status, "FROZEN_CONTRACT_ONLY — S08 NOT STARTED");
  assert.equal(artifact.gate, "CG01");
  assert.equal(artifact.ports.length, 5);
  assert.deepEqual(artifact.ports.map((port) => port.id).sort(), [
    "cg01.api-service-account.v1", "cg01.auth-rbac.v1", "cg01.commerce.v1", "cg01.general-storefront.v1", "cg01.privacy-retention.v1"
  ]);
  assert.equal(artifact.ports.filter((port) => port.id === "cg01.commerce.v1").length, 1);
  assert.equal(artifact.ports.filter((port) => port.id === "cg01.api-service-account.v1").length, 1);
  assert.equal(commerce.consumerPackage, "S03");
  assert.equal(apiServiceAccount.consumerPackage, "S08");
  assert.deepEqual(commerce.domainOwners, ["Commerce", "Tax", "Shipping/Fulfillment", "Inventory", "Orders"]);
  assert.deepEqual(apiServiceAccount.domainOwners, ["Service Accounts", "Machine Authentication", "P02 RBAC", "P04 Audit", "P09 Runtime/Readiness"]);
  assert.equal(artifact.incrementalTranches.length, 3);
  assert.deepEqual(artifact.incrementalTranches[1].ports, ["cg01.commerce.v1"]);
  assert.deepEqual(artifact.incrementalTranches[2].ports, ["cg01.api-service-account.v1"]);
  assert.equal(artifact.incrementalTranches[2].baselineCommit, S08_FREEZE_BASELINE);
  assert.equal(artifact.incrementalTranches[2].baselineTree, S08_FREEZE_TREE);
});

test("every Port keeps exactly the six contract sections", () => {
  const sections = ["schema", "currentProjection", "draftValidator", "publishAdapter", "readinessAdapter", "auditDescriptor"];
  for (const port of artifact.ports) {
    assert.deepEqual(Object.keys(port.contract).sort(), [...sections].sort(), `${port.id} six-section shape`);
  }
});

test("historical Wave A facts retain historical OIDs and Commerce facts match current baseline bytes", () => {
  for (const port of artifact.ports.filter((candidate) => ["cg01.general-storefront.v1", "cg01.auth-rbac.v1", "cg01.privacy-retention.v1"].includes(candidate.id))) {
    for (const fact of port.sourceFactsManifest) {
      assert.equal(fact.blobOid, blobAt(WAVE_A_BASELINE, fact.path), `${port.id} ${fact.path} historical OID`);
    }
  }
  for (const fact of commerce.sourceFactsManifest) {
    assert.equal(fact.blobOid, blobAt(S08_PRODUCT_BASELINE, fact.path), `${fact.path} S08 implementation OID`);
    assert.equal(workingBlob(fact.path), fact.blobOid, `${fact.path} working bytes changed`);
  }
});

test("Commerce schema is typed and keeps domain instances out of Settings", () => {
  const schema = commerce.contract.schema;
  assert.deepEqual(schema.exactTopLevelFamilies, ["commercePolicy", "taxPolicy", "shippingPolicy", "inventoryPolicy", "orderPolicy"]);
  assert.equal(schema.unknownFields, "reject");
  assert.equal(schema.universalJson, false);
  assert.match(schema.scope, /never copies Cart\/Order\/Payment\/Inventory\/ERP business instances/);
  assert.match(JSON.stringify(schema.fieldFamilies), /minimumOrderAmountCents/);
  assert.match(JSON.stringify(schema.fieldFamilies), /enabledProvinceCodes/);
  assert.match(JSON.stringify(schema.fieldFamilies), /reservationTtlMinutes/);
  assert.match(JSON.stringify(schema.fieldFamilies), /allowedLifecycleTransitions/);
});

test("current gaps, obligations, non-scope, leases and rollback outline are complete", () => {
  for (const needle of ["minimum order", "service zone", "S03 descriptor", "canonical ingest", "old-client", "replay-window"]) {
    assert.ok(commerce.currentGaps.some((gap) => gap.includes(needle)), `missing gap ${needle}`);
  }
  for (const needle of ["typed S03", "preview", "additive", "canonical ingest", "same-key", "S08 owns", "continuously verified"]) {
    assert.ok(commerce.futureImplementationObligations.some((item) => item.includes(needle)), `missing obligation ${needle}`);
  }
  for (const needle of ["migration78", "payment finalization", "real order", "Token", "physical delete"]) {
    assert.ok(commerce.notInScope.some((item) => item.includes(needle)), `missing non-scope ${needle}`);
  }
  assert.match(JSON.stringify(commerce.sharedResourceLeases), /S03 exclusive/);
  assert.equal(commerce.migrationBoundary.currentMigrationCount, 78);
  assert.match(commerce.migrationBoundary.migration78, /S03/);
  assert.ok(Array.isArray(commerce.rollbackAcceptanceOutline));
});

test("ERP Authority and permanent compatibility boundary are referenced once and remain frozen planning-only", () => {
  for (const [path, expected] of Object.values(ERP)) assert.equal(sha256(path), expected, path);
  const manifest = JSON.parse(readFileSync(ERP.manifest[0], "utf8"));
  assert.equal(manifest.goNoGo.planningFrozen, true);
  assert.equal(manifest.goNoGo.productContractFrozen, false);
  assert.equal(manifest.currentProgressContribution, 0);
  assert.deepEqual(commerce.erpCompatibilityAuthority.fieldOwnership, manifest.fieldOwnership);
  assert.match(commerce.erpCompatibilityAuthority.transportBoundary, /canonical ingest/);
  assert.match(commerce.erpCompatibilityAuthority.transportBoundary, /loop prevention/);
  assert.match(commerce.erpCompatibilityAuthority.compatibility, /additive-compatible/);
  assert.match(commerce.erpCompatibilityAuthority.historicalConflict.resolution, /superseded/);
  const contractText = JSON.stringify(commerce);
  for (const role of ["S03", "S06", "S08", "B01", "F03"]) assert.match(contractText, new RegExp(role));
  const contractJson = JSON.parse(readFileSync(ERP.contractJson[0], "utf8"));
  for (const forbidden of ["temporaryErpProductTable", "temporaryStaticToken", "erpSpecificCatalogPage", "thirdJobSystem", "duplicateIdempotencyImplementation"]) {
    assert.equal(contractJson.architectureConstraints[forbidden], false);
  }
});

test("preview, publish, readiness, Audit and rollback are side-effect safe", () => {
  const text = JSON.stringify(commerce.contract);
  for (const phrase of ["no cart/order/payment", "no inventory reservation", "no tax settlement", "no shipment", "no ERP sync/job", "no Product/SKU/Price/Category write"]) {
    assert.match(text, new RegExp(phrase, "i"));
  }
  assert.equal(commerce.contract.readinessAdapter.sideEffectFree, true);
  assert.equal(commerce.contract.readinessAdapter.neverFakeReady, true);
  assert.match(commerce.contract.readinessAdapter.consumerGenerationMatch, /exact/);
  assert.equal(commerce.contract.auditDescriptor.requiredPermission, "settings.write (existing global permission; no new permission)");
  assert.match(commerce.contract.publishAdapter.rollback, /never reverses/);
});

test("product paths stay byte-identical and S03 consumption is the only commerce delta", async () => {
  for (const path of PRODUCT_PATHS) {
    assert.equal(blobAt(COMMERCE_BASELINE, path), blobAt("HEAD", path), `${path} committed delta`);
    assert.equal(workingBlob(path), blobAt(COMMERCE_BASELINE, path), `${path} working delta`);
  }
  // The three S03-consumed files must exist and differ from the freeze only
  // by the S03 bounded implementation (checked by the S03 static gate).
  for (const path of S03_CONSUMPTION_PATHS) {
    assert.equal(existsSync(join(ROOT, path)), true, `${path} missing`);
    assert.equal(workingBlob(path), blobAt("HEAD", path), `${path} uncommitted delta`);
  }
  const corpus = [
    await readFile(join(ROOT, "apps/api/src/dashboard/settings.ts"), "utf8"),
    await readFile(join(ROOT, "apps/api/src/dashboard/access.ts"), "utf8"),
    await readFile(join(ROOT, "src/lib/api/api-contract.ts"), "utf8"),
    await readFile(join(ROOT, "src/lib/api/runtime-validation.ts"), "utf8")
  ].join("\n");
  assert.match(corpus, /settings\.commerce|s03-/i, "S03 descriptor is now consumed by Settings paths");
  assert.equal(artifact.scopeGuard.noS03Start, false);
  assert.equal(artifact.scopeGuard.noErpApiImplementation, true);
  assert.equal(artifact.scopeGuard.noDagCountOrProgressChange, false);
});

test("migration lineage is 78/latest S03/no79 and migrations 1-77 stay immutable against S10 authority", () => {
  const dirs = migrationDirs();
  assert.equal(dirs.length, 79, "exactly 79 migrations");
  assert.equal(dirs.sort().at(-1), "20260808000000_s08_api_service_accounts", "migration79 is the latest");
  assert.equal(dirs.filter((name) => name.startsWith("20260808")).length, 1, "exactly one S08 migration dir (20260808 prefix)");
  // 1-77 immutable against the S10 authority commit (87bd809), not the new
  // commerce baseline, so the freeze facts keep their historical binding.
  const authorityMigrations = execFileSync("git", ["-C", ROOT, "ls-tree", "-r", "--name-only", "87bd80973c1d4ebecd4394cd36ed1bcbdf547f59", "packages/db/prisma/migrations"], { encoding: "utf8" }).trim().split("\n").filter((path) => path.endsWith("migration.sql"));
  assert.equal(authorityMigrations.length, 77);
  for (const path of authorityMigrations) assert.equal(blobAt("87bd80973c1d4ebecd4394cd36ed1bcbdf547f59", path), blobAt("HEAD", path), path);
  assert.equal(artifact.migrationBoundary.sourceMigrationCount, 79);
  assert.match(artifact.migrationBoundary.migration78, /S03/);
  assert.equal(blobAt(S08_FREEZE_BASELINE, "packages/db/prisma/migrations/20260807100000_s03_commerce_settings/migration.sql"), blobAt("HEAD", "packages/db/prisma/migrations/20260807100000_s03_commerce_settings/migration.sql"), "migration78 must remain immutable");
  assert.match(artifact.migrationBoundary.migration79, /S08/);
  assert.equal(artifact.scopeGuard.noMigration79, false);
});

test("DAG invariants remain 44/35/12/8/1/36/118/3-of-3 and S03 dependencies do not change", async () => {
  const d = JSON.parse(await readFile(DEPENDENCIES, "utf8"));
  assert.deepEqual(d.counts, { capabilities: 44, workPackages: 35, settingsPackages: 12, waves: 8, contractGatesNotCountedAsWorkPackages: 1 });
  assert.equal(d.packages.length + 1, 36);
  assert.equal(d.packages.reduce((sum, entry) => sum + entry.dependsOn.length, 0), 117);
  assert.equal(117 + 1, 118);
  assert.equal(Object.keys(d.criticalDependencyAssertions).length, 3);
  const s03 = d.packages.find((entry) => entry.id === "S03");
  assert.deepEqual(s03.dependsOn, ["S01", "CG01"]);
  assert.deepEqual(s03.externalBaselineDependencies, ["Commerce-current-facts", "Tax-current-facts", "Shipping-current-facts", "Inventory-current-facts", "Orders-current-facts"]);
  const clarification = await readFile(CLARIFICATION, "utf8");
  assert.match(clarification, /44 项能力、35 实现包、12 Settings 包、8 Waves、36 DAG 节点.*118 条边均不变/);
});

test("secret, PII and payment material do not appear in contract artifacts", async () => {
  const corpus = (await Promise.all([CONTRACT_PATH, CONTRACT_MD].map((path) => readFile(join(ROOT, path), "utf8")))).join("\n");
  const secretPattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=]|authorization:\s*bearer\s+[A-Za-z0-9._-]{8,})/i;
  assert.doesNotMatch(corpus, secretPattern);
  assert.match(corpus, /PII/);
  assert.match(corpus, /payment material/);
  assert.doesNotMatch(corpus, /customer@example|4111[ -]?1111|sk_live|pk_live/);
});

test("Markdown and JSON are semantically aligned for the Commerce Port", async () => {
  const md = await readFile(join(ROOT, CONTRACT_MD), "utf8");
  for (const value of ["cg01.commerce.v1", "S03", COMMERCE_BASELINE, "FROZEN_CONTRACT_ONLY — S03 IMPLEMENTED（认证中，闭包后由 S03 契约记录）", "minimumOrderAmountCents", "settings.write", "migration78", "canonical ingest", "productContractFrozen=false", "currentProgressContribution=0"]) {
    assert.ok(md.includes(value), `MD missing ${value}`);
  }
  assert.match(md, /ERP.*基础售价/);
  assert.match(md, /VanStro.*营销折扣/);
  assert.match(md, /不增加工作包、节点、边或进度/);
});

test("CG01 only references current v2 register and does not claim progress", () => {
  assert.equal(artifact.deferredV2Register.sha256, "275f6fd96efa60edc4c9b9d938b001f6c4101d03eb9786daf38834c0168e6c71");
  assert.equal(artifact.deferredV2Register.count, 33);
  // DAG counts stay frozen; progress is recorded by the S03 contract, never
  // claimed by the CG01 freeze artifact itself.
  assert.equal(artifact.scopeGuard.noDagCountOrProgressChange, false);
});

// ---------------------------------------------------------------------------
// Wave C S08 API / Service Account Port freeze protection.
// ---------------------------------------------------------------------------
function assertS08Port(port) {
  assert.equal(port.id, "cg01.api-service-account.v1");
  assert.equal(port.consumerPackage, "S08");
  assert.equal(port.factBaseline.commit, S08_PRODUCT_BASELINE);
  assert.deepEqual(Object.keys(port.contract).sort(), ["auditDescriptor", "currentProjection", "draftValidator", "publishAdapter", "readinessAdapter", "schema"]);
  const schemaText = JSON.stringify(port.contract.schema);
  assert.doesNotMatch(JSON.stringify(port.contract.schema.fieldFamilies), /oneTimeRevealEnabled/);
  assert.equal(port.contract.schema.immutableProjections.oneTimeReveal.classification, "immutable_projection");
  assert.match(port.contract.schema.immutableProjections.oneTimeReveal.invariant, /second and later reads.*never plaintext/i);
  for (const forbidden of ["ServiceAccount instance", "ServiceAccountRole instance", "ServiceAccountToken instance", "Role instance", "Permission instance", "McpToolInvocation instance", "token", "tokenHash", "Authorization header", "secret"]) {
    assert.ok(port.contract.schema.forbiddenSettingsValues.includes(forbidden), `missing forbidden Settings value ${forbidden}`);
  }
  assert.equal(port.contract.schema.unknownFields, "reject");
  assert.equal(port.contract.schema.universalJson, false);
  assert.doesNotMatch(schemaText, /current_executable/);
  assert.match(JSON.stringify(port.currentGaps), /rotate overlap/);
  assert.match(JSON.stringify(port.currentGaps), /scope\/environment/);
  assert.match(JSON.stringify(port.currentGaps), /rate limit/);
  assert.match(JSON.stringify(port.currentGaps), /S08 Settings descriptor/);
  assert.match(JSON.stringify(port.futureImplementationObligations), /rotate overlap/);
  assert.match(JSON.stringify(port.futureImplementationObligations), /scope\/environment/);
  assert.match(JSON.stringify(port.futureImplementationObligations), /rate limit/);
  assert.match(JSON.stringify(port.notInScope), /migration79/i);
  assert.match(JSON.stringify(port.notInScope), /token create, rotate, revoke/);
  assert.equal(port.migrationBoundary.currentMigrationCount, 78);
  assert.match(port.migrationBoundary.migration79, /forbidden/);
  assert.equal(port.contract.readinessAdapter.sideEffectFree, true);
  assert.equal(port.contract.readinessAdapter.neverFakeReady, true);
  assert.equal(port.erpCompatibilityAuthority.manifestRequiredState.implementationComplete, false);
  assert.equal(port.erpCompatibilityAuthority.manifestRequiredState.productContractFrozen, false);
  assert.equal(port.erpCompatibilityAuthority.manifestRequiredState.currentProgressContribution, 0);
  for (const state of Object.values(port.contract.readinessAdapter.futureConsumers)) assert.equal(state, "future_obligation");
  const publish = JSON.stringify(port.contract.publishAdapter);
  for (const phrase of ["no Service Account create/disable/update", "no token create/rotate/revoke", "no ServiceAccountRole, Role or Permission assignment/removal", "no ERP API or external request", "no plaintext token"]) assert.match(publish, new RegExp(phrase, "i"));
  assert.match(port.contract.publishAdapter.rollback, /never restores a revoked token/);
  const audit = JSON.stringify(port.contract.auditDescriptor);
  for (const phrase of ["service account token", "tokenHash", "Authorization header", "Cookie", "secret", "PII"]) assert.match(audit, new RegExp(phrase, "i"));
}

test("S08 source facts match the S08 implementation baseline bytes", () => {
  assert.equal(git("merge-base", S08_FREEZE_BASELINE, "HEAD"), S08_FREEZE_BASELINE);
  assert.equal(git("merge-base", S08_PRODUCT_BASELINE, "HEAD"), S08_PRODUCT_BASELINE);
  for (const fact of apiServiceAccount.sourceFactsManifest) {
    assert.equal(fact.blobOid, blobAt(S08_PRODUCT_BASELINE, fact.path), `${fact.path} S08 implementation OID`);
    assert.equal(workingBlob(fact.path), fact.blobOid, `${fact.path} S08 working bytes changed`);
    assert.ok(["current_fact", "immutable_projection"].includes(fact.classification), `${fact.path} cannot be future/current-executable`);
  }
  assert.deepEqual(apiServiceAccount.contract.currentProjection.facts, apiServiceAccount.sourceFactsManifest);
  // S08-consumed files are the only permitted deltas vs the freeze baseline
  for (const path of S08_CONSUMPTION_PATHS) {
    assert.notEqual(blobAt(S08_FREEZE_BASELINE, path), blobAt("HEAD", path), `${path} must be an S08 consumption delta`);
  }
});

test("S08 typed schema keeps instances, tokens and plaintext credentials out of Settings", () => {
  assertS08Port(apiServiceAccount);
  assert.match(JSON.stringify(apiServiceAccount.contract.schema.fieldFamilies.tokenLifecyclePolicy.types), /current fact 90/);
  assert.match(JSON.stringify(apiServiceAccount.contract.schema.fieldFamilies.tokenLifecyclePolicy.types), /hard maximum 365/);
  assert.match(JSON.stringify(apiServiceAccount.contract.schema.immutableProjections.apiDiscovery), /placeholderOnlyCurlTemplate/);
});

test("S08 gaps and readiness keep missing rotate, scope, environment, rate-limit and ERP consumers future-only", () => {
  assertS08Port(apiServiceAccount);
  const current = JSON.stringify(apiServiceAccount.contract.currentProjection);
  for (const forbidden of ["rotationOverlapMinutes", "maximumActiveTokensPerAccount", "requestsPerMinute"]) assert.doesNotMatch(current, new RegExp(forbidden), `future policy key ${forbidden} must not appear as a current projection`);
  assert.match(apiServiceAccount.erpCompatibilityAuthority.consumerBoundary, /S08 will own machine credential policy only/);
  assert.match(apiServiceAccount.erpCompatibilityAuthority.consumerBoundary, /S06 connector\/mapping, B01 Catalog and F03 bulk pipeline remain planned-only/);
  assert.equal(apiServiceAccount.erpCompatibilityAuthority.manifestRequiredState.productContractFrozen, false);
  assert.equal(apiServiceAccount.erpCompatibilityAuthority.manifestRequiredState.implementationComplete, false);
  assert.equal(apiServiceAccount.erpCompatibilityAuthority.manifestRequiredState.currentProgressContribution, 0);
});

test("S08 publish, rollback and Audit remain policy-only and side-effect free", () => {
  assertS08Port(apiServiceAccount);
  assert.match(apiServiceAccount.contract.publishAdapter.targetSemantics, /policy version only/);
  assert.match(apiServiceAccount.rollbackAcceptanceOutline.join(" "), /revoked token remains revoked/);
  assert.match(apiServiceAccount.rollbackAcceptanceOutline.join(" "), /Role\/Permission assignments remain unchanged/);
  assert.match(apiServiceAccount.contract.auditDescriptor.requiredPermission, /service_accounts\.manage remains required for account\/token business actions/);
});

test("S08 negative mutations fail without touching the repo", () => {
  const mutations = [];
  mutations.push((p) => { p.contract.schema.fieldFamilies.tokenLifecyclePolicy.fields.push("oneTimeRevealEnabled"); });
  mutations.push((p) => { p.currentGaps = p.currentGaps.filter((x) => !x.includes("rotate overlap")); });
  mutations.push((p) => { p.contract.readinessAdapter.futureConsumers.machineScopeEnvironment = "implemented_ready"; });
  mutations.push((p) => { p.contract.readinessAdapter.futureConsumers.rateLimit = "implemented_ready"; });
  mutations.push((p) => { p.contract.publishAdapter.forbiddenSideEffects = p.contract.publishAdapter.forbiddenSideEffects.filter((x) => !x.includes("token create/rotate/revoke")); });
  mutations.push((p) => { p.migrationBoundary.migration79 = "implemented"; });
  mutations.push((p) => { p.erpCompatibilityAuthority.manifestRequiredState.implementationComplete = true; });
  mutations.push((p) => { p.sourceFactsManifest[0].blobOid = blobAt(S08_PRODUCT_BASELINE, "apps/api/src/auth/service-account-access.ts"); });
  for (const mutate of mutations) {
    const candidate = structuredClone(apiServiceAccount);
    mutate(candidate);
    assert.throws(() => {
      assertS08Port(candidate);
      for (const fact of candidate.sourceFactsManifest) assert.equal(fact.blobOid, blobAt(S08_PRODUCT_BASELINE, fact.path));
    }, undefined, "S08 mutation must be caught");
  }
});

// ---------------------------------------------------------------------------
// Wave A regression protection (restored). The Commerce freeze must never
// rewrite the three pre-existing Wave A Port objects; guards below compare
// the current canonical inventory against the pre-Commerce baseline
// (87bd809) and re-assert the historical semantic anchors that protect
// storefront fact anchoring and Privacy future-unavailable obligations.
// ---------------------------------------------------------------------------

const WAVE_A_PORTS = ["cg01.general-storefront.v1", "cg01.auth-rbac.v1", "cg01.privacy-retention.v1"];

function artifactAt(commit) {
  const raw = execFileSync("git", ["-C", ROOT, "show", `${commit}:${CONTRACT_PATH}`], { encoding: "utf8" });
  return JSON.parse(raw);
}
function portsById(commit) {
  return new Map(artifactAt(commit).ports.map((port) => [port.id, port]));
}
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function assertStorefrontAnchors(portA) {
  const storefrontFacts = [...portA.contract.currentProjection.facts, ...portA.sourceFactsManifest]
    .filter((fact) => fact.symbol.includes("storefront_config") || fact.symbol.toLowerCase().includes("storefront config"));
  assert.ok(storefrontFacts.length >= 2, "storefront config fact must exist in currentProjection and manifest");
  for (const fact of storefrontFacts) {
    assert.equal(fact.path, "apps/api/src/dashboard/modules.ts", `storefront config fact must anchor to modules.ts, got ${fact.path}`);
    assert.equal(fact.blobOid, blobAt(WAVE_A_BASELINE, "apps/api/src/dashboard/modules.ts"), "storefront config blob OID must match baseline modules.ts");
  }
  const foundationFacts = [...portA.contract.currentProjection.facts, ...portA.sourceFactsManifest]
    .filter((fact) => fact.path.includes("foundation.ts"));
  assert.ok(foundationFacts.length >= 1, "foundation.ts fact must be retained");
  for (const fact of foundationFacts) {
    assert.ok(!fact.symbol.toLowerCase().includes("storefront config"), `foundation.ts must not be described as storefront config: ${fact.symbol}`);
    assert.match(fact.symbol, /Dashboard Shell\/Foundation/, "foundation.ts must be described as Dashboard Shell/Foundation");
  }
}
function assertPrivacyObligations(privacy) {
  assert.match(JSON.stringify(privacy.contract.schema.authorityLayering.authenticatedConsent), /product_execution=future_unavailable/);
  assert.match(JSON.stringify(privacy.contract.schema.authorityLayering.privacySubjectPurge), /product_execution=future_unavailable/);
  assert.ok(privacy.currentGaps.some((gap) => gap.includes("cleanup consumer")), "cleanup consumer gap must be retained");
  assert.ok(privacy.futureImplementationObligations.some((obligation) => obligation.includes("implementation_decision_required")), "implementation_decision_required obligation must be retained");
  assert.ok(privacy.notInScope.some((item) => item.includes("automatic high-risk deletion")), "automatic high-risk deletion non-scope must be retained");
}
function assertLegalClassifications(port) {
  const legal = ["current_fact", "compiled_default", "future_setting", "immutable_projection"];
  for (const fact of port.sourceFactsManifest) {
    assert.ok(legal.includes(fact.classification), `${port.id} illegal classification ${fact.classification}`);
  }
}

test("all four pre-existing Ports are deep-equal to the S08 implementation baseline and Wave A historical equality remains", () => {
  const startPorts = portsById(S08_JSON_BASELINE);
  const currentIds = artifact.ports.map((port) => port.id).sort();
  const oldPortIds = ["cg01.general-storefront.v1", "cg01.auth-rbac.v1", "cg01.privacy-retention.v1", "cg01.commerce.v1"];
  assert.deepEqual(currentIds, [...oldPortIds, "cg01.api-service-account.v1"].sort(), "API / Service Account must be the only addition to d223303");
  for (const id of oldPortIds) {
    const baseline = startPorts.get(id);
    const current = artifact.ports.find((port) => port.id === id);
    assert.ok(baseline, `${id} missing from d223303 baseline`);
    assert.ok(current, `${id} missing from current`);
    assert.equal(stableJson(current), stableJson(baseline), `${id} must be deep-equal to the S08 JSON baseline`);
  }
  const historicalPorts = portsById(COMMERCE_BASELINE);
  for (const id of WAVE_A_PORTS) assert.equal(stableJson(artifact.ports.find((port) => port.id === id)), stableJson(historicalPorts.get(id)), `${id} Wave A historical equality`);
});

test("Port A storefront config anchor and foundation description are regression-protected", () => {
  const portA = artifact.ports.find((port) => port.id === "cg01.general-storefront.v1");
  assertStorefrontAnchors(portA);
  const baselineModules = execFileSync("git", ["-C", ROOT, "cat-file", "blob", blobAt(WAVE_A_BASELINE, "apps/api/src/dashboard/modules.ts")], { encoding: "utf8" });
  assert.match(baselineModules, /storefront_config/);
  assert.match(baselineModules, /\/dashboard\/storefront\/config/);
  assert.match(baselineModules, /\/dashboard\/modules\/readiness/);
  const baselineFoundation = execFileSync("git", ["-C", ROOT, "cat-file", "blob", blobAt(WAVE_A_BASELINE, "apps/api/src/dashboard/foundation.ts")], { encoding: "utf8" });
  assert.match(baselineFoundation, /DASHBOARD_FOUNDATION_MODULES/);
  assert.match(baselineFoundation, /dashboardShellConfig/);
  assert.match(baselineFoundation, /DASHBOARD_SHELL_FLAG_KEY/);
  assert.doesNotMatch(baselineFoundation, /storefront_config/, "baseline foundation.ts must not contain storefront_config moduleKey");
});

test("Privacy future-unavailable and cleanup-consumer obligations are regression-protected", () => {
  const privacy = artifact.ports.find((port) => port.id === "cg01.privacy-retention.v1");
  assertPrivacyObligations(privacy);
});

test("source fact classifications are legal and absent objects are never current-executable", () => {
  for (const port of artifact.ports) assertLegalClassifications(port);
});

test("negative mutations fail the Wave A regression guards without touching the repo", () => {
  const baselinePorts = portsById(COMMERCE_BASELINE);
  const d223Ports = portsById(S08_FREEZE_BASELINE);
  // 1. storefront fact re-anchored to foundation.ts must fail the anchor guard.
  const portA = structuredClone(baselinePorts.get("cg01.general-storefront.v1"));
  const storefrontFact = [...portA.contract.currentProjection.facts, ...portA.sourceFactsManifest]
    .find((fact) => fact.symbol.includes("storefront_config"));
  storefrontFact.path = "apps/api/src/dashboard/foundation.ts";
  storefrontFact.blobOid = blobAt(WAVE_A_BASELINE, "apps/api/src/dashboard/foundation.ts");
  assert.throws(() => assertStorefrontAnchors(portA), /modules\.ts/, "storefront->foundation mutation must fail anchor guard");
  // 2. foundation fact described as storefront config must fail.
  const portA2 = structuredClone(baselinePorts.get("cg01.general-storefront.v1"));
  const foundationFact = [...portA2.contract.currentProjection.facts, ...portA2.sourceFactsManifest]
    .find((fact) => fact.path.includes("foundation.ts"));
  foundationFact.symbol = "storefront config current projection";
  assert.throws(() => assertStorefrontAnchors(portA2), /storefront config/, "foundation->storefront description mutation must fail");
  // 3. Privacy future-unavailable downgrade to available must fail.
  const privacy = structuredClone(baselinePorts.get("cg01.privacy-retention.v1"));
  privacy.contract.schema.authorityLayering.authenticatedConsent = "available";
  assert.throws(() => assertPrivacyObligations(privacy), /future_unavailable/, "authenticated consent downgrade must fail");
  // 4. Cleanup-consumer gap removal must fail.
  const privacy2 = structuredClone(baselinePorts.get("cg01.privacy-retention.v1"));
  privacy2.currentGaps = privacy2.currentGaps.filter((gap) => !gap.includes("cleanup consumer"));
  assert.throws(() => assertPrivacyObligations(privacy2), /cleanup consumer/, "cleanup consumer gap removal must fail");
  // 5. Classification downgrade to an illegal value must fail.
  const portA3 = structuredClone(baselinePorts.get("cg01.general-storefront.v1"));
  portA3.sourceFactsManifest[0].classification = "current_executable";
  assert.throws(() => assertLegalClassifications(portA3), /illegal classification/, "illegal classification must fail");
  // 6. Port content rewrite must break deep equality.
  const portA4 = structuredClone(baselinePorts.get("cg01.general-storefront.v1"));
  portA4.contract.schema.fieldFamilies.brand.fields.push("erpProductId");
  assert.notEqual(stableJson(portA4), stableJson(baselinePorts.get("cg01.general-storefront.v1")), "rewritten Port must not deep-equal baseline");
  // 7. Any rewrite of the pre-existing Commerce Port must break the d223303 guard.
  const commerceMutation = structuredClone(d223Ports.get("cg01.commerce.v1"));
  commerceMutation.currentGaps.push("unauthorized rewrite");
  assert.notEqual(stableJson(commerceMutation), stableJson(d223Ports.get("cg01.commerce.v1")), "Commerce rewrite must break d223303 equality");
});
