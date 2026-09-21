# Backend Checkpoint — 2026-07-28 Production-Code Baseline

## Identity

- Repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Backend baseline commit: `8f001ffe840cc8423322daf22dbed8b2ecad0ad7`
- Verified shared commit: `d99da7b8ccdaa378209873066a99f272881dd893`
- Status: local verified source milestone; shared commit not pushed or deployed

## Verified scope

- Hono API, Prisma/PostgreSQL, Worker, Dashboard API, CRM, email outbox, ERP queues
- Hardened auth/session and Password Reset
- Password Reset security-payload encryption, Worker decryption/fail-closed rendering, EN/fr cleanup
- Checkout idempotency, inventory reservation lifecycle, order finalization, cart clearing
- Moneris MCO verification, provider refund, recovery and reconciliation protections
- Worker heartbeat and stale queue alerts
- Production Compose, migration/preflight, backup/PITR tooling
- One authoritative Password Reset model and deployed `20260730290000` migration path

## Verification evidence

- Full TypeScript: passed
- Prisma validate: passed
- DB: 3/3
- API: 105/105
- Worker: 11/11
- Package contracts: 9/9
- Runtime error localization: passed

## Production boundary

Production state remains separately evidenced. Latest durable record says 41 migrations and the fullstack8 frontend release, but this local shared commit itself was not pushed or deployed. Real card authorization/capture/settlement/refund remains explicitly deferred.
