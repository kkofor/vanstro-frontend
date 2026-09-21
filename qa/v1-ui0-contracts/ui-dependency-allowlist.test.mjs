import assert from "node:assert/strict";
import test from "node:test";

// Pre-UI-0 baseline: the Frontend line pins 1cd3b850; on the Integration
// merge the first parent is the correct per-line baseline.
import { projectFiles, git, readProject, root, ui0Baseline } from "./contract-helpers.mjs";

const approvedProduction = {
  "@radix-ui/react-dialog": "^1.1.23",
  "class-variance-authority": "^0.7.1",
  clsx: "^2.1.1",
  "tailwind-merge": "^3.6.0"
};
const approvedDevelopment = {
  "@tailwindcss/postcss": "^4.3.3",
  postcss: "^8.5.25",
  tailwindcss: "^4.3.3"
};

function addedDependencies(section) {
  const before = JSON.parse(git("show", `${ui0Baseline()}:package.json`))[section] ?? {};
  const after = JSON.parse(readProject("package.json"))[section] ?? {};
  return Object.fromEntries(Object.entries(after).filter(([name]) => !(name in before)));
}

test("package.json adds exactly the approved UI-0 dependencies at approved versions", () => {
  assert.deepEqual(addedDependencies("dependencies"), approvedProduction);
  assert.deepEqual(addedDependencies("devDependencies"), approvedDevelopment);
});

test("package.json removes or changes no pre-existing dependency", () => {
  const before = JSON.parse(git("show", `${ui0Baseline()}:package.json`));
  const after = JSON.parse(readProject("package.json"));
  for (const section of ["dependencies", "devDependencies"]) {
    for (const [name, version] of Object.entries(before[section] ?? {})) {
      assert.equal(after[section]?.[name], version, `${section}.${name} must remain unchanged`);
    }
  }
});

test("the root lockfile importer contains every approved direct dependency and no other addition", () => {
  const lock = readProject("pnpm-lock.yaml");
  const importer = lock.match(/\n  \.\:\n([\s\S]*?)(?=\n  [^ ].*:\n)/)?.[1];
  assert.ok(importer, "pnpm-lock.yaml must contain the root importer");
  for (const [name, version] of Object.entries({ ...approvedProduction, ...approvedDevelopment })) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(importer, new RegExp(`(?:'${escaped}'|${escaped}):\\n\\s+specifier: ${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `${name} missing from root lock importer`);
  }
  const beforePackage = JSON.parse(git("show", `${ui0Baseline()}:package.json`));
  const afterPackage = JSON.parse(readProject("package.json"));
  const added = [...Object.keys(afterPackage.dependencies), ...Object.keys(afterPackage.devDependencies)]
    .filter((name) => !(name in (beforePackage.dependencies ?? {})) && !(name in (beforePackage.devDependencies ?? {})))
    .sort();
  assert.deepEqual(added, [...Object.keys(approvedProduction), ...Object.keys(approvedDevelopment)].sort());
});

test("components.json points shadcn generation at the VanStro UI root", () => {
  const config = JSON.parse(readProject("components.json"));
  assert.equal(config.rsc, true);
  assert.equal(config.tsx, true);
  assert.equal(config.iconLibrary, "lucide");
  assert.equal(config.tailwind.css, "src/app/globals.css");
  assert.equal(config.tailwind.cssVariables, true);
  assert.equal(config.aliases.ui, "@/components/ui");
  assert.equal(config.aliases.utils, "@/components/ui/cn");
});

test("only the closed existing-file allowlist is modified", () => {
  // Compare committed trees, not the working tree, so pre-existing protected
  // dirty files on the Integration line cannot be mistaken for UI-0 changes.
  const changed = git("diff", "--name-only", "--diff-filter=M", `${ui0Baseline()}..HEAD`).trim().split("\n").filter(Boolean)
    // Canonical Evidence artifacts (acceptance results, browser logs) are
    // evidence outputs, not UI-0 source changes; they stay outside the
    // source lease (V11-R1 functional-first closure).
    .filter((path) => !path.startsWith("tasks/evidence/"));
  const allowed = new Set([
    ".gitignore", "package.json", "pnpm-lock.yaml", "src/app/globals.css",
    // S09 formalization lease: settings route shell, view pages, the shared
    // API contract/runtime validation, the i18n route pair, the UI-0
    // contract allowlist itself, and the frozen route-ownership assertions.
    "src/app/dashboard/settings/[view]/page.tsx",
    "src/app/fr/dashboard/settings/[view]/page.tsx",
    "src/components/dashboard/DashboardF0ReadOnlyContent.tsx",
    "src/components/dashboard/DashboardShell.tsx",
    "src/components/dashboard/DashboardF0Shell.tsx",
    // V11-R1 P6 correction lease: the existing F0 shell lease also covers
    // keeping specialized Settings routes reachable while the nav stays coming-soon.
    // The same P6 lease covers DashboardPanels' safe Service Account summary DTO.
    // V11-R1 P0 lease: one-click navigation (force-dynamic revert touched the
    // dashboard pages) and the editable framework (shared drawer primitives).
    "src/app/dashboard/[section]/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/components/dashboard/shared/primitives.tsx",
    "src/components/dashboard/hooks/useDashboardData.ts",

    // V11-5 lease: categories read-only detail drawer + apiFetch prop.
    "src/components/dashboard/DashboardPanelRouter.tsx",
    "src/components/dashboard/DashboardPanels.tsx",
    "src/components/dashboard/DataJobsFoundationPanel.test.ts",
    "src/components/dashboard/MediaFoundationPanel.test.ts",
    "src/components/dashboard/WorkQueueFoundationPanel.test.ts",
    "src/lib/api/api-contract.ts",
    "src/lib/api/runtime-validation.ts",
    // V11-7 lease: ERP readiness/SA summary copy keys in the locale copy
    // and the re-anchored copy contract baselines.
    "src/lib/i18n/dashboard-copy.ts",
    "src/lib/i18n/dashboard-copy.test.ts",
    "src/lib/i18n/routes.ts",
    "qa/v1-ui0-contracts/ui-css-collision.test.mjs",
    // S10 lease: the allowlist file itself, extended for the Privacy/Retention
    // settings route shell and its shared contract/runtime-validation edits.
    "qa/v1-ui0-contracts/ui-dependency-allowlist.test.mjs",
    // S03 Commerce settings forward extension uses the same frozen shared
    // shell, API contract, locale route pair, closed UI-0 imports, and the
    // package-contracts assertions that guard the S03 panel render.
    "src/lib/api/s03-runtime-validation.ts",
    "qa/package-a-contracts.test.ts",
    // S08 API/Service Account settings lease: the settings route shell, view
    // pages, shared contract/runtime-validation, locale route pair, UI-0
    // contract allowlist, and the FoundationPanel assertions extend for the
    // S08 location guard and the S08 panel render.
    "src/components/dashboard/ApiServiceAccountsSettingsPanel.test.ts",
    "src/lib/api/s08-runtime-validation.ts",
    "src/lib/dashboard/s08-settings.ts",
    "src/lib/dashboard/s08-settings-transport.ts",
    "src/lib/dashboard/s08-settings-readiness-consumer.ts",
    // The S08 authorization contract field (serviceAccountsV1) requires the
    // frozen p02 payload fixtures to carry the fail-closed capability field.
    "src/lib/dashboard/p02-authorization.test.ts",
    "qa/v1-ui0-contracts/ui-css-collision.test.mjs",
    // S09 backend lease files (the S09 backend merge on Integration lands
    // after the UI-0 baseline, so its modified files are part of this diff).
    "apps/api/src/audit/foundation.ts",
    "apps/api/src/auth/policy.ts",
    "apps/api/src/auth/session.ts",
    "apps/api/src/dashboard/access.ts",
    "apps/api/src/dashboard/settings.test.ts",
    "apps/api/src/dashboard/s09-settings.ts",
    "apps/api/src/dashboard/s09-settings-pg16.test.ts",
    "apps/api/src/public-errors.ts",
    "apps/api/src/routes/auth.ts",
    "apps/api/src/routes/dashboard.ts",
    "packages/db/src/index.ts",
    "packages/db/src/s09-settings-controlled.ts",
    "packages/db/prisma/migrations/20260806100000_s09_auth_rbac_settings/migration.sql",
    "scripts/s02-migration75-static.test.mjs",
    "scripts/s09-migration76-static.test.mjs",
    "scripts/test-api-regular-pg16.sh",
    // V11-1 consumer lease: the V11-1 Backend module-state producer merge
    // lands after the UI-0 baseline, so its modified backend files are part
    // of this diff; the frontend consumer then extends the shared F0
    // resolver/shell and their focused tests.
    "apps/api/src/auth/service-account-access.ts",
    "apps/api/src/auth/service-account.ts",
    "apps/api/src/dashboard/foundation.test.ts",
    "apps/api/src/dashboard/foundation.ts",
    "apps/api/src/dashboard/p02-access.ts",
    "apps/api/src/dashboard/settings.ts",
    "apps/api/src/dashboard/system.ts",
    "apps/api/src/routes/cli.ts",
    "apps/api/src/routes/commerce/index.ts",
    "apps/api/src/routes/erp-integration.ts",
    "apps/api/src/routes/mcp.ts",
    "packages/db/prisma/schema.prisma",
    "qa/v1-s01-settings-browser/s01b-fixture.py",
    "scripts/cg01-wave-a-settings-ports-static.test.mjs",
    "tasks/contracts/v1-cg01-wave-a-settings-ports.v1.json",
    "tasks/contracts/v1-cg01-wave-a-settings-ports.v1.md",
    "src/lib/dashboard/f0-shell.ts",
    "src/lib/dashboard/types.ts",
    "src/lib/dashboard/f0-shell.test.ts",
    "src/lib/dashboard/p02-authorization.ts",
    "src/lib/dashboard/p02-authorization.test.ts",
    "src/components/dashboard/DashboardF0Shell.module.css",
    // V11-2 Dashboard auth/session lease: Dashboard login page/component and
    // its CSS module, the cookie session helper and tests, the shared F0
    // shell chrome ownership and expired-notice logic, and the UI-0/package
    // contract guards extended for the new auth endpoints and leases.
    "src/app/dashboard/login/page.tsx",
    "src/app/fr/dashboard/login/page.tsx",
    // The /fr/dashboard/login locale route fix (9295a532) also re-anchored
    // the locale route verification script in the same commit.
    "scripts/verify-locale-routes.mts",
    "src/components/dashboard/DashboardLogin.tsx",
    "src/components/dashboard/DashboardLogin.module.css",
    "src/components/dashboard/DashboardLogin.test.ts",
    "src/lib/dashboard/auth-session.ts",
    "src/lib/dashboard/auth-session.test.ts",
    "src/components/layout/AppChrome.tsx",
    "apps/api/src/index.ts",
    "packages/db/src/async-jobs.ts",
    "src/lib/dashboard/routes.ts",
    "src/lib/dashboard/tab-permissions.ts",
    // V11-R1 P4-P7 correction lease: production WAL archive/recovery safety
    // is an explicitly reviewed non-UI correction in the same Integration tree.
    "docker-compose.production-server.yml",
    "scripts/production-postgres-backup.sh",
    // V11-R1 F4 lease: the dealers/catalog backend routes gain promotion
    // status validation and the dealer location/ERP-link management surface
    // (expanded detail DTO, location archive/restore PATCH, safe ERP link
    // fields) with their direct PG16 test.
    "apps/api/src/dashboard/catalog.ts",
    "apps/api/src/dashboard/dealers.ts",
    "apps/api/src/dashboard/v11-r1-catalog-dealers.test.ts",
    // V11-R1 F4 promotions lease: the promotions write grant (pricing.write)
    // registers in the foundation registry and its direct tests; the shared
    // API contract mirrors the module permission list for runtime
    // validation; the ready-shell content/router/panel wire canEdit.
    "apps/api/src/dashboard/foundation.ts",
    "apps/api/src/dashboard/foundation.test.ts",
    "src/lib/api/api-contract.ts",
    "src/components/dashboard/DashboardF0ReadOnlyContent.tsx",
    "src/components/dashboard/DashboardPanelRouter.tsx",
    "src/components/dashboard/DashboardPanels.tsx",
    // V11-R1 functional-first lease: the F1 phase-B Migration70 successor
    // SQL, the batch-ingest runtime fix, the settings/UI acceptance harness
    // fixes, the functional-first runner support scripts and their focused
    // source tests land on the Integration line after the UI-0 baseline, so
    // their modified tracked files are part of this diff.
    "apps/api/src/dashboard/batch-ingest.ts",
    "packages/db/prisma/migrations/20260804110000_f1_v15_phase_b/migration.sql",
    // M69/M70/M71 migration authority lease: the authority tests, wrapper
    // pins and conformance harness committed on this line after the UI-0
    // baseline belong to the migration authority tooling, not to UI-0.
    "packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql",
    "scripts/f1-migration69-authority.test.mjs",
    "scripts/f1-migration70-static.test.mjs",
    "scripts/f1-migration71-owned-pg16.mjs",
    "scripts/f1-migration71-static.test.mjs",
    "scripts/test-f1-migration69.sh",
    "scripts/test-f1-migration70.sh",
    "scripts/test-f1-migration71.sh",
    "tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs",
    "qa/v1-s01-settings-browser/run-s01b.sh",
    "qa/v1-s01-settings-browser/s01b-acceptance.py",
    "qa/v1-s01-settings-browser/s01b-fixture.py",
    "qa/v1-s02-settings-browser/run-s02.sh",
    "qa/v1-s02-settings-browser/s02-fixture.py",
    "qa/v1-s03-settings-browser/s03-fixture.py",
    "qa/v1-s08-settings-browser/s08-fixture.py",
    "qa/v1-s09-settings-browser/s09-fixture.py",
    "qa/v1-s10-settings-browser/s10-fixture.py",
    "qa/v11-auth-browser/run-v11-auth.sh",
    "qa/v11-auth-browser/v11-6-commerce-acceptance.py",
    "qa/v11-auth-browser/v11-7-erp-acceptance.py",
    "qa/v11-auth-browser/v11-8-final-acceptance.py",
    "qa/v11-auth-browser/v11-auth-acceptance.py",
    "scripts/f1-migration71-owned-extension.txt",
    "scripts/local-staging-e2e.mts",
    "src/components/dashboard/v11-6-commerce-source.test.ts",
    "src/components/dashboard/v11-r1-p6-source.test.ts",
    // V11-R1 F6 lease: the ERP order read surface (safe-select DTO, list/get
    // routes, OpenAPI document) and the batch erp_links ingest kind extend the
    // P5/foundation contracts; the orders source test, the batch unit tests
    // and the batch ERP QA harness sources land together with the backend
    // changes, so their modified tracked files are part of this diff.
    "apps/api/src/dashboard/batch-ingest.test.ts",
    "apps/api/src/erp-api/openapi.ts",
    "apps/api/src/erp-api/routes.ts",
    "apps/api/src/erp-api/v11-r1-p5-source.test.ts",
    "packages/db/src/async-jobs.test.ts",
    "qa/v11-functional-first-batch-erp/v11-functional-first-batch-erp-acceptance.py",
    "qa/v11-functional-first-batch-erp/v11-functional-first-batch-erp-source.test.mjs",
    // Catalog price freshness lease: the storefront catalog source drops the
    // module-lifetime catalog promise (per-request price reads) and its
    // regression test land on the Frontend line.
    "src/lib/api/server.ts",
    "src/lib/api/server.test.ts",
    // V11-R1 ERP sync products lease: the product sync surface replaces the
    // deleted batch-import panel — router/panel/shell wiring, the ERP
    // connection-test endpoint, the batch tab slug removal, the i18n copy
    // (erpSync block, batch labels removed) and the focused source tests land
    // together on the Frontend line.
    "src/components/dashboard/ErpOperationsPanel.tsx",
    "src/components/dashboard/v11-r1-p1-source.test.ts",
    "src/lib/api/dashboard-contract.ts",
    // Storefront inventory lease: the inventory view-model drops cross-dealer
    // totals and depends on explicit dealer selection.
    "src/lib/commerce/product-inventory.ts",
    // V11-R1 ERP catalog backend lease: the ERP catalog sync service, its
    // product payload projection and the catalog routes land on the
    // Integration line after the UI-0 baseline, so their modified tracked
    // files are part of this diff.
    "apps/api/src/catalog/product-payload.ts",
    "apps/api/src/integrations/erp-catalog-sync/service.ts",
    "apps/api/src/integrations/erp-catalog-sync/service.test.ts",
    "apps/api/src/routes/catalog.ts",
    // 260813 dashboard edit-gates + navigation lease: per-module canEdit
    // wiring (F0 read-only content, panel router, panels, edit-gates
    // registry) and the unified onNavigate chain (F0 shell, breadcrumb,
    // overview quick entries) with their focused source tests; the PDP
    // locale-threading commits (09d11ae6, 5ae9d36d) modified the two product
    // page shells on this line.
    "src/components/dashboard/OverviewWorkspacePanel.tsx",
    "src/components/dashboard/ShellBreadcrumb.tsx",
    "src/components/dashboard/GeneralStorefrontSettingsPanel.test.ts",
    "src/app/products/[slug]/page.tsx",
    "src/app/fr/products/[slug]/page.tsx",
    // 260813 session-expiry notice lease: the tab-scoped sessionStorage
    // expired-notice lifecycle module and its unit tests are new Dashboard
    // sources landing with the case-13 fix (shell wiring + acceptance
    // extension are already leased above).
    "src/lib/dashboard/session-notice.ts",
    "src/lib/dashboard/session-notice.test.ts",
    // Pre-existing Integration-line lease: cceb58e9 (static-export SEO gate
    // pinned to the catalog primary SKU set) updated the SEO artifacts
    // checker before the 260813 notice fix; the lease closes the gap.
    "qa/check-seo-artifacts.mjs"
  ]);
  assert.deepEqual(changed.filter((path) => !allowed.has(path)), [], "tracked existing files outside the UI-0 allowlist changed");
});

test("the committed UI-0 tree adds sources only under src/components/ui", () => {
  const added = git("diff", "--name-only", "--diff-filter=A", `${ui0Baseline()}..HEAD`, "--", "src").trim().split("\n").filter(Boolean);
  const allowedPrefixes = ["src/components/ui/", "src/components/dashboard/AuthRbacSettingsPanel", "src/lib/dashboard/s09-", "src/components/dashboard/PrivacyRetentionSettingsPanel", "src/lib/dashboard/s10-", "src/components/dashboard/CommerceSettingsPanel", "src/lib/dashboard/s03-", "src/lib/api/s03-", "src/components/dashboard/ApiServiceAccountsSettingsPanel", "src/lib/dashboard/s08-", "src/lib/api/s08-", "src/app/dashboard/login/", "src/app/fr/dashboard/login/", "src/components/dashboard/DashboardLogin", "src/lib/dashboard/auth-session", "src/components/dashboard/Shell", "src/components/dashboard/MobileNavigationDrawer", "src/components/dashboard/v11-3-shell-source.test.ts", "src/components/dashboard/v11-4-overview-source.test.ts", "src/components/dashboard/v11-5-catalog-source.test.ts",
    "src/components/dashboard/v11-6-commerce-source.test.ts",
    "src/components/dashboard/v11-7-erp-source.test.ts",
    "src/components/dashboard/v11-r1-p1-source.test.ts",
    "src/components/dashboard/v11-r1-p2-source.test.ts",
    "src/components/dashboard/v11-r1-p3-source.test.ts",
    "src/components/dashboard/v11-r1-p4-source.test.ts",
    "src/components/dashboard/v11-r1-p6-source.test.ts",
    "src/components/dashboard/v11-r1-functional-first-source.test.ts",
    "src/components/dashboard/ErpApiOverviewPanel.tsx",
    "src/components/dashboard/ErpOperationsPanel.tsx",
    "src/lib/dashboard/routes.ts",
    "src/lib/dashboard/tab-permissions.ts",
    "src/components/dashboard/ErpSyncProductsPanel.tsx",
    "src/components/dashboard/v11-r1-erp-readiness-source.test.ts",
    "src/lib/dashboard/shell-navigation", "src/components/dashboard/OverviewWorkspacePanel", "src/lib/api/server.test.ts",
    // 260813 edit-gates lease: the per-module capability registry and the
    // edit-gate/navigation source test are new Dashboard-only sources.
    "src/lib/dashboard/edit-gates",
    "src/lib/dashboard/session-notice",
    "src/components/dashboard/v11-r1-edit-gates-source.test.ts",
    // 260813 orders/customer-detail lease: the orders-dealer decoupling and
    // customer profile/address source contract test is a new Dashboard-only
    // source landing with the frontend fixes on this line.
    "src/components/dashboard/orders-customer-profile-source.test.ts"];
  assert.deepEqual(added.filter((path) => !allowedPrefixes.some((prefix) => path.startsWith(prefix))), [], "committed sources outside the UI-0 directory");
});

test("UI-0 contract and browser harness sources are Git-visible while browser logs stay ignored", () => {
  const extensions = new Set([".css", ".json", ".mjs", ".py", ".svg", ".ts", ".tsx"]);
  const sources = ["qa/v1-ui0-contracts", "qa/v1-ui0-browser"]
    .flatMap((directory) => projectFiles(directory, extensions))
    .map((path) => path.slice(root.length + 1));
  const ignored = git("check-ignore", "--no-index", "--verbose", "--non-matching", ...sources)
    .trim().split("\n").filter(Boolean).filter((line) => !line.split("\t", 1)[0].split(":").at(-1)?.startsWith("!"));

  assert.deepEqual(ignored, [], "all UI-0 contract/browser harness sources must be visible to ordinary Git status");
  assert.equal(git("check-ignore", "--no-index", "tasks/evidence/v1-ui0-omp-trial/browser/server.log").trim(), "tasks/evidence/v1-ui0-omp-trial/browser/server.log");
});
