---
title: VanStro local backend acceptance
date: 2026-07-26
scope: local development only
---

# Local backend acceptance (2026-07-26)

Production-like local stack verification for the VanStro API, Worker, CMS, commerce rules, and integrations. **No secrets** are recorded here.

## Runtime topology (host processes, no Docker)

| Component | Local endpoint | Notes |
| --- | --- | --- |
| PostgreSQL 17 | `localhost:5432` / DB `vanstro_dev` | Homebrew |
| API | `http://127.0.0.1:4000` | `pnpm api:dev` |
| Worker | one-shot / poll | `pnpm worker:once` |
| Mailpit SMTP/UI | `1025` / `8025` | email outbox sink |
| ERP mock | `http://127.0.0.1:4100` | `apps/erp-mock` |
| Payment | `PAYMENT_PROVIDER=manual` | Moneris wired; credentials pending |

`VANSTRO_RUNTIME_MODE=development`. Delivery flat fee default `DELIVERY_FLAT_FEE_CENTS=1500`.

## Schema / migrations

- `prisma validate` — schema valid
- `prisma migrate status` — **14 migrations**, database up to date
- New models in this workstream: `TaxRate`, `SiteContentModule`, `LegalPage`, `Article`

## Verification commands (all passed)

| Command | Result |
| --- | --- |
| `curl /health/ready` | `status: ok`, `database: ok` |
| `pnpm api:smoke` | `API smoke passed.` |
| `pnpm test:api` | **46** passed, 0 failed |
| `pnpm typecheck` | web + db + api + worker + cli clean |
| `pnpm worker:once` | completed (`erpSyncJobs: 0`, `emailOutboxItems: 0` on idle run) |

## Coverage highlights

**P0–P1**

- Smoke locale fix for contact lead
- Cart/favorites `inStock` from `InventorySnapshot`
- Global API `onError` / stable 500 shape
- ERP webhook fail-closed without secret

**P2**

- Province tax table (2026 seed) + checkout tax by dealer/shipping province
- Pickup shipping `0`; delivery flat fee from env
- `PaymentProvider` (`manual` + `moneris`); local e2e uses manual HMAC

**P3**

- Dashboard archive/delete + `page`/`pageSize`/`meta.total`
- Stable `DASHBOARD_*` error codes + i18n sync

**P4**

- CMS models + public read (`locale` + `published`) + dashboard write
- `/home/banners` / storefront home read from CMS seed

**P5**

- Email templates seeded; Mailpit path verified earlier in session
- ERP `order_create` + status webhook; `customer_sync` / `inventory_release` handlers

**P6 tests added / extended**

- Auth session rotation (`apps/api/src/auth/session.test.ts`)
- Payment callback idempotency (`apps/api/src/routes/payment-callback.test.ts`)
- Checkout totals, CMS public reads, pagination helpers, Moneris mock HTTP
- Smoke extended: privacy consent, addresses, inventory reservation, CMS, delivery+tax, ERP inbound reject without signature

## Outstanding (non-blocking)

- Moneris esqa `store_id` / `api_token` / `checkout_id` — see [moneris-credentials-checklist.md](./moneris-credentials-checklist.md)
- Official tax table or delivery fee adjustments if business provides different values

## Explicit non-actions

- No DNS/TLS/production deploy
- No `prisma migrate deploy` against production
- No git commit / push
