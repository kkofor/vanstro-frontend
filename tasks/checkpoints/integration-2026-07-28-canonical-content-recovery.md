# Integration Checkpoint — 2026-07-28 Canonical Content Recovery

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Integration worktree: `.claude/worktrees/integration`
- Integration branch: `integration/fullstack`
- Integration pre-merge HEAD: `577481ee7e39f1a7552cc5679eb23d532a907ff2`
- Recovery branch: `recovery/canonical-site-20260728`
- Recovery commit: `5b0a49c6dcf99cf09cd697baa93dbc243b1d8dd7`
- Recovery parent and merge-base: `ba212926076291147dc332b352307d93fc23a567`
- Merge commit: `b0f34277436c7339a78f63287b7f61a5d1483616`
- Merge parents: `577481ee7e39f1a7552cc5679eb23d532a907ff2` and `5b0a49c6dcf99cf09cd697baa93dbc243b1d8dd7`
- Status: locally integrated and verified; not pushed or deployed

## Integrated canonical source

The merge restores maintainable source rather than production build artifacts:

- typed Careers data and React UI with exactly three roles in both EN/fr-CA;
- typed Resource Center data with 2 catalogs, 8 installation guides, 1 warranty, and the three existing planning guides;
- 11 tracked local PDF assets and a deterministic provenance manifest;
- EN/fr Careers and Resource Center pages;
- scoped Careers/Resource Center CSS;
- source and post-build protected-content gates;
- Careers added to desktop/mobile EN/fr Chromium regression.

Production HTML, RSC, `__next` text, and hashed JS/CSS were not committed as source. Complete local fr-CA About/Contact content remained canonical; the production English-body fallback was not copied.

## Careers

Both locales contain these fact-aligned role identities:

1. Business Operations Coordinator
2. Human Resources Coordinator / Recruitment Specialist
3. Business Development Representative

The canonical data records location, work arrangement, optional employment type only when evidenced, summary, requirements, responsibilities, preferred qualifications, role-specific email subject, and `hr@vanstro.ca` CTA. The French roles preserve the same slugs and business facts. No unsupported salary, benefit, hiring guarantee, or legal claim was added.

## PDF manifest

The 11 tracked/exported files passed exact filename, bytes, page-count metadata, PDF signature, SHA-256, and byte-for-byte source/export checks.

| File | Bytes | Pages | SHA-256 |
| --- | ---: | ---: | --- |
| `vanstro-cabinet-product-catalog-spring-2026.pdf` | 17,189,404 | 40 | `4e28dcfb2784eb48f8726f3c342c4dc23e248188baec7b983d0408e5b9813eb8` |
| `vanstro-cabinet-vanity-warranty-2026-en-fr.pdf` | 112,885 | 6 | `fa868df8b9441573ef80efd54f5389a1d9a7524fd4a699d028bf1130c49dcce5` |
| `vanstro-trim-moulding-catalog-spring-2026.pdf` | 1,468,793 | 2 | `1b3738403ed2ca63c2b8434976a93849862eb390ef128409031677dea0feaa09` |
| `vanstro-vanity-installation-guide-v3021stdl.pdf` | 2,813,570 | 18 | `bb1a3a8cc586bb3a02e128ead1ef83ffb48dc960283ba78eeb9f3e50b8eba336` |
| `vanstro-vanity-installation-guide-v3021stdr.pdf` | 2,820,198 | 18 | `a770e08f5c2ee082417dc25bf76f56eba948827a71db57f47e4077fdd81b9813` |
| `vanstro-vanity-installation-guide-v3021tdl-v3621tdl.pdf` | 2,827,483 | 18 | `89a42eb73c79d51200817edf2832ca2dfdae393651801023c0e5d2c6ba770285` |
| `vanstro-vanity-installation-guide-v3021tdr-v3621tdr.pdf` | 3,002,423 | 18 | `a0913092a8f0a7826c22dac426d21dd0b7fa68724950b5ee4656dd6df9655bbb` |
| `vanstro-vanity-installation-guide-v4221-v4821.pdf` | 2,964,283 | 17 | `a7bc073818751376ad9160fe3ffe3bee8a6b7fea59ff6d6427c73a71b7dd8f15` |
| `vanstro-vanity-installation-guide-v6621.pdf` | 3,845,672 | 22 | `f0929faa947606e465713ceb984ab79e7e9023922e45fdb002b6377b25bc280a` |
| `vanstro-vanity-installation-guide-vs24-vs27-vs30.pdf` | 2,188,666 | 12 | `0071516594f8931416cdc978c4b13e3f828665bbdf0d19b9b481f070d079b912` |
| `vanstro-vanity-installation-guide-vs36.pdf` | 2,188,813 | 12 | `dec60e8bb61d040dca65bccceca096afa16c26e75a6c10ee6484e7bb99104694` |

## Merge conflict and semantic review

One explicit conflict occurred in `package.json`.

Resolution:

- retained current Integration tests for authoritative Cart identity/totals, canonical Account, `refund_processing`, Catalog filters/order, homepage curation, pagination, and safe errors;
- added `qa/protected-content-contracts.test.ts` to the same package-contract command;
- added `qa:protected-artifacts` and retained its place in `qa:artifacts`.

`src/app/globals.css` auto-merged. It was manually reviewed to retain both current Commerce/Catalog selectors and the scoped Careers/Resource selectors. It was not resolved with `ours`/`theirs` or whole-file replacement.

`tasks/handoff/frontend.md` auto-merged. It retains the latest Frontend `10e74f0` Catalog/Checkout/Homepage chain and its test facts, with the Recovery milestone added at the top.

Post-merge blob checks confirmed current Integration Cart, Checkout, Payment, API contract/runtime validation, Dashboard, Catalog filters/order, and homepage source remained byte-identical to `577481e`; canonical Careers/Resource source, gates, and 11 PDFs remained byte-identical to `5b0a49c`.

## Node 22 verification

All final commands used Node `22.22.2` and pnpm `11.13.0`.

- `pnpm install --frozen-lockfile`: passed.
- `pnpm db:generate`: passed.
- `pnpm typecheck`: passed across Web, DB, API, Worker, and CLI.
- `pnpm test:db`: 3/3 passed.
- `pnpm test:api`: 106/106 passed using the canonical local environment without copying or exposing secrets.
- `pnpm test:worker`: 11/11 passed.
- `pnpm test:package-contracts`: 30/30 passed.
- `pnpm test:final-review`: passed.
- `pnpm qa:seo-security`: passed.
- `pnpm qa:error-localization`: passed for 52 maintained literals and 2 dynamic messages.
- `pnpm qa:fr-ca-display-format`: passed.
- Careers/Contact privacy source gate: passed.
- Clean production API-driven `pnpm build:pages`: passed after removing only Integration's ignored `.next` and `out`.
- `pnpm qa:seo-artifacts`: passed — 390 application routes, 308 indexable URLs, 140 PDPs per locale, and 300 catalog SKUs.
- `pnpm qa:fr-html-language`: passed — 195 French artifacts.
- `pnpm qa:404-artifacts`: passed.
- Careers/Contact privacy artifact gate: passed.
- `pnpm qa:protected-artifacts`: passed.
- `pnpm qa:browser-current-tree`: Chromium 40/40 passed.
- Exported PDF manifest: 11/11 passed.

Clean build output:

- 5,060 files;
- 393 HTML files;
- 195 French HTML files;
- 11 PDF files.

Protected artifact assertions include exactly 3 Careers roles per locale, aligned role slugs/facts, exact `2/8/1` Resource split, exact 11 PDF inventory, bytes/hashes, byte-identical export, retained planning guides, complete fr-CA About/Contact, Account/Cart/Checkout/Payment/Dashboard route shells, and all 20 Dashboard sections in both locales.

## Overlay dependency and production boundary

The clean canonical source can now regenerate the approved protected business content without copying fullstack8/fullstack9 page artifacts or applying a protected-content overlay. This conclusion concerns source reproducibility only.

Current production remains:

`/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack9-commerce-ui`

No push, deployment, production migration, real payment/refund, DNS/TLS change, stash operation, release deletion, or recycle-bin cleanup occurred.

A future complete canonical fullstack10 release is technically appropriate because the overlay dependency is removed, but it must be built from the promoted canonical baseline, receive a separate production verification plan, and requires explicit deployment authorization.
