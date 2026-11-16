import "server-only";

import {
  CATALOGUE_REVALIDATE_SECONDS,
  SEARCH_REVALIDATE_SECONDS,
  TITLE_REVALIDATE_SECONDS,
} from "@/config/cache";
import {
  MissingTokenError,
  RateLimitedError,
  UpstreamError,
} from "@/lib/tmdb/errors";
import type {
  CatalogueProvider,
  CountryOffers,
  MediaKind,
  Region,
  SearchHit,
  SearchPage,
  TitleDetails,
  WatchProvider,
  WatchProviders,
} from "@/lib/tmdb/types";

export { posterUrl } from "@/lib/tmdb/poster";
export {
  MissingTokenError,
  RateLimitedError,
  UpstreamError,
  toApiError,
} from "@/lib/tmdb/errors";

const TMDB_API = "https://api.themoviedb.org/3";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_IN_FLIGHT = 8;
const MAX_RETRIES = 3;
const BACKOFF_MS = [500, 1_000, 2_000] as const;
const MAX_RETRY_AFTER_MS = 30_000;
const OFFER_TYPES = ["flatrate", "rent", "buy", "ads", "free"] as const;

let inFlight = 0;
const waiters: Array<() => void> = [];

type CachedPayload = {
  payload: unknown;
  fetchedAt: string;
  freshUntil: number;
};

const freshPayloads = new Map<string, CachedPayload>();
const pendingPayloads = new Map<string, Promise<CachedPayload>>();

export function clearTmdbCache(): void {
  freshPayloads.clear();
  pendingPayloads.clear();
}

export async function searchMulti(
  query: string,
  page: number,
): Promise<SearchPage> {
  const { payload } = await tmdbGet(
    "/search/multi",
    { query, page: String(page) },
    SEARCH_REVALIDATE_SECONDS,
  );
  return parseSearchPage(payload, null);
}

export async function searchMovie(
  query: string,
  year?: number,
): Promise<SearchPage> {
  const { payload } = await tmdbGet(
    "/search/movie",
    {
      query,
      ...(year !== undefined ? { year: String(year) } : {}),
    },
    SEARCH_REVALIDATE_SECONDS,
  );
  return parseSearchPage(payload, "movie");
}

export async function searchTv(
  query: string,
  year?: number,
): Promise<SearchPage> {
  const { payload } = await tmdbGet(
    "/search/tv",
    {
      query,
      ...(year !== undefined ? { first_air_date_year: String(year) } : {}),
    },
    SEARCH_REVALIDATE_SECONDS,
  );
  return parseSearchPage(payload, "tv");
}

export async function getMovie(id: number): Promise<TitleDetails> {
  const { payload } = await tmdbGet(
    `/movie/${id}`,
    { append_to_response: "release_dates,external_ids,videos" },
    TITLE_REVALIDATE_SECONDS,
  );
  return parseTitle(payload, "movie");
}

export async function getTv(id: number): Promise<TitleDetails> {
  const { payload } = await tmdbGet(
    `/tv/${id}`,
    { append_to_response: "content_ratings,external_ids,videos" },
    TITLE_REVALIDATE_SECONDS,
  );
  return parseTitle(payload, "tv");
}

export async function getWatchProviders(
  kind: MediaKind,
  id: number,
): Promise<WatchProviders> {
  const { payload, fetchedAt } = await tmdbGet(
    `/${kind}/${id}/watch/providers`,
    {},
    TITLE_REVALIDATE_SECONDS,
  );
  return { ...parseWatchProviders(payload), fetchedAt };
}

export async function getRegions(): Promise<Region[]> {
  const { payload } = await tmdbGet(
    "/watch/providers/regions",
    {},
    CATALOGUE_REVALIDATE_SECONDS,
  );
  const record = expectRecord(payload);
  return asArray(record.results).flatMap(parseRegion);
}

export async function getProviderCatalogue(
  kind: MediaKind,
  region: string,
): Promise<CatalogueProvider[]> {
  const { payload } = await tmdbGet(
    `/watch/providers/${kind}`,
    { watch_region: region },
    CATALOGUE_REVALIDATE_SECONDS,
  );
  const record = expectRecord(payload);
  return asArray(record.results).flatMap(parseProvider);
}

async function tmdbGet(
  path: string,
  query: Record<string, string>,
  revalidate: number,
): Promise<CachedPayload> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new MissingTokenError();

  const url = new URL(`${TMDB_API}${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const key = url.toString();
  const hit = freshPayloads.get(key);
  if (hit && hit.freshUntil > Date.now()) return hit;

  const pending = pendingPayloads.get(key);
  if (pending) return pending;

  const promise = requestWithRetry(url, token, revalidate).then((payload) => {
    const entry = {
      payload,
      fetchedAt: new Date().toISOString(),
      freshUntil: Date.now() + revalidate * 1_000,
    };
    freshPayloads.set(key, entry);
    return entry;
  });
  pendingPayloads.set(key, promise);
  void promise.then(
    () => {
      pendingPayloads.delete(key);
    },
    () => {
      pendingPayloads.delete(key);
    },
  );
  return promise;
}

async function requestWithRetry(
  url: URL,
  token: string,
  revalidate: number,
): Promise<unknown> {
  await acquire();
  try {
    return await readWithRetry(url, token, revalidate);
  } finally {
    release();
  }
}

async function readWithRetry(
  url: URL,
  token: string,
  revalidate: number,
): Promise<unknown> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetchOnce(url, token, revalidate);
    if (response.status !== 429) return readSuccess(response);
    if (attempt === MAX_RETRIES) throw new RateLimitedError();
    await delay(retryDelay(response, attempt));
  }
  throw new RateLimitedError();
}

async function fetchOnce(
  url: URL,
  token: string,
  revalidate: number,
): Promise<Response> {
  try {
    return await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      cache: "force-cache",
      next: { revalidate },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeout(error)) throw new UpstreamError(0, { timeout: true });
    throw error;
  }
}

async function readSuccess(response: Response): Promise<unknown> {
  if (!response.ok) throw new UpstreamError(response.status);
  try {
    return await response.json();
  } catch {
    throw new UpstreamError(response.status);
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
    }
    const when = Date.parse(header);
    if (!Number.isNaN(when)) {
      return Math.min(Math.max(0, when - Date.now()), MAX_RETRY_AFTER_MS);
    }
  }
  return BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
}

function acquire(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function release(): void {
  inFlight -= 1;
  const next = waiters.shift();
  if (next) next();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function parseSearchPage(body: unknown, kind: MediaKind | null): SearchPage {
  const record = expectRecord(body);
  return {
    page: asNumber(record.page) ?? 1,
    totalPages: asNumber(record.total_pages) ?? 0,
    totalResults: asNumber(record.total_results) ?? 0,
    results: asArray(record.results).flatMap((item) =>
      parseSearchHit(item, kind),
    ),
  };
}

function parseSearchHit(
  value: unknown,
  forcedKind: MediaKind | null,
): SearchHit[] {
  if (!isRecord(value)) return [];
  const kind = forcedKind ?? mediaKind(value.media_type);
  if (!kind) return [];
  const id = asNumber(value.id);
  if (id === null) return [];
  const title = kind === "movie" ? asString(value.title) : asString(value.name);
  const originalTitle =
    kind === "movie"
      ? asString(value.original_title)
      : asString(value.original_name);
  const date =
    kind === "movie"
      ? asString(value.release_date)
      : asString(value.first_air_date);
  if (!title) return [];
  return [
    {
      id,
      kind,
      title,
      originalTitle: originalTitle ?? title,
      year: yearFromDate(date),
      posterPath: asString(value.poster_path),
    },
  ];
}

function parseTitle(body: unknown, kind: MediaKind): TitleDetails {
  const record = expectRecord(body);
  const id = asNumber(record.id);
  const title =
    kind === "movie" ? asString(record.title) : asString(record.name);
  if (id === null || !title) throw new UpstreamError(200);
  const originalTitle =
    kind === "movie"
      ? asString(record.original_title)
      : asString(record.original_name);
  const date =
    kind === "movie"
      ? asString(record.release_date)
      : asString(record.first_air_date);
  return {
    id,
    kind,
    title,
    originalTitle: originalTitle ?? title,
    year: yearFromDate(date),
    posterPath: asString(record.poster_path),
    overview: asString(record.overview) ?? "",
    genres: asArray(record.genres).flatMap(parseGenre),
    runtimeMinutes: kind === "movie" ? asNumber(record.runtime) : null,
    numberOfSeasons: kind === "tv" ? asNumber(record.number_of_seasons) : null,
    ageRatings:
      kind === "movie"
        ? ageRatingsFromReleaseDates(record.release_dates)
        : ageRatingsFromContentRatings(record.content_ratings),
    imdbId: imdbId(record.external_ids),
    trailerKey: trailerKey(record.videos),
  };
}

function parseWatchProviders(body: unknown): Omit<WatchProviders, "fetchedAt"> {
  const record = expectRecord(body);
  const id = asNumber(record.id);
  if (id === null) throw new UpstreamError(200);
  const results: Record<string, CountryOffers> = {};
  if (isRecord(record.results)) {
    for (const [code, value] of Object.entries(record.results)) {
      const offers = parseCountryOffers(value);
      if (offers) results[code] = offers;
    }
  }
  return { id, results };
}

function parseCountryOffers(value: unknown): CountryOffers | null {
  if (!isRecord(value)) return null;
  const link = asString(value.link);
  if (!link) return null;
  const offers: CountryOffers = { link };
  for (const type of OFFER_TYPES) {
    const providers = asArray(value[type]).flatMap(parseProvider);
    if (providers.length > 0) offers[type] = providers;
  }
  return offers;
}

function parseProvider(value: unknown): WatchProvider[] {
  if (!isRecord(value)) return [];
  const providerId = asNumber(value.provider_id);
  const providerName = asString(value.provider_name);
  if (providerId === null || !providerName) return [];
  return [
    {
      providerId,
      providerName,
      logoPath: asString(value.logo_path),
      displayPriority: asNumber(value.display_priority) ?? 0,
    },
  ];
}

function parseRegion(value: unknown): Region[] {
  if (!isRecord(value)) return [];
  const code = asString(value.iso_3166_1);
  const englishName = asString(value.english_name);
  const nativeName = asString(value.native_name);
  if (!code || !englishName || !nativeName) return [];
  return [{ code, englishName, nativeName }];
}

function parseGenre(value: unknown): { id: number; name: string }[] {
  if (!isRecord(value)) return [];
  const id = asNumber(value.id);
  const name = asString(value.name);
  if (id === null || !name) return [];
  return [{ id, name }];
}

function ageRatingsFromReleaseDates(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const ratings: Record<string, string> = {};
  for (const country of asArray(value.results)) {
    if (!isRecord(country)) continue;
    const code = asString(country.iso_3166_1);
    if (!code) continue;
    const certification = preferredCertification(
      asArray(country.release_dates),
    );
    if (certification) ratings[code] = certification;
  }
  return ratings;
}

function preferredCertification(releases: unknown[]): string | null {
  for (const release of releases) {
    if (!isRecord(release)) continue;
    const certification = asString(release.certification);
    if (certification) return certification;
  }
  return null;
}

function ageRatingsFromContentRatings(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const ratings: Record<string, string> = {};
  for (const country of asArray(value.results)) {
    if (!isRecord(country)) continue;
    const code = asString(country.iso_3166_1);
    const rating = asString(country.rating);
    if (code && rating) ratings[code] = rating;
  }
  return ratings;
}

function imdbId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return asString(value.imdb_id);
}

function trailerKey(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const official: Array<{ key: string; english: boolean }> = [];
  for (const video of asArray(value.results)) {
    if (!isRecord(video) || video.official !== true) continue;
    if (asString(video.site) !== "YouTube") continue;
    if (asString(video.type) !== "Trailer") continue;
    const key = asString(video.key);
    if (!key) continue;
    official.push({ key, english: asString(video.iso_639_1) === "en" });
  }
  return (official.find((video) => video.english) ?? official[0])?.key ?? null;
}

function yearFromDate(value: string | null): number | null {
  if (!value || value.length < 4) return null;
  const year = Number(value.slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

function mediaKind(value: unknown): MediaKind | null {
  return value === "movie" || value === "tv" ? value : null;
}

function expectRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new UpstreamError(200);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
