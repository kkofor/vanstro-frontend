import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (rel: string) => readFile(new URL(`./${rel}`, import.meta.url), "utf8");

test("Overview workspace uses real Backend data, never mocks or fabricated zeros", async () => {
  const source = await read("OverviewWorkspacePanel.tsx");
  assert.match(source, /apiFetch\("\/dashboard\/overview"\)/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /Math\.floor\(Math\.random/);
  // zero values are only rendered for authorized data; unauthorized renders 无权限
  assert.match(source, /"无权限"/);
  assert.match(source, /entry\.value/);
  // shape validation guards invalid responses into the error state
  assert.match(source, /typeof data\.counts\?\.products !== "number"/);
  assert.match(source, /throw new Error\("invalid overview response"\)/);
});

test("Overview shortcuts point only at available+allow modules", async () => {
  const source = await read("OverviewWorkspacePanel.tsx");
  assert.match(source, /m\.status === "available" && shellNavVisible\(m\)/);
  assert.match(source, /shortcuts\.map/);
  // coming-soon modules must never become links here
  assert.doesNotMatch(source, /coming_soon[\s\S]{0,60}<Link/);
});

test("Overview states: loading, error+retry, generatedAt and queue summaries", async () => {
  const source = await read("OverviewWorkspacePanel.tsx");
  assert.match(source, /正在载入运营数据/);
  assert.match(source, /无法载入运营概览/);
  assert.match(source, /重试/);
  assert.match(source, /系统生成时间/);
  assert.match(source, /邮件待处理/);
  assert.match(source, /ERP 待处理 \/ 失败/);
  assert.match(source, /运营告警/);
});

test("Overview panel has no business write actions and no interactive coming-soon entries", async () => {
  const source = await read("OverviewWorkspacePanel.tsx");
  assert.doesNotMatch(source, /onSubmit|method:\s*["'](?:POST|PATCH|PUT|DELETE)/);
  assert.doesNotMatch(source, /dashboard\/payments|dashboard\/roles|dashboard\/applications|dashboard\/leads/);
});

test("Overview module CSS keeps compact toolbar cards, no heavy animations", async () => {
  const css = await read("OverviewWorkspacePanel.module.css");
  assert.match(css, /\.groups \{ display: grid/);
  assert.doesNotMatch(css, /@keyframes|animation:|transition:/);
  assert.match(css, /\.shortcuts a:focus-visible/);
});
