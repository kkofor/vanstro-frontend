# VanStro Backend

Local-first API, worker, and database for the VanStro Canadian commerce platform.

This README is the short entry point. For agent takeover, use:

- **[Backend handoff](../BACKEND-HANDOFF-2026-07-26.md)** — architecture, ACL, env, pitfalls, next priorities
- **[Session launch-loop handoff](../SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md)** — everything delivered in the 2026-07-26 full-launch session
- **[Developing](../DEVELOPING.md)** — day-to-day local commands
- **[API contract alignment](../API-CONTRACT-ALIGNMENT.md)** — route checklist

## Packages

| Package | Path | Role |
| --- | --- | --- |
| `@vanstro/api` | `apps/api` | Hono HTTP API on `/api/v1` |
| `@vanstro/worker` | `apps/worker` | Email outbox, ERP outbound, reservation expiry, catalog sync cron |
| `@vanstro/db` | `packages/db` | Prisma schema, migrations, seed, RBAC permissions |
| `@vanstro/cli` | `apps/cli` | Operator CLI (service-account auth) |

Storefront + Dashboard UI live in the monorepo root `src/` (Next.js) and call this API.

## Quick start

```bash
cp .env.example .env
# Align DATABASE_URL host port with your Postgres (example uses 15432)

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed

pnpm api:dev      # http://localhost:4000
pnpm worker:dev
pnpm dev          # http://localhost:3000 storefront + /dashboard
```

Health:

- `GET /health/live`
- `GET /health/ready`
- `GET /api/v1/health`

## Verification gates

Run before merging backend changes:

```bash
pnpm typecheck
pnpm test:api
pnpm api:smoke
```

Optional: `pnpm worker:once`, `pnpm qa:backend` (if configured).

Last green snapshot: commit `3eb35c5` (2026-07-26) — 70 API tests + smoke.

## Capability map

| Domain | Highlights |
| --- | --- |
| Catalog | Products/SKUs/prices/promotions; ERP catalog pull + color enrichment |
| Commerce | Cart, checkout, tax by province, delivery fee, reservations |
| Payments | Moneris (`card`), manual HMAC (`pos`/`cash`), dashboard mark-paid |
| Orders | Status events, shipment extraction, guest token access |
| Account | Profile, addresses, favorites, orders |
| CRM | Website CRM contacts/events; promote to ERP `customer_sync` |
| Email | Outbox + templates; Dashboard SMTP provider; worker send |
| Ops | Alerts, audit logs, consent-gated pageviews summary |
| ERP | Order/customer/inventory jobs; inbound status/shipment webhooks |
| CMS | Navigation, home, footer, legal, articles, modules |
| Privacy | Cookie consent events |

## Auth model

- **Customer / admin user:** `Authorization: Bearer <access_token>`
- **Guest cart:** `X-Cart-Token`
- **Guest order:** `?token=` / `guestOrderToken`
- **Service account:** Dashboard-minted token (worker catalog sync, CLI, MCP)

Dashboard route → permission table: `apps/api/src/dashboard/access.ts`.

## Important env groups

See root `.env.example`.

- Runtime: `VANSTRO_RUNTIME_MODE`, `VANSTRO_CORS_ORIGINS`
- Payments: `PAYMENT_CALLBACK_SECRET`, `ENABLE_PAYMENT_SIMULATION`, `MONERIS_*`
- Address: `CANADA_POST_API_KEY`
- ERP: `ERP_API_BASE_URL`, `ERP_SERVICE_TOKEN`, `ERP_WEBHOOK_SECRET`, `ERP_PRODUCT_API_BASE_URL`
- Worker→API: `VANSTRO_API_BASE_URL`, `VANSTRO_SERVICE_ACCOUNT_TOKEN`, `CATALOG_SYNC_INTERVAL_MS`
- Email: `SMTP_*` (fallback); preferred: Dashboard Email provider UI

Never commit real secrets.

## Response contract

Success:

```json
{ "data": {}, "meta": {} }
```

Error:

```json
{ "error": "Human-readable message", "code": "STABLE_CODE", "fields": {} }
```

Money in JSON: `{ "amount": 1299, "currency": "CAD" }` with cents integers in the database.

## Production note

Local verification ≠ production readiness. Production DNS, TLS, migrate deploy, long-running workers, and live payment/address credentials require **explicit user authorization**.
