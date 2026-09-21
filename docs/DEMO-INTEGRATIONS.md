# VanStro Demo Integrations

Demo adapters exercise the same checkout, payment, order, ERP, email and address flows without calling real vendors.

## Safety boundary

- Set `ENABLE_DEMO_INTEGRATIONS=true` only with `VANSTRO_RUNTIME_MODE=development` or `test`.
- API and Worker reject demo integration mode in `deployment`.
- Demo payment responses include `provider: demo` and `demo: true`.
- Never use demo data as evidence of a real Moneris charge, Canada Post result, ERP record or production email delivery.

## Demo adapters

| Integration | Demo behavior | Real replacement |
| --- | --- | --- |
| Card payment | Generates a session-bound demo ticket and verifies it through the standard callback | `MONERIS_*` credentials with demo mode off |
| Canada Post | Returns deterministic Winnipeg, Toronto and Vancouver addresses | `CANADA_POST_API_KEY` |
| ERP | `apps/erp-mock`, idempotent order creation and signed status webhook | `ERP_API_BASE_URL`, token and webhook secret |
| Email | Mailpit SMTP capture | Real SMTP or Dashboard encrypted provider |

## Start

```bash
cp .env.demo.example .env.demo
set -a; . ./.env.demo; set +a
pnpm db:generate
pnpm --filter @vanstro/db exec prisma migrate deploy --schema prisma/schema.prisma
pnpm db:seed

mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025
pnpm --filter @vanstro/erp-mock start
pnpm api:dev
pnpm worker:dev
pnpm dev
```

Or run the isolated automated verification:

```bash
pnpm qa:local-staging
```

## Demo card flow

1. Add a product to cart.
2. Select `card` checkout.
3. Checkout returns `provider: demo` and a session-bound ticket.
4. Payment page shows the normal card action; clicking it submits the demo ticket through `/payments/callback`.
5. The normal order, inventory, CRM, email and ERP flows run.

No real card network is contacted.
