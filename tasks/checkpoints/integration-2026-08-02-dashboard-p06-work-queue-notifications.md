# Integration checkpoint — Dashboard P06 Work Queue / Notifications Foundation

## Candidate and frozen scope

- Integration worktree/branch: `.claude/worktrees/integration`, `integration/fullstack`.
- Shared P05 parent: `9a3ea56218696ccc6362bd0d3f307c23c12aecf0`.
- Final verified P06 code tip before this evidence commit: `5a7f016f271894c4251c435e2db3f418b095876d`.
- Verified code tree: `9f69666cc1292648af618a7b4085edad20501205`.
- Frozen P06 v1.8 contract: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p06-work-queue-notifications-contract-20260802.md`, 949 lines, SHA-256 `164443da75a494dd817b3aa7786dd06b074dedcbf9a29fe96578834a5f5a4aa0`.
- Production remains release `3904a4404ada5b0107a08d5b9c71a3100f22b447` with 41 migrations. No production access, deployment, migration or write occurred.

## Integrated architecture

P06 adds a native Work Item overlay, recipient-specific in-app Notification store and read-only Domain adapter registry. A Work Item references a real Domain resource or platform event and never becomes a second Order, Payment, Inventory, ERP or Job state machine. Queue transitions do not mutate their referenced Domain state or P05 Job.

- The sole frozen native type is test-runtime-only `foundation.attention`, sourced from `async_job`; no production-native producer is registered.
- Status, severity, health, source/resource identity, safe summary, occurrence, SLA/due, assignment, acknowledge, resolve, dismiss and reopen semantics are registry-constrained.
- `foundation.attention` has no attention-expiry policy: DB and Frontend reject `expired` and every `attentionExpiresAt`.
- HMAC-SHA-256 active/verify-only key rotation, persisted-kid readiness, canonical raw-identity advisory locks and active-occurrence uniqueness protect deduplication.
- P02 grants and source scope constrain list, detail, unread, assignment and transition access. Transaction-local reauthorization and canonical lock ordering apply to mutations.
- P03 `common-query.v1` supplies exact frozen filters, stable `createdAt desc, id desc`, time anchors and actor/context/grant/profile-bound opaque cursors.
- P04 records same-transaction scoped Audit for authoritative writes and source-health changes. Failed/denied handler evidence is redacted and best-effort without reading unauthorized targets.
- Notifications are in-app only, recipient-specific and scope-constrained. Notification read/unread is distinct from Work Item acknowledgement. No Email/SMS/Push delivery or provider call exists.
- Frontend exposes read-only Simplified Chinese Work Queue and Notification views at `view=work-queue|notifications`, with presets, explicit filters, exact list/detail/summary/adapter/unread validation, safe deep links, in-memory cursors and shared Table/DetailDrawer. No Queue action or mark-read control is mounted.

## Immutable forward migrations

All already-applied migrations were preserved byte-for-byte. P06 uses migrations 47–55:

| Migration | SHA-256 |
| --- | --- |
| `20260802140000_dashboard_p06_work_queue_notifications` | `0d0eab8aec56386465ccda3fe12fb55307d8434642e13ac8d017ee8e4ce84679` |
| `20260802141000_dashboard_p06_identity_guards` | `ad3b03b04b9fe61f0f91c9448e8704dcea2ddd3e0453fbdcc388acdf9f14eab5` |
| `20260802142000_dashboard_p06_typed_transition_guards` | `b75170b6be4c68f6617f2933e2cce27ef7e67b994d11c63ada43d46d1656dee4` |
| `20260802143000_dashboard_p06_exact_transition_families` | `c775915c597047e11f2c780eddf2f6cc8e08cb50151397b6d5bb59d18728d9c5` |
| `20260802144000_dashboard_p06_observation_guard` | `02996ae2b25e4ae4b4e81b9b93b23577f84669764e14e2de5cf05d8e06ed15a7` |
| `20260802145000_dashboard_p06_action_guards` | `723ff4960c1e8f699729ac2d97126c097893e3c8d85d9933652ff85e876ffdc9` |
| `20260802146000_dashboard_p06_reopen_assignment_guard` | `9de8aa14b707c31cc9726362ec40ab64416c73d328674bbaae194a096cf3a687` |
| `20260802147000_dashboard_p06_reason_registry_guards` | `64539e67329683c2c651b8d183129898b52444cffb61d9df63288235417b3b6f` |
| `20260802148000_dashboard_p06_expiry_policy_guard` | `0d0b3ee77699a93489d3645cfb97acb7f4149a2cf6a27d8cbf922712db55de8d` |

Local `vanstro_dev` reports exactly 55 migrations and schema up to date. Backend-owned disposable evidence passed upgrade and fresh `0→55`, concurrency, transition, Audit, dedup rotation, source-health and expiry-policy matrices; all owned disposable databases were dropped. Production stayed at 41 migrations.

## Findings closed during Integration

Integration reconciled and verified the following Blocker/High/Medium-class findings before promotion:

- exact Work Item summary, adapter and Notification registries/envelopes;
- complete cursor metadata, safe/sensitive assignment profiles and unread summary;
- identity/typed-transition DB guards, exact changed-column families and same-summary observation;
- canonical cross-kid index/reopen lock ordering and one-active-occurrence behavior;
- Notification scope pushdown and action-specific permission/reason provenance;
- terminal/orphan action constraints, fresh restoration, severity/SLA behavior and critical Notification rollback;
- SourceState wiring and same-transaction Audit;
- action denial/failure evidence and expiry-policy enforcement;
- URL preset/filter canonicalization, capability rollback, actor/query async isolation and deep-link allowlist;
- strict lifecycle date/actor/retention/assignment validation;
- Frontend `foundation.attention` expiry invariant.

The final controlled browser pass then found one additional promotion blocker: authorized P06 URLs intentionally skipped legacy `loadTab`, leaving the legacy resource state `idle`, but `DashboardF0ReadOnlyContent` returned the legacy loading screen before mounting `WorkQueueFoundationPanel`. Frontend commit `b648c6cd1458d41f947fe0efa3b8fe58ee7a01b1` moves the authorized P06 branch after capability-off fail-closed handling and before legacy resource-state gates. A regression locks this render order. The fix was normally merged as `5a7f016f271894c4251c435e2db3f418b095876d`.

Final targeted Backend and Frontend review after this fix found no remaining reproducible Blocker, High or Medium. The promotion gate is therefore open subject to evidence commit and Main collision audit.

## Final deterministic verification

Authoritative rerun used Node `22.22.2` and pnpm `11.13.0` at code tip `5a7f016f…`:

- Prisma Client generation: passed.
- Prisma schema validation: passed.
- Migration status: 55 found, schema up to date.
- Full TypeScript: passed for Web, DB, API, Worker and CLI.
- Backend builds: passed for DB, API, Worker and CLI.
- DB suite: 13 passed, 0 failed, 23 intentional owned-disposable skips.
- API suite: 173 passed, 0 failed, 8 intentional owned-disposable skips.
- Worker suite: 12 passed, 0 failed, 1 intentional owned-disposable skip.
- Package contracts: 151/151 passed, including the P06 loading-order regression.
- Existing-database preflight: `{ "ok": true, "failures": [] }`.
- `git diff --check`: passed.

The first attempted final command used shell-default Node `25.9.0` and ran Prisma validation before loading the root `.env`, so it failed safely on the engine mismatch and missing `DATABASE_URL`; it is not claimed as evidence. The complete authoritative chain was rerun with `/opt/homebrew/opt/node@22/bin` and the root local development environment loaded.

## Static and browser verification

A clean production-configured static build used only the previously verified public read-only configuration:

- `VANSTRO_WEBSITE_API_BASE_URL=https://vanstro.ca/api/v1`
- `NEXT_PUBLIC_API_BASE_URL=https://vanstro.ca/api/v1`
- `NEXT_PUBLIC_SITE_URL=https://vanstro.ca`
- `VANSTRO_STATIC_EXPORT=true`

Results:

- Next static generation: 396/396 routes.
- Exported HTML: 393.
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale and 300 catalog SKUs.
- French HTML: 195.
- 404/static fallback, Careers/Contact privacy and protected artifacts: passed.
- Dashboard HTML: exactly 42 EN/fr artifacts; Chinese Dashboard artifacts: 0.
- Chromium current-tree regression: 40/40.

An unconfigured clean build first failed safely because `VANSTRO_WEBSITE_API_BASE_URL` was absent and produced no usable `out`; no guard was bypassed. The configured build and every artifact gate were then rerun successfully.

A controlled local Next runtime plus strict API fixture verified:

- authorized Work Queue list, exact summary, critical-outside-filter warning, separate adapter state, detail drawer and Job read-only deep link;
- authorized Notification unread count, list/detail and explicit separation from Work Item acknowledgement, without executing mark-read;
- critical preset canonicalization to concrete `severity=critical` and contradictory preset/filter fail-closed behavior;
- capability-off strict view with zero Work Queue/Notification requests and functional Clear View;
- narrow viewport with no root overflow;
- GET-only business traffic and no Queue mutation, Notification mark-read or external delivery.

Fixture setup failures were not product failures: the first fixture revision lacked CORS preflight headers, and its first Notification deep link was outside the frozen allowlist. Both fixtures were corrected before evidence was collected. Ports 4350/4351 and all P06 fixture/runtime processes were stopped.

## Exclusions and release status

No P07–P10 work, Media Library, complete Notification center/delivery, Email/SMS/Push, Command Center, Global Search implementation, Import/Export, AI Studio, business-module rewrite, old alert/queue deletion, real payment/refund/ERP action, fetch, push, PR, stash operation, deployment, production migration or production write occurred.

Next action: commit this Integration evidence, audit all incoming Main paths against protected untracked files, strict-fast-forward `main`, then strict-fast-forward the clean Frontend and Backend branches to the verified Integration tip. Verify all four standard lines share one HEAD/tree and stop for explicit P07 authorization.
