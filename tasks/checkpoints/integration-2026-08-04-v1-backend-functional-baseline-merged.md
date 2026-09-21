# Integration — v1 Backend functional baseline merge and verification

Date: 2026-08-04
Status: **MERGED; VERIFICATION INCOMPLETE — browser completion gate not met**

## Identity and protected state

- Integration started at `f731de8cced1e12d155fa93fb07a69c72e9c6625`, tree `40fbc5a91157eb22d95767f30168d1987e562ee3`, branch `integration/fullstack`.
- Backend source commit was `d0d42dd30cb51b8e86efd2269fecee651bf71038`, tree `a76ca4c5bbd123fb391fe55278bcb1e5b47a954f`; merge-base was exactly `960e7e6f8c6ab01982a5f2ee3ce94497ac07b7fe`.
- The three pre-existing Integration modifications were snapshotted before merge at `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/workspace/v1-step3-integration-dirty-snapshot/`. Manifest SHA-256: `447c730ac5d978fbd8eeac6c4a77ca5abbb7ac5575956b57a11a68d284cb1b40`.
- Protected file SHA-256 values remained exact after merge and verification: `next-env.d.ts` `7ad303e40d4fddf44f156129e397511953a71481c5cfd86b1862649aaaf240cc`; `next.config.mjs` `97d87d056ab6d198d838528b9aa6442650ad77e9e6fb5ea344e269a24bb7b2e5`; pre-update Integration handoff `acc53c5c3268f48d88fcc53be87a457c3ec7fb4af5e22891409c3b66c4efd003`.

## Merge and follow-up

- Normal two-parent merge: `bcb09b8ba352d6076b85310f3cd030846c8bc279`.
- First parent: `f731de8cced1e12d155fa93fb07a69c72e9c6625`.
- Second parent: `d0d42dd30cb51b8e86efd2269fecee651bf71038`.
- The first-parent merge delta exactly matched committed Backend `960e7e6..d0d42dd`; none of Backend's remaining one modified plus six untracked v2/security assets entered the merge.
- Integration-only harness follow-up: `d54dd83d9bb4625ffad2830dfbd60b683ec5b874` (`test: restore regular PostgreSQL lineage fixture`). It restores history-owned table/sequence ownership, the SQL-owned `media_storage_operations_jobId_fkey`, and uses the real migration62 helper signatures after Prisma `db push`; it does not change product behavior.

## Migration evidence

- Source migration count/latest: `72` / `20260804130000_f1_v15_runtime_acl_closure`.
- Migration72 SHA-256: `461d130913f471a26a680358ec76128734509863d51f8a2172581ba4a9d5a83e`.
- Migration71 SHA-256 remains `fdeb31836e907fa198cf995b973bd6ccd4a62ce03a291b5b9e3fc0317c66e41e`.
- The only migration delta from the merge-base is migration72; migrations1–71 were not edited.
- Static migration72: `3/3`.
- Real disposable PostgreSQL16 lineage through migrations1–68, signed/attested 69/70, migration71 and migration72 passed, retaining 31 old68 signatures, replay denial, atomic rollback and the migration71 observer matrix.
- Disposable PostgreSQL16 migration72 normal-function EXECUTE gate passed.
- `scripts/test-api-pg16.sh` exited zero, but its inherited harness does not actually launch the API suite after applying migration72; it is recorded only as lineage/function evidence, not as a strict-role HTTP pass.

## Functional and deterministic gates

Passed:

- Regular API on disposable PostgreSQL16: `233 tests / 221 pass / 0 fail / 12 intentional owned-only skips`.
- DB complete rerun: `86 tests / 50 pass / 0 fail / 36 intentional owned-only skips`. The first concurrent attempt reported one failure; an immediate complete rerun passed and is the accepted result.
- Worker: `32 tests / 31 pass / 0 fail / 1 intentional owned-only skip`.
- Package contracts: `212/212`.
- Stale Worker alert: `4/4`.
- Monorepo typecheck passed after isolating and then restoring a stale ignored `.next/dev/types` cache. No source or protected file was changed for this.
- Backend builds passed.
- Prisma generate and validate passed with a non-connecting placeholder URL.
- Frontend production static export passed: `404/404` pages and `199` French HTML artifacts.
- SEO artifacts: `398` application routes, `308` indexable URLs, `140` PDPs per locale and `300` SKUs.
- French HTML, 404/static fallback, Careers/Contact privacy and protected-artifact gates passed.
- Chromium current-tree regression: `40/40`.
- SEO/security, runtime error localization, fr-CA formatting and final transactional review passed.
- `git diff --check` passed.

## Browser evidence and blocker

A real Google Chrome/Playwright Cross-Foundation suite was run against current source through a controlled local fixture:

- Result: `10 pass / 1 fail / 0 skip / 0 not-executed`.
- Passed: server-authoritative Shell, P08 controlled upload/finalize, alternate finalize rejection, P09/P10 denial no-fetch, delayed response fencing, P08 modal focus, 390/320px reflow and localhost-only network.
- Failed: `F1-X07`, mobile navigation drawer focus-trap/Escape/focus-restoration assertion.
- Evidence: `qa/cross-foundation-f1-v1/evidence/result.json`, screenshots and logs. The harness contains a stale hard-coded `testedCommit`; this checkpoint binds execution to Integration tested product/harness tip `d54dd83d9bb4625ffad2830dfbd60b683ec5b874` and does not use that stale field as commit identity. Continuity parent is `1f4a68a3f3ac462ce1ed1be27620b285f9c81b38`, tree `ee42efeed9a5838b0d68c5849d4d192f100ec12f`.
- The prompt-required login, Foundation authorization, Operations/Readiness, Jobs list/detail, Work Queue/Notifications, Media no-side-effect path, Audit list/detail and logout were not all completed as one real-browser journey. Static Chromium is not substituted for those scenarios.

Therefore the Step3 completion condition is **not met**. The Backend baseline is merged and deterministic/API/static gates are green, but this checkpoint does not claim the Integration baseline fully verified or ready for the next feature step.

## Limits and deferred work

- Known authorization/security remediation remains the unchanged 20-item v2 register. No security certification is claimed and no item was marked fixed by deferral.
- AI Image Studio remains v3. No AI implementation was merged.
- Command Center, Merchant Workspace and real-business Import/Export were not started.
- No production/persistent database, provider/storage, payment/refund, ERP, Email, deployment, push, DNS/TLS or production migration action occurred.
- All disposable PostgreSQL containers and owned browser ports were removed/closed; zero task-specific runtime residue remained.
- Main and Frontend remain `8e2ad7440d74403f8cfa0c0d7bbf32f2bf9ae86b`; Backend remains `d0d42dd30cb51b8e86efd2269fecee651bf71038` with its exact seven deferred dirty assets; stash remains `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`.

## Next action

A separately authorized Frontend work unit should minimally repair and verify the mobile drawer focus behavior, then Integration must rerun the failed case and execute the complete prompt-required authenticated browser journey on one final commit. Do not begin the fourth feature step, promote Main or deploy before that closure.

`v1.0 Backend functional baseline merged; Integration browser verification remains incomplete`

`known authorization/security remediation remains deferred to v2.0`

`AI Image Studio remains deferred to v3.0`

`production deploy: deferred until full v1.0 functionality completion and separate user authorization`
