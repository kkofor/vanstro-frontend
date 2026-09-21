# Integration — P09 Contract Freeze

## P08 prerequisite

- Certified four-line baseline: HEAD `2482cc2fa95285b6a4e8024b9eb3a8746a6b76bd`, tree `a9976fcd7e888d4cbd938e425e2acd5c7bc0eaf2`.
- Main, Integration, Frontend and Backend standard worktrees were on the exact baseline; Integration/Frontend/Backend were clean and Main tracked state was clean with 80 protected untracked records.
- P08 checkpoint evidence remains internally complete: contracts `191/191`; regular DB `42 + 33 gated`, API `177 + 12 gated`, Worker `30 + 1 gated`; owned DB `75/75`, API `20/20`, Worker `1/1`, critical repeats `54/54`; canonical browser `P08-A01…P08-A17` `17/17`; static `400/400`, fr-CA `197`, SEO `394/308/140/300`, Chromium `40/40`.
- The gated test sources map to the same P05/P06/P07/Audit/P02 owned fixture files named by the P08 Integration checkpoint; no contradictory product evidence was found. No meaningless P08 correction commit was created.
- Migration64 source SHA remains `d6ead56d787ff59cbffe0b12dd7172194ec4f94a27c6df4a3afd78fa6a8e426a`; local source has 64 migration directories; production remains 41 and was not accessed.
- Stash object remains `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`. The protected path set remains 80 records; the previously documented manifest used a historical serialization and current direct NUL/newline path serializations were recorded separately rather than misrepresented as a change.
- Existing temporary agent worktrees were audited. One historical dirty worktree preserves 20 modified and 5 untracked P07 interruption artifacts at unrelated historical tips; it was not modified, cleaned, removed, or used for P09.

## Phase 0 authority

The 30 frozen Phase 0 Markdown assets under `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-phase0-20260731/` were read as applicable and `SHA256SUMS` verified all 30 files. P09 authority includes owner, RBAC/scope, capability, API/DTO, status/action, sensitive-data, Audit, Async Job, migration, risk, release/flag, Stage B, acceptance, open-decision and validation assets.

## Existing implementation inventory

- API config is startup environment authority in `apps/api/src/config.ts`; it validates deployment secrets, runtime mode, query/Audit/Job/Work Queue readiness, HMAC keysets, Media digests, inventory source and payment simulation.
- Worker config is startup environment authority in `apps/worker/src/config.ts`; it validates database, polling/lease/attempt intervals, SMTP and ERP groups, TLS, provider URL and secret shape.
- Existing public API health in `apps/api/src/app.ts` separates `/health/live` from readiness but readiness still uses an old fixed migration compatibility check and a narrow Common Query projection.
- Existing P03/P05/P06/P07 readiness functions and persisted authoritative state are adapters to reuse, not a second P09 truth source.
- Existing Dashboard module readiness/config and CMS payload shapes are contract-drifted legacy surfaces and are not a P09 runtime-config authority.
- Existing `NEXT_PUBLIC_*` values are build-time inputs; they are not runtime mutable. P09 freezes an exact public allowlist and server-only bundle exclusions.
- Existing Email provider database state, ERP/Payment/storage environment inputs and production safety locks remain their existing authorities. P09 observes only redacted configured/valid state and cannot override them.
- No existing generic runtime config or Feature Flag persistence authority was found.

## Frozen canonical Contract

```text
Path: /Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p09-runtime-config-flags-readiness-contract-v1.0-20260803.md
Version: v1.0
Status: FROZEN
Lines: 840
Bytes: 37777
SHA-256: 0732de4d3333d809d174a5b9f0efb809ebc09a3553b04bfd3c2f90133cfef4de
Supersedes: none
```

The Contract freezes the smallest safe P09 foundation: three synthetic owned-test config descriptors, one synthetic owned-test flag, protected observation-only deployment descriptors, exact source precedence, desired/effective and activation semantics, CAS/idempotency/rollback, deterministic targeting, independent kill permission/confirmation, passive no-side-effect readiness, P02/P04 reuse, bounded cache/propagation, exact API transport, Simplified Chinese UI, and canonical `P09-A01…P09-A17` browser acceptance.

It explicitly excludes P10, Search Console, production rollout/provider/storage/config/migration/deploy, arbitrary environment/schema/JSON/path/command/code/eval/SQL/URL/proxy, plaintext secrets, arbitrary probes, and any second Job/Audit/Notification/Scope/approval/provider/storage authority.

No unresolved Phase 0 constraint contradiction remains after the Contract narrows mutable behavior to synthetic owned-test descriptors and keeps real deployment/provider configuration observation-only. Persistence is required for durable CAS/history/propagation; therefore exactly one forward-only migration65 is authorized by the Contract. Migration66 is forbidden.

## Boundary

No product code, database, production service, provider, storage, deployment, P10, migration65 or migration66 was changed by this freeze checkpoint.

`production deploy: deferred until full Dashboard completion`
