Server-only TMDB client. Every module here starts with `import "server-only"`. This is the only place that calls TMDB. The read token stays in `TMDB_READ_ACCESS_TOKEN` and never reaches the browser.
