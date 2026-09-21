# Integration — F1 final evidence HARD BLOCKED

## Conclusion

Final evidence closure is HARD BLOCKED by seven real schema70 compatibility failures. They cannot be closed by test-harness or fixture changes without weakening the actual ACL/constraint behavior.

## Tested identity

- Source/test harness tip before this checkpoint: `5d379393eab7bb328a26596da07f87b747e22f06`.
- Tree: `6b8bd439f243603fb76ac6f7fdd57e083e70f53a`.
- Migration69 SHA-256: `442e8bd564ebf7f787e41a830d720428310c69ae928ab17bef4d9f4fc2a4d21a`.
- Migration70 SHA-256: `5789b68576b375bc94adec6373b6c02a976c3e5a3813697c5bbadf266977713b`.
- Source migrations: 70; migration71 absent.

## Regular API closure

The previous three analytics failures were reproduced and preserved. Root `.env` pointed to shared `vanstro_dev`, which had only 60 successful migrations and lacked migration69 fields.

A new test-only harness creates an isolated PostgreSQL16 database, materializes the current Prisma schema model, seeds test data and removes the container after the run. Two consecutive complete runs passed:

- 229 discovered;
- 217 passed;
- 0 failed;
- 12 intentional owned-disposable skips;
- 0 not-executed.

This proves Regular API fixture isolation. It does not replace migration-lineage evidence.

## Strict owned API result

A separate non-authority provisioner ran migrations1–68, the frozen bootstrap, migration69, signed telemetry/attestation, and migration70 with real role topology. The complete API suite then produced:

- 229 discovered;
- 222 passed;
- 7 failed;
- 0 skipped.

Failures:

1. Dashboard Overview directly reads `worker_heartbeats`; migration69 correctly denies runtime direct SELECT.
2. P05 Job creation writes Audit `resourceType=async_job`; migration70's CHECK rejects it.
3. P07 metadata writes `resourceType=media_asset`; rejected.
4. P07 retry binding writes `resourceType=media_variant`; rejected.
5. P07 retry writes `resourceType=media_variant`; rejected.
6. P07 upload writes `resourceType=media_upload_intent`; rejected.
7. P06 queue action writes `resourceType=work_queue_item`; rejected.

These are not missing fixture grants. Granting protected-table access or weakening the CHECK in a fixture would conceal the production behavior and invalidate certification.

## Hard-stop rationale

Closing the failures requires at least one of:

- changing product read/Audit call sites;
- modifying migration70's constraint/ACL authority;
- adding a forward migration71.

The current final-evidence Goal permits only harness/fixture/evidence work and explicitly forbids modifying migrations1–70, authority, or creating migration71. The hard-stop condition is therefore met.

## Browser status

P09, P10 and cross-Foundation live browser suites were not completed. Python compilation is not counted as acceptance. No draft browser result is claimed.

## Boundaries

- No FROZEN package or migration was modified.
- No production database, credentials, provider/storage, Stage C or deployment was accessed.
- No failure was converted to a skip and no assertion was weakened.
- Historical incomplete-evidence checkpoint remains unchanged.

`production deploy: deferred until full Dashboard completion`
