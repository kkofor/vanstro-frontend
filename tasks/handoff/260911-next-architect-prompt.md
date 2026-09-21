# Opening prompt — next architect (VanStro, after 260911)

Read this file, then `tasks/handoff/260911-day-close.md`. Do not start
work before both are read.

## Five things before you touch anything

**1. Check `designs/` before any layout work.** Six finished Guides design
files sat unapplied at
`/Users/zhangguannan/Documents/cursor/vanstro-rebuild/designs/vanstro-face-a-guides/`
while a Guides layout was invented from scratch, twice. Snapshot
`guides-20260911-0129`. `face-a-home` and `face-a-packages` are snapshotted
but were never compared against the live site.

**2. A screenshot from the user is a target, not a fault report.** A
`designs/` preview at `localhost:4311` was debugged as a live defect for
three rounds — CSS load failure, zoom, cache mismatch, chunk 404. Nothing
was wrong with the site. Confirm where an image came from before opening
an investigation.

**3. These production files are git UNTRACKED — no version exists.**
Losing the worktree loses them permanently, with nothing to roll back to.

```
src/lib/checkout.ts               freight zeroing, tax base, etaDays, settlement
deploy/vanstro-next-8793.service  the systemd unit RUNNING production now
deploy/start-8793.cjs             the helper that unit executes
```

Confirm whether this has been resolved. Do not commit without asking — the
user has not authorised git operations.

**4. A real dealer application has been unhandled since 2026-09-09 19:25
Winnipeg time.** Details below.

**5. 42AC sha256 must never change:**
`16f9f7ee2aa5755a959f10eadad7134c923fd6ef37eacb352a9481dde525ea29`
Verify before and after anything you ship.

## Where things stand

Live BUILD `kt-WPgSINvfDCExgbZWuK`.

Work tree: `/Users/zhangguannan/Documents/codex/vanstro/.claude/worktrees/account-ux-replace-260905`
Server: ssh `vanstro-prod`, Next root `/www/wwwroot/vanstro.ca-next`,
unit `vanstro-next-8793`, single listener `127.0.0.1:8793`.

The worktree carries 89 modified and 144 untracked entries, 7268
insertions deep, none committed. That follows the user's standing rule, but
know the exposure.

## Raise this with the user before anything else

One real dealer application has been sitting unhandled since 2026-09-09
19:25 Winnipeg time.

```
id         7451de8e-f3c4-4530-b849-5faf664c8ed1
status     submitted
createdAt  2026-09-10 00:25:41 UTC
source     dealer-application-page
fields     all required present; only website / productFocus empty
```

No notification email, no CRM entry, dashboard → applications still
`coming_soon`. Exported to
`~/Desktop/vanstro-dealer-application-7451de8e.txt` (PII — keep it out of
the repo). Notification path is planned only:
`tasks/evidence/260910-dealer-notify-plan.txt`. The user decides whether
to build it.

## Two traps in the evidence itself

**Stale duplicate reports.** Many files under `tasks/evidence/` also exist
at `subagent-artifacts/outputs/<uuid>/tasks/evidence/<same-name>`, under
several different UUIDs. It is easy to open an older copy and act on
superseded numbers. **Treat the copy under
`account-ux-replace-260905/tasks/evidence/` as the real one.**

**Three backup paths nobody has confirmed.**
`pg-bak-20260910T012938Z.dump`, `categories-bak-20260910T203000Z.sql`,
`app-schema-bak-20260910T0527Z.prisma` — the paths come from a message
record; neither the architect nor the coordinator ever ran `ls` against
them. **Verify before relying on them.** If they are gone, the two
dealer-record deletions and the categories edit have no rollback artifact.

## First thing you do on any layout work

Check `/Users/zhangguannan/Documents/cursor/vanstro-rebuild/designs/` for a
design file covering the page you are about to touch. **Do not invent a
layout.**

```
vanstro-face-a-guides/     6 pages + guides.css + guides.js   NOT APPLIED
vanstro-face-a-home/       Home.html … Home v11.html
vanstro-face-a-packages/   Packages.html
vanstro-face-b-dealers/    applied already
```
Preview: `http://localhost:4311/<dir>/<file>.html`.
All four sets are snapshotted in `tasks/evidence/design-snapshots/`
(`guides-20260911-0129`, `home-20260911-0145`, `packages-20260911-0145`,
plus the two dealer HTML files). Snapshot before applying, so the next
diff is possible — the source folder has no version control.

## Task queued and specified: apply the Guides design files

Six pages, EN + FR. Structure comes from the design; **body text stays as
live** (it was reviewed and shipped yesterday). Details, including the
per-page structure table, token comparison, and what `guides.js` does, are
in §1 of the close file.

Two things to settle with the user or on precedent before starting:
- design tokens (dealers precedent: container 1180, radius 6, Sora font,
  teal-filled hero) versus site tokens (1440 / 14px / Segoe). Sora is not
  currently in the site.
- the design index is a row list with a bottom scene photo; live is a
  two-column card grid with five photos. Replacing it drops the card
  photos.

Scope rules that held all of yesterday: style hooks stay under
`.guides-index` / `.guides-article`; never edit the public
`.page-hero` / `.page-panel` / `.resource-center-hero` /
`.unified-content-hero`; never touch `site-header.js` / `site-footer.js`
chrome; do not migrate design-file logos.

## Rules the user has already set

- Only write in `account-ux-replace-260905`. Do not commit or push unless
  told. Source packages are read-only. Do not touch `data/orders`.
- Do not disable `ignoreBuildErrors`. Build with
  `PATH=/opt/homebrew/opt/node@22/bin`. After changing data, alt text,
  names, or dealer records, `rm -rf .next/cache` before building — SSG
  will otherwise serve stale content.
- Production `.env` is `/www/wwwroot/vanstro.ca/account-ux/.env`. Never
  overwrite `ERP_TOKEN`. No token in git, plans, logs, evidence, or
  reports.
- Do not rsync `seo/` or `ops/`; restore them after a release. Restart
  with `systemctl restart vanstro-next-8793`.
- Acceptance means real clicks, no query strings, EN and FR. Never enter a
  PAN, never click Pay, never open the card iframe.
- Playwright: viewport 1440×1100 and 390×844, `deviceScaleFactor=1`, and
  do not set `is_mobile`. Verify styles with `getBoundingClientRect` /
  `getComputedStyle`. **Measure layout containers, not flex children.**
- Customer-facing copy needs the user's review. French wording is decided
  from existing site translations or Canadian French convention, not
  escalated — except legal text, which follows the PDF.
- Batch changes into one deploy. About ten builds went out in one hour
  yesterday, which is how a stale-CSS theory ate an hour.

## Open, unowned, and worth raising early

1. The dealer application above — the only item touching a real customer.
2. `/fr/warranty` overflows 4px at 390 (`scrollWidth` 394). EN is clean.
   Not diagnosed.
3. Four placeholder pages (`/faq`, `/warranty`, `/blog`,
   `/our-culture`, EN+FR) have an empty hero column 2. Harmless today
   because the row sizes to content. Decide when their content is written.
4. `/v1-1` hidden preview page: deletion needs the user's word.
5. Full French checkout localization: separate project, not started.
6. `qa/check-seo-artifacts.mjs` expects `out/`; the site is SSR.

Full debt list is §3 of the close file.

## How to avoid yesterday's failure modes

The close file §5 lists nineteen concrete ones. The four that cost the
most time:

- Ordering a change from partial data. A hero was redesigned off three
  numbers measured at one width; the body layer and the 390 breakpoint had
  not been measured, and both contradicted the order.
- Treating a user's target as a description of current state. The
  `/contact` screenshot was a goal; it was read as a complaint.
- **Treating a user's screenshot as a fault report.** A “broken” Guides
  index was debugged for three rounds — CSS load failure, zoom, cache,
  chunk 404 — and it turned out to be the approved design file rendered at
  `localhost:4311`. Check `designs/` before opening an investigation.
- Accepting that a skill or document was read because output exists.
  Require the artifact.

Ask for the measurement before deciding. Ask which of the user's messages
is a target and which is a report. Neither costs anything.
