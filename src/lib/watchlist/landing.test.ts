import { describe, expect, it } from "vitest";
import { emptyCounts } from "@/lib/storage/watchlist";
import { countsAreStale, filmCount, freshness } from "./landing";

const now = Date.parse("2026-11-21T12:00:00.000Z");
const minute = 60 * 1000;
const day = 24 * 60 * minute;

describe("filmCount", () => {
  it("counts matches and leaves unmatched rows out", () => {
    expect(
      filmCount([{ match: { tmdbId: 1 } }, { match: null }, { match: {} }]),
    ).toBe(2);
  });
});

describe("countsAreStale", () => {
  const counts = emptyCounts();

  it("is stale until counts exist", () => {
    expect(countsAreStale({ counts: null, settingsAt: null }, null)).toBe(true);
  });

  it("is fresh when the settings stamp still matches", () => {
    expect(
      countsAreStale(
        { counts, settingsAt: "2026-11-01T00:00:00.000Z" },
        "2026-11-01T00:00:00.000Z",
      ),
    ).toBe(false);
    expect(countsAreStale({ counts, settingsAt: null }, null)).toBe(false);
  });

  it("is stale once settings have been saved again", () => {
    expect(
      countsAreStale(
        { counts, settingsAt: "2026-11-01T00:00:00.000Z" },
        "2026-11-20T00:00:00.000Z",
      ),
    ).toBe(true);
  });
});

describe("freshness", () => {
  it("says just now for the last minute and for a future stamp", () => {
    expect(freshness(new Date(now - minute + 1).toISOString(), now)).toBe(
      "just-now",
    );
    expect(freshness(new Date(now + day).toISOString(), now)).toBe("just-now");
  });

  it("stays relative through seven days", () => {
    expect(freshness(new Date(now - 3 * day).toISOString(), now)).toBe(
      "relative",
    );
    expect(freshness(new Date(now - 7 * day).toISOString(), now)).toBe(
      "relative",
    );
  });

  it("becomes a date once the week has passed", () => {
    expect(freshness(new Date(now - 7 * day - 1).toISOString(), now)).toBe(
      "date",
    );
  });

  it("ignores a bad stamp", () => {
    expect(freshness("nope", now)).toBeNull();
  });
});
