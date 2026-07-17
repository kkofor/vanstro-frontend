# VanStro Operations CLI

The CLI is a machine client for operational queues. It only calls the Website API and never connects directly to Postgres.

## Setup

Create a service account in Dashboard with `cli.access` plus the least-privilege permissions needed for the command:

* ERP list: `erp.sync.read`
* ERP retry: `erp.sync.retry`
* Email list: `email.outbox.read`
* Email retry: `email.outbox.retry`

Issue a Token once, store it in the operator's secret manager, then configure:

```bash
export VANSTRO_API_BASE_URL="https://api.example.com/api/v1"
export VANSTRO_SERVICE_ACCOUNT_TOKEN="vsa_..."
```

## Commands

```bash
pnpm --filter @vanstro/cli dev -- erp-jobs-list
pnpm --filter @vanstro/cli dev -- erp-jobs-retry <jobId>
pnpm --filter @vanstro/cli dev -- email-outbox-list
pnpm --filter @vanstro/cli dev -- email-outbox-retry <outboxId>
```

After `pnpm --filter @vanstro/cli build`, the package exposes the `vanstro` binary. API-side retries only accept `retry_wait`, `failed`, or `cancelled` records, so a successful job cannot be accidentally queued again.
