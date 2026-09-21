import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../../..");

const read = (relative: string) => readFileSync(resolve(root, relative), "utf8");

test("P6: ERP API overview panel lists v1 endpoints and the generated OpenAPI link", () => {
  const panel = read("src/components/dashboard/ErpApiOverviewPanel.tsx");
  assert.match(panel, /ERP 集成 API v1/);
  assert.match(panel, /data-testid="erp-api-overview-panel"/);
  assert.match(panel, /v1\/openapi/);
  assert.match(panel, /v1\/products\/batch/);
  assert.match(panel, /v1\/products\/unlist/);
  assert.match(panel, /v1\/sync-jobs/);
  assert.match(panel, /v1\/connection-test/);
  assert.match(panel, /v1\/webhooks/);
  assert.match(panel, /唯一.*Contract/);
  assert.match(panel, /Service Account Bearer token/);
  assert.match(panel, /requestHash 使用 AsyncJob 幂等账本/);
  // Base URL comes from the runtime dashboard config, never hardcoded
  assert.match(panel, /props\.apiBaseUrl/);
  assert.doesNotMatch(panel, /localhost|127\.0\.0\.1/);
  assert.match(panel, /dashboard\/erp\/openapi/);
});

test("P6: the overview panel renders inside the ERP tab with the runtime base URL", () => {
  const router = read("src/components/dashboard/DashboardPanelRouter.tsx");
  assert.match(router, /ErpApiOverviewPanel/);
  assert.match(router, /DASHBOARD_API_BASE_URL/);
  assert.match(router, /integrations\/erp/);
  const branch = router.slice(router.indexOf("erpSyncJobs"), router.indexOf("inventorySnapshots"));
  assert.match(branch, /ErpSyncJobsPanel/);
  assert.match(branch, /ErpApiOverviewPanel/);
});

test("P6: no hand-written OpenAPI second source in the dashboard surface", () => {
  const panel = read("src/components/dashboard/ErpApiOverviewPanel.tsx");
  assert.doesNotMatch(panel, /openapi\.json|swagger\.json|readFileSync/);
});

test("P6: ERP operations panel — webhook management, one-time secret, connection test, 429 note", () => {
  const panel = read("src/components/dashboard/ErpOperationsPanel.tsx");
  assert.match(panel, /ERP 运营/);
  assert.match(panel, /data-testid="erp-operations-panel"/);
  assert.match(panel, /一次性密钥/);
  assert.match(panel, /data-testid="one-time-secret"/);
  assert.match(panel, /连接测试/);
  assert.match(panel, /Retry-After/);
  assert.match(panel, /429/);
  const router = read("src/components/dashboard/DashboardPanelRouter.tsx");
  assert.match(router, /props\.erpCanManage.*ErpOperationsPanel/);
  assert.match(router, /ErpOperationsPanel/);
  const content = read("src/components/dashboard/DashboardF0ReadOnlyContent.tsx");
  assert.match(content, /permissionKey === "settings\.write"[\s\S]*decision === "allow"/);
  const shell = read("src/components/dashboard/DashboardF0Shell.tsx");
  // V11-R1 F4/S01 closure lease: the specialized settings gate now also
  // admits the S01 settings route for its three legal pages — overview,
  // lifecycle, history — while settingsCenterV1 still gates the whole
  // expression; unknown/invalid settings paths keep their own parsers.
  assert.match(shell, /\(specializedSettingsRoute \|\| s01Route\) && foundationState\.authorization\?\.settingsCenterV1\.enabled === true/);
  assert.match(shell, /settingsLocation\.kind === "valid" && \(settingsLocation\.page === "overview" \|\| settingsLocation\.page === "lifecycle" \|\| settingsLocation\.page === "history"\)/);
  assert.match(shell, /comingSoonModule && !specializedSettingsRouteEnabled/);
  assert.match(shell, /specializedSettingsRouteEnabled \? foundation\.modules\.find\(\(entry\) => entry\.module === "settings"\)/);
  const panels = read("src/components/dashboard/DashboardPanels.tsx");
  assert.doesNotMatch(panels, /account\.tokens\.length/);
  assert.match(panels, /account\.roles\.length/);
  const backend = read("apps/api/src/dashboard/erp-webhooks.ts");
  assert.match(backend, /dashboard\/erp\/webhooks/);
  assert.match(backend, /dashboard\/erp\/connection-test/);
  assert.match(backend, /dashboard\/erp\/openapi/);
  const machineRoutes = read("apps/api/src/erp-api/routes.ts");
  assert.match(machineRoutes, /writeMachineAudit/);
  const service = read("apps/api/src/erp-api/webhooks.ts");
  assert.match(service, /secretHash/);
  assert.match(service, /x-vanstro-signature/);
  assert.match(service, /nextRetryAt/);
});
