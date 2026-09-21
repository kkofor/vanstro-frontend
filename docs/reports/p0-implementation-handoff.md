# VanStro P0 Implementation Handoff

Date: 2026-07-08

## Scope

P0 adds the backend foundation without changing storefront visuals:

* `apps/api` Hono service with health endpoints.
* `apps/worker` skeleton with one-shot and polling modes.
* `packages/db` Prisma schema, client export and seed script.
* Local Postgres Docker Compose config.
* ERP adapter contract draft.

## Commands

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm api:dev
pnpm worker:once
pnpm run typecheck
pnpm run build:pages
```

## P0 Notes

* `docs/API-CONTRACT-ALIGNMENT.md` remains the canonical source for `/api/v1` paths.
* `docs/erp-adapter-contract.md` records ERP assumptions that must be confirmed before P1a/P2.
* `apps/worker` currently reads ERP sync and email outbox backlog only; actual processing is P2/P3.
* The root Next.js storefront remains in place and continues to build as a static export.
* Local Postgres is exposed on host port `15432` to avoid collisions with a host-level Postgres on `5432`.
* Root scripts load the root `.env` before running API, worker, migrate and seed commands.
* Postgres is bound to `127.0.0.1` only for local development.
* `/health` and `/api/v1/health` are readiness checks and return non-2xx if the database is unavailable; `/health/live` is the liveness check.
* `super_admin` seed now requires a non-default `SUPER_ADMIN_PASSWORD` and does not reset an existing password unless `RESET_SUPER_ADMIN_PASSWORD=true`.

## Verification Run

Completed:

* `pnpm install`
* `pnpm db:generate`
* `docker compose up -d postgres`
* `DATABASE_URL='postgresql://vanstro:vanstro_dev@localhost:15432/vanstro_dev?schema=public' pnpm --filter @vanstro/db exec prisma validate --schema prisma/schema.prisma`
* `DATABASE_URL='postgresql://vanstro:vanstro_dev@localhost:15432/vanstro_dev?schema=public' pnpm --filter @vanstro/db exec prisma migrate dev --name init --schema prisma/schema.prisma`
* `pnpm db:seed`
* `pnpm run typecheck`
* `pnpm run build:pages`
* `pnpm worker:once`
* API started locally and returned `ok` plus `database: "ok"` from `/health` and `/api/v1/health`.

Issue found and fixed:

* The first Prisma migration attempt used host port `5432`, which connected to an existing host-level Postgres instead of the Docker container. The compose mapping and `.env.example` were changed to `15432`, and migration/seed then completed successfully.
* Second-pass audit fixes were applied in `20260708224802_p0_hardening_p1a_catalog`: service-account audit logs now have a foreign key, ERP customer links can point to a user, worker polling avoids overlapping ticks, and Docker no longer exposes Postgres on all host interfaces.
