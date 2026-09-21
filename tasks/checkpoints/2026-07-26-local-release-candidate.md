# VanStro Local Release Candidate Checkpoint

Date: 2026-07-26
Branch: `claude/dealer-neutral-copy-sync-20260721`
Latest verified source commit before this checkpoint: `3ca66e2`

## Status

Demo Release Candidate scope is complete. On 2026-07-27 the user explicitly selected “Demo RC 完成” as this phase's completion target. Online deployment and real vendor verification are a later phase.

## Verified gates

- Node.js 22.22.2
- TypeScript: pass
- API tests: 87/87
- DB tests: 3/3
- Worker tests: 4/4
- Contract tests: 5/5
- Backend build: DB/API/Worker/CLI pass
- Next dynamic production build: pass
- GitHub Pages read-only static export: pass
- Fresh PostgreSQL: 34/34 migrations, seed, full API smoke pass
- OpenAPI: 159 runtime paths; no template-literal pseudo paths; checkout/payment critical request contracts present
- GitHub backend-ci: success
  - `30222347105`
  - `30222852976`
  - `30222988749`

## Real local multi-process staging E2E

`pnpm qa:local-staging` provisions and cleans up:

- isolated PostgreSQL database
- compiled API process over TCP
- compiled Worker process
- ERP mock process with signed webhook callback
- Mailpit SMTP server

Verified journey:

```text
Demo address lookup → cart → Demo card + manual payment → signed callback → paid order
→ Worker ERP mock order push → ERP signed processing webhook
→ order processing → customer email delivered to Mailpit
```

Observed evidence:

- one order for duplicate payment callback
- one ERP job and one ERP order link
- inventory decremented once; reservation returned to zero
- ERP webhook replay returned duplicate success and persisted one event
- API restart preserved readiness and order access
- SMTP outage moved email to `retry_wait`; service recovery sent it successfully

## Completed functionality

- payment reconciliation and refund-state workflow
- checkout idempotency and payment-init replay
- inventory reservation/consume/release/cancel CAS and DB constraints
- ERP order/shipment/inventory/customer inbound and outbound paths
- percentage checkout promotions
- price/tax effectivity
- user and service-account permission ceilings
- guest-order token expiry/revocation
- consent withdrawal enforcement
- retention registry and account export/deletion processing
- SMTP encrypted settings and legacy migration
- shared production rate limiting
- API graceful shutdown/readiness/logging
- production build/container/preflight/migration runner

## Real integration evidence gate

`pnpm qa:real-integrations` performs non-destructive checks and produces redacted evidence. Current result is `0 passed / 0 failed / 5 blocked` because real credentials and `PRODUCTION_API_URL` were not supplied. Demo results must not be substituted for real vendor evidence.

## Remaining online-only gates

These cannot be truthfully completed without real credentials and a deployment target:

- Moneris QA/production Hosted Checkout and refund
- Canada Post AddressComplete real API
- production SMTP domain deliverability (SPF/DKIM/DMARC)
- real ERP contract and production endpoint
- production database backup/PITR/restore drill
- DNS/TLS, API/Worker hosting, probes, monitoring and rollback

Credentials must be supplied through `.env.production` or a Secret Manager, never chat text.

## Repository boundary

Many pre-existing untracked and modified files from other agents remain. They were not cleaned, overwritten, or included in backend remediation commits.
