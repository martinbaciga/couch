# Couch

Where a film or series streams, in your country and in other countries, grouped by the services you subscribe to. Letterboxd watchlist import comes later.

This repository is the app. Product and build rules are in [`AGENTS.md`](./AGENTS.md). The source of truth is the Linear document "Development guide (for the coding agent)" in the Couch project. The PRD is background and is behind the guide.

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

Node 22 (see `.nvmrc`). Package manager is pnpm.

Copy `.env.example` to `.env.local` and set `TMDB_READ_ACCESS_TOKEN`. That token is server-only. Never prefix it with `NEXT_PUBLIC_` and never commit it.

## Caching

TMDB does not publish a caching duration, so each response stays fresh for a short time. There is no database. Availability stays on the server. The browser stores settings, the imported watchlist, and recently viewed only.

| Route                           | Fresh   | Then stale while revalidating |
| ------------------------------- | ------- | ----------------------------- |
| `/api/title/[kind]/[id]`        | 6 hours | 1 day                         |
| `/api/search`                   | 1 hour  | 1 day                         |
| `/api/services`, `/api/regions` | 1 day   | 7 days                        |

The TMDB client sends the same fresh period as `next: { revalidate }`, so the Next.js data cache and the CDN use one window. Requests that carry the token also set `cache: "force-cache"`, which is what lets Next store a request with an `Authorization` header. Two requests for the same title at the same time share one upstream call. `fetchedAt` is the time that call received the data, and a later response served from cache keeps that time.

Spike scripts and sample TMDB responses can live in `docs/spikes/` as reference. Do not import them into the app. The personal Letterboxd export is gitignored.
