import { beforeEach, describe, expect, it, vi } from "vitest";

import { TITLE_CACHE_CONTROL } from "@/config/cache";
import { UpstreamError } from "@/lib/tmdb/errors";
import { getMovie, getTv, getWatchProviders } from "@/lib/tmdb/client";
import type { TitleDetails, WatchProviders } from "@/lib/tmdb/types";

import { GET } from "./route";

vi.mock("@/lib/tmdb/client", () => ({
  getMovie: vi.fn(),
  getTv: vi.fn(),
  getWatchProviders: vi.fn(),
}));

const movie = vi.mocked(getMovie);
const series = vi.mocked(getTv);
const providers = vi.mocked(getWatchProviders);

const movieDetails: TitleDetails = {
  id: 550,
  kind: "movie",
  title: "Fight Club",
  originalTitle: "Fight Club",
  year: 1999,
  posterPath: "/fight.jpg",
  overview: "An office worker meets a soap maker.",
  genres: [
    { id: 18, name: "Drama" },
    { id: 53, name: "Thriller" },
  ],
  runtimeMinutes: 139,
  numberOfSeasons: null,
  ageRatings: { IE: "15A", US: "R" },
  imdbId: "tt0137523",
  trailerKey: "trailer-key",
};

const emptyProviders: WatchProviders = {
  id: 550,
  results: {},
  fetchedAt: "2026-11-16T12:00:00.000Z",
};

beforeEach(() => {
  movie.mockReset();
  series.mockReset();
  providers.mockReset();
  movie.mockResolvedValue(movieDetails);
  providers.mockResolvedValue(emptyProviders);
});

describe("GET /api/title/[kind]/[id]", () => {
  it("returns the title page fields and an empty availability map", async () => {
    const response = await GET(
      new Request("http://localhost/api/title/movie/550"),
      {
        params: Promise.resolve({ kind: "movie", id: "550" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(TITLE_CACHE_CONTROL);
    expect(movie).toHaveBeenCalledWith(550);
    expect(providers).toHaveBeenCalledWith("movie", 550);
    expect(body.title).toEqual({
      kind: "movie",
      id: 550,
      title: "Fight Club",
      originalTitle: "Fight Club",
      year: 1999,
      posterPath: "/fight.jpg",
      runtime: 139,
      seasons: null,
      genres: ["Drama", "Thriller"],
      overview: "An office worker meets a soap maker.",
      certifications: { IE: "15A", US: "R" },
      imdbId: "tt0137523",
      trailerKey: "trailer-key",
    });
    expect(body.availability.countries).toEqual({});
    expect(body.availability.fetchedAt).toBe("2026-11-16T12:00:00.000Z");
    expect(body.services).toEqual([]);
  });

  it("returns seasons for a series", async () => {
    series.mockResolvedValue({
      ...movieDetails,
      id: 1396,
      kind: "tv",
      title: "Breaking Bad",
      runtimeMinutes: null,
      numberOfSeasons: 5,
      trailerKey: null,
    });

    const response = await GET(
      new Request("http://localhost/api/title/tv/1396"),
      {
        params: Promise.resolve({ kind: "tv", id: "1396" }),
      },
    );
    const body = await response.json();

    expect(series).toHaveBeenCalledWith(1396);
    expect(providers).toHaveBeenCalledWith("tv", 1396);
    expect(body.title.runtime).toBeNull();
    expect(body.title.seasons).toBe(5);
    expect(body.title.trailerKey).toBeNull();
  });

  it("returns not_found for an unknown title", async () => {
    movie.mockRejectedValue(new UpstreamError(404));

    const response = await GET(
      new Request("http://localhost/api/title/movie/999"),
      {
        params: Promise.resolve({ kind: "movie", id: "999" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "not_found" },
    });
    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it.each(["show", "movie"])("rejects a bad kind or id (%s)", async (kind) => {
    const id = kind === "movie" ? "0" : "1396";
    const response = await GET(
      new Request(`http://localhost/api/title/${kind}/${id}`),
      { params: Promise.resolve({ kind, id }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "bad_request", message: "bad_request" },
    });
    expect(movie).not.toHaveBeenCalled();
    expect(providers).not.toHaveBeenCalled();
  });
});
