import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync(new URL("./SettingsFoundationPanel.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("./DashboardF0Shell.tsx", import.meta.url), "utf8");
const content = readFileSync(new URL("./DashboardF0ReadOnlyContent.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./SettingsFoundationPanel.module.css", import.meta.url), "utf8");

test("S01 owns Settings routes and mounts before legacy content", () => {
  assert.match(shell, /parseSettingsCenterLocation/);
  assert.match(shell, /settingsLocation\.kind === "invalid"/);
  assert.match(shell, /settingsLocation=\{settingsLocation\.kind === "valid"/);
  assert.match(content, /if \(settingsLocation\) return <SettingsFoundationPanel/);
});

test("S01B superseded has a stable visible label and history shows it", () => {
  assert.match(panel, /superseded: "已被后续版本取代"/);
  assert.match(panel, /statusLabels\[entry\.status\]/);
});

test("S01B 409 distinguishes version conflict from state conflict", () => {
  assert.match(panel, /code === "VERSION_CONFLICT"/);
  assert.match(panel, /code === "SETTINGS_STATE_CONFLICT"/);
  assert.match(panel, /设置版本冲突（409）/);
  assert.match(panel, /设置状态冲突（409）/);
});

test("S01B Shell access-mode copy follows server capability on the Settings route", () => {
  assert.match(shell, /settingsWritable/);
  assert.match(shell, /settingsCenterV1\?\.enabled && authorization\.settingsCenterV1\.actions\?\.publish/);
  assert.match(shell, /"Settings 受控写入"/);
  assert.match(shell, /"只读模式"/);
  assert.match(shell, /"媒体受控交互"/);
});

test("S01B Overview installs the published generation before claiming readiness", () => {
  assert.match(panel, /createSettingsReadinessConsumer/);
  assert.match(panel, /projection\.publishedGeneration, projection\.effectiveOverviewRefreshSeconds/);
  assert.match(panel, /dashboardSettingsReadiness\}\?consumerGeneration=\$\{appliedGeneration\}/);
  assert.match(panel, /matchedReadiness\.publishedGeneration !== appliedGeneration/);
  assert.match(panel, /reloadRef\.current\(\)/);
});

test("S01 fences reads and mutations by actor generation abort and 401", () => {
  assert.match(panel, /AbortController/);
  assert.match(panel, /requestGeneration === generation\.current/);
  assert.match(panel, /requestActor === actorRef\.current/);
  assert.match(panel, /response\.status === 401/);
  assert.match(panel, /onUnauthorized\(\)/);
  assert.match(panel, /controllerRef\.current\?\.abort/);
});

test("S01 future groups remain status-only without group-specific requests", () => {
  assert.match(panel, /coming-in-v1\/not_implemented/);
  assert.match(panel, /未挂载表单控件/);
  assert.doesNotMatch(panel, /dashboard\/settings\/(payments|email|commerce|webhooks|developer|provider)/);
  assert.doesNotMatch(panel, /type=["']password["']|process\.env|DATABASE_URL|SMTP_PASSWORD|MONERIS|ERP_SERVICE_TOKEN/);
});

test("S01 requires safe diff and explicit publish and rollback confirmations", () => {
  assert.match(panel, /确认发布设置草稿/);
  assert.match(panel, /确认创建回滚草稿/);
  assert.match(panel, /validateSettingsSafeDiff/);
  assert.match(panel, /validation\?\.issues\.some\(\(issue\) => issue\.severity === "blocker"\)/);
  assert.match(panel, /useModalFocus/);
  assert.match(panel, /aria-modal="true"/);
});

test("S01 loads safe diff only for an authoritative validated draft", () => {
  assert.match(panel, /if \(draft\?\.status === "validated"\) \{ const candidate = await getData\(API_ENDPOINTS\.dashboardSettingsDraftDiff/);
  assert.match(panel, /let nextDiff: SettingsSafeDiff \| undefined/);
  assert.doesNotMatch(panel, /if \(draft\) nextDiff = validateSettingsSafeDiff/);
});

test("S01 renders permission empty stale error readiness and conflict states", () => {
  for (const text of ["当前没有记录", "访问被拒绝", "快照已超过", "已降级", "版本冲突（409）", "就绪状态"]) assert.match(panel, new RegExp(text));
  assert.match(css, /:focus-visible/);
  assert.match(css, /forced-colors/);
  assert.match(css, /prefers-reduced-motion/);
});

test("S01 announces results and validation while lifecycle exposes busy state", () => {
  assert.match(panel, /aria-atomic="true" aria-live="polite" role="status">\{filteredRegistry\.length/);
  assert.match(panel, /验证完成：\{validation\.issues\.filter/);
  assert.match(panel, /aria-busy=\{busy \|\| state === "loading"\}/);
});

test("S01 rollback errors stay in the dialog and refocus the invalid field", () => {
  assert.match(panel, /aria-describedby=\{rollbackError \? "settings-rollback-error"/);
  assert.match(panel, /aria-invalid=\{rollbackError \? true : undefined\}/);
  assert.match(panel, /rollbackReasonRef\.current\?\.focus\(\)/);
  assert.match(panel, /role="alert">\{rollbackError\}/);
});

test("S01 keeps modal API failures local and fences duplicate mutations", () => {
  assert.match(panel, /if \(confirmation\) setDialogError\(errorMessage\)/);
  assert.match(panel, /\{dialogError \? <p aria-live="assertive"/);
  assert.match(panel, /if \(inFlightRef\.current\) return undefined/);
  assert.match(panel, /inFlightRef\.current = true/);
});

test("S01 edits only eligible drafts and binds every safe diff", () => {
  assert.match(panel, /kind: "updateDraft"/);
  assert.match(panel, /setValidation\(undefined\); setDiff\(undefined\)/);
  assert.match(panel, /candidate\.draftId === draft\.id && candidate\.draftVersion === draft\.version/);
  assert.match(panel, /bindSettingsDiff\(nextDiff, result\)/);
  assert.match(panel, /setValue\(String\(selectedDraft\.value\)\)/);
});

test("S01 treats 409 as a conflict requiring successful authoritative recovery", () => {
  assert.match(panel, /if \(status === 409\)/);
  assert.match(panel, /setConflict\(true\); setValidation\(undefined\); setDiff\(undefined\); closeConfirmation/);
  assert.match(panel, /if \(!recovering\) setMessage\(""\)/);
  assert.doesNotMatch(panel, /setState\("loading"\); setMessage\(""\)/);
  assert.match(panel, /if \(!recovering\) setConflict\(false\)/);
  assert.match(panel, /if \(recovering && requestGeneration === generation\.current && requestActor === actorRef\.current\) \{ setConflict\(false\); setMessage\("权威设置状态已重新载入。"\); \}/);
  assert.match(panel, /load\(\{ recovering: true \}\)/);
  assert.match(panel, /busy \|\| conflict/);
});

test("S01 post-validation diff uses a dedicated captured race guard", () => {
  assert.match(panel, /const validatedDraft: SettingsDraft = \{ \.\.\.sourceDraft, status: result\.status, version: result\.draftVersion/);
  assert.match(panel, /selectedDraftRef\.current = validatedDraft/);
  assert.match(panel, /const diffController = new AbortController\(\)/);
  assert.match(panel, /diffControllerRef\.current\?\.abort\(\)/);
  assert.match(panel, /diffGeneration !== generation\.current/);
  assert.match(panel, /diffActor !== actorRef\.current/);
  assert.match(panel, /currentDraft\?\.id !== diffDraftId/);
  assert.match(panel, /currentDraft\.version !== diffDraftVersion/);
  assert.match(panel, /currentDraft\.status !== result\.status/);
  assert.doesNotMatch(panel, /dashboardSettingsDraftDiff\(result\.draftId\), \{ signal: controllerRef\.current/);
});

test("S01 rollback binds current effective publication version", () => {
  assert.match(panel, /getData\(API_ENDPOINTS\.dashboardSettingsOverview/);
  assert.match(panel, /submittedCurrentPublishedVersion = overview\?\.publication\.version \?\? -1/);
  assert.match(panel, /expectedPublishedVersion: submittedCurrentPublishedVersion/);
  assert.doesNotMatch(panel, /expectedPublishedVersion: confirmation\.publication\.version/);
});

test("S01 mutation responses stay bound to requested authority", () => {
  assert.match(panel, /bindCreatedSettingsDraft\(draft, input\)/);
  assert.match(panel, /bindUpdatedSettingsDraft\(draft, submittedDraft, input\.value, input\.changeReason\)/);
  assert.match(panel, /bindSettingsValidation\(result, sourceDraft\.id, expectedVersion, sourceDraft\.status\)/);
  assert.match(panel, /bindSettingsDiff\(nextDiff, result\)/);
  assert.match(panel, /bindPublishedSettings\(result, confirmation\.draft\.id, confirmation\.draft\.version\)/);
  assert.match(panel, /bindRollbackSettingsDraft\(draft, confirmation\.publication, submittedCurrentPublishedVersion\)/);
  assert.match(panel, /void load\(\)/);
});

test("S01 rollback controls accept current producer targets only", () => {
  assert.match(panel, /!\["published", "superseded"\]\.includes\(entry\.status\)/);
  assert.match(panel, /sourceStatus: confirmation\.publication\.status/);
  assert.doesNotMatch(panel, /!\["published", "rolled_back"\]\.includes\(entry\.status\)/);
});

test("S01 create form has independent accessible errors and exact invalid focus", () => {
  assert.match(panel, /setCreateValueError\(structurallyInvalidValue/);
  assert.match(panel, /setCreateReasonError\(invalidReason/);
  assert.match(panel, /createValueRef\.current : createReasonRef\.current/);
  assert.match(panel, /aria-describedby=\{createValueError \? "settings-create-value-error"/);
  assert.match(panel, /aria-invalid=\{createValueError \? true : undefined\}/);
  assert.match(panel, /createValueError && isValidSettingsDraftValue\(nextValue\)/);
  assert.match(panel, /aria-describedby=\{createReasonError \? "settings-create-reason-error"/);
  assert.match(panel, /aria-invalid=\{createReasonError \? true : undefined\}/);
  assert.match(panel, /createReasonError && isValidSettingsReason\(nextReason\)/);
});

test("S01 draft selection clears prior PATCH field errors", () => {
  assert.match(panel, /useEffect\(\(\) => \{ if \(selectedDraft\) \{ setValue\(String\(selectedDraft\.value\)\); setReason\(selectedDraft\.changeReason\); setDraftValueError\(""\); setDraftReasonError\(""\); \} \}, \[selectedDraft\]\)/);
  assert.match(panel, /onChange=\{\(event\) => \{ setDraftValueError\(""\); setDraftReasonError\(""\); navigate\("lifecycle", event\.target\.value\); \}\}/);
});

test("S01 catches invalid PATCH input and focuses the exact accessible field error", () => {
  assert.match(panel, /try \{\s*input = validateSettingsUpdateDraftRequest/);
  assert.match(panel, /setDraftValueError\(structurallyInvalidValue/);
  assert.match(panel, /setDraftReasonError\(invalidReason/);
  assert.match(panel, /draftValueRef\.current : draftReasonRef\.current/);
  assert.match(panel, /aria-describedby=\{draftValueError \? "settings-draft-value-error"/);
  assert.match(panel, /aria-invalid=\{draftValueError \? true : undefined\}/);
  assert.match(panel, /draftValueError && isValidSettingsDraftValue\(nextValue\)/);
  assert.match(panel, /aria-describedby=\{draftReasonError \? "settings-draft-reason-error"/);
  assert.match(panel, /aria-invalid=\{draftReasonError \? true : undefined\}/);
  assert.match(panel, /draftReasonError && isValidSettingsReason\(nextReason\)/);
  assert.match(panel, /aria-invalid=\{rollbackError \? true : undefined\}/);
  assert.match(panel, /rollbackError && isValidSettingsReason\(nextReason\)/);
  assert.match(panel, /disabled=\{!capability\.actions\.updateDraft \|\| busy \|\| conflict\}/);
  assert.doesNotMatch(panel, /settings-draft-field-error|draftFieldError/);
  assert.match(panel, /setMessage\("设置草稿已保存。请重新验证后再发布。"\)/);
});

test("S01 unwraps every standard API response envelope", () => {
  assert.match(panel, /validateApiResult\(await response\.json\(\), validator\)\.data/);
  assert.match(panel, /arrayValidator\(validateSettingsRegistryEntry/);
  assert.match(panel, /arrayValidator\(validateSettingsDraft/);
  assert.match(panel, /arrayValidator\(validateSettingsHistoryEntry/);
  assert.doesNotMatch(panel, /return response\.json\(\) as Promise<unknown>/);
});

test("S01 successful create publish and rollback focus stable destination headings", () => {
  assert.match(panel, /document\.getElementById\(`settings-\$\{page\}-title`\)\?\.focus/);
  assert.match(panel, /navigate\("lifecycle", draft\.id, true\)/);
  assert.match(panel, /navigate\("history", undefined, true\)/);
  assert.match(panel, /navigate\("lifecycle", draft\.id, true\)/);
  assert.match(panel, /id="settings-history-title" tabIndex=\{-1\}/);
  assert.match(panel, /id="settings-lifecycle-title" tabIndex=\{-1\}/);
});
