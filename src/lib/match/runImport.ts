import type { Match } from "@/lib/match/match";
import { createLimiter } from "@/lib/search/limit";
import { parseTitleLookup, type TitleLookup } from "@/lib/search/status-line";

const BATCH_SIZE = 10;
const BATCH_CONCURRENCY = 3;
const TITLE_CONCURRENCY = 8;
const RATE_LIMIT_PAUSE_MS = 2_000;
const MAX_RETRIES = 3;

export type ImportSource = {
  name: string;
  year: number | null;
  uri?: string;
  date?: string;
};

export type ImportProgress = {
  matched: number;
  loaded: number;
  total: number;
};

export type ImportMatch = Match & {
  availability: TitleLookup | null;
};

export type ImportRow = {
  entry: {
    name: string;
    year: number | null;
    uri: string;
    date: string;
  };
  match: ImportMatch | null;
};

export type ImportHandlers = {
  signal?: AbortSignal;
  fetch?: typeof fetch;
  onProgress?: (progress: ImportProgress) => void;
  onPartial?: (row: ImportRow) => void;
  onBusy?: () => void;
};

export class ImportError extends Error {
  readonly code: "rate_limited" | "upstream_unavailable" | "bad_request";

  constructor(code: "rate_limited" | "upstream_unavailable" | "bad_request") {
    super(code);
    this.name = "ImportError";
    this.code = code;
  }
}

type IndexedEntry = {
  name: string;
  year: number | null;
  uri: string;
  date: string;
  index: number;
};

/**
 * Matches a watchlist, then loads availability.
 * Duplicate Letterboxd URIs are dropped before the requests. Two rows that
 * resolve to the same title share one availability load and one result.
 * A title that still fails to load is kept, with availability left empty.
 */
export async function runImport(
  sources: readonly ImportSource[],
  handlers: ImportHandlers = {},
): Promise<ImportRow[]> {
  const fetchImpl = handlers.fetch ?? globalThis.fetch.bind(globalThis);
  const signal = handlers.signal;
  const entries = dedupeByUri(sources);
  const progress: ImportProgress = {
    matched: 0,
    loaded: 0,
    total: entries.length,
  };
  const rows: Array<ImportRow | undefined> = new Array(entries.length);
  const seenTitles = new Set<string>();
  const limitBatches = createLimiter(BATCH_CONCURRENCY);
  const limitTitles = createLimiter(TITLE_CONCURRENCY);

  const report = () => {
    handlers.onProgress?.({ ...progress });
  };
  report();

  const batches: IndexedEntry[][] = [];
  for (let start = 0; start < entries.length; start += BATCH_SIZE) {
    batches.push(entries.slice(start, start + BATCH_SIZE));
  }

  await Promise.all(
    batches.map((batch) =>
      limitBatches(async () => {
        const matches = await postBatch(batch, fetchImpl, signal, () => {
          handlers.onBusy?.();
        });
        const loads: Array<Promise<void>> = [];
        batch.forEach((entry, index) => {
          const match = matches[index] ?? null;
          progress.matched += 1;
          if (!match) {
            settle(entry, null);
            return;
          }
          const key = `${match.kind}:${match.id}`;
          if (seenTitles.has(key)) {
            progress.loaded += 1;
            report();
            return;
          }
          seenTitles.add(key);
          report();
          loads.push(
            limitTitles(async () => {
              const availability = await loadAvailability(
                match,
                fetchImpl,
                signal,
                () => {
                  handlers.onBusy?.();
                },
              );
              settle(entry, { ...match, availability });
            }, signal),
          );
        });
        await Promise.all(loads);
      }, signal),
    ),
  );

  return rows.filter((row): row is ImportRow => row !== undefined);

  function settle(entry: IndexedEntry, match: ImportMatch | null) {
    const row: ImportRow = {
      entry: {
        name: entry.name,
        year: entry.year,
        uri: entry.uri,
        date: entry.date,
      },
      match,
    };
    rows[entry.index] = row;
    progress.loaded += 1;
    handlers.onPartial?.(row);
    report();
  }
}

async function postBatch(
  entries: readonly IndexedEntry[],
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
  onBusy: () => void,
): Promise<Array<Match | null>> {
  const body = JSON.stringify({
    entries: entries.map((entry) => ({ name: entry.name, year: entry.year })),
  });

  for (let attempt = 0; ; attempt += 1) {
    throwIfAborted(signal);
    let response: Response;
    try {
      response = await fetchImpl("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal,
      });
    } catch (error) {
      if (isAbort(error)) throw error;
      if (attempt >= MAX_RETRIES) throw new ImportError("upstream_unavailable");
      await wait(RATE_LIMIT_PAUSE_MS, signal);
      continue;
    }

    if (response.ok) {
      const matches = parseMatches(await response.json(), entries.length);
      if (!matches) throw new ImportError("upstream_unavailable");
      return matches;
    }

    const code = await readErrorCode(response);
    const retryable =
      code === "rate_limited" || code === "upstream_unavailable";
    if (!retryable || attempt >= MAX_RETRIES) {
      throw new ImportError(
        code === "bad_request" ||
          code === "rate_limited" ||
          code === "upstream_unavailable"
          ? code
          : "upstream_unavailable",
      );
    }
    if (code === "rate_limited") onBusy();
    await wait(RATE_LIMIT_PAUSE_MS, signal);
  }
}

async function loadAvailability(
  match: Match,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
  onBusy: () => void,
): Promise<TitleLookup | null> {
  for (let attempt = 0; ; attempt += 1) {
    throwIfAborted(signal);
    let response: Response;
    try {
      response = await fetchImpl(`/api/title/${match.kind}/${match.id}`, {
        signal,
      });
    } catch (error) {
      if (isAbort(error)) throw error;
      if (attempt >= MAX_RETRIES) return null;
      await wait(RATE_LIMIT_PAUSE_MS, signal);
      continue;
    }

    if (response.ok) return parseTitleLookup(await response.json());

    const code = await readErrorCode(response);
    const retryable =
      code === "rate_limited" || code === "upstream_unavailable";
    if (!retryable || attempt >= MAX_RETRIES) return null;
    if (code === "rate_limited") onBusy();
    await wait(RATE_LIMIT_PAUSE_MS, signal);
  }
}

function dedupeByUri(sources: readonly ImportSource[]): IndexedEntry[] {
  const seen = new Set<string>();
  const entries: IndexedEntry[] = [];
  for (const source of sources) {
    const name = source.name.trim();
    if (!name) continue;
    const uri = source.uri?.trim() ?? "";
    if (uri) {
      if (seen.has(uri)) continue;
      seen.add(uri);
    }
    entries.push({
      name,
      year: source.year,
      uri,
      date: source.date?.trim() ?? "",
      index: entries.length,
    });
  }
  return entries;
}

function parseMatches(
  value: unknown,
  count: number,
): Array<Match | null> | null {
  if (!isRecord(value) || !Array.isArray(value.matches)) return null;
  if (value.matches.length !== count) return null;
  const matches: Array<Match | null> = [];
  for (const item of value.matches) {
    if (item === null) {
      matches.push(null);
      continue;
    }
    const match = parseMatch(item);
    if (!match) return null;
    matches.push(match);
  }
  return matches;
}

function parseMatch(value: unknown): Match | null {
  if (!isRecord(value)) return null;
  if (value.kind !== "movie" && value.kind !== "tv") return null;
  if (!isId(value.id) || typeof value.title !== "string" || !value.title) {
    return null;
  }
  if (value.year !== null && !isYear(value.year)) return null;
  if (value.posterPath !== null && typeof value.posterPath !== "string") {
    return null;
  }
  if (
    value.confidence !== "exact" &&
    value.confidence !== "near" &&
    value.confidence !== "loose"
  ) {
    return null;
  }
  return {
    kind: value.kind,
    id: value.id,
    title: value.title,
    year: value.year,
    posterPath: value.posterPath,
    confidence: value.confidence,
  };
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (
      isRecord(body) &&
      isRecord(body.error) &&
      typeof body.error.code === "string"
    ) {
      return body.error.code;
    }
  } catch {
    return null;
  }
  return null;
}

function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw abortError();
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isYear(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
