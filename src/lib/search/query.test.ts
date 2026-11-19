import { describe, expect, it } from "vitest";
import type { SearchHit } from "@/lib/tmdb/types";
import {
  canLoadMore,
  initialSearchState,
  isSearchableQuery,
  highlightAfterRemoval,
  indexAfterRemoval,
  nextActive,
  normaliseQuery,
  parseSearchError,
  parseSearchPayload,
  publicResult,
  searchReducer,
  searchUrl,
  titleMatch,
  titleUrl,
  type SearchPayload,
} from "./query";

const hit: SearchHit = {
  kind: "movie",
  id: 550,
  title: "Fight Club",
  originalTitle: "Fight Club",
  year: 1999,
  posterPath: "/fight.jpg",
};

const page: SearchPayload = {
  page: 1,
  totalPages: 3,
  totalResults: 20,
  results: [publicResult(hit)],
};

describe("normaliseQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normaliseQuery("  fight   club  ")).toBe("fight club");
  });
});

describe("isSearchableQuery", () => {
  it("rejects an empty query and one past 100 characters", () => {
    expect(isSearchableQuery("  ")).toBe(false);
    expect(isSearchableQuery("a")).toBe(true);
    expect(isSearchableQuery("a".repeat(101))).toBe(false);
  });
});

describe("search urls", () => {
  it("builds the results page and a title page", () => {
    expect(searchUrl(" fight club ")).toBe("/search?q=fight%20club");
    expect(titleUrl("tv", 1396)).toBe("/title/tv/1396");
  });
});

describe("publicResult", () => {
  it("drops the original title", () => {
    expect(publicResult(hit)).toEqual({
      kind: "movie",
      id: 550,
      title: "Fight Club",
      year: 1999,
      posterPath: "/fight.jpg",
    });
  });
});

describe("titleMatch", () => {
  it("marks the typed text without changing its case", () => {
    expect(titleMatch("Fight Club", "fight")).toEqual({
      before: "",
      match: "Fight",
      after: " Club",
    });
  });

  it("marks nothing when the title does not contain the query", () => {
    expect(titleMatch("Fight Club", "club fight")).toBeNull();
  });
});

describe("nextActive", () => {
  it("stops at the ends and clears the highlight above the first row", () => {
    expect(nextActive(-1, 3, "up")).toBe(-1);
    expect(nextActive(0, 3, "up")).toBe(-1);
    expect(nextActive(0, 3, "down")).toBe(1);
    expect(nextActive(2, 3, "down")).toBe(2);
    expect(nextActive(1, 3, "home")).toBe(0);
    expect(nextActive(1, 3, "end")).toBe(2);
    expect(nextActive(0, 0, "down")).toBe(-1);
  });
});

describe("indexAfterRemoval", () => {
  it("moves to the next slot, or back when the last row goes", () => {
    expect(indexAfterRemoval(0, 3)).toBe(0);
    expect(indexAfterRemoval(1, 3)).toBe(1);
    expect(indexAfterRemoval(2, 3)).toBe(1);
    expect(indexAfterRemoval(0, 1)).toBe(-1);
  });
});

describe("highlightAfterRemoval", () => {
  it("keeps the highlight only when the active title was removed", () => {
    const before = "recent:movie-1,tv-2,movie-3";
    expect(highlightAfterRemoval(before, "recent:tv-2,movie-3", 0)).toBe(0);
    expect(highlightAfterRemoval(before, "recent:movie-1,tv-2", 2)).toBe(1);
    expect(highlightAfterRemoval(before, "recent:movie-1,movie-3", 0)).toBe(-1);
    expect(highlightAfterRemoval(before, "results:movie-9", 0)).toBe(-1);
    expect(highlightAfterRemoval(before, "recent:", 0)).toBe(-1);
    expect(highlightAfterRemoval(before, "recent:tv-2,movie-3", -1)).toBe(-1);
  });
});

describe("searchReducer", () => {
  it("starts from a server page, then appends without duplicating a row", () => {
    const start = initialSearchState("fight", { ok: true, payload: page });
    expect(start.status).toBe("results");
    expect(start.results).toHaveLength(1);

    const first = page.results[0];
    if (!first) throw new Error("missing row");
    const appended = searchReducer(start, {
      type: "appended",
      payload: {
        ...page,
        page: 2,
        results: [first, { ...first, id: 13, title: "Forrest Gump" }],
      },
    });
    expect(appended.results.map((result) => result.id)).toEqual([550, 13]);
    expect(appended.page).toBe(2);
  });

  it("keeps the loaded rows when another page fails", () => {
    const start = initialSearchState("fight", { ok: true, payload: page });
    const loading = searchReducer(start, { type: "more" });
    const failed = searchReducer(loading, { type: "more-failed" });
    expect(failed.results).toHaveLength(1);
    expect(failed.moreError).toBe(true);
    expect(failed.loadingMore).toBe(false);
  });

  it("treats a page with no rows as empty", () => {
    const empty = initialSearchState("zzzz", {
      ok: true,
      payload: { ...page, totalResults: 0, results: [] },
    });
    expect(empty.status).toBe("empty");
  });

  it("records a failed first page", () => {
    const failed = initialSearchState("fight", {
      ok: false,
      error: "rate_limited",
    });
    expect(failed.status).toBe("error");
    expect(failed.error).toBe("rate_limited");
  });
});

describe("canLoadMore", () => {
  it("stops on the last page and at page 20", () => {
    const state = initialSearchState("fight", { ok: true, payload: page });
    expect(canLoadMore(state)).toBe(true);
    expect(canLoadMore({ ...state, page: 3, totalPages: 3 })).toBe(false);
    expect(canLoadMore({ ...state, page: 20, totalPages: 40 })).toBe(false);
    expect(canLoadMore({ ...state, loadingMore: true })).toBe(false);
  });
});

describe("parseSearchPayload", () => {
  it("reads a payload and rejects a row with the wrong shape", () => {
    expect(parseSearchPayload(page)).toEqual(page);
    expect(parseSearchPayload({ ...page, results: [{ id: 1 }] })).toBeNull();
  });
});

describe("parseSearchError", () => {
  it("reads a known code", () => {
    expect(parseSearchError({ error: { code: "bad_request" } })).toBe(
      "bad_request",
    );
    expect(parseSearchError({ error: { code: "nope" } })).toBeNull();
  });
});
