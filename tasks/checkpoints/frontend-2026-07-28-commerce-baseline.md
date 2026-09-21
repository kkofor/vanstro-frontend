# Frontend Checkpoint — 2026-07-28 Commerce Baseline

## Identity

- Repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Verified shared commit: `d99da7b8ccdaa378209873066a99f272881dd893`
- Former source commit: `a36486471b225d63745ffb8d993f6f841fa89a5f`
- Status: local verified milestone; not pushed and not deployed

## Verified scope

- Account overview, profile, addresses, orders, favorites, login, registration, forgot/reset flows
- Shared accessible Account page framing and loading/error/empty states
- Favorites account route and storefront integration
- Cart, order detail/lookup, and payment state UX
- Full catalog pagination and production fail-closed reads
- EN/fr-CA counterparts
- Reset token memory-only retention after hydration, URL scrub, and no-referrer
- Payment pending-message retention and guest-order token persistence
- Existing Dashboard and approved content routes preserved

## Verification evidence

- Full TypeScript: passed
- Package contracts: 9/9
- Locale routes: 52 static pairs / 3 dynamic families
- SEO/security: passed
- Consent storage: passed
- Final transactional review: passed
- Product identifiers: passed for 140 products and targeted variants
- Error localization: passed for 52 maintained literals and dynamic messages
- fr-CA formatting: passed
- Static export: 396/396
- French artifacts: 195
- SEO artifacts: 390 application routes
- 404 and Careers/Contact privacy gates: passed
- Chromium: 36/36 with current same-site API-origin configuration

## Boundary

This checkpoint does not claim knowledge of frontend work that existed only in the former chat. It records committed and tested source only. It does not claim production deployment.
