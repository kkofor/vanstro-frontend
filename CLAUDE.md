# CLAUDE.md — VanStro monorepo agent guide

## What this repo is

VanStro Canadian home-materials commerce: Next.js storefront + admin Dashboard, Hono API, worker, PostgreSQL (Prisma). Repo root: this directory.

## Read first (handoff)

1. `docs/BACKEND-HANDOFF-CANONICAL-2026-07-28.md` — current canonical backend architecture, production deployment, operations, and open risks
2. `tasks/handoff.md` — cross-session continuity; older sections are historical when they conflict with the canonical handoff
3. `tasks/checkpoints/2026-07-27-production-customer-chain-e2e.md` — latest production customer-chain evidence
4. `SPEC.md` — product/tech spec
5. `DECISIONS.md` — architecture decisions
6. `docs/BACKEND-HANDOFF-2026-07-26.md` — historical backend map; do not use its production status as current truth
7. `docs/backend/README.md` — short backend README

## Session continuity and branch workflow

This is the only canonical VanStro development repository:

`/Users/zhangguannan/Documents/codex/vanstro`

Copied or archived repositories must not be used as active development workspaces. In particular, do not resume development in `vanstro-unified-online-20260727`.

### Required session startup

Before changing files, inspect the current Git branch, full HEAD, tracked changes, untracked files, worktrees, and stash. Then read:

1. `tasks/handoff.md`
2. `tasks/lessons.md`
3. the branch-specific handoff selected below
4. the latest checkpoints linked by those handoffs

Select handoffs by current branch:

- `feature/frontend` → `tasks/handoff/frontend.md`, then `tasks/handoff/integration.md` for the shared baseline
- `feature/backend` → `tasks/handoff/backend.md`, then `tasks/handoff/integration.md` for the shared baseline
- `integration/fullstack` or `integration/fullstack-*` → all three files under `tasks/handoff/`
- `main` → `tasks/handoff/integration.md`, then follow the domain links in `tasks/handoff.md`
- any legacy branch → start from `tasks/handoff.md` and do not assume it is current

If the actual branch, HEAD, working tree, or code conflicts with a handoff, stop and report the mismatch. Git and current source are authoritative for repository state; production claims still require current production evidence.

### Permanent session/worktree roles

Use registered Git worktrees from this repository; never create another standalone repository for isolation.

- Coordinator session: `.claude/worktrees/integration`, branch `integration/fullstack`. Owns priorities, cross-domain decisions, domain commit integration, conflict resolution, contract/migration reconciliation, full-stack verification, integration promotion, production releases, rollback, and production checkpoints.
- Frontend session: `.claude/worktrees/frontend`, branch `feature/frontend`. Owns storefront/account/Dashboard UI, i18n, frontend QA, static builds, responsive behavior, and accessibility.
- Backend session: `.claude/worktrees/backend`, branch `feature/backend`. Owns API, Worker, Prisma/migrations, payment/inventory/CRM/email/ERP, operations, and backend tests.
- Protected main workspace: repository root `/Users/zhangguannan/Documents/codex/vanstro`, branch `main`. It holds the verified shared baseline and serves as the release workspace. Do not use it for routine coordination or direct development; strictly fast-forward it from `integration/fullstack` only after full-stack verification.

Do not switch these worktrees to another standard branch. If a worktree/branch mapping differs, stop and report it.

### Branch responsibilities

- `main` contains only verified, runnable full-stack baselines. Do not develop directly on it.
- `feature/frontend` owns frontend scope and its domain handoff/checkpoints.
- `feature/backend` owns backend scope and its domain handoff/checkpoints.
- `integration/fullstack` receives frontend/backend work, reconciles contracts and migrations, resolves conflicts, and runs full-stack verification before promotion to `main`.

If frontend work needs a backend change, record it under **Backend contract required** in `tasks/handoff/frontend.md`; do not silently add unrelated backend implementation. If backend work changes a public contract, record it under **Frontend impact** in `tasks/handoff/backend.md`.

### Work-unit boundaries

Every frontend or backend work unit must follow all eight boundaries:

1. Work only in the corresponding permanent domain worktree and branch: frontend in `.claude/worktrees/frontend` on `feature/frontend`, backend in `.claude/worktrees/backend` on `feature/backend`. Do not implement domain work in `main` or `integration/fullstack`.
2. Keep the work unit to one explicit, bounded objective. Record unrelated findings as follow-up work instead of expanding scope silently.
3. After the bounded objective and its applicable deterministic checks pass, create a focused local commit on the owning feature branch under the commit policy below.
4. Hand the domain commit to `integration/fullstack`; do not copy files manually or integrate directly into `main`.
5. Run the applicable full-stack verification on `integration/fullstack`, including cross-domain contracts and migrations when affected. A domain-only green test run is not sufficient for promotion.
6. Promote verified integration work to `main` only by strict fast-forward. If strict fast-forward is impossible, stop and audit; do not reset, rebase, force, or rewrite the standard branches.
7. At work-unit closure, stop task-specific processes and audit every temporary worktree/branch. Commit, integrate, archive, or explicitly abandon its state before removing it; never leave an unexplained dirty or indefinitely locked temporary worktree.
8. The current project workflow is local-first and does not use GitHub remote contents, push, pull, PRs, or remote CI as the development mainline. Do not fetch, push, or introduce a GitHub workflow unless the user explicitly changes this policy.

### Handoff responsibilities

- Frontend sessions update `tasks/handoff/frontend.md`.
- Backend sessions update `tasks/handoff/backend.md`.
- Integration sessions read both domain handoffs and update `tasks/handoff/integration.md`.
- `tasks/handoff.md` is a short current-state index placed above its archived historical record; it is not a chat transcript.
- Handoffs describe current resumable state and may be updated.
- Checkpoints record verified milestones and should not be rewritten to describe later work.
- Never infer uncommitted progress from another conversation. Mark it as unknown until that session provides a handoff or the files can be verified.
- Never store passwords, tokens, cookies, private reset URLs, connection strings, or other secrets in continuity files.

Before ending a substantive session, update the relevant handoff with:

- branch and full HEAD;
- shared `main` baseline;
- completed scope and affected subsystems;
- exact verification results and tests not run;
- unresolved issues and cross-domain contract impact;
- commit and integration status;
- one concrete next action.

Create a domain checkpoint only for a meaningful, verified milestone. A full-stack checkpoint does not replace frontend or backend progress records.

## Hard rules

- Do **not** production-deploy, touch live DNS/TLS, `prisma migrate deploy` to prod, or `git push` unless the user explicitly authorizes it in the current chat.
- Do **not** commit secrets (`.env`, tokens, passwords).
- Do **not** mark work **已完成且已验证** unless tests/smoke/manual checks actually passed.
- Prefer `src/lib/api/api-contract.ts` + `apps/api/src/dashboard/access.ts` as API truth; update them with code.
- Analytics writes require `consentAnalytics: true`.
- Dashboard mark-paid: only pending non-`card` sessions; use dynamic `import("../app.js")` inside the handler (circular import).
- Worker must not depend on `@vanstro/api` package imports for catalog sync — HTTP + service token.

## Day-1 commands

```bash
pnpm install
docker compose up -d
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm api:dev          # :4000
pnpm worker:dev
pnpm dev              # :3000
pnpm typecheck && pnpm test:api && pnpm api:smoke
```

## Layout

| Path | Role |
| --- | --- |
| `apps/api` | Hono API `/api/v1` |
| `apps/worker` | Email, ERP jobs, catalog cron |
| `packages/db` | Prisma, migrations, seed, permissions |
| `src/` | Next.js storefront + `/dashboard` |
| `tasks/handoff.md` | Continuity for next agent |

## Commit policy

Frontend and Backend sessions have standing authorization to create a **local commit on their own feature branch** after completing one bounded work unit, but only when all of the following are true:

- the requested scope is complete and independently explainable/revertible;
- applicable tests and deterministic gates passed;
- the corresponding domain handoff was updated with exact evidence and remaining work;
- the staged file set was reviewed and contains only that domain work plus its handoff/checkpoint;
- `git diff --cached --check` and a secret scan passed;
- no unresolved cross-domain contract, migration, conflict, or failing test remains.

Do not auto-commit when work is partial, tests failed or were unexpectedly blocked, scope is mixed/unclear, Backend-owned changes appeared on `feature/frontend`, Frontend-owned changes appeared on `feature/backend`, or another session's protected work would be included. Report and wait instead.

This standing authorization does **not** authorize push, force-push, merging/cherry-picking into `integration/fullstack` or `main`, production deployment, production migration, DNS/TLS changes, stash operations, or real payment/refund actions. Those remain coordinator/user-authorized operations. Coordinator commits on `integration/fullstack` or `main` are not covered by the domain auto-commit rule unless the user explicitly authorizes the current coordination cycle to commit.

Never add unrelated goal-loop reports, generated artifacts, archives, copied-repository history, designs, `hermes-webui`, or pre-existing protected untracked files unless specifically requested.
