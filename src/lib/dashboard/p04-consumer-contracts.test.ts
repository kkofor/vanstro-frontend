import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const root=new URL("../../",import.meta.url);
const source=(path:string)=>readFileSync(new URL(path,root),"utf8");

test("F0 Shell owns Audit URL before legacy and propagates canonical identity",()=>{const text=source("components/dashboard/DashboardF0Shell.tsx");assert.match(text,/parseDashboardAuditLocation/);assert.match(text,/auditLocation\.kind === "valid" \? new URL\(auditLocation\.canonicalHref/);assert.match(text,/auditLocation\.kind === "invalid"/);assert.match(text,/auditQueryState=\{auditLocation\.kind === "valid"/);assert.match(text,/key=\{`\$\{authorizationRequestIdentity/);assert.match(text,/auditLocation\.kind === "valid" \? auditLocation\.canonicalHref/)});

test("Dashboard data owns an isolated Audit cursor, identity and stale lifecycle",()=>{const text=source("components/dashboard/hooks/useDashboardData.ts");assert.match(text,/const auditCursorRef/);assert.match(text,/auditCursorRef\.current = \{ previous: \[\] \}/);assert.match(text,/auditQueryEnabled, auditSensitive, auditGlobalLegacy, asyncJobQueryEnabled, asyncJobSensitive, queryIdentity/);assert.match(text,/case "auditLogs"/);assert.match(text,/!auditGlobalLegacy \|\| hasStrictState/);assert.match(text,/strictAuditApiPath\(state, currentAfter\)/);assert.match(text,/queryResource === "auditLogs" \? \(\{ \.\.\.current, auditEvents: \[\] \}\)/);assert.match(text,/loadNextAuditPage/);assert.match(text,/loadPreviousAuditPage/);assert.match(text,/restartAuditQuery/)});
