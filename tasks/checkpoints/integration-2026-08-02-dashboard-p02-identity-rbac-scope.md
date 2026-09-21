# Integration checkpoint — Dashboard P02 Identity / RBAC / Data Scope

Date: 2026-08-02

## Integrated identity

- Shared parent: `c0156c51c448e8e3298c68b1dbf66cdeb0cc927b`.
- Backend functional/handoff: `793d9aa269fc92411e68d54ccd557b9f19ffa343` / `eaa215b36d62b9324480dd07925e4f6429e33f43`.
- Normal Backend merge: `68ca0e466d09741639423564709c2abda3cbf58d`, parents `c0156c5` and `eaa215b3`.
- Frontend functional/handoff: `18b1c2c63d8a0f287aae5e16435cf0a26e969596` / `ef5d9a1f02a8c33efe4e1616405b16b4bed10e49`.
- Normal Frontend merge: `d6764c94848e0bffab6f68f2d4bf58c1906933b3`, parents `68ca0e4` and `ef5d9a1f`.

## Integrated behavior

- P02 adds persisted Dealer membership, dealer-scoped role and Location grants, validity/revision/revocation state, one source migration, idempotent RBAC bootstrap, and explicit-ID-only backfill.
- Backend authorization preserves scope per permission. Unrelated global roles cannot promote scoped permissions; Dealer/Location reads use only `dealers.read`; unmigrated Domain routes require the route permission itself to be global.
- Membership mutations require independently global `users.manage` and `settings.write`, re-authorize inside the transaction, use consistent lock ordering, CAS revision, and same-transaction audit.
- Frontend retains Foundation as the internal-shell/legacy rollback switch, then consumes and strictly validates `dashboard-authorization.v1` in the same request generation.
- P02 read actions are the navigation authority. Scope-aware Dealer reads may be scoped; unmigrated Domain modules require global action scope. Known denied direct routes retain their URL and do not mount business content.
- Authorization snapshots reject actor mismatch, invalid/unavailable/expired responses; expiry forces revalidation. Resource identity includes `actor.id:contextRevision`.
- F0 remains read-only, retains 21 logical pages and exactly 42 EN/fr artifacts, creates no Chinese route, and preserves flag-disabled rollback.

## Security review closure

- Backend adversarial reviews reproduced and closed permission-scope collapse, scope laundering, mutable role identity, Dealer-detail IDOR, membership TOCTOU/lock inversion, Location-scope expansion, and validator semantic-forgery paths. Final reviews found no remaining High/Medium.
- Frontend reviews reproduced and closed action-summary authority drift, scoped navigation to globally guarded Domain endpoints, authorization TTL staleness, and unavailable-state accessibility/recovery. Final reviews found no remaining High/Medium.

## Deterministic verification

Successful on Node `22.22.2`:

- Prisma generate and validate: passed.
- Local migration status: 42 migrations, schema up to date.
- DB tests: `5/5`.
- API tests: `137/137`, 0 failed, 0 skipped.
- Worker tests: `11/11`.
- Full TypeScript across Web/DB/API/Worker/CLI: passed.
- Backend build and existing-database preflight: passed.
- Package/Frontend contracts: `119/119`, 0 failed, 0 skipped.
- Final source review, runtime error localization, SEO/security, and fr-CA display formatting: passed.
- Production-configured static build: `396/396` pages.
- Protected content, 404 fallback, and French HTML language gates: passed.
- Exact Dashboard HTML artifacts: `42`; Chinese Dashboard artifacts: `0`.

## Controlled browser verification

- A static-server attempt correctly proved insufficient for runtime P02 evidence because the exported page stayed on legacy Dashboard and issued no Foundation request; it is not counted as a pass.
- Current-source Next dev runtime with browser-injected same-origin read-only fixtures passed:
  - Foundation + Authorization both requested before internal Shell presentation.
  - Products internal Shell showed three authorized modules: Overview, Products, Dealers.
  - Dealer-scoped Orders action was hidden because the current Domain endpoint still requires global `orders.read`.
  - Products content loaded through GET-only Dashboard calls; no business mutation was issued.
  - Known denied `/dashboard/orders/` retained its URL, hid Orders navigation, showed the explicit Chinese forbidden heading/alert, and mounted no Orders content.
  - `authorization.status=unavailable` showed the explicit retryable unavailable alert rather than an empty-permission state.
  - Foundation disabled immediately restored the legacy Dashboard and Storefront chrome.
- Temporary ports `4317` and `4318` were stopped; no repository fixture file or database state was created.

## Boundaries and remaining action

- No staging/production deployment, production migration/write, push/PR, real payment/refund, ERP action, inferred membership, stash operation, or P03 work occurred.
- VoiceOver/NVDA/JAWS/Dragon and real Windows forced-colors assistive-technology checks were not run.
- Next action: commit this Integration checkpoint/handoff, then strictly fast-forward protected Main only after collision/status audit. No deployment follows.
