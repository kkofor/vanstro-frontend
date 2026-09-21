import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("dealers panel gates editing on settings.write and keeps read-only details", async () => {
  const source = await read("DashboardPanels.tsx");
  const dealers = source.slice(source.indexOf("export function DealersPanel"), source.indexOf("export function CrmContactsPanel"));
  assert.match(dealers, /canEdit\?: boolean/);
  assert.match(dealers, /canEdit\?: boolean/);
  assert.match(dealers, /\/dashboard\/dealers\/\$\{detail\.id\}/);
  assert.match(dealers, /dealerStatusDraft/);
  assert.match(dealers, /window\.confirm/);
});

test("dealer archive is soft (status select) with restore via the same form", async () => {
  const source = await read("DashboardPanels.tsx");
  const dealers = source.slice(source.indexOf("export function DealersPanel"), source.indexOf("export function CrmContactsPanel"));
  assert.match(dealers, /\["active", "inactive"\]/);
  assert.match(dealers, /nextStatus === "inactive"/);
  assert.match(dealers, /props\.copy\.actions\.save/);
});

test("dealer edit gate is wired through content/router with the read-only guard", async () => {
  const content = await read("DashboardF0ReadOnlyContent.tsx");
  const router = await read("DashboardPanelRouter.tsx");
  assert.match(content, /dealersCanEdit/);
  assert.match(content, /path\.startsWith\("\/dashboard\/dealers"\)/);
  assert.match(router, /dealersCanEdit\?: boolean/);
  assert.match(router, /canEdit=\{props\.dealersCanEdit\}/);
});
