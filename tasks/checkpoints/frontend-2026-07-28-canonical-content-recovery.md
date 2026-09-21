# Frontend Checkpoint — 2026-07-28 Canonical Content Recovery

## Identity

- Canonical repository: `/Users/zhangguannan/Documents/codex/vanstro`
- Recovery worktree: `.claude/worktrees/site-recovery`
- Recovery branch: `recovery/canonical-site-20260728`
- Recovery source baseline: `ba212926076291147dc332b352307d93fc23a567`
- Production acceptance baseline: `/www/wwwroot/vanstro.ca/releases/working-tree-20260728-fullstack9-commerce-ui`
- Status: recovered and locally verified on the isolated recovery branch; not merged, pushed, or deployed

## Recovery sources

Maintained source was recovered in this order:

1. canonical repository history, especially content commit `4d88f35a1ad85fb9bd51af7c1eeeef3fb8cd5862` and reduced-motion fix `039eae575754249da273b5016965cd6a25b9d6c9`;
2. the existing `ba21292` About, Contact, careers-topic/privacy, locale, Commerce, Account, and Dashboard source;
3. public fullstack9 HTML only as read-only acceptance evidence;
4. the 11 PDF Git objects from `4d88f35`, independently matched to production HTTP bytes and SHA-256 values.

No production HTML, RSC, `__next` text, or hashed JS/CSS was committed as source. No copied repository, `.git`, `node_modules`, `.next`, `out`, environment file, or secret was used as source.

## Careers

Both `en-CA` and `fr-CA` now use typed `CareerRole` data and expose exactly three fact-aligned roles:

1. Business Operations Coordinator
2. Human Resources Coordinator / Recruitment Specialist
3. Business Development Representative

Each role has explicit location and work-arrangement fields, an optional employment type only where production evidence supplied one, summary, required qualifications, responsibilities, preferred qualifications, a role-specific mailto subject, and `hr@vanstro.ca` CTA. The French roles preserve the same slugs and business facts with natural fr-CA copy.

No salary, benefit, hiring guarantee, or unsupported legal claim was added. A historical generic compensation sentence was deliberately removed because it was not supported by the production acceptance evidence. Existing Contact `topic=careers` routing and EN/fr privacy disclosure remain unchanged.

## Resource Center

The `/articles` and `/fr/articles` pages now provide:

- Product catalogs: 2
- Installation guides: 8
- Warranty information: 1
- Total local PDFs: 11
- Planning Guides: the existing three article routes remain
- Before You Install guidance and localized support CTA

Both locales use the same local PDF inventory and document ordering. Titles, descriptions, applicable products/SKUs, language, page count, display size, View PDF, and Download actions are maintained as typed source data. French Resource Center content is fully localized instead of reproducing the mixed-language production fallback.

## PDF manifest

`qa/fixtures/canonical-pdf-manifest.json` records the historical Git commit, production URL base, verification date, exact bytes, page count, and SHA-256 for every tracked PDF. Source and post-build gates consume this manifest.

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

`pdfinfo` independently confirmed every actual page count above.

## EN/fr strategy

- About and Contact source were intentionally not rewritten.
- The complete local fr-CA About and Contact pages remain canonical; production's English-body fallback was not copied.
- Careers has three fact-aligned roles in both locales, intentionally improving the current production fr-CA general-interest fallback.
- Resource Center has the same 11 documents and structure in both locales, with complete French copy instead of production's mixed-language fallback.
- Shared immutable facts such as email, phone, dealer code/address, SKUs, filenames, page counts, and hashes remain identical across locales.

## Deterministic gates

New/strengthened gates verify:

- exact Careers role count, slugs, titles, source facts, locale alignment, and reduced-motion behavior;
- exact Resource split `2/8/1`, unique IDs/hrefs, local-only links, product-document anchors, and retained planning guides;
- exact tracked and exported PDF filename set, bytes, PDF signature, SHA-256, and metadata page counts;
- EN/fr Resource structure and actions;
- no French fallback on About, Contact, Careers, or Resource Center;
- Account, Cart, Checkout, Payment, Dashboard root, and all 20 Dashboard section route artifacts remain present;
- Careers is included in browser desktop/mobile locale regression;
- browser QA creates its ignored temporary parent directory on a cold worktree.

## Node 22 verification

All final commands used Node `22.22.2` and pnpm `11.13.0`.

- `pnpm install --frozen-lockfile`: passed.
- `pnpm db:generate`: passed.
- `pnpm typecheck`: passed across Web, DB, API, Worker, and CLI.
- `pnpm test:package-contracts`: 14/14 passed.
- `pnpm test:final-review`: passed.
- `pnpm qa:seo-security`: passed.
- `pnpm qa:error-localization`: passed for 52 maintained literals and 2 dynamic messages.
- `pnpm qa:fr-ca-display-format`: passed.
- `pnpm test:careers-contact-privacy`: passed.
- Clean production API-driven `pnpm build:pages`: passed after removing only this worktree's ignored `.next` and `out`.
- `pnpm qa:seo-artifacts`: passed — 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs.
- `pnpm qa:fr-html-language`: passed — 195 French artifacts.
- `pnpm qa:404-artifacts`: passed.
- `pnpm qa:careers-contact-privacy-html`: passed.
- `pnpm qa:protected-artifacts`: passed — 3 roles per locale, 11 PDFs per locale, `2/8/1`, 11 exported hashes, 3 planning guides, bilingual About/Contact, and protected route shells.
- `pnpm qa:browser-current-tree`: 40/40 passed in Chromium after adding Careers EN/fr to desktop/mobile route pairs.
- Clean output: 5,060 files, 393 HTML files, 195 French HTML files, 11 PDFs.

The first protected artifact runs failed only because React inserts HTML comments between adjacent text nodes; the gate was corrected to remove markup and normalize whitespace before asserting complete visible strings. The first browser attempt stopped before Chromium because the ignored `tmp/browser-qa` parent did not exist; the harness now creates it and the rerun passed 40/40.

## Fullstack9 comparison

The canonical source now contains every protected business-content class that required the production overlay:

- Careers EN 3 roles: matched and maintained as typed source.
- Resource Center 11 PDFs: matched by filename, bytes, SHA-256, and page count.
- About/Contact EN: existing approved local source retained.
- About/Contact fr-CA: existing complete translations retained instead of production fallback.
- Careers and Resource Center fr-CA: intentionally more complete than the current production fallback while preserving English business facts.

This checkpoint does not claim byte-identical HTML/CSS chunks with fullstack9; production HTML/RSC/hashed JS/CSS were used only as acceptance evidence. It establishes that clean Git source can regenerate the approved business content without the protected-content overlay.

## Boundaries and integration

- No change to Account, Favorites, Cart, Catalog, Checkout, Payment, Password Reset, Account API contract, Backend, Dashboard implementation, migrations, or production operations.
- No merge into `integration/fullstack` or `main`.
- No push, deployment, production migration, real payment/refund, release deletion, or recycle-bin cleanup.
- Coordinator integration must review this recovery commit as a narrow Frontend content/assets change, reconcile it with later Frontend Commerce commits, and rerun the current Integration full-stack gates before any promotion.
