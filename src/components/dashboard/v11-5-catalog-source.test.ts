import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("Categories read-only shell gains a real detail drawer, never a fake endpoint", async () => {
  const source = await read("DashboardPanels.tsx");
  const categories = source.slice(source.indexOf("export function CategoriesPanel"), source.indexOf("export function PricingPanel"));
  assert.match(categories, /查看详情/);
  assert.match(categories, /apiFetch\(`\/dashboard\/categories\/\$\{id\}`\)/);
  assert.match(categories, /<DetailDrawer open=\{Boolean\(drawerId && detail\)\}/);
  assert.match(categories, /category-detail/);
  // the write forms stay gated behind the explicit canEdit gate
  assert.match(categories, /canEdit \? <QuickForm/);
  assert.match(categories, /!canEdit \? category\.slug : <form/);
});

test("Pricing/Promotions/Inventory keep equivalent full-field list detail, no fabricated endpoints", async () => {
  const source = await read("DashboardPanels.tsx");
  const pricing = source.slice(source.indexOf("export function PricingPanel"), source.indexOf("export function PromotionsPanel"));
  const promotions = source.slice(source.indexOf("export function PromotionsPanel"), source.indexOf("export function InventorySnapshotsPanel"));
  const inventory = source.slice(source.indexOf("export function InventorySnapshotsPanel"), source.indexOf("export function CmsPanel"));
  // no invented /:id detail fetches in these read-only slices
  assert.doesNotMatch(pricing, /fetch\([^)]*\/dashboard\/pricing\/\$\{/);
  assert.doesNotMatch(promotions, /fetch\([^)]*\/dashboard\/promotions\/\$\{/);
  assert.doesNotMatch(inventory, /fetch\([^)]*\/inventory[^)]*\/\$\{/);
  // full-field tables render the complete record (equivalent safe detail)
  assert.match(pricing, /<Table/);
  assert.match(promotions, /<Table/);
  assert.match(inventory, /<Table/);
});

test("Inventory snapshot panel keeps pagination and read-only write gating", async () => {
  const source = await read("DashboardPanels.tsx");
  const inventory = source.slice(source.indexOf("export function InventorySnapshotsPanel"), source.indexOf("export function CmsPanel"));
  assert.match(inventory, /onPageChange/);
  assert.match(inventory, /props\.readOnly/);
});

test("catalog slice never surfaces write buttons without the module's own gate", async () => {
  const router = await read("DashboardPanelRouter.tsx");
  // writable modules derive readOnly from their own canEdit; others fail closed
  assert.match(router, /readOnly=\{readOnlyFor\(props\.productsCanEdit\)\}/);
  assert.match(router, /canEdit=\{props\.categoriesCanEdit === true\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.pricingCanEdit\)\}/);
  assert.match(router, /readOnly=\{readOnlyFor\(props\.promotionsCanEdit\)\}/);
  assert.match(router, /props\.readOnly \?\? true/);
});
