import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync(new URL("./GeneralStorefrontSettingsPanel.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./GeneralStorefrontSettingsPanel.module.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("./DashboardF0Shell.tsx", import.meta.url), "utf8");
const content = readFileSync(new URL("./DashboardF0ReadOnlyContent.tsx", import.meta.url), "utf8");

test("S02 page routes through the Settings static route and F0 shell mounts the panel", () => {
  assert.match(panel, /通用店面设置/);
  assert.match(content, /if \(s02Location\) return <GeneralStorefrontSettingsPanel/);
  assert.match(shell, /parseS02Location/);
  assert.match(shell, /s02Location=\{s02Location\.kind === "valid"/);
  assert.match(shell, /specializedSettingsRouteEnabled \? foundation\.modules\.find\(\(entry\) => entry\.module === "settings"\)/);
});

test("S02 renders lifecycle summary, five bounded sections and explicit actions", () => {
  assert.match(panel, /生命周期状态/);
  assert.match(panel, /id="s02-generalidentity-title"/);
  assert.match(panel, /id="s02-brand-title"/);
  assert.match(panel, /id="s02-storefront-title"/);
  assert.match(panel, /id="s02-localization-title"/);
  assert.match(panel, /id="s02-dealer-title"/);
  assert.match(panel, /创建草稿/);
  assert.match(panel, /验证草稿/);
  assert.match(panel, /审阅并发布/);
  assert.match(panel, /创建回滚草稿/);
});

test("S02 safe diff shows field paths and reference IDs, never CMS or Media bytes", () => {
  assert.match(panel, /差异只显示字段路径与引用 ID，不包含 CMS 正文、Media 字节或敏感内容/);
  assert.match(panel, /Media\/CMS\/Dealer 引用只显示 ID/);
  assert.doesNotMatch(panel, /maintenanceBannerRule\.message/);
  assert.doesNotMatch(panel, /displayReference\(.*homeContentRef/);
  assert.match(panel, /只显示 ID，不显示正文、文件字节或敏感内容/);
});

test("S02 lifecycle and accessibility contract", () => {
  assert.match(panel, /code === "VERSION_CONFLICT"/);
  assert.match(panel, /code === "SETTINGS_STATE_CONFLICT"/);
  assert.match(panel, /设置版本冲突（409）/);
  assert.match(panel, /设置状态冲突（409）/);
  assert.match(panel, /aria-modal="true"/);
  assert.match(panel, /useModalFocus/);
  assert.match(panel, /role="alert">\{rollbackError\}/);
  assert.match(panel, /aria-live="polite" role="status">\{sectionDirty/);
  assert.match(panel, /aria-atomic="true" aria-live="polite" role="status">验证完成/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /forced-colors/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /border-radius: 8px/);
  assert.match(css, /border-radius: 10px/);
});

test("S02 fences reads and mutations by actor generation abort and 401", () => {
  assert.match(panel, /AbortController/);
  assert.match(panel, /requestGeneration === generation\.current/);
  assert.match(panel, /requestActor === actorRef\.current/);
  assert.match(panel, /response\.status === 401/);
  assert.match(panel, /onUnauthorized\(\)/);
  assert.match(panel, /controllerRef\.current\?\.abort/);
});

test("S02 binds every response to submitted authority and installs the generation handshake", () => {
  assert.match(panel, /bindCreatedS02Draft\(draft, input\)/);
  assert.match(panel, /bindUpdatedS02Draft\(draft, submittedDraft, input\.value, input\.changeReason\)/);
  assert.match(panel, /bindS02Validation\(result, sourceDraft\.id, expectedVersion, sourceDraft\.status\)/);
  assert.match(panel, /bindS02Diff\(nextDiff, result\)/);
  assert.match(panel, /bindPublishedS02\(result, confirmation\.draft\.id, confirmation\.draft\.version\)/);
  assert.match(panel, /bindRollbackS02Draft\(draft, confirmation\.publication, submittedCurrentPublishedVersion\)/);
  assert.match(panel, /readinessConsumerRef\.current\.install\(result\.readiness\.publishedGeneration/);
  assert.match(panel, /dashboardS02SettingsReadiness\}\?consumerGeneration=\$\{appliedGeneration\}/);
  assert.match(panel, /confirmed\.consumerGeneration === appliedGeneration && confirmed\.publishedGeneration === appliedGeneration/);
});

test("S02 panel keeps the S01 panel independent and free of template artifacts", () => {
  assert.doesNotMatch(panel, /KPI|bar-chart|chart|recharts|zinc|#18181b|hsl\(240/);
  assert.doesNotMatch(panel, /process\.env|DATABASE_URL|SMTP_PASSWORD|MONERIS|ERP_SERVICE_TOKEN/);
  assert.doesNotMatch(panel, /SettingsFoundationPanel/);
});

test("S02 published-generation handshake never blocks safe config display", () => {
  assert.match(panel, /已安装发布代次 \$\{appliedGeneration\}/);
  assert.match(panel, /消费者确认尚未完成，仍显示权威状态/);
  assert.match(panel, /消费者确认暂时不可用，请刷新查看就绪状态/);
});
