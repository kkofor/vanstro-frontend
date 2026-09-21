# Integration checkpoint — Dashboard P07 authenticated completion

Status: **COMPLETE; pending evidence commit and Main promotion**. This continuity-only checkpoint records the verified P07 completion at canonical Integration HEAD `11d2c83a81e23c45a92b9fed6822d9b3364adca6`. It does not deploy, promote Main, authorize P08, or rewrite earlier blocked evidence.

## Continuity and closure chain

The authenticated acceptance blocker remains preserved in commit `ed44885` and in `tasks/checkpoints/integration-2026-08-03-dashboard-p07-media-library-foundation.md`: authorized controls rendered, but the inherited F0 transport remained `readOnly`, rejected non-GET/HEAD operations before `fetch`, and left restore/retry unexecuted. That was a real tested state, not erased history.

P07 closed forward-only through these domain commits:

- Frontend `1ecc898` authorizes only the exact P07 Media operations; `83a17084` fences mutation responses and selected-Asset/per-kind state.
- Backend `f079cb2` exposes the safe retry binding projection; `0e9f60b` hardens exact retry eligibility.
- Integration received them through normal merges `3eb1e06`, `014564e`, `497e1fa`, and `11d2c83`.

The Frontend operation-aware transport does not accept an arbitrary URL or method. Its exact allowlist is upload-intent `POST`, intent-content `PUT`, metadata `PATCH`, Usage attach `POST`, Usage detach `DELETE`, archive `POST`, restore `POST`, and binding-backed retry `POST`. Before `fetch`, it enforces current actor/context, exact Asset/Usage/Intent identity, authoritative scope/version, top-level and per-Asset capabilities, upload kind/type/byte limits, exact metadata/Usage fields, slot registry, and retry binding. A `401` clears Dashboard data and invokes centralized invalidation.

The additive retry projection is exactly `retryBinding: { jobId, jobVersion, variants: [{ role, expectedVersion }] }`; `expectedAssetVersion` remains the current Asset `version`. Backend emits it only for an authorized failed/resolved Asset with one exact bound failed `media.process.v1` Job, an allowed retryable failure class, an unexhausted generation, complete applicable failed Variant roles/versions, and a non-expired DB-time claim window. It is omitted for read-only, cross-scope, unbound, stale, processing, terminal, nonretryable, exhausted, incomplete, or expired states. Payload, attempts, lease/fencing, storage, checksum/config, and actor internals are not exposed. Retry reuses the same predicate, uses a new idempotency key, and a stale `409` triggers authoritative refresh without automatic replay.

## Authenticated UI-controlled acceptance

Retained browser evidence:

- focused rerun: `/Users/zhangguannan/.claude/jobs/4deaf7fc/tmp/p07-final-browser/rerun-focused/focused-results.json` — `8/8`, `0` failed;
- complete rerun: `/Users/zhangguannan/.claude/jobs/4deaf7fc/tmp/p07-final-browser/followup-full/acceptance-results.json` — `24/24`, `0` failed, `0` not executed.

The focused rerun observed controlled upload intent/PUT, canonical metadata, Usage attach/detach, archive, restore, exact retry binding/idempotency, and stale-conflict no-replay. These eight focused result rows map to seven unique cases within the canonical full matrix: the final two focused rows are the two substeps of the full matrix's single combined retry case. The full matrix therefore comprises those seven unique focused-covered cases plus 17 remaining cases, for `7 + 17 = 24`; focused `8/8` is not additional to full `24/24`. The canonical IDs and exact mapping are recorded in `tasks/checkpoints/integration-2026-08-03-dashboard-p07-case-count-correction.md`. The remaining full-matrix cases passed authenticated list/detail, capability double gates, preview/download fencing, focus restoration, cursor/query behavior, invalid/denied/scoped fail-close, `401` invalidation, 390/320px reflow, forbidden-surface absence, PDF no-inline behavior, and localhost-only network restriction.

This is a **UI-controlled fixture**, not Backend E2E. The evidence is nevertheless real browser acceptance: the test clicked the actual rendered UI controls and verified the fixture-observed requests, bodies, identities, scope, upload token, and idempotency behavior. Backend correctness is supported separately by the deterministic API/DB/Worker/migration gates below.

## Final tested-head gates

At tested Integration HEAD `11d2c83a81e23c45a92b9fed6822d9b3364adca6`:

- API: `203/203` passed.
- Package contracts: `172/172` passed.
- DB: `36` passed, `33` intentional skips.
- Worker: `21` passed, `1` intentional skip.
- Full typecheck and Backend build: passed.
- Prisma generate and validate: passed.
- Owned PostgreSQL 16 migration 62 matrices: fresh `0→62`, P06 `55→62`, P07 `60→62`, direct `61→62` passed.
- Native Linux Media gate: passed for JPEG/PNG/WebP/PDF and unsafe/crash/output-flood/inode/block/hang fail-closed controls.
- Offline HTTPS-fixture static export: `398/398`; French HTML: `196`.
- SEO/artifacts: `392` application routes, `308` indexable URLs, `140` PDPs per locale, `300` catalog SKUs; French-language, 404/static fallback, protected-content, Dashboard inventory, and remaining artifact gates passed.
- Self-hosted Chromium: `40/40` passed.
- Authenticated focused browser: `8/8`; full matrix: `24/24`, with `0` failed and `0` not executed.

Migration 62 remains SHA-256 `ed56e2d7e919dcca6d12913bb4c502bffd2e53a60cdae40d0c8975b4ac51e3a1`. Migrations 56–62 are unchanged from the previously certified chain:

| Migration | SHA-256 |
| --- | --- |
| 56 | `3319634df960a24c23f64bd26c4bef0169438cf3626dda32dcfa079c2106e413` |
| 57 | `14ef85ea337145b07333046f04c15f91a6271e2c07f997939fedf3e3c29c2c6b` |
| 58 | `2670324b81c180ad70d42df726d92871546fdbc45374833c19ca327eefd7fe38` |
| 59 | `3cb2a3248f3f6d625cb1522dedeac12cfced4625cb572a6021ae18ca584d1f77` |
| 60 | `e21c71a427413675719fa25c22f64cdbd65d4b400624ce8a9a10937b5120f2c3` |
| 61 | `3662535ddce270f4a251c784d55deb8e7373ba3eae8b04fdd6e00ccb44e77af3` |
| 62 | `ed56e2d7e919dcca6d12913bb4c502bffd2e53a60cdae40d0c8975b4ac51e3a1` |

## Boundaries and next action

P07 is complete locally. The remaining coordination steps are to commit this evidence and evaluate the separately controlled Main promotion. Production remains release `3904a440` with `41` migrations. No deployment, production migration/write, production storage/provider operation, legacy asset backfill, payment/refund, ERP action, push, or P08 work occurred. Dashboard deployment remains deferred until the full Dashboard is complete and separately authorized. P08 is not authorized.
