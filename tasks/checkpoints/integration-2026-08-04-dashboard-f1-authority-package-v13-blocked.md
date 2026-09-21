# Integration — F1 Contract Authority Package v1.3 BLOCKED

## Conclusion

The v1.3 candidate package was independently reviewed against one immutable candidate manifest. Both dimensions rejected it with Blocker/High findings, so the package is not FROZEN and authorizes no implementation or migration. All nine payload files are now marked `REJECTED CANDIDATE — NOT AUTHORITY`.

- Candidate manifest reviewed: `eeb386041ad737b560d0d26bca7aacab68b93b2acc821e41fc49817b8dcfd0a9`
- Rejected-state manifest: `39f5fec58b9b574b9ca411601690be631c557e1dc8773973689b8123c664aa02`
- Product code changed: no
- migration69/70/71 created: no

## Authorization artifact

- Source: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-authority-package-v13-expand-contract-coordinator-prompt.md`
- LF lines: `461`
- Bytes: `28203`
- SHA-256: `2cbb3c9507903a61a490477ca6a4db1d274f7724549bfb4904649a29e10630ee`
- The prompt is external to the package and was not modified.

## Immutable baseline

- Integration start HEAD/tree: `be1b60318921c5a45e493b06833a608532f44eb4` / `018f488de52b5d752e9aef3ac56e05c3ac773ddc`.
- Main/Backend/Frontend product HEAD/tree: `f96bb80e9b024352408372440d803072980dbe43` / `6dff603c17df85a1451db68733b27ad0b658aba6`.
- All four standard worktrees were tracked-clean at startup. Historical agent worktrees, including five dirty historical trees, had no active process/file occupancy and were preserved unchanged.
- Source migrations: `68`; deterministic name/content inventory SHA-256 `c6cf97a80cdfe6032068af11d13ca54b16cec9b88ce23ff9454f0689501935a3`.
- migration69/70/71: absent.
- Main protected untracked porcelain manifest: `80` records / `ce73d578710bc83048252feadaf8fc81c0eb397cbd648985f0b40fbcc9503c6e`.
- Stash object: `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`.
- Frozen/rejected v1.0/v1.1/v1.2 inputs were not modified or revived.

## Rejected payload identities

Root: `/Users/zhangguannan/Documents/codex/vanstro-backups/f1-authority-package-v1.3-20260804/candidate`

| Relative path | LF lines | Bytes | SHA-256 |
|---|---:|---:|---|
| `01-dashboard-p09-runtime-config-flags-readiness-contract-v1.3.md` | 132 | 17602 | `0b4dba055107b4a56613df1e4cac79bbb16314f4e68c467f9a70e305ba86b44e` |
| `02-dashboard-p10-analytics-event-metric-foundation-contract-v1.3.md` | 148 | 18528 | `fe08ea0ebd2f95260ab2199e51eeb2d41a28d3c0c373a1c55caab2677f5afed5` |
| `03-dashboard-p04-replay-legacy-audit-erratum-v1.0.md` | 204 | 15540 | `078dcaef9e332c9074200f33798b4b26f178456c7205abef54f54bf9415bc09e` |
| `04-dashboard-p05-p08-artifact-payload-token-joint-erratum-v1.0.md` | 199 | 18455 | `132356e0f12265c915b548a1101380160ac7b4cb32ff8b3993f01bae39af667a` |
| `05-dashboard-p02-current-context-authority-clarification-v1.0.md` | 220 | 25790 | `2902147112b861dc2cdb825d14fe15941d9962850b200c91c7f6a4622d576644` |
| `06-dashboard-f1-unified-migrations69-70-authority-ledger-v1.0.md` | 411 | 33547 | `78bc277c48430b818914ded23e5cdb95576b4ca81cc6890b505954ac429330ca` |
| `07-dashboard-f1-sql-authority-catalog-v1.0.md` | 871 | 57131 | `9ef05a42c3251a3063428a9fdef146fc249eb33414eed0659c11327a4813abcd` |
| `08-dashboard-f1-authority-manifest-spec-v1.0.md` | 150 | 8555 | `608999f8f87dc79caebcf1e0e319b54b18a7993d074dc06358a95850b75bdcd5` |
| `09-dashboard-f1-authority-review-checklist-v1.0.md` | 415 | 28903 | `fb8ac139fc61f5f17dcb91fbdcdd08e343e20c0fe66723bda6a14db22e8a6c02` |

Rejected envelope:

- `MANIFEST.sha256`: 9 lines / 1121 bytes / SHA `39f5fec58b9b574b9ca411601690be631c557e1dc8773973689b8123c664aa02`.
- `MANIFEST.metadata.tsv`: SHA `438c89a184d2d811e73aded71e748f49d3da660d20ff2067f8e6adeede2e2a0e`.
- Candidate manifest before status-only rejection transition: SHA `eeb386041ad737b560d0d26bca7aacab68b93b2acc821e41fc49817b8dcfd0a9`, metadata SHA `6db5c2920434282bda44f1b264587e92c38ad770d7921146d2996c8a8b0da43a`, 9 members / 2750 LF lines / 223970 bytes.

## Deterministic manifest tooling

- Generator/verifier: `qa/scripts/f1-authority-package-manifest.mjs`; 289 lines / 9035 bytes / SHA `b040d7aa1d74122312b5c7bf82cae099946378674b844cf946cd15e88edb2b1d`.
- Tests: `qa/f1-authority-package-manifest.test.mjs`; 141 lines / 4847 bytes / SHA `6f3919fd6838b9ec9bd3332e892cb1bdbfa8ecd374fc3b75502551f01fd6130b`.
- Checkpoint template: `tasks/checkpoints/templates/integration-dashboard-f1-authority-package-v13.md`; 91 lines / 3349 bytes / SHA `4c3f9c78da7389b9643c44f2a9f3b1a0f203d7c6b1c4215da2278e8b35cdcb98`.
- Node test result: 8 pass / 0 fail.
- Candidate verifier passed before and after both reviews against `eeb386...`; rejected-state verifier passed against `39f5fe...`.
- The external checkpoint authenticates the manifest; the manifest does not self-authenticate.

## Independent reviews of the same candidate manifest

### Review A — Contract / architecture / rollout

- Artifact: `/Users/zhangguannan/Documents/codex/vanstro-backups/f1-authority-package-v1.3-20260804/reviews/contract-architecture-rollout-review.md`
- Identity: 208 lines / 20546 bytes / SHA `293148feee6577b91aaa1b6afa9777deac949e8de0b0d513fccf4a772fefadd0`
- Manifest reviewed: `eeb386041ad737b560d0d26bca7aacab68b93b2acc821e41fc49817b8dcfd0a9`
- Findings: 6 Blocker / 4 High / 1 Medium / 1 Low
- Result: REJECTED

Principal blockers/highs:

1. Source-less `awaiting_upload → cancelled|expired` violates immutable migration63 CHECK; no replacement DDL is frozen.
2. Storage publication needs a P05 lease while the Job is non-claimable before publication, making the happy path unreachable.
3. No persisted P08 storage-finalization authority is selected; multiple legal schemas remain.
4. SQL/DDL catalog omits release cleanup, consent/release schema, trigger identities, token constraints and other required DDL.
5. Fact→original success Audit is not mapped to exact tables/columns/constraints and uses conflicting column names.
6. Worker lifecycle capability role has conflicting names in ledger/catalog.
7. P02 helper lacks requested scope and a defined synthetic readiness target resolver.
8. Source-latest generator/output path is not frozen.
9. P10 Contract and catalog expose conflicting release-family representations.
10. Conditional index plan gate is not executable/frozen.

### Review B — Security / privacy / database transaction / authorization

- Artifact: `/Users/zhangguannan/Documents/codex/vanstro-backups/f1-authority-package-v1.3-20260804/reviews/security-privacy-database-review.md`
- Identity: 163 lines / 17529 bytes / SHA `c86b1187fa0033a2560d7004ece8fa4afa95ee898515efe572c1905f0578c95c`
- Manifest reviewed: `eeb386041ad737b560d0d26bca7aacab68b93b2acc821e41fc49817b8dcfd0a9`
- Findings: 4 Blocker / 4 High / 2 Medium
- Result: REJECTED

Principal blockers/highs:

1. Catalog permits future unlisted private functions, creating a second SQL authority and unclosed overload set.
2. migration69 physical schema and conditional indexes admit multiple legal DDLs.
3. Fact→Audit mechanism is physically contradictory/incomplete.
4. P10 release schema/API cannot represent the required immutable complete family and suppression decision.
5. P02 helper omits required operation/scope/owner evidence and typed outcomes.
6. P09 Audit/resource registry conflicts with the SQL catalog.
7. P08 saga function set/caller model is incomplete and lease ordering is circular.
8. SECURITY DEFINER owner topology is not proven least privilege and role names conflict.

Both reviews independently recomputed the ten P02 golden-vector HMACs successfully. This positive evidence does not override the Blocker/High findings.

## Candidate semantic decisions attempted

The rejected package attempted to freeze:

- migration69 EXPAND, migration70 CONTRACT, no default maintenance outage and no migration71;
- old code + 69 compatibility, new code + 69/70, old code + 70 expected denial after zero-old-instance proof;
- P04 first success/exact replay/Attempt Audit/legacy DTO and fact-held Audit reference;
- P02 target-bound HMAC-SHA-256 framing with ten golden vectors and DB/application dual-layer context;
- P09 exact action registry, API/Worker principal separation and per-request readiness wrapper;
- P10 independent ingest permission, server-held subject/consent HMAC epoch, threshold-not-DP threat boundary, sealed UTC day + 10-minute grace + 30-day retention, distinct-subject contribution clipping and whole-family suppression;
- P05/P08 narrow source Artifact supersession, storage saga, terminal state matrix, shared payload schemas, `querySnapshotRef=exportId`, parent-derived `totalRows`, and required token KID metadata;
- upgrade paths `0/41/55/62/63/64/65/66/67/68→69` and `0/41/55/62/63/64/65/66/67/68/69→70`.

These are rejected candidate design attempts, not authority. The unresolved conflicts above must be corrected in a wholly new reviewed candidate; v1.3 cannot be used to author migrations or product code.

## Stop boundary

- No FROZEN package or freeze commit was created.
- No product source, Prisma schema, migrations1–68, migration69/70/71, production database, credentials, provider, GA4, PostHog, Search Console, backfill, deployment, DNS/TLS or Stage C action occurred.
- Main/Backend/Frontend were not promoted. No push/fetch/PR, stash operation, reset, rebase, force, clean or historical worktree cleanup occurred.

`production deploy: deferred until full Dashboard completion`
