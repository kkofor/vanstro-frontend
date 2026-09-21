import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { basename, relative } from "node:path";
import { git, legacyUiEntries, readProject, root, stripComments, ui0Baseline, uiSourceFiles } from "./contract-helpers.mjs";

const compatibilityPath = "src/components/ui/ui-compat.css";

function selectors(source) {
  const clean = stripComments(source);
  return [...clean.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map((match) => match[1].trim())
    .filter((header) => !header.startsWith("@") && !/^(?:from|to|\d+(?:\.\d+)?%)$/i.test(header.replace(/\s*,\s*/g, "")))
    .flatMap((header) => header.split(",").map((selector) => selector.trim()))
    .filter((selector) => !/^(?:from|to|\d+(?:\.\d+)?%)$/i.test(selector));
}

test("compatibility CSS is unlayered, namespaced, and never escalates specificity", () => {
  const css = readProject(compatibilityPath);
  assert.doesNotMatch(css, /!important|@layer\b/, "compatibility rules must remain unlayered without !important");
  const invalid = selectors(css).filter((selector) =>
    !/^\.vs-ui-[a-z0-9-]+(?:(?::{1,2}[a-z-]+(?:\([^)]*\))?)|(?:\[[^\]]+\]))*$/i.test(selector)
  );
  assert.deepEqual(invalid, [], "each selector must be exactly one .vs-ui-* class with optional state pseudo/attribute");
});

test("compatibility CSS cannot collide with legacy global elements, ids, or classes", () => {
  const cssSelectors = selectors(readProject(compatibilityPath));
  const collisions = cssSelectors.filter((selector) =>
    /(^|[\s>+~])(?:html|body|button|input|textarea|select|a|table|\*)\b/i.test(selector) ||
    selector.includes("#") ||
    (selector.match(/\./g)?.length ?? 0) !== 1
  );
  assert.deepEqual(collisions, []);
});

test("variant and invalid visuals have a single selector authority", () => {
  const css = readProject(compatibilityPath);
  assert.doesNotMatch(css, /\.vs-ui-(?:button|badge)\[data-variant=/, "Button and Badge visuals must use only CVA-emitted variant classes");
  assert.doesNotMatch(css, /\.vs-ui-(?:input|textarea|select|checkbox)\[data-invalid=/, "form-control invalid visuals must use only aria-invalid");
  for (const control of ["input", "textarea", "select", "checkbox"]) {
    assert.match(css, new RegExp(`\\.vs-ui-${control}\\[aria-invalid="true"\\]`), `${control} must retain aria-invalid visual styling`);
  }
});

test("component utilities leave font and variant/state colors to ui-compat.css", () => {
  const forbidden = /(?:^|[\s"'`])(?:text-(?:primary|foreground|muted|error|success|warning|accent|white|black)|bg-(?:primary|surface|error|accent|white|black)|border-(?:primary|error|accent)|font-(?:sans|normal|medium|semibold|bold))(?:[\s"'`:]|$)/;
  const violations = uiSourceFiles()
    .filter((file) => !basename(file).endsWith("-variants.ts"))
    .filter((file) => forbidden.test(readFileSync(file, "utf8")))
    .map((file) => relative(root, file));
  assert.deepEqual(violations, [], "Tailwind utilities own layout/spacing/size, not compatibility color/font state");
});

test("existing pages/components remain byte-identical to the pre-UI-0 baseline except the closed existing-file allowlist", () => {
  const ui0Base = ui0Baseline();
  const changed = git("diff", "--name-only", "--diff-filter=M", ui0Base, "--", "src/app", "src/components").trim().split("\n").filter(Boolean);
  const allowedTrackedChanges = new Set([
    "src/app/globals.css",
    // V11-2 lease: the AppChrome Dashboard-only hunk (dashboardChromeOwned)
    // lets /dashboard/login, /fr/dashboard/login and every anonymous
    // Dashboard route own their chrome; non-dashboard JSX is unchanged.
    "src/components/layout/AppChrome.tsx",
    "apps/api/src/index.ts",
    "packages/db/src/async-jobs.ts",
    "src/lib/dashboard/routes.ts",
    "src/lib/dashboard/tab-permissions.ts",
    // S09 formalization lease: the Auth/RBAC settings view mounts through the
    // settings route shell and the two settings view pages, and the frozen
    // route-ownership assertions in the foundation panel tests extend with
    // the S09 location guard.
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

    // V11-1 consumer lease: the F0 shell CSS gains the coming-soon nav entry
    // (non-Link, non-focusable span with the 即将推出 badge).
    "src/components/dashboard/DashboardF0Shell.module.css",
    "src/components/dashboard/DataJobsFoundationPanel.test.ts",
    "src/components/dashboard/MediaFoundationPanel.test.ts",
    "src/components/dashboard/WorkQueueFoundationPanel.test.ts",
    // V11-5 lease: the read-only categories detail drawer (查看详情 ->
    // GET /dashboard/categories/:id) and its apiFetch prop flow through the
    // shared panel router; legacy (readOnly=false) details column is
    // unchanged.
    "src/components/dashboard/DashboardPanelRouter.tsx",
    "src/components/dashboard/DashboardPanels.tsx",
    // V11-R1 F4 lease: the dealers/catalog backend routes gain promotion
    // status validation and the dealer location/ERP-link management surface
    // (expanded detail DTO, location archive/restore PATCH, safe ERP link
    // fields) with their direct PG16 test.
    "apps/api/src/dashboard/catalog.ts",
    "apps/api/src/dashboard/dealers.ts",
    "apps/api/src/dashboard/v11-r1-catalog-dealers.test.ts",
    // V11-R1 F4 promotions lease: the ready-shell promotions edit gate
    // (pricing.write) flows through the read-only content, the shared panel
    // router and the promotions panel's canEdit affordances.
    "src/components/dashboard/DashboardF0ReadOnlyContent.tsx",
    "src/components/dashboard/DashboardPanelRouter.tsx",
    "src/components/dashboard/DashboardPanels.tsx",
    // V11-R1 functional-first lease: the commerce and ERP focused source
    // tests extend for the acceptance corrections driven by the functional
    // first re-runs.
    "src/components/dashboard/v11-6-commerce-source.test.ts",
    "src/components/dashboard/v11-r1-p6-source.test.ts",
    // Catalog price freshness lease: the storefront catalog source drops the
    // module-lifetime catalog promise (per-request price reads) and its
    // regression test land on the Frontend line.
    "src/lib/api/server.ts",
    "src/lib/api/server.test.ts",
    // V11-R1 ERP sync products lease: the operations panel owns the shared
    // BatchApiFetch type after the batch-import panel is deleted, and the P1
    // source test extends for the new ERP sync surface.
    "src/components/dashboard/ErpOperationsPanel.tsx",
    "src/components/dashboard/v11-r1-p1-source.test.ts",
    // 260813 dashboard edit-gates + navigation lease: per-module canEdit
    // wiring (F0 content, panel router, panels) and the unified onNavigate
    // chain (F0 shell, breadcrumb, overview quick entries) with their focused
    // source tests; the PDP locale-threading commits (09d11ae6, 5ae9d36d)
    // modified the two product page shells on this line.
    "src/components/dashboard/OverviewWorkspacePanel.tsx",
    "src/components/dashboard/ShellBreadcrumb.tsx",
    "src/components/dashboard/GeneralStorefrontSettingsPanel.test.ts",
    "src/app/products/[slug]/page.tsx",
    "src/app/fr/products/[slug]/page.tsx"
  ]);
  assert.deepEqual(changed.filter((path) => !allowedTrackedChanges.has(path)), [], "UI-0 cannot modify an existing page or component");

  for (const legacy of legacyUiEntries) {
    const path = `src/components/ui/${legacy}`;
    assert.equal(readProject(path), git("show", `${ui0Base}:${path}`), `${path} is a read-only legacy-ui-entry`);
  }

  const untrackedSource = git("ls-files", "--others", "--exclude-standard", "--", "src").trim().split("\n").filter(Boolean);
  // S10 lease: the Privacy/Retention settings panel and its lib module are
  // new Frontend sources that land together with this commit.
  const s10Prefixes = ["src/components/ui/", "src/components/dashboard/PrivacyRetentionSettingsPanel", "src/lib/dashboard/s10-", "src/components/dashboard/CommerceSettingsPanel", "src/lib/dashboard/s03-", "src/lib/api/s03-runtime-validation.ts", "src/components/dashboard/ApiServiceAccountsSettingsPanel", "src/lib/dashboard/s08-", "src/lib/api/s08-runtime-validation.ts"];
  // V11-2 lease: the Dashboard login surface (route pair, component, CSS,
  // session machine lib and its tests) is a new Dashboard-only source set.
  const v11Prefixes = [
    "src/components/dashboard/DashboardLogin",
    "src/lib/dashboard/auth-session",
    "src/app/dashboard/login/",
    "src/app/fr/dashboard/login/"
  ];
  // V11-3 lease: the global shell & navigation component set (Shell* +
  // MobileNavigationDrawer) and the JSX-free shell navigation view-model lib
  // with its runtime tests are a new Dashboard-only source set. The shell
  // components reuse the leased DashboardF0Shell.module.css and add no
  // dependencies (no lucide imports).
  const v113Prefixes = [
    "src/components/dashboard/Shell",
    "src/components/dashboard/MobileNavigationDrawer",
    "src/components/dashboard/v11-3-shell-source.test.ts",
    "src/components/dashboard/v11-4-overview-source.test.ts",
    "src/components/dashboard/v11-5-catalog-source.test.ts",
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
    "src/lib/dashboard/shell-navigation",
    "src/lib/dashboard/types.ts",
    "src/components/dashboard/OverviewWorkspacePanel",
    // 260813 edit-gates lease: the per-module capability registry and the
    // edit-gate/navigation source test are new Dashboard-only sources.
    "src/lib/dashboard/edit-gates",
    "src/components/dashboard/v11-r1-edit-gates-source.test.ts",
    // 260813 orders/customer-detail lease: the orders-dealer decoupling and
    // customer profile/address source contract test is a new Dashboard-only
    // source landing with the frontend fixes on this line.
    "src/components/dashboard/orders-customer-profile-source.test.ts",
    // 260813 session-expiry notice lease: the tab-scoped sessionStorage
    // expired-notice lifecycle module and its unit tests are new Dashboard
    // sources landing with the case-13 fix.
    "src/lib/dashboard/session-notice"
  ];
  // Catalog price freshness lease: the storefront catalog price-freshness
  // regression test is a new lib source on the Frontend line.
  const serverApiLease = ["src/lib/api/server.ts", "src/lib/api/server.test.ts"];
  assert.deepEqual(untrackedSource.filter((path) => !s10Prefixes.some((prefix) => path.startsWith(prefix)) && !v11Prefixes.some((prefix) => path.startsWith(prefix)) && !v113Prefixes.some((prefix) => path.startsWith(prefix)) && !serverApiLease.some((prefix) => path.startsWith(prefix))), [], "new product routes or feature sources are outside the UI-0 allowlist");
});
