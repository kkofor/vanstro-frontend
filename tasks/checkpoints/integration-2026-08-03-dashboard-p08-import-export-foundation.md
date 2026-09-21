# Integration — Dashboard P08 v1.2 Import/Export Foundation

## Contract authority

- Immutable v1.1: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p08-import-export-foundation-contract-v1.1-immutable-a0b6ff6b-20260803.md`, SHA-256 `a0b6ff6b63c7e21bddf7b587f408ca85dc17e6d50eb5c996c9b803f96af9e977`.
- Unauthorized drift snapshot: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p08-import-export-foundation-contract-unauthorized-drift-v1.1-b92573ea-20260803.md`, SHA-256 `b92573ea305a1c51dbf1b0704eeaff45e84a6b8f7370eb05bb7f0531a4c9fad3`.
- Canonical v1.2: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p08-import-export-foundation-contract-v1.2-20260803.md`, SHA-256 `128ae596734963b77269e18e01894789733de782449033a5669bcf8b8f28db9d`.
- Rejected v1.2 candidate evidence: `dashboard-p08-import-export-foundation-contract-v1.2-candidate-rejected-f516a0e8-20260803.md`, SHA-256 `f516a0e878af3057a0cd72bd005093e81eba756652f64e61972bc50a08d2e953`.

The exact 12-hunk v1.1→drift review and blocker attribution are recorded in AI_OS CP109; dirty recovery inventory is CP108; final Contract freeze is CP110.

## Domain commits and merges

- Backend commit: `c132ebd832042014cb7afabf888c3d752e90c536`.
- Frontend commit: `1c3a367aca54f781d6edd61b2df8733feb6de6b7`.
- Backend normal merge: `83b0fd6bc646725fbbfa0c8da8ccaaee47df0c3e`, parents `f2c3879...` + `c132ebd...`.
- Frontend normal merge: `87831e05d36191befd1d18cfd8e8a68b695919f8`, parents `83b0fd6...` + `1c3a367...`.
- No manual conflict. Automatically merged `package.json` and `src/lib/api/api-contract.ts` were reviewed and retain both Backend and Frontend P08 contracts/tests.

## Integrated behavior

- `foundation.sample` is the only enabled native object; category/product_metadata/media_metadata remain disabled; Order/Payment/PII business objects remain absent.
- Create returns `awaiting_upload` without Job/Artifact.
- Controlled PUT is the sole finalize operation and carries exact method/path/body/token/content length/version/idempotency; no upload-complete route exists.
- Finalize commits one parse Job + sole P05 source Artifact + `uploaded` batch/token/Audit/idempotency atomically at the DB visibility boundary.
- Exact actor/context/scope/field-visibility binding applies; no equal-or-narrower reuse.
- P05 `JobArtifact` is the only Artifact hash/size/expiry/storage/deletion authority; no P08 copy or P05 shared availability/fencing extension.
- Preview binding uses hash + expected version + idempotency and no nonce.
- Export neutralization, controlled same-request download, partial row outcomes, P05 fencing, P06 queue, P04 Audit and P07 private storage boundaries are retained.

## Migration 63

- Path: `packages/db/prisma/migrations/20260803100000_dashboard_p08_import_export_foundation/migration.sql`.
- SHA-256: `be8770e4eee6ed6889ab520b98cea2d87924c9a419b45cf0687233d20053b4d4`.
- Exactly four P08-owned tables: `dashboard_import_batch`, `dashboard_import_row`, `dashboard_export_request`, `foundation_sample`.
- No P05 schema extension/backfill; migrations 1–62 unchanged.
- Before correction, no accessible persistent/shared DB had migration 63; stopped Docker persistent volume remained unknown under strict read-only audit. Final migration was applied only to owned disposable PG16.
- Matrices passed: fresh `0→63`, P06 `55→63`, P07 `62→63`, isolated sentinel, runtime positive/negative role boundary.

## Deterministic gates — Node 22.22.2

Passed at Integration merge tip:

- Prisma generate and validate.
- Full TypeScript: Web/DB/API/Worker/CLI.
- Backend builds: DB/API/Worker/CLI.
- Package contracts: `191/191`.
- DB: `39` passed / `33` intentional owned-disposable skips / `0` failed.
- Worker: `30` passed / `1` intentional owned-disposable skip / `0` failed.
- API with canonical local `.env`: `177` passed / `12` intentional owned-disposable skips / `0` failed.
- Static export: `400/400`.
- fr-CA localization: `197` HTML.
- SEO artifacts: `394` application routes / `308` indexable / `140` PDPs per locale / `300` SKUs.
- French language, 404/static fallback and protected artifacts.
- Self-host Chromium: `40/40`.
- `git diff --check` and clean Integration tracked tree.

## Authenticated UI-controlled browser matrix

Evidence:

```text
/Users/zhangguannan/.claude/jobs/4deaf7fc/tmp/p08-browser-evidence/acceptance-results.json
SHA-256 60a05a8b0db7eab4d11c58f58c8d08cdb131f3861fc9cb390763062da2c61245
```

Final result: `16 pass / 0 fail / 0 intentional skip / 0 not executed`.

The browser used rendered controls and observed fixture/API traffic for:

- create `awaiting_upload`;
- controlled PUT finalize with token, exact `Content-Length`, `If-Match`, idempotency and actor/scope observation;
- no second finalize/upload-complete request;
- validation preview and row errors;
- commit confirmation and partial success;
- export generation and controlled download;
- status/live semantics;
- operation allowlist and localhost-only traffic;
- keyboard/focus/live region;
- 390px and 320px no-overflow reflow;
- stale actor/context post-await fencing (paired with deterministic focused transport test);
- formula-safe export (paired with deterministic Backend final-byte test).

This remains a UI-controlled fixture, not a substitute for Backend E2E. Backend correctness is independently supported by API/DB/Worker/migration tests. Two harness attempts were retained as failed evidence: the first exposed a fixture lifecycle timestamp error and the second exposed a Playwright API misuse; neither was counted. The corrected run was executed from a reset fixture and produced the final JSON above without manual result editing.

Ports 4400 and 4401 were stopped and verified free.

## Boundary

- No production DB/storage access or migration.
- Production remains 41 migrations.
- No deployment, push, P09, real payment/refund, ERP release or stash action.

`production deploy: deferred until full Dashboard completion`
