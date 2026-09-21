# Frontend checkpoint — Dashboard P07 Media Library Foundation

- Branch/worktree: `feature/frontend`, `.claude/worktrees/frontend`
- Parent/shared baseline: `a943b0f71d4d04db7fd9b9bb8f3d25f85ef59fc3`
- Frozen contract: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p07-media-library-contract-20260802.md`
- Frozen v1.12 SHA-256: `5bfeb0d3ddacdb3be69ce38484adac9953c04ca95492c66a642cd399a621801c`

## Delivered

Frontend-only P07 adds strict safe/sensitive Media Asset, cursor list, detail, upload intent/result, usage, adapter and `mediaFoundationV1` capability validation. EN/fr `/dashboard/media` routes own canonical exact filters, one lowercase Asset ID, Back/Forward state and opaque in-memory cursor history. Requests are isolated by actor/query/generation, use AbortSignal, invalidate on centralized 401 handling and retain a successful snapshot for at most 60 seconds.

The Simplified Chinese interface provides Table/DetailDrawer presentation, controlled single-file upload, safe image preview, attachment-style original-download request, bilingual metadata, frozen usage attach/detach and archive/restore controls. Every Asset action is double-gated by top-level authorization and the server-computed per-Asset capability; per-Asset capabilities are required, exact and boolean-validated. `requestId` is required and unknown DTO/profile/registry fields fail closed. The consumer has no `content.read` dependency and exposes no storage path/key, arbitrary proxy, public original URL, physical delete, AI, bulk import/export or Product/CMS rewrite.

Final accessibility remediation keeps the preview trigger mounted while announcing pending/completed state; restores drawer focus to the originating trigger or a connected list-heading fallback; announces loading and refreshing accurately; gives repeated Asset/Usage actions contextual accessible names; and distinguishes Usage loading, ready-empty and error states. The EN/fr Media route pair is registered in the static locale manifest.

## Review findings closed

- Initial `typecheck:web` found the missing typed/validated per-Asset `capabilities` boundary used by seven double-gated controls. The DTO validator and fixtures now require the exact five booleans and reject missing, malformed or future capability fields.
- Initial configured static build compiled 398/398 but localization rejected `/fr/dashboard/media`; the route pair is now in the locale manifest.
- Independent accessibility audit reported two High and three Medium findings covering preview focus, drawer focus fallback, contradictory loading status, repeated action names and premature Usage empty state. All were fixed and re-reviewed with no remaining Blocker/High/Medium.
- A delayed independent correctness/security review found one High and five Medium issues after the initial commit: usage attachment sent a Backend-rejected extra field; controlled reads lacked abort/fencing; adapters outlived the 60-second snapshot; archived failure evidence was rejected; tags could commit noncanonical order/duplicates; and the `assetId` key remounted the list and lost cursor/focus. The independent follow-up removes the extra wire field, makes preview/download actor/Asset/generation-fenced and abortable with separate non-interfering controllers/generations and completion announcements, clears adapters on expiry, accepts archived retained failure codes, canonicalizes tags before submission and keys Media by `listHref`. Final correctness/security and accessibility re-reviews found no remaining reproducible Blocker/High/Medium.

## Verification

All formal commands used `PATH=/opt/homebrew/opt/node@22/bin:$PATH` (`v22.22.2`).

- Focused P07: `node --experimental-strip-types --test .../p07-media.test.ts .../MediaFoundationPanel.test.ts` — `14/14` passed.
- Full package contracts: `pnpm run test:package-contracts` — `165/165` passed.
- `pnpm run typecheck:web` — passed.
- Production-configured static build with `VANSTRO_STATIC_EXPORT=true`, `NEXT_PUBLIC_DEMO_READ_ONLY=true`, `NEXT_PUBLIC_SITE_URL=https://vanstro.ca`, `VANSTRO_WEBSITE_API_BASE_URL=https://vanstro.ca/api/v1`, `VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca` — `398/398` pages passed.
- Static localization — `196` French HTML artifacts passed.
- SEO artifacts — `392` application routes, `308` indexable URLs, `140` PDPs per locale and `300` catalog SKUs passed.
- French HTML language, 404/static fallback and protected-content artifact gates passed.
- Dashboard artifacts: `44` EN/fr HTML; Chinese Dashboard artifacts: `0`.
- `git diff --check` passed.

The first final commands without an absolute worktree/correct build configuration were not source evidence: one invocation ran from the launch cwd; one build omitted the new locale manifest route; one SEO artifact invocation used output built without `NEXT_PUBLIC_SITE_URL`. Correct absolute/configured reruns passed as recorded above.

Not run: authenticated live Backend P07 fixtures/browser matrix, `qa:browser-current-tree`, VoiceOver/NVDA/JAWS, real Windows forced-colors, Backend/DB/Worker suites or production QA. Integration owns these cross-domain/runtime checks.

## Boundaries

No Backend/Worker/Prisma/migration, merge, push, deploy, production migration/write, provider operation, external delivery, AI, bulk import/export, payment/refund or stash operation occurred.

## Write-transport acceptance follow-up

The read-only F0 boundary remains enabled globally. P07 alone now receives an operation-aware write transport whose callers cannot provide a URL or HTTP method. The transport constructs and allows only upload-intent POST, intent-content PUT, metadata PATCH, usage POST/DELETE, archive POST, restore POST and binding-backed retry POST. Before `fetch`, it verifies the current actor/context key, exact Asset/Usage/Intent identity, authoritative Asset scope and version, top-level plus per-Asset capability, upload kind/type/byte limits, exact metadata and usage fields, slot registry and retry binding. A 401 clears Dashboard data and invokes centralized invalidation.

The additive exact `retryBinding` read DTO is strictly validated as `{ jobId, jobVersion, variants[{ role, expectedVersion }] }`. Retry mounts only for a failed Asset when both capabilities and the binding are present, creates a new idempotency key, derives `expectedAssetVersion` from the current Asset, and validates the exact response projection. HTTP 409 triggers an authoritative refresh message and never automatically retries. Archive then Restore is likewise driven by the returned archived Asset/version rather than optimistic local status.

Node `22.22.2` follow-up verification passed focused P07 `20/20`, package contracts `170/170`, `typecheck:web`, production-configured static build `398/398`, French localization `196`, and `git diff --check`. Final independent review then found one High same-actor Asset selection race and two Medium stale-detail/per-kind upload fences. The follow-up fences mutation commits to the selected Asset, explicitly refetches detail after retry success/409, and requires the current per-kind upload capability before content PUT; focused `20/20` and `typecheck:web` passed again. No live Backend/browser mutation matrix was run; Integration owns it.

## Next action

Hand the focused Frontend commit to Integration and verify exact v1.12 global/scoped/denied profiles, 401 invalidation, capability double gates, controlled upload/preview/download, all mutations including retry conflict handling, cursor/stale/session races, focus restoration and route artifacts before any promotion. Do not deploy or begin P08.
