# Integration checkpoint — Dashboard P05 Async Job Foundation

- Branch/worktree: `integration/fullstack`, `.claude/worktrees/integration`.
- Shared parent: `a882dc6e41ffa2cedf3c9df8c55ba76bb3dd08ac`; tree `1a6af45d7e361e62be8fad49fe2d8b51ceb9177a`.
- Frozen contract v1.2: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p05-async-job-foundation-contract-20260802.md`, SHA-256 `a464ff90cb01d5048246efde3b5219a3279134355747336f1a59f60f6979a3d0`.
- Backend delivery chain: `af7695f23f822eef72b741f33ff7a531da5df4b7`, `73fee6273e68b28e06bf92482fb4184a88494a53`, `57b33ff4b3db556aa68b3808c96f92d18a0ff40e`, `0ef72a2cba49529395cfae0551c314b0466019d2`, `c4654139d3cffdb28cfe1821dcf2775d83e8c0c2`.
- Frontend delivery chain: `8b5cbb8e7ce13b96696da804098b47dd9ad62c03`, `9ab656c3eabf77bba67eebe4e189a63665faf066`, `a12d16a1f14669a5cc4cf934e11dfe832fd4db4e`, `93929e850bf0af093c6f7df1a553b8334e741bf6`.
- Final integrated code tip before this checkpoint: `67ac0f3ed7a4a1f16f45580e5cdfa41f3302321f`; tree `5aca45723a4c108c579383e0c4938507c0ec506c`.

## Frozen architecture and asset mapping

P05 selected the hybrid architecture: one native server-authoritative Job registry plus read-only legacy adapters/domain references. Native persistence is `AsyncJob`, transition-constrained `AsyncJobAttempt`, and metadata-only `JobArtifact`. The only executable type is `foundation.probe`, and it executes only in test runtime; development/deployment cannot create or claim it.

Existing assets remain authoritative and are not backfilled or dual-written:

- EmailOutbox: Outbox message lifecycle, retain-as-is + global-only safe adapter.
- EmailDeliveryAttempt/EmailEvent: delivery attempt/event, retain-as-is; not native Job/Audit.
- ErpSyncJob: legacy integration Job, retain-as-is + global-only safe adapter; historical pending jobs remain frozen.
- ErpSyncAttempt/ErpWebhookEvent: integration attempt/event, retain-as-is/high-risk deferred; raw request/response never projected.
- CatalogSyncRun: singleton legacy run, safe read-only adapter.
- Payment recovery, consent retention, data retention and Worker tick: scheduler trigger/handler, not native Job.
- Payment/Refund events and PrivacyRequest: Domain lifecycle/workflow, not migrated.
- WorkerHeartbeat: operational telemetry, not Job.
- Computed alerts: Alert, not Job or Work Queue persistence.
- AuditEvent: reused for same-transaction Job transition and artifact evidence.

No Import, Export, AI, Media, CMS publication, Scheduled Report, Notification or Work Queue business type was registered.

## State machine and execution foundation

Canonical states are `queued`, `running`, `succeeded`, `partially_succeeded`, `failed`, and `cancelled`. The implementation provides:

- PostgreSQL atomic `FOR UPDATE SKIP LOCKED` claim and database-enforced per-type concurrency;
- server-owned lease owner, lifetime-monotonic lease revision, acquired/expiry/heartbeat and immutable attempt deadline;
- heartbeat bounded by timeout, stale/timeout recovery, old Worker fencing and restart recovery;
- cancellation request separated from acknowledgement; cancelled stale jobs never requeue;
- generation-local retry budget while lifetime attempt/lease evidence stays internal and monotonic;
- exact progress variants: indeterminate, current/total, and processed/failed;
- Job/Attempt terminal outcome and authoritative counters written consistently;
- Attempt database trigger that enforces parent-current running lease, immutable fields, frozen closure fields, close-once and retention-only deletion;
- HMAC-SHA-256 active/verify-only idempotency keyset, cross-kid transaction advisory lock, context/grant/scope binding, exact replay and constant-time intent conflict;
- safe summaries, no raw payload/error/provider response/secret/PII;
- metadata-only fenced artifact registration and same-transaction `job_artifact` Audit using actual artifact ID and inherited scope.

## P02 / P03 / P04 inheritance

P02 adds action-specific `jobs.read/create/cancel/retry/read_sensitive` and `job_artifacts.download` permissions. Canonical roles were reconciled without user assignment or removal of extra grants. First Backend bootstrap added 6 permissions/16 grants/0 assignments; repeat was 0/0/0. Integration reruns at the reconciled state returned 0/0/0 twice.

Every create/cancel/retry performs transaction-local authorization. List/detail/action scope is permission-specific, cross-scope IDs return 404, and exact supplementary `jobs.read_sensitive` scope controls sensitive fields.

P03 profile `dashboard.async-jobs.v1` uses stable `createdAt desc, id desc`, no count/summary, exact filters and a Job-specific AES-256-GCM opaque cursor. The cursor stores/restores exact range anchor/bounds and binds actor, context revision, grant, field profile, query, order, registry and schema. Real PostgreSQL proof covers page 1→2 without duplicates/omissions and explicit-bound drift rejection.

P04 records create/cancel/retry/terminal/stale and artifact transitions. State, Attempt, Artifact and Audit writes are transactionally aligned; Worker/system Audit inherits persisted Job Dealer/Location scope. Claim/normal heartbeat/progress remain operational attempt evidence rather than Audit floods.

## Migrations and errata

Migration 44 was applied under the initial contract, then controlled tests exposed two pre-promotion database contract omissions. Applied migrations were not rewritten. Contract v1.1/v1.2 authorized two narrowly scoped forward corrections:

1. `20260802130000_dashboard_p05_async_job_foundation` — native models and initial constraints/trigger.
2. `20260802131000_dashboard_p05_audit_resource_compatibility` — only extends P04 Audit resource CHECK for `async_job` and `job_artifact`.
3. `20260802132000_dashboard_p05_attempt_fencing` — only replaces Attempt trigger with parent-current-lease and closure-field validation.

Migration 44 SHA-256 remains `a6e7dac74fb05dc3b5fa7579d8aee2222b7631f241bcf1fee38b3bd80dd7d0f5`. Local `vanstro_dev` followed `43→44→45→46`; fresh disposable databases proved `0→46`. Production remains 41 and was not accessed or migrated.

## Frontend

Operations owns canonical `view=jobs` URL state. The read-only Simplified Chinese view provides exact status/type filters, Apply/Clear, opaque in-memory cursor, 60-second stale behavior, actor/context/query isolation, shared responsive Table and DetailDrawer, progress, generation-local attempt, safe scope/actor/result/error summaries, cancellation-requested semantics, artifact metadata and separate legacy adapter summaries.

Runtime validation fails closed on unknown Job/type/version/label/artifact registry values and safe/sensitive profile mismatch. A successful scoped empty adapter set remains `complete` and displays no authorized adapters; only a fetch failure is unavailable. No create/cancel/retry/download/Import/Export/AI/Notification/Work Queue control is mounted.

## Closed review findings

Contract review closed 1 High and 9 Medium before implementation, including cancel-after-stale requeue, timeout authority, retry generation, key rotation concurrency, transaction-local authorization, scoped Audit and Attempt DB immutability.

Implementation and Integration closed all reproduced Medium findings:

- P04 Audit DB resource CHECK incompatibility through immutable forward migration 45;
- Attempt trigger parent lease gap through immutable forward migration 46;
- Backend/Frontend result/error/artifact/adapter wire mismatch;
- safe/sensitive profile mismatch;
- cursor default-range drift;
- invalid progress discriminators;
- lifetime/per-generation attempt wire conflict;
- artifact Audit wrong resource identity;
- unknown Frontend registry acceptance;
- scoped empty adapters marked unavailable;
- terminal Job/Attempt counter mismatch.

Final Backend and Frontend read-only re-reviews found no remaining Blocker, High or Medium.

## Verification

Required Node `22.22.2` final merged-tree gates:

- Full TypeScript: passed.
- Package/protected contracts: 141/141 passed.
- API: 170 passed, 0 failed, 7 intentional owned-disposable skips.
- DB: 10 passed, 0 failed, 10 intentional owned-disposable skips.
- Worker: 12 passed, 0 failed, 1 intentional owned-disposable skip.
- Backend DB/API/Worker/CLI builds: passed.
- Existing-database preflight: `{ ok: true, failures: [] }`.
- Prisma generate/validate/status: passed; 46 source/local migrations, up to date.
- Fresh disposable DB final matrix: 9/9; fresh API pagination/Audit and isolated Worker/Audit passed. Every disposable database was dropped.
- Production-configured static build: 396/396 with `NEXT_PUBLIC_SITE_URL=https://vanstro.ca`, `NEXT_PUBLIC_API_BASE_URL=https://vanstro.ca/api/v1`, `VANSTRO_STATIC_EXPORT=true`.
- SEO, French HTML, 404, Careers/Contact privacy and protected artifacts: passed.
- Dashboard HTML: exactly 42 EN/fr; Chinese Dashboard route artifacts: 0.
- Chromium current-tree: 40/40 with `VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca`.
- `git diff --check`, secret scans and migration checksum checks: passed.

One direct package API run before rebuilding `@vanstro/db/dist` failed because the stale dist lacked `parseJobKeyset`; the canonical `test:api` sequence rebuilt DB first and passed. This command-order failure is preserved and is not represented as code success.

## Controlled browser evidence

A controlled current-source fixture on ports 4340/4341 verified:

- canonical `/dashboard/operations?view=jobs`;
- Foundation/Authorization capability activation;
- strict Job list request and exact safe DTO rendering;
- Chinese type/status/progress/attempt/scope labels;
- read-only filter Apply/Clear;
- empty authorized legacy adapter state shown as complete, not unavailable;
- DetailDrawer with cancellation requested distinguished from cancelled, safe request ID and artifact metadata;
- Escape closes the drawer and restores focus to `查看`;
- no create/cancel/retry/download/Import/Export/AI/Work Queue mutation control;
- unknown `jobType=future.type` renders fail-closed invalid-query UI and no Job consumer;
- no root horizontal overflow at narrow viewport; the table uses its labelled scroll region.

The fixture and Next runtime were stopped; ports 4340/4341 are no longer listening. The fixture performed no Backend state mutation or real provider action.

## Boundaries and release status

- No P06, Work Queue persistence, Notification delivery, full Import/Export, AI Studio, Media platform, Scheduled Reports, CMS async publication or business-module rewrite occurred.
- No existing Job model was deleted or bulk migrated.
- No production deployment, production migration/bootstrap/write, real Email/ERP/Payment/Refund operation, fetch, push, PR or stash action occurred.
- Production remains release `3904a4404ada5b0107a08d5b9c71a3100f22b447` with 41 migrations.
- Known limitations: no production-executable native Job type, artifact metadata only/no download, no persisted Work Queue/Notifications, and no screen-reader/real Windows forced-colors run.
- Next action: commit this Integration checkpoint/handoff, audit protected Main collisions, strict-fast-forward Main and clean feature branches to the verified tip, then stop and wait for explicit P06 authorization.
