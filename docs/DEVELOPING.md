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
pnpm qa:backend
```

This runs `typecheck`, `test:api`, and `api:smoke`.

## API contract

- Source of truth: [`src/lib/api/api-contract.ts`](../src/lib/api/api-contract.ts)
- Alignment notes: [`docs/API-CONTRACT-ALIGNMENT.md`](./API-CONTRACT-ALIGNMENT.md)
- OpenAPI snapshot: `pnpm generate:openapi` → `docs/openapi/vanstro-api.json`

## Commerce inventory policy

- Checkout reserves `quantityReserved` on the fulfilling dealer snapshot.
- Payment callback consumes reservations and decrements `quantityReserved` only.
- `quantityOnHand` is owned by ERP inventory sync.
