const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export const TITLE_REVALIDATE_SECONDS = 6 * HOUR;
export const SEARCH_REVALIDATE_SECONDS = HOUR;
export const CATALOGUE_REVALIDATE_SECONDS = DAY;

const TITLE_STALE_SECONDS = DAY;
const SEARCH_STALE_SECONDS = DAY;
const CATALOGUE_STALE_SECONDS = 7 * DAY;

export const TITLE_CACHE_CONTROL = cacheControl(
  TITLE_REVALIDATE_SECONDS,
  TITLE_STALE_SECONDS,
);

export const SEARCH_CACHE_CONTROL = cacheControl(
  SEARCH_REVALIDATE_SECONDS,
  SEARCH_STALE_SECONDS,
);

export const CATALOGUE_CACHE_CONTROL = cacheControl(
  CATALOGUE_REVALIDATE_SECONDS,
  CATALOGUE_STALE_SECONDS,
);

function cacheControl(freshSeconds: number, staleSeconds: number): string {
  return `public, s-maxage=${freshSeconds}, stale-while-revalidate=${staleSeconds}`;
}
