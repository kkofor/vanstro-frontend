# VanStro Frontend

Next.js implementation for the VanStro.VIP frontend rebuild 1.0.

## Run

```bash
pnpm install
pnpm dev
```

Current local preview:

```text
http://127.0.0.1:3001
```

## Implemented Pages

- `/` homepage 1.0
- `/products`
- `/products/[slug]`
- `/cart`
- `/favorites`
- `/account/login`
- `/account/register`
- `/dealers/apply`
- `/articles`
- `/articles/[slug]`

## API Boundary

Reserved endpoint constants and TypeScript contracts live in:

```text
src/lib/api/api-contract.ts
src/lib/api/api-client.ts
```

Mock server data for the first frontend pass lives in:

```text
src/lib/api/server.ts
src/lib/data/mock-data.ts
```

When backend endpoints are ready, replace the mock functions in `src/lib/api/server.ts` with calls to `vanstroApi` or a BFF adapter. Page components should not call raw backend URLs directly.

## Visual QA

Screenshots generated during verification:

```text
qa/home-desktop-final.png
qa/home-mobile-final.png
```
