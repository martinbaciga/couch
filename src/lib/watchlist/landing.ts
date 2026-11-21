import type { CategoryCounts, CategoryKey } from "@/lib/storage/watchlist";

const MINUTE_MS = 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Rows on the returning card, in the order the ticket lists them.
 * The frames leave out "On other services here"; the ticket includes it,
 * so the card does too. "streaming-here" is not a row on this card.
 */
export const SUMMARY_ROWS = [
  "on-my-services-here",
  "free-or-ads-here",
  "other-services-here",
  "rent-or-buy-here-only",
  "other-countries-only",
  "no-data",
] as const satisfies readonly CategoryKey[];

export type Freshness = "just-now" | "relative" | "date";

/** Matched films. Unmatched rows stay out of the "N films" label. */
export function filmCount(entries: ReadonlyArray<{ match: unknown }>): number {
  return entries.reduce((count, entry) => (entry.match ? count + 1 : count), 0);
}

/**
 * Counts are stale when they were never stored, or when settings have
 * moved on since they were stored. Opening results writes a fresh stamp.
 */
export function countsAreStale(
  summary: { counts: CategoryCounts | null; settingsAt: string | null },
  settingsUpdatedAt: string | null,
): boolean {
  if (!summary.counts) return true;
  return summary.settingsAt !== settingsUpdatedAt;
}

/**
 * Under a minute, including a clock ahead of us, reads as just now.
 * Older than seven days is a date. Everything between is relative.
 */
export function freshness(iso: string, now: number): Freshness | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const delta = now - time;
  if (delta < MINUTE_MS) return "just-now";
  if (delta > WEEK_MS) return "date";
  return "relative";
}
