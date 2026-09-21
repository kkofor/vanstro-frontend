import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const widgetSource = await readFile(new URL("./FloatingSupportWidget.tsx", import.meta.url), "utf8");
const supportSource = await readFile(
  new URL("../../lib/support/ai-support.ts", import.meta.url),
  "utf8"
);
const globalStyles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

test("support widget posts to the AI endpoint and renders an explicit contact fallback", () => {
  assert.match(widgetSource, /vanstroApi\.supportAiChat\(/);
  assert.match(widgetSource, /cannotConnectAssistant/);
  assert.match(widgetSource, /assistantMessage \?\?= unavailableMessage/);
  assert.doesNotMatch(widgetSource, /resolveAiSupportReply/);
  assert.doesNotMatch(widgetSource, /Azure|azure/i);
});

test("support widget uses the official shadcn message primitives without changing the API contract", () => {
  assert.match(widgetSource, /<MessageScroller/);
  assert.match(widgetSource, /<Message /);
  assert.match(widgetSource, /<Bubble /);
  assert.match(widgetSource, /<Marker /);
  assert.match(widgetSource, /<Button /);
  assert.match(widgetSource, /<Input\b/);
  assert.match(widgetSource, /setIsGenerating\(true\)/);
  assert.match(widgetSource, /setIsGenerating\(false\)/);
  assert.doesNotMatch(widgetSource, /assistant-ui|shadcn\.io/i);
});
test("support widget uses the refreshed visual language instead of the legacy launcher and grid", () => {
  assert.match(widgetSource, /MessageCircle/);
  assert.match(widgetSource, /className="support-prompt-chips"/);
  assert.match(widgetSource, /<Marker className="support-dealer-marker"/);
  assert.match(widgetSource, /variant=\{message\.role === "user" \? "default" : "muted"\}/);
  assert.doesNotMatch(widgetSource, /support-agent-v1-192|launcherTitle|launcherSubtitle/);
  assert.doesNotMatch(widgetSource, /support-prompt-grid/);
  assert.match(globalStyles, /\.support-prompt-chips\s*\{/);
  assert.doesNotMatch(globalStyles, /\.support-(?:widget|launcher|quick-actions)\b/);
});
test("support widget keeps suggestions in the message flow and avoids duplicate ready status", () => {
  const chipsIndex = widgetSource.indexOf('<div className="support-prompt-chips"');
  const messageContentEnd = widgetSource.indexOf('</MessageScrollerContent>');
  assert.ok(chipsIndex > widgetSource.indexOf("{messages.map"));
  assert.ok(chipsIndex < messageContentEnd);
  assert.match(widgetSource, /isGenerating \|\| status !== supportCopy\.ready/);
  assert.doesNotMatch(widgetSource, /<MarkerContent>\{status\}<\/MarkerContent>\}\) : null/);
});

test("support widget keeps the empty send control ink-colored and blocks empty submits", () => {
  assert.match(widgetSource, /if \(!draft\.trim\(\)\) return;/);
  assert.match(widgetSource, /aria-disabled=\{!draft\.trim\(\)\}/);
  assert.doesNotMatch(globalStyles, /\.support-chat-form \[data-slot="button"\]:disabled\s*\{\s*opacity/);
  assert.match(globalStyles, /\.support-chat-form \[data-slot="button"\]\[aria-disabled="true"\][^}]*opacity: 1/);
});
test("AI fallback signals render a contact path rather than a keyword resolver", async () => {
  assert.match(supportSource, /response\.fallback/);
  assert.match(supportSource, /export function resolveAiSupportReply/);
  assert.match(supportSource, /handoff: true/);
  assert.match(supportSource, /label: copy\.contactPage/);
});
