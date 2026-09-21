import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const panel = readFileSync(new URL("./RuntimeFoundationPanel.tsx", import.meta.url), "utf8"), shell = readFileSync(new URL("./DashboardF0Shell.tsx", import.meta.url), "utf8"), content = readFileSync(new URL("./DashboardF0ReadOnlyContent.tsx", import.meta.url), "utf8");

test("P09 mounts canonical runtime route before legacy loading", () => { assert.match(shell, /parseP09Location/); assert.match(shell, /runtimeLocation\.kind === "invalid"/); assert.match(content, /if \(runtimeLocation\) return <RuntimeFoundationPanel/); });
test("P09 consumes fixed list routes and selects detail locally", () => { assert.match(panel, /P09_CONFIG_ROUTE/); assert.match(panel, /P09_FLAGS_ROUTE/); assert.match(panel, /configs\.find/); assert.match(panel, /flags\.find/); assert.match(panel, /不发出第二个详情请求/); assert.doesNotMatch(panel, /validateConfigDetail|validateFlagDetail/); });
test("P09 distinguishes empty from degraded without secret values", () => { for (const text of ["当前集合为空", "已降级，未把失败当作空集合", "安全有效值", "功能开关不会授予后端权限"]) assert.match(panel, new RegExp(text)); assert.doesNotMatch(panel, /type=["']password["']|DATABASE_URL|SMTP_PASSWORD|ERP_SERVICE_TOKEN|MONERIS_API_TOKEN/); });
test("P09 fences actor and request generations", () => { assert.match(panel, /actorRef\.current !== actor/); assert.match(panel, /current !== generation\.current/); assert.match(panel, /AbortController/); assert.match(panel, /response\.status === 401/); });
test("P09 consumes exact summary and independently gated detail routes", () => { assert.match(panel, /readinessDetail = location\.view === "readiness" && gates\.readinessDetail/); assert.match(panel, /readinessDetail \? "detail" : "summary"/); assert.match(panel, /当前仅有摘要权限；详细原因未读取/); assert.match(panel, /readiness\.secondaryReasons/); });
