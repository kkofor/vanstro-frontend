# Integration — F1 Remediation Contract Review BLOCKED

## Status

The F1 remediation work unit stopped before Backend product changes or migration69 creation because the first P09/P10 v1.1 candidates failed independent consistency/security review. The candidate files are retained externally as `REJECTED CANDIDATE — NOT AUTHORITY`; they authorize no code or migration.

## Authorized setup completed

- Remediation authorization file was read in full: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-blocker-remediation-contracts-migration69-coordinator-prompt.md`.
- Exact SHA-256: `3c2bc391f582475d2e01338ecb317ab7f46ec3f0d7797884893e03fab455eabb`; 473 LF lines; 26304 bytes.
- Minimal Integration docs-only continuity was committed as `36e28532d2cc629d746024a946ae1f584ebf7daf`, followed by CP20 context `d99011de5ed5faa0290ec24024b8269ad3b920e9`. Neither commit was promoted to Main/Backend/Frontend.
- Contract-freeze attempt record was committed as `dab4f8b726a6eb83fccfa92256f73615999ed84a`; this checkpoint is superseded by the present review failure and must not be treated as proof that the candidates passed review.
- Product lines remained at `f96bb80e9b024352408372440d803072980dbe43`; no Backend/Frontend product files changed.
- Old P09/P10 v1.0 bytes remained unchanged at SHA `0732de4d...` and `c813cd83...`; migrations1–68 remained unchanged; no migration69/70 was created.

## Candidate identities

Initial candidate hashes before review edits:

- P09 v1.1 initial candidate: 164 LF lines / 13667 bytes / SHA `facc587a416c53e4ff385abad299d1ded5e592280d57215c8e0371be760418dd`.
- P10 v1.1 initial candidate: 235 LF lines / 16457 bytes / SHA `40fea50863beac7ef95f85f8a77dfae93ae9b728f69a5fd94c7c305e63658a78`.

They are now explicitly marked rejected and their current identities are:

- P09 rejected candidate: 164 LF lines / 13481 bytes / SHA `437a341c90cd6d9d2d23f0d7cc78a5dc1b42a67da2a291d066216d6d6f09da4c`.
- P10 rejected candidate: 237 LF lines / 17262 bytes / SHA `2d175c685e67e88a90ed990b8cf6674f787d8ffeafc7491bb0aa6440e783bfaf`.

Neither initial nor current candidate hash is canonical authority.

## Confirmed Contract blockers

1. **P09/P10 migration69 scopes conflicted.** P09 used an exclusive “may only” P09 remediation boundary while P10 assigned the same unique migration69 extensive P10 DDL. A combined migration would violate one candidate.
2. **P10 replay Audit conflicted with P04.** P10/migration68 records a new replay Audit while frozen P04 requires an exact successful replay to return the existing Audit event without a duplicate logical Audit event.
3. **Migration68 Audit snapshots conflict with P04.** Existing immutable rows persist empty `effectiveRoles` and only `analytics.events.read_summary`, not all occurrence-time roles and permissions required by P04. These historical rows cannot be rewritten.
4. **Database-only exact P02 context reconstruction was underspecified/infeasible.** P02 field policy and parts of context revision are versioned application-code authority. Duplicating them in SQL creates a second authority; persisting a new policy authority was outside the candidates' bounded migration scope.
5. **Ingestion permission was missing.** Existing read-summary permission authorizes mutation. During review a proposed `analytics.events.ingest` repair was added to the external candidate, but this changed the candidate after its recorded freeze hash and still required a complete canonical role/bootstrap/compatibility decision. It therefore did not rescue the frozen candidate.
6. **Identifier grammar was not exact.** “Frozen ASCII grammar” lacked an exact regex/normalization/length/pattern registry and was not testable.
7. **P05/P08 Artifact authority remains contradictory.** P05 allows Artifact creation only by a current fenced Worker lease, while P08 v1.2 requires authenticated API PUT to create the source JobArtifact before the Job is claimable/leased. No P05 erratum authorizes that exception.
8. **P08 Job payload has an additional consumer mismatch.** Beyond `mode`/`commitMode` and `querySnapshotHash`/`querySnapshotRef`, Worker requires `totalRows` and export `expectedVersion` fields rejected by the current strict validator. A producer-only rename cannot close the end-to-end chain.
9. **P09 inherited Audit obligations are not met.** v1.0 requires distinct proposal/validation/activation/failure/retry/rollback/flag Audit evidence and safe before/after summaries; migration65 emits generic `config_publish` events. The rejected P09 candidate preserved those semantics while its exhaustive migration69 scope did not permit repairing them.
10. **P09 database authority does not enforce current context revision.** The existing authorized-binding function does not reconstruct/compare the full P02 context revision, so stale-context fencing remains incomplete; repairing it was omitted from the candidate's migration69 scope.
11. **Consent identifier was not bound to the authenticated subject.** The P10 candidate retained a client-supplied anonymous consent ID without freezing a server-verifiable binding to the authenticated producer/subject, allowing a valid consent record for another identity to authorize ingestion.
12. **Suppression privacy unit and differencing policy were underspecified.** The candidate used event-count cohorts rather than distinct subjects and described conservative secondary suppression without a deterministic release algorithm for overlapping windows/scopes/query history. It could not prove privacy against repeated-event or adaptive differencing attacks.

## Backend reproduction outcome

A read-only Backend reproduction matrix confirmed all 11 original blockers plus the additional Worker payload mismatch. No product edits were accepted because Contract review failed first. The temporary Backend implementation agent was stopped before changes.

## Stop boundary

- F1 remains BLOCKED.
- No migration69 was created; migration70 remains prohibited.
- No Main/Frontend/Backend promotion occurred.
- No production database was accessed or migrated.
- No provider, GA4, PostHog, Search Console, backfill, deployment, or Stage C work occurred.

## Required next decision

A new explicit Contract decision is required before implementation. It must resolve at minimum:

- one combined migration69 scope shared by P09 and P10;
- P04 replay and historical migration68 Audit compatibility;
- authoritative division between database-rebuilt P02 scope facts and application-owned field/context policy;
- exact ingestion permission/service principal;
- exact identifier grammar;
- P05 erratum for API-side pre-claim P08 source Artifact creation or a redesigned P08 lifecycle;
- one exact producer-validator-Worker P08 payload schema.

Because the authorization requires stopping when Contracts remain mutually inconsistent, this work unit ends here.

`production deploy: deferred until full Dashboard completion`
