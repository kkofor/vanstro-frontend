# `@vanstro/worker`

Background worker: email outbox, ERP outbound jobs, expired reservation release,
and timed ERP catalog sync.

- [docs/backend/README.md](../../docs/backend/README.md)
- [docs/BACKEND-HANDOFF-2026-07-26.md](../../docs/BACKEND-HANDOFF-2026-07-26.md)

```bash
# from repo root
pnpm worker:dev
pnpm worker:once
```

SMTP: prefers Dashboard `EmailProviderAccount` (`default_smtp`), falls back to `SMTP_*` env.
Catalog sync interval: `CATALOG_SYNC_INTERVAL_MS` (default 6 hours).
