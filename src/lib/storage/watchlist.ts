export const WATCHLIST_KEY = "couch:watchlist:v1";

export type WatchlistSummary = {
  count: number;
  importedAt: string;
  checkedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Enough of the saved watchlist for the settings row.
 * A version mismatch or a bad shape reads as "nothing saved".
 */
export function parseWatchlistSummary(raw: string): WatchlistSummary | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if ("version" in value && value.version !== 1) return null;
    if (typeof value.importedAt !== "string") return null;
    if (!Array.isArray(value.entries)) return null;
    const summary = isRecord(value.summary) ? value.summary : null;
    const checkedAt =
      stamp(summary, "checkedAt") ?? stamp(summary, "computedAt");
    return {
      count: value.entries.length,
      importedAt: value.importedAt,
      checkedAt,
    };
  } catch {
    return null;
  }
}

export function readWatchlistSummary(
  storage: Pick<Storage, "getItem">,
): WatchlistSummary | null {
  try {
    const raw = storage.getItem(WATCHLIST_KEY);
    if (raw === null) return null;
    return parseWatchlistSummary(raw);
  } catch {
    return null;
  }
}

/** One count per watchlist category. "All" is the number of matched films. */
export const CATEGORY_KEYS = [
  "on-my-services-here",
  "streaming-here",
  "free-or-ads-here",
  "other-services-here",
  "rent-or-buy-here-only",
  "other-countries-only",
  "no-data",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type CategoryCounts = Record<CategoryKey, number>;

export type WatchlistSource = {
  name: string;
  year: number | null;
  uri: string;
  date: string;
};

export type WatchlistMatch = {
  kind: "movie" | "tv";
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
};

export type SavedEntry = {
  entry: WatchlistSource;
  match: WatchlistMatch | null;
};

export type SummaryStamp = {
  /** Settings `updatedAt` the counts were computed with. Null when none were set. */
  settingsAt: string | null;
  /** Oldest availability `fetchedAt` among the titles. Null until results have loaded. */
  checkedAt: string | null;
};

export type SavedWatchlist = {
  importedAt: string;
  entries: SavedEntry[];
  summary: {
    computedAt: string | null;
    counts: CategoryCounts | null;
  } & SummaryStamp;
};

export function emptyCounts(): CategoryCounts {
  return {
    "on-my-services-here": 0,
    "streaming-here": 0,
    "free-or-ads-here": 0,
    "other-services-here": 0,
    "rent-or-buy-here-only": 0,
    "other-countries-only": 0,
    "no-data": 0,
  };
}

/**
 * The saved list, including matches. Availability is not stored.
 * A version mismatch or a bad shape reads as "nothing saved".
 */
export function parseSavedWatchlist(raw: string): SavedWatchlist | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if ("version" in value && value.version !== 1) return null;
    if (typeof value.importedAt !== "string") return null;
    if (!Array.isArray(value.entries)) return null;
    const summary = isRecord(value.summary) ? value.summary : null;
    return {
      importedAt: value.importedAt,
      entries: value.entries.flatMap(parseEntry),
      summary: {
        computedAt: stamp(summary, "computedAt"),
        counts: summary ? parseCounts(summary.counts) : null,
        settingsAt: stamp(summary, "settingsAt"),
        checkedAt: stamp(summary, "checkedAt"),
      },
    };
  } catch {
    return null;
  }
}

export function readSavedWatchlist(
  storage: Pick<Storage, "getItem">,
): SavedWatchlist | null {
  try {
    const raw = storage.getItem(WATCHLIST_KEY);
    if (raw === null) return null;
    return parseSavedWatchlist(raw);
  } catch {
    return null;
  }
}

/**
 * Writes the landing counts back onto the saved list.
 * Entries stay as they are. Availability is still not stored.
 */
export function writeWatchlistSummary(
  storage: Pick<Storage, "getItem" | "setItem">,
  counts: CategoryCounts,
  computedAt: string,
  written?: SummaryStamp,
): boolean {
  try {
    const raw = storage.getItem(WATCHLIST_KEY);
    if (raw === null) return false;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !Array.isArray(value.entries)) return false;
    if ("version" in value && value.version !== 1) return false;
    const summary = isRecord(value.summary) ? { ...value.summary } : {};
    summary.counts = counts;
    summary.computedAt = computedAt;
    if (written) {
      summary.settingsAt = written.settingsAt;
      summary.checkedAt = written.checkedAt;
    }
    value.summary = summary;
    storage.setItem(WATCHLIST_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function parseEntry(value: unknown): SavedEntry[] {
  if (!isRecord(value) || !isRecord(value.entry)) return [];
  if (typeof value.entry.name !== "string" || value.entry.name.length === 0) {
    return [];
  }
  return [
    {
      entry: {
        name: value.entry.name,
        year: parseYear(value.entry.year),
        uri: typeof value.entry.uri === "string" ? value.entry.uri : "",
        date: typeof value.entry.date === "string" ? value.entry.date : "",
      },
      match: parseMatch(value.match),
    },
  ];
}

function parseMatch(value: unknown): WatchlistMatch | null {
  if (!isRecord(value)) return null;
  const kind = value.kind === "tv" || value.type === "tv" ? "tv" : null;
  const movie =
    value.kind === "movie" || value.type === "movie" ? "movie" : null;
  const resolved = kind ?? movie;
  if (!resolved || !isId(value.tmdbId) || typeof value.title !== "string") {
    return null;
  }
  if (value.posterPath !== null && typeof value.posterPath !== "string") {
    return null;
  }
  return {
    kind: resolved,
    tmdbId: value.tmdbId,
    title: value.title,
    year: parseYear(value.year),
    posterPath: value.posterPath ?? null,
  };
}

function parseCounts(value: unknown): CategoryCounts | null {
  if (!isRecord(value)) return null;
  const counts = emptyCounts();
  for (const key of CATEGORY_KEYS) {
    const count = value[key];
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
      return null;
    }
    counts[key] = count;
  }
  return counts;
}

function stamp(
  summary: Record<string, unknown> | null,
  key: "computedAt" | "settingsAt" | "checkedAt",
): string | null {
  if (!summary) return null;
  const value = summary[key];
  return typeof value === "string" ? value : null;
}

function parseYear(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
