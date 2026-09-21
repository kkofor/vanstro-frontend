# Backend checkpoint — Dashboard P05 Async Job Foundation

- Branch/worktree: `feature/backend`, `/Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/backend`.
- Parent/shared baseline: `a882dc6e41ffa2cedf3c9df8c55ba76bb3dd08ac`; tree `1a6af45d7e361e62be8fad49fe2d8b51ceb9177a`.
- Frozen contract v1.2 SHA-256: `a464ff90cb01d5048246efde3b5219a3279134355747336f1a59f60f6979a3d0`.
- Functional commit: `af7695f23f822eef72b741f33ff7a531da5df4b7`; tree `c1de1adc7d7da892f58dfb62d4bc042c22f84660`.
- Scope: Backend/Prisma/shared contract/Worker only. No Frontend component, P06, provider operation, production deployment/migration, push or stash action.

## Implemented

- Native `AsyncJob`, transition-constrained `AsyncJobAttempt` and metadata-only `JobArtifact` persistence.
- Frozen test-only `foundation.probe` registry; deployment/development cannot create or claim it.
- PostgreSQL claim serialization, `FOR UPDATE SKIP LOCKED`, per-type DB concurrency, immutable attempt deadline, lease heartbeat/fencing, monotonic progress, retry generation, cancellation request/acknowledgement/race behavior and stale/timeout recovery.
- HMAC-SHA-256 keyset with active/verify-only rotation, transaction advisory lock across `kid`, candidate replay lookup, constant-time intent comparison and context/grant/scope binding.
- Safe exact DTOs; no payload/hash/idempotency/lease/storage reference/raw error exposure. Artifact registration is fenced and requires same-transaction Audit callback.
- P02 Job permissions, canonical role grants, action-specific scoped authorization, transaction-local reauthorization and cross-scope 404 behavior.
- P03 strict native cursor list/detail with scope/context/grant/field/query bindings, frozen default range, no total and exclusive read-only Email/ERP/Catalog adapter summaries.
- P04 fixed registry extension for `async_job`/`job_artifact`; Dashboard mutations retain admin/action provenance; Worker terminal/stale transitions use scoped system provenance and same-transaction Audit.
- Worker dispatcher appended after existing handlers; deployment is a no-op and only test runtime executes the probe.

## Migrations

P05 v1.2 uses exactly three forward migrations:

1. `20260802130000_dashboard_p05_async_job_foundation` creates native models and initial constraints/trigger.
2. `20260802131000_dashboard_p05_audit_resource_compatibility` only extends the P04 Audit resource CHECK.
3. `20260802132000_dashboard_p05_attempt_fencing` only replaces the Attempt trigger function with parent-current-lease and frozen-closure validation.

Migration 44 is immutable at SHA-256 `a6e7dac74fb05dc3b5fa7579d8aee2222b7631f241bcf1fee38b3bd80dd7d0f5`. Local `vanstro_dev` applied `43→44→45→46`; current status is 46 and up to date. Owned disposable databases proved fresh `0→46` and were dropped. Production remains 41 migrations and was not accessed.

Canonical RBAC bootstrap after P05 permission changes produced 6 permissions/16 grants/0 assignments, then a second run produced 0/0/0.

## Verification

- Full TypeScript: passed.
- Backend builds DB/API/Worker/CLI: passed.
- Prisma generate/validate/status: passed; 46 migrations, local schema up to date.
- Existing-database preflight: `{ ok: true, failures: [] }`.
- DB suite: 10 passed, 0 failed, 8 intentional owned-disposable skips.
- API suite: 170 passed, 0 failed, 7 intentional disposable-only skips.
- Worker suite: 12 passed, 0 failed, 1 intentional disposable-only skip.
- Package contracts: 132/132 passed.
- Focused pure P05: DB 4/4; API 3/3.
- Final fresh disposable P05 DB matrix: 7/7, including exact replay/conflict, context isolation, HMAC rotation, fenced artifact registration, deadline timeout, stale cancel and raw SQL Attempt fencing.
- Final fresh disposable API/Audit matrix: 1/1.
- Independent fresh disposable Worker execution/Audit matrix: 1/1.
- `git diff --check`, migration-44 checksum, scope scan and secret scan: passed.

Controlled failures closed during implementation:

- Initial P05 API Audit insert exposed the immutable P04 resource CHECK; v1.1 authorized forward migration 45.
- Adversarial raw SQL review found migration-44 Attempt close lacked parent-current-lease validation; v1.2 authorized forward migration 46.
- One Worker proof initially reused a DB containing older queued fixtures and correctly claimed FIFO; it passed on an isolated fresh database.

## Integration wire compatibility follow-up

- Backend list/detail now emit exact `job-summary.v1` envelopes. Safe profile retains exact empty `entries`; sensitive profile emits allowlisted scalar entries. Error summaries additionally emit stable `code`, canonical `failureClass` and `retryable`.
- Artifact metadata now emits exact `job-artifact.v1` keys, including `sensitivity` and server-derived `available`. SHA-256 checksum is classified as non-sensitive integrity metadata and is returned in both safe and sensitive profiles; storage references remain permanently omitted.
- Email/ERP/Catalog adapters now emit exact canonical source/version/read-only/execution/status/counts/timestamps. Adapter meta is exact `{ requestId, completion, capturedAt }`; no `partial` boolean or Catalog-specific `latest` shape remains.
- Shared API contract types and Backend producer tests cover safe/sensitive summaries, artifacts, list/detail and adapters.
- Follow-up verification: focused serializer 4/4, owned-disposable API producer 1/1, API 170 pass/0 fail/7 intentional skips, package contracts 132/132, full TypeScript and all Backend builds passed. No schema/migration/Frontend component changed.

## Final adversarial-review follow-up

- Replaced the generic Job cursor with a profile-specific AES-GCM payload that persists/restores exact `rangeAnchor`, `createdFrom` and `createdTo`, while retaining actor/context/grant/field/query/order/registry/schema bindings. A real three-row test proves page 1→2 without duplicates and rejects explicit-bound drift.
- Progress serialization is now discriminated and exact for `indeterminate`, `current_total` and `processed_failed`.
- Wire `attempt/maxAttempts` are both generation-local. Lifetime attempt and lease revision remain persisted/internal; generation-one list/detail remains valid after generation zero exhaustion.
- Artifact Audit callback now receives artifact ID/type and writes `job_artifact`/artifact ID under inherited scope in the same transaction. Failure injection proves Audit failure rolls back artifact insertion.
- Follow-up evidence: pure serializer 4/4; fresh disposable DB 8/8; fresh disposable API pagination/drift 1/1; full DB 10 pass/0 fail/9 intentional skips; API 170 pass/0 fail/7 intentional skips; Worker 12 pass/0 fail/1 intentional skip; contracts 132/132; full TypeScript and all Backend builds passed. No migration, Frontend component or P06 change.

## Terminal evidence counter follow-up

- `closeAttempt` now requires authoritative counters. Succeeded/partial completion writes the exact input counters to both Attempt and parent Job; fail/cancel/recovery explicitly close with current persisted counters.
- Owned PostgreSQL regression proves succeeded and partially-succeeded Job/Attempt outcome, processed and failed values match exactly. Separate injected Attempt-close, parent-constraint and Audit failures prove Job/Attempt/Audit state rolls back atomically.
- Verification: fresh disposable P05 DB 9/9; DB suite 10 pass/0 fail/10 intentional skips; API 170 pass/0 fail/7 skips; Worker 12 pass/0 fail/1 skip; contracts 132/132; full TypeScript and Backend builds passed. No migration, Frontend component or P06 change.

## Known limitations / next action

- No production-executable native Job type exists; this is intentional. Future types require a separately frozen side-effect/idempotency contract.
- P05 exposes artifact metadata only; no upload/download/signed URL/storage bytes.
- Frontend P05 read-only consumer, controlled browser/a11y matrix and full-stack contract reconciliation are Integration/Frontend follow-ups.
- VoiceOver/NVDA/JAWS/Dragon and production checks were not run.
- Next action: merge the focused Backend commit into `integration/fullstack`, reconcile shared capability/DTO consumption, run fresh 0→46 plus controlled global/scoped browser verification, and do not begin P06 or deploy.
