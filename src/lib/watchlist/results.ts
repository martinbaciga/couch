import {
  getHomeDetails,
  getOtherCountries,
  getWatchlistCategory,
  type Settings,
  type WatchlistCategory,
} from "@/lib/availability/status";
import type { TitleAvailability } from "@/lib/availability/types";
import {
  searchStatusLine,
  type StatusLine,
  type TitleLookup,
} from "@/lib/search/status-line";
import {
  emptyCounts,
  type CategoryCounts,
  type CategoryKey,
} from "@/lib/storage/watchlist";

export const PAGE_SIZE = 25;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Clock read for staleness. Kept out of the component so render stays pure. */
export function currentTime(): number {
  return Date.now();
}

export const FILTERS = [
  "all",
  "on-my-services-here",
  "free-or-ads-here",
  "other-services-here",
  "rent-or-buy-here-only",
  "other-countries-only",
  "no-data",
] as const;

export type WatchlistFilter = (typeof FILTERS)[number];

export type SortKey = "added" | "title" | "year";

export const SORTS = ["added", "title", "year"] as const;

type Ranked = {
  title: string;
  year: number | null;
  added: string;
};

export type RowRead =
  | { kind: "loading" }
  | { kind: "blank" }
  | { kind: "available"; count: number }
  | { kind: "free"; serviceIds: number[] }
  | { kind: "known"; line: StatusLine };

export type Classified = {
  read: RowRead;
  filter: WatchlistFilter | null;
  category: CategoryKey | null;
};

/** On your services once a country and at least one service are saved. */
export function defaultFilter(
  settings: { country: string | null; serviceIds: number[] } | null,
): WatchlistFilter {
  if (settings?.country && settings.serviceIds.length > 0) {
    return "on-my-services-here";
  }
  return "all";
}

/** Older than a week, counting from the last check, or the import if never checked. */
export function isStale(iso: string | null, now: number): boolean {
  if (iso === null) return true;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return true;
  return now - time > WEEK_MS;
}

export function checkedStamp(
  computedAt: string | null,
  importedAt: string,
): string | null {
  return computedAt ?? importedAt;
}

/**
 * The chip a film belongs to. With no country, every film stays on All.
 * Streaming here (no services chosen) is not its own chip, so it stays on All.
 */
export function displayFilter(
  category: WatchlistCategory,
  country: string | null,
): WatchlistFilter {
  if (!country) return "all";
  if (category.category === "streaming-here") return "all";
  if (category.category === "on-my-services-here") {
    return "on-my-services-here";
  }
  return category.category;
}

export function categoryKey(category: WatchlistCategory): CategoryKey {
  return category.category;
}

export function displayCounts(
  filters: ReadonlyArray<WatchlistFilter | null>,
): Record<WatchlistFilter, number> {
  const counts: Record<WatchlistFilter, number> = {
    all: filters.length,
    "on-my-services-here": 0,
    "free-or-ads-here": 0,
    "other-services-here": 0,
    "rent-or-buy-here-only": 0,
    "other-countries-only": 0,
    "no-data": 0,
  };
  for (const filter of filters) {
    if (filter && filter !== "all") counts[filter] += 1;
  }
  return counts;
}

/** Null entries are still loading and are left out of the stored counts. */
export function categoryCounts(
  categories: ReadonlyArray<CategoryKey | null>,
): CategoryCounts {
  const counts = emptyCounts();
  for (const category of categories) {
    if (category) counts[category] += 1;
  }
  return counts;
}

export function countsEqual(
  saved: CategoryCounts | null,
  next: CategoryCounts,
): boolean {
  if (!saved) return false;
  return (Object.keys(next) as CategoryKey[]).every(
    (key) => saved[key] === next[key],
  );
}

export function sortFilms<T extends Ranked>(
  films: readonly T[],
  sort: SortKey,
): T[] {
  return [...films].sort((a, b) => compareFilms(sort, a, b));
}

export function visibleFilms<T>(films: readonly T[], shown: number): T[] {
  return films.slice(0, shown);
}

export function hasMore(total: number, shown: number): boolean {
  return shown < total;
}

export function classify(
  lookup: TitleLookup | "miss" | undefined,
  settings: Settings,
): Classified {
  if (lookup === undefined) {
    return { read: { kind: "loading" }, filter: null, category: null };
  }
  if (lookup === "miss") {
    return { read: { kind: "blank" }, filter: "all", category: null };
  }

  const category = getWatchlistCategory(lookup.availability, settings);
  const filter = displayFilter(category, settings.country);
  return {
    read: readAvailability(lookup, settings, category),
    filter,
    category: categoryKey(category),
  };
}

function readAvailability(
  lookup: TitleLookup,
  settings: Settings,
  category: WatchlistCategory,
): RowRead {
  if (settings.country === null) {
    const count = getOtherCountries(
      lookup.availability,
      settings,
    ).totalCountries;
    if (count === 0) return { kind: "known", line: { kind: "no-data" } };
    return { kind: "available", count };
  }

  if (category.category === "free-or-ads-here") {
    const serviceIds = freeServiceIds(lookup.availability, settings);
    if (serviceIds.length > 0) return { kind: "free", serviceIds };
  }

  return {
    kind: "known",
    line: searchStatusLine(lookup.availability, settings),
  };
}

function freeServiceIds(
  availability: TitleAvailability,
  settings: Settings,
): number[] {
  const ids: number[] = [];
  for (const offer of getHomeDetails(availability, settings).freeOrAds) {
    if (!ids.includes(offer.serviceId)) ids.push(offer.serviceId);
  }
  return ids;
}

function compareFilms(sort: SortKey, a: Ranked, b: Ranked): number {
  if (sort === "title") {
    return (
      a.title.localeCompare(b.title, "en", { sensitivity: "base" }) ||
      newestFirst(a.added, b.added)
    );
  }
  if (sort === "year") {
    return (
      (b.year ?? Number.NEGATIVE_INFINITY) -
        (a.year ?? Number.NEGATIVE_INFINITY) ||
      a.title.localeCompare(b.title, "en", { sensitivity: "base" })
    );
  }
  return (
    newestFirst(a.added, b.added) ||
    a.title.localeCompare(b.title, "en", { sensitivity: "base" })
  );
}

/** Empty dates are the oldest. */
function newestFirst(a: string, b: string): number {
  if (a === b) return 0;
  if (a === "") return 1;
  if (b === "") return -1;
  return a < b ? 1 : -1;
}
