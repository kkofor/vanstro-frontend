import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("ERP sync jobs panel gains a read-only detail drawer backed by GET /:id", async () => {
  const source = await read("DashboardPanels.tsx");
  const erp = source.slice(source.indexOf("export function ErpSyncJobsPanel"), source.indexOf("export function InventorySnapshotsPanel"));
  assert.match(erp, /apiFetch\(`\/dashboard\/erp-sync-jobs\/\$\{id\}`\)/);
  assert.match(erp, /查看详情/);
  assert.match(erp, /<DetailDrawer open=\{Boolean\(drawerId && detail\)\}/);
  assert.match(erp, /erp-attempts-list/);
  // legacy non-read-only retry stays exactly as it was
  assert.match(erp, /\/dashboard\/erp-sync-jobs\/\$\{job\.id\}\/retry/);
});

test("ERP readiness card derives from the latest sync job without new endpoints", async () => {
  const source = await read("DashboardPanels.tsx");
  const erp = source.slice(source.indexOf("export function ErpSyncJobsPanel"), source.indexOf("export function InventorySnapshotsPanel"));
  assert.match(erp, /erp-readiness-card/);
  assert.match(erp, /props\.copy\.erp\.ready/);
  assert.match(erp, /props\.copy\.erp\.attention/);
  assert.match(erp, /props\.copy\.erp\.neverSynced/);
  // no readiness API call introduced
  assert.doesNotMatch(erp, /\/dashboard\/readiness/);
});

test("service account summary is read-only and fetched once via the real list API", async () => {
  const source = await read("DashboardPanels.tsx");
  const erp = source.slice(source.indexOf("export function ErpSyncJobsPanel"), source.indexOf("export function InventorySnapshotsPanel"));
  assert.match(erp, /\/dashboard\/mcp\/service-accounts/);
  assert.match(erp, /erp-accounts-card/);
  assert.match(erp, /useEffect/);
  // no token material or write affordance
  assert.doesNotMatch(erp, /service-accounts\/\$\{/);
});

test("ERP panel never issues external ERP calls (local dashboard API only)", async () => {
  const source = await read("DashboardPanels.tsx");
  const erp = source.slice(source.indexOf("export function ErpSyncJobsPanel"), source.indexOf("export function InventorySnapshotsPanel"));
  for (const needle of ["fetch(", "XMLHttpRequest", "WebSocket"]) {
    assert.doesNotMatch(erp, new RegExp(needle.replace("(", "\\(")));
  }
  // all data paths are dashboard routes
  assert.match(erp, /\/dashboard\/erp-sync-jobs/);
  assert.match(erp, /\/dashboard\/mcp\/service-accounts/);
});

test("F0 shell keeps the ERP retry button closed without a write capability", async () => {
  const router = await read("DashboardPanelRouter.tsx");
  // ERP sync jobs have no write-capability mapping in the edit-gates registry:
  // the panel stays read-only (fail-closed default) and the retry button is
  // only reachable through the authorized onAction gate.
  assert.match(router, /ErpSyncJobsPanel apiFetch=\{props\.apiFetch\} readOnly=\{props\.readOnly \?\? true\}/);
  assert.match(router, /props\.readOnly \?\? true/);
});
