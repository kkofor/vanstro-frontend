import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("products panel gates editing behind canEdit and opens the edit form in the drawer", async () => {
  const source = await read("DashboardPanels.tsx");
  const products = source.slice(source.indexOf("export function ProductsPanel"), source.indexOf("export function CategoriesPanel"));
  assert.match(products, /canEdit\?: boolean/);
  assert.match(products, /编辑/);
  assert.match(products, /!props\.canEdit \|\| !editing \?/);
  assert.match(products, /setEditing\(true\)/);
});

test("product edit form saves base fields and SKU prices through existing write APIs", async () => {
  const source = await read("DashboardPanels.tsx");
  const products = source.slice(source.indexOf("export function ProductsPanel"), source.indexOf("export function CategoriesPanel"));
  assert.match(products, /`\/dashboard\/products\/\$\{detail\.id\}`/);
  assert.match(products, /method: "PATCH"/);
  assert.match(products, /`\/dashboard\/pricing\/\$\{draft\.id\}`/);
  assert.match(products, /priceDrafts/);
  // no second form framework: reuses onAction/ActionHandler
  assert.match(products, /props\s*\.onAction/);
});

test("archiving requires confirmation; restore is the status select", async () => {
  const source = await read("DashboardPanels.tsx");
  const products = source.slice(source.indexOf("export function ProductsPanel"), source.indexOf("export function CategoriesPanel"));
  assert.match(products, /statusDraft === "archived"/);
  assert.match(products, /window\.confirm/);
  assert.match(products, /\["draft", "active", "archived"\]/);
});

test("pricing/inventory legacy URLs redirect into the products context", async () => {
  const shell = await read("DashboardF0Shell.tsx");
  assert.match(shell, /legacyPriceInventoryTarget/);
  assert.match(shell, /\/dashboard\/products\?view=pricing/);
  assert.match(shell, /\/dashboard\/products\?view=inventory/);
  assert.match(shell, /window\.location\.replace/);
});

test("product edit form saves inventory through the snapshot upsert API", async () => {
  const source = await read("DashboardPanels.tsx");
  const products = source.slice(source.indexOf("export function ProductsPanel"), source.indexOf("export function CategoriesPanel"));
  assert.match(products, /"\/dashboard\/inventory\/snapshots"/);
  assert.match(products, /quantityOnHand/);
  assert.match(products, /inventoryDrafts/);
});

test("permission wiring: router passes productsCanEdit from authorization actions", async () => {
  const router = await read("DashboardPanelRouter.tsx");
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  assert.match(router, /productsCanEdit\?: boolean/);
  assert.match(router, /canEdit=\{props\.productsCanEdit\}/);
  // per-module edit gates resolve through the shared edit-gates registry
  // against each module's OWN write capability
  assert.match(content, /hasModuleWriteCapability\(authorization, "products"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "categories"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "pricing"\)/);
  assert.match(content, /hasModuleWriteCapability\(authorization, "inventory"\)/);
});
