import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("promotion status options never include inactive", async () => {
  const source = await read("DashboardPanels.tsx");
  const promotions = source.slice(source.indexOf("export function PromotionsPanel"), source.indexOf("export function OrdersPanel"));
  assert.match(promotions, /\["draft", "active", "archived"\]/);
  assert.doesNotMatch(promotions, /"inactive"/);
});

test("promotions panel gates create/status/archive on canEdit and stays read-only without a grant", async () => {
  const source = await read("DashboardPanels.tsx");
  const promotions = source.slice(source.indexOf("export function PromotionsPanel"), source.indexOf("export function OrdersPanel"));
  assert.match(promotions, /canEdit\?: boolean/);
  // V11-R1 F4: effective editable is canEdit — readOnly no longer blocks and
  // no grant renders the read-only status display.
  assert.match(promotions, /props\.canEdit \? <QuickForm/);
  assert.match(promotions, /props\.canEdit \? <form/);
  assert.match(promotions, /<\/form> : displayDashboardStatus\(props\.copy, "promotion", promotion\.status\)/);
  assert.doesNotMatch(promotions, /!props\.readOnly \? <QuickForm/);
  assert.doesNotMatch(promotions, /props\.readOnly \? displayDashboardStatus/);
  // every write affordance shares the same gate: create, status select/save,
  // archive/delete all sit inside a canEdit-gated expression.
  for (const handler of ["/dashboard/promotions", "method: \"PATCH\"", "method: \"DELETE\""]) {
    const site = promotions.indexOf(handler);
    const gate = promotions.slice(0, site).lastIndexOf("props.canEdit ?");
    assert.ok(site > gate, `${handler} must be gated on props.canEdit`);
  }
});

test("promotions transport uses exact method/path pairs", async () => {
  const source = await read("DashboardPanels.tsx");
  const promotions = source.slice(source.indexOf("export function PromotionsPanel"), source.indexOf("export function OrdersPanel"));
  assert.match(promotions, /\.onAction\("\/dashboard\/promotions", input, \{ success:/);
  assert.match(promotions, /`\/dashboard\/promotions\/\$\{promotion\.id\}`/);
  assert.match(promotions, /\{ method: "PATCH", success: props\.copy\.messages\.promotionUpdated \}/);
  assert.match(promotions, /\{ method: "DELETE", success: props\.copy\.messages\.promotionUpdated \}\)/);
});

test("router declares and forwards promotionsCanEdit", async () => {
  const router = await read("DashboardPanelRouter.tsx");
  assert.match(router, /promotionsCanEdit\?: boolean/);
  assert.match(router, /canEdit=\{props\.promotionsCanEdit\}/);
});

test("promotions edit gate resolves only from the promotions module pricing.write allow", async () => {
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  // shared edit-gates registry maps promotions -> pricing.write; the
  // promotions module's own allow is the ONLY grant that opens it
  assert.match(content, /hasModuleWriteCapability\(authorization, "promotions"\)/);
  assert.match(content, /promotionsCanEdit/);
});

test("readOnlyAction promotions paths are path-precise and DELETE is not generalized", async () => {
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  const action = content.slice(content.indexOf("const readOnlyAction"), content.indexOf("const navigateQuery"));
  assert.ok(action.includes('const promotionsPath = path === "/dashboard/promotions" || /^\\/dashboard\\/promotions\\/[^/]+$/.test(path);'), "POST exact + :id pattern");
  assert.ok(action.includes('const promotionsArchive = method === "DELETE" && /^\\/dashboard\\/promotions\\/[^/]+$/.test(path);'), "DELETE archive is :id-precise");
  assert.match(action, /promotionsPath && promotionsCanEdit/);
  assert.match(action, /promotionsArchive && promotionsCanEdit/);
  // the DELETE pass-through never generalizes to any /dashboard/promotions path.
  assert.doesNotMatch(action, /method === "DELETE" && path\.startsWith\("\/dashboard\/promotions"\)/);
  assert.match(action, /\(erpLinkUnlink && dealersCanEdit\) \|\| \(promotionsArchive && promotionsCanEdit\)/);
});

test("dealers panel creates locations through the dealers route", async () => {
  const source = await read("DashboardPanels.tsx");
  const dealers = source.slice(source.indexOf("export function DealersPanel"), source.indexOf("export function CrmContactsPanel"));
  assert.match(dealers, /`\/dashboard\/dealers\/\$\{detail\.id\}\/locations`/);
  assert.match(dealers, /method: "POST"/);
  assert.match(dealers, /新增网点/);
});

test("dealers panel edits, archives and restores locations through location PATCH", async () => {
  const source = await read("DashboardPanels.tsx");
  const dealers = source.slice(source.indexOf("export function DealersPanel"), source.indexOf("export function CrmContactsPanel"));
  assert.match(dealers, /`\/dashboard\/dealer-locations\/\$\{location\.id\}`/);
  assert.match(dealers, /status: "inactive"/);
  assert.match(dealers, /status: "active"/);
  assert.match(dealers, /window\.confirm/);
  assert.match(dealers, /恢复/);
  assert.match(dealers, /停用/);
});

test("dealers panel adds, lists and unlinks ERP links", async () => {
  const source = await read("DashboardPanels.tsx");
  const dealers = source.slice(source.indexOf("export function DealersPanel"), source.indexOf("export function CrmContactsPanel"));
  assert.match(dealers, /`\/dashboard\/dealers\/\$\{detail\.id\}\/erp-links`/);
  assert.match(dealers, /`\/dashboard\/dealers\/\$\{detail\.id\}\/erp-links\/\$\{link\.id\}`/);
  assert.match(dealers, /method: "DELETE"/);
  assert.match(dealers, /erpLinks/);
  assert.match(dealers, /解除关联/);
});

test("dealers row detail affordance survives the per-module edit gates", async () => {
  // The row 查看详情 button is the ONLY entry point to the dealer detail
  // drawer (locations, ERP links, location edit forms live inside it), so it
  // must render for writers too — only the 编辑 button is gated by canEdit.
  const source = await read("DashboardPanels.tsx");
  const dealers = source.slice(source.indexOf("export function DealersPanel"), source.indexOf("export function CrmContactsPanel"));
  assert.doesNotMatch(dealers, /readOnly && props\.apiFetch/);
  assert.match(dealers, /props\.apiFetch \? \(/);
  assert.match(dealers, /<button onClick=\{\(\) => openDealer\(dealer\.id\)\} type="button">查看详情<\/button>/);
  assert.match(dealers, /\{props\.canEdit \? <button onClick=\{\(\) => \{ void openDealer\(dealer\.id\)\.then/);
});

test("readOnlyAction grants are path-precise and DELETE is erp-links unlink only", async () => {
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  const action = content.slice(content.indexOf("const readOnlyAction"), content.indexOf("const navigateQuery"));
  assert.match(action, /productsPath && productsCanEdit/);
  assert.doesNotMatch(action, /\|\|\s*productsCanEdit;\s*$/m);
  assert.ok(action.includes('const erpLinkUnlink = method === "DELETE" && /^\\/dashboard\\/dealers\\/[^/]+\\/erp-links\\/[^/]+$/.test(path);'), "DELETE is allowed only for the erp-links unlink route");
  assert.match(action, /erpLinkUnlink && dealersCanEdit/);
});

test("S01 settings legal pages bypass the coming-soon gate only via the three-page whitelist and settingsCenterV1", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  const gate = shell.slice(shell.indexOf("const s01Route"));
  assert.match(gate, /s01Route = settingsLocation\.kind === "valid" && \(settingsLocation\.page === "overview" \|\| settingsLocation\.page === "lifecycle" \|\| settingsLocation\.page === "history"\)/);
  assert.match(gate, /\(specializedSettingsRoute \|\| s01Route\) && foundationState\.authorization\?\.settingsCenterV1\.enabled === true/);
  assert.match(gate, /comingSoonModule && !specializedSettingsRouteEnabled/);
  // No arbitrary settings path bypass: the whitelist requires a parser-valid
  // location (only overview/lifecycle/history parse as valid) and the whole
  // bypass stays gated by settingsCenterV1.enabled.
  assert.doesNotMatch(gate, /settingsLocation\.kind !== "invalid"/);
  assert.doesNotMatch(gate, /settingsLocation\.kind !== "not-settings"/);
});

test("dealer detail types carry full location fields and safe erpLinks", async () => {
  const types = await read("../../lib/dashboard/types.ts");
  const dealer = types.slice(types.indexOf("export type DealerLocation"), types.indexOf("export type DealerApplication"));
  assert.match(dealer, /addressLine1/);
  assert.match(dealer, /postalCode/);
  assert.match(dealer, /updatedAt/);
  assert.match(dealer, /erpSystem/);
  assert.match(dealer, /erpLocationId/);
  assert.doesNotMatch(dealer, /secret|password|token/i);
});
