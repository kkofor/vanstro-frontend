# Real Integration Verification

This is the hard gate between Demo integrations and launch approval.

## Configure safely

Create `.env.production` locally or configure an approved Secret Manager. Never paste secrets into chat or commit them.

Required verification variables:

```env
MONERIS_ENVIRONMENT=qa
MONERIS_STORE_ID=
MONERIS_API_TOKEN=
MONERIS_CHECKOUT_ID=
CANADA_POST_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_REQUIRE_TLS=true
ERP_API_BASE_URL=
ERP_SERVICE_TOKEN=
PRODUCTION_API_URL=
```

## Run

```bash
set -a
. ./.env.production
set +a
pnpm qa:real-integrations
```

The script performs only non-destructive checks:

- Moneris QA preload for CAD 1.00 — obtains a ticket but does not submit a card or charge.
- Canada Post read-only address suggestion lookup.
- SMTP connection/authentication `verify()` — does not send an email.
- ERP authenticated health/read request — does not create or update ERP data.
- Production API `/health/ready` — no write.

It writes a redacted JSON report to:

```text
docs/reports/real-integration-verification.json
```

The report contains no credentials or provider tickets. The file is gitignored because it is environment evidence.

Exit status:

- `0`: all real integrations passed.
- `2`: one or more integrations failed or are blocked by missing configuration.

## Current evidence

As of 2026-07-27, the verifier reports five blocked checks because `.env.production` and real credentials were not supplied:

- Moneris QA
- Canada Post
- SMTP
- ERP production/read endpoint
- Production API readiness

Demo Adapter results must never be substituted for these real integration checks.
