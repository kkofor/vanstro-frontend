# Contributing to VanStro

Thanks for helping. This repository is a TypeScript monorepo: Next.js storefront and dashboard, a Hono API, a background worker, and PostgreSQL via Prisma.

## Prerequisites

- Node.js 22 (`.node-version` is `22`; `package.json` requires `>=22 <23`)
- pnpm 11.13.0, installed through Corepack (`packageManager` in the root `package.json`)
- Docker, so `docker compose up -d` can start PostgreSQL 16
- A local PostgreSQL 16 is also fine if you point `DATABASE_URL` at it

## Local setup

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm stack:dev
```

`pnpm stack:dev` starts the API on port 4000, the worker, and the Next.js app on port 3000.

`.env.example` contains placeholders only. Replace them locally and do not commit `.env`, `.env.demo`, `.env.staging`, or `.env.production`.

Day-to-day commands and the API contract live in [docs/DEVELOPING.md](docs/DEVELOPING.md).

## Before you open a pull request

Run the checks that match your change:

```bash
pnpm typecheck
```

Then the narrowest test that covers the files you touched. Examples:

- API or database behavior: `pnpm test:api` (disposable PostgreSQL 16) or the matching `scripts/test-*-pg16.sh`
- Worker: `pnpm test:worker`
- Storefront contracts called out in `package.json` scripts, such as `pnpm test:package-contracts`

When the change is broad, or you are preparing a release, run:

```bash
pnpm qa:ci
```

`pnpm qa:ci` typechecks, runs the API and storefront contract tests, builds the static Pages output, and checks SEO, French HTML language, and 404 artifacts. It needs Docker for the PostgreSQL 16 API tests. Skip it only when the change cannot affect those gates, and say so in the pull request.

## Branches and pull requests

- Fork the repository and open a pull request against `main`.
- Keep one pull request to one change.
- Use a short branch name that describes the change, for example `fix/checkout-address-fallback`.
- Describe what changed, how you verified it, and any checks you did not run.
- Do not commit secrets, production connection strings, or customer data.

## Reporting bugs

Open a [GitHub issue](https://github.com/kkofor/vanstro-frontend/issues) and include:

- What you expected and what happened
- Steps to reproduce
- Node version, OS, and whether you used Docker Compose
- Relevant logs with secrets removed

## Security

Do not report security vulnerabilities in public issues. See [SECURITY.md](SECURITY.md).
