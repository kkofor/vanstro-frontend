# Frontend checkpoint — Dashboard P03 Common Query / Search Contract

Date: 2026-08-02

## Identity and scope

- Worktree/branch: `.claude/worktrees/frontend`, `feature/frontend`.
- Shared Backend P03 baseline merge: `1a88b205702d01f8308ba1583031ecf3c80f6b75`; tree `16d9df4a752674786dcaef30339be755a9d57741`.
- Frozen contract SHA-256: `2bbdf5c4378414defddb71743a0d7898f453c21b1a914f1eb2a1c194edd98684`.
- Bounded scope: Products strict offset consumer, Dealers scope-bound cursor consumer, canonical URL ownership, capability rollback, query states, CRM safe compatibility adaptation, deterministic tests.
- Excluded: Global Search endpoint/UI, Saved Views, Export/Import, business-page rewrite, schema/migration, Backend mutation, P04, deployment/push/PR/stash.

## Implemented behavior

- Added occurrence-level Products/Dealers browser URL parser and fixed-order canonical serializer. Duplicate scalar parameters and browser/API key mixing fail closed.
- Products maps human page/productStatus to strict offset/filter.status transport; exact total drives pagination and OutOfRange correction.
- Dealers keeps opaque cursors only in memory, separates current/next cursor, and supports forward/back/restart without placing cursors in history.
- F0 Shell delegates recognized Products/Dealers URLs to the P03 owner before legacy canonicalization; Back/Forward restores query identity.
- Strict requests are capability-gated, abortable, actor/context/query isolated, and protected by per-tab latest-request sequence.
- Empty, Filtered Empty, OutOfRange, Exhausted, Refreshing, Stale, Forbidden, Error and capability-unavailable states are distinguished. Stale data has a hard capturedAt + 60 seconds timer and is then cleared.
- Capability false uses legacy only for neutral state; active strict-only state fails closed and exposes an explicit clear-query action.
- CRM presenters no longer render or send search `q`, tolerate omitted PII/internal linkage fields, and use `promotionEligible` for Promote availability. Old CRM q deep links render localized unsupported state without issuing an unfiltered request.
- Runtime validators require strict contract version, request ID, pagination mode/fields, stable sort metadata, snapshot time, visibility profile, exact total, cursor next semantics and safe minimum DTO shape.

## Verification

Successful:

- Required Node `22.22.2`: `typecheck:web` passed; package contracts including P03 `124/124` passed.
- Focused P03/F0/P02 on current source: `32/32` passed.
- Source gates: final review, runtime error localization, fr-CA display formatting and SEO/security passed.
- Production-configured `build:pages` passed.
- Built artifacts: SEO inventory 390 routes / 308 indexable / 140 PDPs per locale / 300 SKUs; French language 195 artifacts; 404 and protected-content gates passed.
- Dashboard artifacts: 42 EN/fr HTML; 0 Chinese Dashboard routes.
- `git diff --check`: passed.

Not run yet:

- Final independent security review found no reproducible High/Medium. Correctness review found two Medium issues: successful results were incorrectly cleared at 60 seconds without a failed refresh, and empty Dealer Exhausted restart reused the old cursor. Both are repaired; stale expiry timer now starts only after failed refresh and restart clears the chain. Final correctness re-review confirmed both closed and found no new High/Medium.
- Controlled browser query/capability scenarios and full API/DB/Worker/full-stack gates belong to Integration acceptance.
- No deployment, production migration/write, real payment/refund, ERP, push, PR or stash operation occurred.

## Migration and production status

- Source schema/migration added: no.
- Local migration applied for P03: no.
- Production remains release `3904a440` with 41 migrations; no production action occurred.
