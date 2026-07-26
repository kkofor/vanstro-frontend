# CLAUDE.md — VanStro monorepo agent guide

## What this repo is

VanStro Canadian home-materials commerce: Next.js storefront + admin Dashboard, Hono API, worker, PostgreSQL (Prisma). Repo root: this directory.

## Read first (handoff)

1. `tasks/handoff.md` — structured backend takeover (status vocabulary is binding)
2. `SPEC.md` — product/tech spec
3. `DECISIONS.md` — architecture decisions
4. `docs/BACKEND-HANDOFF-2026-07-26.md` — deep backend map
5. `docs/SESSION-HANDOFF-FULL-LAUNCH-2026-07-26.md` — session deliverables
6. `docs/backend/README.md` — short backend README

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

Only commit when the user asks. Do not force-push. Do not add unrelated goal-loop / designs / hermes-webui noise unless asked.
