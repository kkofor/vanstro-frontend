# Frontend checkpoint — Dashboard P08 v1.2 Import/Export Foundation

- Branch/worktree: `feature/frontend`, `.claude/worktrees/frontend`
- Exact parent/shared baseline: `f2c3879c58184c951d5dc7b04babf7659f23e12e`
- Frozen contract: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p08-import-export-foundation-contract-v1.2-20260803.md`
- SHA-256: `128ae596734963b77269e18e01894789733de782449033a5669bcf8b8f28db9d`
- Immutable v1.1 `a0b6...` and drift `b925...` are historical evidence only and are rejected as current authority.

## Delivered

Frontend-only P08 adds canonical EN/fr `/dashboard/data-jobs` route ownership, strict `foundation.sample` registry enforcement, exact import/export/list/detail/preview/upload-intent DTO validators, P03 cursor metadata validation, safe progress/status/expiry display, normalized row validation and commit outcomes, and strict unknown-field/status/formula/hash rejection. Reserved objects and arbitrary scope/query/URL inputs fail closed.

The global F0 Dashboard remains read-only. P08 alone receives an exact operation-aware transport. Callers cannot supply a URL or method. It constructs only canonical import create/content/commit/cancel, export create/cancel, and authenticated download operations. The content PUT is the sole upload finalize operation; no upload-complete route exists. Upload and download set `redirect: error`; download consumes response bytes through the authenticated application request and creates only a short-lived local object URL for the browser save action. No public/provider URL or redirect is accepted.

Six P08 permission keys are independently projected from the already validated P02 action list; generic jobs permissions grant nothing. Resource DTOs require exact server-computed `read/create/commit/cancel/download` capability booleans, and mutations/download require both their top-level permission gate and resource-level capability. Actor/context identity is bound to `${actor.id}:${contextRevision}` before every operation. Version, resource ID, status, current summary impact, object key, upload intent endpoint/token and export formula are rechecked before fetch.

The Simplified Chinese UI provides separate import/export P03 cursor histories with Previous/Next/Restart, opaque preview Previous/Next/Restart controls, server-authoritative status/expiry, CSV-only selection, atomic polite live progress, deeply validated normalized values, and field-aware validation errors distinct from terminal commit errors. `completed_with_errors` remains inspectable. Destructive commit is available only for `preview_ready` plus both gates, opens an accessible trapped modal, states valid/invalid row impact and possible partial completion, keeps failures as an alert inside the active dialog, and restores focus predictably. Direct route detail IDs load exact detail/preview endpoints. Every operation including bytes is abortable and post-await actor/context/latest-generation fenced. Requested P03 created-time/status sort and tie-breaker are validated. Retry operations/routes/controls are absent. The interface does not expose reserved objects, user-defined mapping/formulas, storage paths, order/payment/PII surfaces, public downloads, or legacy redirects.

## Verification

All formal commands used Node `22.22.2` through `PATH=/opt/homebrew/opt/node@22/bin:$PATH`.

- Focused P08 remediation `pnpm run test:dashboard-p08`: `18/18` passed at final source.
- Complete frontend package contracts: `190/190` passed at final source, including P02–P07 regression guards.
- `pnpm run typecheck:web`: passed at final source.
- `pnpm run qa:seo-security`: passed.
- `pnpm run test:final-review`: passed.
- `pnpm run qa:fr-ca-display-format`: passed.
- Production-configured static `build:pages`: `400/400`; localized and verified `197` French HTML files.
- Static SEO artifacts: `394` application routes / `308` indexable / `140` PDPs per locale / `300` catalog SKUs.
- French language, 404/static fallback, and protected-content artifact gates passed.
- Dashboard artifacts: exactly `46` EN/fr HTML; Chinese Dashboard routes: `0`; explicit EN/fr data-jobs artifacts exist.
- `git diff --check`: passed.

`qa:error-localization` is blocked by a pre-existing shared-baseline mismatch: Backend's public error catalog contains nine P06 `WORK_ITEM_*` / `NOTIFICATION_*` codes absent from Frontend `PUBLIC_API_ERROR_CODES`. P08 did not introduce or modify those codes. This frontend unit did not widen into backend-owned/error-catalog reconciliation. The preceding SEO/security and final-review commands passed before the chain stopped.

The external contract matched the authorized SHA-256 `a0b6ff6b63c7e21bddf7b587f408ca85dc17e6d50eb5c996c9b803f96af9e977` at startup. A closure recheck found it had changed outside this Frontend work to SHA-256 `b92573ea305a1c51dbf1b0704eeaff45e84a6b8f7370eb05bb7f0531a4c9fad3`, including changed upload status/prefix semantics. The Frontend did not edit that external file. This authority mismatch blocks the focused commit until the coordinator reconciles which frozen bytes govern P08.

Not run: authenticated Backend P08 browser/fixture matrix, actual CSV upload/parse/commit/export/download, 401/scope/context/stale races against the Backend implementation, VoiceOver/NVDA/JAWS, real Windows forced-colors, `qa:browser-current-tree`, Backend/API/Worker/DB/migration 63 suites, or production QA. Integration owns cross-domain acceptance.

## Boundaries

No `apps/api`, `apps/worker`, `packages/db`, Prisma, migration, backend-owned DTO implementation, deployment, production write/migration, push, commit, payment/refund, order data, PII, public artifact delivery, or stash operation was performed.

## Next action

Parent reviews and creates the focused Frontend commit, then Integration receives both domain commits and runs exact shared-wire plus authenticated UI-controlled acceptance for all six permissions, global/dealer/location scope, context/actor invalidation, preview-to-commit impact, partial outcomes, cancellation, expiry, controlled no-redirect bytes, keyboard/focus and narrow reflow. Do not deploy until the complete Dashboard program is finished.
