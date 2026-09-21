# Production checkpoint — Full-stack 3904a440

Date: 2026-07-30

## Release identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Release source HEAD: `3904a4404ada5b0107a08d5b9c71a3100f22b447`
- Release source tree: `444152590ab24d4250a18172b5cfe8b4f71b45db`
- Product baseline: `e9bc0a2a17d094e859fee5fa065b318b15d0ad7f`
- Product tree: `5aedb5a4812decf5b03429b50e8284320feb23c8`
- `3904a440` differs from the product baseline only by `CLAUDE.md`; no product source changed after the verified product candidate.
- Release source was the canonical local repository and verified local artifacts. No fetch, push, pull, PR, remote CI or GitHub content was used.

## Frontend production release

- Active root: `/www/wwwroot/vanstro.ca/releases/vanstro-3904a440-20260730`
- Artifact source: the existing verified Integration `out/`; it was packaged without rebuilding or modifying `out/`.
- Artifact inventory: `5,060` files, `393` HTML, `11` PDF.
- Homepage: `64,319` bytes.
- Homepage SHA-256: `4ecd9c1a4df169a8db245b928abf7583262c043dee522bf7f4a7193f0572128d`.
- Server manifest verification: `5,060/5,060` files matched bytes and SHA-256; zero world-writable entries.
- Nginx site config: `/www/server/panel/vhost/nginx/vanstro.ca.conf`.
- Nginx config backup: `/www/backup/vanstro-production/20260730T3904a440-deploy/vanstro.ca.conf.pre-3904a440`.
- `nginx -t` passed before and after cutover.
- Previous Fullstack9 and Fullstack8 directories remain present and were not overwritten or deleted.

Known accepted issue: authenticated Desktop Header has four actions (`MY ACCOUNT`, `SIGN OUT`, `SAVED`, `CART`) while CSS still assumes three columns. `CART` may wrap and `MY ACCOUNT` may clip. This release does not fix that issue, and Frontend remains under active development.

## API and Worker production release

- Immutable image tag: `vanstro-production-backend:3904a440-20260730`.
- Image ID/digest: `sha256:6a67d850086f9abd2adf7ba6ecbe4a6d6badfa361f8abea7d07482b61897204d`.
- Image platform: Linux amd64.
- Image size: `401,933,570` bytes.
- Runtime Node: `22.23.2`.
- API container: running, Docker healthy, restart count `0` in final observation.
- Worker container: running, restart count `0`, heartbeat age `7` seconds in final observation.
- API and Worker were updated with `docker compose up --no-deps`; the migrate service was not started.
- Pre-deploy image retained as `vanstro-production-backend:pre-3904a440-20260730`, digest `sha256:eca739e5dd5d114a3f5f748bdab5cde999815b5db6540191b6f437e20ece08aa`.

## Database, backup and side-effect boundary

- PostgreSQL: `16.14`, production database `vanstro_production`.
- Migrations: `41` successful, `0` failed/incomplete.
- Production migration action: none.
- Schema modification: none.
- Invalid inventory snapshots: `0`.
- Active inventory reservations: `0`.
- ERP pending/retry/failed: `8` historical `inventory_release` jobs, unchanged.
- ERP endpoint: absent; no ERP connection or job release occurred.
- Payment reconciliation/refund queue: `0`, unchanged.
- Email pending/retry/failed: `0`, unchanged.
- No real payment, refund, callback replay, checkout, order mutation or queue cleanup occurred.

New logical backup:

- Path: `/www/backup/vanstro-production/20260730T044304Z-automated-logical/vanstro-production.dump`
- Bytes: `451,044`
- SHA-256: `25f25529e89ef4f27bed6549084a236629444be336339814505d43e811d68d87`
- `sha256sum -c` and `pg_restore --list`: passed.

PITR:

- Existing base backup and WAL archive checks passed.
- The original verifier checked the Worker heartbeat immediately after `pg_isready` and failed while WAL replay was still progressing.
- Catch-up-aware isolated restore reached `41` migrations and exactly matched the pre-deploy Worker heartbeat after `164` polling attempts, at replay LSN `2/50000000`.
- All temporary PITR containers and volumes were removed.

## Deployment execution and rollback evidence

The first Frontend cutover used an incorrect loopback validation request over HTTP. It received the `162`-byte HTTPS redirect page, failed the candidate homepage hash gate and triggered the rollback plan:

1. Nginx root returned to Fullstack9.
2. Nginx config test and reload passed.
3. Worker and API returned to the old image digest.
4. Old homepage hash, API readiness and Worker heartbeat were verified.

No failed state was left active. Validation was corrected to use local TLS/SNI:

```text
curl --resolve vanstro.ca:443:127.0.0.1 https://vanstro.ca/
```

The complete API → Worker → Frontend deployment was repeated. All gates passed, and the final active state is the release described by this checkpoint.

## Verification

Local pre-deploy gates:

- Prisma generate/validate: passed.
- DB tests: `3/3`.
- API tests: `121/121`.
- Worker tests: `11/11`.
- Package/protected contracts: `40/40`.
- Full TypeScript, Backend build and existing-database preflight: passed.
- Local destructive API smoke remained guarded by `vanstro_dev` and was not bypassed.

Production preflight and post-deploy:

- Server identity: Ubuntu `22.04`, Linux x86_64, UTC.
- Nginx config test: passed.
- New image existing-database preflight: `{ "ok": true, "failures": [] }`.
- Isolated API canary readiness/liveness/Products/Categories: passed; canary removed.
- Public Homepage, EN/fr Products, representative EN/fr PDP, EN/fr Login, EN/fr Payment, 404, health/readiness, Products API and Categories API: passed.
- Representative catalog PDF: `17,189,404` bytes, SHA-256 `4e28dcfb2784eb48f8726f3c342c4dc23e248188baec7b983d0408e5b9813eb8`.
- Payment EN/fr artifacts contain `meta[name="referrer"] = no-referrer`.
- Read-only isolated browser QA found no uncaught runtime exception or hydration failure. All `119` observed network requests were HTTP `200` except the intentionally requested `404` document.
- Existing non-blocking browser warnings: two preloaded images reported unused shortly after load; two form fields reported missing `id`/`name`.

## Recovery and durable evidence

Pre-production evidence directory:

`/Users/zhangguannan/Documents/codex/vanstro-backups/pre-production-deploy-3904a440-20260730/`

It contains the all-refs bundle, immutable source/frontend packages, local and production gate logs, server manifests, backup/PITR evidence, the failed-cutover rollback evidence, successful deployment evidence, browser QA, README and verified SHA-256 inventory.

Pre-production all-refs bundle:

- Path: `vanstro-all-refs-pre-production-3904a440-20260730.bundle`
- Bytes: `153,969,190`
- SHA-256: `9c967a65c18e4507107680497bd0f9eb29738c5fdab68e74d45f3a2dbed7dfcd`
- Bundle verify and isolated all-ref restore/fsck: passed.

Evidence integrity at deployment close: `64/64` SHA-256 entries passed.

## Explicit non-actions and next action

- No fetch, push, PR or GitHub release source.
- No production migration or schema change.
- No real payment/refund or ERP action.
- No stash operation or protected Main-untracked mutation.
- No old release, image, backup, archive or rollback evidence was deleted.

This checkpoint is a later docs-only continuity work unit. It records the already completed deployment and does not perform or repeat any production operation.
