# Integration — v1 S01B corrective readiness and evidence closure

Date: 2026-08-05
Status: **COMPLETE AND LOCALLY VERIFIED — CG01 AND S02 NOT STARTED**

## Authority and forward correction

Coordinator prompt SHA-256: `70458eeb6fe90f841c88b8c7339716e17a185e8085a30446a501f9fb8e460d2f`.

The previous S01B completion claim at `a30415e` was rejected after independent review at `1 Blocker / 0 High / 2 Medium`. It remains immutable history. This checkpoint forward-corrects that record; it does not rewrite the earlier checkpoint.

Corrective contract commit: `1cdbed2ad66dfa1abacf2d511b286c75d2053397`.

## Blocker closure — real consumer-generation readiness

The real product chain is now:

1. Backend reads the active publication row and append-only event stream.
2. `publishedGeneration` is the active publication's `published | rollback_published` `publicationSequence`, never draft CAS, row generation, or React request generation.
3. No publication projects stable generation `0` and compiled value `60`.
4. `GET /dashboard/settings/readiness` accepts optional canonical `consumerGeneration`; missing/mismatch are degraded, malformed is stable 400, exact match alone is ready. It is side-effect-free.
5. Frontend first reads the projection, clears the old timer, installs the returned interval, records the applied generation, then performs a second readiness GET with that generation.
6. Actor/request/unmount replacement clears and fences the old timer. The timer performs an actual Overview reload.

Backend domain commit: `3da5bf97b32faf0bbcc74c353163e2728e733046`; normal Integration merge `c06b84d24c4e9565cea44fbaff9bffd1482b2b0c` with parents `1cdbed2...` and `3da5bf9...`.

Frontend domain commit: `e5750096efb60b5d7207f022800efbfef9229bef`; normal Integration merge `224d51868ce13d9bd10cd0e10b30238ac13831fd` with parents `c06b84d...` and `e575009...`.

## Browser evidence corrections

Persisted corrected result: `tasks/evidence/v1-s01b-settings-browser/acceptance-results.json`.

- 25 pass / 0 fail / 0 skip / 0 not-executed.
- Unexpected console errors: 0; unexpected requests: 0.
- Actual tested product+harness commit: `cc2161aca75105b4c3a9df8edcfd8f4f7c651f8f`.
- Tested tree: `dc16f52776af418871e96595a6b3ee0aa6f522f2`.
- Evidence commit: `99e1814db26b8cea0e0046b248f1b1cb21640a9e`.
- Result SHA-256: `d1313ea4c8a1df2a60d514469d040cb686dbef741740d47c8dde2ed8bdff4b7f`.

Corrected unique evidence:

- S01B-14 performs real rollback-draft 201, validate 200, diff/review, publish 200, appends `rollback_published` sequence 5, and preserves the source publish Audit identity.
- S01B-17 proves malformed UUID exactly 400 and valid missing UUID exactly 404.
- S01B-21 really publishes 15 seconds and observes an Overview reload after 14.20 seconds in the accepted 13–19 second window.
- S01B-22 proves stale generation degraded and installed generation ready from an existing publication.
- S01B-24 proves Settings writer, Settings read-only, and a non-Settings route retaining `只读模式`.
- Required element lookup now fails with a bounded diagnostic instead of silently no-oping.

The old result's real tested commit was `273cd60ccba127d2596e14784753fa0523603826`; `6c9e841` was only the later evidence-file commit. This checkpoint supersedes the old inaccurate `testedCommit=6c9e841` prose.

## Deterministic gates

Persistent gate summary: `tasks/evidence/v1-s01b-corrective-gates/summary.json`.

- Corrective contract: 4/4.
- Frontend corrective focused: 47/47; timer helper 3/3.
- Complete package contracts: 247/247.
- Regular API PostgreSQL16 on Node22: 257 total / 245 pass / 0 fail / 12 intentional skip. Log SHA `89de70b00bb15f7a097c73497189a0cce6184f880bec5f5278d9c44a8b4a740f`.
- DB: 50 pass / 0 fail / 36 intentional skip.
- Worker: 31 pass / 0 fail / 1 intentional skip.
- Monorepo typecheck and all Backend builds: pass.
- Prisma generate and validate: pass (validate rerun with a non-connecting placeholder URL after the first environment-only failure).
- Static export under Node22 using committed config in an isolated copy: 412/412; French HTML 203.
- SEO/artifacts: 406 application routes / 308 indexable / 140 PDPs per locale / 300 SKUs; French, 404, protected artifacts pass; Chromium 40/40.
- Browser corrective: 25/25, zero unexpected console/request.
- Correctness independent review: 0 Blocker / 0 High / 0 Medium.
- Affected accessibility independent review: 0 Blocker / 0 High / 0 Medium.
- `git diff --check`: pass.

The first static attempt observed the protected externally modified `next.config.mjs` omitting static-export settings. It was not counted. The successful isolated run used committed `next.config.mjs`; the protected working-tree file was not overwritten or staged.

## Migration and scope proof

- Source migration count remains exactly 74.
- The pre-corrective SHA inventory for migrations 1–74 matches after the work; migration diff exit 0.
- No migration75 exists.
- No CG01 or S02–S12 implementation started.
- No new descriptor, provider, secret, universal JSON store, Payment, Email, ERP, Webhook, or API Key work was introduced.
- Main, production, production migrations, DNS/TLS, push, and stash were not touched.
- Backend protected v2/security dirty assets remain excluded.

## Next action

Stop. Unified Settings Center remains incomplete until S02–S12 finish. Await a separately authorized bounded prompt.
