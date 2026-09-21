# VanStro full-stack development

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (local or Docker)

## Environment

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `PAYMENT_CALLBACK_SECRET` — HMAC secret for manual payment callbacks (local dev)
- `ERP_WEBHOOK_SECRET` — optional; ERP webhooks fail closed when unset

## Database

```bash
pnpm db:generate
pnpm db:migrate    # use `prisma migrate deploy` in CI/non-interactive shells
pnpm db:seed
```

## Run locally

```bash
# Terminal 1 — API (port 4000)
pnpm api:dev

# Terminal 2 — Worker
pnpm worker:dev

# Terminal 3 — Next.js frontend (port 3000)
pnpm dev
```

Or use the convenience script:

```bash
pnpm stack:dev
```

## Backend verification

```bash
pnpm typecheck
pnpm test:api
pnpm api:smoke
```

`pnpm qa:backend` runs the same set when that script is present in root `package.json`.

Agent takeover and capability map: [`docs/BACKEND-HANDOFF-2026-07-26.md`](./BACKEND-HANDOFF-2026-07-26.md), [`docs/backend/README.md`](./backend/README.md).

## API contract

- Source of truth: [`src/lib/api/api-contract.ts`](../src/lib/api/api-contract.ts)
- Alignment notes: [`docs/API-CONTRACT-ALIGNMENT.md`](./API-CONTRACT-ALIGNMENT.md)
- OpenAPI snapshot: `pnpm generate:openapi` → `docs/openapi/vanstro-api.json` (regenerate after API changes)

## Commerce inventory policy

- Checkout reserves stock by increasing `quantityReserved` on the fulfilling dealer snapshot.
- Payment callback consumes active reservations and updates on-hand / reserved quantities in the same transaction path — **read the current `payments/callback` implementation before changing docs or ERP ownership assumptions**.
- ERP remains the system of record for inbound quantity sync once that webhook exists; until then Dashboard can adjust snapshots manually.