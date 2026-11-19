import "server-only";

import { connection } from "next/server";
import { cache } from "react";
import { searchMulti } from "@/lib/tmdb/client";
import { toApiError } from "@/lib/tmdb/errors";
import {
  isSearchableQuery,
  MAX_SEARCH_PAGE,
  normaliseQuery,
  publicResult,
  type LoadedSearch,
} from "@/lib/search/query";

async function searchTitles(
  query: string,
  page: number,
): Promise<LoadedSearch> {
  await connection();
  const normalised = normaliseQuery(query);
  if (!isSearchableQuery(normalised) || page < 1 || page > MAX_SEARCH_PAGE) {
    return { ok: false, error: "bad_request" };
  }

  try {
    const result = await searchMulti(normalised, page);
    return {
      ok: true,
      payload: {
        page: result.page,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        results: result.results.map(publicResult),
      },
    };
  } catch (error) {
    const code = toApiError(error)?.body.error.code;
    if (code === "rate_limited") return { ok: false, error: "rate_limited" };
    return { ok: false, error: "upstream_unavailable" };
  }
}

/** One search per request, shared by the page and its metadata. */
export const loadSearch = cache(searchTitles);
