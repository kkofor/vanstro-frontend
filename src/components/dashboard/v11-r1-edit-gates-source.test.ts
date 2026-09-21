import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("CategoriesPanel gates create/slug/status/save behind an explicit canEdit", async () => {
  const source = await read("DashboardPanels.tsx");
  const categories = source.slice(source.indexOf("export function CategoriesPanel"), source.indexOf("export function PricingPanel"));
  // explicit per-module gate: no hardcoded global readOnly
  assert.match(categories, /canEdit\?: boolean/);
  assert.match(categories, /const canEdit = props\.canEdit === true/);
  // create form, slug editing, enable/disable and save only when canEdit
  assert.match(categories, /canEdit \? <QuickForm/);
  assert.match(categories, /!canEdit \? category\.slug : <form/);
  assert.match(categories, /"\/dashboard\/categories"\/?/);
  assert.match(categories, /`\/dashboard\/categories\/\$\{category\.id\}`/);
  assert.match(categories, /method: "PATCH"/);
  assert.match(categories, /props\.copy\.actions\.save/);
  // without the grant the panel keeps read-only details
  assert.match(categories, /canEdit \? "-" : <button onClick=\{\(\) => openCategory/);
  assert.match(categories, /查看详情/);
});

test("router derives every module readOnly from its own canEdit, fail-closed otherwise", async () => {
  const router = await read("DashboardPanelRouter.tsx");
  const readOnlyFor = /readOnlyFor\(/;
  assert.match(router, /const readOnlyFor = \(canEdit: boolean \| undefined\) => !\(canEdit === true\)/);
  // writable modules derive from their own gate
  assert.match(router, /readOnly=\{readOnlyFor\(props\.productsCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.ordersCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.customersCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.usersCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.dealersCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.pricingCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.promotionsCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.inventoryCanEdit\)\}/);
  // modules without a write capability stay read-only (fail-closed default)
  assert.match(router, /props\.readOnly \?\? true/);
  // the F0 presenter no longer passes a hardcoded global readOnly
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  assert.doesNotMatch(content, /\breadOnly$/m);
  assert.doesNotMatch(content, /readOnly\s*\n?\s*$/);
});

test("readOnlyAction is path-precise: each write path resolves only its own capability", async () => {
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  const action = content.slice(content.indexOf("const readOnlyAction"), content.indexOf("const navigateQuery"));
  // path families are split per owning module
  assert.match(action, /const productsPath = path === "\/dashboard\/products"/);
  assert.match(action, /path\.startsWith\("\/dashboard\/skus"\)/);
  assert.match(action, /const categoriesPath = path === "\/dashboard\/categories"/);
  assert.match(action, /const pricingPath = path === "\/dashboard\/pricing"/);
  assert.match(action, /const inventoryPath = path === "\/dashboard\/inventory"/);
  // categories writes are gated on categoriesCanEdit — products.write cannot open them
  assert.match(action, /\(categoriesPath && categoriesCanEdit\)/);
  assert.match(action, /\(productsPath && productsCanEdit\)/);
  assert.match(action, /\(pricingPath && pricingCanEdit\)/);
  assert.match(action, /\(inventoryPath && inventoryCanEdit\)/);
  assert.match(action, /\(promotionsPath && promotionsCanEdit\)/);
  assert.match(action, /\(ordersPath && ordersCanEdit\)/);
  assert.match(action, /\(crmPath && customersCanEdit\)/);
  assert.match(action, /\(usersPath && usersCanEdit\)/);
  assert.match(action, /\(dealersPath && dealersCanEdit\)/);
  // unauthorized writes fail closed client-side (403 fallback) — no request is issued
  assert.match(action, /assertReadOnlyMethod\(method\)/);
  // authorized writes pass the audited server API with the explicit allowWrite marker
  assert.match(action, /allowWrite: true/);
});

test("the F0 presenter no longer hardcodes a global readOnly for the data controller or panels", async () => {
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  // the data controller keeps read-only READ transport (documented), but the
  // panels no longer receive a global readOnly prop
  assert.match(content, /Read transport stays read-only/);
  assert.doesNotMatch(content, /readOnly\s*$/m);
  // per-module gates are derived from the shared registry
  assert.match(content, /hasModuleWriteCapability\(authorization, "products"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "categories"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "pricing"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "promotions"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "inventory"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "orders"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "customers"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "users"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "dealers"\)/);
  // generic mutation lookups are real, not hardcoded false
  assert.doesNotMatch(content, /can=\{\(\) => false\}/);
  assert.match(content, /const can = useCallback/);
});

test("access-mode header and resource status reflect the current module state", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  // access mode follows the ACTIVE module's write capability
  assert.match(shell, /hasModuleWriteCapability\(authorization, active\.module\)/);
  assert.match(shell, /\? "可编辑" : settingsWritable \? "Settings 受控写入"/);
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  // resource status describes load state, never a hardcoded 只读
  assert.match(content, /aria-label="业务数据"/);
  assert.match(content, /"已加载"/);
  assert.doesNotMatch(content, /资源状态：\{state === "partial" \? "部分数据不可用"[\s\S]{0,400}:"只读"\}/);
});

test("navigation: single onNavigate is threaded shell -> content -> overview quick entries", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  const overview = await read("OverviewWorkspacePanel.tsx");
  const breadcrumb = await read("ShellBreadcrumb.tsx");
  // one unified callback threaded through the F0 chain
  assert.match(shell, /onNavigate=\{navigateTo\}/);
  assert.match(shell, /<ShellBreadcrumb crumbs=\{crumbs\} onNavigate=\{navigateTo\} \/>/);
  assert.match(content, /onNavigate: \(href: string\) => void/);
  assert.match(content, /onNavigate=\{onNavigate\}/);
  assert.match(overview, /onNavigate: \(href: string\) => void/);
  assert.match(overview, /onNavigate\(href\)/);
  assert.match(breadcrumb, /onNavigate\?: \(href: string\) => void/);
  // the old hacks are gone: no pushState monkeypatch, no 250ms poll, no fixed refresh
  assert.doesNotMatch(shell, /__v11R1P0__/);
  assert.doesNotMatch(shell, /window\.history\.pushState = /);
  assert.doesNotMatch(shell, /setInterval/);
  assert.doesNotMatch(shell, /router\.refresh\(\)/, "no fixed-delay refresh");
  assert.doesNotMatch(shell, /setTimeout\(\(\) => \{ void router\.refresh/);
  // quick entries are real anchors calling onNavigate once (EN/FR prefix kept)
  assert.match(overview, /href=\{href\}/);
  assert.match(overview, /locale === "fr-CA" \? "\/fr" : ""/);
});
