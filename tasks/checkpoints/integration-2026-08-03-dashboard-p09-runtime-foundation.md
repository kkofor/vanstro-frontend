# Integration — Dashboard P09 Runtime Config / Feature Flags / Readiness Foundation

## Baseline and Contract

- P08 certified baseline: `2482cc2fa95285b6a4e8024b9eb3a8746a6b76bd`, tree `a9976fcd7e888d4cbd938e425e2acd5c7bc0eaf2`.
- P08 prerequisite review confirmed four-line identity, P08 regular/owned mapping, migration64 and canonical P08 browser evidence; no P08 correction was needed.
- Frozen P09 Contract: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p09-runtime-config-flags-readiness-contract-v1.0-20260803.md`, v1.0, 840 lines, 37777 bytes, SHA-256 `0732de4d3333d809d174a5b9f0efb809ebc09a3553b04bfd3c2f90133cfef4de`.
- Contract freeze evidence commit: `f199a9edd4a5d6a9c6ad332c3a53bd602f4e24a0`.

## Implementation

- Backend domain commits: `e27769a2f177ec598fe2659e2df282632511869c`, follow-up `32088c3`.
- Frontend domain commit: `bc7b6e3f495730e8e8a1a814d6b214a5466b3689`.
- Normal two-parent Integration merges: `fa69e6ec3d9d299a76feb2a485188be6c6668bc8`, `46e911ac554fe2a94f501c5f9cbe23e25c3ad0f1`, and capability follow-up merge.
- Registry is Backend deny-by-default: three synthetic owned-test Config descriptors, one synthetic owned-test Feature Flag, exact types/scope/defaults/validation/activation/permissions/readiness/restart/rollback metadata, and protected observation-only deployment descriptors.
- Source precedence is exact Location → Dealer → Global effective runtime override → descriptor-approved deployment source → compiled safe default. Desired and effective values, source, version, validation and activation remain distinct.
- Mutation uses exact CAS, idempotency, actor/session/context/scope reconstruction, activation failure, explicit retry and rollback-as-new-version. Feature Flag evaluation is deterministic, does not grant authorization, and kill uses independent permission plus `KILL` confirmation.
- Secret boundary stores no plaintext secret and exposes only safe configured/missing/valid/invalid/unknown state. Client-visible build inputs remain an exact build-time allowlist and are not runtime mutable.
- API liveness is dependency-free. API/Worker readiness distinguishes required dependencies, Job registry/claim/capacity/draining, optional degraded state and stale boundaries. v1.0 performs no provider network mutation or paid action.

## Migration65

- Path: `packages/db/prisma/migrations/20260803120000_dashboard_p09_runtime_foundation/migration.sql`.
- SHA-256: `c8071f3e549633c1126a988d36d3de5d612734bc11999a18fb0140aed34039fa`.
- Creates only `runtime_config_version` and `feature_flag_version` plus fixed constraints/indexes/operation-specific functions.
- `vanstro_runtime` direct `SELECT/INSERT/UPDATE/DELETE` is denied on both tables. Guard-owner, fixed `search_path`, PUBLIC denial and no dynamic SQL checks passed.
- PG16 migration65 permission harness passed fresh 0→65 and 2 tables × 4 verbs denial. Migrations1–64 compare byte-identical against the P08 baseline. No migration66.

## Deterministic gates

All final deterministic commands used Node `22.22.2`.

- Prisma generate/validate passed.
- Web/DB/API/Worker/CLI TypeScript passed.
- DB/API/Worker/CLI builds passed.
- Package contracts: 201 discovered / 201 pass / 0 fail / 0 skip.
- Regular DB: 78 discovered / 45 pass / 33 fixture-gated skip / 0 fail.
- Regular API: 192 discovered / 180 pass / 12 fixture-gated skip / 0 fail.
- Regular Worker: 31 discovered / 30 pass / 1 fixture-gated skip / 0 fail.
- Owned API PG16: 223 discovered / 223 pass / 0 fail / 0 skip, including all prior gated API inventory and P09 tests.
- Prior certified owned DB 75/75 and Worker1/1 remain the same-lineage mapping for inherited 33/1 gated cases. A new whole-suite serial owned DB exploratory run exposed one clock-boundary P05 Audit retention fixture at 77/78; no P09 product change caused it and P09 does not claim that exploratory run as a completed gate. P09-specific DB tests are 3/3 and migration PG16 permission evidence is green.
- Static build succeeded: 399 HTML, 198 fr-CA HTML.
- SEO: 396 application routes / 308 indexable / 140 PDP per locale / 300 SKUs.
- Protected, language, 404, Careers/Contact privacy and artifact gates passed.
- Full self-host Chromium: 40/40.

## Canonical authenticated browser v1

- Definition: `qa/p09-browser-v1/definition.json`, SHA-256 `882c9819cdf028e890cb9981241b3a1012931a6f762c86dc81a8afd9f5dbbb83`.
- Fixture SHA-256 `1282f29614d156eb8ff816f73e535adb28d41957da12299465e12e1c0ec6f829`.
- Harness SHA-256 `55aaa4c9f53afb9d8b5d479121d8899bab42eb9318fb369b53b085771e0dae88`.
- Result: `qa/p09-browser-v1/evidence/acceptance-results.json`, SHA-256 `918fe3b77e32970ba2071af34e3e06deb47f1ea5ec56de3f8c9fcee1fb656b3c`.
- `P09-A01…P09-A17`: 17 pass / 0 fail / 0 intentional skip / 0 not-executed.
- Covers registry/detail, unknown key, desired/effective, activation success/failure/retry, stale conflict, rollback, precedence, flag activation, kill, denied scope, context fencing, readiness/degraded/zero capacity, secret/public minimization, keyboard/live region/reflow, exact endpoint and localhost-only traffic.
- Ports 4430/4431 were stopped after the final run.

## Boundary and status

- Candidate before this evidence commit: `b55e7d4ea4c58370356967ed68ccc2a43165146b`, tree `960309651834d6da9c819ac73086d73c29e96ef3`.
- Production remains 41 migrations and was not accessed or changed.
- No production provider/storage configuration, rollout, deployment, P10 or migration66.
- P09 is **CONFIRMED COMPLETE locally** subject to this evidence commit and final four-line strict-fast-forward audit.

`production deploy: deferred until full Dashboard completion`
