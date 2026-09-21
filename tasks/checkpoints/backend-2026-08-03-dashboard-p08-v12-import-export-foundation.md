# Backend P08 v1.2 Import/Export Foundation

## Authority

- Canonical v1.2: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p08-import-export-foundation-contract-v1.2-20260803.md`
- SHA-256: `128ae596734963b77269e18e01894789733de782449033a5669bcf8b8f28db9d`
- Supersedes immutable v1.1 `a0b6ff6b63c7e21bddf7b587f408ca85dc17e6d50eb5c996c9b803f96af9e977`; drift provenance `b92573ea305a1c51dbf1b0704eeaff45e84a6b8f7370eb05bb7f0531a4c9fad3` is rejected evidence only.

## Dirty recovery classification

The P08 v1.1 dirty tree was preserved and forward-corrected rather than reset or reconstructed.

- Retained: deny-by-default registry, CSV parser/resource limits, canonical hashing, export neutralization, P08 permission registry, test-only job descriptors, P06 wiring, routes, safe errors, tests.
- Forward-corrected: create/finalize lifecycle, Prisma models, migration 63, exact scope/field-visibility binding, controlled download, preview binding, cleanup state, Job/Artifact ownership.
- Removed as old-v1.1 authority: `upload-complete`, create-time parse Job/Artifact, `uploaded` create response, preview nonce, equal-or-narrower authorization, P08 duplicate hash/size/expiry fields.
- Removed as out of scope: P05 `availabilityStatus`/`availabilityCheckedAt`/`fencingToken` schema extension and helpers, legacy Artifact backfill, second Artifact availability authority.
- No unknown-source file was included; all 33 final paths map to the original P08 dirty inventory or the required correction tests.

## Implementation

- Import create returns `awaiting_upload` and creates no Job or Artifact.
- The controlled content PUT is the only finalize operation. It validates actor/permission/context/exact scope/field visibility/token/type/length/version/idempotency, stages exact bytes, and in one DB transaction creates the uncommitted parse Job + P05 source Artifact, transitions the batch to `uploaded`, consumes the token, persists Audit/idempotency, then commits.
- `JobArtifact.jobId` remains non-null; no runnable Job exists before finalize commit.
- P05 `JobArtifact` remains sole hash/size/expiry/storage/deletion authority. P08 stores only source/export FK and business state.
- Download derives availability from existing P05 fields and exact storage bytes, reauthorizes exact scope/context/field visibility, and same-request streams bytes with no redirect/provider URL/token.
- Preview binding uses hash + expected version + idempotency; no nonce.
- Row payloads are nullable and system cleanup can purge values while retaining safe outcomes.
- Registry enables only `foundation.sample`; category/product_metadata/media_metadata remain disabled. Order/Payment/PII objects remain absent.
- Job logical keys remain unversioned; descriptor/schema versions remain `.v1`.

## Migration 63

- Path: `packages/db/prisma/migrations/20260803100000_dashboard_p08_import_export_foundation/migration.sql`
- SHA-256: `be8770e4eee6ed6889ab520b98cea2d87924c9a419b45cf0687233d20053b4d4`
- Exactly four P08-owned tables: `dashboard_import_batch`, `dashboard_import_row`, `dashboard_export_request`, `foundation_sample`.
- No P05 shared-schema modification and no legacy Artifact backfill.
- Runtime role has exact SELECT/INSERT/UPDATE on P08 tables, no DELETE/CREATE/ownership authority; PUBLIC has none.
- Migration 63 was not found on accessible persistent/shared databases before correction. It remains local source-only and was tested only in owned disposable PG16.
- Migrations 1–62 aggregate inventory file SHA-256: `76ed1a7ea1d40ae265e9777541240f247ca566c614030d17d5e83fc64269dfb5`; P07 migration directories have zero Git diff.

## Verification — Node 22.22.2

Passed:

- Prisma generate.
- Prisma validate.
- Full TypeScript: Web, DB, API, Worker, CLI.
- Backend builds: DB, API, Worker, CLI.
- Focused API/registry/parser/binding tests: 17/17.
- Focused Worker P08: 9/9.
- Focused DB/P05 registry: 6/6.
- Package contracts: 173/173.
- Complete DB: 39 passed, 33 intentional owned-disposable skips, 0 failed.
- Complete Worker: 30 passed, 1 intentional owned-disposable skip, 0 failed.
- Complete API with canonical root `.env`: 177 passed, 12 intentional owned-disposable skips, 0 failed.
- Migration PG16 matrices: fresh 0→63, P06 55→63, P07 62→63, runtime permission matrix, isolated sentinel.
- `git diff --check`.
- Forbidden-v1.1 source scan: no `upload-complete`, preview nonce, equal-or-narrower helper, or P05 draft availability fields in authoritative API/DB source.

An earlier API attempt without the root `.env` failed configuration bootstrap (`DATABASE_URL is required`) and is not counted as a valid suite. The rerun with the canonical local environment passed as above.

## Not run here

- Frontend P08 focused tests.
- Static export/fr-CA/SEO/artifact/Chromium gates.
- Authenticated UI-controlled browser matrix.
- Integration full-stack gates.
- Production migration/storage/deployment.

## Boundary

- No reset, clean, stash, rebase, squash, force, push, merge, production access, deployment, or P09.
- Production remains 41 migrations.
