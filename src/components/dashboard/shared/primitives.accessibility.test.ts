import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./primitives.tsx", import.meta.url), "utf8");
const panelsSource = readFileSync(new URL("../DashboardPanels.tsx", import.meta.url), "utf8");

test("Table exposes an accessible caption, column headers, overflow region, and empty state", () => {
  assert.match(source, /caption = "Data table"/);
  assert.match(source, /emptyMessage = "No records found\."/);
  assert.match(source, /role="region" aria-label=\{caption\} tabIndex=\{0\}/);
  assert.match(source, /<caption className="visually-hidden">\{caption\}<\/caption>/);
  assert.match(source, /<th key=\{column\} scope="col">/);
  assert.match(source, /<td colSpan=\{columns\.length\}>\{emptyMessage\}<\/td>/);
});

test("every Dashboard table supplies contextual localized caption and empty copy", () => {
  const tableOpenings = panelsSource.match(/<Table\n(?:(?!\n\s*columns=)[\s\S])*\n\s*columns=/g) ?? [];
  assert.equal(tableOpenings.length, 25);

  for (const tableOpening of tableOpenings) {
    assert.match(tableOpening, /caption=\{props\.copy\.[\w.]+\}/);
    assert.match(tableOpening, /emptyMessage=\{(?:props\.copy\.[\w.]+|`\$\{props\.copy\.[\w.]+\}: \$\{props\.copy\.common\.noRecords\}`)\}/);
  }

  assert.match(panelsSource, /caption=\{props\.copy\.orders\.items\}/);
  assert.match(panelsSource, /caption=\{props\.copy\.orders\.statusHistory\}/);
  assert.match(panelsSource, /caption=\{props\.copy\.operations\.topPaths\}/);
  assert.match(panelsSource, /caption=\{props\.copy\.operations\.title\}\n\s+emptyMessage=\{props\.copy\.operations\.empty\}/);
  assert.match(panelsSource, /caption=\{props\.copy\.emailOutbox\.title\}/);
  assert.match(panelsSource, /caption=\{props\.copy\.emailOutbox\.templatesTitle\}/);
});

test("F0 CMS read-only branches mount zero forms, submit handlers, or editable textareas", () => {
  const readonlyJson = panelsSource.match(/function CmsReadonlyJson[\s\S]*?\n}\n\nfunction CmsJsonEditor/)?.[0] ?? "";
  const jsonEditor = panelsSource.match(/function CmsJsonEditor[\s\S]*?\n}\n\nexport function CmsPanel/)?.[0] ?? "";
  const cmsPanel = panelsSource.match(/export function CmsPanel[\s\S]*?\n}\n\nexport function OperationsPanel/)?.[0] ?? "";

  assert.ok(readonlyJson);
  assert.doesNotMatch(readonlyJson, /<form|<textarea|onSubmit=|onAction/);
  assert.doesNotMatch(readonlyJson, /<section[^>]* lang=\{props\.locale\}>/);
  assert.match(readonlyJson, /<pre lang=\{props\.locale\}>\{cmsEditorValue\(props\.data\)}<\/pre>/);

  assert.ok(jsonEditor);
  assert.match(jsonEditor, /if \(!props\.canWrite\) \{\s*return <CmsReadonlyJson/);
  assert.ok(jsonEditor.indexOf("if (!props.canWrite)") < jsonEditor.indexOf("<form"));

  assert.ok(cmsPanel);
  assert.equal((cmsPanel.match(/<CmsJsonEditor/g) ?? []).length, 5);
  assert.match(cmsPanel, /props\.cmsSubTab === "moduleReadiness"[\s\S]*?<CmsReadonlyJson/);
  assert.match(cmsPanel, /!props\.readOnly && legalSlug \? \(\s*<form/);
  assert.match(cmsPanel, /props\.canWrite && !props\.readOnly \? \(\s*<QuickForm/);
});

test("F0 CMS language and selected-state boundaries keep Chinese UI outside managed content locales", () => {
  assert.doesNotMatch(panelsSource, /<section className="dashboard-card dashboard-quick-form" lang=\{props\.locale\}>/);
  assert.match(panelsSource, /<pre lang=\{props\.locale\}>\{cmsEditorValue\(props\.data\)}<\/pre>/);
  assert.match(panelsSource, /aria-pressed=\{tab\.key === props\.cmsSubTab\}/);
  assert.match(panelsSource, /<span key="title" lang=\{page\.locale\}>\{page\.title\}<\/span>/);
  assert.match(panelsSource, /<span key="title" lang=\{article\.locale\}>\{article\.title\}<\/span>/);
});

test("Orders and Payment Sessions localize fulfillment values without changing source data", () => {
  assert.match(panelsSource, /displayDashboardValue\(props\.copy, order\.fulfillment\)/);
  assert.match(panelsSource, /session\.fulfillment \? displayDashboardValue\(props\.copy, session\.fulfillment\) : "-"/);
});

test("F0 Operations omits no-op queue controls", () => {
  const operationsPanel = panelsSource.match(/export function OperationsPanel[\s\S]*?\n}\n\nexport function EmailOutboxPanel/)?.[0] ?? "";
  assert.ok(operationsPanel);
  assert.match(operationsPanel, /props\.readOnly \? \(\s*<span key="queue">/);
  assert.match(operationsPanel, /\) : \(\s*<button[\s\S]*?onClick=\{\(\) => props\.onNavigateAlert\(alert\.key\)\}/);
});

test("Pagination buttons have backward-compatible accessible names", () => {
  assert.match(source, /previousLabel\?: string/);
  assert.match(source, /nextLabel\?: string/);
  assert.match(source, /aria-label=\{props\.previousLabel \?\? "Previous page"\}/);
  assert.match(source, /aria-label=\{props\.nextLabel \?\? "Next page"\}/);
});

test("DetailDrawer uses the shared modal focus behavior and a labelled modal dialog", () => {
  assert.match(source, /useModalFocus\(\{/);
  assert.match(source, /active: props\.open/);
  assert.match(source, /modalRootRef: backdropRef/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /aria-label=\{props\.closeLabel \?\? "Close details"\}/);
});
