import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpstreamError, RateLimitedError } from "@/lib/tmdb/errors";
import { searchMovie, searchTv } from "@/lib/tmdb/client";
import type { SearchHit, SearchPage } from "@/lib/tmdb/types";

import { POST } from "./route";

vi.mock("@/lib/tmdb/client", () => ({
  searchMovie: vi.fn(),
  searchTv: vi.fn(),
}));

const movies = vi.mocked(searchMovie);
const shows = vi.mocked(searchTv);

beforeEach(() => {
  movies.mockReset();
  shows.mockReset();
  movies.mockResolvedValue(page([]));
  shows.mockResolvedValue(page([]));
});

describe("POST /api/match", () => {
  it("keeps order and stops once a film year matches", async () => {
    movies.mockImplementation(async (query, year) => {
      if (query === "Amélie" && year === 2001) {
        return page([
          hit({ id: 194, title: "Amelie", year: 2001, posterPath: "/a.jpg" }),
        ]);
      }
      if (query === "Heat" && year === 1995) {
        return page([hit({ id: 949, title: "Heat", year: 1995 })]);
      }
      return page([]);
    });

    const response = await POST(
      jsonRequest({
        entries: [
          { name: " Amélie ", year: 2001 },
          { name: "Heat", year: 1995 },
        ],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      matches: [
        {
          kind: "movie",
          id: 194,
          title: "Amelie",
          year: 2001,
          posterPath: "/a.jpg",
          confidence: "exact",
        },
        {
          kind: "movie",
          id: 949,
          title: "Heat",
          year: 1995,
          posterPath: null,
          confidence: "exact",
        },
      ],
    });
    expect(movies).toHaveBeenCalledTimes(2);
    expect(movies).toHaveBeenNthCalledWith(1, "Amélie", 2001);
    expect(movies).toHaveBeenNthCalledWith(2, "Heat", 1995);
    expect(shows).not.toHaveBeenCalled();
  });

  it("searches the neighbouring years and marks the match near", async () => {
    movies.mockImplementation(async (query, year) => {
      if (query === "Dune" && year === 2020) {
        return page([hit({ id: 2, title: "Dune", year: 2020 })]);
      }
      return page([]);
    });

    const response = await POST(
      jsonRequest({ entries: [{ name: "Dune", year: 2021 }] }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      matches: [
        {
          kind: "movie",
          id: 2,
          title: "Dune",
          year: 2020,
          posterPath: null,
          confidence: "near",
        },
      ],
    });
    expect(movies).toHaveBeenCalledWith("Dune", 2021);
    expect(movies).toHaveBeenCalledWith("Dune", 2020);
    expect(movies).toHaveBeenCalledWith("Dune", 2022);
    expect(movies).not.toHaveBeenCalledWith("Dune");
    expect(shows).not.toHaveBeenCalled();
  });

  it("searches films without a year when the row has none", async () => {
    movies.mockImplementation(async (query, year) => {
      if (query === "Heat" && year === undefined) {
        return page([hit({ id: 949, title: "Heat", year: 1995 })]);
      }
      return page([]);
    });

    const response = await POST(
      jsonRequest({ entries: [{ name: "Heat", year: null }] }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      matches: [{ id: 949, confidence: "loose" }],
    });
    expect(movies).toHaveBeenCalledTimes(1);
    expect(movies).toHaveBeenCalledWith("Heat");
    expect(shows).not.toHaveBeenCalled();
  });

  it("uses the original title", async () => {
    movies.mockResolvedValue(
      page([
        hit({
          id: 1,
          title: "Pan's Labyrinth",
          originalTitle: "El laberinto del fauno",
          year: 2006,
        }),
      ]),
    );

    const response = await POST(
      jsonRequest({
        entries: [{ name: "El laberinto del fauno", year: 2006 }],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      matches: [{ id: 1, title: "Pan's Labyrinth", confidence: "exact" }],
    });
  });

  it("falls through a distant film to a series from that year", async () => {
    movies.mockImplementation(async (_query, year) => {
      if (year === undefined) {
        return page([hit({ id: 9, title: "The Office", year: 1969 })]);
      }
      return page([]);
    });
    shows.mockImplementation(async (_query, year) => {
      if (year === 2005) {
        return page([
          hit({ id: 8, kind: "tv", title: "The Office", year: 2005 }),
        ]);
      }
      return page([]);
    });

    const response = await POST(
      jsonRequest({ entries: [{ name: "The Office", year: 2005 }] }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      matches: [{ id: 8, kind: "tv", confidence: "loose" }],
    });
    expect(shows).toHaveBeenCalledTimes(1);
    expect(shows).toHaveBeenCalledWith("The Office", 2005);
  });

  it("returns null for a miss without failing the rest of the batch", async () => {
    movies.mockImplementation(async (query, year) => {
      if (query === "Heat" && year === 1995) {
        return page([hit({ id: 949, title: "Heat", year: 1995 })]);
      }
      return page([]);
    });

    const response = await POST(
      jsonRequest({
        entries: [
          { name: "Missing", year: 1990 },
          { name: "Heat", year: 1995 },
        ],
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matches[0]).toBeNull();
    expect(body.matches[1]).toMatchObject({ id: 949, confidence: "exact" });
  });

  it("fails the whole batch when a search fails upstream", async () => {
    movies.mockRejectedValue(new UpstreamError(502));

    const response = await POST(
      jsonRequest({
        entries: [
          { name: "Heat", year: 1995 },
          { name: "Dune", year: 2021 },
        ],
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "upstream_unavailable",
        message: "upstream_unavailable",
      },
    });
  });

  it("reports a rate limit for the whole batch", async () => {
    movies.mockRejectedValue(new RateLimitedError());

    const response = await POST(
      jsonRequest({ entries: [{ name: "Heat", year: 1995 }] }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: { code: "rate_limited", message: "rate_limited" },
    });
  });

  it("rejects more than 10 rows", async () => {
    const entries = Array.from({ length: 11 }, (_, index) => ({
      name: `Film ${index}`,
      year: 2000,
    }));

    const response = await POST(jsonRequest({ entries }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "bad_request", message: "bad_request" },
    });
    expect(movies).not.toHaveBeenCalled();
  });

  it.each([
    ["not json", "nope"],
    ["missing entries", "{}"],
    ["blank name", JSON.stringify({ entries: [{ name: "  ", year: 1999 }] })],
    [
      "year as text",
      JSON.stringify({ entries: [{ name: "Heat", year: "1995" }] }),
    ],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(
      new Request("http://localhost/api/match", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(400);
    expect(movies).not.toHaveBeenCalled();
  });

  it("accepts an empty batch", async () => {
    const response = await POST(jsonRequest({ entries: [] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ matches: [] });
    expect(movies).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function page(results: SearchHit[]): SearchPage {
  return {
    page: 1,
    totalPages: results.length > 0 ? 1 : 0,
    totalResults: results.length,
    results,
  };
}

function hit(
  overrides: Partial<SearchHit> & { id: number; title: string },
): SearchHit {
  return {
    kind: "movie",
    originalTitle: overrides.title,
    year: 1999,
    posterPath: null,
    ...overrides,
  };
}
