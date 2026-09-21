import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { basename, relative } from "node:path";
import { exportedNames, legacyUiEntries, readProject, root, stripComments, uiSourceFiles } from "./contract-helpers.mjs";

const requiredFiles = [
  "cn.ts", "button.tsx", "input.tsx", "textarea.tsx", "select.tsx", "checkbox.tsx", "field.tsx",
  "badge.tsx", "card.tsx", "section.tsx", "separator.tsx", "table.tsx", "pagination.tsx", "skeleton.tsx",
  "empty-state.tsx", "status-message.tsx", "live-region.tsx", "dialog.tsx", "index.ts"
];
const requiredExports = [
  "cn", "Button", "Input", "Textarea", "Select", "Checkbox", "Field", "Badge", "Card", "Section",
  "Separator", "Table", "Pagination", "Skeleton", "EmptyState", "StatusMessage", "LiveRegion",
  "DialogRoot", "DialogTrigger", "DialogPortal", "DialogOverlay", "DialogContent", "DialogHeader",
  "DialogFooter", "DialogTitle", "DialogDescription", "DialogClose", "ConfirmDialog"
];

test("the complete UI-0 surface exists at the public physical import root", () => {
  const missing = requiredFiles.filter((name) => !existsSync(`${root}/src/components/ui/${name}`));
  assert.deepEqual(missing, []);
});

test("the barrel exposes the required minimum API and explicitly excludes legacy entries", () => {
  const barrel = readProject("src/components/ui/index.ts");
  const names = new Set(exportedNames(barrel));
  assert.deepEqual(requiredExports.filter((name) => !names.has(name)), [], "missing required public exports");
  for (const legacy of legacyUiEntries) {
    assert.doesNotMatch(barrel, new RegExp(legacy.replace(/\.tsx$/, "")), `${legacy} is a legacy-ui-entry and must not enter the barrel`);
  }
  assert.doesNotMatch(barrel, /@radix-ui\/|class-variance-authority|tailwind-merge|\bclsx\b/, "barrel must not expose implementation dependencies");
});

test("every new component source declares a stable data-slot", () => {
  const excluded = new Set(["cn.ts", "index.ts", "button-variants.ts", "badge-variants.ts"]);
  const violations = uiSourceFiles()
    .filter((file) => !excluded.has(basename(file)) && !basename(file).endsWith("-variants.ts"))
    .filter((file) => !/data-slot\s*=/.test(stripComments(readFileSync(file, "utf8"))))
    .map((file) => relative(root, file));
  assert.deepEqual(violations, [], "all UI components/subprimitives must identify their rendered slots");
});

test("DialogPortal and DialogRoot are the non-rendering Dialog data-slot exemptions", () => {
  const dialog = stripComments(readProject("src/components/ui/dialog.tsx"));
  const portalBody = dialog.match(/export function DialogPortal[\s\S]*?\n}/)?.[0] ?? "";
  const rootBody = dialog.match(/export function DialogRoot[\s\S]*?\n}/)?.[0] ?? "";
  assert.doesNotMatch(portalBody, /data-slot|<(?:div|span|section|aside|main)\b/, "DialogPortal must not add a slot wrapper");
  assert.doesNotMatch(rootBody, /data-slot|<(?:div|span|section|aside|main)\b/, "DialogRoot must not add a slot wrapper");
  assert.match(dialog, /data-slot="dialog-overlay"/, "DialogOverlay must retain its slot");
  assert.match(dialog, /data-slot="dialog-content"/, "DialogContent must retain its slot");
});

test("form, feedback, table, pagination, and dialog sources retain their accessibility wiring", () => {
  const contracts = {
    "field.tsx": [/aria-describedby/, /aria-invalid/, /htmlFor|aria-label/],
    "checkbox.tsx": [/aria-describedby/, /aria-invalid/],
    "table.tsx": [/<caption|caption/, /aria-label/, /tabIndex/],
    "pagination.tsx": [/aria-label/, /aria-current/],
    "skeleton.tsx": [/role=[{"']?status|aria-live/, /sr-only/],
    "empty-state.tsx": [/aria-label/, /EmptyStateTitle|<h2/],
    "status-message.tsx": [/role=/, /aria-live/],
    "live-region.tsx": [/aria-live/, /aria-atomic/],
    "dialog.tsx": [/DialogPrimitive\.Title|\.Title/, /DialogPrimitive\.Description|\.Description/, /aria-label|sr-only/]
  };
  const failures = [];
  for (const [file, patterns] of Object.entries(contracts)) {
    const source = stripComments(readProject(`src/components/ui/${file}`));
    for (const pattern of patterns) if (!pattern.test(source)) failures.push(`${file} lacks ${pattern}`);
  }
  assert.deepEqual(failures, []);
});

test("button and badge advertise the frozen variants", () => {
  const button = readProject("src/components/ui/button-variants.ts");
  const badge = readProject("src/components/ui/badge-variants.ts");
  for (const variant of ["primary", "secondary", "ghost", "destructive", "link"]) assert.match(button, new RegExp(`\\b${variant}\\b`));
  for (const variant of ["neutral", "success", "warning", "error", "info", "readiness"]) assert.match(badge, new RegExp(`\\b${variant}\\b`));
});
