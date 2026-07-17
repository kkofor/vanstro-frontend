import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const CURRENT_MAPPING = resolve(
  process.env.MB01_CURRENT_MAPPING ??
    "docs/goal-loop/frontend-full-audit/evidence/G13-live-audit-2026-07-16/asset-source-local-mapping.json"
);
const SOURCE_PROVENANCE = resolve(
  process.env.MB01_SOURCE_PROVENANCE ??
    "docs/goal-loop/frontend-full-audit/evidence/G3-implementation-2026-07-16/asset-provenance.json"
);
const DERIVED_PROVENANCE = resolve(
  process.env.MB01_DERIVED_PROVENANCE ??
    "docs/goal-loop/frontend-full-audit/evidence/G7-rework-2026-07-16/asset-provenance-derived.json"
);
const OUTPUT = resolve(
  process.env.MB01_CONTROLLED_MAPPING_OUTPUT ??
    "docs/goal-loop/frontend-full-audit/evidence/G13-live-audit-2026-07-16/controlled-asset-mapping.json"
);

const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const current = JSON.parse(await readFile(CURRENT_MAPPING, "utf8"));
const source = JSON.parse(await readFile(SOURCE_PROVENANCE, "utf8"));
const derived = JSON.parse(await readFile(DERIVED_PROVENANCE, "utf8"));

const controlledBySourceHash = new Map();
for (const asset of source.sources ?? []) {
  controlledBySourceHash.set(asset.sha256, {
    localAssetPath: asset.localAssetPath,
    localSha256: asset.sha256,
    transformation: null
  });
}
for (const asset of derived.sources ?? []) {
  controlledBySourceHash.set(asset.sourceSha256 ?? asset.sha256, {
    localAssetPath: asset.localAssetPath,
    localSha256: asset.sha256,
    transformation: asset.transformation ?? null
  });
}

const assets = [];
for (const asset of current.assets) {
  if (!asset.ok || !asset.sha256) {
    assets.push({
      ...asset,
      sourceSha256: asset.sha256,
      localSha256: null,
      plannedLocalPath: null,
      localizationStatus: "Blocked"
    });
    continue;
  }

  const controlled = controlledBySourceHash.get(asset.sha256);
  if (!controlled) {
    assets.push({
      ...asset,
      sourceSha256: asset.sha256,
      localSha256: null,
      plannedLocalPath: null,
      localizationStatus: "Missing Local Asset"
    });
    continue;
  }

  const physicalPath = resolve(`public${controlled.localAssetPath}`);
  await stat(physicalPath);
  const actualLocalSha256 = hash(await readFile(physicalPath));
  if (actualLocalSha256 !== controlled.localSha256) {
    throw new Error(`Controlled asset hash mismatch: ${controlled.localAssetPath}`);
  }

  assets.push({
    ...asset,
    sourceSha256: asset.sha256,
    localSha256: controlled.localSha256,
    plannedLocalPath: controlled.localAssetPath,
    transformation: controlled.transformation,
    localizationStatus: "Localized"
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  sourceAssets: assets.length,
  localized: assets.filter((asset) => asset.localizationStatus === "Localized").length,
  blocked: assets.filter((asset) => asset.localizationStatus === "Blocked").length,
  missing: assets.filter((asset) => asset.localizationStatus === "Missing Local Asset").length,
  uniqueSourceHashes: new Set(assets.map((asset) => asset.sourceSha256).filter(Boolean)).size,
  uniqueControlledPaths: new Set(assets.map((asset) => asset.plannedLocalPath).filter(Boolean)).size
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify({ summary, assets }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
if (summary.missing > 0) process.exitCode = 1;
