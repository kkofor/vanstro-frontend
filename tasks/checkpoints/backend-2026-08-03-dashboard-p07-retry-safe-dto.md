# Backend Checkpoint — Dashboard P07 Retry-safe DTO

Status: verified locally on `feature/backend`; no deployment or production/storage action.

## Scope

- Added optional Asset response field `retryBinding: { jobId, jobVersion, variants: [{ role, expectedVersion }] }`.
- The existing Asset `version` supplies retry `expectedAssetVersion`; request and response DTOs remain separate.
- Emit only for exact read/manage scope, failed/resolved Asset, one exact bound failed `media.process.v1` Job, retryable failure class, unexhausted generation, and complete failed Variant versions.
- Otherwise omit `retryBinding` and set row `capabilities.manageVariants` false.
- Retry mutation reuses the same exact predicate, including failure-class allowlist.
- Independent review follow-up requires exact resolved-binding role parity, rejects processing/missing applicable Variants, and uses database time to reject expired Jobs that Worker cannot claim.
- No migration changed and migration 63 was not added.

## Security and correctness evidence

Focused coverage proves authorized projection, read-only omission, Dealer A/B scope denial, unbound/wrong/stale/terminal/nonretryable/exhausted rejection, complete Variant binding, replay stability, and omission of payload, attempt, lease/fencing, storage, checksum/config and actor internals.

Node 22.22.2 gates:

- owned PostgreSQL 16 strict API: 203 passed, 0 failed, 0 skipped;
- shared package contracts: 152 passed, 0 failed, 0 skipped;
- DB: 36 passed, 0 failed, 33 intentional skips;
- Worker: 21 passed, 0 failed, 1 intentional skip;
- full TypeScript: passed;
- Backend build: passed;
- migration 56–62 checksums: unchanged from the migration-62 checkpoint.

Production remains release `3904a440` with 41 migrations. Integration must reconcile the shared DTO and run its normal full-stack/browser gates before promotion.
