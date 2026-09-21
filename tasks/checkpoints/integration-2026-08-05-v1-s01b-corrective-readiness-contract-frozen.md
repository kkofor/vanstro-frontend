# Integration — v1 S01B corrective readiness contract freeze

Date: 2026-08-05
Status: **CORRECTIVE CONTRACT FROZEN — IMPLEMENTATION PENDING**

## Authority and correction scope

This forward-only note is authorized by coordinator prompt SHA-256 `70458eeb6fe90f841c88b8c7339716e17a185e8085a30446a501f9fb8e460d2f` and corrects only the S01B readiness/evidence defects settled by the independent re-review as `1 Blocker / 0 High / 2 Medium`.

The previous completion commit `a30415ef03d5ca31af10a0ff78c88dfda98c2703` remains immutable history but is not accepted as completion. In particular, the real Backend route cannot currently distinguish an absent or stale consumer generation, and the Frontend request counter is not a publication consumer generation.

No migration may be changed or added. Migrations 1–74 remain immutable; migration75 is forbidden. CG01 and S02–S12 remain unauthorized. No new descriptor, provider, secret, Payment, Email, ERP, Webhook, API Key, universal heartbeat, or universal JSON state is introduced.

## Frozen generation identity

1. `publishedGeneration` is the descriptor-scoped positive publication sequence already exposed as a publication/history DTO `version` by Migration74.
2. It is **not** a draft resource CAS, React request counter, database row generation, or old mutable `settingsRevision` projection.
3. When there is no publication, the compiled default projection has stable `publishedGeneration = 0` and `effectiveOverviewRefreshSeconds = 60`.
4. Compatibility field `publicationVersion` remains present during S01 v1 and maps to the same publication sequence when a publication exists; it is `null` for the compiled-default projection. It must never be interpreted as the consumer generation.
5. The effective value is the active publication's persisted effective integer constrained to 15–300, or compiled default 60.

## Side-effect-free readiness handshake

`GET /dashboard/settings/readiness` remains the only readiness route and remains P02 `settings.read` authorized and side-effect-free. It accepts optional query parameter `consumerGeneration`.

- Missing parameter: request is structurally valid, response is `degraded / consumer_generation_missing`.
- Present parameter must be a canonical decimal non-negative safe integer within PostgreSQL integer range (`0..2147483647`). Empty, signed, fractional, exponent, whitespace-padded, negative, unsafe, or overflow input returns stable `400 SETTINGS_VALIDATION_FAILED` before repository access.
- Exact equality with the current `publishedGeneration`: `ready / ready`.
- Non-equality: `degraded / consumer_generation_mismatch`.
- A consumer that failed to install the timer does not send the candidate generation and therefore cannot obtain `ready`.
- The endpoint performs no write, heartbeat, Audit, or authorization decision from `consumerGeneration`.

The exact response fields are:

- `state`: `ready | degraded | not_ready`;
- `reasonCode`: `ready | consumer_generation_missing | consumer_generation_mismatch | consumer_unavailable | activation_failed | dependency_unavailable`;
- `observedAt`;
- `publishedGeneration`;
- compatibility `publicationVersion`;
- echoed `consumerGeneration` or `null`;
- `effectiveOverviewRefreshSeconds`;
- `projectionState`: `compiled_default | published | activation_failed`.

`ready` is legal only when `consumerGeneration === publishedGeneration`, the projection is available, and no activation/dependency failure exists. Missing/mismatch/unavailable can never be ready.

## Frontend apply protocol

1. The Settings Overview owns a distinct `appliedConsumerGeneration` ref/state; it is never derived from the ordinary request-generation fence.
2. On each Overview load, the Frontend first reads readiness without claiming a candidate generation (or with the last generation known to have been installed).
3. It reads the returned `publishedGeneration` and `effectiveOverviewRefreshSeconds`, validates their invariant, clears the old timer, and installs the new timer.
4. Only after successful installation does it atomically record the applied generation and issue a second readiness read with that exact generation.
5. Only the second response may render ready, and only if it still reports the same generation/value and `state=ready`.
6. If publication changes between requests, the older generation receives mismatch/degraded. Actor switch, request supersession, apply failure, or unmount clears the timer and applied generation and cannot commit ready.
7. The refresh timer triggers an actual Overview refresh at the effective interval. No publication means the same handshake applies to generation 0 and a real 60-second timer.
8. Publication of 15 or 300 seconds takes effect without restart after the next safe load/handshake.

## Corrective evidence obligations

The persisted Browser suite must replace the former false positives with unique request evidence:

- rollback draft selection followed by real validate, diff/review, and publish requests, then a new `rollback_published` sequence while the source publish fact/Audit ID remains unchanged;
- malformed UUID exactly `400 SETTINGS_VALIDATION_FAILED`, well-formed missing UUID exactly 404, and no 22P02/500;
- a real published 15-second value, installed generation handshake, and observed Overview request cadence in a controlled/real tolerant window;
- existing-publication stale generation mismatch, then ready only after the new generation is installed;
- Settings writer/read-only copy plus one real non-Settings route retaining its own capability declaration;
- required element lookup must fail with bounded diagnostics instead of silently no-oping.

The old result's actual tested product+harness commit is `273cd60ccba127d2596e14784753fa0523603826`. Commit `6c9e841` changed only the persisted evidence file after that run and must not be represented as the old tested commit. New evidence must dynamically bind to the actual committed product+harness candidate and separately identify later evidence/docs commits.

## Completion boundary

Implementation must proceed through normal Backend and Frontend permanent worktrees and normal two-parent Integration merges. Completion requires real route/PG16 tests, Frontend timer/generation behavioral tests, corrected real-Chrome evidence, all specified regressions, independent correctness/accessibility reviews at `0 Blocker / 0 High / 0 Medium`, accurate three-line handoffs, and no unexpected failures.
