import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");

const read = (relative: string) => readFileSync(resolve(root, relative), "utf8");

const BATCH_PANEL = "src/components/dashboard/BatchImportPanel.tsx";

test("V11-R1 P0-5: product JSON batch-import panel, textarea, requestHash and dry-run/confirm flow are removed", () => {
  // The dedicated batch-import panel no longer exists.
  assert.throws(() => read(BATCH_PANEL), /ENOENT/, "BatchImportPanel.tsx must be deleted");
  const router = read("src/components/dashboard/DashboardPanelRouter.tsx");
  const f0 = read("src/components/dashboard/DashboardF0ReadOnlyContent.tsx");
  const operations = read("src/components/dashboard/ErpOperationsPanel.tsx");
  assert.doesNotMatch(router, /BatchImportPanel/);
  assert.doesNotMatch(f0, /BatchImportPanel/);
  assert.doesNotMatch(operations, /BatchImportPanel/);
  // No dashboard surface still drives the manual JSON batch-import flow.
  const panels = read("src/components/dashboard/DashboardPanels.tsx");
  assert.doesNotMatch(panels, /dashboard\/batch\/import/);
  assert.doesNotMatch(panels, /requestHash/);
  assert.doesNotMatch(f0, /dashboard\/batch\/import/);
  assert.doesNotMatch(router, /dashboard\/batch\/import/);
});

test("V11-R1 P0-5: the batch tab entry and its slug are gone; /dashboard/batch cannot resolve", () => {
  const routes = read("src/lib/dashboard/routes.ts");
  assert.doesNotMatch(routes, /batch: "batch"/);
  assert.doesNotMatch(routes, /"batch"/);
  const page = read("src/app/dashboard/[section]/page.tsx");
  assert.match(page, /if \(!tab \|\| tab === "overview"\) notFound\(\)/);
  const copy = read("src/lib/i18n/dashboard-copy.ts");
  assert.doesNotMatch(copy, /tabs\.batch|batch: "Batch import"|batch: "Import en masse"|batch: "批量导入"/);
});

test("V11-R1 P0-5: the formal ERP sync panel replaces the import surface on the products tab", () => {
  const router = read("src/components/dashboard/DashboardPanelRouter.tsx");
  assert.match(router, /ErpSyncProductsPanel/);
  const productsBranch = router.slice(router.indexOf('activeTab === "products"'), router.indexOf('activeTab === "categories"'));
  assert.match(productsBranch, /ProductsPanel/);
  assert.match(productsBranch, /ErpSyncProductsPanel/);
  assert.doesNotMatch(productsBranch, /BatchImportPanel/);
});

test("V11-R1 P0-5: the ERP sync surface exposes the required fields and reuses only existing endpoints", () => {
  const panel = read("src/components/dashboard/ErpSyncProductsPanel.tsx");
  assert.match(panel, /data-testid="erp-sync-products-panel"/);
  // 8.3.1 ERP connection status
  assert.match(panel, /data-testid="erp-sync-connection"/);
  assert.match(panel, /DASHBOARD_API_ENDPOINTS\.erpConnectionTest/);
  // 8.3.2 last sync time and result
  assert.match(panel, /data-testid="erp-sync-last-run"/);
  assert.match(panel, /DASHBOARD_API_ENDPOINTS\.catalogSyncLatest/);
  // 8.3.3 preview sync
  assert.match(panel, /data-testid="erp-sync-preview"/);
  // 8.3.4 start sync
  assert.match(panel, /data-testid="erp-sync-start"/);
  assert.match(panel, /DASHBOARD_API_ENDPOINTS\.catalogSyncFromErp/);
  // 8.3.5 task progress
  assert.match(panel, /data-testid="erp-sync-progress"/);
  // 8.3.6 add/update/skip/conflict/fail stats
  assert.match(panel, /data-testid="erp-sync-result"/);
  assert.match(panel, /result\.imported/);
  assert.match(panel, /result\.updated/);
  assert.match(panel, /result\.skipped/);
  assert.match(panel, /result\.errors\.length/);
  assert.match(panel, /conflictNote/);
  // 8.3.7 per-item failure reasons
  assert.match(panel, /data-testid="erp-sync-failure-reasons"/);
  assert.match(panel, /result\.errors\.map/);
  // 8.3.8 sync record detail
  assert.match(panel, /latestRun\.startedAt/);
  assert.match(panel, /latestRun\.finishedAt/);
  // 8.3.9 safe retry — reuses the existing retry surface, never a second sync system
  assert.match(panel, /retryLastSync/);
  assert.match(panel, /dashboardHref\("erpSyncJobs"/);
  // 8.3.10 view products after completion
  assert.match(panel, /data-testid="erp-sync-view-products"/);
  // Idempotency key is system-managed: no manual requestHash anywhere.
  assert.doesNotMatch(panel, /requestHash|dryRun|dry-run/);
  // Reuses only the existing dashboard ERP endpoints; no invented sync API.
  const contract = read("src/lib/api/dashboard-contract.ts");
  assert.match(contract, /erpConnectionTest: "\/dashboard\/erp\/connection-test"/);
  assert.match(contract, /catalogSyncFromErp: "\/dashboard\/catalog\/sync-from-erp"/);
  assert.match(contract, /catalogSyncLatest: "\/dashboard\/catalog\/sync-runs\/latest"/);
});

test("V11-R1 P0-5: product CRUD stays on the products tab; the bare sync button is replaced by the formal panel", () => {
  const panels = read("src/components/dashboard/DashboardPanels.tsx");
  assert.match(panels, /export function ProductsPanel/);
  assert.match(panels, /\/dashboard\/products\/\$\{id\}/);
  assert.match(panels, /\/dashboard\/products\/\$\{skuInput\.productId\}\/skus/);
  assert.doesNotMatch(panels, /catalog\/sync-from-erp/);
});

test("V11-R1 P0-5: shared Import/Export Foundation and ERP API/sync surfaces are preserved", () => {
  const router = read("src/components/dashboard/DashboardPanelRouter.tsx");
  assert.match(router, /ErpSyncJobsPanel/);
  assert.match(router, /ErpApiOverviewPanel/);
  assert.match(router, /ErpOperationsPanel/);
  const panel = read("src/components/dashboard/ErpOperationsPanel.tsx");
  assert.match(panel, /dashboard\/erp\/connection-test/);
  assert.match(panel, /dashboard\/erp\/webhooks/);
  const dataJobs = read("src/components/dashboard/DataJobsFoundationPanel.tsx");
  assert.match(dataJobs, /export function DataJobsFoundationPanel/);
});
