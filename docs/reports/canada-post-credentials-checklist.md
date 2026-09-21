---
title: Canada Post AddressComplete credentials checklist
date: 2026-07-26
status: awaiting-credentials
---

# Canada Post AddressComplete checklist

Checkout delivery uses Canada Post AddressComplete through the Website API proxy:

```text
GET /api/v1/address/autocomplete?query=
GET /api/v1/address/autocomplete?id=
```

## Required from business

| Variable | Purpose |
| --- | --- |
| `CANADA_POST_API_KEY` | AddressComplete Find API key (server-side only) |

## After credentials arrive

1. Put the key in local `.env` (never commit it).
2. Restart the API.
3. Exercise checkout delivery → address search → retrieve → create session.
4. Without a key, checkout still works with manual Canadian address entry.

## Not yet provided

- Find API key
