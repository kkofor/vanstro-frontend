# Backend P08 owned-disposable regression fixture closure

- Parent: migration64 candidate `165cede8c939e152b8be2ade78c3cb49a436240d`.
- No product/schema/migration changes; migrations1–64 immutable.

## Classification and fixes

- P07 Unit B (A/C): old fixture directly created an impossible source operation without UploadIntent/Variant relationship and without migration61/62 binding evidence. Fixed setup creates claimed intent → operation → variant → Job, writes valid P04 Audit, invokes exact runtime SECURITY DEFINER binding in same transaction, then consumes intent. All five P07 cases pass 5/5.
- P05 (A/B/C): isolated suite proved all 9/9 pass. Initial full default failures came from default-concurrent suites truncating/reseeding shared DB and one intentionally invalid terminal-counter rollback fixture; no product fix.
- P06 (B/C): isolated suite showed 11/13 before correction. Orphan tests called reconcile while source Job still existed, so authoritative state correctly remained present; direct Job deletion also crossed protected Media references. Added a controlled orphan WorkItem fixture with nonexistent resource ID while preserving source Job. Ended state now legally transitions source Job to succeeded. P06 passes 13/13.

## Evidence

- P07 owned serial: 5/5.
- P05 owned isolated: 9/9.
- P06 owned serial: 13/13.
- Guards were not weakened; expected P0001/23514 attack errors remain observed.
- `test-runtime-client.ts` permits a second runtime-role connection only when database name is test/smoke/disposable; used for exact P07 SECURITY DEFINER binding fixture.
