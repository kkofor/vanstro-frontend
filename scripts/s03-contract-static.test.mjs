import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = "0d9e0f7a0337f0166acbf2e4af8dd9d6c66d5b75";
const TASK_SHA = "13bdb6a3bf760552a0b1a0fc1a16122302c20298dcfd6c44c0eb0fb773ec2a94";
const CONTRACT_PATH = "tasks/contracts/v1-s03-commerce-settings.v1.json";
const CONTRACT_MD = "tasks/contracts/v1-s03-commerce-settings.v1.md";
const ERP_MANIFEST = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/contracts/erp-product-api-v1-compatibility-manifest.json";
const DEPENDENCIES = "/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-remaining-feature-dependencies.json";
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");

function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
}
function blobAt(commit, path) {
  return git("rev-parse", `${commit}:${path}`);
}
function blobSha256(path) {
  const oid = git("rev-parse", `${BASELINE}:${path}`);
  const bytes = execFileSync("git", ["-C", ROOT, "cat-file", "blob", oid], { encoding: null });
  return createHash("sha256").update(bytes).digest("hex");
}
function migrationDirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
}

test("S03 contract JSON is parseable and frozen with exact identity", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(artifact.schemaVersion, "vanstro.s03.commerce-settings.v1");
  assert.equal(artifact.status, "IMPLEMENTED_INTEGRATION_CERTIFIED");
  assert.equal(artifact.package, "S03");
  assert.equal(artifact.descriptorKey, "settings.commerce");
  assert.equal(artifact.settingsSchemaVersion, "settings.commerce.v1");
  assert.deepEqual(artifact.authority.dependsOn, ["S01", "CG01"]);
  assert.deepEqual(artifact.authority.externalBaselineDependencies, ["Commerce-current-facts", "Tax-current-facts", "Shipping-current-facts", "Inventory-current-facts", "Orders-current-facts"]);
  assert.equal(artifact.authority.taskSha256, TASK_SHA);
  assert.equal(artifact.authority.port, "cg01.commerce.v1");
  assert.equal(artifact.baseline.integrationCommit, BASELINE);
  assert.equal(artifact.baseline.migrationCount, 77);
  assert.equal(artifact.baseline.noMigration78, true);
});

test("five exact typed families with typed bounds and no universal JSON", async () => {
  const vs = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8")).valueSchema;
  assert.deepEqual(vs.exactTopLevelFamilies, ["commercePolicy", "taxPolicy", "shippingPolicy", "inventoryPolicy", "orderPolicy"]);
  assert.equal(vs.unknownFields, "reject");
  assert.equal(vs.universalJson, false);
  assert.equal(vs.commercePolicy.minimumOrderAmountCents.minimum, 0);
  assert.equal(vs.inventoryPolicy.reservationTtlMinutes.minimum, 5);
  assert.equal(vs.inventoryPolicy.reservationTtlMinutes.maximum, 1440);
  assert.equal(vs.inventoryPolicy.staleAfterSeconds.maximum, 86400);
  assert.deepEqual(vs.taxPolicy.calculationMode.enum, ["current-tax-rate-table", "disabled"]);
  assert.deepEqual(vs.taxPolicy.roundingMode.enum, ["nearest-cent"]);
  assert.deepEqual(vs.shippingPolicy.serviceZoneMode.enum, ["dealer-location-only", "postal-prefix"]);
  assert.deepEqual(vs.shippingPolicy.fallbackMode.enum, ["reject", "pickup-only"]);
  assert.deepEqual(vs.inventoryPolicy.availabilityMode.enum, ["manual", "erp"]);
  assert.deepEqual(vs.inventoryPolicy.staleBehavior.enum, ["degraded-reject", "manual-fallback"]);
  assert.deepEqual(vs.orderPolicy.allowedLifecycleTransitions.allowedSourceStates, ["paid", "processing", "fulfilled", "cancelled"]);
  assert.match(vs.domainInstanceBoundary, /never stored as Settings values/);
});

// Runtime-authoritative consumer matrix: mirrors consumerMatrix() in
// apps/api/src/dashboard/s03-settings.ts (partial consumers stay degraded
// with coverage_limited; non-partial consumers with an exact generation are
// implemented_ready; null generation degrades everything).
const S03_READY = ["checkout-availability", "checkout-guest-minimum", "tax-totals", "order-transitions"];
const S03_DEGRADED = ["shipping-fee-service-zone", "inventory-ttl-stale"];
function assertS03ConsumerMatrix(matrix) {
  assert.match(matrix.note, /implemented_ready only counts/);
  assert.match(matrix.note, /coverage_limited/);
  assert.equal(matrix.consumers.length, 6, "exactly six consumers");
  assert.equal(matrix.consumers.filter((c) => c.state === "implemented_ready").length, 4, "exactly four implemented_ready");
  assert.equal(matrix.consumers.filter((c) => c.state === "implemented_degraded").length, 2, "exactly two implemented_degraded");
  assert.equal(matrix.consumers.filter((c) => c.state === "future_obligation").length, 0, "no future_obligation in the final matrix");
  for (const consumer of matrix.consumers) {
    assert.ok(consumer.id && consumer.ownerPackage === "S03" && consumer.entry && consumer.generation === "exact" && consumer.closurePackage === "S03", `consumer shape ${consumer.id}`);
  }
  for (const id of S03_READY) {
    const c = matrix.consumers.find((x) => x.id === id);
    assert.equal(c?.state, "implemented_ready", `${id} must be implemented_ready`);
    assert.equal(c?.reasonCode, "exact_generation", `${id} reason`);
  }
  for (const id of S03_DEGRADED) {
    const c = matrix.consumers.find((x) => x.id === id);
    assert.equal(c?.state, "implemented_degraded", `${id} must stay implemented_degraded`);
    assert.equal(c?.reasonCode, "coverage_limited", `${id} reason must stay coverage_limited`);
  }
  assert.ok(matrix.neverImplementedConsumers.length >= 4, "B02/B04/B05/ERP canonical ingest remain future/non-S03");
}

test("consumer state matrix matches the runtime 4 ready + 2 coverage-limited degraded", async () => {
  const matrix = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8")).consumerStateMatrix;
  assertS03ConsumerMatrix(matrix);
});

test("negative consumer-matrix mutations are caught", async () => {
  const read = async () => JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8")).consumerStateMatrix;
  const mutations = [
    (m) => { m.consumers.find((c) => c.id === "checkout-availability").state = "implemented_degraded"; },
    (m) => { m.consumers.find((c) => c.id === "shipping-fee-service-zone").state = "implemented_ready"; },
    (m) => { m.consumers.find((c) => c.id === "inventory-ttl-stale").reasonCode = "exact_generation"; },
    (m) => { m.consumers.find((c) => c.id === "tax-totals").reasonCode = "coverage_limited"; },
    (m) => { m.consumers.push({ id: "phantom", ownerPackage: "S03", entry: "x", state: "implemented_ready", generation: "exact", closurePackage: "S03" }); },
    (m) => { m.consumers.find((c) => c.id === "order-transitions").state = "future_obligation"; }
  ];
  for (const mutate of mutations) {
    const matrix = await read();
    mutate(matrix);
    assert.throws(() => assertS03ConsumerMatrix(matrix), undefined, "mutation must be caught");
  }
});

test("S03 descriptor is implemented with migration78 as sole forward migration and migrations 1-77 immutable", async () => {
  const required = [
    "apps/api/src/dashboard/s03-settings.ts",
    "packages/db/src/s03-settings-controlled.ts",
    "packages/db/prisma/migrations/20260807100000_s03_commerce_settings/migration.sql",
    "src/lib/dashboard/s03-settings.ts",
    "src/components/dashboard/CommerceSettingsPanel.tsx"
  ];
  for (const path of required) {
    assert.equal(existsSync(join(ROOT, path)), true, `runtime path missing: ${path}`);
  }
  const dirs = migrationDirs();
  assert.equal(dirs.length, 79, "exactly 79 migrations");
  assert.equal(dirs.sort().at(-1), "20260808000000_s08_api_service_accounts", "migration79 (S08) is the latest");
  assert.equal(dirs.filter((name) => name.startsWith("20260808")).length, 1, "exactly one S08 migration dir (20260808 prefix)");
  const authorityMigrations = execFileSync("git", ["-C", ROOT, "ls-tree", "-r", "--name-only", BASELINE, "packages/db/prisma/migrations"], { encoding: "utf8" }).trim().split("\n").filter((path) => path.endsWith("migration.sql"));
  assert.equal(authorityMigrations.length, 77, "freeze baseline had 77 migrations");
  for (const path of authorityMigrations) assert.equal(blobAt(BASELINE, path), blobAt("HEAD", path), `${path} must stay immutable`);
  const apiContract = await readFile(join(ROOT, "src/lib/api/api-contract.ts"), "utf8");
  assert.match(apiContract, /settings\.commerce|s03-/i, "S03 descriptor consumed by the shared API contract");
});

test("ERP compatibility authority is referenced once and Manifest stays planning-only", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const auth = artifact.erpCompatibility.authority;
  for (const [key, expected] of [
    ["overlay", "a8ca3113984b7e4f76b675009b64f8e22c705095873e4b315d6613bc7c7d2f89"],
    ["contractMd", "d2dbe952b60d5fa76ef5b50ef742fa859e1ecf8ca87d582370879f8c874ed18d"],
    ["contractJson", "3998fdf8c3a4ea4ba738da885ad2ae7a9840fadfb3eab5da16ac0c7c5717cffa"],
    ["manifest", "3ca3b014c44b331b6a2a7e74adfe458fdc445b327988700ebc16babdbeb88581"]
  ]) {
    assert.equal(auth[key].sha256, expected, key);
  }
  const manifest = JSON.parse(await readFile(ERP_MANIFEST, "utf8"));
  assert.equal(manifest.goNoGo.planningFrozen, true);
  assert.equal(manifest.goNoGo.productContractFrozen, false);
  assert.equal(manifest.goNoGo.implementationComplete, false);
  assert.equal(manifest.currentProgressContribution, 0);
  assert.ok(manifest.stageRecord?.S03, "ERP Manifest records an S03 stage record");
  assert.match(manifest.stageRecord.S03.stage, /4 implemented_ready/, "stage record must use the runtime consumer count");
  assert.match(manifest.stageRecord.S03.stage, /2 implemented_degraded/, "stage record must keep the degraded consumers honest");
  assert.match(manifest.stageRecord.S03.erpProductApi, /NOT STARTED/, "ERP product API stays not started");
  assert.match(artifact.erpCompatibility.boundary, /S06 connector\/mapping/);
  assert.match(artifact.erpCompatibility.hardProhibitions.join(" "), /no real Payment\/ERP\/Canada Post/);
});

test("preview and publish are zero-side-effect and rollback never reverses business actions", async () => {
  const artifact = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  assert.equal(artifact.impactPreview.readOnly, true);
  for (const forbidden of ["reservation/lock/decrement/release", "tax settlement", "Canada Post", "ERP sync/job/connector", "echo PII"]) {
    assert.ok(artifact.impactPreview.forbidden.some((item) => item.includes(forbidden)), `missing preview forbidden ${forbidden}`);
  }
  for (const forbidden of ["no payments/finalize invocation", "no inventory reservation", "no ERP sync/job"]) {
    assert.ok(artifact.publishAdapter.forbiddenSideEffects.some((item) => item.includes(forbidden)), `missing publish forbidden ${forbidden}`);
  }
  assert.equal(artifact.readinessAdapter.sideEffectFree, true);
  assert.equal(artifact.readinessAdapter.neverFakeReady, true);
  assert.match(artifact.auditDescriptor.requiredPermission, /settings.write/);
  assert.match(artifact.publishAdapter.rollback, /never reverses/);
});

test("DAG invariants stay 44/35/12/8/1/36/118/3-of-3 and S03 depends on S01+CG01", async () => {
  const d = JSON.parse(await readFile(DEPENDENCIES, "utf8"));
  assert.deepEqual(d.counts, { capabilities: 44, workPackages: 35, settingsPackages: 12, waves: 8, contractGatesNotCountedAsWorkPackages: 1 });
  assert.equal(d.packages.length + 1, 36);
  assert.equal(d.packages.reduce((sum, entry) => sum + entry.dependsOn.length, 0) + 1, 118);
  assert.equal(Object.keys(d.criticalDependencyAssertions).length, 3);
  const s03 = d.packages.find((entry) => entry.id === "S03");
  assert.deepEqual(s03.dependsOn, ["S01", "CG01"]);
  assert.deepEqual(s03.externalBaselineDependencies, ["Commerce-current-facts", "Tax-current-facts", "Shipping-current-facts", "Inventory-current-facts", "Orders-current-facts"]);
});

test("no secret values or credential patterns in S03 contract files", async () => {
  for (const path of [CONTRACT_PATH, CONTRACT_MD]) {
    const text = await readFile(join(ROOT, path), "utf8");
    const pattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=])/i;
    assert.doesNotMatch(text, pattern, path);
  }
});

test("MD and JSON reference each other and stay semantically consistent", async () => {
  const json = JSON.parse(await readFile(join(ROOT, CONTRACT_PATH), "utf8"));
  const md = await readFile(join(ROOT, CONTRACT_MD), "utf8");
  assert.match(md, /v1-s03-commerce-settings\.v1\.json/);
  assert.match(md, /IMPLEMENTED_INTEGRATION_CERTIFIED/);
  assert.match(md, new RegExp(TASK_SHA));
  assert.match(md, /settings\.commerce/);
  assert.match(md, /settings\.commerce\.v1/);
  for (const family of json.valueSchema.exactTopLevelFamilies) assert.ok(md.includes(family));
  for (const consumer of json.consumerStateMatrix.consumers) assert.ok(md.includes(consumer.id));
  assert.match(md, /20260807100000_s03_commerce_settings/);
  assert.match(md, /8e2ad7440d74403f8cfa0c0d7bbf32f2bf9ae86b/);
});
