# Integration Checkpoint — 2026-07-28 Full-stack Baseline

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Local main: `d99da7b8ccdaa378209873066a99f272881dd893`
- Backend source: `8f001ffe840cc8423322daf22dbed8b2ecad0ad7`
- Former independent frontend source: `a36486471b225d63745ffb8d993f6f841fa89a5f`
- Standard branches at checkpoint: `main`, `feature/frontend`, `feature/backend`, `integration/fullstack`
- Status: local verified; not pushed; not deployed

## History reconciliation

The former frontend workspace was independently initialized and had no common Git ancestor. Its target commit was cherry-picked rather than merged with unrelated history. Nine conflicts were manually reconciled with the current production Backend as authority and the newer Account/Commerce UI as the frontend source.

Excluded:

- incompatible duplicate Password Reset migration;
- duplicate Prisma model/relation;
- Worker heartbeat/session lifecycle/template bootstrap regressions;
- reset-token query propagation;
- stale former-workspace checkpoints.

Added or retained:

- encrypted reset-email security payload and Worker fail-closed decryption;
- EN/fr reset templates and payload clearing;
- memory-only browser reset token with URL scrub and no-referrer;
- complete catalog pagination;
- Account/Favorites/Commerce UI;
- payment pending-message parent fix and paid guest-order token behavior.

## Verification evidence

- Full TypeScript: passed
- Prisma validate: passed
- DB 3/3
- API 105/105
- Worker 11/11
- Package contracts 9/9
- Locale routes 52 / 3
- SEO/security, consent, final review, product identity, error localization, fr-CA format: passed
- Static export 396/396
- French artifacts 195
- SEO artifacts 390 application routes
- 404 and Careers/Contact privacy: passed
- Chromium 36/36 with `VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca`

## Promotion

The verified commit was strictly fast-forwarded to local `main`. The standard frontend, backend, and integration branches were created from the same commit. No push, production deploy, production migration, DNS/TLS change, or real payment occurred.
