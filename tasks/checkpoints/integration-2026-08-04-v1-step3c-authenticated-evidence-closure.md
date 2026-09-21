# Integration — v1 Step3C authenticated desktop evidence closure

Date: 2026-08-04
Status: **CORRECTED EVIDENCE COMPLETE**

## Root evidence gaps corrected

The Step3B authenticated result remains historical and is not rewritten. Its harness did not click Jobs, Media or Audit details, globally treated all 401/404 console messages as expected, and allowed aborted requests based on any historical success for the URL.

Step3C corrects only Integration QA/evidence:

- real Jobs row click, detail endpoint and visible safe fields;
- real Media Asset detail click, safe fields and zero provider/storage mutation;
- real Audit row click, detail endpoint and visible safe fields;
- console classification by current case, method, path, status and reason code;
- failed-request classification by current case+generation+method+URL with explicit `supersededBy` response;
- raw, expected and unexpected evidence retained separately.

No `src/`, `apps/`, `packages/`, Prisma or migration file changed.

## Commits and identity

- QA correction commit: `7352a8d58c20642878bccc141d22ed9b21a34403`, parent `aabc058ade065f93ab1ce8fb69950b212c3bac09`, tree `6317afcf2b62871dd9b67969bf15dbd3b34041d5`.
- Corrected evidence commit: `50a6b40c601f78eecb3a0c8dbd46cfd71154f090`, parent `7352a8d58c20642878bccc141d22ed9b21a34403`, tree `000091d53ef473aba4b5e3e5832fc479c5a2fae9`.
- Tested QA commit: `7352a8d58c20642878bccc141d22ed9b21a34403`.
- Corrected evidence is bound by `50a6b40c601f78eecb3a0c8dbd46cfd71154f090`.

## Corrected journey

Real Google Chrome/Playwright, desktop viewport `1440×1000`, controlled local fixture:

| ID | Result | Evidence |
|---|---|---|
| DESK-A01 Login | pass | POST login 200; post-login session projection 200 |
| DESK-A02 Foundation | pass | Shell, actor and module navigation visible; Foundation 200 |
| DESK-A03 Authorization | pass | Authorization 200; no contract error |
| DESK-A04 Operations/Readiness | pass | panel and system-ready state visible; detail 200 |
| DESK-A05 Jobs list + detail | pass | clicked first `查看`; detail GET 200; Job ID/type/status visible; drawer closed and list usable |
| DESK-A06 Work Queue | pass | fixture item visible; list/adapters 200; no mutation |
| DESK-A07 Notifications | pass | fixture notification visible; list 200; no mark-read mutation |
| DESK-A08 Media safe detail | pass | clicked Asset detail; detail and usages GET 200; safe name/ID/scope visible; no write/provider/storage/secret |
| DESK-A09 Audit list + detail | pass | clicked first `查看`; detail GET 200; event ID/action/resource/result/request ID visible |
| DESK-A10 Logout | pass | POST logout 200 and session invalidation |
| DESK-A11 Post-logout | pass | Foundation expected 401; actor absent; no Jobs/Media/Audit success |

Counts: `11 pass / 0 fail / 0 skip / 0 not-executed`.

Actual detail requests:

- `GET /api/v1/dashboard/jobs/123e4567-e89b-42d3-a456-426614174010?queryVersion=common-query.v1` → 200.
- `GET /api/v1/dashboard/media/123e4567-e89b-42d3-a456-426614174030` → 200.
- `GET /api/v1/dashboard/media/123e4567-e89b-42d3-a456-426614174030/usages` → 200.
- `GET /api/v1/dashboard/audit-logs/123e4567-e89b-42d3-a456-426614174040?queryVersion=common-query.v1` → 200.

## Raw / expected / unexpected

- Raw console errors: `10`.
- Expected console errors: `10`, each classified under DESK-A01/DESK-A10/DESK-A11 with exact path/status/reason code.
- Unexpected console errors: `0`.
- Raw failed requests: `9`.
- Expected failed requests: `9`, each either an exact Next dev hot-update abort or a same-case request with explicit current-generation terminal/success response in `supersededBy`.
- Unexpected failed requests: `0`.

Evidence:

- `tasks/evidence/v1-step3-desktop/authenticated-v2/result.json`
- SHA-256 `cc5d3efce6a0b0f90972c78971ed8ef81415e7bacd3b7b1688cafcdc20a62224`
- Eleven screenshots in the same directory.

## Verification and cleanup

- Python compile passed.
- QA identity/schema fields and tested commit verified.
- Real Chrome run passed all thresholds.
- `git diff --check` passed.
- Secret scans passed before each commit.
- Ports 4490/4491 closed; owned processes terminated; no container or database created.
- Integration protected `next-env.d.ts` and `next.config.mjs` remain byte-identical and unstaged.
- Step3B Git/scope/archive and Desktop Cross-Foundation 8/8 remain unchanged and were not rerun.
- Frontend, Backend, Main, stash and production were not touched.
- Unified Settings Center remains later v1 D16 scope. Known 20 security items remain v2. Mobile and AI Studio remain v3.

## Next action

Stop. Wait for a new explicit v1 feature prompt; do not begin Settings Center or any other feature from this checkpoint.
