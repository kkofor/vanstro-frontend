# Integration — P09 Final Security Completion with migration66

## Evidence chain
- Premature completion `8a127a89627df9fd44357d5dafc5535d2c4eab2e` retained; CP118 downgraded P09; CP120 recorded migration66 authority blocker.
- Contract v1.0 remains FROZEN: 840 LF lines / 37777 bytes / SHA `0732de4d3333d809d174a5b9f0efb809ebc09a3553b04bfd3c2f90133cfef4de`.
- Migration66 chosen rather than Contract narrowing. Path `packages/db/prisma/migrations/20260803130000_dashboard_p09_worker_lifecycle_authority/migration.sql`, SHA `a5a7ded9ac25d9d592b7c0f7791f803be63ecbdb4653ec2ed35c2150207a8dd5`.

## Worker lifecycle authority
- Existing P05 WorkerHeartbeat extended in-place; no second heartbeat/Job/lease authority.
- Nullable conservative backfill means old rows and rolling old writers contribute zero authority/capacity. New Worker registers one row per instance with active lifecycle, generation/version CAS, registry fingerprint, supported Job types, bounded declared/effective capacity and trusted timestamps.
- Legal transitions: startup→active, active→draining, draining→shutdown; same-generation shutdown cannot revive; stale generation/version/instance, active→shutdown, forged timestamps and out-of-range capacity fail closed. Crash/SIGKILL writes no shutdown and freshness derives stale.
- Active fresh compatible instances contribute per-declared Job-family capacity; draining/shutdown/stale/incompatible rows contribute zero. API safely aggregates active/draining/shutdown/stale counts and capacity without exposing instance IDs publicly.
- Worker startup, heartbeat, drain and graceful shutdown use operation-specific SECURITY DEFINER functions. Runtime direct table DML remains denied; PUBLIC execute denied; owner/search_path fixed.

## Migration and owned evidence
- Node22/PG16 independent migration paths passed: 0→66,55→66,62→66,64→66,65→66. Migrations1–65 byte-identical; no migration67.
- Owned current-lineage: DB serial80/80; DB default-per-file80/80 across14 files; API224/224; Worker1/1; critical P05/P07/P06 repeats54/54; zero fail/skip/not-executed.
- Regular: DB80 discovered /45 pass /35 gated skip /0 fail; API191 /179 pass /12 gated skip /0 fail; Worker31 /30 pass /1 gated skip /0 fail. Every gated family is covered in same-lineage owned inventory.

## Canonical browser v2
- Definition SHA `59207b734f7418ed9b63d2245096a51ff57fdfbe1e4b27d90e163d86434a7fca`; fixture `41e991c8d2cc0aea4672b197c8fd9c7c05521e78de17f7f07e33420bb30c577e`; harness `4269c149c4145af2bd19306e9709485f08433f4dac8cf0825b818d3ee750a46a`; result `d6e4cac0f5fd8ee5484ab8b5d4d807cfc8fc1b03daedd2eb159b0cd2485418d6`.
- P09-A01…A17:17 pass /0 fail /0 skip /0 not-executed. Required config proposal, activation/failure/retry/rollback, flag proposal/activation and kill are driven through rendered controls. A09 prepares three legal layers then observes scope-selected effective state rather than checking definition text.

## Deterministic full gates
- Prisma generate/validate; Web/DB/API/Worker/CLI TypeScript; DB/API/Worker/CLI builds passed.
- Package contracts201/201.
- Production-configured static build passed:399 HTML,198 fr-CA. P08 `400/400` was a prior gate count, while `find out -name '*.html'` on current lineage is399; source diff adds EN/fr runtime routes and deletes none, so no route loss is evidenced. SEO396 application/308 indexable/140 PDP per locale/300 SKUs; language/404/fallback/privacy/protected artifacts passed.
- Full self-host Chromium40/40, zero fail/skip/not-executed.

## Git and boundary
- Backend forward commits include migration65/owned/readiness closure, migration66 lifecycle and verification follow-ups; Frontend forward commits add rendered rollback/disable controls and stable form/scope binding. Integration accepted domains by normal two-parent merges and owns browser/evidence only in this closure.
- Main protected 80-record manifest under original P08 algorithm remains `ce73d578...`; stash remains `23fc05dc...`.
- No production access/migration/provider/storage/deploy, no P10, no migration67.

`production deploy: deferred until full Dashboard completion`
