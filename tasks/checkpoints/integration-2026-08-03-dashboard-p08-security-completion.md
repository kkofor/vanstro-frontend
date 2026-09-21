# Integration — P08 Migration64 and Owned-Disposable Security Completion

## Evidence chain

- Original completion evidence: `89f197d2b27ad2a25248f892757025ee02e85ff5`.
- Evidence review BLOCKED: AI_OS CP112.
- Migration64 candidate: Backend `165cede8c939e152b8be2ade78c3cb49a436240d`; migration SHA `d6ead56d787ff59cbffe0b12dd7172194ec4f94a27c6df4a3afd78fa6a8e426a`.
- Original owned failure evidence: CP114/CP115.
- Canonical browser definition: `427ac400d9d1061836e6cd5592214730e2b56862`; follow-up `9fb5a303daaa3777ec4ee3d393a3e6318298333e`.
- Owned fixture repair: Backend `b926cbbf9a879e23cd0c41b32a5864dbec0e5957`; Integration merge `5a94b5bc60e942ff3ead2849035714d560bee966`.

## Failure classifications and repairs

- P07 Unit B: A/C. Fixture omitted legal UploadIntent/Variant/source binding and current Audit contract. It now constructs claimed intent → operation → variant → Job, writes valid same-transaction Audit via runtime role, invokes exact migration61/62 SECURITY DEFINER binding, consumes intent, and self-checks bound Job. Product binding guards unchanged. Owned P07: 5/5.
- P05: A/B/C. Shared default-concurrent run mixed destructive fixtures; terminal counter case intentionally asserts constraint rollback. Isolated owned suite: 9/9. No P05 product change.
- P06: B/C. Orphan assertions reconciled a still-existing source Job. Fixture now creates a distinct, schema-valid Work Item pointing to nonexistent resource ID; ended case legally transitions Job to succeeded. Owned P06: 13/13. Guards unchanged.
- API/Worker gated tests: F/B. Root `.env` previously overwrote owned DATABASE_URL and setup-role projection grants were absent. Harness preserves owned URL, bootstraps RBAC, and provides exact setup-only grants. API owned inventory: 20/20 across 8 files, zero skip/fail. Worker owned: 1/1.

## Owned canonical inventory

DB 13 files serially in one owned PG16: 75 discovered / 75 pass / 0 fail / 0 skip. The same 13 files default per-file mode: all zero fail/skip. Critical P05 9, P07 5, P06 13 repeated twice in fresh PG16 DBs: 54/54 pass.

API owned files:

- Audit proof 3/3;
- Audit query 2/2;
- P05 Jobs API 1/1;
- P07 metadata 1/1;
- P07 retry 2/2;
- P07 upload/filesystem 1/1;
- P02 access 9/9;
- P06 API 1/1.

Worker owned: 1/1.

## Migration64 security matrix

Passed m63 fail baseline; 0→64,55→64,62→64,63→64; four tables × SELECT/INSERT/UPDATE/DELETE denied; guard owner/search_path/PUBLIC/helper/shadow/CREATE; controlled same-session adapter positive path. No migration65. Migrations1–63 byte-identical from `89f197d`; stable manifest SHA `4861ca242829168bf9318fca02e2c92c4e61447cdbe22a25c8a1438de69ef771`.

## Regular deterministic gates

- Prisma generate/validate passed.
- Web/DB/API/Worker/CLI typecheck passed.
- DB/API/Worker/CLI builds passed.
- Contracts 191/191.
- Regular DB 75 discovered / 42 pass / 33 intentional fixture-gated skip / 0 fail; all 33 corresponding owned executions are separately covered above.
- Regular API 189 / 177 pass / 12 gated skip / 0 fail; all gated API cases executed in owned inventory.
- Regular Worker 31 / 30 pass / 1 gated skip / 0 fail; owned Worker 1/1.
- Static 400/400; fr-CA 197; SEO 394/308/140/300; protected/404/artifact gates; Chromium 40/40.
- P07 Linux gate is referenced historical evidence only, not claimed as a new P08 gate.

## Canonical browser v1

Definition SHA `aae28605cd801934c9bf0c4d5347c7ea09f12a20bb474ccb70269600a439926c`.
Final committed fixture SHA `94ef263d3bf412916693bfd73c4101693a27266cf56056fd088694742887672d` before follow-up commit hashing is superseded by tracked blob at `9fb5a30`; harness tracked likewise. Result:

```text
/Users/zhangguannan/.claude/jobs/4deaf7fc/tmp/p08-canonical-browser-committed/acceptance-results.json
SHA-256 f099c050e6da72550e6795d43953f84f2f5e1954a6076757d0e2d7282237c585
```

P08-A01…P08-A17: 17 pass / 0 fail / 0 skip / 0 not-executed. UI-controlled observations cover create/zero pre-state, PUT/Job/Artifact counts, replay/conflict, denial/context changes, preview/commit/partial, export, downloaded neutralized bytes and headers, malicious redirect denial, real cancel mutation, safe errors, keyboard/live region, reflow and localhost-only network. Ports 4420/4421 stopped.

## Boundary

No production access/migration/storage/deploy; production remains41. No P09/migration65. Main protected state and stash pending final promotion audit.
