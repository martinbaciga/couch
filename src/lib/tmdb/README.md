Server-only TMDB client. `client.ts` starts with `import "server-only"` and is the only place that calls TMDB. The read token stays in `TMDB_READ_ACCESS_TOKEN` and never reaches the browser.

`posterUrl` is in `poster.ts` so the browser can build image URLs without importing the client.
