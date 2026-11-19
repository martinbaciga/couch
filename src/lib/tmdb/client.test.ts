import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { findClientBundleLeaks } from "../../../scripts/check-client-bundle.mjs";
import {
  clearTmdbCache,
  getMovie,
  getProviderCatalogue,
  getRegions,
  getTv,
  getWatchProviders,
  searchMovie,
  searchMulti,
  searchTv,
} from "@/lib/tmdb/client";
import {
  MissingTokenError,
  RateLimitedError,
  UpstreamError,
  toApiError,
} from "@/lib/tmdb/errors";
import { posterUrl } from "@/lib/tmdb/poster";
import catalogueFixture from "@/lib/tmdb/__fixtures__/provider-catalogue.json";
import movieFixture from "@/lib/tmdb/__fixtures__/movie.json";
import regionsFixture from "@/lib/tmdb/__fixtures__/regions.json";
import searchFixture from "@/lib/tmdb/__fixtures__/search-multi.json";
import tvFixture from "@/lib/tmdb/__fixtures__/tv.json";
import watchFixture from "@/lib/tmdb/__fixtures__/watch-providers.json";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  clearTmdbCache();
  vi.stubGlobal("fetch", fetchMock);
  process.env.TMDB_READ_ACCESS_TOKEN = "test-token";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.TMDB_READ_ACCESS_TOKEN;
  fetchMock.mockReset();
});

describe("TMDB client", () => {
  it("returns films and series from a search and sends the bearer token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(searchFixture));

    const page = await searchMulti("fight", 2);

    expect(page).toEqual({
      page: 1,
      totalPages: 3,
      totalResults: 42,
      results: [
        {
          id: 550,
          kind: "movie",
          title: "Fight Club",
          originalTitle: "Fight Club",
          year: 1999,
          posterPath: "/fight.jpg",
        },
        {
          id: 1396,
          kind: "tv",
          title: "Breaking Bad",
          originalTitle: "Breaking Bad",
          year: 2008,
          posterPath: "/bb.jpg",
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.themoviedb.org/3/search/multi?query=fight&page=2",
    );
    expect(init).toMatchObject({
      headers: {
        Authorization: "Bearer test-token",
        accept: "application/json",
      },
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("searches films and series with an optional year", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ results: [] })),
    );

    await searchMovie("Fight Club", 1999);
    await searchTv("Breaking Bad", 2008);

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.themoviedb.org/3/search/movie?query=Fight+Club&year=1999",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://api.themoviedb.org/3/search/tv?query=Breaking+Bad&first_air_date_year=2008",
    );
  });

  it("loads film and series details in one request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(movieFixture));
    fetchMock.mockResolvedValueOnce(jsonResponse(tvFixture));

    const film = await getMovie(550);
    const series = await getTv(1396);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/movie/550?append_to_response=release_dates%2Cexternal_ids%2Cvideos",
    );
    expect(film).toMatchObject({
      id: 550,
      kind: "movie",
      overview: "An insomniac office worker starts a fight club.",
      genres: [{ id: 18, name: "Drama" }],
      runtimeMinutes: 139,
      numberOfSeasons: null,
      ageRatings: { IE: "15A", US: "R" },
      imdbId: "tt0137523",
      trailerKey: "trailer-key",
    });
    expect(series).toMatchObject({
      kind: "tv",
      overview: "A chemistry teacher starts cooking.",
      genres: [{ id: 18, name: "Drama" }],
      numberOfSeasons: 5,
      runtimeMinutes: null,
      ageRatings: { US: "TV-MA" },
      trailerKey: null,
    });
  });

  it("maps missing detail fields to empty values", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 1,
        title: "Bare",
        release_dates: {
          results: [
            {
              iso_3166_1: "IE",
              release_dates: [{ certification: "", type: 3 }],
            },
          ],
        },
        external_ids: {},
        videos: {
          results: [
            { site: "Vimeo", type: "Trailer", key: "vimeo", official: true },
            { site: "YouTube", type: "Teaser", key: "teaser", official: true },
          ],
        },
        genres: [{ id: 18 }, { name: "" }],
      }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 2, name: "Bare show" }));

    const film = await getMovie(1);
    const series = await getTv(2);

    expect(film).toMatchObject({
      overview: "",
      genres: [],
      runtimeMinutes: null,
      numberOfSeasons: null,
      ageRatings: {},
      imdbId: null,
      trailerKey: null,
      year: null,
      posterPath: null,
    });
    expect(series).toMatchObject({
      overview: "",
      genres: [],
      runtimeMinutes: null,
      numberOfSeasons: null,
      ageRatings: {},
      imdbId: null,
      trailerKey: null,
    });
  });

  it("uses an unofficial YouTube trailer when no official one exists", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 3,
        title: "Bare",
        videos: {
          results: [
            {
              site: "YouTube",
              type: "Trailer",
              key: "unofficial1",
              official: false,
              iso_639_1: "de",
            },
            {
              site: "YouTube",
              type: "Trailer",
              key: "unofficial2",
              official: false,
              iso_639_1: "en",
            },
          ],
        },
      }),
    );

    const film = await getMovie(3);

    expect(film.trailerKey).toBe("unofficial2");
  });

  it("keeps unknown country codes on watch providers", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(watchFixture));
    fetchMock.mockResolvedValueOnce(jsonResponse(regionsFixture));
    fetchMock.mockResolvedValueOnce(jsonResponse(catalogueFixture));

    const providers = await getWatchProviders("movie", 550);
    const regions = await getRegions();
    const catalogue = await getProviderCatalogue("movie", "IE");

    expect(providers.results.GG?.free?.[0]?.providerName).toBe("Local Free");
    expect(regions).toEqual([
      { code: "IE", englishName: "Ireland", nativeName: "Ireland" },
    ]);
    expect(catalogue[0]?.providerId).toBe(8);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/watch/providers/movie?watch_region=IE",
    );
  });

  it("throws UpstreamError on 404 without retrying", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(getMovie(404)).rejects.toMatchObject({
      name: "UpstreamError",
      status: 404,
    });
    await expect(getMovie(404)).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(toApiError(new UpstreamError(404))).toEqual({
      status: 404,
      body: { error: { code: "not_found", message: "not_found" } },
    });
  });

  it("retries a 429 that includes Retry-After", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { "retry-after": "1" } }),
      )
      .mockResolvedValueOnce(jsonResponse(searchFixture));

    const pending = searchMulti("fight", 1);
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toMatchObject({ page: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("backs off when a 429 has no Retry-After, then gives up", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

    const pending = searchMulti("fight", 1);
    const assertion = expect(pending).rejects.toBeInstanceOf(RateLimitedError);
    await vi.advanceTimersByTimeAsync(500 + 1_000 + 2_000);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(toApiError(new RateLimitedError())).toEqual({
      status: 429,
      body: { error: { code: "rate_limited", message: "rate_limited" } },
    });
  });

  it("turns a timed-out request into UpstreamError", async () => {
    vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
      expect(milliseconds).toBe(8_000);
      const controller = new AbortController();
      controller.abort(new DOMException("timed out", "TimeoutError"));
      return controller.signal;
    });
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    const error = await searchMulti("fight", 1).then(
      () => null,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({ timeout: true });
    expect(toApiError(error)).toEqual({
      status: 503,
      body: {
        error: {
          code: "upstream_unavailable",
          message: "upstream_unavailable",
        },
      },
    });
  });

  it("fails before calling TMDB when the token is missing", async () => {
    delete process.env.TMDB_READ_ACCESS_TOKEN;

    await expect(searchMulti("fight", 1)).rejects.toBeInstanceOf(
      MissingTokenError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toApiError(new MissingTokenError())?.body.error.code).toBe(
      "upstream_unavailable",
    );
  });

  it("keeps at most 8 requests in flight", async () => {
    let started = 0;
    const releases: Array<() => void> = [];
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          started += 1;
          releases.push(() => resolve(jsonResponse({ results: [] })));
        }),
    );

    const pending = Array.from({ length: 9 }, (_, index) =>
      searchMulti(`title-${index}`, 1),
    );
    await vi.waitFor(() => expect(started).toBe(8));
    releases[0]?.();
    await vi.waitFor(() => expect(started).toBe(9));
    for (const release of releases) release();
    await Promise.all(pending);
  });

  it("shares one upstream call and keeps fetchedAt for a cached title", async () => {
    let release: (response: Response) => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    const pending = Promise.all([
      getWatchProviders("movie", 550),
      getWatchProviders("movie", 550),
    ]);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    release(jsonResponse(watchFixture));
    const [first, second] = await pending;

    expect(second.fetchedAt).toBe(first.fetchedAt);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      cache: "force-cache",
      next: { revalidate: 21_600 },
    });

    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(watchFixture)),
    );
    const servedAgain = await getWatchProviders("movie", 550);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(servedAgain.fetchedAt).toBe(first.fetchedAt);
  });

  it("fetches a title again after its cache window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T12:00:00.000Z"));
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(watchFixture)),
    );

    const first = await getWatchProviders("movie", 550);
    await vi.advanceTimersByTimeAsync(21_600 * 1_000);
    const second = await getWatchProviders("movie", 550);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second.fetchedAt).not.toBe(first.fetchedAt);
  });

  it("sends the search and catalogue cache windows", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ results: [] })),
    );

    await searchMulti("fight", 1);
    await getRegions();

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      next: { revalidate: 3_600 },
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      next: { revalidate: 86_400 },
    });
  });
});

describe("posterUrl", () => {
  it("builds a TMDB image URL", () => {
    expect(posterUrl("/fight.jpg", "w342")).toBe(
      "https://image.tmdb.org/t/p/w342/fight.jpg",
    );
    expect(posterUrl(null, "w342")).toBeNull();
  });
});

describe("client bundle check", () => {
  it("fails when the token name or value is in the client output", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "couch-bundle-"));
    try {
      await writeFile(
        path.join(directory, "app.js"),
        "const token = 'TMDB_READ_ACCESS_TOKEN';",
      );
      const nameLeaks = await findClientBundleLeaks(directory, "");
      expect(nameLeaks).toHaveLength(1);

      await writeFile(
        path.join(directory, "app.js"),
        "const value = 'super-secret-token-value';",
      );
      const valueLeaks = await findClientBundleLeaks(
        directory,
        "super-secret-token-value",
      );
      expect(valueLeaks.map((leak) => leak.kind)).toEqual(["value"]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
