# VanStro Production Release Checklist

## Approval gate

Production DNS/TLS, database migration, live payment credentials, long-running Worker, deployment and push require explicit user authorization.

## Before staging

- [ ] Use Node 22 and pnpm 11.13.0.
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm db:generate`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:db`
- [ ] `pnpm test:api`
- [ ] `pnpm test:worker`
- [ ] `pnpm test:package-contracts`
- [ ] `pnpm build:backend`
- [ ] `pnpm build`
- [ ] `VANSTRO_STATIC_EXPORT=true NEXT_PUBLIC_DEMO_READ_ONLY=true pnpm build:pages`
- [ ] `pnpm preflight:production` against the proposed secret set.

## Database gate

- [ ] Take and verify a restorable backup before migration.
- [ ] Confirm RPO/RTO and record backup identifier.
- [ ] Run inventory preflight:

```sql
SELECT id, "skuId", "dealerLocationId", "quantityOnHand", "quantityReserved"
FROM inventory_snapshots
WHERE "quantityOnHand" < 0
   OR "quantityReserved" < 0
   OR "quantityReserved" > "quantityOnHand";
```

Expected: zero rows.

- [ ] Run `prisma migrate deploy` in staging first.
- [ ] Verify all 27 migrations.
- [ ] Do not run demo seed in production. `ALLOW_DEMO_SEED` must be false.
- [ ] Run `pnpm db:seed` only for RBAC/super-admin bootstrap.
- [ ] Perform a restore drill on a separate database before production approval.

## External integrations

### Moneris QA

- [ ] QA preload returns ticket.
- [ ] Hosted Checkout succeeds and declines correctly.
- [ ] Receipt includes matching `order_no` and amount.
- [ ] Browser closes after payment; reconciliation detects provider-confirmed payment.
- [ ] Refund request/confirmation process tested.
- [ ] Production simulation switches are false.

### SMTP

- [ ] Generate `EMAIL_SETTINGS_ENCRYPTION_KEY` with `openssl rand -base64 32`.
- [ ] Save SMTP settings; database JSON contains ciphertext, not plaintext.
- [ ] Send test email to real inbox.
- [ ] Verify SPF, DKIM and DMARC.
- [ ] Test retry, timeout, suppression and duplicate-tolerant templates.

### ERP

- [ ] Order/customer/inventory outbound contract tested.
- [ ] Idempotency keys honored upstream.
- [ ] Duplicate and out-of-order webhooks tested.
- [ ] Shipment `shipped` then `delivered` tested with tracking.
- [ ] Catalog sync tested beyond 500 products or upstream pagination limit confirmed.

### Canada Post

- [ ] Real AddressComplete key configured.
- [ ] Suggestion and retrieve paths tested.
- [ ] Quota and error fallback tested.

## Deployment

- [ ] API starts from compiled `dist/index.js`.
- [ ] Worker starts from compiled `dist/index.js`.
- [ ] `/health/live` and `/health/ready` configured as probes.
- [ ] Graceful termination window configured.
- [ ] API and Worker logs/metrics/alerts connected.
- [ ] Queue age, failed jobs, reconciliation sessions and catalog freshness alerts configured.
- [ ] Database connection budget and pool limits documented.
- [ ] DNS/TLS cutover and rollback commands reviewed.

## Post-deploy verification

- [ ] Readiness returns database `ok`.
- [ ] Customer register/login/logout.
- [ ] Cart and pickup cash/POS checkout.
- [ ] Dashboard mark-paid for non-card only.
- [ ] Card QA/production canary with minimum approved amount.
- [ ] Order timeline and shipment projection.
- [ ] CRM and ERP jobs generated once.
- [ ] Email delivered once or safely retried.
- [ ] Analytics writes only with recorded consent.
- [ ] Dashboard payment reconciliation queue empty or explained.

## Rollback

- [ ] Stop new traffic before rolling back schema-dependent application code.
- [ ] Do not roll back by editing Prisma migration history.
- [ ] Prefer forward-fix for additive migrations.
- [ ] Restore backup only under incident command with confirmed data-loss window.
- [ ] Reconcile Moneris settlements before reopening checkout after rollback.
