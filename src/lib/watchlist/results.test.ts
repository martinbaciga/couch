import { describe, expect, it } from "vitest";
import type { TitleAvailability } from "@/lib/availability/types";
import type { Settings } from "@/lib/availability/status";
import type { TitleLookup } from "@/lib/search/status-line";
import {
  WEEK_MS,
  categoryCounts,
  classify,
  defaultFilter,
  displayCounts,
  displayFilter,
  hasMore,
  isStale,
  PAGE_SIZE,
  sortFilms,
  visibleFilms,
} from "./results";

const now = Date.parse("2026-11-20T12:00:00.000Z");

function lookup(countries: TitleAvailability["countries"]): TitleLookup {
  return {
    availability: { countries, fetchedAt: "2026-11-20T00:00:00.000Z" },
    services: [
      { id: 8, name: "Netflix", logoPath: null },
      { id: 15, name: "Tubi", logoPath: null },
    ],
  };
}

const settings: Settings = { country: "IE", serviceIds: [8] };

describe("defaultFilter", () => {
  it("starts on your services when a country and a service are saved", () => {
    expect(defaultFilter(settings)).toBe("on-my-services-here");
  });

  it("starts on all when the country or the services are missing", () => {
    expect(defaultFilter(null)).toBe("all");
    expect(defaultFilter({ country: "IE", serviceIds: [] })).toBe("all");
    expect(defaultFilter({ country: null, serviceIds: [8] })).toBe("all");
  });
});

describe("isStale", () => {
  it("is stale only once the saved check is older than a week", () => {
    expect(isStale(new Date(now - WEEK_MS).toISOString(), now)).toBe(false);
    expect(isStale(new Date(now - WEEK_MS - 1).toISOString(), now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
  });
});

describe("displayFilter", () => {
  it("keeps every film on All when no country is set", () => {
    expect(displayFilter({ category: "other-countries-only" }, null)).toBe(
      "all",
    );
  });

  it("leaves streaming-here on All, because that chip is not in the row", () => {
    expect(displayFilter({ category: "streaming-here" }, "IE")).toBe("all");
  });
});

describe("classify", () => {
  it("names a free or ads offer and counts it on that chip", () => {
    const row = classify(
      lookup({ IE: [{ type: "ads", serviceId: 15, providerId: 15 }] }),
      settings,
    );
    expect(row.filter).toBe("free-or-ads-here");
    expect(row.category).toBe("free-or-ads-here");
    expect(row.read).toEqual({ kind: "free", serviceIds: [15] });
  });

  it("uses a neutral country count when no country is saved", () => {
    const row = classify(
      lookup({ FR: [{ type: "stream", serviceId: 8, providerId: 8 }] }),
      { country: null, serviceIds: [] },
    );
    expect(row.filter).toBe("all");
    expect(row.read).toEqual({ kind: "available", count: 1 });
  });

  it("puts each loaded film in one category so the chips add up", () => {
    const rows = [
      lookup({ IE: [{ type: "stream", serviceId: 8, providerId: 8 }] }),
      lookup({ IE: [{ type: "ads", serviceId: 15, providerId: 15 }] }),
      lookup({ IE: [{ type: "rent", serviceId: 10, providerId: 10 }] }),
      lookup({ US: [{ type: "stream", serviceId: 8, providerId: 8 }] }),
      lookup({}),
    ].map((item) => classify(item, settings));
    const filters = rows.map((row) => row.filter);
    const counts = displayCounts(filters);
    const chips =
      counts["on-my-services-here"] +
      counts["free-or-ads-here"] +
      counts["other-services-here"] +
      counts["rent-or-buy-here-only"] +
      counts["other-countries-only"] +
      counts["no-data"];
    expect(chips).toBe(counts.all);
    expect(categoryCounts(rows.map((row) => row.category))).toMatchObject({
      "on-my-services-here": 1,
      "free-or-ads-here": 1,
      "rent-or-buy-here-only": 1,
      "other-countries-only": 1,
      "no-data": 1,
    });
  });
});

describe("sortFilms", () => {
  const films = [
    { title: "b", year: 1999, added: "2024-01-01" },
    { title: "A", year: null, added: "2024-06-01" },
    { title: "c", year: 2020, added: "" },
  ];

  it("orders by date added, newest first, with a missing date last", () => {
    expect(sortFilms(films, "added").map((film) => film.title)).toEqual([
      "A",
      "b",
      "c",
    ]);
  });

  it("orders titles from A to Z and years newest first", () => {
    expect(sortFilms(films, "title").map((film) => film.title)).toEqual([
      "A",
      "b",
      "c",
    ]);
    expect(sortFilms(films, "year").map((film) => film.title)).toEqual([
      "c",
      "b",
      "A",
    ]);
  });
});

describe("visibleFilms", () => {
  it("shows a page of 25 and knows when more remain", () => {
    const films = Array.from({ length: 30 }, (_, index) => index);
    expect(visibleFilms(films, PAGE_SIZE)).toHaveLength(25);
    expect(hasMore(films.length, PAGE_SIZE)).toBe(true);
    expect(hasMore(films.length, 30)).toBe(false);
  });
});
