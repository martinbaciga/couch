import { describe, expect, it } from "vitest";
import {
  emptyCounts,
  parseSavedWatchlist,
  parseWatchlistSummary,
  readSavedWatchlist,
  readWatchlistSummary,
  writeWatchlistSummary,
  WATCHLIST_KEY,
} from "./watchlist";

const saved = {
  importedAt: "2026-11-02T00:00:00.000Z",
  entries: [{ entry: { name: "Heat" } }, { entry: { name: "Ali" } }],
  summary: { computedAt: "2026-11-13T00:00:00.000Z" },
};

describe("parseWatchlistSummary", () => {
  it("counts the entries and keeps both dates", () => {
    expect(parseWatchlistSummary(JSON.stringify(saved))).toEqual({
      count: 2,
      importedAt: saved.importedAt,
      checkedAt: saved.summary.computedAt,
    });
  });

  it("allows a list that has not been checked yet", () => {
    const raw = JSON.stringify({ ...saved, summary: {} });
    expect(parseWatchlistSummary(raw)?.checkedAt).toBeNull();
  });

  it("returns null for a bad shape, corrupt JSON, or another version", () => {
    expect(parseWatchlistSummary("{")).toBeNull();
    expect(
      parseWatchlistSummary(JSON.stringify({ importedAt: saved.importedAt })),
    ).toBeNull();
    expect(
      parseWatchlistSummary(JSON.stringify({ ...saved, version: 2 })),
    ).toBeNull();
  });
});

describe("parseSavedWatchlist", () => {
  it("keeps matches and leaves a missing summary empty", () => {
    const parsed = parseSavedWatchlist(
      JSON.stringify({
        importedAt: saved.importedAt,
        entries: [
          {
            entry: {
              name: "Heat",
              year: 1995,
              uri: "https://boxd.it/heat",
              date: "2024-03-02",
            },
            match: {
              kind: "movie",
              tmdbId: 949,
              title: "Heat",
              year: 1995,
              posterPath: "/heat.jpg",
            },
          },
          {
            entry: { name: "Unknown", year: null, uri: "", date: "" },
            match: null,
          },
        ],
      }),
    );
    expect(parsed?.entries).toHaveLength(2);
    expect(parsed?.entries[0]?.match?.tmdbId).toBe(949);
    expect(parsed?.entries[1]?.match).toBeNull();
    expect(parsed?.summary).toEqual({ computedAt: null, counts: null });
  });

  it("reads stored category counts", () => {
    const counts = { ...emptyCounts(), "on-my-services-here": 2 };
    const parsed = parseSavedWatchlist(
      JSON.stringify({
        ...saved,
        summary: { computedAt: saved.summary.computedAt, counts },
      }),
    );
    expect(parsed?.summary.counts).toEqual(counts);
  });
});

describe("writeWatchlistSummary", () => {
  it("updates the counts and leaves the entries in place", () => {
    const store = new Map<string, string>([
      [WATCHLIST_KEY, JSON.stringify(saved)],
    ]);
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const counts = { ...emptyCounts(), "no-data": 2 };
    expect(
      writeWatchlistSummary(storage, counts, "2026-11-20T00:00:00.000Z"),
    ).toBe(true);
    const next = readSavedWatchlist(storage);
    expect(next?.entries).toHaveLength(2);
    expect(next?.summary.computedAt).toBe("2026-11-20T00:00:00.000Z");
    expect(next?.summary.counts).toEqual(counts);
    expect(readWatchlistSummary(storage)?.checkedAt).toBe(
      "2026-11-20T00:00:00.000Z",
    );
  });

  it("returns false when storage throws", () => {
    expect(
      writeWatchlistSummary(
        {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => undefined,
        },
        emptyCounts(),
        "2026-11-20T00:00:00.000Z",
      ),
    ).toBe(false);
  });
});

describe("readWatchlistSummary", () => {
  it("returns null when storage throws or the key is missing", () => {
    expect(readWatchlistSummary({ getItem: () => null })).toBeNull();
    expect(
      readWatchlistSummary({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBeNull();
  });
});
