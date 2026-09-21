# 260911 close — VanStro storefront

**Self-contained.** A new session cannot read the conversation this came
from. Anything not written here does not exist. Do not assume a linked
evidence file will be opened.

Stopped on the user's order at 20:33 (context too long). No code changed
after that. Nothing committed, nothing pushed.

---

## 0. Constants, identifiers, credentials

Verify these before and after anything you ship.

```
42AC order sha256 (must never change)
  16f9f7ee2aa5755a959f10eadad7134c923fd6ef37eacb352a9481dde525ea29

Order    VS-2026-004821-42AC   $6.71
Invoice  INV-2026-004821-42AC
Claimed by user  usr_13fd07cf
Quote    QT-2026-000001-093B

Users that must be preserved
  usr_13fd07cf                  (42AC claimant)
  usr_2fd20c48                  (dealer MB-YUAN)
Probe account usr_2355b33c…     disposable

Live BUILD  kt-WPgSINvfDCExgbZWuK

Moneris (identifiers only — never write secret values anywhere)
  HT store        htZ77RVYCQEXCA9
  Go store        mogo145551
  MONERIS_GO_TERMINALS=MB-YUAN:A2071830        (real terminal, verified)
  gwca092517 / chktQ72DU92517 is the CHECKOUT channel.
  Never use it as a Go store. They are different products.
```

Never enter a PAN, never click Pay, never open the card iframe. A PAN must
never pass through any proxy we run.

---

## 1. Unclosed, real customer: one dealer application nobody has handled

The only item touching a real person and real revenue.

```
dealer_applications — single row
id         7451de8e-f3c4-4530-b849-5faf664c8ed1
status     submitted
createdAt  2026-09-10 00:25:41 UTC   (Winnipeg 2026-09-09 19:25)
source     dealer-application-page
fields     all required present; only website / productFocus empty
```

No notification email, no CRM record, dashboard → applications is still
`coming_soon`. **Nothing has reached a human since 9-9 19:25 local.**
Exported for the user to
`~/Desktop/vanstro-dealer-application-7451de8e.txt` — contains PII, must
not be committed or copied into the repo.

Waiting on the user: whether to wire the notification path. Plan only, not
built: `tasks/evidence/260910-dealer-notify-plan.txt`.

---

## 2. Environment and deployment

Measured today, not recalled.

### Storefront (what customers see)

```
systemd unit   vanstro-next-8793        active, Restart=always
listener       127.0.0.1:8793           single listener, never add a second
node           /usr/local/lib/nodejs/node-v22.23.2-linux-x64/bin/node
helper         /www/wwwroot/vanstro.ca-next/deploy/start-8793.cjs
log            /www/wwwroot/vanstro.ca-next/logs/next-8793.log
Next root      /www/wwwroot/vanstro.ca-next
env            /www/wwwroot/vanstro.ca/account-ux/.env      mode 0600
ssh host       vanstro-prod
```

Release: build locally → `rsync -az --delete --exclude='cache/*.pack'
.next/ vanstro-prod:/www/wwwroot/vanstro.ca-next/.next/` →
`systemctl restart vanstro-next-8793`. Do not rsync `seo/` or `ops/`;
restore them afterwards if a release displaces them.

Never overwrite `ERP_TOKEN` in that `.env`. No token value in git, plans,
logs, evidence, or reports.

### Backend API

```
docker compose -f /opt/vanstro-production/app/docker-compose.production-server.yml \
  -p vanstro-production --env-file /opt/vanstro-production/.env.production
```

**Always pass `--no-deps`.** `api` declares
`migrate: service_completed_successfully`, so without it compose reruns
migration and can stall the service.

```
vanstro-production-api-1        vanstro-production-backend:latlng-20260910T052729Z   healthy
vanstro-production-postgres-1   postgres:16-alpine     127.0.0.1:15434
vanstro-production-worker-1     21ccec650006           still the old image
api listener                    127.0.0.1:4000
rollback image                  245a1ceb-20260821T053316Z  ==  21ccec650006
```

The worker on `21ccec650006` does **not** serve category or map queries;
that is expected, not a fault to chase.

EspoCRM runs beside it (`vanstro-espo`, `-db`, `-daemon`, `-websocket`).
Do not write to CRM.

Public API caps at **100 rows**. `limit` / `page` / `cursor` are ignored;
`offset` works. Only `meta.total` is the real count — never infer a total
from a page length.

### Code workspaces

```
write here   /Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/account-ux-replace-260905
             branch feat/account-ux-replace-260905      has src/lib/checkout.ts
do not use   …/worktrees/integration
             branch feat/dealer-access-hub              has NO src/lib/checkout.ts
read-only    /Users/zhangguannan/Documents/cursor/vanstro/          source packages
```

### UNTRACKED production files — no version exists anywhere

These are git **untracked**, not merely uncommitted. There is no blob, no
index entry, no earlier version. **If the worktree is lost, they are gone
with no rollback.**

```
src/lib/checkout.ts                 freight zeroing, tax base, etaDays,
                                    payment settlement logic
deploy/vanstro-next-8793.service    the systemd unit CURRENTLY RUNNING production
deploy/start-8793.cjs               the helper that unit executes
```

Several money-affecting changes shipped today live inside `checkout.ts`,
and git has never recorded that file. The unit and its helper are running
production right now from untracked files.

**The next architect's first action should be to confirm whether this list
has been resolved.** It was not committed today because the user has not
authorised git operations — that is a standing rule, not an oversight, so
ask before acting on it.

Full untracked inventory is in §10.1.

Build with `PATH=/opt/homebrew/opt/node@22/bin`. Do not disable
`ignoreBuildErrors`. **After changing data, alt text, product names, or
dealer records, `rm -rf .next/cache` before building** — SSG otherwise
serves stale output and the change appears to have failed.

Real site asset URLs carry the `/account/` prefix
(`/account/assets/site-header.js`). Plain `/assets/…` 301s.

Never point local verification at the production database. Never run seed
against production. Do not touch `data/orders`. Production nginx has a
single writer.

---

## 3. Tomorrow's first item: unapplied design files

```
/Users/zhangguannan/Documents/cursor/vanstro-rebuild/designs/
  vanstro-face-a-guides/     6 pages + guides.css + guides.js   NOT APPLIED
  vanstro-face-a-home/       Home.html … Home v11.html (12 versions)
  vanstro-face-a-packages/   Packages.html
  vanstro-face-b-dealers/    already applied (Dealers.html / Apply.html)
```

Preview `http://localhost:4311/<dir>/<file>.html` — verified 200 for
`vanstro-face-a-guides/Guides.html?v=g4`.

**Rule, written first because it was broken today: before touching any
page layout, check `designs/` for an existing file. Do not invent a
layout.** Yesterday a Guides layout was built from scratch twice while six
finished design files sat in that folder from 19:57.

### Snapshots already taken — do not re-copy

`tasks/evidence/design-snapshots/`
- `Dealers-20260911-0014.html` 53011 B, `Apply-20260911-0014.html` 28654 B
- `guides-20260911-0129/` — six HTML + `assets/guides.css` +
  `assets/guides.js`, taken before any analysis
- `home-20260911-0145/` — 12 top-level files, 52 total, 5.8 MB
  (`Home.html` through `Home v11.html` + `assets/` + `_d_meta.json`)
- `packages-20260911-0145/` — 2 top-level files, 21 total, 1.5 MB
  (`Packages.html` + `assets/` + `_d_meta.json`)

All four design sets are now snapshotted. The design folder has no version
control, so snapshot with a timestamp before applying anything from it.

The five scene photos in the design folder are **byte-identical** to
`public/assets/dealers/` (sha256 verified: `hardware-scene.webp`,
`kitchen-life.jpg`, `kitchen-scene.webp`, `trim-scene.jpg`,
`vanity-scene.jpg`). Do not re-import them.

### Live vs design: structure gap

| Element | Design | Live now |
|---|---|---|
| Index | `.contents ol`, one row per guide, grid `minmax(0,1.4fr) minmax(0,1fr) auto` (title / description / `Read guide`), `border-bottom` per row, then a full-width `figure.scene` | 2-col card grid, 21:9 photo per card |
| Detail skeleton | `.article-grid` = `220px minmax(0,1fr)`, gap 56px | single 720 column |
| TOC | `aside.toc` sticky `top:96px` + `details.toc-mobile` under 980px | none |
| Body | `.prose` `max-width: 68ch` | 720px |
| Photo | `figure` inside `.article-hero`, `height: min(32vh,360px)` | hero right slot 385×230 |
| End | `section.more` + `ul.more-list` (4 other guides) + `.btn-line` Back to Guides | one text link |
| Tables | measure guide has 2 `.guide-table` (10 base widths, 4 fillers) | none |
| Swatches | finishes has `.swatches` White / Light Grey | none |

Design h2 counts are **4 / 4 / 3 / 1 / 4** (care / adjustment / measure /
finishes / pickup). Live is **4 / 4 / 3 / 4 / 4**. Design `<ul>` in prose
is **0** — the 4 `<li>` per page are the `more-list`.

Prose paragraphs, design vs live: care 7/7, adjustment 6/6, measure 6/6,
pickup 7/7, finishes **3/8**.

**The finishes design file is the old 57-word thin version and is behind
live.** When applying the design, keep the live body text on that page and
take structure only.

Reusable from the design: index row list + bottom scene photo, TOC,
`more-list`, the two measure tables, the finishes swatches. Live has none
of these.

### Design tokens (independent page set, dealers precedent)

`guides.css` `:root` — container `1180px`, measure `68ch`, radius `6px`,
`--teal #004744`, `--teal-deep #00302e`, `--soft/--surface #eef1ef`,
`--green #0D8968`, `--orange #F5A93F`, focus `#F5A93F` 3px offset 3, fonts
**Sora** (Google) + `HarmonyOS Sans` bold TTF.

Site tokens differ: container `1440px`, `--radius-lg 14px`,
`--color-ink #003f3f`, `--color-soft #f5f8f7`, body font
`Segoe UI Variable Text`. `HarmonyOS Sans` already exists site-side at
`/fonts/HarmonyOS_Sans_Bold.ttf` as `--font-display`. **Sora is not in the
site.**

Design hero is teal-filled (`.hero{background:var(--teal)}`, white h1
24px) and `.article-hero` is `--soft` — neither matches the current white
unified hero. Settle tokens before starting.

### guides.js — two behaviours, no library

1. Drawer menu open/close. The site header already does this; not needed.
2. **TOC scroll highlight** — `IntersectionObserver`,
   `rootMargin: -20% 0px -60% 0px`, toggles `.is-on`. No dependency, no
   animation library. Anchor ids are hand-written (`#daily`, `#avoid`,
   `#hardware`, `#warranty`, …) and match the h2 text, so they can be
   derived from the existing live h2 strings without adding visible copy.

---

## 4. Shipped before today (do not rebuild these)

A new session will not know these exist and may redo them.

**Platform**
- Six-phase merge into a single Next app; real login; logout fix
- systemd-ised storefront (was a bare process)
- Invoice PDF + email; quotes with discount, PDF and email
- Manual and partial payment; ERP enabled
- POS channel through the real terminal `A2071830`, verified
- Mini cart
- Warehouse slimmed 51G → 38G

**Catalog and data**
- 13 pet-name SKUs renamed to hyphen form
- Three old URLs → 308
- Kitchen cabinets split into four subcategories (120 = 24/66/18/12)
- Subcategory SEO; six category descriptions
- 707 alt texts moved to hyphen form
- Internal dev copy removed from PDP
- Fractions unified to `¾"`
- 16 bathroom-vanity image mismatches corrected
- Stock wired to live ERP
- `$249` freight zeroed, moved to dealer quote

**Dealers**
- Two dealer-selection P0 fixes
- Dealer map P0 (mirror schema 1385 vs 2449 lines)
- Dealer data cleanup, two records deleted
- Dealer program and Apply pages rebuilt from the design files

**Site chrome and legal**
- French static shell top bar localised; `/fr/cart` checkout link
- Footer overflow fix; chat bubble no longer covers content
- Cookie dead link fixed
- Warranty page from the PDF's legal limits
- Ten placeholder / legal pages 200 + noindex
- Five-item top bar with Resource Center / Support / Company dropdowns,
  per-locale length sort
- `Our Company` → `Company`; `Why VanStro` removed
- Download Center rename; 16 PDFs stay on `/articles/`
- 12× 308 from three old article slugs → `/guides/<slug>`
- Five footer links removed

---

## 5. Shipped today

- **Guides hero** rebuilt to the site standard. The invented
  `.guides-index` 720-centered override is deleted; H1 width now comes
  from the public `max-width: 18ch`.
  Isomorphic with `/contact`, EN and FR, index and all five details:
  crumb `[80,1360,1280]` · h1 `[80,560,480]` · heroP `[80,800,720]` ·
  copy `[80,901,821]` · vis `[973,1360,387]` · cols
  `821.438px 386.562px`. At 390: crumb 358 / h1 **320** / heroP 358 /
  visImg 356. `doc == vp` at both widths. Verified independently by the
  architect.
- Index right image `assets/generated/vanstro-guide-white-v1.webp`;
  detail right image is each guide's own photo; the old isolated image
  above the body is gone.
- One hero button `Browse guides` / `Parcourir les guides` →
  `#guides-list`, parallel to `/articles/` `Browse documents` /
  `Parcourir les documents`.
- Cards `[80,708,628]` / `[732,1360,628]`, five non-repeating photos,
  21:9 626×268: vanity / hardware / kitchen-scene / trim /
  `kitchen-life.jpg`. `dealer-warehouse.png` unused (417×141, too small).
- Bodies reviewed and live: no screw direction, no `5/8`, no city names,
  no dealer counts. `finishes` expanded EN 455 / FR 523 after a 57-word
  accident: noindex → expanded → index restored.
- h2 option A: care 4 / adjustment 4 / measure 3 / pickup 4 / finishes 4.
  End link Back to Guides / Retour aux Guides.
- `dateModified` `2026-09-10T12:00:00.000Z` on all five; `datePublished`
  untouched; no author invented. Five guides indexable, sitemap 40
  entries, the 12× 308 unaffected.
- Guide slugs: `cabinet-care`, `cabinet-adjustment`,
  `how-to-measure-for-cabinets`, `what-finishes-are-available`,
  `pickup-and-delivery-options`.
- taste-skill marketplace pulled to `ccbc156`; the 14 commits were
  README/sponsor assets only, `skills/taste-skill/SKILL.md` unchanged at
  1206 lines, cache MD5 matches marketplace.

Companion evidence, if it is still there: `260911-guides-taste-audit.md`
(v2 audit, dials 5/3/3 — predates the design-file discovery, so its index
hero findings are moot), `260911-site-hero-measure.md` (site hero
measurements for `/contact` `/about` `/articles/` `/warranty` `/faq`
`/privacy`).

---

## 6. Debts — 13 open, 2 withdrawn

1. **Guides layout does not match the design files.** Highest priority,
   §3.
2. Dealer-application notify pipeline not built — §1 for the row id.
3. `qa/check-seo-artifacts.mjs` expects `out/`; the site is SSR.
4. Local uncommitted `mb01-products.ts` still has 411 × `5/8`; live API is
   `¾"`. Align before using that file.
5. `/v1-1` hidden preview: no nav entry, noindex, robots deny. Customers
   cannot reach it, it is not dead code, and it cites guide slugs — a slug
   change must touch it. Delete only on the user's word.
6. Footer Order tracking still `/order-status.html`; `/orders/lookup`
   exists (both 200).
7. `erp-console.png` / `crm-console.png` permanently banned; the dealer
   tool strip stays SVG (`tool-erp.svg`, `tool-crm.svg`, `tool-3d.svg`,
   live at `/account/assets/dealers/`).
8. **`/fr/warranty` overflows 4px at 390** — `scrollWidth` 394 vs
   `innerWidth` 390. EN warranty and the other seven placeholder pages are
   `doc == vp`. Not diagnosed.
9. Four placeholder pages have an empty hero column 2: `/faq`,
   `/warranty`, `/blog`, `/our-culture` (EN+FR).
   `unified-content-hero-grid` declares `821.438px 386.562px` but they
   carry only breadcrumb + copy. Row 2 sizes to content (126.188px,
   warranty 227.375px) so no dead band shows. `/warranty` and `/faq` were
   right-image-free before today; `/blog` and `/our-culture` content
   undecided.
10. Our Culture still placeholder.
11. Full French checkout localisation: separate project, not started.
12. Seed removal of three items waits on `erp-integration` /
    `dashboard-features` / `commerce-checkout` /
    `qa/verify_product_pages.mjs`.
13. Low, not ordered: image-error skeleton; index lede 18px vs article
    16px; 390 card media 1px inset (`[17,373,356]` vs `[16,374,358]`);
    Lucide arrow on cards.

**Withdrawn**
- `/articles/` "four-width stagger" — **withdrawn.** Its hero is the site
  standard (crumb 1280 / h1 480 / heroP 720). The 940 / 260 widths are
  document-list copy inside the category stack, not a reading column.
- "Three-column `/guides` table under observation" — **withdrawn.** It was
  the design file's own index layout. §7.

Also standing: external skills must be `git fetch`-compared with upstream
before use. Presence of a folder is not "latest".

---

## 7. The three-column table: design intent, not a defect

The user's 20:15 screenshot showed `/guides` as a three-column table
(title / description / `Read guide`) with row separators and no photos. It
was investigated as a live fault across three rounds — CSS load failure,
zoom level, cache mismatch, chunk 404 — before anyone opened the design
file. **Nothing was wrong with the site.** That is exactly what
`designs/vanstro-face-a-guides/Guides.html` looks like:

```css
.contents a { display: grid;
  grid-template-columns: minmax(0,1.4fr) minmax(0,1fr) auto; gap: 20px; }
.contents li { border-bottom: 1px solid var(--line); }
```

Title `h2` 16px, description `p` 14px, `em` "Read guide" nowrap
right-aligned, no per-row image, one `figure.scene` at the bottom. The
screenshot was almost certainly the local design preview at
`localhost:4311`, i.e. the target.

Evidence gathered along the way, kept because it is real:
- Live CSS chunks both 200 (`2_agt9dyoyi7t.css` 360378 B,
  `12z1u795hxb5v.css` 8009 B)
- `/_next/` serves `public, max-age=31536000, immutable`; HTML is
  `private, no-store` with `proxy_cache off`, so stale HTML cannot pin an
  old hash
- Disabling every stylesheet gives 1600×900 raw images, not a table
- `rsync --delete` removes old hashes → 404 → raw images, not a table
- Real Chromium 1440→601, zoom 80/90/110/125 %, print, `forced-colors`,
  `prefers-reduced-motion`: five photos, two-column grid, every time
- The table state needs `.guides-card-media{height:0}` +
  `.guides-card-body{flex-direction:row}` injected. `row` is the flex
  default, so it needs one declaration missing, not a whole chunk

Related: ~10 BUILDs shipped inside one hour today. Batch changes into one
deploy.

---

## 8. Verification discipline

### What proves nothing
- A title or H1 rendering does not mean the page works
- `?cb=` is not the user's view — acceptance is no query string
- An element existing is not the behaviour being correct
- `button.disabled === false` is not "clickable"
- A successful build is not correct build input
- Screenshots are not a report; require the artifact
- A relayed description is not verification — open the browser yourself

### Method
- Playwright viewport 1440×1100 and 390×844, `deviceScaleFactor=1`, and
  **do not set `is_mobile`** for the phone width
- Verify styles with `getBoundingClientRect` / `getComputedStyle`, not the
  HTML source and not by eye
- **Measure layout containers, not flex or inline children.** A
  breadcrumb "misalignment" at `[122,…]` was the Home link inside a 720
  container
- JS-injected chrome is judged on the rendered DOM, not curl first paint
- External CSS values are not in the HTML
- Rendered-text checks are case-insensitive under
  `text-transform: uppercase`
- Strings with regex metacharacters need `rg -F`
  (`twelve (12) months`)
- PDF extractors break sentences across lines; compare by paragraph
- Render order comes from the rendered output, not source-string order
- In-page hrefs must not assume a trailing slash
- Field names come from the live structure (`locations[].addressLine1`)
- Image filenames are not evidence; L/R labels can contradict the photo
- Any first-screen claim must state the viewport height it assumes
- Check display dependencies before deleting anything
- 27 static-shell paths must be kept in sync
- Data entering SSG needs `rm -rf .next/cache`

### Judgement failures recorded today
- Do not write current runtime state as policy (stock levels, dealer
  counts)
- Do not lift noindex without checking word count — a 57-word page
  reached search engines and had to be rolled back
- "Micro-adjust" is not "re-lay-out"
- Check the in-house standard before inventing one. The 720-centered hero
  was invented while `unified-content-hero-grid` already existed, and it
  changed a correct index H1 (480) into a wrong one
- Do not order a change from partial data. A hero was redesigned off three
  numbers at one width; the body layer and the 390 breakpoint both
  contradicted the order
- **A user's screenshot is a target by default, not a fault report.**
  Before treating one as a bug, confirm it is not a `designs/` preview
- Check `designs/` before designing anything

---

## 9. User's standing positions

**Appearance rule.** Change only the authorised item. Do not adjust
spacing, colour, radius, font, or copy along the way. New dropdowns use
`.nav-menu-dropdown`; never modify the shared catalog rules.

**Scope.** Style hooks stay under page scopes such as `.guides-index` /
`.guides-article` / `.dealer-program-page` / `.dealer-apply-page`. Never
edit the public `.page-hero` / `.page-panel` / `.resource-center-hero` /
`.unified-content-hero`. Never touch `site-header.js` / `site-footer.js`
chrome. Do not migrate design-file logos — the site header logo stands.

**Copy.** Customer-facing copy needs the user's review before shipping.
Body text is not edited when applying a layout. French wording is decided
from existing site translations or Canadian French convention and is not
escalated to the user — legal text follows the PDF. Delivery copy states
mechanism only, no city names and no dealer counts. Warranty copy is
distilled from the PDF; nothing is added that the PDF does not support.
Missing vocabulary is reported, never invented.

**Tokens.** Independent design pages use the design file's tokens; site
pages use site tokens.

**Structured data.** Never invent an author or a publish date. Omit rather
than guess. `datePublished` records first publication and is not rewritten.
Without an `updatedAt` source, `dateModified` is hardcoded once — and the
next body change must update it.

**Safety.** No Pay click, no PAN, no card iframe. Do not commit or push
unless asked. Do not touch `data/orders` or CRM writes. Do not run seed in
production. Production nginx has a single writer. Never connect local
verification to the production database.

---

## 10. Coordinator session retrospective (the architect may not know these)

### 10.0 First, a limit on this section's reliability

**My context was compacted.** Everything before the compaction exists for
me only as a condensed summary, not as the original record. So this
section is built from three sources, and I mark which:

- **[fs]** measured from the filesystem or the live server just now —
  reliable
- **[sum]** carried in the compaction summary — the fact is reliable, the
  surrounding detail (exact order, who asked, what was tried first) is
  **gone**
- **[unknown]** I cannot reconstruct it

What is permanently lost: the failed attempts, abandoned directions, and
intermediate states from before the compaction. If a half-finished
experiment from early in the session left residue, I can no longer name
it. The uncommitted-file audit in §10.4 is the only way to find it now.

I am not able to produce an honest chronological timeline of the whole
session. Presenting one would mean inventing the ordering. What follows is
grouped by category instead.

### 10.1 Uncommitted working tree — the largest unreported risk [fs]

```
89 modified tracked files
144 untracked entries  (49 of them tasks/evidence, 95 are code and assets)
git diff --shortstat: 89 files changed, 7268 insertions(+), 4427 deletions(-)
branch feat/account-ux-replace-260905, nothing committed
```

**None of this is committed. A lost worktree loses all of it.** The user's
standing rule is not to commit without being asked, so this is correct
behaviour, not an accident — but the next architect should know the
exposure is now 7268 insertions deep and much older than today.

Untracked code and infrastructure that exists **only** in this worktree.
**Untracked means no git blob exists — losing the worktree loses these
permanently, with nothing to roll back to.** The three most dangerous are
called out in §2 as well:

```
src/lib/checkout.ts                   ← CRITICAL: freight/tax/settlement,
                                        absent from the integration branch
deploy/vanstro-next-8793.service      ← CRITICAL: unit running production
deploy/start-8793.cjs                 ← CRITICAL: helper that unit executes
deploy/rename-13-vanity-names.sql
deploy/seed-delete-260909.sql
src/lib/auth.ts  src/lib/catalogue.ts  src/lib/customer-crm.ts
src/lib/catalogue-snapshot.json
src/app/api/                          ← whole API route tree
src/app/guides/  src/app/fr/guides/
src/app/faq/  src/app/warranty/  src/app/blog/  src/app/our-culture/
  (+ the four fr/ counterparts)
src/app/dealer-program/DealerProgramDesign.tsx
src/app/dealer-program/DealerToolsStage.tsx
src/app/dealer-program/dealer-design.css
src/app/dealers/apply/dealer-apply-design.css
src/components/checkout/cart-mini-drawer.css
src/emails/
account-ux/shadcn/app/api/sessions/   account-ux/shadcn/lib/session-ua.ts
account-ux/assets/dealers/
public/  — ~25 entries: the whole static shell (site-header.js,
  site-footer.js, storefront-chrome.css, vi.css, vi.js, cart.html,
  checkout.html, index.html, login.html, order-status.html, products.html,
  assets/brand/, assets/dealers/, assets/vendor/, three product images, …)
data/
```

To restate the worst of it: **the systemd unit that runs production, the
helper it executes, and the module holding freight, tax and settlement
logic are all untracked files in an uncommitted worktree.** `data/` is
untracked as a whole — a `find` for `42AC*` inside this worktree returned
nothing, so the 42AC order lives server-side, not here.

### 10.2 `mb01-products.ts` — answering the direct question [fs]

Yes. It is part of the uncommitted set:

```
 M src/lib/data/mb01-products.ts        411 occurrences of 5/8
                                        2819 occurrences of ¾  (architect's count)
```

Modified but never committed. The live API already serves `¾"`, and the
file contains **both notations at once** — 411 `5/8` alongside 2819 `¾`.
That is a **half-finished conversion**, not an untouched original. Status:
**unverified** — nobody has diffed it field by field against live, so
which 411 rows were missed is unknown. Building from this file as-is would
regress those rows.

Other data files I have **not** audited for the same drift:
`src/lib/catalogue-snapshot.json`, `account-ux/shadcn/lib/dealers-snapshot.json`
(modified), `src/lib/data/mock-data.ts` (modified). **[unknown]** whether
any of them disagree with live.

### 10.3 Production one-off operations [sum]

Each of these touched production. The compaction summary preserves that
they happened; it does not preserve the full command transcripts.

| Operation | Rollback artifact | Status |
|---|---|---|
| Postgres dump before category work | `pg-bak-20260910T012938Z.dump` | **existence unconfirmed** |
| Categories table edit | `categories-bak-20260910T203000Z.sql` | **existence unconfirmed** |
| Prisma schema replace (mirror 1385 → 2449 lines) | `app-schema-bak-20260910T0527Z.prisma` | **existence unconfirmed** |
| Backend image rebuild → `latlng-20260910T052729Z` | previous `245a1ceb-20260821T053316Z` == `21ccec650006` | running, healthy 20h |
| Container recreate (api) | image tag above | verified up |
| Two dealer records deleted | `deploy/seed-delete-260909.sql` | **irreversible without a restore** |
| 13 vanity SKU renames | `deploy/rename-13-vanity-names.sql` | applied |
| Warehouse slimmed 51G → 38G | none | **irreversible** |
| nginx edits | many `.bak` files server-side | see below |
| systemd unit created for 8793 | `deploy/vanstro-next-8793.service` (untracked) | active |
| ~10 `rsync --delete` + restart cycles today | old CSS chunk hashes deleted | current BUILD healthy |

**The three backup paths above are unconfirmed by anyone.** They come from
the architect's message record. The architect cannot see them (they would
be on the production host) and I never ran `ls` against them. **Verify
with `ls` before relying on any of them.** If they are gone, the two
dealer-record deletions and the categories edit have **no rollback
artifact at all**.

Server-side nginx has ~30 `.bak` files under
`/www/server/panel/vhost/nginx/` (`vanstro.ca.conf.bak-*`, `.before-*`).
They accumulated over weeks and most predate this session. No one has
pruned them; no one should without knowing which is the last good one.

### 10.4 Residue and temporary artifacts [fs]

**Will disappear on reboot — not preserved anywhere:**

```
/tmp/pw_nav_check.mjs         2069 B   nav dropdown probe
/tmp/pw-footer-check.mjs      1793 B   footer probe
/tmp/pw-fr-footer.mjs          421 B   FR footer probe
/tmp/sh.js                     162 B   architect's download: a 301 response body
/tmp/sh2.js                  26381 B   architect's download: the real header JS
/tmp/pw-p0-slowmo.mjs                  dealer P0 click probe
/tmp/guides-repro/           17 PNG    the three-column investigation
```

`sh.js` / `sh2.js` were the architect's temporary downloads of the static
shell header JS — unrelated to our code, safe to discard.

The 17 PNGs in `/tmp/guides-repro/` are the only visual proof that zoom,
print, `forced-colors`, `prefers-reduced-motion`, CSS-disabled and six
widths all render correctly. **If the three-column question is ever
reopened, they are gone** unless someone copies them into
`tasks/evidence/` first.

**Kept and needed:** `tasks/evidence/design-snapshots/` —
`Dealers-20260911-0014.html`, `Apply-20260911-0014.html`,
`guides-20260911-0129/` (6 HTML + css + js).

**Dead CSS left in `globals.css` [fs]:** `.guides-article-media` rules
(~18603-18620) are now unreachable — the detail pages stopped rendering
that element when the photo moved into the hero. I left them deliberately
rather than widen the diff, but they are dead.

`tasks/evidence/` holds 23 files dated 260909, 7 dated 260910, 4 dated
260911, plus screenshot folders. Many are duplicated inside
`subagent-artifacts/outputs/<uuid>/tasks/evidence/` — the same filename
appears under several UUIDs. Treat the copy under
`account-ux-replace-260905/tasks/evidence/` as the real one.

### 10.5 Work whose current state I have not verified myself [sum]

Everything in §4 "Shipped before today" is carried in the compaction
summary as completed. **I have re-verified none of it in this session.**
Specifically I did not re-check: invoice PDF and email delivery, the POS
channel through terminal `A2071830`, quote discount and PDF, manual and
partial payment, ERP enablement, the mini cart, the 707 alt texts, the
$249 freight change, the 16 vanity image corrections, or the dealer map
P0. **Status: [sum], not [fs].** If any of them matters to a decision,
re-verify rather than trusting this file.

Things I did verify myself today and would stand behind: the Guides hero
geometry at 1440 and 390 (EN+FR, index and five details), the card grid,
the five card photos being distinct, the five design-folder photos being
byte-identical to ours, the CSS chunk 200s and cache headers, the systemd
and docker state in §2, the `unified-content-hero-grid` definition, and
the four placeholder pages' empty hero column.

### 10.6 Findings I noticed and did not escalate at the time

- **`/fr/warranty` 4px overflow at 390.** Found while measuring the
  placeholder pages, reported in the same turn. Now debt 8. Never
  diagnosed.
- **`.guides-article-media` dead CSS.** Mentioned nowhere until this
  section.
- **`/tmp` scripts never being preserved.** I wrote probe scripts to
  `/tmp` repeatedly across the session and never once copied one into
  `tasks/evidence/`. That is why the earlier probes cannot be re-run as
  written. Recorded, not fixed.
- **Duplicate evidence under `subagent-artifacts/outputs/<uuid>/`.** Never
  reported; makes it easy to read a stale copy of a report.
- **Design folder has no version control.** All four sets are now
  snapshotted (`guides-20260911-0129`, `home-20260911-0145`,
  `packages-20260911-0145`, plus the two dealer HTML files).

### 10.7 Changes made without explicit per-item approval

Stated plainly, without argument:

- **Selector-level decisions inside approved work.** The architect approved
  "align the index hero" and later "delete the override"; the specific
  selectors, the `flex`/`max-width` mechanism, and the `@media 700`
  handling were mine. The first version of that override — the
  720-centered column — was ordered, then judged wrong, then deleted. It
  reached production and was live for two BUILDs.
- **`secondary-page-hero-visual` as the class for the new right slot.**
  The architect named it in the same message, so this was approved; I note
  it because the alternative (`resource-center-summary`) would have
  changed semantics.
- **The `Browse guides` / `Parcourir les guides` wording.** Approved in
  principle ("one button, parallel to articles"); the exact FR string was
  my parallel substitution from `Parcourir les documents`, per the user's
  standing rule that French is not escalated.
- **Snapshotting the six guides design files** before being told to, on
  the earlier standing instruction. This is why the architect's "please
  `cp` them" was already satisfied.
- **Deleting the `@media 700` override lines** for `.guides-index` hero
  and `.guides-article .container` when removing the main override. Not
  itemised in the order; they were part of the same mechanism.

**[unknown]** for the pre-compaction period: whether every change then was
individually approved. I cannot reconstruct it.

### 10.8 Rolled back, abandoned, or half-done

- **720-centered hero** — built, shipped, judged wrong, **fully removed**
  (verified: the CSS block is gone, live geometry matches `/contact`).
  Residue: only the taste-audit file, whose index-hero findings now
  describe a layout that no longer exists.
- **`finishes` 57-word page** — indexed, caught, set noindex, expanded to
  EN 455 / FR 523, index restored. **Fully closed.** The design file still
  carries the thin version, which is the trap in §3.
- **`dealer-warehouse.png` as the pickup card photo** — abandoned (417×141,
  too small and soft), replaced with `kitchen-life.jpg`. The PNG file is
  still in `public/assets/`, now unused.
- **Console PNGs** (`erp-console.png`, `crm-console.png`) — permanently
  banned; the dealer tool strip uses SVGs instead. Closed by decision, not
  by deletion; **[unknown]** whether the PNGs still sit in the design
  folder.
- **Guides index 65ch "micro-adjust"** — rejected by the user, then
  actually re-laid-out. Closed.
- **taste-skill v1 audit** — written against v1, then the architect
  corrected to v2 and the report was rewritten. The v1 pass was wasted
  work, not residue.
- **Three-column table investigation** — three rounds, no defect existed.
  Residue is the `/tmp/guides-repro/` PNGs.
- **The whole Guides layout** — **this is the half-done one.** Hero and
  body are on the site standard; the design files' index row list, TOC,
  `more-list`, measure tables and finishes swatches are not built. Live is
  internally consistent, so it is not broken — it simply is not the
  approved design.

### 10.9 Prior architect's orders — status

**[unknown] / cannot reconstruct.** The compaction summary carries closed
task batches (A–E, layout Mid/High, map, cookie, categories, footer,
Guides v1 and v2 nav) but not which architect issued them or whether any
order was left open when the handover happened. There is a handover note
at `tasks/handoff/260909-coordinator-role-transfer.md` and a
`260910-day-close.md`; **read both** — they are closer to that period than
I now am.

The items I know were explicitly deferred rather than completed are all in
§6 as debts. Whether an earlier architect expected them done, I cannot
say.

### 10.10 BUILD ids from today, newest first [sum + fs]

```
kt-WPgSINvfDCExgbZWuK   hero → site standard, right slot, one button   LIVE
0PDbTlCDJHVPqarNt2WtZ   index hero → 720 centered (later reverted)
oMzOXVtNEJI_VZSFAOJhC   detail column 720 centered
wFiNg5QLIXWyVSeOvtdrH   finishes h2 + dateModified
0gMrgcXdgAlHLAbcizdWE   finishes index restored
OZXGkxW8BEMifdoQCQbgl   four guides h2
27lWfW_swb-sJ4pOkur4b   finishes set noindex
uDVuqtASQvxhQe9vkQMlt   kitchen-life photo + card height
GYRdFgiX2dTjb9tnkBW64   16:9 card container
GzjxUGqjpHFdVFmS5nzZ9   260910 close state
```

Only `kt-WPgSINvfDCExgbZWuK` is verified live [fs]. The rest are from the
summary and are useful for correlating a customer report to a time window,
not for rollback — **the old CSS chunk hashes were deleted by
`rsync --delete`, so none of these BUILDs can be re-served.**
