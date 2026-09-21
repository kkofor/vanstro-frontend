# Integration checkpoint — Auth and Payment resilience

Date: 2026-07-31

## Identity

- Shared parent: `ce349af8e2d085a08f447c52134071289af00ffb`.
- Frontend commits:
  - `d6c90affbcc77d247a402053f612ef36ceaf6dcc` — rebalance Auth and Commerce flows.
  - `eed598bfc6e41f3814b9d676e64296c3cef49903` — harden Payment session polling.
  - `2fff3ef225aba379ce9202767cee8c4c7997c21c` — stop queued Retry after terminal Payment.
  - `7193c1e1ec29023f77d88750d84ff04503410820` — guard terminal callback Retry reentry.
  - `b74036d841b6e016bf15004ccf200b9468643620` — bound the terminal reentry regression test.
  - `1ad641db06e49c857b1eae547098654ac90aa639` — complete Payment lifecycle polling and close announcement/reflow findings.
  - `b9f35729b8970943914b0fc00e4ab2cac433dde3` — preserve authoritative Payment status across late accepted responses.
- Normal two-parent Integration merge: `0e1d3e2bc6cb83b798087ae67210449096f7e6fa`.
- Merge parents: `ce349af8e2d085a08f447c52134071289af00ffb`, `b9f35729b8970943914b0fc00e4ab2cac433dde3`.
- Merge tree: `e4a1d4b0353f9280d2f2166ebc5e1694f67b0511`.
- Merged Frontend paths match the Frontend tip exactly. No Backend, Worker, Prisma, migration, public API contract or deployment path changed.

## Integrated behavior

- Auth and Commerce task pages use compact responsive page framing without global main-height ownership.
- Cart retains Backend-authoritative identity, quantity and subtotal while reducing duplicated fulfillment content.
- Checkout storage is fail-open: successful Backend reservation cannot be reclassified as failure solely because sessionStorage is unavailable.
- Checkout renders contextual `INVENTORY_REFRESHING` guidance and an explicit retry action in EN/fr.
- Payment polling uses one visibility-safe request chain with permanent-error termination and bounded 5s/10s/20s transient backoff.
- Payment lifecycle classification is complete and disjoint against shared `CHECKOUT_SESSION_STATUSES`:
  - pollable: `pending`, `reconciliation_required`, `refund_pending`, `refund_processing`, `refund_failed`;
  - terminal: `paid`, `failed`, `expired`, `refunded`.
- Queued Retry cannot revive a terminal response; synchronous consumer Retry and consumer exceptions cannot create another network chain.
- Session-load errors remain separate from provider/action messages; successful polls clear only the session-load channel.
- A pending transition to expired/failed provides complete EN/fr live-region recovery text and terminal-heading focus, including hidden-to-visible deferred delivery. Initial terminal render remains silent.
- Late `{ accepted: true }` confirmation preserves the current authoritative Payment Session object and cannot overwrite paid, failed, expired, refunded, reconciliation or refund states with pending.
- Order Detail no longer uses current catalog price as historical order price; it displays authoritative line totals or unit-price/quantity data, fact-based status events and neutral unknown state labels.
- Order Detail product copy can shrink and wrap independently while the amount remains nowrap at narrow widths and high reflow zoom.

## Review and finding closure

Independent review and coordinator-controlled reproduction previously froze three range findings:

1. reconciliation/refund transitional states were treated as completed;
2. expired/failed live-region output discarded the generated detailed EN/fr recovery text;
3. long Order Detail product names could inherit nowrap and be clipped at narrow/high-zoom reflow.

Commit `1ad641d` closed all three. A later coordinator-controlled browser interleaving reproduced an additional race: polling observed paid, then a slower `{ accepted: true }` confirm response rewrote the UI to pending while the poller remained completed. Commit `b9f3572` closed that race by preserving the current authoritative session object.

Final independent range review found no remaining blocker or medium finding. Targeted authoritative-state review returned closure. Backend-aware lifecycle review confirmed the pollable/terminal classification matches current state transitions.

## Integration verification

Final successful commands used Node `22.22.2` and the local `vanstro_dev` database where applicable.

- Prisma generation: passed.
- Prisma validation: passed.
- Migration status: 41 migration directories; local schema up to date.
- Full TypeScript across Web, DB, API, Worker and CLI: passed.
- DB tests: `3/3`.
- API tests: `121/121`.
- Worker tests: `11/11`.
- Payment/announcement/Order targeted tests: `26/26`.
- Package/protected/API-client/Payment/Order contracts: `74/74`.
- Final review, SEO/security, runtime error localization, fr-CA formatting, functional consent and product identifiers: passed.
- Backend build: passed.
- Existing-database preflight: `{ "ok": true, "failures": [] }`.
- Production-API static export: `396/396`.
- Export inventory: 5,061 files, 393 HTML, 195 French HTML and 11 PDFs.
- Artifact gates passed: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs, French HTML, 404/static fallback, Careers/Contact privacy and protected content/PDF bytes and hashes.
- Chromium current-tree regression: `40/40`.
- Post-run checks: 0 invalid inventory snapshots, 0 matching temporary users and 0 matching temporary addresses.

### Test-run corrections retained as evidence

- One early targeted command used the DB package `tsx` runner, which transformed an ESM test with top-level await as CJS. Payment/live tests passed but the Order responsive test could not start. The complete targeted chain was rerun with the repository Node 22 strip-types runner and passed `23/23` at `1ad641d`; the final tip expanded this to `26/26`.
- Controlled browser harness attempts exposed harness-only issues before final success: request timing, an occupied unrelated port, CDP expressions returning DOM objects, overly narrow copy matching and Chrome-profile cleanup timing. None was represented as product success. Final complete runs passed after correcting only `/tmp` harness code.

## Controlled local browser verification

### Real Frontend tip with controlled local Payment/Order API stub

No production or real provider was used. An isolated Chrome profile exercised the actual merged Frontend components while a local stub controlled response ordering.

Verified:

- initial expired session: no duplicate live announcement;
- pending → expired and pending → failed: complete EN recovery text and terminal-heading focus;
- hidden transition: no hidden announcement; visible recovery delivers the full announcement;
- reconciliation and refund transitional states continue to their terminal state;
- late accepted interleaving: poll observes paid before the slower accepted response; final UI remains paid, pending UI does not return, and the Order link remains present;
- Order Detail at 390px, 320px, effective 200% and effective 400% reflow: zero root/row horizontal overflow, product name wraps and amount remains nowrap.

The earlier Frontend tip reproducibly ended the same late-accepted scenario with `paid=false` and `pending=true`. The final tip ended with `paid=true`, `pending=false`, and an Order link, establishing old-fail/new-pass behavior.

### Real merged Frontend with controlled local Checkout/Account API stub

Verified EN/fr at 390px and 320px:

- Checkout has zero root overflow and the summary returns to normal document flow;
- `INVENTORY_REFRESHING` renders contextual heading/body, `aria-describedby`, and `Check inventory again` / `Vérifier le stock de nouveau`;
- Account Orders renders the controlled authoritative order, localized status/money and the correct Order Detail link with zero overflow.

### Real local API and database

DB/API/Worker suites and preflight used the real local PostgreSQL/API code. Browser Payment scenarios intentionally used controlled stubs to avoid real provider actions. No real Moneris authorization, capture, settlement, simulation, refund or ERP operation was executed.

## Boundaries

- This work is locally integrated and verified but not deployed.
- Production remains the `3904a440` full-stack release.
- No production migration/write, real payment/refund, ERP action, fetch, push, PR or stash operation occurred.
- Controlled Next/stub/Chrome processes and profiles were stopped and removed. Local PostgreSQL and the pre-existing `4183` preview remain running.
- Main protected untracked files and separate agent worktrees were not modified.
