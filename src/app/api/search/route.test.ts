import { beforeEach, describe, expect, it, vi } from "vitest";

import { SEARCH_CACHE_CONTROL } from "@/config/cache";
import { UpstreamError } from "@/lib/tmdb/errors";
import { searchMulti } from "@/lib/tmdb/client";
import type { SearchHit } from "@/lib/tmdb/types";

import { GET } from "./route";

vi.mock("@/lib/tmdb/client", () => ({
  searchMulti: vi.fn(),
}));

const search = vi.mocked(searchMulti);

const fight: SearchHit = {
  id: 550,
  kind: "movie",
  title: "Fight Club",
  originalTitle: "Fight Club",
  year: 1999,
  posterPath: "/fight.jpg",
};

const series: SearchHit = {
  id: 1396,
  kind: "tv",
  title: "Breaking Bad",
  originalTitle: "Breaking Bad",
  year: 2008,
  posterPath: "/bb.jpg",
};

beforeEach(() => {
  search.mockReset();
  search.mockResolvedValue({
    page: 1,
    totalPages: 1,
    totalResults: 2,
    results: [fight, series],
  });
});

describe("GET /api/search", () => {
  it("maps films and series and keeps TMDB order", async () => {
    search.mockResolvedValue({
      page: 2,
      totalPages: 3,
      totalResults: 42,
      results: [
        fight,
        series,
        { ...fight, id: 1, title: "Untitled", year: null, posterPath: null },
        { ...series, id: 2, posterPath: null },
      ],
    });

    const response = await GET(request("fight", "2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(SEARCH_CACHE_CONTROL);
    expect(search).toHaveBeenCalledWith("fight", 2);
    expect(body).toEqual({
      page: 2,
      totalPages: 3,
      totalResults: 42,
      results: [
        {
          kind: "movie",
          id: 550,
          title: "Fight Club",
          year: 1999,
          posterPath: "/fight.jpg",
        },
        {
          kind: "tv",
          id: 1396,
          title: "Breaking Bad",
          year: 2008,
          posterPath: "/bb.jpg",
        },
        {
          kind: "movie",
          id: 1,
          title: "Untitled",
          year: null,
          posterPath: null,
        },
        {
          kind: "tv",
          id: 2,
          title: "Breaking Bad",
          year: 2008,
          posterPath: null,
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("originalTitle");
  });

  it("returns an empty list when nothing matches", async () => {
    search.mockResolvedValue({
      page: 1,
      totalPages: 0,
      totalResults: 0,
      results: [],
    });

    const response = await GET(request("zzzz", null));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      page: 1,
      totalPages: 0,
      totalResults: 0,
      results: [],
    });
    expect(search).toHaveBeenCalledWith("zzzz", 1);
  });

  it("trims the query and defaults the page to 1", async () => {
    const response = await GET(request("  fight  ", null));

    expect(response.status).toBe(200);
    expect(search).toHaveBeenCalledWith("fight", 1);
  });

  it.each([
    [null, "1"],
    ["", null],
    ["   ", null],
    ["a".repeat(101), null],
    ["fight", "0"],
    ["fight", "21"],
    ["fight", "1.5"],
    ["fight", "abc"],
  ])("rejects invalid input q=%s page=%s", async (query, page) => {
    const response = await GET(request(query, page));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "bad_request", message: "bad_request" },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it("maps an upstream failure", async () => {
    search.mockRejectedValue(new UpstreamError(503));

    const response = await GET(request("fight", null));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "upstream_unavailable",
        message: "upstream_unavailable",
      },
    });
    expect(response.headers.get("Cache-Control")).toBeNull();
  });
});

function request(query: string | null, page: string | null): Request {
  const url = new URL("http://localhost/api/search");
  if (query !== null) url.searchParams.set("q", query);
  if (page !== null) url.searchParams.set("page", page);
  return new Request(url);
}
