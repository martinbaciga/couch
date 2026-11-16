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
      summary && typeof summary.computedAt === "string"
        ? summary.computedAt
        : null;
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
