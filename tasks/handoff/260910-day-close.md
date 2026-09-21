# 260910 close — coordinator

Live BUILD `GzjxUGqjpHFdVFmS5nzZ9`. 42AC sha256
`16f9f7ee2aa5755a959f10eadad7134c923fd6ef37eacb352a9481dde525ea29`.
No Pay. Architect closed nav + guides + Become a dealer dropdown. No open
orders.

## Shipped

- Five-item top bar; Resource Center / Support / Our Company hover
  dropdowns; catalog hover and CSS unchanged.
- Per-locale character-length sort on those three menus.
- FR shell header/footer internal hrefs locale-prefixed.
- Download Center rename; 16 PDFs stay on `/articles/`.
- 12× 308 three old article slugs → `/guides/<slug>`.
- Warranty page with PDF-sourced legal limits; ten placeholder/legal
  pages 200 + noindex.
- `Become a dealer` removed from Our Company dropdown only; footer and
  `/dealers/apply` kept; dealer-program page still links to apply.
- Five guides live (two new slugs `cabinet-care`, `cabinet-adjustment`),
  all noindex, index sorted by title length, breadcrumb Guides.

These files live in the **account-ux-replace-260905** worktree (not
integration). Evidence: `tasks/evidence/260910-day-close.txt` and the
260910-nav-*.txt files in the same folder. Screenshots:
`tasks/evidence/nav-length/`.

## Debts (do not touch without a new order)

1. Footer Order tracking still `/order-status.html` while `/orders/lookup`
   exists (both 200).
2. `#cookie-preferences` homepage hash vs `/cookie-settings` (both work).
3. Local uncommitted `mb01-products.ts` still has 411 × `5/8`; live API
   already `¾"`. Align before any future use of that file.
4. `/guides/` in-page hrefs omit trailing slash; slash variants also 200.
5. `/v1-1` (HomePageV11) is a hidden preview — no nav entry, noindex,
   robots deny. Customers cannot reach it; it is not dead code. Today its
   "View all FAQs" href was changed from
   `/articles/how-to-measure-for-cabinets` to `/faq`. Risk: unmaintained
   and it cites guide slugs, so any future slug change must touch this
   page too. Delete only after the user says so (deleting a page is
   irreversible).

Waiting on the user: PDP 390 first-screen price/add-to-cart; Why VanStro
and Our Culture content; whether to index the five guides.

Shell header real URL is `/account/assets/site-header.js`, not
`/assets/site-header.js`.

## Nine check lessons (architect, 260910)

1. Image filenames are not evidence. L/R labels can contradict the photo.
2. Rendered-text checks are case-insensitive (`text-transform: uppercase`).
3. Field names come from the live structure (`locations[].addressLine1`).
4. JS-injected chrome is judged on the rendered DOM, not curl first paint.
5. Strings with regex metacharacters need `rg -F` (`twelve (12) months`).
6. PDF extractors break sentences across lines; compare by paragraph.
7. Render order comes from the rendered output or the array that feeds it,
   not source-string appearance order.
8. In-page hrefs must not assume a trailing slash.
9. Do not write current runtime state as policy (stock/dealer count).
