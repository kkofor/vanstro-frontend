# Backend Checkpoint — Dashboard P07 Migration 62 Runtime Closure

Status: Backend P07 migration 62 and runtime closure verified locally for focused commit and Integration handoff. This checkpoint does not supersede or rewrite the earlier blocked v1.12 checkpoint. No deployment was performed.

## Repository state and boundary

- Worktree: `/Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/backend`
- Branch: `feature/backend`
- Focused Backend closure was committed on `feature/backend`; the exact commit is recorded in the final handoff and completion report because amending this checkpoint changes the commit hash.
- The committed closure contains 20 implementation, test, migration, harness, checkpoint, and handoff paths. The worktree was clean after commit.
- Production remains release `3904a440` at 41 migrations and was not accessed or changed. No deploy, production migration, storage/provider operation, merge, push, stash operation or P08 work occurred.

## Migration 62 exact content and immutable chain

Migration 62 is exactly `packages/db/prisma/migrations/20260802156000_dashboard_p07_source_binding_audit_metadata/migration.sql`, SHA-256 `ed56e2d7e919dcca6d12913bb4c502bffd2e53a60cdae40d0c8975b4ac51e3a1`.

It is a forward-only correction over migration 61. It adds no table, column, status, FK or processing authority. It:

1. asserts the exact PostgreSQL 16 migrator/NOLOGIN guard-owner/runtime topology and rejects runtime/PUBLIC CREATE or runtime ownership;
2. replaces the storage-operation update guard so the one-time `written_unbound → written_bound` transition requires a same-transaction P04 Audit event with exact metadata `objectRole=upload_staging`, `fromState=written_unbound`, `toState=written_bound`;
3. keeps the immediate, non-deferrable `media_storage_operations_jobId_fkey` and permits only `NULL →` the exact queued generation-0 `media.process.v1` Job whose scope, payload, source checksum, processing hash, Asset version and original Variant agree;
4. retains fail-closed clear, rebind, mixed-family, stale-version, terminal-Job, wrong-scope/payload/binding and direct-GUC behavior;
5. narrows guard-owner UPDATE to the required columns and exposes only the SECURITY DEFINER binding function to runtime;
6. removes runtime SELECT/UPDATE/DELETE from protected retry-command evidence, retains INSERT, and exposes bounded SECURITY DEFINER projections for required HMAC kids and exact replay lookup;
7. reasserts owner, grant, function search path, trigger and immediate-FK invariants after migration.

Migrations 56–61 remain byte-identical:

| Migration | Directory | SHA-256 |
| --- | --- | --- |
| 56 | `20260802150000_dashboard_p07_media_library_foundation` | `3319634df960a24c23f64bd26c4bef0169438cf3626dda32dcfa079c2106e413` |
| 57 | `20260802151000_dashboard_p07_p05_p06_registry_extensions` | `14ef85ea337145b07333046f04c15f91a6271e2c07f997939fedf3e3c29c2c6b` |
| 58 | `20260802152000_dashboard_p07_consolidated_guards` | `2670324b81c180ad70d42df726d92871546fdbc45374833c19ca327eefd7fe38` |
| 59 | `20260802153000_dashboard_p07_media_role_boundary` | `3cb2a3248f3f6d625cb1522dedeac12cfced4625cb572a6021ae18ca584d1f77` |
| 60 | `20260802154000_dashboard_p07_retry_retention` | `e21c71a427413675719fa25c22f64cdbd65d4b400624ce8a9a10937b5120f2c3` |
| 61 | `20260802155000_dashboard_p07_source_operation_binding` | `3662535ddce270f4a251c784d55deb8e7373ba3eae8b04fdd6e00ccb44e77af3` |

The owned PostgreSQL 16 harness `scripts/test-media-migration62.sh` snapshots exact through-55/60/61 histories and reports all four complete matrices passed: fresh `0→62`, P06 `55→62`, P07 `60→62`, and direct `61→62`.

## Permission model and negative coverage

The migration and harness preserve the three-role model:

- `vanstro_migrator`: LOGIN, NOINHERIT; member of the guard-owner role only for controlled migration ownership transitions.
- `vanstro_media_guard_owner`: NOLOGIN, NOINHERIT; owns SECURITY DEFINER functions and only the exact column privileges needed by guarded transitions.
- `vanstro_runtime`: LOGIN, NOINHERIT; cannot become either privileged role, create in the database/public schema, own Media objects, read guard phase rows, or directly read/update/delete retry-command evidence.

The migration-62 matrix exercises successful exact binding/replay and rejects terminal or advanced Jobs, wrong scope, wrong source operation, wrong source checksum, stale binding/version, wrong Audit metadata, clear/rebind, direct UPDATE, forged transaction marker/GUC, guard-phase reads, migrator execution, temp-schema shadowing, direct retention/delete, out-of-bound batch/time arguments, role escalation and CREATE attacks. The FK is asserted immediate and non-deferrable.

## Original three dirty files preserved and repaired

The pre-existing three dirty test files were not reset, stashed, overwritten or discarded. Their fixture corrections remain in the current diff:

- `apps/api/src/dashboard/media-retry.integration.test.ts`
- `apps/api/src/dashboard/media.integration.test.ts`
- `apps/api/src/dashboard/work-queue.integration.test.ts`

The closure keeps those repairs while adding the runtime/migration corrections around them. Integration must review these three paths as preserved dirty ancestry rather than treating the final dirty tree as a clean migration-62-only patch.

## Runtime risks 12–21 closure map

The existing runtime review risks 12–21 are represented by concrete source and deterministic tests as follows. This is a file/test evidence map; execution totals are recorded separately below.

| Risk | Closure evidence |
| --- | --- |
| 12 — real readiness | Persisted per-kind native readiness is required and malformed, stale, mismatched or zero-capacity attestations fail closed: `apps/worker/src/media-parser.ts`, `apps/worker/src/media-parser.test.ts`, `apps/worker/src/async-job-dispatcher.ts`, `apps/worker/src/async-job-dispatcher.test.ts`, and `packages/db/src/media.ts`. |
| 13 — claim `media.process` | Worker claim eligibility is gated by the strict persisted readiness result; unavailable kinds are not claimed: `apps/worker/src/async-job-dispatcher.ts` and `apps/worker/src/async-job-dispatcher.test.ts`. |
| 14 — source `jobId` / scope / generation / attempt / fencing | Migration 62 permits only the exact queued generation-0 `media.process.v1` Job and validates source operation, scope, payload/binding, Asset/original-Variant versions and Attempt/fencing invariants: migration 62, `packages/db/src/async-jobs.ts`, `packages/db/src/async-jobs-media-binding.test.ts`, and `packages/db/src/async-jobs-media-binding.integration.test.ts`. |
| 15 — selected persistent outputs | Only validated parser outputs under the owned output directory can become selected persistent output; role uniqueness, checksum, byte bounds and original-output presence remain enforced: `apps/worker/src/media-parser.ts`, `apps/worker/src/media-parser.test.ts`, `packages/db/src/async-jobs.ts`, and the async-job binding tests. |
| 16 — final acceptance revalidation | API final acceptance derives and hashes the canonical post-acceptance Asset/original-Variant binding and passes it through the guarded source-operation bind transaction: `apps/api/src/dashboard/media.ts`, `apps/api/src/dashboard/media.integration.test.ts`, migration 62, and the DB binding tests. |
| 17 — missing body / parse-fail recovery | Upload missing-body and parse/finalization failure paths preserve fail-closed recovery/cleanup evidence instead of leaving a successful claim: `apps/api/src/dashboard/media.ts`, `apps/api/src/dashboard/media.integration.test.ts`, `apps/worker/src/media-parser.ts`, and `apps/worker/src/media-parser.test.ts`. |
| 18 — replay terminal/stale full validation | Retry replay and binding replay validate terminal/stale state and the complete current binding before reuse; bounded replay lookup crosses the protected boundary through migration-62 SECURITY DEFINER projections: `apps/api/src/dashboard/media-retry.integration.test.ts`, `packages/db/src/media.ts`, migration 62, and the async-job binding tests. |
| 19 — Prisma `StorageOperation↔AsyncJob` consistency | Prisma keeps `MediaStorageOperation.jobId` consistent with the immediate non-deferrable FK while avoiding an unauthorized runtime relation traversal; migration 62 reasserts the FK and guarded bind semantics: `packages/db/prisma/schema.prisma`, migration 62, `packages/db/src/async-jobs.ts`, and binding tests. |
| 20 — archive/restore actor lock | Archive and restore remain serialized by the canonical actor lock before transaction-local authorization and mutation: `apps/api/src/dashboard/media.ts` and `apps/api/src/dashboard/media.integration.test.ts`. |
| 21 — no permanent strict-disabled/fallback | Runtime capability does not use a permanent hard-disabled or permissive fallback path; enablement depends on valid persisted strict readiness, and malformed/absent evidence remains disabled: `packages/db/src/media.ts`, `apps/worker/src/async-job-dispatcher.ts`, `apps/worker/src/media-parser.ts`, and their tests. |

## Reported verification results and evidence quality

The current main Backend agent reported these completion results for the dirty closure:

- migration 62 owned PostgreSQL 16: fresh `0→62`, `55→62`, `60→62`, `61→62` passed;
- API owned serial shell: exit 0, `202/202` passed;
- DB: `36` passed, `33` intentionally skipped;
- Worker: `21` passed, `1` intentionally skipped;
- package contracts: `151/151` passed;
- Prisma generate and validate: passed;
- typecheck, Backend build and real native Linux gate: passed under the existing main-agent run.

The migration-62 SQL/harness and the changed source/tests are auditable in this dirty worktree. No standalone retained command transcript/log was found for the reported typecheck, Backend build or native Linux execution. Therefore those three are recorded only as existing main-agent reported runs, not independently replayable log evidence. Integration must rerun typecheck, Backend build and the native Linux gate before promotion. Static export, Chromium and authenticated P07 browser verification were not run for this migration-62 Backend closure; Integration must run them with its normal full-stack gates. The same independent rerun requirement applies to final acceptance of the reported aggregate API/DB/Worker/contract/Prisma totals.

## Closure and next action

Backend has created the focused local closure commit and is not integrated. Hand its exact hash from the completion report to Integration. Integration must inspect the complete ancestry, independently rerun the migration matrices and Backend/full-stack/browser gates, and reconcile contracts before promotion. Do not deploy, migrate production, touch production storage, begin P08 or rewrite the earlier blocked checkpoint.
