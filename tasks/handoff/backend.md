# Backend Handoff

## Current State — 2026-08-05 v1 S01B corrective readiness implementation

- The prior S01B completion was rejected at `1 Blocker / 0 High / 2 Medium`. This bounded Backend follow-up implements the frozen side-effect-free readiness handshake: `publishedGeneration` is the active append-only publication event sequence, missing/stale consumers are degraded, an exact applied generation is ready, malformed query input is stable 400, and the compiled default is generation 0/value 60.
- Publication and Overview DTO versions now project the event sequence. Create/rollback translate the public sequence to the immutable Migration74 function's internal active `settingsRevision` CAS after first checking the public sequence, so migrations 1–74 remain untouched and no migration75 exists. Publish responses are deliberately `consumer_generation_missing`/degraded until the Frontend installs the timer.
- Focused API `11/11`, API typecheck and shared Frontend typecheck passed. Full PG16/API/DB/Worker/static/Browser gates remain Integration work. Protected v2/security dirty assets remain excluded.
- CG01 and S02–S12 remain unauthorized; Main and production remain untouched.

## Previous Current State — 2026-08-05 v1 S01B Settings contract conformance closure

- S01B closed the S01 re-review findings (3 High / 7 Medium + 1 ACL) in Backend commit `91830e7` on `feature/backend` (9 files: migration74, settings.ts, settings-controlled.ts, schema.prisma, PG16 regression, harness support). It was integrated via normal merge into Integration `fdc6fe2`; review corrections (`139011f`) and accessibility corrections (`00914b3`) followed on Integration.
- Migration74 `20260805110000_s01_settings_contract_closure` adds the append-only `s01_settings_publication_event` object with immutable trigger, separates draft CAS from the descriptor-scoped global publication sequence, makes invalid/blocker/PATCH recovery real, separates VERSION_CONFLICT/SETTINGS_STATE_CONFLICT/not-found, records real P02 authority snapshots in Audit, and revokes PUBLIC EXECUTE on the S01 helper surface. Migrations 1–73 unchanged; no migration75.
- API layer: history served from the event stream; UUID/version boundaries; readiness consumer-generation binding; rollback eligibility from the current publication pointer; publish sourceDraftVersion is the draft's own CAS.
- Regular API PG16 harness now applies the S01 function layer + ACL surface (`scripts/s01-function-layer.mjs`); full API `244/0/12`; S01B PG16 regression `13/13`.
- Seven protected v2/security dirty assets remain byte-identical and excluded. Full details: `tasks/checkpoints/integration-2026-08-05-v1-s01b-settings-contract-closure.md` (Integration).
- Next action: stop; wait for a separately authorized bounded package. Do not begin CG01 or S02.

## Previous Current State — 2026-08-05 v1 S01 Settings core ready for focused commit

- Worktree/branch `.claude/worktrees/backend` / `feature/backend`; synchronized contract parent is confirmed Integration `eaa5a9dbdf83f286b8c04d9624093bdaedbd7513`. S01 implements the exact Settings routes (including PATCH draft), global `settings.read`/`settings.write` capability projection, one descriptor `settings.core.overview_refresh_seconds`, typed controlled lifecycle, CAS/idempotency, safe diff/history/rollback, side-effect-free readiness and transaction-bound immutable Audit.
- A forward migration73 is required because immutable migration43 rejects the exact S01 key and migration70 revoked generic runtime mutation. Source count/latest is 73 / `20260805100000_s01_settings_core`; migrations1–72 remain unedited by S01. S01 cadence is Settings UI polling only and is not P09 snapshot refresh.
- Green: focused contracts 20/20, focused API 3/3, S01 static 3/3, Regular API 224 pass/0 fail/12 skip, DB 50/0/36 skip, Worker 31/0/1 skip, Prisma generate/validate, monorepo typecheck and Backend build. Full package contracts after final Integration closure are 214/214 green.
- Initial Backend commit was integrated as `506f8b1`; independent review found 2 Blocker/2 High/2 Medium. Separate follow-up on authority contract `127a447561b4595d21949e66a36d52c858f7133f` repairs final unreleased migration73 bytes: inherited P09 constraints/authority2 Audit, nested P02 EXECUTE, external CAS revision, immutable operation ledger, global-only Settings ACL/fixed read key and correct `superseded` lifecycle. Final migration73 SHA is `02693c77d5a3de29d529a49acb950922202eaa85b93058de7cbd599fd46aa053`; true owned PG16 1–72 lineage plus migration73 apply passed.
- Final Medium closure uses settingsRevision consistently for diff/source draft CAS, exposes `superseded` verbatim through shared contract `e48a84d330d11c130cf13688d7897f200386d449`, and persists DB validation time for stable replay. Regular API is 225/0/12; focused Settings 4/4.
- Final five-Medium closure also binds diff to the draft base, namespaces legacy idempotency, persists updatedAt, links supersession Audit, and uses legal operation-specific Audit actions; obsolete migration73 v1 SQL is removed.
- Seven protected v2/security dirty assets remain byte-identical and excluded. Detailed checkpoint: `tasks/checkpoints/backend-2026-08-05-v1-s01-settings-core.md`. Follow-up commit is pending independent re-review/staged checks; next action is create the authorized separate local commit and hand SHA to Integration. No push, deploy, production or Main action.

## Previous Current State — 2026-08-04 v1 functional compatibility baseline committed

- Worktree/branch `.claude/worktrees/backend` / `feature/backend`; parent `960e7e6f8c6ab01982a5f2ee3ce94497ac07b7fe`; functional commit `2022bac2be35dc15b34d08043d0d1d9e644d0207`, tree `81af39a619eb6d6f82496f88965b5b393cb9a6f4`. The original 51 modified + 10 untracked bytes are recoverable at AI_OS `workspace/v1-step2-backend-dirty-snapshot/`, manifest SHA `44233e174178379c017302809e70d005d6145a64b5bd37b86759fc41c7a346e2`.
- A single forward-only functional migration72 replaces the mixed 72/73 draft: `packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql`, SHA `461d130913f471a26a680358ec76128734509863d51f8a2172581ba4a9d5a83e`; source migration count/latest is 72. Migrations1–71 remain unchanged. Original migration73 bytes remain only in the snapshot/v2 evidence.
- Normal-function compatibility covers Auth register/login/session/refresh/logout/reset; P02/P04 authorization/Audit read-write; P05 create/list/detail/cancel/retry; P06 queue/action/notification/source; P07 upload/job/detail/retry/fencing/rollback; P10 consent projection; and healthy-active Worker stale-alert behavior. AI Image Studio is v3 and not touched.
- Green gates: migration static `3/3`; disposable PG16 function/EXECUTE gate; stale alert `4/4`; Regular API `233 discovered / 221 pass / 0 fail / 12 intentional skip`; DB `50 pass / 36 intentional skip`; Worker `31 pass / 1 intentional skip`; contracts `212/212`; monorepo typecheck; Backend build; Prisma validate/generate; diff check. Focused owned raw-db-push attempts exposed fixture lineage gaps and are not claimed as passes.
- Known authorization/security remediation remains deferred and explicitly recorded in AI_OS `tasks/plans/v2-known-remediation-register.md`; this is not security certification. Detailed checkpoint: `tasks/checkpoints/backend-2026-08-04-v1-functional-compatibility-baseline.md`.
- Commit is complete. Remaining worktree state is intentionally limited to one modified and six untracked v2/security evidence assets recorded in the checkpoint and AI_OS register. Do not merge Integration, touch Frontend/Main/stash/production, push or deploy in this step.

## Previous Current State — 2026-08-04 SAFE STOP: migration72/73 rejected dirty draft preserved

- User ordered an immediate safe stop. Worktree/branch is `.claude/worktrees/backend` / `feature/backend`; exact committed HEAD is `960e7e6f8c6ab01982a5f2ee3ce94497ac07b7fe`, tree `40fbc5a91157eb22d95767f30168d1987e562ee3`. There are no staged files and no migration72/73 commit. Do not reset, stash, checkout, clean, rebase, amend, delete, stage, test, or continue this draft until a new Goal explicitly disposes it.
- The preserved untracked forward candidates are migration72 `20260804130000_f1_v15_runtime_acl_closure`, current SHA-256 `0ecae04f97bdae0e8b5f75b7f8270afd7b9dfdf6c77d289a42161f4298684283`, and migration73 `20260804140000_f1_v15_job_queue_media_acl_closure`, current SHA-256 `b6509a90bf7842ce41f40a2c025975651cbf12f11794b2aeb6675e1f05a15baa`. The dirty worktree has 73 migration directories, but only migrations1–71 are committed; migrations69/70/71 remain `442e8bd564ebf7f787e41a830d720428310c69ae928ab17bef4d9f4fc2a4d21a` / `5789b68576b375bc94adec6373b6c02a976c3e5a3813697c5bbadf266977713b` / `fdeb31836e907fa198cf995b973bd6ccd4a62ce03a291b5b9e3fc0317c66e41e`.
- Preserved modified files (51): `apps/api/src/audit/{foundation.ts,proof.integration.test.ts,query.integration.test.ts,query.ts}`; `apps/api/src/auth/{session.test.ts,session.ts}`; `apps/api/src/config.ts`; `apps/api/src/crm/service.test.ts`; `apps/api/src/dashboard/{access.ts,authorization.ts,catalog.ts,crm.test.ts,crm.ts,data-jobs.ts,dealers.ts,foundation.test.ts,jobs.integration.test.ts,jobs.test.ts,jobs.ts,media-metadata.integration.test.ts,media-retry.integration.test.ts,media.integration.test.ts,media.ts,p02-access.test.ts,p02-access.ts,p03-products-dealers.test.ts,sensitive-get.test.ts,system.ts,work-queue.integration.test.ts,work-queue.ts}`; `apps/api/src/operations/alerts.ts`; `apps/api/src/routes/{account-profile.test.ts,analytics.test.ts,analytics.ts,auth-cookie.test.ts,auth.ts,cart-invariants.test.ts,dashboard.ts,password-reset.test.ts}`; `packages/db/src/{async-jobs.ts,index.ts,media.ts,password.ts,work-queue.ts}`; `packages/db/src/generated/source-latest-migration.ts`; `scripts/{f1-migration71-owned-extension.txt,f1-migration71-owned-pg16.mjs,f1-migration71-static.test.mjs,test-api-regular-pg16.sh,test-f1-migration71.sh}`; and this handoff.
- Preserved untracked files (10): `apps/api/src/operations/alerts.test.ts`; both migration72/73 `migration.sql` files; `packages/db/src/auth-client.ts`; `packages/db/src/p02-p04-runtime-controlled.ts`; `scripts/{f1-migration71-strict-api.mjs,f1-migration72-static.test.mjs,f1-migration73-static.test.mjs}`; `tasks/checkpoints/backend-2026-08-04-f1-migration71-strict-acl-followup-blocked.md`; `tasks/checkpoints/backend-2026-08-04-f1-v15-migration72-runtime-acl-closure.md`.
- Completed evidence before the stop, none of which certifies the current final dirty SHA pair: committed migration71 static `4/4`, signed/attested PostgreSQL16 lineage and Regular `229 discovered / 217 pass / 0 fail / 12 intentional skip`; dirty stale-alert focused `4/4`; intermediate migration72/73 static up to `9/9`; DB/API/monorepo typechecks and Prisma generate/validate at earlier draft points; intermediate Regular `221 pass / 0 fail / 12 intentional skip`. Several intermediate strict runs reached `233/233`, but independent reviews invalidated them because the harness restored protected-table access and omitted attack cases. Do not cite those runs as production-equivalent or final evidence. No P09/P10/cross-Foundation final live browser certification was completed.
- Known blocking defects at stop include: strict harness still granting runtime `SELECT` on credential/session/RBAC/service-token/P05/P06/Audit/consent protected tables; general runtime password-reset issuance enabling chosen-token account takeover; scoped P02 grants missing canonical permission filtering; subject projection omitting Dealer membership/Location lifecycle; denied Audit provenance bypass; raw sensitive Audit and P05 rows crossing SECURITY DEFINER readers; P05 retry direct `async_jobs` access; whole-row P05/P07 command injection; P07 retry missing target scope and binding-hash/Variant recomputation; P06 assignment/reopen/Notification incomplete subject scope checks; unbound P06 source-state writer; multi-Dealer Work Queue Audit scope mismatch; independent Dealer/Location overlap allowing cross-pair authorization; incomplete exact owner/search-path/ACL/overload post-assertions and attack matrix. The added Auth role/client and other late edits were not fully reviewed or tested at the final SHA.
- No task-specific test process or disposable VanStro test container remained at stop. The unrelated long-running preview APIs under another job were left untouched. No production or persistent database, Frontend, Main, stash, deployment, push, payment/refund, ERP, or Email action occurred. Next action: wait for the new v1.0 functionality-priority Goal and begin with a read-only audit of this preserved dirty state.

## Previous Current State — 2026-08-04 Regular API observer-fixture harness follow-up

- Worktree/branch `.claude/worktrees/backend` / `feature/backend`; bounded follow-up parent is migration71 closure commit `9a8c9ab43cdaa2735a25485435b0f5057996de4e`.
- The only harness change adds a signature-only `public.p09_worker_observation_v3()` fixture to the disposable Regular PostgreSQL16 setup. It does not reproduce the migration71 SECURITY DEFINER body, role topology, ACLs or aggregation semantics; those remain owned by the attested migration gate.
- Node 22 Regular API verification passed `229 discovered / 217 pass / 0 fail / 12 intentional skip`. No migration, product implementation or ACL changed; no production/persistent database, deployment, push or stash action occurred.
- Commit status: this bounded harness follow-up is committed locally with this handoff. Next action: hand the focused commit SHA to Integration for reconciliation; do not deploy or apply a production migration.

## Previous Current State — 2026-08-04 migration71 compatibility closure verified and committed

- Worktree/branch `.claude/worktrees/backend` / `feature/backend`; work-unit parent/shared baseline `8e2ad7440d74403f8cfa0c0d7bbf32f2bf9ae86b`. Exactly forward migration71 `20260804120000_f1_v15_compatibility_closure` was added, final SHA-256 `fdeb31836e907fa198cf995b973bd6ccd4a62ce03a291b5b9e3fc0317c66e41e`.
- Migrations1–70 passed a saved 70-entry `shasum -c` inventory unchanged. Migration69/70 remain `442e8bd564ebf7f787e41a830d720428310c69ae928ab17bef4d9f4fc2a4d21a` / `5789b68576b375bc94adec6373b6c02a976c3e5a3813697c5bbadf266977713b`.
- Migration71 restores the exact 40-value Audit resource union and introduces one hardened DB-owned `p09_worker_observation_v3()` adapter. All platform Worker active/draining/shutdown/stale/capacity/error aggregates come from the existing lifecycle rows with one DB-time freshness boundary; stale rows do not poison latest success/failure/error. Readiness, Work Queue heartbeat and operational alerts no longer read `worker_heartbeats` directly. No Frontend-owned implementation changed.
- The migration71 harness pins and extends the frozen owned conformance harness in the same database lifetime. Real Node Ed25519 bootstrap, signed old-call telemetry, signed deployment attestation, migration70 consume/replay denial, then migration71 all passed on disposable PostgreSQL16. Evidence includes fresh 1–68→bootstrap→69→concurrent→signed70→71 and same-lineage 70→71, exact 31 old68 signatures, Audit 40 positive/unknown reject, observer active/draining/shutdown/stale/capacity/error mapping and leak denylist, exact owner/SECURITY DEFINER/search_path/one-overload/PUBLIC-runtime-Worker ACL matrix, runtime SELECT/INSERT/UPDATE/DELETE denial, and failure transaction rollback without partial residue.
- Node22 final gates: static `4/4`; Audit registry `2/2`; focused API `12/12`; Backend typecheck/build; Prisma generate/validate; strict owned API `229 discovered / 229 pass / 0 fail / 0 skip` plus post-suite ACL assertions. Full failure history is preserved in `tasks/checkpoints/backend-2026-08-04-f1-v15-migration71-compatibility-closure.md`.
- No production/persistent migration, provider/storage action, deployment, Frontend/Integration/Main change, push or stash operation. Commit status remains pending final read-only reviews and staged checks. Next action: if final reviews remain free of Blocker/High, stage only this Backend work unit, run staged diff/secret checks, create the authorized focused local commit, and hand its SHA to Integration for full-stack reconciliation.

## Current State — 2026-08-04 F1 v1.5 Phase B migration70

- Worktree/branch `.claude/worktrees/backend` / `feature/backend`; parent `6102fb64404df4383ede415ebdc7e9dc5a079684`, shared Main baseline `f96bb80e9b024352408372440d803072980dbe43`.
- Added exactly migration70 `20260804110000_f1_v15_phase_b`; migrations1–69 are unchanged and migration69 remains SHA-256 `442e8bd564ebf7f787e41a830d720428310c69ae928ab17bef4d9f4fc2a4d21a`. No migration71 or Frontend component changed.
- Migration70 is a single atomic transaction containing the complete frozen authority plus active-only P09 v3 list and safe P10 release-family boundaries. It consumes attestation before DDL, revokes superseded signatures, and checks owners/search paths/ACLs. P10 provider uses exact frozen HMAC raw-UUID framing and 12-field assertion framing; deterministic command identity preserves idempotent replay; caller proof remains forbidden.
- Node22 gates passed: static migration70 3/3; owned PG16 migration/attestation/31-old-signature/ACL/conformance matrix; focused provider/P09/P10 API 7/7; Prisma generate/validate; Backend typecheck/build; DB 48+36 intentional skips; Worker 31+1 intentional skip; contracts 201/201. Regular API on the shared configured local DB was 179 pass/3 existing public-analytics fixture failures/12 intentional skips; focused Phase B remained green. No production/persistent migration or deploy.
- Detailed evidence: `tasks/checkpoints/backend-2026-08-04-f1-v15-phase-b-migration70.md`. Commit is pending final staged gates at handoff write time. Next action: hand the focused Backend commit to Integration for owned full-stack/compatibility verification; do not create migration71 or deploy.

## Current State — 2026-08-04 F1 v1.5 Phase A migration69 EXPAND

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; parent/shared Main baseline `f96bb80e9b024352408372440d803072980dbe43`. Joint FROZEN authority is parent package manifest `e6c3cb275b3ecee17022418586613f6739757802b705bd17444b5c95be5a6e8f` plus clarification manifest `68040ee6b95cdba8439cc4a733d124b7d518fb48a073ac093c2607bbcc7eb0f1` frozen by Integration `bb3d122`.
- Exactly migration69 `20260804100000_f1_v15_expand` is present. Its `migration.sql` is byte-identical to clarification `generated/09-migration69-executable-authority.sql`, SHA-256 `442e8bd564ebf7f787e41a830d720428310c69ae928ab17bef4d9f4fc2a4d21a`. Migrations1–68 were not modified; migration70/71 do not exist.
- Prisma expresses migration69-compatible Foundation/P09/P10 columns and sealed-release tables. Generated source-latest is 69 and API readiness imports that generated authority. P09 config/flag reads and readiness summary/detail use exact v2 controlled functions. P10 uses independent `analytics.ingest`, removes raw-event GET, exposes sealed release GET, and switches ingestion to the v5 authority function. P08 upload-complete endpoint authority was removed from the shared contract. Worker deployment now fails closed without the independent lifecycle DB credential.
- Node22 verification passed: parent manifest 25/25 and clarification manifest 21/21; parent authority 40/40, baseline extraction 6/6, HMAC 5/5, cancel 5/5, clarification 93/93; migration69 static 2/2; owned PostgreSQL16 clarification conformance passed 31 exact old68 signatures, crypto/ACL/P02/P04/P09/P10 positive and negative matrices, plus migration70 missing-attestation rollback proof (migration70 was not created/applied to source). Prisma generate/validate, Backend typecheck/build, focused DB 6/6, focused API 4/4, Worker config 10/10, regular DB rerun 48 pass/36 intentional skips, Worker 31 pass/1 intentional skip, package contracts 201/201 passed.
- Full API without a root `.env` was not a valid regular run: 28 failures were configuration bootstrap (`DATABASE_URL` absent), with 90 pass/6 skips. Persistent/local and production databases were not accessed. No deploy, production migration, provider, push, migration70/71, or Stage C occurred.
- Frontend impact: remove the upload-complete symbol/positive assertion, consume P09 summary/detail routes and sealed P10 release wire, and ensure no raw individual events request. Integration must reconcile the shared API contract and run owned API/browser/full-stack gates.
- Commit/integration status: focused Backend commit pending at handoff write time. Next action: review/stage/secret-scan/diff-check and create the authorized local Backend commit, then hand its SHA to Integration. Contract70 attestation remains intentionally incomplete and blocks migration70.

## Current State — 2026-08-03 P08 migration64 security closure

- Parent is unified blocked baseline `89f197d2b27ad2a25248f892757025ee02e85ff5`; canonical v1.2 stays byte-identical at `128ae596734963b77269e18e01894789733de782449033a5669bcf8b8f28db9d`.
- Exactly migration64 `20260803110000_dashboard_p08_runtime_permission_boundary` revokes runtime/PUBLIC direct access to all four P08 tables and introduces a NOLOGIN guard-owner, fixed-search-path, operation-specific SECURITY DEFINER boundary. API now routes P08 table access through typed DB functions bound to persisted session/P02 scope; worker/system functions bind P05 Job lease/resource. No dynamic SQL/general CRUD/P09/P05 Artifact schema change.
- Owned PG16 evidence passed m63 failure baseline, `0→64`, `55→64`, `62→64`, `63→64`, all four tables × four verbs denial, function owner/PUBLIC/helper/shadow attacks and controlled same-session adapter positive path.
- Node22 gates: type/build/Prisma passed; focused API `17/17`; boundary `3/3`; contracts `191/191`; DB `42` pass + `33` gated skips after one unchanged P07 timer flake rerun; Worker `30` + `1` skip; API `177` + `12` gated skips. Integration must execute owned-disposable gated suites and canonical browser matrix before certification.
- Evidence: `tasks/checkpoints/backend-2026-08-03-dashboard-p08-migration64-security-closure.md`. No production/local persistent migration, merge, deploy, P09 or migration65.

## Current State — 2026-08-03 Dashboard P08 v1.2 Import/Export Foundation

- Worktree `feature/backend` continues from shared P07 baseline `f2c3879c58184c951d5dc7b04babf7659f23e12e`; the original P08 dirty draft was preserved and forward-corrected, not reset or reconstructed.
- Frozen authority: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p08-import-export-foundation-contract-v1.2-20260803.md`, SHA-256 `128ae596734963b77269e18e01894789733de782449033a5669bcf8b8f28db9d`.
- Path B is implemented: create returns `awaiting_upload` with no Job/Artifact; the sole controlled PUT atomically creates the uncommitted parse Job and sole P05 source Artifact, transitions to `uploaded`, consumes token, and records Audit/idempotency before commit. No upload-complete route, preview nonce, equal-or-narrower scope, duplicate P08 Artifact metadata, or P05 availability/fencing schema extension remains.
- Migration 63 SHA-256 is `be8770e4eee6ed6889ab520b98cea2d87924c9a419b45cf0687233d20053b4d4`; exactly four P08-owned tables, no P05 backfill/extension. Owned PG16 fresh `0→63`, `55→63`, `62→63` and runtime role matrix passed. Migrations 1–62 remain unchanged.
- Node 22.22.2 gates passed: Prisma generate/validate, full TypeScript, Backend builds, focused API `17/17`, focused Worker `9/9`, focused DB `6/6`, contracts `173/173`, DB `39` pass/`33` intentional skips, Worker `30` pass/`1` intentional skip, API `177` pass/`12` intentional skips. An earlier API attempt without root `.env` failed configuration bootstrap and is not counted.
- Detailed evidence: `tasks/checkpoints/backend-2026-08-03-dashboard-p08-v12-import-export-foundation.md`.
- No merge, push, deployment, production migration/storage action or P09. Next action: create the focused Backend domain commit, then hand it to Integration with the separately corrected Frontend v1.2 commit.

## Current State — 2026-08-03 Dashboard P07 retry-safe DTO

- `feature/backend` adds the optional safe Asset response field `retryBinding: { jobId, jobVersion, variants: [{ role, expectedVersion }] }`; callers use the existing Asset `version` as retry `expectedAssetVersion`. Response and mutation-request types/validators are intentionally distinct.
- The field and row `manageVariants` capability are emitted only for exact read/manage scope, failed/resolved Asset, one exact bound failed `media.process.v1` Job, unexhausted unexpired retryable Job, exact resolved execution-binding role parity, and the complete failed Variant set with no processing/missing applicable role. All other states omit the field and set the row capability false. The retry route enforces the same predicate under locks.
- Regression coverage includes authorized DTO, read-only omission, Dealer A/B cross-scope denial, unbound/wrong/stale/terminal/nonretryable/exhausted/expired Jobs, processing or missing applicable Variants, stable replay and a leak denylist for payload/attempt/lease/fencing/storage/checksum/config/actor internals.
- Node 22.22.2 verification passed: owned PostgreSQL 16 strict API `203/203`, shared contracts `152/152`, full TypeScript, and all Backend builds. Migrations 56–62 remain byte-identical at their recorded checksums; no migration 63 was added.
- No merge, push, deploy, production/storage action or P08 work occurred. Next action: hand the focused local commit to Integration for reconciliation and full-stack verification.

## Current State — 2026-08-03 Dashboard P07 migration 62 runtime closure

- `feature/backend` has a focused local P07 migration-62/runtime closure commit; no merge, push, deploy, production/storage action or P08 work occurred.
- Migration 62 `20260802156000_dashboard_p07_source_binding_audit_metadata` is SHA-256 `ed56e2d7e919dcca6d12913bb4c502bffd2e53a60cdae40d0c8975b4ac51e3a1`. Migrations 56–61 remain byte-identical at the hashes recorded in `tasks/checkpoints/backend-2026-08-03-dashboard-p07-migration62-runtime-closure.md`.
- Owned PostgreSQL 16 migration matrices passed fresh `0→62`, `55→62`, `60→62`, and `61→62`. Reported completion gates: serial owned API shell exit 0 with `202/202`; DB `36` pass / `33` intentional skips; Worker `21` pass / `1` intentional skip; contracts `151/151`; Prisma generate/validate passed.
- Node 22.22.2 typecheck, Backend build and native Linux JPEG/PNG/WebP/PDF plus unsafe/crash/flood/inode/block/hang are reported as passed in this Backend run; Integration must rerun them before promotion. Static export, Chromium and authenticated P07 browser verification were not run for this migration-62 Backend closure and must be run by Integration. The checkpoint maps review risks 12–21 to exact changed source/tests and records preservation/repair of the original three dirty API tests.
- Production remains release `3904a440` at 41 migrations. Next action: hand the exact focused Backend commit hash from the completion report to Integration for independent reconciliation and full-stack verification. Do not deploy or begin P08.

## Current State — 2026-08-03 Dashboard P07 v1.13 source-operation binding erratum

- Authorized v1.13 minimal erratum is frozen externally at `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p07-media-library-contract-20260802.md`; it documents the v1.12 immediate-FK/immutable-trigger/post-acceptance-binding conflict and authorizes only the one-time audited source-operation binding transition.
- Exactly migration 61 `20260802155000_dashboard_p07_source_operation_binding` was added. Migrations 56–60 remain byte-identical. Migration 61 preserves the immediate FK, defines unbound `upload_staging/written` as the legal pre-Job state, adds a private transaction binding marker plus SECURITY DEFINER entry point, and permits only versioned `NULL → exact queued media.process Job`; clear/rebind/mixed/terminal/stale writes fail closed.
- Upload acceptance creates the post-Asset/original-Variant unresolved execution binding, writes P04 binding Audit, and binds operation/Job in the same transaction. P05 execution binding remains the only R→R+1 authority; P02 scope equality, P04 Audit rollback, P05 fencing/idempotency, and P06 failure overlays remain inherited. Native readiness is restored to real persisted per-kind strict attestation; malformed/stale/mismatched rows fail closed.
- Node 22.22.2 evidence passed: typecheck, Backend builds, contracts 151/151, focused binding 8/8, no-conflict DB unit 35 pass/1 intentional skip, fresh PostgreSQL 16 Worker 20/20, Linux strict gate JPEG/PNG/WebP/PDF plus unsafe/crash/flood/inode/block/hang, owned PostgreSQL 16 migration matrices fresh 0→61, P06 55→61 and P07 60→61, and the serial owned API command exited 0.
- The broad shared-fixture DB integration command remains non-green only because historical suites concurrently truncate/reseed the same fixture; the isolated no-conflict DB unit, binding, Worker, migration and serial owned API evidence passed, so this is recorded as test-harness pollution rather than a P07 product failure. Production remains 41 and untouched. No deploy/push/P08/storage migration occurred.
- Next action: hand the focused local v1.13 Backend commit to Integration for independent reconciliation and full-stack verification. Do not merge, push, deploy, begin P08 or apply production migration.

## Current State — 2026-08-03 Dashboard P07 Media Library Foundation (v1.12 fail-closed closure, still blocked)

- Worktree remains `feature/backend` at committed HEAD `b59e9486a8c27238325de44a307b2edea144443c` / tree `f52e2c099feb08830d7622b3cbb55b15d9ac6f51`, with the v1.12 forward delta intentionally uncommitted because security/contract blockers remain. No reset/rebase/stash, merge, push, deploy, production/storage operation or `vanstro_dev` access occurred.
- Native readiness is now unconditionally fail-closed in the shared DB service: API capability reports image/PDF upload disabled, intent creation returns `MEDIA_PROCESSING_UNAVAILABLE`, and the Worker publishes only failed/zero-capacity attestations and does not claim `media.process`. The standalone Linux parser test compose remains evidence for parser-image controls only and cannot enable runtime processing.
- PDF Name `#xx` normalization now rejects encoded `OpenAction`/`JavaScript`/`JS` forms; Linux gate covers literal and encoded fixtures. Private filesystem publication now uses same-filesystem non-overwriting rename plus destination-directory fsync instead of copy/unlink. Migration59 harness now snapshots exact through-58/through-59 migration sets and validates the active Node 22 runtime.
- Media mutation transactions now acquire the canonical actor row lock before transaction-local authorization for intent creation/consume, metadata, Usage attach/detach, retry, archive and restore. Usage DTO counts and Usage list rows filter through current target permission/scope/existence. Expired retry conflict maps to a stable 409 Media conflict.
- Frozen authority is v1.12, 1,420 lines, SHA-256 `5bfeb0d3ddacdb3be69ce38484adac9953c04ca95492c66a642cd399a621801c`.
- Migration 60 implements bounded retry-command/HMAC-kid retention under the v1.11 role topology. Current SHA-256 is `e21c71a427413675719fa25c22f64cdbd65d4b400624ce8a9a10937b5120f2c3`; migrations 56–59 remain byte-identical at `3319634df960a24c23f64bd26c4bef0169438cf3626dda32dcfa079c2106e413`, `14ef85ea337145b07333046f04c15f91a6271e2c07f997939fedf3e3c29c2c6b`, `2670324b81c180ad70d42df726d92871546fdbc45374833c19ca327eefd7fe38`, and `3cb2a3248f3f6d625cb1522dedeac12cfced4625cb572a6021ae18ca584d1f77`.
- Verified current work includes API+Worker bounded retention ownership, persisted retry-key/tombstone readiness, parser/upload heartbeats, generation binding dimensions, atomic Asset/Variant/Job/Attempt publish transaction, exact `mediaFoundationV1`, list request ID and per-Asset capabilities, and server-derived Usage locales for the six final enabled targets. `email_template` remains disabled per normative §30.8.
- Passed evidence: Node 22 full TypeScript and Backend build; package contracts 151/151 before the final wire additions and affected contracts/typecheck after them; focused DB 21/21; Worker retention/parser 7/7; migration60 owned PostgreSQL 16 fresh 0→60 and 59→60; Linux Media gate with JPEG/PNG/WebP/PDF plus unsafe/crash/flood/inode/block/hang fixtures. A disposable all-suite run exited zero at the shell level but contained fixture/concurrency failures and is not counted as a clean full-suite claim.
- Genuine frozen-architecture blocker: ledger-before-provider-write requires a committed `MediaStorageOperation` before staging publication, but `media_storage_operations.jobId` has an immediate FK to `async_jobs`; `media.process` Job creation derives its unresolved generation binding from the post-upload Asset/original Variant state; and immutable migration58 permits a written operation update to change only `state`, so `jobId` cannot be attached after publication. Creating the Job first produces the wrong pre-acceptance binding/order; creating the operation first with the future Job ID violates the FK; updating `jobId` later violates the trigger. Migrations 56–60 are immutable and frozen v1.12 authorizes no migration61. Exact source-operation Job binding therefore requires a contract erratum authorizing a forward migration61/deferred FK or a redesigned binding relation/order. It cannot be honestly closed in this work unit.
- Other forward repairs are implemented in the dirty tree: API/Worker attempt immediate cleanup through the fenced cleanup service after finalization failures; successful upload transaction emits Asset/Variant/Job/intent Audits; SQL Usage target filtering applies to DTO counts/list, `referenced`, `usageEntityType`, and archive Audit count; canonical actor-row locks precede transaction-local authorization for every Media mutation; expired retry returns stable 409 and cannot advance generation; attempt scratch is removed on the success path and runtime processing is disabled so no new parser attempt can be launched. Metadata PATCH now NFC-normalizes/trims tags, deduplicates and default-sorts the unique canonical values before enforcing the 32-tag bound, so Backend never returns a tag array rejected by the strict Frontend consumer. Focused unit/migration/Linux evidence passed as recorded below. Broader fault/interleaving tests remain desirable follow-up evidence, but with native creation/consume/process strictly disabled they are not an exploitable enabled path and are not the remaining architectural decision.
- New deterministic evidence on Node 22.22.2: focused Worker 7/7, focused DB 21/21, direct metadata PATCH/strict-consumer regression 1/1 on owned disposable PG16 role topology, full TypeScript, Backend build, package contracts 151/151, Linux parser gate including encoded PDF Names, migration59 owned PG16 fresh 0→59 and 58→59, and migration60 owned PG16 fresh 0→60 and 59→60 all passed. The full DB/API/Worker suites were not rerun after fail-closed changes because the work unit remains blocked.
- Next action: obtain one explicit contract decision only: authorize a v1.13 erratum plus forward migration61 for the source-operation/Job binding transition (or authorize a redesigned binding/order). Until then preserve this dirty tree, native upload/process remains strictly disabled, and do not stage/commit.

## Previous Current State — 2026-08-02 Dashboard P07 Media Library Foundation (v1.11 remediation in progress)

- Frozen v1.11 contract: 1,389 lines, SHA-256 `f42a977c4fae0cb7eda2bc919fa22f7a9c8bef553343fac323dc63fbe0fe8075`.
- Source migration 59 and isolated PG16 role-boundary harness are uncommitted pending a final green rerun; migration59 is not applied to `vanstro_dev` or production. Current source checksum is `ca8da8553dee215f194376f4aae9ec77eb40bc347b8bd30701097fc28456fa10`.
- Pre-existing/now-observed local DB history mismatch blocks existing-DB claims: root `.env` points to Homebrew PG17 `vanstro_dev`; its migration table contains both canonical `20260730135000_catalog_sync_cleanup` SHA `71ab…` and source-absent `20260730200000_catalog_sync_cleanup` SHA `c9303c4c…`, 64 successful rows versus 59 source directories. Do not migrate, resolve, reset, seed or otherwise write that database; existing-DB status/preflight is blocked until coordinator disposition.
- Migration59 verification is owned disposable PG16 only. Docker daemon became unavailable after host disk exhaustion/recovery, so the last attack-matrix rerun is blocked and no completion claim is made.


- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; exact parent `a943b0f71d4d04db7fd9b9bb8f3d25f85ef59fc3`, tree `cef668658128acfcf26e374cab20bbe934eb5141`; worktree was clean at start.
- Frozen authority: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p07-media-library-contract-20260802.md`, v1.9, 1,319 lines, SHA-256 `475cee49e120b0996921b929f3e8a94c17b4e97905ffc3eebd86979c834fce90`.
- P07 implements native Media persistence and strict permissions; private filesystem provider; HMAC upload intents and retry commands; durable operation ledger, readiness attestation, pending expiry/cleanup, usage locks/targets, execution-binding resolution/fenced selection; native list/detail/adapters/upload/metadata/usage/archive/restore/retry/preview/download API; generic internal P05 Media Jobs; P06 Media failure type and row-aware source permission; parser process and pinned Linux topology. ProductAsset and 1,327 public assets remain read-only legacy truth with no backfill or URL/file mutation.
- Exactly migrations 56 and 57 were added. Existing 1–55 remain immutable; migration 55 SHA is `0d0b3ee77699a93489d3645cfb97acb7f4149a2cf6a27d8cbf922712db55de8d`. Local upgraded 55→57 and owned disposable fresh 0→57 passed. Production remains 41 and was not accessed.
- Node 22.22.2 verification: full TypeScript, Prisma generate/validate/status, all Backend builds, DB 18/18 with 23 intentional skips, API 173/173 with 8 intentional skips, Worker 14/14 with 1 intentional skip, contracts 151/151 and existing-database preflight. Docker Engine 29.6.2 linux/arm64 real gate passed pinned image/PDF success plus crash/output/inode/block/hang negative fixtures, core=0, UID10001, seccomp/no-new-privileges, no network, read-only root and bounded tmpfs.
- No Frontend component, P08, deployment, production migration/storage/provider, push/fetch/stash or legacy mutation occurred.
- P07 v1.10 forward remediation closes the Integration 29-finding root groups through focused commits `d8e6da4`, `6997325`, `afc6613`, `04ce621`, `ae3f9c9`, and `403f4e1`; final tip/tree `403f4e1e48f0e61694d94cbdd56b80879d9e6968` / `af7df6ab4563b0ec67472f5894a1e5a073745138`. Exactly migration 58 was added at SHA-256 `2670324b81c180ad70d42df726d92871546fdbc45374833c19ca327eefd7fe38`; immutable migration 56/57 checksums remain `3319634df960a24c23f64bd26c4bef0169438cf3626dda32dcfa079c2106e413` / `14ef85ea337145b07333046f04c15f91a6271e2c07f997939fedf3e3c29c2c6b`.
- Final Node 22.22.2 gates: TypeScript/build passed; DB 19 pass/28 intentional skips; API 173 pass/8 skips; Worker 14 pass/1 skip; contracts 151/151; fresh 0→58 and migration58 raw-SQL 5/5 passed. Real Docker Linux gate passed JPEG/PNG/WebP/PDF, unsafe PDF, crash/flood/inode/block/hang, core0/UID10001/no-network/read-only. Production remains 41 and untouched.
- P07 v1.11 §35 authorizes source-only migration 59 under a separate PostgreSQL role topology. Migration 59 is added at SHA-256 `3cb2a3248f3f6d625cb1522dedeac12cfced4625cb572a6021ae18ca584d1f77`; migrations 56–58 remain byte-identical. It replaces the migration58 caller-settable delete phase with guard-owner SECURITY DEFINER functions, a private transaction nonce ledger, exact runtime detach grant, fixed-table migrator retention, direct DELETE revocation and fail-closed role/owner/grant assertions. The detach service now invokes the exact function after transaction-local authorization resolution and target validation.
- Independent owned Docker PostgreSQL 16 role-topology matrices passed fresh `0→59` and `58→59`, including direct DELETE/GUC/ALTER/DROP/CREATE/SET ROLE/retention-call/object-shadow attacks, exact one-row detach, ineligible/eligible retention, and owner/grant/membership checks. Node 22.22.2 typecheck/build, DB 20 pass/28 intentional skips, API 173 pass/8 intentional skips, Worker 14 pass/1 intentional skip and contracts 151/151 passed. `vanstro_dev` was not accessed or migrated and remains at 58; production remains 41 and untouched.
- Commits `04213241109bead0ad043d60f2d99f5c6ff274f5` and `dda62be4c1ca9cc7b82ebae4031404cc853263f4` are an incomplete attempt and do not close P07 review findings 1–4. Exact remaining evidence gaps: no deterministic long/chunked/false-Content-Length matrix; no upload lasting beyond the 30-second lease; no stale-owner, request-abort or process-crash recovery proof; no injected post-put database-failure compensation or prepared/writing startup recovery proof; no Linux ancestor/component swap race matrix spanning put/publish/read/metadata/delete; and no independent archived preview versus original-download authorization matrix for published Usage.
- The owned disposable PostgreSQL 16/API proof only established short exact upload 200, sequential duplicate 400, short underflow 400, persisted failed Intent/Asset, exact object bytes/checksum, and zero temporary residue. DB tests passed 22 with 28 intentional skips; Worker passed 14 with 1 intentional skip; package contracts passed 151/151; Backend typecheck/build and migration59 matrices passed. These results are insufficient for findings 1–4. The ordinary full API command was attempted without root `.env` and failed configuration bootstrap before valid execution.
- Current remediation tip before further forward-only work is `2d817e60b18ac7f9f38b502d7d70dcb1e9803ad1`. Migrations 56–59 remain immutable; `vanstro_dev` and production must not be accessed or changed. Frontend impact remains unknown until archived delivery behavior is independently proven.
- Next action: add deterministic owned disposable PG16/API/filesystem tests for every listed gap, fix only reproduced behavior, rerun full Backend gates, and make a forward-only closure commit only when green.

## Current State — 2026-08-02 Dashboard P06 Work Queue and Notifications

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; work-unit parent `ba24069d643a36b9fcdf3f46e73b1a5e699f374f`; shared Integration baseline at start `cb74647bf982d2a6bca47df2acfa9ca87d0a5ebb`.
- Frozen contract v1.8 SHA-256: `164443da75a494dd817b3aa7786dd06b074dedcbf9a29fe96578834a5f5a4aa0` (949 lines).
- Functional commit: `364c4287f7ea920dc4d039f3f96c0c2c2c835fcb`; v1.2 follow-up: `ea71bace9688701c041eeb13059ebb202a8d6fbb`; v1.3 follow-up: `fbac78c452d7f269028db53a4f164ecbf63ae720`; v1.4 follow-up: `08e4626a8327e58b2ff7f71cb8fa10f2b88915b3`; v1.6 action/evidence closure: `be1ddff49d7d6216ef0b7829f9a9a4dcf23ff2a9`; no-migration semantic closure: `a90065e8460540de92f89d12297f710aff28729d`, tree `5470244503a48cb93415200f9d4c4ae0a397c7ae`.
- P06 adds native scoped Work Items, recipient-specific in-app Notifications, source health, test-only `foundation.attention`, rotating HMAC dedup/readiness, typed transitions/reconciliation/cleanup, strict frozen cursor queries, repeatable-read exact summary, read-only Domain adapters and same-transaction P02/P04 enforcement. Queue actions never mutate Domain state or P05 Jobs.
- P06 v1.6 uses exactly migrations 47–53. Migrations 47–51 remain immutable; migration 52 action guards are `723ff4960c1e8f699729ac2d97126c097893e3c8d85d9933652ff85e876ffdc9`; migration 53 exact reopen assignment guard is `9de8aa14b707c31cc9726362ec40ab64416c73d328674bbaae194a096cf3a687`. Local `vanstro_dev` followed `51→52→53`; fresh owned `0→53` passed; production remains 41 and was not accessed.
- Final follow-up closes terminal/orphan actions, atomic fresh observation plus update Audit, every mutation denial/conflict best-effort Audit, and exact assignment preservation/clear during reopen.
- Post-v1.6 no-migration follow-up closes request-time inactive/scope-lost assignment projection, orphan dismiss capability, action-specific reasons, severity SLA/critical Notification rollback, and reopen assignee preview races. Migration count remains exactly 53.
- Verification passed: full TypeScript, DB/API/Worker builds, Prisma generate/validate/status, existing-DB preflight, DB 13 pass/0 fail/21 intentional skips, API 173 pass/0 fail/8 intentional skips, Worker 12 pass/0 fail/1 intentional skip, contracts 141/141. Final isolated fresh P06 DB is 14/14 and independent API is 4/4; all temporary databases were dropped.
- Detailed evidence: `tasks/checkpoints/backend-2026-08-02-dashboard-p06-work-queue-notifications.md`.
- Frontend impact: consume fail-closed `workQueueFoundationV1` and exact Queue/summary/adapters/Notification DTOs in the separate read-only Frontend P06 work unit. Do not mount mutation controls, mix adapter/native counts or equate unread with open.
- P06 v1.7 authorizes exactly migration 54; migrations 47–53 remain byte-identical. Migration 54 checksum is `64539e67329683c2c651b8d183129898b52444cffb61d9df63288235417b3b6f` and adds only exact action-specific/internal reason predicates. Local `53→54` and fresh owned `0→54` succeeded; production remains 41 and was not accessed.
- v1.7 wires implemented adapter query health into persisted SourceState with same-transaction Audit, no repeat Audit, and rollback/fail-closed behavior; index and reopen now acquire the canonical raw-identity advisory lock before Work Item row locking, eliminating the inverse-lock deadlock window. Focused fresh DB passed 12/12 and focused fresh API passed 1/1. Full TypeScript, all Backend builds, DB 13/13 with 22 intentional skips, API 173/173 with 8 intentional skips, Worker 12/12 with 1 intentional skip, contracts 141/141, Prisma validate/status and existing-database preflight passed under the available Node 25.9.0 runtime (repository engine warning expects Node 22).
- P06 v1.8 authorizes exactly migration 55; migrations 47–54 remain byte-identical. Migration 55 checksum is `0d0b3ee77699a93489d3645cfb97acb7f4149a2cf6a27d8cbf922712db55de8d` and replaces only the expiry predicate: `foundation.attention` can never expire, while a future non-registered expiring type requires `attentionExpiresAt <= CURRENT_TIMESTAMP`, exact `attention_expired`, coherent terminal retention and the existing exact changed-column family. Local `54→55` and fresh owned `0→55` passed; focused fresh DB is 13/13. Production remains 41 and was not accessed.
- Next action: hand the focused local Backend v1.8 commit to Integration for final full-stack verification. Do not deploy, begin P07, add external delivery or add a production-native Work Item producer.

## Previous State — 2026-08-02 Dashboard P05 Async Job Foundation

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; shared parent `a882dc6e41ffa2cedf3c9df8c55ba76bb3dd08ac` / tree `1a6af45d7e361e62be8fad49fe2d8b51ceb9177a`.
- Frozen contract v1.2 SHA: `a464ff90cb01d5048246efde3b5219a3279134355747336f1a59f60f6979a3d0`.
- Functional commit: `af7695f23f822eef72b741f33ff7a531da5df4b7`; tree `c1de1adc7d7da892f58dfb62d4bc042c22f84660`.
- P05 adds native AsyncJob/Attempt/Artifact foundations, test-only `foundation.probe`, PostgreSQL claim/concurrency/lease/deadline/fencing/recovery, HMAC rotating idempotency, retry generations, cancellation/progress, safe DTOs, scoped P02/P03/P04 integration, read-only legacy adapters and a deployment-no-op Worker dispatcher.
- P05 v1.2 has exactly three source migrations 44/45/46. Migration 44 remains immutable at SHA-256 `a6e7dac74fb05dc3b5fa7579d8aee2222b7631f241bcf1fee38b3bd80dd7d0f5`; 45 extends only the Audit resource CHECK; 46 replaces only the Attempt trigger function. Local applied 43→46; fresh owned disposable 0→46 passed; production remains 41 and was not accessed.
- RBAC bootstrap created 6 permissions/16 grants/0 assignments, then 0/0/0. No existing extra grants were removed.
- Verification passed: full TypeScript, all Backend builds, Prisma generate/validate/status, existing-DB preflight, DB 10 pass/0 fail/8 intentional skips, API 170 pass/0 fail/7 intentional skips, Worker 12 pass/0 fail/1 intentional skip, contracts 132/132. Fresh disposable P05 DB 7/7, API/Audit 1/1 and isolated Worker/Audit 1/1 all passed and databases were dropped.
- Detailed evidence: `tasks/checkpoints/backend-2026-08-02-dashboard-p05-async-job-foundation.md`.
- Frontend impact: consume fail-closed `asyncJobFoundationV1` plus strict `async-job.v1` list/detail/adapters in a separate read-only Frontend work unit. Backend follow-up now matches the frozen Frontend wire exactly: versioned summary/error envelopes, exact artifact metadata, and exact adapter/meta shapes. SHA-256 checksum is non-sensitive integrity metadata in both field profiles; storage references remain omitted. No Frontend component was changed here.
- Final adversarial follow-up closes four Integration findings: exact frozen-range Job cursor, discriminated progress DTOs, generation-local wire attempts, and artifact-identity same-transaction Audit with rollback proof. Fresh disposable DB is 8/8 and API pagination/drift is 1/1; full gates remain green. No migration or Frontend component changed.
- Terminal evidence follow-up makes Attempt close counters explicit: complete uses authoritative input values while fail/cancel/recovery use current persisted values. Fresh DB regression proves succeeded/partial Job-Attempt parity and complete transaction rollback on Attempt, parent or Audit failure. Full gates remain green; no migration or Frontend change.
- Next action: hand the focused P05 Backend commits to Integration, reconcile shared DTO/capability and rerun full-stack/browser gates. Do not deploy, begin P06, register a business-executable type or expose artifact download.

## Previous State — 2026-08-02 Dashboard P04 Audit Foundation

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; parent/shared baseline `44043891b7c0b29196418e6819bd2cdd9c0a6863`.
- Functional commit: `f91e741dff61cf5c14dea6734904e22069e39d8f`; tree `5c22e162542c3f180b5c22e90844ec6e381cf18e`.
- Frozen contract SHA: `40181858a76f4f09e47968b4f6c6848eb2c74c462305a8d2f2ae9c0d18738539`.
- P04 implementation is committed, with a follow-up pending commit for canonical RBAC reconciliation and real scoped Audit query proof. It retains exactly one source migration/model for immutable `AuditEvent`, safe recorder/registry and metadata/summary validation, P02 membership/location plus Category transaction-bound proofs, strict scope-aware Audit list/detail, profile-specific cursor/default range, retention and server readiness capability.
- Strict and legacy Audit dispatch are exclusive. Scoped actors cannot call the global legacy handler. Sensitive fields require exact supplementary grant scope equality. P03 Products/Dealers cursor grammar remains unchanged.
- Local `vanstro_dev` migrated 42→43 and is up to date. Final owned disposable `vanstro_p04_audit_disposable_1785658390` passed fresh 0→43, complete P04/P02 API proof 12/12 and Prisma/raw SQL immutability 1/1, then was dropped with zero database residue. Two safe immutable P02 membership-update rows from an earlier pre-guard run remain locally and are recorded in the checkpoint; final full API kept the count stable at 2→2.
- Verification: full TypeScript and Backend builds passed. Follow-up API is 167 pass/0 fail/6 intentional disposable-only skips, DB 6 pass/0 fail/1 intentional skip, Worker 11/11 and contracts 124/124. Fresh 0→43 owned disposable scoped Audit proof passed 1/1, then the database was dropped. Existing-database preflight and diff check passed; local migration status remains exactly 43/up to date with no migration diff.
- Canonical bootstrap now reconciles all existing manifest roles: name/`isSystem`, missing manifest grants only, extra grants retained, no user assignments. Local runs proved `grantsCreated` 1→0 and installed `dealer_admin` → `audit_logs.read`.
- Detailed evidence: `tasks/checkpoints/backend-2026-08-02-dashboard-p04-audit-foundation.md`.
- Frontend impact: consume required `auditFoundationV1`; strict Audit UI is a separate Frontend P04 work unit. No Frontend component was changed here.
- Next action: hand functional commit `f91e741dff61cf5c14dea6734904e22069e39d8f`, continuity commit `98e75a2c1c6b423fef3bdd43301e0126d3e28c47`, and the focused RBAC/scoped-query follow-up to Integration. Production deployment must run the existing migration chain plus canonical bootstrap per runbook; do not add a P04 migration, deploy, or begin P05.

## Current State — 2026-08-02 Dashboard P03 Common Query / Search Contract

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; parent/shared baseline `d3665ac9206b53b2a56c35091bf4f2cbd031a40d`.
- Functional commit: `0199a87f5827fe2ef9d171aba60b00491428ce91`; tree `50fa4d6f9cce316a18fc4963ff7414fb36040a21`.
- Frozen contract SHA: `2bbdf5c4378414defddb71743a0d7898f453c21b1a914f1eb2a1c194edd98684`.
- P03 adds typed `common-query.v1`, eight-profile registry, strict parser/error precedence, RFC8785-style JCS domain fingerprints, AES-256-GCM versioned keyset cursor, Products strict offset proof, Dealers scope-bound immutable-ID cursor proof, and exact `dashboard-authorization.v1.commonQueryV1` capability.
- Strict proof requests use an authorization-first PostgreSQL-serialized dual sliding limiter: 10 accepted/second and 60 accepted/minute, per actor/profile, fail closed on store failure. Legacy requests retain existing policy.
- Permanent security exceptions replace CRM PII search with `QUERY_SEARCH_UNSUPPORTED`, apply resource-specific safe CRM list/detail/mutation DTOs, and apply one safe Reconciliation GET/PATCH serializer. Supplementary PII/reference grants must themselves be global for these global-only resources.
- Overview Dealer count now executes only when both `dashboard.access` and `dealers.read` are global. Authenticated Dashboard responses are private/no-store.
- No Prisma schema/migration, Global Search endpoint/UI, Saved View, Export/Import, new business mutation or P04 was added.
- Node 22.22.2 post-review verification: API `156/156`, DB `5/5`, Worker `11/11`, package contracts `119/119`, full TypeScript, Backend build and existing-database preflight passed; Prisma generate/validate and 42-migration status passed in the same work unit. Destructive smoke remained safely blocked on `vanstro_dev`.
- Detailed evidence: `tasks/checkpoints/backend-2026-08-02-dashboard-p03-common-query.md`.
- Seven iterative correctness/security review passes found and closed all High/Medium issues. Readiness exposes non-secret cursor activeKid and key-byte-sensitive/order-independent generationHash; cursor validation is phase-split; oversized precedence is complete after semantic phase B; and ASCII search uses deterministic PostgreSQL `C` collation/folding plus literal escaping inside the Products repeatable-read transaction. Strict capabilities remain false unless explicit server-owned readiness confirms q/after log redaction, telemetry suppression, and Dashboard no-referrer policy. A coordinator audit caught that the first reported fourth-review repair was not on disk; this was corrected and verified by direct Read/rg plus real PostgreSQL tests. Seventh final correctness and security reviews found no remaining High/Medium issue.

### Frontend impact

- Consume strict Products/Dealers only when the exact per-resource `commonQueryV1.*.enabled` property is true; missing/malformed is false.
- Adapt CRM presenters to omitted PII and remove/disable CRM `q`; any legacy `q` now returns `QUERY_SEARCH_UNSUPPORTED`.
- Adapt Reconciliation GET/PATCH presenters to optional guest/provider fields and exact safe event/order DTOs; raw provider identifiers are permanently unavailable.
- Strict adapters are additive; CRM/Reconciliation/Overview security corrections are permanent and do not roll back when query capability is disabled.

### Remaining issue / next action

- Hand functional commit `0199a87f5827fe2ef9d171aba60b00491428ce91` plus this continuity commit to Integration for normal integration. Frontend must consume the exact capability/DTO contract; do not deploy or enter P04.

## Previous State — 2026-08-02 Dashboard P02 Identity / RBAC / Data Scope

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; parent/shared F0 baseline is `c0156c51c448e8e3298c68b1dbf66cdeb0cc927b`.
- P02 adds persisted Dealer membership, dealer-scoped roles, explicit Location grants, validity/revocation/revision state, one source migration `20260731310000_dashboard_p02_identity_scope`, idempotent RBAC bootstrap, and explicit-ID-only membership backfill.
- Authorization now preserves provenance per permission as `PermissionGrant { permissionKey, global, dealerIds, locationIds }`. No actor-level global flag can promote another permission. Scoped P02 handlers query only their required permission’s grant; unmigrated Domain routes require that permission itself to be global.
- Original security High is closed by deterministic regression: unrelated global `dashboard.access/content.read` plus Dealer A scoped `dealer_admin` cannot promote `dealers.read`, list/read Dealer B, or read Dealer B locations. The regression also found and closed a separate Dealer-detail IDOR caused by an overridden duplicate `id` query key.
- Security follow-up excludes dealer-scoped direct `UserRole` permissions from the global permission ceiling, freezes dealer-scoped/system role scope identity, re-authorizes membership mutations under the shared transaction lock order, acquires Actor+target users together to avoid reciprocal lock inversion, preserves Location scope on membership reads, and rejects unknown authorization decision/role-scope/module-permission tuples.
- `dashboard-authorization.v1` action entries expose permission-specific scopes; the top-level scope is only a summary and can be `mixed`. Shared validation rejects malformed or contradictory scopes. Dealer module projection and GET ACL both use `dealers.read`.
- Membership create/update independently require global `users.manage` and global `settings.write`; Location status mutation requires global `settings.write`. Empty Location grants mean no locations. No email/query/frontend selection or business data infers membership.
- Local `vanstro_dev` reports 42 migrations and up to date. A disposable empty database applied 0→42 with 42 successful/0 failed and was removed. No staging/production database was accessed.
- Node `22.22.2` verification passed: DB `5/5`, focused P02/security/ACL suites, full API `137/137`, Worker `11/11`, package contracts `112/112`, full TypeScript, Backend build, Prisma generate/format/validate/status, and existing-database preflight. Bootstrap second run created 0 records/grants/assignments; empty explicit backfill dry-run returned 0 requested/valid/inferred.
- `qa:protected-artifacts` was not a valid source-only gate because generated `out/careers/index.html` is absent; it stopped with ENOENT. Protected-content source contracts passed and no protected artifact changed.
- Detailed checkpoint: `tasks/checkpoints/backend-2026-08-02-dashboard-p02-identity-rbac-scope.md`.
- Two independent final read-only re-reviews found no remaining reproducible High/Medium in the repaired permission provenance, scope laundering, role identity, membership TOCTOU/lock order, Location reads, or validator paths.
- Backend P02 functional commit: `793d9aa269fc92411e68d54ccd557b9f19ffa343` (parent `c0156c51c448e8e3298c68b1dbf66cdeb0cc927b`, tree `450b250518ff65bd4aae1166f9507d07094afaac`). Frontend, Integration, and Main remain on F0; no P02 merge/promotion/deploy occurred.

### Frontend impact

- Frontend will consume `GET /api/v1/dashboard/authorization` / `dashboard-authorization.v1` only after the Backend commit is closed.
- Action-level `scope` is authoritative for permission UI. Top-level `scope` is a non-authoritative summary and may be `global`, `mixed`, `dealer`, `location`, or `unavailable`.
- Direct routes and controls must fail closed from the action’s decision/scope; they must not infer global access from role names or the top-level summary.

### Remaining issue / next action

- Hand Backend commit `793d9aa269fc92411e68d54ccd557b9f19ffa343` to the separate Frontend work unit for contract consumption; do not enter P03 or deploy.

## Previous State — 2026-07-31 F0 Dashboard foundation

- Follow-up from `a1bae346a9399ec6cab40921addfe53dc94baba1`: shared runtime validation now accepts exactly the three server-producible shell tuples and rejects contradictory disabled/internal `enabled: false` combinations. Endpoint, ACL, environment handling, permissions, and business behavior are unchanged.
- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`; original work-unit parent was `1c4fe35301840fe157437f141df0441861c6125c` and both original and follow-up trees were clean at start.
- Added read-only `GET /api/v1/dashboard/foundation` with contract `dashboard-foundation.v1`, minimal actor ID/safe label/role labels, canonical known-module permission projection, explicit `scope: unavailable` / `fields: permission-only`, shell readiness, and response request ID.
- Shell flag key is `dashboard.shell.v2`. Only exact server env `DASHBOARD_SHELL_V2_MODE=internal` plus an actor ID in `DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS` enables it; missing, empty, illegal, or exceptional config is disabled. Header/query/body/cookie values do not override server config. Every shell state remains `readOnly: true`.
- The route uses the existing Dashboard ACL and `dashboard.access`; no permission, seed, schema, migration, backfill, business mutation, Frontend component, Worker, or deployment file changed.
- Shared `api-contract.ts` and runtime validation now expose and fail closed on the typed foundation contract, known module/route pairs, denial reasons, and consistent shell/readiness state.
- Deterministic verification on Node `22.22.2`: focused foundation `5/5`, package contracts `75/75`, full API `126/126`, full TypeScript passed, and Backend build passed. Destructive `api:smoke` was attempted with the local environment and safely blocked because `vanstro_dev` is not a test/smoke database; its guard was not bypassed.
- No deployment, production write, migration/seed/schema action, push, real payment/refund, or ERP action occurred.
- Detailed checkpoint: `tasks/checkpoints/backend-2026-07-31-dashboard-foundation.md`.

### Frontend impact

- Frontend may later consume `API_ENDPOINTS.dashboardFoundation` with `validateDashboardFoundation`; no Frontend page/component was changed in F0.
- Existing handler-level permission drift remains at `apps/api/src/routes/dashboard.ts`: system-role permission replacement checks noncanonical `system.settings.write`, while canonical `INITIAL_PERMISSIONS` contains `settings.write`. F0 intentionally did not modify that business mutation or its test fixture.

### Remaining issue / next action

- Integrate the focused Backend F0 commit into `integration/fullstack`, then run full-stack contract verification before any Frontend shell adoption.
- Correct the existing `system.settings.write` handler-level drift only in a separately authorized mutation work unit.

## Previous State — 2026-07-30 production full-stack 3904a440

- Backend release source `3904a4404ada5b0107a08d5b9c71a3100f22b447` / product baseline `e9bc0a2a17d094e859fee5fa065b318b15d0ad7f` is deployed.
- API and Worker run immutable Linux amd64 image `sha256:6a67d850086f9abd2adf7ba6ecbe4a6d6badfa361f8abea7d07482b61897204d`; final API health was healthy/restart 0 and Worker heartbeat was fresh/restart 0.
- Production database remains 41 successful migrations / 0 failed. No production migration or schema change occurred.
- ERP endpoint remains absent and 8 historical `inventory_release` jobs remain pending; no jobs were released. Payment reconciliation/refund and failed email queues were 0 at close.
- Pre-deploy image `sha256:eca739e5dd5d114a3f5f748bdab5cde999815b5db6540191b6f437e20ece08aa`, logical backup, PITR evidence and rollback commands are retained.
- Detailed checkpoint: `tasks/checkpoints/production-2026-07-30-fullstack-3904a440.md`.

## Previous State — 2026-07-30 API test state isolation

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Backend worktree was strictly fast-forwarded from `dc59ba5ca592d74bc39d9482868c672ad6a70f82` to blocked candidate `aeaa54064b18cbcbd5ca1947f2c45f2f801f2b91` before this work unit.
- Current scope is limited to the provisional Dashboard count-timepoint fix plus distributed rate-limit and Cart/Checkout test fixture isolation. No public API, product behavior, Frontend, schema, migration or deployment configuration changes are intended.
- Dashboard now observes the real Prisma aggregate values from the same request instead of comparing a later global count. Production default queries and authorization remain unchanged.
- Deployment auth-cookie tests own a unique `auth:<test-ip>` bucket and delete only that key. Cart/Checkout concurrent tests await every sibling before cleanup; successful Checkout tests own private catalog/inventory fixtures and delete them child-first by exact ID.
- Final validation on Node `22.22.2`: targeted default-concurrency matrices and comprehensive stress passed; the real default `pnpm test:api` passed five consecutive times `121/121`, with exact database and rate-limit state restoration after each counted run.
- Detailed evidence: `tasks/checkpoints/backend-2026-07-30-api-test-state-isolation.md`.
- Backend implementation/evidence commit: `3f1688000825e8e9bf03e143bddbcee2c35425b8` (parent `aeaa54064b18cbcbd5ca1947f2c45f2f801f2b91`, tree `9675a8c903a9dc968429dbf8a3a3d49c81197245`). Independent Dashboard and state-isolation reviews are closed with no remaining reproducible finding.
- Integration merge, Main promotion and candidate refreeze remain pending coordinator verification.

## Previous State — 2026-07-29 commerce invariant work unit

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Worktree/branch: `.claude/worktrees/backend` on `feature/backend`
- Backend cycle-start HEAD/tree: `d0632581aeeb0d6839165dedc27e8fb27c0d78d9` / `86ef0be1c4e0ad48d0cf0947217f5e7730c141ba`.
- Backend was clean, had no active process/session path references, and was a Main ancestor. It was strictly fast-forwarded without reset/rebase/stash to `626772fd347967a0b067864f605eb63298e90245` / tree `ea5164f7e4f03d74b32798d2767bcaf84ee203de`.
- Cycle-start Main and Integration were both `626772fd347967a0b067864f605eb63298e90245` with the same tree. Frontend was `69319575e3317070a90a2aa94cf1c9e5e6d32e3a` and was a Main ancestor.
- This work unit is limited to Cart/Price currency and final-quantity invariants plus duplicate-provider reconciliation visibility and regression tests.
- The repository still has 41 migration directories. Current design review found existing Cart/Price/PaymentSession/Event fields sufficient; no schema or migration change is planned unless implementation proves otherwise.
- The repository-closure state below is historical. Its old frozen tip, baseline, and pending-integration wording must not override current Git facts.
- Production remains the separate Fullstack9 release. Local work is not pushed and does not authorize deployment, production migration, real payment/refund, ERP actions, stash operations, or branch/worktree cleanup.

### Current implementation and verification

- Cart and Checkout now enforce a single CAD price domain and fail closed when a Cart item has no active price matching the Cart currency.
- Cart add, PATCH, concurrent add, and guest-to-customer merge enforce final quantities in `1..999` under advisory locks.
- Checkout reloads and compares the Cart under its creation lock. Identical concurrent intents reuse one session; different payloads yield one winner and one `409` conflict.
- Duplicate provider transactions are classified without replaying order, inventory, Cart, or refund side effects. Same-session duplicates create a reconciliation event while preserving paid/refund state; cross-session provider ID reuse marks the losing session `reconciliation_required`.
- Dashboard reconciliation includes paid sessions carrying duplicate-transaction events and redacts `guestOrderToken`, nested guest tokens, and `paymentInit` from that queue.
- No schema or migration changed. Local migration status remains 41 and up to date.
- Verification passed: Cart `10/10`, Payment `10/10`, Checkout `8/8`, DB `3/3`, full API `121/121`, Worker `11/11`, package contracts `40/40`, Backend typecheck/build, Prisma generate/validate, transactional/static security gates, existing-database preflight, diff check, and credential scan.
- Post-test inventory invariant query found `0` negative or over-reserved snapshots.
- `api:smoke` was safely blocked before execution because `vanstro_dev` is not a test/smoke-named database and the destructive-smoke guard was not bypassed.
- Detailed evidence: `tasks/checkpoints/backend-2026-07-29-commerce-payment-invariants.md`.
- Backend functional commit: `3baa95609cc3aa773561a49c6bff9b7258ce960c` (tree `7d65b643f853e6aeb5ad91b065303ce2a4350112`).
- Independent review found and verified fixes for the resolved-Cart add race, shared inventory-fixture pollution, target-lock waiter determinism, Checkout conflict determinism, and release-job cleanup. Final read-only re-review found no new reproducible defect.
- Coordinator Integration merge/full-stack verification and Main promotion are not yet recorded at this point.

## Historical Backend work-unit state — 2026-07-28

- Backend work-unit functional commit: `be3ccb417d0aa21530b5dc0356d1263b391f38b8`; handoff tip after that work unit: `9ec365f3087986d112a1a691bd216cb071431eb6`.
- Backend work-unit parent/shared baseline at start: `28a635d1d2e9e28d51828a7ae2ec3d19f4f1c713`.
- Original backend/full-stack integration baseline: `d99da7b8ccdaa378209873066a99f272881dd893`.
- Backend/production-code baseline commit: `8f001ffe840cc8423322daf22dbed8b2ecad0ad7`.
- Last work-unit verification: 2026-07-28. The historical “not pushed, merged, or deployed” wording describes that completion point; current integration status is stated above.

## Current backend baseline

- Hono API, PostgreSQL/Prisma, independent Worker, Dashboard API, Website CRM, transactional email outbox, inventory reservations, ERP queues, and deployment manifests are present.
- Authentication uses secure session cookies, lifecycle locking, rotation/revocation, PBKDF2 credentials, CSRF origin enforcement for cookie-authenticated writes, and deny-by-default Dashboard RBAC.
- Password Reset uses a generic anti-enumeration response, 32-byte random token, SHA-256 token hash, 30-minute single use, transactional claim, credential upsert, lifecycle lock, session revocation, EN/fr templates, canonical HTTPS application URL, and public error code `AUTH_RESET_INVALID`.
- Password-reset email security values are encrypted in the outbox when an encryption key is configured; deployment fails closed without the key. Worker decrypts only for rendering, requires a published security template, and clears EN/fr reset payloads after successful delivery.
- Payment includes Moneris Checkout MCO preload/receipt verification, server-side refund support, provider transaction number persistence, confirmation recovery, reconciliation, and concurrency protections.
- Checkout includes idempotency, pending-session replay, reservation locking, safe supersede/resume behavior, and cart clearing after finalization.
- Worker heartbeat and stale ERP/email queue alerts remain intact.
- PostgreSQL backup/PITR scripts and production Compose configuration remain in the baseline.
- Prisma has one `PasswordResetToken` model/relation and retains the deployed `20260730290000_password_reset_tokens` migration. The incompatible duplicate incoming migration was excluded.
- Production currently has 41 migrations according to the latest production checkpoint; do not infer a production migration from local source alone.

## Verification at shared baseline

- Full TypeScript: passed
- Prisma schema validate: passed
- DB tests: 3/3
- API tests: 105/105
- Worker tests: 11/11
- Package contracts: 9/9
- Runtime error localization: 52 maintained backend literals and dynamic messages passed
- Static/full-stack gates are recorded in `tasks/handoff/integration.md`.

Worker tests include explicit encrypted security-payload decryption and fail-closed behavior without the encryption key.

## Completed work-unit scope

Status against the original Account Profile objective:

- **Completed and verified:** canonicalize the GET/PATCH account response, add shared input/response contract validation, add API and package-contract regression coverage, and update this Backend handoff.
- **Partially completed by design:** the frontend client now types and validates the PATCH response, but the existing Profile UI compatibility GET remains until a Frontend-owned follow-up after integration.
- **Not completed:** no unrelated Backend candidates were added to this work unit.
- **Not verified in this work unit:** browser interaction and production behavior; these are not required to establish the local Backend contract milestone.

Backend subsystem changes:

- Commerce Account API now formats GET and PATCH responses through one canonical formatter.
- PATCH continues to upsert `CustomerProfile` and synchronize the CRM contact in the existing transaction.
- API regression coverage asserts PATCH response equality with the subsequent canonical GET and absence of the old profile-only shape.
- No Auth, RBAC, Worker, payment, inventory, CRM schema, deployment, or operational behavior was changed.

## API contract and Frontend impact

Account Profile contract completed on `feature/backend` (pending integration):

- Request: `PATCH /account/me` remains `{ firstName?: string, lastName?: string, phone?: string }`, now named `CustomerAccountUpdateInput` in `src/lib/api/api-contract.ts`.
- Response: both `GET /account/me` and `PATCH /account/me` return `{ data: { id, email, firstName?, lastName?, phone? } }` using the canonical `CustomerAccount` DTO.
- Error codes/statuses are unchanged: unauthenticated requests remain HTTP 401 with `AUTH_REQUIRED`; this work unit adds no public error code.
- Shared-contract paths changed intentionally: `src/lib/api/api-contract.ts`, `src/lib/api/runtime-validation.ts`, `src/lib/api/api-client.ts`, and `qa/package-a-contracts.test.ts` are the repository's API truth/client validation boundary and had to move with the runtime response.
- No Frontend component/page was changed in the final commit. Both client methods now use runtime validation; the existing Profile UI compatibility GET remains redundant but safe until a Frontend-owned follow-up after integration.
- No migration, authentication, permission, or route-path change.

Current public Password Reset contract used by the verified frontend:

- Forgot request: `{ email, locale }`
- Forgot response data: `{ ok: true, message }`
- Reset request: `{ token, password }`
- Reset response data: `{ ok: true }`
- Invalid/expired reset code: `AUTH_RESET_INVALID`

Any future API, public error, session, checkout, payment, or pagination change must be recorded here before integration, including request/response shape, error codes, migration dependency, and required frontend adaptation.

## Integration status

- Account Profile work-unit commit: `be3ccb417d0aa21530b5dc0356d1263b391f38b8`.
- Present in local `main`: no at completion time.
- Present in `integration/fullstack`: no at completion time.
- Pushed: no.
- Latest durable production action remains frontend-only fullstack9; this work unit did not change the Backend image or database.
- Coordinator must integrate this commit into `integration/fullstack`, rerun the integration gates, and only then consider promotion.
- Production Backend deploy, migration, DNS/TLS, push, and real payment require separate explicit authorization.

## Production boundary

Latest durable production facts are maintained outside this domain file in the current production checkpoint and canonical backend handoff. Important standing constraints:

- Real Moneris authorization/capture/settlement/refund remains explicitly deferred.
- ERP is not connected; historical pending ERP jobs must not be blindly released.
- Do not disclose or commit secrets.
- Do not describe local tests as production verification.

## Migration status

This work unit introduces **no schema or migration file**.

- Source-only migration: none.
- Locally applied for this work unit: none required. `prisma migrate status` found 41 migration directories and reported the local `vanstro_dev` schema up to date.
- Applied to staging for this work unit: no; not performed or claimed.
- Applied to production for this work unit: no; not performed or claimed. The latest durable production baseline remains separately evidenced as 41 migrations.

## Verification for current Backend work unit

Completion protocol was run at `be3ccb417d0aa21530b5dc0356d1263b391f38b8` using Node 25.9.0; pnpm emitted the expected repository engine warning because the project declares Node 22.

- `pnpm db:generate`: passed.
- `prisma validate --schema prisma/schema.prisma`: passed.
- `pnpm test:db`: 3/3 passed.
- `pnpm test:api`: 106/106 passed in the completion run. Earlier during implementation, the first full run was 105/106 because Prisma could not start one concurrent payment-recovery transaction within its timeout; the unchanged test then passed on immediate rerun and again in this completion run.
- `pnpm test:worker`: 11/11 passed.
- `pnpm typecheck`: passed for web, DB, API, Worker, and CLI.
- `pnpm test:package-contracts`: 10/10 passed.
- `pnpm build:backend`: passed for DB, API, Worker, and CLI.
- `pnpm preflight:existing-database`: passed with `{ ok: true, failures: [] }`.
- `prisma migrate status`: 41 migrations found; local database schema up to date.
- `pnpm api:smoke`: attempted but safely blocked before execution because the configured local database is `vanstro_dev`, not a database whose name contains `test` or `smoke`, and the destructive-smoke guard requires `VANSTRO_RUNTIME_MODE=test` plus `ALLOW_DESTRUCTIVE_SMOKE=true`. The guard was not bypassed.
- `pnpm test:final-review`: passed during implementation before the commit; no final Frontend component change remained in the commit.
- Browser QA, staging checks, production checks, deploy, migration application, push, and real payment/refund were not run.

## Remaining backend work

Validated cross-domain candidates for the next Backend session:

1. Add contract coverage ensuring every public `PaymentSessionStatus` accepted by Backend (including `refund_processing`) is represented in the public frontend contract.
2. Clear encrypted Password Reset outbox payloads on exhausted-failed, suppressed, and cancelled terminal paths rather than waiting for generic retention.
3. Define Backend-owned contracts requested by Frontend for Checkout capabilities, authoritative DealerLocation identity, PDP inventory, and Account Orders pagination/status enums.
4. Monitor the concurrent payment-recovery test for recurrence; one transient transaction-start timeout occurred in this work unit before the 106/106 rerun passed.

Future work must start from `feature/backend`, verify current production facts before operational changes, and record Frontend impact.

## Next session first step

1. Start with read-only Git/worktree/handoff inspection on `feature/backend`; do not assume coordinator integration has occurred.
2. Compare `be3ccb417d0aa21530b5dc0356d1263b391f38b8` with the then-current `integration/fullstack` and confirm whether the coordinator integrated it.
3. If integrated, hand off removal of the now-redundant Profile compatibility GET to `feature/frontend`; otherwise, do not duplicate this implementation.
4. Select exactly one remaining Backend candidate before editing.

## Relevant checkpoint

- `tasks/checkpoints/backend-2026-07-28-production-code-baseline.md`
- `tasks/checkpoints/integration-2026-07-28-fullstack-baseline.md`
