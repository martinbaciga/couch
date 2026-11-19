import type { SearchHit } from "@/lib/tmdb/types";

export const SEARCH_DEBOUNCE_MS = 250;
export const MAX_SEARCH_PAGE = 20;
const MAX_QUERY_LENGTH = 100;

export type SearchResult = {
  kind: "movie" | "tv";
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
};

export type SearchPayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  results: SearchResult[];
};

export type SearchErrorCode =
  "bad_request" | "rate_limited" | "upstream_unavailable";

export type LoadedSearch =
  { ok: true; payload: SearchPayload } | { ok: false; error: SearchErrorCode };

export type SearchState = {
  status: "idle" | "loading" | "results" | "empty" | "error";
  query: string;
  page: number;
  totalPages: number;
  totalResults: number;
  results: SearchResult[];
  error: SearchErrorCode | null;
  loadingMore: boolean;
  moreError: boolean;
};

export type SearchAction =
  | { type: "clear" }
  | { type: "loading"; query: string }
  | { type: "loaded"; query: string; payload: SearchPayload }
  | { type: "failed"; error: SearchErrorCode }
  | { type: "more" }
  | { type: "appended"; payload: SearchPayload }
  | { type: "more-failed" };

export type TitleMatch = {
  before: string;
  match: string;
  after: string;
};

/** Trim and collapse whitespace. The search field and the URL share this. */
export function normaliseQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isSearchableQuery(value: string): boolean {
  const query = normaliseQuery(value);
  return query.length >= 1 && query.length <= MAX_QUERY_LENGTH;
}

export function searchUrl(query: string): string {
  return `/search?q=${encodeURIComponent(normaliseQuery(query))}`;
}

export function titleUrl(kind: "movie" | "tv", id: number): string {
  return `/title/${kind}/${id}`;
}

/** The fields the browser is allowed to see. Original titles stay on the server. */
export function publicResult(hit: SearchHit): SearchResult {
  return {
    kind: hit.kind,
    id: hit.id,
    title: hit.title,
    year: hit.year,
    posterPath: hit.posterPath,
  };
}

/**
 * Bold the typed query inside a title. A title matched on its original
 * name may not contain the query, and then nothing is marked.
 */
export function titleMatch(title: string, query: string): TitleMatch | null {
  const needle = normaliseQuery(query);
  if (!needle) return null;
  const index = title.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (index < 0) return null;
  return {
    before: title.slice(0, index),
    match: title.slice(index, index + needle.length),
    after: title.slice(index + needle.length),
  };
}

/** Arrow keys stop at the ends. Up from the first row clears the highlight. */
export function nextActive(
  current: number,
  count: number,
  move: "up" | "down" | "home" | "end",
): number {
  if (count <= 0) return -1;
  if (move === "home") return 0;
  if (move === "end") return count - 1;
  if (move === "down") return Math.min(count - 1, current + 1);
  return Math.max(-1, current - 1);
}

/** Stay on the item that slides into this slot, or step back from the last one. */
export function indexAfterRemoval(index: number, count: number): number {
  if (count <= 1) return -1;
  const nextCount = count - 1;
  return index >= nextCount ? nextCount - 1 : index;
}

/**
 * Keep the highlight only when the active id was the one removed.
 * Any other list change, including a new search, clears it.
 * Signatures are `mode:kind-id,kind-id`.
 */
export function highlightAfterRemoval(
  previous: string,
  next: string,
  active: number,
): number {
  if (active < 0) return -1;
  const before = splitSignature(previous);
  const after = splitSignature(next);
  if (!before || !after || before.mode !== after.mode) return -1;
  if (after.ids.length !== before.ids.length - 1) return -1;
  const kept = before.ids.filter((_, index) => index !== active);
  if (kept.join(",") !== after.ids.join(",")) return -1;
  return indexAfterRemoval(active, before.ids.length);
}

function splitSignature(
  signature: string,
): { mode: string; ids: string[] } | null {
  const splitAt = signature.indexOf(":");
  if (splitAt < 0) return null;
  const body = signature.slice(splitAt + 1);
  return {
    mode: signature.slice(0, splitAt),
    ids: body.length === 0 ? [] : body.split(","),
  };
}

export function initialSearchState(
  query: string,
  loaded: LoadedSearch | null,
): SearchState {
  if (!query) return blank("");
  if (!loaded) return { ...blank(query), status: "idle" };
  if (!loaded.ok) {
    return { ...blank(query), status: "error", error: loaded.error };
  }
  return fromPayload(query, loaded.payload, false);
}

export function searchReducer(
  state: SearchState,
  action: SearchAction,
): SearchState {
  switch (action.type) {
    case "clear":
      return blank("");
    case "loading":
      return { ...blank(action.query), status: "loading" };
    case "loaded":
      return fromPayload(action.query, action.payload, false);
    case "failed":
      return { ...blank(state.query), status: "error", error: action.error };
    case "more":
      return { ...state, loadingMore: true, moreError: false };
    case "appended":
      return fromPayload(state.query, action.payload, true, state.results);
    case "more-failed":
      return { ...state, loadingMore: false, moreError: true };
    default:
      return state;
  }
}

export function canLoadMore(state: SearchState): boolean {
  return (
    state.status === "results" &&
    !state.loadingMore &&
    state.page < state.totalPages &&
    state.page < MAX_SEARCH_PAGE
  );
}

export function parseSearchPayload(value: unknown): SearchPayload | null {
  if (!isRecord(value)) return null;
  if (!isPageNumber(value.page) || !isPageNumber(value.totalPages)) return null;
  if (typeof value.totalResults !== "number" || value.totalResults < 0) {
    return null;
  }
  if (!Array.isArray(value.results)) return null;
  const results: SearchResult[] = [];
  for (const item of value.results) {
    const result = parseResult(item);
    if (!result) return null;
    results.push(result);
  }
  return {
    page: value.page,
    totalPages: value.totalPages,
    totalResults: value.totalResults,
    results,
  };
}

export function parseSearchError(value: unknown): SearchErrorCode | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  const code = value.error.code;
  if (
    code === "bad_request" ||
    code === "rate_limited" ||
    code === "upstream_unavailable"
  ) {
    return code;
  }
  return null;
}

function fromPayload(
  query: string,
  payload: SearchPayload,
  append: boolean,
  previous: SearchResult[] = [],
): SearchState {
  const results = append
    ? mergeResults(previous, payload.results)
    : payload.results;
  return {
    status: results.length === 0 ? "empty" : "results",
    query,
    page: payload.page,
    totalPages: payload.totalPages,
    totalResults: payload.totalResults,
    results,
    error: null,
    loadingMore: false,
    moreError: false,
  };
}

function mergeResults(
  current: SearchResult[],
  next: SearchResult[],
): SearchResult[] {
  const seen = new Set(current.map(resultKey));
  const extra = next.filter((item) => !seen.has(resultKey(item)));
  return [...current, ...extra];
}

function resultKey(result: SearchResult): string {
  return `${result.kind}:${result.id}`;
}

function blank(query: string): SearchState {
  return {
    status: query ? "idle" : "empty",
    query,
    page: 0,
    totalPages: 0,
    totalResults: 0,
    results: [],
    error: null,
    loadingMore: false,
    moreError: false,
  };
}

function parseResult(value: unknown): SearchResult | null {
  if (!isRecord(value)) return null;
  if (value.kind !== "movie" && value.kind !== "tv") return null;
  if (!isId(value.id) || typeof value.title !== "string") return null;
  if (value.year !== null && !isYear(value.year)) return null;
  if (value.posterPath !== null && typeof value.posterPath !== "string") {
    return null;
  }
  return {
    kind: value.kind,
    id: value.id,
    title: value.title,
    year: value.year,
    posterPath: value.posterPath,
  };
}

function isPageNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isYear(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
