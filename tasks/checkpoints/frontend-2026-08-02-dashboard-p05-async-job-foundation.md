# Frontend checkpoint — Dashboard P05 Async Job Foundation

- Branch/worktree: `feature/frontend`, `.claude/worktrees/frontend`
- Parent: `a882dc6e41ffa2cedf3c9df8c55ba76bb3dd08ac`
- Frozen contract: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p05-async-job-foundation-contract-20260802.md`
- Contract SHA-256: `753001d78f0c65e533cc7220ff7a8e25a54f766a91e1a79c52aaaa796209627b`

## Delivered scope

Frontend-only P05 consumption adds strict `async-job.v1` list/detail/adapter validators and fail-closed authorization capability handling. Operations owns canonical `view=jobs` URL state with exact filters, Apply/Clear behavior, and opaque cursor state held only in memory. Native Job and legacy adapter sources remain separate.

The Simplified Chinese presenter is read-only and uses the shared Table and DetailDrawer. It displays canonical status, progress forms, attempts, safe actor/scope, timestamps, cancellation-requested versus cancelled state, safe result/error summaries, artifact metadata, and capability indicators. It mounts no create/cancel/retry/download, Import/Export, AI, Work Queue, or notification controls.

Request/cache identity includes actor/context/query, rejects stale commits, and retains successful strict data for at most 60 seconds. Capability false/malformed fails closed; neutral Operations remains the existing legacy read-only panel.

No Backend, Worker, Prisma, migration, deployment, production, payment/refund, ERP, push, fetch, PR, stash, P06, Work Queue or notification action occurred.

## Verification

- Focused P05: 8/8 passed.
- Frontend package contracts: 140/140 passed.
- `typecheck:web`: passed.
- Final review, runtime localization, fr-CA formatting, SEO/security: passed.
- Production-configured static build: passed with `VANSTRO_STATIC_EXPORT=true`, `NEXT_PUBLIC_SITE_URL=https://vanstro.ca`, `NEXT_PUBLIC_API_BASE_URL=https://vanstro.ca/api/v1`.
- SEO artifacts: 390 application routes, 308 indexable URLs, 140 PDPs per locale, 300 catalog SKUs.
- French artifacts: 195 passed.
- 404, Careers/Contact privacy and protected artifacts: passed.
- Dashboard HTML: 42; `/zh-CN/dashboard` artifacts: 0.
- Chromium current-tree: first run 0/40 because `https://vanstro.ca` was not declared as the harness external API origin; corrected run with `VANSTRO_QA_EXTERNAL_API_ORIGINS=https://vanstro.ca` passed 40/40.
- `git diff --check`: passed.

Not run: live Backend P05 fixture/browser integration, screen readers, or real Windows forced-colors. Integration owns those checks after Backend and Frontend commits merge.

## Visibility follow-up

Integration review found the Backend serves an exact `dashboard.async-jobs.sensitive.v1` profile when `jobs.read_sensitive` exactly matches `jobs.read`. The independent Frontend follow-up now passes the capability-sensitive expectation through list and detail consumers. Safe profile rejects actor ID, result values, error scalar values and artifact checksum; sensitive profile requires/accepts the actor ID and checksum and permits bounded safe summary values. Cross-profile responses fail closed.

A second Integration exact-wire review corrected three visibility assumptions without changing controller wiring: checksum digest is integrity metadata required in both profiles; sensitive actor ID is optional because system actors may have no stable ID; safe result/error envelopes may exist but their `entries` must be empty. Sensitive profiles permit bounded entries. Storage references remain forbidden.

Final Frontend review then closed two more Mediums: URL and DTO validators now accept only the frozen `foundation.probe` type/version/label and exact `foundation.probe.metadata` JSON/safe artifact registry; unknown future registry values fail closed. Adapter completion is stored from authoritative response metadata, so a successful scoped empty adapter set is complete and displays “当前范围没有可读取的旧系统适配器”, while only fetch failure is unavailable and server partial remains partial.

Latest follow-up verification: focused P05 `9/9`; package contracts `141/141`; `typecheck:web`; diff check. Backend was not modified.

## Next action

Hand the initial P05 commit plus the independent visibility follow-up to Integration, then run controlled live global/scoped/capability/stale/detail/artifact/adapter/accessibility verification against the merged Backend contract. Do not start P06 or deploy.
