# Backend checkpoint — Dashboard P06 Work Queue and Notifications

## v1.8 expiry-policy closure

- Frozen contract: SHA-256 `164443da75a494dd817b3aa7786dd06b074dedcbf9a29fe96578834a5f5a4aa0`, 949 lines.
- Migrations 47–54 remain byte-identical. Authorized migration 55 has SHA-256 `0d0b3ee77699a93489d3645cfb97acb7f4149a2cf6a27d8cbf922712db55de8d` and replaces only the expiry predicate: `foundation.attention` is rejected unconditionally; a future non-registered expiring fixture must have `attentionExpiresAt <= CURRENT_TIMESTAMP`, exact reason `attention_expired`, non-null terminal retention and the pre-existing exact field family.
- Raw-SQL coverage rejects Foundation expiry, free-text reason, missing expiry and future expiry, then proves the generic predicate with an isolated test-only table using the production trigger function without expanding the P06 registry.
- Verification: local `54→55`, fresh owned `0→55`, focused DB 13/13. Production stayed at 41 and was not accessed.

## v1.7 final reason/health/lock-order closure

- Frozen contract: SHA-256 `2ee91878e641859f6b712ce430f3e05644f0e5910b6f3fc7eaa5e9c8e39837d9`, 947 lines.
- Migrations 47–53 remain byte-identical. Authorized forward-only migration 54 has SHA-256 `64539e67329683c2c651b8d183129898b52444cffb61d9df63288235417b3b6f` and changes only the Work Item trigger's exact reason predicates.
- Migration 54 admits only `operator_acknowledged`, `operator_resolved`, `not_actionable`, `operator_correction`, `source_resolved`, `source_orphaned`, `source_stale`, `source_restored`, and `source_observed` in their corresponding existing transition families; representative cross-action, system-only and free-text values fail through raw SQL.
- Implemented adapter queries persist `ready` or `unavailable` SourceState through the existing same-transaction Audit service. Repeat state produces no Audit; Audit failure rolls back and the route fails closed rather than claiming health evidence.
- Reopen derives and acquires the canonical raw-identity advisory lock from an immutable preview before principal/membership and Work Item row locks. Index already acquires that same advisory lock before Work Item mutation; concurrent coverage rejects any deadlock victim and preserves one active occurrence.
- Verification: local `53→54`, fresh owned `0→54`, focused DB 12/12, focused API 1/1, DB 13 pass/0 fail/22 intentional skips, API 173 pass/0 fail/8 intentional skips, Worker 12 pass/0 fail/1 intentional skip, contracts 141/141, full TypeScript, all Backend builds, Prisma validate/status and existing-database preflight. Available runtime was Node 25.9.0 and emitted the repository's expected Node 22 engine warning. Production stayed at 41 and was not accessed.

- Branch/worktree: `feature/backend`, `/Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/backend`.
- Parent/shared baseline: `9a3ea56218696ccc6362bd0d3f307c23c12aecf0`.
- Frozen contract v1.6 SHA-256: `ff0aa694682da081b46075c0e03c157f06be5ed28b69e029268b100397574de5` (945 lines).
- Functional commit: `364c4287f7ea920dc4d039f3f96c0c2c2c835fcb`; v1.2 follow-up: `ea71bace9688701c041eeb13059ebb202a8d6fbb`; v1.3 follow-up: `fbac78c452d7f269028db53a4f164ecbf63ae720`; v1.4 follow-up: `08e4626a8327e58b2ff7f71cb8fa10f2b88915b3`; v1.6 action/evidence closure: `be1ddff49d7d6216ef0b7829f9a9a4dcf23ff2a9`; no-migration semantic closure: `a90065e8460540de92f89d12297f710aff28729d`, tree `5470244503a48cb93415200f9d4c4ae0a397c7ae`.
- Scope: Backend/Prisma/shared API contract only. No Frontend component, P07, provider operation, external Notification delivery, production deployment/migration, push or stash action.

## Implemented

- Native `WorkQueueItem`, recipient-specific `InAppNotification` and `WorkQueueSourceState` persistence with restrictive relations, query indexes and typed DB constraints.
- Frozen test-only `foundation.attention` producer referencing a persisted failed/partial `foundation.probe` Job. Production runtime cannot create it; Queue actions never mutate the Job or any Domain state.
- Domain-separated HMAC-SHA-256 active/verify-only dedup for Work Items and Notifications, persisted-kid readiness across both tables, transaction advisory locks, cross-kid replay lookup and DB unique defense.
- Assignment, unassignment, acknowledgement, resolve, dismiss and reopen with expected-version checks, canonical actor/target/membership/item locks, transaction-local P02 authorization, same-transaction P04 Audit and Notification production.
- Internal typed reconciliation for stale/fresh/orphan/source-ended state, invalid-assignee unassignment and retention cleanup. Cleanup deletes expired Notifications and already-terminal retained items only; retention never drives workflow expiry.
- Strict Work Queue and Notification list/detail profiles with AES-256-GCM cursors, actor/context/grant/profile/query/order bindings, frozen time ranges, exact filters and current-recipient/scope enforcement.
- Work Queue list and exact summary execute in one repeatable-read transaction. Summary includes `open`, `critical`, `assignedToMe`, `unassigned`, `overdue`, `byType`, `bySource` and `criticalOutsideFilter`; active critical work is not bounded by the terminal 30-day window.
- Whole-request safe/sensitive assignment profile requires exact `work_queue.read`, `work_queue.read_sensitive` and `users.read` scope equality. Capabilities are clipped by current action and source grants; safe summaries retain only registry-allowlisted scalar facts.
- Complete frozen adapter registry is represented separately from native summary. Authorized implemented Domain adapters expose safe counts; deferred/unknown-health adapters are explicitly unavailable. Scoped actors receive no global adapter counts.
- In-app only delivery: no EmailOutbox, SMS, Push/Web Push, provider row/call, second Job/lease/attempt system or public producer endpoint.

## Migrations

P06 v1.6 uses exactly seven forward migrations:

1. `20260802140000_dashboard_p06_work_queue_notifications` (migration 47) creates the three P06 models, constraints/indexes and extends the P04 resource CHECK. It remains immutable at SHA-256 `0d0eab8aec56386465ccda3fe12fb55307d8434642e13ac8d017ee8e4ce84679`.
2. `20260802141000_dashboard_p06_identity_guards` (migration 48), authorized by contract v1.1, adds the initial immutable-identity triggers. It remains byte-stable at SHA-256 `ad3b03b04b9fe61f0f91c9448e8704dcea2ddd3e0453fbdcc388acdf9f14eab5`.
3. `20260802142000_dashboard_p06_typed_transition_guards` (migration 49), exclusively authorized by v1.2, replaces the three trigger functions. SHA-256 remains `b75170b6be4c68f6617f2933e2cce27ef7e67b994d11c63ada43d46d1656dee4`.
4. `20260802143000_dashboard_p06_exact_transition_families` (migration 50), exclusively authorized by v1.3, replaces only the Work Item trigger function with exact required/allowed column and value predicates for every transition family. SHA-256 remains `c775915c597047e11f2c780eddf2f6cc8e08cb50151397b6d5bb59d18728d9c5`.
5. `20260802144000_dashboard_p06_observation_guard` (migration 51), exclusively authorized by v1.4, replaces only the observation predicate. SHA-256 remains `02996ae2b25e4ae4b4e81b9b93b23577f84669764e14e2de5cf05d8e06ed15a7`.
6. `20260802145000_dashboard_p06_action_guards` (migration 52), authorized by v1.5, restores fresh observations and blocks terminal standalone assignment plus orphaned manual actions. SHA-256 is `723ff4960c1e8f699729ac2d97126c097893e3c8d85d9933652ff85e876ffdc9`.
7. `20260802146000_dashboard_p06_reopen_assignment_guard` (migration 53), authorized by v1.6, changes only reopen predicates to preserve the assignment tuple or atomically clear all four fields. SHA-256 is `9de8aa14b707c31cc9726362ec40ab64416c73d328674bbaae194a096cf3a687`.

Local `vanstro_dev` applied `51→52→53`; Prisma reports 53 migrations and schema up to date. Owned disposable databases applied fresh `0→53`; every temporary database was dropped and a final inventory query returned zero P06 temporary databases. Production remains at the separately evidenced 41 migrations and was not accessed.

## Verification

Final authoritative gates using the configured development database unless stated otherwise:

- Full TypeScript (web, DB, API, Worker, CLI): passed.
- DB/API/Worker Backend builds: passed.
- Prisma generate/validate/status: passed; 53 migrations, local schema up to date.
- Existing-database preflight: `{ "ok": true, "failures": [] }`.
- DB suite: 13 passed, 0 failed, 20 intentional owned-disposable skips.
- API suite: 173 passed, 0 failed, 8 intentional owned-disposable skips.
- Worker suite: 12 passed, 0 failed, 1 intentional owned-disposable skip.
- Package contracts: 141/141 passed.
- Final isolated fresh `0→53` P06 DB matrix: 13/13, including terminal standalone assignment rejection, orphan acknowledge/resolve/reopen rejection with dismiss allowed, stale→fresh observation, valid-assignee preservation, invalid-assignee exact reopen clear, partial-assignment rejection, ordered dual Audit and every prior concurrency/invariant proof.
- Final independent fresh `0→53` P06 API matrix: 4/4, including direct 409 failed Audit after rollback, middleware 403 denied Audit without target read, active-only assignment, exact Frontend wire and unchanged Job state.
- `git diff --check`, contract checksum and migration checksums: passed.

Controlled non-authoritative runs during implementation:

- A fresh unseeded full API run failed unrelated seed-dependent fixtures; a seeded fresh full API run still exposed the suite's existing cross-test fixture coupling. Neither is claimed as a gate. The authoritative full API run above passed 172/172 on the established local test state.
- Combining the P06 DB matrix and API matrix in one disposable database correctly made API readiness fail closed after the DB rotation test persisted an intentionally unknown HMAC kid. Final DB and API evidence therefore uses independent fresh databases.
- One final fresh API attempt found and closed a real text-vs-UUID cast defect in canonical principal locks. The independent rerun executed assignment successfully and passed 3/3.

## v1.2 Integration wire follow-up

- Work Item `safeSummary.schemaVersion` is exactly `work-queue-foundation-summary.v1`.
- Queue summary moved from `meta.summary` to top-level `{ data, relation, capturedAt, profileId }`; Notification unread uses the separate top-level exact summary envelope. Queue and Notification list metadata now contain exact pagination, sort, statement snapshot and visibility.
- Notification registry is exactly `foundation.attention.assigned|critical|terminal`, with matching `${type}.v1`; assignment and current transition producers emit the canonical assigned/terminal types.
- Adapter descriptors follow all 14 frozen contract sources in stable order. Every returned item has only exact source/version/status/freshness/counts/deepLink?/capturedAt fields; unauthorized adapters are omitted and an authorized empty set is `complete`.

## v1.3 Integration security follow-up

- Index and reopen now derive the same advisory lock from canonical raw issue identity (type/version, source, resource, canonical scope and registry issue key), independent of HMAC kid/hash. A real old→new kid race proves exactly one active occurrence.
- Assignment requires only the contract target read permissions. Missing `notifications.read` skips Notification creation without rolling back assignment. When created, assignment Notification Audit uses the transaction-local Dashboard actor and `work_queue.assign` provenance.
- Notification unread is the exact Frontend top-level `unread` envelope; adapters omit the rejected extra `meta` field.
- Migration 50 rejects subset assignment, reason-only, mixed-family and no-op writes while retaining typed service transitions.

## v1.4 Integration final follow-up

- Reopen computes canonical and legacy candidate hashes for every retained kid under the shared raw-identity lock. Concurrent and forced index-first/reopen-first tests leave exactly one active occurrence.
- Notification list, unread and detail intersect the exact `notifications.read`, `work_queue.read` and source-read scopes.
- Reopen locks actor/assignee memberships before the item, re-resolves assignee authorization and atomically emits `unassign` then `restore` Audit when access is lost.
- Migration 51 permits same-value observation summaries while retaining required revision/intent/time/version and rejecting partial writes.

## v1.5–v1.6 final action/Audit follow-up

- Service and DB reject assignment/unassignment on terminal items and reject orphan acknowledge/resolve/reopen while preserving orphan dismiss.
- Every newer observation atomically restores `fresh` and writes same-transaction material `update` Audit.
- Dashboard handler rollback paths record redacted best-effort denied/failed Audit; middleware denial records the requested resource/action without reading an unauthorized target.
- Migration 53 preserves a valid assignment or clears the complete tuple in the exact reopen UPDATE. Invalid-assignee reopen records `unassign` then `restore` in one transaction; partial/change-assignee reopen is rejected.

## Post-v1.6 no-migration semantic closure

- List/detail batch-load assignees and resolve each unique active assignee authorization once per request. Inactive users serialize `inactive`; active users lacking exact Dashboard/Queue/source coverage serialize `scope_lost`; every invalid assignment state disables item action capabilities.
- Orphan capability projection preserves only authorized dismiss. Core action reasons are exact per action; free text and system-only `source_resolved` through manual endpoints fail closed.
- Newer observation shortens but never extends SLA, exposes a same-transaction critical Notification hook for a valid assignee, and rolls back item/Notification/Audit together on failure.
- Reopen rejects when the assignee differs from the prelocked preview, forcing caller retry rather than validating an unlocked replacement assignee. No schema or migration changed; source remains exactly 53 migrations.
- Focused fresh DB matrix is 14/14 and API producer matrix is 4/4. Full DB/API/Worker/contracts/type/build/Prisma/preflight gates remain green.

## Threat model and audit trail

- Cross-tenant/Dealer/Location access is constrained by authenticated P02 grants and source-read scope at SQL query or transaction time; request parameters never choose scope.
- Assignment cannot grant access. Actor/target users and memberships are locked before the item, then both authorizations are re-resolved inside the transaction.
- Work Item, Notification and source-state identity rewrites are rejected by the migration-48 triggers as replaced by migration 49; exact typed changed-column families remain legal while direct `id`, no-op version bumps and arbitrary mixed-family writes fail closed.
- Access/profile cursors bind `contextRevision` and exact grant/profile fingerprints. Scope loss invalidates cursors and removes rows/unread counts.
- Every authoritative mutation records same-transaction P04 Audit with exact resource/action/scope and safe metadata. Audit or Notification persistence failure rolls back the Work Item transition.
- HMAC material, dedup hashes, raw source payloads, recipient contacts, provider errors, secrets and arbitrary URLs are never serialized or audited.

## Frontend impact and next action

- Frontend may consume fail-closed `workQueueFoundationV1`, strict `work-queue-item.v1`, `work-queue-summary.v1`, `work-queue-adapters.v1` and `in-app-notification.v1` in its separately authorized read-only P06 work unit.
- Frontend must not mount assignment/status/mark-read controls in P06, infer authorization from capability labels, mix adapter counts into native summary or treat Notification unread as Work Queue open.
- Next action: hand the focused Backend commit to `integration/fullstack`, reconcile exact shared DTO/capability validation and run full-stack/browser gates. Do not deploy, start P07, enable external delivery or introduce a production-native Work Item producer.
