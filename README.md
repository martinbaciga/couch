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

Spike scripts and sample TMDB responses can live in `docs/spikes/` as reference. Do not import them into the app. The personal Letterboxd export is gitignored.
