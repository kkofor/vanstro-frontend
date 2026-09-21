import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("./AuditFoundationPanel.tsx",import.meta.url),"utf8");
test("Audit panel uses local Apply filters and shared accessible primitives",()=>{assert.match(source,/useState\(props\.query\)/);assert.match(source,/event\.preventDefault\(\);apply\(\)/);assert.match(source,/type="submit">应用/);assert.match(source,/<Table /);assert.match(source,/<DetailDrawer /);assert.match(source,/queryIdentity/);assert.doesNotMatch(source,/JSON\.stringify\(detail\.metadata/)});
test("Audit panel exposes no mutation or export surface",()=>{assert.doesNotMatch(source,/method:\s*["'](?:POST|PATCH|PUT|DELETE)/);assert.doesNotMatch(source,/onAction/);assert.doesNotMatch(source,/导出|export_job|download/i);assert.match(source,/只读展示服务器记录/)});
