"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  canLoadMore,
  initialSearchState,
  isSearchableQuery,
  MAX_SEARCH_PAGE,
  normaliseQuery,
  parseSearchError,
  parseSearchPayload,
  SEARCH_DEBOUNCE_MS,
  searchReducer,
  type LoadedSearch,
  type SearchAction,
  type SearchPayload,
  type SearchState,
} from "@/lib/search/query";

const CACHE_LIMIT = 20;
const cache = new Map<string, SearchPayload>();

type UseTitleSearchOptions = {
  /** Server-rendered first page. Omitted for the live field. */
  initial?: LoadedSearch | null;
  /** Debounce and refetch as the query changes. The results page leaves this off. */
  live?: boolean;
};

/**
 * The only browser code that fetches `/api/search`. Live mode debounces,
 * aborts the previous request, and keeps a short cache of recent queries.
 */
export function useTitleSearch(
  query: string,
  options: UseTitleSearchOptions = {},
) {
  const live = options.live ?? false;
  const normalised = normaliseQuery(query);
  const initial = live ? null : (options.initial ?? null);
  const [state, dispatch] = useReducer(searchReducer, undefined, () =>
    initialSearchState(normalised, initial),
  );
  const request = useRef(0);
  const signature = pageSignature(normalised, initial);
  const [tracked, setTracked] = useState(signature);
  if (!live && tracked !== signature) {
    setTracked(signature);
    dispatch(pageAction(normalised, initial));
  }

  useEffect(() => {
    if (!live) return;
    if (!isSearchableQuery(normalised)) {
      dispatch({ type: "clear" });
      return;
    }
    const cached = readCache(normalised);
    if (cached) {
      dispatch({ type: "loaded", query: normalised, payload: cached });
      return;
    }

    const controller = new AbortController();
    const id = request.current + 1;
    request.current = id;
    const timer = window.setTimeout(() => {
      dispatch({ type: "loading", query: normalised });
      void fetchSearch(normalised, 1, controller.signal).then((loaded) => {
        if (id !== request.current || !loaded) return;
        if (loaded.ok) writeCache(normalised, loaded.payload);
        dispatch(
          loaded.ok
            ? { type: "loaded", query: normalised, payload: loaded.payload }
            : { type: "failed", error: loaded.error },
        );
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      request.current += 1;
    };
  }, [live, normalised]);

  const loadMore = useCallback(() => {
    if (!canLoadMore(state)) return;
    const nextPage = state.page + 1;
    const current = state.query;
    dispatch({ type: "more" });
    void fetchSearch(current, nextPage, new AbortController().signal).then(
      (loaded) => {
        if (!loaded) return;
        dispatch(
          loaded.ok
            ? { type: "appended", payload: loaded.payload }
            : { type: "more-failed" },
        );
      },
    );
  }, [state]);

  const retry = useCallback(() => {
    if (!isSearchableQuery(normalised)) return;
    const controller = new AbortController();
    dispatch({ type: "loading", query: normalised });
    void fetchSearch(normalised, 1, controller.signal).then((loaded) => {
      if (!loaded) return;
      if (loaded.ok) writeCache(normalised, loaded.payload);
      dispatch(
        loaded.ok
          ? { type: "loaded", query: normalised, payload: loaded.payload }
          : { type: "failed", error: loaded.error },
      );
    });
  }, [normalised]);

  return {
    state,
    loadMore,
    retry,
    canLoadMore: canLoadMore(state) && state.page < MAX_SEARCH_PAGE,
  };
}

function pageSignature(query: string, initial: LoadedSearch | null): string {
  if (!isSearchableQuery(query) || !initial) return `pending:${query}`;
  if (!initial.ok) return `error:${query}:${initial.error}`;
  const first = initial.payload.results[0];
  return `ready:${query}:${initial.payload.totalResults}:${initial.payload.results.length}:${first?.kind ?? ""}:${first?.id ?? ""}`;
}

function pageAction(query: string, initial: LoadedSearch | null): SearchAction {
  if (!isSearchableQuery(query)) return { type: "clear" };
  if (!initial) return { type: "loading", query };
  if (!initial.ok) return { type: "failed", error: initial.error };
  return { type: "loaded", query, payload: initial.payload };
}

export async function fetchSearch(
  query: string,
  page: number,
  signal: AbortSignal,
): Promise<LoadedSearch | null> {
  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&page=${page}`,
      { signal },
    );
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        error: parseSearchError(body) ?? "upstream_unavailable",
      };
    }
    const payload = parseSearchPayload(body);
    if (!payload) return { ok: false, error: "upstream_unavailable" };
    return { ok: true, payload };
  } catch {
    if (signal.aborted) return null;
    return { ok: false, error: "upstream_unavailable" };
  }
}

function readCache(query: string): SearchPayload | undefined {
  const hit = cache.get(query);
  if (!hit) return undefined;
  cache.delete(query);
  cache.set(query, hit);
  return hit;
}

function writeCache(query: string, payload: SearchPayload): void {
  if (payload.page !== 1) return;
  cache.delete(query);
  cache.set(query, payload);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

export type { SearchState };
